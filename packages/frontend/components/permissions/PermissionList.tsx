"use client";

import Link from "next/link";
import { Shield, Clock, ExternalLink } from "lucide-react";
import { cn, formatAmount, formatRelativeTime } from "@/lib/utils";
import { NoPermissions } from "@/components/ui/EmptyState";
import { RevokeButton } from "./RevokeButton";
import { getPermissionStatus } from "@/hooks/usePermissions";
import type { Permission } from "@/lib/types";

// ===========================================
// PermissionList Component
// ===========================================

interface PermissionListProps {
  /** Array of permissions to display */
  permissions: Permission[];
  /** Whether the data is loading */
  loading?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Callback when a permission is revoked */
  onPermissionRevoked?: () => void;
}

/**
 * Displays a list of user permissions with status, usage, and revoke actions.
 * Separates active and inactive permissions for clarity.
 */
export function PermissionList({
  permissions,
  loading,
  className,
  onPermissionRevoked,
}: PermissionListProps) {
  // Loading state
  if (loading) {
    return (
      <div className={cn("glass-card", className)}>
        <div className="p-6 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-slate-400" />
            <h3 className="text-lg font-semibold text-slate-100">My Permissions</h3>
          </div>
        </div>
        <div className="divide-y divide-white/[0.06]">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/[0.06] rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-white/[0.06] rounded w-1/3" />
                  <div className="h-3 bg-white/[0.06] rounded w-1/4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  if (!permissions?.length) {
    return (
      <div className={cn("glass-card", className)}>
        <div className="p-6 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-slate-400" />
            <h3 className="text-lg font-semibold text-slate-100">My Permissions</h3>
          </div>
        </div>
        <NoPermissions />
      </div>
    );
  }

  // Separate active and inactive permissions
  const activePermissions = permissions.filter((p) => p.isActive);
  const inactivePermissions = permissions.filter((p) => !p.isActive);

  return (
    <div className={cn("glass-card", className)}>
      {/* Header */}
      <div className="p-6 border-b border-white/[0.06]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-slate-400" />
            <h3 className="text-lg font-semibold text-slate-100">My Permissions</h3>
          </div>
          <span className="text-sm text-slate-500">
            {activePermissions.length} active
          </span>
        </div>
      </div>

      {/* Permission Rows */}
      <div className="divide-y divide-white/[0.06]">
        {/* Active Permissions */}
        {activePermissions.map((permission) => (
          <PermissionRow
            key={permission.id}
            permission={permission}
            onRevoke={onPermissionRevoked}
          />
        ))}

        {/* Inactive Permissions Section */}
        {inactivePermissions.length > 0 && (
          <>
            <div className="px-6 py-3 bg-white/[0.02]">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Inactive Permissions
              </p>
            </div>
            {inactivePermissions.slice(0, 3).map((permission) => (
              <PermissionRow
                key={permission.id}
                permission={permission}
                inactive
              />
            ))}
            {inactivePermissions.length > 3 && (
              <div className="p-4 text-center text-sm text-slate-500">
                +{inactivePermissions.length - 3} more inactive permissions
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ===========================================
// PermissionRow Component (Internal)
// ===========================================

interface PermissionRowProps {
  permission: Permission;
  inactive?: boolean;
  onRevoke?: () => void;
}

function PermissionRow({ permission, inactive, onRevoke }: PermissionRowProps) {
  const status = getPermissionStatus(permission);

  // Calculate usage
  const totalAmount = parseFloat(permission.totalAmount);
  const amountUsed = parseFloat(permission.amountUsed);
  const remaining = totalAmount - amountUsed;
  const usagePercent = totalAmount > 0 ? (amountUsed / totalAmount) * 100 : 0;

  // Get display name - handle undefined/empty gracefully
  const agentName = permission.agent?.name && permission.agent.name.trim()
    ? permission.agent.name
    : permission.agent?.walletAddress
      ? `Agent ${permission.agent.walletAddress.slice(0, 6)}...${permission.agent.walletAddress.slice(-4)}`
      : "Unknown Agent";

  // Get the first letter for avatar
  const avatarLetter = agentName.charAt(0).toUpperCase();

  // Status styling - Dark mode
  const getStatusStyle = () => {
    switch (status.statusLabel) {
      case "Active":
        return { bgColor: "bg-emerald-500/10", textColor: "text-emerald-400" };
      case "Expired":
        return { bgColor: "bg-slate-500/10", textColor: "text-slate-400" };
      case "Revoked":
        return { bgColor: "bg-red-500/10", textColor: "text-red-400" };
      case "Exhausted":
        return { bgColor: "bg-amber-500/10", textColor: "text-amber-400" };
      default:
        return { bgColor: "bg-slate-500/10", textColor: "text-slate-400" };
    }
  };

  const statusStyle = getStatusStyle();

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 hover:bg-white/[0.02] transition-colors",
        inactive && "opacity-50"
      )}
    >
      {/* Left: Agent Info */}
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold",
            inactive
              ? "bg-slate-600"
              : "bg-gradient-to-br from-primary-500 to-primary-700"
          )}
        >
          {avatarLetter}
        </div>
        <div>
          <Link
            href={`/agents/${permission.agent?.id || ""}`}
            className="font-medium text-slate-100 hover:text-primary-400 flex items-center gap-1 transition-colors"
          >
            {agentName}
            <ExternalLink className="w-3 h-3" />
          </Link>
          <div className="flex items-center gap-2 mt-0.5">
            <span
              className={cn(
                "px-2 py-0.5 text-xs font-medium rounded-full",
                statusStyle.bgColor,
                statusStyle.textColor
              )}
            >
              {status.statusLabel}
            </span>
            {!inactive && (
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Expires {formatRelativeTime(permission.expiresAt)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right: Amounts & Actions */}
      <div className="flex items-center gap-4 sm:gap-6">
        {/* Usage */}
        <div className="text-right min-w-[120px]">
          <p className="text-sm text-slate-500">Used / Limit</p>
          <p className="font-medium text-slate-200 font-mono">
            {formatAmount(permission.amountUsed)} /{" "}
            {formatAmount(permission.totalAmount)}
          </p>
          {!inactive && (
            <div className="mt-1.5 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-300",
                  usagePercent > 90
                    ? "bg-gradient-to-r from-red-500 to-red-400"
                    : usagePercent > 70
                    ? "bg-gradient-to-r from-amber-500 to-amber-400"
                    : "bg-gradient-to-r from-emerald-500 to-emerald-400"
                )}
                style={{ width: `${Math.min(100, usagePercent)}%` }}
              />
            </div>
          )}
        </div>

        {/* Remaining */}
        <div className="text-right min-w-[80px]">
          <p className="text-sm text-slate-500">Remaining</p>
          <p
            className={cn(
              "font-semibold font-mono",
              remaining <= 0
                ? "text-red-400"
                : remaining < totalAmount * 0.2
                ? "text-amber-400"
                : "text-emerald-400"
            )}
          >
            {formatAmount(remaining.toString())}
          </p>
        </div>

        {/* Actions */}
        {!inactive && (
          <RevokeButton
            permission={permission}
            variant="icon"
            onRevoked={onRevoke}
          />
        )}
      </div>
    </div>
  );
}

// ===========================================
// CompactPermissionCard Component
// ===========================================

interface CompactPermissionCardProps {
  /** The permission to display */
  permission: Permission;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Compact version of permission display for dashboard widgets.
 */
export function CompactPermissionCard({
  permission,
  className,
}: CompactPermissionCardProps) {
  const usagePercent =
    (parseFloat(permission.amountUsed) / parseFloat(permission.totalAmount)) * 100;

  // Get display name - handle undefined/empty gracefully
  const agentName = permission.agent?.name && permission.agent.name.trim()
    ? permission.agent.name
    : permission.agent?.walletAddress
      ? `Agent ${permission.agent.walletAddress.slice(0, 6)}...${permission.agent.walletAddress.slice(-4)}`
      : "Unknown Agent";

  return (
    <Link
      href={`/agents/${permission.agent?.id || ""}`}
      className={cn(
        "block p-4 glass-card-hover transition-all",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center text-white font-bold">
          {agentName.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-slate-100 truncate">
            {agentName}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-500 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, usagePercent)}%` }}
              />
            </div>
            <span className="text-xs text-slate-500 font-mono">{usagePercent.toFixed(0)}%</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
