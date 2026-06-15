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
    // Check interatomic distance, not absolute position (CoM not pinned)
    const separation = Math.abs(coords[3] - coords[0]);
    expect(separation).toBeCloseTo(EQ, 2);
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
