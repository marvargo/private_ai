'use client';

import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '../lib/supabaseClient';

type AuthState = 'checking' | 'authenticated';

export function ProtectedDashboard({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>('checking');

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        window.location.replace('/login');
        return;
      }

      setAuthState('authenticated');
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        window.location.replace('/login');
      } else {
        setAuthState('authenticated');
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  if (authState === 'checking') {
    return <main className="min-h-screen bg-slate-950 p-8 text-slate-100">Checking secure session…</main>;
  }

  return <>{children}</>;
}
