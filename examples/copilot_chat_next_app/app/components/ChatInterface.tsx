"use client";

import { useChat } from "ai/react";
import { useState, useCallback, useEffect, useRef } from "react";
import { useChartContext } from "../context/ChartContext";
import { useCitationContext } from "../context/CitationContext";
import { useApiSettings } from "../context/ApiSettingsContext";
import ChatMessages from "./ChatMessages";
import ChatInput from "./ChatInput";
import ErrorDisplay from "./ErrorDisplay";
import type { ChartData, Citation, StreamingDataItem } from "../types";
import {
  ERROR_CODES,
  extractErrorCode,
  GENERIC_ERROR_MESSAGE,
} from "../utils/errorConstants";

const ChatInterface = () => {
  // Add a state to track if we're currently receiving a stream
  const [isReceivingStream, setIsReceivingStream] = useState<boolean>(false);
  const [isUnpackingData, setIsUnpackingData] = useState<boolean>(false);
  // Track the last response ID to ensure we don't lose messages
  const [lastResponseId, setLastResponseId] = useState<string | null>(null);
  // Track the last message ID for which we've processed data
  const [lastProcessedMessageId, setLastProcessedMessageId] = useState<
    string | null
  >(null);
  // Add state for customer error message display
  const [customErrorMessage, setCustomErrorMessage] = useState<string>("");

  // Get the API settings
  const { apiKey, verbosity, streamFormat } = useApiSettings();

  // Get the chart context to add charts and check sidebar state
  const {
    addChart,
    sidebarOpen: chartSidebarOpen,
    closeChartSidebar,
    charts: allCharts,
  } = useChartContext();

  // Get the citation context
  const {
    addCitation,
    sidebarOpen: citationSidebarOpen,
    closeCitationSidebar,
  } = useCitationContext();

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit: originalHandleSubmit,
    isLoading,
    error,
    data,
    setData,
    setMessages,
  } = useChat({
    api: "/api/chat",
    streamProtocol: "data", // Use data protocol for the stream instead of text
    id: "messari-chat", // Add a persistent ID for this chat
    onResponse: (response) => {
      setIsReceivingStream(true);

      // Clear any error messages on successful response
      setCustomErrorMessage("");
    },
    onFinish: (message) => {
      // Save this response ID
      setLastResponseId(message.id);
      console.log("messages on finish", messages);

      // Clear streaming content when finished as it's now part of messages
      setIsReceivingStream(false);
      setIsUnpackingData(true);
      setTimeout(() => {
        setIsUnpackingData(false);
      }, 2000);

      setCustomErrorMessage("");
    },
    onError: (error) => {
      console.error("Chat error:", error);

      // Clear streaming states
      setIsReceivingStream(false);

      // Extract error code if present
      const errorMessage = error?.message || "";
      const errorCode = extractErrorCode(errorMessage);
      console.log("errorCode", errorCode, errorMessage);

      // Create user-friendly error messages based on error code
      let userErrorMessage = GENERIC_ERROR_MESSAGE;

      switch (errorCode) {
        case ERROR_CODES.NO_CONTENT:
          userErrorMessage = "No content received from API. Please try again.";
          break;
        case ERROR_CODES.NETWORK_ERROR:
          userErrorMessage =
            "Network connection error. Please check your internet connection.";
          break;
        case ERROR_CODES.TIMEOUT:
          userErrorMessage = "Request timed out. Please try again.";
          break;
        case ERROR_CODES.UNAUTHORIZED:
          userErrorMessage = "Authentication error. Please check your API key.";
          break;
        case ERROR_CODES.SERVER_ERROR:
          userErrorMessage = "Server error occurred. Please try again later.";
          break;
        default:
          // Use generic message for unknown errors
          userErrorMessage = GENERIC_ERROR_MESSAGE;
      }
      setCustomErrorMessage(userErrorMessage);
    },
  });

  // New useEffect to process data after streaming has finished
  useEffect(() => {
    // Only process data when:
    // 1. We're not currently streaming
    // 2. We have data to process
    // 3. We have a lastResponseId that hasn't been processed yet
    if (
      !isReceivingStream &&
      isUnpackingData &&
      data &&
      Array.isArray(data) &&
      data.length > 0 &&
      lastResponseId &&
      lastResponseId !== lastProcessedMessageId
    ) {
      // Find the message object for this response ID
      const message = messages.find((msg) => msg.id === lastResponseId);

      if (message) {
        // Process each data item
        data.forEach((item) => {
          // Check the type property to determine how to process
          const dataItem = item as unknown as StreamingDataItem;

          // Handle chart data
          if (dataItem.type === "chart_data") {
            // Add each chart to the context
            dataItem.data.forEach((chartData: ChartData) => {
              // Pass the message ID and UUID to ensure idempotency
              addChart(chartData, message.id, dataItem.uuid);
            });
          }

          // Handle citation data
          if (dataItem.type === "citation_data") {
            // Add each citation to the context
            dataItem.data.forEach((citation: Citation) => {
              // Pass the message ID and UUID to ensure idempotency
              addCitation(citation, message.id, dataItem.uuid);
            });
          }
        });

        setIsUnpackingData(false);

        // Mark this message as processed
        setLastProcessedMessageId(lastResponseId);

        // Clear the data array to avoid processing it again
        setData([]);
      }
    }
  }, [
    isReceivingStream,
    data,
    lastResponseId,
    lastProcessedMessageId,
    messages,
    addChart,
    addCitation,
    setData,
  ]);

  // Custom submit handler that includes API settings
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    // If the error occurred during a response, check if we need to clean up empty messages
    if (messages.length >= 2) {
      const lastMessage = messages[messages.length - 1];
      const secondLastMessage = messages[messages.length - 2];

      // Check if the last message is from the assistant and is empty
      if (
        lastMessage.role === "assistant" &&
        (!lastMessage.content || lastMessage.content.trim() === "")
      ) {
        // Remove both the empty assistant message and the user message that triggered it and flush the data
        console.log(
          "Removing empty assistant message and corresponding user message"
        );
        setData([]);
        setMessages(messages.slice(0, -2));
      }
    }

    // Check if the last message is a user query (no response yet)
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === "user") {
        console.log("Removing pending user message");
        setMessages(messages.slice(0, -1));
      }
    }

    setCustomErrorMessage("");
    e.preventDefault();
    // Close the chart sidebar if it's open
    if (chartSidebarOpen) {
      closeChartSidebar();
    }
    // Close the citation sidebar if it's open
    if (citationSidebarOpen) {
      closeCitationSidebar();
    }

    // Call the original submit handler with the current API settings
    // This ensures the settings are applied for each request
    originalHandleSubmit(e, {
      body: {
        apiSettings: {
          apiKey,
          verbosity,
          streamFormat,
        },
      },
    });
  };

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Error display */}
      {(error || customErrorMessage) && (
        <div className="px-4 pt-4">
          <ErrorDisplay
            error={error ? error : null}
            customErrorMessage={customErrorMessage}
          />
        </div>
      )}

      {/* Chat messages - Pass the streaming state and current message ID */}
      <ChatMessages
        messages={messages}
        isStreaming={isReceivingStream || isUnpackingData}
        streamingMessageId={messages[messages.length - 1]?.id}
      />

      {/* Chat input */}
      <ChatInput
        input={input}
        handleInputChange={handleInputChange}
        handleSubmit={handleSubmit}
        isLoading={isLoading}
      />
    </div>
  );
};

export default ChatInterface;
