// ============================================
// CLIENTE SUPABASE
// ============================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Cliente Supabase (pode ser null se não configurado - fallback para localStorage)
let supabaseInstance: SupabaseClient<Database> | null = null;

if (supabaseUrl && supabaseAnonKey) {
  supabaseInstance = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
} else {
  console.warn('Missing Supabase environment variables. Using localStorage fallback.');
}

export const supabase = supabaseInstance;

// Cliente para uso no backend (com service role key)
// Nota: Esta função só funciona no backend (Vercel Functions)
export const getSupabaseAdmin = (): SupabaseClient<Database> | null => {
  if (typeof process === 'undefined' || !process.env) {
    // Não está em ambiente Node.js (frontend)
    return null;
  }
  
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.SUPABASE_URL || supabaseUrl;
  
  if (!url || !serviceRoleKey) {
    console.warn('Missing SUPABASE_SERVICE_ROLE_KEY for admin operations');
    return null;
  }
  
  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};
