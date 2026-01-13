import {
  Manufacturer,
  AircraftCatalogModel,
  CatalogFilters,
  CatalogResponse,
  CatalogSyncStatus,
  AircraftModel,
} from '../types';
import { aircraftSpecsService } from './aircraftSpecs';
import { catalogImporter, CanonicalModel } from './catalogImporter';

const STORAGE_KEYS = {
  MANUFACTURERS: 'aerogestao_catalog_manufacturers',
  MODELS: 'aerogestao_catalog_models',
  SYNC_STATUS: 'aerogestao_catalog_sync_status',
};

const PAGE_SIZE = 20;

class CatalogService {
  private manufacturers: Map<string, Manufacturer> = new Map();
  private models: Map<string, AircraftCatalogModel> = new Map();
  private syncStatus: CatalogSyncStatus | null = null;

  constructor() {
    this.loadFromCache();
  }

  /**
   * GET /manufacturers
   * Lista todos os fabricantes (alfabética, com busca)
   */
  getManufacturers(search?: string): Manufacturer[] {
    let manufacturers = Array.from(this.manufacturers.values());

    if (search) {
      const searchLower = this.normalizeString(search);
      manufacturers = manufacturers.filter(m => 
        this.normalizeString(m.name).includes(searchLower)
      );
    }

    return manufacturers.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * GET /manufacturers/:id/models
   * Lista modelos de um fabricante
   */
  getManufacturerModels(
    manufacturerId: string,
    search?: string
  ): AircraftCatalogModel[] {
    let models = Array.from(this.models.values()).filter(
      m => m.manufacturerId === manufacturerId
    );

    if (search) {
      const searchLower = this.normalizeString(search);
      models = models.filter(m => 
        this.normalizeString(m.model).includes(searchLower) ||
        (m.variant && this.normalizeString(m.variant).includes(searchLower))
      );
    }

    return models.sort((a, b) => {
      // Ordena por modelo, depois por variante
      if (a.model !== b.model) {
        return a.model.localeCompare(b.model);
      }
      return (a.variant || '').localeCompare(b.variant || '');
    });
  }

  /**
   * GET /models/:id
   * Retorna modelo com specs completas
   */
  getModel(id: string): AircraftCatalogModel | null {
    return this.models.get(id) || null;
  }

  /**
   * GET /models (com filtros e paginação)
   */
  getModels(
    filters: CatalogFilters = {},
    page: number = 1
  ): CatalogResponse {
    let filtered = Array.from(this.models.values());

    // Filtro por fabricante
    if (filters.manufacturerId) {
      filtered = filtered.filter(m => m.manufacturerId === filters.manufacturerId);
    }

    // Filtro por tipo
    if (filters.aircraftType && filters.aircraftType.length > 0) {
      filtered = filtered.filter(m => filters.aircraftType!.includes(m.aircraftType));
    }

    // Filtro por busca
    if (filters.search) {
      const searchLower = this.normalizeString(filters.search);
      filtered = filtered.filter(m =>
        this.normalizeString(m.manufacturerName).includes(searchLower) ||
        this.normalizeString(m.model).includes(searchLower) ||
        (m.variant && this.normalizeString(m.variant).includes(searchLower))
      );
    }

    // Filtro por alcance
    if (filters.minRange !== undefined) {
      filtered = filtered.filter(m => 
        m.specsSummary.range && m.specsSummary.range >= filters.minRange!
      );
    }
    if (filters.maxRange !== undefined) {
      filtered = filtered.filter(m => 
        m.specsSummary.range && m.specsSummary.range <= filters.maxRange!
      );
    }

    // Filtro por assentos
    if (filters.minSeats !== undefined) {
      filtered = filtered.filter(m => 
        m.specsSummary.seats && m.specsSummary.seats >= filters.minSeats!
      );
    }
    if (filters.maxSeats !== undefined) {
      filtered = filtered.filter(m => 
        m.specsSummary.seats && m.specsSummary.seats <= filters.maxSeats!
      );
    }

    // Filtro por MTOW
    if (filters.minMTOW !== undefined) {
      filtered = filtered.filter(m => 
        m.specsSummary.mtow && m.specsSummary.mtow >= filters.minMTOW!
      );
    }
    if (filters.maxMTOW !== undefined) {
      filtered = filtered.filter(m => 
        m.specsSummary.mtow && m.specsSummary.mtow <= filters.maxMTOW!
      );
    }

    // Filtro por tipo de combustível
    if (filters.fuelType && filters.fuelType.length > 0) {
      filtered = filtered.filter(m => 
        m.specsSummary.fuelType && filters.fuelType!.includes(m.specsSummary.fuelType)
      );
    }

    // Filtro por specs completas
    if (filters.hasCompleteSpecs !== undefined) {
      filtered = filtered.filter(m => m.isComplete === filters.hasCompleteSpecs);
    }

    // Paginação
    const total = filtered.length;
    const totalPages = Math.ceil(total / PAGE_SIZE);
    const start = (page - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    const paginated = filtered.slice(start, end);

    return {
      models: paginated,
      pagination: {
        page,
        pageSize: PAGE_SIZE,
        total,
        totalPages,
      },
      filters,
    };
  }

  /**
   * Adiciona/atualiza fabricante
   */
  saveManufacturer(manufacturer: Manufacturer): void {
    this.manufacturers.set(manufacturer.id, manufacturer);
    this.saveToCache();
  }

  /**
   * Adiciona/atualiza modelo no catálogo
   */
  saveModel(model: AircraftCatalogModel): void {
    this.models.set(model.id, model);
    
    // Atualiza contador do fabricante
    const manufacturer = this.manufacturers.get(model.manufacturerId);
    if (manufacturer) {
      const modelCount = Array.from(this.models.values()).filter(
        m => m.manufacturerId === model.manufacturerId
      ).length;
      manufacturer.modelCount = modelCount;
      manufacturer.lastUpdated = new Date().toISOString();
      this.manufacturers.set(manufacturer.id, manufacturer);
    }
    
    this.saveToCache();
  }

  /**
   * Busca ou cria specs para um modelo e vincula ao catálogo
   */
  async linkModelSpecs(
    catalogModelId: string,
    manufacturer: string,
    model: string,
    variant?: string,
    year?: number
  ): Promise<string | null> {
    const catalogModel = this.models.get(catalogModelId);
    if (!catalogModel) return null;

    // Busca specs usando o serviço existente
    const specs = await aircraftSpecsService.getAircraftSpecs(
      manufacturer,
      model,
      variant,
      year
    );

    if (!specs) return null;

    // Cria AircraftModel para armazenar specs completas
    const aircraftModel: AircraftModel = {
      id: catalogModel.specsId || crypto.randomUUID(),
      manufacturer,
      model,
      variant,
      year,
      specs,
      createdAt: catalogModel.createdAt,
      updatedAt: new Date().toISOString(),
    };

    // Atualiza modelo do catálogo
    catalogModel.specsId = aircraftModel.id;
    catalogModel.isComplete = specs.isComplete;
    catalogModel.missingFields = specs.missingFields;
    catalogModel.sources = specs.sources;
    catalogModel.lastUpdated = new Date().toISOString();

    // Atualiza specs summary
    if (specs.mtow?.value) {
      catalogModel.specsSummary.mtow = specs.mtow.value;
    }
    if (specs.seats) {
      catalogModel.specsSummary.seats = specs.seats;
    }
    if (specs.range?.value) {
      catalogModel.specsSummary.range = specs.range.value;
    }
    if (specs.cruiseSpeed?.normal?.value) {
      catalogModel.specsSummary.cruiseSpeed = specs.cruiseSpeed.normal.value;
    }
    if (specs.engineType) {
      catalogModel.specsSummary.engineType = specs.engineType;
    }
    if (specs.fuelType) {
      catalogModel.specsSummary.fuelType = specs.fuelType;
    }

    this.saveModel(catalogModel);
    
    // Salva specs completas no cache do aircraftSpecsService
    // (já está sendo feito pelo getAircraftSpecs, mas garantimos aqui)
    
    return aircraftModel.id;
  }

  /**
   * Pipeline de sincronização do catálogo
   * Etapa 1: Construir lista canônica
   * Etapa 2: Coletar specs para cada modelo
   * Etapa 3: Atualizar incrementalmente
   */
  async syncCatalog(incremental: boolean = true): Promise<void> {
    this.syncStatus = {
      lastSync: new Date().toISOString(),
      status: 'running',
      progress: {
        total: 0,
        processed: 0,
        errors: 0,
      },
    };
    this.saveSyncStatus();

    try {
      // Etapa 1: Construir lista canônica de fabricantes e modelos
      const canonicalData = await this.buildCanonicalList();
      
      this.syncStatus.progress!.total = canonicalData.models.length;
      this.saveSyncStatus();

      // Etapa 2: Processar cada modelo
      for (const modelData of canonicalData.models) {
        try {
          // Verifica se já existe (incremental)
          let existing: AircraftCatalogModel | undefined;
          if (incremental) {
            existing = Array.from(this.models.values()).find(m =>
              m.manufacturerName.toLowerCase() === modelData.manufacturer.toLowerCase() &&
              m.model.toLowerCase() === modelData.model.toLowerCase() &&
              (!modelData.variant || m.variant === modelData.variant)
            );

            if (existing) {
              // Atualiza apenas se specs estiverem incompletas ou desatualizadas
              const age = Date.now() - new Date(existing.lastUpdated).getTime();
              const staleDays = 90;
              if (existing.isComplete && age < staleDays * 24 * 60 * 60 * 1000) {
                this.syncStatus.progress!.processed++;
                this.saveSyncStatus();
                continue;
              }
            }
          }

          // Cria/atualiza fabricante
          let manufacturer = Array.from(this.manufacturers.values()).find(m =>
            this.normalizeString(m.name) === this.normalizeString(modelData.manufacturer)
          );

          if (!manufacturer) {
            manufacturer = {
              id: crypto.randomUUID(),
              name: modelData.manufacturer,
              normalizedName: this.normalizeString(modelData.manufacturer),
              modelCount: 0,
              lastUpdated: new Date().toISOString(),
              createdAt: new Date().toISOString(),
            };
            this.saveManufacturer(manufacturer);
          }

          // Cria/atualiza modelo
          const catalogModel: AircraftCatalogModel = {
            id: existing?.id || crypto.randomUUID(),
            manufacturerId: manufacturer.id,
            manufacturerName: manufacturer.name,
            model: modelData.model,
            normalizedModel: this.normalizeString(modelData.model),
            variant: modelData.variant,
            yearRange: modelData.yearRange,
            aircraftType: modelData.aircraftType,
            specsSummary: {},
            isComplete: false,
            missingFields: [],
            sources: [],
            lastUpdated: new Date().toISOString(),
            createdAt: existing?.createdAt || new Date().toISOString(),
          };

          this.saveModel(catalogModel);

          // Etapa 3: Coleta specs
          await this.linkModelSpecs(
            catalogModel.id,
            modelData.manufacturer,
            modelData.model,
            modelData.variant,
            modelData.yearRange?.start
          );

          this.syncStatus.progress!.processed++;
          this.saveSyncStatus();
        } catch (error) {
          console.error(`Erro ao processar modelo ${modelData.manufacturer} ${modelData.model}:`, error);
          this.syncStatus.progress!.errors++;
          this.saveSyncStatus();
        }
      }

      this.syncStatus.status = 'idle';
      this.syncStatus.nextSync = new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000 // Próxima sync em 7 dias
      ).toISOString();
    } catch (error) {
      this.syncStatus.status = 'error';
      this.syncStatus.error = error instanceof Error ? error.message : 'Erro desconhecido';
    } finally {
      this.saveSyncStatus();
    }
  }

  /**
   * Construir lista canônica de fabricantes e modelos
   * Tenta carregar do CSV, se não encontrar usa lista hardcoded como fallback
   */
  private async buildCanonicalList(): Promise<{
    manufacturers: string[];
    models: CanonicalModel[];
  }> {
    try {
      // Tenta carregar do CSV
      const models = await catalogImporter.loadFromCSV();
      const manufacturers = Array.from(new Set(models.map(m => m.manufacturer)));
      
      return { manufacturers, models };
    } catch (error) {
      console.warn('Erro ao carregar CSV, usando lista padrão:', error);
      
      // Fallback: lista hardcoded
      const canonicalModels: CanonicalModel[] = [
        // Beechcraft
        { manufacturer: 'Beechcraft', model: 'King Air C90', variant: 'C90GTi', aircraftType: 'turbohelice' },
        { manufacturer: 'Beechcraft', model: 'King Air B200', aircraftType: 'turbohelice' },
        { manufacturer: 'Beechcraft', model: 'Bonanza A36', aircraftType: 'pistao' },
        { manufacturer: 'Beechcraft', model: 'Baron 58', aircraftType: 'pistao' },
        
        // Cessna
        { manufacturer: 'Cessna', model: '172', aircraftType: 'pistao' },
        { manufacturer: 'Cessna', model: '182', aircraftType: 'pistao' },
        { manufacturer: 'Cessna', model: '206', aircraftType: 'pistao' },
        { manufacturer: 'Cessna', model: 'Caravan', aircraftType: 'turbohelice' },
        { manufacturer: 'Cessna', model: 'Citation', variant: 'CJ3', aircraftType: 'jato' },
        { manufacturer: 'Cessna', model: 'Citation', variant: 'XLS', aircraftType: 'jato' },
        
        // Piper
        { manufacturer: 'Piper', model: 'Cherokee', aircraftType: 'pistao' },
        { manufacturer: 'Piper', model: 'Archer', aircraftType: 'pistao' },
        { manufacturer: 'Piper', model: 'Seneca', aircraftType: 'pistao' },
        { manufacturer: 'Piper', model: 'Seminole', aircraftType: 'pistao' },
        
        // Embraer
        { manufacturer: 'Embraer', model: 'Phenom 100', aircraftType: 'jato' },
        { manufacturer: 'Embraer', model: 'Phenom 300', aircraftType: 'jato' },
        { manufacturer: 'Embraer', model: 'Legacy 450', aircraftType: 'jato' },
        { manufacturer: 'Embraer', model: 'Legacy 500', aircraftType: 'jato' },
        
        // Daher (Socata)
        { manufacturer: 'Daher', model: 'TBM', variant: '900', aircraftType: 'turbohelice' },
        { manufacturer: 'Daher', model: 'TBM', variant: '940', aircraftType: 'turbohelice' },
        
        // Pilatus
        { manufacturer: 'Pilatus', model: 'PC-12', aircraftType: 'turbohelice' },
        { manufacturer: 'Pilatus', model: 'PC-24', aircraftType: 'jato' },
      ];

      const manufacturers = Array.from(new Set(canonicalModels.map(m => m.manufacturer)));

      return { manufacturers, models: canonicalModels };
    }
  }

  /**
   * Normaliza string para busca (lowercase, sem acentos)
   */
  private normalizeString(str: string): string {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  /**
   * GET /sync-status
   */
  getSyncStatus(): CatalogSyncStatus | null {
    return this.syncStatus;
  }

  /**
   * Salva no cache
   */
  private saveToCache(): void {
    localStorage.setItem(
      STORAGE_KEYS.MANUFACTURERS,
      JSON.stringify(Array.from(this.manufacturers.values()))
    );
    localStorage.setItem(
      STORAGE_KEYS.MODELS,
      JSON.stringify(Array.from(this.models.values()))
    );
  }

  /**
   * Carrega do cache
   */
  private loadFromCache(): void {
    const manufacturersData = localStorage.getItem(STORAGE_KEYS.MANUFACTURERS);
    if (manufacturersData) {
      const manufacturers: Manufacturer[] = JSON.parse(manufacturersData);
      manufacturers.forEach(m => this.manufacturers.set(m.id, m));
    }

    const modelsData = localStorage.getItem(STORAGE_KEYS.MODELS);
    if (modelsData) {
      const models: AircraftCatalogModel[] = JSON.parse(modelsData);
      models.forEach(m => this.models.set(m.id, m));
    }

    const syncStatusData = localStorage.getItem(STORAGE_KEYS.SYNC_STATUS);
    if (syncStatusData) {
      this.syncStatus = JSON.parse(syncStatusData);
    }
  }

  /**
   * Salva status de sincronização
   */
  private saveSyncStatus(): void {
    localStorage.setItem(
      STORAGE_KEYS.SYNC_STATUS,
      JSON.stringify(this.syncStatus)
    );
  }
}

export const catalogService = new CatalogService();