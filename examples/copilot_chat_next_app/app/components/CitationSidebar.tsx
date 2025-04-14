"use client";

import { useEffect, useRef } from "react";
import { useCitationContext } from "../context/CitationContext";
import { useChartContext } from "../context/ChartContext";
import CitationCard from "./CitationCard";

const CitationSidebar = () => {
  const {
    sidebarOpen,
    citations,
    closeCitationSidebar,
    getCitationsByMessageId,
    activeMessageId,
  } = useCitationContext();
  const { closeChartSidebar, sidebarOpen: chartSidebarOpen } =
    useChartContext();

  const sidebarRef = useRef<HTMLDivElement>(null);

  // Close chart sidebar when citation sidebar opens
  useEffect(() => {
    if (sidebarOpen && chartSidebarOpen) {
      closeChartSidebar();
    }
  }, [sidebarOpen, chartSidebarOpen, closeChartSidebar]);

  // Add keyboard handler for escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && sidebarOpen) {
        closeCitationSidebar();
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [sidebarOpen, closeCitationSidebar]);

  if (!sidebarOpen) {
    return null;
  }

  // Get the citations for this message (already filtered in the context)
  const messageCitations = activeMessageId
    ? getCitationsByMessageId(activeMessageId)
    : [];

  return (
    <div
      className="fixed inset-y-0 right-0 w-[450px] bg-gray-900 shadow-xl border-l border-gray-700 z-30 overflow-y-auto transition-all duration-300 ease-in-out"
      ref={sidebarRef}
      tabIndex={-1}
      aria-hidden={!sidebarOpen}
      style={{
        width: "450px",
        transform: sidebarOpen ? "translateX(0)" : "translateX(100%)",
      }}
    >
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Citations</h2>
        <button
          type="button"
          onClick={closeCitationSidebar}
          className="p-1 rounded-full hover:bg-gray-700 transition-colors"
          aria-label="Close citation panel"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-gray-400"
            aria-hidden="true"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
      </div>

      <div className="p-4">
        {messageCitations.length === 0 ? (
          <p className="text-gray-400">
            No citations available for this message.
          </p>
        ) : (
          <ul className="space-y-4">
            {messageCitations.map((citation) => (
              <li key={`citation-${citation.citationId}`}>
                <CitationCard key={citation.citationId} citation={citation} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default CitationSidebar;
