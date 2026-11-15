import type { Product } from "@/lib/types";
import { TreeGroup } from "./Tree";

export const JERSEY_PATH = "M120 40l40-10q40 40 80 0l40 10 80 50-30 80-40-20v250q-90 15-180 0V150l-40 20-30-80z";
const f = { filter: "url(#pf)" };

function Jersey({ base, trim, back }: { base: string; trim: string; back: boolean }) {
  return (
    <svg viewBox="0 0 400 440" className="h-full w-full" role="img" aria-label={`Jersey ${back ? "back" : "front"}`}>
      <g style={f}>
        <path d={JERSEY_PATH} fill={base} />
        <path d="M110 150v250M290 150v250" stroke={trim} strokeWidth="10" fill="none" />
        <path d="M160 30q40 50 80 0" fill="none" stroke={trim} strokeWidth="12" />
        <path d="M127 52l-30 70M273 52l30 70" stroke="#F04A2E" strokeWidth="2.5" strokeDasharray="6 5" fill="none" />
        {back ? (
          <text x="200" y="285" textAnchor="middle" fontFamily="Big Shoulders Display" fontWeight={900} fontSize={150} fill={trim}>
            07
          </text>
        ) : (
          <g transform="translate(160 150) scale(.4)" style={{ color: trim }}>
            <TreeGroup depth={5} />
          </g>
        )}
      </g>
    </svg>
  );
}

function Artifact({ k, title }: { k: string | null; title: string }) {
  return (
    <svg viewBox="0 0 400 440" className="h-full w-full" role="img" aria-label={title}>
      <g style={f}>
        {k === "spool" && (
          <>
            <rect x="120" y="90" width="160" height="26" rx="6" fill="#8A8F9C" />
            <rect x="120" y="324" width="160" height="26" rx="6" fill="#8A8F9C" />
            <rect x="150" y="116" width="100" height="208" fill="#F04A2E" />
            <path d="M150 140h100M150 160h100M150 180h100M150 200h100M150 220h100M150 240h100M150 260h100M150 280h100M150 300h100" stroke="#0E1220" opacity=".35" />
          </>
        )}
        {k === "pendant" && (
          <>
            <circle cx="200" cy="48" r="16" fill="none" stroke="#8A8F9C" strokeWidth="8" />
            <circle cx="200" cy="240" r="108" fill="none" stroke="#8A8F9C" strokeWidth="14" />
            <g transform="translate(140 170) scale(.6)" style={{ color: "#E9E2D3" }}>
              <TreeGroup depth={6} />
            </g>
          </>
        )}
        {k === "patch" && (
          <>
            <rect x="80" y="130" width="240" height="180" rx="8" fill="#1F2A44" stroke="#F04A2E" strokeWidth="5" strokeDasharray="14 9" />
            <g transform="translate(150 150) scale(.5)" style={{ color: "#E9E2D3" }}>
              <TreeGroup depth={6} />
            </g>
          </>
        )}
        {k !== "spool" && k !== "pendant" && k !== "patch" && (
          <g transform="translate(110 130) scale(.9)" style={{ color: "#E9E2D3" }}>
            <TreeGroup depth={6} />
          </g>
        )}
      </g>
    </svg>
  );
}

/** Drawn product art. Add an image_url in Admin Studio to swap in real photography. */
export function ProductArt({ product: p, view = 0 }: { product: Product; view?: 0 | 1 }) {
  if (p.image_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={p.image_url} alt={p.title} className="h-full w-full object-cover" />;
  }
  if (p.kind === "jersey") return <Jersey base={p.colors[0] ?? "#10131f"} trim={p.colors[1] ?? "#E9E2D3"} back={view === 1} />;
  return <Artifact k={p.art_key} title={p.title} />;
}
