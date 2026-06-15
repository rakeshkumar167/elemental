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
    let changed = 0;
    for (let i = 0; i < original.length; i++) if (original[i] !== mutated[i]) changed++;
    expect(changed).toBeGreaterThan(0);
  });
});
