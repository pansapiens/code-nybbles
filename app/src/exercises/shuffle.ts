/** Fisher-Yates shuffle of `0..n-1`. Retries a few times so the result isn't the authored order. */
export function shuffledIndices(n: number, random = Math.random): number[] {
  for (let attempt = 0; ; attempt++) {
    const xs = Array.from({ length: n }, (_, i) => i)
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1))
      ;[xs[i], xs[j]] = [xs[j]!, xs[i]!]
    }
    if (n < 2 || attempt >= 4 || xs.some((x, i) => x !== i)) return xs
  }
}
