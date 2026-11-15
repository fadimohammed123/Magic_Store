export type Product = {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  kind: "jersey" | "artifact";
  price_cents: number;
  currency: string;
  colors: string[];
  art_key: string | null;
  image_url: string | null;
  sizes: string[];
  stock: number;
  active: boolean;
  sort: number;
};

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string | null;
  title: string;
  size: string;
  quantity: number;
  unit_amount: number;
};

export type Order = {
  id: string;
  status: "pending" | "paid" | "fulfilled" | "refunded" | "cancelled";
  stripe_session_id: string | null;
  stripe_payment_intent: string | null;
  email: string | null;
  name: string | null;
  shipping: {
    name?: string | null;
    address?: {
      line1?: string | null;
      line2?: string | null;
      city?: string | null;
      state?: string | null;
      postal_code?: string | null;
      country?: string | null;
    } | null;
  } | null;
  amount_subtotal: number;
  amount_shipping: number;
  amount_total: number;
  currency: string;
  created_at: string;
  paid_at: string | null;
  order_items?: OrderItem[];
};

export type MendingRequest = {
  id: string;
  name: string;
  email: string;
  piece: string;
  note: string;
  status: "new" | "in_progress" | "resolved";
  created_at: string;
};

export type Subscriber = { id: string; email: string; source: string; created_at: string };

export type FormState = { ok: boolean; message: string };
