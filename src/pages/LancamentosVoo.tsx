import { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  Download,
  Filter,
  Plane,
  CheckCircle,
  AlertCircle,
  FileText,
  ArrowRight,
  ArrowUpDown,
  Upload,
  X,
} from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import Modal from '../components/Modal';
import Input from '../components/Input';
import Select from '../components/Select';
import Table from '../components/Table';
import Badge from '../components/Badge';
import { useAuth } from '../contexts/AuthContext';
import { useAircraft } from '../contexts/AircraftContext';
import { storage } from '../services/storage';
import { FlightEntry, FlightEntryGroup, FlightEntryStatus } from '../types';
import { formatDate, formatCurrency } from '../utils/format';
import './LancamentosVoo.css';

const grupoOptions = [
  { value: 'grossi', label: 'Grossi' },
  { value: 'shimada', label: 'Shimada' },
  { value: 'grossi_shimada', label: 'Grossi e Shimada' },
  { value: 'outros', label: 'Outros' },
];

const statusOptions = [
  { value: 'provisorio', label: 'Provisório' },
  { value: 'conferido', label: 'Conferido' },
];

const medicaoOptions = [
  { value: 'estimado', label: 'Estimado' },
  { value: 'medido', label: 'Medido' },
];

const initialEntry: Partial<FlightEntry> = {
  data: new Date().toISOString().split('T')[0],
  voo: '',
  subVoo: '',
  grupo: 'grossi_shimada',
  origem: '',
  destino: '',
  tempoAcionamentoCorte: 0,
  tempoVoo: 0,
  combustivelInicial: 0,
  abastecimentoLibras: 0,
  abastecimentoLitros: 0,
  localAbastecimento: '',
  combustivelDecolagem: 0,
  combustivelConsumido: 0,
  combustivelConsumidoLitros: 0,
  combustivelFinal: 0,
  tipoMedicaoCombustivel: 'medido',
  valorCombustivel: 0,
  hangar: 0,
  alimentacao: 0,
  hospedagem: 0,
  limpeza: 0,
  uberTaxi: 0,
  tarifas: 0,
  outras: 0,
  provisaoTboGrossi: 0,
  provisaoTboShimada: 0,
  total: 0,
  status: 'provisorio',
  observacoes: '',
};

// Helpers para conversão de tempo
const minutesToHHMM = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

const hhmmToMinutes = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

type SortField = 'data' | 'voo' | 'grupo' | 'total';
type SortDirection = 'asc' | 'desc';

