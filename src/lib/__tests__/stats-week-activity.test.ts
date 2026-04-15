import { expect, it } from "vitest";
import { hasAnyHabitRecord } from "../../../functions/api/stats/weeks";

it("counts toggle true as a recorded day", () => {
  expect(hasAnyHabitRecord(JSON.stringify({ h1: true, h2: false }))).toBe(true);
});

it("counts numeric zero as a recorded day", () => {
  expect(hasAnyHabitRecord(JSON.stringify({ h1: 0, h2: null }))).toBe(true);
});

it("does not count empty values as a recorded day", () => {
  expect(hasAnyHabitRecord(JSON.stringify({ h1: false, h2: null }))).toBe(false);
});

it("returns false for invalid json", () => {
  expect(hasAnyHabitRecord("{not-json}")).toBe(false);
});
