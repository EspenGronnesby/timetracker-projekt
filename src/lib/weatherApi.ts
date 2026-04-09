/**
 * Weather API helper using met.no LocationForecast API
 * Free Norwegian weather data, no API key needed
 */

export interface WeatherData {
  temperature: number;
  precipitation: number;
  windSpeed: number;
  symbol: string;
  weatherType: 'sunny' | 'cloudy' | 'rain' | 'snow' | 'storm' | 'partly-cloudy';
  severity: 'good' | 'warning' | 'danger';
}

export interface WeatherForecast {
  current: WeatherData;
  tomorrow: WeatherData;
  location: string;
}

// Default location: Oslo, Norway
const DEFAULT_LAT = 59.9139;
const DEFAULT_LON = 10.7522;

/**
 * Fetch weather data from met.no API
 * @param latitude Latitude of location
 * @param longitude Longitude of location
 * @returns Weather forecast data
 */
export async function fetchWeatherData(
  latitude: number = DEFAULT_LAT,
  longitude: number = DEFAULT_LON
): Promise<WeatherForecast | null> {
  try {
    const url = `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${latitude}&lon=${longitude}`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'TimeTrackerApp/1.0',
      },
    });

    if (!response.ok) {
      console.error('Failed to fetch weather data:', response.statusText);
      return null;
    }

    const data = await response.json();
    const timeseries = data.properties.timeseries;

    if (!timeseries || timeseries.length === 0) {
      return null;
    }

    // Current weather (first entry)
    const current = timeseries[0];
    const currentData = parseWeatherData(current);

    // Tomorrow's weather (find entry ~24 hours ahead)
    const tomorrowIndex = timeseries.findIndex((entry: any, index: number) => {
      const entryTime = new Date(entry.time);
      const now = new Date();
      const hoursDiff = (entryTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      return hoursDiff >= 20 && hoursDiff <= 28;
    });

    const tomorrow = tomorrowIndex >= 0 ? timeseries[tomorrowIndex] : timeseries[Math.min(8, timeseries.length - 1)];
    const tomorrowData = parseWeatherData(tomorrow);

    return {
      current: currentData,
      tomorrow: tomorrowData,
      location: 'Norge', // Default location name
    };
  } catch (error) {
    console.error('Error fetching weather data:', error);
    return null;
  }
}

/**
 * Parse weather data from met.no timeseries entry
 */
function parseWeatherData(entry: any): WeatherData {
  const instant = entry.data.instant.details;
  const next1h = entry.data.next_1_hours;
  const next6h = entry.data.next_6_hours;
  
  const temperature = instant.air_temperature || 0;
  const precipitation = next1h?.details?.precipitation_amount || next6h?.details?.precipitation_amount || 0;
  const windSpeed = instant.wind_speed || 0;
  const symbolCode = next1h?.summary?.symbol_code || next6h?.summary?.symbol_code || 'clearsky_day';

  const weatherType = getWeatherType(symbolCode, temperature, precipitation);
  const severity = getWeatherSeverity(temperature, precipitation, windSpeed);

  return {
    temperature,
    precipitation,
    windSpeed,
    symbol: symbolCode,
    weatherType,
    severity,
  };
}

/**
 * Determine weather type from symbol code
 */
function getWeatherType(
  symbolCode: string,
  temperature: number,
  precipitation: number
): WeatherData['weatherType'] {
  const code = symbolCode.toLowerCase();

  if (code.includes('thunder') || code.includes('lightning')) {
    return 'storm';
  }

  if (temperature < 0 && precipitation > 0.5) {
    return 'snow';
  }

  if (code.includes('rain') || precipitation > 1) {
    return 'rain';
  }

  if (code.includes('partlycloudy') || code.includes('fair')) {
    return 'partly-cloudy';
  }

  if (code.includes('cloudy') || code.includes('fog')) {
    return 'cloudy';
  }

  return 'sunny';
}

/**
 * Determine weather severity
 */
function getWeatherSeverity(
  temperature: number,
  precipitation: number,
  windSpeed: number
): WeatherData['severity'] {
  // Danger: Storm or heavy snow/rain
  if (windSpeed > 10 || precipitation > 5 || (temperature < -10 && precipitation > 1)) {
    return 'danger';
  }

  // Warning: Rain, snow, or moderate wind
  if (precipitation > 1 || windSpeed > 7 || (temperature < 0 && precipitation > 0.5)) {
    return 'warning';
  }

  return 'good';
}

/**
 * Get weather description in Norwegian
 */
export function getWeatherDescription(weather: WeatherData): string {
  switch (weather.weatherType) {
    case 'sunny':
      return 'Sol';
    case 'partly-cloudy':
      return 'Delvis skyet';
    case 'cloudy':
      return 'Overskyet';
    case 'rain':
      return 'Regn';
    case 'snow':
      return 'Snø';
    case 'storm':
      return 'Storm';
    default:
      return 'Ukjent';
  }
}
