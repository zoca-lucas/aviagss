import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAircraft } from '../contexts/AircraftContext';
import {
  LayoutDashboard,
  Plane,
  BookOpen,
  ClipboardList,
  Wrench,
  DollarSign,
  Building2,
  FileText,
  Calendar,
  Navigation,
  BarChart3,
  PieChart,
  Users as UsersIcon,
  Settings,
  Bell,
  Menu,
  X,
  ChevronDown,
  Users,
  Book as BookIcon,
} from 'lucide-react';
import './Layout.css';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, permissions } = useAuth();
  const { aircrafts, selectedAircraft, selectAircraft } = useAircraft();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [aircraftDropdownOpen, setAircraftDropdownOpen] = useState(false);

  const menuItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard', show: true },
    { path: '/aeronaves', icon: Plane, label: 'Aeronaves', show: permissions.canManageAircraft },
    { path: '/catalogo', icon: BookIcon, label: 'Catálogo', show: true },
    { path: '/lancamentos', icon: ClipboardList, label: 'Lançamentos de Voo', show: true },
    { path: '/logbook', icon: BookOpen, label: 'Logbook', show: true },
    { path: '/manutencao', icon: Wrench, label: 'Manutenção', show: true },
    { path: '/financeiro', icon: DollarSign, label: 'Financeiro', show: true },
    { path: '/patrimonio', icon: Building2, label: 'Patrimônio', show: true },
    { path: '/documentos', icon: FileText, label: 'Documentos', show: true },
    { path: '/agenda', icon: Calendar, label: 'Agenda', show: true },
    { path: '/estimativa', icon: Navigation, label: 'Estimativa de Voo', show: true },
    { path: '/relatorios', icon: BarChart3, label: 'Relatórios', show: permissions.canViewReports },
    { path: '/relatorios-lancamentos', icon: PieChart, label: 'Relatórios Voos', show: permissions.canViewReports },
    { path: '/uso-por-socio', icon: UsersIcon, label: 'Uso por Sócio', show: permissions.canViewReports },
    { path: '/usuarios', icon: Users, label: 'Usuários', show: permissions.canManageUsers },
    { path: '/configuracoes', icon: Settings, label: 'Configurações', show: true },
  ];

  if (!user) {
    return <>{children}</>;
  }

  return (
    <div className="layout">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo">
            <Plane className="logo-icon" />
            <span className="logo-text">AeroGestão</span>
          </div>
          <button className="sidebar-close" onClick={() => setSidebarOpen(false)}>
            <X size={24} />
          </button>
        </div>

        {/* Aircraft Selector */}
        {aircrafts.length > 0 && (
          <div className="aircraft-selector">
            <button
              className="aircraft-selector-btn"
              onClick={() => setAircraftDropdownOpen(!aircraftDropdownOpen)}
            >
              <div className="aircraft-info">
                <span className="aircraft-prefix">{selectedAircraft?.prefixo || 'Selecionar'}</span>
                <span className="aircraft-model">{selectedAircraft?.modelo || 'aeronave'}</span>
              </div>
              <ChevronDown className={`chevron ${aircraftDropdownOpen ? 'open' : ''}`} />
            </button>
            {aircraftDropdownOpen && (
              <div className="aircraft-dropdown">
                {aircrafts.map((aircraft) => (
                  <button
                    key={aircraft.id}
                    className={`aircraft-option ${selectedAircraft?.id === aircraft.id ? 'active' : ''}`}
                    onClick={() => {
                      selectAircraft(aircraft.id);
                      setAircraftDropdownOpen(false);
                    }}
                  >
                    <span className="aircraft-prefix">{aircraft.prefixo}</span>
                    <span className="aircraft-model">{aircraft.modelo}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <nav className="sidebar-nav">
          {menuItems
            .filter((item) => item.show)
            .map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
        </nav>

      </aside>

      {/* Main Content */}
      <div className="main-wrapper">
        <header className="header">
          <button className="menu-toggle" onClick={() => setSidebarOpen(true)}>
            <Menu size={24} />
          </button>

          <div className="header-right">
            <button className="notification-btn">
              <Bell size={20} />
              <span className="notification-badge">3</span>
            </button>
          </div>
        </header>

        <main className="main-content">
          {children}
        </main>
      </div>

      {/* Overlay */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
    </div>
  );
}
