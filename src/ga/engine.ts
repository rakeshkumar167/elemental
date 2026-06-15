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
  } while (x * x + y * y + z * z > 1);
  return [x, y, z];
}

function randomCluster(N: number, radius: number, rng: Rng): Float64Array {
  const c = new Float64Array(N * 3);
  for (let i = 0; i < N; i++) {
    const [x, y, z] = randomInSphere(rng);
    c[i * 3] = x * radius;
    c[i * 3 + 1] = y * radius;
    c[i * 3 + 2] = z * radius;
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
      this.population.push({
        coords,
        energy: isFinite(result.energy) ? result.energy : 1e9,
      });
    }
  }

  step(): Snapshot {
    const {
      potentialParams,
      eliteCount,
      mutationRate,
      mutationSigma,
      tournamentSize,
      diversityThreshold,
      n,
    } = this.config;

    const nextGen: Individual[] = applyElitism(this.population, eliteCount);

    let attempts = 0;
    while (
      nextGen.length < this.population.length &&
      attempts < this.population.length * 10
    ) {
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
    const avgEnergy =
      this.population.reduce((s, p) => s + p.energy, 0) / this.population.length;
    const { gradient } = computePotential(best.coords, potentialParams);

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

  getGeneration(): number {
    return this.generation;
  }
}
