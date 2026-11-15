export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/** Orders at or above this subtotal ship free. */
export const FREE_SHIPPING_CENTS = 50000;
/** Flat shipping below the free threshold. */
export const FLAT_SHIPPING_CENTS = 1500;
export const MAX_QTY = 10;
export const SHIP_TO = ["US", "CA", "GB", "AU", "DE", "FR", "NL", "IT", "ES", "SE", "JP"] as const;

export function money(cents: number, currency = "usd") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: cents % 100 ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}
