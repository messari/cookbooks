"use client";

import { createContext, useState, useContext } from "react";
import type { Citation, CitationContextType } from "../types";
import { useChartContext } from "./ChartContext";

const CitationContext = createContext<CitationContextType | undefined>(
  undefined
);

export const useCitationContext = () => {
  const context = useContext(CitationContext);
  if (!context) {
    throw new Error(
      "useCitationContext must be used within a CitationProvider"
    );
  }
  return context;
};

// Helper to validate citation data
const isValidCitation = (citation: Citation): boolean => {
  if (!citation) {
    console.warn("Citation data is null or undefined");
    return false;
  }

  if (!citation.citationId || !citation.domain) {
    console.warn("Citation missing required fields:", citation);
    return false;
  }

  return true;
};

export const CitationProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  // Store all citations in a single array
  const [citations, setCitations] = useState<Citation[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  // Add a Set to track idempotency keys that have been used
  const [processedKeys, setProcessedKeys] = useState<Set<string>>(new Set());

  // We can't use useChartContext directly here since it would create a circular dependency
  // Instead, we'll handle the coordination at the component level where both contexts are available

  const addCitation = (
    citation: Citation,
    messageId?: string,
    idempotencyKey?: string
  ) => {
    // Add messageId to the citation if provided
    const citationWithMessageId = messageId
      ? { ...citation, messageId }
      : citation;

    // Check if we've already processed this idempotency key
    if (idempotencyKey && processedKeys.has(idempotencyKey)) {
      return;
    }

    // Check if the citation has valid data
    if (!isValidCitation(citationWithMessageId)) {
      console.warn(
        "Skipping invalid citation:",
        citationWithMessageId.citationId,
        citationWithMessageId.domain
      );
      return;
    }

    // Update the citations array
    setCitations((prev) => {
      // First check if we already have a citation with the same UUID (if available)
      if (citationWithMessageId.uuid) {
        const existingUuidCitation = prev.find(
          (c) => c.uuid === citationWithMessageId.uuid
        );
        if (existingUuidCitation) {
          return prev;
        }
      }

      // Then check for duplicate based on citation properties
      const existingCitationIndex = prev.findIndex(
        (c) =>
          c.citationId === citationWithMessageId.citationId &&
          c.domain === citationWithMessageId.domain
      );

      // If the citation exists but has a different messageId, update it
      if (existingCitationIndex !== -1) {
        // Only update if the messageId is provided and different
        if (messageId && prev[existingCitationIndex].messageId !== messageId) {
          // Create a new array with the updated citation
          const updatedCitations = [...prev];
          updatedCitations[existingCitationIndex] = citationWithMessageId;
          return updatedCitations;
        }

        // If same messageId or no messageId provided, skip adding a duplicate
        return prev;
      }

      // If idempotencyKey is provided, add it to the processed keys
      if (idempotencyKey) {
        setProcessedKeys((prevKeys) => {
          const newKeys = new Set(prevKeys);
          newKeys.add(idempotencyKey);
          return newKeys;
        });
      }

      return [...prev, citationWithMessageId];
    });
  };

  const openCitationSidebar = (messageId: string) => {
    // Check that there are citations for this message before opening it
    const citationsForMessage = getCitationsByMessageId(messageId);
    if (citationsForMessage.length === 0) {
      console.warn("Attempted to open sidebar for message with no citations");
      return;
    }

    setActiveMessageId(messageId);
    setSidebarOpen(true);
  };

  const closeCitationSidebar = () => {
    setSidebarOpen(false);
  };

  // Get citations associated with a specific message ID
  const getCitationsByMessageId = (messageId: string): Citation[] => {
    if (!messageId) {
      return [];
    }

    // Log all message IDs to help debug
    const allMessageIds = citations
      .map((citation) => citation.messageId)
      .filter(Boolean); // Filter out undefined/null

    // Check if this is a streaming ID
    const isStreamingId = messageId.startsWith("stream-");

    // Filter citations based on the message ID - strict matching only
    const citationsForMessage = citations.filter((citation) => {
      // Safety check for undefined citations
      if (!citation || !citation.messageId) return false;

      // ONLY return citations with exactly matching message IDs
      return citation.messageId === messageId;
    });

    // Filter to only return valid citations
    return citationsForMessage.filter((citation) => {
      return isValidCitation(citation);
    });
  };

  // Filter valid citations for external consumption
  const validCitations = citations.filter(isValidCitation);

  return (
    <CitationContext.Provider
      value={{
        citations: validCitations, // Only expose valid citations to consumers
        addCitation,
        sidebarOpen,
        activeMessageId,
        openCitationSidebar,
        closeCitationSidebar,
        getCitationsByMessageId,
      }}
    >
      {children}
    </CitationContext.Provider>
  );
};
