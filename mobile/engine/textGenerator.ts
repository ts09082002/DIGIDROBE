import { EngineWardrobeItem, RecommendationContext } from "./types";
import { normalizeCategory } from "../constants/categories";

/**
 * Generates a natural-sounding, contextual explanation for an AI outfit suggestion
 * based on the time of day, weather, occasion, location, and the actual items selected.
 */
export function generateOutfitDescription(
    outfitItems: EngineWardrobeItem[],
    context: RecommendationContext,
    location?: { city?: string; country?: string }
): string {
    if (!outfitItems || outfitItems.length === 0) {
        return "Start by adding some items to your wardrobe so I can style them for you.";
    }

    const { temperatureC, weather, timeOfDay, occasion } = context;
    const locStr = location?.city && location?.country ? ` in ${location.city}, ${location.country}` : 
                  location?.country ? ` in ${location.country}` : '';
    
    // Greeting
    let greeting = 'Hello!';
    if (timeOfDay === 'morning') greeting = 'Good morning!';
    if (timeOfDay === 'afternoon') greeting = 'Good afternoon!';
    if (timeOfDay === 'evening') greeting = 'Good evening!';
    if (timeOfDay === 'night') greeting = 'Good night!';

    // Weather Context
    let weatherCtx = `It's looking ${weather} today`;
    if (temperatureC > 28) weatherCtx = `It's quite hot outside (${temperatureC}°C)`;
    else if (temperatureC < 15) weatherCtx = `It's a bit chilly today (${temperatureC}°C)`;
    else if (weather === 'rainy') weatherCtx = `Looks like rain today`;
    else weatherCtx = `It's a pleasant ${temperatureC}°C ${weather} day`;

    // Parsing Outfit Items
    const top = outfitItems.find(i => normalizeCategory(i.category) === 'topwear');
    const bottom = outfitItems.find(i => normalizeCategory(i.category) === 'bottomwear');
    const dress = outfitItems.find(i => normalizeCategory(i.category) as string === 'dresses');
    const outer = outfitItems.find(i => normalizeCategory(i.category) === 'outerwear');
    const shoes = outfitItems.find(i => normalizeCategory(i.category) === 'footwear');
    const accs = outfitItems.filter(i => normalizeCategory(i.category) === 'accessories');

    // Occasion Logic
    let occStr: string = occasion;
    if (occasion === 'date') occStr = 'your date';
    if (occasion === 'work') occStr = 'the office';
    if (occasion === 'party') occStr = 'the party';

    let itemDesc = "I've picked out a great combination for you.";
    if (dress) {
         itemDesc = `I've selected the ${dress.primaryColor} ${dress.name} as a stylish centerpiece.`;
    } else if (top && bottom) {
         itemDesc = `I've paired your ${top.primaryColor} ${top.name} with the ${bottom.primaryColor} ${bottom.name}.`;
    } else if (top) {
         itemDesc = `I've styled your look around the ${top.primaryColor} ${top.name}.`;
    }

    let layersDesc = "";
    if (outer) {
        layersDesc += ` Because of the ${weather} weather, layering with the ${outer.name} is a smart choice.`;
    }
    if (shoes) {
        layersDesc += ` Finish the look with your ${shoes.name} for ${occasion === 'work' || occasion === 'date' ? 'a polished' : 'a comfortable'} feel.`;
    }
    if (accs.length > 0) {
        layersDesc += ` The ${accs[0].name} adds the perfect finishing touch.`;
    }

    return `${greeting} ${weatherCtx}${locStr}. For ${occStr}, ${itemDesc}${layersDesc} Stay stylish!`;
}
