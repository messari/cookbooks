"use client";

import type { FC, ChangeEvent, FormEvent, KeyboardEvent } from "react";

interface ChatInputProps {
  input: string;
  handleInputChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  handleSubmit: (e: FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
}

const ChatInput: FC<ChatInputProps> = ({
  input,
  handleInputChange,
  handleSubmit,
  isLoading,
}) => {
  // Handle auto-resizing textarea
  const handleTextareaResize = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;
    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = "auto";
    // Set the height to match the content, max 200px
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  };

  // Combine the resizing and input change handlers
  const handleCombinedInputChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    handleInputChange(e);
    handleTextareaResize(e);
  };

  // Handle key down to submit form on Enter (but not Shift+Enter)
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      // Only submit if there's actual content and not loading
      if (input.trim() && !isLoading) {
        e.preventDefault(); // Prevent default to avoid adding a new line

        // Create a form submission event and call the handler
        const formEvent = new Event("submit", {
          bubbles: true,
          cancelable: true,
        }) as unknown as FormEvent<HTMLFormElement>;
        handleSubmit(formEvent);
      }
    }
  };

  return (
    <div className="border-t border-gray-700 p-4">
      <form onSubmit={handleSubmit} className="flex flex-col">
        <div className="relative">
          <textarea
            value={input}
            onChange={handleCombinedInputChange}
            onFocus={handleTextareaResize}
            onKeyDown={handleKeyDown}
            placeholder="Ask about integrating with Copilot API and SDK... (Press Enter to send, Shift+Enter for new line)"
            className="w-full rounded-lg p-3 pr-16 bg-slate-800 border border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none text-white resize-none min-h-[52px] overflow-y-auto"
            rows={1}
            style={{ height: "auto" }}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className={`absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-2 ${
              isLoading || !input.trim()
                ? "text-gray-500 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
            aria-label="Send message"
          >
            {isLoading ? (
              // Loading spinner
              <svg
                className="animate-spin h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 0116 0H4z"
                />
              </svg>
            ) : (
              // Send icon
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
                <path d="M22 2L11 13" />
                <path d="M22 2l-7 20-4-9-9-4 20-7z" />
              </svg>
            )}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Chat with Messari AI about Copilot API integration, SDK usage, and
          implementation examples. Press Enter to send message, Shift+Enter for
          new line.
        </p>
      </form>
    </div>
  );
};

export default ChatInput;
