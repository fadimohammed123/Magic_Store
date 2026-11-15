"use client";

import { useEffect, useRef, useState } from "react";
import type { Product } from "@/lib/types";
import { money } from "@/lib/config";
import { Dialog } from "./Dialog";
import { ProductArt } from "./ProductArt";
import { SizePicker, defaultSize } from "./SizePicker";
import { useCart } from "./CartProvider";

export function ProductModal({ product, onClose }: { product: Product | null; onClose: () => void }) {
  const { add, canAdd } = useCart();
  const last = useRef<Product | null>(null);
  if (product) last.current = product;
  const p = product ?? last.current;

  const [size, setSize] = useState("M");
  const [view, setView] = useState<0 | 1>(0);
  useEffect(() => {
    if (product) {
      setSize(defaultSize(product.sizes));
      setView(0);
    }
  }, [product]);

  return (
    <Dialog open={!!product} onClose={onClose} id="md" label="Product details">
      {p && (
        <div className="grid md:grid-cols-2">
          <div className="relative">
            <div className="art" style={{ cursor: "default" }}>
              <ProductArt product={p} view={view} />
            </div>
            {p.kind === "jersey" && !p.image_url && (
              <div className="absolute bottom-3 left-3 flex gap-2">
                <button type="button" className="zb bg-ink/80" aria-pressed={view === 0} onClick={() => setView(0)}>Front</button>
                <button type="button" className="zb bg-ink/80" aria-pressed={view === 1} onClick={() => setView(1)}>Back</button>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-5 p-6 md:p-10">
            <button type="button" className="zb self-end" aria-label="Close details" onClick={onClose}>×</button>
            <div>
              <h2 className="font-d text-6xl font-black leading-[.9]">{p.title}</h2>
              <p className="mt-2 text-ash">{p.subtitle}</p>
            </div>
            <p className="font-s text-2xl italic">{p.description}</p>
            <p className="text-2xl">{money(p.price_cents, p.currency)}</p>
            <SizePicker sizes={p.sizes} value={size} onChange={setSize} />
            {p.stock > 0 && !canAdd(p, size) && <p className="text-sm text-red">The bag limit or available stock has been reached for this piece.</p>}
            <button
              type="button"
              className="btn mag"
              disabled={!canAdd(p, size)}
              onClick={() => {
                add(p, size);
                onClose();
              }}
            >
              {p.stock <= 0 ? "Sold out" : canAdd(p, size) ? "Add to bag" : "Limit reached"}
            </button>
            <div className="divide-y divide-bone/15 border-y border-bone/15 text-sm text-bone/85">
              <details className="py-3">
                <summary className="min-h-[28px] cursor-pointer">Fabric and fit</summary>
                <p className="mt-2 text-ash">
                  {p.kind === "jersey"
                    ? "Heavyweight brushed cotton, 420 gsm. Boxy, dropped shoulder. Size up for a looser fit."
                    : "Cast, forged and waxed by hand. Each one differs slightly."}
                </p>
              </details>
              <details className="py-3">
                <summary className="min-h-[28px] cursor-pointer">Care</summary>
                <p className="mt-2 text-ash">
                  {p.kind === "jersey"
                    ? "Wash cold, hang dry. Wash it less than you think. The wear is the point."
                    : "Wipe with a dry cloth. Let it darken."}
                </p>
              </details>
            </div>
          </div>
        </div>
      )}
    </Dialog>
  );
}
