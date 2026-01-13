// ============================================
// TIPOS BASE E ENUMS
// ============================================

export type UserRole = 'admin' | 'gestor' | 'piloto' | 'cotista';
export type AircraftType = 'pistao' | 'turbohelice' | 'jato' | 'helicoptero';
export type FuelType = 'avgas' | 'jet-a';
export type FuelUnit = 'litros' | 'galoes';
export type MaintenanceType = 'preventiva' | 'corretiva' | 'inspecao' | 'revisao' | 'tbo';
export type MaintenanceTrigger = 'horas' | 'calendario' | 'ciclos';
export type ExpenseCategory = 'combustivel' | 'manutencao' | 'hangaragem' | 'seguro' | 'taxas' | 'pecas' | 'assinaturas' | 'outros';
export type ExpenseType = 'fixo' | 'variavel';
export type RevenueCategory = 'aplicacao_financeira' | 'aporte_financeiro' | 'reembolso' | 'outras_receitas';
export type FinancialTransactionType = 'despesa' | 'receita';
export type PaymentStatus = 'pendente' | 'pago' | 'atrasado';
export type DocumentType = 'aeronavegabilidade' | 'seguro' | 'manual' | 'diario_manutencao' | 'cma' | 'licenca' | 'habilitacao' | 'outros';
export type AlertType = 'manutencao' | 'documento' | 'financeiro' | 'inspecao';
export type AlertSeverity = 'info' | 'warning' | 'critical';
export type MembershipStatus = 'ativo' | 'inativo' | 'suspenso';
export type RateioType = 'hora_voo' | 'pouso' | 'cota_fixa' | 'hibrido';

// ============================================
// AUDITORIA
// ============================================

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: 'create' | 'update' | 'delete';
  entity: string;
  entityId: string;
  changes: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  metadata?: Record<string, any>;
}

// ============================================
// USUÁRIOS E MEMBROS
// ============================================

export interface User {
  id: string;
  email: string;
  nome: string;
  telefone?: string;
  role: UserRole;
  avatar?: string;
  horasTotais: number;
  observacoes?: string;
  createdAt: string;
  updatedAt: string;
  active: boolean;
}

export interface UserLicense {
  id: string;
  userId: string;
  tipo: string; // CMA, IFRA, MLTE, PP, PC, PLA, etc.
  numero?: string;
  validade: string;
  observacoes?: string;
}

export interface Membership {
  id: string;
  userId: string;
  aircraftId: string;
  tipoParticipacao: 'cotista' | 'operador';
  rateioType: RateioType;
  cotaPercentual?: number; // Para cota fixa ou híbrido
  mensalidadeFixa?: number;
  descontoPercentual?: number;
  tetoMensal?: number;
  status: MembershipStatus;
  dataInicio: string;
  dataFim?: string;
  observacoes?: string;
}

// ============================================
// AERONAVES E COMPONENTES
// ============================================

export interface Aircraft {
  id: string;
  prefixo: string;
  modelo: string;
  fabricante: string;
  numeroSerie: string;
  anoFabricacao: number;
  tipo: AircraftType;
  baseHangar?: string;
  consumoMedio: number; // L/h
  velocidadeCruzeiro: number; // kt
  tipoCombustivel: FuelType;
  unidadeCombustivel: FuelUnit;
  horasCelula: number;
  horasMotor?: number; // Horímetro do motor (se diferente da célula)
  ciclosTotais: number;
  custoHora?: number; // Custo operacional por hora
  reservaCombustivel?: number; // minutos de reserva
  margemSeguranca?: number; // percentual
  observacoes?: string;
  imagemUrl?: string;
  createdAt: string;
  updatedAt: string;
  active: boolean;
}

export interface AircraftComponent {
  id: string;
  aircraftId: string;
  tipo: 'motor' | 'helice' | 'celula';
  posicao?: string; // ex: "esquerdo", "direito", "1", "2"
  serial: string;
  modelo?: string;
  fabricante?: string;
  limiteTSO?: number; // Time Since Overhaul limit
  horasAtuais: number;
  ciclosAtuais?: number;
  dataInstalacao?: string;
  ultimaRevisao?: string;
  observacoes?: string;
}

// ============================================
// CADASTRO DE PEÇAS/COMPONENTES (CONSUMÍVEIS E ITENS DE TROCA)
// ============================================

export type PartCategory = 
  | 'motor' 
  | 'celula' 
  | 'trem_pouso' 
  | 'avionicos' 
  | 'consumivel' 
  | 'helice' 
  | 'eletrico' 
  | 'combustivel' 
  | 'hidraulico'
  | 'outros';

