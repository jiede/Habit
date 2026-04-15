import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { WeekDayGrid, normalizeDayFlags } from "../components/stats/WeekDayGrid";
import type { WeeklyEntry } from "../db/types";
import { apiGet } from "../lib/api";
import { dateFromWeekKey, formatWeekBanner, weekKeyISO } from "../lib/dates";

export default function StatsPage() {
  const [rows, setRows] = useState<WeeklyEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const data = await apiGet<{ entries: WeeklyEntry[] }>("/api/stats/weeks");
        setRows(data.entries);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "加载统计失败");
      }
    })();
  }, []);

  const currentWeekKey = weekKeyISO(new Date());
  const currentWeek = rows.find((row) => row.weekKey === currentWeekKey);
  const currentDayIndex = ((new Date().getDay() + 6) % 7) as number; // Monday=0 ... Sunday=6
  const currentWeekFlags = normalizeDayFlags(currentWeek?.dayFlags);
  const currentWeekRecordedDays =
    typeof currentWeek?.recordedDays === "number"
      ? currentWeek.recordedDays
      : currentWeekFlags.filter(Boolean).length;

  return (
    <section className="page" style={{ maxWidth: 860 }}>
      <h1>统计</h1>
      <p>
        <Link to={`/week/${weekKeyISO(new Date())}`}>前往本周</Link>
      </p>
      {error ? <p className="error-text">{error}</p> : null}
      <div
        className="surface soft"
        style={{
          padding: 16,
          marginBottom: 18,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
          <strong style={{ fontSize: 16 }}>本周记录</strong>
          <span style={{ fontSize: 15, color: "#0f766e" }}>
            {currentWeekRecordedDays} / 7 天
          </span>
        </div>
        <WeekDayGrid dayFlags={currentWeekFlags} currentDayIndex={currentDayIndex} />
      </div>
      {rows.length === 0 ? <p>还没有周总结记录，去「本周」填写周总分后会出现在这里。</p> : null}
      <ul style={{ paddingLeft: 0, listStyle: "none" }}>
        {rows.map((r) => {
          const b = formatWeekBanner(dateFromWeekKey(r.weekKey));
          const dayFlags = normalizeDayFlags(r.dayFlags);
          const recordedDays =
            typeof r.recordedDays === "number" ? r.recordedDays : dayFlags.filter(Boolean).length;
          return (
            <li
              key={r.weekKey}
              style={{
                marginBottom: 10,
                padding: "10px 12px",
                display: "grid",
                gridTemplateColumns: "1fr auto",
                columnGap: 12,
                alignItems: "center",
              }}
              className="surface soft"
            >
              <div>
                <Link to={`/week/${r.weekKey}`}>
                  {b.shortLabel}（{b.rangeZh}）
                </Link>
                <div style={{ marginTop: 4, fontSize: 13, color: "#475569" }}>
                  {r.score !== null ? `周分：${r.score}` : "未打分"} · {recordedDays}/7 天
                </div>
              </div>
              <div style={{ width: 140 }}>
                <WeekDayGrid dayFlags={dayFlags} compact />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
