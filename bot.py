import asyncio
import os
import random
import re
import time
from aiogram import Bot, Dispatcher, html
from aiogram.client.default import DefaultBotProperties
from aiogram.filters import CommandStart, Command
from aiogram.enums import ParseMode
from aiogram.types import Message, FSInputFile
import aiohttp
from dotenv import load_dotenv
import requests

from downloader import download_video

load_dotenv()

TOKEN = os.getenv("BOT_TOKEN")

p_game = {
    421348308: {
        "length": 10,
        "name": "Nazar Potipaka",
        "last_played": 0
    }
}


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
    
@dp.message(Command("penis"))
async def command_pgame_handler(message: Message) -> None:
    userId = message.from_user.id
    if userId not in p_game:
        p_game[userId] = {
            "length": 0,
            "name": message.from_user.full_name,
            "last_played": 0
        }
    
    # if user played less than 12 hours ago, don't let them play
    if p_game[userId]["last_played"] + 12 * 60 * 60 > time.time():
        await message.answer(f"Ти вже грав, почекай ще {int(p_game[userId]['last_played'] + 12 * 60 * 60 - time.time())} секунд")
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
    
    p_game[userId]["length"] += score
    p_game[userId]["last_played"] = time.time()
    
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
    # respond with all the scores sorted by length
    scores = sorted(p_game.items(), key=lambda x: x[1]["length"], reverse=True)
    print(scores)
    response = "Результати гри:\n"
    for i, (userId, data) in enumerate(scores):
        response += f"{i + 1}. {data['name']} - {data['length']} см\n"
    await message.answer(response)


@dp.message()
async def message_handler(message: Message) -> None:
    print(message.text)
    return;
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
                        "prompt": fr"""Response to the following message:
                        User: {message.text}
                        Response should be funny and sarcastic.
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
