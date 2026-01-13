// ============================================
// TIPOS DO BANCO DE DADOS (Supabase)
// ============================================
// Este arquivo será gerado automaticamente pelo Supabase CLI
// Por enquanto, vamos criar uma versão básica baseada nos tipos TypeScript

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string
          user_id: string
          nome: string
          telefone: string | null
          role: string
          avatar: string | null
          horas_totais: number
          observacoes: string | null
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['user_profiles']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['user_profiles']['Insert']>
      }
      aircrafts: {
        Row: {
          id: string
          prefixo: string
          modelo: string
          fabricante: string
          numero_serie: string
          ano_fabricacao: number
          tipo: string
          base_hangar: string | null
          consumo_medio: number
          velocidade_cruzeiro: number
          tipo_combustivel: string
          unidade_combustivel: string
          horas_celula: number
          horas_motor: number
          ciclos_totais: number
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['aircrafts']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['aircrafts']['Insert']>
      }
      flights: {
        Row: {
          id: string
          aircraft_id: string
          piloto_id: string
          copiloto_id: string | null
          responsavel_financeiro: string | null
          data: string
          origem: string
          origem_icao: string | null
          destino: string
          destino_icao: string | null
          escalas: Json | null
          horario_bloco_off: string | null
          horario_bloco_on: string | null
          tempo_voo: number
          tempo_taxi: number | null
          horas_motor: number
          horas_celula: number
          ciclos: number
          combustivel_consumido: number | null
          combustivel_abastecido: number | null
          tipo_voo: string | null
          observacoes: string | null
          anexos: Json | null
          estimativa_id: string | null
          despesas_ids: string[] | null
          rateio_horas: Json | null
          created_at: string
          created_by: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['flights']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['flights']['Insert']>
      }
      expenses: {
        Row: {
          id: string
          aircraft_id: string
          flight_id: string | null
          categoria: string
          tipo: string
          descricao: string
          valor: number
          moeda: string
          data: string
          data_vencimento: string | null
          metodo_pagamento: string | null
          fornecedor: string | null
          conta_bancaria_id: string | null
          anexos: Json | null
          recorrencia: string | null
          recorrencia_custom_dias: number | null
          rateio_automatico: boolean
          sub_voo: string | null
          rateio_manual: Json | null
          observacoes: string | null
          created_at: string
          created_by: string
        }
        Insert: Omit<Database['public']['Tables']['expenses']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['expenses']['Insert']>
      }
      revenues: {
        Row: {
          id: string
          aircraft_id: string
          categoria: string
          descricao: string
          valor: number
          moeda: string
          data: string
          conta_bancaria_id: string
          origem: string | null
          sub_voo: string | null
          rateio_automatico: boolean
          rateio_manual: Json | null
          observacoes: string | null
          anexos: Json | null
          created_at: string
          created_by: string
        }
        Insert: Omit<Database['public']['Tables']['revenues']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['revenues']['Insert']>
      }
      bank_accounts: {
        Row: {
          id: string
          aircraft_id: string
          nome: string
          banco: string
          agencia: string | null
          conta: string | null
          saldo_inicial: number
          saldo_atual: number
          ativa: boolean
          created_at: string
          created_by: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['bank_accounts']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['bank_accounts']['Insert']>
      }
      payments: {
        Row: {
          id: string
          expense_id: string | null
          member_id: string
          aircraft_id: string
          valor: number
          valor_original: number
          desconto: number | null
          descricao: string
          status: string
          data_vencimento: string
          data_pagamento: string | null
          comprovante: Json | null
          observacoes: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['payments']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['payments']['Insert']>
      }
      maintenance_events: {
        Row: {
          id: string
          aircraft_id: string
          component_id: string | null
          tipo: string
          data: string
          descricao: string
          pecas_trocadas: Json | null
          custo: number
          oficina: string | null
          responsavel: string | null
          horas_aeronave: number
          horas_componente: number | null
          ciclos: number | null
          anexos: Json | null
          observacoes: string | null
          created_at: string
          created_by: string
        }
        Insert: Omit<Database['public']['Tables']['maintenance_events']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['maintenance_events']['Insert']>
      }
      maintenance_schedules: {
        Row: {
          id: string
          aircraft_id: string
          component_id: string | null
          nome: string
          descricao: string | null
          tipo: string
          trigger: string
          intervalo_horas: number | null
          intervalo_dias: number | null
          intervalo_ciclos: number | null
          proxima_data: string | null
          proximas_horas: number | null
          proximos_ciclos: number | null
          alerta_antes_dias: number | null
          alerta_antes_horas: number | null
          alerta_antes_ciclos: number | null
          obrigatorio: boolean
          ativo: boolean
          ultima_execucao: string | null
        }
        Insert: Omit<Database['public']['Tables']['maintenance_schedules']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['maintenance_schedules']['Insert']>
      }
      documents: {
        Row: {
          id: string
          aircraft_id: string | null
          user_id: string | null
          tipo: string
          nome: string
          descricao: string | null
          numero: string | null
          data_emissao: string | null
          data_validade: string | null
          arquivo: Json | null
          alerta_antes_dias: number | null
          observacoes: string | null
          created_at: string
          created_by: string
        }
        Insert: Omit<Database['public']['Tables']['documents']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['documents']['Insert']>
      }
      flight_estimates: {
        Row: {
          id: string
          aircraft_id: string
          criado_por: string
          origem: string
          origem_icao: string
          destino: string
          destino_icao: string
          escalas: Json | null
          vento_headwind: number | null
          tempo_taxi: number | null
          tempo_subida_descida: number | null
          preco_combustivel_origem: number | null
          preco_combustivel_destino: number | null
          distancia_total: number
          tempo_voo_estimado: number
          tempo_total: number
          combustivel_necessario: number
          combustivel_com_reserva: number
          custo_combustivel: number
          custo_taxas: number
          custo_operacional: number
          custo_total: number
          custo_por_hora: number
          convertido_em_voo: boolean
          flight_id: string | null
          created_at: string
          observacoes: string | null
        }
        Insert: Omit<Database['public']['Tables']['flight_estimates']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['flight_estimates']['Insert']>
      }
      cash_investments: {
        Row: {
          id: string
          aircraft_id: string
          user_id: string
          principal: number
          start_date: string
          end_date: string
          investment_type: string
          params: Json
          is_simulation: boolean
          status: string
          cash_account_id: string
          estimated_final_value: number | null
          realized_final_value: number | null
          redeemed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['cash_investments']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['cash_investments']['Insert']>
      }
      memberships: {
        Row: {
          id: string
          user_id: string
          aircraft_id: string
          tipo_participacao: string
          rateio_type: string
          cota_percentual: number | null
          mensalidade_fixa: number | null
          desconto_percentual: number | null
          teto_mensal: number | null
          status: string
          data_inicio: string
          data_fim: string | null
          observacoes: string | null
        }
        Insert: Omit<Database['public']['Tables']['memberships']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['memberships']['Insert']>
      }
      audit_logs: {
        Row: {
          id: string
          timestamp: string
          user_id: string
          user_name: string
          action: string
          entity: string
          entity_id: string
          changes: Json
          metadata: Json | null
        }
        Insert: Omit<Database['public']['Tables']['audit_logs']['Row'], 'id' | 'timestamp'>
        Update: Partial<Database['public']['Tables']['audit_logs']['Insert']>
      }
      flight_entries: {
        Row: {
          id: string
          aircraft_id: string
          voo: string
          sub_voo: string
          data: string
          grupo: string
          origem: string
          origem_icao: string | null
          destino: string
          destino_icao: string | null
          tempo_acionamento_corte: number
          tempo_voo: number
          combustivel_inicial: number
          abastecimento_libras: number
          abastecimento_litros: number
          local_abastecimento: string | null
          combustivel_decolagem: number
          combustivel_consumido: number
          combustivel_consumido_litros: number
          combustivel_final: number
          tipo_medicao_combustivel: string
          valor_combustivel: number
          hangar: number
          alimentacao: number
          hospedagem: number
          limpeza: number
          uber_taxi: number
          tarifas: number
          outras: number
          provisao_tbo_grossi: number
          provisao_tbo_shimada: number
          total: number
          cobrado_de: string | null
          rateio_observacao: string | null
          status: string
          observacoes: string | null
          anexos: Json | null
          created_at: string
          created_by: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['flight_entries']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['flight_entries']['Insert']>
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
