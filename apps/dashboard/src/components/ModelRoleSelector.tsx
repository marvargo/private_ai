'use client';

const capabilities = [
  ['auto', 'Automatic'],
  ['business_reasoning', 'Strategy'],
  ['research', 'Research'],
  ['architecture', 'Architecture'],
  ['coding', 'Software'],
  ['qa', 'Quality'],
  ['database', 'Data'],
  ['devops', 'Operations'],
];

export function ModelRoleSelector({ label }: { label: string }) {
  return <label className="block text-sm text-slate-300"><span className="mb-2 block font-semibold text-white">{label}</span><select className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white" defaultValue="auto">{capabilities.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label>;
}
