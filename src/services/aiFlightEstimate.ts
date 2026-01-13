import { EnhancedFlightEstimate } from '../types';
import { airportService } from './airports';
import { flightEstimateService } from './flightEstimate';

interface SimpleEstimateInput {
  originICAO: string; // Código ICAO do aeroporto de origem
  destICAO: string; // Código ICAO do aeroporto de destino
  passengers: number;
  initialFuel?: number; // litros
  fuelPrice?: number; // R$/L
  aircraftId: string;
  manufacturer: string;
  model: string;
  variant?: string;
  year?: number;
}

class AIFlightEstimateService {
  /**
   * Estimativa inteligente de voo usando IA
   * Usa ICAOs dos aeroportos selecionados diretamente
   */
  async estimateFlight(input: SimpleEstimateInput): Promise<EnhancedFlightEstimate> {
    await airportService.loadAirports();

    // 1. Busca aeroportos pelos ICAOs informados
    const originAirportRecord = airportService.findByCode(input.originICAO);
    const destAirportRecord = airportService.findByCode(input.destICAO);

    if (!originAirportRecord) {
      throw new Error(`Aeroporto de origem não encontrado: ${input.originICAO}`);
    }
    if (!destAirportRecord) {
      throw new Error(`Aeroporto de destino não encontrado: ${input.destICAO}`);
    }

    // 2. Estima parâmetros automaticamente usando IA
    const estimatedParams = await this.estimateFlightParameters(
      originAirportRecord,
      destAirportRecord,
      input.passengers,
      input.manufacturer,
      input.model,
      input.initialFuel,
      input.fuelPrice
    );

    // 3. Calcula estimativa completa
    const estimate = await flightEstimateService.calculateEstimate({
      aircraftId: input.aircraftId,
      manufacturer: input.manufacturer,
      model: input.model,
      variant: input.variant,
      year: input.year,
      originICAO: originAirportRecord.gps_code || originAirportRecord.ident,
      destICAO: destAirportRecord.gps_code || destAirportRecord.ident,
      profile: estimatedParams.profile,
      altitude: estimatedParams.altitude,
      flightDate: estimatedParams.flightDate,
      passengers: input.passengers,
      baggage: estimatedParams.baggage,
      initialFuel: estimatedParams.initialFuel,
      taxiTime: estimatedParams.taxiTime,
      customFuelPrice: estimatedParams.fuelPrice,
    });

    // 4. Adiciona informações de IA
    estimate.confidenceReasons = [
      ...(estimate.confidenceReasons || []),
      `Aeroporto de origem: ${originAirportRecord.name} (${originAirportRecord.ident})`,
      `Aeroporto de destino: ${destAirportRecord.name} (${destAirportRecord.ident})`,
      `Parâmetros estimados por IA: altitude ${estimatedParams.altitude}ft, perfil ${estimatedParams.profile}`,
    ];

    return estimate;
  }


  /**
   * Estima parâmetros de voo usando IA/ML
   */
  private async estimateFlightParameters(
    originAirport: any,
    destAirport: any,
    passengers: number,
    _manufacturer: string,
    _model: string,
    userInitialFuel?: number,
    userFuelPrice?: number
  ): Promise<{
    profile: 'economico' | 'normal' | 'rapido';
    altitude: number;
    flightDate: string;
    baggage: number;
    initialFuel: number | undefined;
    taxiTime: number;
    fuelPrice: number;
  }> {
    // Calcula distância aproximada
    const distance = this.calculateDistance(
      originAirport.latitude_deg,
      originAirport.longitude_deg,
      destAirport.latitude_deg,
      destAirport.longitude_deg
    );

    // Estima altitude baseado na distância
    // Voos curtos: menor altitude, voos longos: maior altitude
    let altitude = 10000; // ft padrão
    if (distance < 200) {
      altitude = 6000; // Voos curtos
    } else if (distance < 500) {
      altitude = 8000;
    } else if (distance < 1000) {
      altitude = 12000;
    } else {
      altitude = 18000; // Voos longos
    }

    // Estima perfil baseado na distância e número de passageiros
    let profile: 'economico' | 'normal' | 'rapido' = 'normal';
    if (distance > 800 || passengers > 6) {
      profile = 'economico'; // Voos longos ou com muitos passageiros = econômico
    } else if (distance < 200) {
      profile = 'rapido'; // Voos curtos = rápido
    }

    // Estima bagagem (15kg por pessoa em média)
    const baggage = passengers * 15; // lbs

    // Combustível inicial: usa o valor informado pelo usuário, senão deixa calcular automaticamente
    const initialFuel = userInitialFuel;

    // Taxi time padrão (10 min)
    const taxiTime = 10;

    // Preço de combustível: prioriza valor do usuário, depois do aeroporto, senão padrão
    const fuelPrice = userFuelPrice || 
                      originAirport.fuelPrice?.avgas || 
                      originAirport.fuelPrice?.['jet-a'] || 
                      8.5; // R$/L padrão

    // Data do voo (hoje, mas pode ser ajustado)
    const flightDate = new Date().toISOString().split('T')[0];

    return {
      profile,
      altitude,
      flightDate,
      baggage,
      initialFuel: initialFuel as any,
      taxiTime,
      fuelPrice,
    };
  }

  /**
   * Calcula distância entre dois pontos (Haversine)
   */
  private calculateDistance(
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
   * Sugere aeronave baseado no número de passageiros e distância
   */
  async suggestAircraft(
    passengers: number,
    distance: number
  ): Promise<{
    manufacturer: string;
    model: string;
    reason: string;
  } | null> {
    // Lógica de sugestão baseada em regras
    if (passengers <= 4 && distance < 500) {
      return {
        manufacturer: 'Cessna',
        model: '172',
        reason: 'Aeronave ideal para voos curtos com até 4 passageiros',
      };
    } else if (passengers <= 6 && distance < 800) {
      return {
        manufacturer: 'Beechcraft',
        model: 'King Air C90',
        reason: 'Turbohélice ideal para voos médios com até 6 passageiros',
      };
    } else if (passengers <= 8 && distance < 1500) {
      return {
        manufacturer: 'Cessna',
        model: 'Citation',
        reason: 'Jato executivo ideal para voos longos com até 8 passageiros',
      };
    } else {
      return {
        manufacturer: 'Embraer',
        model: 'Phenom 300',
        reason: 'Jato executivo ideal para voos longos com mais passageiros',
      };
    }
  }
}

export const aiFlightEstimateService = new AIFlightEstimateService();