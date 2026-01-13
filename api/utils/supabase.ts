// ============================================
// CLIENTE SUPABASE PARA VERCEL FUNCTIONS
// ============================================

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../src/services/database.types';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing Supabase environment variables');
}

// Cliente com service role key (tem acesso total, bypass RLS)
export const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

// Cliente com anon key (respeita RLS)
export const getSupabaseClient = (token?: string) => {
  const anonKey = process.env.SUPABASE_ANON_KEY!;
  if (!anonKey) {
    throw new Error('Missing SUPABASE_ANON_KEY');
  }

  const client = createClient<Database>(supabaseUrl, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
  });

  return client;
};