export type PartStatus = 'ok' | 'atencao' | 'vencido';

export interface AircraftPart {
  id: string;
  aircraftId: string;
  
  // Identificação
  nome: string; // Ex: Vela, Filtro de Óleo, Pneu, Pastilha, Bateria, Magneto
  categoria: PartCategory;
  partNumber?: string;
  serial?: string;
  fabricante?: string;
  
  // Intervalos de troca
  intervaloHoras?: number; // Trocar a cada X horas
  intervaloDias?: number; // Trocar a cada X dias (opcional)
  alertaPercentual: number; // % do intervalo para alertar (default 10%)
  
  // Última troca/manutenção
  horasUltimaTroca: number; // Horas da aeronave no momento da última troca
  dataUltimaTroca?: string; // Data da última troca
  custoUltimaTroca?: number; // Custo da última troca
  fornecedor?: string;
  notaFiscal?: string;
  
  // Campos calculados (armazenados para performance)
  horasDesdeUltimaTroca?: number; // Calculado: HorasAtuais - HorasUltimaTroca
  horasRestantes?: number; // Calculado: IntervaloHoras - HorasDesdeUltimaTroca
  diasRestantes?: number; // Calculado: próximo vencimento por data
  status: PartStatus; // Calculado: OK / Atenção / Vencido
  
  // Histórico de manutenção (IDs)
  historicoManutencaoIds?: string[];
  
  observacoes?: string;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}

// Histórico de troca de peça
export interface PartReplacementHistory {
  id: string;
  partId: string;
  aircraftId: string;
  
  data: string;
  horasAeronave: number;
  horasMotor?: number;
  
  custo?: number;
  fornecedor?: string;
  notaFiscal?: string;
  
  maintenanceEventId?: string; // Referência ao evento de manutenção
  
  observacoes?: string;
  anexos?: Attachment[];
  
  createdAt: string;
  createdBy: string;
}

// ============================================
// MANUTENÇÃO
// ============================================

export interface MaintenanceEvent {
  id: string;
  aircraftId: string;
  componentId?: string;
  tipo: MaintenanceType;
  data: string;
  descricao: string;
  pecasTrocadas?: MaintenancePart[];
  custo: number;
  oficina?: string;
  responsavel?: string;
  horasAeronave: number;
  horasComponente?: number;
  ciclos?: number;
  anexos?: Attachment[];
  observacoes?: string;
  createdAt: string;
  createdBy: string;
}

export interface MaintenancePart {
  nome: string;
  partNumber?: string;
  quantidade: number;
  custo: number;
}

export interface MaintenanceSchedule {
  id: string;
  aircraftId: string;
  componentId?: string;
  nome: string;
  descricao?: string;
  tipo: MaintenanceType;
  trigger: MaintenanceTrigger;
  intervaloHoras?: number;
  intervaloDias?: number;
  intervaloCiclos?: number;
  proximaData?: string;
  proximasHoras?: number;
  proximosCiclos?: number;
  alertaAntesDias?: number;
  alertaAntesHoras?: number;
  alertaAntesCiclos?: number;
  obrigatorio: boolean;
  ativo: boolean;
  ultimaExecucao?: string;
}

// ============================================
// LOGBOOK / VOOS
// ============================================

export type FlightType = 'normal' | 'instrucao' | 'teste' | 'manutencao' | 'translado' | 'outros';

export interface Flight {
  id: string;
  aircraftId: string;
  pilotoId: string;
  copilotoId?: string;
  responsavelFinanceiro?: string; // ID do membro responsável pelo pagamento
  data: string;
  origem: string;
  origemIcao?: string;
  destino: string;
  destinoIcao?: string;
  escalas?: FlightLeg[];
  horarioBlocoOff?: string;
  horarioBlocoOn?: string;
  tempoVoo: number; // horas decimais
  tempoTaxi?: number; // minutos
  horasMotor: number;
  horasCelula: number;
  ciclos: number; // pousos/decolagens
  combustivelConsumido?: number;
  combustivelAbastecido?: number;
  tipoVoo?: FlightType; // Tipo do voo para filtragem
  observacoes?: string;
  anexos?: Attachment[];
  estimativaId?: string; // Referência à estimativa que originou o voo
  despesasIds?: string[]; // Despesas vinculadas
  
  // Rateio de horas (para voos compartilhados)
  rateioHoras?: {
    membroId: string;
    percentual: number;
  }[];
  
  createdAt: string;
  createdBy: string;
  updatedAt: string;
}

