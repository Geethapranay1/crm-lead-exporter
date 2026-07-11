const mockCreate = jest.fn();

jest.mock("openai", () => {
  return jest.fn().mockImplementation(() => ({
    chat: { completions: { create: mockCreate } },
  }));
});

import { extractCrmRecords } from "../services/ai.service";

describe("extractCrmRecords", () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  const headers = ["Name", "Email"];
  const batch = [{ Name: "John Doe", Email: "john@example.com" }];

  it("returns sanitized records on a valid AI response", async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: JSON.stringify({
              records: [
                {
                  name: "John Doe",
                  email: "john@example.com",
                  crm_status: "GOOD_LEAD_FOLLOW_UP",
                  _skip: false,
                },
              ],
              skipped_indices: [],
            }),
          },
        },
      ],
    });

    const result = await extractCrmRecords(batch, headers);

    expect(result.records[0]?.email).toBe("john@example.com");
    expect(result.skippedIndices.size).toBe(0);
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it("retries on malformed JSON and eventually throws AppError after exhausting retries", async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: "not valid json" } }],
    });

    await expect(extractCrmRecords(batch, headers)).rejects.toThrow(/AI extraction failed/);
    expect(mockCreate.mock.calls.length).toBeGreaterThanOrEqual(2);
  }, 15000);

  it("recovers after a transient failure followed by a valid response", async () => {
    mockCreate
      .mockResolvedValueOnce({ choices: [{ message: { content: "garbage" } }] })
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                records: [{ name: "Jane", email: "jane@example.com", _skip: false }],
                skipped_indices: [],
              }),
            },
          },
        ],
      });

    const result = await extractCrmRecords(batch, headers);
    expect(result.records[0]?.email).toBe("jane@example.com");
    expect(mockCreate).toHaveBeenCalledTimes(2);
  }, 15000);
});
