"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // You can log the error to an error reporting service
    console.error("Error caught by ErrorBoundary:", error);
    console.error("Component stack:", errorInfo.componentStack);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-6 bg-red-900/30 rounded-lg border border-red-700 text-white max-w-lg mx-auto my-8">
          <h2 className="text-xl font-bold mb-4">Something went wrong</h2>
          <p className="mb-4">
            The application encountered an unexpected error. Please try
            refreshing the page.
          </p>
          <div className="bg-red-950/50 p-3 rounded text-sm font-mono overflow-auto max-h-40">
            {this.state.error?.message || "Unknown error"}
          </div>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-700 hover:bg-red-600 transition-colors rounded"
          >
            Refresh the page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
