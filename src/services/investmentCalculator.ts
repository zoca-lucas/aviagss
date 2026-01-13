// ============================================
// CALCULADORA DE APLICAÇÕES FINANCEIRAS
// ============================================

import { CashInvestment, InvestmentCalculationResult, CalculationBase } from '../types';

// Taxas de referência (podem ser atualizadas via configuração)
const REFERENCE_RATES = {
  CDI_ANNUAL: 13.25, // CDI anual (exemplo, pode ser atualizado)
  SELIC_ANNUAL: 13.25, // SELIC anual
  IPCA_ANNUAL: 4.62, // IPCA anual (exemplo, pode ser atualizado)
  POUPANCA_ANNUAL: 8.5, // Poupança anual (exemplo)
};

/**
 * Estima dias úteis baseado em dias corridos
 * Fórmula aproximada: dias_uteis = dias_corridos * (252/365)
 */
function estimateBusinessDays(days: number): number {
  return Math.round(days * (252 / 365));
}

/**
 * Calcula o número de dias entre duas datas
 */
function calculateDaysBetween(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Calcula aplicação CDI (% do CDI)
 */
function calculateCDI(
  principal: number,
  percentCDI: number,
  days: number,
  base: CalculationBase,
  capitalization: 'diaria' | 'mensal'
): InvestmentCalculationResult {
  // Taxa anual efetiva = CDI_anual * (%CDI / 100)
  const effectiveAnnualRate = (REFERENCE_RATES.CDI_ANNUAL * percentCDI) / 100;
  
  // Determinar dias a usar
  const daysUsed = base === 252 ? estimateBusinessDays(days) : days;
  
  // Calcular taxa do período
  let periodRate: number;
  if (capitalization === 'diaria') {
    // Capitalização diária: (1 + taxa_anual)^(dias/base) - 1
    periodRate = Math.pow(1 + effectiveAnnualRate / 100, daysUsed / base) - 1;
  } else {
    // Capitalização mensal: aproximação usando meses
    const months = days / 30;
    periodRate = Math.pow(1 + effectiveAnnualRate / 100, months / 12) - 1;
  }
  
  const finalValue = principal * (1 + periodRate);
  const interestEarned = finalValue - principal;
  const periodReturn = (interestEarned / principal) * 100;
  const annualEquivalentReturn = periodReturn * (365 / days);
  
  return {
    principal,
    finalValue,
    interestEarned,
    periodReturn,
    annualEquivalentReturn,
    daysElapsed: days,
    businessDaysEstimated: estimateBusinessDays(days),
    calculationDetails: {
      baseUsed: base,
      daysUsed,
      effectiveRate: effectiveAnnualRate,
    },
  };
}

/**
 * Calcula aplicação Pós-fixado ou Prefixado (taxa anual)
 */
function calculateFixedRate(
  principal: number,
  annualRate: number,
  days: number,
  base: CalculationBase,
  capitalization: 'diaria' | 'mensal'
): InvestmentCalculationResult {
  // Determinar dias a usar
  const daysUsed = base === 252 ? estimateBusinessDays(days) : days;
  
  // Calcular taxa do período
  let periodRate: number;
  if (capitalization === 'diaria') {
    // Capitalização diária: (1 + taxa_anual)^(dias/base) - 1
    periodRate = Math.pow(1 + annualRate / 100, daysUsed / base) - 1;
  } else {
    // Capitalização mensal: aproximação usando meses
    const months = days / 30;
    periodRate = Math.pow(1 + annualRate / 100, months / 12) - 1;
  }
  
  const finalValue = principal * (1 + periodRate);
  const interestEarned = finalValue - principal;
  const periodReturn = (interestEarned / principal) * 100;
  const annualEquivalentReturn = periodReturn * (365 / days);
  
  return {
    principal,
    finalValue,
    interestEarned,
    periodReturn,
    annualEquivalentReturn,
    daysElapsed: days,
    businessDaysEstimated: estimateBusinessDays(days),
    calculationDetails: {
      baseUsed: base,
      daysUsed,
      effectiveRate: annualRate,
    },
  };
}

/**
 * Calcula aplicação IPCA+
 */
function calculateIPCAPlus(
  principal: number,
  ipcaExpected: number,
  spread: number,
  days: number,
  base: CalculationBase,
  capitalization: 'diaria' | 'mensal',
  ipcaReal?: number
): InvestmentCalculationResult {
  // Usar IPCA real se disponível, senão usar o esperado
  const ipcaToUse = ipcaReal !== undefined ? ipcaReal : ipcaExpected;
  
  // Determinar dias a usar
  const daysUsed = base === 252 ? estimateBusinessDays(days) : days;
  
  // Calcular inflação do período
  const inflationPeriod = Math.pow(1 + ipcaToUse / 100, days / 365) - 1;
  
  // Calcular juro real do período
  let realRatePeriod: number;
  if (capitalization === 'diaria') {
    realRatePeriod = Math.pow(1 + spread / 100, daysUsed / base) - 1;
  } else {
    const months = days / 30;
    realRatePeriod = Math.pow(1 + spread / 100, months / 12) - 1;
  }
  
  // VF = VP * (1 + inflação) * (1 + juro_real)
  const finalValue = principal * (1 + inflationPeriod) * (1 + realRatePeriod);
  const interestEarned = finalValue - principal;
  const periodReturn = (interestEarned / principal) * 100;
  const annualEquivalentReturn = periodReturn * (365 / days);
  
  return {
    principal,
    finalValue,
    interestEarned,
    periodReturn,
    annualEquivalentReturn,
    daysElapsed: days,
    businessDaysEstimated: estimateBusinessDays(days),
    calculationDetails: {
      baseUsed: base,
      daysUsed,
      effectiveRate: ipcaToUse + spread, // Taxa nominal aproximada
    },
  };
}

/**
 * Calcula aplicação Poupança
 */
function calculatePoupanca(
  principal: number,
  days: number
): InvestmentCalculationResult {
  // Poupança: 0,5% ao mês + TR (simplificado, usando taxa fixa)
  const months = days / 30;
  const monthlyRate = 0.5; // 0,5% ao mês
  const finalValue = principal * Math.pow(1 + monthlyRate / 100, months);
  const interestEarned = finalValue - principal;
  const periodReturn = (interestEarned / principal) * 100;
  const annualEquivalentReturn = periodReturn * (365 / days);
  
  return {
    principal,
    finalValue,
    interestEarned,
    periodReturn,
    annualEquivalentReturn,
    daysElapsed: days,
    businessDaysEstimated: estimateBusinessDays(days),
    calculationDetails: {
      baseUsed: 365,
      daysUsed: days,
      effectiveRate: REFERENCE_RATES.POUPANCA_ANNUAL,
    },
  };
}

/**
 * Calcula aplicação SELIC
 */
function calculateSELIC(
  principal: number,
  days: number,
  base: CalculationBase
): InvestmentCalculationResult {
  const daysUsed = base === 252 ? estimateBusinessDays(days) : days;
  const periodRate = Math.pow(1 + REFERENCE_RATES.SELIC_ANNUAL / 100, daysUsed / base) - 1;
  const finalValue = principal * (1 + periodRate);
  const interestEarned = finalValue - principal;
  const periodReturn = (interestEarned / principal) * 100;
  const annualEquivalentReturn = periodReturn * (365 / days);
  
  return {
    principal,
    finalValue,
    interestEarned,
    periodReturn,
    annualEquivalentReturn,
    daysElapsed: days,
    businessDaysEstimated: estimateBusinessDays(days),
    calculationDetails: {
      baseUsed: base,
      daysUsed,
      effectiveRate: REFERENCE_RATES.SELIC_ANNUAL,
    },
  };
}

/**
 * Função principal: calcula o rendimento de uma aplicação
 */
export function calculateInvestment(investment: CashInvestment): InvestmentCalculationResult {
  const days = calculateDaysBetween(investment.startDate, investment.endDate);
  const { params } = investment;
  
  switch (investment.investmentType) {
    case 'CDI':
      if (!params.percentCDI) throw new Error('Percentual CDI não informado');
      return calculateCDI(
        investment.principal,
        params.percentCDI,
        days,
        params.base,
        params.capitalization
      );
    
    case 'POS_FIXADO':
    case 'PREFIXADO':
    case 'CDB':
    case 'LCI':
    case 'LCA':
      if (!params.annualRate) throw new Error('Taxa anual não informada');
      return calculateFixedRate(
        investment.principal,
        params.annualRate,
        days,
        params.base,
        params.capitalization
      );
    
    case 'IPCA_PLUS':
      if (params.ipcaExpected === undefined || params.spread === undefined) {
        throw new Error('IPCA esperado e spread não informados');
      }
      return calculateIPCAPlus(
        investment.principal,
        params.ipcaExpected,
        params.spread,
        days,
        params.base,
        params.capitalization,
        params.ipcaReal
      );
    
    case 'POUPANCA':
      return calculatePoupanca(investment.principal, days);
    
    case 'SELIC':
      return calculateSELIC(investment.principal, days, params.base);
    
    default:
      throw new Error(`Tipo de aplicação não suportado: ${investment.investmentType}`);
  }
}

/**
 * Atualiza taxas de referência (pode ser chamado periodicamente)
 */
export function updateReferenceRates(rates: Partial<typeof REFERENCE_RATES>): void {
  Object.assign(REFERENCE_RATES, rates);
}

/**
 * Obtém taxas de referência atuais
 */
export function getReferenceRates(): typeof REFERENCE_RATES {
  return { ...REFERENCE_RATES };
}
