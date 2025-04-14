"use client";

import React from "react";
import { ERROR_CODES, extractErrorCode } from "../utils/errorConstants";

interface ErrorDisplayProps {
  error: Error | null;
  customErrorMessage: string;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  customErrorMessage,
}) => {
  if (!error && !customErrorMessage) {
    return null;
  }

  // Extract error code if present
  const errorCode = error?.message ? extractErrorCode(error.message) : null;

  // Determine if this is a stream error based on the error message
  const isStreamError =
    (error?.message && error.message.includes("stream")) ||
    (customErrorMessage && customErrorMessage.includes("Something went wrong"));

  return (
    <div className="bg-red-900/50 border border-red-700 text-white p-4 rounded-lg mb-4 animate-fadeIn">
      <div className="flex items-start">
        <div className="bg-red-600 rounded-full p-1 mr-3 mt-0.5">
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
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <div>
          {/* Simple error title with retry counter if applicable */}
          <h3 className="font-medium text-lg text-red-100">
            {isStreamError ? "Connection Error" : "Error"}
          </h3>

          {/* Show simple message for stream errors, more details for other errors */}
          <p className="mt-1 text-red-100">
            {isStreamError
              ? customErrorMessage
              : isStreamError
              ? "Something went wrong with the AI response. Please try again."
              : customErrorMessage ||
                error?.message ||
                "An unknown error occurred"}
          </p>

          {/* Only show retry suggestions for stream errors, not for rate limit errors */}
          {isStreamError && (
            <p className="mt-2 text-red-200 text-sm">
              This could be due to a temporary network issue or high server
              load.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ErrorDisplay;
