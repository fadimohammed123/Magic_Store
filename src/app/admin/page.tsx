import { requireAdmin } from "@/lib/auth";
import { AdminStudio } from "@/components/admin/AdminStudio";
import type { MendingRequest, Order, Product, Subscriber } from "@/lib/types";

export default async function AdminPage() {
  const { sb, user } = await requireAdmin();

  const [orders, products, mending, subs] = await Promise.all([
    sb.from("orders").select("*, order_items(*)").order("created_at", { ascending: false }).limit(300),
    sb.from("products").select("*").order("sort").order("created_at"),
    sb.from("mending_requests").select("*").order("created_at", { ascending: false }).limit(300),
    sb.from("subscribers").select("*").order("created_at", { ascending: false }).limit(2000),
  ]);
  if (products.error) console.error("Could not load studio products", products.error);

  return (
    <AdminStudio
      email={user.email ?? ""}
      orders={(orders.data ?? []) as Order[]}
      products={(products.data ?? []) as Product[]}
      productsError={products.error ? "Products could not be loaded. Refresh the studio and try again." : null}
      mending={(mending.data ?? []) as MendingRequest[]}
      subscribers={(subs.data ?? []) as Subscriber[]}
    />
  );
}
