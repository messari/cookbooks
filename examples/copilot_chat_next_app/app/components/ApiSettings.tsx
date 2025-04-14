"use client";

import { useApiSettings } from "../context/ApiSettingsContext";
import { useState } from "react";

const ApiSettings = () => {
  const {
    apiKey,
    setApiKey,
    verbosity,
    setVerbosity,
    streamFormat,
    setStreamFormat,
  } = useApiSettings();
  const [showTooltips, setShowTooltips] = useState<{ [key: string]: boolean }>({
    verbosity: false,
    streamFormat: false,
  });

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setApiKey(e.target.value);
  };

  const handleVerbosityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setVerbosity(e.target.value);
  };

  const handleStreamFormatChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setStreamFormat(e.target.value);
  };

  const toggleTooltip = (tooltip: string) => {
    setShowTooltips((prev) => ({
      ...prev,
      [tooltip]: !prev[tooltip],
    }));
  };

  return (
    <div className="flex items-center space-x-4">
      <div className="relative">
        <label htmlFor="verbosity-select" className="sr-only">
          Response Verbosity
        </label>
        <div className="flex items-center">
          <span className="text-white text-sm mr-2">Verbosity:</span>
          <select
            id="verbosity-select"
            value={verbosity}
            onChange={handleVerbosityChange}
            className="rounded px-3 py-1 bg-slate-800 border border-gray-700 text-white text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            aria-label="Select verbosity level"
          >
            <option value="succinct">Succinct</option>
            <option value="balanced">Balanced</option>
            <option value="verbose">Verbose</option>
          </select>
          <button
            className="ml-1 text-gray-400 hover:text-white"
            aria-label="Show verbosity info"
            onClick={() => toggleTooltip("verbosity")}
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
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
          </button>
        </div>
        {showTooltips.verbosity && (
          <div className="absolute z-10 mt-1 w-64 p-2 bg-gray-800 rounded-md shadow-lg text-xs text-white">
            Controls response length: Succinct (shorter), Balanced (default), or
            Verbose (detailed).
          </div>
        )}
      </div>
      <div className="relative">
        <label htmlFor="stream-format-select" className="sr-only">
          Stream Format
        </label>
        <div className="flex items-center">
          <span className="text-white text-sm mr-2">Stream Format:</span>
          <select
            id="stream-format-select"
            value={streamFormat}
            onChange={handleStreamFormatChange}
            className="rounded px-3 py-1 bg-slate-800 border border-gray-700 text-white text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            aria-label="Select stream format"
          >
            <option value="vercel">Vercel</option>
            <option value="openai">OpenAI</option>
          </select>
          <button
            className="ml-1 text-gray-400 hover:text-white"
            aria-label="Show stream format info"
            onClick={() => toggleTooltip("streamFormat")}
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
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
          </button>
        </div>
        {showTooltips.streamFormat && (
          <div className="absolute z-10 mt-1 w-64 p-2 bg-gray-800 rounded-md shadow-lg text-xs text-white">
            Controls API stream format: OpenAI (default) or Vercel format. For
            testing compatibility.
          </div>
        )}
      </div>
      <div className="relative flex-1 max-w-xs">
        <input
          type="text"
          placeholder="API Key (optional)"
          value={apiKey}
          onChange={handleApiKeyChange}
          className="w-full rounded px-3 py-1 bg-slate-800 border border-gray-700 text-white text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          aria-label="Enter API Key"
        />
      </div>
    </div>
  );
};

export default ApiSettings;
