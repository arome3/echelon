"use client";

import { useState, useEffect } from "react";
import {
  CheckCircle,
  XCircle,
  Loader2,
  ExternalLink,
  Copy,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ===========================================
// Transaction Status Types
// ===========================================

export type TransactionStep = {
  id: string;
  label: string;
  description?: string;
  status: "pending" | "active" | "success" | "error" | "skipped";
  txHash?: string;
  error?: string;
};

export type TransactionStatus =
  | "idle"
  | "awaiting_signature"
  | "pending"
  | "confirming"
  | "success"
  | "error";

export interface TransactionModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal should close */
  onClose: () => void;
  /** Transaction title */
  title: string;
  /** Transaction description */
  description?: string;
  /** Current transaction status */
  status: TransactionStatus;
  /** Transaction steps for multi-step transactions */
  steps?: TransactionStep[];
  /** Main transaction hash */
  txHash?: string;
  /** Error message if transaction failed */
  error?: string;
  /** Chain ID for explorer links */
  chainId?: number;
  /** Callback when user clicks "View Details" */
  onViewDetails?: () => void;
  /** Callback when user clicks "Try Again" */
  onRetry?: () => void;
  /** Whether to auto-close on success (default: false) */
  autoCloseOnSuccess?: boolean;
  /** Delay before auto-close in ms (default: 3000) */
  autoCloseDelay?: number;
}

// ===========================================
// Helper Functions
// ===========================================

function getExplorerUrl(chainId: number, txHash: string): string {
  const explorers: Record<number, string> = {
    1: "https://etherscan.io",
    11155111: "https://sepolia.etherscan.io",
    137: "https://polygonscan.com",
    42161: "https://arbiscan.io",
  };
  const baseUrl = explorers[chainId] || explorers[1];
  return `${baseUrl}/tx/${txHash}`;
}

function getStatusIcon(status: TransactionStatus) {
  switch (status) {
    case "awaiting_signature":
      return <Loader2 className="w-12 h-12 text-amber-400 animate-spin" />;
    case "pending":
    case "confirming":
      return <Loader2 className="w-12 h-12 text-primary-400 animate-spin" />;
    case "success":
      return <CheckCircle className="w-12 h-12 text-green-400" />;
    case "error":
      return <XCircle className="w-12 h-12 text-red-400" />;
    default:
      return null;
  }
}

function getStatusMessage(status: TransactionStatus): string {
  switch (status) {
    case "awaiting_signature":
      return "Waiting for wallet signature...";
    case "pending":
      return "Transaction submitted...";
    case "confirming":
      return "Waiting for confirmation...";
    case "success":
      return "Transaction confirmed!";
    case "error":
      return "Transaction failed";
    default:
      return "";
  }
}

// ===========================================
// Step Indicator Component
// ===========================================

function StepIndicator({ step, index }: { step: TransactionStep; index: number }) {
  const getStepIcon = () => {
    switch (step.status) {
      case "success":
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case "error":
        return <XCircle className="w-5 h-5 text-red-400" />;
      case "active":
        return <Loader2 className="w-5 h-5 text-primary-400 animate-spin" />;
      case "skipped":
        return (
          <div className="w-5 h-5 rounded-full bg-dark-600 flex items-center justify-center">
            <span className="text-xs text-primary-500">-</span>
          </div>
        );
      default:
        return (
          <div className="w-5 h-5 rounded-full bg-dark-600 flex items-center justify-center">
            <span className="text-xs text-primary-400">{index + 1}</span>
          </div>
        );
    }
  };

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg transition-colors",
        step.status === "active" && "bg-primary-400/10",
        step.status === "error" && "bg-red-400/10"
      )}
    >
      <div className="flex-shrink-0 mt-0.5">{getStepIcon()}</div>
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "font-medium",
            step.status === "success" && "text-green-400",
            step.status === "error" && "text-red-400",
            step.status === "active" && "text-primary-200",
            step.status === "pending" && "text-primary-400",
            step.status === "skipped" && "text-primary-500"
          )}
        >
          {step.label}
        </p>
        {step.description && (
          <p className="text-sm text-primary-500 mt-0.5">{step.description}</p>
        )}
        {step.error && <p className="text-sm text-red-400 mt-1">{step.error}</p>}
        {step.txHash && (
          <p className="text-xs text-primary-500 mt-1 font-mono truncate">
            {step.txHash}
          </p>
        )}
      </div>
    </div>
  );
}

// ===========================================
// Transaction Modal Component
// ===========================================

