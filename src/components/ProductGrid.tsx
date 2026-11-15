"use client";

import { useState } from "react";
import type { Product } from "@/lib/types";
import { money } from "@/lib/config";
import { ProductArt } from "./ProductArt";
import { SizePicker, defaultSize } from "./SizePicker";
import { useCart } from "./CartProvider";

function Card({ p, onQuick }: { p: Product; onQuick: (p: Product) => void }) {
  const { add, canAdd } = useCart();
  const [size, setSize] = useState(defaultSize(p.sizes));
  const soldOut = p.stock <= 0;
  const available = !soldOut && canAdd(p, size);
  return (
    <article className="card product-card rv">
      <button type="button" className="art product-art tilt" data-h aria-label={`Quick view ${p.title}`} onClick={() => onQuick(p)}>
        <span className="product-number">MAG / {String(p.sort + 1).padStart(2, "0")}</span>
        <ProductArt product={p} />
        <span className="product-view">Quick view <span aria-hidden="true">↗</span></span>
      </button>
      <div className="product-details p-5">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="product-title font-d text-3xl font-black">{p.title}</h3>
          <span className="product-price">{money(p.price_cents, p.currency)}</span>
        </div>
        <p className="product-subtitle text-sm text-ash">{p.subtitle}</p>
        {!soldOut && p.stock <= 5 && <p className="mt-1 text-sm text-red">Only {p.stock} left</p>}
        <div className="my-4">
          <SizePicker sizes={p.sizes} value={size} onChange={setSize} />
        </div>
        <button type="button" className="btn product-add mag w-full" disabled={!available} onClick={() => add(p, size)}>
          <span>{soldOut ? "Sold out" : available ? "Add to bag" : "Limit reached"}</span>
          {available && <span aria-hidden="true">↗</span>}
        </button>
      </div>
    </article>
  );
}

export function ProductGrid({ products, onQuick }: { products: Product[]; onQuick: (p: Product) => void }) {
  if (!products.length) {
    return <p className="text-ash">The collection is being restocked. Join the list below and we’ll tell you first.</p>;
  }
  return (
    <div className="product-grid grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((p) => (
        <Card key={p.id} p={p} onQuick={onQuick} />
      ))}
    </div>
  );
}
