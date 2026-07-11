export interface BuildPromptInput {
  headers: string[];
  rows: Record<string, string>[];
  filename?: string;
}

export function buildFieldMappingPrompt(input: BuildPromptInput): string {
  const { headers, rows, filename } = input;
  const rowsJson = JSON.stringify(rows, null, 0);

  return `<role>
You are a data extraction engine for GrowEasy CRM. Map CSV records with arbitrary columns to a fixed CRM schema. Never hallucinate data.
</role>

<output_schema>
Return ONLY valid JSON. No markdown. No comments.
{
  "records": [
    {
      "created_at": "",
      "name": "",
      "email": "",
      "country_code": "",
      "mobile_without_country_code": "",
      "company": "",
      "city": "",
      "state": "",
      "country": "",
      "lead_owner": "",
      "crm_status": "",
      "crm_note": "",
      "data_source": "",
      "possession_time": "",
      "description": "",
      "_skip": false,
      "_confidence": 0.0
    }
  ],
  "skipped_indices": []
}
</output_schema>

<confidence>
Single float 0.0-1.0 per record. 1.0 = all fields clearly mapped. 0.5 = some guessing. 0.0 = no useful data.
</confidence>

<allowed_enums>
crm_status: "GOOD_LEAD_FOLLOW_UP" | "DID_NOT_CONNECT" | "BAD_LEAD" | "SALE_DONE" | ""
data_source: "leads_on_demand" | "meridian_tower" | "eden_park" | "varah_swamy" | "sarjapur_plots" | ""
</allowed_enums>

<rules>
<created_at>Parseable by new Date() or "". Never invent.</created_at>
<name>Combine first+last. Strip titles (Mr., Dr.). Trim.</name>
<email>First valid email. Extra emails → crm_note as "Alt Email: ..."</email>
<mobile>Extract country_code (e.g., +91, +1, +44) into "country_code". Put ONLY the remaining digits into "mobile_without_country_code". If no country code is present, leave country_code as "". Extra phones → crm_note as "Alt Phone: ..."</mobile>
<company>Map: company, organization, org, firm, business, employer, workplace.</company>
<city_state_country>Standardize (Bangalore→Bengaluru, NY→New York, USA→United States). Infer from context.</city_state_country>
<crm_status>GOOD_LEAD_FOLLOW_UP=interested/demo. DID_NOT_CONNECT=no answer/busy. BAD_LEAD=junk/not interested. SALE_DONE=booked/converted. Else "".</crm_status>
<data_source>meridian→meridian_tower. eden→eden_park. varah/swamy→varah_swamy. sarjapur/plots→sarjapur_plots. LOD/leads on demand→leads_on_demand. Check filename+content. Else "".</data_source>
<crm_note>Catch-all: remarks, notes, feedback, extra phones/emails.</crm_note>
<skip>If BOTH email and phone are missing/invalid: _skip=true, add index to skipped_indices.</skip>
<format>No line breaks in values (use \\n). Trim all strings. Empty="" not null.</format>
</rules>

<examples>
<example>
<input>{"headers":["Full Name","Email Address","Phone","Organization","Location","Lead Status","Remarks"],"rows":[{"Full Name":"Mr. Rajesh Kumar","Email Address":"rajesh@gmail.com rajesh.k@corp.in","Phone":"+91-98765 43210","Organization":"TechCorp","Location":"Bangalore, Karnataka","Lead Status":"Interested in demo","Remarks":"Follow up Tuesday"},{"Full Name":"Priya","Email Address":"","Phone":"","Organization":"","Location":"","Lead Status":"","Remarks":"Wrong number"}]}</input>
<output>{"records":[{"created_at":"","name":"Rajesh Kumar","email":"rajesh@gmail.com","country_code":"+91","mobile_without_country_code":"9876543210","company":"TechCorp","city":"Bengaluru","state":"Karnataka","country":"India","lead_owner":"","crm_status":"GOOD_LEAD_FOLLOW_UP","crm_note":"Alt Email: rajesh.k@corp.in\\nFollow up Tuesday","data_source":"","possession_time":"","description":"","_skip":false,"_confidence":0.95},{"created_at":"","name":"Priya","email":"","country_code":"","mobile_without_country_code":"","company":"","city":"","state":"","country":"","lead_owner":"","crm_status":"","crm_note":"Wrong number","data_source":"","possession_time":"","description":"","_skip":true,"_confidence":0.2}],"skipped_indices":[1]}</output>
</example>

<example>
<input>{"headers":["first_name","last_name","phone_number","email","city","project","status","date_added"],"rows":[{"first_name":"Sarah","last_name":"Johnson","phone_number":"9876543211","email":"sarah.j@tech.com","city":"Pune","project":"Eden Park","status":"Booked","date_added":"2026-05-13"}]}</input>
<output>{"records":[{"created_at":"2026-05-13","name":"Sarah Johnson","email":"sarah.j@tech.com","country_code":"","mobile_without_country_code":"9876543211","company":"","city":"Pune","state":"","country":"","lead_owner":"","crm_status":"SALE_DONE","crm_note":"","data_source":"eden_park","possession_time":"","description":"","_skip":false,"_confidence":0.95}],"skipped_indices":[]}</output>
</example>

<example>
<input>{"headers":["Name","Contact","Email ID","Firm","City","State","Country","Source","Feedback","Created On"],"rows":[{"Name":"Dr. Amit Sharma","Contact":"+1 (555) 123-4567 +91-9988776655","Email ID":"amit@global.com","Firm":"Global Consulting","City":"Mumbai","State":"Maharashtra","Country":"India","Source":"Facebook - Meridian Tower","Feedback":"Called twice, no response.","Created On":"13-May-2026 14:20"}]}</input>
<output>{"records":[{"created_at":"2026-05-13T14:20:00","name":"Amit Sharma","email":"amit@global.com","country_code":"+1","mobile_without_country_code":"5551234567","company":"Global Consulting","city":"Mumbai","state":"Maharashtra","country":"India","lead_owner":"","crm_status":"DID_NOT_CONNECT","crm_note":"Alt Phone: +91-9988776655\\nCalled twice, no response.","data_source":"meridian_tower","possession_time":"","description":"","_skip":false,"_confidence":0.95}],"skipped_indices":[]}</output>
</example>
</examples>

<input_context>
filename: ${filename || "unknown.csv"}
headers: ${JSON.stringify(headers)}
record_count: ${rows.length}
</input_context>

<rows>${rowsJson}</rows>`;
}
