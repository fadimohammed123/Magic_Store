"use client";

import { useEffect, useState } from "react";
import gsap from "gsap";
import type { Product } from "@/lib/types";
import { CartProvider } from "./CartProvider";
import { Cursor, ScrollThread } from "./Cursor";
import { Intro } from "./Intro";
import { Header } from "./Header";
import { Hero } from "./Hero";
import { WearIn } from "./WearIn";
import { ProductGrid } from "./ProductGrid";
import { ProductModal } from "./ProductModal";
import { CartDrawer } from "./CartDrawer";
import { MendingForm, SubscribeForm } from "./Forms";
import { Tree } from "./Tree";

export default function Storefront({ products, catalogError }: { products: Product[]; catalogError: string | null }) {
  const [ready, setReady] = useState(false);
  const [quick, setQuick] = useState<Product | null>(null);

  // Scroll-driven reveals and the hero watermark parallax.
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion:reduce)").matches) return;
    let ctx: gsap.Context | undefined;
    let cancelled = false;
    import("gsap/ScrollTrigger").then(({ ScrollTrigger }) => {
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);
      ctx = gsap.context(() => {
        gsap.to("#wm", { yPercent: 14, ease: "none", scrollTrigger: { trigger: "#hero", scrub: true, start: "top top", end: "bottom top" } });
        gsap.utils.toArray<HTMLElement>(".rv").forEach((el) =>
          gsap.from(el, { y: 70, opacity: 0, duration: 1.1, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 88%" } }),
        );
      });
    });
    return () => {
      cancelled = true;
      ctx?.revert();
    };
  }, [products]);

  return (
    <CartProvider products={products}>
      <svg width="0" height="0" className="absolute" aria-hidden="true">
        <defs>
          <filter id="pf">
            <feTurbulence type="fractalNoise" baseFrequency=".04" numOctaves={3} seed={2} result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale={3} />
          </filter>
        </defs>
      </svg>
      <Cursor />
      <ScrollThread />
      <Intro onDone={() => setReady(true)} />
      <Header />

      <main id="top">
        <Hero ready={ready} />
        <WearIn />

        <section id="shop" className="collection-section border-t border-bone/10 px-5 py-24 md:px-10 md:py-36">
          <div className="mx-auto max-w-7xl">
            <div className="collection-heading rv mb-12 flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="section-eyebrow"><span /> THE FIRST THREAD / VOL. 01</p>
                <h2 className="font-d text-[clamp(52px,8vw,120px)] font-black leading-[.88]">Objects<br className="sm:hidden" /> with a past.</h2>
              </div>
              <p className="max-w-sm font-s text-2xl italic text-bone/90">Jerseys and artifacts. Numbered, heavyweight and made to be worn hard.</p>
            </div>
            {catalogError ? (
              <p role="alert" className="card border-red/40 p-6 text-bone">{catalogError}</p>
            ) : (
              <ProductGrid products={products} onQuick={setQuick} />
            )}
          </div>
        </section>

        <section id="mending" className="border-t border-bone/10 px-5 py-24 md:px-10 md:py-36">
          <div className="mx-auto grid max-w-7xl gap-12 md:grid-cols-2">
            <div className="rv">
              <h2 className="font-d text-[clamp(52px,8vw,120px)] font-black leading-[.88]">Frayed?<br />Good.</h2>
              <p className="mt-5 max-w-md font-s text-3xl italic text-bone/90">Tell us what happened. We’ll write back with how to mend it, or ask you to send it in.</p>
            </div>
            <MendingForm pieces={products.map((p) => p.title)} />
          </div>
        </section>
      </main>

      <footer className="relative overflow-hidden border-t border-bone/10 px-5 py-16 md:px-10">
        <div className="pointer-events-none absolute bottom-[-30%] right-[-4%] w-[420px] text-bone opacity-[.08]" aria-hidden="true">
          <Tree depth={7} />
        </div>
        <p className="relative font-d text-6xl font-black tracking-[.1em]">MAGIC</p>
        <div className="relative mt-8"><SubscribeForm /></div>
        <p className="relative mt-10 text-sm text-ash">What stays when everything else falls.</p>
      </footer>

      <ProductModal product={quick} onClose={() => setQuick(null)} />
      <CartDrawer />
    </CartProvider>
  );
}
