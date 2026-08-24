import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * True when the app has been wired to a Supabase project. When false the UI
 * still renders, but shows a setup notice instead of failing with a blank
 * screen — useful on a first deploy before the env vars are added.
 */
export const isConfigured = Boolean(url && key);

export const supabase = createClient(
  url ?? 'https://placeholder.supabase.co',
  key ?? 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);
