"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// ===========================================
// Button Component
// ===========================================

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style variant */
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "success";
  /** Size of the button */
  size?: "sm" | "md" | "lg" | "icon";
  /** Show loading spinner */
  isLoading?: boolean;
  /** Text to show while loading */
  loadingText?: string;
  /** Icon to show before text */
  leftIcon?: React.ReactNode;
  /** Icon to show after text */
  rightIcon?: React.ReactNode;
}

const variantStyles = {
  primary: "bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800",
  secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200 active:bg-gray-300",
  outline: "border border-gray-300 bg-transparent hover:bg-gray-50 active:bg-gray-100",
  ghost: "bg-transparent hover:bg-gray-100 active:bg-gray-200",
  danger: "bg-red-600 text-white hover:bg-red-700 active:bg-red-800",
  success: "bg-green-600 text-white hover:bg-green-700 active:bg-green-800",
};

const sizeStyles = {
  sm: "h-8 px-3 text-sm gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-base gap-2",
  icon: "h-10 w-10 p-0",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      loadingText,
      leftIcon,
      rightIcon,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={cn(
          // Base styles
          "inline-flex items-center justify-center rounded-lg font-medium transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2",
          "disabled:pointer-events-none disabled:opacity-50",
          // Variant and size
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {loadingText && <span>{loadingText}</span>}
          </>
        ) : (
          <>
            {leftIcon && <span className="shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";

// ===========================================
// Button Group Component
// ===========================================

interface ButtonGroupProps {
  children: React.ReactNode;
  className?: string;
}

export function ButtonGroup({ children, className }: ButtonGroupProps) {
  return (
    <div
      className={cn(
        "inline-flex rounded-lg overflow-hidden",
        "[&>button]:rounded-none [&>button:first-child]:rounded-l-lg [&>button:last-child]:rounded-r-lg",
        "[&>button:not(:last-child)]:border-r-0",
        className
      )}
    >
      {children}
    </div>
  );
}
