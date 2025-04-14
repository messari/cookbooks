"use client";

import { useChartContext } from "../context/ChartContext";
import { useCitationContext } from "../context/CitationContext";
import type { ChartData } from "../types";

interface ChartButtonProps {
  chart: ChartData;
  index: number;
}

const ChartButton = ({ chart, index }: ChartButtonProps) => {
  const { openChartSidebar } = useChartContext();
  const { closeCitationSidebar } = useCitationContext();

  // Extract chart information for display - with additional safety checks
  if (!chart || !chart.metricTimeseries) {
    console.error("Invalid chart data provided to ChartButton:", chart);
    return null; // Don't render if we don't have valid chart data
  }

  const entityName =
    chart.metricTimeseries?.series?.[0]?.entity?.name || "Data";
  const metric = chart.metric || "Chart";

  // Format date range for display
  let startDate = "Unknown";
  let endDate = "Unknown";

  try {
    startDate = chart.start
      ? new Date(chart.start).toLocaleDateString()
      : "Unknown";
    endDate = chart.end ? new Date(chart.end).toLocaleDateString() : "Unknown";
  } catch (e) {
    console.error("Error formatting chart dates:", e);
  }

  // Handler to open chart and close citation sidebar
  const handleOpenChart = () => {
    closeCitationSidebar(); // Close citation sidebar if open
    openChartSidebar(chart); // Open chart sidebar
  };

  return (
    <button
      type="button"
      onClick={handleOpenChart}
      className="flex items-center justify-between w-full py-3 px-4 bg-slate-800 
                border border-slate-700 rounded-lg hover:bg-slate-700 
                transition-colors duration-200 shadow-sm mb-2"
      aria-label={`View ${entityName} ${metric} chart`}
    >
      <div className="flex items-center">
        <div className="mr-3 w-8 h-8 flex items-center justify-center rounded-full bg-blue-900 text-blue-300">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M3 3v18h18" />
            <path d="M18 17V9" />
            <path d="M13 17V5" />
            <path d="M8 17v-3" />
          </svg>
        </div>
        <div className="text-left">
          <h4 className="font-medium text-white mb-0.5">
            {entityName} {metric}
          </h4>
          <p className="text-xs text-gray-400">
            {startDate} - {endDate}
          </p>
        </div>
      </div>
      <div className="text-gray-400">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M5 12h14" />
          <path d="m12 5 7 7-7 7" />
        </svg>
      </div>
    </button>
  );
};

export default ChartButton;
