import pandas as pd
import plotly.graph_objects as go
from plotly.subplots import make_subplots

########################
# 0. SETUP & CONFIGURATION
########################

# Variables
INPUT_FILEPATH = "output/data.csv"
OUTPUT_METRICS_FILEPATH = "output/data_with_metrics.csv"
OUTPUT_PLOT_FILEPATH = "output/momentum_vs_price.html"
DEFAULT_ASSET_ID = "b3d5d66c-26a2-404c-9325-91dc714a722b"  # Solana

# Constants
ROLLING_WINDOW = 7  # Days for rolling average calculations
MIN_PERIODS = 1  # Minimum periods for rolling calculations


def load_and_prepare_data():
    """Load data from CSV and prepare initial dataframe"""
    df = pd.read_csv(INPUT_FILEPATH)
    df["date"] = pd.to_datetime(df["date"])
    return df.sort_values(["asset_id", "date"])


def calculate_metrics(df):
    """Calculate momentum-related metrics for each asset"""
    # Calculate rolling 7-day average count
    df["count_7d_avg"] = df.groupby("asset_id")["count"].transform(
        lambda x: x.rolling(window=ROLLING_WINDOW, min_periods=MIN_PERIODS).mean()
    )

    # Calculate trend score (7-day change in rolling average)
    df["trend_score"] = df.groupby("asset_id")["count_7d_avg"].transform(
        lambda x: x.pct_change(periods=ROLLING_WINDOW)
    )

    # Calculate acceleration score (1-day change in trend)
    df["acceleration_score"] = df.groupby("asset_id")["trend_score"].transform(
        lambda x: x.pct_change(periods=1)
    )

    # Calculate price score (7-day price change)
    df["price_score"] = df.groupby("asset_id")["close"].transform(
        lambda x: x.pct_change(periods=ROLLING_WINDOW)
    )

    return df


def clean_data(df):
    """Clean data by handling infinities and filtering rows"""
    # Replace infinities with NaN
    for col in ["trend_score", "acceleration_score", "price_score"]:
        df[col] = df[col].replace([float("inf"), float("-inf")], float("nan"))

    # Remove rows with NaN values
    df = df.dropna(subset=["close", "trend_score", "acceleration_score", "price_score"])

    # Calculate and filter momentum score
    df["momentum_score"] = (
        df["trend_score"] * df["acceleration_score"] * df["price_score"]
    )
    df = df[df["momentum_score"] > 0]
    df = df[df["acceleration_score"] > 0]

    return df.sort_values(["date", "momentum_score"], ascending=[False, False])


def plot_momentum_vs_price(df, asset_id):
    """Create a dual-axis plot comparing momentum score and price"""
    # Filter for specific asset
    asset_df = df[df["asset_id"] == asset_id]
    asset_name = asset_df["asset_name"].iloc[0]

    # Create figure with dual y-axes
    fig = make_subplots(specs=[[{"secondary_y": True}]])

    # Add momentum score trace
    fig.add_trace(
        go.Scatter(
            x=asset_df["date"], y=asset_df["momentum_score"], name="Momentum Score"
        ),
        secondary_y=False,
    )

    # Add price trace
    fig.add_trace(
        go.Scatter(x=asset_df["date"], y=asset_df["close"], name="Close Price"),
        secondary_y=True,
    )

    # Update layout
    fig.update_layout(title=f"{asset_name} Momentum Score and Close Price Over Time")
    fig.update_yaxes(title_text="Momentum Score", secondary_y=False)
    fig.update_yaxes(title_text="Close Price", secondary_y=True)

    return fig


def main():
    # Load and process data
    df = load_and_prepare_data()
    df = calculate_metrics(df)
    df = clean_data(df)

    # Save processed data
    df.to_csv(OUTPUT_METRICS_FILEPATH, index=False)
    print(f"Processed data saved to {OUTPUT_METRICS_FILEPATH}")

    # Create and display plot
    fig = plot_momentum_vs_price(df, DEFAULT_ASSET_ID)
    # Save visualization
    fig.write_html(OUTPUT_PLOT_FILEPATH)
    fig.show()


if __name__ == "__main__":
    main()
