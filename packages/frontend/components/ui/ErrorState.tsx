"use client";

import { AlertCircle, RefreshCw, WifiOff, Server } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./Button";
import { ApolloError } from "@apollo/client";

// ===========================================
// Error State Component
// ===========================================

interface ErrorStateProps {
  /** The error object */
  error: Error | ApolloError | unknown;
  /** Callback to retry the operation */
  onRetry?: () => void;
  /** Title override */
  title?: string;
  /** Description override */
  description?: string;
  /** Full width variant */
  fullWidth?: boolean;
  /** Container class */
  className?: string;
}

export function ErrorState({
  error,
  onRetry,
  title,
  description,
  fullWidth = false,
  className,
}: ErrorStateProps) {
  const errorInfo = getErrorInfo(error);

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-12 px-4",
        fullWidth ? "w-full" : "max-w-md mx-auto",
        className
      )}
    >
      <div className={cn("p-4 rounded-full mb-4", errorInfo.bgColor)}>
        <errorInfo.icon className={cn("w-8 h-8", errorInfo.iconColor)} />
      </div>

      <h3 className="text-lg font-semibold text-gray-900">
        {title || errorInfo.title}
      </h3>

      <p className="mt-2 text-sm text-gray-500 max-w-sm">
        {description || errorInfo.description}
      </p>

      {/* Error details for development */}
      {process.env.NODE_ENV === "development" && error instanceof Error && (
        <details className="mt-4 text-left w-full">
          <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">
            Error details
          </summary>
          <pre className="mt-2 p-3 bg-gray-100 rounded-lg text-xs text-gray-600 overflow-auto max-h-32">
            {error.message}
            {error.stack && `\n\n${error.stack}`}
          </pre>
        </details>
      )}

      {onRetry && (
        <Button
          variant="outline"
          onClick={() => onRetry()}
          className="mt-6"
          leftIcon={<RefreshCw className="w-4 h-4" />}
        >
          Try Again
        </Button>
      )}
    </div>
  );
}

// ===========================================
// Error Info Helper
// ===========================================

interface ErrorInfo {
  title: string;
  description: string;
  icon: typeof AlertCircle;
  bgColor: string;
  iconColor: string;
}

function getErrorInfo(error: unknown): ErrorInfo {
  // Network errors
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (message.includes("network") || message.includes("fetch")) {
      return {
        title: "Network Error",
        description:
          "Unable to connect to the server. Please check your internet connection and try again.",
        icon: WifiOff,
        bgColor: "bg-yellow-100",
        iconColor: "text-yellow-600",
      };
    }

    if (message.includes("timeout")) {
      return {
        title: "Request Timeout",
        description:
          "The request took too long to complete. Please try again.",
        icon: Server,
        bgColor: "bg-orange-100",
        iconColor: "text-orange-600",
      };
    }
  }

  // Apollo GraphQL errors
  if (isApolloError(error)) {
    if (error.networkError) {
      return {
        title: "Connection Error",
        description:
          "Unable to connect to the data service. Please try again later.",
        icon: WifiOff,
        bgColor: "bg-yellow-100",
        iconColor: "text-yellow-600",
      };
    }

    if (error.graphQLErrors?.length > 0) {
      return {
        title: "Data Error",
        description:
          "There was a problem fetching the data. Please try again.",
        icon: Server,
        bgColor: "bg-orange-100",
        iconColor: "text-orange-600",
      };
    }
  }

  // Default error
  return {
    title: "Something went wrong",
    description:
      "An unexpected error occurred. Please try again or contact support if the problem persists.",
    icon: AlertCircle,
    bgColor: "bg-red-100",
    iconColor: "text-red-600",
  };
}

function isApolloError(error: unknown): error is ApolloError {
  return (
    error instanceof Error &&
    ("graphQLErrors" in error || "networkError" in error)
  );
}

// ===========================================
// Inline Error Component
// ===========================================

interface InlineErrorProps {
  message: string;
  className?: string;
}

export function InlineError({ message, className }: InlineErrorProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700",
        className
      )}
    >
      <AlertCircle className="w-4 h-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

// ===========================================
// Error Boundary Fallback Component
// ===========================================

interface ErrorBoundaryFallbackProps {
  error: Error;
  resetErrorBoundary?: () => void;
}

export function ErrorBoundaryFallback({
  error,
  resetErrorBoundary,
}: ErrorBoundaryFallbackProps) {
  return (
    <div className="min-h-[400px] flex items-center justify-center p-8">
      <ErrorState
        error={error}
        onRetry={resetErrorBoundary}
        title="Application Error"
        description="An error occurred in this section of the application. Try refreshing the page."
      />
    </div>
  );
}
