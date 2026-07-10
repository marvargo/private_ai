import { describe, expect, it } from 'vitest';
import { publicSupabaseEnvKeys } from './supabaseClient';

describe('dashboard Supabase client configuration', () => {
  it('only allows public Supabase environment variables in the browser client', () => {
    expect(publicSupabaseEnvKeys).toEqual(['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY']);
    expect(publicSupabaseEnvKeys).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
    expect(publicSupabaseEnvKeys).not.toContain('SUPABASE_SECRET_KEY');
  });
});
