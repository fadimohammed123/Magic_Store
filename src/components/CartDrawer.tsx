"use client";

import { useState, useTransition } from "react";
import { createCheckout } from "@/app/actions";
import { FREE_SHIPPING_CENTS, MAX_QTY, money } from "@/lib/config";
import { Dialog } from "./Dialog";
import { ProductArt } from "./ProductArt";
import { useCart } from "./CartProvider";

export function CartDrawer() {
  const { open, setOpen, detailed, subtotal, currency, currencySupported, storageWarning, canAdd, change, remove } = useCart();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  const toFree = FREE_SHIPPING_CENTS - subtotal;

  function checkout() {
    setError("");
    start(async () => {
      const res = await createCheckout(detailed.map(({ line }) => line));
      if ("url" in res) window.location.href = res.url;
      else setError(res.error);
    });
  }

  return (
    <Dialog open={open} onClose={() => setOpen(false)} id="bg" label="Shopping bag">
      <div className="flex h-full flex-col p-6 pt-[calc(24px+env(safe-area-inset-top,0px))]">
        <div className="flex items-center justify-between">
          <h2 className="font-d text-4xl font-black">Your bag</h2>
          <button type="button" className="zb" aria-label="Close bag" onClick={() => setOpen(false)}>×</button>
        </div>
        <div className="mt-4">
          <div className="h-[3px] bg-bone/20">
            <div
              className="h-full bg-red shadow-[0_0_10px_#F04A2E] transition-all duration-500"
              style={{ width: `${currencySupported ? Math.min(100, (subtotal / FREE_SHIPPING_CENTS) * 100) : 0}%` }}
            />
          </div>
          <p className="mt-2 text-sm text-ash">
            {!currencySupported
              ? "Checkout currently supports USD products only."
              : toFree <= 0
                ? "Free shipping unlocked."
                : `${money(toFree, currency)} away from free shipping.`}
          </p>
        </div>
        {storageWarning && <p role="status" className="mt-3 text-sm text-red">{storageWarning}</p>}

        <div className="my-4 flex-1 overflow-auto">
          {detailed.length === 0 ? (
            <p className="mt-8 text-ash">Your bag is empty. Nothing here yet, and that’s fine.</p>
          ) : (
            detailed.map(({ line, product: p }) => (
              <div key={`${p.id}|${line.size}`} className="flex gap-4 border-b border-bone/10 py-4">
                <div className="w-20 shrink-0 border border-bone/10 bg-ink">
                  <ProductArt product={p} />
                </div>
                <div className="flex-1">
                  <b className="font-d text-2xl font-black">{p.title}</b>
                  <p className="text-sm text-ash">
                    {line.size === "OS" ? "One size" : `Size ${line.size}`} · {money(p.price_cents, p.currency)}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <button type="button" className="zb" aria-label={`Remove one ${p.title}`} disabled={line.qty <= 1} onClick={() => change(p.id, line.size, -1)}>−</button>
                    <span className="w-6 text-center">{line.qty}</span>
                    <button type="button" className="zb" aria-label={`Add one ${p.title}`} disabled={line.qty >= MAX_QTY || !canAdd(p, line.size)} onClick={() => change(p.id, line.size, 1)}>+</button>
                    <button type="button" className="ml-auto min-h-[44px] text-sm text-ash underline" onClick={() => remove(p.id, line.size)}>Remove</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-bone/20 pt-4">
          <p className="mb-1 flex justify-between text-xl"><b>Subtotal</b><b>{currencySupported ? money(subtotal, currency) : "—"}</b></p>
          <p className="mb-4 text-sm text-ash">Shipping and taxes are calculated at checkout.</p>
          <button type="button" className="btn mag w-full" disabled={!detailed.length || !currencySupported || pending} onClick={checkout}>
            {pending ? "Opening checkout…" : "Checkout"}
          </button>
          <p role="alert" className="mt-3 min-h-[1.5em] text-sm text-red">{error}</p>
        </div>
      </div>
    </Dialog>
  );
}
