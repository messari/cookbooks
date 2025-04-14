// Types and imports
import { createClient } from "redis";
import { ERROR_CODES, formatErrorMessage } from "../../utils/errorConstants";

// Type definitions
interface MessagePart {
  type: string;
  text: string;
}

interface ChatMessage {
  role: string;
  content?: string;
  parts?: MessagePart[];
}

const baseUrl = process.env.BASE_URL;
const VALID_VERBOSITY_OPTIONS = ["succinct", "balanced", "verbose"];
const VALID_STREAM_FORMATS = ["vercel", "openai"];

// OpenAI Stream Handling
function convertOpenAIToVercelStream(
  openAIChunk: string,
  encoder: TextEncoder
): Uint8Array | null {
  try {
    // Parse the OpenAI chunk (removing the "data: " prefix if present)
    const cleanedChunk = openAIChunk.startsWith("data: ")
      ? openAIChunk.slice(6)
      : openAIChunk;

    // Skip the "[DONE]" marker
    if (cleanedChunk.trim() === "[DONE]") {
      return null;
    }

    let parsed;
    try {
      parsed = JSON.parse(cleanedChunk);
    } catch (error) {
      console.log("Error parsing OpenAI chunk:", openAIChunk);
      return null;
    }

    // If there's no delta or choices, skip
    if (!parsed.choices || parsed.choices.length === 0) {
      return null;
    }

    const choice = parsed.choices[0];

    // Handle text content (main assistant response)
    if (choice.delta && choice.delta.content) {
      return encoder.encode(`0:${JSON.stringify(choice.delta.content)}\n`);
    }

    // Handle finish reason with metadata (especially for the final message with citations)
    if (
      (choice.finish_reason ||
        (choice.finishReason !== null && choice.finishReason !== undefined)) &&
      parsed.metadata
    ) {
      const finishReason = choice.finish_reason || choice.finishReason;
      const allChunks: Uint8Array[] = [];

      // Process citations if present in the final message
      if (
        parsed.metadata.cited_sources &&
        parsed.metadata.cited_sources.length > 0
      ) {
        const citations = parsed.metadata.cited_sources;

        // Send each citation as a source
        for (const citation of citations) {
          const sourceData = {
            sourceType: "url",
            id:
              citation.citationId ??
              citation.citationID ??
              citation.citation_id ??
              citation.id,
            url: citation.url,
            title: citation.title,
            domain: citation.domain,
          };
          allChunks.push(encoder.encode(`h:${JSON.stringify(sourceData)}\n`));
        }

        // Send structured citation data
        const citationData = {
          type: "citation_data",
          data: citations,
          traceId: parsed.id,
        };
        allChunks.push(encoder.encode(`2:${JSON.stringify([citationData])}\n`));
      }

      // Always add the finish message
      const finishData = {
        finishReason: finishReason,
        traceId: parsed.id,
        usage: {
          promptTokens: 0,
          completionTokens: 0,
        },
      };
      allChunks.push(encoder.encode(`d:${JSON.stringify(finishData)}\n`));

      // Return all chunks if we processed citations
      if (allChunks.length > 0) {
        return concatUint8Arrays(allChunks);
      }

      // Otherwise just return the finish message
      return encoder.encode(`d:${JSON.stringify(finishData)}\n`);
    }

    // Handle charts if present
    if (
      parsed.metadata &&
      parsed.metadata.charts &&
      parsed.metadata.charts.length > 0
    ) {
      const charts = parsed.metadata.charts;
      const allChunks: Uint8Array[] = [];

      for (const chart of charts) {
        const chartSource = {
          sourceType: "chart",
          id: chart.id,
          metric: chart.metric,
          dataset: chart.dataset,
          entities: chart.entities,
          start: chart.start,
          end: chart.end,
        };
        allChunks.push(encoder.encode(`h:${JSON.stringify(chartSource)}\n`));
      }

      // Also send chart data
      const chartData = {
        type: "chart_data",
        data: charts,
        traceId: parsed.id,
      };
      allChunks.push(encoder.encode(`2:${JSON.stringify([chartData])}\n`));

      return concatUint8Arrays(allChunks);
    }

    // Handle errors
    if (parsed.error) {
      return encoder.encode(
        `3:${JSON.stringify(parsed.error.message || "Unknown error")}\n`
      );
    }

    return null;
  } catch (error) {
    console.error(
      "Error parsing OpenAI stream chunk:",
      error,
      "Chunk:",
      openAIChunk
    );
    return null;
  }
}

