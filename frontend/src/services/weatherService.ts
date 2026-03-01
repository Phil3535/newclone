// Weather Service using Open-Meteo (free, no API key required)

interface WeatherData {
  temperature: number;
  condition: string;
  icon: string;
  humidity: number;
  windSpeed: number;
  description: string;
  forecast: ForecastDay[];
}

interface ForecastDay {
  date: string;
  dayName: string;
  tempMax: number;
  tempMin: number;
  condition: string;
  icon: string;
}

// Weather code mapping
const weatherCodeMap: Record<number, { condition: string; icon: string; description: string }> = {
  0: { condition: 'Clear', icon: 'sunny', description: 'Clear sky' },
  1: { condition: 'Mostly Clear', icon: 'partly-sunny', description: 'Mainly clear' },
  2: { condition: 'Partly Cloudy', icon: 'partly-sunny', description: 'Partly cloudy' },
  3: { condition: 'Cloudy', icon: 'cloudy', description: 'Overcast' },
  45: { condition: 'Foggy', icon: 'cloudy', description: 'Fog' },
  48: { condition: 'Foggy', icon: 'cloudy', description: 'Depositing rime fog' },
  51: { condition: 'Light Drizzle', icon: 'rainy', description: 'Light drizzle' },
  53: { condition: 'Drizzle', icon: 'rainy', description: 'Moderate drizzle' },
  55: { condition: 'Heavy Drizzle', icon: 'rainy', description: 'Dense drizzle' },
  61: { condition: 'Light Rain', icon: 'rainy', description: 'Slight rain' },
  63: { condition: 'Rain', icon: 'rainy', description: 'Moderate rain' },
  65: { condition: 'Heavy Rain', icon: 'rainy', description: 'Heavy rain' },
  71: { condition: 'Light Snow', icon: 'snow', description: 'Slight snow' },
  73: { condition: 'Snow', icon: 'snow', description: 'Moderate snow' },
  75: { condition: 'Heavy Snow', icon: 'snow', description: 'Heavy snow' },
  77: { condition: 'Snow Grains', icon: 'snow', description: 'Snow grains' },
  80: { condition: 'Light Showers', icon: 'rainy', description: 'Slight rain showers' },
  81: { condition: 'Showers', icon: 'rainy', description: 'Moderate rain showers' },
  82: { condition: 'Heavy Showers', icon: 'thunderstorm', description: 'Violent rain showers' },
  95: { condition: 'Thunderstorm', icon: 'thunderstorm', description: 'Thunderstorm' },
  96: { condition: 'Thunderstorm', icon: 'thunderstorm', description: 'Thunderstorm with hail' },
  99: { condition: 'Severe Storm', icon: 'thunderstorm', description: 'Thunderstorm with heavy hail' },
};

const getWeatherInfo = (code: number) => {
  return weatherCodeMap[code] || { condition: 'Unknown', icon: 'cloudy', description: 'Unknown' };
};

const getDayName = (dateStr: string): string => {
  const date = new Date(dateStr);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  return date.toLocaleDateString('en-US', { weekday: 'short' });
};

export async function getWeatherByAddress(address: string): Promise<WeatherData | null> {
  try {
    // First, geocode the address using Nominatim (free)
    const geocodeUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`;
    const geoResponse = await fetch(geocodeUrl, {
      headers: { 'User-Agent': 'SolarEmpireApp/1.0' }
    });
    const geoData = await geoResponse.json();
    
    if (!geoData || geoData.length === 0) {
      console.log('Could not geocode address');
      return null;
    }
    
    const { lat, lon } = geoData[0];
    return getWeatherByCoords(parseFloat(lat), parseFloat(lon));
  } catch (error) {
    console.error('Error getting weather by address:', error);
    return null;
  }
}

export async function getWeatherByCoords(lat: number, lon: number): Promise<WeatherData | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=7`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data.current) return null;
    
    const currentWeather = getWeatherInfo(data.current.weather_code);
    
    const forecast: ForecastDay[] = data.daily.time.map((date: string, i: number) => {
      const dayWeather = getWeatherInfo(data.daily.weather_code[i]);
      return {
        date,
        dayName: getDayName(date),
        tempMax: Math.round(data.daily.temperature_2m_max[i]),
        tempMin: Math.round(data.daily.temperature_2m_min[i]),
        condition: dayWeather.condition,
        icon: dayWeather.icon,
      };
    });
    
    return {
      temperature: Math.round(data.current.temperature_2m),
      condition: currentWeather.condition,
      icon: currentWeather.icon,
      humidity: data.current.relative_humidity_2m,
      windSpeed: Math.round(data.current.wind_speed_10m),
      description: currentWeather.description,
      forecast,
    };
  } catch (error) {
    console.error('Error fetching weather:', error);
    return null;
  }
}

export function isGoodSolarDay(weatherCode: number): boolean {
  // Good solar days: clear, mostly clear, partly cloudy
  return [0, 1, 2].includes(weatherCode);
}

export function getSolarRating(weatherCode: number): { rating: number; label: string; color: string } {
  if ([0, 1].includes(weatherCode)) return { rating: 5, label: 'Excellent', color: '#22c55e' };
  if ([2].includes(weatherCode)) return { rating: 4, label: 'Good', color: '#84cc16' };
  if ([3, 45, 48].includes(weatherCode)) return { rating: 3, label: 'Fair', color: '#f59e0b' };
  if ([51, 53, 55, 61, 63].includes(weatherCode)) return { rating: 2, label: 'Poor', color: '#f97316' };
  return { rating: 1, label: 'Bad', color: '#ef4444' };
}
