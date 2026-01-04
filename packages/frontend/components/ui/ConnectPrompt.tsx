"use client";

import { Wallet, Shield, Zap } from "lucide-react";
import { useConnect } from "wagmi";
import { cn } from "@/lib/utils";
import { Button } from "./Button";
import { Card } from "./Card";

// ===========================================
// Connect Prompt Component
// ===========================================

interface ConnectPromptProps {
  /** Custom message */
  message?: string;
  /** Show benefits list */
  showBenefits?: boolean;
  /** Compact variant */
  compact?: boolean;
  /** Container class */
  className?: string;
}

export function ConnectPrompt({
  message = "Connect your wallet to continue",
  showBenefits = true,
  compact = false,
  className,
}: ConnectPromptProps) {
  const { connect, connectors, isPending } = useConnect();

  // Get MetaMask connector or first available
  const preferredConnector =
    connectors.find((c) => c.name === "MetaMask") || connectors[0];

  const handleConnect = () => {
    if (preferredConnector) {
      connect({ connector: preferredConnector });
    }
  };

  if (compact) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center py-8 text-center",
          className
        )}
      >
        <div className="p-3 bg-primary-400/20 rounded-full mb-4">
          <Wallet className="w-6 h-6 text-primary-400" />
        </div>
        <p className="text-primary-400 mb-4">{message}</p>
        <Button
          onClick={handleConnect}
          isLoading={isPending}
          loadingText="Connecting..."
          leftIcon={<Wallet className="w-4 h-4" />}
        >
          Connect Wallet
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("max-w-md mx-auto", className)}>
      <Card padding="lg" className="text-center">
        <div className="p-4 bg-primary-400/20 rounded-full w-fit mx-auto mb-6">
          <Wallet className="w-10 h-10 text-primary-400" />
        </div>

        <h2 className="text-xl font-semibold text-primary-100 mb-2">
          Connect Your Wallet
        </h2>

        <p className="text-primary-400 mb-6">{message}</p>

        {showBenefits && (
          <div className="space-y-3 mb-6 text-left">
            <BenefitItem
              icon={<Shield className="w-4 h-4" />}
              title="Secure Connection"
              description="Your wallet stays in your control"
            />
            <BenefitItem
              icon={<Zap className="w-4 h-4" />}
              title="Instant Access"
              description="View your permissions and activity"
            />
          </div>
        )}

        <Button
          onClick={handleConnect}
          isLoading={isPending}
          loadingText="Connecting..."
          size="lg"
          className="w-full"
          leftIcon={<Wallet className="w-5 h-5" />}
        >
          Connect Wallet
        </Button>

        {connectors.length > 1 && (
          <div className="mt-4 pt-4 border-t border-primary-400/20">
            <p className="text-xs text-primary-500 mb-3">Or connect with</p>
            <div className="flex gap-2 justify-center">
              {connectors
                .filter((c) => c.id !== preferredConnector?.id)
                .slice(0, 3)
                .map((connector) => (
                  <Button
                    key={connector.id}
                    variant="outline"
                    size="sm"
                    onClick={() => connect({ connector })}
                    disabled={isPending}
                  >
                    {connector.name}
                  </Button>
                ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

// ===========================================
// Benefit Item Component
// ===========================================

interface BenefitItemProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function BenefitItem({ icon, title, description }: BenefitItemProps) {
  return (
    <div className="flex items-start gap-3 p-3 bg-dark-700/50 rounded-lg border border-primary-400/10">
      <div className="p-1.5 bg-dark-600 rounded-md text-primary-400 shrink-0">
        {icon}
      </div>
      <div>
        <p className="font-medium text-primary-200 text-sm">{title}</p>
        <p className="text-primary-500 text-xs">{description}</p>
      </div>
    </div>
  );
}

// ===========================================
// Connect Banner Component
// ===========================================

interface ConnectBannerProps {
  className?: string;
}

export function ConnectBanner({ className }: ConnectBannerProps) {
  const { connect, connectors, isPending } = useConnect();

  const handleConnect = () => {
    const connector = connectors[0];
    if (connector) {
      connect({ connector });
    }
  };

  return (
    <div
      className={cn(
        "flex items-center justify-between p-4 bg-dark-700/50 border border-primary-400/20 rounded-lg",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary-400/20 rounded-lg">
          <Wallet className="w-5 h-5 text-primary-400" />
        </div>
        <div>
          <p className="font-medium text-primary-200">Wallet not connected</p>
          <p className="text-sm text-primary-500">
            Connect to view your dashboard and permissions
          </p>
        </div>
      </div>
      <Button
        onClick={handleConnect}
        isLoading={isPending}
        loadingText="Connecting..."
        size="sm"
      >
        Connect
      </Button>
    </div>
  );
}
