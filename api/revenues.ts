// ============================================
// API: REVENUES (Receitas)
// ============================================

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAuthenticatedUser, isAdminOrGestor } from './utils/auth';
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
    console.error('Error in /api/revenues:', error);
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
    .from('revenues')
    .select('*')
    .order('data', { ascending: false });

  if (aircraftId) {
    query = query.eq('aircraft_id', aircraftId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching revenues:', error);
    return res.status(500).json({ error: 'Failed to fetch revenues' });
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
    .from('revenues')
    .insert({
      aircraft_id: body.aircraftId,
      categoria: body.categoria,
      descricao: body.descricao,
      valor: body.valor,
      moeda: body.moeda || 'BRL',
      data: body.data,
      conta_bancaria_id: body.contaBancariaId,
      origem: body.origem,
      sub_voo: body.subVoo,
      rateio_automatico: body.rateioAutomatico !== undefined ? body.rateioAutomatico : false,
      rateio_manual: body.rateioManual ? JSON.stringify(body.rateioManual) : null,
      observacoes: body.observacoes,
      anexos: body.anexos ? JSON.stringify(body.anexos) : null,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating revenue:', error);
    return res.status(500).json({ error: 'Failed to create revenue' });
  }

  return res.status(201).json(data);
}
