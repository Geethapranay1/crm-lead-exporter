"use client";

import { useCallback, useRef, useState } from "react";
import { ApiError, submitImportJob, subscribeToImportProgress, cancelImportJobApi } from "@/lib/api";
import type { ImportProgress, ImportResult } from "@groweasy/shared";
import type { ParsedRow } from "@/types";

export interface ImportProgressState {
  currentBatch: number;
  totalBatches: number;
  processedRecords: number;
  totalRecords: number;
  status: ImportProgress["status"];
  message: string;
}

export interface UseImportResult {
  startImport: (headers: string[], rows: ParsedRow[], fileName: string) => Promise<void>;
  reset: () => void;
  result: ImportResult | null;
  isImporting: boolean;
  progress: ImportProgressState;
  error: string | null;
}

const INITIAL_PROGRESS: ImportProgressState = {
  currentBatch: 0,
  totalBatches: 0,
  processedRecords: 0,
  totalRecords: 0,
  status: "processing",
  message: "",
};

export function useImport(): UseImportResult {
  const [result, setResult] = useState<ImportResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState<ImportProgressState>(INITIAL_PROGRESS);
  const [error, setError] = useState<string | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const currentJobIdRef = useRef<string | null>(null);

  const startImport = useCallback(
    async (headers: string[], rows: ParsedRow[], fileName: string) => {
      setIsImporting(true);
      setError(null);
      setResult(null);
      setProgress(INITIAL_PROGRESS);

      try {
        const { jobId, totalRecords, totalBatches } = await submitImportJob(
          headers,
          rows,
          fileName,
        );

        currentJobIdRef.current = jobId;
        setProgress((prev) => ({ ...prev, totalRecords, totalBatches }));

        await new Promise<void>((resolve) => {
          const cleanup = subscribeToImportProgress(jobId, {
            onProgress: (update) => {
              setProgress({
                currentBatch: update.currentBatch,
                totalBatches: update.totalBatches,
                processedRecords: update.processedRecords,
                totalRecords: update.totalRecords,
                status: update.status,
                message: update.message,
              });

              if (update.status === "completed" && update.result) {
                currentJobIdRef.current = null;
                setResult(update.result);
                resolve();
              } else if (update.status === "failed") {
                currentJobIdRef.current = null;
                setError(update.error ?? "The import failed. Please try again.");
                resolve();
              }
            },
            onError: (message) => {
              currentJobIdRef.current = null;
              setError(message);
              resolve();
            },
          });

          cleanupRef.current = cleanup;
        });
      } catch (err) {
        currentJobIdRef.current = null;
        const message = err instanceof ApiError ? err.message : "Failed to start the import.";
        setError(message);
      } finally {
        cleanupRef.current?.();
        setIsImporting(false);
      }
    },
    [],
  );

  const reset = useCallback(() => {
    if (currentJobIdRef.current) {
      void cancelImportJobApi(currentJobIdRef.current);
      currentJobIdRef.current = null;
    }
    cleanupRef.current?.();
    setResult(null);
    setIsImporting(false);
    setProgress(INITIAL_PROGRESS);
    setError(null);
  }, []);

  return { startImport, reset, result, isImporting, progress, error };
}