export interface FlightLeg {
  origem: string;
  origemIcao?: string;
  destino: string;
  destinoIcao?: string;
  distancia?: number; // nm
  tempoEstimado?: number; // horas
  tempoReal?: number;
}

// ============================================
// FINANCEIRO
// ============================================

export interface ManualRateio {
  memberId: string; // ID do membro/grupo
  grupo?: FlightEntryGroup; // Grupo do voo (grossi, shimada, etc)
  valor: number; // Valor atribuído a este membro/grupo
}

export interface BankAccount {
  id: string;
  aircraftId: string;
  nome: string; // Ex: "Conta Corrente - Banco do Brasil"
  banco: string; // Nome do banco
  agencia?: string;
  conta?: string;
  saldoInicial: number; // Saldo inicial da conta
  saldoAtual: number; // Saldo atual (calculado)
  ativa: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Expense {
  id: string;
  aircraftId: string;
  flightId?: string;
  categoria: ExpenseCategory;
  tipo: ExpenseType;
  descricao: string;
  valor: number;
  moeda: string;
  data: string;
  dataVencimento?: string;
  metodoPagamento?: string;
  fornecedor?: string;
  contaBancariaId?: string; // ID da conta bancária
  anexos?: Attachment[];
  recorrencia?: 'mensal' | 'trimestral' | 'anual' | 'custom';
  recorrenciaCustomDias?: number;
  rateioAutomatico: boolean;
  subVoo?: string; // Sub-voo / Referência do voo (ex: "SBSP → SBRJ | 02/01/2026")
  rateioManual?: ManualRateio[]; // Valores manuais por grupo/membro (quando rateioAutomatico = false)
  observacoes?: string;
  createdAt: string;
  createdBy: string;
}

export interface Revenue {
  id: string;
  aircraftId: string;
  categoria: RevenueCategory;
  descricao: string;
  valor: number;
  moeda: string;
  data: string;
  contaBancariaId: string; // Obrigatório para receitas
  origem?: string; // Origem do recurso (ex: "Banco XYZ", "Investidor ABC")
  subVoo?: string; // Sub-voo / Referência do voo (quando aplicável)
  rateioAutomatico: boolean;
  rateioManual?: ManualRateio[]; // Valores manuais por grupo/membro (quando rateioAutomatico = false)
  observacoes?: string;
  anexos?: Attachment[];
  createdAt: string;
  createdBy: string;
}

export interface Payment {
  id: string;
  expenseId?: string;
  memberId: string;
  aircraftId: string;
  valor: number;
  valorOriginal: number;
  desconto?: number;
  descricao: string;
  status: PaymentStatus;
  dataVencimento: string;
  dataPagamento?: string;
  comprovante?: Attachment;
  observacoes?: string;
  createdAt: string;
}

export interface MemberBalance {
  memberId: string;
  aircraftId: string;
  horasVoadas: number;
  valorDevido: number;
  valorPago: number;
  saldo: number;
  ultimaAtualizacao: string;
}

// ============================================
// DOCUMENTOS
// ============================================

export interface Document {
  id: string;
  aircraftId?: string;
  userId?: string;
  tipo: DocumentType;
  nome: string;
  descricao?: string;
  numero?: string;
  dataEmissao?: string;
  dataValidade?: string;
  arquivo?: Attachment;
  alertaAntesDias?: number;
  observacoes?: string;
  createdAt: string;
  createdBy: string;
}

// ============================================
// AGENDAMENTO
// ============================================

export interface Booking {
  id: string;
  aircraftId: string;
  memberId: string;
  dataInicio: string;
  dataFim: string;
  finalidade?: string;
  observacoes?: string;
  confirmado: boolean;
  cancelado: boolean;
  motivoCancelamento?: string;
  notificacaoEnviada: boolean;
  createdAt: string;
  createdBy: string;
}

// ============================================
// ALERTAS
// ============================================

export interface Alert {
  id: string;
  tipo: AlertType;
  severity: AlertSeverity;
  titulo: string;
  mensagem: string;
  aircraftId?: string;
  entityId?: string;
  entityType?: string;
  dataVencimento?: string;
  lido: boolean;
  dispensado: boolean;
  createdAt: string;
}

// ============================================
// ESTIMATIVA DE VOO
// ============================================

export interface FlightEstimate {
  id: string;
  aircraftId: string;
  criadoPor: string;
  origem: string;
  origemIcao: string;
  destino: string;
  destinoIcao: string;
  escalas?: EstimateLeg[];
  
