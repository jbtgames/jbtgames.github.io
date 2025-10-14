export const normalizeSeed = (seed) => {
  if (typeof seed === "number" && Number.isFinite(seed)) return seed >>> 0;
  if (typeof seed === "string") {
    let hash = 0;
    for (let i = 0; i < seed.length; i += 1) {
      hash = (hash << 5) - hash + seed.charCodeAt(i);
      hash |= 0;
    }
    return hash >>> 0;
  }
  return Math.floor(Math.random() * 2 ** 32);
};

export const createMulberry32 = (seed) => {
  let t = normalizeSeed(seed);
  return () => {
    t += 0x6d2b79f5;
    let result = Math.imul(t ^ (t >>> 15), 1 | t);
    result ^= result + Math.imul(result ^ (result >>> 7), 61 | result);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
};

export const pickFromArray = (arr, rng) => {
  if (!arr.length) return undefined;
  const index = Math.floor(rng() * arr.length);
  return arr[index];
};
