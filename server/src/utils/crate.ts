import skins from '../data/skins.json';
import crates from '../data/crates.json';
import { numberBetween } from './rand';
import { Item } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export type Rarity =
    | 'rarity_common_weapon'
    | 'rarity_rare_weapon'
    | 'rarity_mythical_weapon'
    | 'rarity_legendary_weapon'
    | 'rarity_ancient_weapon'
    | 'rarity_exceedingly_rare_weapon';

function getLowerRarity(rarity: Rarity) {
    switch (rarity) {
        case 'rarity_rare_weapon':
            return 'rarity_common_weapon';
        case 'rarity_mythical_weapon':
            return 'rarity_rare_weapon';
        case 'rarity_legendary_weapon':
            return 'rarity_mythical_weapon';
        case 'rarity_ancient_weapon':
            return 'rarity_legendary_weapon';
        case 'rarity_exceedingly_rare_weapon':
            return 'rarity_ancient_weapon';
        default:
            return undefined
    }
}

function getItem(crate: any, rarity: Rarity) {
    if (!rarity) {
        return undefined;
    }
    if (rarity === 'rarity_exceedingly_rare_weapon') {
        // check if crate contains this rarity
        if (crate.contains_rare?.length) {
            const item = crate.contains_rare[Math.floor(Math.random() * crate.contains_rare.length)];
            return item;
        } else {
            return getItem(crate, getLowerRarity(rarity));
        }
    } else {
        const items = crate.contains.filter(i => i.rarity.id === rarity);
        if (items.length) {
            const item = items[Math.floor(Math.random() * items.length)];
            return item;
        } else {
            return getItem(crate, getLowerRarity(rarity));
        }
    }
}

function selectItemWear(wears: any) {
    // todo: implement wear selection based on wear chance
    return wears[numberBetween(0, wears.length - 1)];
}

export function openCrate(crateId: string): Item {
    const crate = crates.find(c => c.id === crateId);

    if (!crate) throw new Error('No crate found');

    const chance = numberBetween(1, 10000) / 100;
    // const chance = 0.1;
    console.log('Chance:', chance);

    const chances = {
        'rarity_rare_weapon': 79.92,
        'rarity_mythical_weapon': 15.98,
        'rarity_legendary_weapon': 3.2,
        'rarity_ancient_weapon': 0.64,
        'rarity_exceedingly_rare_weapon': 0.26,
    } as Record<Rarity, number>;

    let rarity = 'rarity_common_weapon' as Rarity;

    console.log(chance, chances.rarity_mythical_weapon);

    if (chance <= chances.rarity_exceedingly_rare_weapon) {
        rarity = 'rarity_exceedingly_rare_weapon';
    } else if (chance <= chances.rarity_ancient_weapon) {
        rarity = 'rarity_ancient_weapon';
    } else if (chance <= chances.rarity_legendary_weapon) {
        rarity = 'rarity_legendary_weapon';
    } else if (chance <= chances.rarity_mythical_weapon) {
        rarity = 'rarity_mythical_weapon';
    } else {
        rarity = 'rarity_rare_weapon';
    }

    console.log('Rarity:', rarity);

    const item = getItem(crate, rarity);

    if (!item) throw new Error('No item found');

    const skin = skins.find(s => s.id === item.id);

    if (!skin) throw new Error('No skin found');

    const wear = selectItemWear(skin.wears ?? [])?.name ?? 'Factory New';

    return {
        id: undefined,
        userId: undefined,
        type: 'skin',
        rarity: skin.rarity.name,
        itemID: skin.id,
        name: skin.name,
        description: skin.description,
        price: new Decimal(1),
        wear: wear,
        imageUrl: skin.image,
        rarityColor: skin.rarity.color,
        createdAt: new Date(),
    }
}