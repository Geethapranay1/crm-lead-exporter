"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ERROR_CODES = exports.DATA_SOURCES = exports.CRM_STATUSES = void 0;
exports.CRM_STATUSES = [
    "GOOD_LEAD_FOLLOW_UP",
    "DID_NOT_CONNECT",
    "BAD_LEAD",
    "SALE_DONE",
];
exports.DATA_SOURCES = [
    "leads_on_demand",
    "meridian_tower",
    "eden_park",
    "varah_swamy",
    "sarjapur_plots",
];
exports.ERROR_CODES = {
    INVALID_FILE: "INVALID_FILE",
    PARSE_ERROR: "PARSE_ERROR",
    AI_ERROR: "AI_ERROR",
    VALIDATION_ERROR: "VALIDATION_ERROR",
    RATE_LIMITED: "RATE_LIMITED",
    NOT_FOUND: "NOT_FOUND",
    INTERNAL_ERROR: "INTERNAL_ERROR",
};
