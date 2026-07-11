import { describe, expect, it } from "vitest";
import {
  formatFileSize,
  formatSourceLabel,
  formatStatusLabel,
  getStatusBadgeVariant,
} from "@/lib/utils";

describe("formatFileSize", () => {
  it("formats bytes", () => {
    expect(formatFileSize(0)).toBe("0 B");
    expect(formatFileSize(500)).toBe("500 B");
  });

  it("formats kilobytes and megabytes", () => {
    expect(formatFileSize(1024)).toBe("1.0 KB");
    expect(formatFileSize(1024 * 1024 * 2.5)).toBe("2.5 MB");
  });
});

describe("formatStatusLabel", () => {
  it("converts SCREAMING_SNAKE_CASE to Title Case", () => {
    expect(formatStatusLabel("GOOD_LEAD_FOLLOW_UP")).toBe("Good Lead Follow Up");
    expect(formatStatusLabel("SALE_DONE")).toBe("Sale Done");
  });

  it("returns Unknown for empty input", () => {
    expect(formatStatusLabel("")).toBe("Unknown");
  });
});

describe("formatSourceLabel", () => {
  it("converts snake_case to Title Case", () => {
    expect(formatSourceLabel("meridian_tower")).toBe("Meridian Tower");
  });

  it("returns an em dash for empty input", () => {
    expect(formatSourceLabel("")).toBe("—");
  });
});

describe("getStatusBadgeVariant", () => {
  it("maps each known status to the correct variant", () => {
    expect(getStatusBadgeVariant("GOOD_LEAD_FOLLOW_UP")).toBe("blue");
    expect(getStatusBadgeVariant("DID_NOT_CONNECT")).toBe("amber");
    expect(getStatusBadgeVariant("BAD_LEAD")).toBe("red");
    expect(getStatusBadgeVariant("SALE_DONE")).toBe("green");
  });

  it("falls back to neutral for unknown or empty status", () => {
    expect(getStatusBadgeVariant("")).toBe("neutral");
    expect(getStatusBadgeVariant("something_else")).toBe("neutral");
  });
});
