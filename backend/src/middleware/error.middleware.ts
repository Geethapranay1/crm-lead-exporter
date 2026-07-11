import type { NextFunction, Request, Response } from "express";
import { ERROR_CODES, type ApiErrorBody, type ErrorCode } from "@groweasy/shared";
import { logger } from "../utils/logger";

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly details?: unknown;

  constructor(code: ErrorCode, message: string, statusCode = 400, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function notFoundHandler(req: Request, res: Response): void {
  const body: ApiErrorBody = {
    success: false,
    error: {
      code: ERROR_CODES.NOT_FOUND,
      message: `Route not found: ${req.method} ${req.originalUrl}`,
    },
  };
  res.status(404).json(body);
}

export function errorMiddleware(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    logger.warn("Handled application error", {
      code: err.code,
      message: err.message,
      path: req.originalUrl,
    });

    const body: ApiErrorBody = {
      success: false,
      error: { code: err.code, message: err.message, details: err.details },
    };
    res.status(err.statusCode).json(body);
    return;
  }

  const message = err instanceof Error ? err.message : "Unknown error";
  logger.error("Unhandled error", { message, path: req.originalUrl });

  const body: ApiErrorBody = {
    success: false,
    error: {
      code: ERROR_CODES.INTERNAL_ERROR,
      message: "Something went wrong while processing your request.",
    },
  };
  res.status(500).json(body);
}
