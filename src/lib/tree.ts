export type Seg = { d: string; w: number; depth: number };

const cache = new Map<number, Seg[]>();

/** Grows the bare winter tree from a fixed seed, so server and browser draw the exact same tree. */
export function growTree(depth: number, seed = 7): Seg[] {
  const hit = cache.get(depth);
  if (hit) return hit;

  let s = seed;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const f = (n: number) => n.toFixed(1);
  const out: Seg[] = [];

  (function branch(x: number, y: number, a: number, len: number, w: number, d: number) {
    if (d < 1) return;
    const x2 = x + Math.sin(a) * len;
    const y2 = y - Math.cos(a) * len;
    const m = a + (rnd() - 0.5) * 0.4;
    out.push({
      d: `M${f(x)} ${f(y)}Q${f(x + Math.sin(m) * len * 0.55)} ${f(y - Math.cos(m) * len * 0.55)} ${f(x2)} ${f(y2)}`,
      w: Number(w.toFixed(2)),
      depth: depth - d,
    });
    const n = rnd() < 0.3 ? 3 : 2;
    for (let i = 0; i < n; i++) {
      branch(x2, y2, a + (i - (n - 1) / 2) * 0.62 + (rnd() - 0.5) * 0.5, len * (0.7 + rnd() * 0.1), w * 0.7, d - 1);
    }
  })(100, 238, 0, 56, 10, depth);

  cache.set(depth, out);
  return out;
}
