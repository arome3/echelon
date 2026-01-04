"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { NAV_LINKS } from "@/lib/constants";
import { WalletButton } from "./WalletButton";

// ===========================================
// Echelon Logo - Geometric layered design
// ===========================================
function EchelonLogo({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Three ascending chevron layers representing hierarchy/echelons */}
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
      {/* Bottom reflection/shadow */}
      <path
        d="M8 18L16 23L24 18L16 28L8 18Z"
        fill="currentColor"
        fillOpacity="0.15"
      />
    </svg>
  );
}

// ===========================================
// Header Component
// ===========================================

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="dark-header sticky top-0 z-40">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-3 group">
              <EchelonLogo className="w-9 h-9 text-primary-300 group-hover:text-primary-200 transition-colors" />
              <span className="text-xl font-semibold tracking-wide text-primary-200 group-hover:text-primary-100 transition-colors">
                ECHELON
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {NAV_LINKS.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                      isActive
                        ? "bg-primary-300/10 text-primary-200"
                        : "text-primary-400 hover:text-primary-200 hover:bg-primary-300/5"
                    )}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-4">
            <WalletButton />

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-primary-400 hover:text-primary-200 hover:bg-primary-300/10 rounded-lg transition-colors"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <nav className="md:hidden py-4 border-t border-primary-300/10">
            <div className="flex flex-col gap-1">
              {NAV_LINKS.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      "px-4 py-3 rounded-lg text-sm font-medium transition-all",
                      isActive
                        ? "bg-primary-300/10 text-primary-200"
                        : "text-primary-400 hover:text-primary-200 hover:bg-primary-300/5"
                    )}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