  // Inputs
  ventoHeadwind?: number; // positivo = contra, negativo = favor
  tempoTaxi?: number; // minutos
  tempoSubidaDescida?: number; // minutos
  precoCombustivelOrigem?: number;
  precoCombustivelDestino?: number;
  
  // Resultados calculados
  distanciaTotal: number; // nm
  tempoVooEstimado: number; // horas
  tempoTotal: number; // incluindo táxi e subida/descida
  combustivelNecessario: number;
  combustivelComReserva: number;
  
  // Custos
  custoCombustivel: number;
  custoTaxas: number;
  custoOperacional: number;
  custoTotal: number;
  custoPorHora: number;
  
  // Status
  convertidoEmVoo: boolean;
  flightId?: string;
  
  createdAt: string;
  observacoes?: string;
}

export interface EstimateLeg {
  origem: string;
  origemIcao: string;
  destino: string;
  destinoIcao: string;
  distancia: number;
  tempoEstimado: number;
  combustivel: number;
  taxaPouso?: number;
  taxaEstacionamento?: number;
}

// ============================================
// AEROPORTOS (para cálculos)
// ============================================

export interface Airport {
  icao: string;
  iata?: string;
  nome: string;
  cidade: string;
  pais: string;
  latitude: number;
  longitude: number;
  elevacao?: number; // ft
  taxaPouso?: number;
  taxaEstacionamento?: number;
  precoCombustivel?: number;
}

// ============================================
// AUXILIARES
// ============================================

export interface Attachment {
  id: string;
  nome: string;
  tipo: string;
  tamanho: number;
  url: string;
  uploadedAt: string;
}

// ============================================
// ESTATÍSTICAS E RELATÓRIOS
// ============================================

export interface DashboardStats {
  aircraft: {
    horasCelula: number;
    horasMotor: number;
    ciclosTotais: number;
    ultimoVoo?: string;
    proximaManutencao?: MaintenanceSchedule;
  };
  financeiro: {
    totalDespesas: number;
    totalRecebido: number;
    saldoPendente: number;
    despesasMes: number;
  };
  alertas: {
    manutencoesVencidas: number;
    manutencoesProximas: number;
    documentosVencidos: number;
    documentosProximos: number;
    pagamentosAtrasados: number;
  };
  voos: {
    totalVoos: number;
    horasMes: number;
    horasAno: number;
  };
}

// ============================================
// LANÇAMENTOS DE VOO (Controle detalhado por trecho)
// ============================================

export type FlightEntryGroup = 'grossi' | 'shimada' | 'grossi_shimada' | 'outros';
export type FlightEntryStatus = 'provisorio' | 'conferido';
export type FuelMeasurementType = 'estimado' | 'medido';

export interface FlightEntry {
  id: string;
  aircraftId: string;
  
  // Identificação do voo
  voo: string; // Ex: GSS0001
  subVoo: string; // Ex: GSS-0001
  data: string;
  grupo: FlightEntryGroup;
  
  // Rota
  origem: string;
  origemIcao?: string;
  destino: string;
  destinoIcao?: string;
  
  // Tempos (em minutos para cálculo, exibir como hh:mm)
  tempoAcionamentoCorte: number; // minutos
  tempoVoo: number; // minutos
  
  // Combustível (libras)
  combustivelInicial: number; // lbs
  abastecimentoLibras: number; // lbs
  abastecimentoLitros: number; // litros
  localAbastecimento?: string;
  combustivelDecolagem: number; // lbs (calculado: inicial + abastecido)
  combustivelConsumido: number; // lbs
  combustivelConsumidoLitros: number; // litros (calculado)
  combustivelFinal: number; // lbs (calculado: decolagem - consumido)
  tipoMedicaoCombustivel: FuelMeasurementType;
  
  // Custos
  valorCombustivel: number; // R$
  hangar: number;
  alimentacao: number;
  hospedagem: number;
  limpeza: number;
  uberTaxi: number;
  tarifas: number;
  outras: number;
  provisaoTboGrossi: number; // calculado
  provisaoTboShimada: number; // calculado
  total: number; // calculado
  
  // Rateio e cobrança
  cobradoDe?: string;
  rateioObservacao?: string;
  
  // Status
  status: FlightEntryStatus;
  
