import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const formatCurrency = (value: number, currency: string = 'BRL'): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
  }).format(value);
};

export const formatHours = (hours: number): string => {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h${m > 0 ? ` ${m}min` : ''}`;
};

export const formatHoursDecimal = (hours: number): string => {
  return `${hours.toFixed(1)}h`;
};

export const formatDate = (date: string | Date): string => {
  if (!date) return '-';
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'dd/MM/yyyy', { locale: ptBR });
};

export const formatDateTime = (date: string | Date): string => {
  if (!date) return '-';
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
};

export const formatTime = (date: string | Date): string => {
  if (!date) return '-';
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'HH:mm', { locale: ptBR });
};

export const formatRelativeDate = (date: string | Date): string => {
  if (!date) return '-';
  const d = typeof date === 'string' ? parseISO(date) : date;
  return formatDistanceToNow(d, { addSuffix: true, locale: ptBR });
};

export const formatDistance = (nm: number): string => {
  return `${nm.toFixed(0)} NM`;
};

export const formatFuel = (liters: number, unit: string = 'litros'): string => {
  if (unit === 'galoes') {
    const gallons = liters / 3.785;
    return `${gallons.toFixed(1)} gal`;
  }
  return `${liters.toFixed(1)} L`;
};

export const formatPercentage = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

export const formatPercent = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

export const formatPhoneNumber = (phone: string): string => {
  if (!phone) return '-';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  }
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
};

export const getDaysUntil = (date: string | Date): number => {
  if (!date) return Infinity;
  const d = typeof date === 'string' ? parseISO(date) : date;
  const now = new Date();
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
};

export const getHoursUntil = (currentHours: number, targetHours: number): number => {
  return targetHours - currentHours;
};

// Cálculo de distância usando fórmula de Haversine
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 3440.065; // Raio da Terra em milhas náuticas
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const toRad = (value: number): number => {
  return (value * Math.PI) / 180;
};

// Labels para tipos
export const getAircraftTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    pistao: 'Pistão',
    turbohelice: 'Turbohélice',
    jato: 'Jato',
    helicoptero: 'Helicóptero',
  };
  return labels[type] || type;
};

export const getFuelTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    avgas: 'AVGAS',
    'jet-a': 'Jet A',
  };
  return labels[type] || type;
};

export const getMaintenanceTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    preventiva: 'Preventiva',
    corretiva: 'Corretiva',
    inspecao: 'Inspeção',
    revisao: 'Revisão',
    tbo: 'TBO',
  };
  return labels[type] || type;
};

export const getExpenseCategoryLabel = (category: string): string => {
  const labels: Record<string, string> = {
    combustivel: 'Combustível',
    manutencao: 'Manutenção',
    hangaragem: 'Hangaragem',
    seguro: 'Seguro',
    taxas: 'Taxas',
    pecas: 'Peças',
    assinaturas: 'Assinaturas',
    outros: 'Outros',
  };
  return labels[category] || category;
};

export const getDocumentTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    aeronavegabilidade: 'Aeronavegabilidade',
    seguro: 'Seguro',
    manual: 'Manual',
    diario_manutencao: 'Diário de Manutenção',
    cma: 'CMA',
    licenca: 'Licença',
    habilitacao: 'Habilitação',
    outros: 'Outros',
  };
  return labels[type] || type;
};

export const getUserRoleLabel = (role: string): string => {
  const labels: Record<string, string> = {
    admin: 'Administrador',
    gestor: 'Gestor',
    piloto: 'Piloto',
    cotista: 'Cotista',
  };
  return labels[role] || role;
};

export const getPaymentStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    pendente: 'Pendente',
    pago: 'Pago',
    atrasado: 'Atrasado',
  };
  return labels[status] || status;
};
