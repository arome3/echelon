"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./Button";

// ===========================================
// Modal Component
// ===========================================

export interface ModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal should close */
  onClose: () => void;
  /** Modal title */
  title?: string;
  /** Modal description */
  description?: string;
  /** Modal content */
  children: ReactNode;
  /** Modal size */
  size?: "sm" | "md" | "lg" | "xl" | "full";
  /** Show close button */
  showClose?: boolean;
  /** Close on overlay click */
  closeOnOverlayClick?: boolean;
  /** Close on escape key */
  closeOnEscape?: boolean;
  /** Additional class for modal content */
  className?: string;
  /** Footer content */
  footer?: ReactNode;
}

const sizeStyles = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  full: "max-w-4xl",
};

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = "md",
  showClose = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  className,
  footer,
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Handle escape key
  useEffect(() => {
    if (!closeOnEscape || !isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [closeOnEscape, isOpen, onClose]);

  // Handle body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Focus trap
  useEffect(() => {
    if (isOpen && contentRef.current) {
      contentRef.current.focus();
    }
  }, [isOpen]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (closeOnOverlayClick && e.target === overlayRef.current) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-in overflow-y-auto"
      aria-modal="true"
      role="dialog"
    >
      <div
        ref={contentRef}
        tabIndex={-1}
        className={cn(
          "w-full bg-dark-800 border border-primary-400/30 rounded-xl shadow-xl animate-slide-up",
          "focus:outline-none flex flex-col my-auto",
          "max-h-[calc(100vh-2rem)]",
          sizeStyles[size],
          className
        )}
      >
        {/* Header */}
        {(title || showClose) && (
          <div className="flex items-start justify-between p-6 border-b border-primary-400/20 flex-shrink-0">
            <div>
              {title && (
                <h2 className="text-xl font-semibold text-primary-100">{title}</h2>
              )}
              {description && (
                <p className="mt-1 text-sm text-primary-400">{description}</p>
              )}
            </div>
            {showClose && (
              <button
                onClick={onClose}
                className="p-1 text-primary-400 hover:text-primary-200 hover:bg-dark-700 rounded-lg transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* Content - scrollable */}
        <div className="p-6 overflow-y-auto flex-1">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-primary-400/20 bg-dark-900/50 rounded-b-xl flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  // Use portal to render outside the DOM hierarchy
  if (typeof window === "undefined") return null;
  return createPortal(modalContent, document.body);
}

// ===========================================
// Confirm Modal Component
// ===========================================

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "primary";
  isLoading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "primary",
  isLoading = false,
}: ConfirmModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            {cancelText}
          </Button>
          <Button
            variant={variant === "danger" ? "danger" : "primary"}
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmText}
          </Button>
        </>
      }
    >
      {/* Empty content - title/description in header is sufficient */}
      <div />
    </Modal>
  );
}
