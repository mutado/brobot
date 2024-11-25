import cors from 'cors';
import express, { Request } from 'express';
import * as dotenv from 'dotenv';
import { exit } from 'process';
import cookieUpgrades from './data/cookieUpgrades.json';
import crates from './data/crates.json';
import skins from './data/skins.json';

dotenv.config({ override: true });

import bot from './bot';
import { parse, validate } from '@telegram-apps/init-data-node';
import { User } from '@prisma/client';
import { getOrCreateUser } from './utils/user';
import withPrisma from './utils/prisma';
import { numberBetween } from './utils/rand';
import { openCrate, Rarity } from './utils/crate';
import { getItemPrice } from './utils/item';

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

export interface AuthenticatedRequest extends Request {
    user: User
    chatInstance: string
    chatType: string
}

// middleware to authenticate requests
app.use(async (req: AuthenticatedRequest, res, next) => {
    const authorization = req.headers.authorization.slice(4);

    try {
        const parsed = parse(authorization);
        console.log(parsed);

        validate(authorization, process.env.BOT_TOKEN)
        // provide with the parsed data
        req.user = await getOrCreateUser(parsed.user.id, parsed.user.firstName);
        req.chatInstance = parsed.chatInstance;
        req.chatType = parsed.chatType
        next();
    } catch (error) {
        console.error(error);
        res.status(401).json({ message: 'Unauthorized' });
    }
})

const PORT = process.env.PORT || 3001;

app.get('/api', (_req, res) => {
    console.log('GET /api');
    res.status(200).json({ message: 'Hello from the server!' });
});

app.get('/api/auth/user', (req: AuthenticatedRequest, res) => {
    console.log('GET /api/auth/user');
    res.status(200).json({
        id: Number(req.user.id),
        name: req.user.name,
        balance: Number(req.user.balance),
        socialScore: req.user.socialScore,
        pLength: req.user.pLength,
        moneyPerClick: Number(req.user.moneyPerClick),
        moneyPerSecond: Number(req.user.moneyPerSecond)
    });
})

app.get('/api/upgrades', (req: AuthenticatedRequest, res) => {
    res.status(200).json(cookieUpgrades);
})

app.get('/api/inventory', async (req: AuthenticatedRequest, res) => {
    res.status(200).json(await withPrisma(async (prisma) => {
        const inventory = await prisma.item.findMany({
            where: {
                userId: req.user.id
            }
        })
        return inventory.map(i => ({
            id: Number(i.id),
            itemID: i.itemID,
            image: i.imageUrl,
            type: i.type,
            name: i.name,
            description: i.description,
            rarity: i.rarity,
            rarityColor: i.rarityColor,
            wear: i.wear,
            price: getItemPrice(i)
        }));
    }));
})

app.get('/api/crate/:id', async (req: AuthenticatedRequest, res) => {
    const crate = crates.find(c => c.id === req.params.id);

    res.status(200).json(crate)
})

app.post('/api/items/sell', async (req: AuthenticatedRequest, res) => {
    const { items } = req.body;

    if (!items) {
        res.status(400).json({ message: 'Invalid request' });
    } else {
        await withPrisma(async (prisma) => {
            const foundItems = await prisma.item.findMany({
                where: {
                    id: {
                        in: items
                    },
                    userId: req.user.id
                }
            })

            const totalPrice = foundItems.reduce((acc, item) => acc + getItemPrice(item), 0);

            await prisma.user.update({
                where: {
                    id: req.user.id
                },
                data: {
                    balance: {
                        increment: totalPrice
                    }
                }
            });

            await prisma.item.deleteMany({
                where: {
                    id: {
                        in: items
                    }
                }
            });
        });

        res.status(200).send();
    }
})


