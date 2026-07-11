import Papa from "papaparse";
import type { ParsedRow } from "@/types";

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export interface CsvParseResult {
  headers: string[];
  data: ParsedRow[];
  totalRows: number;
}

export class CsvParseError extends Error {}


export function parseCsvFile(file: File): Promise<CsvParseResult> {
  return new Promise((resolve, reject) => {
    if (!file.name.toLowerCase().endsWith(".csv") && file.type !== "text/csv") {
      reject(new CsvParseError("Please upload a .csv file."));
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      reject(new CsvParseError(`File is too large. Maximum size is 10MB.`));
      return;
    }

    if (file.size === 0) {
      reject(new CsvParseError("This file is empty."));
      return;
    }

    Papa.parse<ParsedRow>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.replace(/^\uFEFF/, "").trim(),
      complete: (results) => {
        const headers = (results.meta.fields ?? []).map((h) => h.trim()).filter(Boolean);

        if (headers.length === 0) {
          reject(new CsvParseError("No columns found. Please upload a CSV with a header row."));
          return;
        }

        const data = results.data.filter((row) =>
          Object.values(row).some((value) => String(value ?? "").trim() !== ""),
        );

        if (data.length === 0) {
          reject(new CsvParseError("No data rows found. Please upload a CSV with at least one record."));
          return;
        }

        resolve({ headers, data, totalRows: data.length });
      },
      error: (err) => {
        reject(new CsvParseError(err.message || "Failed to parse this CSV file."));
      },
    });
  });
}
