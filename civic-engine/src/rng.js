export function createRng(seed) {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return {
    next() {
      value = (value * 16807) % 2147483647;
      return value;
    },
    random() {
      return (this.next() - 1) / 2147483646;
    }
  };
}

export function shuffle(array, rng) {
  const arr = array.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor((rng?.random?.() ?? Math.random()) * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
