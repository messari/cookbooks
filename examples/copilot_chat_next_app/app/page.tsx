"use client";

import { ChartProvider } from "./context/ChartContext";
import { CitationProvider } from "./context/CitationContext";
import { ApiSettingsProvider } from "./context/ApiSettingsContext";
import ChatInterface from "./components/ChatInterface";
import ChartSidebar from "./components/ChartSidebar";
import CitationSidebar from "./components/CitationSidebar";
import ApiSettings from "./components/ApiSettings";
import ErrorBoundary from "./components/ErrorBoundary";
import { useChartContext } from "./context/ChartContext";
import { useCitationContext } from "./context/CitationContext";
import { useEffect, useState } from "react";
import Image from "next/image";

export default function Home() {
  return (
    <ErrorBoundary>
      <ApiSettingsProvider>
        <ChartProvider>
          <CitationProvider>
            <FixedLayout />
          </CitationProvider>
        </ChartProvider>
      </ApiSettingsProvider>
    </ErrorBoundary>
  );
}

// New component to handle layout with fixed positioning
function FixedLayout() {
  const { sidebarOpen: chartSidebarOpen, closeChartSidebar } =
    useChartContext();
  const { sidebarOpen: citationSidebarOpen, closeCitationSidebar } =
    useCitationContext();
  const [chatWidth, setChatWidth] = useState("100%");

  // Update chat width when sidebar state changes or window resizes
  useEffect(() => {
    const SIDEBAR_WIDTH = 450; // pixels - using the same width for both sidebars
    const MAX_CHAT_WIDTH = 1000; // pixels - only used when sidebar is open

    const calculateChatWidth = () => {
      if (chartSidebarOpen || citationSidebarOpen) {
        // Calculate available width for chat when sidebar is open
        const windowWidth = window.innerWidth;
        const newChatWidth = Math.min(
          windowWidth - SIDEBAR_WIDTH,
          MAX_CHAT_WIDTH
        );
        setChatWidth(`${newChatWidth}px`);
      } else {
        // When sidebar is closed, chat takes full width minus small margins
        setChatWidth("calc(100% - 24px)"); // 12px margin on each side
      }
    };

    // Calculate immediately when sidebar state changes
    calculateChatWidth();

    // Recalculate if window size changes
    window.addEventListener("resize", calculateChatWidth);
    return () => window.removeEventListener("resize", calculateChatWidth);
  }, [chartSidebarOpen, citationSidebarOpen]);

  // Ensure only one sidebar is open at a time
  useEffect(() => {
    if (chartSidebarOpen && citationSidebarOpen) {
      // If both are open, close the citation sidebar
      closeCitationSidebar();
    }
  }, [chartSidebarOpen, citationSidebarOpen, closeCitationSidebar]);

  return (
    <div className="h-screen bg-gray-900 text-white overflow-hidden relative px-3">
      {/* Main chat container - absolutely positioned */}
      <div
        className="absolute top-0 left-0 h-full flex flex-col transition-all duration-300 ease-in-out"
        style={{
          width: chatWidth,
          maxWidth: "100%",
        }}
      >
        <div className="p-4 border-b border-gray-800">
          <div className="flex flex-row justify-between items-center mb-2">
            <div className="flex items-center gap-3">
              <Image
                src="/messari.png"
                alt="Messari Logo"
                width={48}
                height={48}
                className="rounded-md"
              />
              <h1 className="text-2xl font-bold">Messari AI Chat</h1>
            </div>
            <ApiSettings />
          </div>
          <div className="flex justify-between items-center">
            <p className="text-gray-400">
              Ask about developer integration with the Copilot API and SDK
            </p>
            <a
              href="https://github.com/messari/cookbooks/tree/master/examples/copilot_chat_next_app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
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
              >
                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
              </svg>
              GitHub
            </a>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <ChatInterface />
        </div>
      </div>

      {/* Chart sidebar - fixed positioning */}
      <ChartSidebar />

      {/* Citation sidebar - fixed positioning */}
      <CitationSidebar />
    </div>
  );
}
