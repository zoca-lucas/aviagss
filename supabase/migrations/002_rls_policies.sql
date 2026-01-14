-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================
-- Este migration configura as políticas de segurança de nível de linha

-- ============================================
-- 1. USER PROFILES
-- ============================================
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

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

CREATE POLICY "aircrafts_select_members"
ON aircrafts
FOR SELECT
TO authenticated
USING (
  active = true AND (
    -- Admin e gestores veem todos
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'gestor')
    )
    OR
    -- Usuários veem apenas aeronaves em que são membros
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

CREATE POLICY "memberships_select"
ON memberships
FOR SELECT
TO authenticated
USING (
  -- Usuário vê suas próprias memberships
  user_id = auth.uid()
  OR
  -- Admin e gestores veem todas
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
