"use client";

import { useState } from "react";
import { Shield, AlertTriangle, Clock, DollarSign, CheckCircle, ShieldAlert, Info, ExternalLink, Wallet, ArrowRight, Coins } from "lucide-react";
import { useAccount, useBalance } from "wagmi";
import { cn, formatAmount } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { ConnectPrompt } from "@/components/ui/ConnectPrompt";
import { FlaskRequiredBanner, FlaskRequiredModal } from "@/components/ui/FlaskPrompt";
import { useFlaskDetection } from "@/hooks/useFlaskDetection";
import {
  useMyPermissionForAgent,
  getPermissionStatus,
  formatRemainingTime,
} from "@/hooks/usePermissions";
import { useGrantPermission, type GrantPermissionResult } from "@/hooks/useGrantPermission";
import { RevokeButton } from "./RevokeButton";
import { PERMISSION_DURATIONS, PERIOD_DURATIONS, TOKENS } from "@/lib/constants";
import { AgentTrustIndicator, getAgentBadgeType } from "@/components/agents/VerifiedBadge";
import type { Agent } from "@/lib/types";

// ===========================================
// Reputation Constants
// ===========================================

/** Minimum reputation score for full trust (no warnings) */
const REPUTATION_THRESHOLD_HIGH = 60;
/** Minimum reputation score for basic trust (warning only) */
const REPUTATION_THRESHOLD_LOW = 30;
/** Block delegation to agents below this reputation unless verified */
const REPUTATION_THRESHOLD_BLOCK = 10;

// ===========================================
// GrantPermission Component
// ===========================================

interface GrantPermissionProps {
  /** The agent to grant permission to */
  agent: Agent;
  /** Additional CSS classes */
  className?: string;
  /** Callback when permission is granted or revoked */
  onPermissionChanged?: () => void;
}

/**
 * Component for granting ERC-7715 permissions to AI agents.
 * Handles wallet connection state, existing permissions, and the grant flow.
 */
export function GrantPermission({
  agent,
  className,
  onPermissionChanged,
}: GrantPermissionProps) {
  const { isConnected } = useAccount();
  const { permission, loading, hasActivePermission } = useMyPermissionForAgent(agent.id);

  // Not connected state
  if (!isConnected) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary-400" />
            Grant Permission
          </CardTitle>
        </CardHeader>
        <ConnectPrompt
          message="Connect your wallet to delegate spending permissions to this agent"
          compact
        />
      </Card>
    );
  }

  // Loading state
  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary-400" />
            Grant Permission
          </CardTitle>
        </CardHeader>
        <div className="animate-pulse space-y-4 p-4">
          <div className="h-10 bg-primary-400/10 rounded" />
          <div className="h-10 bg-primary-400/10 rounded" />
          <div className="h-10 bg-primary-400/10 rounded" />
        </div>
      </Card>
    );
  }

  // Has active permission - show status and revoke option
  if (hasActivePermission && permission) {
    const status = getPermissionStatus(permission);

    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-400" />
            Active Permission
          </CardTitle>
        </CardHeader>

        <div className="space-y-4 p-4 pt-0">
          {/* Active Badge */}
          <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 text-green-300 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <span className="text-sm font-medium">
              You have an active permission with this agent
            </span>
          </div>

          {/* Permission Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-dark-800/50 rounded-lg border border-primary-400/20">
              <p className="text-sm text-primary-500">Per Period</p>
              <p className="text-lg font-semibold text-primary-200">
                {formatAmount(permission.amountPerPeriod)}{" "}
                {permission.tokenSymbol || "USDC"}
              </p>
            </div>
            <div className="p-3 bg-dark-800/50 rounded-lg border border-primary-400/20">
              <p className="text-sm text-primary-500">Remaining</p>
              <p className="text-lg font-semibold text-primary-200">
                {formatAmount(permission.amountRemaining)}{" "}
                {permission.tokenSymbol || "USDC"}
              </p>
            </div>
          </div>

          {/* Usage Progress Bar */}
          <div>
            <div className="flex justify-between text-sm text-primary-400 mb-1">
              <span>Usage</span>
              <span>{status.usagePercent.toFixed(1)}%</span>
            </div>
            <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  status.usagePercent > 90
                    ? "bg-red-500"
                    : status.usagePercent > 70
                    ? "bg-yellow-500"
                    : "bg-green-500"
                )}
                style={{ width: `${Math.min(100, status.usagePercent)}%` }}
              />
            </div>
          </div>

          {/* Time Remaining */}
          <div className="flex items-center justify-between text-sm text-primary-400">
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {formatRemainingTime(status.remainingTime)}
            </span>
          </div>

          {/* Revoke Button */}
          <RevokeButton
            permission={permission}
            variant="button"
            className="w-full"
            onRevoked={onPermissionChanged}
          />
        </div>
      </Card>
    );
  }

  // No permission - show grant form
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary-400" />
          Grant Permission
        </CardTitle>
      </CardHeader>

      <PermissionForm agent={agent} onSuccess={onPermissionChanged} />
    </Card>
  );
}

