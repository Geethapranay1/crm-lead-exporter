import type { ImportProgress } from "@groweasy/shared";
import type { ParsedRow } from "@/types";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface CreateJobResponse {
  success: true;
  data: { jobId: string; totalRecords: number; totalBatches: number };
}

interface ApiErrorResponse {
  success: false;
  error: { code: string; message: string };
}

export async function submitImportJob(
  headers: string[],
  rows: ParsedRow[],
  fileName: string,
): Promise<{ jobId: string; totalRecords: number; totalBatches: number }> {
  const response = await fetch("/api/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ headers, rows, fileName }),
  });

  const body = (await response.json().catch(() => null)) as
    | CreateJobResponse
    | ApiErrorResponse
    | null;

  if (!response.ok || !body || body.success === false) {
    const message = body && "error" in body ? body.error.message : "Failed to start import.";
    const code = body && "error" in body ? body.error.code : undefined;
    throw new ApiError(message, code);
  }

  return body.data;
}

export function subscribeToImportProgress(
  jobId: string,
  handlers: {
    onProgress: (progress: ImportProgress) => void;
    onError: (message: string) => void;
  },
): () => void {
  const source = new EventSource(`/api/import/progress/${jobId}`);

  source.onmessage = (event) => {
    try {
      const progress = JSON.parse(event.data) as ImportProgress;
      handlers.onProgress(progress);
      if (progress.status === "completed" || progress.status === "failed") {
        source.close();
      }
    } catch {
      handlers.onError("Received a malformed progress update from the server.");
    }
  };

  source.onerror = () => {
    handlers.onError("Connection to the server was lost while processing your import.");
    source.close();
  };

  return () => source.close();
}

export async function cancelImportJobApi(jobId: string): Promise<void> {
  await fetch(`/api/import/${jobId}/cancel`, {
    method: "POST",
  }).catch(() => null);
}
