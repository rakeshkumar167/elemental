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
    expect(energy).toBeCloseTo(-3.0, 2);
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
