import type { WeatherType } from '../engine/types';
import * as Location from 'expo-location';

export type WeatherInfo = {
    locationName?: string;
    temperatureC: number;
    weatherType: WeatherType;
    weatherDescription?: string;
    humidityPercent?: number;
};

function getGreetingTimeOfDay(now: Date) {
    const hour = now.getHours();
    if (hour >= 5 && hour <= 11) return 'morning';
    if (hour >= 12 && hour <= 16) return 'afternoon';
    if (hour >= 17 && hour <= 20) return 'evening';
    return 'night';
}

function mapOpenMeteoToWeatherType(weatherCode: number, humidityPercent?: number): WeatherType {
    // https://open-meteo.com/en/docs#weather-condition-codes
    if (humidityPercent != null && humidityPercent >= 70) {
        return 'humid';
    }

    // Clear
    if (weatherCode === 0) return 'sunny';

    // Mainly clear / partly cloudy / overcast
    if ([1, 2, 3].includes(weatherCode)) return 'cloudy';
    if ([45, 48].includes(weatherCode)) return 'cloudy'; // fog

    // Drizzle
    if ([51, 53, 55].includes(weatherCode)) return 'rainy';
    if ([56, 57].includes(weatherCode)) return 'snowy'; // freezing drizzle

    // Rain
    if ([61, 63, 65].includes(weatherCode)) return 'rainy';
    if ([66, 67].includes(weatherCode)) return 'snowy'; // freezing rain

    // Snow
    if ([71, 73, 75, 77, 85, 86].includes(weatherCode)) return 'snowy';

    // Thunderstorm
    if ([95, 96, 99].includes(weatherCode)) return 'stormy';

    // Fallback
    return 'dry';
}

export async function fetchLocationAndWeather(): Promise<WeatherInfo | null> {
    try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return null;

        const coords = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
        });

        const lat = coords.coords.latitude;
        const lon = coords.coords.longitude;

        // Reverse geocode (Open-Meteo free, no key needed)
        let locationName: string | undefined;
        try {
            const rev = await fetch(
                `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${lat}&longitude=${lon}&count=1&language=en`,
            );
            if (rev.ok) {
                const data = (await rev.json()) as any;
                const place = data?.results?.[0];
                locationName = place?.name ?? place?.admin1 ?? undefined;
            }
        } catch {
            // Non-critical
        }

        // Current weather (Open-Meteo free, no key needed)
        const weatherRes = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,relative_humidity_2m&timezone=auto`,
        );

        if (!weatherRes.ok) return null;
        const weatherJson = (await weatherRes.json()) as any;
        const current = weatherJson?.current;
        if (!current) return null;

        const temperatureC = Number(current.temperature_2m);
        const weatherCode = Number(current.weather_code);
        const humidityPercent = current.relative_humidity_2m != null ? Number(current.relative_humidity_2m) : undefined;
        const weatherType = mapOpenMeteoToWeatherType(weatherCode, humidityPercent);

        const weatherDescription = weatherJson?.current?.weather_description;

        return {
            locationName,
            temperatureC,
            weatherType,
            weatherDescription,
            humidityPercent,
        };
    } catch {
        return null;
    }
}

export function getTimeOfDayForGreeting(now: Date): 'morning' | 'afternoon' | 'evening' | 'night' {
    return getGreetingTimeOfDay(now) as any;
}

