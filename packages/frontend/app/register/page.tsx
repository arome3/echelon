"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import {
  Bot,
  Wallet,
  Shield,
  AlertTriangle,
  CheckCircle,
  Loader2,
  ArrowLeft,
  ExternalLink,
  Info,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card";
import { useRegisterAgent } from "@/hooks/useRegisterAgent";
import { STRATEGY_TYPES, RISK_LEVELS, CONTRACTS } from "@/lib/constants";
import { cn } from "@/lib/utils";

// ===========================================
// Agent Registration Page
// ===========================================

export default function RegisterAgentPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { registerAgent, checkIfRegistered, isRegistering, error } = useRegisterAgent();

  // Form state
  const [name, setName] = useState("");
  const [strategyType, setStrategyType] = useState("");
  const [riskLevel, setRiskLevel] = useState(5);
  const [metadataUri, setMetadataUri] = useState("");
  const [useConnectedWallet, setUseConnectedWallet] = useState(true);
  const [customWallet, setCustomWallet] = useState("");

  // Validation state
  const [isAlreadyRegistered, setIsAlreadyRegistered] = useState(false);
  const [checkingRegistration, setCheckingRegistration] = useState(false);

  // Check if wallet is already registered
  useEffect(() => {
    const checkWallet = async () => {
      const walletToCheck = useConnectedWallet ? address : customWallet;
      if (!walletToCheck || walletToCheck.length !== 42) {
        setIsAlreadyRegistered(false);
        return;
      }

      setCheckingRegistration(true);
      try {
        const isRegistered = await checkIfRegistered(walletToCheck);
        setIsAlreadyRegistered(isRegistered);
      } catch {
        setIsAlreadyRegistered(false);
      }
      setCheckingRegistration(false);
    };

    checkWallet();
  }, [address, customWallet, useConnectedWallet, checkIfRegistered]);

  // Form validation
  const isFormValid =
    name.length >= 3 &&
    name.length <= 50 &&
    strategyType !== "" &&
    riskLevel >= 1 &&
    riskLevel <= 10 &&
    metadataUri.length > 0 &&
    !isAlreadyRegistered &&
    (useConnectedWallet ? !!address : customWallet.length === 42);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isFormValid) return;

    const result = await registerAgent({
      walletAddress: useConnectedWallet ? address! : customWallet,
      name,
      strategyType,
      riskLevel,
      metadataUri,
    });

    if (result) {
      // Redirect to the agent's page
      router.push(`/agents/${result.agentId}`);
    }
  };

  // Get selected risk level info
  const selectedRiskLevel = RISK_LEVELS.find((r) => r.value === riskLevel);

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 max-w-2xl">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-primary-400 hover:text-primary-300 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-400/20 to-primary-500/20 mb-4">
            <Bot className="w-8 h-8 text-primary-300" />
          </div>
          <h1 className="text-3xl font-bold text-primary-200 mb-2">
            Register Your Agent
          </h1>
          <p className="text-primary-400 max-w-md mx-auto">
            Deploy your AI trading agent to the Echelon marketplace and start
            receiving delegations from users.
          </p>
        </div>

        {/* Info Banner */}
        <Card className="mb-6 border-blue-500/30 bg-blue-500/5">
          <CardContent className="flex gap-3">
            <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="text-blue-300 font-medium mb-1">
                Open Registration with Reputation
              </p>
              <p className="text-blue-400/80">
                New agents start with 0 reputation score. Build trust by
                executing successful trades. Users can set minimum reputation
                requirements when delegating.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Registration Form */}
        <Card>
          <CardHeader>
            <CardTitle>Agent Details</CardTitle>
            <CardDescription>
              Fill in the details for your trading agent
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6">
              {/* Wallet Selection */}
              <div>
                <label className="block text-sm font-medium text-primary-300 mb-2">
                  <Wallet className="w-4 h-4 inline mr-2" />
                  Agent Wallet Address
                </label>

                <div className="space-y-3">
                  {/* Use connected wallet toggle */}
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useConnectedWallet}
                      onChange={(e) => setUseConnectedWallet(e.target.checked)}
                      className="w-4 h-4 rounded border-primary-400/50 bg-dark-800 text-primary-400 focus:ring-primary-400/50"
                    />
                    <span className="text-sm text-primary-400">
                      Use connected wallet
                    </span>
                  </label>

                  {/* Wallet input */}
                  <input
                    type="text"
                    value={useConnectedWallet ? address || "" : customWallet}
                    onChange={(e) => !useConnectedWallet && setCustomWallet(e.target.value)}
                    disabled={useConnectedWallet}
                    placeholder="0x..."
                    className={cn(
                      "w-full px-4 py-3 bg-dark-800/50 border border-primary-400/20 rounded-lg",
                      "text-primary-200 placeholder-primary-500",
                      "focus:outline-none focus:ring-2 focus:ring-primary-400/50 focus:border-transparent",
                      "disabled:opacity-60 disabled:cursor-not-allowed",
                      "font-mono text-sm"
                    )}
                  />

                  {/* Registration status */}
                  {checkingRegistration && (
                    <p className="text-sm text-primary-400 flex items-center gap-2">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Checking registration status...
                    </p>
                  )}
                  {!checkingRegistration && isAlreadyRegistered && (
                    <p className="text-sm text-red-400 flex items-center gap-2">
                      <AlertTriangle className="w-3 h-3" />
                      This wallet is already registered as an agent
                    </p>
                  )}
                  {!checkingRegistration && !isAlreadyRegistered && address && useConnectedWallet && (
                    <p className="text-sm text-green-400 flex items-center gap-2">
                      <CheckCircle className="w-3 h-3" />
                      Wallet available for registration
                    </p>
                  )}
                </div>
              </div>

              {/* Agent Name */}
              <div>
                <label className="block text-sm font-medium text-primary-300 mb-2">
                  Agent Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., AlphaYield Pro"
                  minLength={3}
                  maxLength={50}
                  className={cn(
                    "w-full px-4 py-3 bg-dark-800/50 border border-primary-400/20 rounded-lg",
                    "text-primary-200 placeholder-primary-500",
                    "focus:outline-none focus:ring-2 focus:ring-primary-400/50 focus:border-transparent"
                  )}
                />
                <p className="mt-1 text-xs text-primary-500">
                  {name.length}/50 characters (minimum 3)
                </p>
              </div>

              {/* Strategy Type */}
              <div>
                <label className="block text-sm font-medium text-primary-300 mb-2">
                  Strategy Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {STRATEGY_TYPES.map((strategy) => (
                    <button
                      key={strategy.value}
                      type="button"
                      onClick={() => setStrategyType(strategy.value)}
                      className={cn(
                        "p-3 rounded-lg border text-left transition-all",
                        strategyType === strategy.value
                          ? "border-primary-400 bg-primary-400/10"
                          : "border-primary-400/20 bg-dark-800/50 hover:border-primary-400/40"
                      )}
                    >
                      <p className="font-medium text-primary-200 text-sm">
                        {strategy.label}
                      </p>
                      <p className="text-xs text-primary-500 mt-0.5">
                        {strategy.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Risk Level */}
              <div>
                <label className="block text-sm font-medium text-primary-300 mb-2">
                  Risk Level: {riskLevel}/10
                  {selectedRiskLevel && (
                    <span className={cn("ml-2", selectedRiskLevel.color)}>
                      ({selectedRiskLevel.label})
                    </span>
                  )}
                </label>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={riskLevel}
                  onChange={(e) => setRiskLevel(parseInt(e.target.value))}
                  className="w-full h-2 bg-dark-700 rounded-lg appearance-none cursor-pointer accent-primary-400"
                />
                <div className="flex justify-between text-xs text-primary-500 mt-1">
                  <span>Conservative</span>
                  <span>Aggressive</span>
                </div>
              </div>

              {/* Metadata URI */}
              <div>
                <label className="block text-sm font-medium text-primary-300 mb-2">
                  Metadata URI
                </label>
                <input
                  type="url"
                  value={metadataUri}
                  onChange={(e) => setMetadataUri(e.target.value)}
                  placeholder="https://... or ipfs://..."
                  className={cn(
                    "w-full px-4 py-3 bg-dark-800/50 border border-primary-400/20 rounded-lg",
                    "text-primary-200 placeholder-primary-500",
                    "focus:outline-none focus:ring-2 focus:ring-primary-400/50 focus:border-transparent"
                  )}
                />
                <p className="mt-1 text-xs text-primary-500">
                  JSON metadata describing your agent (logo, description, website, etc.)
                </p>
              </div>

              {/* Reputation Notice */}
              <div className="p-4 rounded-lg bg-dark-700/50 border border-primary-400/10">
                <div className="flex gap-3">
                  <Shield className="w-5 h-5 text-primary-400 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="text-primary-300 font-medium">
                      Starting Reputation: 0
                    </p>
                    <p className="text-primary-500 mt-1">
                      Your agent will start with no reputation. Execute
                      successful trades to build your score. Some users may
                      require a minimum reputation before delegating.
                    </p>
                  </div>
                </div>
              </div>

              {/* Error Display */}
              {error && (
                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                  <p className="text-sm text-red-400 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    {error.message}
                  </p>
                </div>
              )}
            </CardContent>

            <CardFooter className="flex-col gap-4">
              {/* Submit Button */}
              <button
                type="submit"
                disabled={!isFormValid || isRegistering || !isConnected}
                className={cn(
                  "w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all",
                  isFormValid && !isRegistering && isConnected
                    ? "bg-primary-400 text-dark-900 hover:bg-primary-300"
                    : "bg-primary-400/30 text-primary-400/50 cursor-not-allowed"
                )}
              >
                {isRegistering ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Registering Agent...
                  </>
                ) : !isConnected ? (
                  "Connect Wallet to Register"
                ) : (
                  <>
                    <Bot className="w-5 h-5" />
                    Register Agent
                  </>
                )}
              </button>

              {/* Contract Link */}
              <a
                href={`https://sepolia.etherscan.io/address/${CONTRACTS.REGISTRY}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary-500 hover:text-primary-400 flex items-center gap-1"
              >
                View Registry Contract
                <ExternalLink className="w-3 h-3" />
              </a>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
