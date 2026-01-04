"use client";

import { AlertTriangle, ExternalLink, Download, RefreshCw, X } from "lucide-react";
import { Button } from "./Button";
import { Modal } from "./Modal";
import { useFlaskDetection, getFlaskInstallUrl, getFlaskDocsUrl } from "@/hooks/useFlaskDetection";

// ===========================================
// Flask Required Banner Component
// ===========================================

interface FlaskRequiredBannerProps {
  /** Additional CSS classes */
  className?: string;
  /** Whether to show as a compact inline banner */
  compact?: boolean;
}

/**
 * Banner component that shows when MetaMask Flask is required but not installed.
 * Used to inform users about the Flask requirement for ERC-7715.
 */
export function FlaskRequiredBanner({ className, compact = false }: FlaskRequiredBannerProps) {
  const { hasMetaMask, hasFlask, supportsERC7715, isChecking, recheck } = useFlaskDetection();

  // Don't show if checking or if Flask is installed with ERC-7715 support
  if (isChecking || (hasFlask && supportsERC7715)) {
    return null;
  }

  if (compact) {
    return (
      <div className={`flex items-start gap-2 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg ${className}`}>
        <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-orange-400" />
        <div className="flex-1 text-sm">
          <p className="font-medium text-orange-300">MetaMask Flask Required</p>
          <p className="text-orange-200/80 mt-1">
            ERC-7715 permissions require{" "}
            <a
              href={getFlaskInstallUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-orange-200"
            >
              MetaMask Flask 13.5.0+
            </a>
          </p>
        </div>
        <button
          onClick={recheck}
          className="p-1 text-orange-400 hover:text-orange-300 transition-colors"
          title="Recheck wallet"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className={`p-4 bg-orange-500/10 border border-orange-500/30 rounded-xl ${className}`}>
      <div className="flex items-start gap-3">
        <div className="p-2 bg-orange-500/20 rounded-lg">
          <AlertTriangle className="w-6 h-6 text-orange-400" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-orange-300">MetaMask Flask Required</h3>
          <p className="text-sm text-orange-200/80 mt-1">
            ERC-7715 Advanced Permissions is an experimental feature that requires MetaMask Flask
            (developer preview) version 13.5.0 or later.
          </p>

          {!hasMetaMask && (
            <p className="text-sm text-orange-200/60 mt-2">
              No MetaMask detected. Please install MetaMask Flask.
            </p>
          )}

          {hasMetaMask && !hasFlask && (
            <p className="text-sm text-orange-200/60 mt-2">
              Regular MetaMask detected. Please replace with MetaMask Flask for ERC-7715 support.
            </p>
          )}

          <div className="flex flex-wrap gap-2 mt-4">
            <a
              href={getFlaskInstallUrl()}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button size="sm" className="gap-2">
                <Download className="w-4 h-4" />
                Install Flask
              </Button>
            </a>
            <a
              href={getFlaskDocsUrl()}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm" className="gap-2">
                <ExternalLink className="w-4 h-4" />
                Learn More
              </Button>
            </a>
            <Button variant="ghost" size="sm" onClick={recheck} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Recheck
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===========================================
// Flask Required Modal Component
// ===========================================

interface FlaskRequiredModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal is closed */
  onClose: () => void;
  /** Optional error message to display */
  errorMessage?: string;
}

/**
 * Modal that appears when a user tries to use ERC-7715 without Flask.
 */
export function FlaskRequiredModal({ isOpen, onClose, errorMessage }: FlaskRequiredModalProps) {
  const { hasMetaMask, hasFlask, walletVersion, recheck } = useFlaskDetection();

  const handleRecheck = async () => {
    recheck();
    // Give time for detection to complete
    await new Promise((resolve) => setTimeout(resolve, 1000));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="MetaMask Flask Required" size="md">
      <div className="space-y-4">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="p-4 bg-orange-500/20 rounded-full">
            <AlertTriangle className="w-12 h-12 text-orange-400" />
          </div>
        </div>

        {/* Message */}
        <div className="text-center">
          <h3 className="text-lg font-semibold text-primary-200">
            ERC-7715 Requires MetaMask Flask
          </h3>
          <p className="text-primary-400 mt-2">
            Advanced Permissions (ERC-7715) is an experimental feature available only in MetaMask
            Flask version 13.5.0 or later.
          </p>
        </div>

        {/* Detection Status */}
        <div className="p-4 bg-dark-800/50 border border-primary-400/20 rounded-lg space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-primary-500">MetaMask Installed</span>
            <span className={hasMetaMask ? "text-green-400" : "text-red-400"}>
              {hasMetaMask ? "Yes" : "No"}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-primary-500">Flask Version</span>
            <span className={hasFlask ? "text-green-400" : "text-red-400"}>
              {hasFlask ? "Detected" : "Not Detected"}
            </span>
          </div>
          {walletVersion && (
            <div className="flex justify-between text-sm">
              <span className="text-primary-500">Wallet Version</span>
              <span className="text-primary-300 font-mono text-xs">
                {walletVersion.slice(0, 30)}...
              </span>
            </div>
          )}
        </div>

        {/* Error Message if provided */}
        {errorMessage && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-sm text-red-300 font-mono">{errorMessage}</p>
          </div>
        )}

        {/* Instructions */}
        <div className="space-y-2 text-sm text-primary-400">
          <p className="font-medium text-primary-300">To use ERC-7715 permissions:</p>
          <ol className="list-decimal list-inside space-y-1 ml-2">
            <li>Disable or remove regular MetaMask extension</li>
            <li>Install MetaMask Flask from flask.metamask.io</li>
            <li>Import your wallet into Flask</li>
            <li>Reconnect to this app</li>
          </ol>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 pt-2">
          <a
            href={getFlaskInstallUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full"
          >
            <Button className="w-full gap-2">
              <Download className="w-4 h-4" />
              Install MetaMask Flask
            </Button>
          </a>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleRecheck}
              className="flex-1 gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              I&apos;ve Installed Flask
            </Button>
            <Button variant="ghost" onClick={onClose} className="flex-1">
              Close
            </Button>
          </div>
        </div>

        {/* Help Link */}
        <div className="text-center">
          <a
            href={getFlaskDocsUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary-500 hover:text-primary-400 inline-flex items-center gap-1"
          >
            Learn more about MetaMask Smart Accounts
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </Modal>
  );
}

// ===========================================
// Exports
// ===========================================

export { useFlaskDetection, getFlaskInstallUrl, getFlaskDocsUrl };
