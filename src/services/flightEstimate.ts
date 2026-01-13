import { 
  EnhancedFlightEstimate, 
  FlightProfile, 
  ConfidenceLevel,
  AircraftModelSpecs,
  PerformanceEstimate
} from '../types';
import { aircraftSpecsService } from './aircraftSpecs';
import { airportService } from './airports';
import { weatherService } from './weather';

/**
 * Calcula distância great-circle (Haversine) entre dois pontos
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3440; // Raio da Terra em NM
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calcula componente de vento (headwind/tailwind)
 */
function calculateWindComponent(
  windSpeed: number,
  windDirection: number, // graus (0-360)
  course: number // graus (0-360)
): number {
  const angle = (windDirection - course) * Math.PI / 180;
  return windSpeed * Math.cos(angle); // Positivo = headwind, negativo = tailwind
}

/**
 * Calcula tempo de subida baseado em rate of climb
 */
function calculateClimbTime(
  climbRate: number | undefined, // fpm
  cruiseAltitude: number, // ft
  defaultClimbRate: number = 1000 // fpm padrão
): number {
  const rate = climbRate || defaultClimbRate;
  if (rate <= 0) return 15; // 15 min default
  
  // Assumindo partida do nível do mar
  const timeMinutes = cruiseAltitude / rate;
  return Math.max(5, Math.min(30, timeMinutes)); // Entre 5 e 30 minutos
}

/**
 * Calcula tempo de descida
 */
function calculateDescentTime(
  descentRate: number = 500, // fpm padrão
  cruiseAltitude: number // ft
): number {
  const timeMinutes = cruiseAltitude / descentRate;
  return Math.max(5, Math.min(20, timeMinutes)); // Entre 5 e 20 minutos
}

interface EstimateParams {
  aircraftId: string;
  manufacturer: string;
  model: string;
  variant?: string;
  year?: number;
  originICAO: string;
  destICAO: string;
  profile?: FlightProfile;
  altitude?: number; // ft
  flightDate?: string;
  passengers?: number;
  baggage?: number; // lbs
  initialFuel?: number; // litros
  taxiTime?: number; // minutos
  customFuelPrice?: number; // R$/L
}

