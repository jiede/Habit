import Dexie, { type Table } from "dexie";
import type { DailyEntry, Habit, WeeklyEntry } from "./types";

export class LifeTrackerDB extends Dexie {
  habits!: Table<Habit, string>;
  dailyEntries!: Table<DailyEntry, string>;
  weeklyEntries!: Table<WeeklyEntry, string>;

  constructor() {
    super("life-tracker-db");
    this.version(1).stores({
      habits: "id, sortOrder, archivedAt",
      dailyEntries: "dateKey",
      weeklyEntries: "weekKey",
    });
  }
}

export const db = new LifeTrackerDB();