export function TransactionModal({
  isOpen,
  onClose,
  title,
  description,
  status,
  steps,
  txHash,
  error,
  chainId = 11155111,
  onViewDetails,
  onRetry,
  autoCloseOnSuccess = false,
  autoCloseDelay = 3000,
}: TransactionModalProps) {
  const [copied, setCopied] = useState(false);

  // Auto-close on success
  useEffect(() => {
    if (autoCloseOnSuccess && status === "success") {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseDelay);
      return () => clearTimeout(timer);
    }
  }, [status, autoCloseOnSuccess, autoCloseDelay, onClose]);

  const copyTxHash = async () => {
    if (!txHash) return;
    try {
      await navigator.clipboard.writeText(txHash);
      setCopied(true);
      toast.success("Transaction hash copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const openExplorer = () => {
    if (!txHash) return;
    window.open(getExplorerUrl(chainId, txHash), "_blank");
  };

  // Don't allow closing while transaction is in progress
  const canClose = status === "idle" || status === "success" || status === "error";

  return (
    <Modal
      isOpen={isOpen}
      onClose={canClose ? onClose : () => {}}
      title={title}
      description={description}
      size="md"
      showClose={canClose}
      closeOnOverlayClick={canClose}
      closeOnEscape={canClose}
    >
      <div className="space-y-6">
        {/* Status Icon & Message */}
        {status !== "idle" && (
          <div className="flex flex-col items-center text-center py-4">
            {getStatusIcon(status)}
            <p className="mt-4 text-lg font-medium text-primary-200">
              {getStatusMessage(status)}
            </p>
            {status === "awaiting_signature" && (
              <p className="mt-2 text-sm text-primary-400">
                Please confirm the transaction in your wallet
              </p>
            )}
            {status === "confirming" && (
              <p className="mt-2 text-sm text-primary-400">
                This may take a few moments...
              </p>
            )}
          </div>
        )}

        {/* Transaction Steps */}
        {steps && steps.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-primary-300 mb-3">
              Transaction Steps
            </h4>
            {steps.map((step, index) => (
              <StepIndicator key={step.id} step={step} index={index} />
            ))}
          </div>
        )}

        {/* Transaction Hash */}
        {txHash && (
          <div className="bg-dark-900 rounded-lg p-4">
            <p className="text-xs text-primary-500 mb-2">Transaction Hash</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-sm font-mono text-primary-300 truncate">
                {txHash}
              </code>
              <button
                onClick={copyTxHash}
                className="p-2 hover:bg-dark-700 rounded-lg transition-colors"
                title="Copy hash"
              >
                <Copy
                  className={cn(
                    "w-4 h-4",
                    copied ? "text-green-400" : "text-primary-400"
                  )}
                />
              </button>
              <button
                onClick={openExplorer}
                className="p-2 hover:bg-dark-700 rounded-lg transition-colors"
                title="View on explorer"
              >
                <ExternalLink className="w-4 h-4 text-primary-400" />
              </button>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && status === "error" && (
          <div className="bg-red-400/10 border border-red-400/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-400">Transaction Failed</p>
                <p className="text-sm text-red-300/80 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-primary-400/20">
          {status === "error" && onRetry && (
            <Button variant="outline" onClick={onRetry}>
              Try Again
            </Button>
          )}
          {status === "success" && onViewDetails && (
            <Button variant="outline" onClick={onViewDetails}>
              View Details
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
          {canClose && (
            <Button variant={status === "success" ? "primary" : "outline"} onClick={onClose}>
              {status === "success" ? "Done" : "Close"}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}

// ===========================================
// Transaction Hook for easier usage
// ===========================================

export interface UseTransactionModalReturn {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Open the modal */
  open: (title: string, description?: string) => void;
  /** Close the modal */
  close: () => void;
  /** Set transaction status */
  setStatus: (status: TransactionStatus) => void;
  /** Set transaction hash */
  setTxHash: (hash: string) => void;
  /** Set error message */
  setError: (error: string) => void;
  /** Add or update a step */
  updateStep: (stepId: string, updates: Partial<TransactionStep>) => void;
  /** Set all steps */
  setSteps: (steps: TransactionStep[]) => void;
  /** Reset all state */
  reset: () => void;
  /** Current modal props */
  modalProps: TransactionModalProps;
}

export function useTransactionModal(): UseTransactionModalReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState<string | undefined>();
  const [status, setStatus] = useState<TransactionStatus>("idle");
  const [steps, setSteps] = useState<TransactionStep[]>([]);
  const [txHash, setTxHash] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();

  const open = (newTitle: string, newDescription?: string) => {
    setTitle(newTitle);
    setDescription(newDescription);
    setStatus("idle");
    setSteps([]);
    setTxHash(undefined);
    setError(undefined);
    setIsOpen(true);
  };

  const close = () => {
    setIsOpen(false);
  };

  const reset = () => {
    setStatus("idle");
    setSteps([]);
    setTxHash(undefined);
    setError(undefined);
  };

  const updateStep = (stepId: string, updates: Partial<TransactionStep>) => {
    setSteps((prev) =>
      prev.map((step) => (step.id === stepId ? { ...step, ...updates } : step))
    );
  };

  const modalProps: TransactionModalProps = {
    isOpen,
    onClose: close,
    title,
    description,
    status,
    steps: steps.length > 0 ? steps : undefined,
    txHash,
    error,
  };

  return {
    isOpen,
    open,
    close,
    setStatus,
    setTxHash,
    setError,
    updateStep,
    setSteps,
    reset,
    modalProps,
  };
}
