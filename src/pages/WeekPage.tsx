import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { db } from "../db/database";
import type { DailyEntry, Habit, WeeklyEntry } from "../db/types";
import { summarizeNumericWeek, summarizeToggleWeek } from "../lib/aggregate";
import { debounce } from "../lib/debounce";
import {
  dateFromWeekKey,
  formatWeekBanner,
  weekDateKeysFor,
  weekKeyISO,
} from "../lib/dates";

export default function WeekPage() {
  const { weekKey: weekKeyParam } = useParams();
  const weekKey = weekKeyParam ?? weekKeyISO(new Date());
  const anchor = dateFromWeekKey(weekKey);
  const banner = formatWeekBanner(anchor);
  const keys = weekDateKeysFor(anchor);

  const [habits, setHabits] = useState<Habit[]>([]);
  const [days, setDays] = useState<DailyEntry[]>([]);
  const [weekly, setWeekly] = useState<WeeklyEntry | null>(null);

  async function load() {
    const [hs, ws] = await Promise.all([
      db.habits.toArray(),
      db.weeklyEntries.get(weekKey),
    ]);
    setHabits(hs);
    const entries = await db.dailyEntries.bulkGet(keys);
    setDays(entries.filter((e): e is DailyEntry => !!e));
    setWeekly(
      ws ?? {
        weekKey,
        score: null,
        weekReview: "",
        nextWeekPlan: "",
        updatedAt: Date.now(),
      },
    );
  }

  useEffect(() => {
    void load();
  }, [weekKey]);

  const habitById = useMemo(() => new Map(habits.map((h) => [h.id, h])), [habits]);

  const dayMap = useMemo(() => {
    const m = new Map<string, DailyEntry>();
    for (const d of days) m.set(d.dateKey, d);
    return m;
  }, [days]);

  const relevantHabitIds = useMemo(() => {
    const ids = new Set<string>();
    for (const h of habits) {
      if (h.archivedAt === null) ids.add(h.id);
    }
    for (const k of keys) {
      const row = dayMap.get(k);
      if (!row) continue;
      for (const id of Object.keys(row.habitValues)) ids.add(id);
    }
    return [...ids];
  }, [habits, keys, dayMap]);

  const persistWeekly = useMemo(
    () =>
      debounce((row: WeeklyEntry) => {
        void (async () => {
          try {
            await db.weeklyEntries.put({ ...row, updatedAt: Date.now() });
          } catch (e) {
            console.error(e);
          }
        })();
      }, 400),
    [],
  );

  const updateWeekly = useCallback(
    (patch: Partial<WeeklyEntry>) => {
      setWeekly((prev) => {
        if (!prev) return prev;
        const merged = { ...prev, ...patch };
        persistWeekly(merged);
        return merged;
      });
    },
    [persistWeekly],
  );

  if (!weekly) return <p>加载中…</p>;

  return (
    <section>
      <h1>
        {banner.shortLabel}（{banner.rangeZh}）
      </h1>
      <p style={{ color: "#666" }}>周键：{banner.weekKey}</p>
      <Link to="/stats">← 返回统计</Link>
      <h2>本周习惯概览</h2>
      {relevantHabitIds.length === 0 ? <p>本周暂无记录。</p> : null}
      <ul>
        {relevantHabitIds.map((id) => {
          const h = habitById.get(id);
          const label = h?.name ?? "未知习惯（可能已删档）";
          if (
            h?.type === "numeric" ||
            (!h && Object.values(dayMap).some((d) => typeof d.habitValues[id] === "number"))
          ) {
            const s = summarizeNumericWeek(keys, (k) => {
              const v = dayMap.get(k)?.habitValues[id];
              return typeof v === "number" ? v : null;
            });
            return (
              <li key={id}>
                <strong>{label}</strong>：合计 {s.sum}，{s.daysWithValue} 天有记录
                {s.average !== undefined ? `，日均 ${s.average.toFixed(2)}` : ""}
              </li>
            );
          }
          const s = summarizeToggleWeek(keys, (k) => {
            const v = dayMap.get(k)?.habitValues[id];
            if (v === true) return true;
            if (v === false) return false;
            return null;
          });
          return (
            <li key={id}>
              <strong>{label}</strong>：完成 {s.doneDays} 天，未完成 {s.falseDays} 天，未记录{" "}
              {s.unrecordedDays} 天
            </li>
          );
        })}
      </ul>
      <h2>周总结</h2>
      <label>
        周总分（手动）
        <input
          type="number"
          value={weekly.score ?? ""}
          onChange={(e) => {
            const raw = e.target.value;
            updateWeekly({ score: raw === "" ? null : Number(raw) });
          }}
        />
      </label>
      <label style={{ display: "block", marginTop: 8 }}>
        周回顾
        <textarea
          style={{ width: "100%", minHeight: 100 }}
          value={weekly.weekReview}
          onChange={(e) => updateWeekly({ weekReview: e.target.value })}
        />
      </label>
      <label style={{ display: "block", marginTop: 8 }}>
        下周计划
        <textarea
          style={{ width: "100%", minHeight: 100 }}
          value={weekly.nextWeekPlan}
          onChange={(e) => updateWeekly({ nextWeekPlan: e.target.value })}
        />
      </label>
    </section>
  );
}