export default function LancamentosVoo() {
  const { user, permissions } = useAuth();
  const { selectedAircraft } = useAircraft();
  const [entries, setEntries] = useState<FlightEntry[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<FlightEntry | null>(null);
  const [editingEntry, setEditingEntry] = useState<Partial<FlightEntry>>(initialEntry);
  
  // Filtros
  const [filterGrupo, setFilterGrupo] = useState('');
  const [filterVoo, setFilterVoo] = useState('');
  const [filterOrigem, setFilterOrigem] = useState('');
  const [filterDestino, setFilterDestino] = useState('');
  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  
  // Ordenação
  const [sortField, setSortField] = useState<SortField>('data');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Carregar dados
  useEffect(() => {
    if (selectedAircraft) {
      loadEntries();
    }
  }, [selectedAircraft]);

  const loadEntries = () => {
    if (!selectedAircraft) return;
    const loadedEntries = storage.getFlightEntries(selectedAircraft.id);
    setEntries(loadedEntries);
  };

  // Aplicar filtros e ordenação
  const filteredEntries = useMemo(() => {
    let result = [...entries];

    // Filtros
    if (filterGrupo) {
      result = result.filter(e => e.grupo === filterGrupo);
    }
    if (filterVoo) {
      result = result.filter(e => 
        e.voo.toLowerCase().includes(filterVoo.toLowerCase()) ||
        e.subVoo.toLowerCase().includes(filterVoo.toLowerCase())
      );
    }
    if (filterOrigem) {
      result = result.filter(e => 
        e.origem.toLowerCase().includes(filterOrigem.toLowerCase()) ||
        e.origemIcao?.toLowerCase().includes(filterOrigem.toLowerCase())
      );
    }
    if (filterDestino) {
      result = result.filter(e => 
        e.destino.toLowerCase().includes(filterDestino.toLowerCase()) ||
        e.destinoIcao?.toLowerCase().includes(filterDestino.toLowerCase())
      );
    }
    if (filterDateStart) {
      result = result.filter(e => e.data >= filterDateStart);
    }
    if (filterDateEnd) {
      result = result.filter(e => e.data <= filterDateEnd);
    }
    if (filterStatus) {
      result = result.filter(e => e.status === filterStatus);
    }

    // Ordenação
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'data':
          comparison = new Date(a.data).getTime() - new Date(b.data).getTime();
          break;
        case 'voo':
          comparison = a.voo.localeCompare(b.voo);
          break;
        case 'grupo':
          comparison = a.grupo.localeCompare(b.grupo);
          break;
        case 'total':
          comparison = a.total - b.total;
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [entries, filterGrupo, filterVoo, filterOrigem, filterDestino, filterDateStart, filterDateEnd, filterStatus, sortField, sortDirection]);

  // Totais
  const totais = useMemo(() => {
    const totalHorasMin = filteredEntries.reduce((sum, e) => sum + e.tempoVoo, 0);
    return {
      voos: filteredEntries.length,
      horasMinutos: totalHorasMin,
      horasDecimal: (totalHorasMin / 60).toFixed(2),
      custoTotal: filteredEntries.reduce((sum, e) => sum + e.total, 0),
      combustivel: filteredEntries.reduce((sum, e) => sum + e.valorCombustivel, 0),
      tboGrossi: filteredEntries.reduce((sum, e) => sum + e.provisaoTboGrossi, 0),
      tboShimada: filteredEntries.reduce((sum, e) => sum + e.provisaoTboShimada, 0),
    };
  }, [filteredEntries]);

  // Handlers
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleSave = () => {
    if (!user || !selectedAircraft) return;

    const errors = storage.validateFlightEntry(editingEntry);
    if (errors.length > 0) {
      alert(errors.join('\n'));
      return;
    }

    const entry = {
      ...editingEntry,
      aircraftId: selectedAircraft.id,
    } as FlightEntry;

    storage.saveFlightEntry(entry, user.id, user.nome);
    loadEntries();
    setModalOpen(false);
    setEditingEntry(initialEntry);
  };

  const handleDelete = (id: string) => {
    if (!user) return;
    if (confirm('Tem certeza que deseja excluir este lançamento?')) {
      storage.deleteFlightEntry(id, user.id, user.nome);
      loadEntries();
    }
  };

  const handleExportCSV = () => {
    if (filteredEntries.length === 0) return;

    const headers = [
      'Voo', 'Sub Voo', 'Data', 'Grupo', 'Origem', 'Destino',
      'Tempo Acionamento', 'Tempo Voo', 'Combustível Inicial (lbs)',
      'Abastecimento (lbs)', 'Abastecimento (L)', 'Local Abastecimento',
      'Combustível Decolagem (lbs)', 'Consumido (lbs)', 'Consumido (L)',
      'Combustível Final (lbs)', 'Valor Combustível', 'Hangar',
      'Alimentação', 'Hospedagem', 'Limpeza', 'Uber/Taxi', 'Tarifas',
      'Outras', 'Provisão TBO Grossi', 'Provisão TBO Shimada', 'Total',
      'Status', 'Observações'
    ];

    const rows = filteredEntries.map(e => [
      e.voo,
      e.subVoo,
      formatDate(e.data),
      e.grupo,
      `${e.origem} (${e.origemIcao || ''})`,
      `${e.destino} (${e.destinoIcao || ''})`,
      minutesToHHMM(e.tempoAcionamentoCorte),
      minutesToHHMM(e.tempoVoo),
      e.combustivelInicial,
      e.abastecimentoLibras,
      e.abastecimentoLitros,
      e.localAbastecimento || '',
      e.combustivelDecolagem,
      e.combustivelConsumido,
      e.combustivelConsumidoLitros.toFixed(2),
      e.combustivelFinal,
      e.valorCombustivel.toFixed(2),
      e.hangar.toFixed(2),
      e.alimentacao.toFixed(2),
      e.hospedagem.toFixed(2),
      e.limpeza.toFixed(2),
      e.uberTaxi.toFixed(2),
      e.tarifas.toFixed(2),
      e.outras.toFixed(2),
      e.provisaoTboGrossi.toFixed(2),
      e.provisaoTboShimada.toFixed(2),
      e.total.toFixed(2),
      e.status,
      e.observacoes || ''
    ]);

    // Adicionar totais
    rows.push([]);
    rows.push(['TOTAIS', '', '', '', '', '', '', minutesToHHMM(totais.horasMinutos), '', '', '', '', '', '', '', '',
      totais.combustivel.toFixed(2), '', '', '', '', '', '', '',
      totais.tboGrossi.toFixed(2), totais.tboShimada.toFixed(2), totais.custoTotal.toFixed(2), '', ''
    ]);

    const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lancamentos_voo_${selectedAircraft?.prefixo}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const updateCalculatedFields = (updates: Partial<FlightEntry>) => {
    const updated = { ...editingEntry, ...updates };
    const calculated = storage.calculateFlightEntryFields(updated);
    setEditingEntry(calculated);
  };

  const clearFilters = () => {
    setFilterGrupo('');
    setFilterVoo('');
    setFilterOrigem('');
    setFilterDestino('');
    setFilterDateStart('');
    setFilterDateEnd('');
    setFilterStatus('');
  };

  const hasActiveFilters = filterGrupo || filterVoo || filterOrigem || filterDestino || filterDateStart || filterDateEnd || filterStatus;

  if (!selectedAircraft) {
    return (
      <div className="empty-state">
        <Plane size={64} className="empty-state-icon" />
        <h3>Selecione uma aeronave</h3>
        <p>Selecione uma aeronave no menu lateral para visualizar os lançamentos de voo.</p>
      </div>
    );
  }

  return (
    <div className="lancamentos-page">
      <div className="page-header">
        <div>
          <h1>Lançamentos de Voo</h1>
          <p className="page-subtitle">
            Controle detalhado de voos - {selectedAircraft.prefixo}
          </p>
        </div>
        <div className="header-actions">
          <Button variant="secondary" icon={<Download size={18} />} onClick={handleExportCSV}>
            Exportar CSV
          </Button>
          {permissions.canCreateFlights && (
            <Button
              icon={<Plus size={18} />}
              onClick={() => {
                setEditingEntry({ ...initialEntry });
                setModalOpen(true);
              }}
            >
              Novo Lançamento
            </Button>
          )}
        </div>
      </div>

      {/* Resumo */}
      <div className="lancamentos-summary">
        <Card className="summary-card">
          <div className="summary-content">
            <span className="summary-value">{totais.voos}</span>
            <span className="summary-label">Voos</span>
          </div>
        </Card>
        <Card className="summary-card">
          <div className="summary-content">
            <span className="summary-value">{minutesToHHMM(totais.horasMinutos)}</span>
            <span className="summary-label">Horas Totais ({totais.horasDecimal}h)</span>
          </div>
        </Card>
        <Card className="summary-card highlight-grossi">
          <div className="summary-content">
            <span className="summary-value">{formatCurrency(totais.tboGrossi)}</span>
            <span className="summary-label">TBO Grossi</span>
          </div>
        </Card>
        <Card className="summary-card highlight-shimada">
          <div className="summary-content">
            <span className="summary-value">{formatCurrency(totais.tboShimada)}</span>
            <span className="summary-label">TBO Shimada</span>
          </div>
        </Card>
        <Card className="summary-card highlight-total">
          <div className="summary-content">
            <span className="summary-value">{formatCurrency(totais.custoTotal)}</span>
            <span className="summary-label">Custo Total</span>
          </div>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="filters-card">
        <div className="filters-header">
          <div className="filters-title">
            <Filter size={18} />
            <span>Filtros</span>
          </div>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Limpar filtros
            </Button>
          )}
        </div>
        <div className="filters-grid">
          <Input
            placeholder="Voo / Sub Voo"
            value={filterVoo}
            onChange={(e) => setFilterVoo(e.target.value)}
          />
          <Select
            options={[{ value: '', label: 'Todos os grupos' }, ...grupoOptions]}
            value={filterGrupo}
            onChange={(e) => setFilterGrupo(e.target.value)}
          />
          <Input
            placeholder="Origem"
            value={filterOrigem}
            onChange={(e) => setFilterOrigem(e.target.value)}
          />
          <Input
            placeholder="Destino"
            value={filterDestino}
            onChange={(e) => setFilterDestino(e.target.value)}
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
          <Select
            options={[{ value: '', label: 'Todos os status' }, ...statusOptions]}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          />
        </div>
      </Card>

      {/* Tabela */}
      <Card>
        <div className="table-container">
          <Table
            columns={[
              {
                key: 'voo',
                header: (
                  <button className="sortable-header" onClick={() => handleSort('voo')}>
                    Voo <ArrowUpDown size={14} />
                  </button>
                ),
                render: (e) => (
                  <div className="voo-cell">
                    <span className="voo-number">{e.voo}</span>
                    {e.subVoo && <span className="sub-voo">{e.subVoo}</span>}
                  </div>
                ),
              },
              {
                key: 'data',
                header: (
                  <button className="sortable-header" onClick={() => handleSort('data')}>
                    Data <ArrowUpDown size={14} />
                  </button>
                ),
                render: (e) => formatDate(e.data),
              },
              {
                key: 'grupo',
                header: (
                  <button className="sortable-header" onClick={() => handleSort('grupo')}>
                    Grupo <ArrowUpDown size={14} />
                  </button>
                ),
                render: (e) => (
                  <Badge variant={
                    e.grupo === 'grossi' ? 'success' :
                    e.grupo === 'shimada' ? 'info' :
                    e.grupo === 'grossi_shimada' ? 'warning' : 'default'
                  }>
                    {grupoOptions.find(g => g.value === e.grupo)?.label || e.grupo}
                  </Badge>
                ),
              },
              {
                key: 'rota',
                header: 'Rota',
                render: (e) => (
                  <div className="route-cell">
                    <span>{e.origem}</span>
                    <ArrowRight size={14} />
                    <span>{e.destino}</span>
                  </div>
                ),
              },
              {
                key: 'tempoVoo',
                header: 'Tempo Voo',
                render: (e) => minutesToHHMM(e.tempoVoo),
              },
              {
                key: 'combustivel',
                header: 'Comb. (lbs)',
                render: (e) => e.combustivelConsumido,
              },
              {
                key: 'total',
                header: (
                  <button className="sortable-header" onClick={() => handleSort('total')}>
                    Total <ArrowUpDown size={14} />
                  </button>
                ),
                render: (e) => formatCurrency(e.total),
              },
              {
                key: 'status',
                header: 'Status',
                render: (e) => (
                  <Badge variant={e.status === 'conferido' ? 'success' : 'warning'}>
                    {e.status === 'conferido' ? (
                      <><CheckCircle size={12} /> Conferido</>
                    ) : (
                      <><AlertCircle size={12} /> Provisório</>
                    )}
                  </Badge>
                ),
              },
              {
                key: 'actions',
                header: '',
                width: '100px',
                render: (e) => (
                  <div className="table-actions">
                    <button
                      className="action-btn"
                      onClick={() => {
                        setSelectedEntry(e);
                        setDetailModalOpen(true);
                      }}
                      title="Ver detalhes"
                    >
                      <FileText size={14} />
                    </button>
                    {permissions.canCreateFlights && (
                      <>
                        <button
                          className="action-btn"
                          onClick={() => {
                            setEditingEntry(e);
                            setModalOpen(true);
                          }}
                          title="Editar"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          className="action-btn danger"
                          onClick={() => handleDelete(e.id)}
                          title="Excluir"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                ),
              },
            ]}
            data={filteredEntries}
            keyExtractor={(e) => e.id}
            emptyMessage="Nenhum lançamento de voo encontrado"
          />
        </div>
      </Card>

      {/* Modal de Edição */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingEntry.id ? 'Editar Lançamento' : 'Novo Lançamento de Voo'}
        size="xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>Salvar</Button>
          </>
        }
      >
        <div className="form-sections">
          {/* Identificação */}
          <div className="form-section">
            <h3 className="section-title">Identificação do Voo</h3>
            <div className="form-grid cols-4">
              <Input
                label="Voo *"
                value={editingEntry.voo}
                onChange={(e) => setEditingEntry({ ...editingEntry, voo: e.target.value.toUpperCase() })}
                placeholder="GSS0001"
                required
              />
              <Input
                label="Sub Voo"
                value={editingEntry.subVoo}
                onChange={(e) => setEditingEntry({ ...editingEntry, subVoo: e.target.value.toUpperCase() })}
                placeholder="GSS-0001"
              />
              <Input
                label="Data *"
                type="date"
                value={editingEntry.data}
                onChange={(e) => setEditingEntry({ ...editingEntry, data: e.target.value })}
                required
              />
              <Select
                label="Grupo *"
                options={grupoOptions}
                value={editingEntry.grupo}
                onChange={(e) => updateCalculatedFields({ grupo: e.target.value as FlightEntryGroup })}
                required
              />
            </div>
          </div>

          {/* Rota */}
          <div className="form-section">
            <h3 className="section-title">Rota</h3>
            <div className="form-grid cols-4">
              <Input
                label="Origem *"
                value={editingEntry.origem}
                onChange={(e) => setEditingEntry({ ...editingEntry, origem: e.target.value.toUpperCase() })}
                placeholder="Nome do aeródromo"
                required
              />
              <Input
                label="ICAO Origem"
                value={editingEntry.origemIcao}
                onChange={(e) => setEditingEntry({ ...editingEntry, origemIcao: e.target.value.toUpperCase() })}
                placeholder="SBSP"
              />
              <Input
                label="Destino *"
                value={editingEntry.destino}
                onChange={(e) => setEditingEntry({ ...editingEntry, destino: e.target.value.toUpperCase() })}
                placeholder="Nome do aeródromo"
                required
              />
              <Input
                label="ICAO Destino"
                value={editingEntry.destinoIcao}
                onChange={(e) => setEditingEntry({ ...editingEntry, destinoIcao: e.target.value.toUpperCase() })}
                placeholder="SBRJ"
              />
            </div>
          </div>

          {/* Tempos */}
          <div className="form-section">
            <h3 className="section-title">Tempos</h3>
            <div className="form-grid cols-2">
              <Input
                label="Tempo Acionamento e Corte (hh:mm)"
                type="time"
                value={minutesToHHMM(editingEntry.tempoAcionamentoCorte || 0)}
                onChange={(e) => setEditingEntry({ ...editingEntry, tempoAcionamentoCorte: hhmmToMinutes(e.target.value) })}
              />
              <Input
                label="Tempo de Voo (hh:mm) *"
                type="time"
                value={minutesToHHMM(editingEntry.tempoVoo || 0)}
                onChange={(e) => updateCalculatedFields({ tempoVoo: hhmmToMinutes(e.target.value) })}
                required
              />
            </div>
          </div>

          {/* Combustível */}
          <div className="form-section">
            <h3 className="section-title">Combustível</h3>
            <div className="form-grid cols-4">
              <Input
                label="Combustível Inicial (lbs)"
                type="number"
                value={editingEntry.combustivelInicial}
                onChange={(e) => updateCalculatedFields({ combustivelInicial: parseFloat(e.target.value) || 0 })}
              />
              <Input
                label="Abastecimento (lbs)"
                type="number"
                value={editingEntry.abastecimentoLibras}
                onChange={(e) => updateCalculatedFields({ abastecimentoLibras: parseFloat(e.target.value) || 0 })}
              />
              <Input
                label="Abastecimento (litros)"
                type="number"
                value={editingEntry.abastecimentoLitros}
                onChange={(e) => setEditingEntry({ ...editingEntry, abastecimentoLitros: parseFloat(e.target.value) || 0 })}
              />
              <Input
                label="Local Abastecimento"
                value={editingEntry.localAbastecimento}
                onChange={(e) => setEditingEntry({ ...editingEntry, localAbastecimento: e.target.value })}
              />
            </div>
            <div className="form-grid cols-4">
              <Input
                label="Combustível Decolagem (lbs)"
                type="number"
                value={editingEntry.combustivelDecolagem?.toFixed(0)}
                onChange={(e) => setEditingEntry({ ...editingEntry, combustivelDecolagem: parseFloat(e.target.value) || 0 })}
                hint="Calculado: Inicial + Abastecido"
              />
              <Input
                label="Combustível Consumido (lbs)"
                type="number"
                value={editingEntry.combustivelConsumido}
                onChange={(e) => updateCalculatedFields({ combustivelConsumido: parseFloat(e.target.value) || 0 })}
              />
              <Input
                label="Consumido (litros)"
                type="number"
                value={editingEntry.combustivelConsumidoLitros?.toFixed(2)}
                readOnly
                hint="Calculado automaticamente"
              />
              <Input
                label="Combustível Final (lbs)"
                type="number"
                value={editingEntry.combustivelFinal?.toFixed(0)}
                onChange={(e) => setEditingEntry({ ...editingEntry, combustivelFinal: parseFloat(e.target.value) || 0 })}
                hint="Calculado: Decolagem - Consumido"
              />
            </div>
            <div className="form-grid cols-2">
              <Select
                label="Tipo de Medição"
                options={medicaoOptions}
                value={editingEntry.tipoMedicaoCombustivel}
                onChange={(e) => setEditingEntry({ ...editingEntry, tipoMedicaoCombustivel: e.target.value as any })}
              />
            </div>
          </div>

          {/* Custos */}
          <div className="form-section">
            <h3 className="section-title">Custos</h3>
            <div className="form-grid cols-4">
              <Input
                label="Valor Combustível (R$)"
                type="number"
                step="0.01"
                value={editingEntry.valorCombustivel}
                onChange={(e) => updateCalculatedFields({ valorCombustivel: parseFloat(e.target.value) || 0 })}
              />
              <Input
                label="Hangar (R$)"
                type="number"
                step="0.01"
                value={editingEntry.hangar}
                onChange={(e) => updateCalculatedFields({ hangar: parseFloat(e.target.value) || 0 })}
              />
              <Input
                label="Alimentação (R$)"
                type="number"
                step="0.01"
                value={editingEntry.alimentacao}
                onChange={(e) => updateCalculatedFields({ alimentacao: parseFloat(e.target.value) || 0 })}
              />
              <Input
                label="Hospedagem (R$)"
                type="number"
                step="0.01"
                value={editingEntry.hospedagem}
                onChange={(e) => updateCalculatedFields({ hospedagem: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="form-grid cols-4">
              <Input
                label="Limpeza (R$)"
                type="number"
                step="0.01"
                value={editingEntry.limpeza}
                onChange={(e) => updateCalculatedFields({ limpeza: parseFloat(e.target.value) || 0 })}
              />
              <Input
                label="Uber / Taxi (R$)"
                type="number"
                step="0.01"
                value={editingEntry.uberTaxi}
                onChange={(e) => updateCalculatedFields({ uberTaxi: parseFloat(e.target.value) || 0 })}
              />
              <Input
                label="Tarifas (R$)"
                type="number"
                step="0.01"
                value={editingEntry.tarifas}
                onChange={(e) => updateCalculatedFields({ tarifas: parseFloat(e.target.value) || 0 })}
              />
              <Input
                label="Outras (R$)"
                type="number"
                step="0.01"
                value={editingEntry.outras}
                onChange={(e) => updateCalculatedFields({ outras: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>

          {/* Provisão TBO */}
          <div className="form-section tbo-section">
            <h3 className="section-title">Provisão TBO (Calculado automaticamente)</h3>
            <div className="form-grid cols-3">
              <Input
                label="Provisão TBO Grossi (R$)"
                type="number"
                value={editingEntry.provisaoTboGrossi?.toFixed(2)}
                readOnly
                className="highlight-grossi"
              />
              <Input
                label="Provisão TBO Shimada (R$)"
                type="number"
                value={editingEntry.provisaoTboShimada?.toFixed(2)}
                readOnly
                className="highlight-shimada"
              />
              <Input
                label="TOTAL (R$)"
                type="number"
                value={editingEntry.total?.toFixed(2)}
                readOnly
                className="highlight-total"
              />
            </div>
            <p className="tbo-info">
              Provisão TBO: R$ 2.800,00 por hora de voo × {((editingEntry.tempoVoo || 0) / 60).toFixed(2)}h = {formatCurrency((editingEntry.provisaoTboGrossi || 0) + (editingEntry.provisaoTboShimada || 0))}
            </p>
          </div>

          {/* Rateio e Status */}
          <div className="form-section">
            <h3 className="section-title">Rateio e Status</h3>
            <div className="form-grid cols-3">
              <Input
                label="Cobrado de quem?"
                value={editingEntry.cobradoDe}
                onChange={(e) => setEditingEntry({ ...editingEntry, cobradoDe: e.target.value })}
              />
              <Input
                label="Observação do Rateio"
                value={editingEntry.rateioObservacao}
                onChange={(e) => setEditingEntry({ ...editingEntry, rateioObservacao: e.target.value })}
              />
              <Select
                label="Status"
                options={statusOptions}
                value={editingEntry.status}
                onChange={(e) => setEditingEntry({ ...editingEntry, status: e.target.value as FlightEntryStatus })}
              />
            </div>
          </div>

          {/* Observações */}
          <div className="form-section">
            <h3 className="section-title">Observações</h3>
            <textarea
              className="textarea-field"
              value={editingEntry.observacoes || ''}
              onChange={(e) => setEditingEntry({ ...editingEntry, observacoes: e.target.value })}
              placeholder="Notas adicionais sobre o voo..."
              rows={4}
            />
          </div>
        </div>
      </Modal>

      {/* Modal de Detalhes */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title={`Detalhes do Voo ${selectedEntry?.voo || ''}`}
        size="lg"
      >
        {selectedEntry && (
          <div className="detail-view">
            <div className="detail-grid">
              <div className="detail-section">
                <h4>Identificação</h4>
                <div className="detail-row">
                  <span className="detail-label">Voo:</span>
                  <span className="detail-value">{selectedEntry.voo}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Sub Voo:</span>
                  <span className="detail-value">{selectedEntry.subVoo || '-'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Data:</span>
                  <span className="detail-value">{formatDate(selectedEntry.data)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Grupo:</span>
                  <span className="detail-value">
                    <Badge variant={
                      selectedEntry.grupo === 'grossi' ? 'success' :
                      selectedEntry.grupo === 'shimada' ? 'info' :
                      selectedEntry.grupo === 'grossi_shimada' ? 'warning' : 'default'
                    }>
                      {grupoOptions.find(g => g.value === selectedEntry.grupo)?.label}
                    </Badge>
                  </span>
                </div>
              </div>

              <div className="detail-section">
                <h4>Rota e Tempos</h4>
                <div className="detail-row">
                  <span className="detail-label">Origem:</span>
                  <span className="detail-value">{selectedEntry.origem} {selectedEntry.origemIcao && `(${selectedEntry.origemIcao})`}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Destino:</span>
                  <span className="detail-value">{selectedEntry.destino} {selectedEntry.destinoIcao && `(${selectedEntry.destinoIcao})`}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Tempo Acionamento:</span>
                  <span className="detail-value">{minutesToHHMM(selectedEntry.tempoAcionamentoCorte)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Tempo de Voo:</span>
                  <span className="detail-value">{minutesToHHMM(selectedEntry.tempoVoo)}</span>
                </div>
              </div>

              <div className="detail-section">
                <h4>Combustível</h4>
                <div className="detail-row">
                  <span className="detail-label">Inicial:</span>
                  <span className="detail-value">{selectedEntry.combustivelInicial} lbs</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Abastecido:</span>
                  <span className="detail-value">{selectedEntry.abastecimentoLibras} lbs / {selectedEntry.abastecimentoLitros} L</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Decolagem:</span>
                  <span className="detail-value">{selectedEntry.combustivelDecolagem} lbs</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Consumido:</span>
                  <span className="detail-value">{selectedEntry.combustivelConsumido} lbs / {selectedEntry.combustivelConsumidoLitros.toFixed(2)} L</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Final:</span>
                  <span className="detail-value">{selectedEntry.combustivelFinal} lbs</span>
                </div>
              </div>

              <div className="detail-section">
                <h4>Custos</h4>
                <div className="detail-row">
                  <span className="detail-label">Combustível:</span>
                  <span className="detail-value">{formatCurrency(selectedEntry.valorCombustivel)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Hangar:</span>
                  <span className="detail-value">{formatCurrency(selectedEntry.hangar)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Alimentação:</span>
                  <span className="detail-value">{formatCurrency(selectedEntry.alimentacao)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Hospedagem:</span>
                  <span className="detail-value">{formatCurrency(selectedEntry.hospedagem)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Limpeza:</span>
                  <span className="detail-value">{formatCurrency(selectedEntry.limpeza)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Uber/Taxi:</span>
                  <span className="detail-value">{formatCurrency(selectedEntry.uberTaxi)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Tarifas:</span>
                  <span className="detail-value">{formatCurrency(selectedEntry.tarifas)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Outras:</span>
                  <span className="detail-value">{formatCurrency(selectedEntry.outras)}</span>
                </div>
              </div>

              <div className="detail-section highlight">
                <h4>Provisão TBO</h4>
                <div className="detail-row">
                  <span className="detail-label">TBO Grossi:</span>
                  <span className="detail-value grossi">{formatCurrency(selectedEntry.provisaoTboGrossi)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">TBO Shimada:</span>
                  <span className="detail-value shimada">{formatCurrency(selectedEntry.provisaoTboShimada)}</span>
                </div>
                <div className="detail-row total">
                  <span className="detail-label">TOTAL:</span>
                  <span className="detail-value">{formatCurrency(selectedEntry.total)}</span>
                </div>
              </div>
            </div>

            {selectedEntry.observacoes && (
              <div className="detail-section full-width">
                <h4>Observações</h4>
                <p className="observacoes-text">{selectedEntry.observacoes}</p>
              </div>
            )}

            <div className="detail-footer">
              <span className="detail-meta">
                Status: <Badge variant={selectedEntry.status === 'conferido' ? 'success' : 'warning'}>
                  {selectedEntry.status === 'conferido' ? 'Conferido' : 'Provisório'}
                </Badge>
              </span>
              <span className="detail-meta">
                Criado em: {formatDate(selectedEntry.createdAt)}
              </span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
