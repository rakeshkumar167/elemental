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
