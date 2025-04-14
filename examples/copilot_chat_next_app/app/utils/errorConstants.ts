/**
 * Shared error constants for both frontend and backend
 */

// Error codes
export const ERROR_CODES = {
  NO_CONTENT: "ERR_NO_CONTENT",
  NETWORK_ERROR: "ERR_NETWORK",
  TIMEOUT: "ERR_TIMEOUT",
  UNAUTHORIZED: "ERR_UNAUTHORIZED",
  SERVER_ERROR: "ERR_SERVER",
  UNKNOWN: "ERR_UNKNOWN",
};

// Error messages format: CODE:MESSAGE
export const formatErrorMessage = (code: string, message: string): string => {
  return `${code}: ${message}`;
};

// Helper to extract code from error message
export const extractErrorCode = (errorMessage: string): string => {
  try {
    // Check if the error message is a JSON string
    if (errorMessage.startsWith("{") && errorMessage.includes('"error"')) {
      const parsedJson = JSON.parse(errorMessage);
      if (parsedJson.error) {
        const match = parsedJson.error.match(/^([A-Z_]+):/);
        return match ? match[1] : ERROR_CODES.UNKNOWN;
      }
    }
  } catch (e) {
    // Not valid JSON or different format, continue with normal extraction
  }

  // Standard extraction for plain string format
  const match = errorMessage.match(/^([A-Z_]+):/);
  return match ? match[1] : ERROR_CODES.UNKNOWN;
};

// Generic error message to display to users
export const GENERIC_ERROR_MESSAGE = "Something went wrong. Please try again.";
