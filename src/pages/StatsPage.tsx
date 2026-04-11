import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { db } from "../db/database";
import type { WeeklyEntry } from "../db/types";
import { dateFromWeekKey, formatWeekBanner, weekKeyISO } from "../lib/dates";

export default function StatsPage() {
  const [rows, setRows] = useState<WeeklyEntry[]>([]);

  useEffect(() => {
    void db.weeklyEntries.orderBy("weekKey").reverse().toArray().then(setRows);
  }, []);

  return (
    <section>
      <h1>统计</h1>
      <p>
        <Link to={`/week/${weekKeyISO(new Date())}`}>前往本周</Link>
      </p>
      {rows.length === 0 ? <p>还没有周总结记录，去「本周」填写周总分后会出现在这里。</p> : null}
      <ul>
        {rows.map((r) => {
          const b = formatWeekBanner(dateFromWeekKey(r.weekKey));
          return (
            <li key={r.weekKey} style={{ marginBottom: "0.5rem" }}>
              <Link to={`/week/${r.weekKey}`}>
                {b.shortLabel}（{b.rangeZh}）
              </Link>
              {r.score !== null ? ` — 周分：${r.score}` : " — 未打分"}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
