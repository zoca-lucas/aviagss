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
  anexos?: Attachment[];
  recorrencia?: 'mensal' | 'trimestral' | 'anual' | 'custom';
  recorrenciaCustomDias?: number;
  rateioAutomatico: boolean;
  observacoes?: string;
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
  fatorConversaoLbsLitros: number; // ~0.54 para AVGAS
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
