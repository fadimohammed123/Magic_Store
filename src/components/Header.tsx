"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { Tree } from "./Tree";
import { useCart } from "./CartProvider";

export function Header() {
  const { count, setOpen } = useCart();
  const btn = useRef<HTMLButtonElement>(null);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (btn.current && !matchMedia("(prefers-reduced-motion:reduce)").matches) {
      gsap.fromTo(btn.current, { scale: 1.18 }, { scale: 1, duration: 0.5, ease: "elastic.out(1,.4)" });
    }
  }, [count]);

  return (
    <header
      className="site-header fixed left-0 right-0 z-[60] flex h-[72px] items-center gap-6 border-b border-bone/10 bg-ink/80 px-5 backdrop-blur md:px-10"
      style={{ top: "env(safe-area-inset-top,0px)" }}
    >
      <a href="#top" className="site-brand flex items-center gap-3" data-h aria-label="Magic home">
        <span className="block w-8 text-red"><Tree depth={5} /></span>
        <span className="font-d text-3xl font-black tracking-[.12em]">MAGIC<span className="brand-period">.</span></span>
      </a>
      <nav className="site-nav ml-auto hidden gap-8 text-sm md:flex" aria-label="Main">
        <a href="#wear" className="py-3">Wear-in</a>
        <a href="#shop" className="py-3">Collection</a>
        <a href="#mending" className="py-3">Mending</a>
      </nav>
      <button ref={btn} type="button" className="btn bag-button mag ml-auto md:ml-0" onClick={() => setOpen(true)}>
        Bag <span className="bag-count">{count}</span>
      </button>
    </header>
  );
}
