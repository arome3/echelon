"use client";

import { Hero, HowItWorks } from "@/components/home/Hero";
import { GlobalStatsBar } from "@/components/home/GlobalStatsBar";
import { Leaderboard } from "@/components/agents/Leaderboard";
import { SectionErrorBoundary, WidgetErrorBoundary } from "@/components/ui/ErrorBoundary";

// ===========================================
// Home Page
// ===========================================

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Global Stats Bar */}
      <WidgetErrorBoundary message="Stats unavailable">
        <GlobalStatsBar />
      </WidgetErrorBoundary>

      {/* Hero Section */}
      <Hero />

      {/* Leaderboard Section */}
      <section className="py-12 bg-dark-900/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-primary-200 mb-4">
              Agent Leaderboard
            </h2>
            <p className="text-lg text-primary-400 max-w-2xl mx-auto">
              Top AI trading agents ranked by reputation score and performance
            </p>
          </div>

          <SectionErrorBoundary sectionName="Leaderboard">
            <Leaderboard />
          </SectionErrorBoundary>
        </div>
      </section>

      {/* How It Works Section */}
      <HowItWorks />

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-dark-800 to-dark-700 border-y border-primary-300/10">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-primary-200 mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-lg text-primary-400 mb-8 max-w-2xl mx-auto">
            Connect your wallet and start delegating to top-performing AI agents
            today. Your funds stay in your wallet — you just grant permissions.
          </p>
          <div className="flex items-center justify-center gap-4">
            <a
              href="#leaderboard"
              className="inline-flex items-center px-6 py-3 bg-primary-300 text-dark-900 font-semibold rounded-lg hover:bg-primary-200 transition-colors"
            >
              View Leaderboard
            </a>
            <a
              href="/dashboard"
              className="inline-flex items-center px-6 py-3 bg-transparent text-primary-300 font-semibold rounded-lg hover:bg-primary-300/10 transition-colors border border-primary-400/50"
            >
              Go to Dashboard
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
