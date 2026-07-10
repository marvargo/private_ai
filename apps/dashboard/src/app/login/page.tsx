import { LoginForm } from '../../components/LoginForm';

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-slate-100">
      <section className="w-full max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-300">WyndMe Private AI</p>
          <h1 className="text-3xl font-bold">Admin login</h1>
          <p className="text-sm text-slate-400">Sign in with a Supabase admin account. Provider and service-role secrets stay backend-only.</p>
        </div>
        <LoginForm />
      </section>
    </main>
  );
}
