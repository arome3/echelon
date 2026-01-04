"use client";

import { type ReactNode } from "react";
import { Inbox, Search, AlertCircle, Wallet, Bot, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./Button";

// ===========================================
// Empty State Component
// ===========================================

interface EmptyStateProps {
  /** Icon to display */
  icon?: ReactNode;
  /** Title text */
  title: string;
  /** Description text */
  description?: string;
  /** Primary action button */
  action?: {
    label: string;
    onClick: () => void;
    variant?: "primary" | "secondary" | "outline";
  };
  /** Secondary action button */
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  /** Additional content */
  children?: ReactNode;
  /** Container class */
  className?: string;
  /** Size variant */
  size?: "sm" | "md" | "lg";
}

const sizeStyles = {
  sm: {
    container: "py-8",
    icon: "w-10 h-10",
    title: "text-base",
    description: "text-sm",
  },
  md: {
    container: "py-12",
    icon: "w-12 h-12",
    title: "text-lg",
    description: "text-sm",
  },
  lg: {
    container: "py-16",
    icon: "w-16 h-16",
    title: "text-xl",
    description: "text-base",
  },
};

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  children,
  className,
  size = "md",
}: EmptyStateProps) {
  const styles = sizeStyles[size];

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        styles.container,
        className
      )}
    >
      {icon && (
        <div className="p-4 bg-dark-700 rounded-full mb-4 text-primary-400">
          <div className={styles.icon}>{icon}</div>
        </div>
      )}

      <h3 className={cn("font-semibold text-primary-200", styles.title)}>
        {title}
      </h3>

      {description && (
        <p className={cn("mt-2 text-primary-500 max-w-sm", styles.description)}>
          {description}
        </p>
      )}

      {children && <div className="mt-4">{children}</div>}

      {(action || secondaryAction) && (
        <div className="flex gap-3 mt-6">
          {action && (
            <Button
              variant={action.variant || "primary"}
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button variant="outline" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ===========================================
// Preset Empty States
// ===========================================

interface PresetEmptyStateProps {
  className?: string;
  action?: EmptyStateProps["action"];
}

export function NoAgentsFound({ className, action }: PresetEmptyStateProps) {
  return (
    <EmptyState
      icon={<Bot className="w-full h-full" />}
      title="No agents found"
      description="There are no agents matching your criteria. Try adjusting your filters or check back later."
      action={action}
      className={className}
    />
  );
}

export function NoSearchResults({ className, action }: PresetEmptyStateProps) {
  return (
    <EmptyState
      icon={<Search className="w-full h-full" />}
      title="No results found"
      description="We couldn't find anything matching your search. Try different keywords or filters."
      action={action}
      className={className}
    />
  );
}

export function NoPermissions({ className, action }: PresetEmptyStateProps) {
  return (
    <EmptyState
      icon={<FileText className="w-full h-full" />}
      title="No active permissions"
      description="You haven't granted any permissions to agents yet. Browse the leaderboard to find top-performing agents."
      action={action || { label: "Browse Agents", onClick: () => {} }}
      className={className}
    />
  );
}

export function NoExecutions({ className }: PresetEmptyStateProps) {
  return (
    <EmptyState
      icon={<Inbox className="w-full h-full" />}
      title="No executions yet"
      description="There are no executions to display. Executions will appear here once agents start trading on your behalf."
      className={className}
    />
  );
}

export function WalletNotConnected({
  className,
  action,
}: PresetEmptyStateProps) {
  return (
    <EmptyState
      icon={<Wallet className="w-full h-full" />}
      title="Wallet not connected"
      description="Connect your wallet to view your dashboard, permissions, and activity."
      action={action || { label: "Connect Wallet", onClick: () => {} }}
      className={className}
    />
  );
}

export function GenericError({
  className,
  action,
}: PresetEmptyStateProps & { message?: string }) {
  return (
    <EmptyState
      icon={<AlertCircle className="w-full h-full" />}
      title="Something went wrong"
      description="An error occurred while loading this content. Please try again."
      action={action || { label: "Try Again", onClick: () => window.location.reload() }}
      className={className}
    />
  );
}
