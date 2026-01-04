"use client";

import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home, Bug, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "./Button";
import { cn } from "@/lib/utils";

// ===========================================
// Error Boundary Types
// ===========================================

interface ErrorBoundaryProps {
  /** Content to render */
  children: ReactNode;
  /** Custom fallback component */
  fallback?: ReactNode;
  /** Callback when an error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Whether to show the error details (dev mode) */
  showDetails?: boolean;
  /** Custom error message */
  errorMessage?: string;
  /** Size variant for the error display */
  variant?: "full" | "card" | "inline";
  /** Custom retry handler */
  onRetry?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showStack: boolean;
}

// ===========================================
// Error Boundary Component
// ===========================================

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showStack: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });

    // Log error to console in development
    if (process.env.NODE_ENV === "development") {
      console.error("ErrorBoundary caught an error:", error);
      console.error("Component stack:", errorInfo.componentStack);
    }

    // Call custom error handler
    this.props.onError?.(error, errorInfo);

    // In production, you would send this to an error tracking service
    // e.g., Sentry, LogRocket, etc.
  }

  handleRetry = (): void => {
    if (this.props.onRetry) {
      this.props.onRetry();
    }
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleGoHome = (): void => {
    window.location.href = "/";
  };

  toggleStack = (): void => {
    this.setState((prev) => ({ showStack: !prev.showStack }));
  };

  render(): ReactNode {
    const { hasError, error, errorInfo, showStack } = this.state;
    const {
      children,
      fallback,
      showDetails = process.env.NODE_ENV === "development",
      errorMessage = "Something went wrong",
      variant = "card",
    } = this.props;

    if (!hasError) {
      return children;
    }

    // Use custom fallback if provided
    if (fallback) {
      return fallback;
    }

    // Render appropriate error UI based on variant
    const errorContent = (
      <>
        <div className="flex flex-col items-center text-center">
          <div
            className={cn(
              "rounded-full bg-red-400/10 flex items-center justify-center",
              variant === "inline" ? "w-8 h-8" : "w-16 h-16"
            )}
          >
            <AlertTriangle
              className={cn("text-red-400", variant === "inline" ? "w-4 h-4" : "w-8 h-8")}
            />
          </div>

          <h3
            className={cn(
              "font-semibold text-primary-100",
              variant === "inline" ? "text-sm mt-2" : "text-lg mt-4"
            )}
          >
            {errorMessage}
          </h3>

          {variant !== "inline" && (
            <p className="text-primary-400 text-sm mt-2 max-w-md">
              An unexpected error occurred. You can try again or go back to the home page.
            </p>
          )}
        </div>

        {/* Error Details (Development) */}
        {showDetails && error && variant !== "inline" && (
          <div className="mt-6 w-full">
            <button
              onClick={this.toggleStack}
              className="flex items-center gap-2 text-sm text-primary-400 hover:text-primary-300 transition-colors"
            >
              <Bug className="w-4 h-4" />
              <span>Error Details</span>
              {showStack ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {showStack && (
              <div className="mt-3 p-4 bg-dark-900 rounded-lg text-left overflow-auto max-h-48">
                <p className="text-red-400 font-mono text-sm mb-2">
                  {error.name}: {error.message}
                </p>
                {errorInfo?.componentStack && (
                  <pre className="text-xs text-primary-500 whitespace-pre-wrap font-mono">
                    {errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        {variant !== "inline" && (
          <div className="mt-6 flex items-center gap-3 justify-center">
            <Button variant="outline" size="sm" onClick={this.handleRetry}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            {variant === "full" && (
              <Button variant="ghost" size="sm" onClick={this.handleGoHome}>
                <Home className="w-4 h-4 mr-2" />
                Go Home
              </Button>
            )}
          </div>
        )}

        {variant === "inline" && (
          <button
            onClick={this.handleRetry}
            className="mt-2 text-xs text-primary-400 hover:text-primary-300 underline"
          >
            Try again
          </button>
        )}
      </>
    );

    // Container styles based on variant
    if (variant === "full") {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-8">
          <div className="max-w-md w-full">{errorContent}</div>
        </div>
      );
    }

    if (variant === "card") {
      return (
        <div className="bg-dark-800 border border-red-400/30 rounded-xl p-6">
          {errorContent}
        </div>
      );
    }

    // inline variant
    return (
      <div className="flex flex-col items-center p-4 text-center">{errorContent}</div>
    );
  }
}

// ===========================================
// Section Error Boundary - Convenience Wrapper
// ===========================================

interface SectionErrorBoundaryProps {
  children: ReactNode;
  /** Section name for error messages */
  sectionName?: string;
  /** Custom fallback */
  fallback?: ReactNode;
  /** Callback when error occurs */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

export function SectionErrorBoundary({
  children,
  sectionName = "This section",
  fallback,
  onError,
}: SectionErrorBoundaryProps) {
  return (
    <ErrorBoundary
      variant="card"
      errorMessage={`${sectionName} failed to load`}
      fallback={fallback}
      onError={onError}
    >
      {children}
    </ErrorBoundary>
  );
}

// ===========================================
// Widget Error Boundary - For small components
// ===========================================

interface WidgetErrorBoundaryProps {
  children: ReactNode;
  /** Fallback message */
  message?: string;
}

export function WidgetErrorBoundary({
  children,
  message = "Failed to load",
}: WidgetErrorBoundaryProps) {
  return (
    <ErrorBoundary variant="inline" errorMessage={message}>
      {children}
    </ErrorBoundary>
  );
}

// ===========================================
// Page Error Boundary - For full page errors
// ===========================================

interface PageErrorBoundaryProps {
  children: ReactNode;
  /** Page name for error messages */
  pageName?: string;
}

export function PageErrorBoundary({
  children,
  pageName = "This page",
}: PageErrorBoundaryProps) {
  return (
    <ErrorBoundary
      variant="full"
      errorMessage={`${pageName} encountered an error`}
      onError={(error, errorInfo) => {
        // In production, send to error tracking service
        if (process.env.NODE_ENV === "production") {
          // Example: Sentry.captureException(error, { extra: errorInfo });
          console.error("Page error:", error.message);
        }
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

// ===========================================
// withErrorBoundary HOC
// ===========================================

export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options?: {
    errorMessage?: string;
    variant?: "full" | "card" | "inline";
    fallback?: ReactNode;
  }
) {
  const displayName = WrappedComponent.displayName || WrappedComponent.name || "Component";

  const ComponentWithErrorBoundary = (props: P) => (
    <ErrorBoundary
      errorMessage={options?.errorMessage || `${displayName} failed to load`}
      variant={options?.variant || "card"}
      fallback={options?.fallback}
    >
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );

  ComponentWithErrorBoundary.displayName = `withErrorBoundary(${displayName})`;

  return ComponentWithErrorBoundary;
}
