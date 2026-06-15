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
  // Sample without replacement using a partial Fisher-Yates shuffle on indices.
  const size = Math.min(tournamentSize, population.length);
  const indices = Array.from({ length: population.length }, (_, i) => i);
  for (let i = 0; i < size; i++) {
    const j = i + rng.nextInt(population.length - i);
    const tmp = indices[i];
    indices[i] = indices[j];
    indices[j] = tmp;
  }
  let best = population[indices[0]];
  for (let i = 1; i < size; i++) {
    const candidate = population[indices[i]];
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
