import { describe, it, expect } from "vitest";
import { summarizeToggleWeek, summarizeNumericWeek } from "../aggregate";

describe("summarizeToggleWeek", () => {
  it("counts only days with entry and true; ignores missing days", () => {
    const weekKeys = ["2026-04-06", "2026-04-07", "2026-04-08"];
    const valuesByDay: Record<string, boolean | null | undefined> = {
      "2026-04-06": true,
      "2026-04-07": false,
      // 08 missing
    };
    const r = summarizeToggleWeek(weekKeys, (k) => valuesByDay[k] ?? null);
    expect(r.doneDays).toBe(1);
    expect(r.falseDays).toBe(1);
    expect(r.unrecordedDays).toBe(1);
  });
});

describe("summarizeNumericWeek", () => {
  it("sums only non-null; avg over days with values; allows zero as value", () => {
    const weekKeys = ["2026-04-06", "2026-04-07", "2026-04-08"];
    const valuesByDay: Record<string, number | null | undefined> = {
      "2026-04-06": 5,
      "2026-04-07": 0,
      "2026-04-08": null,
    };
    const r = summarizeNumericWeek(weekKeys, (k) => valuesByDay[k] ?? null);
    expect(r.sum).toBe(5);
    expect(r.daysWithValue).toBe(2);
    expect(r.average).toBe(2.5);
  });

  it("average undefined when no values", () => {
    const weekKeys = ["2026-04-06"];
    const r = summarizeNumericWeek(weekKeys, () => null);
    expect(r.sum).toBe(0);
    expect(r.daysWithValue).toBe(0);
    expect(r.average).toBeUndefined();
  });
});