app.post('/api/items/:id/open', async (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    if (!id) {
        res.status(400).json({ message: 'Invalid request' });
    } else {
        await withPrisma(async (prisma) => {
            const item = await prisma.item.findFirst({
                where: {
                    id: Number(id),
                    userId: req.user.id
                }
            });

            if (!item) {
                res.status(400).json({ message: 'Invalid item' });
            } else if (item.type !== 'crate') {
                res.status(400).json({ message: 'Item is not a crate' });
            } else {
                try {
                    const skin = openCrate(item.itemID);
                    // await prisma.item.delete({
                    //     where: {
                    //         id: Number(id)
                    //     }
                    // });
                    const createdSkin = await prisma.item.create({
                        data: {
                            userId: req.user.id,
                            type: skin.type,
                            itemID: skin.itemID,
                            name: skin.name,
                            description: skin.description,
                            price: skin.price,
                            imageUrl: skin.imageUrl,
                            rarity: skin.rarity,
                            wear: skin.wear,
                            rarityColor: skin.rarityColor
                        }
                    })
                    res.status(200).json({
                        id: Number(createdSkin.id),
                        itemID: createdSkin.itemID,
                        image: createdSkin.imageUrl,
                        type: createdSkin.type,
                        name: createdSkin.name,
                        description: createdSkin.description,
                        rarity: {
                            name: createdSkin.rarity,
                            color: createdSkin.rarityColor
                        },
                        rarityColor: createdSkin.rarityColor,
                        wear: createdSkin.wear,
                        price: getItemPrice(createdSkin)
                    });

                    if (
                        req.chatType === 'group'
                        && (['rarity_ancient_weapon', 'rarity_exceedingly_rare_weapon', 'rarity_legendary_weapon'] as Array<Rarity>).includes(skin.rarity as Rarity)
                    ) {
                        setTimeout(async () => {
                            try {
                                await bot.api.sendPhoto(
                                    -5007674874,
                                    createdSkin.imageUrl,
                                    {
                                        caption: `🎉 ${req.user.name} has unboxed a ${skin.rarity} ${skin.name}!`
                                    }
                                )
                            } catch (error) {
                                console.error(error);
                            }
                        }, 1000);
                    }
                } catch (error) {
                    res.status(400).json({ message: error.message });
                }
            }
        })
    }
})

app.get('/api/my-upgrades', async (req: AuthenticatedRequest, res) => {

    res.status(200).json(await withPrisma(async (prisma) => {
        const upgrades = await prisma.cookieUpgrades.findMany({
            where: {
                userId: req.user.id
            }
        })
        return upgrades.map(u => ({
            type: u.type,
            level: u.level
        }));
    }));
})

app.post('/api/clicks', async (req: AuthenticatedRequest, res) => {
    const { clicks } = req.body;
    if (!clicks) {
        res.status(400).json({ message: 'Invalid request' });
    } else {
        await withPrisma(async (prisma) => {
            await prisma.user.update({
                where: {
                    id: req.user.id
                },
                data: {
                    balance: {
                        increment: (clicks * Number(req.user.moneyPerClick))
                    }
                }
            });
        });

        res.status(200).send();
    }
})

app.post('/api/buy-upgrade', async (req: AuthenticatedRequest, res) => {
    const { type } = req.body;
    if (!type) {
        res.status(400).json({ message: 'Invalid request' });
    } else {
        const upgrade = cookieUpgrades.find(u => u.type === type);
        if (!upgrade) {
            res.status(400).json({ message: 'Invalid upgrade type' });
        } else {
            if (Number(req.user.balance) < upgrade.money) {
                res.status(400).json({ message: 'Insufficient balance' });
            } else {
                await withPrisma(async (prisma) => {
                    await prisma.user.update({
                        where: {
                            id: req.user.id
                        },
                        data: {
                            balance: {
                                decrement: upgrade.money
                            },
                            moneyPerClick: {
                                increment: upgrade.upgradeMoney
                            },
                        }
                    });

                    const existingUpgrade = await prisma.cookieUpgrades.findFirst({
                        where: {
                            userId: req.user.id,
                            type: upgrade.type
                        }
                    });

                    if (existingUpgrade) {
                        await prisma.cookieUpgrades.update({
                            where: {
                                id: existingUpgrade.id
                            },
                            data: {
                                level: {
                                    increment: 1
                                }
                            }
                        });
                    } else {
                        await prisma.cookieUpgrades.create({
                            data: {
                                userId: req.user.id,
                                type: upgrade.type,
                                level: 1
                            }
                        });
                    }
                })


                res.status(200).send();
            }
        }
    }
})

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

bot.start();