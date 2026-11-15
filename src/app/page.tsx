import Storefront from "@/components/Storefront";
import { publicClient } from "@/lib/supabase/public";
import type { Product } from "@/lib/types";

// Regenerated at most every 30s. Admin edits and paid orders also revalidate this page immediately.
export const revalidate = 30;

export default async function Home() {
  let products: Product[] = [];
  let catalogError: string | null = null;
  try {
    const { data, error } = await publicClient().from("products").select("*").eq("active", true).order("sort").order("created_at");
    if (error) {
      console.error("Could not load products", error);
      catalogError = "The collection is temporarily unavailable. Please try again shortly.";
    } else {
      products = (data ?? []) as Product[];
    }
  } catch (error) {
    console.error("Could not load products", error);
    catalogError = "The collection is temporarily unavailable. Please try again shortly.";
  }
  return <Storefront products={products} catalogError={catalogError} />;
}
