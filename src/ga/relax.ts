import { computePotential } from './potential';
import type { PotentialParams } from './types';

export interface RelaxOptions {
  maxIter?: number;
  forceTol?: number;
  dt0?: number;
  dtMax?: number;
}

export interface RelaxResult {
  energy: number;
  iters: number;
  converged: boolean;
}

export function relax(
  coords: Float64Array,   // modified in-place
  params: PotentialParams,
  opts: RelaxOptions = {},
): RelaxResult {
  const { maxIter = 500, forceTol = 1e-4, dt0 = 0.05, dtMax = 0.5 } = opts;
  const N3 = coords.length;
  const vel = new Float64Array(N3);

  // FIRE hyper-parameters
  const N_min = 5;
  const f_inc = 1.1, f_dec = 0.5;
  const alpha0 = 0.1, f_alpha = 0.99;
  let alpha = alpha0;
  let dt = dt0;
  let nPos = 0;

  for (let iter = 0; iter < maxIter; iter++) {
    const { energy, gradient } = computePotential(coords, params);

    if (!isFinite(energy)) return { energy, iters: iter, converged: false };

    // Pin first atom: zero its gradient to remove translational drift
    gradient[0] = 0; gradient[1] = 0; gradient[2] = 0;

    // RMS force convergence check  (F = -gradient)
    let rms2 = 0;
    for (let k = 0; k < N3; k++) rms2 += gradient[k] * gradient[k];
    if (Math.sqrt(rms2 / N3) < forceTol) return { energy, iters: iter, converged: true };

    // Velocity update: v += dt · F  (F = -grad)
    for (let k = 0; k < N3; k++) vel[k] -= dt * gradient[k];
    // Keep first atom pinned: zero its velocity components
    vel[0] = 0; vel[1] = 0; vel[2] = 0;

    // Power P = F · v = -grad · v
    let P = 0, v2 = 0, f2 = 0;
    for (let k = 0; k < N3; k++) {
      P  -= gradient[k] * vel[k];
      v2 += vel[k] * vel[k];
      f2 += gradient[k] * gradient[k];
    }

    // Mix velocity toward force direction: v = (1-α)v + α|v|F̂
    const vn = Math.sqrt(v2);
    const fn = Math.sqrt(f2);
    if (fn > 0 && vn > 0) {
      for (let k = 0; k < N3; k++) {
        vel[k] = (1 - alpha) * vel[k] + alpha * vn * (-gradient[k]) / fn;
      }
    }

    if (P > 0) {
      nPos++;
      if (nPos >= N_min) {
        dt    = Math.min(dt * f_inc, dtMax);
        alpha = alpha * f_alpha;
      }
    } else {
      nPos  = 0;
      dt    = dt * f_dec;
      alpha = alpha0;
      vel.fill(0);
    }

    // Position update
    for (let k = 0; k < N3; k++) coords[k] += dt * vel[k];
  }

  const { energy } = computePotential(coords, params);
  return { energy, iters: maxIter, converged: false };
}
