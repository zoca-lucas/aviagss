import {
  Aircraft, AircraftComponent, User, Membership, Flight, FlightLeg,
  MaintenanceEvent, MaintenanceSchedule, Expense, Payment, MemberBalance,
  Document, Booking, Alert, AuditLog, Airport, FlightEstimate, AircraftConfig,
  UserRole, Grupo
} from '../types';

// ==========================================
// STORAGE KEYS
// ==========================================

const KEYS = {
  AIRCRAFT: 'aerogest_aircraft',
  COMPONENTS: 'aerogest_components',
  USERS: 'aerogest_users',
  CURRENT_USER: 'aerogest_current_user',
  MEMBERSHIPS: 'aerogest_memberships',
  FLIGHTS: 'aerogest_flights',
  FLIGHT_LEGS: 'aerogest_flight_legs',
  MAINTENANCE_EVENTS: 'aerogest_maintenance_events',
  MAINTENANCE_SCHEDULES: 'aerogest_maintenance_schedules',
  EXPENSES: 'aerogest_expenses',
  PAYMENTS: 'aerogest_payments',
  MEMBER_BALANCES: 'aerogest_member_balances',
  DOCUMENTS: 'aerogest_documents',
  BOOKINGS: 'aerogest_bookings',
  ALERTS: 'aerogest_alerts',
  AUDIT_LOGS: 'aerogest_audit_logs',
  AIRPORTS: 'aerogest_airports',
  FLIGHT_ESTIMATES: 'aerogest_flight_estimates',
  AIRCRAFT_CONFIGS: 'aerogest_aircraft_configs',
};

// ==========================================
// HELPERS
// ==========================================

const generateId = (): string => crypto.randomUUID();
const now = (): string => new Date().toISOString();

function getItem<T>(key: string): T[] {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
}

function setItem<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

function getSingleItem<T>(key: string): T | null {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : null;
}

function setSingleItem<T>(key: string, data: T): void {
  localStorage.setItem(key, JSON.stringify(data));
}

// ==========================================
// AUDIT LOG
// ==========================================

function createAuditLog(
  acao: 'criar' | 'editar' | 'excluir' | 'visualizar',
  entidade: string,
  entidadeId: string,
  descricao: string,
  dadosAnteriores?: Record<string, unknown>,
  dadosNovos?: Record<string, unknown>
): void {
  const currentUser = db.users.getCurrentUser();
  if (!currentUser) return;

  const log: AuditLog = {
    id: generateId(),
    usuarioId: currentUser.id,
    usuarioNome: currentUser.nome,
    acao,
    entidade,
    entidadeId,
    dadosAnteriores,
    dadosNovos,
    descricao,
    timestamp: now(),
  };

  const logs = getItem<AuditLog>(KEYS.AUDIT_LOGS);
  logs.unshift(log);
  // Manter apenas os últimos 1000 logs
  setItem(KEYS.AUDIT_LOGS, logs.slice(0, 1000));
}

// ==========================================
// DATABASE OBJECT
// ==========================================

