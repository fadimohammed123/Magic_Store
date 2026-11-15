"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { money } from "@/lib/config";
import type { FormState, MendingRequest, Order, Product, Subscriber } from "@/lib/types";
import { deleteProduct, saveProduct, setMendingStatus, setOrderStatus, signOut } from "@/app/admin/actions";
import { Tree } from "@/components/Tree";

type Tab = "orders" | "products" | "mending" | "subscribers";
type Props = { email: string; orders: Order[]; products: Product[]; productsError: string | null; mending: MendingRequest[]; subscribers: Subscriber[] };

const when = (iso: string) => new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
const pill = (s: string) =>
  ({
    paid: "bg-red text-ink",
    new: "bg-red text-ink",
    fulfilled: "bg-bone text-ink",
    resolved: "bg-bone text-ink",
    in_progress: "border border-bone text-bone",
  })[s] ?? "border border-bone/40 text-ash";

export function AdminStudio({ email, orders, products, productsError, mending, subscribers }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("orders");
  const [live, setLive] = useState(false);
  const [toast, setToast] = useState("");

  // Realtime: any change to the tables refreshes the server data; admins only, because RLS filters the stream.
  useEffect(() => {
    const sb = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    let t: ReturnType<typeof setTimeout>;
    const bump = (msg?: string) => {
      if (msg) {
        setToast(msg);
        setTimeout(() => setToast(""), 4000);
      }
      clearTimeout(t);
      t = setTimeout(() => router.refresh(), 300);
    };
    const ch = sb
      .channel("studio")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, (p) => {
        const row = p.new as Partial<Order>;
        bump(p.eventType === "UPDATE" && row.status === "paid" ? `New paid order${row.amount_total ? `: ${money(row.amount_total)}` : ""}` : undefined);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "mending_requests" }, () => bump("New mending request"))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "subscribers" }, () => bump("New First Thread subscriber"))
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => bump())
      .subscribe((s) => setLive(s === "SUBSCRIBED"));
    return () => {
      clearTimeout(t);
      sb.removeChannel(ch);
    };
  }, [router]);

  const stats = useMemo(() => {
    const done = orders.filter((o) => o.status === "paid" || o.status === "fulfilled");
    return {
      revenue: done.reduce((t, o) => t + o.amount_total, 0),
      toShip: orders.filter((o) => o.status === "paid").length,
      openMending: mending.filter((m) => m.status !== "resolved").length,
      subs: subscribers.length,
    };
  }, [orders, mending, subscribers]);

  const tabs: [Tab, string, number][] = [
    ["orders", "Orders", stats.toShip],
    ["products", "Products", products.length],
    ["mending", "Mending", stats.openMending],
    ["subscribers", "First Thread", stats.subs],
  ];

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 md:px-10">
      <header className="flex flex-wrap items-center gap-4 border-b border-bone/15 pb-6">
        <span className="block w-9 text-bone"><Tree depth={5} /></span>
        <h1 className="font-d text-4xl font-black tracking-[.1em]">STUDIO</h1>
        <span className={`ml-2 flex items-center gap-2 text-sm ${live ? "text-bone" : "text-ash"}`}>
          <span className={`h-2 w-2 rounded-full ${live ? "bg-red shadow-[0_0_10px_#F04A2E]" : "bg-ash"}`} />
          {live ? "Live" : "Connecting"}
        </span>
        <span className="ml-auto text-sm text-ash">{email}</span>
        <form action={signOut}><button className="btn ghost" type="submit">Sign out</button></form>
      </header>

      {toast && (
        <p role="status" className="fixed right-5 top-5 z-50 bg-red px-4 py-3 font-semibold text-ink shadow-[0_0_30px_rgba(240,74,46,.5)]">{toast}</p>
      )}

      <dl className="my-8 grid grid-cols-2 gap-px bg-bone/15 md:grid-cols-4">
        {[
          ["Revenue", money(stats.revenue)],
          ["To ship", String(stats.toShip)],
          ["Open mending", String(stats.openMending)],
          ["Subscribers", String(stats.subs)],
        ].map(([k, v]) => (
          <div key={k} className="bg-ink p-5">
            <dt className="text-sm text-ash">{k}</dt>
            <dd className="font-d text-5xl font-black">{v}</dd>
          </div>
        ))}
      </dl>

      <div role="tablist" className="mb-6 flex flex-wrap gap-2">
        {tabs.map(([k, label, n]) => (
          <button key={k} role="tab" aria-selected={tab === k} type="button" className="zb" aria-pressed={tab === k} onClick={() => setTab(k)}>
            {label} <span className="ml-1 opacity-70">{n}</span>
          </button>
        ))}
      </div>

      {tab === "orders" && <Orders orders={orders} />}
      {tab === "products" && (
        <>
          {productsError && <p role="alert" className="mb-4 border border-red/40 p-4 text-red">{productsError}</p>}
          <Products products={products} />
        </>
      )}
      {tab === "mending" && <Mending items={mending} />}
      {tab === "subscribers" && <Subscribers items={subscribers} />}
    </div>
  );
}