class FlightEstimateService {
  /**
   * Calcula estimativa completa de voo
   */
  async calculateEstimate(params: EstimateParams): Promise<EnhancedFlightEstimate> {
    // 1. Busca specs da aeronave
    const specs = await aircraftSpecsService.getAircraftSpecs(
      params.manufacturer,
      params.model,
      params.variant,
      params.year
    );

    if (!specs) {
      throw new Error('Especificações da aeronave não encontradas');
    }

    // 2. Busca aeroportos
    await airportService.loadAirports();
    const origin = airportService.findByCode(params.originICAO);
    const dest = airportService.findByCode(params.destICAO);

    if (!origin || !dest) {
      throw new Error('Aeroporto não encontrado');
    }

    // 3. Calcula distância
    const distanceNM = calculateDistance(
      origin.latitude_deg,
      origin.longitude_deg,
      dest.latitude_deg,
      dest.longitude_deg
    );

    // 4. Busca performance estimada
    const performance = aircraftSpecsService.estimatePerformance(
      specs,
      params.profile || 'normal'
    );

    // 5. Busca vento (se data fornecida)
    const altitude = params.altitude || specs.cruiseAltitude?.typical || 10000;
    let weather = null;
    let windComponent = 0;

    if (params.flightDate) {
      try {
        weather = await weatherService.getWindAtAltitude(
          (origin.latitude_deg + dest.latitude_deg) / 2,
          (origin.longitude_deg + dest.longitude_deg) / 2,
          altitude,
          params.flightDate
        );

        if (weather) {
          // Calcula rumo aproximado
          const course = Math.atan2(
            dest.longitude_deg - origin.longitude_deg,
            dest.latitude_deg - origin.latitude_deg
          ) * 180 / Math.PI;

          windComponent = calculateWindComponent(
            weather.windSpeed,
            weather.windDirection,
            course
          );
        }
      } catch (e) {
        console.warn('Erro ao buscar vento:', e);
      }
    }

    // 6. Calcula velocidade efetiva (TAS → GS)
    const tas = performance.cruiseSpeed.value;
    const gs = tas - windComponent; // Headwind reduz GS

    // 7. Calcula tempos por fase
    const taxiTime = params.taxiTime || 10;
    const climbTime = calculateClimbTime(
      performance.rateOfClimb?.value,
      altitude
    );
    const descentTime = calculateDescentTime(500, altitude);
    
    // Distância de subida/descida aproximada (assumindo ângulo 3:1)
    const climbDistance = (altitude / 1000) * 3; // NM aproximado
    const descentDistance = (altitude / 1000) * 3;
    const cruiseDistance = Math.max(0, distanceNM - climbDistance - descentDistance);

    const cruiseTime = cruiseDistance / gs; // horas
    const totalFlightTime = (climbTime + cruiseTime * 60 + descentTime) / 60; // horas
    const totalBlockTime = totalFlightTime + (taxiTime / 60);

    // 8. Calcula combustível por fase
    const fuelClimb = (climbTime / 60) * performance.fuelBurn.climb;
    const fuelCruise = cruiseTime * performance.fuelBurn.cruise;
    const fuelDescent = (descentTime / 60) * performance.fuelBurn.descent;
    const fuelTaxi = (taxiTime / 60) * performance.fuelBurn.cruise * 0.3;
    
    const fuelNecessary = fuelClimb + fuelCruise + fuelDescent + fuelTaxi;
    
    // Reserva (45 min padrão)
    const reserveMinutes = 45;
    const fuelReserve = (reserveMinutes / 60) * performance.fuelBurn.cruise;
    const fuelTotal = fuelNecessary + fuelReserve;

    // 9. Calcula custos
    const fuelPrice = params.customFuelPrice || 
                      origin.fuelPrice?.[specs.fuelType || 'jet-a'] || 
                      8.5; // R$/L default
    
    const costFuel = fuelTotal * fuelPrice;
    const costLandingFee = (origin.landingFee || 0) + (dest.landingFee || 0);
    const costParking = (origin.parkingFee || 0) + (dest.parkingFee || 0);
    
    // Custo operacional (R$ 2.800/h obrigatório)
    const costOperational = totalBlockTime * 2800;
    
    const costTotal = costFuel + costLandingFee + costParking + costOperational;

    // 10. Determina confiança
    const confidence = this.calculateConfidence(performance, weather, specs);
    const confidenceReasons = this.getConfidenceReasons(performance, weather, specs);
    
    // 11. Calcula incerteza (intervalos)
    const uncertainty = this.calculateUncertainty(
      totalFlightTime,
      fuelTotal,
      costTotal,
      confidence,
      performance
    );

    // 12. Monta estimativa
    const estimate: EnhancedFlightEstimate = {
      id: crypto.randomUUID(),
      aircraftId: params.aircraftId,
      criadoPor: '', // Será preenchido pelo componente
      origem: origin.name,
      origemIcao: origin.gps_code || origin.ident,
      destino: dest.name,
      destinoIcao: dest.gps_code || dest.ident,
      distanciaTotal: distanceNM,
      tempoVooEstimado: totalFlightTime,
      tempoTotal: totalBlockTime,
      combustivelNecessario: fuelNecessary,
      combustivelComReserva: fuelTotal,
      custoCombustivel: costFuel,
      custoTaxas: costLandingFee,
      custoOperacional: costOperational,
      custoTotal: costTotal,
      custoPorHora: totalBlockTime > 0 ? costTotal / totalBlockTime : 0,
      convertidoEmVoo: false,
      createdAt: new Date().toISOString(),
      
      // Campos aprimorados
      profile: params.profile || 'normal',
      passengers: params.passengers,
      baggage: params.baggage,
      initialFuel: params.initialFuel,
      altitude,
      flightDate: params.flightDate,
      
      phases: {
        taxi: {
          time: taxiTime,
          fuel: fuelTaxi,
        },
        climb: {
          time: climbTime,
          fuel: fuelClimb,
          altitude,
        },
        cruise: {
          time: cruiseTime * 60, // minutos
          fuel: fuelCruise,
          tas,
          gs,
          windComponent,
          altitude,
        },
        descent: {
          time: descentTime,
          fuel: fuelDescent,
        },
      },
      
      weather: weather || undefined,
      confidence,
      confidenceReasons,
      uncertainty,
      
      costBreakdown: {
        fuel: costFuel,
        fuelTax: 0, // TODO: calcular imposto sobre combustível
        landingFee: costLandingFee,
        parkingFee: costParking,
        operational: costOperational,
        total: costTotal,
      },
      
      costPerHour: totalBlockTime > 0 ? costTotal / totalBlockTime : 0,
      costPerNM: distanceNM > 0 ? costTotal / distanceNM : 0,
      costPerKM: distanceNM > 0 ? (costTotal / distanceNM) * 1.852 : 0,
      fuelPerHour: totalFlightTime > 0 ? fuelTotal / totalFlightTime : 0,
      efficiency: fuelTotal > 0 ? distanceNM / (fuelTotal / 3.785) : 0, // NM/galão (assumindo litros)
    };

    return estimate;
  }

