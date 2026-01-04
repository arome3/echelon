"use client";

import { useState } from "react";
import { XCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useRevokePermission } from "@/hooks/useRevokePermission";
import { formatAmount } from "@/lib/utils";
import type { Permission } from "@/lib/types";

// ===========================================
// RevokeButton Component
// ===========================================

interface RevokeButtonProps {
  /** The permission to revoke */
  permission: Permission;
  /** Callback when permission is successfully revoked */
  onRevoked?: () => void;
  /** Button variant: icon (compact) or button (full) */
  variant?: "button" | "icon";
  /** Additional CSS classes */
  className?: string;
}

/**
 * Button component for revoking ERC-7715 permissions.
 * Shows a confirmation modal before revoking.
 */
export function RevokeButton({
  permission,
  onRevoked,
  variant = "icon",
  className,
}: RevokeButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const { revokePermission, isRevoking } = useRevokePermission();

  const handleRevoke = async () => {
    const success = await revokePermission(permission.id);
    if (success) {
      setShowModal(false);
      onRevoked?.();
    }
  };

  return (
    <>
      {variant === "icon" ? (
        <button
          onClick={() => setShowModal(true)}
          className={`p-2 text-primary-400 hover:text-danger-400 hover:bg-danger-500/10 rounded-lg transition-colors ${className || ""}`}
          aria-label="Revoke permission"
          title="Revoke permission"
        >
          <XCircle className="w-4 h-4" />
        </button>
      ) : (
        <Button
          variant="danger"
          onClick={() => setShowModal(true)}
          className={className}
        >
          Revoke Permission
        </Button>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Revoke Permission"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-primary-400">
            Are you sure you want to revoke the permission for{" "}
            <span className="font-medium text-primary-200">
              {permission.agent?.name || "this agent"}
            </span>
            ?
          </p>

          {/* Permission Details */}
          <div className="p-4 bg-dark-800/50 border border-primary-400/20 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-primary-500">Total Limit</span>
              <span className="font-medium text-primary-200">
                {formatAmount(permission.totalAmount)} {permission.tokenSymbol || "USDC"}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-primary-500">Amount Used</span>
              <span className="font-medium text-primary-200">
                {formatAmount(permission.amountUsed)} {permission.tokenSymbol || "USDC"}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-primary-500">Per Period</span>
              <span className="font-medium text-primary-200">
                {formatAmount(permission.amountPerPeriod)} {permission.tokenSymbol || "USDC"}
              </span>
            </div>
          </div>

          {/* Warning */}
          <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/30 text-yellow-200 rounded-lg text-sm">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-yellow-400" />
            <p>
              The agent will immediately lose access to spend from your wallet.
              Any pending trades may fail.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setShowModal(false)}
              className="flex-1"
              disabled={isRevoking}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleRevoke}
              isLoading={isRevoking}
              loadingText="Revoking..."
              className="flex-1"
            >
              Revoke Permission
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
