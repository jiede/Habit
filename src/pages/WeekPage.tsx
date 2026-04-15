import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { WeekDayGrid } from "../components/stats/WeekDayGrid";
import type { DailyEntry, Habit, WeeklyEntry } from "../db/types";
import { summarizeNumericWeek, summarizeToggleWeek, summarizeWeekActivity } from "../lib/aggregate";
import { useToast } from "../hooks/useToast";
import { apiGet, apiPut } from "../lib/api";
import { debounce } from "../lib/debounce";
import {
  dateFromWeekKey,
  formatWeekBanner,
  weekDateKeysFor,
  weekKeyISO,
} from "../lib/dates";

export default function WeekPage() {
  const { show } = useToast();
  const { weekKey: weekKeyParam } = useParams();
  const weekKey = weekKeyParam ?? weekKeyISO(new Date());
  const anchor = dateFromWeekKey(weekKey);
  const banner = formatWeekBanner(anchor);
  const keys = weekDateKeysFor(anchor);

  const [habits, setHabits] = useState<Habit[]>([]);
  const [days, setDays] = useState<DailyEntry[]>([]);
  const [weekly, setWeekly] = useState<WeeklyEntry | null>(null);

  async function load() {
    const [habitData, weeklyData, dailyEntries] = await Promise.all([
      apiGet<{ habits: Habit[] }>("/api/habits"),
      apiGet<{ entry: WeeklyEntry }>(`/api/weekly/${weekKey}`),
      Promise.all(keys.map((dateKey) => apiGet<{ entry: DailyEntry }>(`/api/daily/${dateKey}`))),
    ]);
    setHabits(habitData.habits);
    setDays(dailyEntries.map((data) => data.entry));
    setWeekly(weeklyData.entry);
  }

  useEffect(() => {
    void (async () => {
      try {
        await load();
      } catch {
        show("加载失败，请稍后重试");
      }
    })();
  }, [weekKey, show]);

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

  const weekActivity = useMemo(
    () =>
      summarizeWeekActivity(keys, (k) => {
        return dayMap.get(k)?.habitValues;
      }),
    [keys, dayMap],
  );
  const currentDayIndex = ((new Date().getDay() + 6) % 7) as number; // Monday=0 ... Sunday=6

  const persistWeekly = useMemo(
    () =>
      debounce((row: WeeklyEntry) => {
        void (async () => {
          try {
            await apiPut<{ entry: WeeklyEntry }>(`/api/weekly/${row.weekKey}`, {
              score: row.score,
              weekReview: row.weekReview,
              nextWeekPlan: row.nextWeekPlan,
            });
          } catch {
            show("保存失败，请稍后重试");
          }
        })();
      }, 400),
    [show],
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
    <section className="page">
      <h1>
        {banner.shortLabel}（{banner.rangeZh}）
      </h1>
      <p className="muted">周键：{banner.weekKey}</p>
      <Link to="/stats">← 返回统计</Link>
      <h2>本周习惯概览</h2>
      <div className="surface soft" style={{ padding: "10px 12px", marginBottom: 10, maxWidth: 340 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>本周活动</div>
        <div style={{ fontSize: 13, color: "#0f766e", marginBottom: 8 }}>{weekActivity.recordedDays} / 7 天有记录</div>
        <WeekDayGrid dayFlags={weekActivity.dayFlags} compact currentDayIndex={currentDayIndex} />
      </div>
      {relevantHabitIds.length === 0 ? <p>本周暂无记录。</p> : null}
      <ul style={{ listStyle: "none", paddingLeft: 0 }}>
        {relevantHabitIds.map((id) => {
          const h = habitById.get(id);
          const label = h?.name ?? "未知习惯（可能已删档）";
          if (
            h?.type === "numeric" ||
            (!h && days.some((d) => typeof d.habitValues[id] === "number"))
          ) {
            const s = summarizeNumericWeek(keys, (k) => {
              const v = dayMap.get(k)?.habitValues[id];
              return typeof v === "number" ? v : null;
            });
            const unit = h?.unit?.trim();
            const u = unit ? ` ${unit}` : "";
            return (
              <li key={id} className="surface soft section-block" style={{ marginBottom: 8 }}>
                <strong>{label}</strong>：合计 {s.sum}
                {u}，{s.daysWithValue} 天有记录
                {s.average !== undefined ? `，日均 ${s.average.toFixed(2)}${u}` : ""}
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
            <li key={id} className="surface soft section-block" style={{ marginBottom: 8 }}>
              <strong>{label}</strong>：完成 {s.doneDays} 天
            </li>
          );
        })}
      </ul>
      <h2>周总结</h2>
      <label className="surface section-block">
        周总分（手动）
        <input
          type="number"
          style={{ marginLeft: 8 }}
          value={weekly.score ?? ""}
          onChange={(e) => {
            const raw = e.target.value;
            updateWeekly({ score: raw === "" ? null : Number(raw) });
          }}
        />
      </label>
      <label className="surface section-block" style={{ display: "block", marginTop: 8 }}>
        周回顾
        <textarea
          style={{ width: "100%", minHeight: 100, marginTop: 6 }}
          value={weekly.weekReview}
          onChange={(e) => updateWeekly({ weekReview: e.target.value })}
        />
      </label>
      <label className="surface section-block" style={{ display: "block", marginTop: 8 }}>
        下周计划
        <textarea
          style={{ width: "100%", minHeight: 100, marginTop: 6 }}
          value={weekly.nextWeekPlan}
          onChange={(e) => updateWeekly({ nextWeekPlan: e.target.value })}
        />
      </label>
    </section>
  );
}
