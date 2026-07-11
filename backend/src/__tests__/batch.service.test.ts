import { startImportJob } from "../services/batch.service";
import { getJobSnapshot, clearAllJobs } from "../services/job-store.service";
import { extractCrmRecords } from "../services/ai.service";
import type { BatchExtractionResult } from "../services/ai.service";

jest.mock("../services/ai.service", () => ({
  extractCrmRecords: jest.fn(),
}));

const mockedExtract = extractCrmRecords as jest.MockedFunction<typeof extractCrmRecords>;

afterEach(() => {
  clearAllJobs();
});

function generateRows(count: number): Record<string, string>[] {
  return Array.from({ length: count }, (_, i) => ({
    Name: `Person ${i + 1}`,
    Email: `person${i + 1}@example.com`,
    Phone: `98765${String(i).padStart(5, "0")}`.slice(0, 10),
  }));
}

function waitForJobCompletion(
  jobId: string,
  timeoutMs = 2000,
  intervalMs = 50,
): Promise<ReturnType<typeof getJobSnapshot>> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    let timer: NodeJS.Timeout | undefined;
    const poll = () => {
      const snapshot = getJobSnapshot(jobId);
      if (snapshot?.status === "completed" || snapshot?.status === "failed") {
        if (timer) clearTimeout(timer);
        resolve(snapshot);
        return;
      }
      if (Date.now() - start > timeoutMs) {
        reject(new Error("Timed out waiting for job to complete"));
        return;
      }
      timer = setTimeout(poll, intervalMs);
    };
    poll();
  });
}

describe("batch.service record-loss reproduction", () => {
  beforeEach(() => {
    mockedExtract.mockReset();
  });

  it("reproduces the bug when AI returns fewer records than the batch size", async () => {
    const headers = ["Name", "Email", "Phone"];
    const rows = generateRows(100);

    mockedExtract.mockImplementation(async (batch) => {
      const returnedCount = Math.min(10, batch.length);
      const records = Array.from({ length: returnedCount }, (_, i) => ({
        created_at: "",
        name: batch[i]["Name"],
        email: batch[i]["Email"],
        country_code: "+91",
        mobile_without_country_code: batch[i]["Phone"].replace(/\D/g, ""),
        company: "",
        city: "",
        state: "",
        country: "",
        lead_owner: "",
        crm_status: "GOOD_LEAD_FOLLOW_UP" as const,
        crm_note: "",
        data_source: "" as const,
        possession_time: "",
        description: "",
        _skip: false,
        _confidence: 1,
      }));

      return {
        records,
        skippedIndices: new Set<number>(),
      } as BatchExtractionResult;
    });

    const { jobId, totalRecords } = startImportJob(headers, rows, "test-100-rows.csv");
    expect(totalRecords).toBe(100);

    const snapshot = await waitForJobCompletion(jobId);
    expect(snapshot?.status).toBe("completed");

    const result = snapshot?.result;
    expect(result).toBeDefined();

    const imported = result!.stats.imported;
    const skipped = result!.stats.skipped;
    const lost = totalRecords - imported - skipped;

    expect(lost).toBe(0);
    expect(imported + skipped).toBe(totalRecords);
  });
});
