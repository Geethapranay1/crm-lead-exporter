import { Router, text, json } from "express";
import { createImportJob, streamImportProgress, cancelImportJob, parseCsvEndpoint } from "../controllers/import.controller";
import { validateImportPayload } from "../middleware/upload.middleware";
import { importRateLimiter } from "../middleware/rateLimit.middleware";

export const importRouter = Router();

importRouter.post("/parse", importRateLimiter, text({ type: ["text/csv", "text/plain"], limit: "10mb" }), json({ limit: "10mb" }), parseCsvEndpoint);
importRouter.post("/", importRateLimiter, validateImportPayload, createImportJob);
importRouter.get("/progress/:jobId", streamImportProgress);
importRouter.post("/:jobId/cancel", cancelImportJob);