export const db = {
  // ==========================================
  // USERS
  // ==========================================
  users: {
    getAll: (): User[] => getItem<User>(KEYS.USERS),
    
    getById: (id: string): User | undefined => {
      return getItem<User>(KEYS.USERS).find(u => u.id === id);
    },
    
    getByEmail: (email: string): User | undefined => {
      return getItem<User>(KEYS.USERS).find(u => u.email === email);
    },
    
    getCurrentUser: (): User | null => {
      return getSingleItem<User>(KEYS.CURRENT_USER);
    },
    
    setCurrentUser: (user: User | null): void => {
      if (user) {
        setSingleItem(KEYS.CURRENT_USER, user);
      } else {
        localStorage.removeItem(KEYS.CURRENT_USER);
      }
    },
    
    create: (data: Omit<User, 'id' | 'criadoEm' | 'atualizadoEm'>): User => {
      const user: User = {
        ...data,
        id: generateId(),
        criadoEm: now(),
        atualizadoEm: now(),
      };
      const users = getItem<User>(KEYS.USERS);
      users.push(user);
      setItem(KEYS.USERS, users);
      createAuditLog('criar', 'user', user.id, `Usuário ${user.nome} criado`);
      return user;
    },
    
    update: (id: string, data: Partial<User>): User | null => {
      const users = getItem<User>(KEYS.USERS);
      const index = users.findIndex(u => u.id === id);
      if (index === -1) return null;
      
      const oldData = { ...users[index] };
      users[index] = { ...users[index], ...data, atualizadoEm: now() };
      setItem(KEYS.USERS, users);
      createAuditLog('editar', 'user', id, `Usuário ${users[index].nome} atualizado`, oldData, users[index]);
      return users[index];
    },
    
    delete: (id: string): boolean => {
      const users = getItem<User>(KEYS.USERS);
      const user = users.find(u => u.id === id);
      if (!user) return false;
      
      setItem(KEYS.USERS, users.filter(u => u.id !== id));
      createAuditLog('excluir', 'user', id, `Usuário ${user.nome} excluído`);
      return true;
    },
    
    hasPermission: (permission: string): boolean => {
      const user = db.users.getCurrentUser();
      if (!user) return false;
      
      const permissions: Record<UserRole, string[]> = {
        admin: ['*'],
        gestor: ['aircraft', 'maintenance', 'financial', 'documents', 'bookings', 'reports'],
        piloto: ['flights', 'estimates', 'bookings', 'documents:view'],
        cotista: ['reports:view', 'financial:view', 'bookings:view'],
      };
      
      const userPermissions = permissions[user.role];
      return userPermissions.includes('*') || userPermissions.includes(permission);
    },
  },

  // ==========================================
  // AIRCRAFT
  // ==========================================
  aircraft: {
    getAll: (): Aircraft[] => getItem<Aircraft>(KEYS.AIRCRAFT),
    
    getById: (id: string): Aircraft | undefined => {
      return getItem<Aircraft>(KEYS.AIRCRAFT).find(a => a.id === id);
    },
    
    getByPrefixo: (prefixo: string): Aircraft | undefined => {
      return getItem<Aircraft>(KEYS.AIRCRAFT).find(a => a.prefixo === prefixo);
    },
    
    create: (data: Omit<Aircraft, 'id' | 'criadoEm' | 'atualizadoEm'>): Aircraft => {
      const aircraft: Aircraft = {
        ...data,
        id: generateId(),
        criadoEm: now(),
        atualizadoEm: now(),
      };
      const list = getItem<Aircraft>(KEYS.AIRCRAFT);
      list.push(aircraft);
      setItem(KEYS.AIRCRAFT, list);
      createAuditLog('criar', 'aircraft', aircraft.id, `Aeronave ${aircraft.prefixo} criada`);
      return aircraft;
    },
    
    update: (id: string, data: Partial<Aircraft>): Aircraft | null => {
      const list = getItem<Aircraft>(KEYS.AIRCRAFT);
      const index = list.findIndex(a => a.id === id);
      if (index === -1) return null;
      
      const oldData = { ...list[index] };
      list[index] = { ...list[index], ...data, atualizadoEm: now() };
      setItem(KEYS.AIRCRAFT, list);
      createAuditLog('editar', 'aircraft', id, `Aeronave ${list[index].prefixo} atualizada`, oldData, list[index]);
      return list[index];
    },
    
    updateHours: (id: string, horasCelula: number, ciclos: number): void => {
      const aircraft = db.aircraft.getById(id);
      if (aircraft) {
        db.aircraft.update(id, {
          horasCelula: aircraft.horasCelula + horasCelula,
          ciclosTotais: aircraft.ciclosTotais + ciclos,
        });
      }
    },
    
    delete: (id: string): boolean => {
      const list = getItem<Aircraft>(KEYS.AIRCRAFT);
      const aircraft = list.find(a => a.id === id);
      if (!aircraft) return false;
      
      setItem(KEYS.AIRCRAFT, list.filter(a => a.id !== id));
      createAuditLog('excluir', 'aircraft', id, `Aeronave ${aircraft.prefixo} excluída`);
      return true;
    },
  },

  // ==========================================
  // COMPONENTS
  // ==========================================
  components: {
    getAll: (): AircraftComponent[] => getItem<AircraftComponent>(KEYS.COMPONENTS),
    
    getByAircraft: (aeronaveId: string): AircraftComponent[] => {
      return getItem<AircraftComponent>(KEYS.COMPONENTS).filter(c => c.aeronaveId === aeronaveId);
    },
    
    getById: (id: string): AircraftComponent | undefined => {
      return getItem<AircraftComponent>(KEYS.COMPONENTS).find(c => c.id === id);
    },
    
    create: (data: Omit<AircraftComponent, 'id' | 'criadoEm' | 'atualizadoEm'>): AircraftComponent => {
      const component: AircraftComponent = {
        ...data,
        id: generateId(),
        criadoEm: now(),
        atualizadoEm: now(),
      };
      const list = getItem<AircraftComponent>(KEYS.COMPONENTS);
      list.push(component);
      setItem(KEYS.COMPONENTS, list);
      createAuditLog('criar', 'component', component.id, `Componente ${component.nome} criado`);
      return component;
    },
    
    update: (id: string, data: Partial<AircraftComponent>): AircraftComponent | null => {
      const list = getItem<AircraftComponent>(KEYS.COMPONENTS);
      const index = list.findIndex(c => c.id === id);
      if (index === -1) return null;
      
      list[index] = { ...list[index], ...data, atualizadoEm: now() };
      setItem(KEYS.COMPONENTS, list);
      return list[index];
    },
    
    updateHours: (id: string, horas: number, ciclos: number = 0): void => {
      const component = db.components.getById(id);
      if (component) {
        db.components.update(id, {
          horasAtuais: component.horasAtuais + horas,
          ciclosAtuais: component.ciclosAtuais + ciclos,
        });
      }
    },
    
    delete: (id: string): boolean => {
      const list = getItem<AircraftComponent>(KEYS.COMPONENTS);
      setItem(KEYS.COMPONENTS, list.filter(c => c.id !== id));
      return true;
    },
  },

  // ==========================================
  // MEMBERSHIPS
  // ==========================================
  memberships: {
    getAll: (): Membership[] => getItem<Membership>(KEYS.MEMBERSHIPS),
    
    getByUser: (usuarioId: string): Membership[] => {
      return getItem<Membership>(KEYS.MEMBERSHIPS).filter(m => m.usuarioId === usuarioId);
    },
    
    getByAircraft: (aeronaveId: string): Membership[] => {
      return getItem<Membership>(KEYS.MEMBERSHIPS).filter(m => m.aeronaveId === aeronaveId);
    },
    
    create: (data: Omit<Membership, 'id' | 'criadoEm' | 'atualizadoEm'>): Membership => {
      const membership: Membership = {
        ...data,
        id: generateId(),
        criadoEm: now(),
        atualizadoEm: now(),
      };
      const list = getItem<Membership>(KEYS.MEMBERSHIPS);
      list.push(membership);
      setItem(KEYS.MEMBERSHIPS, list);
      return membership;
    },
    
    update: (id: string, data: Partial<Membership>): Membership | null => {
      const list = getItem<Membership>(KEYS.MEMBERSHIPS);
      const index = list.findIndex(m => m.id === id);
      if (index === -1) return null;
      
      list[index] = { ...list[index], ...data, atualizadoEm: now() };
      setItem(KEYS.MEMBERSHIPS, list);
      return list[index];
    },
    
    delete: (id: string): boolean => {
      const list = getItem<Membership>(KEYS.MEMBERSHIPS);
      setItem(KEYS.MEMBERSHIPS, list.filter(m => m.id !== id));
      return true;
    },
  },

  // ==========================================
  // FLIGHTS (LOGBOOK)
  // ==========================================
  flights: {
    getAll: (): Flight[] => getItem<Flight>(KEYS.FLIGHTS),
    
    getByAircraft: (aeronaveId: string): Flight[] => {
      return getItem<Flight>(KEYS.FLIGHTS)
        .filter(f => f.aeronaveId === aeronaveId)
        .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
    },
    
    getByPilot: (pilotoId: string): Flight[] => {
      return getItem<Flight>(KEYS.FLIGHTS)
        .filter(f => f.pilotoId === pilotoId || f.copilotoId === pilotoId)
        .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
    },
    
    getById: (id: string): Flight | undefined => {
      return getItem<Flight>(KEYS.FLIGHTS).find(f => f.id === id);
    },
    
    getByPeriod: (aeronaveId: string, inicio: string, fim: string): Flight[] => {
      return getItem<Flight>(KEYS.FLIGHTS).filter(f => 
        f.aeronaveId === aeronaveId &&
        f.data >= inicio &&
        f.data <= fim
      );
    },
    
    create: (data: Omit<Flight, 'id' | 'criadoEm' | 'atualizadoEm'>): Flight => {
      const flight: Flight = {
        ...data,
        id: generateId(),
        criadoEm: now(),
        atualizadoEm: now(),
      };
      const list = getItem<Flight>(KEYS.FLIGHTS);
      list.push(flight);
      setItem(KEYS.FLIGHTS, list);
      
      // Atualizar horas da aeronave
      if (flight.status === 'realizado') {
        db.aircraft.updateHours(flight.aeronaveId, flight.horasCelula, flight.ciclos);
        
        // Atualizar horas dos componentes
        const components = db.components.getByAircraft(flight.aeronaveId);
        components.forEach(comp => {
          if (comp.tipo === 'motor') {
            db.components.updateHours(comp.id, flight.horasMotor, flight.ciclos);
          } else {
            db.components.updateHours(comp.id, flight.horasCelula, flight.ciclos);
          }
        });
        
        // Recalcular manutenções programadas
        db.maintenanceSchedules.recalculateAll(flight.aeronaveId);
      }
      
      createAuditLog('criar', 'flight', flight.id, `Voo ${flight.origem}-${flight.destino} registrado`);
      return flight;
    },
    
    update: (id: string, data: Partial<Flight>): Flight | null => {
      const list = getItem<Flight>(KEYS.FLIGHTS);
      const index = list.findIndex(f => f.id === id);
      if (index === -1) return null;
      
      list[index] = { ...list[index], ...data, atualizadoEm: now() };
      setItem(KEYS.FLIGHTS, list);
      return list[index];
    },
    
    delete: (id: string): boolean => {
      const list = getItem<Flight>(KEYS.FLIGHTS);
      setItem(KEYS.FLIGHTS, list.filter(f => f.id !== id));
      return true;
    },
    
    getTotalHours: (aeronaveId: string, grupo?: Grupo): number => {
      let flights = db.flights.getByAircraft(aeronaveId);
      if (grupo && grupo !== 'todos') {
        flights = flights.filter(f => f.grupo === grupo);
      }
      return flights.reduce((total, f) => total + f.tempoVoo, 0);
    },
  },

  // ==========================================
  // MAINTENANCE EVENTS
  // ==========================================
  maintenanceEvents: {
    getAll: (): MaintenanceEvent[] => getItem<MaintenanceEvent>(KEYS.MAINTENANCE_EVENTS),
    
    getByAircraft: (aeronaveId: string): MaintenanceEvent[] => {
      return getItem<MaintenanceEvent>(KEYS.MAINTENANCE_EVENTS)
        .filter(m => m.aeronaveId === aeronaveId)
        .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
    },
    
    getById: (id: string): MaintenanceEvent | undefined => {
      return getItem<MaintenanceEvent>(KEYS.MAINTENANCE_EVENTS).find(m => m.id === id);
    },
    
    create: (data: Omit<MaintenanceEvent, 'id' | 'criadoEm' | 'atualizadoEm'>): MaintenanceEvent => {
      const event: MaintenanceEvent = {
        ...data,
        id: generateId(),
        criadoEm: now(),
        atualizadoEm: now(),
      };
      const list = getItem<MaintenanceEvent>(KEYS.MAINTENANCE_EVENTS);
      list.push(event);
      setItem(KEYS.MAINTENANCE_EVENTS, list);
      createAuditLog('criar', 'maintenance', event.id, `Manutenção ${event.tipo} registrada`);
      return event;
    },
    
    update: (id: string, data: Partial<MaintenanceEvent>): MaintenanceEvent | null => {
      const list = getItem<MaintenanceEvent>(KEYS.MAINTENANCE_EVENTS);
      const index = list.findIndex(m => m.id === id);
      if (index === -1) return null;
      
      list[index] = { ...list[index], ...data, atualizadoEm: now() };
      setItem(KEYS.MAINTENANCE_EVENTS, list);
      return list[index];
    },
    
    delete: (id: string): boolean => {
      const list = getItem<MaintenanceEvent>(KEYS.MAINTENANCE_EVENTS);
      setItem(KEYS.MAINTENANCE_EVENTS, list.filter(m => m.id !== id));
      return true;
    },
  },

  // ==========================================
  // MAINTENANCE SCHEDULES
  // ==========================================
  maintenanceSchedules: {
    getAll: (): MaintenanceSchedule[] => getItem<MaintenanceSchedule>(KEYS.MAINTENANCE_SCHEDULES),
    
    getByAircraft: (aeronaveId: string): MaintenanceSchedule[] => {
      return getItem<MaintenanceSchedule>(KEYS.MAINTENANCE_SCHEDULES)
        .filter(m => m.aeronaveId === aeronaveId);
    },
    
    getById: (id: string): MaintenanceSchedule | undefined => {
      return getItem<MaintenanceSchedule>(KEYS.MAINTENANCE_SCHEDULES).find(m => m.id === id);
    },
    
    getUpcoming: (aeronaveId: string): MaintenanceSchedule[] => {
      const aircraft = db.aircraft.getById(aeronaveId);
      if (!aircraft) return [];
      
      return db.maintenanceSchedules.getByAircraft(aeronaveId)
        .filter(m => m.ativo)
        .filter(m => {
          if (m.gatilho === 'horas' && m.proximaExecucaoHoras) {
            return aircraft.horasCelula >= (m.proximaExecucaoHoras - (m.alertaAntesHoras || 10));
          }
          if (m.gatilho === 'calendario' && m.proximaExecucaoData) {
            const diasAntecedencia = m.alertaAntesDias || 15;
            const dataLimite = new Date();
            dataLimite.setDate(dataLimite.getDate() + diasAntecedencia);
            return new Date(m.proximaExecucaoData) <= dataLimite;
          }
          return false;
        });
    },
    
    getOverdue: (aeronaveId: string): MaintenanceSchedule[] => {
      const aircraft = db.aircraft.getById(aeronaveId);
      if (!aircraft) return [];
      
      return db.maintenanceSchedules.getByAircraft(aeronaveId)
        .filter(m => m.ativo)
        .filter(m => {
          if (m.gatilho === 'horas' && m.proximaExecucaoHoras) {
            return aircraft.horasCelula >= m.proximaExecucaoHoras;
          }
          if (m.gatilho === 'calendario' && m.proximaExecucaoData) {
            return new Date(m.proximaExecucaoData) <= new Date();
          }
          return false;
        });
    },
    
    create: (data: Omit<MaintenanceSchedule, 'id' | 'criadoEm' | 'atualizadoEm'>): MaintenanceSchedule => {
      const schedule: MaintenanceSchedule = {
        ...data,
        id: generateId(),
        criadoEm: now(),
        atualizadoEm: now(),
      };
      const list = getItem<MaintenanceSchedule>(KEYS.MAINTENANCE_SCHEDULES);
      list.push(schedule);
      setItem(KEYS.MAINTENANCE_SCHEDULES, list);
      return schedule;
    },
    
    update: (id: string, data: Partial<MaintenanceSchedule>): MaintenanceSchedule | null => {
      const list = getItem<MaintenanceSchedule>(KEYS.MAINTENANCE_SCHEDULES);
      const index = list.findIndex(m => m.id === id);
      if (index === -1) return null;
      
      list[index] = { ...list[index], ...data, atualizadoEm: now() };
      setItem(KEYS.MAINTENANCE_SCHEDULES, list);
      return list[index];
    },
    
    recalculateAll: (aeronaveId: string): void => {
      const aircraft = db.aircraft.getById(aeronaveId);
      if (!aircraft) return;
      
      const schedules = db.maintenanceSchedules.getByAircraft(aeronaveId);
      schedules.forEach(schedule => {
        if (schedule.gatilho === 'horas' && schedule.intervaloHoras) {
          const proximasHoras = (schedule.ultimasHoras || 0) + schedule.intervaloHoras;
          db.maintenanceSchedules.update(schedule.id, { proximaExecucaoHoras: proximasHoras });
        }
      });
    },
    
    delete: (id: string): boolean => {
      const list = getItem<MaintenanceSchedule>(KEYS.MAINTENANCE_SCHEDULES);
      setItem(KEYS.MAINTENANCE_SCHEDULES, list.filter(m => m.id !== id));
      return true;
    },
  },

  // ==========================================
  // EXPENSES
  // ==========================================
  expenses: {
    getAll: (): Expense[] => getItem<Expense>(KEYS.EXPENSES),
    
    getByAircraft: (aeronaveId: string): Expense[] => {
      return getItem<Expense>(KEYS.EXPENSES)
        .filter(e => e.aeronaveId === aeronaveId)
        .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
    },
    
    getByPeriod: (aeronaveId: string, inicio: string, fim: string): Expense[] => {
      return getItem<Expense>(KEYS.EXPENSES).filter(e => 
        e.aeronaveId === aeronaveId &&
        e.data >= inicio &&
        e.data <= fim
      );
    },
    
    getById: (id: string): Expense | undefined => {
      return getItem<Expense>(KEYS.EXPENSES).find(e => e.id === id);
    },
    
    create: (data: Omit<Expense, 'id' | 'criadoEm' | 'atualizadoEm'>): Expense => {
      const expense: Expense = {
        ...data,
        id: generateId(),
        criadoEm: now(),
        atualizadoEm: now(),
      };
      const list = getItem<Expense>(KEYS.EXPENSES);
      list.push(expense);
      setItem(KEYS.EXPENSES, list);
      createAuditLog('criar', 'expense', expense.id, `Despesa ${expense.categoria} R$${expense.valor} registrada`);
      return expense;
    },
    
    update: (id: string, data: Partial<Expense>): Expense | null => {
      const list = getItem<Expense>(KEYS.EXPENSES);
      const index = list.findIndex(e => e.id === id);
      if (index === -1) return null;
      
      list[index] = { ...list[index], ...data, atualizadoEm: now() };
      setItem(KEYS.EXPENSES, list);
      return list[index];
    },
    
    delete: (id: string): boolean => {
      const list = getItem<Expense>(KEYS.EXPENSES);
      setItem(KEYS.EXPENSES, list.filter(e => e.id !== id));
      return true;
    },
    
    getTotalByPeriod: (aeronaveId: string, inicio: string, fim: string, grupo?: Grupo): number => {
      let expenses = db.expenses.getByPeriod(aeronaveId, inicio, fim);
      if (grupo && grupo !== 'todos') {
        expenses = expenses.filter(e => e.grupo === grupo);
      }
      return expenses.reduce((total, e) => total + e.valor, 0);
    },
  },

  // ==========================================
  // DOCUMENTS
  // ==========================================
  documents: {
    getAll: (): Document[] => getItem<Document>(KEYS.DOCUMENTS),
    
    getByAircraft: (aeronaveId: string): Document[] => {
      return getItem<Document>(KEYS.DOCUMENTS).filter(d => d.aeronaveId === aeronaveId);
    },
    
    getByUser: (usuarioId: string): Document[] => {
      return getItem<Document>(KEYS.DOCUMENTS).filter(d => d.usuarioId === usuarioId);
    },
    
    getExpiring: (dias: number = 30): Document[] => {
      const limite = new Date();
      limite.setDate(limite.getDate() + dias);
      
      return getItem<Document>(KEYS.DOCUMENTS).filter(d => {
        if (!d.dataValidade) return false;
        return new Date(d.dataValidade) <= limite;
      });
    },
    
    getExpired: (): Document[] => {
      return getItem<Document>(KEYS.DOCUMENTS).filter(d => {
        if (!d.dataValidade) return false;
        return new Date(d.dataValidade) < new Date();
      });
    },
    
    getById: (id: string): Document | undefined => {
      return getItem<Document>(KEYS.DOCUMENTS).find(d => d.id === id);
    },
    
    create: (data: Omit<Document, 'id' | 'criadoEm' | 'atualizadoEm'>): Document => {
      const document: Document = {
        ...data,
        id: generateId(),
        criadoEm: now(),
        atualizadoEm: now(),
      };
      const list = getItem<Document>(KEYS.DOCUMENTS);
      list.push(document);
      setItem(KEYS.DOCUMENTS, list);
      return document;
    },
    
    update: (id: string, data: Partial<Document>): Document | null => {
      const list = getItem<Document>(KEYS.DOCUMENTS);
      const index = list.findIndex(d => d.id === id);
      if (index === -1) return null;
      
      list[index] = { ...list[index], ...data, atualizadoEm: now() };
      setItem(KEYS.DOCUMENTS, list);
      return list[index];
    },
    
    delete: (id: string): boolean => {
      const list = getItem<Document>(KEYS.DOCUMENTS);
      setItem(KEYS.DOCUMENTS, list.filter(d => d.id !== id));
      return true;
    },
  },

  // ==========================================
  // BOOKINGS
  // ==========================================
  bookings: {
    getAll: (): Booking[] => getItem<Booking>(KEYS.BOOKINGS),
    
    getByAircraft: (aeronaveId: string): Booking[] => {
      return getItem<Booking>(KEYS.BOOKINGS)
        .filter(b => b.aeronaveId === aeronaveId)
        .sort((a, b) => new Date(a.dataInicio).getTime() - new Date(b.dataInicio).getTime());
    },
    
    getByMember: (membroId: string): Booking[] => {
      return getItem<Booking>(KEYS.BOOKINGS).filter(b => b.membroId === membroId);
    },
    
    getByDate: (aeronaveId: string, data: string): Booking[] => {
      return getItem<Booking>(KEYS.BOOKINGS).filter(b => 
        b.aeronaveId === aeronaveId &&
        b.dataInicio <= data &&
        b.dataFim >= data
      );
    },
    
    checkConflict: (aeronaveId: string, dataInicio: string, dataFim: string, excludeId?: string): Booking | null => {
      const bookings = db.bookings.getByAircraft(aeronaveId).filter(b => 
        b.status !== 'cancelada' &&
        b.id !== excludeId
      );
      
      return bookings.find(b => {
        const existingStart = new Date(`${b.dataInicio}T${b.horaInicio}`);
        const existingEnd = new Date(`${b.dataFim}T${b.horaFim}`);
        const newStart = new Date(dataInicio);
        const newEnd = new Date(dataFim);
        
        return (newStart < existingEnd && newEnd > existingStart);
      }) || null;
    },
    
    getById: (id: string): Booking | undefined => {
      return getItem<Booking>(KEYS.BOOKINGS).find(b => b.id === id);
    },
    
    create: (data: Omit<Booking, 'id' | 'criadoEm' | 'atualizadoEm'>): Booking => {
      const booking: Booking = {
        ...data,
        id: generateId(),
        criadoEm: now(),
        atualizadoEm: now(),
      };
      const list = getItem<Booking>(KEYS.BOOKINGS);
      list.push(booking);
      setItem(KEYS.BOOKINGS, list);
      return booking;
    },
    
    update: (id: string, data: Partial<Booking>): Booking | null => {
      const list = getItem<Booking>(KEYS.BOOKINGS);
      const index = list.findIndex(b => b.id === id);
      if (index === -1) return null;
      
      list[index] = { ...list[index], ...data, atualizadoEm: now() };
      setItem(KEYS.BOOKINGS, list);
      return list[index];
    },
    
    delete: (id: string): boolean => {
      const list = getItem<Booking>(KEYS.BOOKINGS);
      setItem(KEYS.BOOKINGS, list.filter(b => b.id !== id));
      return true;
    },
  },

  // ==========================================
  // ALERTS
  // ==========================================
  alerts: {
    getAll: (): Alert[] => getItem<Alert>(KEYS.ALERTS),
    
    getByAircraft: (aeronaveId: string): Alert[] => {
      return getItem<Alert>(KEYS.ALERTS).filter(a => a.aeronaveId === aeronaveId && !a.dispensado);
    },
    
    getByUser: (usuarioId: string): Alert[] => {
      return getItem<Alert>(KEYS.ALERTS).filter(a => a.usuarioId === usuarioId && !a.dispensado);
    },
    
    getUnread: (): Alert[] => {
      return getItem<Alert>(KEYS.ALERTS).filter(a => !a.lido && !a.dispensado);
    },
    
    create: (data: Omit<Alert, 'id' | 'criadoEm'>): Alert => {
      const alert: Alert = {
        ...data,
        id: generateId(),
        criadoEm: now(),
      };
      const list = getItem<Alert>(KEYS.ALERTS);
      list.unshift(alert);
      setItem(KEYS.ALERTS, list);
      return alert;
    },
    
    markAsRead: (id: string): void => {
      const list = getItem<Alert>(KEYS.ALERTS);
      const index = list.findIndex(a => a.id === id);
      if (index !== -1) {
        list[index].lido = true;
        setItem(KEYS.ALERTS, list);
      }
    },
    
    dismiss: (id: string): void => {
      const list = getItem<Alert>(KEYS.ALERTS);
      const index = list.findIndex(a => a.id === id);
      if (index !== -1) {
        list[index].dispensado = true;
        setItem(KEYS.ALERTS, list);
      }
    },
    
    generateMaintenanceAlerts: (aeronaveId: string): void => {
      const upcoming = db.maintenanceSchedules.getUpcoming(aeronaveId);
      const overdue = db.maintenanceSchedules.getOverdue(aeronaveId);
      
      overdue.forEach(m => {
        db.alerts.create({
          aeronaveId,
          tipo: 'manutencao',
          prioridade: 'critica',
          titulo: `Manutenção vencida: ${m.nome}`,
          descricao: `A manutenção "${m.nome}" está vencida e precisa ser realizada imediatamente.`,
          entidadeId: m.id,
          entidadeTipo: 'maintenance_schedule',
          lido: false,
          dispensado: false,
        });
      });
      
      upcoming.forEach(m => {
        db.alerts.create({
          aeronaveId,
          tipo: 'manutencao',
          prioridade: 'alta',
          titulo: `Manutenção próxima: ${m.nome}`,
          descricao: `A manutenção "${m.nome}" está próxima do vencimento.`,
          entidadeId: m.id,
          entidadeTipo: 'maintenance_schedule',
          lido: false,
          dispensado: false,
        });
      });
    },
    
    generateDocumentAlerts: (): void => {
      const expiring = db.documents.getExpiring(30);
      const expired = db.documents.getExpired();
      
      expired.forEach(d => {
        db.alerts.create({
          aeronaveId: d.aeronaveId,
          usuarioId: d.usuarioId,
          tipo: 'documento',
          prioridade: 'critica',
          titulo: `Documento vencido: ${d.nome}`,
          descricao: `O documento "${d.nome}" está vencido desde ${d.dataValidade}.`,
          entidadeId: d.id,
          entidadeTipo: 'document',
          dataVencimento: d.dataValidade,
          lido: false,
          dispensado: false,
        });
      });
      
      expiring.forEach(d => {
        if (!expired.find(e => e.id === d.id)) {
          db.alerts.create({
            aeronaveId: d.aeronaveId,
            usuarioId: d.usuarioId,
            tipo: 'documento',
            prioridade: 'alta',
            titulo: `Documento vencendo: ${d.nome}`,
            descricao: `O documento "${d.nome}" vence em ${d.dataValidade}.`,
            entidadeId: d.id,
            entidadeTipo: 'document',
            dataVencimento: d.dataValidade,
            lido: false,
            dispensado: false,
          });
        }
      });
    },
  },

  // ==========================================
  // AIRPORTS
  // ==========================================
  airports: {
    getAll: (): Airport[] => getItem<Airport>(KEYS.AIRPORTS),
    
    getByIcao: (icao: string): Airport | undefined => {
      return getItem<Airport>(KEYS.AIRPORTS).find(a => a.icao.toUpperCase() === icao.toUpperCase());
    },
    
    search: (query: string): Airport[] => {
      const q = query.toLowerCase();
      return getItem<Airport>(KEYS.AIRPORTS).filter(a => 
        a.icao.toLowerCase().includes(q) ||
        a.iata?.toLowerCase().includes(q) ||
        a.nome.toLowerCase().includes(q) ||
        a.cidade.toLowerCase().includes(q)
      ).slice(0, 20);
    },
    
    create: (data: Airport): Airport => {
      const list = getItem<Airport>(KEYS.AIRPORTS);
      list.push(data);
      setItem(KEYS.AIRPORTS, list);
      return data;
    },
    
    update: (icao: string, data: Partial<Airport>): Airport | null => {
      const list = getItem<Airport>(KEYS.AIRPORTS);
      const index = list.findIndex(a => a.icao === icao);
      if (index === -1) return null;
      
      list[index] = { ...list[index], ...data };
      setItem(KEYS.AIRPORTS, list);
      return list[index];
    },
    
    // Calcular distância entre dois aeroportos (Haversine)
    calculateDistance: (origem: string, destino: string): number | null => {
      const aeroportoOrigem = db.airports.getByIcao(origem);
      const aeroportoDestino = db.airports.getByIcao(destino);
      
      if (!aeroportoOrigem || !aeroportoDestino) return null;
      
      const R = 3440.065; // Raio da Terra em NM
      const lat1 = aeroportoOrigem.latitude * Math.PI / 180;
      const lat2 = aeroportoDestino.latitude * Math.PI / 180;
      const deltaLat = (aeroportoDestino.latitude - aeroportoOrigem.latitude) * Math.PI / 180;
      const deltaLon = (aeroportoDestino.longitude - aeroportoOrigem.longitude) * Math.PI / 180;
      
      const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
                Math.cos(lat1) * Math.cos(lat2) *
                Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      
      return R * c;
    },
  },

  // ==========================================
  // FLIGHT ESTIMATES
  // ==========================================
  flightEstimates: {
    getAll: (): FlightEstimate[] => getItem<FlightEstimate>(KEYS.FLIGHT_ESTIMATES),
    
    getByUser: (usuarioId: string): FlightEstimate[] => {
      return getItem<FlightEstimate>(KEYS.FLIGHT_ESTIMATES)
        .filter(e => e.usuarioId === usuarioId)
        .sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime());
    },
    
    getById: (id: string): FlightEstimate | undefined => {
      return getItem<FlightEstimate>(KEYS.FLIGHT_ESTIMATES).find(e => e.id === id);
    },
    
    create: (data: Omit<FlightEstimate, 'id' | 'criadoEm'>): FlightEstimate => {
      const estimate: FlightEstimate = {
        ...data,
        id: generateId(),
        criadoEm: now(),
      };
      const list = getItem<FlightEstimate>(KEYS.FLIGHT_ESTIMATES);
      list.push(estimate);
      setItem(KEYS.FLIGHT_ESTIMATES, list);
      return estimate;
    },
    
    convertToFlight: (estimateId: string): Flight | null => {
      const estimate = db.flightEstimates.getById(estimateId);
      if (!estimate || estimate.convertidoEmVoo) return null;
      
      const flight = db.flights.create({
        aeronaveId: estimate.aeronaveId,
        pilotoId: estimate.usuarioId,
        data: estimate.data,
        origem: estimate.origem,
        destino: estimate.destino,
        escalas: [],
        tempoVoo: estimate.tempoVooEstimado,
        horasMotor: estimate.tempoVooEstimado,
        horasCelula: estimate.tempoVooEstimado,
        ciclos: estimate.escalas.length + 1,
        combustivelConsumido: estimate.combustivelEstimado,
        custoCombustivel: estimate.custoCombustivel,
        custoTaxas: estimate.custoTaxas,
        status: 'planejado',
      });
      
      // Atualizar estimativa
      const list = getItem<FlightEstimate>(KEYS.FLIGHT_ESTIMATES);
      const index = list.findIndex(e => e.id === estimateId);
      if (index !== -1) {
        list[index].convertidoEmVoo = true;
        list[index].vooId = flight.id;
        setItem(KEYS.FLIGHT_ESTIMATES, list);
      }
      
      return flight;
    },
    
    delete: (id: string): boolean => {
      const list = getItem<FlightEstimate>(KEYS.FLIGHT_ESTIMATES);
      setItem(KEYS.FLIGHT_ESTIMATES, list.filter(e => e.id !== id));
      return true;
    },
  },

  // ==========================================
  // AIRCRAFT CONFIG
  // ==========================================
  aircraftConfigs: {
    getByAircraft: (aeronaveId: string): AircraftConfig | undefined => {
      return getItem<AircraftConfig>(KEYS.AIRCRAFT_CONFIGS).find(c => c.aeronaveId === aeronaveId);
    },
    
    createOrUpdate: (aeronaveId: string, data: Partial<AircraftConfig>): AircraftConfig => {
      const list = getItem<AircraftConfig>(KEYS.AIRCRAFT_CONFIGS);
      const index = list.findIndex(c => c.aeronaveId === aeronaveId);
      
      if (index === -1) {
        const config: AircraftConfig = {
          id: generateId(),
          aeronaveId,
          custoHoraOperacional: data.custoHoraOperacional || 0,
          custoHoraDepreciacao: data.custoHoraDepreciacao,
          custoHoraSeguro: data.custoHoraSeguro,
          reservaMotor: data.reservaMotor,
          reservaCombustivelMinutos: data.reservaCombustivelMinutos || 45,
          margemSegurancaPercentual: data.margemSegurancaPercentual || 10,
          alertaManutencaoHoras: data.alertaManutencaoHoras || 10,
          alertaManutencaoDias: data.alertaManutencaoDias || 15,
          alertaDocumentoDias: data.alertaDocumentoDias || 30,
          bloquearSeVencido: data.bloquearSeVencido ?? true,
        };
        list.push(config);
        setItem(KEYS.AIRCRAFT_CONFIGS, list);
        return config;
      } else {
        list[index] = { ...list[index], ...data };
        setItem(KEYS.AIRCRAFT_CONFIGS, list);
        return list[index];
      }
    },
  },

  // ==========================================
  // AUDIT LOGS
  // ==========================================
  auditLogs: {
    getAll: (): AuditLog[] => getItem<AuditLog>(KEYS.AUDIT_LOGS),
    
    getByEntity: (entidade: string, entidadeId: string): AuditLog[] => {
      return getItem<AuditLog>(KEYS.AUDIT_LOGS).filter(l => 
        l.entidade === entidade && l.entidadeId === entidadeId
      );
    },
    
    getByUser: (usuarioId: string): AuditLog[] => {
      return getItem<AuditLog>(KEYS.AUDIT_LOGS).filter(l => l.usuarioId === usuarioId);
    },
  },

  // ==========================================
  // INITIALIZATION
  // ==========================================
  init: (): void => {
    // Criar usuário admin padrão se não existir
    const users = db.users.getAll();
    if (users.length === 0) {
      const admin = db.users.create({
        nome: 'Administrador',
        email: 'admin@aerogest.com',
        role: 'admin',
        licencas: [],
        horasTotais: 0,
        ativo: true,
      });
      db.users.setCurrentUser(admin);
    }

    // Inicializar alguns aeroportos brasileiros se não existirem
    const airports = db.airports.getAll();
    if (airports.length === 0) {
      const defaultAirports: Airport[] = [
        { icao: 'SBSP', iata: 'CGH', nome: 'Aeroporto de Congonhas', cidade: 'São Paulo', estado: 'SP', pais: 'Brasil', latitude: -23.6261, longitude: -46.6564, elevacao: 2631 },
        { icao: 'SBGR', iata: 'GRU', nome: 'Aeroporto Internacional de Guarulhos', cidade: 'Guarulhos', estado: 'SP', pais: 'Brasil', latitude: -23.4356, longitude: -46.4731, elevacao: 2459 },
        { icao: 'SBRJ', iata: 'SDU', nome: 'Aeroporto Santos Dumont', cidade: 'Rio de Janeiro', estado: 'RJ', pais: 'Brasil', latitude: -22.9105, longitude: -43.1631, elevacao: 11 },
        { icao: 'SBGL', iata: 'GIG', nome: 'Aeroporto Internacional do Galeão', cidade: 'Rio de Janeiro', estado: 'RJ', pais: 'Brasil', latitude: -22.8090, longitude: -43.2506, elevacao: 28 },
        { icao: 'SBBR', iata: 'BSB', nome: 'Aeroporto Internacional de Brasília', cidade: 'Brasília', estado: 'DF', pais: 'Brasil', latitude: -15.8711, longitude: -47.9186, elevacao: 3497 },
        { icao: 'SBCF', iata: 'CNF', nome: 'Aeroporto Internacional de Confins', cidade: 'Belo Horizonte', estado: 'MG', pais: 'Brasil', latitude: -19.6244, longitude: -43.9719, elevacao: 2715 },
        { icao: 'SBPA', iata: 'POA', nome: 'Aeroporto Internacional Salgado Filho', cidade: 'Porto Alegre', estado: 'RS', pais: 'Brasil', latitude: -29.9944, longitude: -51.1714, elevacao: 10 },
        { icao: 'SBCT', iata: 'CWB', nome: 'Aeroporto Internacional Afonso Pena', cidade: 'Curitiba', estado: 'PR', pais: 'Brasil', latitude: -25.5285, longitude: -49.1758, elevacao: 2988 },
        { icao: 'SBSV', iata: 'SSA', nome: 'Aeroporto Internacional de Salvador', cidade: 'Salvador', estado: 'BA', pais: 'Brasil', latitude: -12.9086, longitude: -38.3225, elevacao: 64 },
        { icao: 'SBRF', iata: 'REC', nome: 'Aeroporto Internacional do Recife', cidade: 'Recife', estado: 'PE', pais: 'Brasil', latitude: -8.1264, longitude: -34.9236, elevacao: 33 },
        { icao: 'SBKP', iata: 'VCP', nome: 'Aeroporto Internacional de Viracopos', cidade: 'Campinas', estado: 'SP', pais: 'Brasil', latitude: -23.0074, longitude: -47.1345, elevacao: 2170 },
        { icao: 'SBJD', nome: 'Aeroporto de Jundiaí', cidade: 'Jundiaí', estado: 'SP', pais: 'Brasil', latitude: -23.1806, longitude: -46.9436, elevacao: 2484 },
        { icao: 'SDCO', nome: 'Aeroporto Campo de Marte', cidade: 'São Paulo', estado: 'SP', pais: 'Brasil', latitude: -23.5092, longitude: -46.6378, elevacao: 2368 },
      ];
      defaultAirports.forEach(a => db.airports.create(a));
    }
  },
};

// Inicializar banco de dados
db.init();
