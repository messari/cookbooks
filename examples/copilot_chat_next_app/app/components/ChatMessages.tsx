// @ts-nocheck
"use client";

import { useRef, useEffect, FC, memo, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import { useChartContext } from "../context/ChartContext";
import { useCitationContext } from "../context/CitationContext";
import ChartButton from "./ChartButton";
import CitationButton from "./CitationButton";
import CitationCard from "./CitationCard";
import { ChartData, Citation } from "../types";

interface ChatMessagesProps {
  messages: Array<{ id: string; role: string; content: string }>;
  isStreaming: boolean;
  streamingMessageId: string | null;
}

//
// HELPER FUNCTIONS
//

/**
 * Removes chart data from message content
 */
const removeChartData = (content: string): string => {
  if (!content) return "";

  const lines = content.split("\n");
  const filteredLines = lines.filter((line) => {
    // Skip lines that contain chart data markers
    return !(
      line.includes("$$CHART_DATA") ||
      line.includes("$CHART_DATA") ||
      (line.trim().startsWith("$$") && line.includes("chart")) ||
      (line.trim().startsWith("{") &&
        (line.includes("metricTimeseries") ||
          line.includes("chart_data") ||
          line.includes("entities")))
    );
  });

  return filteredLines.join("\n").trim();
};

/**
 * Removes citation data from message content
 */
const removeCitationData = (content: string): string => {
  if (!content) return "";

  const lines = content.split("\n");
  const filteredLines = lines.filter((line) => {
    // Skip lines that contain citation data markers
    return !(
      line.includes("$$CITATION_DATA") ||
      line.includes("$CITATION_DATA") ||
      (line.trim().startsWith("$$") && line.includes("citation")) ||
      (line.trim().startsWith("{") &&
        (line.includes("cited_sources") || line.includes("citation")))
    );
  });

  return filteredLines.join("\n").trim();
};

/**
 * Creates a memoized content cleaner function
 */

/**
 * Optimized markdown renderer that uses a wrapper component
 * to prevent unnecessary re-renders
 */
const MarkdownRenderer = memo(
  ({ content, components }: { content: string; components: Components }) => {
    // Force the content to be treated as a primitive value for memoization
    const contentAsKey = useMemo(() => content, [content]);

    return (
      <ReactMarkdown components={components} remarkPlugins={[remarkGfm]}>
        {contentAsKey}
      </ReactMarkdown>
    );
  }
);

/**
 * Main message container component that handles charts
 */
const MessageContainer = ({
  message,
  messageCharts,
  messageCitations,
  markdownComponents,
  deferCitationTextInjection,
}: {
  message: { id: string; role: string; content: string };
  messageCharts: ChartData[];
  messageCitations: Citation[];
  markdownComponents: Components;
  deferCitationTextInjection: boolean;
}) => {
  const hasCharts = messageCharts.length > 0;
  const hasCitations = messageCitations.length > 0;
  const isMessageStreaming =
    deferCitationTextInjection && message.role === "assistant";

  return (
    <div
      className={`message ${
        message.role === "user" ? "user-message" : "assistant-message"
      }`}
    >
      <div className="bg-slate-800 p-4 rounded-lg shadow">
        <MessageHeader role={message.role} />

        {/* During streaming, use a simpler content display. After streaming, use the full MessageContent */}
        {isMessageStreaming ? (
          <div
            className={`pl-10 markdown-content prose prose-invert max-w-none ${
              message.role === "user"
                ? "user-message-content"
                : "assistant-message-content"
            }`}
            style={{ color: "white !important" }}
          >
            <MarkdownRenderer
              content={message.content}
              components={markdownComponents}
            />
          </div>
        ) : (
          <MessageContent
            message={message}
            hasCitations={hasCitations}
            messageCitations={messageCitations}
            markdownComponents={markdownComponents}
          />
        )}
      </div>

      {/* Only show buttons when not streaming */}
      {!isMessageStreaming && (
        <MessageButtons
          hasCharts={hasCharts}
          hasCitations={hasCitations}
          messageCharts={messageCharts}
          messageCitations={messageCitations}
          messageId={message.id}
        />
      )}
    </div>
  );
};
// Custom comparison function to prevent unnecessary rerenders
(prevProps, nextProps) => {
  // During streaming, we need to rerender on content changes
  if (prevProps.isStreaming || nextProps.isStreaming) {
    return prevProps.message.content === nextProps.message.content;
  }

  // Otherwise, use our optimized comparison
  return (
    prevProps.message.content === nextProps.message.content &&
    prevProps.messageCharts.length === nextProps.messageCharts.length &&
    prevProps.messageCitations.length === nextProps.messageCitations.length
  );
};

/**
 * Memoized component that handles message content and citation processing
 */
const MessageContent = memo(
  ({
    message,
    hasCitations,
    messageCitations,
    markdownComponents,
  }: {
    message: { id: string; role: string; content: string };
    hasCitations: boolean;
    messageCitations: Citation[];
    markdownComponents: Components;
  }) => {
    /**
     * Processes the content to identify and mark citation references
     * for later replacement with interactive components
     */
    const processContentWithCitations = (
      content: string,
      citations: Citation[]
    ) => {
      if (!citations || citations.length === 0 || !content) return content;

      let processedContent = content;

      // Process footnote-style citations like [^1], [^2], etc.
      const footnotePattern = /\[\^(\d+)\]/g;
      processedContent = processedContent.replace(
        footnotePattern,
        (match, citationNum) => {
          const num = parseInt(citationNum, 10);
          if (isNaN(num) || num <= 0 || num > citations.length) {
            return match; // Return unchanged if number is invalid or out of range
          }
          // Instead of creating HTML, use a special marker that we can identify later
          return `[[CITATION:${message.id}:${num}:${citationNum}]]`;
        }
      );

      // Process bracket-style citations like [1], [2], etc.
      const bracketPattern = /\[(\d+)\]/g;
      processedContent = processedContent.replace(
        bracketPattern,
        (match, citationNum) => {
          const num = parseInt(citationNum, 10);
          if (isNaN(num) || num <= 0 || num > citations.length) {
            return match; // Return unchanged if number is invalid or out of range
          }
          // Instead of creating HTML, use a special marker that we can identify later
          return `[[CITATION:${message.id}:${num}:${citationNum}]]`;
        }
      );

      return processedContent;
    };

    /**
     * Processes text to replace citation markers with interactive components
     */
    const processCitationText = (text: string, messageId: string) => {
      if (typeof text !== "string") {
        return text;
      }

      // Handle citation patterns:
      // 1. Our own placeholder format: [[CITATION:msgId:num:citationNum]]
      // 2. Direct citation format: [1], [2], etc.
      // 3. Footnote format: [^1], [^2], etc.

      let hasChanges = false;

      // Pattern 1: Process our placeholder format
      if (text.includes("[[CITATION:")) {
        const parts = text.split(/(\[\[CITATION:[^[\]]+\]\])/);

        const processedParts = parts.map((part, index) => {
          if (part.startsWith("[[CITATION:")) {
            hasChanges = true;
            const match = part.match(/\[\[CITATION:([^:]+):(\d+):(\d+)\]\]/);
            if (!match) return part;

            const [_, msgId, numStr, citationNumStr] = match;
            const num = parseInt(numStr, 10);

            return (
              <CitationTooltip
                key={`citation-${messageId}-${index}`}
                citationNum={num}
                messageId={msgId}
                citations={messageCitations}
              >
                {citationNumStr.includes("^")
                  ? `[^${citationNumStr}]`
                  : `[${citationNumStr}]`}
              </CitationTooltip>
            );
          }
          return part;
        });

        if (hasChanges) {
          return processedParts;
        }
      }

      // Pattern 2 & 3: Process direct citation formats
      const bracketCitationRegex = /(\[\^?\d+\])/g;
      if (bracketCitationRegex.test(text)) {
        const parts = text.split(bracketCitationRegex);

        const processedParts = parts.map((part, index) => {
          // Check if this part looks like a citation [number] or [^number]
          if (/^\[\^?\d+\]$/.test(part)) {
            hasChanges = true;
            const numMatch = part.match(/\[\^?(\d+)\]/);
            if (!numMatch) return part;

            const citationNum = parseInt(numMatch[1], 10);

            // Skip if citation number is out of range
            if (citationNum <= 0 || citationNum > messageCitations.length) {
              return part; // Return unchanged if number is out of range
            }

            return (
              <CitationTooltip
                key={`direct-citation-${messageId}-${index}`}
                citationNum={citationNum}
                messageId={message.id}
                citations={messageCitations}
              >
                {part}
              </CitationTooltip>
            );
          }
          return part;
        });

        if (hasChanges) {
          return processedParts;
        }
      }

      return text;
    };

    /**
     * Prepares the content before rendering with ReactMarkdown
     */
    const preProcessContent = (content: string) => {
      if (!hasCitations || !content) return content;

      const rawCitationPattern = /\[\[CITATION:([^:]+):(\d+):(\d+)\]\]/g;

      return content.replace(
        rawCitationPattern,
        (match, messageId, numStr, citationNumStr) => {
          return `[${citationNumStr}]`; // Convert to standard format that our components can handle
        }
      );
    };

    /**
     * Additional pre-processing to ensure direct citations are handled properly
     */
    const enhanceDirectCitations = (content: string) => {
      if (!hasCitations || !messageCitations.length || !content) return content;

      let processedContent = content;

      // Process footnote-style citations [^1]
      const footnoteRegex = /\[\^(\d+)\]/g;
      processedContent = processedContent.replace(
        footnoteRegex,
        (match, numStr) => {
          const num = parseInt(numStr, 10);
          if (num > 0 && num <= messageCitations.length) {
            return `[[CITATION:${message.id}:${num}:${numStr}]]`;
          }
          return match;
        }
      );

      // Process bracket-style citations [1]
      const bracketRegex = /\[(\d+)\]/g;
      processedContent = processedContent.replace(
        bracketRegex,
        (match, numStr) => {
          const num = parseInt(numStr, 10);
          if (num > 0 && num <= messageCitations.length) {
            return `[[CITATION:${message.id}:${num}:${numStr}]]`;
          }
          return match;
        }
      );

      return processedContent;
    };

    // Process content with citations if needed
    const contentToRender =
      hasCitations && messageCitations.length > 0
        ? processContentWithCitations(message.content, messageCitations)
        : message.content;

    // Apply both citation enhancement and preprocessing
    let finalContent = enhanceDirectCitations(contentToRender);
    finalContent = preProcessContent(finalContent);

    /**
     * Creates customized markdown components with citation processing
     */
    const createCustomMarkdownComponents = () => {
      return {
        ...markdownComponents,
        p: ({ children, node }: { children: React.ReactNode; node?: any }) => {
          return renderElementWithCitations("p", children, "mb-4 text-white");
        },
        li: ({ children, node }: { children: React.ReactNode; node?: any }) => {
          return renderElementWithCitations("li", children, "mb-1 text-white");
        },
        h1: ({ children }: { children: React.ReactNode }) => {
          return renderElementWithCitations(
            "h1",
            children,
            "text-2xl font-bold mb-4 mt-6 text-white"
          );
        },
        h2: ({ children }: { children: React.ReactNode }) => {
          return renderElementWithCitations(
            "h2",
            children,
            "text-xl font-bold mb-3 mt-5 text-white"
          );
        },
        h3: ({ children }: { children: React.ReactNode }) => {
          return renderElementWithCitations(
            "h3",
            children,
            "text-lg font-bold mb-2 mt-4 text-white"
          );
        },
        td: ({ children }: { children: React.ReactNode }) => {
          return renderElementWithCitations(
            "td",
            children,
            "border border-gray-700 px-4 py-2 text-white"
          );
        },
        th: ({ children }: { children: React.ReactNode }) => {
          return renderElementWithCitations(
            "th",
            children,
            "border border-gray-700 px-4 py-2 bg-gray-800 text-white"
          );
        },
        ul: ({ children }: { children: React.ReactNode }) => {
          return (
            <ul className="list-disc pl-5 mb-4 space-y-1 text-white">
              {children}
            </ul>
          );
        },
        ol: ({ children }: { children: React.ReactNode }) => {
          return (
            <ol className="list-decimal pl-5 mb-4 space-y-1 text-white">
              {children}
            </ol>
          );
        },
        code: ({
          inline,
          className,
          children,
          ...props
        }: {
          inline?: boolean;
          className?: string;
          children: React.ReactNode;
        }) => {
          if (inline && typeof children === "string") {
            // For inline code, check if it contains citation markers
            if (
              children.includes("[[CITATION:") ||
              /\[\^?\d+\]/.test(children)
            ) {
              return (
                <code className="bg-gray-800 px-1 py-0.5 rounded text-sm text-white">
                  {processCitationText(children, message.id)}
                </code>
              );
            }
          }

          // Default rendering for non-citation code
          const match = /language-(\w+)/.exec(className || "");
          return !inline ? (
            <pre className="bg-gray-800 p-4 rounded-lg overflow-auto mb-4 text-sm text-white">
              <code className={match ? className : ""} {...props}>
                {children}
              </code>
            </pre>
          ) : (
            <code
              className="bg-gray-800 px-1 py-0.5 rounded text-sm text-white"
              {...props}
            >
              {children}
            </code>
          );
        },
        span: ({ children }: { children: React.ReactNode }) => {
          if (typeof children === "string") {
            return <span>{processCitationText(children, message.id)}</span>;
          }
          return <span>{children}</span>;
        },
        text: ({ children }: { children: React.ReactNode }) => {
          if (typeof children === "string") {
            // Check if the text contains citation patterns
            if (
              children.includes("[[CITATION:") ||
              /\[\^?\d+\]/.test(children)
            ) {
              return <>{processCitationText(children, message.id)}</>;
            }
          }
          return <>{children}</>;
        },
      };
    };

    /**
     * Helper for rendering elements with citation support
     */
    const renderElementWithCitations = (
      elementType: string,
      children: React.ReactNode,
      className: string
    ) => {
      if (typeof children === "string") {
        // Direct string child, process for citations
        const Element = elementType as keyof JSX.IntrinsicElements;
        return (
          <Element className={className}>
            {processCitationText(children, message.id)}
          </Element>
        );
      } else if (Array.isArray(children)) {
        // Array of children, process each string child for citations
        const Element = elementType as keyof JSX.IntrinsicElements;
        return (
          <Element className={className}>
            {children.map((child, index) => {
              if (typeof child === "string") {
                return (
                  <span key={index}>
                    {processCitationText(child, message.id)}
                  </span>
                );
              }
              return <span key={index}>{child}</span>;
            })}
          </Element>
        );
      }

      // Non-string children, pass through
      const Element = elementType as keyof JSX.IntrinsicElements;
      return <Element className={className}>{children}</Element>;
    };

    // Create the custom markdown components
    const customMarkdownComponents = createCustomMarkdownComponents();

    console.log("FINISH PROCESSING CITATIONS isMessageStreaming", message.id);

    return (
      <div
        className={`pl-10 markdown-content prose prose-invert max-w-none ${
          message.role === "user"
            ? "user-message-content"
            : "assistant-message-content"
        }`}
        style={{ color: "white !important" }}
      >
        <MarkdownRenderer
          content={finalContent}
          components={customMarkdownComponents}
        />
      </div>
    );
  },
  // Custom comparison function for MessageContent
  (prevProps, nextProps) => {
    // Only rerender if the message content or citation count changes
    return (
      prevProps.message.content === nextProps.message.content &&
      prevProps.hasCitations === nextProps.hasCitations &&
      prevProps.messageCitations.length === nextProps.messageCitations.length
    );
  }
);

/**
 * Renders the message header with appropriate icon
 */
const MessageHeader = ({ role }: { role: string }) => {
  return (
    <div className="flex items-center mb-2">
      <div
        className={`mr-3 rounded-full p-2 ${
          role === "user"
            ? "bg-blue-700 text-blue-200"
            : "bg-emerald-500 text-emerald-100"
        }`}
      >
        {role === "user" ? (
          // User icon
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
            aria-label="User icon"
            role="img"
          >
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        ) : (
          // AI icon
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
            aria-label="AI icon"
            role="img"
          >
            <rect width="18" height="10" x="3" y="11" rx="2" />
            <circle cx="12" cy="5" r="2" />
            <path d="M12 7v4" />
            <line x1="8" x2="8" y1="16" y2="16" />
            <line x1="16" x2="16" y1="16" y2="16" />
          </svg>
        )}
      </div>
      <div className="font-medium">
        {role === "user" ? "You" : "Messari AI"}
      </div>
    </div>
  );
};

/**
 * Renders chart and citation buttons for a message
 */
const MessageButtons = ({
  hasCharts,
  hasCitations,
  messageCharts,
  messageCitations,
  messageId,
}: {
  hasCharts: boolean;
  hasCitations: boolean;
  messageCharts: any[];
  messageCitations: any[];
  messageId: string;
}) => {
  return (
    <div className="mt-4 buttons-container">
      {/* Display chart buttons if this message has associated charts */}
      {hasCharts && (
        <div className="chart-buttons">
          {messageCharts.map((chart, index) => (
            <ChartButton
              key={`chart-${index}-${chart.entities[0]?.entityId}-${chart.dataset}-${chart.metric}-${chart.start}`}
              chart={chart}
              index={index}
            />
          ))}
        </div>
      )}

      {/* Display citation button if this message has associated citations */}
      {hasCitations && (
        <CitationButton
          messageId={messageId}
          citationCount={messageCitations.length}
        />
      )}
    </div>
  );
};

/**
 * Component to handle hovering behavior for citations
 */
const CitationTooltip = ({
  citationNum,
  messageId,
  children,
  citations,
}: {
  citationNum: number;
  messageId: string;
  children: React.ReactNode;
  citations: Citation[];
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [placement, setPlacement] = useState("top");
  const tooltipRef = useRef<HTMLDivElement>(null);
  const linkRef = useRef<HTMLAnchorElement>(null);

  /**
   * Find the citation by citationId first, then by array index (1-based) as fallback
   */
  const citation = useMemo(() => {
    // First try to find by citationId
    const byId = citations.find((c) => c.citationId === citationNum);
    if (byId) return byId;

    // If not found, treat citationNum as 1-based index
    // Make sure we don't go out of bounds
    if (citationNum > 0 && citationNum <= citations.length) {
      return citations[citationNum - 1];
    }

    return null;
  }, [citations, citationNum]);

  // No tooltip if no matching citation
  if (!citation) {
    return <>{children}</>;
  }

  // Get the URL from the citation, or fall back to the anchor link
  const citationUrl = citation.url || `#citation-${messageId}-${citationNum}`;

  // Check if it's a real URL or an anchor fallback
  const isExternalUrl = !!citation.url;

  /**
   * Handle mouse enter event to show tooltip
   */
  const handleMouseEnter = (e: React.MouseEvent) => {
    // Get the position of the link
    if (linkRef.current) {
      const rect = linkRef.current.getBoundingClientRect();

      // Check if we're near the top of the viewport
      const isNearTop = rect.top < 120;

      // Default to showing tooltip above the link
      if (isNearTop) {
        // If near the top, show below instead
        setPlacement("bottom");
        setPosition({
          top: rect.bottom + window.scrollY + 5,
          left: rect.left + window.scrollX + rect.width / 2,
        });
      } else {
        // Otherwise show above
        setPlacement("top");
        setPosition({
          top: rect.top + window.scrollY - 5,
          left: rect.left + window.scrollX + rect.width / 2,
        });
      }
    }
    setShowTooltip(true);
  };

  /**
   * Handle mouse leave event to hide tooltip
   */
  const handleMouseLeave = (e: React.MouseEvent) => {
    // Small delay to allow cursor to move to the tooltip
    setTimeout(() => {
      if (!tooltipRef.current?.matches(":hover")) {
        setShowTooltip(false);
      }
    }, 100);
  };

  return (
    <>
      <a
        ref={linkRef}
        href={citationUrl}
        className="citation-link"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        aria-describedby={`citation-tooltip-${messageId}-${citationNum}`}
        {...(isExternalUrl
          ? { target: "_blank", rel: "noopener noreferrer" }
          : {})}
      >
        {children}
      </a>
      {showTooltip && (
        <div
          id={`citation-tooltip-${messageId}-${citationNum}`}
          ref={tooltipRef}
          className={`fixed z-50 transform -translate-x-1/2 citation-tooltip ${
            placement === "top" ? "-translate-y-full" : ""
          }`}
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
            maxWidth: "300px",
          }}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <div className={placement === "top" ? "mb-2" : "mt-2"}>
            <div className="animate-fade-in">
              <CitationCard citation={citation} compact={true} />
            </div>
            {placement === "top" && (
              <div className="tooltip-arrow absolute h-2 w-2 bg-gray-800 rotate-45 bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 border-r border-b border-gray-700"></div>
            )}
            {placement === "bottom" && (
              <div className="tooltip-arrow absolute h-2 w-2 bg-gray-800 rotate-45 top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 border-l border-t border-gray-700"></div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

/**
 * Main component for displaying chat messages
 */
const ChatMessages: FC<ChatMessagesProps> = ({
  messages,
  isStreaming,
  streamingMessageId,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { getChartsByMessageId } = useChartContext();
  const { getCitationsByMessageId } = useCitationContext();

  // State and refs for scroll tracking
  const [isUserScrolled, setIsUserScrolled] = useState(false);
  const lastMessageContentRef = useRef("");
  const lastMessageCountRef = useRef(0);

  /**
   * Track when user manually scrolls up
   */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isScrolledAway = scrollHeight - scrollTop - clientHeight > 100;
      setIsUserScrolled(isScrolledAway);
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  /**
   * Auto-scroll to handle both new messages and content updates
   */
  useEffect(() => {
    // Skip if no messages
    if (messages.length === 0) return;

    // Get the latest message (which could be streaming)
    const latestMessage = messages[messages.length - 1];
    const latestContent = latestMessage?.content || "";

    // Determine if content has changed significantly
    const contentChanged = latestContent !== lastMessageContentRef.current;

    // Update our reference to latest content
    lastMessageContentRef.current = latestContent;

    // Don't auto-scroll if user has scrolled up and is reading, unless it's a new message
    if (isUserScrolled && messages.length === lastMessageCountRef.current) {
      return;
    }

    // Scroll to bottom with slight delay to ensure DOM is updated
    const scrollToBottom = () => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({
          behavior: "smooth",
          block: "end",
        });
      }
    };

    // Use a small delay to ensure content is rendered
    const scrollTimeout = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(scrollTimeout);
  }, [messages, messages.length, isUserScrolled]);

  /**
   * Keep track of message count
   */
  useEffect(() => {
    lastMessageCountRef.current = messages.length;
  }, [messages.length]);

  /**
   * Create memoized basic markdown components (without citation processing)
   */
  const markdownComponents = useMemo(
    () => ({
      p: ({ children }: { children: React.ReactNode }) => (
        <p className="mb-4 text-white">{children}</p>
      ),
      ul: ({ children }: { children: React.ReactNode }) => (
        <ul className="list-disc pl-5 mb-4 space-y-1 text-white">{children}</ul>
      ),
      ol: ({ children }: { children: React.ReactNode }) => (
        <ol className="list-decimal pl-5 mb-4 space-y-1 text-white">
          {children}
        </ol>
      ),
      li: ({ children }: { children: React.ReactNode }) => (
        <li className="mb-1 text-white">{children}</li>
      ),
      h1: ({ children }: { children: React.ReactNode }) => (
        <h1 className="text-2xl font-bold mb-4 mt-6 text-white">{children}</h1>
      ),
      h2: ({ children }: { children: React.ReactNode }) => (
        <h2 className="text-xl font-bold mb-3 mt-5 text-white">{children}</h2>
      ),
      h3: ({ children }: { children: React.ReactNode }) => (
        <h3 className="text-lg font-bold mb-2 mt-4 text-white">{children}</h3>
      ),
      code: ({
        node,
        inline,
        className,
        children,
        ...props
      }: {
        node?: any;
        inline?: boolean;
        className?: string;
        children: React.ReactNode;
        [key: string]: any;
      }) => {
        const match = /language-(\w+)/.exec(className || "");
        return !inline ? (
          <pre className="bg-gray-800 p-4 rounded-lg overflow-auto mb-4 text-sm text-white">
            <code className={match ? className : ""} {...props}>
              {children}
            </code>
          </pre>
        ) : (
          <code
            className="bg-gray-800 px-1 py-0.5 rounded text-sm text-white"
            {...props}
          >
            {children}
          </code>
        );
      },
      table: ({ children }: { children: React.ReactNode }) => (
        <div className="overflow-auto mb-4">
          <table className="border-collapse border border-gray-700 w-full text-white">
            {children}
          </table>
        </div>
      ),
      th: ({ children }: { children: React.ReactNode }) => (
        <th className="border border-gray-700 px-4 py-2 bg-gray-800 text-white">
          {children}
        </th>
      ),
      td: ({ children }: { children: React.ReactNode }) => (
        <td className="border border-gray-700 px-4 py-2 text-white">
          {children}
        </td>
      ),
    }),
    []
  );

  /**
   * Generate message list with better memoization
   */
  const messageList = useMemo(() => {
    return messages.map((message) => {
      // Get charts and citations only for assistant messages
      const messageCharts =
        message.role === "assistant" ? getChartsByMessageId(message.id) : [];
      const messageCitations =
        message.role === "assistant" ? getCitationsByMessageId(message.id) : [];

      return (
        <MessageContainer
          key={message.id}
          message={message}
          messageCharts={messageCharts}
          messageCitations={messageCitations}
          markdownComponents={markdownComponents}
          deferCitationTextInjection={
            isStreaming && message.id === streamingMessageId
          }
        />
      );
    });
  }, [
    messages,
    getChartsByMessageId,
    getCitationsByMessageId,
    markdownComponents,
    isStreaming,
    streamingMessageId,
  ]);

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-auto p-4 space-y-6 bg-gray-900"
      style={{ overscrollBehavior: "contain" }}
    >
      {messageList}

      {/* Scroll-to-bottom button for better UX */}
      {isUserScrolled && (
        <button
          className="fixed bottom-24 right-4 p-2 bg-emerald-500 text-white rounded-full shadow-lg z-10"
          onClick={() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
            setIsUserScrolled(false);
          }}
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
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>
      )}

      {/* Auto-scroll anchor */}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatMessages;
