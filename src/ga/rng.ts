export type Rng = ReturnType<typeof createRng>;

export function createRng(seed: number) {
  let s = seed >>> 0;

  function next(): number {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  return {
    next,
    nextGaussian(): number {
      // Box-Muller transform
      const u1 = Math.max(next(), 1e-300);
      const u2 = next();
      return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    },
    nextInRange(lo: number, hi: number): number {
      return lo + next() * (hi - lo);
    },
    nextInt(n: number): number {
      return Math.floor(next() * n);
    },
  };
}