  /**
   * Calcula nível de confiança da estimativa
   */
  private calculateConfidence(
    performance: PerformanceEstimate,
    weather: any,
    specs: AircraftModelSpecs
  ): ConfidenceLevel {
    let score = 0;

    // Performance conhecida vs estimada
    if (performance.cruiseSpeed.method === 'known') score += 3;
    else if (performance.cruiseSpeed.method === 'ml') score += 2;
    else score += 1;

    if (performance.fuelBurn.method === 'known') score += 3;
    else if (performance.fuelBurn.method === 'ml') score += 2;
    else score += 1;

    // Vento disponível
    if (weather) score += 2;
    else score += 0;

    // Specs completas
    if (specs.isComplete) score += 2;
    else score += 1;

    // Normaliza para alta/média/baixa
    if (score >= 8) return 'alta';
    if (score >= 5) return 'media';
    return 'baixa';
  }

  /**
   * Retorna razões para o nível de confiança
   */
  private getConfidenceReasons(
    performance: PerformanceEstimate,
    weather: any,
    specs: AircraftModelSpecs
  ): string[] {
    const reasons: string[] = [];

    if (performance.cruiseSpeed.method === 'ml') {
      reasons.push('Velocidade de cruzeiro estimada por modelo ML');
    } else if (performance.cruiseSpeed.method === 'heuristic') {
      reasons.push('Velocidade de cruzeiro estimada por heurística');
    }

    if (performance.fuelBurn.method === 'ml') {
      reasons.push('Consumo de combustível estimado por modelo ML');
    } else if (performance.fuelBurn.method === 'heuristic') {
      reasons.push('Consumo de combustível estimado por heurística');
    }

    if (!weather) {
      reasons.push('Vento não disponível - usando vento = 0');
    }

    if (!specs.isComplete) {
      reasons.push(`Dados faltantes: ${specs.missingFields.join(', ')}`);
    }

    return reasons;
  }

  /**
   * Calcula intervalos de incerteza
   */
  private calculateUncertainty(
    time: number,
    fuel: number,
    cost: number,
    confidence: ConfidenceLevel,
    performance: PerformanceEstimate
  ) {
    let multiplier: number;

    switch (confidence) {
      case 'alta':
        multiplier = 0.05; // ±5%
        break;
      case 'media':
        multiplier = 0.15; // ±15%
        break;
      case 'baixa':
        multiplier = 0.30; // ±30%
        break;
    }

    // Ajusta pela confiança da performance
    if (performance.cruiseSpeed.confidence === 'baixa') multiplier += 0.1;
    if (performance.fuelBurn.confidence === 'baixa') multiplier += 0.1;

    return {
      timeMin: Math.max(0, time * (1 - multiplier)),
      timeMax: time * (1 + multiplier),
      fuelMin: Math.max(0, fuel * (1 - multiplier)),
      fuelMax: fuel * (1 + multiplier),
      costMin: Math.max(0, cost * (1 - multiplier)),
      costMax: cost * (1 + multiplier),
    };
  }
}

export const flightEstimateService = new FlightEstimateService();