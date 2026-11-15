"use client";

import { useEffect, useRef } from "react";

/** Custom cursor, magnetic buttons and card tilt. Only on fine pointers, never with reduced motion. */
export function Cursor() {
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!matchMedia("(pointer:fine)").matches || matchMedia("(prefers-reduced-motion:reduce)").matches) return;
    const root = document.documentElement;
    root.classList.add("cur");
    let x = 0, y = 0, rx = 0, ry = 0, raf = 0;

    const move = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      if (dot.current) dot.current.style.transform = `translate(${x}px,${y}px)`;
      const el = e.target as Element;
      const m = el.closest?.(".mag") as HTMLElement | null;
      if (m) {
        const q = m.getBoundingClientRect();
        m.style.transform = `translate(${(x - q.left - q.width / 2) * 0.22}px,${(y - q.top - q.height / 2) * 0.32}px)`;
      }
      const c = el.closest?.(".tilt") as HTMLElement | null;
      if (c) {
        const q = c.getBoundingClientRect();
        const a = (x - q.left) / q.width - 0.5;
        const b = (y - q.top) / q.height - 0.5;
        c.style.transform = `perspective(800px) rotateY(${a * 10}deg) rotateX(${-b * 10}deg) scale(1.03)`;
      }
    };
    const out = (e: PointerEvent) => {
      const m = (e.target as Element).closest?.(".mag,.tilt") as HTMLElement | null;
      if (m && !m.contains(e.relatedTarget as Node)) m.style.transform = "";
    };
    const over = (e: PointerEvent) => {
      ring.current?.classList.toggle("big", !!(e.target as Element).closest?.("a,button,input,select,textarea,summary,[data-h]"));
    };
    const loop = () => {
      rx += (x - rx) * 0.16;
      ry += (y - ry) * 0.16;
      if (ring.current) ring.current.style.transform = `translate(${rx}px,${ry}px)`;
      raf = requestAnimationFrame(loop);
    };

    addEventListener("pointermove", move);
    document.addEventListener("pointerout", out);
    document.addEventListener("pointerover", over);
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("pointermove", move);
      document.removeEventListener("pointerout", out);
      document.removeEventListener("pointerover", over);
      root.classList.remove("cur");
    };
  }, []);

  return (
    <>
      <div id="cu" ref={dot} />
      <div id="cr" ref={ring} />
    </>
  );
}

/** A red thread down the left edge that fills as you scroll. */
export function ScrollThread() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const on = () => {
      const max = Math.max(1, document.body.scrollHeight - innerHeight);
      if (ref.current) ref.current.style.transform = `scaleY(${Math.min(1, scrollY / max)})`;
    };
    addEventListener("scroll", on, { passive: true });
    on();
    return () => removeEventListener("scroll", on);
  }, []);
  return (
    <div
      ref={ref}
      className="fixed left-0 top-0 z-[80] h-full w-[3px] origin-top bg-red shadow-[0_0_14px_#F04A2E]"
      style={{ transform: "scaleY(0)" }}
      aria-hidden="true"
    />
  );
}
