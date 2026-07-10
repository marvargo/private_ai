export function StatusCard({ title, value, detail }: { title: string; value: string; detail?: string }) {
  return <div className="card"><p className="text-sm text-slate-400">{title}</p><p className="mt-1 font-bold text-white">{value}</p>{detail ? <p className="mt-1 text-xs text-slate-400">{detail}</p> : null}</div>;
}
