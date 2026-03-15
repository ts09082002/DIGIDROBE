export declare class WeatherService {
    private readonly logger;
    getCurrentTemperature(lat?: number, lon?: number): Promise<number>;
    getWeatherType(temp: number): 'cold' | 'mild' | 'hot';
}
