"use client";

import { useCallback, useState } from "react";
import { CsvParseError, parseCsvFile } from "@/lib/csv-parser";
import type { ParsedRow } from "@/types";

export interface UseCsvParserResult {
  parse: (file: File) => Promise<void>;
  reset: () => void;
  data: ParsedRow[];
  headers: string[];
  totalRows: number;
  isParsing: boolean;
  error: string | null;
  fileName: string;
  fileSize: number;
}

export function useCsvParser(): UseCsvParserResult {
  const [data, setData] = useState<ParsedRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState(0);

  const parse = useCallback(async (file: File) => {
    setIsParsing(true);
    setError(null);

    try {
      const result = await parseCsvFile(file);
      setData(result.data);
      setHeaders(result.headers);
      setTotalRows(result.totalRows);
      setFileName(file.name);
      setFileSize(file.size);
    } catch (err) {
      const message = err instanceof CsvParseError ? err.message : "Failed to parse this file.";
      setError(message);
      setData([]);
      setHeaders([]);
      setTotalRows(0);
    } finally {
      setIsParsing(false);
    }
  }, []);

  const reset = useCallback(() => {
    setData([]);
    setHeaders([]);
    setTotalRows(0);
    setError(null);
    setFileName("");
    setFileSize(0);
  }, []);

  return { parse, reset, data, headers, totalRows, isParsing, error, fileName, fileSize };
}
