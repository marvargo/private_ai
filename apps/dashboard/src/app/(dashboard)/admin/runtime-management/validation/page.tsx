'use client';

import { useEffect, useState } from 'react';
import { authenticatedJson } from '../../../../../lib/authenticatedApi';

type Gate = { id: string; label: string; phase: string; status: string; blocker?: string };

export default function RuntimeValidationPage() {
  const [gates, setGates] = useState<Gate[]>([]);
  const [productionReady, setProductionReady] = useState(false);

  useEffect(() => {
    authenticatedJson<{ productionReady: boolean; gates: Gate[] }>('/admin/production/validation')
      .then((payload) => { setGates(payload.gates); setProductionReady(payload.productionReady); })
      .catch(() => { setGates([]); setProductionReady(false); });
  }, []);

  return (
    <section className="space-y-4 rounded border border-slate-800 bg-slate-900 p-4 text-slate-200">
      <div><h3 className="text-lg font-semibold">Production validation gates</h3><p className="text-sm text-slate-400">Production-ready is {productionReady ? 'yes' : 'no'} until every deployment, browser, monitoring, cleanup, and controlled Llama validation gate has evidence.</p></div>
      <div className="space-y-2">{gates.map((gate) => <div key={gate.id} className="rounded border border-slate-800 p-3"><div className="font-semibold">{gate.label}</div><div className="text-xs uppercase tracking-wide text-slate-500">{gate.phase} · {gate.status}</div>{gate.blocker ? <p className="mt-1 text-sm text-amber-200">{gate.blocker}</p> : null}</div>)}</div>
    </section>
  );
}
