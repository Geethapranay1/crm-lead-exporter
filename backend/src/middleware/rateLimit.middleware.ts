import rateLimit from "express-rate-limit";
import { ERROR_CODES, type ApiErrorBody } from "@groweasy/shared";

export const importRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    const body: ApiErrorBody = {
      success: false,
      error: {
        code: ERROR_CODES.RATE_LIMITED,
        message: "Too many import requests. Please wait a moment and try again.",
      },
    };
    res.status(429).json(body);
  },
});
