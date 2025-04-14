"use client";

import { useEffect, useRef, useState } from "react";
import {
  createChart,
  ColorType,
  CrosshairMode,
  LineStyle,
  HistogramSeries,
  AreaSeries,
  LineSeries,
  LineWidth,
} from "lightweight-charts";
import { ChartData } from "../types/chart";

interface LightweightChartProps {
  chartData: ChartData;
  theme?: "dark" | "light";
}

const LightweightChart: React.FC<LightweightChartProps> = ({
  chartData,
  theme = "dark",
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  // Determine chart type based on metric name
  const getChartType = (): "price" | "volume" | "marketcap" => {
    const metricLower = chartData.metric?.toLowerCase() || "";
    if (metricLower.includes("volume")) return "volume";
    if (metricLower.includes("marketcap")) return "marketcap";
    return "price";
  };

  // Format timestamp to yyyy-mm-dd for Lightweight Charts
  const formatDateString = (timestamp: number): string => {
    // Ensure timestamp is in milliseconds
    const adjustedTimestamp =
      timestamp < 10000000000 ? timestamp * 1000 : timestamp;
    const date = new Date(adjustedTimestamp);
    return date.toISOString().split("T")[0];
  };

  // Transform chart data into format required by lightweight-charts
  const transformChartData = () => {
    try {
      const series = chartData.metricTimeseries?.series?.[0];

      if (!series || !series.points || !series.points.length) {
        throw new Error("Invalid chart data: No data points found");
      }

      const chartType = getChartType();

      return series.points
        .map((point) => {
          if (!Array.isArray(point) || point.length < 2) return null;

          const timestamp = point[0];
          const formattedTime = formatDateString(timestamp);

          if (chartType === "volume") {
            return {
              time: formattedTime,
              value: typeof point[1] === "number" ? point[1] : 0,
            };
          } else if (chartType === "marketcap") {
            return {
              time: formattedTime,
              value: typeof point[1] === "number" ? point[1] : 0,
            };
          } else {
            // For price data, use close value (index 4) if available
            let value: number;
            if (point.length > 4 && typeof point[4] === "number") {
              value = point[4]; // close price
            } else if (point.length > 1 && typeof point[1] === "number") {
              value = point[1]; // fallback to first value
            } else {
              value = 0;
            }

            return {
              time: formattedTime,
              value,
            };
          }
        })
        .filter(
          (item): item is { time: string; value: number } => item !== null
        );
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to process chart data";
      console.error("Error processing chart data:", errorMessage);
      setError(errorMessage);
      return [];
    }
  };

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chartContainer = chartContainerRef.current;

    // Clear previous chart instances
    while (chartContainer.firstChild) {
      chartContainer.removeChild(chartContainer.firstChild);
    }

    setError(null);

    try {
      const data = transformChartData();

      if (!data.length) {
        throw new Error("No valid data points found after processing");
      }

      // Set colors based on theme
      const colors = {
        background: theme === "dark" ? "#1E2530" : "#FFFFFF",
        text:
          theme === "dark"
            ? "rgba(255, 255, 255, 0.9)"
            : "rgba(33, 56, 77, 0.9)",
        grid:
          theme === "dark"
            ? "rgba(70, 80, 100, 0.2)"
            : "rgba(197, 203, 206, 0.4)",
        border: theme === "dark" ? "#485263" : "#D6DCDE",
        volume: theme === "dark" ? "#9333EA" : "#7C4DFF",
        area: {
          line: theme === "dark" ? "#4285F4" : "#3B6FC9",
          top:
            theme === "dark"
              ? "rgba(66, 133, 244, 0.6)"
              : "rgba(66, 133, 244, 0.3)",
          bottom:
            theme === "dark"
              ? "rgba(66, 133, 244, 0.1)"
              : "rgba(66, 133, 244, 0.05)",
        },
        line: theme === "dark" ? "#2962FF" : "#2196F3",
      };

      // Create chart with theme-specific options
      const chart = createChart(chartContainer, {
        width: chartContainer.clientWidth,
        height: 400,
        layout: {
          background: { type: ColorType.Solid, color: colors.background },
          textColor: colors.text,
        },
        grid: {
          vertLines: { color: colors.grid },
          horzLines: { color: colors.grid },
        },
        timeScale: {
          timeVisible: true,
          secondsVisible: false,
          borderColor: colors.border,
        },
        rightPriceScale: {
          borderColor: colors.border,
        },
        crosshair: {
          mode: CrosshairMode.Normal,
          vertLine: {
            color:
              theme === "dark"
                ? "rgba(255, 255, 255, 0.4)"
                : "rgba(33, 56, 77, 0.4)",
            style: LineStyle.Solid,
            labelBackgroundColor: colors.background,
          },
          horzLine: {
            color:
              theme === "dark"
                ? "rgba(255, 255, 255, 0.4)"
                : "rgba(33, 56, 77, 0.4)",
            style: LineStyle.Solid,
            labelBackgroundColor: colors.background,
          },
        },
      });

      const chartType = getChartType();

      // Add the appropriate series type based on chart type
      if (chartType === "volume") {
        const series = chart.addSeries(HistogramSeries, {
          color: colors.volume,
          priceFormat: { type: "volume" as const },
        });
        series.setData(data);
      } else if (chartType === "marketcap") {
        const series = chart.addSeries(AreaSeries, {
          topColor: colors.area.top,
          bottomColor: colors.area.bottom,
          lineColor: colors.area.line,
          lineWidth: 2 as LineWidth,
        });
        series.setData(data);
      } else {
        const series = chart.addSeries(LineSeries, {
          color: colors.line,
          lineWidth: 2 as LineWidth,
        });
        series.setData(data);
      }

      // Fit the content to the available space
      chart.timeScale().fitContent();

      // Handle window resize
      const handleResize = () => {
        if (chartContainerRef.current) {
          chart.applyOptions({
            width: chartContainerRef.current.clientWidth,
          });
        }
      };

      window.addEventListener("resize", handleResize);

      return () => {
        window.removeEventListener("resize", handleResize);
        chart.remove();
      };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to initialize chart";
      console.error("Error creating chart:", errorMessage);
      setError(errorMessage);
    }
  }, [chartData, theme]);

  // Display error message if something went wrong
  if (error) {
    return (
      <div className="relative w-full h-full min-h-[400px] bg-gray-900 rounded-lg p-4">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-red-900/90 p-4 rounded-lg shadow-lg">
            <p className="text-white text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full">
      <div ref={chartContainerRef} className="w-full h-[400px] rounded-lg" />
      <div className="text-xs text-gray-400 mt-2">
        {chartData.metricTimeseries?.series?.[0]?.entity?.name || "Data"}{" "}
        {chartData.metric || "Chart"}
      </div>
    </div>
  );
};

export default LightweightChart;
