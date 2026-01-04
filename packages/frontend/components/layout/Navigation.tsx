"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutDashboard, Bot, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

// ===========================================
// Navigation Links Configuration
// ===========================================

const navLinks = [
  {
    href: "/",
    label: "Leaderboard",
    icon: Home,
    description: "Browse top agents",
  },
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    description: "Your activity",
  },
];

// ===========================================
// Desktop Navigation Component
// ===========================================

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="hidden md:flex items-center gap-1">
      {navLinks.map((link) => {
        const isActive = pathname === link.href;
        const Icon = link.icon;

        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              isActive
                ? "bg-primary-50 text-primary-700"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            )}
          >
            <Icon className="w-4 h-4" />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

// ===========================================
// Mobile Navigation Component
// ===========================================

interface MobileNavigationProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileNavigation({ isOpen, onClose }: MobileNavigationProps) {
  const pathname = usePathname();

  if (!isOpen) return null;

  return (
    <nav className="md:hidden py-4 border-t border-gray-100 bg-white">
      <div className="flex flex-col gap-1 px-2">
        {navLinks.map((link) => {
          const isActive = pathname === link.href;
          const Icon = link.icon;

          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                isActive
                  ? "bg-primary-50 text-primary-700"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              )}
            >
              <Icon className="w-5 h-5" />
              <div>
                <p className="font-medium">{link.label}</p>
                <p className="text-xs text-gray-500">{link.description}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

// ===========================================
// Bottom Navigation Component (Mobile)
// ===========================================

export function BottomNavigation() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
      <div className="flex items-center justify-around py-2">
        {navLinks.map((link) => {
          const isActive = pathname === link.href;
          const Icon = link.icon;

          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors min-w-[64px]",
                isActive ? "text-primary-600" : "text-gray-500"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{link.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

// ===========================================
// Breadcrumb Navigation Component
// ===========================================

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav className={cn("flex items-center gap-2 text-sm", className)}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <div key={index} className="flex items-center gap-2">
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="text-gray-500 hover:text-gray-900 transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={cn(
                  isLast ? "text-gray-900 font-medium" : "text-gray-500"
                )}
              >
                {item.label}
              </span>
            )}
            {!isLast && <span className="text-gray-300">/</span>}
          </div>
        );
      })}
    </nav>
  );
}

// ===========================================
// Tab Navigation Component
// ===========================================

interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  count?: number;
}

interface TabNavigationProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

export function TabNavigation({
  tabs,
  activeTab,
  onTabChange,
  className,
}: TabNavigationProps) {
  return (
    <div className={cn("flex border-b border-gray-200", className)}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors",
              isActive
                ? "border-primary-500 text-primary-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            )}
          >
            {tab.icon}
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={cn(
                  "px-2 py-0.5 text-xs rounded-full",
                  isActive
                    ? "bg-primary-100 text-primary-700"
                    : "bg-gray-100 text-gray-600"
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
