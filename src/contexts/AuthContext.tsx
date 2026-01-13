import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from '../types';
import { storage } from '../services/storage';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string) => Promise<boolean>;
  logout: () => void;
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Limpar dados antigos e inicializar do zero (para desenvolvimento limpo)
    const needsReset = !localStorage.getItem('aerogestao_initialized_v3');
    if (needsReset) {
      storage.resetAllData();
      localStorage.setItem('aerogestao_initialized_v3', 'true');
    }
    
    // Inicializar com admin e aeronave padrão
    storage.initializeBasicAdmin();
    
    // Tentar carregar usuário salvo ou fazer login automático como admin
    let currentUser = storage.getCurrentUser();
    
    if (!currentUser) {
      // Login automático com admin
      currentUser = storage.login('admin@aerogestao.com');
    }
    if (currentUser) {
      setUser(currentUser);
    }
    
    setIsLoading(false);
  }, []);

  const login = async (email: string): Promise<boolean> => {
    const foundUser = storage.login(email);
    if (foundUser) {
      setUser(foundUser);
      return true;
    }
    return false;
  };

  const logout = () => {
    storage.logout();
    setUser(null);
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
