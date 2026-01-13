// ============================================
// SERVIÇO DE API (Substitui storage.ts)
// ============================================
// Este serviço faz chamadas HTTP para os endpoints da API (Vercel Functions)
// Com fallback para localStorage quando offline ou em desenvolvimento

import type {
  Aircraft,
  Flight,
  Expense,
  Revenue,
  BankAccount,
  Payment,
  MaintenanceEvent,
  MaintenanceSchedule,
  Document,
  FlightEstimate,
  CashInvestment,
  Membership,
  AuditLog,
  FlightEntry,
} from '../types';
import { storage } from './storage'; // Fallback para localStorage
import { supabase } from './supabase';

// Configuração
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
const USE_API = import.meta.env.VITE_USE_API === 'true' || !!import.meta.env.VITE_SUPABASE_URL;

// ============================================
// HELPERS
// ============================================

/**
 * Obtém token de autenticação do Supabase
 */
async function getAuthToken(): Promise<string | null> {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

/**
 * Faz chamada HTTP para a API
 */
async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAuthToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

/**
 * Verifica se deve usar API ou localStorage
 */
function shouldUseAPI(): boolean {
  return USE_API && !!supabase;
}

// ============================================
// API SERVICE
// ============================================

export const api = {
  // ==========================================
  // AIRCRAFTS (Aeronaves)
  // ==========================================

  getAircraft: async (): Promise<Aircraft[]> => {
    if (!shouldUseAPI()) {
      return storage.getAircraft();
    }

    try {
      const data = await apiCall<any[]>('/aircrafts');
      // Converter formato do banco para formato do app
      return data.map(convertAircraftFromDB);
    } catch (error) {
      console.error('Error fetching aircrafts from API, using localStorage:', error);
      return storage.getAircraft();
    }
  },

  getAircraftById: async (id: string): Promise<Aircraft | undefined> => {
    if (!shouldUseAPI()) {
      return storage.getAircraftById(id);
    }

    try {
      const data = await apiCall<any>(`/aircrafts/${id}`);
      return convertAircraftFromDB(data);
    } catch (error) {
      console.error('Error fetching aircraft from API, using localStorage:', error);
      return storage.getAircraftById(id);
    }
  },

  saveAircraft: async (
    aircraft: Aircraft,
    userId: string,
    userName: string
  ): Promise<Aircraft> => {
    if (!shouldUseAPI()) {
      return storage.saveAircraft(aircraft, userId, userName);
    }

    try {
      const method = aircraft.id ? 'PUT' : 'POST';
      const url = aircraft.id ? `/aircrafts/${aircraft.id}` : '/aircrafts';
      const data = await apiCall<any>(url, {
        method,
        body: JSON.stringify(convertAircraftToDB(aircraft)),
      });
      return convertAircraftFromDB(data);
    } catch (error) {
      console.error('Error saving aircraft to API, using localStorage:', error);
      return storage.saveAircraft(aircraft, userId, userName);
    }
  },

  deleteAircraft: async (
    id: string,
    userId: string,
    userName: string
  ): Promise<void> => {
    if (!shouldUseAPI()) {
      storage.deleteAircraft(id, userId, userName);
      return;
    }

    try {
      await apiCall(`/aircrafts/${id}`, { method: 'DELETE' });
    } catch (error) {
      console.error('Error deleting aircraft from API, using localStorage:', error);
      storage.deleteAircraft(id, userId, userName);
    }
  },

  // ==========================================
  // FLIGHTS (Voos)
  // ==========================================

  getFlights: async (aircraftId?: string): Promise<Flight[]> => {
    if (!shouldUseAPI()) {
      return storage.getFlights(aircraftId);
    }

    try {
      const url = aircraftId ? `/flights?aircraft_id=${aircraftId}` : '/flights';
      const data = await apiCall<any[]>(url);
      return data.map(convertFlightFromDB);
    } catch (error) {
      console.error('Error fetching flights from API, using localStorage:', error);
      return storage.getFlights(aircraftId);
    }
  },

  saveFlight: async (
    flight: Flight,
    userId: string,
    userName: string
  ): Promise<Flight> => {
    if (!shouldUseAPI()) {
      return storage.saveFlight(flight, userId, userName);
    }

    try {
      const data = await apiCall<any>('/flights', {
        method: 'POST',
        body: JSON.stringify(convertFlightToDB(flight)),
      });
      return convertFlightFromDB(data);
    } catch (error) {
      console.error('Error saving flight to API, using localStorage:', error);
      return storage.saveFlight(flight, userId, userName);
    }
  },

  // ==========================================
  // EXPENSES (Despesas)
  // ==========================================

  getExpenses: async (aircraftId?: string): Promise<Expense[]> => {
    if (!shouldUseAPI()) {
      return storage.getExpenses(aircraftId);
    }

    try {
      const url = aircraftId ? `/expenses?aircraft_id=${aircraftId}` : '/expenses';
      const data = await apiCall<any[]>(url);
      return data.map(convertExpenseFromDB);
    } catch (error) {
      console.error('Error fetching expenses from API, using localStorage:', error);
      return storage.getExpenses(aircraftId);
    }
  },

  saveExpense: async (
    expense: Expense,
    userId: string,
    userName: string
  ): Promise<Expense> => {
    if (!shouldUseAPI()) {
      return storage.saveExpense(expense, userId, userName);
    }

    try {
      const data = await apiCall<any>('/expenses', {
        method: 'POST',
        body: JSON.stringify(convertExpenseToDB(expense)),
      });
      return convertExpenseFromDB(data);
    } catch (error) {
      console.error('Error saving expense to API, using localStorage:', error);
      return storage.saveExpense(expense, userId, userName);
    }
  },

  // ==========================================
  // REVENUES (Receitas)
  // ==========================================

  getRevenues: async (aircraftId?: string): Promise<Revenue[]> => {
    if (!shouldUseAPI()) {
      return storage.getRevenues(aircraftId);
    }

    try {
      const url = aircraftId ? `/revenues?aircraft_id=${aircraftId}` : '/revenues';
      const data = await apiCall<any[]>(url);
      return data.map(convertRevenueFromDB);
    } catch (error) {
      console.error('Error fetching revenues from API, using localStorage:', error);
      return storage.getRevenues(aircraftId);
    }
  },

  saveRevenue: async (
    revenue: Revenue,
    userId: string,
    userName: string
  ): Promise<Revenue> => {
    if (!shouldUseAPI()) {
      return storage.saveRevenue(revenue, userId, userName);
    }

    try {
      const data = await apiCall<any>('/revenues', {
        method: 'POST',
        body: JSON.stringify(convertRevenueToDB(revenue)),
      });
      return convertRevenueFromDB(data);
    } catch (error) {
      console.error('Error saving revenue to API, using localStorage:', error);
      return storage.saveRevenue(revenue, userId, userName);
    }
  },

  // ==========================================
  // OUTROS (delegar para storage por enquanto)
  // ==========================================

  // Deletar e outras operações que ainda usam storage
  deleteExpense: async (id: string, userId: string, userName: string): Promise<void> => {
    storage.deleteExpense(id, userId, userName);
  },

  deleteRevenue: async (id: string, userId: string, userName: string): Promise<void> => {
    storage.deleteRevenue(id, userId, userName);
  },

  // Delegate other methods to storage for now
  ...Object.fromEntries(
    Object.entries(storage).filter(([key]) => 
      !['getAircraft', 'getAircraftById', 'saveAircraft', 'deleteAircraft', 
        'getFlights', 'saveFlight', 'getExpenses', 'saveExpense',
        'getRevenues', 'saveRevenue'].includes(key)
    ).map(([key, value]) => [key, typeof value === 'function' 
      ? async (...args: any[]) => (value as any)(...args)
      : value])
  ),
};

// ============================================
// CONVERSORES DB <-> APP
// ============================================

function convertAircraftFromDB(db: any): Aircraft {
  return {
    id: db.id,
    prefixo: db.prefixo,
    modelo: db.modelo,
    fabricante: db.fabricante,
    numeroSerie: db.numero_serie,
    anoFabricacao: db.ano_fabricacao,
    tipo: db.tipo,
    baseHangar: db.base_hangar,
    consumoMedio: db.consumo_medio,
    velocidadeCruzeiro: db.velocidade_cruzeiro,
    tipoCombustivel: db.tipo_combustivel,
    unidadeCombustivel: db.unidade_combustivel,
    horasCelula: db.horas_celula,
    horasMotor: db.horas_motor,
    ciclosTotais: db.ciclos_totais,
    active: db.active,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

function convertAircraftToDB(aircraft: Aircraft): any {
  return {
    prefixo: aircraft.prefixo,
    modelo: aircraft.modelo,
    fabricante: aircraft.fabricante,
    numero_serie: aircraft.numeroSerie,
    ano_fabricacao: aircraft.anoFabricacao,
    tipo: aircraft.tipo,
    base_hangar: aircraft.baseHangar,
    consumo_medio: aircraft.consumoMedio,
    velocidade_cruzeiro: aircraft.velocidadeCruzeiro,
    tipo_combustivel: aircraft.tipoCombustivel,
    unidade_combustivel: aircraft.unidadeCombustivel,
    horas_celula: aircraft.horasCelula,
    horas_motor: aircraft.horasMotor,
    ciclos_totais: aircraft.ciclosTotais,
    active: aircraft.active,
  };
}

function convertFlightFromDB(db: any): Flight {
  return {
    id: db.id,
    aircraftId: db.aircraft_id,
    pilotoId: db.piloto_id,
    copilotoId: db.copiloto_id,
    responsavelFinanceiro: db.responsavel_financeiro,
    data: db.data,
    origem: db.origem,
    origemIcao: db.origem_icao,
    destino: db.destino,
    destinoIcao: db.destino_icao,
    escalas: db.escalas ? (typeof db.escalas === 'string' ? JSON.parse(db.escalas) : db.escalas) : undefined,
    horarioBlocoOff: db.horario_bloco_off,
    horarioBlocoOn: db.horario_bloco_on,
    tempoVoo: db.tempo_voo,
    tempoTaxi: db.tempo_taxi,
    horasMotor: db.horas_motor,
    horasCelula: db.horas_celula,
    ciclos: db.ciclos,
    combustivelConsumido: db.combustivel_consumido,
    combustivelAbastecido: db.combustivel_abastecido,
    tipoVoo: db.tipo_voo,
    observacoes: db.observacoes,
    anexos: db.anexos ? (typeof db.anexos === 'string' ? JSON.parse(db.anexos) : db.anexos) : undefined,
    estimativaId: db.estimativa_id,
    despesasIds: db.despesas_ids,
    rateioHoras: db.rateio_horas ? (typeof db.rateio_horas === 'string' ? JSON.parse(db.rateio_horas) : db.rateio_horas) : undefined,
    createdAt: db.created_at,
    createdBy: db.created_by,
    updatedAt: db.updated_at,
  };
}

function convertFlightToDB(flight: Flight): any {
  return {
    aircraftId: flight.aircraftId,
    pilotoId: flight.pilotoId,
    copilotoId: flight.copilotoId,
    responsavelFinanceiro: flight.responsavelFinanceiro,
    data: flight.data,
    origem: flight.origem,
    origemIcao: flight.origemIcao,
    destino: flight.destino,
    destinoIcao: flight.destinoIcao,
    escalas: flight.escalas,
    horarioBlocoOff: flight.horarioBlocoOff,
    horarioBlocoOn: flight.horarioBlocoOn,
    tempoVoo: flight.tempoVoo,
    tempoTaxi: flight.tempoTaxi,
    horasMotor: flight.horasMotor,
    horasCelula: flight.horasCelula,
    ciclos: flight.ciclos,
    combustivelConsumido: flight.combustivelConsumido,
    combustivelAbastecido: flight.combustivelAbastecido,
    tipoVoo: flight.tipoVoo,
    observacoes: flight.observacoes,
    anexos: flight.anexos,
    estimativaId: flight.estimativaId,
    despesasIds: flight.despesasIds,
    rateioHoras: flight.rateioHoras,
  };
}

function convertExpenseFromDB(db: any): Expense {
  return {
    id: db.id,
    aircraftId: db.aircraft_id,
    flightId: db.flight_id,
    categoria: db.categoria,
    tipo: db.tipo,
    descricao: db.descricao,
    valor: db.valor,
    moeda: db.moeda,
    data: db.data,
    dataVencimento: db.data_vencimento,
    metodoPagamento: db.metodo_pagamento,
    fornecedor: db.fornecedor,
    contaBancariaId: db.conta_bancaria_id,
    anexos: db.anexos ? (typeof db.anexos === 'string' ? JSON.parse(db.anexos) : db.anexos) : undefined,
    recorrencia: db.recorrencia,
    recorrenciaCustomDias: db.recorrencia_custom_dias,
    rateioAutomatico: db.rateio_automatico,
    subVoo: db.sub_voo,
    rateioManual: db.rateio_manual ? (typeof db.rateio_manual === 'string' ? JSON.parse(db.rateio_manual) : db.rateio_manual) : undefined,
    observacoes: db.observacoes,
    createdAt: db.created_at,
    createdBy: db.created_by,
  };
}

function convertExpenseToDB(expense: Expense): any {
  return {
    aircraftId: expense.aircraftId,
    flightId: expense.flightId,
    categoria: expense.categoria,
    tipo: expense.tipo,
    descricao: expense.descricao,
    valor: expense.valor,
    moeda: expense.moeda,
    data: expense.data,
    dataVencimento: expense.dataVencimento,
    metodoPagamento: expense.metodoPagamento,
    fornecedor: expense.fornecedor,
    contaBancariaId: expense.contaBancariaId,
    anexos: expense.anexos,
    recorrencia: expense.recorrencia,
    recorrenciaCustomDias: expense.recorrenciaCustomDias,
    rateioAutomatico: expense.rateioAutomatico,
    subVoo: expense.subVoo,
    rateioManual: expense.rateioManual,
    observacoes: expense.observacoes,
  };
}

function convertRevenueFromDB(db: any): Revenue {
  return {
    id: db.id,
    aircraftId: db.aircraft_id,
    categoria: db.categoria,
    descricao: db.descricao,
    valor: db.valor,
    moeda: db.moeda,
    data: db.data,
    contaBancariaId: db.conta_bancaria_id,
    origem: db.origem,
    subVoo: db.sub_voo,
    rateioAutomatico: db.rateio_automatico,
    rateioManual: db.rateio_manual ? (typeof db.rateio_manual === 'string' ? JSON.parse(db.rateio_manual) : db.rateio_manual) : undefined,
    observacoes: db.observacoes,
    anexos: db.anexos ? (typeof db.anexos === 'string' ? JSON.parse(db.anexos) : db.anexos) : undefined,
    createdAt: db.created_at,
    createdBy: db.created_by,
  };
}

function convertRevenueToDB(revenue: Revenue): any {
  return {
    aircraftId: revenue.aircraftId,
    categoria: revenue.categoria,
    descricao: revenue.descricao,
    valor: revenue.valor,
    moeda: revenue.moeda,
    data: revenue.data,
    contaBancariaId: revenue.contaBancariaId,
    origem: revenue.origem,
    subVoo: revenue.subVoo,
    rateioAutomatico: revenue.rateioAutomatico,
    rateioManual: revenue.rateioManual,
    observacoes: revenue.observacoes,
    anexos: revenue.anexos,
  };
}
