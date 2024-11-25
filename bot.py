import asyncio
from decimal import Decimal
import os
import random
import re
import sqlite3
import time
from aiogram import Bot, Dispatcher, html
from aiogram.client.default import DefaultBotProperties
from aiogram.filters import CommandStart, Command, CommandObject
from aiogram.enums import ParseMode
from aiogram.types import Message, FSInputFile
import aiohttp
from dotenv import load_dotenv
import requests
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from db import getDBConnection
from downloader import download_video
from models.user import Asset, User
from quotes import quotes

load_dotenv()

TOKEN = os.getenv("BOT_TOKEN")

engine = create_engine('sqlite:///db.sqlite3')
Session = sessionmaker(bind=engine)
session = Session()


def validate_tiktok(url: str) -> bool:
    """
    Validate if the provided URL is a TikTok URL

    Args:
        url (str): URL to validate

    Returns:
        bool: True if valid, False otherwise
    """
    tiktok_pattern = r'https?://((?:vm|vt|www)\.)?tiktok\.com/.*'
    return bool(re.match(tiktok_pattern, url))


def is_youtube_shorts(url: str) -> bool:
    # Convert to lowercase for case-insensitive matching
    url = url.lower()

    # Check if it's a valid YouTube URL first
    if not ('youtube.com' in url or 'youtu.be' in url):
        return False

    # Check if it's a shorts URL
    return '/shorts/' in url


def is_valid_url(url: str) -> bool:
    # Check if it's a TikTok URL
    if validate_tiktok(url):
        return True

    # Check if it's a YouTube Shorts URL
    if is_youtube_shorts(url):
        return True

    return False


def is_url(url: str) -> bool:
    # Check if it's a valid URL
    return bool(re.match(r'https?://\S+', url))


dp = Dispatcher()


@dp.message(CommandStart())
async def command_start_handler(message: Message) -> None:
    await message.answer(f"Дисклеймер: цей бот працює з СБУ, всі дані про вас будуть передані в нашим партнерам з США. Відправте /accept якщо ви згодні з цими умовами.")


@dp.message(Command("accept"))
async def command_accept_handler(message: Message) -> None:
    await message.answer(f"Дякую. Дані про вас були передані в СБУ.")

def getUser(message: Message):
    user = session.query(User).filter_by(id=message.from_user.id).first()

    if user is None:
        user = User(
            id=message.from_user.id,
            name=message.from_user.full_name,
            p_length=15,
            last_played=0,
            balance=0,
            created_at=int(time.time())
        )
        session.add(user)
        session.commit()
    
    return user

@dp.message(Command("penis"))
async def command_pgame_handler(message: Message) -> None:
    userId = message.from_user.id


    user = getUser(message)
    

    # if user played less than 12 hours ago, don't let them play
    if user.last_played + 12 * 60 * 60 > time.time():
        await message.answer(f"Ти вже грав, почекай ще {int(user.last_played + 12 * 60 * 60 - time.time()) * 1000} мілісекунд.")
        return

    # get the chance
    percent = random.randint(0, 100)

    if percent < 25:
        # if less than 25%, huge loss
        score = random.randint(-10, 5)
    elif percent < 75:
        # if less than 75%, normal change
        score = random.randint(-5, 10)
    else:
        # if more than 75%, huge win
        score = random.randint(5, 15)
    
    user.p_length = user.p_length + score
    user.last_played = int(time.time())
    session.commit()

    template = None
    if score < 0:
        template = "Невдача! Твій хуй зменьшився на {} см."
    elif score == 0:
        template = "Нічого не відбулось."
    elif score > 0 and score < 5:
        template = "Твій хуй збільшився на {} см."
    elif score >= 5 and score < 10:
        template = "Потужна перемога! Твій хуй збільшився на {} см."
    else:
        template = "Епічна потужність!!! Твій хуй збільшився на {} см."

    await message.answer(template.format(score))


@dp.message(Command("results"))
async def command_score_handler(message: Message) -> None:
    users = session.query(User).order_by(User.p_length.desc()).all()

    response = "Результати гри:\n"
    for i, user in enumerate(users):
        response += f"{i + 1}. {user.name} - {user.p_length} см\n"

    await message.answer(response)

@dp.message(Command("quote"))
async def command_quote_handler(message: Message) -> None:
    response = random.choice(quotes)
    await message.answer(response + "\n©️ Игорь Войтенко")

@dp.message(Command("portfolio"))
async def command_portfolio_handler(message: Message) -> None:
    userId = message.from_user.id

    user = getUser(message)

    response = f"Твій хуй: {user.p_length} см\n"
    response += f"Баланс: {user.balance} usd\n"
    
    assets = user.assets
    
    if len(assets) == 0:
        response += "У тебе немає активів."
    else:
        response += "Твої активи:\n"
        for i, asset in enumerate(assets):
            response += f"{i + 1}. {asset.stock_name} - {asset.amount} акцій\n"

    await message.answer(response)
    
