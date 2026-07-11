import type { NextFunction, Request, Response } from "express";
import { ERROR_CODES, type ImportRequestBody } from "@groweasy/shared";
import { config } from "../config";
import { AppError } from "./error.middleware";

export function validateImportPayload(req: Request, _res: Response, next: NextFunction): void {
  const body = req.body as Partial<ImportRequestBody> | undefined;

  if (!body || typeof body !== "object") {
    throw new AppError(ERROR_CODES.INVALID_FILE, "Request body must be a JSON object.");
  }

  const { headers, rows } = body;

  if (!Array.isArray(headers) || headers.length === 0) {
    throw new AppError(
      ERROR_CODES.INVALID_FILE,
      "CSV appears to have no columns. Please upload a valid CSV with a header row.",
    );
  }

  if (!headers.every((h) => typeof h === "string")) {
    throw new AppError(ERROR_CODES.INVALID_FILE, "CSV headers must all be strings.");
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    throw new AppError(
      ERROR_CODES.INVALID_FILE,
      "CSV appears to have no data rows. Please upload a CSV with at least one record.",
    );
  }

  if (rows.length > config.maxRows) {
    throw new AppError(
      ERROR_CODES.INVALID_FILE,
      `CSV has ${rows.length} rows, which exceeds the maximum of ${config.maxRows} rows per import.`,
    );
  }

  const approxBytes = Buffer.byteLength(JSON.stringify(body), "utf8");
  const maxBytes = config.maxFileSizeMb * 1024 * 1024;
  if (approxBytes > maxBytes) {
    throw new AppError(
      ERROR_CODES.INVALID_FILE,
      `Payload is too large (${(approxBytes / (1024 * 1024)).toFixed(2)}MB). Max allowed is ${config.maxFileSizeMb}MB.`,
    );
  }

  next();
}
