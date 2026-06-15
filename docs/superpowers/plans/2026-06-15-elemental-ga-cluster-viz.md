# Elemental GA Cluster Visualizer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a web app that runs a Lennard-Jones genetic algorithm in a Web Worker and renders the atomic cluster evolving live in Three.js.

**Architecture:** Pure-TypeScript GA engine (ga/) → Web Worker wrapper → Zustand store → React/R3F visualization. Three isolated layers with one-way data flow and no DOM deps in the engine so it is fully testable in Node/Vitest.

**Tech Stack:** Vite 5 + React 18 + TypeScript, three.js + @react-three/fiber + @react-three/drei, Zustand 5, uPlot, Tailwind CSS 3, Vitest 2.

---

## File map

```
src/
  ga/
    types.ts          shared types (GAConfig, Snapshot, WorkerCommand/Message, PotentialParams)
    rng.ts            mulberry32 seeded PRNG
    potential.ts      LJ + Morse energy + analytic gradient
    relax.ts          FIRE local minimizer
    operators.ts      cut-and-splice crossover + rattle/replace mutations
    select.ts         tournament selection + elitism + diversity guard
    engine.ts         GA population loop
  worker/
    ga.worker.ts      Web Worker shell (postMessage protocol)
  viz/
    ClusterScene.tsx  R3F Canvas + lighting + OrbitControls
    Atoms.tsx         InstancedMesh of spheres with lerp interpolation
    Bonds.tsx         nearest-neighbour bond cylinders
  ui/
    Controls.tsx      sliders + transport buttons
    ElementPicker.tsx element buttons
    Charts.tsx        uPlot convergence curves + readouts
    Presets.tsx       quick-load presets
  state/
    store.ts          Zustand store (config + status + snapshot + history)
  data/
    elements.ts       element table (symbol, CPK colour, radius, LJ params)
    ljReference.ts    published LJ global minima (Cambridge Cluster Database)
  App.tsx             layout wiring
  main.tsx            entry point
  index.css           Tailwind directives
tests/
  ga/
    rng.test.ts
    potential.test.ts
    relax.test.ts
    operators.test.ts
    select.test.ts
    engine.test.ts    includes integration test: seeded LJ₁₃ run
  state/
    store.test.ts
index.html
vite.config.ts
tailwind.config.js
postcss.config.js
tsconfig.json
tsconfig.node.json
package.json
```

---

## Task 1 — Scaffold the project

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `tailwind.config.js`
- Create: `postcss.config.js`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/index.css`

- [ ] **Step 1: Initialise project and install dependencies**

```bash
cd /Users/zaks/Projects/elemental
npm create vite@latest . -- --template react-ts --yes 2>/dev/null || true
npm install three @react-three/fiber @react-three/drei zustand uplot
npm install -D @types/three tailwindcss autoprefixer postcss @tailwindcss/forms vitest @vitest/coverage-v8 jsdom @testing-library/react @testing-library/user-event @types/uplot
npx tailwindcss init -p
```

- [ ] **Step 2: Write `vite.config.ts`**

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [],
  },
});
```

- [ ] **Step 3: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "skipLibCheck": true
  },
  "include": ["src", "tests"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 4: Write `tsconfig.node.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true
  },
  "include": ["vite.config.ts", "tailwind.config.js"]
}
```

- [ ] **Step 5: Configure Tailwind**

In `tailwind.config.js`:
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: [],
};
```

In `postcss.config.js`:
```javascript
export default {
  plugins: { tailwindcss: {}, autoprefixer: {} },
};
```

- [ ] **Step 6: Write `index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Elemental — GA Cluster Optimizer</title>
  </head>
  <body class="m-0 p-0">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 7: Write `src/index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer components {
  .btn-primary {
    @apply px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors disabled:opacity-40;
  }
  .btn-secondary {
    @apply px-3 py-1.5 rounded bg-gray-600 hover:bg-gray-500 text-white text-sm font-medium transition-colors disabled:opacity-40;
  }
  .btn-danger {
    @apply px-3 py-1.5 rounded bg-red-700 hover:bg-red-600 text-white text-sm font-medium transition-colors disabled:opacity-40;
  }
}
```

- [ ] **Step 8: Write placeholder `src/App.tsx` and `src/main.tsx`**

```tsx
// src/App.tsx
export default function App() {
  return <div className="h-screen bg-gray-900 text-gray-100 flex items-center justify-center">Loading…</div>;
}
```

```tsx
// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><App /></React.StrictMode>
);
```

- [ ] **Step 9: Verify dev server starts**

```bash
npm run dev
```

Expected: server starts at http://localhost:5173 with a grey screen reading "Loading…"

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite + React + TS + Tailwind + Vitest"
```

---

## Task 2 — Types + Data files

**Files:**
- Create: `src/ga/types.ts`
- Create: `src/data/elements.ts`
- Create: `src/data/ljReference.ts`

No unit tests for pure data files.

- [ ] **Step 1: Write `src/ga/types.ts`**

```typescript
// src/ga/types.ts
export interface PotentialParams {
  type: 'lj' | 'morse';
  epsilon: number;   // LJ well depth (reduced: 1.0)
  sigma: number;     // LJ zero-crossing distance (reduced: 1.0)
  De: number;        // Morse well depth
  alpha: number;     // Morse width parameter
  re: number;        // Morse equilibrium distance
  rMin: number;      // minimum r clamp to avoid singularity
}

export interface GAConfig {
  elementSymbol: string;
  n: number;                              // atoms (2–80)
  potentialParams: PotentialParams;
  populationSize: number;                 // default 20
  eliteCount: number;                     // default 2
  mutationRate: number;                   // 0–1, default 0.3
  mutationSigma: number;                  // rattle σ in reduced units, default 0.3
  selectionMethod: 'tournament';
  tournamentSize: number;                 // default 3
  maxGenerations: number;                 // default 1000
  seed: number;
  relaxMaxIter: number;                   // default 500
  relaxForceTol: number;                  // default 1e-4
  diversityThreshold: number;             // 0 = disabled
}

export interface Snapshot {
  generation: number;
  bestEnergy: number;
  avgEnergy: number;
  bestCoords: Float32Array;              // 3N, for Three.js
  rmsForce: number;
  knownMinimum?: number;
}

export type WorkerCommand =
  | { type: 'start'; config: GAConfig }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'step' }
  | { type: 'stop' }
  | { type: 'reset' }
  | { type: 'updateParams'; params: Partial<GAConfig> };

export type WorkerMessage =
  | { type: 'snapshot'; snapshot: Snapshot }
  | { type: 'error'; message: string }
  | { type: 'ready' };
```

- [ ] **Step 2: Write `src/data/elements.ts`**

```typescript
// src/data/elements.ts
import type { PotentialParams } from '../ga/types';

export interface ElementData {
  symbol: string;
  name: string;
  color: string;    // hex, CPK convention
  radius: number;   // display radius in σ units
  lj: PotentialParams;
}

export const LJ_REDUCED: PotentialParams = {
  type: 'lj',
  epsilon: 1.0, sigma: 1.0,
  De: 1.0, alpha: 1.0, re: Math.pow(2, 1/6),
  rMin: 0.5,
};

export const MORSE_REDUCED: PotentialParams = {
  type: 'morse',
  epsilon: 1.0, sigma: 1.0,
  De: 1.0, alpha: 1.0, re: Math.pow(2, 1/6),
  rMin: 0.3,
};

// All elements use LJ reduced units (ε=1, σ=1) in v1.
// Visual properties (colour, radius) distinguish them.
export const ELEMENTS: ElementData[] = [
  { symbol: 'Ar', name: 'Argon',    color: '#00ffff', radius: 0.35, lj: { ...LJ_REDUCED } },
  { symbol: 'Ne', name: 'Neon',     color: '#b3e3f5', radius: 0.28, lj: { ...LJ_REDUCED } },
  { symbol: 'Kr', name: 'Krypton',  color: '#5cb8d1', radius: 0.40, lj: { ...LJ_REDUCED } },
  { symbol: 'Au', name: 'Gold',     color: '#ffd700', radius: 0.38, lj: { ...LJ_REDUCED } },
  { symbol: 'Cu', name: 'Copper',   color: '#b87333', radius: 0.34, lj: { ...LJ_REDUCED } },
  { symbol: 'Fe', name: 'Iron',     color: '#e06000', radius: 0.33, lj: { ...LJ_REDUCED } },
];

export const DEFAULT_ELEMENT = ELEMENTS[0];
```

- [ ] **Step 3: Write `src/data/ljReference.ts`**

```typescript
// src/data/ljReference.ts
// Published global-minimum energies for LJ clusters in reduced units (ε=1).
// Source: Cambridge Cluster Database — Wales & Doye.
export const LJ_GLOBAL_MINIMA: Record<number, number> = {
  2:  -1.000000,
  3:  -3.000000,
  4:  -6.000000,
  5:  -9.103852,
  6:  -12.712062,
  7:  -16.505384,
  8:  -19.821489,
  9:  -24.113360,
  10: -28.422532,
  11: -32.765970,
  12: -37.967600,
  13: -44.326801,   // icosahedron
  14: -47.845157,
  15: -52.322627,
  16: -56.815742,
  17: -61.317995,
  18: -66.530949,
  19: -72.659782,
  20: -77.177043,
  21: -81.684571,
  22: -86.809782,
  23: -92.844472,
  24: -97.348815,
  25: -102.372663,
  30: -128.286571,
  38: -173.928427,  // famous double-funnel hard case
  55: -279.248470,  // Mackay icosahedron
};
```

- [ ] **Step 4: Commit**

```bash
git add src/ga/types.ts src/data/elements.ts src/data/ljReference.ts
git commit -m "feat: add shared types and reference data"
```

---

## Task 3 — Seeded PRNG

**Files:**
- Create: `src/ga/rng.ts`
- Create: `tests/ga/rng.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/ga/rng.test.ts
import { describe, it, expect } from 'vitest';
import { createRng } from '../../src/ga/rng';

