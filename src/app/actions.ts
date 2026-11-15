"use server";

import { z } from "zod";
import { serviceClient } from "@/lib/supabase/service";
import { getStripe } from "@/lib/stripe";
import { FLAT_SHIPPING_CENTS, FREE_SHIPPING_CENTS, MAX_QTY, SHIP_TO, SITE_URL } from "@/lib/config";
import type { FormState, Product } from "@/lib/types";

const clean = (v: FormDataEntryValue | null) => (typeof v === "string" ? v.trim() : "");

/* ---------------------------------------------------------------- newsletter */

export async function subscribe(_prev: FormState, fd: FormData): Promise<FormState> {
  // Honeypot: real people never fill this field.
  if (clean(fd.get("company"))) return { ok: true, message: "You’re on the list." };

  const parsed = z.string().email().max(254).safeParse(clean(fd.get("email")).toLowerCase());
  if (!parsed.success) return { ok: false, message: "That email doesn’t look right." };

  const { error } = await serviceClient()
    .from("subscribers")
    .upsert({ email: parsed.data, source: "footer" }, { onConflict: "email", ignoreDuplicates: true });

  // Duplicate or not, answer the same way so the list can’t be probed.
  if (error && error.code !== "23505") {
    console.error("subscribe failed", error);
    return { ok: false, message: "Something broke on our side. Try again in a minute." };
  }
  return { ok: true, message: "You’re on the list. We’ll be in touch before the next drop." };
}

/* ------------------------------------------------------------------- mending */

const mendingSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().max(254),
  piece: z.string().min(1).max(120),
  note: z.string().min(1).max(2000),
});

export async function submitMending(_prev: FormState, fd: FormData): Promise<FormState> {
  if (clean(fd.get("company"))) return { ok: true, message: "Got it." };

  const parsed = mendingSchema.safeParse({
    name: clean(fd.get("name")),
    email: clean(fd.get("email")).toLowerCase(),
    piece: clean(fd.get("piece")),
    note: clean(fd.get("note")),
  });
  if (!parsed.success) return { ok: false, message: "Fill in every field and use a valid email." };

  const { error } = await serviceClient().from("mending_requests").insert(parsed.data);
  if (error) {
    console.error("mending insert failed", error);
    return { ok: false, message: "Something broke on our side. Try again in a minute." };
  }
  return { ok: true, message: "Received. We’ll write back with how to mend it, or ask you to send it in." };
}

/* ------------------------------------------------------------------ checkout */

const lineSchema = z.object({
  productId: z.string().uuid(),
  size: z.string().max(8),
  qty: z.number().int().min(1).max(MAX_QTY),
});

export type CheckoutResult = { url: string } | { error: string };

/**
 * Validates the bag against the database (prices and stock are never trusted from the client),
 * writes a PENDING order, and returns a Stripe Checkout URL. The webhook confirms payment.
 */
export async function createCheckout(input: unknown): Promise<CheckoutResult> {
  const parsed = z.array(lineSchema).min(1).max(20).safeParse(input);
  if (!parsed.success) return { error: "Your bag is empty." };

  const db = serviceClient();
  const ids = [...new Set(parsed.data.map((l) => l.productId))];
  const { data, error } = await db.from("products").select("*").in("id", ids).eq("active", true);
  if (error) {
    console.error("checkout product lookup failed", error);
    return { error: "Those pieces aren’t available right now." };
  }
  if (!data?.length) return { error: "Those pieces aren’t available right now." };

  const byId = new Map((data as Product[]).map((p) => [p.id, p]));

  // Merge duplicate product+size lines and validate sizes.
  const merged = new Map<string, { p: Product; size: string; qty: number }>();
  for (const l of parsed.data) {
    const p = byId.get(l.productId);
    if (!p) return { error: "A piece in your bag is no longer available." };
    if (p.currency.toLowerCase() !== "usd") return { error: "Checkout currently supports USD products only." };
    const size = p.kind === "jersey" ? l.size : "OS";
    if (p.kind === "jersey" && !p.sizes.includes(size)) return { error: `Pick a valid size for ${p.title}.` };
    const key = `${p.id}|${size}`;
    const cur = merged.get(key);
    merged.set(key, { p, size, qty: Math.min(MAX_QTY, (cur?.qty ?? 0) + l.qty) });
  }
  const lines = [...merged.values()];

  // Stock check per product (all sizes combined).
  const perProduct = new Map<string, number>();
  for (const l of lines) perProduct.set(l.p.id, (perProduct.get(l.p.id) ?? 0) + l.qty);
  for (const [id, qty] of perProduct) {
    const p = byId.get(id)!;
    if (p.stock <= 0) return { error: `${p.title} is sold out.` };
    if (p.stock < qty) return { error: `Only ${p.stock} of ${p.title} left.` };
  }

  const subtotal = lines.reduce((t, l) => t + l.p.price_cents * l.qty, 0);
  const shipping = subtotal >= FREE_SHIPPING_CENTS ? 0 : FLAT_SHIPPING_CENTS;
  const currency = "usd";

  const { data: order, error: orderErr } = await db
    .from("orders")
    .insert({
      status: "pending",
      amount_subtotal: subtotal,
      amount_shipping: shipping,
      amount_total: subtotal + shipping,
      currency,
    })
    .select("id")
    .single();
  if (orderErr || !order) {
    console.error("order insert failed", orderErr);
    return { error: "We couldn’t start your checkout. Try again." };
  }

  const { error: itemsErr } = await db.from("order_items").insert(
    lines.map((l) => ({
      order_id: order.id,
      product_id: l.p.id,
      title: l.p.title,
      size: l.size,
      quantity: l.qty,
      unit_amount: l.p.price_cents,
    })),
  );
  if (itemsErr) {
    console.error("order_items insert failed", itemsErr);
    const { error: cleanupErr } = await db.from("orders").delete().eq("id", order.id);
    if (cleanupErr) console.error("pending order cleanup failed", cleanupErr);
    return { error: "We couldn’t start your checkout. Try again." };
  }

  try {
    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      client_reference_id: order.id,
      metadata: { order_id: order.id },
      payment_intent_data: { metadata: { order_id: order.id } },
      line_items: lines.map((l) => ({
        quantity: l.qty,
        price_data: {
          currency,
          unit_amount: l.p.price_cents,
          product_data: {
            name: l.p.kind === "jersey" ? `${l.p.title} (${l.size})` : l.p.title,
            description: l.p.subtitle || undefined,
          },
        },
      })),
      shipping_address_collection: { allowed_countries: [...SHIP_TO] },
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            display_name: shipping === 0 ? "Free shipping" : "Standard shipping",
            fixed_amount: { amount: shipping, currency },
          },
        },
      ],
      allow_promotion_codes: true,
      phone_number_collection: { enabled: true },
      expires_at: Math.floor(Date.now() / 1000) + 31 * 60,
      success_url: `${SITE_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE_URL}/#shop`,
    });

    if (!session.url) throw new Error("Stripe returned no URL");
    const { error: sessionUpdateErr } = await db.from("orders").update({ stripe_session_id: session.id }).eq("id", order.id);
    if (sessionUpdateErr) console.error("could not save Stripe session id", sessionUpdateErr);
    return { url: session.url };
  } catch (e) {
    console.error("stripe session failed", e);
    await db.from("orders").update({ status: "cancelled" }).eq("id", order.id);
    return { error: "Payment couldn’t be started. Try again." };
  }
}
