// ============================================
// API: FLIGHTS (Voos)
// ============================================

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAuthenticatedUser } from './utils/auth';
import { getSupabaseClient } from './utils/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'GET') {
      return handleGet(req, res);
    } else if (req.method === 'POST') {
      return handlePost(req, res);
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Error in /api/flights:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

async function handleGet(req: VercelRequest, res: VercelResponse) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const aircraftId = req.query.aircraft_id as string | undefined;
  const token = req.headers.authorization?.replace('Bearer ', '') || '';
  const supabase = getSupabaseClient(token);

  let query = supabase
    .from('flights')
    .select('*')
    .order('data', { ascending: false });

  if (aircraftId) {
    query = query.eq('aircraft_id', aircraftId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching flights:', error);
    return res.status(500).json({ error: 'Failed to fetch flights' });
  }

  return res.status(200).json(data || []);
}

async function handlePost(req: VercelRequest, res: VercelResponse) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const body = req.body;
  const token = req.headers.authorization?.replace('Bearer ', '') || '';
  const supabase = getSupabaseClient(token);

  const { data, error } = await supabase
    .from('flights')
    .insert({
      aircraft_id: body.aircraftId,
      piloto_id: body.pilotoId || user.id,
      copiloto_id: body.copilotoId,
      responsavel_financeiro: body.responsavelFinanceiro,
      data: body.data,
      origem: body.origem,
      origem_icao: body.origemIcao,
      destino: body.destino,
      destino_icao: body.destinoIcao,
      escalas: body.escalas ? JSON.stringify(body.escalas) : null,
      horario_bloco_off: body.horarioBlocoOff,
      horario_bloco_on: body.horarioBlocoOn,
      tempo_voo: body.tempoVoo,
      tempo_taxi: body.tempoTaxi,
      horas_motor: body.horasMotor,
      horas_celula: body.horasCelula,
      ciclos: body.ciclos || 1,
      combustivel_consumido: body.combustivelConsumido,
      combustivel_abastecido: body.combustivelAbastecido,
      tipo_voo: body.tipoVoo,
      observacoes: body.observacoes,
      anexos: body.anexos ? JSON.stringify(body.anexos) : null,
      estimativa_id: body.estimativaId,
      despesas_ids: body.despesasIds,
      rateio_horas: body.rateioHoras ? JSON.stringify(body.rateioHoras) : null,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating flight:', error);
    return res.status(500).json({ error: 'Failed to create flight' });
  }

  return res.status(201).json(data);
}
