import { AirportRecord, AirportType } from '../types';

const OURAIRPORTS_CSV_URL = 'https://davidmegginson.github.io/ourairports-data/airports.csv';

export interface AirportFilter {
  country?: string; // ISO code (ex: "BR")
  region?: string; // ISO region (ex: "BR-SP")
  types?: AirportType[];
  privateOnly?: boolean; // Apenas aeroportos GA/privados
  scheduledService?: boolean; // true = apenas com serviço agendado, false = apenas sem
  searchQuery?: string; // Busca por nome, código, cidade
}

class AirportService {
  private airports: AirportRecord[] = [];
  private citiesMap: Map<string, AirportRecord[]> = new Map();
  private loaded = false;

  /**
   * Baixa e processa o CSV do OurAirports
   */
  async loadAirports(): Promise<void> {
    if (this.loaded && this.airports.length > 0) {
      return;
    }

    try {
      // Primeiro tenta carregar do localStorage
      const cached = localStorage.getItem('ourairports_data');
      const cachedTimestamp = localStorage.getItem('ourairports_data_timestamp');
      
      if (cached && cachedTimestamp) {
        const age = Date.now() - parseInt(cachedTimestamp);
        // Cache válido por 7 dias
        if (age < 7 * 24 * 60 * 60 * 1000) {
          this.airports = JSON.parse(cached);
          this.buildCitiesMap();
          this.loaded = true;
          return;
        }
      }

      // Tenta carregar do arquivo local primeiro (public/data/)
      let csvText: string | null = null;
      let response: Response | null = null;
      
      try {
        response = await fetch('/data/airports.csv');
        if (response.ok) {
          csvText = await response.text();
          console.log('Carregado arquivo local: /data/airports.csv');
        }
      } catch (e) {
        console.log('Arquivo local não encontrado, tentando baixar da internet...');
      }

      // Se não encontrou local, baixa da internet
      if (!csvText) {
        response = await fetch(OURAIRPORTS_CSV_URL);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        csvText = await response.text();
        console.log('Carregado da internet: OurAirports');
      }
      
      this.airports = this.parseCSV(csvText);
      this.buildCitiesMap();
      
      // Salva no cache
      localStorage.setItem('ourairports_data', JSON.stringify(this.airports));
      localStorage.setItem('ourairports_data_timestamp', Date.now().toString());
      this.loaded = true;
    } catch (error) {
      console.error('Erro ao carregar aeroportos:', error);
      // Tenta usar cache mesmo se antigo
      const cached = localStorage.getItem('ourairports_data');
      if (cached) {
        this.airports = JSON.parse(cached);
        this.buildCitiesMap();
        this.loaded = true;
      }
      throw error;
    }
  }

  /**
   * Parse do CSV do OurAirports
   */
  private parseCSV(csvText: string): AirportRecord[] {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];

    // Primeira linha é o cabeçalho
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    
    const airports: AirportRecord[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      if (values.length !== headers.length) continue;

      const record: Record<string, string> = {};
      headers.forEach((header, idx) => {
        record[header] = values[idx]?.trim().replace(/^"|"$/g, '') || '';
      });

      // Filtra apenas aeroportos válidos (com coordenadas)
      if (!record.latitude_deg || !record.longitude_deg) continue;

      const airport: AirportRecord = {
        id: record.id || crypto.randomUUID(),
        ident: record.ident || '',
        type: (record.type as AirportType) || 'small_airport',
        name: record.name || '',
        latitude_deg: parseFloat(record.latitude_deg) || 0,
        longitude_deg: parseFloat(record.longitude_deg) || 0,
        elevation_ft: record.elevation_ft ? parseFloat(record.elevation_ft) : undefined,
        continent: record.continent || undefined,
        iso_country: record.iso_country || '',
        iso_region: record.iso_region || '',
        municipality: record.municipality || undefined,
        scheduled_service: (record.scheduled_service as 'yes' | 'no' | '') || '',
        gps_code: record.gps_code || undefined,
        iata_code: record.iata_code || undefined,
        local_code: record.local_code || undefined,
        home_link: record.home_link || undefined,
        wikipedia_link: record.wikipedia_link || undefined,
        importedAt: new Date().toISOString(),
      };

      // Marca como privado/GA se não tem serviço agendado
      if (airport.scheduled_service === 'no' || 
          airport.type === 'small_airport' || 
          airport.type === 'heliport') {
        airport.isPrivate = true;
      }

      airports.push(airport);
    }

