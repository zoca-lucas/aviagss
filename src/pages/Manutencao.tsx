import { useState, useEffect } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  Wrench,
  AlertTriangle,
  Calendar,
  Clock,
  CheckCircle,
  Settings,
  History,
  Filter,
  Package,
  RefreshCw,
  Eye,
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
import {
  MaintenanceEvent,
  MaintenanceSchedule,
  AircraftComponent,
  AircraftPart,
  PartReplacementHistory,
  PartCategory,
  PartStatus,
} from '../types';
import {
  formatDate,
  formatHours,
  formatCurrency,
  getDaysUntil,
  getMaintenanceTypeLabel,
} from '../utils/format';
import './Manutencao.css';

const tiposManutencao = [
  { value: 'preventiva', label: 'Preventiva' },
  { value: 'corretiva', label: 'Corretiva' },
  { value: 'inspecao', label: 'Inspeção' },
  { value: 'revisao', label: 'Revisão' },
  { value: 'tbo', label: 'TBO' },
];

const tiposTrigger = [
  { value: 'horas', label: 'Por Horas' },
  { value: 'calendario', label: 'Por Calendário' },
  { value: 'ciclos', label: 'Por Ciclos' },
];

const categoriasPeca: { value: PartCategory; label: string }[] = [
  { value: 'motor', label: 'Motor' },
  { value: 'celula', label: 'Célula' },
  { value: 'trem_pouso', label: 'Trem de Pouso' },
  { value: 'avionicos', label: 'Aviônicos' },
  { value: 'consumivel', label: 'Consumível' },
  { value: 'helice', label: 'Hélice' },
  { value: 'eletrico', label: 'Elétrico' },
  { value: 'combustivel', label: 'Combustível' },
  { value: 'hidraulico', label: 'Hidráulico' },
  { value: 'outros', label: 'Outros' },
];

const getCategoriaLabel = (categoria: PartCategory): string => {
  return categoriasPeca.find((c) => c.value === categoria)?.label || categoria;
};

const getStatusBadge = (status: PartStatus) => {
  switch (status) {
    case 'vencido':
      return <Badge variant="danger">Vencido</Badge>;
    case 'atencao':
      return <Badge variant="warning">Atenção</Badge>;
    case 'ok':
    default:
      return <Badge variant="success">OK</Badge>;
  }
};

