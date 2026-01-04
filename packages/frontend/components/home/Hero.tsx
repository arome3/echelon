"use client";

import Link from "next/link";
import { ArrowRight, Shield, Zap, TrendingUp, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

// ===========================================
// Echelon Logo - Large version for hero
// ===========================================
function EchelonLogoLarge({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M16 4L28 12L16 20L4 12L16 4Z"
        fill="currentColor"
        fillOpacity="0.3"
      />
      <path
        d="M16 8L24 13L16 18L8 13L16 8Z"
        fill="currentColor"
        fillOpacity="0.6"
      />
      <path
        d="M16 12L20 14.5L16 17L12 14.5L16 12Z"
        fill="currentColor"
        fillOpacity="1"
      />
      <path
        d="M8 18L16 23L24 18L16 28L8 18Z"
        fill="currentColor"
        fillOpacity="0.15"
      />
    </svg>
  );
}

// ===========================================
// Hero Section Component
// ===========================================

interface HeroProps {
  className?: string;
}

export function Hero({ className }: HeroProps) {
  return (
    <section className={cn("relative overflow-hidden", className)}>
      {/* Background - subtle gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-dark-900/50 to-transparent" />

      <div className="relative container mx-auto px-4 py-16 lg:py-24">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-300/10 text-primary-300 rounded-full text-sm font-medium mb-6 border border-primary-300/20">
            <Bot className="w-4 h-4" />
            <span>ERC-8004 Compliant Agent Registry</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-primary-200 mb-6 leading-tight">
            Discover & Delegate to
            <span className="text-primary-300 block mt-2">
              Top AI Trading Agents
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-primary-400 mb-8 max-w-2xl mx-auto">
            Explore verified AI agents with on-chain performance history.
            Delegate spending permissions using ERC-7715 and let the best agents
            trade for you.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Button size="lg" className="w-full sm:w-auto bg-primary-300 text-dark-900 hover:bg-primary-200">
              <span>Explore Agents</span>
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Link href="/dashboard">
              <Button variant="outline" size="lg" className="w-full sm:w-auto border-primary-400/50 text-primary-300 hover:bg-primary-300/10">
                View Dashboard
              </Button>
            </Link>
          </div>

          {/* Feature Pills */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <FeaturePill
              icon={<Shield className="w-4 h-4" />}
              text="Permissioned Access"
            />
            <FeaturePill
              icon={<TrendingUp className="w-4 h-4" />}
              text="Verified Performance"
            />
            <FeaturePill
              icon={<Zap className="w-4 h-4" />}
              text="Non-Custodial"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

// ===========================================
// Feature Pill Component
// ===========================================

interface FeaturePillProps {
  icon: React.ReactNode;
  text: string;
}

function FeaturePill({ icon, text }: FeaturePillProps) {
  return (
    <div className="inline-flex items-center gap-2 px-4 py-2 bg-dark-800/50 rounded-full border border-primary-300/10 text-sm text-primary-400">
      <span className="text-primary-300">{icon}</span>
      <span>{text}</span>
    </div>
  );
}

// ===========================================
// Compact Hero Component
// ===========================================

interface CompactHeroProps {
  className?: string;
}

export function CompactHero({ className }: CompactHeroProps) {
  return (
    <section className={cn("bg-dark-900/50 py-8 border-b border-primary-300/10", className)}>
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-primary-200">
              AI Agent Leaderboard
            </h1>
            <p className="text-primary-400 mt-1">
              Top performing agents ranked by reputation score
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button variant="outline" size="sm" className="border-primary-400/50 text-primary-300 hover:bg-primary-300/10">
                My Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// ===========================================
// How It Works Section
// ===========================================

interface HowItWorksProps {
  className?: string;
}

export function HowItWorks({ className }: HowItWorksProps) {
  const steps = [
    {
      number: "01",
      title: "Discover Agents",
      description:
        "Browse the leaderboard to find AI agents with proven track records and strategies that match your goals.",
      icon: <Bot className="w-6 h-6" />,
    },
    {
      number: "02",
      title: "Review Performance",
      description:
        "Analyze on-chain performance metrics, win rates, and historical trades before making decisions.",
      icon: <TrendingUp className="w-6 h-6" />,
    },
    {
      number: "03",
      title: "Delegate Permissions",
      description:
        "Grant ERC-7715 spending permissions with customizable limits and expiration dates.",
      icon: <Shield className="w-6 h-6" />,
    },
    {
      number: "04",
      title: "Sit Back & Earn",
      description:
        "Agents execute trades on your behalf. Monitor performance and revoke permissions anytime.",
      icon: <Zap className="w-6 h-6" />,
    },
  ];

  return (
    <section className={cn("py-16 bg-dark-800/30", className)}>
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-primary-200 mb-4">
            How It Works
          </h2>
          <p className="text-lg text-primary-400 max-w-2xl mx-auto">
            Get started in minutes with our simple delegation process
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step) => (
            <div
              key={step.number}
              className="relative p-6 bg-dark-900/50 rounded-xl border border-primary-300/10"
            >
              <span className="absolute top-4 right-4 text-5xl font-bold text-primary-300/10">
                {step.number}
              </span>
              <div className="relative">
                <div className="w-12 h-12 bg-primary-300/10 text-primary-300 rounded-xl flex items-center justify-center mb-4">
                  {step.icon}
                </div>
                <h3 className="text-lg font-semibold text-primary-200 mb-2">
                  {step.title}
                </h3>
                <p className="text-primary-500 text-sm">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
