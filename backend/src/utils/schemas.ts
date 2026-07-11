import { z } from "zod";

const CRM_STATUSES = ["GOOD_LEAD_FOLLOW_UP", "DID_NOT_CONNECT", "BAD_LEAD", "SALE_DONE"] as const;
const DATA_SOURCES = ["leads_on_demand", "meridian_tower", "eden_park", "varah_swamy", "sarjapur_plots"] as const;

export const crmRecordSchema = z.object({
  created_at: z.string().refine(
    (v) => v === "" || !isNaN(new Date(v).getTime()),
    { message: "Invalid date format" }
  ).catch(""),
  name: z.string().catch(""),
  email: z.string().catch(""),
  country_code: z.string().catch(""),
  mobile_without_country_code: z.string().catch(""),
  company: z.string().catch(""),
  city: z.string().catch(""),
  state: z.string().catch(""),
  country: z.string().catch(""),
  lead_owner: z.string().catch(""),
  crm_status: z.enum(CRM_STATUSES).or(z.literal("")).catch(""),
  crm_note: z.string().catch(""),
  data_source: z.enum(DATA_SOURCES).or(z.literal("")).catch(""),
  possession_time: z.string().catch(""),
  description: z.string().catch(""),
  _skip: z.boolean().catch(false),
  _confidence: z.number().min(0).max(1).catch(0.9),
});

export const aiResponseSchema = z.object({
  records: z.array(crmRecordSchema).catch([]),
  skipped_indices: z.array(z.number()).catch([]),
});

export type ValidatedCrmRecord = z.infer<typeof crmRecordSchema>;
export type ValidatedAiResponse = z.infer<typeof aiResponseSchema>;
