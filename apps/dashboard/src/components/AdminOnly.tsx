'use client';

import { useEffect, useState } from 'react';
import { authenticatedJson } from '../lib/authenticatedApi';

export function AdminOnly({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<'loading' | 'allowed' | 'denied'>('loading');

  useEffect(() => {
    let active = true;
    authenticatedJson<{ user?: { role?: string } }>('/me')
      .then((data) => {
        if (active) setState(data.user?.role === 'admin' ? 'allowed' : 'denied');
      })
      .catch(() => {
        if (active) setState('denied');
      });
    return () => {
      active = false;
    };
  }, []);

  if (state === 'loading') return <main className="p-6 text-slate-300">Checking administrator access…</main>;
  if (state === 'denied') return <main className="p-6 text-slate-300">Runtime Management is available to administrators only.</main>;
  return <>{children}</>;
}