    return airports;
  }

  /**
   * Parse de linha CSV considerando vírgulas dentro de aspas
   */
  private parseCSVLine(line: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current);

    return values;
  }

  /**
   * Constrói mapa de cidades para busca rápida
   */
  private buildCitiesMap(): void {
    this.citiesMap.clear();
    this.airports.forEach(airport => {
      if (airport.municipality) {
        const key = `${airport.municipality.toLowerCase()}_${airport.iso_region}`;
        if (!this.citiesMap.has(key)) {
          this.citiesMap.set(key, []);
        }
        this.citiesMap.get(key)!.push(airport);
      }
    });
  }

  /**
   * Filtra aeroportos
   */
  filterAirports(filters: AirportFilter = {}): AirportRecord[] {
    if (!this.loaded) {
      return [];
    }

    let filtered = [...this.airports];

    // Filtro por país
    if (filters.country) {
      filtered = filtered.filter(a => a.iso_country === filters.country);
    }

    // Filtro por região/estado
    if (filters.region) {
      filtered = filtered.filter(a => a.iso_region === filters.region);
    }

    // Filtro por tipo
    if (filters.types && filters.types.length > 0) {
      filtered = filtered.filter(a => filters.types!.includes(a.type));
    }

    // Filtro por privado/GA
    if (filters.privateOnly) {
      filtered = filtered.filter(a => a.isPrivate === true);
    }

    // Filtro por serviço agendado
    if (filters.scheduledService !== undefined) {
      if (filters.scheduledService) {
        filtered = filtered.filter(a => a.scheduled_service === 'yes');
      } else {
        filtered = filtered.filter(a => a.scheduled_service !== 'yes');
      }
    }

    // Busca por texto
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(a => 
        a.name.toLowerCase().includes(query) ||
        a.ident.toLowerCase().includes(query) ||
        a.gps_code?.toLowerCase().includes(query) ||
        a.iata_code?.toLowerCase().includes(query) ||
        a.municipality?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }

  /**
   * Busca aeroporto por código ICAO/IATA/local
   */
  findByCode(code: string): AirportRecord | null {
    if (!this.loaded) return null;
    
    const upperCode = code.toUpperCase();
    return this.airports.find(a => 
      a.ident.toUpperCase() === upperCode ||
      a.gps_code?.toUpperCase() === upperCode ||
      a.iata_code?.toUpperCase() === upperCode ||
      a.local_code?.toUpperCase() === upperCode
    ) || null;
  }

  /**
   * Lista todas as cidades que possuem aeroportos (elegíveis)
   */
  getCitiesWithAirports(filters: AirportFilter = {}): Array<{
    city: string;
    region: string;
    country: string;
    airportCount: number;
    airports: AirportRecord[];
  }> {
    const airports = this.filterAirports(filters);
    const citiesMap = new Map<string, AirportRecord[]>();

    airports.forEach(airport => {
      if (airport.municipality) {
        const key = `${airport.municipality}_${airport.iso_region}_${airport.iso_country}`;
        if (!citiesMap.has(key)) {
          citiesMap.set(key, []);
        }
        citiesMap.get(key)!.push(airport);
      }
    });

    return Array.from(citiesMap.entries()).map(([key, airports]) => {
      const [city, region, country] = key.split('_');
      return {
        city,
        region,
        country,
        airportCount: airports.length,
        airports,
      };
    }).sort((a, b) => {
      // Ordena por cidade
      if (a.city !== b.city) return a.city.localeCompare(b.city);
      // Depois por quantidade de aeroportos (maior primeiro)
      return b.airportCount - a.airportCount;
    });
  }

  /**
   * Busca aeroportos de uma cidade específica
   */
  getAirportsByCity(city: string, region?: string): AirportRecord[] {
    if (!this.loaded) return [];
    
    const key = city.toLowerCase();
    const matching: AirportRecord[] = [];

    this.citiesMap.forEach((airports, mapKey) => {
      const [mapCity, mapRegion] = mapKey.split('_');
      if (mapCity === key && (!region || mapRegion === region)) {
        matching.push(...airports);
      }
    });

    return matching;
  }

  /**
   * Atualiza dados customizados de um aeroporto (preços, taxas, etc.)
   */
  updateAirportCustomData(code: string, updates: Partial<AirportRecord>): void {
    const airport = this.findByCode(code);
    if (!airport) return;

    Object.assign(airport, updates);
    airport.lastUpdated = new Date().toISOString();

    // Atualiza no array
    const index = this.airports.findIndex(a => 
      a.ident === airport.ident || 
      a.gps_code === airport.gps_code ||
      a.iata_code === airport.iata_code
    );
    if (index >= 0) {
      this.airports[index] = airport;
    }

    // Atualiza cache
    localStorage.setItem('ourairports_data', JSON.stringify(this.airports));
  }
}

export const airportService = new AirportService();