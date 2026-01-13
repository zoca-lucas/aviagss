/**
 * Serviço de meteorologia para buscar vento em altitude
 * Usa APIs públicas como NOAA GFS ou fallback
 */

interface WindData {
  windSpeed: number; // kts
  windDirection: number; // graus (0-360)
  windAltitude: number; // ft
  temperature: number; // °C
  fetchedAt: string;
}

class WeatherService {
  /**
   * Busca vento em altitude para coordenadas específicas
   * Por enquanto retorna fallback (vento = 0) até implementar API real
   */
  async getWindAtAltitude(
    _latitude: number,
    _longitude: number,
    _altitude: number, // ft
    _date?: string // ISO date string
  ): Promise<WindData | null> {
    // TODO: Implementar integração com:
    // - NOAA GFS (Global Forecast System) via API pública
    // - Aviation Weather Center API
    // - Outros provedores gratuitos

    // Por enquanto retorna null (sem vento) ou dados mockados para desenvolvimento
    // Em produção, isso seria uma chamada real à API

    try {
      // Exemplo de como seria a integração (descomentar quando API estiver disponível):
      /*
      const response = await fetch(
        `https://api.example.com/wind?lat=${latitude}&lon=${longitude}&alt=${altitude}&date=${date}`
      );
      const data = await response.json();
      return {
        windSpeed: data.wind_speed_kts,
        windDirection: data.wind_direction_deg,
        windAltitude: altitude,
        temperature: data.temperature_c,
        fetchedAt: new Date().toISOString(),
      };
      */

      // Fallback: retorna null (sem vento)
      return null;

      // Para desenvolvimento/testes, pode retornar dados mockados:
      /*
      return {
        windSpeed: 15, // kts
        windDirection: 270, // oeste (headwind se voando para oeste)
        windAltitude: altitude,
        temperature: 15, // °C
        fetchedAt: new Date().toISOString(),
      };
      */
    } catch (error) {
      console.error('Erro ao buscar dados de vento:', error);
      return null;
    }
  }

  /**
   * Calcula altitude de densidade (Density Altitude)
   * Útil para ajustar performance em altas temperaturas/altitudes
   */
  calculateDensityAltitude(
    pressureAltitude: number, // ft
    temperature: number, // °C
    _dewpoint?: number // °C (opcional)
  ): number {
    // Fórmula simplificada de altitude de densidade
    // DA = PA + (120 * (OAT - ISA))
    // OAT = temperatura externa, ISA = temperatura padrão na altitude
    const isaTemp = 15 - (pressureAltitude / 1000) * 2; // -2°C por 1000ft
    const densityAltitude = pressureAltitude + (120 * (temperature - isaTemp));
    
    return Math.round(densityAltitude);
  }
}

export const weatherService = new WeatherService();