export default function Manutencao() {
  const { user, permissions } = useAuth();
  const { selectedAircraft } = useAircraft();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'programadas' | 'pecas' | 'historico'>('dashboard');
  
  // Estados para dados
  const [schedules, setSchedules] = useState<MaintenanceSchedule[]>([]);
  const [events, setEvents] = useState<MaintenanceEvent[]>([]);
  const [components, setComponents] = useState<AircraftComponent[]>([]);
  const [parts, setParts] = useState<AircraftPart[]>([]);
  const [upcomingReplacements, setUpcomingReplacements] = useState<AircraftPart[]>([]);
  const [partHistory, setPartHistory] = useState<PartReplacementHistory[]>([]);
  
  // Estados para modais
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [partModalOpen, setPartModalOpen] = useState(false);
  const [partHistoryModalOpen, setPartHistoryModalOpen] = useState(false);
  
  // Estados para edição
  const [editingSchedule, setEditingSchedule] = useState<Partial<MaintenanceSchedule>>({});
  const [editingEvent, setEditingEvent] = useState<Partial<MaintenanceEvent> & { partsToUpdate?: string[] }>({});
  const [editingPart, setEditingPart] = useState<Partial<AircraftPart>>({});
  const [selectedPartForHistory, setSelectedPartForHistory] = useState<AircraftPart | null>(null);
  
  // Estados para filtros
  const [filterCategoria, setFilterCategoria] = useState<PartCategory | ''>('');
  const [filterStatus, setFilterStatus] = useState<PartStatus | ''>('');

  useEffect(() => {
    if (selectedAircraft) {
      loadData();
    }
  }, [selectedAircraft]);

  const loadData = () => {
    if (!selectedAircraft) return;
    
    setSchedules(storage.getMaintenanceSchedules(selectedAircraft.id));
    setEvents(
      storage
        .getMaintenanceEvents(selectedAircraft.id)
        .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
    );
    setComponents(storage.getComponents(selectedAircraft.id));
    
    // Atualizar status das peças e carregar
    const updatedParts = storage.updateAllPartsStatus(selectedAircraft.id);
    setParts(updatedParts);
    
    // Próximas trocas
    setUpcomingReplacements(storage.getUpcomingReplacements(selectedAircraft.id, 10));
  };

  const handleSaveSchedule = () => {
    if (!user || !selectedAircraft || !editingSchedule.nome) return;

    const schedule = {
      ...editingSchedule,
      aircraftId: selectedAircraft.id,
      ativo: editingSchedule.ativo !== false,
      obrigatorio: editingSchedule.obrigatorio !== false,
    } as MaintenanceSchedule;

    storage.saveMaintenanceSchedule(schedule, user.id, user.nome);
    loadData();
    setScheduleModalOpen(false);
    setEditingSchedule({});
  };

  const handleSaveEvent = () => {
    if (!user || !selectedAircraft || !editingEvent.descricao) return;

    const event = {
      ...editingEvent,
      aircraftId: selectedAircraft.id,
      horasAeronave: editingEvent.horasAeronave || selectedAircraft.horasCelula,
    } as MaintenanceEvent;

    storage.saveMaintenanceEvent(event, user.id, user.nome, editingEvent.partsToUpdate);
    loadData();
    setEventModalOpen(false);
    setEditingEvent({});
  };

  const handleSavePart = () => {
    if (!user || !selectedAircraft || !editingPart.nome) return;

    const part = {
      ...editingPart,
      aircraftId: selectedAircraft.id,
      alertaPercentual: editingPart.alertaPercentual || 10,
      horasUltimaTroca: editingPart.horasUltimaTroca || selectedAircraft.horasCelula,
      status: 'ok' as PartStatus,
    } as AircraftPart;

    storage.savePart(part, user.id, user.nome);
    loadData();
    setPartModalOpen(false);
    setEditingPart({});
  };

  const handleDeleteSchedule = (id: string) => {
    if (!user) return;
    if (confirm('Tem certeza que deseja excluir esta manutenção programada?')) {
      storage.deleteMaintenanceSchedule(id, user.id, user.nome);
      loadData();
    }
  };

  const handleDeletePart = (id: string) => {
    if (!user) return;
    if (confirm('Tem certeza que deseja excluir esta peça?')) {
      storage.deletePart(id, user.id, user.nome);
      loadData();
    }
  };

  const handleViewPartHistory = (part: AircraftPart) => {
    setSelectedPartForHistory(part);
    setPartHistory(storage.getPartReplacementHistory(part.id));
    setPartHistoryModalOpen(true);
  };

  const getScheduleStatus = (schedule: MaintenanceSchedule) => {
    if (!selectedAircraft) return { status: 'ok', label: 'OK', variant: 'success' as const };

    if (schedule.trigger === 'horas' && schedule.proximasHoras) {
      const horasRestantes = schedule.proximasHoras - selectedAircraft.horasCelula;
      if (horasRestantes <= 0)
        return { status: 'vencida', label: 'Vencida', variant: 'danger' as const };
      if (horasRestantes <= (schedule.alertaAntesHoras || 10))
        return { status: 'proxima', label: `${horasRestantes.toFixed(0)}h`, variant: 'warning' as const };
      return { status: 'ok', label: `${horasRestantes.toFixed(0)}h`, variant: 'success' as const };
    }

    if (schedule.trigger === 'calendario' && schedule.proximaData) {
      const diasRestantes = getDaysUntil(schedule.proximaData);
      if (diasRestantes <= 0)
        return { status: 'vencida', label: 'Vencida', variant: 'danger' as const };
      if (diasRestantes <= (schedule.alertaAntesDias || 15))
        return { status: 'proxima', label: `${diasRestantes}d`, variant: 'warning' as const };
      return { status: 'ok', label: `${diasRestantes}d`, variant: 'success' as const };
    }

    return { status: 'ok', label: 'OK', variant: 'success' as const };
  };

  // Filtrar peças
  const filteredParts = parts.filter((p) => {
    if (filterCategoria && p.categoria !== filterCategoria) return false;
    if (filterStatus && p.status !== filterStatus) return false;
    return true;
  });

  // Estatísticas do dashboard
  const partsVencidas = parts.filter((p) => p.status === 'vencido').length;
  const partsAtencao = parts.filter((p) => p.status === 'atencao').length;
  const schedulesVencidas = schedules.filter((s) => getScheduleStatus(s).status === 'vencida').length;
  const schedulesProximas = schedules.filter((s) => getScheduleStatus(s).status === 'proxima').length;

  if (!selectedAircraft) {
    return (
      <div className="empty-state">
        <Wrench size={64} className="empty-state-icon" />
        <h3>Selecione uma aeronave</h3>
        <p>Selecione uma aeronave no menu lateral para gerenciar manutenções.</p>
      </div>
    );
  }

  return (
    <div className="manutencao-page">
      <div className="page-header">
        <div>
          <h1>Manutenção</h1>
          <p className="page-subtitle">
            Controle de manutenções e peças - {selectedAircraft.prefixo} ({formatHours(selectedAircraft.horasCelula)})
          </p>
        </div>
        {permissions.canManageMaintenance && (
          <div className="header-actions">
            <Button
              variant="secondary"
              icon={<RefreshCw size={18} />}
              onClick={loadData}
            >
              Atualizar
            </Button>
            <Button
              variant="secondary"
              icon={<Calendar size={18} />}
              onClick={() => {
                setEditingSchedule({ trigger: 'horas', tipo: 'inspecao' });
                setScheduleModalOpen(true);
              }}
            >
              Nova Programada
            </Button>
            <Button
              icon={<Plus size={18} />}
              onClick={() => {
                setEditingEvent({
                  data: new Date().toISOString().split('T')[0],
                  tipo: 'preventiva',
                  horasAeronave: selectedAircraft.horasCelula,
                });
                setEventModalOpen(true);
              }}
            >
              Registrar Manutenção
            </Button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <Settings size={18} />
          Dashboard
          {(partsVencidas + schedulesVencidas) > 0 && (
            <span className="tab-badge danger">{partsVencidas + schedulesVencidas}</span>
          )}
        </button>
        <button
          className={`tab ${activeTab === 'programadas' ? 'active' : ''}`}
          onClick={() => setActiveTab('programadas')}
        >
          <Calendar size={18} />
          Programadas
          {schedulesProximas > 0 && <span className="tab-badge">{schedulesProximas}</span>}
        </button>
        <button
          className={`tab ${activeTab === 'pecas' ? 'active' : ''}`}
          onClick={() => setActiveTab('pecas')}
        >
          <Package size={18} />
          Peças/Componentes
          {partsAtencao > 0 && <span className="tab-badge">{partsAtencao}</span>}
        </button>
        <button
          className={`tab ${activeTab === 'historico' ? 'active' : ''}`}
          onClick={() => setActiveTab('historico')}
        >
          <History size={18} />
          Histórico
        </button>
      </div>

      {/* Dashboard */}
      {activeTab === 'dashboard' && (
        <div className="dashboard-content">
          {/* Cards de resumo */}
          <div className="dashboard-summary">
            <Card className="summary-card danger">
              <div className="summary-icon">
                <AlertTriangle size={24} />
              </div>
              <div className="summary-info">
                <span className="summary-value">{partsVencidas + schedulesVencidas}</span>
                <span className="summary-label">Vencidos</span>
              </div>
            </Card>
            <Card className="summary-card warning">
              <div className="summary-icon">
                <Clock size={24} />
              </div>
              <div className="summary-info">
                <span className="summary-value">{partsAtencao + schedulesProximas}</span>
                <span className="summary-label">Atenção</span>
              </div>
            </Card>
            <Card className="summary-card success">
              <div className="summary-icon">
                <CheckCircle size={24} />
              </div>
              <div className="summary-info">
                <span className="summary-value">{parts.filter((p) => p.status === 'ok').length}</span>
                <span className="summary-label">OK</span>
              </div>
            </Card>
            <Card className="summary-card info">
              <div className="summary-icon">
                <Package size={24} />
              </div>
              <div className="summary-info">
                <span className="summary-value">{parts.length}</span>
                <span className="summary-label">Total Peças</span>
              </div>
            </Card>
          </div>

          {/* Próximas Trocas */}
          <Card title="Próximas Trocas (Top 10)" className="upcoming-replacements">
            {upcomingReplacements.length === 0 ? (
              <div className="empty-list">
                <p>Nenhuma peça cadastrada com intervalo de horas</p>
              </div>
            ) : (
              <Table
                columns={[
                  {
                    key: 'status',
                    header: 'Status',
                    width: '100px',
                    render: (p) => getStatusBadge(p.status),
                  },
                  { key: 'nome', header: 'Peça/Componente' },
                  { key: 'categoria', header: 'Categoria', render: (p) => getCategoriaLabel(p.categoria) },
                  {
                    key: 'horasRestantes',
                    header: 'Horas Restantes',
                    render: (p) => (
                      <span className={p.horasRestantes && p.horasRestantes <= 0 ? 'text-danger' : ''}>
                        {p.horasRestantes?.toFixed(1) || '-'}h
                      </span>
                    ),
                  },
                  {
                    key: 'intervaloHoras',
                    header: 'Intervalo',
                    render: (p) => `${p.intervaloHoras}h`,
                  },
                  {
                    key: 'dataUltimaTroca',
                    header: 'Última Troca',
                    render: (p) => (p.dataUltimaTroca ? formatDate(p.dataUltimaTroca) : '-'),
                  },
                ]}
                data={upcomingReplacements}
                keyExtractor={(p) => p.id}
              />
            )}
          </Card>

          {/* Manutenções Programadas Vencidas/Próximas */}
          {(schedulesVencidas > 0 || schedulesProximas > 0) && (
            <Card title="Manutenções Programadas (Vencidas/Próximas)" className="scheduled-alerts">
              <div className="schedules-grid">
                {schedules
                  .filter((s) => {
                    const status = getScheduleStatus(s);
                    return status.status === 'vencida' || status.status === 'proxima';
                  })
                  .map((schedule) => {
                    const statusInfo = getScheduleStatus(schedule);
                    return (
                      <Card key={schedule.id} className={`schedule-card status-${statusInfo.status}`}>
                        <div className="schedule-header">
                          <div className="schedule-icon">
                            {statusInfo.status === 'vencida' && <AlertTriangle size={20} />}
                            {statusInfo.status === 'proxima' && <Clock size={20} />}
                          </div>
                          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                        </div>
                        <div className="schedule-info">
                          <h3>{schedule.nome}</h3>
                          <p className="schedule-type">{getMaintenanceTypeLabel(schedule.tipo)}</p>
                        </div>
                      </Card>
                    );
                  })}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Manutenções Programadas */}
      {activeTab === 'programadas' && (
        <div className="schedules-grid">
          {schedules.map((schedule) => {
            const statusInfo = getScheduleStatus(schedule);
            return (
              <Card key={schedule.id} className={`schedule-card status-${statusInfo.status}`}>
                <div className="schedule-header">
                  <div className="schedule-icon">
                    {statusInfo.status === 'vencida' && <AlertTriangle size={20} />}
                    {statusInfo.status === 'proxima' && <Clock size={20} />}
                    {statusInfo.status === 'ok' && <CheckCircle size={20} />}
                  </div>
                  <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                </div>

                <div className="schedule-info">
                  <h3>{schedule.nome}</h3>
                  <p className="schedule-type">{getMaintenanceTypeLabel(schedule.tipo)}</p>
                  {schedule.descricao && <p className="schedule-description">{schedule.descricao}</p>}
                </div>

                <div className="schedule-details">
                  <div className="detail">
                    <span className="detail-label">Gatilho</span>
                    <span className="detail-value">
                      {schedule.trigger === 'horas' && `A cada ${schedule.intervaloHoras}h`}
                      {schedule.trigger === 'calendario' && `A cada ${schedule.intervaloDias}d`}
                      {schedule.trigger === 'ciclos' && `A cada ${schedule.intervaloCiclos} ciclos`}
                    </span>
                  </div>
                  {schedule.proximasHoras && (
                    <div className="detail">
                      <span className="detail-label">Próxima em</span>
                      <span className="detail-value">{formatHours(schedule.proximasHoras)}</span>
                    </div>
                  )}
                  {schedule.proximaData && (
                    <div className="detail">
                      <span className="detail-label">Data</span>
                      <span className="detail-value">{formatDate(schedule.proximaData)}</span>
                    </div>
                  )}
                </div>

                {permissions.canManageMaintenance && (
                  <div className="schedule-actions">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingSchedule(schedule);
                        setScheduleModalOpen(true);
                      }}
                    >
                      <Edit size={14} />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDeleteSchedule(schedule.id)}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}

          {schedules.length === 0 && (
            <div className="empty-list full-width">
              <p>Nenhuma manutenção programada</p>
            </div>
          )}
        </div>
      )}

      {/* Peças/Componentes */}
      {activeTab === 'pecas' && (
        <div className="pecas-content">
          <div className="pecas-header">
            <div className="filters">
              <Filter size={18} className="filter-icon" />
              <Select
                options={[{ value: '', label: 'Todas categorias' }, ...categoriasPeca]}
                value={filterCategoria}
                onChange={(e) => setFilterCategoria(e.target.value as PartCategory | '')}
              />
              <Select
                options={[
                  { value: '', label: 'Todos status' },
                  { value: 'ok', label: 'OK' },
                  { value: 'atencao', label: 'Atenção' },
                  { value: 'vencido', label: 'Vencido' },
                ]}
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as PartStatus | '')}
              />
              {(filterCategoria || filterStatus) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFilterCategoria('');
                    setFilterStatus('');
                  }}
                >
                  Limpar
                </Button>
              )}
            </div>
            {permissions.canManageMaintenance && (
              <Button
                icon={<Plus size={18} />}
                onClick={() => {
                  setEditingPart({
                    categoria: 'consumivel',
                    alertaPercentual: 10,
                    horasUltimaTroca: selectedAircraft.horasCelula,
                    dataUltimaTroca: new Date().toISOString().split('T')[0],
                  });
                  setPartModalOpen(true);
                }}
              >
                Nova Peça
              </Button>
            )}
          </div>

          <Card>
            <Table
              columns={[
                {
                  key: 'status',
                  header: 'Status',
                  width: '100px',
                  render: (p) => getStatusBadge(p.status),
                },
                { key: 'nome', header: 'Peça/Componente' },
                { key: 'categoria', header: 'Categoria', render: (p) => getCategoriaLabel(p.categoria) },
                {
                  key: 'intervaloHoras',
                  header: 'Intervalo',
                  render: (p) => (p.intervaloHoras ? `${p.intervaloHoras}h` : '-'),
                },
                {
                  key: 'horasDesdeUltimaTroca',
                  header: 'Desde Troca',
                  render: (p) => `${p.horasDesdeUltimaTroca?.toFixed(1) || 0}h`,
                },
                {
                  key: 'horasRestantes',
                  header: 'Restantes',
                  render: (p) => (
                    <span className={p.horasRestantes && p.horasRestantes <= 0 ? 'text-danger' : ''}>
                      {p.horasRestantes?.toFixed(1) || '-'}h
                    </span>
                  ),
                },
                {
                  key: 'dataUltimaTroca',
                  header: 'Última Troca',
                  render: (p) => (p.dataUltimaTroca ? formatDate(p.dataUltimaTroca) : '-'),
                },
                {
                  key: 'custoUltimaTroca',
                  header: 'Custo',
                  render: (p) => (p.custoUltimaTroca ? formatCurrency(p.custoUltimaTroca) : '-'),
                },
                {
                  key: 'actions',
                  header: '',
                  width: '120px',
                  render: (p) => (
                    <div className="table-actions">
                      <button className="action-btn" onClick={() => handleViewPartHistory(p)} title="Ver histórico">
                        <Eye size={14} />
                      </button>
                      {permissions.canManageMaintenance && (
                        <>
                          <button
                            className="action-btn"
                            onClick={() => {
                              setEditingPart(p);
                              setPartModalOpen(true);
                            }}
                            title="Editar"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            className="action-btn danger"
                            onClick={() => handleDeletePart(p.id)}
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
              data={filteredParts}
              keyExtractor={(p) => p.id}
              emptyMessage="Nenhuma peça cadastrada"
            />
          </Card>
        </div>
      )}

      {/* Histórico */}
      {activeTab === 'historico' && (
        <Card>
          <Table
            columns={[
              { key: 'data', header: 'Data', render: (e) => formatDate(e.data) },
              {
                key: 'tipo',
                header: 'Tipo',
                render: (e) => <Badge>{getMaintenanceTypeLabel(e.tipo)}</Badge>,
              },
              { key: 'descricao', header: 'Descrição' },
              { key: 'horasAeronave', header: 'Horas', render: (e) => formatHours(e.horasAeronave) },
              { key: 'custo', header: 'Custo', render: (e) => formatCurrency(e.custo) },
              { key: 'oficina', header: 'Oficina', render: (e) => e.oficina || '-' },
            ]}
            data={events}
            keyExtractor={(e) => e.id}
            emptyMessage="Nenhuma manutenção registrada"
          />
        </Card>
      )}

      {/* Modal de Manutenção Programada */}
      <Modal
        isOpen={scheduleModalOpen}
        onClose={() => setScheduleModalOpen(false)}
        title={editingSchedule.id ? 'Editar Manutenção Programada' : 'Nova Manutenção Programada'}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setScheduleModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveSchedule}>Salvar</Button>
          </>
        }
      >
        <div className="form-grid">
          <Input
            label="Nome"
            value={editingSchedule.nome || ''}
            onChange={(e) => setEditingSchedule({ ...editingSchedule, nome: e.target.value })}
            placeholder="Ex: Inspeção 100h"
            required
          />
          <Select
            label="Tipo"
            options={tiposManutencao}
            value={editingSchedule.tipo || 'inspecao'}
            onChange={(e) =>
              setEditingSchedule({
                ...editingSchedule,
                tipo: e.target.value as MaintenanceSchedule['tipo'],
              })
            }
          />
          <Select
            label="Gatilho"
            options={tiposTrigger}
            value={editingSchedule.trigger || 'horas'}
            onChange={(e) =>
              setEditingSchedule({
                ...editingSchedule,
                trigger: e.target.value as MaintenanceSchedule['trigger'],
              })
            }
          />
          {editingSchedule.trigger === 'horas' && (
            <>
              <Input
                label="Intervalo (horas)"
                type="number"
                value={editingSchedule.intervaloHoras || ''}
                onChange={(e) =>
                  setEditingSchedule({ ...editingSchedule, intervaloHoras: parseFloat(e.target.value) })
                }
              />
              <Input
                label="Próximas horas"
                type="number"
                value={editingSchedule.proximasHoras || ''}
                onChange={(e) =>
                  setEditingSchedule({ ...editingSchedule, proximasHoras: parseFloat(e.target.value) })
                }
              />
              <Input
                label="Alertar antes (horas)"
                type="number"
                value={editingSchedule.alertaAntesHoras || 10}
                onChange={(e) =>
                  setEditingSchedule({ ...editingSchedule, alertaAntesHoras: parseInt(e.target.value) })
                }
              />
            </>
          )}
          {editingSchedule.trigger === 'calendario' && (
            <>
              <Input
                label="Intervalo (dias)"
                type="number"
                value={editingSchedule.intervaloDias || ''}
                onChange={(e) =>
                  setEditingSchedule({ ...editingSchedule, intervaloDias: parseInt(e.target.value) })
                }
              />
              <Input
                label="Próxima data"
                type="date"
                value={editingSchedule.proximaData || ''}
                onChange={(e) => setEditingSchedule({ ...editingSchedule, proximaData: e.target.value })}
              />
              <Input
                label="Alertar antes (dias)"
                type="number"
                value={editingSchedule.alertaAntesDias || 15}
                onChange={(e) =>
                  setEditingSchedule({ ...editingSchedule, alertaAntesDias: parseInt(e.target.value) })
                }
              />
            </>
          )}
          <Select
            label="Componente (opcional)"
            options={[
              { value: '', label: 'Aeronave geral' },
              ...components.map((c) => ({ value: c.id, label: `${c.tipo} - ${c.serial}` })),
            ]}
            value={editingSchedule.componentId || ''}
            onChange={(e) =>
              setEditingSchedule({ ...editingSchedule, componentId: e.target.value || undefined })
            }
          />
        </div>
      </Modal>

      {/* Modal de Registro de Manutenção */}
      <Modal
        isOpen={eventModalOpen}
        onClose={() => setEventModalOpen(false)}
        title="Registrar Manutenção"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEventModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEvent}>Salvar</Button>
          </>
        }
      >
        <div className="form-grid">
          <Input
            label="Data"
            type="date"
            value={editingEvent.data || ''}
            onChange={(e) => setEditingEvent({ ...editingEvent, data: e.target.value })}
            required
          />
          <Select
            label="Tipo"
            options={tiposManutencao}
            value={editingEvent.tipo || 'preventiva'}
            onChange={(e) =>
              setEditingEvent({ ...editingEvent, tipo: e.target.value as MaintenanceEvent['tipo'] })
            }
          />
          <Input
            label="Horas da Aeronave"
            type="number"
            value={editingEvent.horasAeronave || selectedAircraft.horasCelula}
            onChange={(e) => setEditingEvent({ ...editingEvent, horasAeronave: parseFloat(e.target.value) })}
          />
          <Input
            label="Custo (R$)"
            type="number"
            value={editingEvent.custo || 0}
            onChange={(e) => setEditingEvent({ ...editingEvent, custo: parseFloat(e.target.value) })}
          />
          <Input
            label="Oficina/Responsável"
            value={editingEvent.oficina || ''}
            onChange={(e) => setEditingEvent({ ...editingEvent, oficina: e.target.value })}
          />
          <Select
            label="Componente (opcional)"
            options={[
              { value: '', label: 'Aeronave geral' },
              ...components.map((c) => ({ value: c.id, label: `${c.tipo} - ${c.serial}` })),
            ]}
            value={editingEvent.componentId || ''}
            onChange={(e) => setEditingEvent({ ...editingEvent, componentId: e.target.value || undefined })}
          />
        </div>

        {/* Seleção de peças para atualizar */}
        {parts.length > 0 && (
          <div className="parts-selection">
            <h4>Peças Trocadas (marque as que foram substituídas)</h4>
            <div className="parts-checkboxes">
              {parts.map((part) => (
                <label key={part.id} className="part-checkbox">
                  <input
                    type="checkbox"
                    checked={editingEvent.partsToUpdate?.includes(part.id) || false}
                    onChange={(e) => {
                      const current = editingEvent.partsToUpdate || [];
                      if (e.target.checked) {
                        setEditingEvent({ ...editingEvent, partsToUpdate: [...current, part.id] });
                      } else {
                        setEditingEvent({
                          ...editingEvent,
                          partsToUpdate: current.filter((id) => id !== part.id),
                        });
                      }
                    }}
                  />
                  <span>
                    {part.nome} ({getCategoriaLabel(part.categoria)})
                  </span>
                  {getStatusBadge(part.status)}
                </label>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginTop: '1rem' }}>
          <Input
            label="Descrição"
            value={editingEvent.descricao || ''}
            onChange={(e) => setEditingEvent({ ...editingEvent, descricao: e.target.value })}
            placeholder="Descreva o serviço realizado..."
            required
          />
        </div>
      </Modal>

      {/* Modal de Nova Peça */}
      <Modal
        isOpen={partModalOpen}
        onClose={() => setPartModalOpen(false)}
        title={editingPart.id ? 'Editar Peça/Componente' : 'Nova Peça/Componente'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPartModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSavePart}>Salvar</Button>
          </>
        }
      >
        <div className="form-grid">
          <Input
            label="Nome da Peça"
            value={editingPart.nome || ''}
            onChange={(e) => setEditingPart({ ...editingPart, nome: e.target.value })}
            placeholder="Ex: Vela, Filtro de Óleo, Pneu..."
            required
          />
          <Select
            label="Categoria"
            options={categoriasPeca}
            value={editingPart.categoria || 'consumivel'}
            onChange={(e) => setEditingPart({ ...editingPart, categoria: e.target.value as PartCategory })}
          />
          <Input
            label="Part Number"
            value={editingPart.partNumber || ''}
            onChange={(e) => setEditingPart({ ...editingPart, partNumber: e.target.value })}
            placeholder="Opcional"
          />
          <Input
            label="Serial"
            value={editingPart.serial || ''}
            onChange={(e) => setEditingPart({ ...editingPart, serial: e.target.value })}
            placeholder="Opcional"
          />
          <Input
            label="Fabricante"
            value={editingPart.fabricante || ''}
            onChange={(e) => setEditingPart({ ...editingPart, fabricante: e.target.value })}
            placeholder="Opcional"
          />
          <Input
            label="Intervalo de Troca (horas)"
            type="number"
            value={editingPart.intervaloHoras || ''}
            onChange={(e) => setEditingPart({ ...editingPart, intervaloHoras: parseFloat(e.target.value) })}
            placeholder="Ex: 50, 100..."
          />
          <Input
            label="Intervalo de Troca (dias)"
            type="number"
            value={editingPart.intervaloDias || ''}
            onChange={(e) => setEditingPart({ ...editingPart, intervaloDias: parseInt(e.target.value) })}
            placeholder="Ex: 180 (6 meses)"
          />
          <Input
            label="Alertar quando (% do intervalo)"
            type="number"
            value={editingPart.alertaPercentual || 10}
            onChange={(e) => setEditingPart({ ...editingPart, alertaPercentual: parseInt(e.target.value) })}
            placeholder="Ex: 10 (alertar quando faltar 10%)"
          />
        </div>

        <h4 style={{ marginTop: '1.5rem', marginBottom: '1rem' }}>Última Troca</h4>
        <div className="form-grid">
          <Input
            label="Horas da Aeronave na Última Troca"
            type="number"
            value={editingPart.horasUltimaTroca || selectedAircraft.horasCelula}
            onChange={(e) => setEditingPart({ ...editingPart, horasUltimaTroca: parseFloat(e.target.value) })}
          />
          <Input
            label="Data da Última Troca"
            type="date"
            value={editingPart.dataUltimaTroca || ''}
            onChange={(e) => setEditingPart({ ...editingPart, dataUltimaTroca: e.target.value })}
          />
          <Input
            label="Custo da Última Troca (R$)"
            type="number"
            value={editingPart.custoUltimaTroca || ''}
            onChange={(e) =>
              setEditingPart({ ...editingPart, custoUltimaTroca: parseFloat(e.target.value) || undefined })
            }
          />
          <Input
            label="Fornecedor"
            value={editingPart.fornecedor || ''}
            onChange={(e) => setEditingPart({ ...editingPart, fornecedor: e.target.value })}
          />
          <Input
            label="Nota Fiscal"
            value={editingPart.notaFiscal || ''}
            onChange={(e) => setEditingPart({ ...editingPart, notaFiscal: e.target.value })}
          />
        </div>

        <div style={{ marginTop: '1rem' }}>
          <Input
            label="Observações"
            value={editingPart.observacoes || ''}
            onChange={(e) => setEditingPart({ ...editingPart, observacoes: e.target.value })}
            placeholder="Observações adicionais..."
          />
        </div>
      </Modal>

      {/* Modal de Histórico da Peça */}
      <Modal
        isOpen={partHistoryModalOpen}
        onClose={() => setPartHistoryModalOpen(false)}
        title={`Histórico de Trocas - ${selectedPartForHistory?.nome || ''}`}
        size="lg"
      >
        {selectedPartForHistory && (
          <div className="part-history">
            <div className="part-info-summary">
              <div className="info-item">
                <span className="label">Categoria:</span>
                <span className="value">{getCategoriaLabel(selectedPartForHistory.categoria)}</span>
              </div>
              <div className="info-item">
                <span className="label">Intervalo:</span>
                <span className="value">{selectedPartForHistory.intervaloHoras || '-'}h</span>
              </div>
              <div className="info-item">
                <span className="label">Horas Restantes:</span>
                <span className="value">{selectedPartForHistory.horasRestantes?.toFixed(1) || '-'}h</span>
              </div>
              <div className="info-item">
                <span className="label">Status:</span>
                {getStatusBadge(selectedPartForHistory.status)}
              </div>
            </div>

            <h4>Histórico de Trocas</h4>
            {partHistory.length === 0 ? (
              <p className="empty-history">Nenhuma troca registrada</p>
            ) : (
              <Table
                columns={[
                  { key: 'data', header: 'Data', render: (h) => formatDate(h.data) },
                  { key: 'horasAeronave', header: 'Horas', render: (h) => formatHours(h.horasAeronave) },
                  { key: 'custo', header: 'Custo', render: (h) => (h.custo ? formatCurrency(h.custo) : '-') },
                  { key: 'fornecedor', header: 'Fornecedor', render: (h) => h.fornecedor || '-' },
                  { key: 'observacoes', header: 'Observações', render: (h) => h.observacoes || '-' },
                ]}
                data={partHistory}
                keyExtractor={(h) => h.id}
              />
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
