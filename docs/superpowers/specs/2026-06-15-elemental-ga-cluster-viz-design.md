# Elemental — Genetic-Algorithm Atomic Cluster Visualizer

**Date:** 2026-06-15
**Status:** Approved design — ready for implementation planning

## 1. Summary

A web-based app that uses a genetic algorithm (GA) to find the minimum-energy
3D geometry of a cluster of N identical atoms of a chosen element, and renders
the population evolving toward that structure live in 3D with Three.js. The GA
runs entirely client-side in a Web Worker; the app deploys as a static site.

The scientific core is the well-established field of **global cluster structure
optimization**. The canonical method (Deaven & Ho, *Phys. Rev. Lett.* 75, 288,
1995) operates on a population of candidate atomic geometries, scores each by its
potential energy, and breeds new candidates with a "cut-and-splice" crossover.
The standard benchmark system is the **Lennard-Jones (LJ) cluster**, whose known
global minima (Cambridge Cluster Database; Wales & Doye) let us validate the
optimizer.

## 2. Research grounding

Key prior work this design draws on:

- **Deaven & Ho (1995)** — foundational GA for molecular/cluster geometry;
  introduced cut-and-splice crossover and local relaxation of candidates.
- **Lennard-Jones clusters** — canonical benchmark; published global minima used
  here for validation (e.g. LJ₁₃ = −44.3268 ε, LJ₃₈ as a famous multi-funnel
  "hard case").
- **Birmingham (Parallel) Cluster GA (BCGA/BPGA)** — GA for metal nanoclusters;
  source of practical operator and selection choices.
- **USPEX (Oganov)** — evolutionary crystal structure prediction (out of scope
  for v1, noted as a future direction).

The recurring recipe — population → fitness = negative potential energy →
cut-and-splice crossover + mutation → **local relaxation** → selection — is what
this app implements and visualizes.

## 3. Goals and non-goals

### Goals
- Pick an element and cluster size N; watch a GA evolve the cluster geometry in
  3D, generation by generation.
- Live convergence charts (best/average energy) and a comparison to the known
  global minimum.
- Interactive GA parameter controls and transport (play/pause/step/reset/speed).
- Correct, validated physics: the GA must recover known LJ global minima for
  small N.

### Non-goals (v1)
- Multi-element / alloy clusters.
- Crystals / periodic boundary conditions.
- DFT or machine-learning potentials.
- Server-side compute, user accounts, or persistence.
- Bonded-molecule force fields (bond/angle/torsion terms).

## 4. Tech stack

- **Vite + React + TypeScript** — purely client-side compute + render app; no SSR
  benefit, fast HMR, static deploy to Vercel.
- **three.js + @react-three/fiber + @react-three/drei** — declarative 3D scene.
- **Web Worker** (raw `postMessage`, transferable `Float32Array`s) — GA runs off
  the render thread.
- **uPlot** — fast realtime line charts for the convergence curve.
- **Zustand** — light state for config + latest simulation snapshot.
- **Tailwind CSS** — styling.
- **Vitest** — unit/integration tests for the pure engine.

## 5. Architecture

Three isolated layers, each independently testable:

```
Controls/UI (React) ──config──▶ Zustand store ──postMessage──▶ GA Worker
       ▲                                                          │
       │                          snapshot (Float32Array)         │
   ClusterScene (R3F) + Charts ◀──────── store ◀──────────────────┘
```

### 5.1 GA engine — pure TypeScript, zero DOM/Three dependencies

Runnable and testable in Node. Module boundaries:

- `ga/types.ts` — shared types: `Cluster` (Float32Array of 3N coords + N + element
  params), `GAConfig`, `Snapshot`, `PotentialParams`.
- `ga/rng.ts` — seeded PRNG (mulberry32) for full reproducibility.
- `ga/potential.ts` — energy + analytic gradient.
  - Lennard-Jones: `E = 4ε Σ_{i<j} [(σ/r_ij)¹² − (σ/r_ij)⁶]` (primary).
  - Morse: `E = D_e Σ_{i<j} [e^{−2α(r−r_e)} − 2 e^{−α(r−r_e)}]` (optional).
  - Returns both scalar energy and the 3N gradient vector.
- `ga/relax.ts` — local minimizer (**FIRE** algorithm). Every candidate is
  relaxed to its nearest local minimum before scoring; the GA thereby searches
  the space of local minima (the central Deaven–Ho insight). Uses the analytic
  gradient from `potential.ts`. Configurable max iterations / force tolerance.
- `ga/operators.ts`
  - **Cut-and-splice crossover**: translate both parents to center of mass,
    apply a random rotation to each, cut each by a horizontal plane chosen so the
    spliced child has exactly N atoms, concatenate the kept halves.
  - **Mutation**: (a) "rattle" — Gaussian displacement of all atoms; (b)
    replace — randomize a subset of atom positions; (c) twist — rotate one half.
    Mutation rate configurable.
- `ga/select.ts` — tournament selection (default) and Boltzmann/roulette by
  energy, plus elitism (carry the best k unchanged). Optional diversity/niching
  guard (reject offspring too energetically close to existing members) to avoid
  premature convergence on a single funnel.
- `ga/engine.ts` — orchestration: initialize random population (atoms placed in a
  sphere, then relaxed), then the generation loop: select parents → crossover →
  mutate → relax → score → form next generation with elitism. Emits a `Snapshot`
  per generation. Supports single-step execution for the worker's `step` command.

