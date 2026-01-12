import { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  Download,
  Filter,
  Plane,
  TrendingUp,
  DollarSign,
  Clock,
  Fuel,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import Select from '../components/Select';
import { useAuth } from '../contexts/AuthContext';
import { useAircraft } from '../contexts/AircraftContext';
import { storage } from '../services/storage';
import { FlightEntry, TBOProvision } from '../types';
import { formatCurrency } from '../utils/format';
import './RelatoriosLancamentos.css';

const grupoOptions = [
  { value: '', label: 'Todos os grupos' },
  { value: 'grossi', label: 'Grossi' },
  { value: 'shimada', label: 'Shimada' },
  { value: 'grossi_shimada', label: 'Grossi e Shimada' },
  { value: 'outros', label: 'Outros' },
];

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#a855f7', '#ef4444', '#06b6d4'];

export default function RelatoriosLancamentos() {
  const { selectedAircraft } = useAircraft();
  const [entries, setEntries] = useState<FlightEntry[]>([]);
  const [tboProvision, setTboProvision] = useState<TBOProvision | null>(null);
  
  // Filtros
  const [filterGrupo, setFilterGrupo] = useState('');
  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');

  useEffect(() => {
    if (selectedAircraft) {
      loadData();
    }
  }, [selectedAircraft]);

  const loadData = () => {
    if (!selectedAircraft) return;
    const loadedEntries = storage.getFlightEntries(selectedAircraft.id);
    setEntries(loadedEntries);
    
    const provision = storage.getTBOProvision(selectedAircraft.id);
    setTboProvision(provision || null);
  };

  // Filtrar dados
  const filteredEntries = useMemo(() => {
    let result = [...entries];

    if (filterGrupo) {
      result = result.filter(e => e.grupo === filterGrupo);
    }
    if (filterDateStart) {
      result = result.filter(e => e.data >= filterDateStart);
    }
    if (filterDateEnd) {
      result = result.filter(e => e.data <= filterDateEnd);
    }

    return result;
  }, [entries, filterGrupo, filterDateStart, filterDateEnd]);

  // Dados por Grupo
  const dadosPorGrupo = useMemo(() => {
    const grupos = {
      grossi: { nome: 'Grossi', voos: 0, horas: 0, custos: 0, tbo: 0 },
      shimada: { nome: 'Shimada', voos: 0, horas: 0, custos: 0, tbo: 0 },
      grossi_shimada: { nome: 'Grossi e Shimada', voos: 0, horas: 0, custos: 0, tbo: 0 },
      outros: { nome: 'Outros', voos: 0, horas: 0, custos: 0, tbo: 0 },
    };

    filteredEntries.forEach(e => {
      const g = grupos[e.grupo];
      g.voos++;
      g.horas += e.tempoVoo / 60;
      g.custos += e.total;
      g.tbo += e.provisaoTboGrossi + e.provisaoTboShimada;
    });

    return Object.values(grupos).filter(g => g.voos > 0);
  }, [filteredEntries]);

  // Dados por Mês
  const dadosPorMes = useMemo(() => {
    const meses: Record<string, { mes: string; voos: number; horas: number; custos: number }> = {};

    filteredEntries.forEach(e => {
      const mes = e.data.substring(0, 7);
      if (!meses[mes]) {
        meses[mes] = { mes, voos: 0, horas: 0, custos: 0 };
      }
      meses[mes].voos++;
      meses[mes].horas += e.tempoVoo / 60;
      meses[mes].custos += e.total;
    });

    return Object.values(meses).sort((a, b) => a.mes.localeCompare(b.mes));
  }, [filteredEntries]);

  // Dados por Tipo de Custo
  const dadosPorTipoCusto = useMemo(() => {
    const custos = {
      combustivel: 0,
      hangar: 0,
      alimentacao: 0,
      hospedagem: 0,
      limpeza: 0,
      uberTaxi: 0,
      tarifas: 0,
      outras: 0,
      tbo: 0,
    };

    filteredEntries.forEach(e => {
      custos.combustivel += e.valorCombustivel;
      custos.hangar += e.hangar;
      custos.alimentacao += e.alimentacao;
      custos.hospedagem += e.hospedagem;
      custos.limpeza += e.limpeza;
      custos.uberTaxi += e.uberTaxi;
      custos.tarifas += e.tarifas;
      custos.outras += e.outras;
      custos.tbo += e.provisaoTboGrossi + e.provisaoTboShimada;
    });

    return [
      { name: 'Combustível', value: custos.combustivel, color: '#f59e0b' },
      { name: 'TBO', value: custos.tbo, color: '#a855f7' },
      { name: 'Hangar', value: custos.hangar, color: '#3b82f6' },
      { name: 'Alimentação', value: custos.alimentacao, color: '#22c55e' },
      { name: 'Hospedagem', value: custos.hospedagem, color: '#06b6d4' },
      { name: 'Tarifas', value: custos.tarifas, color: '#ef4444' },
      { name: 'Limpeza', value: custos.limpeza, color: '#ec4899' },
      { name: 'Uber/Taxi', value: custos.uberTaxi, color: '#8b5cf6' },
      { name: 'Outras', value: custos.outras, color: '#6b7280' },
    ].filter(c => c.value > 0);
  }, [filteredEntries]);

  // Totais gerais
  const totais = useMemo(() => {
    const totalHoras = filteredEntries.reduce((sum, e) => sum + e.tempoVoo, 0) / 60;
    const totalCustos = filteredEntries.reduce((sum, e) => sum + e.total, 0);
    const totalCombustivel = filteredEntries.reduce((sum, e) => sum + e.combustivelConsumido, 0);
    const totalTboGrossi = filteredEntries.reduce((sum, e) => sum + e.provisaoTboGrossi, 0);
    const totalTboShimada = filteredEntries.reduce((sum, e) => sum + e.provisaoTboShimada, 0);

    return {
      voos: filteredEntries.length,
      horas: totalHoras,
      custos: totalCustos,
      combustivelLbs: totalCombustivel,
      custoHora: totalHoras > 0 ? totalCustos / totalHoras : 0,
      tboGrossi: totalTboGrossi,
      tboShimada: totalTboShimada,
      tboTotal: totalTboGrossi + totalTboShimada,
    };
  }, [filteredEntries]);

  // Top Rotas
  const topRotas = useMemo(() => {
    const rotas: Record<string, { rota: string; voos: number; horas: number; custos: number }> = {};

    filteredEntries.forEach(e => {
      const rota = `${e.origem} → ${e.destino}`;
      if (!rotas[rota]) {
        rotas[rota] = { rota, voos: 0, horas: 0, custos: 0 };
      }
      rotas[rota].voos++;
      rotas[rota].horas += e.tempoVoo / 60;
      rotas[rota].custos += e.total;
    });

    return Object.values(rotas)
      .sort((a, b) => b.voos - a.voos)
      .slice(0, 10);
  }, [filteredEntries]);

  const handleExportPDF = () => {
    // TODO: Implementar exportação PDF
    alert('Exportação PDF será implementada em breve');
  };

  if (!selectedAircraft) {
    return (
      <div className="empty-state">
        <Plane size={64} className="empty-state-icon" />
        <h3>Selecione uma aeronave</h3>
        <p>Selecione uma aeronave no menu lateral para visualizar os relatórios.</p>
      </div>
    );
  }

  return (
    <div className="relatorios-lancamentos-page">
      <div className="page-header">
        <div>
          <h1>Relatórios de Lançamentos</h1>
          <p className="page-subtitle">
            Análise detalhada - {selectedAircraft.prefixo}
          </p>
        </div>
        <div className="header-actions">
          <Button variant="secondary" icon={<Download size={18} />} onClick={handleExportPDF}>
            Exportar PDF
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card className="filters-card">
        <div className="filters-header">
          <div className="filters-title">
            <Filter size={18} />
            <span>Filtros</span>
          </div>
        </div>
        <div className="filters-row">
          <Select
            options={grupoOptions}
            value={filterGrupo}
            onChange={(e) => setFilterGrupo(e.target.value)}
          />
          <Input
            type="date"
            value={filterDateStart}
            onChange={(e) => setFilterDateStart(e.target.value)}
            placeholder="Data inicial"
          />
          <Input
            type="date"
            value={filterDateEnd}
            onChange={(e) => setFilterDateEnd(e.target.value)}
            placeholder="Data final"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFilterGrupo('');
              setFilterDateStart('');
              setFilterDateEnd('');
            }}
          >
            Limpar
          </Button>
        </div>
      </Card>

      {/* Cards de Resumo */}
      <div className="summary-grid">
        <Card className="stat-card">
          <div className="stat-icon blue">
            <Plane size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{totais.voos}</span>
            <span className="stat-label">Voos</span>
          </div>
        </Card>
        <Card className="stat-card">
          <div className="stat-icon green">
            <Clock size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{totais.horas.toFixed(1)}h</span>
            <span className="stat-label">Horas Totais</span>
          </div>
        </Card>
        <Card className="stat-card">
          <div className="stat-icon yellow">
            <Fuel size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{totais.combustivelLbs.toLocaleString()} lbs</span>
            <span className="stat-label">Combustível</span>
          </div>
        </Card>
        <Card className="stat-card">
          <div className="stat-icon purple">
            <DollarSign size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{formatCurrency(totais.custos)}</span>
            <span className="stat-label">Custo Total</span>
          </div>
        </Card>
        <Card className="stat-card">
          <div className="stat-icon red">
            <TrendingUp size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{formatCurrency(totais.custoHora)}</span>
            <span className="stat-label">Custo/Hora</span>
          </div>
        </Card>
      </div>

      {/* Provisão TBO */}
      <Card className="tbo-card">
        <h3>Provisão TBO Acumulada</h3>
        <div className="tbo-grid">
          <div className="tbo-item grossi">
            <span className="tbo-label">TBO Grossi</span>
            <span className="tbo-value">{formatCurrency(totais.tboGrossi)}</span>
          </div>
          <div className="tbo-item shimada">
            <span className="tbo-label">TBO Shimada</span>
            <span className="tbo-value">{formatCurrency(totais.tboShimada)}</span>
          </div>
          <div className="tbo-item total">
            <span className="tbo-label">Total Provisionado</span>
            <span className="tbo-value">{formatCurrency(totais.tboTotal)}</span>
          </div>
          {tboProvision && (
            <>
              <div className="tbo-item">
                <span className="tbo-label">Horas Acumuladas</span>
                <span className="tbo-value">{tboProvision.horasAcumuladas.toFixed(1)}h</span>
              </div>
              <div className="tbo-item">
                <span className="tbo-label">Valor/Hora</span>
                <span className="tbo-value">{formatCurrency(tboProvision.valorPorHora)}</span>
              </div>
            </>
          )}
        </div>
      </Card>

      {/* Gráficos */}
      <div className="charts-grid">
        {/* Por Grupo */}
        <Card>
          <h3>Custos por Grupo</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dadosPorGrupo}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="nome" stroke="var(--text-secondary)" fontSize={12} />
                <YAxis stroke="var(--text-secondary)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend />
                <Bar dataKey="custos" name="Custos" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="tbo" name="TBO" fill="#a855f7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Por Tipo de Custo */}
        <Card>
          <h3>Distribuição de Custos</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={dadosPorTipoCusto}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {dadosPorTipoCusto.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => formatCurrency(value)}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Evolução Mensal */}
        <Card className="full-width">
          <h3>Evolução Mensal</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dadosPorMes}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="mes"
                  stroke="var(--text-secondary)"
                  fontSize={12}
                  tickFormatter={(v) => {
                    const [year, month] = v.split('-');
                    return `${month}/${year.slice(2)}`;
                  }}
                />
                <YAxis yAxisId="left" stroke="var(--text-secondary)" fontSize={12} />
                <YAxis yAxisId="right" orientation="right" stroke="var(--text-secondary)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === 'Custos') return formatCurrency(value);
                    return value.toFixed(1);
                  }}
                />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="custos"
                  name="Custos"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={{ fill: '#6366f1', strokeWidth: 2 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="horas"
                  name="Horas"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={{ fill: '#22c55e', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Top Rotas */}
      <Card>
        <h3>Top 10 Rotas</h3>
        <div className="rotas-table">
          <table>
            <thead>
              <tr>
                <th>Rota</th>
                <th>Voos</th>
                <th>Horas</th>
                <th>Custos</th>
                <th>Custo/Hora</th>
              </tr>
            </thead>
            <tbody>
              {topRotas.map((rota, index) => (
                <tr key={rota.rota}>
                  <td>
                    <span className="rota-rank">#{index + 1}</span>
                    {rota.rota}
                  </td>
                  <td>{rota.voos}</td>
                  <td>{rota.horas.toFixed(1)}h</td>
                  <td>{formatCurrency(rota.custos)}</td>
                  <td>{formatCurrency(rota.horas > 0 ? rota.custos / rota.horas : 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Resumo Final (estilo planilha) */}
      <Card className="resumo-final">
        <h3>Resumo Final - Estilo Planilha</h3>
        <div className="resumo-table">
          <table>
            <thead>
              <tr>
                <th>Categoria</th>
                <th>Grossi</th>
                <th>Shimada</th>
                <th>Ambos</th>
                <th>Outros</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Voos</td>
                <td>{filteredEntries.filter(e => e.grupo === 'grossi').length}</td>
                <td>{filteredEntries.filter(e => e.grupo === 'shimada').length}</td>
                <td>{filteredEntries.filter(e => e.grupo === 'grossi_shimada').length}</td>
                <td>{filteredEntries.filter(e => e.grupo === 'outros').length}</td>
                <td className="total">{totais.voos}</td>
              </tr>
              <tr>
                <td>Horas</td>
                <td>{(filteredEntries.filter(e => e.grupo === 'grossi').reduce((s, e) => s + e.tempoVoo, 0) / 60).toFixed(1)}h</td>
                <td>{(filteredEntries.filter(e => e.grupo === 'shimada').reduce((s, e) => s + e.tempoVoo, 0) / 60).toFixed(1)}h</td>
                <td>{(filteredEntries.filter(e => e.grupo === 'grossi_shimada').reduce((s, e) => s + e.tempoVoo, 0) / 60).toFixed(1)}h</td>
                <td>{(filteredEntries.filter(e => e.grupo === 'outros').reduce((s, e) => s + e.tempoVoo, 0) / 60).toFixed(1)}h</td>
                <td className="total">{totais.horas.toFixed(1)}h</td>
              </tr>
              <tr>
                <td>Custos (sem TBO)</td>
                <td>{formatCurrency(filteredEntries.filter(e => e.grupo === 'grossi').reduce((s, e) => s + e.total - e.provisaoTboGrossi - e.provisaoTboShimada, 0))}</td>
                <td>{formatCurrency(filteredEntries.filter(e => e.grupo === 'shimada').reduce((s, e) => s + e.total - e.provisaoTboGrossi - e.provisaoTboShimada, 0))}</td>
                <td>{formatCurrency(filteredEntries.filter(e => e.grupo === 'grossi_shimada').reduce((s, e) => s + e.total - e.provisaoTboGrossi - e.provisaoTboShimada, 0))}</td>
                <td>{formatCurrency(filteredEntries.filter(e => e.grupo === 'outros').reduce((s, e) => s + e.total - e.provisaoTboGrossi - e.provisaoTboShimada, 0))}</td>
                <td className="total">{formatCurrency(totais.custos - totais.tboTotal)}</td>
              </tr>
              <tr className="highlight-row">
                <td>Provisão TBO</td>
                <td className="grossi">{formatCurrency(totais.tboGrossi)}</td>
                <td className="shimada">{formatCurrency(totais.tboShimada)}</td>
                <td>-</td>
                <td>-</td>
                <td className="total">{formatCurrency(totais.tboTotal)}</td>
              </tr>
              <tr className="total-row">
                <td>TOTAL GERAL</td>
                <td>{formatCurrency(filteredEntries.filter(e => e.grupo === 'grossi').reduce((s, e) => s + e.total, 0))}</td>
                <td>{formatCurrency(filteredEntries.filter(e => e.grupo === 'shimada').reduce((s, e) => s + e.total, 0))}</td>
                <td>{formatCurrency(filteredEntries.filter(e => e.grupo === 'grossi_shimada').reduce((s, e) => s + e.total, 0))}</td>
                <td>{formatCurrency(filteredEntries.filter(e => e.grupo === 'outros').reduce((s, e) => s + e.total, 0))}</td>
                <td className="total">{formatCurrency(totais.custos)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
