import { 
  AircraftModel, 
  AircraftModelSpecs, 
  PerformanceEstimate
} from '../types';

const CACHE_STALE_DAYS = 90;

class AircraftSpecsService {
  private models: Map<string, AircraftModel> = new Map();

  constructor() {
    this.loadFromCache();
  }

  /**
   * Busca ou cria specs de uma aeronave
   */
  async getAircraftSpecs(
    manufacturer: string,
    model: string,
    variant?: string,
    year?: number
  ): Promise<AircraftModelSpecs | null> {
    const key = this.getModelKey(manufacturer, model, variant, year);
    let cached = this.models.get(key);

    // Verifica se precisa atualizar
    if (cached && cached.cacheStaleAt) {
      const staleDate = new Date(cached.cacheStaleAt);
      if (new Date() < staleDate) {
        // Cache ainda válido
        return cached.specs;
      }
    }

    // Busca specs
    const specs = await this.fetchSpecs(manufacturer, model, variant, year);
    
    if (specs) {
      // Salva no cache
      const modelData: AircraftModel = {
        id: cached?.id || crypto.randomUUID(),
        manufacturer,
        model,
        variant,
        year,
        specs,
        createdAt: cached?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        cacheStaleAt: new Date(Date.now() + CACHE_STALE_DAYS * 24 * 60 * 60 * 1000).toISOString(),
      };

      this.models.set(key, modelData);
      this.saveToCache();
      return specs;
    }

    // Se não encontrou, retorna do cache mesmo se stale
    return cached?.specs || null;
  }

  /**
   * Pipeline de busca de specs (APIs → scraping → ML)
   */
  private async fetchSpecs(
    manufacturer: string,
    model: string,
    variant?: string,
    year?: number
  ): Promise<AircraftModelSpecs | null> {
    // 1. Tenta APIs estruturadas primeiro
    let specs = await this.fetchFromAPIs(manufacturer, model, variant, year);
    
    // 2. Se não encontrou, tenta scraping (respeitando robots.txt e rate limits)
    if (!specs || !specs.isComplete) {
      const scraped = await this.fetchFromScraping(manufacturer, model, variant, year);
      if (scraped) {
        specs = this.mergeSpecs(specs, scraped);
      }
    }

    // 3. Se ainda faltam dados críticos ou não encontrou nada, usa ML/heurística
    if (!specs || !specs.isComplete) {
      const estimated = this.estimateMissingSpecs(specs, manufacturer, model, variant, year);
      specs = this.mergeSpecs(specs, estimated);
    }

    return specs;
  }

  /**
   * Busca de APIs estruturadas (placeholder - implementar com APIs reais)
   */
  private async fetchFromAPIs(
    _manufacturer: string,
    _model: string,
    _variant?: string,
    _year?: number
  ): Promise<AircraftModelSpecs | null> {
    // TODO: Implementar integração com APIs como:
    // - Aircraft Bluebook API (se disponível)
    // - FAA Registry
    // - Manufacturer APIs
    
    // Por enquanto retorna null para forçar outras fontes
    return null;
  }

  /**
   * Scraping de páginas públicas (placeholder - implementar com respeito a robots.txt)
   */
  private async fetchFromScraping(
    _manufacturer: string,
    _model: string,
    _variant?: string,
    _year?: number
  ): Promise<AircraftModelSpecs | null> {
    // TODO: Implementar scraping respeitoso de:
    // - Wikipedia (tem muitos specs de aeronaves)
    // - Aircraft specs databases públicos
    // - Manufacturer websites (apenas se permitido)
    
    // Por enquanto retorna null
    return null;
  }

  /**
   * Estima specs faltantes usando ML/heurísticas
   */
  private estimateMissingSpecs(
    partialSpecs: AircraftModelSpecs | null,
    manufacturer: string,
    model: string,
    _variant?: string,
    _year?: number
  ): AircraftModelSpecs {
    const specs: AircraftModelSpecs = partialSpecs || {
      manufacturer,
      model,
      variant: _variant,
      sources: [],
      lastUpdated: new Date().toISOString(),
      isComplete: false,
      missingFields: [],
    };

    // Estima velocidade de cruzeiro se não tiver
    if (!specs.cruiseSpeed?.normal && !specs.cruiseSpeed?.economic) {
      const estimated = this.estimateCruiseSpeed(specs, manufacturer, model);
      specs.cruiseSpeed = {
        normal: {
          value: estimated,
          unit: 'ktas',
          source: 'ml_estimate',
          collectedAt: new Date().toISOString(),
          confidence: 'media',
          notes: 'Estimado usando heurística baseada em tipo de aeronave',
        },
      };
      specs.sources.push({
        type: 'ml_estimate',
        collectedAt: new Date().toISOString(),
      });
    }

    // Estima consumo se não tiver
    if (!specs.fuelBurn?.cruise) {
      const estimated = this.estimateFuelBurn(specs, manufacturer, model);
      specs.fuelBurn = {
        cruise: {
          value: estimated,
          unit: 'L/h',
          source: 'ml_estimate',
          collectedAt: new Date().toISOString(),
          confidence: 'baixa',
          notes: 'Estimado usando heurística - requer validação',
        },
      };
    }

    // Atualiza flags
    this.updateCompleteness(specs);
    
    return specs;
  }

