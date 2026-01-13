import { useState, useEffect } from 'react';
import { 
  Search, Building2, Plane, Filter, RefreshCw, ChevronRight, 
  CheckCircle2, AlertTriangle, Loader2, ArrowLeft, Calendar
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import Select from '../components/Select';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import { catalogService } from '../services/catalog';
import { catalogImporter } from '../services/catalogImporter';
import { 
  Manufacturer, 
  AircraftCatalogModel, 
  CatalogFilters,
  AircraftType
} from '../types';
import './Catalogo.css';

type ViewMode = 'manufacturers' | 'models' | 'details';

export default function Catalogo() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('manufacturers');
  const [selectedManufacturer, setSelectedManufacturer] = useState<Manufacturer | null>(null);
  const [selectedModel, setSelectedModel] = useState<AircraftCatalogModel | null>(null);
  
  // Estados para fabricantes
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [manufacturerSearch, setManufacturerSearch] = useState('');
  
  // Estados para modelos
  const [models, setModels] = useState<AircraftCatalogModel[]>([]);
  const [modelSearch, setModelSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState<CatalogFilters>({});
  const [filtersOpen, setFiltersOpen] = useState(false);
  
  // Sincronização
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState(catalogService.getSyncStatus());
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadManufacturers();
    loadModels();
    const interval = setInterval(() => {
      setSyncStatus(catalogService.getSyncStatus());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (viewMode === 'manufacturers') {
      loadManufacturers();
    } else if (viewMode === 'models') {
      loadModels();
    }
  }, [viewMode, manufacturerSearch, modelSearch, filters, page]);

  const loadManufacturers = () => {
    const data = catalogService.getManufacturers(manufacturerSearch);
    setManufacturers(data);
  };

  const loadModels = () => {
    const response = catalogService.getModels(filters, page);
    setModels(response.models);
    setTotalPages(response.pagination.totalPages);
  };

  const handleSelectManufacturer = (manufacturer: Manufacturer) => {
    setSelectedManufacturer(manufacturer);
    setViewMode('models');
    setFilters({ ...filters, manufacturerId: manufacturer.id });
    setPage(1);
  };

  const handleSelectModel = (model: AircraftCatalogModel) => {
    setSelectedModel(model);
    setViewMode('details');
  };

  const handleBack = () => {
    if (viewMode === 'details') {
      setViewMode('models');
      setSelectedModel(null);
    } else if (viewMode === 'models') {
      setViewMode('manufacturers');
      setSelectedManufacturer(null);
      setFilters({});
      setPage(1);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await catalogService.syncCatalog(true);
      loadManufacturers();
      loadModels();
      setSyncStatus(catalogService.getSyncStatus());
    } catch (error) {
      console.error('Erro ao sincronizar:', error);
      alert('Erro ao sincronizar catálogo');
    } finally {
      setSyncing(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      alert('Por favor, selecione um arquivo CSV');
      return;
    }

    setUploading(true);
    try {
      await catalogImporter.loadFromFile(file);
      alert('CSV importado com sucesso! Clique em "Atualizar Dados" para sincronizar.');
      setUploadModalOpen(false);
    } catch (error: any) {
      console.error('Erro ao importar CSV:', error);
      alert(`Erro ao importar CSV: ${error.message}`);
    } finally {
      setUploading(false);
      // Limpa o input
      event.target.value = '';
    }
  };

  const handleUseInAircraft = () => {
    if (!selectedModel) return;
    // Navega para cadastro de aeronave com dados pré-preenchidos
    navigate('/aeronaves?manufacturer=' + encodeURIComponent(selectedModel.manufacturerName) +
      '&model=' + encodeURIComponent(selectedModel.model) +
      '&variant=' + encodeURIComponent(selectedModel.variant || ''));
  };

  const getAircraftTypeLabel = (type: AircraftType): string => {
    const labels: Record<AircraftType, string> = {
      pistao: 'Pistão',
      turbohelice: 'Turbohélice',
      jato: 'Jato',
      helicoptero: 'Helicóptero',
    };
    return labels[type] || type;
  };

  return (
    <div className="catalogo-page">
      <div className="page-header">
        <div>
          <h1>Catálogo de Aeronaves</h1>
          <p className="page-subtitle">
            {viewMode === 'manufacturers' && 'Selecione um fabricante'}
            {viewMode === 'models' && selectedManufacturer && `Modelos - ${selectedManufacturer.name}`}
            {viewMode === 'details' && selectedModel && `${selectedModel.manufacturerName} ${selectedModel.model}`}
          </p>
        </div>
        <div className="header-actions">
          {syncStatus && (
            <div className="sync-status">
              <Calendar size={16} />
              <span>
                Última atualização: {new Date(syncStatus.lastSync).toLocaleString('pt-BR')}
              </span>
            </div>
          )}
          <Button
            variant="outline"
            onClick={() => setUploadModalOpen(true)}
          >
            Importar CSV
          </Button>
          <Button
            variant="secondary"
            icon={<RefreshCw size={16} className={syncing ? 'spinning' : ''} />}
            onClick={handleSync}
            disabled={syncing}
          >
            {syncing ? 'Sincronizando...' : 'Atualizar Dados'}
          </Button>
        </div>
      </div>

      {viewMode !== 'manufacturers' && (
        <Button
          variant="outline"
          icon={<ArrowLeft size={16} />}
          onClick={handleBack}
          style={{ marginBottom: '1rem' }}
        >
          Voltar
        </Button>
      )}

      {viewMode === 'manufacturers' && (
        <Card title="Fabricantes">
          <div className="search-bar">
            <Input
              placeholder="Buscar fabricante..."
              value={manufacturerSearch}
              onChange={(e) => setManufacturerSearch(e.target.value)}
              icon={<Search size={16} />}
            />
          </div>
          <div className="manufacturers-grid">
            {manufacturers.map((manufacturer) => (
              <div
                key={manufacturer.id}
                className="manufacturer-card"
                onClick={() => handleSelectManufacturer(manufacturer)}
              >
                <Building2 size={32} />
                <div className="manufacturer-info">
                  <h3>{manufacturer.name}</h3>
                  <p>{manufacturer.modelCount} modelo{manufacturer.modelCount !== 1 ? 's' : ''}</p>
                </div>
                <ChevronRight size={20} />
              </div>
            ))}
            {manufacturers.length === 0 && (
              <div className="empty-state">
                <Plane size={48} />
                <p>Nenhum fabricante encontrado</p>
              </div>
            )}
          </div>
        </Card>
      )}

      {viewMode === 'models' && (
        <>
          <Card title="Modelos">
            <div className="models-toolbar">
              <div className="search-bar">
                <Input
                  placeholder="Buscar modelo..."
                  value={modelSearch}
                  onChange={(e) => setModelSearch(e.target.value)}
                  icon={<Search size={16} />}
                />
              </div>
              <Button
                variant="outline"
                icon={<Filter size={16} />}
                onClick={() => setFiltersOpen(true)}
              >
                Filtros
              </Button>
            </div>

            <div className="models-grid">
              {models.map((model) => (
                <div
                  key={model.id}
                  className="model-card"
                  onClick={() => handleSelectModel(model)}
                >
                  <div className="model-header">
                    <div>
                      <h3>{model.model}</h3>
                      {model.variant && <span className="variant">{model.variant}</span>}
                    </div>
                    <Badge variant={model.isComplete ? 'success' : 'warning'} size="sm">
                      {model.isComplete ? 'Completo' : 'Incompleto'}
                    </Badge>
                  </div>
                  <div className="model-specs-summary">
                    {model.specsSummary.seats && (
                      <div className="spec-item">
                        <span className="spec-label">Assentos:</span>
                        <span>{model.specsSummary.seats}</span>
                      </div>
                    )}
                    {model.specsSummary.range && (
                      <div className="spec-item">
                        <span className="spec-label">Alcance:</span>
                        <span>{model.specsSummary.range} NM</span>
                      </div>
                    )}
                    {model.specsSummary.cruiseSpeed && (
                      <div className="spec-item">
                        <span className="spec-label">Cruzeiro:</span>
                        <span>{model.specsSummary.cruiseSpeed} kt</span>
                      </div>
                    )}
                    <div className="spec-item">
                      <span className="spec-label">Tipo:</span>
                      <span>{getAircraftTypeLabel(model.aircraftType)}</span>
                    </div>
                  </div>
                  <ChevronRight size={20} />
                </div>
              ))}
              {models.length === 0 && (
                <div className="empty-state">
                  <Plane size={48} />
                  <p>Nenhum modelo encontrado</p>
                </div>
              )}
            </div>

            {totalPages > 1 && (
              <div className="pagination">
                <Button
                  variant="outline"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Anterior
                </Button>
                <span>
                  Página {page} de {totalPages}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Próxima
                </Button>
              </div>
            )}
          </Card>
        </>
      )}

      {viewMode === 'details' && selectedModel && (
        <ModelDetails model={selectedModel} onUseInAircraft={handleUseInAircraft} />
      )}

      {/* Modal de Filtros */}
      <Modal
        isOpen={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Filtros"
        size="md"
      >
        <div className="filters-content">
          <Select
            label="Tipo de Aeronave"
            value={filters.aircraftType?.[0] || ''}
            onChange={(e) => {
              const value = e.target.value;
              setFilters({
                ...filters,
                aircraftType: value ? [value as AircraftType] : undefined,
              });
            }}
            options={[
              { value: '', label: 'Todos' },
              { value: 'pistao', label: 'Pistão' },
              { value: 'turbohelice', label: 'Turbohélice' },
              { value: 'jato', label: 'Jato' },
              { value: 'helicoptero', label: 'Helicóptero' },
            ]}
          />
          <Input
            label="Alcance Mínimo (NM)"
            type="number"
            value={filters.minRange || ''}
            onChange={(e) => setFilters({ ...filters, minRange: e.target.value ? parseInt(e.target.value) : undefined })}
          />
          <Input
            label="Alcance Máximo (NM)"
            type="number"
            value={filters.maxRange || ''}
            onChange={(e) => setFilters({ ...filters, maxRange: e.target.value ? parseInt(e.target.value) : undefined })}
          />
          <Input
            label="Assentos Mínimo"
            type="number"
            value={filters.minSeats || ''}
            onChange={(e) => setFilters({ ...filters, minSeats: e.target.value ? parseInt(e.target.value) : undefined })}
          />
          <Input
            label="Assentos Máximo"
            type="number"
            value={filters.maxSeats || ''}
            onChange={(e) => setFilters({ ...filters, maxSeats: e.target.value ? parseInt(e.target.value) : undefined })}
          />
          <div className="filter-actions">
            <Button onClick={() => {
              setFilters({});
              setFiltersOpen(false);
            }}>
              Limpar
            </Button>
            <Button onClick={() => setFiltersOpen(false)}>
              Aplicar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal de Upload CSV */}
      <Modal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        title="Importar CSV do Catálogo"
        size="md"
      >
        <div className="upload-content">
          <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
            Faça upload do arquivo CSV com os dados do catálogo de aeronaves.
          </p>
          <div className="upload-instructions">
            <h4>Formato esperado:</h4>
            <code style={{ 
              display: 'block', 
              padding: '0.75rem', 
              background: 'var(--bg-secondary)', 
              borderRadius: 'var(--radius-md)',
              marginTop: '0.5rem',
              fontSize: '0.875rem'
            }}>
              manufacturer,model,variant,aircraft_type,year_start,year_end
            </code>
            <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Colunas obrigatórias: <strong>manufacturer</strong>, <strong>model</strong>, <strong>aircraft_type</strong>
              <br />
              Colunas opcionais: <strong>variant</strong>, <strong>year_start</strong>, <strong>year_end</strong>
            </p>
          </div>
          <div style={{ marginTop: '1.5rem' }}>
            <label className="file-upload-label">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                disabled={uploading}
                style={{ display: 'none' }}
              />
              <Button
                variant="secondary"
                disabled={uploading}
                style={{ width: '100%' }}
              >
                {uploading ? 'Importando...' : 'Selecionar Arquivo CSV'}
              </Button>
            </label>
          </div>
          {catalogImporter.hasCachedCSV() && (
            <div style={{ 
              marginTop: '1rem', 
              padding: '0.75rem', 
              background: 'var(--success-light)', 
              borderRadius: 'var(--radius-md)',
              fontSize: '0.875rem'
            }}>
              ✓ CSV já importado anteriormente
              {catalogImporter.getCacheTimestamp() && (
                <div style={{ marginTop: '0.25rem', color: 'var(--text-secondary)' }}>
                  Importado em: {new Date(catalogImporter.getCacheTimestamp()!).toLocaleString('pt-BR')}
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

function ModelDetails({ 
  model, 
  onUseInAircraft 
}: { 
  model: AircraftCatalogModel;
  onUseInAircraft: () => void;
}) {
  const [loading] = useState(false);

  return (
    <div className="model-details">
      <Card title={`${model.manufacturerName} ${model.model}${model.variant ? ` ${model.variant}` : ''}`}>
        <div className="details-header">
          <div>
            <Badge variant={model.isComplete ? 'success' : 'warning'} size="md">
              {model.isComplete ? (
                <>
                  <CheckCircle2 size={16} style={{ marginRight: 4 }} />
                  Especificações Completas
                </>
              ) : (
                <>
                  <AlertTriangle size={16} style={{ marginRight: 4 }} />
                  Especificações Incompletas
                </>
              )}
            </Badge>
            {model.missingFields.length > 0 && (
              <p className="missing-fields">
                Campos faltantes: {model.missingFields.join(', ')}
              </p>
            )}
          </div>
          <Button onClick={onUseInAircraft}>
            Usar no Cadastro de Aeronave
          </Button>
        </div>

        {loading ? (
          <div className="loading-state">
            <Loader2 size={32} className="spinning" />
            <p>Carregando especificações...</p>
          </div>
        ) : (
          <div className="specs-sections">
            {/* Performance */}
            <div className="specs-section">
              <h3>Performance</h3>
              <div className="specs-grid">
                {model.specsSummary.cruiseSpeed && (
                  <div className="spec-card">
                    <span className="spec-label">Velocidade de Cruzeiro</span>
                    <span className="spec-value">{model.specsSummary.cruiseSpeed} KTAS</span>
                  </div>
                )}
                {model.specsSummary.range && (
                  <div className="spec-card">
                    <span className="spec-label">Alcance</span>
                    <span className="spec-value">{model.specsSummary.range} NM</span>
                  </div>
                )}
              </div>
            </div>

            {/* Pesos */}
            {model.specsSummary.mtow && (
              <div className="specs-section">
                <h3>Pesos</h3>
                <div className="specs-grid">
                  <div className="spec-card">
                    <span className="spec-label">MTOW</span>
                    <span className="spec-value">{model.specsSummary.mtow.toLocaleString()} lbs</span>
                  </div>
                </div>
              </div>
            )}

            {/* Propulsão */}
            {model.specsSummary.engineType && (
              <div className="specs-section">
                <h3>Propulsão</h3>
                <div className="specs-grid">
                  <div className="spec-card">
                    <span className="spec-label">Motor</span>
                    <span className="spec-value">{model.specsSummary.engineType}</span>
                  </div>
                  {model.specsSummary.fuelType && (
                    <div className="spec-card">
                      <span className="spec-label">Combustível</span>
                      <span className="spec-value">{model.specsSummary.fuelType === 'avgas' ? 'AVGAS' : 'Jet A'}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Dimensões */}
            {model.specsSummary.seats && (
              <div className="specs-section">
                <h3>Dimensões</h3>
                <div className="specs-grid">
                  <div className="spec-card">
                    <span className="spec-label">Assentos</span>
                    <span className="spec-value">{model.specsSummary.seats}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Fontes */}
            {model.sources.length > 0 && (
              <div className="specs-section">
                <h3>Fontes de Dados</h3>
                <div className="sources-list">
                  {model.sources.map((source, idx) => (
                    <div key={idx} className="source-item">
                      <span className="source-type">{source.type}</span>
                      {source.url && (
                        <a href={source.url} target="_blank" rel="noopener noreferrer">
                          Ver fonte
                        </a>
                      )}
                      <span className="source-date">
                        {new Date(source.collectedAt).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="specs-section">
              <p className="last-updated">
                Última atualização: {new Date(model.lastUpdated).toLocaleString('pt-BR')}
              </p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}