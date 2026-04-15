const WEEKDAY_LABELS = ["一", "二", "三", "四", "五", "六", "日"] as const;

export function normalizeDayFlags(flags: boolean[] | undefined): boolean[] {
  return Array.from({ length: 7 }, (_, i) => Boolean(flags?.[i]));
}

export function WeekDayGrid({
  dayFlags,
  currentDayIndex,
  compact = false,
}: {
  dayFlags: boolean[];
  currentDayIndex?: number;
  compact?: boolean;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: compact ? 6 : 8 }}>
      {dayFlags.map((active, i) => (
        <div key={i} style={{ textAlign: "center" }}>
          {!compact ? (
            <div style={{ fontSize: 12, marginBottom: 6, color: "#6b7280" }}>{WEEKDAY_LABELS[i]}</div>
          ) : null}
          <div
            aria-label={`周${WEEKDAY_LABELS[i]}${active ? "有记录" : "无记录"}`}
            style={{
              width: compact ? 14 : 26,
              height: compact ? 14 : 26,
              margin: "0 auto",
              borderRadius: compact ? 4 : 7,
              background: active ? "#14b8a6" : "#e5e7eb",
              border: currentDayIndex === i ? "2px solid #0f172a" : "1px solid rgba(15, 23, 42, 0.08)",
              boxSizing: "border-box",
            }}
          />
        </div>
      ))}
    </div>
  );
}
