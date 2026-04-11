import { describe, it, expect } from "vitest";
import {
  toDateKey,
  parseDateKeyLocal,
  weekDateKeysFor,
  weekKeyISO,
  formatWeekBanner,
  dateFromWeekKey,
} from "../dates";

describe("toDateKey", () => {
  it("formats local calendar day", () => {
    const d = new Date(2026, 3, 11, 15, 30); // Apr 11 2026 local
    expect(toDateKey(d)).toBe("2026-04-11");
  });
});

describe("week boundaries (ISO, Monday start)", () => {
  it("returns Mon–Sun keys for a Wednesday in April 2026", () => {
    const wed = new Date(2026, 3, 8); // Apr 8 2026 = Wednesday
    expect(weekDateKeysFor(wed)).toEqual([
      "2026-04-06",
      "2026-04-07",
      "2026-04-08",
      "2026-04-09",
      "2026-04-10",
      "2026-04-11",
      "2026-04-12",
    ]);
  });
});

describe("weekKeyISO", () => {
  it("matches ISO week for early January edge (local)", () => {
    const d = new Date(2026, 0, 1); // Jan 1 2026 (Thursday) → ISO 2026-W01
    expect(weekKeyISO(d)).toBe("2026-W01");
  });
});

describe("formatWeekBanner", () => {
  it("shows wk + Chinese range", () => {
    const wed = new Date(2026, 3, 8);
    const b = formatWeekBanner(wed);
    expect(b.weekKey).toMatch(/^2026-W\d{2}$/);
    expect(b.shortLabel).toMatch(/^wk\d{2}$/);
    expect(b.rangeZh).toMatch(/^\d{1,2}月\d{1,2}日[–-]\d{1,2}月\d{1,2}日$/);
  });
});

describe("dateFromWeekKey", () => {
  it("round-trips week key via Monday anchor", () => {
    expect(weekKeyISO(dateFromWeekKey("2026-W15"))).toBe("2026-W15");
  });
});
