import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Clock,
  Calendar,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  FileText,
  Wrench,
  Navigation,
  ArrowRight,
  Plane,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import Card from '../components/Card';
import Button from '../components/Button';
import Badge from '../components/Badge';
import { useAuth } from '../contexts/AuthContext';
import { useAircraft } from '../contexts/AircraftContext';
import { storage } from '../services/storage';
import { formatCurrency, formatHours, formatDate, getDaysUntil, getMaintenanceTypeLabel } from '../utils/format';
import { MaintenanceSchedule, Alert, Flight, Expense } from '../types';
import './Dashboard.css';

interface DashboardData {
  horasTotais: number;
  totalVoos: number;
  custosAno: number;
  custoPorHora: number;
  proximasManutencoes: MaintenanceSchedule[];
  alertas: Alert[];
  ultimosVoos: Flight[];
  custosMensais: { month: string; value: number }[];
  horasMensais: { month: string; value: number }[];
  distribuicaoCustos: { name: string; value: number; color: string }[];
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#3b82f6'];

export default function Dashboard() {
  const { user } = useAuth();
  const { selectedAircraft, aircrafts } = useAircraft();
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    if (!selectedAircraft) return;

    const loadDashboardData = () => {
      const flights = storage.getFlights(selectedAircraft.id);
      const expenses = storage.getExpenses(selectedAircraft.id);
      const schedules = storage.getMaintenanceSchedules(selectedAircraft.id);
      
      // Gerar alertas
      storage.generateAlerts(selectedAircraft.id);
      const alerts = storage.getAlerts(selectedAircraft.id).filter(a => !a.dispensado);

      // Calcular estatísticas
      const horasTotais = selectedAircraft.horasCelula;
      const totalVoos = flights.length;

      // Custos do ano atual
      const anoAtual = new Date().getFullYear();
      const custosAno = expenses
        .filter(e => new Date(e.data).getFullYear() === anoAtual)
        .reduce((sum, e) => sum + e.valor, 0);

      // Custo por hora
      const horasVoadas = flights.reduce((sum, f) => sum + f.tempoVoo, 0);
      const custoTotalVoos = expenses.reduce((sum, e) => sum + e.valor, 0);
      const custoPorHora = horasVoadas > 0 ? custoTotalVoos / horasVoadas : 0;

      // Próximas manutenções
      const proximasManutencoes = schedules
        .filter(s => s.ativo)
        .sort((a, b) => {
          const diasA = a.proximaData ? getDaysUntil(a.proximaData) : Infinity;
          const diasB = b.proximaData ? getDaysUntil(b.proximaData) : Infinity;
          return diasA - diasB;
        })
        .slice(0, 5);

      // Últimos voos
      const ultimosVoos = [...flights]
        .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
        .slice(0, 5);

      // Custos mensais (últimos 6 meses)
      const custosMensais = getLast6MonthsData(expenses, 'valor');
      
      // Horas mensais (últimos 6 meses)
      const horasMensais = getLast6MonthsData(flights, 'tempoVoo');

      // Distribuição de custos
      const distribuicaoCustos = getExpenseDistribution(expenses);

      setData({
        horasTotais,
        totalVoos,
        custosAno,
        custoPorHora,
        proximasManutencoes,
        alertas: alerts,
        ultimosVoos,
        custosMensais,
        horasMensais,
        distribuicaoCustos,
      });
    };

    loadDashboardData();
    const interval = setInterval(loadDashboardData, 5000);
    return () => clearInterval(interval);
  }, [selectedAircraft]);

  if (!selectedAircraft) {
    return (
      <div className="dashboard-empty">
        <div className="empty-icon-wrapper">
          <Plane size={64} />
        </div>
        <h2>Bem-vindo ao AeroGestão, {user?.nome?.split(' ')[0]}!</h2>
        <p>
          {aircrafts.length === 0
            ? 'Para começar, cadastre sua primeira aeronave.'
            : 'Selecione uma aeronave no menu lateral para visualizar o dashboard.'}
        </p>
        {aircrafts.length === 0 && (
          <Link to="/aeronaves">
            <Button size="lg">Cadastrar Aeronave</Button>
          </Link>
        )}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="loading">
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="page-subtitle">
            {selectedAircraft.prefixo} • {selectedAircraft.modelo}
          </p>
        </div>
        <Link to="/estimativa">
          <Button icon={<Navigation size={18} />}>Nova Estimativa</Button>
        </Link>
      </div>

      {/* Alertas */}
      {data.alertas.length > 0 && (
        <div className="alerts-section">
          {data.alertas.slice(0, 3).map((alert) => (
            <div
              key={alert.id}
              className={`alert-banner alert-${alert.severity}`}
            >
              <AlertTriangle size={20} />
              <div className="alert-content">
                <strong>{alert.titulo}</strong>
                <span>{alert.mensagem}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cards de estatísticas */}
      <div className="stat-cards">
        <Card className="stat-card">
          <div className="stat-icon stat-icon-blue">
            <Clock size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{formatHours(data.horasTotais)}</span>
            <span className="stat-label">Horas Totais</span>
          </div>
        </Card>

        <Card className="stat-card">
          <div className="stat-icon stat-icon-green">
            <Calendar size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{data.totalVoos}</span>
            <span className="stat-label">Voos Registrados</span>
          </div>
        </Card>

        <Card className="stat-card">
          <div className="stat-icon stat-icon-orange">
            <DollarSign size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{formatCurrency(data.custosAno)}</span>
            <span className="stat-label">Custos {new Date().getFullYear()}</span>
          </div>
        </Card>

        <Card className="stat-card">
          <div className="stat-icon stat-icon-purple">
            <TrendingUp size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{formatCurrency(data.custoPorHora)}</span>
            <span className="stat-label">Custo/Hora</span>
          </div>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="charts-row">
        <Card title="Custos Mensais">
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.custosMensais}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={12} />
                <YAxis stroke="var(--text-muted)" fontSize={12} tickFormatter={(v) => `R$${v/1000}k`} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [formatCurrency(value), 'Valor']}
                />
                <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Horas de Voo">
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={data.horasMensais}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={12} />
                <YAxis stroke="var(--text-muted)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [formatHours(value), 'Horas']}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ fill: '#10b981', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Cards inferiores */}
      <div className="bottom-grid">
        {/* Distribuição de Custos */}
        <Card title="Distribuição de Custos">
          <div className="chart-container">
            {data.distribuicaoCustos.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={data.distribuicaoCustos}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {data.distribuicaoCustos.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-chart">
                <p>Nenhum custo registrado</p>
              </div>
            )}
            <div className="chart-legend">
              {data.distribuicaoCustos.map((item, index) => (
                <div key={index} className="legend-item">
                  <span className="legend-color" style={{ background: item.color }} />
                  <span className="legend-label">{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Próximas Manutenções */}
        <Card
          title="Próximas Manutenções"
          action={
            <Link to="/manutencao">
              <Button variant="ghost" size="sm">
                Ver todas <ArrowRight size={16} />
              </Button>
            </Link>
          }
        >
          <div className="maintenance-list">
            {data.proximasManutencoes.length > 0 ? (
              data.proximasManutencoes.map((m) => {
                const diasRestantes = m.proximaData ? getDaysUntil(m.proximaData) : null;
                const horasRestantes = m.proximasHoras
                  ? m.proximasHoras - selectedAircraft.horasCelula
                  : null;
                const isUrgent =
                  (diasRestantes !== null && diasRestantes <= 15) ||
                  (horasRestantes !== null && horasRestantes <= 10);

                return (
                  <div key={m.id} className="maintenance-item">
                    <div className="maintenance-icon">
                      <Wrench size={18} />
                    </div>
                    <div className="maintenance-info">
                      <span className="maintenance-name">{m.nome}</span>
                      <span className="maintenance-type">
                        {getMaintenanceTypeLabel(m.tipo)}
                      </span>
                    </div>
                    <div className="maintenance-status">
                      {diasRestantes !== null && (
                        <Badge variant={isUrgent ? 'danger' : 'default'}>
                          {diasRestantes <= 0 ? 'Vencida' : `${diasRestantes}d`}
                        </Badge>
                      )}
                      {horasRestantes !== null && (
                        <Badge variant={isUrgent ? 'warning' : 'default'}>
                          {horasRestantes <= 0 ? 'Vencida' : `${horasRestantes.toFixed(0)}h`}
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="empty-list">
                <p>Nenhuma manutenção programada</p>
              </div>
            )}
          </div>
        </Card>

        {/* Últimos Voos */}
        <Card
          title="Últimos Voos"
          action={
            <Link to="/logbook">
              <Button variant="ghost" size="sm">
                Ver todos <ArrowRight size={16} />
              </Button>
            </Link>
          }
        >
          <div className="flights-list">
            {data.ultimosVoos.length > 0 ? (
              data.ultimosVoos.map((voo) => (
                <div key={voo.id} className="flight-item">
                  <div className="flight-route">
                    <span className="flight-origin">{voo.origem}</span>
                    <ArrowRight size={14} className="flight-arrow" />
                    <span className="flight-destination">{voo.destino}</span>
                  </div>
                  <div className="flight-details">
                    <span className="flight-date">{formatDate(voo.data)}</span>
                    <Badge>{formatHours(voo.tempoVoo)}</Badge>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-list">
                <p>Nenhum voo registrado</p>
              </div>
            )}
          </div>
        </Card>

        {/* Documentos */}
        <Card
          title="Documentos"
          action={
            <Link to="/documentos">
              <Button variant="ghost" size="sm">
                Ver todos <ArrowRight size={16} />
              </Button>
            </Link>
          }
        >
          <div className="docs-summary">
            {(() => {
              const docs = storage.getDocuments(selectedAircraft.id);
              const vencidos = docs.filter(d => d.dataValidade && getDaysUntil(d.dataValidade) <= 0).length;
              const proximos = docs.filter(d => d.dataValidade && getDaysUntil(d.dataValidade) > 0 && getDaysUntil(d.dataValidade) <= 30).length;
              const ok = docs.filter(d => !d.dataValidade || getDaysUntil(d.dataValidade) > 30).length;

              return (
                <>
                  <div className="doc-stat">
                    <div className="doc-stat-icon doc-stat-danger">
                      <FileText size={18} />
                    </div>
                    <div className="doc-stat-info">
                      <span className="doc-stat-value">{vencidos}</span>
                      <span className="doc-stat-label">Vencidos</span>
                    </div>
                  </div>
                  <div className="doc-stat">
                    <div className="doc-stat-icon doc-stat-warning">
                      <FileText size={18} />
                    </div>
                    <div className="doc-stat-info">
                      <span className="doc-stat-value">{proximos}</span>
                      <span className="doc-stat-label">Próximos</span>
                    </div>
                  </div>
                  <div className="doc-stat">
                    <div className="doc-stat-icon doc-stat-success">
                      <FileText size={18} />
                    </div>
                    <div className="doc-stat-info">
                      <span className="doc-stat-value">{ok}</span>
                      <span className="doc-stat-label">OK</span>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </Card>
      </div>
    </div>
  );
}

// Funções auxiliares
function getLast6MonthsData(items: (Flight | Expense)[], field: 'tempoVoo' | 'valor') {
  const months: { month: string; value: number }[] = [];
  const now = new Date();

  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = date.toLocaleString('pt-BR', { month: 'short' });
    const year = date.getFullYear();
    const month = date.getMonth();

    const value = items
      .filter((item) => {
        const itemDate = new Date('data' in item ? item.data : '');
        return itemDate.getFullYear() === year && itemDate.getMonth() === month;
      })
      .reduce((sum, item) => sum + ((item as Record<string, number>)[field] || 0), 0);

    months.push({ month: monthKey, value });
  }

  return months;
}

function getExpenseDistribution(expenses: Expense[]) {
  const categories: Record<string, number> = {};
  const categoryColors: Record<string, string> = {
    combustivel: '#f59e0b',
    manutencao: '#6366f1',
    hangaragem: '#8b5cf6',
    seguro: '#10b981',
    taxas: '#3b82f6',
    pecas: '#ef4444',
    outros: '#64748b',
  };

  const categoryLabels: Record<string, string> = {
    combustivel: 'Combustível',
    manutencao: 'Manutenção',
    hangaragem: 'Hangaragem',
    seguro: 'Seguro',
    taxas: 'Taxas',
    pecas: 'Peças',
    outros: 'Outros',
  };

  expenses.forEach((e) => {
    categories[e.categoria] = (categories[e.categoria] || 0) + e.valor;
  });

  return Object.entries(categories)
    .filter(([, value]) => value > 0)
    .map(([key, value], index) => ({
      name: categoryLabels[key] || key,
      value,
      color: categoryColors[key] || COLORS[index % COLORS.length],
    }));
}
