"use client";

export function SizePicker({ sizes, value, onChange }: { sizes: string[]; value: string; onChange: (s: string) => void }) {
  if (!sizes.length) return <span className="py-3 text-sm text-ash">One size</span>;
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Size">
      {sizes.map((s) => (
        <button key={s} type="button" className="zb" aria-pressed={value === s} aria-label={`Size ${s}`} onClick={() => onChange(s)}>
          {s}
        </button>
      ))}
    </div>
  );
}

export const defaultSize = (sizes: string[]) => (sizes.includes("M") ? "M" : (sizes[0] ?? "OS"));
