import { LogoutButton } from '../../components/LogoutButton';
import { ProtectedDashboard } from '../../components/ProtectedDashboard';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedDashboard>
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <header className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300">Private control plane</p>
            <h1 className="text-xl font-bold">WyndMe Private AI</h1>
          </div>
          <LogoutButton />
        </header>
        {children}
      </div>
    </ProtectedDashboard>
  );
}
