import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

export function formatStatusLabel(status: string): string {
  if (!status) return "Unknown";
  return status
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function formatSourceLabel(source: string): string {
  if (!source) return "—";
  return source
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function formatDate(value: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export type BadgeVariant = "neutral" | "blue" | "amber" | "red" | "green";

export function getStatusBadgeVariant(status: string): BadgeVariant {
  switch (status) {
    case "GOOD_LEAD_FOLLOW_UP":
      return "blue";
    case "DID_NOT_CONNECT":
      return "amber";
    case "BAD_LEAD":
      return "red";
    case "SALE_DONE":
      return "green";
    default:
      return "neutral";
  }
}

export function formatSkippedReason(reason: string): string {
  if (!reason) return "Skipped during processing.";
  const lower = reason.toLowerCase();
  if (
    lower.includes("429") ||
    lower.includes("rate limit") ||
    lower.includes("tokens per") ||
    lower.includes("billing") ||
    lower.includes("capacity")
  ) {
    return "AI processing capacity temporarily reached. Please retry shortly.";
  }
  if (lower.includes("timeout") || lower.includes("timed out")) {
    return "AI processing timed out while analyzing this row.";
  }
  if (lower.includes("ai extraction failed") || lower.includes("ai processing failed")) {
    return "Could not automatically extract CRM lead details for this row.";
  }
  return reason;
}
