import { LogoutButton } from '../../components/LogoutButton';
import { ProtectedDashboard } from '../../components/ProtectedDashboard';
import { AdminNavLink } from '../../components/AdminNavLink';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedDashboard>
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <header className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300">Private AI workspace</p>
            <h1 className="text-xl font-bold">WyndMe Private AI</h1>

          <nav className="mt-3 flex flex-wrap gap-3 text-sm text-slate-300" aria-label="Primary workspace navigation">
            <a href="/chat" className="hover:text-cyan-200">Chat</a>
            <a href="/studio" className="hover:text-cyan-200">Studio</a>
            <a href="/coding" className="hover:text-cyan-200">Coding</a>
            <a href="/workflows" className="hover:text-cyan-200">Workflows</a>
            <a href="/integrations" className="hover:text-cyan-200">Integrations</a>
            <a href="/settings" className="hover:text-cyan-200">Settings</a>
            <AdminNavLink />
          </nav>
          </div>
          <LogoutButton />
        </header>
        {children}
      </div>
    </ProtectedDashboard>
  );
}
