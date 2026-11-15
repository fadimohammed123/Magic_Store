import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Gate for every admin page and admin server action.
 * The check runs against the user's own session, so RLS enforces it again in the database.
 */
export async function requireAdmin() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/admin/login");
  const { data } = await sb.from("admins").select("user_id").eq("user_id", user.id).maybeSingle();
  if (!data) redirect("/admin/login?error=forbidden");
  return { sb, user };
}
