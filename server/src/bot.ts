import { Bot } from "grammy";
import { getOrCreateUser } from "./utils/user";
import { numberBetween } from "./utils/rand";
import withPrisma from "./utils/prisma";
import quotes from './data/quotes.json';
import { DateTime } from "luxon";
import axios from 'axios';
import { url } from "inspector";

const bot = new Bot(process.env.BOT_TOKEN!, {
    client: {
        environment: 'test'
    }
});

bot.command('test', (ctx) => {
    console.log(ctx.chatId);
    
    ctx.reply('Hello from the bot!', {
        reply_markup: {
            inline_keyboard: [
                [
                    {
                        text: 'Open Web App',
                        url: 'https://t.me/tinyciv_local_dev_bot/app'
                        // web_app: {
                        //     url: 'http://192.168.100.15:5173/'
                        // },
                    }
                ]
            ]
        }
    });
})

bot.command('start', (ctx) => {
    ctx.reply(
        "Дисклеймер: цей бот працює з СБУ, всі дані про вас будуть передані нашим партнерам з США. Відправте /accept якщо ви згодні з цими умовами."
    )
})

bot.command('accept', (ctx) => {
    ctx.reply("Дякую. Дані про вас були передані в СБУ")
})

bot.command('p', async (ctx) => {
    // play a game
    const user = await getOrCreateUser(ctx.from)

    if (user.pLastPlayed && Date.now() - user.pLastPlayed.getTime() < 1000 * 12 * 60 * 60) {
        const date = DateTime.fromJSDate(user.pLastPlayed).plus({ hours: 12 })

        ctx.reply(`Ти вже грав, спробуй ще раз о ${date.day === DateTime.now().day ? 'сьогодні' : 'завтра'} о ${date.toFormat('HH:mm')}.`)
        return
    }

    // get random percentage
    const percentage = numberBetween(0, 100)

    let score = 0
    if (percentage < 25) {
        score = numberBetween(-10, 5)
    } else if (percentage < 75) {
        score = numberBetween(-5, 10)
    } else {
        score = numberBetween(5, 15)
    }

    user.pLength += score
    user.pLastPlayed = new Date()
    await withPrisma(async (prisma) => {
        await prisma.user.update({
            where: {
                id: user.id
            },
            data: {
                pLength: user.pLength,
                pLastPlayed: user.pLastPlayed
            }
        })
    })

    let template = null;
    if (score < 0) {
        template = `Невдача! Твій хуй зменьшився на ${Math.abs(score)} см`
    } else if (score === 0) {
        template = `Твій хуй залишився таким самим`
    } else if (score > 0 && score < 5) {
        template = `Твій хуй збільшився на ${score} см`
    } else if (score >= 5 && score < 10) {
        template = `Потужна перемога! Твій хуй збільшився на ${score} см!`
    } else {
        template = `Епічна потужність!!! Твій хуй збільшився на ${score} см!`
    }

    ctx.reply(`${template}. Тепер у тебе ${user.pLength} см`)
})

bot.command('results', async (ctx) => {
    await withPrisma(async (prisma) => {
        const users = await prisma.user.findMany({
            orderBy: {
                pLength: 'desc'
            }
        })

        let res = "Результати гри:\n"
        users.forEach((user, index) => {
            res += `${index + 1}. ${user.name} - ${user.pLength} см\n`
        })

        ctx.reply(res)
    })
})

bot.command('quote', async (ctx) => {
    const quote = quotes[numberBetween(0, quotes.length - 1)]
    ctx.reply(quote)
})

bot.on('message:text', async (ctx) => {
    try {
        const response = await axios.post(
            'http://127.0.0.1:11434/api/generate',
            {
                model: 'mistral',
                stream: false,
                prompt: `
            You are a specialized message evaluator that analyzes user messages
            based on their sentiment towards governments and countries.
            Your task is to categorize each message into one of three categories:
            Good, Bad, or Neutral.
            EVALUATION CRITERIA:

            Good Messages (Score: higher than 0):
            Positive statements about any government's policies, initiatives, or achievements
            Praise for a country's culture, heritage, or contributions
            Constructive suggestions for government improvement
            Recognition of international cooperation or diplomatic success
            Acknowledgment of public service effectiveness
            Celebration of national achievements or progress

            Bad Messages (Score: less than 0):
            Negative statements about government policies or actions
            Criticism of a country's systems or institutions
            Expressions of dissatisfaction with public services
            Comments about government inefficiency or corruption
            Negative comparisons between countries
            Statements promoting conflict between nations

            Neutral Messages (Score: 0):
            Messages that don't mention governments or countries
            Factual statements without clear sentiment
            Personal topics unrelated to governments/countries
            General discussions about non-political subjects
            Weather-related comments
            Personal greetings or casual conversation

            SPECIAL CRITERIA:
            1. If message negatively mentions Russia, score should be positive, regardless of other content. If message positively mentions Russia, score should be negative. 

            EVALUATION FORMAT:
            For each message from user, provide:

            Category: [Good/Bad/Neutral]
            Reasoning: Brief explanation for the categorization
            Key Terms: Relevant words/phrases that influenced the decision
            Special criteria: Mention if the message matches any special criteria
            Score: [Number between -10 and 10] (should account for all criteria matched)

            MESSAGE:
            Given the message: "${ctx.message.text}"
            Please evaluate it according to the criteria above and provide a complete evaluation.
            `
            }
        )

        const generated = response.data.response
        // extract score from generated text
        const score = parseInt(generated.match(/Score:\s*(-?\d+)/g)[0].split(':')[1].trim())

        if (score > 0) {
            ctx.replyWithPhoto("https://img.itch.zone/aW1nLzc1NjcwMTMuanBlZw==/315x250%23c/oPwsSC.jpeg", {
                caption: `Пачка рис від СБУ. Ваша оцінка: ${score}`
            })
        } else if (score < 0) {
            ctx.replyWithPhoto("https://i.imgflip.com/60br4n.jpg", {
                caption: `Партія не довольна вашими висловлюваннями. Ваша оцінка: ${score}`
            })
        }

        await withPrisma(async (prisma) => {
            const user = await getOrCreateUser(ctx.from)

            if (user) {
                await prisma.user.update({
                    where: {
                        id: ctx.from.id
                    },
                    data: {
                        socialScore: user.socialScore + score
                    }
                })
            }
        })

    } catch (e) {
        console.error(e)
    }
})

export default bot;