  // Metadados
  observacoes?: string;
  anexos?: Attachment[];
  createdAt: string;
  createdBy: string;
  updatedAt: string;
}

// ============================================
// PROVISÃO TBO
// ============================================

export interface TBOProvision {
  id: string;
  aircraftId: string;
  valorPorHora: number; // R$ 2.800,00 padrão
  horasAcumuladas: number;
  valorProvisionadoAcumulado: number;
  custoRealTBO?: number;
  diferencaProvisionadoReal?: number;
  ultimaAtualizacao: string;
}

// ============================================
// CONFIGURAÇÕES
// ============================================

export interface SystemConfig {
  alertaManutencaoDias: number;
  alertaManutencaoHoras: number;
  alertaDocumentoDias: number;
  alertaPagamentoDias: number;
  reservaCombustivelMinutos: number;
  margemSegurancaPercentual: number;
  moedaPadrao: string;
  formatoData: string;
  formatoHora: string;
  // Configuração TBO
  tboValorPorHora: number; // R$ 2.800,00 padrão
  // Conversão combustível
  fatorConversaoLbsLitros: number; // ~0.567 para AVGAS (545 lbs = 309 L)
  // Reserva de Margem (Liquidez)
  reservaMargemMinima: number; // R$ 200.000,00 padrão
  alertaReservaPercentual: number; // % do mínimo para alertar (ex: 110% = alerta se < 110% do mínimo)
}

// Contexto de autenticação
export interface AuthContext {
  user: User | null;
  isAuthenticated: boolean;
  permissions: {
    canManageAircraft: boolean;
    canManageMaintenance: boolean;
    canManageFinancial: boolean;
    canCreateFlights: boolean;
    canViewReports: boolean;
    canManageUsers: boolean;
  };
}

// ============================================
// USO POR SÓCIO (Relatório de Participação)
// ============================================

export interface MemberUsageStats {
  memberId: string;
  memberName: string;
  memberRole: UserRole;
  
  // Horas
  horasVoadas: number;
  percentualHoras: number;
  numeroVoos: number;
  
  // Custos (opcional)
  custoTotal?: number;
  custoMedioPorHora?: number;
  
  // Comparação com participação societária
  cotaPercentual?: number; // % de participação societária
  diferencaUsoCota?: number; // % uso - % cota (positivo = usando mais que sua cota)
}

export interface UsageReport {
  periodo: {
    inicio: string;
    fim: string;
    label: string;
  };
  
  // Totais
  horasTotais: number;
  voosTotais: number;
  custoTotal?: number;
  
  // Por membro
  porMembro: MemberUsageStats[];
  
  // Filtros aplicados
  filtros?: {
    excluirInstrucao?: boolean;
    excluirTeste?: boolean;
    excluirManutencao?: boolean;
  };
}

// ============================================
// RESERVA DE MARGEM (Liquidez Mínima)
// ============================================

export type MarginReserveMovementType = 'aporte' | 'uso_emergencial' | 'ajuste' | 'rendimento';
export type FinancialRiskStatus = 'normal' | 'atencao' | 'risco_liquidez';

export interface MarginReserve {
  id: string;
  aircraftId: string;
  
  // Configuração
  valorMinimoObrigatorio: number; // R$ 200.000,00 padrão
  
  // Saldo atual
  saldoAtual: number;
  
  // Status
  status: FinancialRiskStatus;
  excedente: number; // saldoAtual - valorMinimoObrigatorio (pode ser negativo)
  percentualPreenchimento: number; // (saldoAtual / valorMinimoObrigatorio) * 100
  
  // Estatísticas
  diasAbaixoMinimo: number;
  saldoMedio30Dias: number;
  ultimaAtualizacao: string;
  
  // Metadata
  observacoes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MarginReserveMovement {
  id: string;
  reserveId: string;
  aircraftId: string;
  
  tipo: MarginReserveMovementType;
  valor: number; // Positivo para entrada, negativo para saída
  saldoAnterior: number;
  saldoApos: number;
  
  // Para uso emergencial
  justificativa?: string; // Obrigatório para uso_emergencial
  aprovadoPor?: string; // ID do admin que aprovou
  
  // Para aportes
  socioId?: string;
  
  data: string;
  observacoes?: string;
  anexos?: Attachment[];
  
  // Auditoria
  createdAt: string;
  createdBy: string;
}

// ============================================
// APLICAÇÕES FINANCEIRAS (Reserva de Margem)
// ============================================

export interface FinancialApplication {
  id: string;
  aircraftId: string;
  reserveId: string; // Vinculado à reserva de margem
  nome: string; // Ex: "CDB Banco XYZ", "Tesouro IPCA+", etc.
  tipo: string; // Ex: "CDB", "LCI", "LCA", "Tesouro Direto", "Fundos", etc.
  instituicao: string; // Banco ou instituição financeira
  valorAplicado: number; // Valor inicial aplicado
  taxaRendimento: number; // Taxa anual (ex: 12.5 para 12,5% a.a.)
  dataAplicacao: string; // Data de início da aplicação
  dataVencimento?: string; // Data de vencimento (se aplicável)
  liquidez: 'diaria' | 'vencimento' | 'd+1' | 'd+30' | 'outros'; // Tipo de liquidez
  observacoes?: string;
  ativa: boolean; // Se a aplicação ainda está ativa
  createdAt: string;
  createdBy: string;
  updatedAt: string;
}

// ============================================
// ATIVOS PATRIMONIAIS DA AERONAVE
// ============================================

export type AssetType = 'imobilizado' | 'veiculo' | 'equipamento' | 'outros';
export type AssetStatus = 'em_construcao' | 'concluido' | 'em_uso' | 'baixado';

export interface AircraftAsset {
  id: string;
  aircraftId: string;
  
