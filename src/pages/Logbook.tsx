import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Download, Filter, BookOpen, ArrowRight } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import Modal from '../components/Modal';
import Input from '../components/Input';
import Select from '../components/Select';
import Table from '../components/Table';
// import Badge from '../components/Badge';
import { useAuth } from '../contexts/AuthContext';
import { useAircraft } from '../contexts/AircraftContext';
import { storage } from '../services/storage';
import { Flight, User } from '../types';
import { formatDate, formatHours } from '../utils/format';
import './Logbook.css';

const initialFlight: Partial<Flight> = {
    data: new Date().toISOString().split('T')[0],
    origem: '',
  origemIcao: '',
    destino: '',
  destinoIcao: '',
    tempoVoo: 0,
    tempoTaxi: 0,
    horasMotor: 0,
    horasCelula: 0,
    ciclos: 1,
    combustivelConsumido: 0,
    combustivelAbastecido: 0,
    observacoes: '',
};

export default function Logbook() {
  const { user, permissions } = useAuth();
  const { selectedAircraft } = useAircraft();
  const [flights, setFlights] = useState<Flight[]>([]);
  const [pilots, setPilots] = useState<User[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingFlight, setEditingFlight] = useState<Partial<Flight>>(initialFlight);
  const [filterPilot, setFilterPilot] = useState('');
  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');

  useEffect(() => {
    if (selectedAircraft) {
      loadFlights();
    }
    setPilots(storage.getUsers().filter((u) => u.role === 'piloto' || u.role === 'admin' || u.role === 'gestor'));
  }, [selectedAircraft]);

  const loadFlights = () => {
    if (!selectedAircraft) return;
    let loadedFlights = storage.getFlights(selectedAircraft.id);

    // Aplicar filtros
    if (filterPilot) {
      loadedFlights = loadedFlights.filter((f) => f.pilotoId === filterPilot);
    }
    if (filterDateStart) {
      loadedFlights = loadedFlights.filter((f) => f.data >= filterDateStart);
    }
    if (filterDateEnd) {
      loadedFlights = loadedFlights.filter((f) => f.data <= filterDateEnd);
    }

    // Ordenar por data decrescente
    loadedFlights.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
    setFlights(loadedFlights);
  };

  useEffect(() => {
    loadFlights();
  }, [filterPilot, filterDateStart, filterDateEnd]);

  const handleSave = () => {
    if (!user || !selectedAircraft || !editingFlight.origem || !editingFlight.destino) return;

    const flight = {
      ...editingFlight,
      aircraftId: selectedAircraft.id,
      pilotoId: editingFlight.pilotoId || user.id,
      horasMotor: editingFlight.horasMotor || editingFlight.tempoVoo || 0,
      horasCelula: editingFlight.horasCelula || editingFlight.tempoVoo || 0,
    } as Flight;

    storage.saveFlight(flight, user.id, user.nome);
    loadFlights();
    setModalOpen(false);
    setEditingFlight(initialFlight);
  };

  const handleDelete = (id: string) => {
    if (!user) return;
    if (confirm('Tem certeza que deseja excluir este voo?')) {
      storage.deleteFlight(id, user.id, user.nome);
      loadFlights();
    }
  };

  const handleExport = () => {
    if (flights.length === 0) return;

    const headers = ['Data', 'Origem', 'Destino', 'Piloto', 'Tempo de Voo', 'Horas Motor', 'Ciclos', 'Combustível'];
    const rows = flights.map((f) => {
      const pilot = pilots.find((p) => p.id === f.pilotoId);
      return [
        formatDate(f.data),
        `${f.origem} (${f.origemIcao || '-'})`,
        `${f.destino} (${f.destinoIcao || '-'})`,
        pilot?.nome || '-',
        formatHours(f.tempoVoo),
        formatHours(f.horasMotor),
        f.ciclos.toString(),
        f.combustivelConsumido?.toString() || '-',
      ];
    });

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logbook_${selectedAircraft?.prefixo}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const totalHours = flights.reduce((sum, f) => sum + f.tempoVoo, 0);
  const totalCycles = flights.reduce((sum, f) => sum + f.ciclos, 0);

  if (!selectedAircraft) {
    return (
      <div className="empty-state">
        <BookOpen size={64} className="empty-state-icon" />
        <h3>Selecione uma aeronave</h3>
        <p>Selecione uma aeronave no menu lateral para visualizar o logbook.</p>
      </div>
    );
  }

  return (
    <div className="logbook-page">
      <div className="page-header">
        <div>
          <h1>Logbook</h1>
          <p className="page-subtitle">
            Registro de voos - {selectedAircraft.prefixo}
          </p>
        </div>
        <div className="header-actions">
          <Button variant="secondary" icon={<Download size={18} />} onClick={handleExport}>
            Exportar CSV
          </Button>
          {permissions.canCreateFlights && (
            <Button
              icon={<Plus size={18} />}
              onClick={() => {
                setEditingFlight({ ...initialFlight, pilotoId: user?.id });
                setModalOpen(true);
              }}
            >
              Novo Voo
        </Button>
          )}
        </div>
      </div>

      {/* Resumo */}
      <div className="logbook-summary">
        <Card className="summary-card">
          <div className="summary-content">
            <span className="summary-value">{flights.length}</span>
          <span className="summary-label">Voos</span>
        </div>
        </Card>
        <Card className="summary-card">
          <div className="summary-content">
            <span className="summary-value">{formatHours(totalHours)}</span>
            <span className="summary-label">Horas Totais</span>
        </div>
        </Card>
        <Card className="summary-card">
          <div className="summary-content">
            <span className="summary-value">{totalCycles}</span>
            <span className="summary-label">Ciclos</span>
        </div>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="filters-card">
        <div className="filters">
          <Filter size={18} className="filter-icon" />
              <Select
                options={[
              { value: '', label: 'Todos os pilotos' },
              ...pilots.map((p) => ({ value: p.id, label: p.nome })),
            ]}
            value={filterPilot}
            onChange={(e) => setFilterPilot(e.target.value)}
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
          {(filterPilot || filterDateStart || filterDateEnd) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFilterPilot('');
                setFilterDateStart('');
                setFilterDateEnd('');
              }}
            >
              Limpar
              </Button>
          )}
          </div>
      </Card>

      {/* Tabela de Voos */}
      <Card>
        <Table
          columns={[
            { key: 'data', header: 'Data', render: (f) => formatDate(f.data) },
            {
              key: 'rota',
              header: 'Rota',
              render: (f) => (
                <div className="route-cell">
                  <span>{f.origem}</span>
                  <ArrowRight size={14} />
                  <span>{f.destino}</span>
          </div>
              ),
            },
            {
              key: 'piloto',
              header: 'Piloto',
              render: (f) => pilots.find((p) => p.id === f.pilotoId)?.nome || '-',
            },
            { key: 'tempoVoo', header: 'Tempo', render: (f) => formatHours(f.tempoVoo) },
            { key: 'horasMotor', header: 'Motor', render: (f) => formatHours(f.horasMotor) },
            { key: 'ciclos', header: 'Ciclos' },
            {
              key: 'combustivel',
              header: 'Combustível',
              render: (f) => (f.combustivelConsumido ? `${f.combustivelConsumido}L` : '-'),
            },
            {
              key: 'actions',
              header: '',
              width: '80px',
              render: (f) =>
                permissions.canCreateFlights && (
                  <div className="table-actions">
                    <button
                      className="action-btn"
                      onClick={() => {
                        setEditingFlight(f);
                        setModalOpen(true);
                      }}
                    >
                      <Edit size={14} />
                    </button>
                    <button className="action-btn danger" onClick={() => handleDelete(f.id)}>
                      <Trash2 size={14} />
                    </button>
                        </div>
                ),
            },
          ]}
          data={flights}
          keyExtractor={(f) => f.id}
          emptyMessage="Nenhum voo registrado"
        />
      </Card>

      {/* Modal de Voo */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingFlight.id ? 'Editar Voo' : 'Novo Voo'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>Salvar</Button>
          </>
        }
      >
        <div className="form-grid">
              <Input
                label="Data"
                type="date"
            value={editingFlight.data}
            onChange={(e) => setEditingFlight({ ...editingFlight, data: e.target.value })}
                required
              />
              <Select
                label="Piloto em Comando"
            options={pilots.map((p) => ({ value: p.id, label: p.nome }))}
            value={editingFlight.pilotoId || ''}
            onChange={(e) => setEditingFlight({ ...editingFlight, pilotoId: e.target.value })}
                required
              />
              <Input
            label="Origem"
            value={editingFlight.origem}
            onChange={(e) => setEditingFlight({ ...editingFlight, origem: e.target.value.toUpperCase() })}
            placeholder="Nome do aeródromo"
                required
              />
              <Input
            label="ICAO Origem"
            value={editingFlight.origemIcao}
            onChange={(e) => setEditingFlight({ ...editingFlight, origemIcao: e.target.value.toUpperCase() })}
            placeholder="SBSP"
          />
          <Input
            label="Destino"
            value={editingFlight.destino}
            onChange={(e) => setEditingFlight({ ...editingFlight, destino: e.target.value.toUpperCase() })}
            placeholder="Nome do aeródromo"
                required
              />
              <Input
            label="ICAO Destino"
            value={editingFlight.destinoIcao}
            onChange={(e) => setEditingFlight({ ...editingFlight, destinoIcao: e.target.value.toUpperCase() })}
            placeholder="SBRJ"
              />
              <Input
            label="Tempo de Voo (horas)"
                type="number"
                step="0.1"
            value={editingFlight.tempoVoo}
            onChange={(e) => {
              const value = parseFloat(e.target.value);
              setEditingFlight({
                ...editingFlight,
                tempoVoo: value,
                horasMotor: value,
                horasCelula: value,
              });
                }}
                required
              />
              <Input
                label="Tempo de Táxi (min)"
                type="number"
            value={editingFlight.tempoTaxi}
            onChange={(e) => setEditingFlight({ ...editingFlight, tempoTaxi: parseInt(e.target.value) })}
              />
              <Input
                label="Ciclos (pousos)"
                type="number"
            value={editingFlight.ciclos}
            onChange={(e) => setEditingFlight({ ...editingFlight, ciclos: parseInt(e.target.value) })}
              />
              <Input
            label="Combustível Consumido (L)"
                type="number"
            value={editingFlight.combustivelConsumido}
            onChange={(e) => setEditingFlight({ ...editingFlight, combustivelConsumido: parseFloat(e.target.value) })}
              />
              <Input
            label="Combustível Abastecido (L)"
                type="number"
            value={editingFlight.combustivelAbastecido}
            onChange={(e) => setEditingFlight({ ...editingFlight, combustivelAbastecido: parseFloat(e.target.value) })}
          />
          <Select
            label="Copiloto (opcional)"
            options={[
              { value: '', label: 'Nenhum' },
              ...pilots.filter((p) => p.id !== editingFlight.pilotoId).map((p) => ({ value: p.id, label: p.nome })),
            ]}
            value={editingFlight.copilotoId || ''}
            onChange={(e) => setEditingFlight({ ...editingFlight, copilotoId: e.target.value || undefined })}
              />
            </div>
        <div style={{ marginTop: '1rem' }}>
          <Input
              label="Observações"
            value={editingFlight.observacoes}
            onChange={(e) => setEditingFlight({ ...editingFlight, observacoes: e.target.value })}
            placeholder="Notas sobre o voo..."
            />
          </div>
      </Modal>
    </div>
  );
}
