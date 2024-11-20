# Algotrade Sentiment
This example demonstrates how to use the Messari API to retrieve news and market data for a list of assets, and then use the news to generate sentiment scores for each asset.

 **Prerequisites**
 - Python 3.8 or higher
 - A Messari API key (get one at https://messari.io)

**Setup Steps**
 1. Install the required packages:
    ```bash
    pip install aiohttp==3.11.4 pandas==2.2.3 requests==2.32.3 tqdm==4.67.0
    ```

 2. Configure your API key:
    ```bash
    export MESSARI_API_KEY=your_api_key_here
    ```

There are two ways to run this example:

1. **Interactive Walkthrough**: Follow along with [algotrade_sentiment.ipynb](./algotrade_sentiment.ipynb) for a step-by-step guide with detailed explanations and visualized outputs.

2. **Python Scripts**: If you prefer to integrate the functionality into your existing codebase, you can directly use the Python scripts which contain all the core functions and logic.