### 5.2 Web Worker — `worker/ga.worker.ts`

Wraps the engine, runs the generation loop off the main thread.

- Main → worker commands: `{ type: 'start', config }`, `pause`, `resume`,
  `step`, `stop`, `reset`, `{ type: 'updateParams', params }`.
- Worker → main: throttled `{ type: 'snapshot', generation, bestEnergy,
  avgEnergy, bestCoords: Float32Array, knownMinimum?: number }`. `bestCoords`
  sent as a transferable. Snapshot emission throttled (e.g. min interval ~16–33ms)
  so the GA can run faster than the render without flooding the main thread.

### 5.3 Visualization + UI — React / R3F

- `viz/ClusterScene.tsx` — canvas, lighting, OrbitControls (drei), optional
  auto-rotate, ground/environment.
- `viz/Atoms.tsx` — `InstancedMesh` of spheres; per-atom color (CPK convention)
  and radius (scaled atomic/van der Waals radius for the element). Positions
  **lerp** between successive snapshots so the cluster morphs smoothly.
- `viz/Bonds.tsx` — optional cylinders between atoms within a nearest-neighbor
  cutoff, for visual clarity (cluster "bonds" are geometric, not chemical).
- `ui/ElementPicker.tsx` — choose element (sets potential params, color, radius).
- `ui/Controls.tsx` — cluster size N, potential (LJ/Morse), GA params
  (population size, mutation rate, selection method, max generations), transport
  (play/pause/step/reset, speed).
- `ui/Charts.tsx` — uPlot best/avg energy vs generation; readouts for current
  best energy, generation, RMS force, and Δ vs known global minimum.
- `ui/Presets.tsx` — quick-load notable cases (LJ₁₃ icosahedron, LJ₃₈ hard case,
  LJ₅₅ Mackay icosahedron).

### 5.4 Data

- `data/elements.ts` — element table: symbol, CPK color, display radius, and
  LJ/Morse parameters (ε, σ or D_e, α, r_e). Energies displayed in reduced units
  (ε) by default, with an option to show element-scaled values.
- `data/ljReference.ts` — published LJ global-minimum energies (reduced units)
  for N up to ~80, for the validation badge and tests.

### 5.5 State — `state/store.ts`

Zustand store holding: current `GAConfig`, run status (`idle|running|paused`),
latest `Snapshot`, and a rolling history of (generation, bestEnergy, avgEnergy)
for the chart. One-way data flow: UI mutates config → worker; worker snapshots →
store → scene + charts.

## 6. Data flow

1. User edits controls → updates `GAConfig` in the store.
2. On start, store posts `{start, config}` to the worker.
3. Worker initializes + relaxes a random population, runs generations, posts
   throttled snapshots back.
4. Store appends to history; `ClusterScene` interpolates `bestCoords`; `Charts`
   append the new energy points.
5. `updateParams` (e.g. mutation rate) takes effect on the next generation
   without restarting.

## 7. Error handling

- Worker wraps the loop in try/catch and posts `{type:'error', message}`; the UI
  shows a non-blocking banner and returns to `idle`.
- Guard against degenerate geometry: clamp minimum interatomic distance in
  energy/gradient to avoid `Infinity`/`NaN` from `r → 0`; if a candidate produces
  non-finite energy after relaxation, discard and replace.
- Validate config bounds (N ≥ 2, population ≥ 2, rates in [0,1]) before start.
- If a Web Worker fails to construct, fall back to a clear error message (no
  silent main-thread execution that would freeze the UI).

## 8. Testing strategy

The pure engine makes this strong and fast (Vitest, Node):

- **Unit**
  - `potential`: LJ energy of hand-computed small configs (e.g. 2 atoms at r=σ,
    r=2^{1/6}σ minimum); Morse likewise.
  - Gradient correctness via finite-difference comparison against the analytic
    gradient.
  - `relax`: a perturbed known minimum relaxes back to it within tolerance;
    RMS force decreases monotonically toward the tolerance.
  - `operators`: cut-and-splice always yields exactly N atoms; mutation respects
    rate; seeded RNG ⇒ deterministic output.
  - `select`: elitism preserves the best; tournament respects fitness ordering
    statistically.
- **Integration (the proof of correctness)**
  - A seeded full GA run recovers the known global minimum for small N
    (e.g. LJ₁₃ within a tolerance of the reference −44.3268 ε) within a bounded
    number of generations.
  - Reproducibility: identical seed ⇒ identical final energy.
- **UI** (light): smoke-test that controls dispatch the right worker messages and
  that snapshots update the store. Three.js rendering itself is not unit-tested.

## 9. Module / file layout

```
src/
  ga/
    types.ts
    rng.ts
    potential.ts
    relax.ts
    operators.ts
    select.ts
    engine.ts
  worker/
    ga.worker.ts
  viz/
    ClusterScene.tsx
    Atoms.tsx
    Bonds.tsx
  ui/
    ElementPicker.tsx
    Controls.tsx
    Charts.tsx
    Presets.tsx
  state/
    store.ts
  data/
    elements.ts
    ljReference.ts
  App.tsx
  main.tsx
```

## 10. Future directions (explicitly deferred)

- Multi-element / alloy clusters with many-body potentials (Gupta, Sutton-Chen).
- Crystal structure prediction with periodic boundary conditions (USPEX-style).
- ML-potential acceleration of fitness evaluation.
- Export structures (XYZ/PDB) and shareable run links.
- Offload large runs to a Vercel Function (hybrid compute).
