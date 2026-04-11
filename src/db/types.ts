export type HabitType = "toggle" | "numeric";

export type Habit = {
  id: string;
  name: string;
  type: HabitType;
  unit: string | null;
  sortOrder: number;
  archivedAt: number | null;
  createdAt: number;
};

export type HabitValueMap = Record<string, boolean | number | null>;

export type DailyEntry = {
  dateKey: string;
  habitValues: HabitValueMap;
  todayReview: string;
  tomorrowPlan: string;
  updatedAt: number;
};

export type WeeklyEntry = {
  weekKey: string;
  score: number | null;
  weekReview: string;
  nextWeekPlan: string;
  updatedAt: number;
};
