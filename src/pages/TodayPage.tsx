import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { db } from "../db/database";
import type { DailyEntry, Habit } from "../db/types";
import { debounce } from "../lib/debounce";
import { parseDateKeyLocal, toDateKey } from "../lib/dates";

function addDaysKey(key: string, delta: number): string {
  const d = parseDateKeyLocal(key);
  d.setDate(d.getDate() + delta);
  return toDateKey(d);
}

export default function TodayPage() {
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
      const hs = await db.habits.filter((h) => h.archivedAt === null).sortBy("sortOrder");
      setHabits(hs);
      let row = await db.dailyEntries.get(dateKey);
      if (!row) {
        row = {
          dateKey,
          habitValues: {},
          todayReview: "",
          tomorrowPlan: "",
          updatedAt: Date.now(),
        };
      }
      setEntry(row);
    })();
  }, [dateKey]);

  const persist = useMemo(
    () =>
      debounce((next: DailyEntry) => {
        void (async () => {
          try {
            await db.dailyEntries.put({ ...next, updatedAt: Date.now() });
          } catch (e) {
            console.error(e);
          }
        })();
      }, 400),
    [],
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
    <section>
      <h1>今日</h1>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button type="button" onClick={() => shiftDay(-1)}>
          ← 前一天
        </button>
        <span>{dateKey}</span>
        <button type="button" onClick={() => shiftDay(1)}>
          后一天 →
        </button>
        <button
          type="button"
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
      <ul style={{ listStyle: "none", padding: 0 }}>
        {habits.map((h) => {
          const v = entry.habitValues[h.id];
          if (h.type === "toggle") {
            const checked = v === true;
            return (
              <li key={h.id} style={{ margin: "0.5rem 0" }}>
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
            <li key={h.id} style={{ margin: "0.5rem 0" }}>
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
      <label style={{ display: "block", marginTop: "1rem" }}>
        今日回顾
        <textarea
          style={{ width: "100%", minHeight: 80 }}
          value={entry.todayReview}
          onChange={(e) => updateEntry({ todayReview: e.target.value })}
        />
      </label>
      <label style={{ display: "block", marginTop: "0.5rem" }}>
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
