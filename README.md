# Elemental

A real-time genetic algorithm (GA) cluster optimizer and 3D visualizer for atomic structures. Given an element and atom count, Elemental evolves a population of candidate clusters toward the minimum-energy configuration using the Lennard-Jones potential.

## What it does

- Runs a genetic algorithm in a Web Worker to find stable atomic cluster geometries
- Renders the live best-found cluster in 3D using React Three Fiber
- Plots fitness history and energy over generations with uPlot
- Supports presets and per-element configuration

## Stack

| Layer | Technology |
|---|---|
| UI | React 19, Tailwind CSS |
| 3D rendering | React Three Fiber, Three.js |
| Charts | uPlot |
| State | Zustand |
| GA engine | Web Worker (TypeScript) |
| Build | Vite 8, TypeScript 6 |
| Tests | Vitest, jsdom |

## Project structure

```
src/
  ga/           Genetic algorithm — engine, operators, selection, Lennard-Jones potential
  viz/          3D scene — instanced atom spheres with gradient shading, bond cylinders
  ui/           Controls, ElementPicker, Presets, Charts panels
  state/        Zustand store
  data/         Element definitions and LJ reference parameters
  worker/       GA web worker entry point
```

## Getting started

```bash
npm install
npm run dev       # dev server at http://localhost:5173
npm run build     # production build
npm test          # run tests
```

## How the GA works

1. A population of random cluster geometries is initialised
2. Each candidate is evaluated using the Lennard-Jones pair potential (σ, ε per element)
3. Tournament selection picks parents; crossover and mutation produce offspring
4. The best geometry is passed to a local gradient-descent relaxation step
5. Results are streamed from the worker to the UI every generation
