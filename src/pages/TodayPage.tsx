import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { DailyEntry, Habit } from "../db/types";
import { useToast } from "../hooks/useToast";
import { apiGet, apiPut } from "../lib/api";
import { debounce } from "../lib/debounce";
import { parseDateKeyLocal, toDateKey } from "../lib/dates";

function addDaysKey(key: string, delta: number): string {
  const d = parseDateKeyLocal(key);
  d.setDate(d.getDate() + delta);
  return toDateKey(d);
}

export default function TodayPage() {
  const { show } = useToast();
  const [params, setParams] = useSearchParams();
  const initial = params.get("date") ?? toDateKey(new Date());
  const [dateKey, setDateKey] = useState(initial);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [entry, setEntry] = useState<DailyEntry | null>(null);

  useEffect(() => {
    const q = params.get("date");
    if (q) setDateKey(q);
  }, [params]);

  useEffect(() => {
    void (async () => {
      try {
        const [habitData, dailyData] = await Promise.all([
          apiGet<{ habits: Habit[] }>("/api/habits"),
          apiGet<{ entry: DailyEntry }>(`/api/daily/${dateKey}`),
        ]);
        setHabits(
          habitData.habits
            .filter((h) => h.archivedAt === null)
            .sort((a, b) => a.sortOrder - b.sortOrder)
        );
        setEntry(dailyData.entry);
      } catch {
        show("加载失败，请稍后重试");
      }
    })();
  }, [dateKey, show]);

  const persist = useMemo(
    () =>
      debounce((next: DailyEntry) => {
        void (async () => {
          try {
            await apiPut<{ entry: DailyEntry }>(`/api/daily/${next.dateKey}`, {
              habitValues: next.habitValues,
              todayReview: next.todayReview,
              tomorrowPlan: next.tomorrowPlan,
            });
          } catch {
            show("保存失败，请稍后重试");
          }
        })();
      }, 400),
    [show],
  );

  const updateEntry = useCallback(
    (patch: Partial<DailyEntry>) => {
      setEntry((prev) => {
        if (!prev) return prev;
        const merged = { ...prev, ...patch };
        persist(merged);
        return merged;
      });
    },
    [persist],
  );

  function shiftDay(delta: number) {
    const nk = addDaysKey(dateKey, delta);
    setDateKey(nk);
    setParams({ date: nk });
  }

  if (!entry) return <p>加载中…</p>;

  return (
    <section className="page compact">
      <h1>今日</h1>
      <div className="surface section-block" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <button type="button" className="ghost" onClick={() => shiftDay(-1)}>
          ← 前一天
        </button>
        <span className="muted">{dateKey}</span>
        <button type="button" className="ghost" onClick={() => shiftDay(1)}>
          后一天 →
        </button>
        <button
          type="button"
          className="ghost"
          onClick={() => {
            const nk = toDateKey(new Date());
            setDateKey(nk);
            setParams({ date: nk });
          }}
        >
          今天
        </button>
      </div>
      {habits.length === 0 ? <p>请先在「习惯」里添加习惯。</p> : null}
      <ul style={{ listStyle: "none", padding: 0, marginTop: 8 }}>
        {habits.map((h) => {
          const v = entry.habitValues[h.id];
          if (h.type === "toggle") {
            const checked = v === true;
            return (
              <li key={h.id} className="surface soft section-block" style={{ margin: "0.5rem 0" }}>
                <label>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      const habitValues = {
                        ...entry.habitValues,
                        [h.id]: e.target.checked ? true : false,
                      };
                      updateEntry({ habitValues });
                    }}
                  />{" "}
                  {h.name}
                </label>
              </li>
            );
          }
          const num = typeof v === "number" ? String(v) : "";
          return (
            <li key={h.id} className="surface soft section-block" style={{ margin: "0.5rem 0" }}>
              <label>
                {h.name}
                <input
                  type="number"
                  style={{ marginLeft: 8 }}
                  value={num}
                  placeholder={h.unit ?? ""}
                  onChange={(e) => {
                    const raw = e.target.value;
                    const val = raw === "" ? null : Number(raw);
                    const habitValues = { ...entry.habitValues, [h.id]: val };
                    updateEntry({ habitValues });
                  }}
                />
                {h.unit ? <span style={{ marginLeft: 4 }}>{h.unit}</span> : null}
              </label>
            </li>
          );
        })}
      </ul>
      <label className="surface section-block" style={{ display: "block", marginTop: "1rem" }}>
        今日回顾
        <textarea
          style={{ width: "100%", minHeight: 80 }}
          value={entry.todayReview}
          onChange={(e) => updateEntry({ todayReview: e.target.value })}
        />
      </label>
      <label className="surface section-block" style={{ display: "block", marginTop: "0.5rem" }}>
        明日改进
        <textarea
          style={{ width: "100%", minHeight: 80 }}
          value={entry.tomorrowPlan}
          onChange={(e) => updateEntry({ tomorrowPlan: e.target.value })}
        />
      </label>
    </section>
  );
}
