import type { PotentialParams } from '../ga/types';

export interface ElementData {
  symbol: string;
  name: string;
  color: string;    // hex, CPK convention
  radius: number;   // display radius in σ units
  lj: PotentialParams;
}

export const LJ_REDUCED: PotentialParams = {
  type: 'lj',
  epsilon: 1.0, sigma: 1.0,
  De: 1.0, alpha: 1.0, re: Math.pow(2, 1/6),
  rMin: 0.5,
};

export const MORSE_REDUCED: PotentialParams = {
  type: 'morse',
  epsilon: 1.0, sigma: 1.0,
  De: 1.0, alpha: 1.0, re: Math.pow(2, 1/6),
  rMin: 0.3,
};

// All elements use LJ reduced units (ε=1, σ=1) in v1.
// Visual properties (colour, radius) distinguish them.
export const ELEMENTS: ElementData[] = [
  { symbol: 'Ar', name: 'Argon',    color: '#00ffff', radius: 0.35, lj: { ...LJ_REDUCED } },
  { symbol: 'Ne', name: 'Neon',     color: '#b3e3f5', radius: 0.28, lj: { ...LJ_REDUCED } },
  { symbol: 'Kr', name: 'Krypton',  color: '#5cb8d1', radius: 0.40, lj: { ...LJ_REDUCED } },
  { symbol: 'Au', name: 'Gold',     color: '#ffd700', radius: 0.38, lj: { ...LJ_REDUCED } },
  { symbol: 'Cu', name: 'Copper',   color: '#b87333', radius: 0.34, lj: { ...LJ_REDUCED } },
  { symbol: 'Fe', name: 'Iron',     color: '#e06000', radius: 0.33, lj: { ...LJ_REDUCED } },
];

export const DEFAULT_ELEMENT = ELEMENTS[0];

// Module-level Map for O(1) lookup by symbol (used in ClusterScene)
export const ELEMENT_MAP = new Map(ELEMENTS.map(e => [e.symbol, e]));
