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
  MarginReserveMovementType,
  FinancialRiskStatus,
  AircraftAsset,
  AssetInvestment,
  AssetShareholding,
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
    const config = storage.getConfig();
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
    const components = storage.getComponents(aircraftId);
    
    schedules.forEach(schedule => {
      if (schedule.trigger === 'horas' && schedule.intervaloHoras) {
        const component = schedule.componentId 
          ? components.find(c => c.id === schedule.componentId)
          : null;
        
        const horasAtuais = component ? component.horasAtuais : aircraft.horasCelula;
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
    
    if (existing) {
      const changes = getChanges(existing, expense);
      const index = expenses.findIndex(e => e.id === expense.id);
      expenses[index] = expense;
      createAuditLog(userId, userName, 'update', 'expense', expense.id, changes);
    } else {
      expense.id = expense.id || generateId();
      expense.createdAt = new Date().toISOString();
      expense.createdBy = userId;
      expenses.push(expense);
      createAuditLog(userId, userName, 'create', 'expense', expense.id, []);
      
      // Criar rateio automático se configurado
      if (expense.rateioAutomatico) {
        storage.createExpenseRateio(expense, userId, userName);
      }
    }
    
    setItem(STORAGE_KEYS.EXPENSES, expenses);
    return expense;
  },

  deleteExpense: (id: string, userId: string, userName: string): void => {
    const expenses = getItem<Expense[]>(STORAGE_KEYS.EXPENSES, []).filter(e => e.id !== id);
    setItem(STORAGE_KEYS.EXPENSES, expenses);
    createAuditLog(userId, userName, 'delete', 'expense', id, []);
  },

  createExpenseRateio: (expense: Expense, userId: string, userName: string): void => {
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
    estimate.id = estimate.id || generateId();
    estimate.createdAt = new Date().toISOString();
    estimate.criadoPor = userId;
    estimates.push(estimate);
    setItem(STORAGE_KEYS.FLIGHT_ESTIMATES, estimates);
    createAuditLog(userId, userName, 'create', 'flight_estimate', estimate.id, []);
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
    const fatorConversao = config.fatorConversaoLbsLitros || 0.54;
    
    // A) Combustível decolagem = Inicial + Abastecido (libras)
    const combustivelDecolagem = (entry.combustivelInicial || 0) + (entry.abastecimentoLibras || 0);
    
    // B) Combustível final = Decolagem - Consumido (libras)
    const combustivelFinal = combustivelDecolagem - (entry.combustivelConsumido || 0);
    
    // C) Conversão lbs -> litros
    const combustivelConsumidoLitros = (entry.combustivelConsumido || 0) * fatorConversao;
    
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
    // Caixa operacional (despesas e pagamentos)
    const expenses = storage.getExpenses(aircraftId);
    const payments = storage.getPayments(undefined, aircraftId);
    
    const totalDespesas = expenses.reduce((sum, e) => sum + e.valor, 0);
    const totalRecebido = payments.filter(p => p.status === 'pago').reduce((sum, p) => sum + p.valor, 0);
    const caixaOperacional = totalRecebido - totalDespesas;
    
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
      fatorConversaoLbsLitros: 0.54, // AVGAS
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
  // INICIALIZAÇÃO COM DADOS DE EXEMPLO
  // ==========================================
  
  initializeWithSampleData: (): void => {
    // Verificar se já existe dados
    if (storage.getUsers().length > 0) return;
    
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
    
    // Criar piloto de exemplo
    const piloto: User = {
      id: generateId(),
      email: 'piloto@aerogestao.com',
      nome: 'João Silva',
      telefone: '(11) 98888-8888',
      role: 'piloto',
      horasTotais: 250,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      active: true,
    };
    storage.saveUser(piloto);
    
    // Criar aeronave de exemplo
    const aircraft: Aircraft = {
      id: generateId(),
      prefixo: 'PT-ABC',
      modelo: 'Cessna 172',
      fabricante: 'Cessna',
      numeroSerie: '172-12345',
      anoFabricacao: 2015,
      tipo: 'pistao',
      baseHangar: 'SBSP',
      consumoMedio: 36,
      velocidadeCruzeiro: 120,
      tipoCombustivel: 'avgas',
      unidadeCombustivel: 'litros',
      horasCelula: 1500,
      ciclosTotais: 3000,
      custoHora: 450,
      reservaCombustivel: 45,
      margemSeguranca: 10,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      active: true,
    };
    storage.saveAircraft(aircraft, admin.id, admin.nome);
    
    // Criar motor
    const motor: AircraftComponent = {
      id: generateId(),
      aircraftId: aircraft.id,
      tipo: 'motor',
      serial: 'LYC-O-320-12345',
      modelo: 'O-320',
      fabricante: 'Lycoming',
      limiteTSO: 2000,
      horasAtuais: 1500,
      dataInstalacao: '2015-01-01',
    };
    storage.saveComponent(motor, admin.id, admin.nome);
    
    // Criar manutenção programada
    const manutencao: MaintenanceSchedule = {
      id: generateId(),
      aircraftId: aircraft.id,
      nome: 'Inspeção 100h',
      descricao: 'Inspeção periódica de 100 horas',
      tipo: 'inspecao',
      trigger: 'horas',
      intervaloHoras: 100,
      proximasHoras: 1600,
      alertaAntesHoras: 10,
      obrigatorio: true,
      ativo: true,
    };
    storage.saveMaintenanceSchedule(manutencao, admin.id, admin.nome);
    
    // Criar membership
    const membership: Membership = {
      id: generateId(),
      userId: piloto.id,
      aircraftId: aircraft.id,
      tipoParticipacao: 'cotista',
      rateioType: 'hora_voo',
      cotaPercentual: 50,
      status: 'ativo',
      dataInicio: new Date().toISOString().split('T')[0],
    };
    storage.saveMembership(membership, admin.id, admin.nome);
    
    // Salvar aeroportos padrão
    setItem(STORAGE_KEYS.AIRPORTS, getDefaultAirports());
  },
};

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