/* ------------------------------------------------------------------ orders */

function Orders({ orders }: { orders: Order[] }) {
  const [filter, setFilter] = useState<string>("paid");
  const [pending, start] = useTransition();
  const rows = orders.filter((o) => filter === "all" || o.status === filter);
  return (
    <section>
      <label className="mb-4 flex items-center gap-3 text-sm text-ash">
        Show
        <select className="field w-auto" value={filter} onChange={(e) => setFilter(e.target.value)}>
          {["paid", "fulfilled", "refunded", "pending", "cancelled", "all"].map((s) => <option key={s}>{s}</option>)}
        </select>
      </label>
      {rows.length === 0 && <p className="text-ash">No {filter === "all" ? "" : filter} orders yet.</p>}
      <ul className="grid gap-4">
        {rows.map((o) => {
          const a = o.shipping?.address;
          return (
            <li key={o.id} className="card p-5">
              <div className="flex flex-wrap items-center gap-3">
                <span className={`px-2 py-1 text-xs font-bold ${pill(o.status)}`}>{o.status}</span>
                <b className="font-d text-3xl font-black">{money(o.amount_total, o.currency)}</b>
                <span className="text-sm text-ash">{when(o.paid_at ?? o.created_at)} · #{o.id.slice(0, 8)}</span>
              </div>
              <div className="mt-3 grid gap-4 md:grid-cols-2">
                <div className="text-sm">
                  <p><b>{o.shipping?.name ?? o.name ?? "No name yet"}</b></p>
                  <p className="text-ash">{o.email ?? "No email yet"}</p>
                  {a && (
                    <p className="mt-2 text-ash">
                      {[a.line1, a.line2].filter(Boolean).join(", ")}<br />
                      {[a.city, a.state, a.postal_code].filter(Boolean).join(" ")} {a.country}
                    </p>
                  )}
                </div>
                <ul className="text-sm">
                  {(o.order_items ?? []).map((i) => (
                    <li key={i.id} className="flex justify-between gap-3 border-b border-bone/10 py-1">
                      <span>{i.quantity} × {i.title}{i.size !== "OS" ? ` (${i.size})` : ""}</span>
                      <span className="text-ash">{money(i.unit_amount * i.quantity, o.currency)}</span>
                    </li>
                  ))}
                  <li className="flex justify-between py-1 text-ash"><span>Shipping</span><span>{money(o.amount_shipping, o.currency)}</span></li>
                </ul>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {o.status === "paid" && <button type="button" className="btn" disabled={pending} onClick={() => start(() => setOrderStatus(o.id, "fulfilled"))}>Mark shipped</button>}
                {o.status === "fulfilled" && <button type="button" className="btn ghost" disabled={pending} onClick={() => start(() => setOrderStatus(o.id, "paid"))}>Back to to-ship</button>}
                {(o.status === "paid" || o.status === "fulfilled") && (
                  <button type="button" className="btn ghost" disabled={pending} onClick={() => confirm("Mark as refunded? Issue the refund itself in Stripe.") && start(() => setOrderStatus(o.id, "refunded"))}>Mark refunded</button>
                )}
                {o.stripe_payment_intent && (
                  <a className="btn ghost" target="_blank" rel="noreferrer" href={`https://dashboard.stripe.com/payments/${o.stripe_payment_intent}`}>Open in Stripe</a>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ---------------------------------------------------------------- products */

function ProductForm({ p }: { p?: Product }) {
  const [state, action, pending] = useActionState(saveProduct, { ok: false, message: "" } as FormState);
  const [del, startDel] = useTransition();
  const [deleteState, setDeleteState] = useState<FormState | null>(null);
  return (
    <form action={action} className="grid gap-3 text-sm">
      {p && <input type="hidden" name="id" value={p.id} />}
      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-1">Title<input name="title" required defaultValue={p?.title} className="field" /></label>
        <label className="grid gap-1">Subtitle<input name="subtitle" defaultValue={p?.subtitle} className="field" /></label>
      </div>
      <label className="grid gap-1">Description<textarea name="description" rows={2} defaultValue={p?.description} className="field" /></label>
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
        <label className="grid gap-1">Kind
          <select name="kind" defaultValue={p?.kind ?? "jersey"} className="field"><option value="jersey">jersey</option><option value="artifact">artifact</option></select>
        </label>
        <label className="grid gap-1">Price (USD)<input name="price" type="number" step="0.01" min="0" required defaultValue={p ? p.price_cents / 100 : ""} className="field" /></label>
        <label className="grid gap-1">Stock<input name="stock" type="number" min="0" required defaultValue={p?.stock ?? 0} className="field" /></label>
        <label className="grid gap-1">Sort<input name="sort" type="number" defaultValue={p?.sort ?? 0} className="field" /></label>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-1">Sizes (jerseys, comma separated)<input name="sizes" defaultValue={p?.sizes.join(", ") ?? "S, M, L, XL, XXL"} className="field" /></label>
        <label className="grid gap-1">Colors (jerseys: base, trim)<input name="colors" defaultValue={p?.colors.join(", ") ?? "#10131f, #E9E2D3"} className="field" /></label>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-1">Artifact art
          <select name="art_key" defaultValue={p?.art_key ?? ""} className="field"><option value="">none</option><option>spool</option><option>pendant</option><option>patch</option></select>
        </label>
        <label className="grid gap-1">Photo URL (optional, replaces the drawing)<input name="image_url" defaultValue={p?.image_url ?? ""} className="field" /></label>
      </div>
      <label className="flex min-h-[44px] items-center gap-2"><input type="checkbox" name="active" defaultChecked={p?.active ?? true} className="h-5 w-5 accent-[#F04A2E]" /> Visible in the store</label>
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn" type="submit" disabled={pending}>{pending ? "Saving…" : p ? "Save changes" : "Create product"}</button>
        {p && (
          <button
            type="button"
            className="btn ghost"
            disabled={del}
            onClick={() => confirm(`Delete ${p.title}? Past orders keep their line items.`) && startDel(async () => {
              const result = await deleteProduct(p.id);
              setDeleteState(result);
            })}
          >
            {del ? "Deleting…" : "Delete"}
          </button>
        )}
        <span role="status" className={state.ok ? "text-bone" : "text-red"}>{state.message}</span>
        {deleteState && <span role="status" className={deleteState.ok ? "text-bone" : "text-red"}>{deleteState.message}</span>}
      </div>
    </form>
  );
}

function Products({ products }: { products: Product[] }) {
  return (
    <section className="grid gap-4">
      <details className="card p-5">
        <summary className="min-h-[28px] cursor-pointer font-d text-2xl font-black">+ New product</summary>
        <div className="mt-4"><ProductForm /></div>
      </details>
      {products.map((p) => (
        <details key={p.id} className="card p-5">
          <summary className="flex min-h-[28px] cursor-pointer flex-wrap items-center gap-3">
            <b className="font-d text-2xl font-black">{p.title}</b>
            <span className="text-ash">{money(p.price_cents)}</span>
            <span className={p.stock <= 5 ? "text-red" : "text-ash"}>{p.stock} in stock</span>
            {!p.active && <span className="border border-bone/40 px-2 text-xs text-ash">hidden</span>}
          </summary>
          <div className="mt-4"><ProductForm p={p} /></div>
        </details>
      ))}
    </section>
  );
}

/* ----------------------------------------------------------------- mending */

function Mending({ items }: { items: MendingRequest[] }) {
  const [pending, start] = useTransition();
  if (!items.length) return <p className="text-ash">No mending requests yet.</p>;
  return (
    <ul className="grid gap-4">
      {items.map((m) => (
        <li key={m.id} className="card p-5">
          <div className="flex flex-wrap items-center gap-3">
            <span className={`px-2 py-1 text-xs font-bold ${pill(m.status)}`}>{m.status.replace("_", " ")}</span>
            <b>{m.piece}</b>
            <span className="text-sm text-ash">{when(m.created_at)}</span>
          </div>
          <p className="mt-3 whitespace-pre-wrap font-s text-xl italic">{m.note}</p>
          <p className="mt-2 text-sm text-ash">{m.name} · <a className="underline" href={`mailto:${m.email}?subject=${encodeURIComponent(`Your ${m.piece}`)}`}>{m.email}</a></p>
          <div className="mt-4 flex flex-wrap gap-2">
            {(["new", "in_progress", "resolved"] as const).map((s) => (
              <button key={s} type="button" className="zb" aria-pressed={m.status === s} disabled={pending} onClick={() => start(() => setMendingStatus(m.id, s))}>
                {s.replace("_", " ")}
              </button>
            ))}
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------- subscribers */

function Subscribers({ items }: { items: Subscriber[] }) {
  function exportCsv() {
    const csv = "email,source,created_at\n" + items.map((s) => `${s.email},${s.source},${s.created_at}`).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "first-thread.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }
  return (
    <section>
      <button type="button" className="btn ghost mb-4" onClick={exportCsv} disabled={!items.length}>Export CSV</button>
      {!items.length && <p className="text-ash">No subscribers yet.</p>}
      <ul className="divide-y divide-bone/10">
        {items.map((s) => (
          <li key={s.id} className="flex justify-between gap-4 py-3 text-sm"><span>{s.email}</span><span className="text-ash">{when(s.created_at)}</span></li>
        ))}
      </ul>
    </section>
  );
}
