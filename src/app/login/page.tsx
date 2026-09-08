import { Logo } from "@/components/brand/Logo";
import { LoginForm } from "@/components/LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const params = await searchParams;
  const callbackUrl = params.callbackUrl ?? "/admin";

  return (
    <div className="flex flex-1 items-center justify-center bg-stone-950 px-4 py-16">
      <div className="w-full max-w-sm animate-fade-slide-up">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo size={48} className="mb-4" />
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-red-light">Flicks &amp; Licks</p>
          <h1 className="mt-2 text-2xl font-semibold text-stone-50">Staff sign in</h1>
          <p className="mt-1 text-sm text-stone-400">Restaurant operations platform</p>
        </div>
        <div className="rounded-2xl border border-stone-800 bg-stone-900/60 p-6 shadow-xl shadow-black/30">
          <LoginForm callbackUrl={callbackUrl} />
        </div>
      </div>
    </div>
  );
}
