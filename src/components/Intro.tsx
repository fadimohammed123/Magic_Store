"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { Tree } from "./Tree";

/** Loading screen: the tree draws itself, the red thread cuts across, the curtain lifts. */
export function Intro({ onDone }: { onDone: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion:reduce)").matches) {
      setGone(true);
      onDone();
      return;
    }
    const el = root.current!;
    const ps = Array.from(el.querySelectorAll<SVGPathElement>("#lt path"));
    const counter = el.querySelector("#lc")!;
    const o = { v: 0 };
    ps.forEach((p) => {
      p.style.strokeDasharray = "1";
      p.style.strokeDashoffset = "1";
    });
    const tl = gsap
      .timeline({ onComplete: () => { setGone(true); onDone(); } })
      .to(ps, { strokeDashoffset: 0, duration: 0.7, delay: (i: number) => 0.17 * Number(ps[i].dataset.d), ease: "power1.out" }, 0)
      .to(o, { v: 100, duration: 2.1, ease: "power1.inOut", onUpdate: () => { counter.textContent = String(Math.round(o.v)); } }, 0)
      .to("#lr", { scaleX: 1, duration: 0.7, ease: "expo.inOut" })
      .to(el, { yPercent: -100, duration: 0.9, ease: "expo.inOut" });
    return () => { tl.kill(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (gone) return null;
  return (
    <div id="ld" ref={root} className="fixed inset-0 z-[100] grid place-items-center bg-ink" role="status" aria-label="Loading">
      <div id="lt" className="w-[min(62vw,380px)] text-bone"><Tree depth={8} /></div>
      <div id="lc" className="absolute bottom-6 right-6 font-d text-7xl font-black text-bone">0</div>
      <div id="lr" className="absolute left-0 top-1/2 h-[3px] w-full origin-left bg-red shadow-[0_0_20px_#F04A2E]" style={{ transform: "scaleX(0)" }} />
    </div>
  );
}
