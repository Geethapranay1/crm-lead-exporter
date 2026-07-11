"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle, Info, X, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ToastItem } from "@/types";

const AUTO_DISMISS_MS = 4000;

const ICONS: Record<ToastItem["type"], typeof Info> = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
};

const COLORS: Record<ToastItem["type"], string> = {
  success: "text-emerald-400 border-emerald-500/20",
  error: "text-red-400 border-red-500/20",
  warning: "text-amber-400 border-amber-500/20",
  info: "text-white/60 border-white/10",
};

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}): React.JSX.Element {
  const [progress, setProgress] = useState(100);
  const Icon = ICONS[toast.type];

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 100 - (elapsed / AUTO_DISMISS_MS) * 100);
      setProgress(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        onDismiss(toast.id);
      }
    }, 50);
    return () => clearInterval(interval);
  }, [toast.id, onDismiss]);

  return (
    <div
      role="alert"
      className={cn(
        "toast-card relative w-80 overflow-hidden rounded-xl border bg-neutral-900/95 backdrop-blur-xl p-4 shadow-2xl animate-slide-in-right",
        COLORS[toast.type],
      )}
    >
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white/90">{toast.title}</p>
          {toast.description && (
            <p className="mt-0.5 text-xs text-white/40">{toast.description}</p>
          )}
        </div>
        <button
          aria-label="Dismiss notification"
          onClick={() => onDismiss(toast.id)}
          className="text-white/30 hover:text-white/60 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="absolute bottom-0 left-0 h-px bg-current opacity-30" style={{ width: `${progress}%` }} />
    </div>
  );
}

export function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}): React.JSX.Element {
  return (
    <div className="fixed right-4 top-4 z-[100] flex flex-col gap-3">
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
