"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Product } from "@/lib/types";
import { MAX_QTY } from "@/lib/config";

export type Line = { productId: string; size: string; qty: number };
type Ctx = {
  detailed: { line: Line; product: Product }[];
  count: number;
  subtotal: number;
  currency: string;
  currencySupported: boolean;
  open: boolean;
  setOpen: (v: boolean) => void;
  storageWarning: string;
  add: (p: Product, size: string) => void;
  canAdd: (p: Product, size: string) => boolean;
  change: (productId: string, size: string, delta: number) => void;
  remove: (productId: string, size: string) => void;
};

const CartCtx = createContext<Ctx | null>(null);
const KEY = "magic-bag-v2";

function validLines(value: unknown, products: Product[]): Line[] {
  if (!Array.isArray(value)) return [];
  const byId = new Map(products.map((product) => [product.id, product]));
  const merged = new Map<string, Line>();
  const totals = new Map<string, number>();

  for (const candidate of value) {
    if (!candidate || typeof candidate !== "object") continue;
    const item = candidate as Partial<Line>;
    if (typeof item.productId !== "string" || typeof item.size !== "string" || typeof item.qty !== "number" || !Number.isInteger(item.qty) || item.qty < 1) continue;

    const product = byId.get(item.productId);
    if (!product || product.stock <= 0) continue;
    const size = product.kind === "jersey" ? item.size : "OS";
    if (product.kind === "jersey" && !product.sizes.includes(size)) continue;

    const key = `${product.id}|${size}`;
    const previous = merged.get(key)?.qty ?? 0;
    const productTotal = totals.get(product.id) ?? 0;
    const available = Math.min(MAX_QTY - previous, product.stock - productTotal);
    const qty = Math.min(item.qty, available);
    if (qty <= 0) continue;

    merged.set(key, { productId: product.id, size, qty: previous + qty });
    totals.set(product.id, productTotal + qty);
  }

  return [...merged.values()];
}

export function CartProvider({ products, children }: { products: Product[]; children: ReactNode }) {
  const [lines, setLines] = useState<Line[]>([]);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [storageWarning, setStorageWarning] = useState("");
  const [restoreFailed, setRestoreFailed] = useState(false);

  useEffect(() => {
    if (loaded) return;
    try {
      const saved = localStorage.getItem(KEY);
      const restored: unknown = saved ? JSON.parse(saved) : [];
      if (!Array.isArray(restored)) {
        console.error("Could not restore the saved bag: stored data is not a list");
        setRestoreFailed(true);
        setStorageWarning("Your saved bag could not be restored in this browser.");
      }
      setLines(validLines(restored, products));
    } catch (error) {
      console.error("Could not restore the saved bag", error);
      setRestoreFailed(true);
      setStorageWarning("Your saved bag could not be restored in this browser.");
    }
    setLoaded(true);
  }, [loaded, products]);

  useEffect(() => {
    if (!loaded) return;
    setLines((current) => validLines(current, products));
  }, [loaded, products]);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(lines));
      if (!restoreFailed) setStorageWarning("");
    } catch (error) {
      console.error("Could not save the bag in this browser", error);
      setStorageWarning("Your bag is available for this visit but could not be saved in this browser.");
    }
  }, [lines, loaded, restoreFailed]);

  const canAdd = useCallback((p: Product, size: string) => {
    const normalizedSize = p.kind === "jersey" ? size : "OS";
    if (p.stock <= 0 || (p.kind === "jersey" && !p.sizes.includes(normalizedSize))) return false;
    const productQty = lines.filter((line) => line.productId === p.id).reduce((total, line) => total + line.qty, 0);
    const lineQty = lines.find((line) => line.productId === p.id && line.size === normalizedSize)?.qty ?? 0;
    return productQty < p.stock && lineQty < MAX_QTY;
  }, [lines]);

  const add = useCallback((p: Product, size: string) => {
    setLines((cur) => {
      const sz = p.kind === "jersey" ? size : "OS";
      if (p.stock <= 0 || (p.kind === "jersey" && !p.sizes.includes(sz))) return cur;
      const productQty = cur.filter((line) => line.productId === p.id).reduce((total, line) => total + line.qty, 0);
      if (productQty >= p.stock) return cur;
      const i = cur.findIndex((l) => l.productId === p.id && l.size === sz);
      if (i >= 0) {
        if (cur[i].qty >= MAX_QTY) return cur;
        return cur.map((l, j) => (j === i ? { ...l, qty: l.qty + 1 } : l));
      }
      return [...cur, { productId: p.id, size: sz, qty: 1 }];
    });
    setOpen(true);
  }, []);

  const change = useCallback((productId: string, size: string, delta: number) => {
    setLines((cur) => {
      const product = products.find((item) => item.id === productId);
      if (!product) return cur;
      const current = cur.find((line) => line.productId === productId && line.size === size);
      if (!current) return cur;
      const productQty = cur.filter((line) => line.productId === productId).reduce((total, line) => total + line.qty, 0);
      if (delta > 0 && (productQty >= product.stock || current.qty >= MAX_QTY)) return cur;
      const qty = Math.max(1, Math.min(MAX_QTY, current.qty + delta));
      return cur.map((line) => line.productId === productId && line.size === size ? { ...line, qty } : line);
    });
  }, [products]);

  const remove = useCallback((productId: string, size: string) => {
    setLines((cur) => cur.filter((l) => !(l.productId === productId && l.size === size)));
  }, []);

  const value = useMemo<Ctx>(() => {
    const detailed = lines.flatMap((line) => {
      const product = products.find((p) => p.id === line.productId);
      return product ? [{ line, product }] : [];
    });
    const currencies = new Set(detailed.map(({ product }) => product.currency.toLowerCase()));
    return {
      detailed,
      count: detailed.reduce((t, d) => t + d.line.qty, 0),
      subtotal: detailed.reduce((t, d) => t + d.product.price_cents * d.line.qty, 0),
      currency: currencies.values().next().value ?? "usd",
      currencySupported: currencies.size <= 1 && [...currencies].every((currency) => currency === "usd"),
      open,
      setOpen,
      storageWarning,
      add,
      canAdd,
      change,
      remove,
    };
  }, [lines, products, open, storageWarning, add, canAdd, change, remove]);

  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}

export function useCart() {
  const c = useContext(CartCtx);
  if (!c) throw new Error("useCart must be used inside CartProvider");
  return c;
}
