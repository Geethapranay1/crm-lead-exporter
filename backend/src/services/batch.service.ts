import { v4 as uuid } from "uuid";
import type { CrmRecord, ImportResult, SkippedRecord } from "@groweasy/shared";
import { config } from "../config";
import { logger } from "../utils/logger";
import { chunk, normalizeRows } from "./csv.service";
import { extractCrmRecords } from "./ai.service";
import { createJob, updateJob, isJobCancelled } from "./job-store.service";
import { parsePhone, inferDefaultCountry } from "../utils/phone-parser";

export function startImportJob(
  headers: string[],
  rows: Record<string, string>[],
  fileNameHint?: string,
): { jobId: string; totalRecords: number; totalBatches: number } {
  const jobId = uuid();
  const normalized = normalizeRows(headers, rows);
  const batches = chunk(normalized, config.batchSize);

  createJob(jobId, normalized.length, batches.length);

  void processJob(jobId, headers, batches, fileNameHint).catch((err) => {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("Import job crashed unexpectedly", { jobId, error: message });
    updateJob(jobId, {
      status: "failed",
      message: "Import failed unexpectedly.",
      error: message,
    });
  });

  return { jobId, totalRecords: normalized.length, totalBatches: batches.length };
}

async function processJob(
  jobId: string,
  headers: string[],
  batches: Record<string, string>[][],
  fileNameHint?: string,
): Promise<void> {
  const imported: CrmRecord[] = [];
  const skipped: SkippedRecord[] = [];
  let processedRecords = 0;
  const totalParsedRows = batches.reduce((sum, b) => sum + b.length, 0);

  logger.debug("Starting import job", {
    jobId,
    totalParsedRows,
    totalBatches: batches.length,
  });

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    if (isJobCancelled(jobId)) {
      logger.info("Import job cancelled by user", { jobId, batchIndex });
      return;
    }
    const batch = batches[batchIndex];
    const globalStartIndex = processedRecords;

    logger.debug("Processing batch", {
      jobId,
      batchIndex,
      batchSize: batch.length,
      globalStartIndex,
    });

    updateJob(jobId, {
      currentBatch: batchIndex + 1,
      currentBatchSize: batch.length,
      message: `Processing batch ${batchIndex + 1} of ${batches.length}…`,
    });

    try {
      const { records, skippedIndices } = await extractCrmRecords(
        batch,
        headers,
        fileNameHint,
        { jobId, batchIndex: batchIndex + 1, totalBatches: batches.length },
      );

      let batchImported = 0;
      let batchSkipped = 0;

      records.forEach((record, i) => {
        const parsedPhone = record
          ? parsePhone(record.mobile_without_country_code, inferDefaultCountry(record))
          : { countryCode: "", nationalNumber: "", country: "" };

        const finalCountryCode = record?.country_code?.trim() || parsedPhone.countryCode;
        const finalMobile = record?.country_code?.trim()
          ? record.mobile_without_country_code.trim()
          : parsedPhone.nationalNumber;

        const hasEmail = Boolean(record?.email && record.email.trim() !== "");
        const hasMobile = Boolean(finalMobile && finalMobile.trim() !== "");

        if (record && !record._skip && !skippedIndices.has(i) && (hasEmail || hasMobile)) {
          batchImported++;

          let country = record.country;
          if (!country && parsedPhone.country) {
            const isoToName: Record<string, string> = {
              IN: "India",
              US: "United States",
              AE: "UAE",
              GB: "United Kingdom",
              SG: "Singapore",
              AU: "Australia",
              SA: "Saudi Arabia",
            };
            country = isoToName[parsedPhone.country] || "";
          }

          const sanitizeLineBreaks = (str: string): string =>
            typeof str === "string" ? str.replace(/\r?\n|\r/g, "\\n").trim() : "";

          const cleanRecord: CrmRecord = {
            created_at: sanitizeLineBreaks(record.created_at),
            name: sanitizeLineBreaks(record.name),
            email: sanitizeLineBreaks(record.email),
            country_code: finalCountryCode,
            mobile_without_country_code: finalMobile,
            company: sanitizeLineBreaks(record.company),
            city: sanitizeLineBreaks(record.city),
            state: sanitizeLineBreaks(record.state),
            country: sanitizeLineBreaks(country),
            lead_owner: sanitizeLineBreaks(record.lead_owner),
            crm_status: record.crm_status,
            crm_note: sanitizeLineBreaks(record.crm_note),
            data_source: record.data_source,
            possession_time: sanitizeLineBreaks(record.possession_time),
            description: sanitizeLineBreaks(record.description),
            confidence: typeof record._confidence === "number" ? record._confidence : 0.9,
          };

          imported.push(cleanRecord);
        } else if (skippedIndices.has(i) || record?._skip || (!hasEmail && !hasMobile)) {
          batchSkipped++;
          skipped.push({
            index: processedRecords + i,
            reason: "No valid email or mobile number found in this row.",
            original_data: batch[i],
          });
        } else {
          batchSkipped++;
          skipped.push({
            index: processedRecords + i,
            reason: "AI did not return a usable record for this row.",
            original_data: batch[i],
          });
        }
      });

      for (let i = records.length; i < batch.length; i++) {
        batchSkipped++;
        skipped.push({
          index: processedRecords + i,
          reason: "AI did not return a record for this row.",
          original_data: batch[i],
        });
      }

      logger.debug("Batch extraction complete", {
        jobId,
        batchIndex,
        recordsReturned: records.length,
        skippedByAi: skippedIndices.size,
        batchImported,
        batchSkipped,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error("Batch failed after all retries, skipping its records", {
        jobId,
        batchIndex,
        error: message,
      });

      const userFriendlyReason =
        message.includes("429") ||
        message.toLowerCase().includes("rate limit") ||
        message.toLowerCase().includes("tokens per") ||
        message.toLowerCase().includes("billing")
          ? "AI processing capacity temporarily reached. Please retry shortly."
          : message.toLowerCase().includes("timeout") || message.toLowerCase().includes("timed out")
            ? "AI processing timed out while analyzing this batch."
            : "Could not automatically extract CRM lead details for this row.";

      batch.forEach((row, i) => {
        skipped.push({
          index: processedRecords + i,
          reason: userFriendlyReason,
          original_data: row,
        });
      });
    }

    processedRecords += batch.length;

    updateJob(jobId, {
      processedRecords,
      message: `Processed ${processedRecords} of ${totalParsedRows} records…`,
    });

    if (batchIndex < batches.length - 1 && process.env.NODE_ENV !== "test") {
      await new Promise((resolve) => setTimeout(resolve, 2500));
    }
  }

  logger.info("Import job finished", {
    jobId,
    totalParsed: processedRecords,
    totalImported: imported.length,
    totalSkipped: skipped.length,
  });

  const result: ImportResult = {
    imported,
    skipped,
    stats: {
      total: processedRecords,
      imported: imported.length,
      skipped: skipped.length,
    },
  };

  updateJob(jobId, {
    status: "completed",
    message: "Import complete.",
    result,
  });
}
