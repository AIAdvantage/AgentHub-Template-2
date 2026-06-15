import React, { useMemo, useState } from "react";

// Parses a markdown body whose day entries are "## YYYY-MM-DD" sections,
// each followed by "- " bullet headlines, into a filterable board of day-cards.

function parseDays(body) {
  const lines = (body || "").split("\n");
  const days = [];
  let cur = null;
  for (const line of lines) {
    const h = line.match(/^##\s+(\d{4})-(\d{2})-(\d{2})\b/);
    if (h) {
      cur = { y: +h[1], m: +h[2], d: +h[3], key: `${h[1]}-${h[2]}-${h[3]}`, items: [] };
      days.push(cur);
      continue;
    }
    const b = line.match(/^\s*[-*]\s+(.*\S)\s*$/);
    if (b && cur) cur.items.push(b[1]);
  }
  return days;
}

function inlineHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>");
}

const startOfDay = (dt) => { const d = new Date(dt); d.setHours(0, 0, 0, 0); return d; };
const dayDate = (d) => new Date(d.y, d.m - 1, d.d);
function startOfWeek(dt) {
  const d = startOfDay(dt);
  const wd = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - wd);
  return d;
}

export default function NewsBoard({ body, updated }) {
  const days = useMemo(() => parseDays(body), [body]);
  const [range, setRange] = useState("week");
  const [pick, setPick] = useState("");

  const today = startOfDay(new Date());

  const filtered = useMemo(() => {
    const out = days.filter((day) => {
      const dt = startOfDay(dayDate(day));
      if (range === "today") return dt.getTime() === today.getTime();
      if (range === "month")
        return dt.getFullYear() === today.getFullYear() && dt.getMonth() === today.getMonth();
      if (range === "pick") {
        if (!pick) return true;
        const [y, m, d] = pick.split("-").map(Number);
        return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
      }
      const sow = startOfWeek(today);
      const eow = new Date(sow); eow.setDate(eow.getDate() + 6);
      return dt >= sow && dt <= eow;
    });
    return out.sort((a, b) => dayDate(b) - dayDate(a));
  }, [days, range, pick]);

  const total = useMemo(
    () => filtered.reduce((n, d) => n + d.items.length, 0),
    [filtered]
  );

  const Btn = ({ id, children }) => (
    <button className={range === id ? "on" : ""} onClick={() => setRange(id)}>
      {children}
    </button>
  );

  return (
    <div className="nb-wrap">
      <div className="nb-head">
        <div className="nb-sub">
          {total} stor{total === 1 ? "y" : "ies"} across {filtered.length} day
          {filtered.length === 1 ? "" : "s"}
          {updated && <span className="nb-count">updated {updated}</span>}
        </div>
        <div className="nb-filters">
          <Btn id="today">Today</Btn>
          <Btn id="week">This Week</Btn>
          <Btn id="month">This Month</Btn>
          <label className={`nb-pick ${range === "pick" ? "on" : ""}`}>
            <input
              type="date"
              value={pick}
              onChange={(e) => { setPick(e.target.value); setRange("pick"); }}
            />
          </label>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="nb-empty">No scans in this range yet.</div>
      ) : (
        <div className="nb-grid">
          {filtered.map((day) => {
            const dt = dayDate(day);
            const wd = dt.toLocaleDateString("en-US", { weekday: "short" });
            const md = dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
            return (
              <div className="nb-card" key={day.key}>
                <span className="nb-dot" />
                <div className="nb-day">{wd}</div>
                <div className="nb-date">{md}</div>
                <ul className="nb-items">
                  {day.items.map((it, i) => (
                    <li className="nb-item" key={i}>
                      <span className="nb-ic">🗞</span>
                      <span dangerouslySetInnerHTML={{ __html: inlineHtml(it) }} />
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
