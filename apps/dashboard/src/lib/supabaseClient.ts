'use client';

import { createBrowserClient } from '@supabase/ssr';

export const publicSupabaseEnvKeys = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'] as const;

export function createSupabaseBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase public URL and anon key are required for dashboard authentication.');
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
