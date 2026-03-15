import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);

  /**
   * Fetches current temperature for a given latitude and longitude.
   * Defaults to Mumbai (19.0760, 72.8777).
   */
  async getCurrentTemperature(lat: number = 19.0760, lon: number = 72.8777): Promise<number> {
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Weather fetch failed');
      
      const data = await response.json();
      const temp = data.current_weather?.temperature;
      
      if (typeof temp !== 'number') {
        throw new Error('Invalid temperature data');
      }
      
      this.logger.debug(`Current temperature at (${lat}, ${lon}): ${temp}°C`);
      return temp;
    } catch (error) {
      this.logger.error(`Error fetching weather: ${error.message}`);
      // Fallback to a mild temperature
      return 25;
    }
  }

  /**
   * Helper to determine weather category based on temperature.
   */
  getWeatherType(temp: number): 'cold' | 'mild' | 'hot' {
    if (temp < 15) return 'cold';
    if (temp > 28) return 'hot';
    return 'mild';
  }
}
