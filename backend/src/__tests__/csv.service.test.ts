import { chunk, normalizeRows } from "../services/csv.service";

describe("normalizeRows", () => {
  it("trims whitespace and fills missing headers with empty strings", () => {
    const headers = ["Name", "Email", "Phone"];
    const rows = [{ Name: "  John  ", Email: "john@example.com" }];

    const result = normalizeRows(headers, rows);

    expect(result).toEqual([{ Name: "John", Email: "john@example.com", Phone: "" }]);
  });
});

describe("chunk", () => {
  it("splits an array into batches of the given size", () => {
    const items = [1, 2, 3, 4, 5];
    expect(chunk(items, 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it("returns a single batch when size is larger than the array", () => {
    expect(chunk([1, 2], 10)).toEqual([[1, 2]]);
  });

  it("returns everything in one batch for a non-positive size", () => {
    expect(chunk([1, 2, 3], 0)).toEqual([[1, 2, 3]]);
  });
});
