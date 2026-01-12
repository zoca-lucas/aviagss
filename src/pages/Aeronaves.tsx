import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Plane, Settings } from 'lucide-react';
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
import { Aircraft, AircraftComponent } from '../types';
import { formatHours, getAircraftTypeLabel, getFuelTypeLabel } from '../utils/format';
import './Aeronaves.css';

const tiposAeronave = [
  { value: 'pistao', label: 'Pistão' },
  { value: 'turbohelice', label: 'Turbohélice' },
  { value: 'jato', label: 'Jato' },
  { value: 'helicoptero', label: 'Helicóptero' },
];

const tiposCombustivel = [
  { value: 'avgas', label: 'AVGAS' },
  { value: 'jet-a', label: 'Jet A' },
];

const initialAircraft: Partial<Aircraft> = {
  prefixo: '',
  modelo: '',
  fabricante: '',
  numeroSerie: '',
  anoFabricacao: new Date().getFullYear(),
  tipo: 'pistao',
  baseHangar: '',
  consumoMedio: 36,
  velocidadeCruzeiro: 120,
  tipoCombustivel: 'avgas',
  unidadeCombustivel: 'litros',
  horasCelula: 0,
  ciclosTotais: 0,
  custoHora: 0,
  reservaCombustivel: 45,
  margemSeguranca: 10,
  observacoes: '',
  active: true,
};