  // Identificação
  nome: string; // Ex: "Hangar Próprio – Base XYZ"
  tipo: AssetType;
  status: AssetStatus;
  descricao?: string;
  
  // Datas e valores
  dataInicioObra?: string;
  dataConclusao?: string;
  valorEstimadoTotal: number; // Orçamento total da obra
  valorInvestidoAtual: number; // Soma dos lançamentos de CAPEX
  percentualExecucao: number; // (valorInvestido / valorEstimado) * 100
  
  // Depreciação (opcional)
  vidaUtilAnos?: number;
  valorResidual?: number;
  depreciacaoMensal?: number;
  
  // Localização
  localizacao?: string;
  
  // Participação dos sócios
  participacaoSocios: AssetShareholding[];
  
  // Anexos
  anexos?: Attachment[];
  observacoes?: string;
  
  // Metadata
  createdAt: string;
  createdBy: string;
  updatedAt: string;
}

export interface AssetShareholding {
  socioId: string;
  socioNome: string;
  percentual: number; // % de participação no ativo
  valorInvestido: number; // Valor investido pelo sócio
}

export interface AssetInvestment {
  id: string;
  assetId: string;
  aircraftId: string;
  
  // Detalhes do lançamento
  descricao: string;
  valor: number;
  data: string;
  
  // Fornecedor / Nota
  fornecedor?: string;
  notaFiscal?: string;
  
  // Classificação
  categoria?: string; // Material, Mão de obra, Projeto, etc.
  
  // Rateio entre sócios
  rateioPorSocio: {
    socioId: string;
    percentual: number;
    valor: number;
  }[];
  
  // Anexos
  anexos?: Attachment[];
  observacoes?: string;
  
  // Metadata
  createdAt: string;
  createdBy: string;
}

// ============================================
// DASHBOARD FINANCEIRO EXPANDIDO
// ============================================

export interface FinancialDashboard {
  // Caixa total (todas as contas)
  caixaTotal: number;
  
  // Caixa operacional (disponível para despesas do dia a dia)
  caixaOperacional: number;
  
  // Reserva de margem
  reservaMargem: {
    saldo: number;
    minimo: number;
    excedente: number;
    status: FinancialRiskStatus;
  };
  
  // Patrimônio em ativos
  patrimonioAtivos: {
    valorTotal: number;
    emConstrucao: number;
    concluido: number;
  };
  
  // Indicadores
  indicadores: {
    liquidezImediata: number; // caixaOperacional / despesas médias mensais
    coberturaMargem: number; // reservaMargem / valorMinimoObrigatorio
    patrimonioTotal: number; // caixaTotal + ativos
  };
}

// ============================================
// ALERTAS FINANCEIROS
// ============================================

export interface LiquidityAlert {
  id: string;
  aircraftId: string;
  tipo: 'reserva_baixa' | 'reserva_critica' | 'uso_emergencial' | 'aporte_necessario';
  severity: AlertSeverity;
  titulo: string;
  mensagem: string;
  valorAtual: number;
  valorMinimo: number;
  deficit: number;
  ativo: boolean;
  createdAt: string;
  resolvidoEm?: string;
  resolvidoPor?: string;
}

// ============================================
// ESPECIFICAÇÕES DE AERONAVES (AIRCRAFT SPECS)
// ============================================

export type ConfidenceLevel = 'alta' | 'media' | 'baixa';
export type SpecSource = 'poh' | 'api' | 'scraping' | 'ml_estimate' | 'manual_override';

export interface SpecValue {
  value: number | null;
  min?: number;
  max?: number;
  unit: string;
  source: SpecSource;
  sourceUrl?: string;
  collectedAt: string;
  confidence: ConfidenceLevel;
  notes?: string;
}

export interface AircraftModelSpecs {
  // Identificação
  manufacturer: string;
  model: string;
  variant?: string; // Ex: "C90GTi", "A", "B"
  yearRange?: {
    start: number;
    end?: number;
  };
  
