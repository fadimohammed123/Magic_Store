"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { Tree } from "./Tree";

const reduced = () => matchMedia("(prefers-reduced-motion:reduce)").matches;

/** The red thread, woven through the warp and bending toward your cursor. */
function ThreadCanvas({ ready }: { ready: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const S = useRef({ p: 0 });

  useEffect(() => {
    const cv = ref.current!;
    const cx = cv.getContext("2d")!;
    let W = 0, H = 0, mx = 0.5, my = 0.5, sx = 0.5, sy = 0.5, vis = true, raf = 0;
    const calm = reduced();

    const fit = () => {
      const d = Math.min(devicePixelRatio || 1, 2);
      W = cv.clientWidth;
      H = cv.clientHeight;
      cv.width = W * d;
      cv.height = H * d;
      cx.setTransform(d, 0, 0, d, 0, 0);
    };
    const move = (e: PointerEvent) => {
      const q = cv.getBoundingClientRect();
      mx = (e.clientX - q.left) / q.width;
      my = (e.clientY - q.top) / q.height;
    };
    const lines = (o: number) => {
      cx.beginPath();
      for (let i = o; i * 46 <= W; i += 2) {
        cx.moveTo(i * 46, 0);
        cx.lineTo(i * 46, H);
      }
    };
    const warp = (o: number, front: boolean) => {
      lines(o);
      if (front) {
        cx.strokeStyle = "#0E1220"; // odd warp threads cover the red thread: over, under, over
        cx.lineWidth = 6;
        cx.stroke();
        lines(o);
      }
      cx.strokeStyle = "rgba(233,226,211,.16)";
      cx.lineWidth = 1.4;
      cx.stroke();
    };
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      if (!vis) return;
      sx += (mx - sx) * 0.07;
      sy += (my - sy) * 0.07;
      cx.clearRect(0, 0, W, H);
      warp(0, false);
      const by = H * 0.3, px = sx * W;
      cx.beginPath();
      for (let x = 0; x <= W * S.current.p; x += 6) {
        const g = Math.exp(-(((x - px) / (W * 0.14)) ** 2));
        const y = by + (sy * H - by) * 0.6 * g + (calm ? 0 : Math.sin(x * 0.008 + t * 0.0016) * 9);
        if (x) cx.lineTo(x, y); else cx.moveTo(x, y);
      }
      cx.strokeStyle = "#F04A2E";
      cx.lineWidth = 3.5;
      cx.shadowColor = "#F04A2E";
      cx.shadowBlur = 20;
      cx.stroke();
      cx.shadowBlur = 0;
      warp(1, true);
    };

    fit();
    addEventListener("resize", fit);
    window.addEventListener("pointermove", move);
    const io = new IntersectionObserver((e) => (vis = e[0].isIntersecting));
    io.observe(cv);
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("resize", fit);
      window.removeEventListener("pointermove", move);
      io.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (reduced()) S.current.p = 1;
    else gsap.to(S.current, { p: 1, duration: 2.2, delay: 0.3, ease: "power3.inOut" });
  }, [ready]);

  return <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-hidden="true" />;
}

export function Hero({ ready }: { ready: boolean }) {
  useEffect(() => {
    if (!reduced()) gsap.set("[data-r]", { yPercent: 115 });
  }, []);
  useEffect(() => {
    if (ready && !reduced()) gsap.to("[data-r]", { yPercent: 0, duration: 1.2, stagger: 0.07, ease: "expo.out" });
  }, [ready]);

  return (
    <section id="hero" className="hero-section relative flex min-h-screen flex-col justify-end overflow-hidden px-5 pb-14 pt-28 md:px-10">
      <ThreadCanvas ready={ready} />
      <div id="wm" className="pointer-events-none absolute right-[-8%] top-[2%] w-[70vw] max-w-[860px] text-bone opacity-[.1]" aria-hidden="true">
        <Tree depth={8} />
      </div>
      <div className="relative">
        <div className="hero-meta mb-8 flex flex-wrap items-center justify-between gap-x-8 gap-y-2">
          <p>Independent uniform for the in-between.</p>
          <p className="hero-index"><span /> EST. MMXXIV <span className="hidden sm:inline">·</span> BUILT TO OUTLIVE THE MOMENT</p>
        </div>
        <h1 className="hero-title flex font-d text-[clamp(88px,26vw,420px)] font-black leading-[.82] tracking-[-.01em]" aria-label="Magic">
          {[..."MAGIC"].map((c, i) => (
            <span key={i} className="inline-block overflow-hidden" aria-hidden="true">
              <span data-r className="inline-block">{c}</span>
            </span>
          ))}
        </h1>
        <div className="hero-bottom mt-6 grid items-end gap-8 md:grid-cols-[1.2fr_1fr]">
          <p className="hero-statement overflow-hidden font-s text-[clamp(30px,4.6vw,64px)] italic leading-[1.02]">
            <span data-r className="block">What stays when everything else falls.</span>
          </p>
          <div className="overflow-hidden">
            <div data-r>
              <p className="hero-description mb-6 max-w-md text-ash">
                Luxury jerseys and artifacts. Raw by nature, heavyweight by design, finished only when you’ve worn them hard.
              </p>
              <div className="flex flex-wrap gap-3">
                <a href="#shop" className="btn mag">Explore the collection <span aria-hidden="true">↗</span></a>
                <a href="#wear" className="btn ghost mag">See the wear-in</a>
              </div>
            </div>
          </div>
        </div>
        <a href="#shop" className="hero-scroll" aria-label="Scroll to the collection"><span /> SCROLL TO DISCOVER</a>
      </div>
    </section>
  );
}