describe('createRng', () => {
  it('produces a value in [0, 1)', () => {
    const rng = createRng(1);
    const v = rng.next();
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThan(1);
  });

  it('is deterministic given the same seed', () => {
    const r1 = createRng(42);
    const r2 = createRng(42);
    const seq1 = Array.from({ length: 100 }, () => r1.next());
    const seq2 = Array.from({ length: 100 }, () => r2.next());
    expect(seq1).toEqual(seq2);
  });

  it('produces different sequences for different seeds', () => {
    const v1 = createRng(1).next();
    const v2 = createRng(2).next();
    expect(v1).not.toBe(v2);
  });

  it('nextGaussian has mean ~0 and std ~1 over many samples', () => {
    const rng = createRng(99);
    const samples = Array.from({ length: 10_000 }, () => rng.nextGaussian());
    const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
    const variance = samples.reduce((a, b) => a + b * b, 0) / samples.length - mean * mean;
    expect(Math.abs(mean)).toBeLessThan(0.05);
    expect(Math.abs(Math.sqrt(variance) - 1)).toBeLessThan(0.05);
  });

  it('nextInt returns integers in [0, n)', () => {
    const rng = createRng(7);
    for (let i = 0; i < 1000; i++) {
      const v = rng.nextInt(5);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(5);
    }
  });

  it('nextInRange returns values in [lo, hi)', () => {
    const rng = createRng(3);
    for (let i = 0; i < 500; i++) {
      const v = rng.nextInRange(-3, 7);
      expect(v).toBeGreaterThanOrEqual(-3);
      expect(v).toBeLessThan(7);
    }
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npx vitest run tests/ga/rng.test.ts
```

Expected: fails with "Cannot find module '../../src/ga/rng'"

- [ ] **Step 3: Write `src/ga/rng.ts`**

```typescript
// src/ga/rng.ts
export type Rng = ReturnType<typeof createRng>;

export function createRng(seed: number) {
  let s = seed >>> 0;

  function next(): number {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  return {
    next,
    nextGaussian(): number {
      // Box-Muller transform
      const u1 = Math.max(next(), 1e-300);
      const u2 = next();
      return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    },
    nextInRange(lo: number, hi: number): number {
      return lo + next() * (hi - lo);
    },
    nextInt(n: number): number {
      return Math.floor(next() * n);
    },
  };
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx vitest run tests/ga/rng.test.ts
```

Expected: all 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/ga/rng.ts tests/ga/rng.test.ts
git commit -m "feat: add mulberry32 seeded PRNG with Box-Muller gaussian"
```

---

## Task 4 — Potential energy + analytic gradient

**Files:**
- Create: `src/ga/potential.ts`
- Create: `tests/ga/potential.test.ts`

The gradient is defined as ∂E/∂x_i. The FIRE relaxer uses F = −gradient to move atoms. We validate the analytic gradient via central finite differences.

- [ ] **Step 1: Write failing tests**

```typescript
// tests/ga/potential.test.ts
import { describe, it, expect } from 'vitest';
import { computePotential } from '../../src/ga/potential';
import { LJ_REDUCED, MORSE_REDUCED } from '../../src/data/elements';

const EQ_DIST = Math.pow(2, 1 / 6); // LJ pair minimum distance in reduced units

describe('LJ potential', () => {
  it('two atoms at r=σ have energy 0', () => {
    const coords = new Float64Array([0, 0, 0, 1, 0, 0]); // r = 1 = σ
    const { energy } = computePotential(coords, LJ_REDUCED);
    expect(energy).toBeCloseTo(0, 10);
  });

  it('two atoms at equilibrium r=2^(1/6)σ have energy -ε = -1', () => {
    const coords = new Float64Array([0, 0, 0, EQ_DIST, 0, 0]);
    const { energy } = computePotential(coords, LJ_REDUCED);
    expect(energy).toBeCloseTo(-1, 6);
  });

  it('gradient is zero at equilibrium for two atoms', () => {
    const coords = new Float64Array([0, 0, 0, EQ_DIST, 0, 0]);
    const { gradient } = computePotential(coords, LJ_REDUCED);
    for (const g of gradient) expect(Math.abs(g)).toBeLessThan(1e-8);
  });

  it('analytic gradient matches finite difference for 4-atom cluster', () => {
    const rng = [1.1, 0.2, -0.3,  -0.5, 1.3, 0.1,  0.8, -0.9, 0.4,  -0.4, -0.5, 0.9];
    const coords = new Float64Array(rng);
    const { gradient } = computePotential(coords, LJ_REDUCED);
    const h = 1e-5;
    for (let k = 0; k < coords.length; k++) {
      const c1 = coords.slice(); c1[k] += h;
      const c2 = coords.slice(); c2[k] -= h;
      const { energy: ep } = computePotential(c1, LJ_REDUCED);
      const { energy: em } = computePotential(c2, LJ_REDUCED);
      const fd = (ep - em) / (2 * h);
      expect(gradient[k]).toBeCloseTo(fd, 4);
    }
  });

  it('energy is finite and negative for a 3-atom equilateral triangle at equilibrium', () => {
    const r = EQ_DIST;
    const h = r * Math.sqrt(3) / 2;
    const coords = new Float64Array([0, 0, 0, r, 0, 0, r / 2, h, 0]);
    const { energy } = computePotential(coords, LJ_REDUCED);
    expect(energy).toBeCloseTo(-3.0, 2); // 3 pairs each at -1ε ≈ -3ε
  });
});

describe('Morse potential', () => {
  it('two atoms at re have energy -De = -1', () => {
    const coords = new Float64Array([0, 0, 0, MORSE_REDUCED.re, 0, 0]);
    const { energy } = computePotential(coords, MORSE_REDUCED);
    expect(energy).toBeCloseTo(-1, 6);
  });

  it('analytic gradient matches finite difference for 3-atom Morse cluster', () => {
    const coords = new Float64Array([0, 0, 0, 1.5, 0, 0, 0.7, 1.1, 0]);
    const { gradient } = computePotential(coords, MORSE_REDUCED);
    const h = 1e-5;
    for (let k = 0; k < coords.length; k++) {
      const c1 = coords.slice(); c1[k] += h;
      const c2 = coords.slice(); c2[k] -= h;
      const { energy: ep } = computePotential(c1, MORSE_REDUCED);
      const { energy: em } = computePotential(c2, MORSE_REDUCED);
      expect(gradient[k]).toBeCloseTo((ep - em) / (2 * h), 4);
    }
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npx vitest run tests/ga/potential.test.ts
```

Expected: fails with "Cannot find module '../../src/ga/potential'"

- [ ] **Step 3: Write `src/ga/potential.ts`**

```typescript
// src/ga/potential.ts
import type { PotentialParams } from './types';

export interface PotentialResult {
  energy: number;
  gradient: Float64Array; // 3N, ∂E/∂x_i
}

export function computePotential(
  coords: Float64Array,
  p: PotentialParams,
): PotentialResult {
  const N = coords.length / 3;
  const gradient = new Float64Array(coords.length);
  let energy = 0;

  for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) {
      const dx = coords[j * 3]     - coords[i * 3];
      const dy = coords[j * 3 + 1] - coords[i * 3 + 1];
      const dz = coords[j * 3 + 2] - coords[i * 3 + 2];
      const r2 = dx * dx + dy * dy + dz * dz;
      const r  = Math.sqrt(r2);
      const rs = Math.max(r, p.rMin); // clamp to avoid 1/0

      let ePair: number;
      let dedr:  number; // dE_pair / dr

      if (p.type === 'lj') {
        const sr  = p.sigma / rs;
        const sr6 = sr * sr * sr * sr * sr * sr;
        const sr12 = sr6 * sr6;
        ePair = 4 * p.epsilon * (sr12 - sr6);
        // d/dr [4ε((σ/r)^12 - (σ/r)^6)] = (4ε/r)(-12·sr12 + 6·sr6)
        dedr = 4 * p.epsilon * (-12 * sr12 + 6 * sr6) / rs;
      } else {
        // Morse: E = De * (exp(-2α(r-re)) - 2·exp(-α(r-re)))
        const x = Math.exp(-p.alpha * (rs - p.re));
        ePair = p.De * (x * x - 2 * x);
        dedr  = p.De * 2 * p.alpha * x * (1 - x);
      }

      energy += ePair;

      if (r > 0) {
        // ∂E/∂x_i = dedr · (x_i - x_j) / r
        const f = dedr / r;
        gradient[i * 3]     -= f * dx;
        gradient[i * 3 + 1] -= f * dy;
        gradient[i * 3 + 2] -= f * dz;
        gradient[j * 3]     += f * dx;
        gradient[j * 3 + 1] += f * dy;
        gradient[j * 3 + 2] += f * dz;
      }
    }
  }

  return { energy, gradient };
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx vitest run tests/ga/potential.test.ts
```

Expected: all 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/ga/potential.ts tests/ga/potential.test.ts
git commit -m "feat: add LJ + Morse potential with analytic gradient"
```

---

## Task 5 — FIRE local minimizer

**Files:**
- Create: `src/ga/relax.ts`
- Create: `tests/ga/relax.test.ts`

FIRE (Fast Inertial Relaxation Engine): MD-based minimizer that steers fictitious atomic velocities toward the force direction and adjusts the time step. Every GA candidate is relaxed to its nearest local minimum before scoring (Deaven–Ho's key insight).

- [ ] **Step 1: Write failing tests**

```typescript
// tests/ga/relax.test.ts
import { describe, it, expect } from 'vitest';
import { relax } from '../../src/ga/relax';
import { LJ_REDUCED } from '../../src/data/elements';
import { computePotential } from '../../src/ga/potential';

const EQ = Math.pow(2, 1 / 6);

describe('relax (FIRE)', () => {
  it('relaxes two LJ atoms to equilibrium distance within tolerance', () => {
    // Start slightly off equilibrium
    const coords = new Float64Array([0, 0, 0, EQ * 1.3, 0, 0]);
    const result = relax(coords, LJ_REDUCED);
    expect(result.converged).toBe(true);
    const r = coords[3]; // x-coord of second atom
    expect(r).toBeCloseTo(EQ, 2);
  });

  it('energy after relaxation is ≤ energy before relaxation', () => {
    const coords = new Float64Array([0, 0, 0, 2.5, 0, 0]);
    const before = computePotential(coords.slice() as Float64Array, LJ_REDUCED).energy;
    relax(coords, LJ_REDUCED);
    const after = computePotential(coords, LJ_REDUCED).energy;
    expect(after).toBeLessThanOrEqual(before + 1e-8);
  });

  it('RMS force after convergence is below forceTol', () => {
    const r = EQ;
    const h = r * Math.sqrt(3) / 2;
    // Equilateral triangle, slightly perturbed
    const coords = new Float64Array([0.05, 0, 0, r + 0.1, -0.05, 0, r / 2 + 0.05, h, 0.03]);
    const tol = 1e-4;
    relax(coords, LJ_REDUCED, { forceTol: tol });
    const { gradient } = computePotential(coords, LJ_REDUCED);
    const rms = Math.sqrt(gradient.reduce((s, g) => s + g * g, 0) / gradient.length);
    expect(rms).toBeLessThan(tol * 10); // allow some numerical slack
  });

  it('returns non-converged for zero-maxIter', () => {
    const coords = new Float64Array([0, 0, 0, 3, 0, 0]);
    const result = relax(coords, LJ_REDUCED, { maxIter: 0 });
    expect(result.converged).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npx vitest run tests/ga/relax.test.ts
```

Expected: fails with "Cannot find module '../../src/ga/relax'"

- [ ] **Step 3: Write `src/ga/relax.ts`**

```typescript
// src/ga/relax.ts
import { computePotential } from './potential';
import type { PotentialParams } from './types';

export interface RelaxOptions {
  maxIter?: number;
  forceTol?: number;
  dt0?: number;
  dtMax?: number;
}

export interface RelaxResult {
  energy: number;
  iters: number;
  converged: boolean;
}

export function relax(
  coords: Float64Array,   // modified in-place
  params: PotentialParams,
  opts: RelaxOptions = {},
): RelaxResult {
  const { maxIter = 500, forceTol = 1e-4, dt0 = 0.05, dtMax = 0.5 } = opts;
  const N3 = coords.length;
  const vel = new Float64Array(N3);

  // FIRE hyper-parameters
  const N_min = 5;
  const f_inc = 1.1, f_dec = 0.5;
  const alpha0 = 0.1, f_alpha = 0.99;
  let alpha = alpha0;
  let dt = dt0;
  let nPos = 0;

  for (let iter = 0; iter < maxIter; iter++) {
    const { energy, gradient } = computePotential(coords, params);

    if (!isFinite(energy)) return { energy, iters: iter, converged: false };

    // RMS force convergence check  (F = -gradient)
    let rms2 = 0;
    for (let k = 0; k < N3; k++) rms2 += gradient[k] * gradient[k];
    if (Math.sqrt(rms2 / N3) < forceTol) return { energy, iters: iter, converged: true };

    // Velocity Verlet half-step: v += dt · F  (F = -grad)
    for (let k = 0; k < N3; k++) vel[k] -= dt * gradient[k];

    // Power P = F · v = -grad · v
    let P = 0, v2 = 0, f2 = 0;
    for (let k = 0; k < N3; k++) {
      P  -= gradient[k] * vel[k];
      v2 += vel[k] * vel[k];
      f2 += gradient[k] * gradient[k];
    }

    // Mix velocity toward force direction: v = (1-α)v + α|v|F̂
    const vn = Math.sqrt(v2);
    const fn = Math.sqrt(f2);
    if (fn > 0 && vn > 0) {
      for (let k = 0; k < N3; k++) {
        vel[k] = (1 - alpha) * vel[k] + alpha * vn * (-gradient[k]) / fn;
      }
    }

    if (P > 0) {
      nPos++;
      if (nPos >= N_min) {
        dt    = Math.min(dt * f_inc, dtMax);
        alpha = alpha * f_alpha;
      }
    } else {
      nPos  = 0;
      dt    = dt * f_dec;
      alpha = alpha0;
      vel.fill(0);
    }

    // Position update
    for (let k = 0; k < N3; k++) coords[k] += dt * vel[k];
  }

  const { energy } = computePotential(coords, params);
  return { energy, iters: maxIter, converged: false };
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx vitest run tests/ga/relax.test.ts
```

Expected: all 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/ga/relax.ts tests/ga/relax.test.ts
git commit -m "feat: add FIRE local minimizer"
```

---

## Task 6 — Crossover + mutation operators

**Files:**
- Create: `src/ga/operators.ts`
- Create: `tests/ga/operators.test.ts`

Cut-and-splice (Deaven–Ho): center both parents, apply independent random rotations, take the top-k atoms by z from parent A and the bottom-(N-k) atoms by z from parent B to form a child with exactly N atoms.

- [ ] **Step 1: Write failing tests**

```typescript
// tests/ga/operators.test.ts
import { describe, it, expect } from 'vitest';
import { createRng } from '../../src/ga/rng';
import { cutAndSpliceCrossover, rattleMutation, replaceMutation } from '../../src/ga/operators';

function makeCluster(n: number, spread: number): Float64Array {
  const c = new Float64Array(n * 3);
  for (let i = 0; i < n; i++) {
    c[i * 3]     = (i - n / 2) * spread;
    c[i * 3 + 1] = Math.sin(i) * spread;
    c[i * 3 + 2] = Math.cos(i) * spread * 0.5;
  }
  return c;
}

describe('cutAndSpliceCrossover', () => {
  it('always yields exactly N atoms', () => {
    const rng = createRng(1);
    for (let trial = 0; trial < 50; trial++) {
      const N = 7 + (trial % 10);
      const child = cutAndSpliceCrossover(makeCluster(N, 1.1), makeCluster(N, 1.1), rng);
      expect(child.length).toBe(N * 3);
    }
  });

  it('child coordinates are finite', () => {
    const rng = createRng(5);
    const child = cutAndSpliceCrossover(makeCluster(13, 1.0), makeCluster(13, 1.0), rng);
    for (const v of child) expect(isFinite(v)).toBe(true);
  });

  it('is deterministic for the same seeded RNG state', () => {
    const c1 = cutAndSpliceCrossover(makeCluster(7, 1.0), makeCluster(7, 0.9), createRng(42));
    const c2 = cutAndSpliceCrossover(makeCluster(7, 1.0), makeCluster(7, 0.9), createRng(42));
    expect(Array.from(c1)).toEqual(Array.from(c2));
  });
});

describe('rattleMutation', () => {
  it('changes all coordinates', () => {
    const rng = createRng(10);
    const original = makeCluster(7, 1.0);
    const mutated = rattleMutation(original, 0.3, rng);
    let changed = 0;
    for (let i = 0; i < original.length; i++) if (original[i] !== mutated[i]) changed++;
    expect(changed).toBeGreaterThan(0);
  });

  it('does not mutate the original array', () => {
    const original = makeCluster(7, 1.0);
    const copy = original.slice();
    rattleMutation(original, 0.3, createRng(1));
    expect(Array.from(original)).toEqual(Array.from(copy));
  });
});

describe('replaceMutation', () => {
  it('changes some but not all coordinates (fraction=0.2, N=10)', () => {
    const rng = createRng(20);
    const original = makeCluster(10, 1.0);
    const mutated = replaceMutation(original, 0.2, 3.0, rng);
    expect(mutated.length).toBe(original.length);
    // At least 1 coordinate changed
    let changed = 0;
    for (let i = 0; i < original.length; i++) if (original[i] !== mutated[i]) changed++;
    expect(changed).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npx vitest run tests/ga/operators.test.ts
```

Expected: fails with "Cannot find module '../../src/ga/operators'"

- [ ] **Step 3: Write `src/ga/operators.ts`**

```typescript
// src/ga/operators.ts
import type { Rng } from './rng';

function centerOfMass(c: Float64Array): [number, number, number] {
  const N = c.length / 3;
  let cx = 0, cy = 0, cz = 0;
  for (let i = 0; i < N; i++) { cx += c[i*3]; cy += c[i*3+1]; cz += c[i*3+2]; }
  return [cx / N, cy / N, cz / N];
}

function translateToOrigin(c: Float64Array): void {
  const [cx, cy, cz] = centerOfMass(c);
  for (let i = 0; i < c.length / 3; i++) { c[i*3] -= cx; c[i*3+1] -= cy; c[i*3+2] -= cz; }
}

// Uniform random rotation via Shoemake's method (random quaternion → matrix)
function randomRotation(rng: Rng): Float64Array {
  const u1 = rng.next(), u2 = rng.next(), u3 = rng.next();
  const q0 = Math.sqrt(1 - u1) * Math.sin(2 * Math.PI * u2);
  const q1 = Math.sqrt(1 - u1) * Math.cos(2 * Math.PI * u2);
  const q2 = Math.sqrt(u1)     * Math.sin(2 * Math.PI * u3);
  const q3 = Math.sqrt(u1)     * Math.cos(2 * Math.PI * u3);
  const R = new Float64Array(9);
  R[0] = 1 - 2*(q2*q2 + q3*q3); R[1] = 2*(q1*q2 - q3*q0); R[2] = 2*(q1*q3 + q2*q0);
  R[3] = 2*(q1*q2 + q3*q0); R[4] = 1 - 2*(q1*q1 + q3*q3); R[5] = 2*(q2*q3 - q1*q0);
  R[6] = 2*(q1*q3 - q2*q0); R[7] = 2*(q2*q3 + q1*q0); R[8] = 1 - 2*(q1*q1 + q2*q2);
  return R;
}

function applyRotation(c: Float64Array, R: Float64Array): Float64Array {
  const N = c.length / 3;
  const out = new Float64Array(c.length);
  for (let i = 0; i < N; i++) {
    const x = c[i*3], y = c[i*3+1], z = c[i*3+2];
    out[i*3]   = R[0]*x + R[1]*y + R[2]*z;
    out[i*3+1] = R[3]*x + R[4]*y + R[5]*z;
    out[i*3+2] = R[6]*x + R[7]*y + R[8]*z;
  }
  return out;
}

// Cut-and-splice (Deaven & Ho, 1995)
export function cutAndSpliceCrossover(
  parentA: Float64Array,
  parentB: Float64Array,
  rng: Rng,
): Float64Array {
  const N = parentA.length / 3;

  const a = parentA.slice(); translateToOrigin(a);
  const b = parentB.slice(); translateToOrigin(b);

  const rotA = applyRotation(a, randomRotation(rng));
  const rotB = applyRotation(b, randomRotation(rng));

  // k atoms from A (highest z), N-k atoms from B (lowest z)
  const k = 1 + rng.nextInt(N - 1);

  const idxA = Array.from({ length: N }, (_, i) => i)
    .sort((i, j) => rotA[j*3+2] - rotA[i*3+2]); // descending z
  const idxB = Array.from({ length: N }, (_, i) => i)
    .sort((i, j) => rotB[i*3+2] - rotB[j*3+2]); // ascending z

  const child = new Float64Array(N * 3);
  for (let i = 0; i < k; i++) {
    const ai = idxA[i];
    child[i*3] = rotA[ai*3]; child[i*3+1] = rotA[ai*3+1]; child[i*3+2] = rotA[ai*3+2];
  }
  for (let i = 0; i < N - k; i++) {
    const bi = idxB[i];
    child[(k+i)*3] = rotB[bi*3]; child[(k+i)*3+1] = rotB[bi*3+1]; child[(k+i)*3+2] = rotB[bi*3+2];
  }

  translateToOrigin(child);
  return child;
}

// Rattle: Gaussian displacement of every atom
export function rattleMutation(
  coords: Float64Array,
  sigma: number,
  rng: Rng,
): Float64Array {
  const out = coords.slice();
  for (let k = 0; k < out.length; k++) out[k] += sigma * rng.nextGaussian();
  return out;
}

// Replace: randomize a fraction of atom positions inside a sphere
export function replaceMutation(
  coords: Float64Array,
  fraction: number,
  radius: number,
  rng: Rng,
): Float64Array {
  const N = coords.length / 3;
  const out = coords.slice();
  const n = Math.max(1, Math.round(N * fraction));

  // Fisher-Yates shuffle to pick n random indices
  const idx = Array.from({ length: N }, (_, i) => i);
  for (let i = N - 1; i > 0 && i >= N - n; i--) {
    const j = rng.nextInt(i + 1);
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }

  for (let t = 0; t < n; t++) {
    const at = idx[N - 1 - t];
    let x, y, z;
    do {
      x = rng.nextInRange(-1, 1);
      y = rng.nextInRange(-1, 1);
      z = rng.nextInRange(-1, 1);
    } while (x*x + y*y + z*z > 1);
    out[at*3] = x * radius;
    out[at*3+1] = y * radius;
    out[at*3+2] = z * radius;
  }
  return out;
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx vitest run tests/ga/operators.test.ts
```

Expected: all 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/ga/operators.ts tests/ga/operators.test.ts
git commit -m "feat: add cut-and-splice crossover and rattle/replace mutations"
```

---

## Task 7 — Selection

**Files:**
- Create: `src/ga/select.ts`
- Create: `tests/ga/select.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/ga/select.test.ts
import { describe, it, expect } from 'vitest';
import { createRng } from '../../src/ga/rng';
import { tournamentSelect, applyElitism, isDiverse } from '../../src/ga/select';
import type { Individual } from '../../src/ga/select';

function makePopulation(energies: number[]): Individual[] {
  return energies.map((energy, i) => ({
    coords: new Float64Array([i, 0, 0]),
    energy,
  }));
}

describe('tournamentSelect', () => {
  it('always returns an individual from the population', () => {
    const pop = makePopulation([-1, -2, -3, -4, -5]);
    const rng = createRng(1);
    for (let i = 0; i < 100; i++) {
      const sel = tournamentSelect(pop, 3, rng);
      expect(pop).toContain(sel);
    }
  });

  it('with tournament size = population size always picks the best', () => {
    const pop = makePopulation([-1, -5, -2, -4, -3]);
    const rng = createRng(2);
    for (let i = 0; i < 50; i++) {
      const sel = tournamentSelect(pop, pop.length, rng);
      expect(sel.energy).toBe(-5);
    }
  });
});

describe('applyElitism', () => {
  it('returns the k lowest-energy individuals', () => {
    const pop = makePopulation([-2, -5, -1, -4, -3]);
    const elite = applyElitism(pop, 2);
    expect(elite).toHaveLength(2);
    const energies = elite.map(e => e.energy).sort((a, b) => a - b);
    expect(energies).toEqual([-5, -4]);
  });

  it('makes deep copies — mutating elite does not affect original population', () => {
    const pop = makePopulation([-3, -5]);
    const elite = applyElitism(pop, 1);
    elite[0].coords[0] = 999;
    expect(pop[1].coords[0]).toBe(1);
  });
});

describe('isDiverse', () => {
  it('returns true when threshold is 0 (disabled)', () => {
    const pop = makePopulation([-3, -3, -3]);
    const ind: Individual = { coords: new Float64Array([0, 0, 0]), energy: -3 };
    expect(isDiverse(ind, pop, 0)).toBe(true);
  });

  it('returns false when individual is too close in energy to an existing member', () => {
    const pop = makePopulation([-10.0]);
    const ind: Individual = { coords: new Float64Array([0, 0, 0]), energy: -10.0001 };
    expect(isDiverse(ind, pop, 0.01)).toBe(false);
  });

  it('returns true when individual is sufficiently different', () => {
    const pop = makePopulation([-10.0]);
    const ind: Individual = { coords: new Float64Array([0, 0, 0]), energy: -8.0 };
    expect(isDiverse(ind, pop, 0.01)).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npx vitest run tests/ga/select.test.ts
```

Expected: fails with "Cannot find module '../../src/ga/select'"

- [ ] **Step 3: Write `src/ga/select.ts`**

```typescript
// src/ga/select.ts
import type { Rng } from './rng';

export interface Individual {
  coords: Float64Array;
  energy: number;
}

export function tournamentSelect(
  population: Individual[],
  tournamentSize: number,
  rng: Rng,
): Individual {
  let best = population[rng.nextInt(population.length)];
  for (let i = 1; i < tournamentSize; i++) {
    const candidate = population[rng.nextInt(population.length)];
    if (candidate.energy < best.energy) best = candidate;
  }
  return best;
}

export function applyElitism(population: Individual[], count: number): Individual[] {
  return [...population]
    .sort((a, b) => a.energy - b.energy)
    .slice(0, count)
    .map(ind => ({ coords: ind.coords.slice(), energy: ind.energy }));
}

export function isDiverse(
  individual: Individual,
  population: Individual[],
  threshold: number,
): boolean {
  if (threshold <= 0) return true;
  return population.every(p => Math.abs(p.energy - individual.energy) >= threshold);
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx vitest run tests/ga/select.test.ts
```

Expected: all 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/ga/select.ts tests/ga/select.test.ts
git commit -m "feat: add tournament selection, elitism, diversity guard"
```

---

## Task 8 — GA engine + integration test

**Files:**
- Create: `src/ga/engine.ts`
- Create: `tests/ga/engine.test.ts`

The integration test (LJ₁₃ seeded run) is the proof-of-correctness for the entire engine layer.

- [ ] **Step 1: Write failing tests**

```typescript
// tests/ga/engine.test.ts
import { describe, it, expect } from 'vitest';
import { GAEngine } from '../../src/ga/engine';
import { LJ_REDUCED } from '../../src/data/elements';
import { LJ_GLOBAL_MINIMA } from '../../src/data/ljReference';
import type { GAConfig } from '../../src/ga/types';

const BASE_CONFIG: GAConfig = {
  elementSymbol: 'Ar',
  n: 5,
  potentialParams: LJ_REDUCED,
  populationSize: 10,
  eliteCount: 1,
  mutationRate: 0.4,
  mutationSigma: 0.3,
  selectionMethod: 'tournament',
  tournamentSize: 3,
  maxGenerations: 100,
  seed: 42,
  relaxMaxIter: 300,
  relaxForceTol: 1e-4,
  diversityThreshold: 0,
};

describe('GAEngine', () => {
  it('initialize creates populationSize individuals', () => {
    const eng = new GAEngine(BASE_CONFIG);
    eng.initialize();
    // The snapshot after the first step should have finite energy
    const snap = eng.step();
    expect(isFinite(snap.bestEnergy)).toBe(true);
    expect(snap.generation).toBe(1);
  });

  it('step increments the generation counter', () => {
    const eng = new GAEngine(BASE_CONFIG);
    eng.initialize();
    eng.step();
    const snap2 = eng.step();
    expect(snap2.generation).toBe(2);
  });

  it('bestEnergy is always ≤ avgEnergy', () => {
    const eng = new GAEngine(BASE_CONFIG);
    eng.initialize();
    for (let i = 0; i < 10; i++) {
      const snap = eng.step();
      expect(snap.bestEnergy).toBeLessThanOrEqual(snap.avgEnergy + 1e-8);
    }
  });

  it('bestCoords has length 3*N', () => {
    const eng = new GAEngine(BASE_CONFIG);
    eng.initialize();
    const snap = eng.step();
    expect(snap.bestCoords.length).toBe(BASE_CONFIG.n * 3);
  });

  it('is reproducible: same seed → same energy sequence', () => {
    const eng1 = new GAEngine({ ...BASE_CONFIG, seed: 7 });
    const eng2 = new GAEngine({ ...BASE_CONFIG, seed: 7 });
    eng1.initialize(); eng2.initialize();
    const energies1 = Array.from({ length: 5 }, () => eng1.step().bestEnergy);
    const energies2 = Array.from({ length: 5 }, () => eng2.step().bestEnergy);
    expect(energies1).toEqual(energies2);
  });

  it('updateConfig changes mutation rate without restart', () => {
    const eng = new GAEngine(BASE_CONFIG);
    eng.initialize();
    eng.updateConfig({ mutationRate: 0.9 });
    const snap = eng.step(); // must not throw
    expect(snap.generation).toBe(1);
  });
});

// Integration test: recover LJ₁₃ global minimum (icosahedron = -44.3268 ε)
// Generous budget: 800 generations, population 25, seed 42.
describe('Integration: LJ₁₃ recovery', () => {
  it('finds energy within 5% of known global minimum', { timeout: 60_000 }, () => {
    const config: GAConfig = {
      ...BASE_CONFIG,
      n: 13,
      populationSize: 25,
      eliteCount: 2,
      mutationRate: 0.35,
      mutationSigma: 0.25,
      tournamentSize: 3,
      seed: 42,
      relaxMaxIter: 500,
      relaxForceTol: 1e-4,
    };
    const eng = new GAEngine(config);
    eng.initialize();
    let best = Infinity;
    for (let g = 0; g < 800; g++) {
      const snap = eng.step();
      if (snap.bestEnergy < best) best = snap.bestEnergy;
    }
    const ref = LJ_GLOBAL_MINIMA[13]; // -44.326801
    const pctError = Math.abs((best - ref) / ref) * 100;
    expect(pctError).toBeLessThan(5);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npx vitest run tests/ga/engine.test.ts
```

Expected: fails with "Cannot find module '../../src/ga/engine'"

- [ ] **Step 3: Write `src/ga/engine.ts`**

```typescript
// src/ga/engine.ts
import { computePotential } from './potential';
import { relax } from './relax';
import { cutAndSpliceCrossover, rattleMutation, replaceMutation } from './operators';
import { tournamentSelect, applyElitism, isDiverse, type Individual } from './select';
import { createRng, type Rng } from './rng';
import type { GAConfig, Snapshot } from './types';

function randomInSphere(rng: Rng): [number, number, number] {
  let x, y, z;
  do {
    x = rng.nextInRange(-1, 1);
    y = rng.nextInRange(-1, 1);
    z = rng.nextInRange(-1, 1);
  } while (x*x + y*y + z*z > 1);
  return [x, y, z];
}

function randomCluster(N: number, radius: number, rng: Rng): Float64Array {
  const c = new Float64Array(N * 3);
  for (let i = 0; i < N; i++) {
    const [x, y, z] = randomInSphere(rng);
    c[i*3] = x * radius; c[i*3+1] = y * radius; c[i*3+2] = z * radius;
  }
  return c;
}

function rmsGradient(gradient: Float64Array): number {
  let s = 0;
  for (const g of gradient) s += g * g;
  return Math.sqrt(s / gradient.length);
}

export class GAEngine {
  private config: GAConfig;
  private rng: Rng;
  private population: Individual[] = [];
  private generation = 0;

  constructor(config: GAConfig) {
    this.config = { ...config };
    this.rng = createRng(config.seed);
  }

  initialize(): void {
    const { n, potentialParams, populationSize } = this.config;
    const initRadius = Math.max(n * potentialParams.sigma * 0.45, 1.5);
    this.population = [];
    this.generation = 0;

    for (let i = 0; i < populationSize; i++) {
      const coords = randomCluster(n, initRadius, this.rng);
      const result = relax(coords, potentialParams, {
        maxIter: this.config.relaxMaxIter,
        forceTol: this.config.relaxForceTol,
      });
      this.population.push({ coords, energy: isFinite(result.energy) ? result.energy : 1e9 });
    }
  }

  step(): Snapshot {
    const {
      potentialParams, eliteCount, mutationRate, mutationSigma,
      tournamentSize, diversityThreshold, n,
    } = this.config;

    const nextGen: Individual[] = applyElitism(this.population, eliteCount);

    let attempts = 0;
    while (nextGen.length < this.population.length && attempts < this.population.length * 10) {
      attempts++;
      const pA = tournamentSelect(this.population, tournamentSize, this.rng);
      const pB = tournamentSelect(this.population, tournamentSize, this.rng);

      let childCoords = cutAndSpliceCrossover(pA.coords, pB.coords, this.rng);

      if (this.rng.next() < mutationRate) {
        if (this.rng.next() < 0.7) {
          childCoords = rattleMutation(childCoords, mutationSigma, this.rng);
        } else {
          const r = Math.max(n * potentialParams.sigma * 0.4, 1.2);
          childCoords = replaceMutation(childCoords, 0.2, r, this.rng);
        }
      }

      const result = relax(childCoords, potentialParams, {
        maxIter: this.config.relaxMaxIter,
        forceTol: this.config.relaxForceTol,
      });
      if (!isFinite(result.energy)) continue;

      const child: Individual = { coords: childCoords, energy: result.energy };
      if (!isDiverse(child, nextGen, diversityThreshold)) continue;

      nextGen.push(child);
    }

    this.population = nextGen
      .sort((a, b) => a.energy - b.energy)
      .slice(0, this.config.populationSize);

    this.generation++;

    const best = this.population[0];
    const avgEnergy = this.population.reduce((s, p) => s + p.energy, 0) / this.population.length;
    const { gradient } = computePotential(best.coords, potentialParams);

    // Convert Float64Array → Float32Array for Three.js (transferable, less memory)
    const bestCoords = new Float32Array(best.coords.length);
    for (let i = 0; i < best.coords.length; i++) bestCoords[i] = best.coords[i];

    return {
      generation: this.generation,
      bestEnergy: best.energy,
      avgEnergy,
      bestCoords,
      rmsForce: rmsGradient(gradient),
    };
  }

  updateConfig(params: Partial<GAConfig>): void {
    Object.assign(this.config, params);
  }

  getGeneration(): number { return this.generation; }
}
```

- [ ] **Step 4: Run all engine tests — expect PASS**

```bash
npx vitest run tests/ga/engine.test.ts
```

Expected: all 7 tests pass including the LJ₁₃ integration test (may take up to 30s).

- [ ] **Step 5: Run the full test suite to confirm nothing broken**

```bash
npx vitest run
```

Expected: all tests across all files pass.

- [ ] **Step 6: Commit**

```bash
git add src/ga/engine.ts tests/ga/engine.test.ts
git commit -m "feat: add GA engine with LJ13 integration test"
```

---

## Task 9 — Web Worker

**Files:**
- Create: `src/worker/ga.worker.ts`

Workers cannot be unit-tested in jsdom — manual verification in Task 13 covers this layer. The protocol is: main thread sends `WorkerCommand` objects; worker sends throttled `WorkerMessage` snapshots as transferables.

- [ ] **Step 1: Write `src/worker/ga.worker.ts`**

```typescript
// src/worker/ga.worker.ts
import { GAEngine } from '../ga/engine';
import type { GAConfig, WorkerCommand, WorkerMessage, Snapshot } from '../ga/types';

let engine: GAEngine | null = null;
let running = false;
let paused  = false;
let lastSentAt = 0;
const MIN_INTERVAL_MS = 33; // ~30 snapshots/sec max

function send(msg: WorkerMessage, transfer?: Transferable[]): void {
  (self as unknown as Worker).postMessage(msg, { transfer: transfer ?? [] });
}

function sendSnapshot(snap: Snapshot, force = false): void {
  const now = Date.now();
  if (!force && now - lastSentAt < MIN_INTERVAL_MS) return;
  lastSentAt = now;
  // Transfer the coords buffer to avoid copying
  const coords = snap.bestCoords.slice();
  send({ type: 'snapshot', snapshot: { ...snap, bestCoords: coords } }, [coords.buffer]);
}

async function runLoop(): Promise<void> {
  while (running) {
    if (paused) { await sleep(50); continue; }
    try {
      const snap = engine!.step();
      sendSnapshot(snap);
    } catch (err) {
      send({ type: 'error', message: String(err) });
      running = false;
      break;
    }
    // Yield to the event loop so incoming messages can be processed
    await sleep(0);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

(self as unknown as Worker).onmessage = (e: MessageEvent<WorkerCommand>) => {
  const cmd = e.data;
  switch (cmd.type) {
    case 'start':
      engine = new GAEngine(cmd.config as GAConfig);
      engine.initialize();
      running = true;
      paused  = false;
      runLoop();
      break;
    case 'pause':
      paused = true;
      break;
    case 'resume':
      paused = false;
      break;
    case 'step':
      if (engine) {
        paused = true;
        sendSnapshot(engine.step(), true);
      }
      break;
    case 'stop':
      running = false;
      break;
    case 'reset':
      running = false;
      engine  = null;
      break;
    case 'updateParams':
      engine?.updateConfig(cmd.params as Partial<GAConfig>);
      break;
  }
};
```

- [ ] **Step 2: Commit**

```bash
git add src/worker/ga.worker.ts
git commit -m "feat: add Web Worker GA shell with throttled snapshot protocol"
```

---

## Task 10 — Zustand store

**Files:**
- Create: `src/state/store.ts`
- Create: `tests/state/store.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/state/store.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Must mock Worker before importing store
const mockWorker = {
  postMessage: vi.fn(),
  terminate: vi.fn(),
  onmessage: null as ((e: MessageEvent) => void) | null,
};
vi.stubGlobal('Worker', vi.fn(() => mockWorker));

// Also stub URL (Vite worker URL isn't resolved in jsdom)
vi.stubGlobal('URL', class {
  constructor(public href: string, base?: string) {}
  toString() { return this.href; }
  static createObjectURL = vi.fn();
});

const { useStore } = await import('../../src/state/store');

describe('useStore', () => {
  beforeEach(() => {
    useStore.setState({
      status: 'idle',
      snapshot: null,
      history: [],
      error: null,
      worker: null,
    });
    vi.clearAllMocks();
  });

  it('setConfig updates config n', () => {
    useStore.getState().setConfig({ n: 20 });
    expect(useStore.getState().config.n).toBe(20);
  });

  it('start creates a worker and sets status to running', () => {
    useStore.getState().start();
    expect(useStore.getState().status).toBe('running');
    expect(mockWorker.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'start' })
    );
  });

  it('pause sends pause command and sets status to paused', () => {
    useStore.setState({ status: 'running', worker: mockWorker as unknown as Worker });
    useStore.getState().pause();
    expect(useStore.getState().status).toBe('paused');
    expect(mockWorker.postMessage).toHaveBeenCalledWith({ type: 'pause' });
  });

  it('reset terminates the worker and returns to idle', () => {
    useStore.setState({ status: 'running', worker: mockWorker as unknown as Worker });
    useStore.getState().reset();
    expect(mockWorker.terminate).toHaveBeenCalled();
    expect(useStore.getState().status).toBe('idle');
    expect(useStore.getState().snapshot).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npx vitest run tests/state/store.test.ts
```

Expected: fails with "Cannot find module '../../src/state/store'"

- [ ] **Step 3: Write `src/state/store.ts`**

```typescript
// src/state/store.ts
import { create } from 'zustand';
import { LJ_REDUCED } from '../data/elements';
import type { GAConfig, Snapshot, WorkerCommand, WorkerMessage } from '../ga/types';

const DEFAULT_CONFIG: GAConfig = {
  elementSymbol: 'Ar',
  n: 13,
  potentialParams: { ...LJ_REDUCED },
  populationSize: 20,
  eliteCount: 2,
  mutationRate: 0.3,
  mutationSigma: 0.3,
  selectionMethod: 'tournament',
  tournamentSize: 3,
  maxGenerations: 1000,
  seed: 42,
  relaxMaxIter: 500,
  relaxForceTol: 1e-4,
  diversityThreshold: 0,
};

interface HistoryPoint { gen: number; best: number; avg: number; }

interface StoreState {
  config: GAConfig;
  status: 'idle' | 'running' | 'paused';
  snapshot: Snapshot | null;
  history: HistoryPoint[];
  error: string | null;
  worker: Worker | null;

  setConfig: (partial: Partial<GAConfig>) => void;
  start: () => void;
  pause: () => void;
  resume: () => void;
  step: () => void;
  reset: () => void;
  updateParams: (partial: Partial<GAConfig>) => void;
}

function cmd(worker: Worker | null, msg: WorkerCommand): void {
  worker?.postMessage(msg);
}

export const useStore = create<StoreState>((set, get) => ({
  config: DEFAULT_CONFIG,
  status: 'idle',
  snapshot: null,
  history: [],
  error: null,
  worker: null,

  setConfig: (partial) => set(s => ({ config: { ...s.config, ...partial } })),

  start: () => {
    get().worker?.terminate();
    const worker = new Worker(
      new URL('../worker/ga.worker.ts', import.meta.url),
      { type: 'module' },
    );
    worker.onmessage = (e: MessageEvent<WorkerMessage>) => {
      const msg = e.data;
      if (msg.type === 'snapshot') {
        set(s => ({
          snapshot: msg.snapshot,
          history: [
            ...s.history,
            { gen: msg.snapshot.generation, best: msg.snapshot.bestEnergy, avg: msg.snapshot.avgEnergy },
          ].slice(-2000),
        }));
      } else if (msg.type === 'error') {
        set({ error: msg.message, status: 'idle' });
      }
    };
    set({ worker, status: 'running', snapshot: null, history: [], error: null });
    cmd(worker, { type: 'start', config: get().config });
  },

  pause: () => {
    cmd(get().worker, { type: 'pause' });
    set({ status: 'paused' });
  },

  resume: () => {
    cmd(get().worker, { type: 'resume' });
    set({ status: 'running' });
  },

  step: () => {
    if (get().status === 'idle') return;
    cmd(get().worker, { type: 'step' });
  },

  reset: () => {
    get().worker?.terminate();
    set({ worker: null, status: 'idle', snapshot: null, history: [], error: null });
  },

  updateParams: (partial) => {
    set(s => ({ config: { ...s.config, ...partial } }));
    cmd(get().worker, { type: 'updateParams', params: partial });
  },
}));
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx vitest run tests/state/store.test.ts
```

Expected: all 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/state/store.ts tests/state/store.test.ts
git commit -m "feat: add Zustand store with worker lifecycle management"
```

---

## Task 11 — 3D Visualization (ClusterScene, Atoms, Bonds)

**Files:**
- Create: `src/viz/ClusterScene.tsx`
- Create: `src/viz/Atoms.tsx`
- Create: `src/viz/Bonds.tsx`

No unit tests — Three.js / WebGL doesn't run in jsdom. Verified visually in Task 13.

- [ ] **Step 1: Write `src/viz/Atoms.tsx`**

```tsx
// src/viz/Atoms.tsx
import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { ElementData } from '../data/elements';

interface AtomsProps {
  coords: Float32Array;
  element: ElementData;
}

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

export function Atoms({ coords, element }: AtomsProps) {
  const count = coords.length / 3;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const fromRef  = useRef(coords.slice());
  const toRef    = useRef(coords.slice());
  const tRef     = useRef(1);
  const dummy    = useRef(new THREE.Object3D());
  const color    = useRef(new THREE.Color(element.color));

  useEffect(() => {
    // Capture current interpolated position as new "from"
    const t = tRef.current;
    const newFrom = new Float32Array(coords.length);
    for (let i = 0; i < coords.length; i++) {
      newFrom[i] = lerp(fromRef.current[i], toRef.current[i], t);
    }
    fromRef.current = newFrom;
    toRef.current   = coords.slice();
    tRef.current    = 0;
  }, [coords]);

  useEffect(() => {
    color.current = new THREE.Color(element.color);
  }, [element.color]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    tRef.current = Math.min(tRef.current + delta * 6, 1);
    const t   = tRef.current;
    const from = fromRef.current;
    const to   = toRef.current;

    for (let i = 0; i < count; i++) {
      dummy.current.position.set(
        lerp(from[i*3],   to[i*3],   t),
        lerp(from[i*3+1], to[i*3+1], t),
        lerp(from[i*3+2], to[i*3+2], t),
      );
      dummy.current.scale.setScalar(element.radius);
      dummy.current.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.current.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 24, 24]} />
      <meshPhongMaterial color={color.current} shininess={100} specular="#ffffff" />
    </instancedMesh>
  );
}
```

- [ ] **Step 2: Write `src/viz/Bonds.tsx`**

```tsx
// src/viz/Bonds.tsx
import { useMemo } from 'react';
import * as THREE from 'three';

interface BondsProps {
  coords: Float32Array;
  cutoff?: number; // nearest-neighbour cutoff in σ units (default 1.8)
}

export function Bonds({ coords, cutoff = 1.8 }: BondsProps) {
  const pairs = useMemo(() => {
    const N = coords.length / 3;
    const c2 = cutoff * cutoff;
    const result: Array<{ start: THREE.Vector3; end: THREE.Vector3 }> = [];
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        const dx = coords[j*3]   - coords[i*3];
        const dy = coords[j*3+1] - coords[i*3+1];
        const dz = coords[j*3+2] - coords[i*3+2];
        if (dx*dx + dy*dy + dz*dz < c2) {
          result.push({
            start: new THREE.Vector3(coords[i*3], coords[i*3+1], coords[i*3+2]),
            end:   new THREE.Vector3(coords[j*3], coords[j*3+1], coords[j*3+2]),
          });
        }
      }
    }
    return result;
  }, [coords, cutoff]);

  const up = useMemo(() => new THREE.Vector3(0, 1, 0), []);

  return (
    <>
      {pairs.map(({ start, end }, idx) => {
        const dir = end.clone().sub(start);
        const len = dir.length();
        const mid = start.clone().lerp(end, 0.5);
        const quat = new THREE.Quaternion().setFromUnitVectors(up, dir.clone().normalize());
        return (
          <mesh key={idx} position={mid} quaternion={quat}>
            <cylinderGeometry args={[0.04, 0.04, len, 6, 1]} />
            <meshPhongMaterial color="#aaaaaa" transparent opacity={0.5} />
          </mesh>
        );
      })}
    </>
  );
}
```

- [ ] **Step 3: Write `src/viz/ClusterScene.tsx`**

```tsx
// src/viz/ClusterScene.tsx
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Atoms } from './Atoms';
import { Bonds } from './Bonds';
import { useStore } from '../state/store';
import { ELEMENTS } from '../data/elements';

export function ClusterScene() {
  const snapshot  = useStore(s => s.snapshot);
  const symbol    = useStore(s => s.config.elementSymbol);
  const element   = ELEMENTS.find(e => e.symbol === symbol) ?? ELEMENTS[0];

  return (
    <Canvas
      camera={{ position: [0, 0, 20], fov: 45, near: 0.1, far: 500 }}
      gl={{ antialias: true }}
      style={{ background: '#111827' }}
    >
      <ambientLight intensity={0.35} />
      <pointLight position={[15, 15, 15]} intensity={1.4} />
      <pointLight position={[-15, -10, -10]} intensity={0.4} />
      {snapshot && (
        <>
          <Atoms coords={snapshot.bestCoords} element={element} />
          <Bonds coords={snapshot.bestCoords} />
        </>
      )}
      {!snapshot && (
        // Placeholder — single grey sphere before first snapshot arrives
        <mesh>
          <sphereGeometry args={[0.5, 16, 16]} />
          <meshPhongMaterial color="#4b5563" />
        </mesh>
      )}
      <OrbitControls makeDefault enableDamping dampingFactor={0.08} />
    </Canvas>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/viz/
git commit -m "feat: add Three.js ClusterScene with lerp atom interpolation and bonds"
```

---

## Task 12 — UI Components

**Files:**
- Create: `src/ui/Controls.tsx`
- Create: `src/ui/ElementPicker.tsx`
- Create: `src/ui/Charts.tsx`
- Create: `src/ui/Presets.tsx`

- [ ] **Step 1: Write `src/ui/ElementPicker.tsx`**

```tsx
// src/ui/ElementPicker.tsx
import { ELEMENTS } from '../data/elements';
import { useStore } from '../state/store';

export function ElementPicker() {
  const symbol   = useStore(s => s.config.elementSymbol);
  const status   = useStore(s => s.status);
  const setConfig = useStore(s => s.setConfig);
  const disabled  = status !== 'idle';

  return (
    <div>
      <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Element</p>
      <div className="flex gap-1 flex-wrap">
        {ELEMENTS.map(el => (
          <button
            key={el.symbol}
            onClick={() => setConfig({ elementSymbol: el.symbol, potentialParams: { ...el.lj } })}
            disabled={disabled}
            title={el.name}
            className="px-2.5 py-1 rounded text-xs font-bold border-2 transition-all disabled:opacity-40"
            style={{
              backgroundColor: el.color + '22',
              borderColor: symbol === el.symbol ? el.color : 'transparent',
              color: el.color,
            }}
          >
            {el.symbol}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write `src/ui/Controls.tsx`**

```tsx
// src/ui/Controls.tsx
import { useStore } from '../state/store';

export function Controls() {
  const config       = useStore(s => s.config);
  const status       = useStore(s => s.status);
  const setConfig    = useStore(s => s.setConfig);
  const updateParams = useStore(s => s.updateParams);
  const start        = useStore(s => s.start);
  const pause        = useStore(s => s.pause);
  const resume       = useStore(s => s.resume);
  const step         = useStore(s => s.step);
  const reset        = useStore(s => s.reset);

  const isIdle    = status === 'idle';
  const isRunning = status === 'running';
  const isPaused  = status === 'paused';

  return (
    <div className="space-y-5 p-4">
      {/* Cluster size */}
      <label className="block space-y-1">
        <span className="text-xs text-gray-400 uppercase tracking-wider">
          Cluster size — N = {config.n}
        </span>
        <input type="range" min={2} max={80} value={config.n}
          onChange={e => setConfig({ n: parseInt(e.target.value) })}
          disabled={!isIdle} className="w-full accent-blue-500" />
      </label>

      {/* Population */}
      <label className="block space-y-1">
        <span className="text-xs text-gray-400 uppercase tracking-wider">
          Population — {config.populationSize}
        </span>
        <input type="range" min={5} max={100} value={config.populationSize}
          onChange={e => setConfig({ populationSize: parseInt(e.target.value) })}
          disabled={!isIdle} className="w-full accent-blue-500" />
      </label>

      {/* Mutation rate */}
      <label className="block space-y-1">
        <span className="text-xs text-gray-400 uppercase tracking-wider">
          Mutation rate — {Math.round(config.mutationRate * 100)}%
        </span>
        <input type="range" min={0} max={100} value={Math.round(config.mutationRate * 100)}
          onChange={e => updateParams({ mutationRate: parseInt(e.target.value) / 100 })}
          className="w-full accent-blue-500" />
      </label>

      {/* Mutation sigma */}
      <label className="block space-y-1">
        <span className="text-xs text-gray-400 uppercase tracking-wider">
          Rattle σ — {config.mutationSigma.toFixed(2)} σ
        </span>
        <input type="range" min={5} max={100} value={Math.round(config.mutationSigma * 100)}
          onChange={e => updateParams({ mutationSigma: parseInt(e.target.value) / 100 })}
          className="w-full accent-blue-500" />
      </label>

      {/* Potential */}
      <label className="block space-y-1">
        <span className="text-xs text-gray-400 uppercase tracking-wider">Potential</span>
        <select value={config.potentialParams.type}
          onChange={e => setConfig({
            potentialParams: { ...config.potentialParams, type: e.target.value as 'lj' | 'morse' }
          })}
          disabled={!isIdle}
          className="w-full rounded bg-gray-700 border border-gray-600 px-2 py-1 text-sm text-gray-100"
        >
          <option value="lj">Lennard-Jones</option>
          <option value="morse">Morse</option>
        </select>
      </label>

      {/* Seed */}
      <label className="block space-y-1">
        <span className="text-xs text-gray-400 uppercase tracking-wider">Seed</span>
        <input type="number" value={config.seed}
          onChange={e => setConfig({ seed: parseInt(e.target.value) || 0 })}
          disabled={!isIdle}
          className="w-full rounded bg-gray-700 border border-gray-600 px-2 py-1 text-sm text-gray-100" />
      </label>

      {/* Transport */}
      <div className="flex gap-2 flex-wrap pt-1">
        {isIdle   && <button onClick={start}  className="btn-primary">▶ Start</button>}
        {isRunning && <button onClick={pause}  className="btn-secondary">⏸ Pause</button>}
        {isPaused  && <button onClick={resume} className="btn-primary">▶ Resume</button>}
        {isPaused  && <button onClick={step}   className="btn-secondary">⏭ Step</button>}
        {!isIdle   && <button onClick={reset}  className="btn-danger">↺ Reset</button>}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Write `src/ui/Charts.tsx`**

```tsx
// src/ui/Charts.tsx
import { useEffect, useRef } from 'react';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';
import { useStore } from '../state/store';
import { LJ_GLOBAL_MINIMA } from '../data/ljReference';

export function Charts() {
  const containerRef = useRef<HTMLDivElement>(null);
  const plotRef      = useRef<uPlot | null>(null);
  const history      = useStore(s => s.history);
  const snapshot     = useStore(s => s.snapshot);
  const n            = useStore(s => s.config.n);

  const knownMin = LJ_GLOBAL_MINIMA[n];

  // Initialise uPlot once
  useEffect(() => {
    if (!containerRef.current) return;
    const w = containerRef.current.offsetWidth || 400;

    const opts: uPlot.Options = {
      width: w, height: 180,
      series: [
        {},
        { label: 'Best',    stroke: '#22c55e', width: 2 },
        { label: 'Average', stroke: '#3b82f6', width: 1.5 },
      ],
      axes: [
        { stroke: '#6b7280', ticks: { stroke: '#374151' }, grid: { stroke: '#1f2937' } },
        { stroke: '#6b7280', ticks: { stroke: '#374151' }, grid: { stroke: '#1f2937' }, label: 'Energy (ε)' },
      ],
      cursor: { show: false },
      legend: { show: true },
    };
    plotRef.current = new uPlot(opts, [[0], [null as unknown as number], [null as unknown as number]], containerRef.current);

    // Resize observer
    const ro = new ResizeObserver(([entry]) => {
      plotRef.current?.setSize({ width: entry.contentRect.width, height: 180 });
    });
    ro.observe(containerRef.current);
    return () => { ro.disconnect(); plotRef.current?.destroy(); plotRef.current = null; };
  }, []);

  // Update data
  useEffect(() => {
    if (!plotRef.current || history.length === 0) return;
    plotRef.current.setData([
      history.map(h => h.gen),
      history.map(h => h.best),
      history.map(h => h.avg),
    ]);
  }, [history]);

  const pctDelta = snapshot && knownMin !== undefined
    ? Math.abs((snapshot.bestEnergy - knownMin) / Math.abs(knownMin) * 100)
    : null;

  return (
    <div className="space-y-3">
      <div ref={containerRef} className="w-full" />
      {snapshot && (
        <div className="grid grid-cols-3 gap-x-4 gap-y-1 font-mono text-xs">
          <div className="text-gray-400">Generation</div>
          <div className="text-gray-400">Best E (ε)</div>
          <div className="text-gray-400">RMS Force</div>
          <div className="text-gray-100">{snapshot.generation}</div>
          <div className="text-green-400">{snapshot.bestEnergy.toFixed(4)}</div>
          <div className="text-gray-100">{snapshot.rmsForce.toExponential(2)}</div>
          {knownMin !== undefined && (
            <>
              <div className="text-gray-400">Known min (ε)</div>
              <div className="text-gray-400">Δ to known min</div>
              <div />
              <div className="text-yellow-300">{knownMin.toFixed(4)}</div>
              <div className={pctDelta! < 1 ? 'text-green-400' : 'text-yellow-400'}>
                {pctDelta!.toFixed(2)}%
              </div>
              <div />
            </>
          )}
        </div>
      )}
      {!snapshot && (
        <p className="text-xs text-gray-500 italic">Press Start to begin.</p>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Write `src/ui/Presets.tsx`**

```tsx
// src/ui/Presets.tsx
import { useStore } from '../state/store';
import { LJ_REDUCED } from '../data/elements';
import type { GAConfig } from '../ga/types';

const PRESETS: Array<{ label: string; desc: string; config: Partial<GAConfig> }> = [
  {
    label: 'LJ₁₃ Icosahedron',
    desc: '13 atoms — classic Mackay icosahedron. Converges quickly.',
    config: { n: 13, populationSize: 20, seed: 42, potentialParams: { ...LJ_REDUCED } },
  },
  {
    label: 'LJ₇ Pentagonal bipyramid',
    desc: '7 atoms — very fast demo.',
    config: { n: 7, populationSize: 10, seed: 42, potentialParams: { ...LJ_REDUCED } },
  },
  {
    label: 'LJ₃₈ Double funnel',
    desc: '38 atoms — famous hard case with two competing funnels. Needs patience.',
    config: { n: 38, populationSize: 50, seed: 42, potentialParams: { ...LJ_REDUCED } },
  },
  {
    label: 'LJ₅₅ Mackay shell',
    desc: '55-atom Mackay icosahedron — large cluster.',
    config: { n: 55, populationSize: 40, seed: 42, potentialParams: { ...LJ_REDUCED } },
  },
];

export function Presets() {
  const status    = useStore(s => s.status);
  const setConfig = useStore(s => s.setConfig);

  return (
    <div className="space-y-1">
      <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Presets</p>
      {PRESETS.map(p => (
        <button
          key={p.label}
          onClick={() => setConfig(p.config)}
          disabled={status !== 'idle'}
          title={p.desc}
          className="w-full text-left px-3 py-1.5 rounded text-sm hover:bg-gray-700 transition-colors
                     disabled:opacity-40 disabled:cursor-not-allowed text-gray-200"
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add src/ui/
git commit -m "feat: add Controls, ElementPicker, Charts (uPlot), and Presets UI"
```

---

## Task 13 — Wire App.tsx and verify

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Replace `src/App.tsx` with the full layout**

```tsx
// src/App.tsx
import { ClusterScene } from './viz/ClusterScene';
import { Controls }     from './ui/Controls';
import { ElementPicker } from './ui/ElementPicker';
import { Charts }       from './ui/Charts';
import { Presets }      from './ui/Presets';
import { useStore }     from './state/store';

export default function App() {
  const error = useStore(s => s.error);

  return (
    <div className="flex h-screen bg-gray-900 text-gray-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-72 flex-shrink-0 flex flex-col border-r border-gray-700 overflow-y-auto">
        <div className="p-4 border-b border-gray-700">
          <h1 className="text-base font-bold tracking-tight">Elemental</h1>
          <p className="text-xs text-gray-400 mt-0.5">Genetic algorithm cluster optimizer</p>
        </div>

        <div className="p-4 border-b border-gray-700">
          <ElementPicker />
        </div>

        <div className="flex-1">
          <Controls />
        </div>

        <div className="p-4 border-t border-gray-700">
          <Presets />
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {error && (
          <div className="bg-red-900/60 border-b border-red-700 px-4 py-2 text-sm text-red-200">
            ⚠ {error}
          </div>
        )}
        <div className="flex-1 relative min-h-0">
          <ClusterScene />
        </div>
        <div className="h-64 flex-shrink-0 border-t border-gray-700 bg-gray-800/50 px-4 py-3 overflow-y-auto">
          <Charts />
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Run the full test suite**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 3: Start the dev server**

```bash
npm run dev
```

Expected: dev server starts at http://localhost:5173

- [ ] **Step 4: Manual verification checklist**

Open http://localhost:5173 and verify:

1. App loads without console errors.
2. Sidebar shows element buttons (Ar, Ne, Kr, Au, Cu, Fe), all controls, and preset buttons.
3. Click **LJ₁₃ Icosahedron** preset → N slider shows 13.
4. Click **▶ Start** → status changes, cluster appears in the 3D canvas, atoms animate.
5. Energy chart populates with green (best) and blue (average) lines.
6. "Known min" readout shows −44.3268 ε; Δ% decreases over time.
7. **⏸ Pause** → animation freezes; **▶ Resume** → resumes; **⏭ Step** → advances one generation.
8. **↺ Reset** → returns to idle, canvas clears.
9. Change element to Au → atom colour changes to gold on next run.
10. Switch potential to Morse → GA runs with Morse potential.
11. OrbitControls: drag to rotate, scroll to zoom.
12. Try LJ₃₈ Double funnel preset (N=38, population=50) — cluster should be larger.

- [ ] **Step 5: Final commit**

```bash
git add src/App.tsx
git commit -m "feat: wire App layout — Elemental GA cluster visualizer complete"
```

---

## Self-review checklist

### Spec coverage
- [x] Pick element + cluster size N — `ElementPicker` + `Controls` N slider
- [x] GA evolves in 3D generation-by-generation — `ClusterScene` + `Atoms` lerp
- [x] Live convergence chart (best/avg energy) — `Charts` uPlot
- [x] Comparison to known global minimum — `ljReference.ts` + `Charts` Δ readout
- [x] Play/pause/step/reset transport — `Controls` buttons + `store`
- [x] Correct physics: GA recovers LJ₁₃ — integration test in `engine.test.ts`
- [x] In-browser Web Worker — `ga.worker.ts` + `store.ts` lifecycle
- [x] Lennard-Jones + Morse potentials — `potential.ts`
- [x] FIRE local relaxation — `relax.ts`
- [x] Cut-and-splice crossover + rattle/replace mutations — `operators.ts`
- [x] Tournament selection + elitism + diversity guard — `select.ts`
- [x] Seeded PRNG for reproducibility — `rng.ts`
- [x] Bond cylinders — `Bonds.tsx`
- [x] Presets (LJ₁₃, LJ₃₈, LJ₅₅, LJ₇) — `Presets.tsx`
- [x] Error handling (worker error → banner + idle) — `store.ts` + `App.tsx`
- [x] NaN/Inf guard in potential + engine — `potential.ts` rMin clamp + engine discard
- [x] Config validation guardrails — range inputs constrain values

### No placeholders: confirmed — all steps contain complete code.
### Type consistency: `Float64Array` in engine/physics; `Float32Array` in snapshots/Three.js.
