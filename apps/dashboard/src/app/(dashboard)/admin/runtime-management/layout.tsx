import { AdminOnly } from '../../../../components/AdminOnly';

const links = [
  ['Overview', '/admin/runtime-management'],
  ['Runtimes', '/admin/runtime-management/runtimes'],
  ['Models', '/admin/runtime-management/models'],
  ['Scaling', '/admin/runtime-management/scaling'],
  ['Costs', '/admin/runtime-management/costs'],
  ['Logs', '/admin/runtime-management/logs'],
  ['Settings', '/admin/runtime-management/settings'],
  ['Validation', '/admin/runtime-management/validation'],
];

export default function RuntimeManagementLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminOnly>
      <main className="space-y-6 p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300">Administrator</p>
          <h2 className="text-2xl font-bold text-white">Runtime Management</h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-300">Manage runtime pools, lifecycle policy, scaling, costs, sanitized logs, and emergency controls.</p>
        </div>
        <nav className="flex flex-wrap gap-3 text-sm" aria-label="Runtime Management navigation">
          {links.map(([label, href]) => <a key={href} href={href} className="rounded border border-slate-700 px-3 py-2 text-slate-200 hover:border-cyan-400">{label}</a>)}
        </nav>
        {children}
      </main>
    </AdminOnly>
  );
}
