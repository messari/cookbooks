"use client";

import { useEffect, useRef, useState } from "react";
import { useChartContext } from "../context/ChartContext";
import dynamic from "next/dynamic";

// Import the Lightweight Charts component with dynamic loading to avoid SSR issues
const LightweightChart = dynamic(() => import("./LightweightChart"), {
  ssr: false,
  loading: () => (
    <div className="h-[400px] w-full flex items-center justify-center bg-gray-900">
      <p className="text-white">Loading chart...</p>
    </div>
  ),
});

const ChartSidebar = () => {
  const { sidebarOpen, activeChart, closeChartSidebar } = useChartContext();
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Add animation and keyboard handlers
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // If modal is open, close it first
        if (modalOpen) {
          setModalOpen(false);
          e.stopPropagation(); // Prevent the event from closing the sidebar too
        }
        // Otherwise close the sidebar
        else if (sidebarOpen) {
          closeChartSidebar();
        }
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [sidebarOpen, closeChartSidebar, modalOpen]);

  // Handle keyboard interactions
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      if (modalOpen) {
        setModalOpen(false);
        e.stopPropagation();
      } else {
        closeChartSidebar();
      }
    }
  };

  // Handle opening modal
  const openModal = () => {
    setModalOpen(true);
  };

  // Handle closing modal
  const closeModal = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setModalOpen(false);
  };

  // Extract entity name for title if chart is active
  const entityName =
    activeChart?.metricTimeseries?.series?.[0]?.entity?.name || "Bitcoin";

  // Get the most descriptive metric name
  let metricName = activeChart?.metric || "price";
  // Try to get better description from schema if available
  if (activeChart?.metricTimeseries?.point_schema?.[1]?.name) {
    const schemaName = activeChart.metricTimeseries.point_schema[1].name;
    if (
      schemaName &&
      (schemaName.includes("Volume") || schemaName.includes("Market"))
    ) {
      metricName = schemaName;
    }
  }

  // Determine if this is a volume chart
  const isVolumeChart =
    metricName.toLowerCase().includes("volume") ||
    activeChart?.metricTimeseries?.point_schema?.[1]?.slug?.includes("volume");

  return (
    <>
      <div
        className={`fixed top-0 right-0 w-[450px] h-full bg-gray-900 border-l border-gray-800 shadow-xl z-50 transition-all duration-300 ease-in-out ${
          !sidebarOpen ? "translate-x-full" : "translate-x-0"
        }`}
        ref={sidebarRef}
        onKeyDown={handleKeyDown}
        tabIndex={-1}
        aria-hidden={!sidebarOpen}
        style={{
          width: "450px",
          transform: sidebarOpen ? "translateX(0)" : "translateX(100%)",
        }}
      >
        {/* Chart area - full width */}
        <div className="w-full h-full flex flex-col">
          {/* Chart header */}
          <div className="flex justify-between items-center p-4 border-b border-gray-800">
            <h2 className="text-xl font-semibold text-white truncate">
              {entityName} {metricName}
            </h2>
            {/* Close button */}
            <button
              type="button"
              className="p-2 rounded-full hover:bg-gray-800 transition-colors"
              onClick={closeChartSidebar}
              aria-label="Close chart view"
            >
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
                <path d="M18 6L6 18" />
                <path d="M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Chart content */}
          <div className="flex-1 p-6 overflow-auto bg-gray-950">
            {activeChart && (
              <div className="w-full h-full max-w-5xl mx-auto">
                <div className="relative">
                  <LightweightChart chartData={activeChart} theme="dark" />

                  {/* Expand button overlay */}
                  <button
                    type="button"
                    className="absolute top-4 right-4 p-2 rounded-full bg-gray-800 bg-opacity-60 hover:bg-opacity-80 transition-colors z-10"
                    onClick={openModal}
                    aria-label="Expand chart view"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M15 3h6v6"></path>
                      <path d="M9 21H3v-6"></path>
                      <path d="M21 3l-7 7"></path>
                      <path d="M3 21l7-7"></path>
                    </svg>
                  </button>
                </div>
                <div className="text-gray-400 text-xs mt-4">
                  Chart data from{" "}
                  {new Date(activeChart.start).toLocaleDateString()} to{" "}
                  {new Date(activeChart.end).toLocaleDateString()}
                </div>
                <div className="mt-6 bg-gray-900 rounded-lg p-4">
                  <h3 className="font-medium text-white mb-2">
                    Data Source and Disclaimers
                  </h3>
                  <ul className="text-gray-400 text-sm space-y-3">
                    <li className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>
                        <b>Data Source:</b> The{" "}
                        {isVolumeChart ? "volume" : "price and market"} metrics
                        are sourced from Messari, a reputable provider of
                        cryptocurrency data.
                      </span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>
                        <b>Disclaimer:</b> This data reflects past performance
                        and
                        {isVolumeChart
                          ? " trading activity."
                          : " widespread variability in prices indicates market volatility."}{" "}
                        Historical performance is not indicative of future
                        outcomes.
                      </span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>
                        <b>Chart Type:</b> Using TradingView Lightweight Charts
                        for enhanced visualization and industry-standard crypto
                        charting functionality.
                      </span>
                    </li>
                  </ul>
                  <p className="text-gray-400 text-sm mt-4">
                    This data provides a detailed snapshot of {entityName}'s
                    {isVolumeChart
                      ? " trading volume"
                      : " market behavior and price volatility"}{" "}
                    over the displayed period, informing decisions for traders
                    and investors.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && activeChart && (
        <div
          className="fixed inset-0 bg-black/95 z-[70] flex items-center justify-center p-4"
          onClick={closeModal}
        >
          <div
            className="w-[95vw] h-[90vh] bg-gray-900 rounded-lg shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Minimal header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800">
              <h3 className="text-lg font-medium text-white">
                {entityName} {metricName}
              </h3>
              <button
                onClick={closeModal}
                className="p-1 hover:bg-gray-800 rounded-full transition-colors"
                aria-label="Close expanded view"
              >
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
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>

            {/* Chart container - maximize space */}
            <div className="flex-1 min-h-0 bg-gray-950">
              {/* Only use LightweightChart */}
              <LightweightChart chartData={activeChart} theme="dark" />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ChartSidebar;
