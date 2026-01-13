// ============================================
// API: AIRCRAFTS (Aeronaves)
// ============================================

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAuthenticatedUser, isAdminOrGestor } from './utils/auth';
import { getSupabaseClient } from './utils/supabase';
import { jsonResponse, errorResponse, unauthorizedResponse } from './utils/response';

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
    console.error('Error in /api/aircrafts:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

async function handleGet(req: VercelRequest, res: VercelResponse) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = req.headers.authorization?.replace('Bearer ', '') || '';
  const supabase = getSupabaseClient(token);

  // Buscar aeronaves que o usuário tem acesso
  const { data: memberships } = await supabase
    .from('memberships')
    .select('aircraft_id')
    .eq('user_id', user.id)
    .eq('status', 'ativo');

  const aircraftIds = memberships?.map(m => m.aircraft_id) || [];

  let query = supabase
    .from('aircrafts')
    .select('*')
    .eq('active', true)
    .order('prefixo', { ascending: true });

  // Se não é admin, filtrar apenas aeronaves que pertence
  if (!isAdminOrGestor(user)) {
    query = query.in('id', aircraftIds);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching aircrafts:', error);
    return res.status(500).json({ error: 'Failed to fetch aircrafts' });
  }

  return res.status(200).json(data || []);
}

async function handlePost(req: VercelRequest, res: VercelResponse) {
  const user = await getAuthenticatedUser(req);
  if (!user || !isAdminOrGestor(user)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const body = req.body;
  const token = req.headers.authorization?.replace('Bearer ', '') || '';
  const supabase = getSupabaseClient(token);

  const { data, error } = await supabase
    .from('aircrafts')
    .insert({
      prefixo: body.prefixo,
      modelo: body.modelo,
      fabricante: body.fabricante,
      numero_serie: body.numeroSerie,
      ano_fabricacao: body.anoFabricacao,
      tipo: body.tipo,
      base_hangar: body.baseHangar,
      consumo_medio: body.consumoMedio,
      velocidade_cruzeiro: body.velocidadeCruzeiro,
      tipo_combustivel: body.tipoCombustivel,
      unidade_combustivel: body.unidadeCombustivel,
      horas_celula: body.horasCelula || 0,
      horas_motor: body.horasMotor || 0,
      ciclos_totais: body.ciclosTotais || 0,
      active: body.active !== undefined ? body.active : true,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating aircraft:', error);
    return res.status(500).json({ error: 'Failed to create aircraft' });
  }

  return res.status(201).json(data);
}
