import { Item } from "@prisma/client";
import prices from '../data/prices.json';

export function getItemPrice(item: Item): number {
    let key = item.name;
    if (item.wear) {
        key += ` (${item.wear})`
    }

    const price = prices[key]?.steam || null;

    return price.last_24h || price.last_ever || 0;
}