import asyncio
import datetime
import os

import aiohttp
import numpy as np
import pandas as pd
import requests
from tqdm.asyncio import tqdm

########################
# 0. SETUP & CONFIGURATION
########################

# Variables
MESSARI_API_KEY = os.getenv("MESSARI_API_KEY")
LOOKBACK_DAYS = 28  # Number of days to lookback for news and market data. Increase this to get more historical data.
OUTPUT_FILEPATH = "output/data.csv"
SEM_VALUE = 10

# Constants
MESSARI_BASE_URL = "https://api.messari.io"
NEWS_API_URL = f"{MESSARI_BASE_URL}/news/v1/news/feed"
MARKET_DATA_BASE_API_URL = f"{MESSARI_BASE_URL}/marketdata/v1/assets"
HEADERS = {"accept": "application/json", "x-messari-api-key": MESSARI_API_KEY}

SECONDS_IN_A_DAY = 86400
END_TIMESTAMP_S = int(datetime.datetime.now().timestamp())
START_TIMESTAMP_S = END_TIMESTAMP_S - (SECONDS_IN_A_DAY * LOOKBACK_DAYS)
END_TIMESTAMP_MS = END_TIMESTAMP_S * 1000
START_TIMESTAMP_MS = START_TIMESTAMP_S * 1000


########################
# 1. NEWS DATA FUNCTIONS
########################
async def fetch_single_news_page(
    session: aiohttp.ClientSession,
    sem: asyncio.Semaphore,
    page: int,
    start_timestamp: int,
    end_timestamp: int,
) -> pd.DataFrame:
    """Fetches a single page of news from Messari API"""
    params = {
        "sort": 1,
        "publishedBefore": end_timestamp,
        "publishedAfter": start_timestamp,
        "limit": 100,
        "page": page,
    }

    async with sem:
        await asyncio.sleep(1)  # Rate limiting
        async with session.get(
            NEWS_API_URL, headers=HEADERS, params=params
        ) as response:
            return pd.DataFrame((await response.json())["data"])


async def fetch_all_news_pages(
    pages: list[int], sem_value: int, start_timestamp: int, end_timestamp: int
) -> pd.DataFrame:
    """Fetches all news pages concurrently"""
    sem = asyncio.Semaphore(sem_value)
    async with aiohttp.ClientSession() as session:
        tasks = [
            fetch_single_news_page(session, sem, page, start_timestamp, end_timestamp)
            for page in pages
        ]
        results = await tqdm.gather(*tasks, desc="Fetching news pages")
    return pd.concat(results)


def process_news_data(
    news_df: pd.DataFrame,
) -> tuple[pd.DataFrame, np.ndarray, np.ndarray]:
    """Process raw news data into required format"""
    # Convert timestamp and clean unnecessary columns
    news_df["date"] = pd.to_datetime(news_df["publishTimeMillis"], unit="ms").dt.date
    news_df = news_df.drop(columns=["publishTimeMillis"])

    # Filter and process asset-related news
    news_df = news_df[news_df["assets"].notna()].explode("assets")

    # Extract asset information
    news_df["asset_id"] = news_df["assets"].apply(lambda x: x["id"])
    news_df["asset_name"] = news_df["assets"].apply(lambda x: x["name"])
    news_df = news_df.drop(columns=["assets"])

    # Clean text fields
    for col in ["title", "description", "url"]:
        news_df[col] = news_df[col].fillna("None")

    # Group by asset and date
    grouped_df = news_df.groupby(["asset_id", "asset_name", "date"]).agg(
        {"title": list, "description": list, "url": list}
    )
    grouped_df["count"] = grouped_df["title"].apply(len)

    return (
        grouped_df.reset_index(),
        news_df["asset_id"].unique(),
        news_df["date"].unique(),
    )


########################
# 2. MARKET DATA FUNCTIONS
########################
async def fetch_single_asset_market_data(
    session: aiohttp.ClientSession,
    sem: asyncio.Semaphore,
    asset_id: str,
    start_timestamp: int,
    end_timestamp: int,
) -> pd.DataFrame:
    """Fetches market data for a single asset"""
    url = f"{MARKET_DATA_BASE_API_URL}/{asset_id}/price/time-series"
    params = {"interval": "1d", "startTime": start_timestamp, "endTime": end_timestamp}

    async with sem:
        await asyncio.sleep(1)  # Rate limiting
        async with session.get(url, headers=HEADERS, params=params) as response:
            data = await response.json()
            if not data:
                return pd.DataFrame()

            df = pd.DataFrame(data["data"])
            df["asset_id"] = asset_id
            return df


async def fetch_all_market_data(
    asset_ids: np.ndarray, sem_value: int, start_timestamp: int, end_timestamp: int
) -> pd.DataFrame:
    """Fetches market data for all assets concurrently"""
    sem = asyncio.Semaphore(sem_value)
    async with aiohttp.ClientSession() as session:
        tasks = [
            fetch_single_asset_market_data(
                session, sem, asset_id, start_timestamp, end_timestamp
            )
            for asset_id in asset_ids
        ]
        results = await tqdm.gather(*tasks, desc="Fetching market data")

    df = pd.concat(results)
    df["date"] = pd.to_datetime(df["timestamp"], unit="s").dt.date
    return df[["date", "asset_id", "close"]]


########################
# 3. UTILS
########################
def ensure_output_directory(fp: str):
    os.makedirs(os.path.dirname(fp), exist_ok=True)


########################
# 4. MAIN EXECUTION
########################


def main():
    # 1. Fetch News Data
    # Get total pages from initial request
    response = requests.get(
        NEWS_API_URL,
        headers=HEADERS,
        params={
            "sort": 1,
            "publishedBefore": END_TIMESTAMP_MS,
            "publishedAfter": START_TIMESTAMP_MS,
            "limit": 100,
            "page": 1,
        },
    ).json()
    total_pages = response["metadata"]["totalPages"]

    # Fetch and process all news
    news_df = asyncio.run(
        fetch_all_news_pages(
            pages=range(1, total_pages + 1),
            sem_value=SEM_VALUE,
            start_timestamp=START_TIMESTAMP_MS,
            end_timestamp=END_TIMESTAMP_MS,
        )
    )
    processed_news_df, unique_asset_ids, unique_dates = process_news_data(news_df)

    # 2. Fetch Market Data
    market_df = asyncio.run(
        fetch_all_market_data(
            asset_ids=unique_asset_ids,
            sem_value=SEM_VALUE,
            start_timestamp=START_TIMESTAMP_S,
            end_timestamp=END_TIMESTAMP_S,
        )
    )

    # 3. Merge and Export
    final_df = pd.merge(
        processed_news_df, market_df, on=["asset_id", "date"], how="left"
    )
    ensure_output_directory(OUTPUT_FILEPATH)
    final_df.to_csv(OUTPUT_FILEPATH, index=False)
    print(f"Data exported to {OUTPUT_FILEPATH}")


if __name__ == "__main__":
    main()
