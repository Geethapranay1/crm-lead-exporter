import type { Request, Response } from "express";
import { ERROR_CODES, type ImportJobResponse, type ImportRequestBody } from "@groweasy/shared";
import { startImportJob } from "../services/batch.service";
import { getJobSnapshot, jobExists, subscribeToJob, cancelJob } from "../services/job-store.service";
import { parseCsvText } from "../services/csv.service";
import { AppError } from "../middleware/error.middleware";
import { logger } from "../utils/logger";

export function createImportJob(req: Request, res: Response): void {
  const { headers, rows, fileName } = req.body as ImportRequestBody;

  const { jobId, totalRecords, totalBatches } = startImportJob(headers, rows, fileName);

  logger.info("Import job created", { jobId, totalRecords, totalBatches });

  const body: ImportJobResponse = {
    success: true,
    data: { jobId, totalRecords, totalBatches },
  };

  res.status(202).json(body);
}

export function cancelImportJob(req: Request, res: Response): void {
  const { jobId } = req.params;
  if (!jobExists(jobId)) {
    throw new AppError(ERROR_CODES.NOT_FOUND, `No import job found with id "${jobId}".`, 404);
  }

  cancelJob(jobId);
  logger.info("Import job cancelled", { jobId });
  res.status(200).json({ success: true });
}

export function streamImportProgress(req: Request, res: Response): void {
  const { jobId } = req.params;

  if (!jobExists(jobId)) {
    throw new AppError(ERROR_CODES.NOT_FOUND, `No import job found with id "${jobId}".`, 404);
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  const send = (data: unknown): void => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
    if (typeof (res as any).flush === "function") {
      (res as any).flush();
    }
  };

  const snapshot = getJobSnapshot(jobId);
  if (snapshot) {
    send(snapshot);
  }

  const unsubscribe = subscribeToJob(jobId, (progress) => {
    send(progress);
    if (progress.status === "completed" || progress.status === "failed") {
      res.end();
    }
  });

  const currentSnapshot = getJobSnapshot(jobId);
  if (currentSnapshot?.status === "completed" || currentSnapshot?.status === "failed") {
    res.end();
  }

  req.on("close", () => {
    unsubscribe?.();
  });
}

export function parseCsvEndpoint(req: Request, res: Response): void {
  const csvText =
    typeof req.body === "string"
      ? req.body
      : typeof req.body === "object" && req.body && "csvText" in req.body
        ? String(req.body.csvText)
        : "";

  if (!csvText || !csvText.trim()) {
    throw new AppError(ERROR_CODES.INVALID_FILE, "No CSV content provided.", 400);
  }

  const parsed = parseCsvText(csvText);

  res.status(200).json({
    success: true,
    data: parsed,
  });
}
