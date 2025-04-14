"use client";

import { useCitationContext } from "../context/CitationContext";
import { useChartContext } from "../context/ChartContext";

interface CitationButtonProps {
  messageId: string;
  citationCount: number;
}

const CitationButton = ({ messageId, citationCount }: CitationButtonProps) => {
  const { openCitationSidebar } = useCitationContext();
  const { closeChartSidebar } = useChartContext();

  // Debug logging

  if (citationCount === 0) {
    console.error("No citations available for message:", messageId);
    return null; // Don't render if we don't have any citations
  }

  // Handler to open citations and close chart sidebar
  const handleOpenCitations = () => {
    closeChartSidebar(); // Close chart sidebar if open
    openCitationSidebar(messageId); // Open citation sidebar
  };

  return (
    <button
      type="button"
      onClick={handleOpenCitations}
      className="flex items-center justify-between w-full py-3 px-4 bg-slate-800 
                border border-slate-700 rounded-lg hover:bg-slate-700 
                transition-colors duration-200 shadow-sm mb-2"
      aria-label={`View ${citationCount} ${
        citationCount === 1 ? "citation" : "citations"
      }`}
    >
      <div className="flex items-center">
        <div className="mr-3 w-8 h-8 flex items-center justify-center rounded-full bg-purple-900 text-purple-300">
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
            <path d="M6 9h12" />
            <path d="M6 15h12" />
            <path d="M13 5v14" />
            <path d="M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" />
          </svg>
        </div>
        <div className="text-left">
          <h4 className="font-medium text-white mb-0.5">
            {citationCount} {citationCount === 1 ? "Citation" : "Citations"}
          </h4>
          <p className="text-xs text-gray-400">
            Click to view reference sources
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

export default CitationButton;