  /**
   * Estima velocidade de cruzeiro usando heurísticas
   */
  private estimateCruiseSpeed(
    specs: AircraftModelSpecs,
    _manufacturer: string,
    model: string
  ): number {
    // Heurísticas baseadas em tipo de aeronave (pode ser melhorado com ML)
    const modelLower = model.toLowerCase();

    // Jatos
    if (modelLower.includes('jet') || modelLower.includes('citation') || 
        modelLower.includes('phenom') || modelLower.includes('lear')) {
      return 400; // ktas típico para jatos executivos
    }

    // Turboélices
    if (modelLower.includes('king air') || modelLower.includes('tbm') ||
        modelLower.includes('caravan') || modelLower.includes('quest')) {
      return 260; // ktas típico para turboélices
    }

    // Piston singles
    if (modelLower.includes('172') || modelLower.includes('182') ||
        modelLower.includes('cherokee') || modelLower.includes('archer')) {
      return 120; // ktas típico
    }

    // Piston twins
    if (modelLower.includes('twin') || modelLower.includes('seneca') ||
        modelLower.includes('baron') || modelLower.includes('aztec')) {
      return 180; // ktas típico
    }

    // Default baseado em potência/empuxo se disponível
    if (specs.enginePower?.value) {
      const hp = specs.enginePower.value;
      // Regra simples: ~0.8 ktas por HP (aproximado)
      return Math.min(500, Math.max(100, hp * 0.8));
    }

    // Default conservador
    return 150;
  }

  /**
   * Estima consumo de combustível
   */
  private estimateFuelBurn(
    specs: AircraftModelSpecs,
    _manufacturer: string,
    model: string
  ): number {
    // Heurísticas baseadas em tipo
    const modelLower = model.toLowerCase();

    // Jatos (L/h)
    if (modelLower.includes('jet') || modelLower.includes('citation')) {
      return 450; // L/h típico para jatos executivos leves
    }

    // Turboélices
    if (modelLower.includes('king air') || modelLower.includes('tbm')) {
      return 190; // L/h típico
    }

    // Piston singles
    if (modelLower.includes('172') || modelLower.includes('182')) {
      return 40; // L/h
    }

    // Piston twins
    if (modelLower.includes('twin') || modelLower.includes('seneca')) {
      return 120; // L/h
    }

    // Baseado em potência se disponível
    if (specs.enginePower?.value) {
      const hp = specs.enginePower.value;
      // Regra simples: ~0.3 L/h por HP (aproximado para pistão)
      return Math.max(30, hp * 0.3);
    }

    // Default
    return 100;
  }

  /**
   * Estima performance completa (para uso na estimativa de voo)
   */
  estimatePerformance(
    specs: AircraftModelSpecs,
    profile: 'economico' | 'normal' | 'rapido' = 'normal'
  ): PerformanceEstimate {
    const cruiseSpeed = 
      (profile === 'economico' ? specs.cruiseSpeed?.economic : undefined) ||
      (profile === 'rapido' ? specs.cruiseSpeed?.max : undefined) ||
      specs.cruiseSpeed?.normal ||
      specs.cruiseSpeed?.economic;
    const fuelBurn = specs.fuelBurn;

    return {
      cruiseSpeed: {
        value: cruiseSpeed?.value || this.estimateCruiseSpeed(specs, specs.manufacturer, specs.model),
        min: cruiseSpeed?.min,
        max: cruiseSpeed?.max,
        confidence: cruiseSpeed?.confidence || 'baixa',
        method: cruiseSpeed?.source === 'ml_estimate' ? 'ml' : 
                cruiseSpeed?.source === 'poh' ? 'known' : 'heuristic',
      },
      fuelBurn: {
        climb: fuelBurn?.climb?.value || (fuelBurn?.cruise?.value || 100) * 1.5,
        cruise: fuelBurn?.cruise?.value || this.estimateFuelBurn(specs, specs.manufacturer, specs.model),
        descent: fuelBurn?.descent?.value || (fuelBurn?.cruise?.value || 100) * 0.7,
        confidence: fuelBurn?.cruise?.confidence || 'baixa',
        method: fuelBurn?.cruise?.source === 'ml_estimate' ? 'ml' :
                fuelBurn?.cruise?.source === 'poh' ? 'known' : 'heuristic',
      },
      rateOfClimb: specs.rateOfClimb && specs.rateOfClimb.value !== null ? {
        value: specs.rateOfClimb.value,
        confidence: specs.rateOfClimb.confidence,
      } : undefined,
    };
  }

