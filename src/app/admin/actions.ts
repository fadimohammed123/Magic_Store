"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/types";

export async function signIn(_prev: { error?: string }, fd: FormData): Promise<{ error?: string }> {
  const email = String(fd.get("email") ?? "").trim();
  const password = String(fd.get("password") ?? "");
  const sb = await createClient();

  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) return { error: "Wrong email or password." };

  const {
    data: { user },
  } = await sb.auth.getUser();
  const { data: admin } = await sb.from("admins").select("user_id").eq("user_id", user?.id ?? "").maybeSingle();
  if (!admin) {
    await sb.auth.signOut();
    return { error: "This account doesn’t have studio access." };
  }
  redirect("/admin");
}

export async function signOut() {
  const sb = await createClient();
  await sb.auth.signOut();
  redirect("/admin/login");
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);

const csv = (v: FormDataEntryValue | null) =>
  String(v ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

const productSchema = z.object({
  title: z.string().min(1).max(120),
  subtitle: z.string().max(160),
  description: z.string().max(1000),
  kind: z.enum(["jersey", "artifact"]),
  price: z.coerce.number().min(0).max(100000),
  stock: z.coerce.number().int().min(0).max(100000),
  sort: z.coerce.number().int().min(-1000).max(1000),
  art_key: z.string().max(20),
  image_url: z.string().max(500),
});

export async function saveProduct(_prev: FormState, fd: FormData): Promise<FormState> {
  const { sb } = await requireAdmin();
  const parsed = productSchema.safeParse({
    title: String(fd.get("title") ?? "").trim(),
    subtitle: String(fd.get("subtitle") ?? "").trim(),
    description: String(fd.get("description") ?? "").trim(),
    kind: fd.get("kind"),
    price: fd.get("price"),
    stock: fd.get("stock"),
    sort: fd.get("sort") || 0,
    art_key: String(fd.get("art_key") ?? "").trim(),
    image_url: String(fd.get("image_url") ?? "").trim(),
  });
  if (!parsed.success) return { ok: false, message: "Check the fields: title, kind, price and stock are required." };
  const v = parsed.data;

  const row = {
    title: v.title,
    subtitle: v.subtitle,
    description: v.description,
    kind: v.kind,
    price_cents: Math.round(v.price * 100),
    stock: v.stock,
    sort: v.sort,
    colors: csv(fd.get("colors")),
    sizes: v.kind === "jersey" ? csv(fd.get("sizes")) : [],
    art_key: v.art_key || null,
    image_url: v.image_url || null,
    active: fd.get("active") === "on",
  };

  const id = String(fd.get("id") ?? "");
  const { error } = id
    ? await sb.from("products").update(row).eq("id", id)
    : await sb.from("products").insert({ ...row, slug: `${slugify(v.title)}-${Math.random().toString(36).slice(2, 6)}` });
  if (error) return { ok: false, message: error.message };

  revalidatePath("/");
  revalidatePath("/admin");
  return { ok: true, message: id ? "Saved." : "Created." };
}

export async function deleteProduct(id: string): Promise<FormState> {
  const { sb } = await requireAdmin();
  const { error } = await sb.from("products").delete().eq("id", id);
  if (error) {
    console.error("product delete failed", error);
    return { ok: false, message: "Could not delete this product. Refresh the studio and try again." };
  }
  revalidatePath("/");
  revalidatePath("/admin");
  return { ok: true, message: "Product deleted." };
}

export async function setOrderStatus(id: string, status: "paid" | "fulfilled" | "refunded" | "cancelled") {
  const { sb } = await requireAdmin();
  await sb.from("orders").update({ status }).eq("id", id);
  revalidatePath("/admin");
}

export async function setMendingStatus(id: string, status: "new" | "in_progress" | "resolved") {
  const { sb } = await requireAdmin();
  await sb.from("mending_requests").update({ status }).eq("id", id);
  revalidatePath("/admin");
}
