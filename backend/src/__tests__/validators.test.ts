import {
  isValidCrmStatus,
  isValidDataSource,
  isValidDate,
  isValidEmail,
  isValidMobileDigits,
  sanitizeString,
  validateAiPayload,
} from "../utils/validators";

describe("sanitizeString", () => {
  it("trims whitespace and escapes real newlines", () => {
    expect(sanitizeString("  hello\nworld  ")).toBe("hello\\nworld");
  });

  it("strips null bytes", () => {
    expect(sanitizeString("abc\u0000def")).toBe("abcdef");
  });

  it("returns empty string for null/undefined", () => {
    expect(sanitizeString(null)).toBe("");
    expect(sanitizeString(undefined)).toBe("");
  });
});

describe("isValidEmail", () => {
  it("accepts empty string", () => {
    expect(isValidEmail("")).toBe(true);
  });

  it("accepts a valid email", () => {
    expect(isValidEmail("john.doe@example.com")).toBe(true);
  });

  it("rejects a malformed email", () => {
    expect(isValidEmail("not-an-email")).toBe(false);
  });
});

describe("isValidMobileDigits", () => {
  it("accepts digits only", () => {
    expect(isValidMobileDigits("9876543210")).toBe(true);
  });

  it("rejects non-digit characters", () => {
    expect(isValidMobileDigits("987-654-3210")).toBe(false);
  });
});

describe("isValidCrmStatus / isValidDataSource", () => {
  it("accepts allowed enum values and empty string", () => {
    expect(isValidCrmStatus("GOOD_LEAD_FOLLOW_UP")).toBe(true);
    expect(isValidCrmStatus("")).toBe(true);
    expect(isValidDataSource("meridian_tower")).toBe(true);
    expect(isValidDataSource("")).toBe(true);
  });

  it("rejects values outside the allowed enum", () => {
    expect(isValidCrmStatus("MAYBE")).toBe(false);
    expect(isValidDataSource("some_random_project")).toBe(false);
  });
});

describe("isValidDate", () => {
  it("accepts empty string", () => {
    expect(isValidDate("")).toBe(true);
  });

  it("accepts a parseable date", () => {
    expect(isValidDate("2026-05-13 14:20:48")).toBe(true);
  });

  it("rejects an unparseable date", () => {
    expect(isValidDate("not-a-date")).toBe(false);
  });
});

describe("validateAiPayload", () => {
  it("keeps valid records with an email or mobile", () => {
    const payload = {
      records: [
        {
          created_at: "2026-05-13 14:20:48",
          name: "John Doe",
          email: "john@example.com",
          country_code: "+91",
          mobile_without_country_code: "9876543210",
          company: "",
          city: "",
          state: "",
          country: "",
          lead_owner: "",
          crm_status: "GOOD_LEAD_FOLLOW_UP",
          crm_note: "",
          data_source: "",
          possession_time: "",
          description: "",
          _skip: false,
        },
      ],
      skipped_indices: [],
    };

    const { records, skippedIndices, errors } = validateAiPayload(payload, 1);
    expect(errors).toHaveLength(0);
    expect(skippedIndices.size).toBe(0);
    expect(records[0]?.email).toBe("john@example.com");
  });

  it("skips records with neither email nor mobile even if not flagged by the AI", () => {
    const payload = {
      records: [
        {
          name: "No Contact Info",
          email: "",
          mobile_without_country_code: "",
          _skip: false,
        },
      ],
      skipped_indices: [],
    };

    const { records, skippedIndices } = validateAiPayload(payload, 1);
    expect(records[0]).toBeNull();
    expect(skippedIndices.has(0)).toBe(true);
  });

  it("sanitizes invalid enum values instead of failing the whole batch", () => {
    const payload = {
      records: [
        {
          email: "jane@example.com",
          crm_status: "NOT_A_REAL_STATUS",
          data_source: "not_a_real_source",
        },
      ],
      skipped_indices: [],
    };

    const { records, errors } = validateAiPayload(payload, 1);
    expect(records[0]?.crm_status).toBe("");
    expect(records[0]?.data_source).toBe("");
    expect(errors.length).toBeGreaterThan(0);
  });

  it("returns all-null / all-skipped when records is missing", () => {
    const { records, errors } = validateAiPayload({}, 2);
    expect(records).toEqual([null, null]);
    expect(errors.length).toBeGreaterThan(0);
  });
});
