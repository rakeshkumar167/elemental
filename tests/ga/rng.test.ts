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
