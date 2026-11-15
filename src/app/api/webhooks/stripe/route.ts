import type Stripe from "stripe";
import { revalidatePath } from "next/cache";
import { getStripe } from "@/lib/stripe";
import { serviceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stripe -> Magic. Verifies the signature, then:
 *   checkout.session.completed / async_payment_succeeded -> pending order becomes PAID
 *   checkout.session.expired / async_payment_failed       -> pending order becomes CANCELLED
 * Handlers are idempotent: Stripe retries, and a duplicate delivery changes nothing.
 */
export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) return new Response("Missing signature", { status: 400 });

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(await req.text(), signature, secret);
  } catch (err) {
    console.error("Webhook signature verification failed", err);
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.payment_status === "paid") await markPaid(session);
        break;
      }
      case "checkout.session.expired":
      case "checkout.session.async_payment_failed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.client_reference_id ?? session.metadata?.order_id;
        if (orderId) {
          await serviceClient().from("orders").update({ status: "cancelled" }).eq("id", orderId).eq("status", "pending");
        }
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error(`Webhook handler failed for ${event.type}`, err);
    return new Response("Handler error", { status: 500 }); // non-2xx makes Stripe retry
  }

  return Response.json({ received: true });
}

async function markPaid(session: Stripe.Checkout.Session) {
  const orderId = session.client_reference_id ?? session.metadata?.order_id;
  if (!orderId) {
    console.error("Paid session without an order id", session.id);
    return;
  }
  const db = serviceClient();

  // Newer Stripe API versions move shipping under collected_information.
  const s = session as unknown as {
    collected_information?: { shipping_details?: unknown };
    shipping_details?: unknown;
  };
  const shipping = s.collected_information?.shipping_details ?? s.shipping_details ?? null;

  // Only a still-pending order is updated, so redelivered events do nothing the second time.
  const { data: updated, error } = await db
    .from("orders")
    .update({
      status: "paid",
      stripe_session_id: session.id,
      stripe_payment_intent: typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent?.id ?? null),
      email: session.customer_details?.email ?? null,
      name: session.customer_details?.name ?? null,
      shipping,
      amount_subtotal: session.amount_subtotal ?? 0,
      amount_shipping: session.total_details?.amount_shipping ?? 0,
      amount_total: session.amount_total ?? 0,
      currency: session.currency ?? "usd",
      paid_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .eq("status", "pending")
    .select("id");
  if (error) throw error;
  if (!updated?.length) return; // already processed

  const { data: items, error: itemsErr } = await db.from("order_items").select("product_id, quantity").eq("order_id", orderId);
  if (itemsErr) throw itemsErr;

  const perProduct = new Map<string, number>();
  for (const i of items ?? []) {
    if (i.product_id) perProduct.set(i.product_id, (perProduct.get(i.product_id) ?? 0) + i.quantity);
  }
  for (const [id, qty] of perProduct) {
    const { error: stockErr } = await db.rpc("decrement_stock", { p_id: id, p_qty: qty });
    if (stockErr) console.error("decrement_stock failed", id, stockErr);
  }

  revalidatePath("/");
}
