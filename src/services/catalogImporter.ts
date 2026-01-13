import { AircraftType } from '../types';

export interface CSVRow {
  manufacturer: string;
  model: string;
  variant?: string;
  aircraft_type: AircraftType;
  year_start?: number;
  year_end?: number;
}

export interface CanonicalModel {
  manufacturer: string;
  model: string;
  variant?: string;
  yearRange?: {
    start: number;
    end?: number;
  };
  aircraftType: AircraftType;
}

/**
 * Serviço para importar dados do CSV do catálogo
 */
class CatalogImporter {
  /**
   * Carrega e processa o CSV do catálogo
   */
  async loadFromCSV(): Promise<CanonicalModel[]> {
    try {
      // Tenta carregar do arquivo público (public/data/)
      let response = await fetch('/data/aircraft-catalog.csv');
      
      // Se não encontrar, tenta src/data/ (para desenvolvimento)
      if (!response.ok) {
        response = await fetch('/src/data/aircraft-catalog.csv');
      }
      
      if (!response.ok) {
        // Se não encontrar no caminho público, tenta do localStorage (cache)
        const cached = localStorage.getItem('aircraft_catalog_csv');
        if (cached) {
          console.log('CSV não encontrado no servidor, usando cache');
          return this.parseCSV(cached);
        }
        throw new Error('CSV não encontrado. Coloque o arquivo em public/data/aircraft-catalog.csv ou faça upload manual');
      }

      const csvText = await response.text();
      
      // Salva no cache
      localStorage.setItem('aircraft_catalog_csv', csvText);
      localStorage.setItem('aircraft_catalog_csv_timestamp', Date.now().toString());
      
      return this.parseCSV(csvText);
    } catch (error) {
      console.error('Erro ao carregar CSV:', error);
      
      // Fallback: tenta do cache
      const cached = localStorage.getItem('aircraft_catalog_csv');
      if (cached) {
        console.log('Usando CSV do cache');
        return this.parseCSV(cached);
      }
      
      throw error;
    }
  }

  /**
   * Parse do CSV
   */
  private parseCSV(csvText: string): CanonicalModel[] {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];

    // Primeira linha é o header
    const headers = this.parseCSVLine(lines[0]).map(h => h.trim().toLowerCase());
    
    // Valida headers
    const requiredHeaders = ['manufacturer', 'model', 'aircraft_type'];
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    if (missingHeaders.length > 0) {
      throw new Error(`CSV está faltando colunas obrigatórias: ${missingHeaders.join(', ')}`);
    }

    const models: CanonicalModel[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      if (values.length !== headers.length) {
        console.warn(`Linha ${i + 1} tem número incorreto de colunas, pulando...`);
        continue;
      }

      const row: Record<string, string> = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx]?.trim().replace(/^"|"$/g, '') || '';
      });

      // Valida tipo de aeronave
      const aircraftType = row.aircraft_type.toLowerCase();
      if (!['pistao', 'turbohelice', 'jato', 'helicoptero'].includes(aircraftType)) {
        console.warn(`Linha ${i + 1}: tipo de aeronave inválido "${row.aircraft_type}", pulando...`);
        continue;
      }

      // Valida campos obrigatórios
      if (!row.manufacturer || !row.model) {
        console.warn(`Linha ${i + 1}: fabricante ou modelo faltando, pulando...`);
        continue;
      }

      const model: CanonicalModel = {
        manufacturer: row.manufacturer,
        model: row.model,
        variant: row.variant || undefined,
        aircraftType: aircraftType as AircraftType,
      };

      // Ano de fabricação
      if (row.year_start) {
        const yearStart = parseInt(row.year_start);
        if (!isNaN(yearStart)) {
          model.yearRange = { start: yearStart };
          
          if (row.year_end) {
            const yearEnd = parseInt(row.year_end);
            if (!isNaN(yearEnd)) {
              model.yearRange.end = yearEnd;
            }
          }
        }
      }

      models.push(model);
    }

    return models;
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
   * Permite upload manual do CSV via input file
   */
  async loadFromFile(file: File): Promise<CanonicalModel[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const csvText = e.target?.result as string;
          const models = this.parseCSV(csvText);
          
          // Salva no cache
          localStorage.setItem('aircraft_catalog_csv', csvText);
          localStorage.setItem('aircraft_catalog_csv_timestamp', Date.now().toString());
          
          resolve(models);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
      reader.readAsText(file, 'UTF-8');
    });
  }

  /**
   * Verifica se há CSV no cache
   */
  hasCachedCSV(): boolean {
    return !!localStorage.getItem('aircraft_catalog_csv');
  }

  /**
   * Retorna timestamp do cache
   */
  getCacheTimestamp(): number | null {
    const timestamp = localStorage.getItem('aircraft_catalog_csv_timestamp');
    return timestamp ? parseInt(timestamp) : null;
  }
}

export const catalogImporter = new CatalogImporter();