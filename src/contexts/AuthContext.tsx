import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from '../types';
import { supabase } from '../services/supabase';
import { storage } from '../services/storage'; // Fallback para desenvolvimento

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, nome: string, telefone?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  permissions: {
    canManageAircraft: boolean;
    canManageMaintenance: boolean;
    canManageFinancial: boolean;
    canCreateFlights: boolean;
    canViewReports: boolean;
    canManageUsers: boolean;
  };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getPermissions = (role: UserRole) => ({
  canManageAircraft: role === 'admin' || role === 'gestor',
  canManageMaintenance: role === 'admin' || role === 'gestor',
  canManageFinancial: role === 'admin' || role === 'gestor',
  canCreateFlights: role === 'admin' || role === 'gestor' || role === 'piloto',
  canViewReports: true,
  canManageUsers: role === 'admin',
});

// Converter perfil do banco para formato User
const convertProfileToUser = (profile: any, authUser: any): User => ({
  id: authUser.id,
  email: authUser.email || profile.email || '',
  nome: profile.nome || '',
  telefone: profile.telefone || undefined,
  role: (profile.role as UserRole) || 'cotista',
  avatar: profile.avatar || undefined,
  horasTotais: Number(profile.horas_totais) || 0,
  observacoes: profile.observacoes || undefined,
  createdAt: profile.created_at || new Date().toISOString(),
  updatedAt: profile.updated_at || new Date().toISOString(),
  active: profile.active !== false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Se Supabase não estiver configurado, usar localStorage (fallback)
    if (!supabase) {
      console.warn('Supabase não configurado, usando localStorage como fallback');
      const needsReset = !localStorage.getItem('aerogestao_initialized_v3');
      if (needsReset) {
        storage.resetAllData();
        localStorage.setItem('aerogestao_initialized_v3', 'true');
      }
      storage.initializeBasicAdmin();
      let currentUser = storage.getCurrentUser();
      if (!currentUser) {
        currentUser = storage.login('admin@aerogestao.com');
      }
      if (currentUser) {
        setUser(currentUser);
      }
      setIsLoading(false);
      return;
    }

    // Carregar sessão do Supabase
    const loadSession = async () => {
      if (!supabase) return;
      
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Erro ao carregar sessão:', sessionError);
          setIsLoading(false);
          return;
        }

        if (session?.user && supabase) {
          // Buscar perfil do usuário
          const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', session.user.id)
            .single();

          if (profileError) {
            console.error('Erro ao carregar perfil:', profileError);
            setIsLoading(false);
            return;
          }

          if (profile) {
            const userData = convertProfileToUser(profile, session.user);
            setUser(userData);
          }
        }
      } catch (error) {
        console.error('Erro ao carregar sessão:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSession();

    // Escutar mudanças de autenticação
    if (!supabase) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session || !supabase) {
        setUser(null);
        return;
      }

      if (session?.user && supabase) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', session.user.id)
          .single();

        if (profile) {
          const userData = convertProfileToUser(profile, session.user);
          setUser(userData);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    // Fallback para localStorage se Supabase não estiver configurado
    if (!supabase) {
      const foundUser = storage.login(email);
      if (foundUser) {
        setUser(foundUser);
        return { success: true };
      }
      return { success: false, error: 'Email não encontrado' };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        // Buscar perfil do usuário
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', data.user.id)
          .single();

        if (profileError || !profile) {
          return { success: false, error: 'Perfil de usuário não encontrado' };
        }

        const userData = convertProfileToUser(profile, data.user);
        setUser(userData);
        return { success: true };
      }

      return { success: false, error: 'Erro ao fazer login' };
    } catch (error: any) {
      console.error('Erro ao fazer login:', error);
      return { success: false, error: error.message || 'Erro ao fazer login' };
    }
  };

  const register = async (
    email: string,
    password: string,
    nome: string,
    telefone?: string
  ): Promise<{ success: boolean; error?: string }> => {
    // Fallback para localStorage se Supabase não estiver configurado
    if (!supabase) {
      return { success: false, error: 'Cadastro não disponível. Configure o Supabase.' };
    }

    try {
      // Criar usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) {
        return { success: false, error: authError.message };
      }

      if (!authData.user) {
        return { success: false, error: 'Erro ao criar usuário' };
      }

      // Criar perfil do usuário na tabela user_profiles
      // Nota: O email não é armazenado aqui porque já está no auth.users
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          user_id: authData.user.id,
          nome: nome,
          telefone: telefone || null,
          role: 'cotista', // Por padrão, novos usuários são cotistas
          active: true,
          horas_totais: 0,
        } as any);

      if (profileError) {
        console.error('Erro ao criar perfil:', profileError);
        return { success: false, error: 'Erro ao criar perfil do usuário: ' + profileError.message };
      }

      // Buscar perfil criado
      const { data: profile, error: fetchError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', authData.user.id)
        .single();

      if (fetchError || !profile) {
        return { success: false, error: 'Erro ao buscar perfil criado' };
      }

      const userData = convertProfileToUser(profile, authData.user);
      setUser(userData);
      return { success: true };
    } catch (error: any) {
      console.error('Erro ao fazer cadastro:', error);
      return { success: false, error: error.message || 'Erro ao fazer cadastro' };
    }
  };

  const logout = async (): Promise<void> => {
    if (!supabase) {
      storage.logout();
      setUser(null);
      return;
    }

    try {
      await supabase.auth.signOut();
      setUser(null);
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  const permissions = user
    ? getPermissions(user.role)
    : {
        canManageAircraft: false,
        canManageMaintenance: false,
        canManageFinancial: false,
        canCreateFlights: false,
        canViewReports: false,
        canManageUsers: false,
      };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        permissions,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used dentro de AuthProvider');
  }
  return ctx;
}