export default function Aeronaves() {
  const { user, permissions } = useAuth();
  const { aircrafts, refreshAircrafts, selectAircraft, selectedAircraft } = useAircraft();
  const [modalOpen, setModalOpen] = useState(false);
  const [componentModalOpen, setComponentModalOpen] = useState(false);
  const [editingAircraft, setEditingAircraft] = useState<Partial<Aircraft>>(initialAircraft);
  const [editingComponent, setEditingComponent] = useState<Partial<AircraftComponent>>({});
  const [components, setComponents] = useState<AircraftComponent[]>([]);
  const [selectedForComponents, setSelectedForComponents] = useState<Aircraft | null>(null);

  useEffect(() => {
    if (selectedForComponents) {
      setComponents(storage.getComponents(selectedForComponents.id));
    }
  }, [selectedForComponents]);

  const handleSave = () => {
    if (!user || !editingAircraft.prefixo || !editingAircraft.modelo) return;

    const aircraft = {
      ...initialAircraft,
      ...editingAircraft,
    } as Aircraft;

    storage.saveAircraft(aircraft, user.id, user.nome);
    refreshAircrafts();
    setModalOpen(false);
    setEditingAircraft(initialAircraft);
  };

  const handleEdit = (aircraft: Aircraft) => {
    setEditingAircraft(aircraft);
    setModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (!user) return;
    if (confirm('Tem certeza que deseja excluir esta aeronave?')) {
      storage.deleteAircraft(id, user.id, user.nome);
      refreshAircrafts();
    }
  };

  const handleSaveComponent = () => {
    if (!user || !selectedForComponents || !editingComponent.serial) return;

    const component = {
      ...editingComponent,
      aircraftId: selectedForComponents.id,
    } as AircraftComponent;

    storage.saveComponent(component, user.id, user.nome);
    setComponents(storage.getComponents(selectedForComponents.id));
    setComponentModalOpen(false);
    setEditingComponent({});
  };

  const handleDeleteComponent = (id: string) => {
    if (!user) return;
    if (confirm('Tem certeza que deseja excluir este componente?')) {
      storage.deleteComponent(id, user.id, user.nome);
      if (selectedForComponents) {
        setComponents(storage.getComponents(selectedForComponents.id));
      }
    }
  };

  return (
    <div className="aeronaves-page">
      <div className="page-header">
        <div>
          <h1>Aeronaves</h1>
          <p className="page-subtitle">Gerencie suas aeronaves e componentes</p>
        </div>
        {permissions.canManageAircraft && (
          <Button
            icon={<Plus size={18} />}
            onClick={() => {
              setEditingAircraft(initialAircraft);
              setModalOpen(true);
            }}
          >
            Nova Aeronave
          </Button>
        )}
      </div>

      <div className="aeronaves-grid">
        {aircrafts.map((aircraft) => (
          <Card key={aircraft.id} className="aircraft-card" hover>
            <div className="aircraft-header">
              <div className="aircraft-icon">
                <Plane size={28} />
              </div>
              <div className="aircraft-actions">
                {permissions.canManageAircraft && (
                  <>
                    <button
                      className="action-btn"
                      onClick={() => handleEdit(aircraft)}
                      title="Editar"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      className="action-btn"
                      onClick={() => {
                        setSelectedForComponents(aircraft);
                      }}
                      title="Componentes"
                    >
                      <Settings size={16} />
                    </button>
                    <button
                      className="action-btn danger"
                      onClick={() => handleDelete(aircraft.id)}
                      title="Excluir"
                    >
                      <Trash2 size={16} />
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="aircraft-info">
              <h3 className="aircraft-prefix">{aircraft.prefixo}</h3>
              <p className="aircraft-model">{aircraft.fabricante} {aircraft.modelo}</p>
              <Badge variant="info">{getAircraftTypeLabel(aircraft.tipo)}</Badge>
            </div>

            <div className="aircraft-stats">
              <div className="stat">
                <span className="stat-label">Horas Célula</span>
                <span className="stat-value">{formatHours(aircraft.horasCelula)}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Ciclos</span>
                <span className="stat-value">{aircraft.ciclosTotais}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Consumo</span>
                <span className="stat-value">{aircraft.consumoMedio} L/h</span>
              </div>
              <div className="stat">
                <span className="stat-label">Cruzeiro</span>
                <span className="stat-value">{aircraft.velocidadeCruzeiro} kt</span>
              </div>
            </div>

            <div className="aircraft-footer">
              <span>{getFuelTypeLabel(aircraft.tipoCombustivel)}</span>
              <span>{aircraft.baseHangar || 'Sem base'}</span>
            </div>

            <Button
              variant="outline"
              className="select-btn"
              onClick={() => selectAircraft(aircraft.id)}
              disabled={selectedAircraft?.id === aircraft.id}
            >
              {selectedAircraft?.id === aircraft.id ? 'Selecionada' : 'Selecionar'}
            </Button>
          </Card>
        ))}

        {aircrafts.length === 0 && (
          <div className="empty-state">
            <Plane size={64} className="empty-state-icon" />
            <h3>Nenhuma aeronave cadastrada</h3>
            <p>Cadastre sua primeira aeronave para começar a usar o sistema.</p>
            {permissions.canManageAircraft && (
              <Button onClick={() => setModalOpen(true)}>Cadastrar Aeronave</Button>
            )}
          </div>
        )}
      </div>

      {/* Modal de Aeronave */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingAircraft.id ? 'Editar Aeronave' : 'Nova Aeronave'}
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
            label="Prefixo"
            value={editingAircraft.prefixo}
            onChange={(e) => setEditingAircraft({ ...editingAircraft, prefixo: e.target.value.toUpperCase() })}
            placeholder="PT-XXX"
            required
          />
          <Input
            label="Fabricante"
            value={editingAircraft.fabricante}
            onChange={(e) => setEditingAircraft({ ...editingAircraft, fabricante: e.target.value })}
            placeholder="Cessna"
            required
          />
          <Input
            label="Modelo"
            value={editingAircraft.modelo}
            onChange={(e) => setEditingAircraft({ ...editingAircraft, modelo: e.target.value })}
            placeholder="172"
            required
          />
          <Input
            label="Número de Série"
            value={editingAircraft.numeroSerie}
            onChange={(e) => setEditingAircraft({ ...editingAircraft, numeroSerie: e.target.value })}
          />
          <Input
            label="Ano de Fabricação"
            type="number"
            value={editingAircraft.anoFabricacao}
            onChange={(e) => setEditingAircraft({ ...editingAircraft, anoFabricacao: parseInt(e.target.value) })}
          />
          <Select
            label="Tipo"
            options={tiposAeronave}
            value={editingAircraft.tipo}
            onChange={(e) => setEditingAircraft({ ...editingAircraft, tipo: e.target.value as Aircraft['tipo'] })}
          />
          <Input
            label="Base/Hangar"
            value={editingAircraft.baseHangar}
            onChange={(e) => setEditingAircraft({ ...editingAircraft, baseHangar: e.target.value })}
            placeholder="SBSP"
          />
          <Select
            label="Combustível"
            options={tiposCombustivel}
            value={editingAircraft.tipoCombustivel}
            onChange={(e) => setEditingAircraft({ ...editingAircraft, tipoCombustivel: e.target.value as Aircraft['tipoCombustivel'] })}
          />
          <Input
            label="Consumo Médio (L/h)"
            type="number"
            value={editingAircraft.consumoMedio}
            onChange={(e) => setEditingAircraft({ ...editingAircraft, consumoMedio: parseFloat(e.target.value) })}
          />
          <Input
            label="Velocidade Cruzeiro (kt)"
            type="number"
            value={editingAircraft.velocidadeCruzeiro}
            onChange={(e) => setEditingAircraft({ ...editingAircraft, velocidadeCruzeiro: parseInt(e.target.value) })}
          />
          <Input
            label="Horas Célula"
            type="number"
            value={editingAircraft.horasCelula}
            onChange={(e) => setEditingAircraft({ ...editingAircraft, horasCelula: parseFloat(e.target.value) })}
          />
          <Input
            label="Ciclos Totais"
            type="number"
            value={editingAircraft.ciclosTotais}
            onChange={(e) => setEditingAircraft({ ...editingAircraft, ciclosTotais: parseInt(e.target.value) })}
          />
          <Input
            label="Custo por Hora (R$)"
            type="number"
            value={editingAircraft.custoHora}
            onChange={(e) => setEditingAircraft({ ...editingAircraft, custoHora: parseFloat(e.target.value) })}
          />
          <Input
            label="Reserva Combustível (min)"
            type="number"
            value={editingAircraft.reservaCombustivel}
            onChange={(e) => setEditingAircraft({ ...editingAircraft, reservaCombustivel: parseInt(e.target.value) })}
          />
        </div>
      </Modal>

      {/* Modal de Componentes */}
      <Modal
        isOpen={!!selectedForComponents}
        onClose={() => setSelectedForComponents(null)}
        title={`Componentes - ${selectedForComponents?.prefixo}`}
        size="lg"
      >
        <div className="components-section">
          <div className="components-header">
            <h4>Motor(es), Hélice(s) e Célula</h4>
            <Button
              size="sm"
              icon={<Plus size={16} />}
              onClick={() => {
                setEditingComponent({ tipo: 'motor' });
                setComponentModalOpen(true);
              }}
            >
              Adicionar
            </Button>
          </div>

          <Table
            columns={[
              { key: 'tipo', header: 'Tipo', render: (c) => c.tipo.charAt(0).toUpperCase() + c.tipo.slice(1) },
              { key: 'serial', header: 'Serial' },
              { key: 'modelo', header: 'Modelo' },
              { key: 'horasAtuais', header: 'Horas', render: (c) => formatHours(c.horasAtuais) },
              { key: 'limiteTSO', header: 'TSO Limite', render: (c) => c.limiteTSO ? formatHours(c.limiteTSO) : '-' },
              {
                key: 'actions',
                header: '',
                width: '80px',
                render: (c) => (
                  <div className="table-actions">
                    <button
                      className="action-btn"
                      onClick={() => {
                        setEditingComponent(c);
                        setComponentModalOpen(true);
                      }}
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      className="action-btn danger"
                      onClick={() => handleDeleteComponent(c.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ),
              },
            ]}
            data={components}
            keyExtractor={(c) => c.id}
            emptyMessage="Nenhum componente cadastrado"
          />
        </div>
      </Modal>

      {/* Modal de Edição de Componente */}
      <Modal
        isOpen={componentModalOpen}
        onClose={() => setComponentModalOpen(false)}
        title={editingComponent.id ? 'Editar Componente' : 'Novo Componente'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setComponentModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveComponent}>Salvar</Button>
          </>
        }
      >
        <div className="form-grid">
          <Select
            label="Tipo"
            options={[
              { value: 'motor', label: 'Motor' },
              { value: 'helice', label: 'Hélice' },
              { value: 'celula', label: 'Célula' },
            ]}
            value={editingComponent.tipo || 'motor'}
            onChange={(e) => setEditingComponent({ ...editingComponent, tipo: e.target.value as AircraftComponent['tipo'] })}
          />
          <Input
            label="Posição"
            value={editingComponent.posicao || ''}
            onChange={(e) => setEditingComponent({ ...editingComponent, posicao: e.target.value })}
            placeholder="Esquerdo, Direito, etc."
          />
          <Input
            label="Serial"
            value={editingComponent.serial || ''}
            onChange={(e) => setEditingComponent({ ...editingComponent, serial: e.target.value })}
            required
          />
          <Input
            label="Modelo"
            value={editingComponent.modelo || ''}
            onChange={(e) => setEditingComponent({ ...editingComponent, modelo: e.target.value })}
          />
          <Input
            label="Fabricante"
            value={editingComponent.fabricante || ''}
            onChange={(e) => setEditingComponent({ ...editingComponent, fabricante: e.target.value })}
          />
          <Input
            label="Horas Atuais"
            type="number"
            value={editingComponent.horasAtuais || 0}
            onChange={(e) => setEditingComponent({ ...editingComponent, horasAtuais: parseFloat(e.target.value) })}
          />
          <Input
            label="Limite TSO"
            type="number"
            value={editingComponent.limiteTSO || ''}
            onChange={(e) => setEditingComponent({ ...editingComponent, limiteTSO: parseFloat(e.target.value) })}
          />
          <Input
            label="Ciclos Atuais"
            type="number"
            value={editingComponent.ciclosAtuais || ''}
            onChange={(e) => setEditingComponent({ ...editingComponent, ciclosAtuais: parseInt(e.target.value) })}
          />
        </div>
      </Modal>
    </div>
  );
}
