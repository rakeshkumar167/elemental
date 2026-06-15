import type { Rng } from './rng';

function centerOfMass(c: Float64Array): [number, number, number] {
  const N = c.length / 3;
  let cx = 0, cy = 0, cz = 0;
  for (let i = 0; i < N; i++) { cx += c[i*3]; cy += c[i*3+1]; cz += c[i*3+2]; }
  return [cx / N, cy / N, cz / N];
}

function translateToOrigin(c: Float64Array): void {
  const [cx, cy, cz] = centerOfMass(c);
  for (let i = 0; i < c.length / 3; i++) { c[i*3] -= cx; c[i*3+1] -= cy; c[i*3+2] -= cz; }
}

// Uniform random rotation via Shoemake's method (random quaternion → rotation matrix)
function randomRotation(rng: Rng): Float64Array {
  const u1 = rng.next(), u2 = rng.next(), u3 = rng.next();
  const q0 = Math.sqrt(1 - u1) * Math.sin(2 * Math.PI * u2);
  const q1 = Math.sqrt(1 - u1) * Math.cos(2 * Math.PI * u2);
  const q2 = Math.sqrt(u1)     * Math.sin(2 * Math.PI * u3);
  const q3 = Math.sqrt(u1)     * Math.cos(2 * Math.PI * u3);
  const R = new Float64Array(9);
  R[0] = 1 - 2*(q2*q2 + q3*q3); R[1] = 2*(q1*q2 - q3*q0); R[2] = 2*(q1*q3 + q2*q0);
  R[3] = 2*(q1*q2 + q3*q0); R[4] = 1 - 2*(q1*q1 + q3*q3); R[5] = 2*(q2*q3 - q1*q0);
  R[6] = 2*(q1*q3 - q2*q0); R[7] = 2*(q2*q3 + q1*q0); R[8] = 1 - 2*(q1*q1 + q2*q2);
  return R;
}

function applyRotation(c: Float64Array, R: Float64Array): Float64Array {
  const N = c.length / 3;
  const out = new Float64Array(c.length);
  for (let i = 0; i < N; i++) {
    const x = c[i*3], y = c[i*3+1], z = c[i*3+2];
    out[i*3]   = R[0]*x + R[1]*y + R[2]*z;
    out[i*3+1] = R[3]*x + R[4]*y + R[5]*z;
    out[i*3+2] = R[6]*x + R[7]*y + R[8]*z;
  }
  return out;
}

// Cut-and-splice crossover (Deaven & Ho, 1995):
// Center both parents, apply independent random rotations,
// take top-k atoms by z from A and bottom-(N-k) atoms by z from B.
export function cutAndSpliceCrossover(
  parentA: Float64Array,
  parentB: Float64Array,
  rng: Rng,
): Float64Array {
  const N = parentA.length / 3;

  const a = parentA.slice(); translateToOrigin(a);
  const b = parentB.slice(); translateToOrigin(b);

  const rotA = applyRotation(a, randomRotation(rng));
  const rotB = applyRotation(b, randomRotation(rng));

  // k in [1, N-1]
  const k = 1 + rng.nextInt(N - 1);

  const idxA = Array.from({ length: N }, (_, i) => i)
    .sort((i, j) => rotA[j*3+2] - rotA[i*3+2]); // descending z
  const idxB = Array.from({ length: N }, (_, i) => i)
    .sort((i, j) => rotB[i*3+2] - rotB[j*3+2]); // ascending z

  const child = new Float64Array(N * 3);
  for (let i = 0; i < k; i++) {
    const ai = idxA[i];
    child[i*3] = rotA[ai*3]; child[i*3+1] = rotA[ai*3+1]; child[i*3+2] = rotA[ai*3+2];
  }
  for (let i = 0; i < N - k; i++) {
    const bi = idxB[i];
    child[(k+i)*3] = rotB[bi*3]; child[(k+i)*3+1] = rotB[bi*3+1]; child[(k+i)*3+2] = rotB[bi*3+2];
  }

  translateToOrigin(child);
  return child;
}

// Rattle mutation: Gaussian displacement of every atom
export function rattleMutation(
  coords: Float64Array,
  sigma: number,
  rng: Rng,
): Float64Array {
  const out = coords.slice();
  for (let k = 0; k < out.length; k++) out[k] += sigma * rng.nextGaussian();
  return out;
}

// Replace mutation: randomize a fraction of atom positions inside a sphere
export function replaceMutation(
  coords: Float64Array,
  fraction: number,
  radius: number,
  rng: Rng,
): Float64Array {
  const N = coords.length / 3;
  const out = coords.slice();
  const n = Math.max(1, Math.round(N * fraction));

  // Fisher-Yates shuffle to pick n random indices
  const idx = Array.from({ length: N }, (_, i) => i);
  for (let i = N - 1; i >= N - n; i--) {
    const j = rng.nextInt(i + 1);
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }

  for (let t = 0; t < n; t++) {
    const at = idx[N - 1 - t];
    let x, y, z;
    do {
      x = rng.nextInRange(-1, 1);
      y = rng.nextInRange(-1, 1);
      z = rng.nextInRange(-1, 1);
    } while (x*x + y*y + z*z > 1);
    out[at*3] = x * radius;
    out[at*3+1] = y * radius;
    out[at*3+2] = z * radius;
  }
  return out;
}