  // Pesos (lbs ou kg)
  mtow?: SpecValue; // Maximum Takeoff Weight
  emptyWeight?: SpecValue;
  usefulLoad?: SpecValue;
  maxPayload?: SpecValue;
  
  // Combustível
  fuelCapacityTotal?: SpecValue; // Galões ou Litros
  fuelCapacityUsable?: SpecValue;
  fuelType?: 'avgas' | 'jet-a';
  
  // Performance
  cruiseSpeed?: {
    economic?: SpecValue; // KTAS
    normal?: SpecValue;
    max?: SpecValue;
  };
  cruiseAltitude?: {
    typical?: number; // ft
    max?: number; // ft
  };
  serviceCeiling?: SpecValue; // ft
  rateOfClimb?: SpecValue; // fpm (feet per minute)
  range?: SpecValue; // NM ou km
  
  // Consumo de combustível
  fuelBurn?: {
    climb?: SpecValue; // GPH ou L/h
    cruise?: SpecValue;
    descent?: SpecValue;
    idle?: SpecValue;
  };
  
  // Propulsão
  engineType?: string; // Ex: "PT6A-135A"
  engineCount?: number;
  enginePower?: SpecValue; // HP ou SHP (Shaft Horsepower) para turboélices
  engineThrust?: SpecValue; // lbf para jatos
  propellerType?: string;
  
  // Dimensões
  seats?: number;
  cabinWidth?: SpecValue; // inches
  cabinLength?: SpecValue; // inches
  cargoCapacity?: SpecValue; // cu ft ou lbs
  
  // Metadados
  sources: {
    type: SpecSource;
    url?: string;
    collectedAt: string;
  }[];
  lastUpdated: string;
  isComplete: boolean; // true se todos os dados essenciais estão presentes
  missingFields: string[]; // Lista de campos ausentes
}

export interface AircraftModel {
  id: string;
  manufacturer: string;
  model: string;
  variant?: string;
  year?: number;
  specs: AircraftModelSpecs;
  createdAt: string;
  updatedAt: string;
  cacheStaleAt?: string; // Data após a qual considerar cache como obsoleto (>90 dias)
}

// ============================================
// AEROPORTOS (OURAIRPORTS DATASET)
// ============================================

export type AirportType = 'small_airport' | 'medium_airport' | 'large_airport' | 'seaplane_base' | 'heliport' | 'balloonport' | 'closed';

export interface AirportRecord {
  id: string; // OurAirports ID
  ident: string; // ICAO/IATA/local code
  type: AirportType;
  name: string;
  latitude_deg: number;
  longitude_deg: number;
  elevation_ft?: number;
  continent?: string;
  iso_country: string;
  iso_region: string; // Ex: "BR-SP"
  municipality?: string;
  scheduled_service: 'yes' | 'no' | '';
  gps_code?: string; // Código ICAO preferido
  iata_code?: string;
  local_code?: string;
  home_link?: string;
  wikipedia_link?: string;
  
  // Campos customizados
  isPrivate?: boolean; // Se é aeroporto privado/GA
  fuelAvailable?: boolean;
  fuelTypes?: ('avgas' | 'jet-a')[];
  landingFee?: number; // R$ ou moeda local
  parkingFee?: number;
  fuelPrice?: {
    avgas?: number;
    'jet-a'?: number;
  };
  
  // Metadados
  importedAt: string;
  lastUpdated?: string;
}

// ============================================
// ESTIMATIVA DE VOO APRIMORADA
// ============================================

export type FlightProfile = 'economico' | 'normal' | 'rapido';

export interface EnhancedFlightEstimate extends FlightEstimate {
  // Inputs adicionais
  profile?: FlightProfile;
  passengers?: number;
  baggage?: number; // lbs ou kg
  initialFuel?: number; // litros ou galões
  flightDate?: string; // Para buscar vento real
  altitude?: number; // ft (altitude de cruzeiro)
  
