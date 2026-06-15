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
