// ============================================
// API: EXPENSES (Despesas)
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
    console.error('Error in /api/expenses:', error);
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
    .from('expenses')
    .select('*')
    .order('data', { ascending: false });

  if (aircraftId) {
    query = query.eq('aircraft_id', aircraftId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching expenses:', error);
    return res.status(500).json({ error: 'Failed to fetch expenses' });
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
    .from('expenses')
    .insert({
      aircraft_id: body.aircraftId,
      flight_id: body.flightId,
      categoria: body.categoria,
      tipo: body.tipo,
      descricao: body.descricao,
      valor: body.valor,
      moeda: body.moeda || 'BRL',
      data: body.data,
      data_vencimento: body.dataVencimento,
      metodo_pagamento: body.metodoPagamento,
      fornecedor: body.fornecedor,
      conta_bancaria_id: body.contaBancariaId,
      anexos: body.anexos ? JSON.stringify(body.anexos) : null,
      recorrencia: body.recorrencia,
      recorrencia_custom_dias: body.recorrenciaCustomDias,
      rateio_automatico: body.rateioAutomatico !== undefined ? body.rateioAutomatico : true,
      sub_voo: body.subVoo,
      rateio_manual: body.rateioManual ? JSON.stringify(body.rateioManual) : null,
      observacoes: body.observacoes,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating expense:', error);
    return res.status(500).json({ error: 'Failed to create expense' });
  }

  return res.status(201).json(data);
}
