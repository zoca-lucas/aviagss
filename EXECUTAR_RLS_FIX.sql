-- ============================================
-- FIX RLS PARA PERMITIR CADASTRO DE USUÁRIOS
-- ============================================
-- Execute este SQL no Supabase SQL Editor
-- Este script corrige as políticas RLS para permitir cadastro

-- ============================================
-- USER PROFILES - Permitir cadastro
-- ============================================

-- Garantir que RLS está habilitado
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "user_profiles_select" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_insert_own" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_own" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_admin" ON user_profiles;

-- Criar políticas corretas
CREATE POLICY "user_profiles_select"
ON user_profiles
FOR SELECT
TO authenticated
USING (true);

-- POLÍTICA MAIS IMPORTANTE: Permite cadastro
CREATE POLICY "user_profiles_insert_own"
ON user_profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_profiles_update_own"
ON user_profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_profiles_update_admin"
ON user_profiles
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'gestor')
  )
);