// Helper Utilities
function concatUint8Arrays(arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((acc, arr) => acc + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

function createErrorResponse(error: unknown): Response {
  console.error("Error in chat API:", error);
  let errorMessage =
    error instanceof Error ? error.message : "An error occurred";
  if (!errorMessage.match(/^[A-Z_]+:/)) {
    errorMessage = formatErrorMessage(ERROR_CODES.SERVER_ERROR, errorMessage);
  }

  const errorCode = errorMessage.split(":")[0];
  // Set appropriate status code based on error type
  let status = 500;
  if (errorCode === ERROR_CODES.UNAUTHORIZED) {
    status = 401; // Unauthorized
  }

  return new Response(JSON.stringify({ error: errorMessage }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Request Processing Functions
function parseAndValidateRequest(reqBody: any): {
  messages: ChatMessage[];
  apiSettings: {
    apiKey?: string;
    verbosity: string;
    streamFormat: string;
  };
} {
  let { messages, apiSettings } = reqBody;

  // Vercel AI SDK might nest the apiSettings in a body property
  if (!apiSettings && reqBody.body && reqBody.body.apiSettings) {
    apiSettings = reqBody.body.apiSettings;
  }

  const customApiKey = apiSettings?.apiKey;

  // Validate and use the verbosity setting
  let customVerbosity = apiSettings?.verbosity || "balanced";

  // Ensure verbosity is one of the allowed values
  if (!VALID_VERBOSITY_OPTIONS.includes(customVerbosity)) {
    console.warn(
      `Invalid verbosity value: ${customVerbosity}, defaulting to "balanced"`
    );
    customVerbosity = "balanced";
  }

  // Get the stream format (vercel or openai)
  let streamFormat = apiSettings?.streamFormat || "vercel";

  // Ensure streamFormat is one of the allowed values
  if (!VALID_STREAM_FORMATS.includes(streamFormat)) {
    console.warn(
      `Invalid stream format value: ${streamFormat}, defaulting to "vercel"`
    );
    streamFormat = "vercel";
  }

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    throw new Error("No messages provided");
  }

  // Format messages for the API
  const formattedMessages = messages.map((msg: ChatMessage) => ({
    role: msg.role,
    content:
      typeof msg.content === "string"
        ? msg.content
        : msg.parts
        ? msg.parts.map((p: MessagePart) => p.text).join(" ")
        : "",
  }));

  return {
    messages: formattedMessages,
    apiSettings: {
      apiKey: customApiKey,
      verbosity: customVerbosity,
      streamFormat,
    },
  };
}

// Response creation
function createStreamResponse(
  readable: ReadableStream,
  streamFormat: string
): Response {
  const responseHeaders: HeadersInit = {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no", // Disable buffering for Nginx proxies
  };

  if (streamFormat === "vercel") {
    responseHeaders["x-vercel-ai-data-stream"] = "v1"; // Vercel AI SDK data stream protocol
  }

  return new Response(readable, { headers: responseHeaders });
}

// Stream processing logic
async function processStreamInBackground(
  apiSettings: {
    apiKey?: string;
    verbosity: string;
    streamFormat: string;
  },
  messages: any[],
  writer: WritableStreamDefaultWriter<any>
) {
  try {
    console.log("Making API request to:", `${baseUrl}/chat/completions`);

    // Prepare headers for the fetch request
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    // Add API key to headers if provided
    if (apiSettings.apiKey) {
      headers["Authorization"] = `Bearer ${apiSettings.apiKey}`;
    } else if (process.env.MESSARI_API_KEY) {
      headers["Authorization"] = `Bearer ${process.env.MESSARI_API_KEY}`;
    }

    // Use the requested stream format for upstream
    const upstreamFormat = apiSettings.streamFormat;

    // Make the API request with streaming enabled
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: "messari-ai",
        messages,
        verbosity: apiSettings.verbosity,
        stream: true,
        stream_format: upstreamFormat,
        inline_citations: true,
      }),
      // Add a slightly shorter timeout for the fetch request
      signal: AbortSignal.timeout(280000), // 280 seconds (just under 5 minutes)
    }).catch((error) => {
      console.error("Fetch error details:", {
        name: error.name,
        message: error.message,
        cause: error.cause,
        code: error.code,
      });
      // Determine the error type and apply appropriate code
      let errorCode = ERROR_CODES.UNKNOWN;
      if (error.message?.includes("timeout")) {
        errorCode = ERROR_CODES.TIMEOUT;
      } else if (
        error.message?.includes("network") ||
        error.message?.includes("fetch failed")
      ) {
        errorCode = ERROR_CODES.NETWORK_ERROR;
      }
      // Throw with formatted error message including code
      throw new Error(formatErrorMessage(errorCode, error.message));
    });

    if (!response.ok) {
      const errorText = await response
        .text()
        .catch(() => "No error text available");
      console.error("API Response Error:", {
        status: response.status,
        statusText: response.statusText,
        errorText,
      });

      // Determine error code based on status
      let errorCode = ERROR_CODES.SERVER_ERROR;
      if (response.status === 401 || response.status === 403) {
        errorCode = ERROR_CODES.UNAUTHORIZED;
      }

      throw new Error(
        formatErrorMessage(
          errorCode,
          `API request failed: ${response.status} ${response.statusText} - ${errorText}`
        )
      );
    }

    if (!response.body) {
      throw new Error(
        formatErrorMessage(ERROR_CODES.SERVER_ERROR, "Response body is null")
      );
    }

    // Read the stream chunks
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    let chunkCount = 0;
    let hasContentChunks = false;

    // Buffer for incomplete SSE events
    let eventBuffer = "";

    console.log("Stream connected, waiting for chunks...");

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        console.log("Stream complete after", chunkCount, "chunks");

        // Process any remaining data in the buffer
        if (
          apiSettings.streamFormat === "openai" &&
          eventBuffer.trim() !== ""
        ) {
          console.log(
            `Processing final buffer of length ${eventBuffer.length}`
          );

          // Process the buffer using the same approach - handle SSE format
          const events = eventBuffer
            .split("\n\n")
            .filter((e) => e.trim() !== "");
          let processedEvents = 0;

          for (const event of events) {
            // Only process events that have data: {...}
            if (event.includes("data: {")) {
              // Extract the data part
              const dataMatch = event.match(/data: ({.*})/);
              if (dataMatch && dataMatch[1]) {
                processedEvents++;
                const jsonData = dataMatch[1];

                const transformedChunk = convertOpenAIToVercelStream(
                  `data: ${jsonData}`,
                  encoder
                );
                if (transformedChunk) {
                  const chunkStr = decoder.decode(transformedChunk);
                  if (chunkStr.startsWith("0:")) {
                    hasContentChunks = true;
                  }
                  await writer.write(transformedChunk);
                }
              }
            }
          }

          console.log(`Processed ${processedEvents} final events`);
          eventBuffer = "";
        }

        if (!hasContentChunks) {
          // Send an error message with proper code when no content chunks were received
          await writer.write(
            encoder.encode(
              `3:"${formatErrorMessage(
                ERROR_CODES.NO_CONTENT,
                "No content received from API"
              )}"\n`
            )
          );
        }
        break;
      }
      chunkCount++;
      const text = decoder.decode(value, { stream: true });

      // For "vercel" format, just relay the chunks as-is
      if (apiSettings.streamFormat === "vercel") {
        // Check if this is a content chunk (starts with '0:')
        if (text.includes("\n0:") || text.startsWith("0:")) {
          hasContentChunks = true;
        }

        // Forward the chunk directly without parsing
        await writer.write(value);
      } else {
        console.log(
          `OpenAI Chunk ${chunkCount} received:`,
          `text: ${text}\n\n`
        );

        // Append the new chunk to our buffer
        eventBuffer += text;
        console.log(`Buffer length after append: ${eventBuffer.length}`);

        // Process the buffer differently - handle SSE format
        // First, split by double newlines which separate SSE events
        const events = eventBuffer.split("\n\n").filter((e) => e.trim() !== "");
        let processedEvents = 0;

        for (const event of events) {
          // Only process events that have data: {...}
          if (event.includes("data: {")) {
            // Extract the data part
            const dataMatch = event.match(/data: ({.*})/);
            if (dataMatch && dataMatch[1]) {
              processedEvents++;
              const jsonData = dataMatch[1];

              console.log(
                `Processing event ${processedEvents}: ${jsonData.substring(
                  0,
                  50
                )}...`
              );

              // Process this complete data chunk
              const transformedChunk = convertOpenAIToVercelStream(
                `data: ${jsonData}`, // Recreate the data: prefix
                encoder
              );

              if (transformedChunk) {
                // Check if this is a content chunk (starts with '0:')
                const chunkStr = decoder.decode(transformedChunk);
                if (chunkStr.startsWith("0:")) {
                  hasContentChunks = true;
                  console.log(
                    `Content chunk found: ${chunkStr.substring(0, 50)}...`
                  );
                }

                await writer.write(transformedChunk);
              } else {
                console.log("Transformation returned null");
              }
            }
          }
        }

        // Keep only the part after the last double newline
        const lastDoubleNewlineIndex = eventBuffer.lastIndexOf("\n\n");
        if (lastDoubleNewlineIndex !== -1 && processedEvents > 0) {
          const oldLength = eventBuffer.length;
          eventBuffer = eventBuffer.substring(lastDoubleNewlineIndex + 2);
          console.log(
            `Processed ${processedEvents} events, buffer reduced from ${oldLength} to ${eventBuffer.length}`
          );
        } else if (processedEvents === 0) {
          console.log(
            `No events processed from buffer of length ${eventBuffer.length}`
          );
        }
      }
    }
    // Close the writer when done
    await writer.close();
  } catch (error) {
    console.error("Stream error:", error);

    const encoder = new TextEncoder();
    // Format the error message with appropriate code if not already formatted
    let errorMessage =
      error instanceof Error ? error.message : "An error occurred";
    if (!errorMessage.match(/^[A-Z_]+:/)) {
      // No code prefix detected, apply generic server error code
      errorMessage = formatErrorMessage(ERROR_CODES.SERVER_ERROR, errorMessage);
    }
    await writer.write(encoder.encode(`3:"${errorMessage}"\n`));
    await writer.close();
  }
}

export async function POST(req: Request) {
  try {
    const reqBody = await req.json();
    const { messages, apiSettings } = parseAndValidateRequest(reqBody);

    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    processStreamInBackground(apiSettings, messages, writer);
    return createStreamResponse(readable, apiSettings.streamFormat);
  } catch (error) {
    return createErrorResponse(error);
  }
}
