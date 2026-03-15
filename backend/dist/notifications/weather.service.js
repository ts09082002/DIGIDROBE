"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var WeatherService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WeatherService = void 0;
const common_1 = require("@nestjs/common");
let WeatherService = WeatherService_1 = class WeatherService {
    logger = new common_1.Logger(WeatherService_1.name);
    async getCurrentTemperature(lat = 19.0760, lon = 72.8777) {
        try {
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;
            const response = await fetch(url);
            if (!response.ok)
                throw new Error('Weather fetch failed');
            const data = await response.json();
            const temp = data.current_weather?.temperature;
            if (typeof temp !== 'number') {
                throw new Error('Invalid temperature data');
            }
            this.logger.debug(`Current temperature at (${lat}, ${lon}): ${temp}°C`);
            return temp;
        }
        catch (error) {
            this.logger.error(`Error fetching weather: ${error.message}`);
            return 25;
        }
    }
    getWeatherType(temp) {
        if (temp < 15)
            return 'cold';
        if (temp > 28)
            return 'hot';
        return 'mild';
    }
};
exports.WeatherService = WeatherService;
exports.WeatherService = WeatherService = WeatherService_1 = __decorate([
    (0, common_1.Injectable)()
], WeatherService);
//# sourceMappingURL=weather.service.js.map