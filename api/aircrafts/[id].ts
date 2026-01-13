// ============================================
// API: AIRCRAFTS BY ID
// ============================================

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAuthenticatedUser, isAdminOrGestor } from '../utils/auth';
import { getSupabaseClient } from '../utils/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'GET') {
      return handleGet(req, res);
    } else if (req.method === 'PUT') {
      return handlePut(req, res);
    } else if (req.method === 'DELETE') {
      return handleDelete(req, res);
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Error in /api/aircrafts/[id]:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

async function handleGet(req: VercelRequest, res: VercelResponse) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const aircraftId = req.query.id as string;
  const token = req.headers.authorization?.replace('Bearer ', '') || '';
  const supabase = getSupabaseClient(token);

  const { data, error } = await supabase
    .from('aircrafts')
    .select('*')
    .eq('id', aircraftId)
    .single();

  if (error || !data) {
    return res.status(404).json({ error: 'Aircraft not found' });
  }

  // Verificar se usuário tem acesso (se não for admin)
  if (!isAdminOrGestor(user)) {
    const { data: membership } = await supabase
      .from('memberships')
      .select('id')
      .eq('aircraft_id', aircraftId)
      .eq('user_id', user.id)
      .eq('status', 'ativo')
      .single();

    if (!membership) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  return res.status(200).json(data);
}

async function handlePut(req: VercelRequest, res: VercelResponse) {
  const user = await getAuthenticatedUser(req);
  if (!user || !isAdminOrGestor(user)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const aircraftId = req.query.id as string;
  const body = req.body;
  const token = req.headers.authorization?.replace('Bearer ', '') || '';
  const supabase = getSupabaseClient(token);

  const { data, error } = await supabase
    .from('aircrafts')
    .update({
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
      horas_celula: body.horasCelula,
      horas_motor: body.horasMotor,
      ciclos_totais: body.ciclosTotais,
      active: body.active,
      updated_at: new Date().toISOString(),
    })
    .eq('id', aircraftId)
    .select()
    .single();

  if (error) {
    console.error('Error updating aircraft:', error);
    return res.status(500).json({ error: 'Failed to update aircraft' });
  }

  return res.status(200).json(data);
}

async function handleDelete(req: VercelRequest, res: VercelResponse) {
  const user = await getAuthenticatedUser(req);
  if (!user || !isAdminOrGestor(user)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const aircraftId = req.query.id as string;
  const token = req.headers.authorization?.replace('Bearer ', '') || '';
  const supabase = getSupabaseClient(token);

  // Soft delete (marcar como inactive)
  const { error } = await supabase
    .from('aircrafts')
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq('id', aircraftId);

  if (error) {
    console.error('Error deleting aircraft:', error);
    return res.status(500).json({ error: 'Failed to delete aircraft' });
  }

  return res.status(200).json({ success: true });
}
