"use client";

import { createContext, useState, useContext, useEffect } from "react";
import type { ChartData, ChartContextType, ChartProviderProps } from "../types";
import { useCitationContext } from "./CitationContext";

const ChartContext = createContext<ChartContextType | undefined>(undefined);

export const useChartContext = () => {
  const context = useContext(ChartContext);
  if (!context) {
    throw new Error("useChartContext must be used within a ChartProvider");
  }
  return context;
};

// Helper to validate chart data and log any issues
const isValidChartData = (chart: ChartData): boolean => {
  if (!chart) {
    console.warn("Chart data is null or undefined");
    return false;
  }

  if (!chart.metricTimeseries) {
    console.warn("Chart missing metricTimeseries:", chart);
    return false;
  }

  if (
    !chart.metricTimeseries.series ||
    chart.metricTimeseries.series.length === 0
  ) {
    console.warn(
      "Chart missing series array:",
      chart.metric,
      chart.entities?.[0]?.entityId
    );
    return false;
  }

  const firstSeries = chart.metricTimeseries.series[0];
  if (!firstSeries) {
    console.warn(
      "Chart first series is invalid:",
      chart.metric,
      chart.entities?.[0]?.entityId
    );
    return false;
  }

  if (!firstSeries.points || firstSeries.points.length === 0) {
    console.warn(
      "Chart has no data points:",
      chart.metric,
      chart.entities?.[0]?.entityId
    );
    return false;
  }

  // Validate that the points have the expected format
  const firstPoint = firstSeries.points[0];
  if (!Array.isArray(firstPoint) || firstPoint.length < 2) {
    console.warn(
      "Chart points are not in the expected format:",
      chart.metric,
      firstPoint
    );
    return false;
  }

  // Additional validation to detect problematic data patterns

  // Check for minimum number of data points (at least 3 for meaningful visualization)
  if (firstSeries.points.length < 3) {
    console.warn(
      "Chart has too few data points for meaningful visualization:",
      chart.metric,
      firstSeries.points.length
    );
    return false;
  }

  // Check if all data points have the same value (would render as vertical lines)
  const checkUniformValues = (pointIndex: number): boolean => {
    if (pointIndex < 1 || pointIndex >= firstPoint.length) return false;

    // Extract values at the specified index from all points
    const values = firstSeries.points.map((point) => point[pointIndex]);

    // If all values are the same, this will render poorly
    const uniqueValues = new Set(
      values.filter((v) => v !== undefined && v !== null)
    );
    return uniqueValues.size <= 1;
  };

  // For price charts, check if we have uniform high/low values (typically indices 3 and 4)
  // For prices or volume, check if values at positions 1-5 (if they exist) are uniform
  const hasUniformValues =
    (firstPoint.length >= 5 &&
      checkUniformValues(2) &&
      checkUniformValues(3)) || // high & low uniform
    (firstPoint.length >= 2 && checkUniformValues(1)); // first value column is uniform

  if (hasUniformValues) {
    console.warn(
      "Chart has uniform data values that would render poorly:",
      chart.metric,
      chart.entities?.[0]?.entityId
    );
    return false;
  }

  // Check if the data looks like a valid chart by ensuring variation in values
  // This helps catch charts with all zeroes or all identical values
  let hasValidVariation = false;

  // Check if we have at least some data variance in any column
  for (let i = 1; i < firstPoint.length; i++) {
    const values = firstSeries.points.map((point) => point[i]);
    const nonNullValues = values.filter(
      (v) => v !== undefined && v !== null && v !== 0
    );

    // If we have at least some variation in non-zero values, the chart is probably valid
    if (nonNullValues.length > 0) {
      const uniqueValues = new Set(nonNullValues);
      if (uniqueValues.size > 1) {
        hasValidVariation = true;
        break;
      }
    }
  }

  if (!hasValidVariation) {
    console.warn(
      "Chart lacks data variation needed for visualization:",
      chart.metric,
      chart.entities?.[0]?.entityId
    );
    return false;
  }

  return true;
};

