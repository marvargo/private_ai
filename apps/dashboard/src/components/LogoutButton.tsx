'use client';

import { useState } from 'react';
import { createSupabaseBrowserClient } from '../lib/supabaseClient';

export function LogoutButton() {
  const [isLoading, setIsLoading] = useState(false);

  async function logout() {
    setIsLoading(true);
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  return (
    <button
      className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-200 hover:border-cyan-400 disabled:opacity-60"
      type="button"
      onClick={logout}
      disabled={isLoading}
    >
      {isLoading ? 'Signing out…' : 'Logout'}
    </button>
  );
}
