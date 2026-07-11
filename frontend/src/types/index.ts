export type {
  CrmRecord,
  CrmStatus,
  DataSource,
  ImportProgress,
  ImportRequestBody,
  ImportResult,
  ImportStats,
  SkippedRecord,
} from "@groweasy/shared";
export { CRM_STATUSES, DATA_SOURCES } from "@groweasy/shared";

export type ParsedRow = Record<string, string>;

export type ImportStep = "upload" | "preview" | "processing" | "results";

export interface ToastItem {
  id: string;
  type: "success" | "error" | "info" | "warning";
  title: string;
  description?: string;
}
