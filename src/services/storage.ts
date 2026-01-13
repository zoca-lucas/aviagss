import {
  Aircraft,
  AircraftComponent,
  AircraftPart,
  PartReplacementHistory,
  PartStatus,
  User,
  UserLicense,
  Membership,
  MaintenanceEvent,
  MaintenanceSchedule,
  Flight,
  Expense,
  Revenue,
  BankAccount,
  Payment,
  Document,
  Booking,
  Alert,
  FlightEstimate,
  Airport,
  AuditLog,
  SystemConfig,
  FlightEntry,
  TBOProvision,
  MemberUsageStats,
  UsageReport,
  // Novas interfaces para Reserva de Margem e Ativos
  MarginReserve,
  MarginReserveMovement,
  FinancialApplication,
  CashInvestment,
  FinancialRiskStatus,
  AircraftAsset,
  AssetInvestment,
  FinancialDashboard,
  LiquidityAlert,
} from '../types';

// ============================================
// STORAGE KEYS
// ============================================

const STORAGE_KEYS = {
  AIRCRAFT: 'aerogestao_aircraft',
  COMPONENTS: 'aerogestao_components',
  PARTS: 'aerogestao_parts',
  PART_HISTORY: 'aerogestao_part_history',
  USERS: 'aerogestao_users',
  USER_LICENSES: 'aerogestao_user_licenses',
  MEMBERSHIPS: 'aerogestao_memberships',
  MAINTENANCE_EVENTS: 'aerogestao_maintenance_events',
  MAINTENANCE_SCHEDULES: 'aerogestao_maintenance_schedules',
  FLIGHTS: 'aerogestao_flights',
  FLIGHT_ENTRIES: 'aerogestao_flight_entries',
  TBO_PROVISIONS: 'aerogestao_tbo_provisions',
  EXPENSES: 'aerogestao_expenses',
  REVENUES: 'aerogestao_revenues',
  BANK_ACCOUNTS: 'aerogestao_bank_accounts',
  PAYMENTS: 'aerogestao_payments',
  DOCUMENTS: 'aerogestao_documents',
  BOOKINGS: 'aerogestao_bookings',
  ALERTS: 'aerogestao_alerts',
  FLIGHT_ESTIMATES: 'aerogestao_flight_estimates',
  AIRPORTS: 'aerogestao_airports',
  AUDIT_LOGS: 'aerogestao_audit_logs',
  CONFIG: 'aerogestao_config',
  CURRENT_USER: 'aerogestao_current_user',
  // Novas chaves para Reserva de Margem e Ativos
  MARGIN_RESERVES: 'aerogestao_margin_reserves',
  MARGIN_RESERVE_MOVEMENTS: 'aerogestao_margin_reserve_movements',
  FINANCIAL_APPLICATIONS: 'aerogestao_financial_applications',
  CASH_INVESTMENTS: 'aerogestao_cash_investments',
  AIRCRAFT_ASSETS: 'aerogestao_aircraft_assets',
  ASSET_INVESTMENTS: 'aerogestao_asset_investments',
  LIQUIDITY_ALERTS: 'aerogestao_liquidity_alerts',
};

// ============================================
// HELPERS
// ============================================

const getItem = <T>(key: string, defaultValue: T): T => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : defaultValue;
};

const setItem = <T>(key: string, value: T): void => {
  localStorage.setItem(key, JSON.stringify(value));
};

const generateId = (): string => crypto.randomUUID();

const formatDateBR = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR');
};

// ============================================
// AUDITORIA
// ============================================

const createAuditLog = (
  userId: string,
  userName: string,
  action: 'create' | 'update' | 'delete',
  entity: string,
  entityId: string,
  changes: { field: string; oldValue: any; newValue: any }[],
  metadata?: Record<string, any>
): void => {
  const logs = getItem<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, []);
  const log: AuditLog = {
    id: generateId(),
    timestamp: new Date().toISOString(),
    userId,
    userName,
    action,
    entity,
    entityId,
    changes,
    metadata,
  };
  logs.unshift(log);
  // Manter apenas os últimos 1000 logs
  setItem(STORAGE_KEYS.AUDIT_LOGS, logs.slice(0, 1000));
};

const getChanges = (oldObj: any, newObj: any): { field: string; oldValue: any; newValue: any }[] => {
  const changes: { field: string; oldValue: any; newValue: any }[] = [];
  const allKeys = new Set([...Object.keys(oldObj || {}), ...Object.keys(newObj || {})]);
  
  allKeys.forEach(key => {
    if (key === 'updatedAt' || key === 'createdAt') return;
    const oldValue = oldObj?.[key];
    const newValue = newObj?.[key];
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changes.push({ field: key, oldValue, newValue });
    }
  });
  
  return changes;
};

// ============================================
// STORAGE SERVICE
// ============================================