// ===========================================
// Permission Form Component (Internal)
// ===========================================

interface PermissionFormProps {
  agent: Agent;
  onSuccess?: () => void;
}

function PermissionForm({ agent, onSuccess }: PermissionFormProps) {
  const [amount, setAmount] = useState("100");
  const [duration, setDuration] = useState("7");
  const [periodDuration, setPeriodDuration] = useState(PERIOD_DURATIONS.DAILY.toString());
  const [showConfirm, setShowConfirm] = useState(false);
  const [showFlaskModal, setShowFlaskModal] = useState(false);
  const [flaskError, setFlaskError] = useState<string | null>(null);
  const [acknowledgeRisk, setAcknowledgeRisk] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [grantResult, setGrantResult] = useState<GrantPermissionResult | null>(null);

  const { address } = useAccount();
  const { grantPermission, isGranting, error } = useGrantPermission();
  const { hasFlask, supportsERC7715, isChecking } = useFlaskDetection();

  // Fetch user's USDC balance
  const { data: usdcBalance, isLoading: balanceLoading } = useBalance({
    address,
    token: TOKENS.USDC as `0x${string}`,
  });

  // Reputation-based trust checks
  const reputationScore = agent.reputationScore || 0;
  const isVerified = agent.isVerified || false;
  const badgeType = getAgentBadgeType(isVerified, reputationScore);

  // Determine if we should warn or block
  const isLowReputation = reputationScore < REPUTATION_THRESHOLD_LOW && !isVerified;
  const isVeryLowReputation = reputationScore < REPUTATION_THRESHOLD_BLOCK && !isVerified;
  const needsRiskAcknowledgment = isLowReputation && !acknowledgeRisk;

  // Check if balance is lower than the amount being authorized
  const userBalance = usdcBalance ? parseFloat(usdcBalance.formatted) : 0;
  const requestedAmount = parseFloat(amount) || 0;
  const isLowBalance = !balanceLoading && requestedAmount > userBalance;

  const handleSubmit = async () => {
    // Check for Flask before attempting permission grant
    if (!hasFlask || !supportsERC7715) {
      setFlaskError("MetaMask Flask is required for ERC-7715 permissions");
      setShowFlaskModal(true);
      setShowConfirm(false);
      return;
    }

    const result = await grantPermission({
      agentAddress: agent.walletAddress,
      agentName: agent.name,
      agentId: agent.id, // Numeric ID from indexer for routing to /agents/[id]
      amount,
      periodDuration: parseInt(periodDuration),
      expiryDays: parseInt(duration),
      tokenAddress: TOKENS.USDC,
      decimals: 6,
      justification: `Echelon AI Agent permission for ${agent.name}`,
      // Pass agent metadata for localStorage display
      agentReputationScore: agent.reputationScore || 0,
      agentStrategyType: agent.strategyType || "Unknown",
      agentIsVerified: agent.isVerified || false,
    });

    // Always close the confirmation modal
    setShowConfirm(false);

    if (result) {
      // Success - show success modal and trigger callback
      console.log("[GrantPermission] Permission granted successfully, result:", result);
      setGrantResult(result);
      setShowSuccess(true);

      // Also call onSuccess immediately to close the parent modal
      // The success modal will show briefly but the parent "Start Earning" modal will close
      // This ensures the flow completes even if the modal has rendering issues
      setTimeout(() => {
        console.log("[GrantPermission] Calling onSuccess callback");
        onSuccess?.();
      }, 100);
    } else {
      // No result returned - check for specific errors
      // Get the latest error from the hook (error state might be stale)
      const latestError = error;

      if (latestError) {
        const errorMsg = latestError.message.toLowerCase();
        // If Flask/ERC-7715 related, show Flask modal
        if (
          errorMsg.includes("not supported") ||
          errorMsg.includes("unsupported") ||
          errorMsg.includes("method not found") ||
          errorMsg.includes("does not exist") ||
          errorMsg.includes("flask")
        ) {
          setFlaskError(latestError.message);
          setShowFlaskModal(true);
        }
        // Other errors are already shown via toast in the hook
      }
      // If no result and no specific error handling needed,
      // the hook already showed a toast with the error message
    }
  };

  return (
    <div className="space-y-4 p-4 pt-0">
      {/* Flask Requirement Banner - Show if Flask not detected */}
      {!isChecking && (!hasFlask || !supportsERC7715) && (
        <FlaskRequiredBanner compact />
      )}

      {/* Agent Trust Indicator */}
      <div className="flex items-center justify-between p-3 bg-dark-800/50 border border-primary-400/20 rounded-lg">
        <div className="flex items-center gap-2">
          <span className="text-sm text-primary-400">Agent Status:</span>
          <AgentTrustIndicator
            isVerified={isVerified}
            reputationScore={reputationScore}
            size="sm"
          />
        </div>
        <span className="text-sm text-primary-500">
          Score: {reputationScore}/100
        </span>
      </div>

      {/* Low Reputation Warning */}
      {isLowReputation && (
        <div className={cn(
          "p-4 rounded-lg border",
          isVeryLowReputation
            ? "bg-red-500/10 border-red-500/30"
            : "bg-orange-500/10 border-orange-500/30"
        )}>
          <div className="flex gap-3">
            <ShieldAlert className={cn(
              "w-5 h-5 flex-shrink-0",
              isVeryLowReputation ? "text-red-400" : "text-orange-400"
            )} />
            <div className="space-y-2">
              <p className={cn(
                "font-medium",
                isVeryLowReputation ? "text-red-300" : "text-orange-300"
              )}>
                {isVeryLowReputation
                  ? "Very Low Reputation Agent"
                  : "Low Reputation Agent"}
              </p>
              <p className={cn(
                "text-sm",
                isVeryLowReputation ? "text-red-400/80" : "text-orange-400/80"
              )}>
                {isVeryLowReputation
                  ? "This agent has very low or no reputation. Consider delegating to a verified or higher-reputation agent."
                  : "This agent has limited track record. Proceed with caution and consider starting with a small amount."}
              </p>

              {/* Risk Acknowledgment Checkbox */}
              <label className="flex items-start gap-2 cursor-pointer mt-3">
                <input
                  type="checkbox"
                  checked={acknowledgeRisk}
                  onChange={(e) => setAcknowledgeRisk(e.target.checked)}
                  className={cn(
                    "mt-0.5 w-4 h-4 rounded border bg-dark-800",
                    isVeryLowReputation
                      ? "border-red-500/50 text-red-500 focus:ring-red-500/50"
                      : "border-orange-500/50 text-orange-500 focus:ring-orange-500/50"
                  )}
                />
                <span className={cn(
                  "text-sm",
                  isVeryLowReputation ? "text-red-300" : "text-orange-300"
                )}>
                  I understand the risks and want to proceed with this delegation
                </span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Verified Agent Info */}
      {isVerified && (
        <div className="flex items-center gap-2 p-3 bg-blue-500/10 border border-blue-500/30 text-blue-300 rounded-lg">
          <Info className="w-5 h-5 text-blue-400" />
          <span className="text-sm">
            This agent is verified by Echelon - audited and trusted
          </span>
        </div>
      )}

      {/* USDC Balance Display */}
      <div className={cn(
        "flex items-center justify-between p-3 rounded-lg border",
        isLowBalance
          ? "bg-amber-500/10 border-amber-500/30"
          : "bg-dark-800/50 border-primary-400/20"
      )}>
        <div className="flex items-center gap-2">
          <Coins className={cn("w-5 h-5", isLowBalance ? "text-amber-400" : "text-primary-400")} />
          <span className={cn("text-sm", isLowBalance ? "text-amber-300" : "text-primary-400")}>
            Your USDC Balance
          </span>
        </div>
        <div className="text-right">
          {balanceLoading ? (
            <span className="text-sm text-primary-500">Loading...</span>
          ) : usdcBalance ? (
            <span className={cn("font-semibold", isLowBalance ? "text-amber-200" : "text-primary-200")}>
              {parseFloat(usdcBalance.formatted).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              <span className={isLowBalance ? "text-amber-400" : "text-primary-400"}>USDC</span>
            </span>
          ) : (
            <span className="text-sm text-primary-500">0.00 USDC</span>
          )}
        </div>
      </div>

      {/* Low Balance Warning */}
      {isLowBalance && (
        <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/30 text-amber-200 rounded-lg text-sm">
          <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
          <div>
            <p className="text-amber-300 font-medium">Balance lower than authorization</p>
            <p className="text-amber-200/80 mt-1">
              You can still grant permission - the agent will only be able to spend up to your available balance.
            </p>
          </div>
        </div>
      )}

      {/* Amount Input */}
      <div>
        <label className="block text-sm font-medium text-primary-200 mb-1">
          Amount Per Period (USDC)
        </label>
        <div className="relative">
          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400" />
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-dark-800/50 border border-primary-400/30 rounded-lg text-primary-100 placeholder-primary-500 focus:ring-2 focus:ring-primary-400/50 focus:border-primary-400"
            placeholder="100"
            min="1"
          />
        </div>
        <p className="text-xs text-primary-500 mt-1">
          Maximum the agent can spend per period
        </p>
      </div>

      {/* Period Duration Select */}
      <div>
        <label className="block text-sm font-medium text-primary-200 mb-1">
          Period Duration
        </label>
        <select
          value={periodDuration}
          onChange={(e) => setPeriodDuration(e.target.value)}
          className="w-full px-4 py-2 bg-dark-800/50 border border-primary-400/30 rounded-lg text-primary-100 focus:ring-2 focus:ring-primary-400/50 focus:border-primary-400"
        >
          <option value={PERIOD_DURATIONS.HOURLY}>Hourly</option>
          <option value={PERIOD_DURATIONS.DAILY}>Daily</option>
          <option value={PERIOD_DURATIONS.WEEKLY}>Weekly</option>
        </select>
        <p className="text-xs text-primary-500 mt-1">
          How often the spending limit resets
        </p>
      </div>

      {/* Expiry Duration Select */}
      <div>
        <label className="block text-sm font-medium text-primary-200 mb-1">
          Permission Duration
        </label>
        <select
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          className="w-full px-4 py-2 bg-dark-800/50 border border-primary-400/30 rounded-lg text-primary-100 focus:ring-2 focus:ring-primary-400/50 focus:border-primary-400"
        >
          {PERMISSION_DURATIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-primary-500 mt-1">
          Permission will automatically expire after this period
        </p>
      </div>

      {/* Quick Amount Buttons */}
      <div>
        <p className="text-sm text-primary-400 mb-2">Quick amounts:</p>
        <div className="flex gap-2 flex-wrap">
          {["25", "50", "100", "250", "500"].map((quickAmount) => (
            <button
              key={quickAmount}
              onClick={() => setAmount(quickAmount)}
              className={cn(
                "px-3 py-1 text-sm rounded-lg border transition-colors",
                amount === quickAmount
                  ? "border-primary-300 bg-primary-300/20 text-primary-200"
                  : "border-primary-400/30 text-primary-400 hover:bg-primary-400/10"
              )}
            >
              ${quickAmount}
            </button>
          ))}
        </div>
      </div>

      {/* Warning */}
      <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/30 text-yellow-200 rounded-lg">
        <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-yellow-400" />
        <div className="text-sm">
          <p className="font-medium text-yellow-300">Non-custodial permission</p>
          <p className="text-yellow-200/80 mt-1">
            The agent can only spend up to your limit per period. You can revoke
            at any time. Your funds stay in your wallet.
          </p>
        </div>
      </div>

      {/* Submit Button */}
      <Button
        className="w-full"
        onClick={() => setShowConfirm(true)}
        disabled={needsRiskAcknowledgment}
      >
        <Shield className="w-4 h-4 mr-2" />
        {needsRiskAcknowledgment
          ? "Acknowledge Risk to Continue"
          : "Grant Permission"}
      </Button>

      {/* Confirmation Modal */}
      <ConfirmPermissionModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleSubmit}
        isSubmitting={isGranting}
        agent={agent}
        amount={amount}
        duration={duration}
        periodDuration={periodDuration}
      />

      {/* Flask Required Modal - Shows when Flask not detected during grant attempt */}
      <FlaskRequiredModal
        isOpen={showFlaskModal}
        onClose={() => setShowFlaskModal(false)}
        errorMessage={flaskError || undefined}
      />

      {/* Success Modal - Shows after successful permission grant */}
      <SuccessModal
        isOpen={showSuccess}
        onClose={() => {
          setShowSuccess(false);
          onSuccess?.();
        }}
        agent={agent}
        amount={amount}
        duration={duration}
        periodDuration={periodDuration}
        grantResult={grantResult}
      />
    </div>
  );
}

// ===========================================
// Confirmation Modal Component (Internal)
// ===========================================

interface ConfirmPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isSubmitting: boolean;
  agent: Agent;
  amount: string;
  duration: string;
  periodDuration: string;
}

function ConfirmPermissionModal({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting,
  agent,
  amount,
  duration,
  periodDuration,
}: ConfirmPermissionModalProps) {
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + parseInt(duration));

  const getPeriodLabel = (seconds: string) => {
    const sec = parseInt(seconds);
    if (sec === PERIOD_DURATIONS.HOURLY) return "Hourly";
    if (sec === PERIOD_DURATIONS.DAILY) return "Daily";
    if (sec === PERIOD_DURATIONS.WEEKLY) return "Weekly";
    if (sec === PERIOD_DURATIONS.MONTHLY) return "Monthly";
    return `${sec} seconds`;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Confirm Permission Grant" size="md">
      <div className="space-y-4">
        <p className="text-primary-400">
          You are about to grant an ERC-7715 permission to{" "}
          <span className="font-medium text-primary-200">{agent.name}</span>:
        </p>

        {/* Permission Summary */}
        <div className="p-4 bg-dark-800/50 border border-primary-400/20 rounded-lg space-y-3">
          <div className="flex justify-between">
            <span className="text-primary-500">Agent</span>
            <span className="font-medium text-primary-200">{agent.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-primary-500">Amount Per Period</span>
            <span className="font-medium text-primary-200">{amount} USDC</span>
          </div>
          <div className="flex justify-between">
            <span className="text-primary-500">Period</span>
            <span className="font-medium text-primary-200">
              {getPeriodLabel(periodDuration)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-primary-500">Expires</span>
            <span className="font-medium text-primary-200">
              {expirationDate.toLocaleDateString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-primary-500">Reputation Score</span>
            <span className="font-medium text-primary-200">
              {agent.reputationScore}/100
            </span>
          </div>
        </div>

        {/* Info Box */}
        <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/30 text-blue-200 rounded-lg text-sm">
          <Shield className="w-5 h-5 shrink-0 mt-0.5 text-blue-400" />
          <div>
            <p>
              This will request an ERC-7715 permission via MetaMask Flask, allowing the
              agent to spend up to {amount} USDC per{" "}
              {getPeriodLabel(periodDuration).toLowerCase()} from your wallet.
            </p>
            <p className="mt-2 text-blue-300/80">
              <strong>Note:</strong> After clicking confirm, check your MetaMask Flask
              extension icon to approve the request.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            isLoading={isSubmitting}
            loadingText="Requesting..."
            className="flex-1"
          >
            Confirm & Sign
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ===========================================
// Success Modal Component (Internal)
// ===========================================

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  agent: Agent;
  amount: string;
  duration: string;
  periodDuration: string;
  grantResult: GrantPermissionResult | null;
}

function SuccessModal({
  isOpen,
  onClose,
  agent,
  amount,
  duration,
  periodDuration,
  grantResult,
}: SuccessModalProps) {
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + parseInt(duration));

  const getPeriodLabel = (seconds: string) => {
    const sec = parseInt(seconds);
    if (sec === PERIOD_DURATIONS.HOURLY) return "hour";
    if (sec === PERIOD_DURATIONS.DAILY) return "day";
    if (sec === PERIOD_DURATIONS.WEEKLY) return "week";
    if (sec === PERIOD_DURATIONS.MONTHLY) return "month";
    return `${sec} seconds`;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" size="md">
      <div className="space-y-6 text-center">
        {/* Success Icon */}
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-green-400" />
          </div>
        </div>

        {/* Success Message */}
        <div>
          <h2 className="text-xl font-semibold text-primary-100 mb-2">
            Permission Granted!
          </h2>
          <p className="text-primary-400">
            You've successfully delegated spending permission to{" "}
            <span className="font-medium text-primary-200">{agent.name}</span>
          </p>
        </div>

        {/* Permission Summary */}
        <div className="p-4 bg-dark-800/50 border border-green-500/30 rounded-lg space-y-3 text-left">
          <div className="flex items-center gap-2 text-green-400 text-sm font-medium mb-3">
            <Shield className="w-4 h-4" />
            Permission Details
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-primary-500">Spending Limit</p>
              <p className="font-semibold text-primary-200">{amount} USDC/{getPeriodLabel(periodDuration)}</p>
            </div>
            <div>
              <p className="text-primary-500">Valid Until</p>
              <p className="font-semibold text-primary-200">{expirationDate.toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        {/* What's Next Section */}
        <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg text-left">
          <div className="flex items-center gap-2 text-blue-400 text-sm font-medium mb-3">
            <ArrowRight className="w-4 h-4" />
            What Happens Next
          </div>
          <ul className="space-y-2 text-sm text-blue-200/80">
            <li className="flex items-start gap-2">
              <span className="text-blue-400 mt-0.5">•</span>
              <span>The agent can now execute trades using up to <strong>{amount} USDC</strong> per {getPeriodLabel(periodDuration)}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400 mt-0.5">•</span>
              <span>Your funds remain in your wallet - the agent only has spending permission</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400 mt-0.5">•</span>
              <span>You can revoke this permission at any time from this page</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400 mt-0.5">•</span>
              <span>View all your delegations in the <a href="/dashboard" className="text-blue-400 hover:text-blue-300 underline">Dashboard</a></span>
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            onClick={() => window.open("/dashboard", "_blank")}
            className="flex-1"
          >
            <Wallet className="w-4 h-4 mr-2" />
            View Dashboard
          </Button>
          <Button onClick={onClose} className="flex-1">
            <CheckCircle className="w-4 h-4 mr-2" />
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
}
