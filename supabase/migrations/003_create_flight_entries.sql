-- ============================================
-- 003 - CREATE flight_entries
-- ============================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.flight_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aircraft_id UUID NOT NULL REFERENCES public.aircrafts(id) ON DELETE CASCADE,

  voo TEXT NOT NULL,
  sub_voo TEXT NOT NULL,
  data DATE NOT NULL,

  grupo TEXT NOT NULL CHECK (grupo IN ('grossi', 'shimada', 'grossi_shimada', 'outros')),

  origem TEXT NOT NULL,
  origem_icao TEXT,
  destino TEXT NOT NULL,
  destino_icao TEXT,

  tempo_acionamento_corte INTEGER NOT NULL,
  tempo_voo INTEGER NOT NULL,

  combustivel_inicial DECIMAL(10, 2) NOT NULL,
  abastecimento_libras DECIMAL(10, 2) NOT NULL,
  abastecimento_litros DECIMAL(10, 2) NOT NULL,
  local_abastecimento TEXT,

  combustivel_decolagem DECIMAL(10, 2) NOT NULL,
  combustivel_consumido DECIMAL(10, 2) NOT NULL,
  combustivel_consumido_litros DECIMAL(10, 2) NOT NULL,
  combustivel_final DECIMAL(10, 2) NOT NULL,

  tipo_medicao_combustivel TEXT NOT NULL CHECK (tipo_medicao_combustivel IN ('estimado', 'medido')),

  valor_combustivel DECIMAL(10, 2) DEFAULT 0,
  hangar DECIMAL(10, 2) DEFAULT 0,
  alimentacao DECIMAL(10, 2) DEFAULT 0,
  hospedagem DECIMAL(10, 2) DEFAULT 0,
  limpeza DECIMAL(10, 2) DEFAULT 0,
  uber_taxi DECIMAL(10, 2) DEFAULT 0,
  tarifas DECIMAL(10, 2) DEFAULT 0,
  outras DECIMAL(10, 2) DEFAULT 0,

  provisao_tbo_grossi DECIMAL(10, 2) DEFAULT 0,
  provisao_tbo_shimada DECIMAL(10, 2) DEFAULT 0,

  total DECIMAL(10, 2) NOT NULL,

  cobrado_de TEXT,
  rateio_observacao TEXT,

  status TEXT NOT NULL DEFAULT 'provisorio' CHECK (status IN ('provisorio', 'conferido')),

  observacoes TEXT,
  anexos JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(aircraft_id, voo, sub_voo)
);

CREATE INDEX IF NOT EXISTS idx_flight_entries_aircraft_id ON public.flight_entries(aircraft_id);
CREATE INDEX IF NOT EXISTS idx_flight_entries_data ON public.flight_entries(data DESC);
CREATE INDEX IF NOT EXISTS idx_flight_entries_voo ON public.flight_entries(voo, sub_voo);
