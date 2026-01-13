-- ============================================
-- 004 - RLS flight_entries
-- ============================================

ALTER TABLE public.flight_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "flight_entries_select_members"
ON public.flight_entries
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.memberships m
    WHERE m.aircraft_id = flight_entries.aircraft_id
      AND m.user_id = auth.uid()
      AND m.status = 'ativo'
  )
);

CREATE POLICY "flight_entries_insert_members"
ON public.flight_entries
FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.memberships m
    WHERE m.aircraft_id = flight_entries.aircraft_id
      AND m.user_id = auth.uid()
      AND m.status = 'ativo'
  )
);

CREATE POLICY "flight_entries_update_owner"
ON public.flight_entries
FOR UPDATE
TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

CREATE POLICY "flight_entries_delete_owner"
ON public.flight_entries
FOR DELETE
TO authenticated
USING (created_by = auth.uid());


