import type { PotentialParams } from './types';

export interface PotentialResult {
  energy: number;
  gradient: Float64Array; // 3N, ∂E/∂x_i
}

export function computePotential(
  coords: Float64Array,
  p: PotentialParams,
): PotentialResult {
  const N = coords.length / 3;
  const gradient = new Float64Array(coords.length);
  let energy = 0;

  for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) {
      const dx = coords[j * 3]     - coords[i * 3];
      const dy = coords[j * 3 + 1] - coords[i * 3 + 1];
      const dz = coords[j * 3 + 2] - coords[i * 3 + 2];
      const r2 = dx * dx + dy * dy + dz * dz;
      const r  = Math.sqrt(r2);
      const rs = Math.max(r, p.rMin); // clamp to avoid 1/0

      let ePair: number;
      let dedr:  number; // dE_pair / dr

      if (p.type === 'lj') {
        const sr  = p.sigma / rs;
        const sr6 = sr * sr * sr * sr * sr * sr;
        const sr12 = sr6 * sr6;
        ePair = 4 * p.epsilon * (sr12 - sr6);
        dedr = 4 * p.epsilon * (-12 * sr12 + 6 * sr6) / rs;
      } else {
        // Morse: E = De * (exp(-2α(r-re)) - 2·exp(-α(r-re)))
        const x = Math.exp(-p.alpha * (rs - p.re));
        ePair = p.De * (x * x - 2 * x);
        dedr  = p.De * 2 * p.alpha * x * (1 - x);
      }

      energy += ePair;

      if (r > 0) {
        // ∂E/∂x_i = dedr · (x_i - x_j) / r
        const f = dedr / r;
        gradient[i * 3]     -= f * dx;
        gradient[i * 3 + 1] -= f * dy;
        gradient[i * 3 + 2] -= f * dz;
        gradient[j * 3]     += f * dx;
        gradient[j * 3 + 1] += f * dy;
        gradient[j * 3 + 2] += f * dz;
      }
    }
  }

  return { energy, gradient };
}
