"use client";

import { useActionState } from "react";
import { signIn } from "@/app/admin/actions";
import { Tree } from "@/components/Tree";

export function LoginForm({ forbidden }: { forbidden: boolean }) {
  const [state, action, pending] = useActionState(signIn, {} as { error?: string });
  const error = state.error ?? (forbidden ? "This account doesn’t have studio access." : "");
  return (
    <form action={action} className="grid w-full max-w-sm gap-4">
      <div className="mb-4 flex items-center gap-3">
        <span className="block w-10 text-bone"><Tree depth={5} /></span>
        <h1 className="font-d text-5xl font-black tracking-[.1em]">STUDIO</h1>
      </div>
      <label className="grid gap-1 text-sm">Email<input name="email" type="email" required autoComplete="username" className="field" /></label>
      <label className="grid gap-1 text-sm">Password<input name="password" type="password" required autoComplete="current-password" className="field" /></label>
      <button type="submit" className="btn" disabled={pending}>{pending ? "Signing in…" : "Enter the studio"}</button>
      <p role="alert" className="min-h-[1.5em] text-sm text-red">{error}</p>
    </form>
  );
}
