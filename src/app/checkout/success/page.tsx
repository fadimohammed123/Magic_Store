import Link from "next/link";
import { getStripe } from "@/lib/stripe";
import { money } from "@/lib/config";
import { ClearBag } from "@/components/ClearBag";
import { Tree } from "@/components/Tree";

export const metadata = { title: "Order received", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Success({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { session_id } = await searchParams;
  let paid = false;
  let email: string | null = null;
  let total = 0;
  let currency = "usd";

  if (session_id) {
    try {
      const s = await getStripe().checkout.sessions.retrieve(session_id);
      paid = s.payment_status === "paid";
      email = s.customer_details?.email ?? null;
      total = s.amount_total ?? 0;
      currency = s.currency ?? "usd";
    } catch {
      // fall through to the generic message
    }
  }

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden px-5 text-center">
      <div className="pointer-events-none absolute right-[-10%] top-0 w-[60vw] max-w-[760px] text-bone opacity-[.08]" aria-hidden="true">
        <Tree depth={8} />
      </div>
      {paid && <ClearBag />}
      <div className="relative max-w-xl">
        <h1 className="font-d text-[clamp(64px,14vw,160px)] font-black leading-[.85]">{paid ? "It’s yours." : "Thank you."}</h1>
        <p className="mt-6 font-s text-3xl italic">
          {paid ? "Payment received. Now go wear it until it’s yours." : "We’re confirming your payment. You’ll get an email shortly."}
        </p>
        {paid && (
          <p className="mt-4 text-ash">
            {money(total, currency)} paid{email ? `. A receipt is on its way to ${email}.` : "."}
          </p>
        )}
        <Link href="/" className="btn mt-10">Back to the collection</Link>
      </div>
    </main>
  );
}
