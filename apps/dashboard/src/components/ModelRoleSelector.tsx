'use client';

const roles = [
  ['auto', 'Auto route'],
  ['business_reasoning', 'Force Llama — Business'],
  ['research', 'Force Llama — Research'],
  ['architecture', 'Force Llama — Architecture'],
  ['coding', 'Force Qwen Coder — Coding'],
  ['qa', 'Force Qwen Coder — QA/Test'],
  ['database', 'Force Qwen Coder — Database'],
  ['devops', 'Force Qwen Coder — DevOps'],
];

export function ModelRoleSelector({ label }: { label: string }) {
  return <label className="block text-sm text-slate-300"><span className="mb-2 block font-semibold text-white">{label}</span><select className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white" defaultValue="auto">{roles.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label>;
}
