// ============================================
// SCRIPT DE MIGRAÇÃO: localStorage → Supabase
// ============================================
// Uso: tsx scripts/migrate-localStorage-to-supabase.ts

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import type { Database } from '../src/services/database.types';

// Carregar variáveis de ambiente
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing Supabase environment variables!');
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient<Database>(supabaseUrl, supabaseServiceRoleKey);

// Função para ler dados do localStorage (simulando)
function readLocalStorageData(key: string): any {
  // Em produção, isso seria lido do localStorage do navegador
  // Por enquanto, assumimos que os dados estão em um arquivo JSON
  const dataPath = path.join(process.cwd(), 'localStorage-backup.json');
  
  if (!fs.existsSync(dataPath)) {
    console.warn(`File ${dataPath} not found. Please export localStorage data first.`);
    return null;
  }

  const backup = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  return backup[key] || [];
}

async function migrateAircrafts() {
  console.log('Migrating aircrafts...');
  const aircrafts = readLocalStorageData('aerogestao_aircraft') || [];
  
  for (const aircraft of aircrafts) {
    const { error } = await supabase.from('aircrafts').upsert({
      id: aircraft.id,
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
      created_at: aircraft.createdAt,
      updated_at: aircraft.updatedAt,
    });

    if (error) {
      console.error(`Error migrating aircraft ${aircraft.prefixo}:`, error);
    } else {
      console.log(`✓ Migrated aircraft ${aircraft.prefixo}`);
    }
  }
}

async function migrateFlights() {
  console.log('Migrating flights...');
  const flights = readLocalStorageData('aerogestao_flights') || [];
  
  for (const flight of flights) {
    const { error } = await supabase.from('flights').upsert({
      id: flight.id,
      aircraft_id: flight.aircraftId,
      piloto_id: flight.pilotoId,
      copiloto_id: flight.copilotoId,
      responsavel_financeiro: flight.responsavelFinanceiro,
      data: flight.data,
      origem: flight.origem,
      origem_icao: flight.origemIcao,
      destino: flight.destino,
      destino_icao: flight.destinoIcao,
      escalas: flight.escalas,
      horario_bloco_off: flight.horarioBlocoOff,
      horario_bloco_on: flight.horarioBlocoOn,
      tempo_voo: flight.tempoVoo,
      tempo_taxi: flight.tempoTaxi,
      horas_motor: flight.horasMotor,
      horas_celula: flight.horasCelula,
      ciclos: flight.ciclos,
      combustivel_consumido: flight.combustivelConsumido,
      combustivel_abastecido: flight.combustivelAbastecido,
      tipo_voo: flight.tipoVoo,
      observacoes: flight.observacoes,
      anexos: flight.anexos,
      estimativa_id: flight.estimativaId,
      despesas_ids: flight.despesasIds,
      rateio_horas: flight.rateioHoras,
      created_at: flight.createdAt,
      created_by: flight.createdBy,
      updated_at: flight.updatedAt,
    });

    if (error) {
      console.error(`Error migrating flight ${flight.id}:`, error);
    } else {
      console.log(`✓ Migrated flight ${flight.id}`);
    }
  }
}

async function migrateExpenses() {
  console.log('Migrating expenses...');
  const expenses = readLocalStorageData('aerogestao_expenses') || [];
  
  for (const expense of expenses) {
    const { error } = await supabase.from('expenses').upsert({
      id: expense.id,
      aircraft_id: expense.aircraftId,
      flight_id: expense.flightId,
      categoria: expense.categoria,
      tipo: expense.tipo,
      descricao: expense.descricao,
      valor: expense.valor,
      moeda: expense.moeda,
      data: expense.data,
      data_vencimento: expense.dataVencimento,
      metodo_pagamento: expense.metodoPagamento,
      fornecedor: expense.fornecedor,
      conta_bancaria_id: expense.contaBancariaId,
      anexos: expense.anexos,
      recorrencia: expense.recorrencia,
      recorrencia_custom_dias: expense.recorrenciaCustomDias,
      rateio_automatico: expense.rateioAutomatico,
      sub_voo: expense.subVoo,
      rateio_manual: expense.rateioManual,
      observacoes: expense.observacoes,
      created_at: expense.createdAt,
      created_by: expense.createdBy,
    });

    if (error) {
      console.error(`Error migrating expense ${expense.id}:`, error);
    } else {
      console.log(`✓ Migrated expense ${expense.id}`);
    }
  }
}

async function main() {
  console.log('Starting migration from localStorage to Supabase...\n');

  // Backup primeiro
  console.log('⚠️  IMPORTANTE: Faça backup do localStorage antes de migrar!\n');

  try {
    await migrateAircrafts();
    await migrateFlights();
    await migrateExpenses();

    console.log('\n✅ Migration completed!');
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  main();
}
