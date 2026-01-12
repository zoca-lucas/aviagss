import { useState, useEffect } from 'react';
import { Download, BarChart3, PieChart as PieChartIcon, TrendingUp, FileText } from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import Card from '../components/Card';
import Button from '../components/Button';
import Select from '../components/Select';
import Input from '../components/Input';
import { useAircraft } from '../contexts/AircraftContext';
import { storage } from '../services/storage';
import { formatCurrency, formatHours, formatDate, getExpenseCategoryLabel } from '../utils/format';
import { Flight, Expense, MaintenanceEvent, User } from '../types';
import './Relatorios.css';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#3b82f6', '#64748b'];

export default function Relatorios() {
  const { selectedAircraft } = useAircraft();
  const [reportType, setReportType] = useState<'logbook' | 'financeiro' | 'manutencao'>('logbook');
  const [dateStart, setDateStart] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 6);
    return d.toISOString().split('T')[0];
  });
  const [dateEnd, setDateEnd] = useState(new Date().toISOString().split('T')[0]);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [maintenances, setMaintenances] = useState<MaintenanceEvent[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    if (selectedAircraft) {
      loadData();
    }
    setUsers(storage.getUsers());
  }, [selectedAircraft, dateStart, dateEnd]);

  const loadData = () => {
    if (!selectedAircraft) return;

    const allFlights = storage.getFlights(selectedAircraft.id);
    const allExpenses = storage.getExpenses(selectedAircraft.id);
    const allMaintenances = storage.getMaintenanceEvents(selectedAircraft.id);

    // Filtrar por data
    const filterByDate = <T extends { data: string }>(items: T[]) =>
      items.filter(item => item.data >= dateStart && item.data <= dateEnd);

    setFlights(filterByDate(allFlights));
    setExpenses(filterByDate(allExpenses));
    setMaintenances(filterByDate(allMaintenances));
  };

  const exportCSV = () => {
    let headers: string[] = [];
    let rows: string[][] = [];

    if (reportType === 'logbook') {
      headers = ['Data', 'Origem', 'Destino', 'Piloto', 'Tempo de Voo', 'Horas Motor', 'Ciclos'];
      rows = flights.map(f => {
        const pilot = users.find(u => u.id === f.pilotoId);
        return [
          formatDate(f.data),
          f.origem,
          f.destino,
          pilot?.nome || '-',
          formatHours(f.tempoVoo),
          formatHours(f.horasMotor),
          f.ciclos.toString(),
        ];
      });
    } else if (reportType === 'financeiro') {
      headers = ['Data', 'Categoria', 'Descrição', 'Tipo', 'Valor'];
      rows = expenses.map(e => [
        formatDate(e.data),
        getExpenseCategoryLabel(e.categoria),
        e.descricao,
        e.tipo === 'fixo' ? 'Fixo' : 'Variável',
        formatCurrency(e.valor),
      ]);
    } else {
      headers = ['Data', 'Tipo', 'Descrição', 'Horas', 'Custo', 'Oficina'];
      rows = maintenances.map(m => [
        formatDate(m.data),
        m.tipo,
        m.descricao,
        formatHours(m.horasAeronave),
        formatCurrency(m.custo),
        m.oficina || '-',
      ]);
    }

    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio_${reportType}_${selectedAircraft?.prefixo}_${dateStart}_${dateEnd}.csv`;
    a.click();
  };

  // Dados para gráficos
  const getMonthlyData = () => {
    const data: Record<string, { month: string; horas: number; custos: number; voos: number }> = {};

    flights.forEach(f => {
      const month = f.data.substring(0, 7);
      if (!data[month]) {
        data[month] = { month, horas: 0, custos: 0, voos: 0 };
      }
      data[month].horas += f.tempoVoo;
      data[month].voos += 1;
    });

    expenses.forEach(e => {
      const month = e.data.substring(0, 7);
      if (!data[month]) {
        data[month] = { month, horas: 0, custos: 0, voos: 0 };
      }
      data[month].custos += e.valor;
    });

    return Object.values(data).sort((a, b) => a.month.localeCompare(b.month));
  };

  const getExpensesByCategory = () => {
    const data: Record<string, number> = {};
    expenses.forEach(e => {
      data[e.categoria] = (data[e.categoria] || 0) + e.valor;
    });
    return Object.entries(data).map(([key, value], index) => ({
      name: getExpenseCategoryLabel(key),
      value,
      color: COLORS[index % COLORS.length],
    }));
  };

  const getPilotHours = () => {
    const data: Record<string, number> = {};
    flights.forEach(f => {
      const pilot = users.find(u => u.id === f.pilotoId);
      const name = pilot?.nome || 'Desconhecido';
      data[name] = (data[name] || 0) + f.tempoVoo;
    });
    return Object.entries(data).map(([name, horas]) => ({ name, horas }));
  };

  const monthlyData = getMonthlyData();
  const expensesByCategory = getExpensesByCategory();
  const pilotHours = getPilotHours();

  // Totais
  const totalHoras = flights.reduce((sum, f) => sum + f.tempoVoo, 0);
  const totalVoos = flights.length;
  const totalCustos = expenses.reduce((sum, e) => sum + e.valor, 0);
  const totalManutencoes = maintenances.reduce((sum, m) => sum + m.custo, 0);

  if (!selectedAircraft) {
    return (
      <div className="empty-state">
        <BarChart3 size={64} className="empty-state-icon" />
        <h3>Selecione uma aeronave</h3>
        <p>Selecione uma aeronave no menu lateral para visualizar relatórios.</p>
      </div>
    );
  }

  return (
    <div className="relatorios-page">
      <div className="page-header">
        <div>
          <h1>Relatórios</h1>
          <p className="page-subtitle">Análises e exportações - {selectedAircraft.prefixo}</p>
        </div>
        <Button icon={<Download size={18} />} onClick={exportCSV}>
          Exportar CSV
        </Button>
      </div>

      {/* Filtros */}
      <Card className="filters-card">
        <div className="filters">
          <Select
            label="Tipo de Relatório"
            options={[
              { value: 'logbook', label: 'Logbook' },
              { value: 'financeiro', label: 'Financeiro' },
              { value: 'manutencao', label: 'Manutenção' },
            ]}
            value={reportType}
            onChange={(e) => setReportType(e.target.value as typeof reportType)}
          />
          <Input
            label="Data Inicial"
            type="date"
            value={dateStart}
            onChange={(e) => setDateStart(e.target.value)}
          />
          <Input
            label="Data Final"
            type="date"
            value={dateEnd}
            onChange={(e) => setDateEnd(e.target.value)}
          />
        </div>
      </Card>

      {/* Resumo */}
      <div className="summary-cards">
        <Card className="summary-card">
          <div className="summary-icon blue"><FileText size={24} /></div>
          <div className="summary-info">
            <span className="summary-value">{totalVoos}</span>
            <span className="summary-label">Voos</span>
          </div>
        </Card>
        <Card className="summary-card">
          <div className="summary-icon green"><TrendingUp size={24} /></div>
          <div className="summary-info">
            <span className="summary-value">{formatHours(totalHoras)}</span>
            <span className="summary-label">Horas</span>
          </div>
        </Card>
        <Card className="summary-card">
          <div className="summary-icon orange"><BarChart3 size={24} /></div>
          <div className="summary-info">
            <span className="summary-value">{formatCurrency(totalCustos)}</span>
            <span className="summary-label">Despesas</span>
          </div>
        </Card>
        <Card className="summary-card">
          <div className="summary-icon purple"><PieChartIcon size={24} /></div>
          <div className="summary-info">
            <span className="summary-value">{formatCurrency(totalManutencoes)}</span>
            <span className="summary-label">Manutenções</span>
          </div>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="charts-grid">
        <Card title="Evolução Mensal">
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={12} />
                <YAxis yAxisId="left" stroke="var(--text-muted)" fontSize={12} />
                <YAxis yAxisId="right" orientation="right" stroke="var(--text-muted)" fontSize={12} />
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px' }} />
                <Legend />
                <Bar yAxisId="left" dataKey="horas" fill="#6366f1" name="Horas" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="voos" fill="#10b981" name="Voos" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Custos por Categoria">
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={expensesByCategory}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {expensesByCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Horas por Piloto">
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={pilotHours} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis type="number" stroke="var(--text-muted)" fontSize={12} />
                <YAxis dataKey="name" type="category" stroke="var(--text-muted)" fontSize={12} width={100} />
                <Tooltip formatter={(value: number) => formatHours(value)} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px' }} />
                <Bar dataKey="horas" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Custos ao Longo do Tempo">
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={12} />
                <YAxis stroke="var(--text-muted)" fontSize={12} tickFormatter={(v) => `R$${v/1000}k`} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px' }} />
                <Line type="monotone" dataKey="custos" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b' }} name="Custos" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