export const ChartProvider = ({ children }: ChartProviderProps) => {
  // Store all charts in a single array for display
  const [charts, setCharts] = useState<ChartData[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [activeChart, setActiveChart] = useState<ChartData | null>(null);
  // Add a Set to track idempotency keys that have been used
  const [processedKeys, setProcessedKeys] = useState<Set<string>>(new Set());

  const addChart = (
    chart: ChartData,
    messageId?: string,
    idempotencyKey?: string
  ) => {
    // Add messageId to the chart if provided
    const chartWithMessageId = messageId ? { ...chart, messageId } : chart;

    // Check if we've already processed this idempotency key
    if (idempotencyKey && processedKeys.has(idempotencyKey)) {
      return;
    }

    // Check if the chart has valid data
    if (!isValidChartData(chartWithMessageId)) {
      console.warn(
        "Skipping invalid chart:",
        chartWithMessageId.metric,
        chartWithMessageId.entities?.[0]?.entityId
      );
      return;
    }

    // Update the charts array
    setCharts((prev) => {
      // First check if we already have a chart with the same UUID (if available)
      if (chartWithMessageId.uuid) {
        const existingUuidChart = prev.find(
          (c) => c.uuid === chartWithMessageId.uuid
        );
        if (existingUuidChart) {
          return prev;
        }
      }

      // Then check for duplicate based on chart properties
      const existingChartIndex = prev.findIndex(
        (c) =>
          c.metric === chartWithMessageId.metric &&
          c.entities[0]?.entityId ===
            chartWithMessageId.entities[0]?.entityId &&
          c.start === chartWithMessageId.start &&
          c.end === chartWithMessageId.end
      );

      // If the chart exists but has a different messageId, update it
      if (existingChartIndex !== -1) {
        // Only update if the messageId is provided and different
        if (messageId && prev[existingChartIndex].messageId !== messageId) {
          // Create a new array with the updated chart
          const updatedCharts = [...prev];
          updatedCharts[existingChartIndex] = chartWithMessageId;
          return updatedCharts;
        }

        // If same messageId or no messageId provided, skip adding a duplicate
        return prev;
      }

      // If chart doesn't exist yet, add it

      // If idempotencyKey is provided, add it to the processed keys
      if (idempotencyKey) {
        setProcessedKeys((prevKeys) => {
          const newKeys = new Set(prevKeys);
          newKeys.add(idempotencyKey);
          return newKeys;
        });
      }

      return [...prev, chartWithMessageId];
    });
  };

  // Add a function to remove all charts with streaming IDs
  const removeStreamingCharts = () => {
    setCharts((prevCharts) => {
      const nonStreamingCharts = prevCharts.filter(
        (chart) => !chart.messageId || !chart.messageId.startsWith("stream-")
      );
      return nonStreamingCharts;
    });
  };

  const clearCharts = () => {
    // Keep the charts array but close the sidebar
    setSidebarOpen(false);
    setActiveChart(null);
  };

  const openChartSidebar = (chart: ChartData) => {
    // Double-check that the chart is still valid before opening it
    if (!isValidChartData(chart)) {
      console.warn("Attempted to open invalid chart in sidebar");
      return;
    }

    setActiveChart(chart);
    setSidebarOpen(true);
  };

  const closeChartSidebar = () => {
    setSidebarOpen(false);
  };

  // Get charts associated with a specific message ID
  const getChartsByMessageId = (messageId: string): ChartData[] => {
    if (!messageId) {
      return [];
    }

    // Filter charts based on the message ID - strict matching only
    const chartsForMessage = charts.filter((chart) => {
      // Safety check for undefined charts
      if (!chart || !chart.messageId) return false;

      // ONLY return charts with exactly matching message IDs
      return chart.messageId === messageId;
    });

    // Filter to only return valid charts
    return chartsForMessage.filter(isValidChartData);
  };

  // Filter valid charts for external consumption
  const validCharts = charts.filter(isValidChartData);

  return (
    <ChartContext.Provider
      value={{
        charts: validCharts, // Only expose valid charts to consumers
        addChart,
        sidebarOpen,
        activeChart,
        openChartSidebar,
        closeChartSidebar,
        getChartsByMessageId,
      }}
    >
      {children}
    </ChartContext.Provider>
  );
};
