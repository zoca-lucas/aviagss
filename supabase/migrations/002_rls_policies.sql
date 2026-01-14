-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================
-- Este migration configura as políticas de segurança de nível de linha

-- ============================================
-- 1. USER PROFILES
-- ============================================
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop policies antigas se existirem
DROP POLICY IF EXISTS "user_profiles_select" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_insert_own" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_own" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_admin" ON user_profiles;

-- Permite que usuários vejam todos os perfis
CREATE POLICY "user_profiles_select"
ON user_profiles
FOR SELECT
TO authenticated
USING (true);

-- Permite que usuários criem seu próprio perfil (durante cadastro)
CREATE POLICY "user_profiles_insert_own"
ON user_profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Permite que usuários atualizem seu próprio perfil
CREATE POLICY "user_profiles_update_own"
ON user_profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Admin e gestores podem atualizar qualquer perfil
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

-- ============================================
-- 2. AIRCRAFTS
-- ============================================
ALTER TABLE aircrafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "aircrafts_select_members" ON aircrafts;
DROP POLICY IF EXISTS "aircrafts_insert_admin" ON aircrafts;
DROP POLICY IF EXISTS "aircrafts_update_admin" ON aircrafts;

CREATE POLICY "aircrafts_select_members"
ON aircrafts
FOR SELECT
TO authenticated
USING (
  active = true AND (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'gestor')
    )
    OR
    EXISTS (
      SELECT 1 FROM memberships
      WHERE aircraft_id = aircrafts.id
      AND user_id = auth.uid()
      AND status = 'ativo'
    )
  )
);

CREATE POLICY "aircrafts_insert_admin"
ON aircrafts
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'gestor')
  )
);

CREATE POLICY "aircrafts_update_admin"
ON aircrafts
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'gestor')
  )
);

-- ============================================
-- 3. MEMBERSHIPS
-- ============================================
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "memberships_select" ON memberships;
DROP POLICY IF EXISTS "memberships_insert_admin" ON memberships;

CREATE POLICY "memberships_select"
ON memberships
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'gestor')
  )
);

CREATE POLICY "memberships_insert_admin"
ON memberships
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'gestor')
  )
);

-- ============================================
-- 4. FLIGHTS
-- ============================================
ALTER TABLE flights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "flights_select_members" ON flights;
DROP POLICY IF EXISTS "flights_insert" ON flights;

CREATE POLICY "flights_select_members"
ON flights
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM memberships
    WHERE aircraft_id = flights.aircraft_id
    AND user_id = auth.uid()
    AND status = 'ativo'
  )
  OR
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'gestor')
  )
);

CREATE POLICY "flights_insert"
ON flights
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM memberships
    WHERE aircraft_id = flights.aircraft_id
    AND user_id = auth.uid()
    AND status = 'ativo'
  )
  OR
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'gestor', 'piloto')
  )
);

-- ============================================
-- 5. EXPENSES
-- ============================================
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "expenses_select_members" ON expenses;
DROP POLICY IF EXISTS "expenses_insert" ON expenses;

CREATE POLICY "expenses_select_members"
ON expenses
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM memberships
    WHERE aircraft_id = expenses.aircraft_id
    AND user_id = auth.uid()
    AND status = 'ativo'
  )
);

CREATE POLICY "expenses_insert"
ON expenses
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM memberships
    WHERE aircraft_id = expenses.aircraft_id
    AND user_id = auth.uid()
    AND status = 'ativo'
  )
  OR
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'gestor')
  )
);

-- ============================================
-- 6. REVENUES
-- ============================================
ALTER TABLE revenues ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "revenues_select_members" ON revenues;
DROP POLICY IF EXISTS "revenues_insert" ON revenues;

CREATE POLICY "revenues_select_members"
ON revenues
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM memberships
    WHERE aircraft_id = revenues.aircraft_id
    AND user_id = auth.uid()
    AND status = 'ativo'
  )
);

CREATE POLICY "revenues_insert"
ON revenues
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM memberships
    WHERE aircraft_id = revenues.aircraft_id
    AND user_id = auth.uid()
    AND status = 'ativo'
  )
  OR
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'gestor')
  )
);
