// src/components/ErrorBoundary.jsx
import React, { Component } from "react";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service
    console.error("Error caught by ErrorBoundary:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
          <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-lg text-center">
            <h2 className="text-2xl font-bold text-error mb-4">
              Something went wrong
            </h2>
            <p className="text-muted mb-4">
              An error occurred in the application. Please try refreshing the
              page.
            </p>
            <details className="text-left mb-4 text-sm text-muted border border-muted p-2 rounded">
              <summary>Error details</summary>
              <p className="mt-2">
                {this.state.error && this.state.error.toString()}
              </p>
              <p className="mt-2 whitespace-pre-wrap">
                {this.state.errorInfo && this.state.errorInfo.componentStack}
              </p>
            </details>
            <button
              onClick={() => window.location.reload()}
              className="bg-primary text-white font-medium py-2 px-4 rounded-xl hover:opacity-90 transition-opacity"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    // If there's no error, render children normally
    return this.props.children;
  }
}

export default ErrorBoundary;
