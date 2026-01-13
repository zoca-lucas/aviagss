// ============================================
// UTILITÁRIOS DE AUTENTICAÇÃO
// ============================================

import type { VercelRequest } from '@vercel/node';
import { getSupabaseClient } from './supabase';

export interface AuthUser {
  id: string;
  email: string;
  role: string;
}

/**
 * Verifica autenticação e retorna o usuário
 */
export async function getAuthenticatedUser(req: VercelRequest): Promise<AuthUser | null> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = getSupabaseClient(token);
    
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      return null;
    }

    // Buscar perfil do usuário
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    return {
      id: user.id,
      email: user.email || '',
      role: profile?.role || 'cotista',
    };
  } catch (error) {
    console.error('Error authenticating user:', error);
    return null;
  }
}

/**
 * Verifica se o usuário é admin ou gestor
 */
export function isAdminOrGestor(user: AuthUser | null): boolean {
  return user?.role === 'admin' || user?.role === 'gestor';
}
