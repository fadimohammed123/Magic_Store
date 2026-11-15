import { growTree } from "@/lib/tree";

/** The brand mark: a bare winter tree. Each branch carries its depth so the loader can draw it trunk-first. */
export function TreeGroup({ depth }: { depth: number }) {
  return (
    <g fill="none" stroke="currentColor" strokeLinecap="round">
      {growTree(depth).map((s, i) => (
        <path key={i} d={s.d} strokeWidth={s.w} pathLength={1} data-d={s.depth} />
      ))}
    </g>
  );
}

export function Tree({ depth, className }: { depth: number; className?: string }) {
  return (
    <svg viewBox="0 0 200 240" className={className} aria-hidden="true">
      <TreeGroup depth={depth} />
    </svg>
  );
}