@dp.message(Command("buy"))
async def command_buy_handler(message: Message,command: CommandObject) -> None:
    args = command.args.split(" ")
    userId = message.from_user.id
    user = getUser(message)

    if len(args) < 1:
        await message.answer("Введіть назву акції та кількість акцій для покупки.")
        return

    # # get the stock name
    stock_name = args[0]
    amount = int(args[1] if len(args) > 1 else 1)
    
    async with aiohttp.ClientSession() as apiSession:
        # get price of the stock
        response = await apiSession.get(f"https://api.coincap.io/v2/rates/{stock_name}")
        response = await response.json()
        if response['data'] is None:
            await message.answer("Акція не знайдена.")
            return
        price = float(response['data']['rateUsd'])
        
        # check if user has enough balance
        if user.balance < price * amount:
            await message.answer("У вас недостатньо коштів.")
            return
        
        # create the asset
        asset = Asset(
            id=str(random.randint(100000, 999999)),
            user_id=user.id,
            stock_name=stock_name,
            amount=amount,
            price_bought_at=price,
            created_at=int(time.time()),
            sold_at=0,
            price_sold_at=0
        )
        
        user.balance = user.balance - Decimal(price * amount)
        session.add(asset)
        session.commit()
        
        await message.answer(f"Куплено {amount} акцій {stock_name} за {price * amount} usd.")

@dp.message(Command("sell"))
async def command_sell_handler(message: Message,command: CommandObject) -> None:
    args = command.args.split(" ")
    userId = message.from_user.id
    user = getUser(message)

    if len(args) < 1:
        await message.answer("Введіть назву акції та кількість акцій для продажу.")
        return

    # get the stock name
    stock_name = args[0]
    amount = int(args[1] if len(args) > 1 else 1)
    
    # get the asset
    asset = session.query(Asset).filter_by(user_id=user.id, stock_name=stock_name).first()
    
    if asset is None:
        await message.answer("У вас немає таких акцій.")
        return
    
    if asset.amount < amount:
        await message.answer("У вас недостатньо акцій.")
        return
    
    async with aiohttp.ClientSession() as apiSession:
        # get price of the stock
        response = await apiSession.get(f"https://api.coincap.io/v2/rates/{stock_name}")
        response = await response.json()
        if response['data'] is None:
            await message.answer("Акція не знайдена.")
            return
        price = float(response['data']['rateUsd'])
        
        # update the asset
        asset.amount = asset.amount - amount
        user.balance = user.balance + Decimal(price * amount)
        session.commit()
        
        await message.answer(f"Продано {amount} акцій {stock_name} за {price * amount} usd.")

@dp.message()
async def message_handler(message: Message) -> None:
    print(message.text)
    if message.content_type == 'text':
        if is_url(message.text):
            if is_valid_url(message.text):
                date = message.date.strftime("%Y-%m-%d %H:%M:%S")
                filename = f"./tmp/{date}.mp4"
                try:
                    download_video(
                        message.text,
                        filename
                    )
                    await message.reply_video(
                        FSInputFile(filename),
                        caption="На, нахуй."
                    )

                    # Remove the file after sending
                    os.remove(filename)
                except Exception as e:
                    await message.reply(f"іді нахуй бро.")
            else:
                await message.reply("не на часі")
        else:
            # send message to OLLAMA API
            async with aiohttp.ClientSession() as session:
                response = await session.post(
                    url="http://127.0.0.1:11434/api/generate",
                    json={
                        "model": "mistral",
                        "prompt": fr"""
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

                        EVALUATION FORMAT:
                        For each message from user, provide:

                        Category: [Good/Bad/Neutral]
                        Reasoning: Brief explanation for the categorization
                        Key Terms: Relevant words/phrases that influenced the decision
                        Score: [Number between -10 and 10]
                        
                        SPECIAL CASES:
                        
                        In some cases scores may be higher than 10 or lower than -10.
                        This is acceptable if the message is exceptionally positive or negative.

                        MESSAGE:
                        Given the message: "{message.text}"
                        Please evaluate it according to the criteria above and provide a complete evaluation.
                        """,
                        "stream": False
                    },
                    headers={
                        "Content-Type": "application/json"
                    }
                )
                response = await response.json()
                await message.reply(response['response'])


async def main() -> None:
    bot = Bot(token=TOKEN, default=DefaultBotProperties(
        parse_mode=ParseMode.HTML))
    print("Starting bot...")
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
