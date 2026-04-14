import { useEffect, useMemo, useState } from "react";
import type { Habit, HabitType } from "../db/types";
import { apiGet, apiPatch, apiPost } from "../lib/api";

function sortActive(a: Habit, b: Habit) {
  return a.sortOrder - b.sortOrder;
}

export default function HabitsPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [name, setName] = useState("");
  const [type, setType] = useState<HabitType>("toggle");
  const [unit, setUnit] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const data = await apiGet<{ habits: Habit[] }>("/api/habits");
    setHabits(data.habits);
  }

  useEffect(() => {
    void (async () => {
      try {
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "加载习惯失败");
      }
    })();
  }, []);

  const { active, archived } = useMemo(() => {
    const a = habits.filter((h) => h.archivedAt === null).sort(sortActive);
    const ar = habits.filter((h) => h.archivedAt !== null);
    return { active: a, archived: ar };
  }, [habits]);

  async function addHabit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await apiPost<{ habit: Habit }>("/api/habits", {
        name: name.trim(),
        type,
        unit: type === "numeric" ? unit : null,
      });
      setName("");
      setUnit("");
      setError(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "添加习惯失败");
    }
  }

  async function archive(id: string) {
    try {
      await apiPatch<{ habit: Habit }>(`/api/habits/${id}`, {
        archivedAt: Date.now(),
      });
      setError(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "归档习惯失败");
    }
  }

  async function move(id: string, dir: -1 | 1) {
    const idx = active.findIndex((h) => h.id === id);
    const swapIdx = idx + dir;
    if (idx < 0 || swapIdx < 0 || swapIdx >= active.length) return;
    const a = active[idx]!;
    const b = active[swapIdx]!;
    try {
      await Promise.all([
        apiPatch<{ habit: Habit }>(`/api/habits/${a.id}`, {
          sortOrder: b.sortOrder,
        }),
        apiPatch<{ habit: Habit }>(`/api/habits/${b.id}`, {
          sortOrder: a.sortOrder,
        }),
      ]);
      setError(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "调整顺序失败");
    }
  }

  return (
    <section>
      <h1>习惯</h1>
      <form onSubmit={addHabit} style={{ display: "grid", gap: "0.5rem", maxWidth: 360 }}>
        <label>
          名称
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label>
          类型
          <select value={type} onChange={(e) => setType(e.target.value as HabitType)}>
            <option value="toggle">开关</option>
            <option value="numeric">数值</option>
          </select>
        </label>
        {type === "numeric" && (
          <label>
            单位（可选）
            <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="km、小时…" />
          </label>
        )}
        <button type="submit">添加</button>
      </form>
      <h2>进行中</h2>
      {error ? <p style={{ color: "crimson" }}>{error}</p> : null}
      {active.length === 0 ? <p>还没有习惯，先添加一个。</p> : null}
      <ul>
        {active.map((h) => (
          <li key={h.id} style={{ marginBottom: "0.5rem" }}>
            <strong>{h.name}</strong> — {h.type === "toggle" ? "开关" : `数值${h.unit ? ` (${h.unit})` : ""}`}
            <button type="button" onClick={() => move(h.id, -1)} style={{ marginLeft: 8 }}>
              上移
            </button>
            <button type="button" onClick={() => move(h.id, 1)}>
              下移
            </button>
            <button type="button" onClick={() => void archive(h.id)} style={{ marginLeft: 8 }}>
              归档
            </button>
          </li>
        ))}
      </ul>
      <h2>已归档</h2>
      {archived.length === 0 ? <p>无</p> : null}
      <ul>
        {archived.map((h) => (
          <li key={h.id}>{h.name}</li>
        ))}
      </ul>
    </section>
  );
}
