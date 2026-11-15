"use client";

import { useRef, useState } from "react";
import gsap from "gsap";
import { TreeGroup } from "./Tree";
import { JERSEY_PATH } from "./ProductArt";

const STAGES = [
  { at: 0, label: "Day 1", text: "Stiff, dark, sharp. The print is clean. Nothing has happened yet." },
  { at: 25, label: "Month 3", text: "The collar gives. Black is opening to ash at the shoulders." },
  { at: 55, label: "Year 1", text: "The print has cracked where you move. The seams know your shape." },
  { at: 85, label: "Year 5", text: "Nothing like the day you bought it. Everything like you." },
];

export function WearIn() {
  const [v, setV] = useState(0);
  const tween = useRef<gsap.core.Tween | null>(null);
  const t = v / 100;
  const mix = (a: number, b: number) => Math.round(a + (b - a) * t);
  const stage = [...STAGES].reverse().find((s) => v >= s.at)!;

  function jump(to: number) {
    tween.current?.kill();
    if (matchMedia("(prefers-reduced-motion:reduce)").matches) return setV(to);
    const o = { v };
    tween.current = gsap.to(o, { v: to, duration: 1.2, ease: "power2.inOut", onUpdate: () => setV(o.v) });
  }

  return (
    <section id="wear" className="border-t border-bone/10 px-5 py-24 md:px-10 md:py-36">
      <div className="mx-auto grid max-w-7xl items-center gap-12 md:grid-cols-2">
        <div className="card relative aspect-[4/4.4] overflow-hidden">
          <div className="absolute inset-0 p-6">
            <svg viewBox="0 0 400 440" className="h-full w-full" role="img" aria-label="A jersey ageing as you drag the slider">
              <defs>
                <clipPath id="jc"><path d={JERSEY_PATH} /></clipPath>
                <filter id="wf" x="-5%" y="-5%" width="110%" height="110%">
                  <feTurbulence type="fractalNoise" baseFrequency=".03" numOctaves={3} seed={3} result="n" />
                  <feDisplacementMap in="SourceGraphic" in2="n" scale={12 * t} result="d" />
                  <feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves={2} seed={8} result="g" />
                  <feColorMatrix in="g" values={`0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 14 0 0 0 ${(1 - 4.76 * t).toFixed(2)}`} result="m" />
                  <feComposite in="d" in2="m" operator="in" />
                </filter>
              </defs>
              <g style={{ filter: "url(#wf)" }}>
                <path d={JERSEY_PATH} fill={`rgb(${mix(16, 104)},${mix(19, 110)},${mix(31, 124)})`} />
                <path d="M110 150v250M290 150v250" stroke="#E9E2D3" strokeWidth="10" fill="none" />
                <path d="M160 30q40 50 80 0" fill="none" stroke="#E9E2D3" strokeWidth="12" />
                <path d="M127 52l-30 70M273 52l30 70" stroke="#F04A2E" strokeWidth="2.5" strokeDasharray="6 5" fill="none" />
                <g clipPath="url(#jc)" opacity={0.5 * t} style={{ filter: "blur(16px)" }}>
                  <ellipse cx="150" cy="110" rx="80" ry="50" fill="#E9E2D3" />
                  <ellipse cx="260" cy="300" rx="60" ry="70" fill="#E9E2D3" />
                </g>
                <path d="M130 210q40 22 80 0t80 12M125 300q60 22 120 0" stroke="#E9E2D3" strokeWidth="2" fill="none" opacity={t} />
                <g transform="translate(160 150) scale(.4)" style={{ color: "#E9E2D3", opacity: 1 - 0.55 * t }}>
                  <TreeGroup depth={5} />
                </g>
              </g>
            </svg>
          </div>
          <span className="absolute left-4 top-4 font-d text-5xl font-black text-bone/90">{stage.label}</span>
        </div>

        <div className="rv">
          <h2 className="font-d text-[clamp(52px,8vw,120px)] font-black leading-[.88]">Watch it<br />wear in.</h2>
          <p className="mt-5 font-s text-3xl italic text-bone/90">A jersey isn’t finished when we ship it. It’s finished when you are.</p>
          <label htmlFor="wr" className="mt-10 block text-sm text-ash">Drag through five years of wearing</label>
          <input
            id="wr"
            type="range"
            min={0}
            max={100}
            value={v}
            style={{ ["--p" as string]: `${v}%` }}
            aria-describedby="wt"
            onChange={(e) => {
              tween.current?.kill();
              setV(+e.target.value);
            }}
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {STAGES.map((s) => (
              <button key={s.label} type="button" className="zb" onClick={() => jump(s.at)}>{s.label}</button>
            ))}
          </div>
          <p id="wt" aria-live="polite" className="mt-6 min-h-[3.5em] text-lg">{stage.text}</p>
        </div>
      </div>
    </section>
  );
}