export const storage = {
  // ==========================================
  // AERONAVES
  // ==========================================
  
  getAircraft: (): Aircraft[] => {
    return getItem<Aircraft[]>(STORAGE_KEYS.AIRCRAFT, []);
  },

  getAircraftById: (id: string): Aircraft | undefined => {
    return storage.getAircraft().find(a => a.id === id);
  },

  saveAircraft: (aircraft: Aircraft, userId: string, userName: string): Aircraft => {
    const aircrafts = storage.getAircraft();
    const existing = aircrafts.find(a => a.id === aircraft.id);
    
    if (existing) {
      const changes = getChanges(existing, aircraft);
      const index = aircrafts.findIndex(a => a.id === aircraft.id);
      aircraft.updatedAt = new Date().toISOString();
      aircrafts[index] = aircraft;
      createAuditLog(userId, userName, 'update', 'aircraft', aircraft.id, changes);
    } else {
      aircraft.id = aircraft.id || generateId();
      aircraft.createdAt = new Date().toISOString();
      aircraft.updatedAt = aircraft.createdAt;
      aircrafts.push(aircraft);
      createAuditLog(userId, userName, 'create', 'aircraft', aircraft.id, []);
    }
    
    setItem(STORAGE_KEYS.AIRCRAFT, aircrafts);
    return aircraft;
  },

  deleteAircraft: (id: string, userId: string, userName: string): void => {
    const aircrafts = storage.getAircraft().filter(a => a.id !== id);
    setItem(STORAGE_KEYS.AIRCRAFT, aircrafts);
    createAuditLog(userId, userName, 'delete', 'aircraft', id, []);
  },

  // ==========================================
  // COMPONENTES (Motor, Hélice, etc)
  // ==========================================
  
  getComponents: (aircraftId?: string): AircraftComponent[] => {
    const components = getItem<AircraftComponent[]>(STORAGE_KEYS.COMPONENTS, []);
    return aircraftId ? components.filter(c => c.aircraftId === aircraftId) : components;
  },

  getComponentById: (id: string): AircraftComponent | undefined => {
    return getItem<AircraftComponent[]>(STORAGE_KEYS.COMPONENTS, []).find(c => c.id === id);
  },

  saveComponent: (component: AircraftComponent, userId: string, userName: string): AircraftComponent => {
    const components = getItem<AircraftComponent[]>(STORAGE_KEYS.COMPONENTS, []);
    const existing = components.find(c => c.id === component.id);
    
    if (existing) {
      const changes = getChanges(existing, component);
      const index = components.findIndex(c => c.id === component.id);
      components[index] = component;
      createAuditLog(userId, userName, 'update', 'component', component.id, changes);
    } else {
      component.id = component.id || generateId();
      components.push(component);
      createAuditLog(userId, userName, 'create', 'component', component.id, []);
    }
    
    setItem(STORAGE_KEYS.COMPONENTS, components);
    return component;
  },

  deleteComponent: (id: string, userId: string, userName: string): void => {
    const components = getItem<AircraftComponent[]>(STORAGE_KEYS.COMPONENTS, []).filter(c => c.id !== id);
    setItem(STORAGE_KEYS.COMPONENTS, components);
    createAuditLog(userId, userName, 'delete', 'component', id, []);
  },

  // ==========================================
  // PEÇAS / COMPONENTES DE TROCA
  // ==========================================
  
  getParts: (aircraftId?: string): AircraftPart[] => {
    const parts = getItem<AircraftPart[]>(STORAGE_KEYS.PARTS, []);
    return aircraftId ? parts.filter(p => p.aircraftId === aircraftId) : parts;
  },

  getPartById: (id: string): AircraftPart | undefined => {
    return getItem<AircraftPart[]>(STORAGE_KEYS.PARTS, []).find(p => p.id === id);
  },

  // Calcular status de uma peça baseado nas horas da aeronave
  calculatePartStatus: (part: AircraftPart, horasAeronave: number): { status: PartStatus; horasDesdeUltimaTroca: number; horasRestantes: number; diasRestantes?: number } => {
    const alertaPercentual = part.alertaPercentual || 10;
    
    // Cálculo por horas
    const horasDesdeUltimaTroca = horasAeronave - part.horasUltimaTroca;
    let horasRestantes = (part.intervaloHoras || 0) - horasDesdeUltimaTroca;
    
    // Cálculo por data (se aplicável)
    let diasRestantes: number | undefined;
    if (part.intervaloDias && part.dataUltimaTroca) {
      const ultimaTroca = new Date(part.dataUltimaTroca);
      const proximoVencimento = new Date(ultimaTroca.getTime() + part.intervaloDias * 24 * 60 * 60 * 1000);
      diasRestantes = Math.ceil((proximoVencimento.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    }
    
    // Determinar status
    let status: PartStatus = 'ok';
    
    // Verificar por horas
    if (part.intervaloHoras) {
      const limiteAlerta = part.intervaloHoras * (alertaPercentual / 100);
      if (horasRestantes <= 0) {
        status = 'vencido';
      } else if (horasRestantes <= limiteAlerta) {
        status = 'atencao';
      }
    }
    
    // Verificar por data (mais restritivo)
    if (diasRestantes !== undefined) {
      if (diasRestantes <= 0 && status !== 'vencido') {
        status = 'vencido';
      } else if (diasRestantes <= 15 && status === 'ok') {
        status = 'atencao';
      }
    }
    
    return { status, horasDesdeUltimaTroca, horasRestantes, diasRestantes };
  },

  // Atualizar status de todas as peças de uma aeronave
  updateAllPartsStatus: (aircraftId: string): AircraftPart[] => {
    const aircraft = storage.getAircraftById(aircraftId);
    if (!aircraft) return [];
    
    const parts = storage.getParts(aircraftId);
    const horasAeronave = aircraft.horasCelula;
    
    const updatedParts = parts.map(part => {
      const { status, horasDesdeUltimaTroca, horasRestantes, diasRestantes } = storage.calculatePartStatus(part, horasAeronave);
      return {
        ...part,
        status,
        horasDesdeUltimaTroca,
        horasRestantes,
        diasRestantes,
        updatedAt: new Date().toISOString(),
      };
    });
    
    setItem(STORAGE_KEYS.PARTS, getItem<AircraftPart[]>(STORAGE_KEYS.PARTS, []).map(
      p => updatedParts.find(up => up.id === p.id) || p
    ));
    
    return updatedParts;
  },

  savePart: (part: AircraftPart, userId: string, userName: string): AircraftPart => {
    const parts = getItem<AircraftPart[]>(STORAGE_KEYS.PARTS, []);
    const existing = parts.find(p => p.id === part.id);
    
    // Calcular status inicial
    const aircraft = storage.getAircraftById(part.aircraftId);
    if (aircraft) {
      const { status, horasDesdeUltimaTroca, horasRestantes, diasRestantes } = storage.calculatePartStatus(part, aircraft.horasCelula);
      part.status = status;
      part.horasDesdeUltimaTroca = horasDesdeUltimaTroca;
      part.horasRestantes = horasRestantes;
      part.diasRestantes = diasRestantes;
    }
    
    if (existing) {
      const changes = getChanges(existing, part);
      const index = parts.findIndex(p => p.id === part.id);
      part.updatedAt = new Date().toISOString();
      parts[index] = part;
      createAuditLog(userId, userName, 'update', 'part', part.id, changes);
    } else {
      part.id = part.id || generateId();
      part.createdAt = new Date().toISOString();
      part.updatedAt = part.createdAt;
      part.ativo = part.ativo !== false;
      parts.push(part);
      createAuditLog(userId, userName, 'create', 'part', part.id, []);
    }
    
    setItem(STORAGE_KEYS.PARTS, parts);
    return part;
  },

  deletePart: (id: string, userId: string, userName: string): void => {
    const parts = getItem<AircraftPart[]>(STORAGE_KEYS.PARTS, []).filter(p => p.id !== id);
    setItem(STORAGE_KEYS.PARTS, parts);
    createAuditLog(userId, userName, 'delete', 'part', id, []);
  },

  // Registrar troca de peça
  registerPartReplacement: (
    partId: string,
    data: string,
    horasAeronave: number,
    userId: string,
    userName: string,
    custo?: number,
    fornecedor?: string,
    notaFiscal?: string,
    maintenanceEventId?: string,
    observacoes?: string
  ): { part: AircraftPart; history: PartReplacementHistory } => {
    const part = storage.getPartById(partId);
    if (!part) throw new Error('Peça não encontrada');
    
    // Criar histórico
    const history: PartReplacementHistory = {
      id: generateId(),
      partId,
      aircraftId: part.aircraftId,
      data,
      horasAeronave,
      custo,
      fornecedor,
      notaFiscal,
      maintenanceEventId,
      observacoes,
      createdAt: new Date().toISOString(),
      createdBy: userId,
    };
    
    const histories = getItem<PartReplacementHistory[]>(STORAGE_KEYS.PART_HISTORY, []);
    histories.push(history);
    setItem(STORAGE_KEYS.PART_HISTORY, histories);
    
    // Atualizar peça
    part.horasUltimaTroca = horasAeronave;
    part.dataUltimaTroca = data;
    part.custoUltimaTroca = custo;
    part.fornecedor = fornecedor;
    part.notaFiscal = notaFiscal;
    part.historicoManutencaoIds = [...(part.historicoManutencaoIds || []), history.id];
    
    const updatedPart = storage.savePart(part, userId, userName);
    
    createAuditLog(userId, userName, 'create', 'part_replacement', history.id, [], { partId, partName: part.nome });
    
    return { part: updatedPart, history };
  },

  // Obter histórico de trocas de uma peça
  getPartReplacementHistory: (partId?: string, aircraftId?: string): PartReplacementHistory[] => {
    let histories = getItem<PartReplacementHistory[]>(STORAGE_KEYS.PART_HISTORY, []);
    if (partId) histories = histories.filter(h => h.partId === partId);
    if (aircraftId) histories = histories.filter(h => h.aircraftId === aircraftId);
    return histories.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  },

  // Obter próximas trocas (top N peças mais próximas do vencimento)
  getUpcomingReplacements: (aircraftId: string, limit: number = 10): AircraftPart[] => {
    const parts = storage.updateAllPartsStatus(aircraftId);
    
    return parts
      .filter(p => p.ativo && p.intervaloHoras)
      .sort((a, b) => {
        // Vencidas primeiro, depois por horas restantes
        if (a.status === 'vencido' && b.status !== 'vencido') return -1;
        if (b.status === 'vencido' && a.status !== 'vencido') return 1;
        return (a.horasRestantes || 0) - (b.horasRestantes || 0);
      })
      .slice(0, limit);
  },

  // Gerar alertas para peças
  generatePartAlerts: (aircraftId: string): void => {
    const parts = storage.updateAllPartsStatus(aircraftId);
    const aircraft = storage.getAircraftById(aircraftId);
    if (!aircraft) return;
    
    parts.forEach(part => {
      if (!part.ativo) return;
      
      if (part.status === 'vencido' || part.status === 'atencao') {
        const existingAlert = storage.getAlerts(aircraftId).find(
          a => a.entityId === part.id && a.tipo === 'manutencao' && !a.dispensado
        );
        
        if (!existingAlert) {
          storage.saveAlert({
            id: generateId(),
            tipo: 'manutencao',
            severity: part.status === 'vencido' ? 'critical' : 'warning',
            titulo: part.status === 'vencido' ? 'Peça Vencida' : 'Troca de Peça Próxima',
            mensagem: `${part.nome} - ${aircraft.prefixo}${part.horasRestantes !== undefined ? ` (${part.horasRestantes.toFixed(1)}h restantes)` : ''}`,
            aircraftId,
            entityId: part.id,
            entityType: 'part',
            lido: false,
            dispensado: false,
            createdAt: new Date().toISOString(),
          });
        }
      }
    });
  },

  // ==========================================
  // USUÁRIOS
  // ==========================================
  
  getUsers: (): User[] => {
    return getItem<User[]>(STORAGE_KEYS.USERS, []);
  },

  getUserById: (id: string): User | undefined => {
    return storage.getUsers().find(u => u.id === id);
  },

  getUserByEmail: (email: string): User | undefined => {
    return storage.getUsers().find(u => u.email.toLowerCase() === email.toLowerCase());
  },

  saveUser: (user: User, currentUserId?: string, currentUserName?: string): User => {
    const users = storage.getUsers();
    const existing = users.find(u => u.id === user.id);
    
    if (existing) {
      const changes = getChanges(existing, user);
      const index = users.findIndex(u => u.id === user.id);
      user.updatedAt = new Date().toISOString();
      users[index] = user;
      if (currentUserId && currentUserName) {
        createAuditLog(currentUserId, currentUserName, 'update', 'user', user.id, changes);
      }
    } else {
      user.id = user.id || generateId();
      user.createdAt = new Date().toISOString();
      user.updatedAt = user.createdAt;
      users.push(user);
      if (currentUserId && currentUserName) {
        createAuditLog(currentUserId, currentUserName, 'create', 'user', user.id, []);
      }
    }
    
    setItem(STORAGE_KEYS.USERS, users);
    return user;
  },

  // ==========================================
  // LICENÇAS DE USUÁRIOS
  // ==========================================
  
  getUserLicenses: (userId?: string): UserLicense[] => {
    const licenses = getItem<UserLicense[]>(STORAGE_KEYS.USER_LICENSES, []);
    return userId ? licenses.filter(l => l.userId === userId) : licenses;
  },

  saveUserLicense: (license: UserLicense): UserLicense => {
    const licenses = getItem<UserLicense[]>(STORAGE_KEYS.USER_LICENSES, []);
    const index = licenses.findIndex(l => l.id === license.id);
    
    if (index !== -1) {
      licenses[index] = license;
    } else {
      license.id = license.id || generateId();
      licenses.push(license);
    }
    
    setItem(STORAGE_KEYS.USER_LICENSES, licenses);
    return license;
  },

  deleteUserLicense: (id: string): void => {
    const licenses = getItem<UserLicense[]>(STORAGE_KEYS.USER_LICENSES, []).filter(l => l.id !== id);
    setItem(STORAGE_KEYS.USER_LICENSES, licenses);
  },

  // ==========================================
  // MEMBERSHIPS (Cotistas)
  // ==========================================
  
  getMemberships: (aircraftId?: string): Membership[] => {
    const memberships = getItem<Membership[]>(STORAGE_KEYS.MEMBERSHIPS, []);
    return aircraftId ? memberships.filter(m => m.aircraftId === aircraftId) : memberships;
  },

  getMembershipsByUser: (userId: string): Membership[] => {
    return getItem<Membership[]>(STORAGE_KEYS.MEMBERSHIPS, []).filter(m => m.userId === userId);
  },

  saveMembership: (membership: Membership, userId: string, userName: string): Membership => {
    const memberships = getItem<Membership[]>(STORAGE_KEYS.MEMBERSHIPS, []);
    const existing = memberships.find(m => m.id === membership.id);
    
    if (existing) {
      const changes = getChanges(existing, membership);
      const index = memberships.findIndex(m => m.id === membership.id);
      memberships[index] = membership;
      createAuditLog(userId, userName, 'update', 'membership', membership.id, changes);
    } else {
      membership.id = membership.id || generateId();
      memberships.push(membership);
      createAuditLog(userId, userName, 'create', 'membership', membership.id, []);
    }
    
    setItem(STORAGE_KEYS.MEMBERSHIPS, memberships);
    return membership;
  },

  deleteMembership: (id: string, userId: string, userName: string): void => {
    const memberships = getItem<Membership[]>(STORAGE_KEYS.MEMBERSHIPS, []).filter(m => m.id !== id);
    setItem(STORAGE_KEYS.MEMBERSHIPS, memberships);
    createAuditLog(userId, userName, 'delete', 'membership', id, []);
  },

  // ==========================================
  // MANUTENÇÕES
  // ==========================================
  
  getMaintenanceEvents: (aircraftId?: string): MaintenanceEvent[] => {
    const events = getItem<MaintenanceEvent[]>(STORAGE_KEYS.MAINTENANCE_EVENTS, []);
    return aircraftId ? events.filter(e => e.aircraftId === aircraftId) : events;
  },

  saveMaintenanceEvent: (event: MaintenanceEvent, userId: string, userName: string, partsToUpdate?: string[]): MaintenanceEvent => {
    const events = getItem<MaintenanceEvent[]>(STORAGE_KEYS.MAINTENANCE_EVENTS, []);
    const existing = events.find(e => e.id === event.id);
    
    if (existing) {
      const changes = getChanges(existing, event);
      const index = events.findIndex(e => e.id === event.id);
      events[index] = event;
      createAuditLog(userId, userName, 'update', 'maintenance_event', event.id, changes);
    } else {
      event.id = event.id || generateId();
      event.createdAt = new Date().toISOString();
      event.createdBy = userId;
      events.push(event);
      createAuditLog(userId, userName, 'create', 'maintenance_event', event.id, []);
    }
    
    setItem(STORAGE_KEYS.MAINTENANCE_EVENTS, events);
    
    // Atualizar horas dos componentes automaticamente
    storage.updateComponentHoursAfterMaintenance(event);
    
    // Atualizar peças selecionadas (registrar troca)
    if (partsToUpdate && partsToUpdate.length > 0) {
      const custoPorPeca = event.pecasTrocadas?.length 
        ? event.custo / event.pecasTrocadas.length 
        : event.custo / partsToUpdate.length;
      
      partsToUpdate.forEach(partId => {
        try {
          storage.registerPartReplacement(
            partId,
            event.data,
            event.horasAeronave,
            userId,
            userName,
            custoPorPeca,
            event.oficina,
            undefined,
            event.id,
            event.observacoes
          );
        } catch (e) {
          console.error('Erro ao atualizar peça:', e);
        }
      });
    }
    
    // Atualizar status de todas as peças
    storage.updateAllPartsStatus(event.aircraftId);
    
    // Gerar alertas de peças
    storage.generatePartAlerts(event.aircraftId);
    
    return event;
  },

  getMaintenanceSchedules: (aircraftId?: string): MaintenanceSchedule[] => {
    const schedules = getItem<MaintenanceSchedule[]>(STORAGE_KEYS.MAINTENANCE_SCHEDULES, []);
    return aircraftId ? schedules.filter(s => s.aircraftId === aircraftId) : schedules;
  },

  saveMaintenanceSchedule: (schedule: MaintenanceSchedule, userId: string, userName: string): MaintenanceSchedule => {
    const schedules = getItem<MaintenanceSchedule[]>(STORAGE_KEYS.MAINTENANCE_SCHEDULES, []);
    const existing = schedules.find(s => s.id === schedule.id);
    
    if (existing) {
      const changes = getChanges(existing, schedule);
      const index = schedules.findIndex(s => s.id === schedule.id);
      schedules[index] = schedule;
      createAuditLog(userId, userName, 'update', 'maintenance_schedule', schedule.id, changes);
    } else {
      schedule.id = schedule.id || generateId();
      schedules.push(schedule);
      createAuditLog(userId, userName, 'create', 'maintenance_schedule', schedule.id, []);
    }
    
    setItem(STORAGE_KEYS.MAINTENANCE_SCHEDULES, schedules);
    return schedule;
  },

  deleteMaintenanceSchedule: (id: string, userId: string, userName: string): void => {
    const schedules = getItem<MaintenanceSchedule[]>(STORAGE_KEYS.MAINTENANCE_SCHEDULES, []).filter(s => s.id !== id);
    setItem(STORAGE_KEYS.MAINTENANCE_SCHEDULES, schedules);
    createAuditLog(userId, userName, 'delete', 'maintenance_schedule', id, []);
  },

  updateComponentHoursAfterMaintenance: (event: MaintenanceEvent): void => {
    if (event.componentId && event.horasComponente !== undefined) {
      const component = storage.getComponentById(event.componentId);
      if (component) {
        component.horasAtuais = event.horasComponente;
        component.ultimaRevisao = event.data;
        const components = getItem<AircraftComponent[]>(STORAGE_KEYS.COMPONENTS, []);
        const index = components.findIndex(c => c.id === component.id);
        if (index !== -1) {
          components[index] = component;
          setItem(STORAGE_KEYS.COMPONENTS, components);
        }
      }
    }
  },

  // ==========================================
  // VOOS (Logbook)
  // ==========================================
  
  getFlights: (aircraftId?: string): Flight[] => {
    const flights = getItem<Flight[]>(STORAGE_KEYS.FLIGHTS, []);
    return aircraftId ? flights.filter(f => f.aircraftId === aircraftId) : flights;
  },

  getFlightsByPilot: (pilotId: string): Flight[] => {
    return getItem<Flight[]>(STORAGE_KEYS.FLIGHTS, []).filter(
      f => f.pilotoId === pilotId || f.copilotoId === pilotId
    );
  },

  saveFlight: (flight: Flight, userId: string, userName: string): Flight => {
    const flights = getItem<Flight[]>(STORAGE_KEYS.FLIGHTS, []);
    const existing = flights.find(f => f.id === flight.id);
    const isNew = !existing;
    
    if (existing) {
      const changes = getChanges(existing, flight);
      const index = flights.findIndex(f => f.id === flight.id);
      flight.updatedAt = new Date().toISOString();
      flights[index] = flight;
      createAuditLog(userId, userName, 'update', 'flight', flight.id, changes);
    } else {
      flight.id = flight.id || generateId();
      flight.createdAt = new Date().toISOString();
      flight.createdBy = userId;
      flight.updatedAt = flight.createdAt;
      flights.push(flight);
      createAuditLog(userId, userName, 'create', 'flight', flight.id, []);
    }
    
    setItem(STORAGE_KEYS.FLIGHTS, flights);
    
    // Atualizar horas da aeronave e componentes
    if (isNew) {
      storage.updateAircraftHoursAfterFlight(flight);
      storage.updatePilotHoursAfterFlight(flight);
      storage.recalculateMaintenanceSchedules(flight.aircraftId);
    }
    
    return flight;
  },

  deleteFlight: (id: string, userId: string, userName: string): void => {
    const flights = getItem<Flight[]>(STORAGE_KEYS.FLIGHTS, []).filter(f => f.id !== id);
    setItem(STORAGE_KEYS.FLIGHTS, flights);
    createAuditLog(userId, userName, 'delete', 'flight', id, []);
  },

  updateAircraftHoursAfterFlight: (flight: Flight): void => {
    const aircraft = storage.getAircraftById(flight.aircraftId);
    if (aircraft) {
      aircraft.horasCelula += flight.horasCelula;
      aircraft.ciclosTotais += flight.ciclos;
      aircraft.updatedAt = new Date().toISOString();
      
      const aircrafts = storage.getAircraft();
      const index = aircrafts.findIndex(a => a.id === aircraft.id);
      if (index !== -1) {
        aircrafts[index] = aircraft;
        setItem(STORAGE_KEYS.AIRCRAFT, aircrafts);
      }
    }
    
    // Atualizar componentes
    const components = storage.getComponents(flight.aircraftId);
    components.forEach(component => {
      if (component.tipo === 'motor') {
        component.horasAtuais += flight.horasMotor;
      } else if (component.tipo === 'celula') {
        component.horasAtuais += flight.horasCelula;
      }
      if (component.ciclosAtuais !== undefined) {
        component.ciclosAtuais += flight.ciclos;
      }
    });
    setItem(STORAGE_KEYS.COMPONENTS, getItem<AircraftComponent[]>(STORAGE_KEYS.COMPONENTS, []).map(
      c => components.find(comp => comp.id === c.id) || c
    ));
  },

  updatePilotHoursAfterFlight: (flight: Flight): void => {
    const pilot = storage.getUserById(flight.pilotoId);
    if (pilot) {
      pilot.horasTotais += flight.tempoVoo;
      storage.saveUser(pilot);
    }
    
    if (flight.copilotoId) {
      const copilot = storage.getUserById(flight.copilotoId);
      if (copilot) {
        copilot.horasTotais += flight.tempoVoo;
        storage.saveUser(copilot);
      }
    }
  },

  recalculateMaintenanceSchedules: (aircraftId: string): void => {
    const aircraft = storage.getAircraftById(aircraftId);
    if (!aircraft) return;
    
    const schedules = storage.getMaintenanceSchedules(aircraftId);
    
    schedules.forEach(schedule => {
      if (schedule.trigger === 'horas' && schedule.intervaloHoras) {
const ultimaExecucaoHoras = schedule.ultimaExecucao 
          ? storage.getMaintenanceEvents(aircraftId)
              .filter(e => e.data === schedule.ultimaExecucao)
              .reduce((max, e) => Math.max(max, e.horasAeronave), 0)
          : 0;
        
        schedule.proximasHoras = ultimaExecucaoHoras + schedule.intervaloHoras;
      }
    });
    
    setItem(STORAGE_KEYS.MAINTENANCE_SCHEDULES, getItem<MaintenanceSchedule[]>(STORAGE_KEYS.MAINTENANCE_SCHEDULES, []).map(
      s => schedules.find(sch => sch.id === s.id) || s
    ));
  },

  // ==========================================
  // DESPESAS
  // ==========================================
  
  getExpenses: (aircraftId?: string): Expense[] => {
    const expenses = getItem<Expense[]>(STORAGE_KEYS.EXPENSES, []);
    return aircraftId ? expenses.filter(e => e.aircraftId === aircraftId) : expenses;
  },

  saveExpense: (expense: Expense, userId: string, userName: string): Expense => {
    const expenses = getItem<Expense[]>(STORAGE_KEYS.EXPENSES, []);
    const existing = expenses.find(e => e.id === expense.id);
    
    // Se estiver editando, remover pagamentos antigos relacionados
    if (existing) {
      const changes = getChanges(existing, expense);
      const index = expenses.findIndex(e => e.id === expense.id);
      expenses[index] = expense;
      createAuditLog(userId, userName, 'update', 'expense', expense.id, changes);
      
      // Remover pagamentos antigos relacionados a esta despesa
      const payments = getItem<Payment[]>(STORAGE_KEYS.PAYMENTS, []);
      const updatedPayments = payments.filter(p => p.expenseId !== expense.id);
      setItem(STORAGE_KEYS.PAYMENTS, updatedPayments);
      
      // Atualizar saldo bancário (reverter valor antigo e aplicar novo)
      if (existing.contaBancariaId) {
        storage.updateBankAccountBalance(existing.contaBancariaId, existing.valor, 'revert');
      }
    } else {
      expense.id = expense.id || generateId();
      expense.createdAt = new Date().toISOString();
      expense.createdBy = userId;
      expenses.push(expense);
      createAuditLog(userId, userName, 'create', 'expense', expense.id, []);
    }
    
    // Atualizar saldo bancário (subtrair valor da despesa)
    if (expense.contaBancariaId) {
      storage.updateBankAccountBalance(expense.contaBancariaId, expense.valor, 'subtract');
    }
    
    // Criar rateio (automático ou manual)
    if (expense.rateioAutomatico) {
      storage.createExpenseRateio(expense, userId, userName);
    } else if (expense.rateioManual && expense.rateioManual.length > 0) {
      storage.createManualRateio(expense, userId, userName);
    }
    
    setItem(STORAGE_KEYS.EXPENSES, expenses);
    return expense;
  },

  deleteExpense: (id: string, userId: string, userName: string): void => {
    const expenses = getItem<Expense[]>(STORAGE_KEYS.EXPENSES, []);
    const expense = expenses.find(e => e.id === id);
    
    if (expense && expense.contaBancariaId) {
      // Reverter saldo bancário
      storage.updateBankAccountBalance(expense.contaBancariaId, expense.valor, 'revert');
    }
    
    const updatedExpenses = expenses.filter(e => e.id !== id);
    setItem(STORAGE_KEYS.EXPENSES, updatedExpenses);
    createAuditLog(userId, userName, 'delete', 'expense', id, []);
  },

  createExpenseRateio: (expense: Expense, _userId: string, _userName: string): void => {
    const memberships = storage.getMemberships(expense.aircraftId).filter(m => m.status === 'ativo');
    if (memberships.length === 0) return;
    
    const flight = expense.flightId ? getItem<Flight[]>(STORAGE_KEYS.FLIGHTS, []).find(f => f.id === expense.flightId) : null;
    
    memberships.forEach(membership => {
      let valorRateado = 0;
      
      if (expense.tipo === 'fixo') {
        // Rateio por cota
        valorRateado = expense.valor * (membership.cotaPercentual || (100 / memberships.length)) / 100;
      } else if (expense.tipo === 'variavel' && flight) {
        // Rateio por hora de voo (simplificado: divide igualmente por quem voou)
        if (flight.pilotoId === membership.userId) {
          valorRateado = expense.valor;
        }
      }
      
      // Aplicar desconto se existir
      if (membership.descontoPercentual) {
        valorRateado *= (1 - membership.descontoPercentual / 100);
      }
      
      // Aplicar teto se existir
      if (membership.tetoMensal && valorRateado > membership.tetoMensal) {
        valorRateado = membership.tetoMensal;
      }
      
      if (valorRateado > 0) {
        const payment: Payment = {
          id: generateId(),
          expenseId: expense.id,
          memberId: membership.userId,
          aircraftId: expense.aircraftId,
          valor: valorRateado,
          valorOriginal: expense.valor,
          descricao: expense.descricao,
          status: 'pendente',
          dataVencimento: expense.dataVencimento || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          createdAt: new Date().toISOString(),
        };
        
        const payments = getItem<Payment[]>(STORAGE_KEYS.PAYMENTS, []);
        payments.push(payment);
        setItem(STORAGE_KEYS.PAYMENTS, payments);
      }
    });
  },

  createManualRateio: (expense: Expense, _userId: string, _userName: string): void => {
    if (!expense.rateioManual || expense.rateioManual.length === 0) return;
    
    const payments = getItem<Payment[]>(STORAGE_KEYS.PAYMENTS, []);
    
    expense.rateioManual.forEach(rateio => {
      if (rateio.valor > 0) {
        const payment: Payment = {
          id: generateId(),
          expenseId: expense.id,
          memberId: rateio.memberId,
          aircraftId: expense.aircraftId,
          valor: rateio.valor,
          valorOriginal: expense.valor,
          descricao: expense.subVoo 
            ? `${expense.descricao} (${expense.subVoo})`
            : expense.descricao,
          status: 'pendente',
          dataVencimento: expense.dataVencimento || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          createdAt: new Date().toISOString(),
        };
        
        payments.push(payment);
      }
    });
    
    setItem(STORAGE_KEYS.PAYMENTS, payments);
  },

  // ==========================================
  // RECEITAS
  // ==========================================

  getRevenues: (aircraftId?: string): Revenue[] => {
    let revenues = getItem<Revenue[]>(STORAGE_KEYS.REVENUES, []);
    if (aircraftId) revenues = revenues.filter(r => r.aircraftId === aircraftId);
    return revenues.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  },

  saveRevenue: (revenue: Revenue, userId: string, userName: string): Revenue => {
    const revenues = getItem<Revenue[]>(STORAGE_KEYS.REVENUES, []);
    const existing = revenues.find(r => r.id === revenue.id);
    
    if (existing) {
      const changes = getChanges(existing, revenue);
      const index = revenues.findIndex(r => r.id === revenue.id);
      revenues[index] = revenue;
      createAuditLog(userId, userName, 'update', 'revenue', revenue.id, changes);
      
      // Atualizar saldo bancário (reverter valor antigo e aplicar novo)
      if (existing.contaBancariaId) {
        storage.updateBankAccountBalance(existing.contaBancariaId, existing.valor, 'revert');
      }
    } else {
      revenue.id = revenue.id || generateId();
      revenue.createdAt = new Date().toISOString();
      revenue.createdBy = userId;
      revenues.push(revenue);
      createAuditLog(userId, userName, 'create', 'revenue', revenue.id, []);
    }
    
    // Atualizar saldo bancário (adicionar valor da receita)
    if (revenue.contaBancariaId) {
      storage.updateBankAccountBalance(revenue.contaBancariaId, revenue.valor, 'add');
    }
    
    // Criar rateio se configurado
    if (revenue.rateioAutomatico) {
      storage.createRevenueRateio(revenue, userId, userName);
    } else if (revenue.rateioManual && revenue.rateioManual.length > 0) {
      storage.createManualRevenueRateio(revenue, userId, userName);
    }
    
    setItem(STORAGE_KEYS.REVENUES, revenues);
    return revenue;
  },

  deleteRevenue: (id: string, userId: string, userName: string): void => {
    const revenues = getItem<Revenue[]>(STORAGE_KEYS.REVENUES, []);
    const revenue = revenues.find(r => r.id === id);
    
    if (revenue && revenue.contaBancariaId) {
      // Reverter saldo bancário
      storage.updateBankAccountBalance(revenue.contaBancariaId, revenue.valor, 'revert');
    }
    
    const updatedRevenues = revenues.filter(r => r.id !== id);
    setItem(STORAGE_KEYS.REVENUES, updatedRevenues);
    createAuditLog(userId, userName, 'delete', 'revenue', id, []);
  },

  createRevenueRateio: (revenue: Revenue, _userId: string, _userName: string): void => {
    const memberships = storage.getMemberships(revenue.aircraftId).filter(m => m.status === 'ativo');
    if (memberships.length === 0) return;
    
    // Rateio igual para receitas (divide igualmente entre membros ativos)
    const valorPorMembro = revenue.valor / memberships.length;
    
    memberships.forEach(membership => {
      const payment: Payment = {
        id: generateId(),
        expenseId: undefined, // Receitas não têm expenseId
        memberId: membership.userId,
        aircraftId: revenue.aircraftId,
        valor: valorPorMembro,
        valorOriginal: revenue.valor,
        descricao: revenue.descricao,
        status: 'pago', // Receitas são consideradas pagas automaticamente
        dataVencimento: revenue.data,
        dataPagamento: revenue.data,
        createdAt: new Date().toISOString(),
      };
      
      const payments = getItem<Payment[]>(STORAGE_KEYS.PAYMENTS, []);
      payments.push(payment);
      setItem(STORAGE_KEYS.PAYMENTS, payments);
    });
  },

  createManualRevenueRateio: (revenue: Revenue, _userId: string, _userName: string): void => {
    if (!revenue.rateioManual || revenue.rateioManual.length === 0) return;
    
    const payments = getItem<Payment[]>(STORAGE_KEYS.PAYMENTS, []);
    
    revenue.rateioManual.forEach(rateio => {
      if (rateio.valor > 0) {
        const payment: Payment = {
          id: generateId(),
          expenseId: undefined,
          memberId: rateio.memberId,
          aircraftId: revenue.aircraftId,
          valor: rateio.valor,
          valorOriginal: revenue.valor,
          descricao: revenue.subVoo 
            ? `${revenue.descricao} (${revenue.subVoo})`
            : revenue.descricao,
          status: 'pago',
          dataVencimento: revenue.data,
          dataPagamento: revenue.data,
          createdAt: new Date().toISOString(),
        };
        
        payments.push(payment);
      }
    });
    
    setItem(STORAGE_KEYS.PAYMENTS, payments);
  },

  // ==========================================
  // CONTAS BANCÁRIAS
  // ==========================================

  getBankAccounts: (aircraftId?: string): BankAccount[] => {
    let accounts = getItem<BankAccount[]>(STORAGE_KEYS.BANK_ACCOUNTS, []);
    if (aircraftId) accounts = accounts.filter(a => a.aircraftId === aircraftId);
    return accounts.filter(a => a.ativa);
  },

  saveBankAccount: (account: BankAccount, userId: string, userName: string): BankAccount => {
    const accounts = getItem<BankAccount[]>(STORAGE_KEYS.BANK_ACCOUNTS, []);
    const existing = accounts.find(a => a.id === account.id);
    
    if (existing) {
      const changes = getChanges(existing, account);
      const index = accounts.findIndex(a => a.id === account.id);
      accounts[index] = { ...account, updatedAt: new Date().toISOString() };
      createAuditLog(userId, userName, 'update', 'bank_account', account.id, changes);
    } else {
      account.id = account.id || generateId();
      account.createdAt = new Date().toISOString();
      account.updatedAt = new Date().toISOString();
      account.saldoAtual = account.saldoInicial; // Inicializa saldo atual
      accounts.push(account);
      createAuditLog(userId, userName, 'create', 'bank_account', account.id, []);
    }
    
    setItem(STORAGE_KEYS.BANK_ACCOUNTS, accounts);
    return account;
  },

  updateBankAccountBalance: (accountId: string, valor: number, operation: 'add' | 'subtract' | 'revert'): void => {
    const accounts = getItem<BankAccount[]>(STORAGE_KEYS.BANK_ACCOUNTS, []);
    const account = accounts.find(a => a.id === accountId);
    
    if (!account) return;
    
    const index = accounts.findIndex(a => a.id === accountId);
    if (operation === 'add') {
      accounts[index].saldoAtual += valor;
    } else if (operation === 'subtract') {
      accounts[index].saldoAtual -= valor;
    } else if (operation === 'revert') {
      accounts[index].saldoAtual -= valor; // Reverte adição anterior
    }
    
    accounts[index].updatedAt = new Date().toISOString();
    setItem(STORAGE_KEYS.BANK_ACCOUNTS, accounts);
  },

  recalculateBankAccountBalance: (accountId: string): void => {
    const account = getItem<BankAccount[]>(STORAGE_KEYS.BANK_ACCOUNTS, []).find(a => a.id === accountId);
    if (!account) return;
    
    // Recalcular saldo baseado em todas as transações
    const expenses = storage.getExpenses(account.aircraftId).filter(e => e.contaBancariaId === accountId);
    const revenues = storage.getRevenues(account.aircraftId).filter(r => r.contaBancariaId === accountId);
    
    const totalDespesas = expenses.reduce((sum, e) => sum + e.valor, 0);
    const totalReceitas = revenues.reduce((sum, r) => sum + r.valor, 0);
    
    const accounts = getItem<BankAccount[]>(STORAGE_KEYS.BANK_ACCOUNTS, []);
    const index = accounts.findIndex(a => a.id === accountId);
    accounts[index].saldoAtual = account.saldoInicial + totalReceitas - totalDespesas;
    accounts[index].updatedAt = new Date().toISOString();
    setItem(STORAGE_KEYS.BANK_ACCOUNTS, accounts);
  },

  // ==========================================
  // PAGAMENTOS
  // ==========================================
  
  getPayments: (memberId?: string, aircraftId?: string): Payment[] => {
    let payments = getItem<Payment[]>(STORAGE_KEYS.PAYMENTS, []);
    if (memberId) payments = payments.filter(p => p.memberId === memberId);
    if (aircraftId) payments = payments.filter(p => p.aircraftId === aircraftId);
    return payments;
  },

  savePayment: (payment: Payment, userId: string, userName: string): Payment => {
    const payments = getItem<Payment[]>(STORAGE_KEYS.PAYMENTS, []);
    const existing = payments.find(p => p.id === payment.id);
    
    if (existing) {
      const changes = getChanges(existing, payment);
      const index = payments.findIndex(p => p.id === payment.id);
      payments[index] = payment;
      createAuditLog(userId, userName, 'update', 'payment', payment.id, changes);
    } else {
      payment.id = payment.id || generateId();
      payment.createdAt = new Date().toISOString();
      payments.push(payment);
      createAuditLog(userId, userName, 'create', 'payment', payment.id, []);
    }
    
    setItem(STORAGE_KEYS.PAYMENTS, payments);
    return payment;
  },

  getMemberBalance: (memberId: string, aircraftId: string): { horasVoadas: number; valorDevido: number; valorPago: number; saldo: number } => {
    const flights = storage.getFlights(aircraftId).filter(f => f.pilotoId === memberId || f.copilotoId === memberId);
    const payments = storage.getPayments(memberId, aircraftId);
    
    const horasVoadas = flights.reduce((sum, f) => sum + f.tempoVoo, 0);
    const valorDevido = payments.reduce((sum, p) => sum + p.valor, 0);
    const valorPago = payments.filter(p => p.status === 'pago').reduce((sum, p) => sum + p.valor, 0);
    const saldo = valorPago - valorDevido;
    
    return { horasVoadas, valorDevido, valorPago, saldo };
  },

  // ==========================================
  // DOCUMENTOS
  // ==========================================
  
  getDocuments: (aircraftId?: string, userId?: string): Document[] => {
    let documents = getItem<Document[]>(STORAGE_KEYS.DOCUMENTS, []);
    if (aircraftId) documents = documents.filter(d => d.aircraftId === aircraftId);
    if (userId) documents = documents.filter(d => d.userId === userId);
    return documents;
  },

  saveDocument: (document: Document, userId: string, userName: string): Document => {
    const documents = getItem<Document[]>(STORAGE_KEYS.DOCUMENTS, []);
    const existing = documents.find(d => d.id === document.id);
    
    if (existing) {
      const changes = getChanges(existing, document);
      const index = documents.findIndex(d => d.id === document.id);
      documents[index] = document;
      createAuditLog(userId, userName, 'update', 'document', document.id, changes);
    } else {
      document.id = document.id || generateId();
      document.createdAt = new Date().toISOString();
      document.createdBy = userId;
      documents.push(document);
      createAuditLog(userId, userName, 'create', 'document', document.id, []);
    }
    
    setItem(STORAGE_KEYS.DOCUMENTS, documents);
    return document;
  },

  deleteDocument: (id: string, userId: string, userName: string): void => {
    const documents = getItem<Document[]>(STORAGE_KEYS.DOCUMENTS, []).filter(d => d.id !== id);
    setItem(STORAGE_KEYS.DOCUMENTS, documents);
    createAuditLog(userId, userName, 'delete', 'document', id, []);
  },

  // ==========================================
  // AGENDAMENTOS
  // ==========================================
  
  getBookings: (aircraftId?: string): Booking[] => {
    const bookings = getItem<Booking[]>(STORAGE_KEYS.BOOKINGS, []);
    return aircraftId ? bookings.filter(b => b.aircraftId === aircraftId) : bookings;
  },

  getBookingsByMember: (memberId: string): Booking[] => {
    return getItem<Booking[]>(STORAGE_KEYS.BOOKINGS, []).filter(b => b.memberId === memberId);
  },

  saveBooking: (booking: Booking, userId: string, userName: string): Booking => {
    const bookings = getItem<Booking[]>(STORAGE_KEYS.BOOKINGS, []);
    
    // Verificar conflito
    if (!booking.cancelado) {
      const conflito = bookings.find(b => 
        b.aircraftId === booking.aircraftId &&
        b.id !== booking.id &&
        !b.cancelado &&
        new Date(b.dataInicio) < new Date(booking.dataFim) &&
        new Date(b.dataFim) > new Date(booking.dataInicio)
      );
      
      if (conflito) {
        throw new Error('Conflito de agendamento detectado');
      }
    }
    
    const existing = bookings.find(b => b.id === booking.id);
    
    if (existing) {
      const changes = getChanges(existing, booking);
      const index = bookings.findIndex(b => b.id === booking.id);
      bookings[index] = booking;
      createAuditLog(userId, userName, 'update', 'booking', booking.id, changes);
    } else {
      booking.id = booking.id || generateId();
      booking.createdAt = new Date().toISOString();
      booking.createdBy = userId;
      bookings.push(booking);
      createAuditLog(userId, userName, 'create', 'booking', booking.id, []);
    }
    
    setItem(STORAGE_KEYS.BOOKINGS, bookings);
    return booking;
  },

  // ==========================================
  // ALERTAS
  // ==========================================
  
  getAlerts: (aircraftId?: string): Alert[] => {
    const alerts = getItem<Alert[]>(STORAGE_KEYS.ALERTS, []);
    return aircraftId ? alerts.filter(a => a.aircraftId === aircraftId) : alerts;
  },

  saveAlert: (alert: Alert): Alert => {
    const alerts = getItem<Alert[]>(STORAGE_KEYS.ALERTS, []);
    alert.id = alert.id || generateId();
    alert.createdAt = new Date().toISOString();
    alerts.unshift(alert);
    setItem(STORAGE_KEYS.ALERTS, alerts.slice(0, 500));
    return alert;
  },

  dismissAlert: (id: string): void => {
    const alerts = getItem<Alert[]>(STORAGE_KEYS.ALERTS, []);
    const index = alerts.findIndex(a => a.id === id);
    if (index !== -1) {
      alerts[index].dispensado = true;
      setItem(STORAGE_KEYS.ALERTS, alerts);
    }
  },

  markAlertAsRead: (id: string): void => {
    const alerts = getItem<Alert[]>(STORAGE_KEYS.ALERTS, []);
    const index = alerts.findIndex(a => a.id === id);
    if (index !== -1) {
      alerts[index].lido = true;
      setItem(STORAGE_KEYS.ALERTS, alerts);
    }
  },

  generateAlerts: (aircraftId: string): void => {
    const config = storage.getConfig();
    const aircraft = storage.getAircraftById(aircraftId);
    if (!aircraft) return;
    
    // Alertas de manutenção
    const schedules = storage.getMaintenanceSchedules(aircraftId);
    schedules.forEach(schedule => {
      if (!schedule.ativo) return;
      
      let isExpired = false;
      let isNearExpiry = false;
      
      if (schedule.trigger === 'horas' && schedule.proximasHoras) {
        const horasRestantes = schedule.proximasHoras - aircraft.horasCelula;
        isExpired = horasRestantes <= 0;
        isNearExpiry = horasRestantes <= (schedule.alertaAntesHoras || config.alertaManutencaoHoras);
      } else if (schedule.trigger === 'calendario' && schedule.proximaData) {
        const diasRestantes = Math.ceil((new Date(schedule.proximaData).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        isExpired = diasRestantes <= 0;
        isNearExpiry = diasRestantes <= (schedule.alertaAntesDias || config.alertaManutencaoDias);
      }
      
      if (isExpired || isNearExpiry) {
        const existingAlert = storage.getAlerts(aircraftId).find(
          a => a.entityId === schedule.id && a.tipo === 'manutencao' && !a.dispensado
        );
        
        if (!existingAlert) {
          storage.saveAlert({
            id: generateId(),
            tipo: 'manutencao',
            severity: isExpired ? 'critical' : 'warning',
            titulo: isExpired ? 'Manutenção Vencida' : 'Manutenção Próxima',
            mensagem: `${schedule.nome} - ${aircraft.prefixo}`,
            aircraftId,
            entityId: schedule.id,
            entityType: 'maintenance_schedule',
            lido: false,
            dispensado: false,
            createdAt: new Date().toISOString(),
          });
        }
      }
    });
    
    // Alertas de documentos
    const documents = storage.getDocuments(aircraftId);
    documents.forEach(doc => {
      if (!doc.dataValidade) return;
      
      const diasRestantes = Math.ceil((new Date(doc.dataValidade).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      const isExpired = diasRestantes <= 0;
      const isNearExpiry = diasRestantes <= (doc.alertaAntesDias || config.alertaDocumentoDias);
      
      if (isExpired || isNearExpiry) {
        const existingAlert = storage.getAlerts(aircraftId).find(
          a => a.entityId === doc.id && a.tipo === 'documento' && !a.dispensado
        );
        
        if (!existingAlert) {
          storage.saveAlert({
            id: generateId(),
            tipo: 'documento',
            severity: isExpired ? 'critical' : 'warning',
            titulo: isExpired ? 'Documento Vencido' : 'Documento Próximo do Vencimento',
            mensagem: `${doc.nome} - ${aircraft.prefixo}`,
            aircraftId,
            entityId: doc.id,
            entityType: 'document',
            dataVencimento: doc.dataValidade,
            lido: false,
            dispensado: false,
            createdAt: new Date().toISOString(),
          });
        }
      }
    });
  },

  // ==========================================
  // ESTIMATIVAS DE VOO
  // ==========================================
  
  getFlightEstimates: (aircraftId?: string): FlightEstimate[] => {
    const estimates = getItem<FlightEstimate[]>(STORAGE_KEYS.FLIGHT_ESTIMATES, []);
    return aircraftId ? estimates.filter(e => e.aircraftId === aircraftId) : estimates;
  },

  saveFlightEstimate: (estimate: FlightEstimate, userId: string, userName: string): FlightEstimate => {
    const estimates = getItem<FlightEstimate[]>(STORAGE_KEYS.FLIGHT_ESTIMATES, []);
    const existing = estimates.find(e => e.id === estimate.id);
    
    if (existing) {
      // Atualizar estimativa existente
      const changes = getChanges(existing, estimate);
      const index = estimates.findIndex(e => e.id === estimate.id);
      estimates[index] = { ...estimate };
      setItem(STORAGE_KEYS.FLIGHT_ESTIMATES, estimates);
      createAuditLog(userId, userName, 'update', 'flight_estimate', estimate.id, changes);
    } else {
      // Criar nova estimativa
      estimate.id = estimate.id || generateId();
      estimate.createdAt = new Date().toISOString();
      estimate.criadoPor = userId;
      estimates.push(estimate);
      setItem(STORAGE_KEYS.FLIGHT_ESTIMATES, estimates);
      createAuditLog(userId, userName, 'create', 'flight_estimate', estimate.id, []);
    }
    return estimate;
  },

  convertEstimateToFlight: (estimateId: string, userId: string, userName: string): Flight | null => {
    const estimate = storage.getFlightEstimates().find(e => e.id === estimateId);
    if (!estimate || estimate.convertidoEmVoo) return null;
    
    const flight: Flight = {
      id: generateId(),
      aircraftId: estimate.aircraftId,
      pilotoId: userId,
      data: new Date().toISOString().split('T')[0],
      origem: estimate.origem,
      origemIcao: estimate.origemIcao,
      destino: estimate.destino,
      destinoIcao: estimate.destinoIcao,
      tempoVoo: estimate.tempoVooEstimado,
      horasMotor: estimate.tempoVooEstimado,
      horasCelula: estimate.tempoVooEstimado,
      ciclos: (estimate.escalas?.length || 0) + 1,
      combustivelConsumido: estimate.combustivelNecessario,
      estimativaId: estimate.id,
      createdAt: new Date().toISOString(),
      createdBy: userId,
      updatedAt: new Date().toISOString(),
    };
    
    // Marcar estimativa como convertida
    const estimates = getItem<FlightEstimate[]>(STORAGE_KEYS.FLIGHT_ESTIMATES, []);
    const index = estimates.findIndex(e => e.id === estimateId);
    if (index !== -1) {
      estimates[index].convertidoEmVoo = true;
      estimates[index].flightId = flight.id;
      setItem(STORAGE_KEYS.FLIGHT_ESTIMATES, estimates);
    }
    
    return storage.saveFlight(flight, userId, userName);
  },

  // ==========================================
  // AEROPORTOS
  // ==========================================
  
  getAirports: (): Airport[] => {
    return getItem<Airport[]>(STORAGE_KEYS.AIRPORTS, getDefaultAirports());
  },

  getAirportByIcao: (icao: string): Airport | undefined => {
    return storage.getAirports().find(a => a.icao.toUpperCase() === icao.toUpperCase());
  },

  saveAirport: (airport: Airport): Airport => {
    const airports = storage.getAirports();
    const index = airports.findIndex(a => a.icao === airport.icao);
    if (index !== -1) {
      airports[index] = airport;
    } else {
      airports.push(airport);
    }
    setItem(STORAGE_KEYS.AIRPORTS, airports);
    return airport;
  },

  // ==========================================
  // AUDIT LOGS
  // ==========================================
  
  getAuditLogs: (entityType?: string, entityId?: string): AuditLog[] => {
    let logs = getItem<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, []);
    if (entityType) logs = logs.filter(l => l.entity === entityType);
    if (entityId) logs = logs.filter(l => l.entityId === entityId);
    return logs;
  },

  // ==========================================
  // LANÇAMENTOS DE VOO
  // ==========================================
  
  getFlightEntries: (aircraftId?: string): FlightEntry[] => {
    const entries = getItem<FlightEntry[]>(STORAGE_KEYS.FLIGHT_ENTRIES, []);
    return aircraftId ? entries.filter(e => e.aircraftId === aircraftId) : entries;
  },

  getFlightEntryById: (id: string): FlightEntry | undefined => {
    return getItem<FlightEntry[]>(STORAGE_KEYS.FLIGHT_ENTRIES, []).find(e => e.id === id);
  },

  // Cálculos automáticos para FlightEntry
  calculateFlightEntryFields: (entry: Partial<FlightEntry>): Partial<FlightEntry> => {
    const config = storage.getConfig();
    const fatorConversao = config.fatorConversaoLbsLitros || 0.567;
    
    // A) Combustível decolagem = Inicial + Abastecido (libras)
    const combustivelDecolagem = (entry.combustivelInicial || 0) + (entry.abastecimentoLibras || 0);
    
    // B) Combustível final = Decolagem - Consumido (libras)
    const combustivelFinal = combustivelDecolagem - (entry.combustivelConsumido || 0);
    
    // C) Conversão lbs -> litros
    const combustivelConsumidoLitros = (entry.combustivelConsumido || 0) * fatorConversao;
    const abastecimentoLitros = (entry.abastecimentoLibras || 0) * fatorConversao;
    
    // D) Tempo de voo em horas decimais para cálculo de TBO
    const horasVoo = (entry.tempoVoo || 0) / 60;
    
    // E) Provisão TBO (R$ 2.800/hora)
    const tboValorPorHora = config.tboValorPorHora || 2800;
    let provisaoTboGrossi = 0;
    let provisaoTboShimada = 0;
    
    // Divisão da provisão por grupo
    if (entry.grupo === 'grossi') {
      provisaoTboGrossi = horasVoo * tboValorPorHora;
    } else if (entry.grupo === 'shimada') {
      provisaoTboShimada = horasVoo * tboValorPorHora;
    } else if (entry.grupo === 'grossi_shimada') {
      // Divide 50/50
      provisaoTboGrossi = (horasVoo * tboValorPorHora) / 2;
      provisaoTboShimada = (horasVoo * tboValorPorHora) / 2;
    }
    
    // F) Total = soma de todos os custos
    const total = (entry.valorCombustivel || 0) +
                  (entry.hangar || 0) +
                  (entry.alimentacao || 0) +
                  (entry.hospedagem || 0) +
                  (entry.limpeza || 0) +
                  (entry.uberTaxi || 0) +
                  (entry.tarifas || 0) +
                  (entry.outras || 0) +
                  provisaoTboGrossi +
                  provisaoTboShimada;
    
    return {
      ...entry,
      combustivelDecolagem,
      combustivelFinal,
      combustivelConsumidoLitros,
      abastecimentoLitros: entry.abastecimentoLitros !== undefined ? entry.abastecimentoLitros : abastecimentoLitros, // Usa valor manual se fornecido, senão calcula
      provisaoTboGrossi,
      provisaoTboShimada,
      total,
    };
  },

  saveFlightEntry: (entry: FlightEntry, userId: string, userName: string): FlightEntry => {
    const entries = getItem<FlightEntry[]>(STORAGE_KEYS.FLIGHT_ENTRIES, []);
    const existing = entries.find(e => e.id === entry.id);
    
    // Aplicar cálculos automáticos
    const calculatedEntry = storage.calculateFlightEntryFields(entry) as FlightEntry;
    
    if (existing) {
      const changes = getChanges(existing, calculatedEntry);
      const index = entries.findIndex(e => e.id === calculatedEntry.id);
      calculatedEntry.updatedAt = new Date().toISOString();
      entries[index] = calculatedEntry;
      createAuditLog(userId, userName, 'update', 'flight_entry', calculatedEntry.id, changes);
    } else {
      calculatedEntry.id = calculatedEntry.id || generateId();
      calculatedEntry.createdAt = new Date().toISOString();
      calculatedEntry.createdBy = userId;
      calculatedEntry.updatedAt = calculatedEntry.createdAt;
      entries.push(calculatedEntry);
      createAuditLog(userId, userName, 'create', 'flight_entry', calculatedEntry.id, []);
    }
    
    setItem(STORAGE_KEYS.FLIGHT_ENTRIES, entries);
    
    // Atualizar provisão TBO acumulada
    storage.updateTBOProvision(calculatedEntry.aircraftId, calculatedEntry);
    
    return calculatedEntry;
  },

  deleteFlightEntry: (id: string, userId: string, userName: string): void => {
    const entries = getItem<FlightEntry[]>(STORAGE_KEYS.FLIGHT_ENTRIES, []).filter(e => e.id !== id);
    setItem(STORAGE_KEYS.FLIGHT_ENTRIES, entries);
    createAuditLog(userId, userName, 'delete', 'flight_entry', id, []);
  },

  // Validações de FlightEntry
  validateFlightEntry: (entry: Partial<FlightEntry>): string[] => {
    const errors: string[] = [];
    
    if (!entry.voo) errors.push('Número do voo é obrigatório');
    if (!entry.data) errors.push('Data é obrigatória');
    if (!entry.origem) errors.push('Origem é obrigatória');
    if (!entry.destino) errors.push('Destino é obrigatório');
    if ((entry.combustivelFinal || 0) > (entry.combustivelDecolagem || 0)) {
      errors.push('Combustível final não pode ser maior que combustível de decolagem');
    }
    if ((entry.combustivelConsumido || 0) < 0) {
      errors.push('Combustível consumido não pode ser negativo');
    }
    if ((entry.tempoVoo || 0) < 0) {
      errors.push('Tempo de voo não pode ser negativo');
    }
    
    return errors;
  },

  // ==========================================
  // PROVISÃO TBO
  // ==========================================
  
  getTBOProvision: (aircraftId: string): TBOProvision | undefined => {
    const provisions = getItem<TBOProvision[]>(STORAGE_KEYS.TBO_PROVISIONS, []);
    return provisions.find(p => p.aircraftId === aircraftId);
  },

  updateTBOProvision: (aircraftId: string, flightEntry: FlightEntry): void => {
    const provisions = getItem<TBOProvision[]>(STORAGE_KEYS.TBO_PROVISIONS, []);
    let provision = provisions.find(p => p.aircraftId === aircraftId);
    
    const horasVoo = flightEntry.tempoVoo / 60;
    const valorProvisionado = flightEntry.provisaoTboGrossi + flightEntry.provisaoTboShimada;
    
    if (provision) {
      provision.horasAcumuladas += horasVoo;
      provision.valorProvisionadoAcumulado += valorProvisionado;
      provision.ultimaAtualizacao = new Date().toISOString();
      
      if (provision.custoRealTBO) {
        provision.diferencaProvisionadoReal = provision.valorProvisionadoAcumulado - provision.custoRealTBO;
      }
      
      const index = provisions.findIndex(p => p.aircraftId === aircraftId);
      provisions[index] = provision;
    } else {
      provision = {
        id: generateId(),
        aircraftId,
        valorPorHora: storage.getConfig().tboValorPorHora || 2800,
        horasAcumuladas: horasVoo,
        valorProvisionadoAcumulado: valorProvisionado,
        ultimaAtualizacao: new Date().toISOString(),
      };
      provisions.push(provision);
    }
    
    setItem(STORAGE_KEYS.TBO_PROVISIONS, provisions);
  },

  saveTBOProvision: (provision: TBOProvision): TBOProvision => {
    const provisions = getItem<TBOProvision[]>(STORAGE_KEYS.TBO_PROVISIONS, []);
    const index = provisions.findIndex(p => p.id === provision.id);
    
    if (index !== -1) {
      provisions[index] = provision;
    } else {
      provision.id = provision.id || generateId();
      provisions.push(provision);
    }
    
    setItem(STORAGE_KEYS.TBO_PROVISIONS, provisions);
    return provision;
  },

  // ==========================================
  // RELATÓRIOS DE LANÇAMENTOS
  // ==========================================
  
  getFlightEntriesReport: (aircraftId: string, filters?: {
    grupo?: string;
    dataInicio?: string;
    dataFim?: string;
    origem?: string;
    destino?: string;
  }) => {
    let entries = storage.getFlightEntries(aircraftId);
    
    if (filters?.grupo) {
      entries = entries.filter(e => e.grupo === filters.grupo);
    }
    if (filters?.dataInicio) {
      entries = entries.filter(e => e.data >= filters.dataInicio!);
    }
    if (filters?.dataFim) {
      entries = entries.filter(e => e.data <= filters.dataFim!);
    }
    if (filters?.origem) {
      entries = entries.filter(e => 
        e.origem.toLowerCase().includes(filters.origem!.toLowerCase()) ||
        e.origemIcao?.toLowerCase().includes(filters.origem!.toLowerCase())
      );
    }
    if (filters?.destino) {
      entries = entries.filter(e => 
        e.destino.toLowerCase().includes(filters.destino!.toLowerCase()) ||
        e.destinoIcao?.toLowerCase().includes(filters.destino!.toLowerCase())
      );
    }
    
    // Totais
    const totalHorasMinutos = entries.reduce((sum, e) => sum + e.tempoVoo, 0);
    const totalCombustivelLbs = entries.reduce((sum, e) => sum + e.combustivelConsumido, 0);
    const totalCustos = entries.reduce((sum, e) => sum + e.total, 0);
    const totalCombustivel = entries.reduce((sum, e) => sum + e.valorCombustivel, 0);
    const totalHangar = entries.reduce((sum, e) => sum + e.hangar, 0);
    const totalAlimentacao = entries.reduce((sum, e) => sum + e.alimentacao, 0);
    const totalHospedagem = entries.reduce((sum, e) => sum + e.hospedagem, 0);
    const totalLimpeza = entries.reduce((sum, e) => sum + e.limpeza, 0);
    const totalUberTaxi = entries.reduce((sum, e) => sum + e.uberTaxi, 0);
    const totalTarifas = entries.reduce((sum, e) => sum + e.tarifas, 0);
    const totalOutras = entries.reduce((sum, e) => sum + e.outras, 0);
    const totalTboGrossi = entries.reduce((sum, e) => sum + e.provisaoTboGrossi, 0);
    const totalTboShimada = entries.reduce((sum, e) => sum + e.provisaoTboShimada, 0);
    
    // Por grupo
    const porGrupo = {
      grossi: entries.filter(e => e.grupo === 'grossi' || e.grupo === 'grossi_shimada'),
      shimada: entries.filter(e => e.grupo === 'shimada' || e.grupo === 'grossi_shimada'),
      outros: entries.filter(e => e.grupo === 'outros'),
    };
    
    // Por mês
    const porMes = entries.reduce((acc, e) => {
      const mes = e.data.substring(0, 7); // YYYY-MM
      if (!acc[mes]) {
        acc[mes] = { voos: 0, horas: 0, custos: 0 };
      }
      acc[mes].voos++;
      acc[mes].horas += e.tempoVoo / 60;
      acc[mes].custos += e.total;
      return acc;
    }, {} as Record<string, { voos: number; horas: number; custos: number }>);
    
    return {
      entries,
      totais: {
        voos: entries.length,
        horasMinutos: totalHorasMinutos,
        horasDecimal: totalHorasMinutos / 60,
        combustivelLbs: totalCombustivelLbs,
        custoTotal: totalCustos,
        porCategoria: {
          combustivel: totalCombustivel,
          hangar: totalHangar,
          alimentacao: totalAlimentacao,
          hospedagem: totalHospedagem,
          limpeza: totalLimpeza,
          uberTaxi: totalUberTaxi,
          tarifas: totalTarifas,
          outras: totalOutras,
          tboGrossi: totalTboGrossi,
          tboShimada: totalTboShimada,
        },
      },
      porGrupo,
      porMes,
    };
  },

  // ==========================================
  // USO POR SÓCIO (Relatório de Participação)
  // ==========================================
  
  getMemberUsageReport: (
    aircraftId: string,
    startDate: string,
    endDate: string,
    options?: {
      excluirInstrucao?: boolean;
      excluirTeste?: boolean;
      excluirManutencao?: boolean;
    }
  ): UsageReport => {
    let flights = storage.getFlights(aircraftId)
      .filter(f => f.data >= startDate && f.data <= endDate);
    
    // Aplicar filtros por tipo de voo
    if (options?.excluirInstrucao) {
      flights = flights.filter(f => f.tipoVoo !== 'instrucao');
    }
    if (options?.excluirTeste) {
      flights = flights.filter(f => f.tipoVoo !== 'teste');
    }
    if (options?.excluirManutencao) {
      flights = flights.filter(f => f.tipoVoo !== 'manutencao');
    }
    
    // Calcular totais
    const horasTotais = flights.reduce((sum, f) => sum + f.tempoVoo, 0);
    const voosTotais = flights.length;
    
    // Calcular despesas associadas aos voos (opcional)
    const despesas = storage.getExpenses(aircraftId)
      .filter(e => flights.some(f => f.despesasIds?.includes(e.id)));
    const custoTotal = despesas.reduce((sum, e) => sum + e.valor, 0);
    
    // Obter membros com membership ativo
    const memberships = storage.getMemberships(aircraftId).filter(m => m.status === 'ativo');
    const users = storage.getUsers();
    
    // Calcular uso por membro
    const porMembro: MemberUsageStats[] = memberships.map(membership => {
      const user = users.find(u => u.id === membership.userId);
      if (!user) return null;
      
      // Filtrar voos do membro
      let voosDoMembro = flights.filter(f => {
        // Se tem rateio de horas, usar o rateio
        if (f.rateioHoras && f.rateioHoras.length > 0) {
          return f.rateioHoras.some(r => r.membroId === membership.userId);
        }
        // Caso contrário, usar responsável financeiro ou piloto
        return f.responsavelFinanceiro === membership.userId || 
               f.pilotoId === membership.userId;
      });
      
      // Calcular horas (considerando rateio se existir)
      const horasVoadas = voosDoMembro.reduce((sum, f) => {
        if (f.rateioHoras && f.rateioHoras.length > 0) {
          const rateio = f.rateioHoras.find(r => r.membroId === membership.userId);
          return sum + (rateio ? f.tempoVoo * (rateio.percentual / 100) : 0);
        }
        return sum + f.tempoVoo;
      }, 0);
      
      const percentualHoras = horasTotais > 0 ? (horasVoadas / horasTotais) * 100 : 0;
      
      // Custos do membro
      const custoMembro = despesas
        .filter(e => voosDoMembro.some(f => f.despesasIds?.includes(e.id)))
        .reduce((sum, e) => sum + e.valor, 0);
      
      return {
        memberId: membership.userId,
        memberName: user.nome,
        memberRole: user.role,
        horasVoadas,
        percentualHoras,
        numeroVoos: voosDoMembro.length,
        custoTotal: custoMembro,
        custoMedioPorHora: horasVoadas > 0 ? custoMembro / horasVoadas : 0,
        cotaPercentual: membership.cotaPercentual,
        diferencaUsoCota: membership.cotaPercentual 
          ? percentualHoras - membership.cotaPercentual 
          : undefined,
      };
    }).filter(Boolean) as MemberUsageStats[];
    
    // Adicionar pilotos que não são membros mas voaram
    const pilotosNaoMembros = [...new Set(flights.map(f => f.pilotoId))]
      .filter(pilotoId => !memberships.some(m => m.userId === pilotoId));
    
    pilotosNaoMembros.forEach(pilotoId => {
      const user = users.find(u => u.id === pilotoId);
      if (!user) return;
      
      const voosDoMembro = flights.filter(f => f.pilotoId === pilotoId);
      const horasVoadas = voosDoMembro.reduce((sum, f) => sum + f.tempoVoo, 0);
      const percentualHoras = horasTotais > 0 ? (horasVoadas / horasTotais) * 100 : 0;
      
      porMembro.push({
        memberId: pilotoId,
        memberName: user.nome,
        memberRole: user.role,
        horasVoadas,
        percentualHoras,
        numeroVoos: voosDoMembro.length,
        custoTotal: 0,
        custoMedioPorHora: 0,
      });
    });
    
    // Ordenar por horas voadas (decrescente)
    porMembro.sort((a, b) => b.horasVoadas - a.horasVoadas);
    
    return {
      periodo: {
        inicio: startDate,
        fim: endDate,
        label: `${formatDateBR(startDate)} a ${formatDateBR(endDate)}`,
      },
      horasTotais,
      voosTotais,
      custoTotal,
      porMembro,
      filtros: options,
    };
  },

  // Obter uso por mês (para gráficos de evolução)
  getMemberUsageByMonth: (
    aircraftId: string,
    memberId: string,
    year: number
  ): { mes: string; horas: number; voos: number }[] => {
    const flights = storage.getFlights(aircraftId)
      .filter(f => {
        const flightDate = new Date(f.data);
        return flightDate.getFullYear() === year && 
               (f.pilotoId === memberId || f.responsavelFinanceiro === memberId ||
                f.rateioHoras?.some(r => r.membroId === memberId));
      });
    
    const resultado: { mes: string; horas: number; voos: number }[] = [];
    
    for (let month = 0; month < 12; month++) {
      const mesStr = `${year}-${String(month + 1).padStart(2, '0')}`;
      const voosDoMes = flights.filter(f => f.data.startsWith(mesStr));
      
      const horas = voosDoMes.reduce((sum, f) => {
        if (f.rateioHoras && f.rateioHoras.length > 0) {
          const rateio = f.rateioHoras.find(r => r.membroId === memberId);
          return sum + (rateio ? f.tempoVoo * (rateio.percentual / 100) : 0);
        }
        return sum + f.tempoVoo;
      }, 0);
      
      resultado.push({
        mes: mesStr,
        horas,
        voos: voosDoMes.length,
      });
    }
    
    return resultado;
  },

  // ==========================================
  // RESERVA DE MARGEM (Liquidez Mínima)
  // ==========================================
  
  getMarginReserve: (aircraftId: string): MarginReserve | undefined => {
    const reserves = getItem<MarginReserve[]>(STORAGE_KEYS.MARGIN_RESERVES, []);
    return reserves.find(r => r.aircraftId === aircraftId);
  },

  getMarginReserves: (): MarginReserve[] => {
    return getItem<MarginReserve[]>(STORAGE_KEYS.MARGIN_RESERVES, []);
  },

  calculateMarginReserveStatus: (reserve: MarginReserve): MarginReserve => {
    const config = storage.getConfig();
    const minimoObrigatorio = reserve.valorMinimoObrigatorio || config.reservaMargemMinima || 200000;
    
    // Calcular excedente/déficit
    reserve.excedente = reserve.saldoAtual - minimoObrigatorio;
    reserve.percentualPreenchimento = (reserve.saldoAtual / minimoObrigatorio) * 100;
    
    // Determinar status
    if (reserve.saldoAtual < minimoObrigatorio) {
      reserve.status = 'risco_liquidez';
    } else if (reserve.percentualPreenchimento < 110) {
      reserve.status = 'atencao';
    } else {
      reserve.status = 'normal';
    }
    
    return reserve;
  },

  saveMarginReserve: (reserve: MarginReserve, userId: string, userName: string): MarginReserve => {
    const reserves = getItem<MarginReserve[]>(STORAGE_KEYS.MARGIN_RESERVES, []);
    const existing = reserves.find(r => r.id === reserve.id);
    
    // Calcular status
    const calculatedReserve = storage.calculateMarginReserveStatus(reserve);
    
    if (existing) {
      const changes = getChanges(existing, calculatedReserve);
      const index = reserves.findIndex(r => r.id === calculatedReserve.id);
      calculatedReserve.updatedAt = new Date().toISOString();
      reserves[index] = calculatedReserve;
      createAuditLog(userId, userName, 'update', 'margin_reserve', calculatedReserve.id, changes);
    } else {
      calculatedReserve.id = calculatedReserve.id || generateId();
      calculatedReserve.createdAt = new Date().toISOString();
      calculatedReserve.updatedAt = calculatedReserve.createdAt;
      reserves.push(calculatedReserve);
      createAuditLog(userId, userName, 'create', 'margin_reserve', calculatedReserve.id, []);
    }
    
    setItem(STORAGE_KEYS.MARGIN_RESERVES, reserves);
    
    // Verificar e gerar alertas de liquidez
    storage.checkAndGenerateLiquidityAlerts(calculatedReserve);
    
    return calculatedReserve;
  },

  initializeMarginReserve: (aircraftId: string, userId: string, userName: string): MarginReserve => {
    const config = storage.getConfig();
    const reserve: MarginReserve = {
      id: generateId(),
      aircraftId,
      valorMinimoObrigatorio: config.reservaMargemMinima || 200000,
      saldoAtual: 0,
      status: 'risco_liquidez',
      excedente: -(config.reservaMargemMinima || 200000),
      percentualPreenchimento: 0,
      diasAbaixoMinimo: 0,
      saldoMedio30Dias: 0,
      ultimaAtualizacao: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    return storage.saveMarginReserve(reserve, userId, userName);
  },

  // Movimentações da Reserva de Margem
  getMarginReserveMovements: (reserveId?: string, aircraftId?: string): MarginReserveMovement[] => {
    let movements = getItem<MarginReserveMovement[]>(STORAGE_KEYS.MARGIN_RESERVE_MOVEMENTS, []);
    if (reserveId) movements = movements.filter(m => m.reserveId === reserveId);
    if (aircraftId) movements = movements.filter(m => m.aircraftId === aircraftId);
    return movements.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  },

  saveMarginReserveMovement: (
    movement: MarginReserveMovement, 
    userId: string, 
    userName: string
  ): { movement: MarginReserveMovement; reserve: MarginReserve } => {
    // Verificar se é uso emergencial sem justificativa
    if (movement.tipo === 'uso_emergencial' && !movement.justificativa) {
      throw new Error('Uso emergencial requer justificativa obrigatória');
    }
    
    // Obter reserva
    const reserve = storage.getMarginReserve(movement.aircraftId);
    if (!reserve) {
      throw new Error('Reserva de margem não encontrada');
    }
    
    // Registrar saldo anterior
    movement.saldoAnterior = reserve.saldoAtual;
    
    // Atualizar saldo
    reserve.saldoAtual += movement.valor;
    movement.saldoApos = reserve.saldoAtual;
    
    // Salvar movimento
    const movements = getItem<MarginReserveMovement[]>(STORAGE_KEYS.MARGIN_RESERVE_MOVEMENTS, []);
    movement.id = movement.id || generateId();
    movement.createdAt = new Date().toISOString();
    movement.createdBy = userId;
    movements.push(movement);
    setItem(STORAGE_KEYS.MARGIN_RESERVE_MOVEMENTS, movements);
    
    // Salvar reserva atualizada
    reserve.ultimaAtualizacao = new Date().toISOString();
    const updatedReserve = storage.saveMarginReserve(reserve, userId, userName);
    
    // Criar log de auditoria específico para uso emergencial
    if (movement.tipo === 'uso_emergencial') {
      createAuditLog(userId, userName, 'create', 'emergency_reserve_use', movement.id, [], {
        valor: movement.valor,
        justificativa: movement.justificativa,
        saldoApos: movement.saldoApos,
      });
    } else {
      createAuditLog(userId, userName, 'create', 'margin_reserve_movement', movement.id, []);
    }
    
    return { movement, reserve: updatedReserve };
  },

  // Aporte de sócio na reserva
  registerSocioAporte: (
    aircraftId: string,
    socioId: string,
    valor: number,
    userId: string,
    userName: string,
    observacoes?: string
  ): { movement: MarginReserveMovement; reserve: MarginReserve } => {
    const reserve = storage.getMarginReserve(aircraftId);
    if (!reserve) {
      throw new Error('Reserva de margem não encontrada');
    }
    
    const socio = storage.getUserById(socioId);
    
    const movement: MarginReserveMovement = {
      id: generateId(),
      reserveId: reserve.id,
      aircraftId,
      tipo: 'aporte',
      valor: Math.abs(valor),
      saldoAnterior: reserve.saldoAtual,
      saldoApos: 0, // Será calculado
      socioId,
      data: new Date().toISOString().split('T')[0],
      observacoes: observacoes || `Aporte de ${socio?.nome || socioId}`,
      createdAt: new Date().toISOString(),
      createdBy: userId,
    };
    
    return storage.saveMarginReserveMovement(movement, userId, userName);
  },

  // Uso emergencial da reserva
  registerEmergencyUse: (
    aircraftId: string,
    valor: number,
    justificativa: string,
    userId: string,
    userName: string,
    observacoes?: string
  ): { movement: MarginReserveMovement; reserve: MarginReserve } => {
    // Verificar se usuário é admin
    const user = storage.getUserById(userId);
    if (!user || user.role !== 'admin') {
      throw new Error('Apenas administradores podem fazer uso emergencial da reserva');
    }
    
    const reserve = storage.getMarginReserve(aircraftId);
    if (!reserve) {
      throw new Error('Reserva de margem não encontrada');
    }
    
    const movement: MarginReserveMovement = {
      id: generateId(),
      reserveId: reserve.id,
      aircraftId,
      tipo: 'uso_emergencial',
      valor: -Math.abs(valor), // Valor negativo para saída
      saldoAnterior: reserve.saldoAtual,
      saldoApos: 0, // Será calculado
      justificativa,
      aprovadoPor: userId,
      data: new Date().toISOString().split('T')[0],
      observacoes,
      createdAt: new Date().toISOString(),
      createdBy: userId,
    };
    
    return storage.saveMarginReserveMovement(movement, userId, userName);
  },

  // Alertas de Liquidez
  checkAndGenerateLiquidityAlerts: (reserve: MarginReserve): void => {
    const existingAlerts = getItem<LiquidityAlert[]>(STORAGE_KEYS.LIQUIDITY_ALERTS, [])
      .filter(a => a.aircraftId === reserve.aircraftId && a.ativo);
    
    // Desativar alertas antigos
    existingAlerts.forEach(alert => {
      alert.ativo = false;
      alert.resolvidoEm = new Date().toISOString();
    });
    
    // Criar novo alerta se necessário
    if (reserve.status === 'risco_liquidez') {
      const alert: LiquidityAlert = {
        id: generateId(),
        aircraftId: reserve.aircraftId,
        tipo: reserve.excedente < -50000 ? 'reserva_critica' : 'reserva_baixa',
        severity: reserve.excedente < -50000 ? 'critical' : 'warning',
        titulo: reserve.excedente < -50000 ? 'RISCO CRÍTICO DE LIQUIDEZ' : 'Reserva de Margem Baixa',
        mensagem: `Reserva atual: R$ ${reserve.saldoAtual.toLocaleString('pt-BR')} | Mínimo: R$ ${reserve.valorMinimoObrigatorio.toLocaleString('pt-BR')} | Déficit: R$ ${Math.abs(reserve.excedente).toLocaleString('pt-BR')}`,
        valorAtual: reserve.saldoAtual,
        valorMinimo: reserve.valorMinimoObrigatorio,
        deficit: Math.abs(reserve.excedente),
        ativo: true,
        createdAt: new Date().toISOString(),
      };
      existingAlerts.push(alert);
      
      // Também criar alerta no sistema geral
      storage.saveAlert({
        id: generateId(),
        tipo: 'financeiro',
        severity: alert.severity,
        titulo: alert.titulo,
        mensagem: alert.mensagem,
        aircraftId: reserve.aircraftId,
        entityId: reserve.id,
        entityType: 'margin_reserve',
        lido: false,
        dispensado: false,
        createdAt: new Date().toISOString(),
      });
    }
    
    setItem(STORAGE_KEYS.LIQUIDITY_ALERTS, existingAlerts);
  },

  getLiquidityAlerts: (aircraftId?: string): LiquidityAlert[] => {
    let alerts = getItem<LiquidityAlert[]>(STORAGE_KEYS.LIQUIDITY_ALERTS, []);
    if (aircraftId) alerts = alerts.filter(a => a.aircraftId === aircraftId);
    return alerts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  // Relatório de Liquidez
  getLiquidityReport: (aircraftId: string): {
    reserve: MarginReserve | undefined;
    movements: MarginReserveMovement[];
    saldoMedio: number;
    diasAbaixoMinimo: number;
    ultimoAporte?: MarginReserveMovement;
    ultimoUsoEmergencial?: MarginReserveMovement;
  } => {
    const reserve = storage.getMarginReserve(aircraftId);
    const movements = storage.getMarginReserveMovements(undefined, aircraftId);
    
    // Calcular saldo médio dos últimos 30 dias
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentMovements = movements.filter(m => new Date(m.data) >= thirtyDaysAgo);
    let saldoMedio = reserve?.saldoAtual || 0;
    if (recentMovements.length > 0) {
      saldoMedio = recentMovements.reduce((sum, m) => sum + m.saldoApos, 0) / recentMovements.length;
    }
    
    // Contar dias abaixo do mínimo (simplificado)
    const diasAbaixoMinimo = movements.filter(m => {
      const minimo = reserve?.valorMinimoObrigatorio || 200000;
      return m.saldoApos < minimo && new Date(m.data) >= thirtyDaysAgo;
    }).length;
    
    // Último aporte e uso emergencial
    const ultimoAporte = movements.find(m => m.tipo === 'aporte');
    const ultimoUsoEmergencial = movements.find(m => m.tipo === 'uso_emergencial');
    
    return {
      reserve,
      movements,
      saldoMedio,
      diasAbaixoMinimo,
      ultimoAporte,
      ultimoUsoEmergencial,
    };
  },

  // ==========================================
  // APLICAÇÕES FINANCEIRAS
  // ==========================================

  getFinancialApplications: (aircraftId?: string, reserveId?: string): FinancialApplication[] => {
    let applications = getItem<FinancialApplication[]>(STORAGE_KEYS.FINANCIAL_APPLICATIONS, []);
    if (aircraftId) applications = applications.filter(a => a.aircraftId === aircraftId);
    if (reserveId) applications = applications.filter(a => a.reserveId === reserveId);
    return applications.sort((a, b) => new Date(b.dataAplicacao).getTime() - new Date(a.dataAplicacao).getTime());
  },

  saveFinancialApplication: (application: FinancialApplication, userId: string, userName: string): FinancialApplication => {
    const applications = getItem<FinancialApplication[]>(STORAGE_KEYS.FINANCIAL_APPLICATIONS, []);
    const existing = applications.find(a => a.id === application.id);
    
    if (existing) {
      const changes = getChanges(existing, application);
      const index = applications.findIndex(a => a.id === application.id);
      applications[index] = { ...application, updatedAt: new Date().toISOString() };
      createAuditLog(userId, userName, 'update', 'financial_application', application.id, changes);
    } else {
      application.id = application.id || generateId();
      application.createdAt = new Date().toISOString();
      application.updatedAt = new Date().toISOString();
      application.createdBy = userId;
      applications.push(application);
      createAuditLog(userId, userName, 'create', 'financial_application', application.id, []);
    }
    
    setItem(STORAGE_KEYS.FINANCIAL_APPLICATIONS, applications);
    return application;
  },

  deleteFinancialApplication: (id: string, userId: string, userName: string): void => {
    const applications = getItem<FinancialApplication[]>(STORAGE_KEYS.FINANCIAL_APPLICATIONS, []);
    const updatedApplications = applications.filter(a => a.id !== id);
    setItem(STORAGE_KEYS.FINANCIAL_APPLICATIONS, updatedApplications);
    createAuditLog(userId, userName, 'delete', 'financial_application', id, []);
  },

  calculateApplicationYield: (application: FinancialApplication, dataBase?: string): {
    diasDecorridos: number;
    rendimentoBruto: number;
    rendimentoLiquido: number;
    valorAtual: number;
    rendimentoPercentual: number;
  } => {
    const dataBaseCalculo = dataBase ? new Date(dataBase) : new Date();
    const dataAplicacao = new Date(application.dataAplicacao);
    const diasDecorridos = Math.max(0, Math.floor((dataBaseCalculo.getTime() - dataAplicacao.getTime()) / (1000 * 60 * 60 * 24)));
    
    // Calcular rendimento: valor * (taxa/100) * (dias/365)
    const taxaDecimal = application.taxaRendimento / 100;
    const rendimentoBruto = application.valorAplicado * taxaDecimal * (diasDecorridos / 365);
    
    // Considerar imposto de renda (15% para até 180 dias, 17.5% para até 360, 20% para mais de 360)
    let aliquotaIR = 0.20; // Padrão 20%
    if (diasDecorridos <= 180) aliquotaIR = 0.15;
    else if (diasDecorridos <= 360) aliquotaIR = 0.175;
    
    const impostoRenda = rendimentoBruto * aliquotaIR;
    const rendimentoLiquido = rendimentoBruto - impostoRenda;
    const valorAtual = application.valorAplicado + rendimentoLiquido;
    const rendimentoPercentual = (rendimentoLiquido / application.valorAplicado) * 100;
    
    return {
      diasDecorridos,
      rendimentoBruto,
      rendimentoLiquido,
      valorAtual,
      rendimentoPercentual,
    };
  },

  getTotalApplicationYield: (aircraftId: string): {
    totalAplicado: number;
    totalRendimento: number;
    valorAtual: number;
    aplicacoes: FinancialApplication[];
  } => {
    const applications = storage.getFinancialApplications(aircraftId).filter(a => a.ativa);
    let totalAplicado = 0;
    let totalRendimento = 0;
    
    applications.forEach(app => {
      totalAplicado += app.valorAplicado;
      const yieldData = storage.calculateApplicationYield(app);
      totalRendimento += yieldData.rendimentoLiquido;
    });
    
    return {
      totalAplicado,
      totalRendimento,
      valorAtual: totalAplicado + totalRendimento,
      aplicacoes: applications,
    };
  },

  // ==========================================
  // APLICAÇÕES DO CAIXA
  // ==========================================

  getCashInvestments: (aircraftId?: string, status?: CashInvestment['status']): CashInvestment[] => {
    let investments = getItem<CashInvestment[]>(STORAGE_KEYS.CASH_INVESTMENTS, []);
    if (aircraftId) investments = investments.filter(i => i.aircraftId === aircraftId);
    if (status) investments = investments.filter(i => i.status === status);
    return investments.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  },

  saveCashInvestment: (investment: CashInvestment, userId: string, userName: string): CashInvestment => {
    const investments = getItem<CashInvestment[]>(STORAGE_KEYS.CASH_INVESTMENTS, []);
    const existing = investments.find(i => i.id === investment.id);
    
    // Calcular valor final estimado (será recalculado na UI se necessário)
    // Por enquanto, usar o valor já calculado se existir, senão calcular depois
    if (!investment.estimatedFinalValue || investment.estimatedFinalValue === 0) {
      // Estimativa simples: VP * (1 + taxa_aproximada)
      investment.estimatedFinalValue = investment.principal * 1.1; // Placeholder, será recalculado na UI
    }
    
    if (existing) {
      const changes = getChanges(existing, investment);
      const index = investments.findIndex(i => i.id === investment.id);
      investment.updatedAt = new Date().toISOString();
      investments[index] = investment;
      createAuditLog(userId, userName, 'update', 'cash_investment', investment.id, changes);
    } else {
      investment.id = investment.id || generateId();
      investment.createdAt = new Date().toISOString();
      investment.updatedAt = new Date().toISOString();
      investment.userId = userId;
      investments.push(investment);
      createAuditLog(userId, userName, 'create', 'cash_investment', investment.id, []);
      
      // Se não for simulação, criar movimentações contábeis
      if (!investment.isSimulation && investment.cashAccountId) {
        // Criar despesa (saída do caixa)
        const expense: Expense = {
          id: generateId(),
          aircraftId: investment.aircraftId,
          categoria: 'outros',
          tipo: 'variavel',
          descricao: `Aplicação Financeira - ${investment.investmentType}`,
          valor: investment.principal,
          moeda: 'BRL',
          data: investment.startDate,
          contaBancariaId: investment.cashAccountId,
          rateioAutomatico: false,
          observacoes: `Aplicação ID: ${investment.id}`,
          createdAt: new Date().toISOString(),
          createdBy: userId,
        };
        storage.saveExpense(expense, userId, userName);
      }
    }
    
    setItem(STORAGE_KEYS.CASH_INVESTMENTS, investments);
    return investment;
  },

  redeemCashInvestment: (investmentId: string, realizedValue: number, userId: string, userName: string): CashInvestment => {
    const investments = getItem<CashInvestment[]>(STORAGE_KEYS.CASH_INVESTMENTS, []);
    const investment = investments.find(i => i.id === investmentId);
    
    if (!investment) throw new Error('Aplicação não encontrada');
    if (investment.status !== 'ACTIVE') throw new Error('Aplicação não está ativa');
    
    investment.status = 'REDEEMED';
    investment.realizedFinalValue = realizedValue;
    investment.redeemedAt = new Date().toISOString();
    investment.redeemedBy = userId;
    investment.updatedAt = new Date().toISOString();
    
    const index = investments.findIndex(i => i.id === investmentId);
    investments[index] = investment;
    setItem(STORAGE_KEYS.CASH_INVESTMENTS, investments);
    
    // Se não for simulação, criar receita (entrada no caixa)
    if (!investment.isSimulation && investment.cashAccountId) {
      const revenue: Revenue = {
        id: generateId(),
        aircraftId: investment.aircraftId,
        categoria: 'aplicacao_financeira',
        descricao: `Resgate de Aplicação - ${investment.investmentType}`,
        valor: realizedValue,
        moeda: 'BRL',
        data: new Date().toISOString().split('T')[0],
        contaBancariaId: investment.cashAccountId,
        rateioAutomatico: false,
        observacoes: `Resgate da aplicação ID: ${investment.id}. VP: ${investment.principal}, VF: ${realizedValue}`,
        createdAt: new Date().toISOString(),
        createdBy: userId,
      };
      storage.saveRevenue(revenue, userId, userName);
    }
    
    createAuditLog(userId, userName, 'update', 'cash_investment', investmentId, [
      { field: 'status', oldValue: 'ACTIVE', newValue: 'REDEEMED' },
      { field: 'realizedFinalValue', oldValue: undefined, newValue: realizedValue },
    ]);
    
    return investment;
  },

  deleteCashInvestment: (id: string, userId: string, userName: string): void => {
    const investments = getItem<CashInvestment[]>(STORAGE_KEYS.CASH_INVESTMENTS, []);
    const updatedInvestments = investments.filter(i => i.id !== id);
    setItem(STORAGE_KEYS.CASH_INVESTMENTS, updatedInvestments);
    createAuditLog(userId, userName, 'delete', 'cash_investment', id, []);
  },

  getAvailableCash: (aircraftId: string, accountId?: string): number => {
    // Calcular caixa disponível: saldo das contas bancárias
    const accounts = storage.getBankAccounts(aircraftId);
    if (accountId) {
      const account = accounts.find(a => a.id === accountId);
      return account ? account.saldoAtual : 0;
    }
    return accounts.reduce((sum, a) => sum + a.saldoAtual, 0);
  },

  // ==========================================
  // ATIVOS PATRIMONIAIS DA AERONAVE
  // ==========================================
  
  getAircraftAssets: (aircraftId?: string): AircraftAsset[] => {
    const assets = getItem<AircraftAsset[]>(STORAGE_KEYS.AIRCRAFT_ASSETS, []);
    return aircraftId ? assets.filter(a => a.aircraftId === aircraftId) : assets;
  },

  getAircraftAssetById: (id: string): AircraftAsset | undefined => {
    return getItem<AircraftAsset[]>(STORAGE_KEYS.AIRCRAFT_ASSETS, []).find(a => a.id === id);
  },

  calculateAssetPercentual: (asset: AircraftAsset): AircraftAsset => {
    if (asset.valorEstimadoTotal > 0) {
      asset.percentualExecucao = (asset.valorInvestidoAtual / asset.valorEstimadoTotal) * 100;
    }
    return asset;
  },

  saveAircraftAsset: (asset: AircraftAsset, userId: string, userName: string): AircraftAsset => {
    const assets = getItem<AircraftAsset[]>(STORAGE_KEYS.AIRCRAFT_ASSETS, []);
    const existing = assets.find(a => a.id === asset.id);
    
    // Calcular percentual de execução
    const calculatedAsset = storage.calculateAssetPercentual(asset);
    
    if (existing) {
      const changes = getChanges(existing, calculatedAsset);
      const index = assets.findIndex(a => a.id === calculatedAsset.id);
      calculatedAsset.updatedAt = new Date().toISOString();
      assets[index] = calculatedAsset;
      createAuditLog(userId, userName, 'update', 'aircraft_asset', calculatedAsset.id, changes);
    } else {
      calculatedAsset.id = calculatedAsset.id || generateId();
      calculatedAsset.createdAt = new Date().toISOString();
      calculatedAsset.createdBy = userId;
      calculatedAsset.updatedAt = calculatedAsset.createdAt;
      calculatedAsset.valorInvestidoAtual = 0;
      calculatedAsset.percentualExecucao = 0;
      calculatedAsset.participacaoSocios = calculatedAsset.participacaoSocios || [];
      assets.push(calculatedAsset);
      createAuditLog(userId, userName, 'create', 'aircraft_asset', calculatedAsset.id, []);
    }
    
    setItem(STORAGE_KEYS.AIRCRAFT_ASSETS, assets);
    return calculatedAsset;
  },

  deleteAircraftAsset: (id: string, userId: string, userName: string): void => {
    const assets = getItem<AircraftAsset[]>(STORAGE_KEYS.AIRCRAFT_ASSETS, []).filter(a => a.id !== id);
    setItem(STORAGE_KEYS.AIRCRAFT_ASSETS, assets);
    createAuditLog(userId, userName, 'delete', 'aircraft_asset', id, []);
  },

  // Investimentos (CAPEX) em Ativos
  getAssetInvestments: (assetId?: string, aircraftId?: string): AssetInvestment[] => {
    let investments = getItem<AssetInvestment[]>(STORAGE_KEYS.ASSET_INVESTMENTS, []);
    if (assetId) investments = investments.filter(i => i.assetId === assetId);
    if (aircraftId) investments = investments.filter(i => i.aircraftId === aircraftId);
    return investments.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  },

  saveAssetInvestment: (
    investment: AssetInvestment, 
    userId: string, 
    userName: string
  ): { investment: AssetInvestment; asset: AircraftAsset } => {
    const investments = getItem<AssetInvestment[]>(STORAGE_KEYS.ASSET_INVESTMENTS, []);
    
    investment.id = investment.id || generateId();
    investment.createdAt = new Date().toISOString();
    investment.createdBy = userId;
    investments.push(investment);
    setItem(STORAGE_KEYS.ASSET_INVESTMENTS, investments);
    
    // Atualizar valor do ativo
    const asset = storage.getAircraftAssetById(investment.assetId);
    if (!asset) {
      throw new Error('Ativo não encontrado');
    }
    
    asset.valorInvestidoAtual += investment.valor;
    
    // Atualizar participação dos sócios
    if (investment.rateioPorSocio && investment.rateioPorSocio.length > 0) {
      investment.rateioPorSocio.forEach(rateio => {
        const socioIndex = asset.participacaoSocios.findIndex(p => p.socioId === rateio.socioId);
        if (socioIndex >= 0) {
          asset.participacaoSocios[socioIndex].valorInvestido += rateio.valor;
        } else {
          const socio = storage.getUserById(rateio.socioId);
          asset.participacaoSocios.push({
            socioId: rateio.socioId,
            socioNome: socio?.nome || 'Desconhecido',
            percentual: rateio.percentual,
            valorInvestido: rateio.valor,
          });
        }
      });
      
      // Recalcular percentuais
      const totalInvestido = asset.participacaoSocios.reduce((sum, p) => sum + p.valorInvestido, 0);
      asset.participacaoSocios.forEach(p => {
        p.percentual = (p.valorInvestido / totalInvestido) * 100;
      });
    }
    
    const updatedAsset = storage.saveAircraftAsset(asset, userId, userName);
    
    createAuditLog(userId, userName, 'create', 'asset_investment', investment.id, [], {
      assetId: asset.id,
      assetName: asset.nome,
      valor: investment.valor,
    });
    
    return { investment, asset: updatedAsset };
  },

  deleteAssetInvestment: (id: string, userId: string, userName: string): void => {
    const investment = getItem<AssetInvestment[]>(STORAGE_KEYS.ASSET_INVESTMENTS, [])
      .find(i => i.id === id);
    
    if (investment) {
      // Subtrair valor do ativo
      const asset = storage.getAircraftAssetById(investment.assetId);
      if (asset) {
        asset.valorInvestidoAtual -= investment.valor;
        
        // Atualizar participação dos sócios
        if (investment.rateioPorSocio) {
          investment.rateioPorSocio.forEach(rateio => {
            const socioIndex = asset.participacaoSocios.findIndex(p => p.socioId === rateio.socioId);
            if (socioIndex >= 0) {
              asset.participacaoSocios[socioIndex].valorInvestido -= rateio.valor;
            }
          });
        }
        
        storage.saveAircraftAsset(asset, userId, userName);
      }
    }
    
    const investments = getItem<AssetInvestment[]>(STORAGE_KEYS.ASSET_INVESTMENTS, [])
      .filter(i => i.id !== id);
    setItem(STORAGE_KEYS.ASSET_INVESTMENTS, investments);
    createAuditLog(userId, userName, 'delete', 'asset_investment', id, []);
  },

  // ==========================================
  // DASHBOARD FINANCEIRO EXPANDIDO
  // ==========================================
  
  getFinancialDashboard: (aircraftId: string): FinancialDashboard => {
    // Caixa operacional (receitas, despesas e pagamentos)
    const expenses = storage.getExpenses(aircraftId);
    const revenues = storage.getRevenues(aircraftId);
    const payments = storage.getPayments(undefined, aircraftId);
    
    const totalDespesas = expenses.reduce((sum, e) => sum + e.valor, 0);
    const totalReceitas = revenues.reduce((sum, r) => sum + r.valor, 0);
    const totalRecebido = payments.filter(p => p.status === 'pago').reduce((sum, p) => sum + p.valor, 0);
    const caixaOperacional = totalReceitas + totalRecebido - totalDespesas;
    
    // Reserva de margem
    const reserve = storage.getMarginReserve(aircraftId);
    const reservaMargem = {
      saldo: reserve?.saldoAtual || 0,
      minimo: reserve?.valorMinimoObrigatorio || 200000,
      excedente: reserve?.excedente || 0,
      status: reserve?.status || 'risco_liquidez' as FinancialRiskStatus,
    };
    
    // Patrimônio em ativos
    const assets = storage.getAircraftAssets(aircraftId);
    const patrimonioAtivos = {
      valorTotal: assets.reduce((sum, a) => sum + a.valorInvestidoAtual, 0),
      emConstrucao: assets.filter(a => a.status === 'em_construcao').reduce((sum, a) => sum + a.valorInvestidoAtual, 0),
      concluido: assets.filter(a => a.status === 'concluido').reduce((sum, a) => sum + a.valorInvestidoAtual, 0),
    };
    
    // Caixa total (operacional + reserva)
    const caixaTotal = caixaOperacional + reservaMargem.saldo;
    
    // Calcular despesa média mensal para liquidez
    const despesasUltimosMeses = expenses.filter(e => {
      const dataExpense = new Date(e.data);
      const tresMesesAtras = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      return dataExpense >= tresMesesAtras;
    });
    const despesaMediaMensal = despesasUltimosMeses.length > 0 
      ? despesasUltimosMeses.reduce((sum, e) => sum + e.valor, 0) / 3 
      : 0;
    
    // Indicadores
    const indicadores = {
      liquidezImediata: despesaMediaMensal > 0 ? caixaOperacional / despesaMediaMensal : 0,
      coberturaMargem: reservaMargem.minimo > 0 ? (reservaMargem.saldo / reservaMargem.minimo) * 100 : 0,
      patrimonioTotal: caixaTotal + patrimonioAtivos.valorTotal,
    };
    
    return {
      caixaTotal,
      caixaOperacional,
      reservaMargem,
      patrimonioAtivos,
      indicadores,
    };
  },

  // Relatório de patrimônio por sócio
  getPatrimonyBySocio: (aircraftId: string): {
    socioId: string;
    socioNome: string;
    valorAeronave: number;
    valorAtivos: number;
    valorTotal: number;
    percentualTotal: number;
  }[] => {
    const memberships = storage.getMemberships(aircraftId).filter(m => m.status === 'ativo');
    const users = storage.getUsers();
    const assets = storage.getAircraftAssets(aircraftId);
    const aircraft = storage.getAircraftById(aircraftId);
    
    // Valor base da aeronave (se cadastrado no custo hora)
    const valorBaseAeronave = aircraft?.custoHora ? aircraft.custoHora * 500 : 0; // Estimativa simplificada
    
    const resultado = memberships.map(membership => {
      const user = users.find(u => u.id === membership.userId);
      const cotaPercentual = membership.cotaPercentual || (100 / memberships.length);
      
      // Valor da aeronave proporcional à cota
      const valorAeronave = valorBaseAeronave * (cotaPercentual / 100);
      
      // Valor em ativos
      const valorAtivos = assets.reduce((sum, asset) => {
        const participacao = asset.participacaoSocios.find(p => p.socioId === membership.userId);
        return sum + (participacao?.valorInvestido || 0);
      }, 0);
      
      const valorTotal = valorAeronave + valorAtivos;
      const patrimonioTotalGeral = valorBaseAeronave + assets.reduce((sum, a) => sum + a.valorInvestidoAtual, 0);
      
      return {
        socioId: membership.userId,
        socioNome: user?.nome || 'Desconhecido',
        valorAeronave,
        valorAtivos,
        valorTotal,
        percentualTotal: patrimonioTotalGeral > 0 ? (valorTotal / patrimonioTotalGeral) * 100 : 0,
      };
    });
    
    return resultado.sort((a, b) => b.valorTotal - a.valorTotal);
  },

  // ==========================================
  // CONFIGURAÇÕES
  // ==========================================
  
  getConfig: (): SystemConfig => {
    return getItem<SystemConfig>(STORAGE_KEYS.CONFIG, {
      alertaManutencaoDias: 15,
      alertaManutencaoHoras: 10,
      alertaDocumentoDias: 30,
      alertaPagamentoDias: 5,
      reservaCombustivelMinutos: 45,
      margemSegurancaPercentual: 10,
      moedaPadrao: 'BRL',
      formatoData: 'dd/MM/yyyy',
      formatoHora: 'HH:mm',
      tboValorPorHora: 2800, // R$ 2.800,00 por hora
      fatorConversaoLbsLitros: 0.567, // AVGAS (545 lbs = 309 L)
      reservaMargemMinima: 200000, // R$ 200.000,00 - Reserva de Margem Obrigatória
      alertaReservaPercentual: 110, // Alerta se < 110% do mínimo
    });
  },

  saveConfig: (config: SystemConfig): void => {
    setItem(STORAGE_KEYS.CONFIG, config);
  },

  // ==========================================
  // AUTENTICAÇÃO (simulada)
  // ==========================================
  
  getCurrentUser: (): User | null => {
    return getItem<User | null>(STORAGE_KEYS.CURRENT_USER, null);
  },

  setCurrentUser: (user: User | null): void => {
    setItem(STORAGE_KEYS.CURRENT_USER, user);
  },

  login: (email: string): User | null => {
    const user = storage.getUserByEmail(email);
    if (user && user.active) {
      storage.setCurrentUser(user);
      return user;
    }
    return null;
  },

  logout: (): void => {
    storage.setCurrentUser(null);
  },

  // ==========================================
  // INICIALIZAÇÃO BÁSICA (SEM DADOS DE EXEMPLO)
  // ==========================================
  
  initializeBasicAdmin: (): void => {
    // Verificar se já existe usuário admin
    const users = storage.getUsers();
    if (users.length > 0) return;
    
    // Criar usuário admin básico
    const admin: User = {
      id: generateId(),
      email: 'admin@aerogestao.com',
      nome: 'Administrador',
      telefone: '',
      role: 'admin',
      horasTotais: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      active: true,
    };
    
    storage.saveUser(admin, 'system', 'Sistema');
    
    // Criar aeronave padrão para o dashboard funcionar imediatamente
    const defaultAircraft: Aircraft = {
      id: generateId(),
      prefixo: 'PP-XXX',
      modelo: 'Aeronave Exemplo',
      fabricante: 'A definir',
      anoFabricacao: new Date().getFullYear(),
      numeroSerie: '000000',
      tipo: 'pistao',
      horasCelula: 0,
      horasMotor: 0,
      ciclosTotais: 0,
      tipoCombustivel: 'avgas',
      unidadeCombustivel: 'litros',
      consumoMedio: 40,
      velocidadeCruzeiro: 120,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      active: true,
    };
    
    storage.saveAircraft(defaultAircraft, 'system', 'Sistema');
  },
  
  // Função para limpar todos os dados e reinicializar
  resetAllData: (): void => {
    // Limpar todos os dados do localStorage
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  },

  // ==========================================
  // INICIALIZAÇÃO COM DADOS DE EXEMPLO
  // ==========================================
  
  initializeWithSampleData: (): void => {
    // Verificar se já existe dados
    if (storage.getUsers().length > 0) return;
    
    // Dados reais de voos
    const realFlightEntries = getRealFlightData();
    
    // Criar usuário admin
    const admin: User = {
      id: generateId(),
      email: 'admin@aerogestao.com',
      nome: 'Administrador',
      telefone: '(11) 99999-9999',
      role: 'admin',
      horasTotais: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      active: true,
    };
    storage.saveUser(admin);
    
    // Criar sócio Grossi
    const grossi: User = {
      id: generateId(),
      email: 'grossi@aerogestao.com',
      nome: 'Grossi',
      telefone: '(34) 99999-0001',
      role: 'cotista',
      horasTotais: 8.5,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      active: true,
    };
    storage.saveUser(grossi);
    
    // Criar sócio Shimada
    const shimada: User = {
      id: generateId(),
      email: 'shimada@aerogestao.com',
      nome: 'Shimada',
      telefone: '(34) 99999-0002',
      role: 'cotista',
      horasTotais: 0.65,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      active: true,
    };
    storage.saveUser(shimada);
    
    // Criar aeronave PT-GSS (King Air C90)
    const aircraft: Aircraft = {
      id: generateId(),
      prefixo: 'PT-GSS',
      modelo: 'King Air C90GTi',
      fabricante: 'Beechcraft',
      numeroSerie: 'LJ-2145',
      anoFabricacao: 2018,
      tipo: 'turbohelice',
      baseHangar: 'SDCO', // Sorocaba
      consumoMedio: 340, // lbs/h (convertido para litros ~190 L/h)
      velocidadeCruzeiro: 260,
      tipoCombustivel: 'jet-a',
      unidadeCombustivel: 'litros',
      horasCelula: 1250,
      ciclosTotais: 2100,
      custoHora: 2800,
      reservaCombustivel: 45,
      margemSeguranca: 10,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      active: true,
    };
    storage.saveAircraft(aircraft, admin.id, admin.nome);
    
    // Criar motores PT6A-135A
    const motorEsquerdo: AircraftComponent = {
      id: generateId(),
      aircraftId: aircraft.id,
      tipo: 'motor',
      serial: 'PCE-RD0345',
      modelo: 'PT6A-135A',
      fabricante: 'Pratt & Whitney',
      limiteTSO: 3600,
      horasAtuais: 1250,
      dataInstalacao: '2018-01-01',
    };
    storage.saveComponent(motorEsquerdo, admin.id, admin.nome);
    
    const motorDireito: AircraftComponent = {
      id: generateId(),
      aircraftId: aircraft.id,
      tipo: 'motor',
      serial: 'PCE-RD0346',
      modelo: 'PT6A-135A',
      fabricante: 'Pratt & Whitney',
      limiteTSO: 3600,
      horasAtuais: 1250,
      dataInstalacao: '2018-01-01',
    };
    storage.saveComponent(motorDireito, admin.id, admin.nome);
    
    // Criar hélices
    const heliceEsquerda: AircraftComponent = {
      id: generateId(),
      aircraftId: aircraft.id,
      tipo: 'helice',
      serial: 'HC-E4A-3D-2345',
      modelo: 'HC-E4A-3D',
      fabricante: 'Hartzell',
      limiteTSO: 6000,
      horasAtuais: 1250,
      dataInstalacao: '2018-01-01',
    };
    storage.saveComponent(heliceEsquerda, admin.id, admin.nome);
    
    const heliceDireita: AircraftComponent = {
      id: generateId(),
      aircraftId: aircraft.id,
      tipo: 'helice',
      serial: 'HC-E4A-3D-2346',
      modelo: 'HC-E4A-3D',
      fabricante: 'Hartzell',
      limiteTSO: 6000,
      horasAtuais: 1250,
      dataInstalacao: '2018-01-01',
    };
    storage.saveComponent(heliceDireita, admin.id, admin.nome);
    
    // Criar manutenções programadas
    const inspecao100h: MaintenanceSchedule = {
      id: generateId(),
      aircraftId: aircraft.id,
      nome: 'Inspeção 100h',
      descricao: 'Inspeção periódica de 100 horas',
      tipo: 'inspecao',
      trigger: 'horas',
      intervaloHoras: 100,
      proximasHoras: 1300,
      alertaAntesHoras: 10,
      obrigatorio: true,
      ativo: true,
    };
    storage.saveMaintenanceSchedule(inspecao100h, admin.id, admin.nome);
    
    const inspecaoAnual: MaintenanceSchedule = {
      id: generateId(),
      aircraftId: aircraft.id,
      nome: 'Inspeção Anual',
      descricao: 'Inspeção anual de aeronavegabilidade',
      tipo: 'inspecao',
      trigger: 'calendario',
      intervaloDias: 365,
      proximaData: '2025-06-15',
      alertaAntesDias: 30,
      obrigatorio: true,
      ativo: true,
    };
    storage.saveMaintenanceSchedule(inspecaoAnual, admin.id, admin.nome);
    
    // Criar memberships (50% cada sócio)
    const membershipGrossi: Membership = {
      id: generateId(),
      userId: grossi.id,
      aircraftId: aircraft.id,
      tipoParticipacao: 'cotista',
      rateioType: 'hora_voo',
      cotaPercentual: 50,
      status: 'ativo',
      dataInicio: '2024-01-01',
    };
    storage.saveMembership(membershipGrossi, admin.id, admin.nome);
    
    const membershipShimada: Membership = {
      id: generateId(),
      userId: shimada.id,
      aircraftId: aircraft.id,
      tipoParticipacao: 'cotista',
      rateioType: 'hora_voo',
      cotaPercentual: 50,
      status: 'ativo',
      dataInicio: '2024-01-01',
    };
    storage.saveMembership(membershipShimada, admin.id, admin.nome);
    
    // Função auxiliar para converter tempo hh:mm para minutos
    const timeToMinutes = (time: string): number => {
      if (!time || time === '') return 0;
      const parts = time.split(':');
      if (parts.length !== 2) return 0;
      const hours = parseInt(parts[0], 10) || 0;
      const minutes = parseInt(parts[1], 10) || 0;
      return (hours * 60) + minutes;
    };
    
    // Carregar todos os lançamentos de voo reais
    realFlightEntries.forEach((entry: RealFlightEntry) => {
      const flightEntry: FlightEntry = {
        id: generateId(),
        aircraftId: aircraft.id,
        
        voo: entry.voo,
        subVoo: entry.subVoo,
        data: entry.data,
        grupo: entry.grupo,
        origem: entry.origem,
        destino: entry.destino,
        
        tempoAcionamentoCorte: timeToMinutes(entry.tempoAcionamento),
        tempoVoo: timeToMinutes(entry.tempoVoo),
        
        combustivelInicial: entry.combustivelInicial,
        abastecimentoLibras: entry.abastecimentoLibras,
        abastecimentoLitros: entry.abastecimentoLitros,
        localAbastecimento: entry.localAbastecimento,
        combustivelDecolagem: entry.combustivelDecolagem,
        combustivelConsumido: entry.combustivelConsumidoLibras,
        combustivelConsumidoLitros: entry.combustivelConsumidoLitros,
        combustivelFinal: entry.combustivelFinal,
        tipoMedicaoCombustivel: 'estimado',
        
        valorCombustivel: entry.valorCombustivel,
        hangar: entry.hangar,
        alimentacao: entry.alimentacao,
        hospedagem: entry.hospedagem,
        limpeza: entry.limpeza,
        uberTaxi: entry.uberTaxi,
        tarifas: entry.tarifas,
        outras: entry.outras,
        
        provisaoTboGrossi: entry.provisaoTBOGrossi,
        provisaoTboShimada: entry.provisaoTBOShimada,
        
        observacoes: entry.observacoes,
        
        total: entry.valorCombustivel + entry.hangar + entry.alimentacao + 
               entry.hospedagem + entry.limpeza + entry.uberTaxi + 
               entry.tarifas + entry.outras + entry.provisaoTBOGrossi + entry.provisaoTBOShimada,
        
        status: 'conferido',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: admin.id,
      };
      
      const entries = getItem<FlightEntry[]>(STORAGE_KEYS.FLIGHT_ENTRIES, []);
      entries.push(flightEntry);
      setItem(STORAGE_KEYS.FLIGHT_ENTRIES, entries);
    });
    
    // Criar documentos
    const docAeronavegabilidade: Document = {
      id: generateId(),
      aircraftId: aircraft.id,
      tipo: 'aeronavegabilidade',
      nome: 'Certificado de Aeronavegabilidade',
      descricao: 'CA válido',
      dataEmissao: '2024-01-15',
      dataValidade: '2025-01-15',
      observacoes: 'Renovar junto com inspeção anual',
      createdAt: new Date().toISOString(),
      createdBy: admin.id,
    };
    storage.saveDocument(docAeronavegabilidade, admin.id, admin.nome);
    
    const docSeguro: Document = {
      id: generateId(),
      aircraftId: aircraft.id,
      tipo: 'seguro',
      nome: 'Apólice de Seguro Aeronáutico',
      descricao: 'Cobertura completa - Porto Seguro',
      dataEmissao: '2024-06-01',
      dataValidade: '2025-06-01',
      observacoes: 'Valor segurado: R$ 3.500.000,00',
      createdAt: new Date().toISOString(),
      createdBy: admin.id,
    };
    storage.saveDocument(docSeguro, admin.id, admin.nome);
    
    // Criar Reserva de Margem
    const marginReserve: MarginReserve = {
      id: generateId(),
      aircraftId: aircraft.id,
      valorMinimoObrigatorio: 200000,
      saldoAtual: 180000, // Abaixo do mínimo para mostrar alerta
      status: 'atencao',
      excedente: -20000, // 180000 - 200000
      percentualPreenchimento: 90, // (180000 / 200000) * 100
      diasAbaixoMinimo: 0,
      saldoMedio30Dias: 180000,
      ultimaAtualizacao: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setItem(STORAGE_KEYS.MARGIN_RESERVES, [marginReserve]);
    
    // Criar Ativo - Hangar em Construção
    const hangarAsset: AircraftAsset = {
      id: generateId(),
      aircraftId: aircraft.id,
      nome: 'Hangar Próprio - Base Patos de Minas',
      tipo: 'imobilizado',
      status: 'em_construcao',
      descricao: 'Construção do hangar próprio na base de Patos de Minas. Previsão de conclusão: Junho/2025.',
      dataInicioObra: '2024-03-01',
      valorEstimadoTotal: 800000,
      valorInvestidoAtual: 450000,
      percentualExecucao: 56.25, // (450000 / 800000) * 100
      participacaoSocios: [],
      createdAt: new Date().toISOString(),
      createdBy: admin.id,
      updatedAt: new Date().toISOString(),
    };
    setItem(STORAGE_KEYS.AIRCRAFT_ASSETS, [hangarAsset]);
    
    // Salvar aeroportos padrão + aeroportos usados nos voos
    const airports = getDefaultAirports();
    // Adicionar aeroportos específicos dos voos reais
    airports.push(
      { icao: 'SNPD', nome: 'Patos de Minas', cidade: 'Patos de Minas', pais: 'Brasil', latitude: -18.6728, longitude: -46.4917, elevacao: 2815, taxaPouso: 50 },
      { icao: 'SNPT', nome: 'Patrocínio', cidade: 'Patrocínio', pais: 'Brasil', latitude: -18.9439, longitude: -46.9869, elevacao: 3051, taxaPouso: 40 },
      { icao: 'SBAX', nome: 'Araxá', cidade: 'Araxá', pais: 'Brasil', latitude: -19.5631, longitude: -46.9639, elevacao: 3274, taxaPouso: 80 },
      { icao: 'SBGO', iata: 'GYN', nome: 'Santa Genoveva', cidade: 'Goiânia', pais: 'Brasil', latitude: -16.6319, longitude: -49.2206, elevacao: 2450, taxaPouso: 120 },
      { icao: 'SBMK', iata: 'MOC', nome: 'Montes Claros', cidade: 'Montes Claros', pais: 'Brasil', latitude: -16.7069, longitude: -43.8189, elevacao: 2191, taxaPouso: 100 },
    );
    setItem(STORAGE_KEYS.AIRPORTS, airports);
  },
};

// ============================================
// DADOS REAIS DE VOOS (Para apresentação)
// ============================================

interface RealFlightEntry {
  voo: string;
  subVoo: string;
  data: string;
  grupo: 'grossi' | 'shimada' | 'grossi_shimada';
  origem: string;
  destino: string;
  tempoAcionamento: string;
  tempoVoo: string;
  combustivelInicial: number;
  abastecimentoLibras: number;
  abastecimentoLitros: number;
  localAbastecimento: string;
  combustivelDecolagem: number;
  combustivelConsumidoLibras: number;
  combustivelConsumidoLitros: number;
  combustivelFinal: number;
  valorCombustivel: number;
  hangar: number;
  alimentacao: number;
  hospedagem: number;
  limpeza: number;
  uberTaxi: number;
  tarifas: number;
  outras: number;
  provisaoTBOGrossi: number;
  provisaoTBOShimada: number;
  observacoes: string;
}

function getRealFlightData(): RealFlightEntry[] {
  return [
    // Abastecimentos iniciais (sem voo)
    {
      voo: '',
      subVoo: '',
      data: '2024-09-12',
      grupo: 'grossi',
      origem: 'Sorocaba',
      destino: 'Sorocaba',
      tempoAcionamento: '',
      tempoVoo: '',
      combustivelInicial: 424,
      abastecimentoLibras: 919,
      abastecimentoLitros: 522,
      localAbastecimento: 'Sorocaba',
      combustivelDecolagem: 1343,
      combustivelConsumidoLibras: 0,
      combustivelConsumidoLitros: 0,
      combustivelFinal: 1343,
      valorCombustivel: 4212.54,
      hangar: 0,
      alimentacao: 0,
      hospedagem: 0,
      limpeza: 0,
      uberTaxi: 0,
      tarifas: 0,
      outras: 0,
      provisaoTBOGrossi: 0,
      provisaoTBOShimada: 0,
      observacoes: 'Abastecimento em Sorocaba 522 lt x 8,07 = R$ 4.212,54 conf. NF 14424 de Petrojet',
    },
    {
      voo: '',
      subVoo: '',
      data: '2024-09-30',
      grupo: 'grossi',
      origem: 'Sorocaba',
      destino: 'Sorocaba',
      tempoAcionamento: '',
      tempoVoo: '',
      combustivelInicial: 1343,
      abastecimentoLibras: 1227,
      abastecimentoLitros: 697,
      localAbastecimento: 'Sorocaba',
      combustivelDecolagem: 2570,
      combustivelConsumidoLibras: 0,
      combustivelConsumidoLitros: 0,
      combustivelFinal: 2570,
      valorCombustivel: 5359.93,
      hangar: 0,
      alimentacao: 0,
      hospedagem: 0,
      limpeza: 0,
      uberTaxi: 0,
      tarifas: 0,
      outras: 0,
      provisaoTBOGrossi: 0,
      provisaoTBOShimada: 0,
      observacoes: 'Abastecimento em Sorocaba 697 lt x 7,69 = R$ 5.359,93 conf. NF 14571 de Petrojet',
    },
    // GSS0001 - Sorocaba → Patrocínio
    {
      voo: 'GSS0001',
      subVoo: 'GSS-0001',
      data: '2024-09-26',
      grupo: 'grossi',
      origem: 'Sorocaba',
      destino: 'Patrocínio',
      tempoAcionamento: '01:30',
      tempoVoo: '01:15',
      combustivelInicial: 2570,
      abastecimentoLibras: 0,
      abastecimentoLitros: 0,
      localAbastecimento: '',
      combustivelDecolagem: 2570,
      combustivelConsumidoLibras: 600,
      combustivelConsumidoLitros: 340,
      combustivelFinal: 1970,
      valorCombustivel: 0,
      hangar: 0,
      alimentacao: 0,
      hospedagem: 0,
      limpeza: 0,
      uberTaxi: 0,
      tarifas: 696.80,
      outras: 0,
      provisaoTBOGrossi: 3500.00,
      provisaoTBOShimada: 0,
      observacoes: 'Tarifas aeronáuticas conf. Fatura 5374038 da Infraero',
    },
    // GSS0002 - Patrocínio → Patos
    {
      voo: 'GSS0002',
      subVoo: 'GSS-0001',
      data: '2024-09-26',
      grupo: 'grossi',
      origem: 'Patrocínio',
      destino: 'Patos',
      tempoAcionamento: '00:20',
      tempoVoo: '00:10',
      combustivelInicial: 1970,
      abastecimentoLibras: 0,
      abastecimentoLitros: 0,
      localAbastecimento: '',
      combustivelDecolagem: 1970,
      combustivelConsumidoLibras: 170,
      combustivelConsumidoLitros: 96,
      combustivelFinal: 1800,
      valorCombustivel: 0,
      hangar: 0,
      alimentacao: 0,
      hospedagem: 0,
      limpeza: 0,
      uberTaxi: 0,
      tarifas: 0,
      outras: 21.53,
      provisaoTBOGrossi: 466.67,
      provisaoTBOShimada: 0,
      observacoes: 'Taxa DECEA de R$ 21,53 conf. DOC 4837363 de DECEA',
    },
    // GSS0003 - Patos → Patrocínio
    {
      voo: 'GSS0003',
      subVoo: 'GSS-0002',
      data: '2024-10-02',
      grupo: 'grossi',
      origem: 'Patos',
      destino: 'Patrocínio',
      tempoAcionamento: '00:22',
      tempoVoo: '00:10',
      combustivelInicial: 1800,
      abastecimentoLibras: 0,
      abastecimentoLitros: 0,
      localAbastecimento: '',
      combustivelDecolagem: 1800,
      combustivelConsumidoLibras: 150,
      combustivelConsumidoLitros: 85,
      combustivelFinal: 1650,
      valorCombustivel: 0,
      hangar: 0,
      alimentacao: 0,
      hospedagem: 0,
      limpeza: 0,
      uberTaxi: 0,
      tarifas: 0,
      outras: 0,
      provisaoTBOGrossi: 466.67,
      provisaoTBOShimada: 0,
      observacoes: '',
    },
    // GSS0004 - Patrocínio → Montes Claros
    {
      voo: 'GSS0004',
      subVoo: 'GSS-0002',
      data: '2024-10-02',
      grupo: 'grossi',
      origem: 'Patrocínio',
      destino: 'Montes Claros',
      tempoAcionamento: '01:13',
      tempoVoo: '01:01',
      combustivelInicial: 1650,
      abastecimentoLibras: 0,
      abastecimentoLitros: 0,
      localAbastecimento: '',
      combustivelDecolagem: 1650,
      combustivelConsumidoLibras: 700,
      combustivelConsumidoLitros: 397,
      combustivelFinal: 950,
      valorCombustivel: 0,
      hangar: 1239.27,
      alimentacao: 0,
      hospedagem: 0,
      limpeza: 0,
      uberTaxi: 0,
      tarifas: 0,
      outras: 187.47,
      provisaoTBOGrossi: 2846.67,
      provisaoTBOShimada: 0,
      observacoes: 'Taxas do Decea de comunicação, Hangar 1.239,27 parte da NFS 1568 de Bloco de onze aeroportos',
    },
    // GSS0005 - Montes Claros → Patrocínio
    {
      voo: 'GSS0005',
      subVoo: 'GSS-0002',
      data: '2024-10-03',
      grupo: 'grossi',
      origem: 'Montes Claros',
      destino: 'Patrocínio',
      tempoAcionamento: '01:33',
      tempoVoo: '01:17',
      combustivelInicial: 950,
      abastecimentoLibras: 700,
      abastecimentoLitros: 400,
      localAbastecimento: 'Montes Claros',
      combustivelDecolagem: 1650,
      combustivelConsumidoLibras: 850,
      combustivelConsumidoLitros: 482,
      combustivelFinal: 800,
      valorCombustivel: 4100.00,
      hangar: 0,
      alimentacao: 0,
      hospedagem: 0,
      limpeza: 0,
      uberTaxi: 0,
      tarifas: 0,
      outras: 0,
      provisaoTBOGrossi: 3593.33,
      provisaoTBOShimada: 0,
      observacoes: 'Abastecimento em Montes Claros 400 lt x 10,25 - R$ 4.100,00 NF 3488 de Saraiva',
    },
    // GSS0006 - Patrocínio → Patos
    {
      voo: 'GSS0006',
      subVoo: 'GSS-0002',
      data: '2024-10-03',
      grupo: 'grossi',
      origem: 'Patrocínio',
      destino: 'Patos',
      tempoAcionamento: '00:22',
      tempoVoo: '00:12',
      combustivelInicial: 800,
      abastecimentoLibras: 0,
      abastecimentoLitros: 0,
      localAbastecimento: '',
      combustivelDecolagem: 800,
      combustivelConsumidoLibras: 150,
      combustivelConsumidoLitros: 85,
      combustivelFinal: 650,
      valorCombustivel: 0,
      hangar: 0,
      alimentacao: 0,
      hospedagem: 0,
      limpeza: 0,
      uberTaxi: 0,
      tarifas: 0,
      outras: 0,
      provisaoTBOGrossi: 560.00,
      provisaoTBOShimada: 0,
      observacoes: 'Lembrando que o Consumo é estimado, os marcadores de combustível não são 100% confiáveis.',
    },
    // GSS0007 - Patos → Araxá (Grossi e Shimada)
    {
      voo: 'GSS0007',
      subVoo: 'GSS-0003',
      data: '2024-10-08',
      grupo: 'grossi_shimada',
      origem: 'Patos',
      destino: 'Araxá',
      tempoAcionamento: '00:32',
      tempoVoo: '00:20',
      combustivelInicial: 614,
      abastecimentoLibras: 1056,
      abastecimentoLitros: 600,
      localAbastecimento: 'Patos',
      combustivelDecolagem: 1670,
      combustivelConsumidoLibras: 240,
      combustivelConsumidoLitros: 136,
      combustivelFinal: 1430,
      valorCombustivel: 3512.34,
      hangar: 0,
      alimentacao: 0,
      hospedagem: 0,
      limpeza: 0,
      uberTaxi: 0,
      tarifas: 0,
      outras: 209.45,
      provisaoTBOGrossi: 466.67,
      provisaoTBOShimada: 466.67,
      observacoes: 'Taxas do Decea de comunicação, Abastecimentos 600,4 lt x 5,85 = R$ 3.512,34 ACAAP',
    },
    // GSS0008 - Araxá → Patos (Grossi e Shimada)
    {
      voo: 'GSS0008',
      subVoo: 'GSS-0003',
      data: '2024-10-08',
      grupo: 'grossi_shimada',
      origem: 'Araxá',
      destino: 'Patos',
      tempoAcionamento: '00:32',
      tempoVoo: '00:19',
      combustivelInicial: 1430,
      abastecimentoLibras: 0,
      abastecimentoLitros: 0,
      localAbastecimento: '',
      combustivelDecolagem: 1430,
      combustivelConsumidoLibras: 230,
      combustivelConsumidoLitros: 130,
      combustivelFinal: 1200,
      valorCombustivel: 0,
      hangar: 0,
      alimentacao: 0,
      hospedagem: 0,
      limpeza: 0,
      uberTaxi: 0,
      tarifas: 0,
      outras: 341.12,
      provisaoTBOGrossi: 443.33,
      provisaoTBOShimada: 443.33,
      observacoes: 'Tarifas aeronáuticas conf. Fatura 5378624 da Infraero',
    },
    // GSS0009 - Patos → Patrocínio
    {
      voo: 'GSS0009',
      subVoo: 'GSS-0004',
      data: '2024-10-16',
      grupo: 'grossi',
      origem: 'Patos',
      destino: 'Patrocínio',
      tempoAcionamento: '00:24',
      tempoVoo: '00:12',
      combustivelInicial: 1200,
      abastecimentoLibras: 1000,
      abastecimentoLitros: 571,
      localAbastecimento: 'Patos',
      combustivelDecolagem: 2200,
      combustivelConsumidoLibras: 150,
      combustivelConsumidoLitros: 85,
      combustivelFinal: 2050,
      valorCombustivel: 3138.30,
      hangar: 1025.42,
      alimentacao: 65.17,
      hospedagem: 0,
      limpeza: 0,
      uberTaxi: 0,
      tarifas: 0,
      outras: 0,
      provisaoTBOGrossi: 560.00,
      provisaoTBOShimada: 0,
      observacoes: 'Abastecimento Patos 570,6 x 5,50 = R$ 3.138,30',
    },
    // GSS0010 - Patrocínio → Goiânia
    {
      voo: 'GSS0010',
      subVoo: 'GSS-0004',
      data: '2024-10-16',
      grupo: 'grossi',
      origem: 'Patrocínio',
      destino: 'Goiânia',
      tempoAcionamento: '01:03',
      tempoVoo: '00:50',
      combustivelInicial: 2050,
      abastecimentoLibras: 0,
      abastecimentoLitros: 0,
      localAbastecimento: '',
      combustivelDecolagem: 2050,
      combustivelConsumidoLibras: 450,
      combustivelConsumidoLitros: 255,
      combustivelFinal: 1600,
      valorCombustivel: 0,
      hangar: 0,
      alimentacao: 0,
      hospedagem: 105.14,
      limpeza: 263.00,
      uberTaxi: 0,
      tarifas: 460.91,
      outras: 0,
      provisaoTBOGrossi: 2333.33,
      provisaoTBOShimada: 0,
      observacoes: 'Taxas do Decea de comunicação, Operação de pouco Conf. NFS 18845 Concessionaria do bloco central',
    },
    // GSS0011 - Goiânia → Patrocínio
    {
      voo: 'GSS0011',
      subVoo: 'GSS-0004',
      data: '2024-10-17',
      grupo: 'grossi',
      origem: 'Goiânia',
      destino: 'Patrocínio',
      tempoAcionamento: '00:54',
      tempoVoo: '00:54',
      combustivelInicial: 1600,
      abastecimentoLibras: 0,
      abastecimentoLitros: 0,
      localAbastecimento: '',
      combustivelDecolagem: 1600,
      combustivelConsumidoLibras: 500,
      combustivelConsumidoLitros: 283,
      combustivelFinal: 1100,
      valorCombustivel: 0,
      hangar: 0,
      alimentacao: 0,
      hospedagem: 0,
      limpeza: 0,
      uberTaxi: 0,
      tarifas: 0,
      outras: 0,
      provisaoTBOGrossi: 2520.00,
      provisaoTBOShimada: 0,
      observacoes: '',
    },
    // GSS0012 - Patrocínio → Patos
    {
      voo: 'GSS0012',
      subVoo: 'GSS-0004',
      data: '2024-10-17',
      grupo: 'grossi',
      origem: 'Patrocínio',
      destino: 'Patos',
      tempoAcionamento: '00:23',
      tempoVoo: '00:12',
      combustivelInicial: 1100,
      abastecimentoLibras: 0,
      abastecimentoLitros: 0,
      localAbastecimento: '',
      combustivelDecolagem: 1100,
      combustivelConsumidoLibras: 150,
      combustivelConsumidoLitros: 85,
      combustivelFinal: 950,
      valorCombustivel: 0,
      hangar: 0,
      alimentacao: 0,
      hospedagem: 0,
      limpeza: 0,
      uberTaxi: 0,
      tarifas: 0,
      outras: 0,
      provisaoTBOGrossi: 560.00,
      provisaoTBOShimada: 0,
      observacoes: '',
    },
    // GSS0013 - Patos → Goiânia
    {
      voo: 'GSS0013',
      subVoo: 'GSS-0004',
      data: '2024-10-17',
      grupo: 'grossi',
      origem: 'Patos',
      destino: 'Goiânia',
      tempoAcionamento: '01:10',
      tempoVoo: '00:54',
      combustivelInicial: 950,
      abastecimentoLibras: 1503,
      abastecimentoLitros: 854,
      localAbastecimento: 'Patos',
      combustivelDecolagem: 2450,
      combustivelConsumidoLibras: 550,
      combustivelConsumidoLitros: 312,
      combustivelFinal: 1900,
      valorCombustivel: 4697.55,
      hangar: 0,
      alimentacao: 0,
      hospedagem: 0,
      limpeza: 0,
      uberTaxi: 0,
      tarifas: 460.91,
      outras: 0,
      provisaoTBOGrossi: 2520.00,
      provisaoTBOShimada: 0,
      observacoes: 'Taxas do Decea de comunicação, Abastecimento Patos 854,1 x 5,50 = R$ 4.697,55',
    },
    // GSS0014 - Goiânia → Patos
    {
      voo: 'GSS0014',
      subVoo: 'GSS-0004',
      data: '2024-10-17',
      grupo: 'grossi',
      origem: 'Goiânia',
      destino: 'Patos',
      tempoAcionamento: '01:14',
      tempoVoo: '01:00',
      combustivelInicial: 1900,
      abastecimentoLibras: 0,
      abastecimentoLitros: 0,
      localAbastecimento: '',
      combustivelDecolagem: 1900,
      combustivelConsumidoLibras: 600,
      combustivelConsumidoLitros: 340,
      combustivelFinal: 1300,
      valorCombustivel: 0,
      hangar: 0,
      alimentacao: 0,
      hospedagem: 0,
      limpeza: 0,
      uberTaxi: 0,
      tarifas: 0,
      outras: 0,
      provisaoTBOGrossi: 2800.00,
      provisaoTBOShimada: 0,
      observacoes: '',
    },
  ];
}

// ============================================
// AEROPORTOS PADRÃO (Brasil)
// ============================================

function getDefaultAirports(): Airport[] {
  return [
    { icao: 'SBSP', iata: 'CGH', nome: 'Congonhas', cidade: 'São Paulo', pais: 'Brasil', latitude: -23.6261, longitude: -46.6564, elevacao: 2631, taxaPouso: 150 },
    { icao: 'SBGR', iata: 'GRU', nome: 'Guarulhos', cidade: 'São Paulo', pais: 'Brasil', latitude: -23.4356, longitude: -46.4731, elevacao: 2459, taxaPouso: 200 },
    { icao: 'SBRJ', iata: 'SDU', nome: 'Santos Dumont', cidade: 'Rio de Janeiro', pais: 'Brasil', latitude: -22.9105, longitude: -43.1631, elevacao: 11, taxaPouso: 180 },
    { icao: 'SBGL', iata: 'GIG', nome: 'Galeão', cidade: 'Rio de Janeiro', pais: 'Brasil', latitude: -22.8099, longitude: -43.2505, elevacao: 28, taxaPouso: 220 },
    { icao: 'SBBR', iata: 'BSB', nome: 'Brasília', cidade: 'Brasília', pais: 'Brasil', latitude: -15.8711, longitude: -47.9186, elevacao: 3479, taxaPouso: 180 },
    { icao: 'SBCF', iata: 'CNF', nome: 'Confins', cidade: 'Belo Horizonte', pais: 'Brasil', latitude: -19.6244, longitude: -43.9719, elevacao: 2715, taxaPouso: 160 },
    { icao: 'SBPA', iata: 'POA', nome: 'Salgado Filho', cidade: 'Porto Alegre', pais: 'Brasil', latitude: -29.9944, longitude: -51.1711, elevacao: 11, taxaPouso: 150 },
    { icao: 'SBCT', iata: 'CWB', nome: 'Afonso Pena', cidade: 'Curitiba', pais: 'Brasil', latitude: -25.5285, longitude: -49.1758, elevacao: 2988, taxaPouso: 140 },
    { icao: 'SBSV', iata: 'SSA', nome: 'Salvador', cidade: 'Salvador', pais: 'Brasil', latitude: -12.9086, longitude: -38.3225, elevacao: 64, taxaPouso: 160 },
    { icao: 'SBRF', iata: 'REC', nome: 'Recife', cidade: 'Recife', pais: 'Brasil', latitude: -8.1264, longitude: -34.9236, elevacao: 33, taxaPouso: 150 },
    { icao: 'SBFZ', iata: 'FOR', nome: 'Fortaleza', cidade: 'Fortaleza', pais: 'Brasil', latitude: -3.7763, longitude: -38.5326, elevacao: 82, taxaPouso: 150 },
    { icao: 'SBKP', iata: 'VCP', nome: 'Viracopos', cidade: 'Campinas', pais: 'Brasil', latitude: -23.0074, longitude: -47.1345, elevacao: 2170, taxaPouso: 180 },
    { icao: 'SBJD', iata: 'JDO', nome: 'Jundiaí', cidade: 'Jundiaí', pais: 'Brasil', latitude: -23.1817, longitude: -46.9436, elevacao: 2484, taxaPouso: 80 },
    { icao: 'SDCO', nome: 'Sorocaba', cidade: 'Sorocaba', pais: 'Brasil', latitude: -23.4781, longitude: -47.4903, elevacao: 2077, taxaPouso: 60 },
  ];
}
