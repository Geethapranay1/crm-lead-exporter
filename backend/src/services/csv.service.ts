export function normalizeRows(
  headers: string[],
  rows: Record<string, string>[],
): Record<string, string>[] {
  return rows.map((row) => {
    const normalized: Record<string, string> = {};
    for (const header of headers) {
      const raw = row[header];
      normalized[header] = typeof raw === "string" ? raw.trim() : raw != null ? String(raw) : "";
    }
    return normalized;
  });
}

export function chunk<T>(items: T[], size: number): T[][] {
  if (size <= 0) return [items];
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    batches.push(items.slice(i, i + size));
  }
  return batches;
}

export interface ParsedCsvData {
  headers: string[];
  rows: Record<string, string>[];
  totalRows: number;
}

export function parseCsvText(csvText: string): ParsedCsvData {
  const lines: string[][] = [];
  let currentField = "";
  let currentRow: string[] = [];
  let inQuotes = false;

  const cleaned = csvText.replace(/^\uFEFF/, "");

  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];
    const nextChar = cleaned[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentField += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        currentRow.push(currentField.trim());
        currentField = "";
      } else if (char === "\r" && nextChar === "\n") {
        currentRow.push(currentField.trim());
        lines.push(currentRow);
        currentRow = [];
        currentField = "";
        i++;
      } else if (char === "\n" || char === "\r") {
        currentRow.push(currentField.trim());
        lines.push(currentRow);
        currentRow = [];
        currentField = "";
      } else {
        currentField += char;
      }
    }
  }

  if (currentField !== "" || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    lines.push(currentRow);
  }

  const nonEmptyLines = lines.filter((line) => line.some((cell) => cell !== ""));
  if (nonEmptyLines.length === 0) {
    return { headers: [], rows: [], totalRows: 0 };
  }

  const headers = nonEmptyLines[0].map((h) => h.trim());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < nonEmptyLines.length; i++) {
    const line = nonEmptyLines[i];
    const record: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      const header = headers[j];
      if (header) {
        record[header] = line[j] ?? "";
      }
    }
    rows.push(record);
  }

  return {
    headers,
    rows,
    totalRows: rows.length,
  };
}
