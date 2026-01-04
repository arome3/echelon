"use client";

import { useState, useRef, useEffect } from "react";
import { Filter, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { STRATEGY_TYPES } from "@/lib/constants";
import type { StrategyType } from "@/lib/types";

// ===========================================
// Strategy Filter Component
// ===========================================

interface StrategyFilterProps {
  /** Current selected strategy */
  value?: StrategyType;
  /** Callback when strategy changes */
  onChange: (strategy: StrategyType | undefined) => void;
  /** Additional class */
  className?: string;
}

export function StrategyFilter({
  value,
  onChange,
  className,
}: StrategyFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedStrategy = STRATEGY_TYPES.find((s) => s.value === value);

  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors",
          value
            ? "border-amber-500/50 bg-amber-500/10 text-amber-400"
            : "border-stone-600/50 bg-stone-800/50 text-stone-300 hover:bg-stone-700/50"
        )}
      >
        <Filter className="w-4 h-4" />
        <span>{selectedStrategy?.label || "All Strategies"}</span>
        {value ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onChange(undefined);
            }}
            className="p-0.5 hover:bg-amber-500/20 rounded"
          >
            <X className="w-3 h-3" />
          </button>
        ) : (
          <ChevronDown
            className={cn(
              "w-4 h-4 transition-transform",
              isOpen && "rotate-180"
            )}
          />
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-stone-800 rounded-lg shadow-lg border border-stone-700/50 py-2 z-20 animate-slide-up">
          {/* All option */}
          <button
            onClick={() => {
              onChange(undefined);
              setIsOpen(false);
            }}
            className={cn(
              "w-full text-left px-4 py-2 text-sm transition-colors",
              !value
                ? "bg-amber-500/10 text-amber-400"
                : "text-stone-300 hover:bg-stone-700/50"
            )}
          >
            <span className="font-medium">All Strategies</span>
            <p className="text-xs text-stone-500 mt-0.5">
              Show agents of all types
            </p>
          </button>

          <div className="border-t border-stone-700/50 my-1" />

          {/* Strategy options */}
          {STRATEGY_TYPES.map((strategy) => (
            <button
              key={strategy.value}
              onClick={() => {
                onChange(strategy.value as StrategyType);
                setIsOpen(false);
              }}
              className={cn(
                "w-full text-left px-4 py-2 text-sm transition-colors",
                value === strategy.value
                  ? "bg-amber-500/10 text-amber-400"
                  : "text-stone-300 hover:bg-stone-700/50"
              )}
            >
              <span className="font-medium">{strategy.label}</span>
              <p className="text-xs text-stone-500 mt-0.5">
                {strategy.description}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ===========================================
// Strategy Pills Component
// ===========================================

interface StrategyPillsProps {
  value?: StrategyType;
  onChange: (strategy: StrategyType | undefined) => void;
  className?: string;
}

export function StrategyPills({
  value,
  onChange,
  className,
}: StrategyPillsProps) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      <button
        onClick={() => onChange(undefined)}
        className={cn(
          "px-3 py-1.5 text-sm font-medium rounded-full transition-colors",
          !value
            ? "bg-amber-500 text-stone-900"
            : "bg-stone-700/50 text-stone-300 hover:bg-stone-600/50"
        )}
      >
        All
      </button>

      {STRATEGY_TYPES.map((strategy) => (
        <button
          key={strategy.value}
          onClick={() => onChange(strategy.value as StrategyType)}
          className={cn(
            "px-3 py-1.5 text-sm font-medium rounded-full transition-colors",
            value === strategy.value
              ? "bg-amber-500 text-stone-900"
              : "bg-stone-700/50 text-stone-300 hover:bg-stone-600/50"
          )}
        >
          {strategy.label}
        </button>
      ))}
    </div>
  );
}
