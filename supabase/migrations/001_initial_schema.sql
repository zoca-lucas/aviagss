-- ============================================
-- SCHEMA INICIAL - AEROGESTÃO
-- ============================================
-- Este migration cria todas as tabelas necessárias para o sistema

-- Extensões necessárias (Supabase padrão)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- 1. USER PROFILES (estende Supabase Auth users)
-- ============================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  telefone TEXT,
  role TEXT NOT NULL DEFAULT 'cotista'
    CHECK (role IN ('admin', 'gestor', 'piloto', 'cotista')),
  avatar TEXT,
  horas_totais DECIMAL(10,2) DEFAULT 0,
  observacoes TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 2. AIRCRAFTS (Aeronaves)
-- ============================================
CREATE TABLE IF NOT EXISTS aircrafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prefixo TEXT NOT NULL UNIQUE,
  modelo TEXT NOT NULL,
  fabricante TEXT NOT NULL,
  numero_serie TEXT NOT NULL,
  ano_fabricacao INTEGER NOT NULL,
  tipo TEXT NOT NULL
    CHECK (tipo IN ('pistao','turbohelice','jato','helicoptero')),
  base_hangar TEXT,
  consumo_medio DECIMAL(10,2) NOT NULL,
  velocidade_cruzeiro DECIMAL(10,2) NOT NULL,
  tipo_combustivel TEXT NOT NULL
    CHECK (tipo_combustivel IN ('avgas','jet-a')),
  unidade_combustivel TEXT NOT NULL DEFAULT 'litros'
    CHECK (unidade_combustivel IN ('litros','galoes')),
  horas_celula DECIMAL(10,2) DEFAULT 0,
  horas_motor DECIMAL(10,2) DEFAULT 0,
  ciclos_totais INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 3. MEMBERSHIPS
-- ============================================
CREATE TABLE IF NOT EXISTS memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  aircraft_id UUID NOT NULL REFERENCES aircrafts(id) ON DELETE CASCADE,
  tipo_participacao TEXT NOT NULL
    CHECK (tipo_participacao IN ('cotista','operador')),
  rateio_type TEXT NOT NULL
    CHECK (rateio_type IN ('hora_voo','pouso','cota_fixa','hibrido')),
  cota_percentual DECIMAL(5,2),
  mensalidade_fixa DECIMAL(10,2),
  desconto_percentual DECIMAL(5,2),
  teto_mensal DECIMAL(10,2),
  status TEXT NOT NULL DEFAULT 'ativo'
    CHECK (status IN ('ativo','inativo','suspenso')),
  data_inicio DATE NOT NULL,
  data_fim DATE,
  observacoes TEXT,
  UNIQUE (user_id, aircraft_id)
);

-- ============================================
-- 4. FLIGHTS
-- ============================================
CREATE TABLE IF NOT EXISTS flights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aircraft_id UUID NOT NULL REFERENCES aircrafts(id) ON DELETE CASCADE,
  piloto_id UUID NOT NULL REFERENCES auth.users(id),
  copiloto_id UUID REFERENCES auth.users(id),
  responsavel_financeiro UUID REFERENCES auth.users(id),
  data DATE NOT NULL,
  origem TEXT NOT NULL,
  origem_icao TEXT,
  destino TEXT NOT NULL,
  destino_icao TEXT,
  escalas JSONB,
  horario_bloco_off TEXT,
  horario_bloco_on TEXT,
  tempo_voo DECIMAL(10,2) NOT NULL,
  tempo_taxi INTEGER,
  horas_motor DECIMAL(10,2) NOT NULL,
  horas_celula DECIMAL(10,2) NOT NULL,
  ciclos INTEGER NOT NULL DEFAULT 1,
  combustivel_consumido DECIMAL(10,2),
  combustivel_abastecido DECIMAL(10,2),
  tipo_voo TEXT
    CHECK (tipo_voo IN ('normal','instrucao','teste','manutencao','translado','outros')),
  observacoes TEXT,
  anexos JSONB,
  estimativa_id UUID,
  despesas_ids UUID[],
  rateio_horas JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 5. BANK ACCOUNTS
-- ============================================
CREATE TABLE IF NOT EXISTS bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aircraft_id UUID NOT NULL REFERENCES aircrafts(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  banco TEXT NOT NULL,
  agencia TEXT,
  conta TEXT,
  saldo_inicial DECIMAL(15,2) NOT NULL DEFAULT 0,
  saldo_atual DECIMAL(15,2) NOT NULL DEFAULT 0,
  ativa BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 6. EXPENSES
-- ============================================
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aircraft_id UUID NOT NULL REFERENCES aircrafts(id) ON DELETE CASCADE,
  flight_id UUID REFERENCES flights(id) ON DELETE SET NULL,
  categoria TEXT NOT NULL
    CHECK (categoria IN ('combustivel','manutencao','hangaragem','seguro','taxas','pecas','assinaturas','outros')),
  tipo TEXT NOT NULL CHECK (tipo IN ('fixo','variavel')),
  descricao TEXT NOT NULL,
  valor DECIMAL(15,2) NOT NULL,
  moeda TEXT NOT NULL DEFAULT 'BRL',
  data DATE NOT NULL,
  data_vencimento DATE,
  metodo_pagamento TEXT,
  fornecedor TEXT,
  conta_bancaria_id UUID REFERENCES bank_accounts(id),
  anexos JSONB,
  recorrencia TEXT
    CHECK (recorrencia IN ('mensal','trimestral','anual','custom')),
  recorrencia_custom_dias INTEGER,
  rateio_automatico BOOLEAN NOT NULL DEFAULT true,
  sub_voo TEXT,
  rateio_manual JSONB,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id)
);

-- ============================================
-- 7. REVENUES
-- ============================================
CREATE TABLE IF NOT EXISTS revenues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aircraft_id UUID NOT NULL REFERENCES aircrafts(id) ON DELETE CASCADE,
  categoria TEXT NOT NULL
    CHECK (categoria IN ('aplicacao_financeira','aporte_financeiro','reembolso','outras_receitas')),
  descricao TEXT NOT NULL,
  valor DECIMAL(15,2) NOT NULL,
  moeda TEXT NOT NULL DEFAULT 'BRL',
  data DATE NOT NULL,
  conta_bancaria_id UUID NOT NULL REFERENCES bank_accounts(id),
  origem TEXT,
  sub_voo TEXT,
  rateio_automatico BOOLEAN NOT NULL DEFAULT false,
  rateio_manual JSONB,
  observacoes TEXT,
  anexos JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id)
);

-- ============================================
-- TRIGGER updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_user_profiles_updated_at
BEFORE UPDATE ON user_profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_aircrafts_updated_at
BEFORE UPDATE ON aircrafts
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_flights_updated_at
BEFORE UPDATE ON flights
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_bank_accounts_updated_at
BEFORE UPDATE ON bank_accounts
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
