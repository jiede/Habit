import {
  eachDayOfInterval,
  endOfISOWeek,
  format,
  getISOWeek,
  getISOWeekYear,
  parseISO,
  startOfISOWeek,
} from "date-fns";
import { zhCN } from "date-fns/locale";

export function toDateKey(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

export function parseDateKeyLocal(key: string): Date {
  return parseISO(key);
}

export function weekDateKeysFor(d: Date): string[] {
  const start = startOfISOWeek(d);
  const end = endOfISOWeek(d);
  return eachDayOfInterval({ start, end }).map((x) => toDateKey(x));
}

export function weekKeyISO(d: Date): string {
  const y = getISOWeekYear(d);
  const w = getISOWeek(d);
  return `${y}-W${String(w).padStart(2, "0")}`;
}

export function formatWeekBanner(d: Date): {
  weekKey: string;
  shortLabel: string;
  rangeZh: string;
} {
  const keys = weekDateKeysFor(d);
  const start = parseDateKeyLocal(keys[0]!);
  const end = parseDateKeyLocal(keys[6]!);
  const weekKey = weekKeyISO(d);
  const isoWeekNum = getISOWeek(d);
  const shortLabel = `wk${String(isoWeekNum).padStart(2, "0")}`;
  const rangeZh = `${format(start, "M月d日", { locale: zhCN })}–${format(end, "M月d日", { locale: zhCN })}`;
  return { weekKey, shortLabel, rangeZh };
}
