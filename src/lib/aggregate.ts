export type ToggleWeekSummary = {
  doneDays: number;
  falseDays: number;
  unrecordedDays: number;
};

export function summarizeToggleWeek(
  weekDateKeys: string[],
  get: (dateKey: string) => boolean | null,
): ToggleWeekSummary {
  let doneDays = 0;
  let falseDays = 0;
  let unrecordedDays = 0;
  for (const k of weekDateKeys) {
    const v = get(k);
    if (v === null) unrecordedDays += 1;
    else if (v === true) doneDays += 1;
    else falseDays += 1;
  }
  return { doneDays, falseDays, unrecordedDays };
}

export type NumericWeekSummary = {
  sum: number;
  daysWithValue: number;
  average?: number;
};

export function summarizeNumericWeek(
  weekDateKeys: string[],
  get: (dateKey: string) => number | null,
): NumericWeekSummary {
  let sum = 0;
  let daysWithValue = 0;
  for (const k of weekDateKeys) {
    const v = get(k);
    if (v !== null) {
      sum += v;
      daysWithValue += 1;
    }
  }
  const average =
    daysWithValue > 0 ? sum / daysWithValue : undefined;
  return { sum, daysWithValue, average };
}
