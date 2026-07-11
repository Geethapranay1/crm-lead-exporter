export declare const CRM_STATUSES: readonly ["GOOD_LEAD_FOLLOW_UP", "DID_NOT_CONNECT", "BAD_LEAD", "SALE_DONE"];
export type CrmStatus = (typeof CRM_STATUSES)[number] | "";
export declare const DATA_SOURCES: readonly ["leads_on_demand", "meridian_tower", "eden_park", "varah_swamy", "sarjapur_plots"];
export type DataSource = (typeof DATA_SOURCES)[number] | "";
export interface CrmRecord {
    created_at: string;
    name: string;
    email: string;
    country_code: string;
    mobile_without_country_code: string;
    company: string;
    city: string;
    state: string;
    country: string;
    lead_owner: string;
    crm_status: CrmStatus;
    crm_note: string;
    data_source: DataSource;
    possession_time: string;
    description: string;
    confidence?: number;
}
export interface SkippedRecord {
    index: number;
    reason: string;
    original_data: Record<string, string>;
}
export interface ImportStats {
    total: number;
    imported: number;
    skipped: number;
}
export interface ImportResult {
    imported: CrmRecord[];
    skipped: SkippedRecord[];
    stats: ImportStats;
}
export interface ImportProgress {
    jobId: string;
    status: "processing" | "completed" | "failed";
    currentBatch: number;
    totalBatches: number;
    currentBatchSize: number;
    processedRecords: number;
    totalRecords: number;
    message: string;
    result?: ImportResult;
    error?: string;
}
export interface ImportRequestBody {
    headers: string[];
    rows: Record<string, string>[];
    fileName?: string;
}
export interface ImportJobResponse {
    success: true;
    data: {
        jobId: string;
        totalRecords: number;
        totalBatches: number;
    };
}
export interface ApiErrorBody {
    success: false;
    error: {
        code: string;
        message: string;
        details?: unknown;
    };
}
export declare const ERROR_CODES: {
    readonly INVALID_FILE: "INVALID_FILE";
    readonly PARSE_ERROR: "PARSE_ERROR";
    readonly AI_ERROR: "AI_ERROR";
    readonly VALIDATION_ERROR: "VALIDATION_ERROR";
    readonly RATE_LIMITED: "RATE_LIMITED";
    readonly NOT_FOUND: "NOT_FOUND";
    readonly INTERNAL_ERROR: "INTERNAL_ERROR";
};
export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
