"use client";

import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

// ===========================================
// Card Component - Dark Mode Premium
// ===========================================

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Add hover effect */
  hoverable?: boolean;
  /** Add padding */
  padding?: "none" | "sm" | "md" | "lg";
  /** Card variant for different styles */
  variant?: "default" | "glass" | "glass-hover";
  /** Glow color on hover (only for glass variants) */
  glowColor?: "blue" | "green" | "red" | "purple" | "cyan";
}

const paddingStyles = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

const variantStyles = {
  default: "bg-dark-800 rounded-xl shadow-sm border border-primary-400/20",
  glass: "glass-card",
  "glass-hover": "glass-card-hover",
};

const glowStyles = {
  blue: "hover:shadow-glow-blue",
  green: "hover:shadow-glow-green",
  red: "hover:shadow-glow-red",
  purple: "hover:shadow-glow-purple",
  cyan: "hover:shadow-glow-cyan",
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({
    className,
    hoverable = false,
    padding = "md",
    variant = "glass",
    glowColor,
    children,
    ...props
  }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          variantStyles[variant],
          hoverable && variant === "default" && "hover:shadow-md hover:border-primary-400/40 transition-all duration-200 cursor-pointer",
          glowColor && glowStyles[glowColor],
          paddingStyles[padding],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";

// ===========================================
// Card Header Component
// ===========================================

interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  /** Optional action element (button, menu, etc.) */
  action?: React.ReactNode;
}

export function CardHeader({ className, action, children, ...props }: CardHeaderProps) {
  return (
    <div
      className={cn("flex items-center justify-between mb-4", className)}
      {...props}
    >
      <div>{children}</div>
      {action && <div>{action}</div>}
    </div>
  );
}

// ===========================================
// Card Title Component
// ===========================================

interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
}

export function CardTitle({ className, as: Tag = "h3", children, ...props }: CardTitleProps) {
  return (
    <Tag
      className={cn("text-lg font-semibold text-slate-100", className)}
      {...props}
    >
      {children}
    </Tag>
  );
}

// ===========================================
// Card Description Component
// ===========================================

export function CardDescription({ className, children, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-sm text-slate-400 mt-1", className)}
      {...props}
    >
      {children}
    </p>
  );
}

// ===========================================
// Card Content Component
// ===========================================

export function CardContent({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("", className)} {...props}>
      {children}
    </div>
  );
}

// ===========================================
// Card Footer Component
// ===========================================

export function CardFooter({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center justify-end gap-2 pt-4 mt-4 border-t border-white/[0.06]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// ===========================================
// Stat Card Component
// ===========================================

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  iconGradient?: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  glowColor?: "blue" | "green" | "red" | "purple" | "cyan";
  className?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  iconGradient,
  trend,
  glowColor,
  className,
}: StatCardProps) {
  return (
    <Card
      className={cn("", className)}
      padding="md"
      variant="glass-hover"
      glowColor={glowColor}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-400">{title}</p>
          <p className="text-2xl font-bold text-slate-100 mt-1 tracking-tight">{value}</p>
          {subtitle && (
            <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
          )}
          {trend && (
            <p
              className={cn(
                "text-sm font-medium mt-1",
                trend.isPositive ? "text-emerald-400" : "text-red-400"
              )}
            >
              {trend.isPositive ? "+" : ""}{trend.value}
            </p>
          )}
        </div>
        {icon && (
          <div className={cn(
            "p-2.5 rounded-xl",
            iconGradient || "bg-white/[0.06]"
          )}>
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}
