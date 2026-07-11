import { describe, expect, it } from "vitest";
import { CsvParseError, parseCsvFile } from "@/lib/csv-parser";

function makeCsvFile(content: string, name = "leads.csv"): File {
  return new File([content], name, { type: "text/csv" });
}

describe("parseCsvFile", () => {
  it("parses a well-formed CSV into rows keyed by header", async () => {
    const csv = "Name,Email\nJohn Doe,john@example.com\nJane Doe,jane@example.com";
    const result = await parseCsvFile(makeCsvFile(csv));

    expect(result.headers).toEqual(["Name", "Email"]);
    expect(result.totalRows).toBe(2);
    expect(result.data[0]).toEqual({ Name: "John Doe", Email: "john@example.com" });
  });

  it("strips a BOM and trims header whitespace", async () => {
    const csv = "\uFEFF Name , Email \nJohn,john@example.com";
    const result = await parseCsvFile(makeCsvFile(csv));
    expect(result.headers).toEqual(["Name", "Email"]);
  });

  it("rejects non-csv files", async () => {
    const file = new File(["hello"], "notes.txt", { type: "text/plain" });
    await expect(parseCsvFile(file)).rejects.toBeInstanceOf(CsvParseError);
  });

  it("rejects an empty file", async () => {
    const file = new File([], "empty.csv", { type: "text/csv" });
    await expect(parseCsvFile(file)).rejects.toBeInstanceOf(CsvParseError);
  });

  it("rejects a CSV with headers but no data rows", async () => {
    const csv = "Name,Email\n";
    await expect(parseCsvFile(makeCsvFile(csv))).rejects.toBeInstanceOf(CsvParseError);
  });
});
