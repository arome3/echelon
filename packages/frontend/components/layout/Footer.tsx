"use client";

import Link from "next/link";
import { Github, Twitter, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { EXTERNAL_LINKS } from "@/lib/constants";

// ===========================================
// Echelon Logo - Small version for footer
// ===========================================
function EchelonLogoSmall({ className = "" }: { className?: string }) {
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
// Footer Component
// ===========================================

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-primary-300/10 bg-dark-950/50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Left - Brand */}
          <div className="flex items-center gap-2">
            <EchelonLogoSmall className="w-5 h-5 text-primary-400" />
            <span className="text-sm text-primary-500">
              ECHELON &copy; {currentYear}
            </span>
          </div>

          {/* Center - Links */}
          <div className="flex items-center gap-6">
            <FooterLink href="/terms">Terms</FooterLink>
            <FooterLink href="/privacy">Privacy</FooterLink>
            <FooterLink href={EXTERNAL_LINKS.DOCS} external>
              Docs
            </FooterLink>
          </div>

          {/* Right - Social */}
          <div className="flex items-center gap-4">
            <SocialLink href={EXTERNAL_LINKS.GITHUB} label="GitHub">
              <Github className="w-5 h-5" />
            </SocialLink>
            <SocialLink href={EXTERNAL_LINKS.TWITTER} label="Twitter">
              <Twitter className="w-5 h-5" />
            </SocialLink>
          </div>
        </div>

        {/* Bottom - Testnet Notice */}
        <div className="mt-6 pt-6 border-t border-primary-300/10">
          <div className="flex items-center justify-center gap-2 text-xs text-primary-500">
            <span className="px-2 py-1 bg-warning-500/10 text-warning-400 rounded-full font-medium">
              Sepolia Testnet
            </span>
            <span>This application is running on the Sepolia test network</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ===========================================
// Footer Link Component
// ===========================================

interface FooterLinkProps {
  href: string;
  external?: boolean;
  children: React.ReactNode;
}

function FooterLink({ href, external = false, children }: FooterLinkProps) {
  const className = cn(
    "text-sm text-primary-500 hover:text-primary-300 transition-colors",
    "flex items-center gap-1"
  );

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {children}
        <ExternalLink className="w-3 h-3" />
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

// ===========================================
// Social Link Component
// ===========================================

interface SocialLinkProps {
  href: string;
  label: string;
  children: React.ReactNode;
}

function SocialLink({ href, label, children }: SocialLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="p-2 text-primary-500 hover:text-primary-300 hover:bg-primary-300/10 rounded-lg transition-colors"
      aria-label={label}
    >
      {children}
    </a>
  );
}
