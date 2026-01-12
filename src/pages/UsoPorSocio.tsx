import { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Calendar,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  Download,
  Filter,
  BarChart3,
  PieChart,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
} from 'recharts';
import Card from '../components/Card';
import Button from '../components/Button';
import Select from '../components/Select';
import Input from '../components/Input';
import Table from '../components/Table';
import Badge from '../components/Badge';
import { useAuth } from '../contexts/AuthContext';
import { useAircraft } from '../contexts/AircraftContext';
import { storage } from '../services/storage';
import { UsageReport, MemberUsageStats } from '../types';
import { formatHours, formatCurrency, formatDate } from '../utils/format';
import './UsoPorSocio.css';

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f97316', '#14b8a6', '#84cc16', '#f59e0b', '#06b6d4'];

type PeriodType = 'mes_atual' | 'ultimos_30' | 'trimestral' | 'anual' | 'personalizado';

const periodOptions = [
  { value: 'mes_atual', label: 'Mês Atual' },
  { value: 'ultimos_30', label: 'Últimos 30 dias' },
  { value: 'trimestral', label: 'Trimestre Atual' },
  { value: 'anual', label: 'Ano Atual' },
  { value: 'personalizado', label: 'Personalizado' },
];

const getDatesForPeriod = (period: PeriodType): { start: string; end: string } => {
  const now = new Date();
  const end = now.toISOString().split('T')[0];
  let start: string;

  switch (period) {
    case 'mes_atual':
      start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      break;
    case 'ultimos_30':
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      break;
    case 'trimestral':
      const quarter = Math.floor(now.getMonth() / 3);
      start = new Date(now.getFullYear(), quarter * 3, 1).toISOString().split('T')[0];
      break;
    case 'anual':
      start = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
      break;
    default:
      start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  }

  return { start, end };
};

