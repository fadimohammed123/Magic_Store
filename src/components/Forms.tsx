"use client";

import { useActionState } from "react";
import { submitMending, subscribe } from "@/app/actions";
import type { FormState } from "@/lib/types";

const init: FormState = { ok: false, message: "" };

const Honeypot = () => (
  <div className="absolute -left-[9999px]" aria-hidden="true">
    <label>
      Company
      <input name="company" tabIndex={-1} autoComplete="off" />
    </label>
  </div>
);

function Status({ s }: { s: FormState }) {
  return (
    <p role="status" aria-live="polite" className={`min-h-[1.5em] text-sm ${s.ok ? "text-bone" : "text-red"}`}>
      {s.message}
    </p>
  );
}

export function MendingForm({ pieces }: { pieces: string[] }) {
  const [state, action, pending] = useActionState(submitMending, init);
  return (
    <form action={action} className="relative grid max-w-xl gap-4">
      <Honeypot />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1 text-sm">Name<input name="name" required maxLength={120} autoComplete="name" className="field" /></label>
        <label className="grid gap-1 text-sm">Email<input name="email" type="email" required maxLength={254} autoComplete="email" className="field" /></label>
      </div>
      <label className="grid gap-1 text-sm">
        Which piece
        <select name="piece" required className="field">
          {[...pieces, "Something else"].map((p) => <option key={p}>{p}</option>)}
        </select>
      </label>
      <label className="grid gap-1 text-sm">What happened<textarea name="note" required rows={4} maxLength={2000} className="field" /></label>
      <button type="submit" className="btn mag justify-self-start" disabled={pending}>{pending ? "Sending…" : "Send mending request"}</button>
      <Status s={state} />
    </form>
  );
}

export function SubscribeForm() {
  const [state, action, pending] = useActionState(subscribe, init);
  return (
    <form action={action} className="relative max-w-md">
      <Honeypot />
      <label htmlFor="sub-email" className="text-sm text-ash">Join First Thread for early access to every drop</label>
      <div className="mt-2 flex gap-2">
        <input id="sub-email" name="email" type="email" required maxLength={254} autoComplete="email" placeholder="you@email.com" className="field" />
        <button type="submit" className="btn mag shrink-0" disabled={pending}>{pending ? "…" : "Join"}</button>
      </div>
      <div className="mt-2"><Status s={state} /></div>
    </form>
  );
}
