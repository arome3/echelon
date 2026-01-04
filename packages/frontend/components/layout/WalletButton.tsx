"use client";

import { useState, useRef, useEffect } from "react";
import { useAccount, useConnect, useDisconnect, useBalance, useChainId } from "wagmi";
import {
  Wallet,
  ChevronDown,
  LogOut,
  Copy,
  ExternalLink,
  Check,
} from "lucide-react";
import { cn, truncateAddress, copyToClipboard, getExplorerAddressUrl } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { sepolia } from "@/lib/wagmi-config";

// ===========================================
// Wallet Button Component
// ===========================================

export function WalletButton() {
  const { address, isConnected, isConnecting } = useAccount();
  const { connect, connectors, isPending, status } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { data: balance } = useBalance({
    address,
  });

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isConnectAttempted, setIsConnectAttempted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fix hydration mismatch - only render wallet state after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCopyAddress = async () => {
    if (address) {
      const success = await copyToClipboard(address);
      if (success) {
        setHasCopied(true);
        setTimeout(() => setHasCopied(false), 2000);
      }
    }
  };

  // Reset connect attempted state when connection status changes
  useEffect(() => {
    if (status === "idle" || status === "success" || status === "error") {
      setIsConnectAttempted(false);
    }
  }, [status]);

  // Also reset when connected
  useEffect(() => {
    if (isConnected) {
      setIsConnectAttempted(false);
    }
  }, [isConnected]);

  const handleConnect = () => {
    // Prevent duplicate requests with multiple checks
    if (isPending || isConnecting || isConnectAttempted) {
      console.log("Connect blocked - already in progress", { isPending, isConnecting, isConnectAttempted });
      return;
    }

    // Mark that we're attempting to connect
    setIsConnectAttempted(true);

    // Prefer MetaMask connector (works with Flask too)
    const preferredConnector =
      connectors.find((c) => c.id === "metaMaskSDK" || c.id === "metaMask") ||
      connectors.find((c) => c.name.toLowerCase().includes("metamask")) ||
      connectors[0];

    if (preferredConnector) {
      connect({ connector: preferredConnector });
    } else {
      setIsConnectAttempted(false);
    }
  };

  // Prevent hydration mismatch - show placeholder until mounted
  if (!mounted) {
    return (
      <Button
        size="sm"
        className="bg-primary-300/10 text-primary-300 border border-primary-400/30"
        disabled
      >
        <Wallet className="w-4 h-4 mr-2" />
        Connect Wallet
      </Button>
    );
  }

  // Not connected state
  if (!isConnected) {
    const isLoading = isPending || isConnecting || isConnectAttempted;
    return (
      <Button
        onClick={handleConnect}
        isLoading={isLoading}
        loadingText="Connecting..."
        leftIcon={<Wallet className="w-4 h-4" />}
        size="sm"
        className="bg-primary-300 text-dark-900 hover:bg-primary-200"
        disabled={isLoading}
      >
        Connect Wallet
      </Button>
    );
  }

  // Connected state
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors",
          "hover:bg-primary-300/10",
          isDropdownOpen
            ? "border-primary-300/50 bg-primary-300/10"
            : "border-primary-400/30 bg-transparent"
        )}
      >
        {/* Network indicator */}
        <span
          className={cn(
            "w-2 h-2 rounded-full",
            chainId === sepolia.id ? "bg-success-400" : "bg-warning-400"
          )}
        />

        {/* Address */}
        <span className="text-sm font-medium text-primary-200">
          {truncateAddress(address || "")}
        </span>

        {/* Balance */}
        {balance && (
          <span className="text-sm text-primary-400 hidden sm:block">
            {parseFloat(balance.formatted).toFixed(4)} {balance.symbol}
          </span>
        )}

        <ChevronDown
          className={cn(
            "w-4 h-4 text-primary-400 transition-transform",
            isDropdownOpen && "rotate-180"
          )}
        />
      </button>

      {/* Dropdown */}
      {isDropdownOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-dark-800 rounded-xl shadow-lg border border-primary-300/20 py-2 z-50 animate-slide-up">
          {/* Wallet info */}
          <div className="px-4 py-3 border-b border-primary-300/10">
            <p className="text-xs text-primary-500 mb-1">Connected Wallet</p>
            <p className="font-mono text-sm text-primary-200 break-all">
              {address}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span
                className={cn(
                  "px-2 py-0.5 text-xs font-medium rounded-full",
                  chainId === sepolia.id
                    ? "bg-success-500/20 text-success-400"
                    : "bg-warning-500/20 text-warning-400"
                )}
              >
                {chainId === sepolia.id ? "Sepolia" : `Chain ${chainId}`}
              </span>
              {balance && (
                <span className="text-xs text-primary-400">
                  {parseFloat(balance.formatted).toFixed(4)} {balance.symbol}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="py-1">
            <DropdownItem
              icon={hasCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              onClick={handleCopyAddress}
            >
              {hasCopied ? "Copied!" : "Copy Address"}
            </DropdownItem>

            <DropdownItem
              icon={<ExternalLink className="w-4 h-4" />}
              onClick={() => {
                window.open(getExplorerAddressUrl(address || "", chainId), "_blank");
                setIsDropdownOpen(false);
              }}
            >
              View on Explorer
            </DropdownItem>

            <div className="border-t border-primary-300/10 my-1" />

            <DropdownItem
              icon={<LogOut className="w-4 h-4" />}
              onClick={() => {
                disconnect();
                setIsDropdownOpen(false);
              }}
              variant="danger"
            >
              Disconnect
            </DropdownItem>
          </div>
        </div>
      )}
    </div>
  );
}

// ===========================================
// Dropdown Item Component
// ===========================================

interface DropdownItemProps {
  icon: React.ReactNode;
  onClick: () => void;
  children: React.ReactNode;
  variant?: "default" | "danger";
}

function DropdownItem({
  icon,
  onClick,
  children,
  variant = "default",
}: DropdownItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors",
        variant === "danger"
          ? "text-danger-400 hover:bg-danger-500/10"
          : "text-primary-300 hover:bg-primary-300/10"
      )}
    >
      {icon}
      {children}
    </button>
  );
}
