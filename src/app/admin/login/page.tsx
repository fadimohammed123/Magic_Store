import { LoginForm } from "@/components/admin/LoginForm";

export const metadata = { title: "Studio", robots: { index: false, follow: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="grid min-h-screen place-items-center px-5">
      <LoginForm forbidden={error === "forbidden"} />
    </main>
  );
}