export default function UsoPorSocio() {
  const { user, permissions } = useAuth();
  const { selectedAircraft } = useAircraft();

  // Estados de filtro
  const [period, setPeriod] = useState<PeriodType>('mes_atual');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [excluirInstrucao, setExcluirInstrucao] = useState(false);
  const [excluirTeste, setExcluirTeste] = useState(false);
  const [excluirManutencao, setExcluirManutencao] = useState(true);

  // Estado do relatório
  const [report, setReport] = useState<UsageReport | null>(null);
  const [monthlyData, setMonthlyData] = useState<{ mes: string; horas: number; voos: number }[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  // Calcular datas baseado no período
  const { startDate, endDate } = useMemo(() => {
    if (period === 'personalizado') {
      return { startDate: customStartDate, endDate: customEndDate };
    }
    const dates = getDatesForPeriod(period);
    return { startDate: dates.start, endDate: dates.end };
  }, [period, customStartDate, customEndDate]);

  // Carregar relatório
  useEffect(() => {
    if (!selectedAircraft || !startDate || !endDate) return;

    const usageReport = storage.getMemberUsageReport(selectedAircraft.id, startDate, endDate, {
      excluirInstrucao,
      excluirTeste,
      excluirManutencao,
    });

    setReport(usageReport);

    // Carregar dados mensais para o primeiro membro
    if (usageReport.porMembro.length > 0) {
      const firstMemberId = usageReport.porMembro[0].memberId;
      setSelectedMemberId(firstMemberId);
      loadMonthlyData(firstMemberId);
    }
  }, [selectedAircraft, startDate, endDate, excluirInstrucao, excluirTeste, excluirManutencao]);

  const loadMonthlyData = (memberId: string) => {
    if (!selectedAircraft) return;
    const year = new Date().getFullYear();
    const data = storage.getMemberUsageByMonth(selectedAircraft.id, memberId, year);
    setMonthlyData(data);
  };

  const handleMemberSelect = (memberId: string) => {
    setSelectedMemberId(memberId);
    loadMonthlyData(memberId);
  };

  // Dados para gráfico de pizza
  const pieChartData = useMemo(() => {
    if (!report) return [];
    return report.porMembro
      .filter((m) => m.horasVoadas > 0)
      .map((m) => ({
        name: m.memberName,
        value: m.horasVoadas,
        percentual: m.percentualHoras,
      }));
  }, [report]);

  // Dados para gráfico de barras (comparativo com cota)
  const barChartData = useMemo(() => {
    if (!report) return [];
    return report.porMembro
      .filter((m) => m.cotaPercentual !== undefined)
      .map((m) => ({
        name: m.memberName,
        uso: m.percentualHoras,
        cota: m.cotaPercentual || 0,
        diferenca: m.diferencaUsoCota || 0,
      }));
  }, [report]);

  // Exportar para CSV
  const exportToCSV = () => {
    if (!report) return;

    const headers = [
      'Sócio',
      'Horas Voadas',
      '% do Total',
      'Nº de Voos',
      '% Cota',
      'Diferença',
      'Custo Total',
      'Custo/Hora',
    ];

    const rows = report.porMembro.map((m) => [
      m.memberName,
      m.horasVoadas.toFixed(2),
      m.percentualHoras.toFixed(1),
      m.numeroVoos,
      m.cotaPercentual?.toFixed(1) || '-',
      m.diferencaUsoCota?.toFixed(1) || '-',
      m.custoTotal?.toFixed(2) || '-',
      m.custoMedioPorHora?.toFixed(2) || '-',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `uso_por_socio_${startDate}_${endDate}.csv`;
    link.click();
  };

  // Renderizar indicador de tendência
  const getTrendIndicator = (diferenca: number | undefined) => {
    if (diferenca === undefined) return null;
    if (diferenca > 5) {
      return (
        <span className="trend-indicator up">
          <TrendingUp size={14} />+{diferenca.toFixed(1)}%
        </span>
      );
    } else if (diferenca < -5) {
      return (
        <span className="trend-indicator down">
          <TrendingDown size={14} />
          {diferenca.toFixed(1)}%
        </span>
      );
    }
    return (
      <span className="trend-indicator neutral">
        <Minus size={14} />
        {diferenca.toFixed(1)}%
      </span>
    );
  };

  if (!selectedAircraft) {
    return (
      <div className="empty-state">
        <Users size={64} className="empty-state-icon" />
        <h3>Selecione uma aeronave</h3>
        <p>Selecione uma aeronave no menu lateral para ver o relatório de uso.</p>
      </div>
    );
  }

  return (
    <div className="uso-por-socio-page">
      <div className="page-header">
        <div>
          <h1>Uso por Sócio</h1>
          <p className="page-subtitle">
            Análise de utilização da aeronave - {selectedAircraft.prefixo}
          </p>
        </div>
        <div className="header-actions">
          <Button variant="secondary" icon={<Download size={18} />} onClick={exportToCSV}>
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card className="filters-card">
        <div className="filters">
          <Filter size={18} className="filter-icon" />
          <Select
            options={periodOptions}
            value={period}
            onChange={(e) => setPeriod(e.target.value as PeriodType)}
          />
          {period === 'personalizado' && (
            <>
              <Input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                placeholder="Data inicial"
              />
              <Input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                placeholder="Data final"
              />
            </>
          )}
          <div className="filter-checkboxes">
            <label>
              <input
                type="checkbox"
                checked={excluirInstrucao}
                onChange={(e) => setExcluirInstrucao(e.target.checked)}
              />
              Excluir Instrução
            </label>
            <label>
              <input
                type="checkbox"
                checked={excluirTeste}
                onChange={(e) => setExcluirTeste(e.target.checked)}
              />
              Excluir Teste
            </label>
            <label>
              <input
                type="checkbox"
                checked={excluirManutencao}
                onChange={(e) => setExcluirManutencao(e.target.checked)}
              />
              Excluir Manutenção
            </label>
          </div>
        </div>
      </Card>

      {report && (
        <>
          {/* Cards de Resumo */}
          <div className="summary-cards">
            <Card className="summary-card">
              <div className="summary-icon">
                <Clock size={24} />
              </div>
              <div className="summary-info">
                <span className="summary-value">{formatHours(report.horasTotais)}</span>
                <span className="summary-label">Horas Totais</span>
              </div>
            </Card>
            <Card className="summary-card">
              <div className="summary-icon">
                <BarChart3 size={24} />
              </div>
              <div className="summary-info">
                <span className="summary-value">{report.voosTotais}</span>
                <span className="summary-label">Total de Voos</span>
              </div>
            </Card>
            <Card className="summary-card">
              <div className="summary-icon">
                <Users size={24} />
              </div>
              <div className="summary-info">
                <span className="summary-value">{report.porMembro.length}</span>
                <span className="summary-label">Sócios Ativos</span>
              </div>
            </Card>
            {report.custoTotal !== undefined && report.custoTotal > 0 && (
              <Card className="summary-card">
                <div className="summary-icon">
                  <TrendingUp size={24} />
                </div>
                <div className="summary-info">
                  <span className="summary-value">{formatCurrency(report.custoTotal)}</span>
                  <span className="summary-label">Custo Total</span>
                </div>
              </Card>
            )}
          </div>

          {/* Gráficos */}
          <div className="charts-row">
            {/* Gráfico de Pizza - Distribuição de Uso */}
            <Card title="Distribuição de Uso (%)" className="chart-card">
              {pieChartData.length === 0 ? (
                <div className="empty-chart">
                  <PieChart size={48} />
                  <p>Nenhum voo registrado no período</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percentual }) => `${name} (${percentual.toFixed(1)}%)`}
                      labelLine={false}
                    >
                      {pieChartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => [`${value.toFixed(2)}h`, 'Horas']}
                      contentStyle={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                      }}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
              )}
            </Card>

            {/* Gráfico de Barras - Comparativo Uso vs Cota */}
            {barChartData.length > 0 && (
              <Card title="Uso vs Cota Societária (%)" className="chart-card">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={barChartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                    <XAxis type="number" domain={[0, 100]} stroke="var(--text-muted)" />
                    <YAxis type="category" dataKey="name" stroke="var(--text-muted)" width={100} />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                      }}
                      formatter={(value: number, name: string) => [
                        `${value.toFixed(1)}%`,
                        name === 'uso' ? '% Uso' : '% Cota',
                      ]}
                    />
                    <Legend />
                    <Bar dataKey="cota" name="Cota" fill="var(--text-muted)" opacity={0.5} />
                    <Bar dataKey="uso" name="Uso" fill="var(--accent-color)" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            )}
          </div>

          {/* Evolução Mensal do Membro Selecionado */}
          {selectedMemberId && monthlyData.length > 0 && (
            <Card
              title={`Evolução Mensal - ${report.porMembro.find((m) => m.memberId === selectedMemberId)?.memberName || ''}`}
              className="monthly-chart"
            >
              <div className="member-selector">
                <Select
                  options={report.porMembro.map((m) => ({
                    value: m.memberId,
                    label: m.memberName,
                  }))}
                  value={selectedMemberId}
                  onChange={(e) => handleMemberSelect(e.target.value)}
                />
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis
                    dataKey="mes"
                    stroke="var(--text-muted)"
                    tickFormatter={(value) => {
                      const [year, month] = value.split('-');
                      return `${month}/${year.slice(2)}`;
                    }}
                  />
                  <YAxis stroke="var(--text-muted)" />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                    }}
                    formatter={(value: number, name: string) => [
                      name === 'horas' ? `${value.toFixed(2)}h` : value,
                      name === 'horas' ? 'Horas' : 'Voos',
                    ]}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="horas" name="Horas" stroke="var(--accent-color)" strokeWidth={2} />
                  <Line type="monotone" dataKey="voos" name="Voos" stroke="var(--info-color)" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* Tabela de Uso por Sócio */}
          <Card title="Detalhamento por Sócio">
            <Table
              columns={[
                { key: 'memberName', header: 'Sócio', render: (m) => m.memberName },
                {
                  key: 'memberRole',
                  header: 'Perfil',
                  render: (m) => (
                    <Badge
                      variant={
                        m.memberRole === 'admin'
                          ? 'info'
                          : m.memberRole === 'piloto'
                            ? 'success'
                            : 'default'
                      }
                    >
                      {m.memberRole === 'admin'
                        ? 'Admin'
                        : m.memberRole === 'gestor'
                          ? 'Gestor'
                          : m.memberRole === 'piloto'
                            ? 'Piloto'
                            : 'Cotista'}
                    </Badge>
                  ),
                },
                {
                  key: 'horasVoadas',
                  header: 'Horas',
                  render: (m) => formatHours(m.horasVoadas),
                },
                {
                  key: 'percentualHoras',
                  header: '% do Total',
                  render: (m) => (
                    <div className="percentage-cell">
                      <div
                        className="percentage-bar"
                        style={{
                          width: `${Math.min(m.percentualHoras, 100)}%`,
                          background: COLORS[report!.porMembro.indexOf(m) % COLORS.length],
                        }}
                      />
                      <span>{m.percentualHoras.toFixed(1)}%</span>
                    </div>
                  ),
                },
                { key: 'numeroVoos', header: 'Voos', render: (m) => m.numeroVoos },
                {
                  key: 'cotaPercentual',
                  header: '% Cota',
                  render: (m) => (m.cotaPercentual !== undefined ? `${m.cotaPercentual.toFixed(1)}%` : '-'),
                },
                {
                  key: 'diferencaUsoCota',
                  header: 'Diferença',
                  render: (m) => getTrendIndicator(m.diferencaUsoCota),
                },
                {
                  key: 'custoTotal',
                  header: 'Custo Total',
                  render: (m) => (m.custoTotal ? formatCurrency(m.custoTotal) : '-'),
                },
                {
                  key: 'custoMedioPorHora',
                  header: 'Custo/Hora',
                  render: (m) => (m.custoMedioPorHora ? formatCurrency(m.custoMedioPorHora) : '-'),
                },
              ]}
              data={report.porMembro}
              keyExtractor={(m) => m.memberId}
              emptyMessage="Nenhum dado disponível para o período selecionado"
            />
          </Card>

          {/* Rodapé com período */}
          <div className="report-footer">
            <span>
              Período: {formatDate(startDate)} a {formatDate(endDate)}
            </span>
            {report.filtros && (
              <span className="filters-applied">
                Filtros:
                {report.filtros.excluirInstrucao && ' -Instrução'}
                {report.filtros.excluirTeste && ' -Teste'}
                {report.filtros.excluirManutencao && ' -Manutenção'}
              </span>
            )}
          </div>
        </>
      )}

      {!report && (
        <div className="empty-state">
          <Calendar size={48} />
          <h3>Selecione um período</h3>
          <p>Escolha um período para visualizar o relatório de uso.</p>
        </div>
      )}
    </div>
  );
}