  // Cálculos detalhados por fase
  phases?: {
    taxi: {
      time: number; // minutos
      fuel: number; // litros
    };
    climb: {
      time: number; // minutos
      fuel: number; // litros
      altitude: number; // ft alcançado
    };
    cruise: {
      time: number; // minutos
      fuel: number; // litros
      tas: number; // ktas
      gs: number; // kts (groundspeed com vento)
      windComponent: number; // kts (headwind positivo, tailwind negativo)
      altitude: number; // ft
    };
    descent: {
      time: number; // minutos
      fuel: number; // litros
    };
  };
  
  // Meteorologia
  weather?: {
    windSpeed: number; // kts
    windDirection: number; // graus
    windAltitude: number; // ft
    temperature: number; // °C
    densityAltitude?: number; // ft
    fetchedAt: string;
  };
  
  // Confiança e incerteza
  confidence: ConfidenceLevel;
  uncertainty?: {
    timeMin: number; // horas
    timeMax: number;
    fuelMin: number; // litros
    fuelMax: number;
    costMin: number; // R$
    costMax: number;
  };
  confidenceReasons: string[]; // Ex: "Consumo de cruzeiro estimado por ML", "Vento não disponível"
  
  // Custo detalhado
  costBreakdown?: {
    fuel: number;
    fuelTax?: number;
    landingFee: number;
    parkingFee: number;
    operational: number;
    total: number;
  };
  
  // Métricas
  costPerHour?: number;
  costPerNM?: number;
  costPerKM?: number;
  fuelPerHour?: number; // L/h médio
  efficiency?: number; // NM/galão ou NM/litro
}

// ============================================
// MODELO ML / REGRAS PARA ESTIMATIVA
// ============================================

export interface PerformanceEstimate {
  cruiseSpeed: {
    value: number; // KTAS
    min?: number;
    max?: number;
    confidence: ConfidenceLevel;
    method: 'known' | 'ml' | 'heuristic' | 'rule';
  };
  fuelBurn: {
    climb: number; // L/h
    cruise: number;
    descent: number;
    confidence: ConfidenceLevel;
    method: 'known' | 'ml' | 'heuristic' | 'rule';
  };
  rateOfClimb?: {
    value: number; // fpm
    confidence: ConfidenceLevel;
  };
}

export interface MLModelWeights {
  // Pesos para regressão (serão calibrados com dados reais)
  cruiseSpeed: {
    baseSpeed: number;
    powerMultiplier: number;
    mtowFactor: number;
  };
  fuelBurn: {
    baseBurn: number;
    powerFactor: number;
    speedFactor: number;
    mtowFactor: number;
  };
}

// ============================================
// CATÁLOGO DE AERONAVES
// ============================================

export interface Manufacturer {
  id: string;
  name: string;
  normalizedName: string; // Para busca (lowercase, sem acentos)
  country?: string;
  website?: string;
  logoUrl?: string;
  modelCount: number; // Quantidade de modelos no catálogo
  lastUpdated: string;
  createdAt: string;
}

export interface AircraftCatalogModel {
  id: string;
  manufacturerId: string;
  manufacturerName: string;
  model: string;
  normalizedModel: string; // Para busca
  variant?: string;
  yearRange?: {
    start: number;
    end?: number;
  };
  
  // Classificação
  aircraftType: AircraftType; // pistao, turbohelice, jato, helicoptero
  
  // Specs resumidas (para listagem)
  specsSummary: {
    mtow?: number; // lbs ou kg
    seats?: number;
    range?: number; // NM
    cruiseSpeed?: number; // KTAS
    engineType?: string;
    fuelType?: 'avgas' | 'jet-a';
  };
  
  // Specs completas (link para AircraftModelSpecs)
  specsId?: string; // Referência ao AircraftModel com specs completas
  
  // Metadados
  isComplete: boolean; // Se tem specs completas
  missingFields: string[];
  sources: {
    type: SpecSource;
    url?: string;
    collectedAt: string;
  }[];
  
  lastUpdated: string;
  createdAt: string;
}

export interface CatalogFilters {
  search?: string;
  manufacturerId?: string;
  aircraftType?: AircraftType[];
  minRange?: number; // NM
  maxRange?: number;
  minSeats?: number;
  maxSeats?: number;
  minMTOW?: number; // lbs
  maxMTOW?: number;
  fuelType?: ('avgas' | 'jet-a')[];
  hasCompleteSpecs?: boolean;
}

export interface CatalogPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface CatalogResponse {
  models: AircraftCatalogModel[];
  pagination: CatalogPagination;
  filters: CatalogFilters;
}

export interface CatalogSyncStatus {
  lastSync: string;
  nextSync?: string;
  status: 'idle' | 'running' | 'error';
  progress?: {
    total: number;
    processed: number;
    errors: number;
  };
  error?: string;
}
