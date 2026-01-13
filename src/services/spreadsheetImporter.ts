// ============================================
// IMPORTADOR DE PLANILHAS (Excel/CSV)
// ============================================

import { Flight, Expense, Revenue, BankAccount } from '../types';
import { storage } from './storage';

export interface ImportResult {
  success: boolean;
  imported: {
    flights: number;
    expenses: number;
    revenues: number;
  };
  errors: string[];
  warnings: string[];
}

export interface SpreadsheetRow {
  [key: string]: any;
}

class SpreadsheetImporter {
  /**
   * Lê arquivo CSV e retorna array de objetos
   */
  async parseCSV(file: File): Promise<SpreadsheetRow[]> {
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];

    // Detectar delimitador (vírgula ou ponto-e-vírgula)
    const firstLine = lines[0];
    const delimiter = firstLine.includes(';') ? ';' : ',';

    // Parsear header
    const headers = this.parseCSVLine(lines[0], delimiter).map(h => h.trim().toLowerCase());

    // Parsear linhas
    const rows: SpreadsheetRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i], delimiter);
      if (values.length === 0 || values.every(v => !v.trim())) continue; // Pula linhas vazias

      const row: SpreadsheetRow = {};
      headers.forEach((header, index) => {
        row[header] = values[index]?.trim() || '';
      });
      rows.push(row);
    }

    return rows;
  }

  /**
   * Parseia uma linha CSV respeitando aspas
   */
  private parseCSVLine(line: string, delimiter: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++; // Pula próxima aspas
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current); // Último campo

    return result;
  }

  /**
   * Lê arquivo Excel (XLSX) usando SheetJS (xlsx)
   * Nota: Requer instalação de 'xlsx' package
   */
  async parseExcel(file: File): Promise<SpreadsheetRow[]> {
    // Dynamic import para evitar erro se xlsx não estiver instalado
    try {
      // @ts-ignore - xlsx pode não ter tipos completos
      const XLSX = await import('xlsx');
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      
      // Pega a primeira planilha
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      // Converte para JSON
      const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
      
      // Normaliza chaves para lowercase
      return data.map((row: any) => {
        const normalized: SpreadsheetRow = {};
        Object.keys(row).forEach(key => {
          normalized[key.toLowerCase().trim()] = row[key];
        });
        return normalized;
      });
    } catch (error: any) {
      throw new Error(`Erro ao ler arquivo Excel: ${error.message}. Certifique-se de que a biblioteca xlsx está instalada.`);
    }
  }

  /**
   * Detecta tipo de arquivo e parseia
   */
  async parseFile(file: File): Promise<SpreadsheetRow[]> {
    const fileName = file.name.toLowerCase();
    
    if (fileName.endsWith('.csv')) {
      return this.parseCSV(file);
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      return this.parseExcel(file);
    } else {
      throw new Error('Formato de arquivo não suportado. Use CSV ou Excel (.xlsx, .xls)');
    }
  }

  /**
   * Converte string de data para formato ISO (YYYY-MM-DD)
   */
  private parseDate(dateStr: string): string | null {
    if (!dateStr || !dateStr.trim()) return null;

    // Tenta vários formatos comuns
    const formats = [
      /^(\d{2})\/(\d{2})\/(\d{4})$/, // DD/MM/YYYY
      /^(\d{4})-(\d{2})-(\d{2})$/, // YYYY-MM-DD
      /^(\d{2})-(\d{2})-(\d{4})$/, // DD-MM-YYYY
    ];

    for (const format of formats) {
      const match = dateStr.match(format);
      if (match) {
        if (format === formats[0]) {
          // DD/MM/YYYY
          return `${match[3]}-${match[2]}-${match[1]}`;
        } else if (format === formats[1]) {
          // YYYY-MM-DD
          return dateStr;
        } else if (format === formats[2]) {
          // DD-MM-YYYY
          return `${match[3]}-${match[2]}-${match[1]}`;
        }
      }
    }

    // Tenta parsear como Date
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }

    return null;
  }

  /**
   * Converte string para número
   */
  private parseNumber(value: string | number): number {
    if (typeof value === 'number') return value;
    if (!value || !value.toString().trim()) return 0;
    
    // Remove formatação brasileira (R$, pontos, espaços)
    const cleaned = value.toString()
      .replace(/R\$/g, '')
      .replace(/\./g, '')
      .replace(/,/g, '.')
      .replace(/\s/g, '')
      .trim();
    
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }

  /**
   * Converte string para horas decimais
   */
  private parseHours(value: string | number): number {
    if (typeof value === 'number') return value;
    if (!value || !value.toString().trim()) return 0;

    const str = value.toString().trim();
    
    // Formato HH:MM
    const timeMatch = str.match(/^(\d{1,2}):(\d{2})$/);
    if (timeMatch) {
      const hours = parseInt(timeMatch[1]) || 0;
      const minutes = parseInt(timeMatch[2]) || 0;
      return hours + (minutes / 60);
    }

    // Formato decimal
    return this.parseNumber(str);
  }

  /**
   * Mapeia colunas da planilha para voos
   */
  private mapRowToFlight(row: SpreadsheetRow, aircraftId: string, userId: string): Flight | null {
    // Mapeamento flexível de colunas (tenta vários nomes possíveis)
    const getValue = (keys: string[]) => {
      for (const key of keys) {
        if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
          return row[key];
        }
      }
      return null;
    };

    // Data
    const dataStr = getValue(['data', 'date', 'data do voo', 'data_voo', 'data voo']);
    const data = this.parseDate(dataStr?.toString() || '');
    if (!data) return null; // Data é obrigatória

    // Origem e destino
    const origem = getValue(['origem', 'origin', 'de', 'from', 'origem icao', 'origem_icao'])?.toString() || '';
    const destino = getValue(['destino', 'dest', 'destination', 'para', 'to', 'destino icao', 'destino_icao'])?.toString() || '';
    if (!origem || !destino) return null;

    // Tempo de voo
    const tempoVoo = this.parseHours(getValue(['tempo voo', 'tempo_voo', 'horas', 'hours', 'flight time', 'tempo', 'duração', 'duration']) || 0);

    // Horas motor/célula (se não informado, usa tempo de voo)
    const horasMotor = this.parseHours(getValue(['horas motor', 'horas_motor', 'motor', 'engine hours']) || tempoVoo);
    const horasCelula = this.parseHours(getValue(['horas célula', 'horas_celula', 'célula', 'airframe hours']) || tempoVoo);

    // Ciclos (pousos)
    const ciclos = Math.round(this.parseNumber(getValue(['ciclos', 'cycles', 'pousos', 'landings']) || 1));

    // Combustível
    const combustivelConsumido = this.parseNumber(getValue(['combustível', 'combustivel', 'fuel', 'combustível consumido', 'fuel consumed']) || 0);
    const combustivelAbastecido = this.parseNumber(getValue(['abastecimento', 'refuel', 'combustível abastecido', 'fuel added']) || 0);

    // Piloto (tenta encontrar por nome ou usa userId)
    const pilotoNome = getValue(['piloto', 'pilot', 'comandante'])?.toString() || '';
    let pilotoId = userId;
    if (pilotoNome) {
      const users = storage.getUsers();
      const piloto = users.find(u => 
        u.nome.toLowerCase().includes(pilotoNome.toLowerCase()) ||
        pilotoNome.toLowerCase().includes(u.nome.toLowerCase())
      );
      if (piloto) pilotoId = piloto.id;
    }

    const flight: Flight = {
      id: crypto.randomUUID(),
      aircraftId,
      pilotoId,
      data,
      origem: origem.split(' ')[0], // Pega primeiro token (pode ser ICAO)
      origemIcao: origem.length <= 4 ? origem.toUpperCase() : undefined,
      destino: destino.split(' ')[0],
      destinoIcao: destino.length <= 4 ? destino.toUpperCase() : undefined,
      tempoVoo: tempoVoo || 0,
      horasMotor: horasMotor || tempoVoo || 0,
      horasCelula: horasCelula || tempoVoo || 0,
      ciclos: ciclos || 1,
      combustivelConsumido: combustivelConsumido || undefined,
      combustivelAbastecido: combustivelAbastecido || undefined,
      observacoes: getValue(['observações', 'observacoes', 'obs', 'notes', 'observação'])?.toString() || undefined,
      createdAt: new Date().toISOString(),
      createdBy: userId,
      updatedAt: new Date().toISOString(),
    };

    return flight;
  }

  /**
   * Mapeia colunas da planilha para despesas
   */
  private mapRowToExpense(row: SpreadsheetRow, aircraftId: string, userId: string): Expense | null {
    const getValue = (keys: string[]) => {
      for (const key of keys) {
        if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
          return row[key];
        }
      }
      return null;
    };

    // Data
    const dataStr = getValue(['data', 'date', 'data despesa', 'data_despesa'])?.toString() || '';
    const data = this.parseDate(dataStr);
    if (!data) return null;

    // Descrição
    const descricao = getValue(['descrição', 'descricao', 'description', 'desc', 'tipo', 'categoria'])?.toString() || '';
    if (!descricao) return null;

    // Valor
    const valor = this.parseNumber(getValue(['valor', 'value', 'custo', 'cost', 'preço', 'preco']) || 0);
    if (valor <= 0) return null;

    // Categoria (tenta mapear)
    const categoriaStr = getValue(['categoria', 'category', 'tipo despesa', 'tipo_despesa'])?.toString().toLowerCase() || '';
    let categoria: Expense['categoria'] = 'outros';
    if (categoriaStr.includes('combust') || categoriaStr.includes('fuel')) categoria = 'combustivel';
    else if (categoriaStr.includes('manuten') || categoriaStr.includes('maintenance')) categoria = 'manutencao';
    else if (categoriaStr.includes('hangar') || categoriaStr.includes('hangar')) categoria = 'hangaragem';
    else if (categoriaStr.includes('seguro') || categoriaStr.includes('insurance')) categoria = 'seguro';
    else if (categoriaStr.includes('taxa') || categoriaStr.includes('fee')) categoria = 'taxas';
    else if (categoriaStr.includes('peça') || categoriaStr.includes('part')) categoria = 'pecas';

    // Tipo (fixo/variável)
    const tipoStr = getValue(['tipo', 'type', 'fixo', 'variável', 'variavel'])?.toString().toLowerCase() || '';
    const tipo: Expense['tipo'] = tipoStr.includes('fixo') ? 'fixo' : 'variavel';

    const expense: Expense = {
      id: crypto.randomUUID(),
      aircraftId,
      categoria,
      tipo,
      descricao,
      valor,
      moeda: 'BRL',
      data,
      fornecedor: getValue(['fornecedor', 'supplier', 'vendor'])?.toString() || undefined,
      rateioAutomatico: true,
      createdAt: new Date().toISOString(),
      createdBy: userId,
    };

    return expense;
  }

  /**
   * Mapeia colunas da planilha para receitas
   */
  private mapRowToRevenue(row: SpreadsheetRow, aircraftId: string, userId: string, bankAccounts: BankAccount[]): Revenue | null {
    const getValue = (keys: string[]) => {
      for (const key of keys) {
        if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
          return row[key];
        }
      }
      return null;
    };

    // Data
    const dataStr = getValue(['data', 'date', 'data receita', 'data_receita'])?.toString() || '';
    const data = this.parseDate(dataStr);
    if (!data) return null;

    // Descrição
    const descricao = getValue(['descrição', 'descricao', 'description', 'desc', 'tipo'])?.toString() || '';
    if (!descricao) return null;

    // Valor
    const valor = this.parseNumber(getValue(['valor', 'value', 'receita', 'revenue']) || 0);
    if (valor <= 0) return null;

    // Categoria
    const categoriaStr = getValue(['categoria', 'category', 'tipo receita'])?.toString().toLowerCase() || '';
    let categoria: Revenue['categoria'] = 'outras_receitas';
    if (categoriaStr.includes('aplicação') || categoriaStr.includes('aplicacao') || categoriaStr.includes('investment')) categoria = 'aplicacao_financeira';
    else if (categoriaStr.includes('aporte') || categoriaStr.includes('contribution')) categoria = 'aporte_financeiro';
    else if (categoriaStr.includes('reembolso') || categoriaStr.includes('refund')) categoria = 'reembolso';

    // Conta bancária (usa primeira disponível se não especificada)
    const contaNome = getValue(['conta', 'account', 'conta bancária', 'conta_bancaria'])?.toString() || '';
    let contaBancariaId = bankAccounts[0]?.id || '';
    if (contaNome && bankAccounts.length > 0) {
      const conta = bankAccounts.find(a => 
        a.nome.toLowerCase().includes(contaNome.toLowerCase()) ||
        contaNome.toLowerCase().includes(a.nome.toLowerCase())
      );
      if (conta) contaBancariaId = conta.id;
    }

    if (!contaBancariaId) return null; // Precisa de conta bancária

    const revenue: Revenue = {
      id: crypto.randomUUID(),
      aircraftId,
      categoria,
      descricao,
      valor,
      moeda: 'BRL',
      data,
      contaBancariaId,
      origem: getValue(['origem', 'source', 'de onde', 'from'])?.toString() || undefined,
      rateioAutomatico: false,
      createdAt: new Date().toISOString(),
      createdBy: userId,
    };

    return revenue;
  }

  /**
   * Importa dados da planilha
   */
  async importSpreadsheet(
    file: File,
    aircraftId: string,
    userId: string,
    options: {
      importFlights?: boolean;
      importExpenses?: boolean;
      importRevenues?: boolean;
      filterMonth?: number; // 1-12 (Janeiro = 1, Dezembro = 12)
      filterYear?: number;
    } = {}
  ): Promise<ImportResult> {
    const result: ImportResult = {
      success: true,
      imported: { flights: 0, expenses: 0, revenues: 0 },
      errors: [],
      warnings: [],
    };

    try {
      // Parsear arquivo
      const rows = await this.parseFile(file);
      if (rows.length === 0) {
        result.errors.push('Planilha vazia ou sem dados válidos');
        result.success = false;
        return result;
      }

      // Filtrar por mês/ano se especificado
      let filteredRows = rows;
      if (options.filterMonth || options.filterYear) {
        filteredRows = rows.filter(row => {
          const dataStr = row['data'] || row['date'] || row['data do voo'] || row['data_despesa'] || '';
          const data = this.parseDate(dataStr?.toString() || '');
          if (!data) return false;

          const date = new Date(data);
          if (options.filterYear && date.getFullYear() !== options.filterYear) return false;
          if (options.filterMonth && date.getMonth() + 1 !== options.filterMonth) return false;
          return true;
        });

        if (filteredRows.length === 0) {
          result.warnings.push(`Nenhum registro encontrado para o período especificado`);
        }
      }

      // Obter contas bancárias para receitas
      const bankAccounts = storage.getBankAccounts(aircraftId);

      // Importar voos
      if (options.importFlights !== false) {
        for (const row of filteredRows) {
          try {
            const flight = this.mapRowToFlight(row, aircraftId, userId);
            if (flight) {
              storage.saveFlight(flight, userId, 'Importação');
              result.imported.flights++;
            }
          } catch (error: any) {
            result.errors.push(`Erro ao importar voo: ${error.message}`);
          }
        }
      }

      // Importar despesas
      if (options.importExpenses !== false) {
        for (const row of filteredRows) {
          try {
            const expense = this.mapRowToExpense(row, aircraftId, userId);
            if (expense) {
              storage.saveExpense(expense, userId, 'Importação');
              result.imported.expenses++;
            }
          } catch (error: any) {
            result.errors.push(`Erro ao importar despesa: ${error.message}`);
          }
        }
      }

      // Importar receitas
      if (options.importRevenues !== false) {
        for (const row of filteredRows) {
          try {
            const revenue = this.mapRowToRevenue(row, aircraftId, userId, bankAccounts);
            if (revenue) {
              storage.saveRevenue(revenue, userId, 'Importação');
              result.imported.revenues++;
            }
          } catch (error: any) {
            result.errors.push(`Erro ao importar receita: ${error.message}`);
          }
        }
      }

      if (result.imported.flights === 0 && result.imported.expenses === 0 && result.imported.revenues === 0) {
        result.warnings.push('Nenhum dado foi importado. Verifique se as colunas da planilha estão corretas.');
      }

    } catch (error: any) {
      result.success = false;
      result.errors.push(`Erro ao processar arquivo: ${error.message}`);
    }

    return result;
  }

  /**
   * Preview dos dados antes de importar
   */
  async previewSpreadsheet(file: File, maxRows: number = 10): Promise<{
    headers: string[];
    rows: SpreadsheetRow[];
    totalRows: number;
  }> {
    const rows = await this.parseFile(file);
    const headers = rows.length > 0 ? Object.keys(rows[0]) : [];

    return {
      headers,
      rows: rows.slice(0, maxRows),
      totalRows: rows.length,
    };
  }
}

export const spreadsheetImporter = new SpreadsheetImporter();
