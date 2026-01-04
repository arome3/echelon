"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

// ===========================================
// Global Error Page
// ===========================================

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center px-4 max-w-lg">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-10 h-10 text-red-600" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Something went wrong!
        </h1>
        <p className="text-gray-500 mb-6">
          An unexpected error occurred. We've been notified and are working to
          fix it. Please try again or return to the home page.
        </p>

        {process.env.NODE_ENV === "development" && (
          <div className="mb-6 p-4 bg-red-50 rounded-lg text-left">
            <p className="text-sm font-mono text-red-700 break-all">
              {error.message}
            </p>
            {error.digest && (
              <p className="text-xs text-red-500 mt-2">
                Error ID: {error.digest}
              </p>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
            Try Again
          </button>
          <a
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Home className="w-5 h-5" />
            Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}