  /**
   * Mescla duas specs (prioriza a primeira)
   */
  private mergeSpecs(
    base: AircraftModelSpecs | null,
    update: AircraftModelSpecs
  ): AircraftModelSpecs {
    if (!base) return update;

    // Mescla campos, mantendo base quando ambos existem
    return {
      ...base,
      ...update,
      cruiseSpeed: update.cruiseSpeed || base.cruiseSpeed,
      fuelBurn: {
        climb: update.fuelBurn?.climb || base.fuelBurn?.climb,
        cruise: update.fuelBurn?.cruise || base.fuelBurn?.cruise,
        descent: update.fuelBurn?.descent || base.fuelBurn?.descent,
        idle: update.fuelBurn?.idle || base.fuelBurn?.idle,
      },
      sources: [...(base.sources || []), ...(update.sources || [])],
      lastUpdated: update.lastUpdated,
    };
  }

  /**
   * Atualiza flag de completude
   */
  private updateCompleteness(specs: AircraftModelSpecs): void {
    const missing: string[] = [];

    if (!specs.cruiseSpeed?.normal && !specs.cruiseSpeed?.economic) {
      missing.push('cruiseSpeed');
    }
    if (!specs.fuelBurn?.cruise) {
      missing.push('fuelBurn');
    }

    specs.missingFields = missing;
    specs.isComplete = missing.length === 0;
  }

  /**
   * Chave única para modelo
   */
  private getModelKey(
    manufacturer: string,
    model: string,
    variant?: string,
    year?: number
  ): string {
    return `${manufacturer.toLowerCase()}_${model.toLowerCase()}_${variant || ''}_${year || ''}`;
  }

  /**
   * Salva cache no localStorage
   */
  private saveToCache(): void {
    const data = Array.from(this.models.values());
    localStorage.setItem('aircraft_models_cache', JSON.stringify(data));
  }

  /**
   * Carrega cache do localStorage
   */
  private loadFromCache(): void {
    const cached = localStorage.getItem('aircraft_models_cache');
    if (cached) {
      try {
        const models: AircraftModel[] = JSON.parse(cached);
        models.forEach(model => {
          const key = this.getModelKey(
            model.manufacturer,
            model.model,
            model.variant,
            model.year
          );
          this.models.set(key, model);
        });
      } catch (e) {
        console.error('Erro ao carregar cache de modelos:', e);
      }
    }
  }

  /**
   * Permite override manual (quando usuário tem POH)
   */
  setManualOverride(
    manufacturer: string,
    model: string,
    variant: string | undefined,
    year: number | undefined,
    overrides: Partial<AircraftModelSpecs>
  ): void {
    const key = this.getModelKey(manufacturer, model, variant, year);
    const existing = this.models.get(key);

      const specs: AircraftModelSpecs = {
      manufacturer: existing?.specs.manufacturer || manufacturer,
      model: existing?.specs.model || model,
      ...existing?.specs,
      ...overrides,
      sources: [
        ...(existing?.specs.sources || []),
        {
          type: 'poh',
          collectedAt: new Date().toISOString(),
        },
      ],
      lastUpdated: new Date().toISOString(),
      isComplete: existing?.specs.isComplete || false,
      missingFields: existing?.specs.missingFields || [],
    };

    this.updateCompleteness(specs);

    const modelData: AircraftModel = {
      id: existing?.id || crypto.randomUUID(),
      manufacturer,
      model,
      variant,
      year,
      specs,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      cacheStaleAt: undefined, // Override manual nunca expira
    };

    this.models.set(key, modelData);
    this.saveToCache();
  }
}

export const aircraftSpecsService = new AircraftSpecsService();