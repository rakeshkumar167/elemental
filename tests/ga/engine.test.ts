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
  it('first step after initialize produces a finite bestEnergy', () => {
    const eng = new GAEngine(BASE_CONFIG);
    eng.initialize();
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

  it('updateConfig changes mutation rate without throwing', () => {
    const eng = new GAEngine(BASE_CONFIG);
    eng.initialize();
    eng.updateConfig({ mutationRate: 0.9 });
    const snap = eng.step();
    expect(snap.generation).toBe(1);
  });
});

// Integration test: recover LJ₁₃ global minimum (icosahedron = -44.3268 ε)
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
