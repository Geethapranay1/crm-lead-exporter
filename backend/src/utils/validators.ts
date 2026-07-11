import {
  CRM_STATUSES,
  DATA_SOURCES,
  type CrmRecord,
  type CrmStatus,
  type DataSource,
} from "@groweasy/shared";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DIGITS_ONLY_REGEX = /^\d+$/;

export interface RawAiRecord extends Partial<CrmRecord> {
  _skip?: boolean;
}

export interface RawAiPayload {
  records?: RawAiRecord[];
  skipped_indices?: number[];
}

export interface ValidatedBatchResult {
  records: Array<CrmRecord | null>;
  skippedIndices: Set<number>;
  errors: string[];
}

export function sanitizeString(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  return str
    .replace(/\u0000/g, "")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}

export function isValidEmail(value: string): boolean {
  return value === "" || EMAIL_REGEX.test(value);
}

export function isValidMobileDigits(value: string): boolean {
  return value === "" || DIGITS_ONLY_REGEX.test(value);
}

export function isValidCrmStatus(value: string): value is CrmStatus {
  return value === "" || (CRM_STATUSES as readonly string[]).includes(value);
}

export function isValidDataSource(value: string): value is DataSource {
  return value === "" || (DATA_SOURCES as readonly string[]).includes(value);
}

export function isValidDate(value: string): boolean {
  if (value === "") return true;
  const timestamp = new Date(value).getTime();
  return !Number.isNaN(timestamp);
}

const CRM_FIELD_KEYS: Array<keyof CrmRecord> = [
  "created_at",
  "name",
  "email",
  "country_code",
  "mobile_without_country_code",
  "company",
  "city",
  "state",
  "country",
  "lead_owner",
  "crm_status",
  "crm_note",
  "data_source",
  "possession_time",
  "description",
];

export function sanitizeAndValidateRecord(
  raw: unknown,
  index: number,
  errors: string[],
): CrmRecord | null {
  if (typeof raw !== "object" || raw === null) {
    errors.push(`Record at index ${index} is not an object.`);
    return null;
  }

  const source = raw as Record<string, unknown>;
  const record: Record<string, string> = {};

  for (const key of CRM_FIELD_KEYS) {
    record[key] = sanitizeString(source[key]);
  }

  let mobile = record.mobile_without_country_code.replace(/[^\d]/g, "");
  record.mobile_without_country_code = mobile;

  let countryCode = record.country_code;
  if (countryCode && !countryCode.startsWith("+")) {
    countryCode = `+${countryCode.replace(/[^\d]/g, "")}`;
  }
  record.country_code = countryCode;

  if (!isValidEmail(record.email)) {
    errors.push(`Record at index ${index} has an invalid email "${record.email}"; clearing it.`);
    record.email = "";
  }

  if (!isValidMobileDigits(record.mobile_without_country_code)) {
    errors.push(
      `Record at index ${index} has a non-numeric mobile "${mobile}"; clearing it.`,
    );
    record.mobile_without_country_code = "";
  }

  if (!isValidCrmStatus(record.crm_status)) {
    errors.push(
      `Record at index ${index} has an invalid crm_status "${record.crm_status}"; clearing it.`,
    );
    record.crm_status = "";
  }

  if (!isValidDataSource(record.data_source)) {
    errors.push(
      `Record at index ${index} has an invalid data_source "${record.data_source}"; clearing it.`,
    );
    record.data_source = "";
  }

  if (!isValidDate(record.created_at)) {
    errors.push(
      `Record at index ${index} has an unparseable created_at "${record.created_at}"; clearing it.`,
    );
    record.created_at = "";
  }

  return record as unknown as CrmRecord;
}

export function validateAiPayload(
  payload: unknown,
  batchSize: number,
): ValidatedBatchResult {
  const errors: string[] = [];
  const records: Array<CrmRecord | null> = new Array(batchSize).fill(null);
  const skippedIndices = new Set<number>();

  if (typeof payload !== "object" || payload === null) {
    errors.push("AI response is not a JSON object.");
    return { records, skippedIndices, errors };
  }

  const body = payload as RawAiPayload;

  if (!Array.isArray(body.records)) {
    errors.push("AI response is missing a `records` array.");
    return { records, skippedIndices, errors };
  }

  const declaredSkips = new Set(
    Array.isArray(body.skipped_indices) ? body.skipped_indices : [],
  );

  body.records.slice(0, batchSize).forEach((raw, index) => {
    const isSkipped = raw?._skip === true || declaredSkips.has(index);
    const sanitized = sanitizeAndValidateRecord(raw, index, errors);

    if (!sanitized) {
      skippedIndices.add(index);
      return;
    }

    const hasEmail = sanitized.email !== "";
    const hasMobile = sanitized.mobile_without_country_code !== "";

    if (isSkipped || (!hasEmail && !hasMobile)) {
      skippedIndices.add(index);
      return;
    }

    records[index] = sanitized;
  });

  return { records, skippedIndices, errors };
}
