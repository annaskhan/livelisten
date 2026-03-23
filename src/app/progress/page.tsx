"use client";

import { useEffect, useState } from "react";
import { STORAGE_KEYS, FOCUS_AREAS, type FocusAreaId } from "@/lib/constants";
import { getItem } from "@/lib/storage";
import { type Goal, type JournalEntry, type Mood, MOODS } from "@/lib/models";

// ===== Helpers =====

function getMoodColor(mood: Mood): string {
  switch (mood) {
    case "great": return "#40916c";
    case "good": return "#74c69d";
    case "okay": return "#e9c46a";
    case "low": return "#e09f5a";
    case "rough": return "#c1574e";
  }
}

function getMoodEmoji(mood: Mood): string {
  return MOODS.find((m) => m.id === mood)?.emoji ?? "";
}

function getFocusLabel(id: FocusAreaId): string {
  return FOCUS_AREAS.find((f) => f.id === id)?.label ?? id;
}

function goalProgress(goal: Goal): number {
  if (goal.tasks.length === 0) return goal.completed ? 100 : 0;
  const done = goal.tasks.filter((t) => t.completed).length;
  return Math.round((done / goal.tasks.length) * 100);
}

function getWeekDates(): string[] {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - dayOfWeek);
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    dates.push(d.toISOString().split("T")[0]);
  }
  return dates;
}

function getCalendarDays(year: number, month: number): (string | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push(iso);
  }
  return cells;
}

function computeStreak(entries: JournalEntry[]): number {
  if (entries.length === 0) return 0;
  const dates = new Set(entries.map((e) => e.date));
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const iso = d.toISOString().split("T")[0];
    if (dates.has(iso)) {
      streak++;
    } else if (i > 0) {
      break;
    }
    // Allow today to be missing (streak continues from yesterday)
  }
  return streak;
}

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function ProgressPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth());
  const [calYear, setCalYear] = useState(() => new Date().getFullYear());

  useEffect(() => {
    setGoals(getItem<Goal[]>(STORAGE_KEYS.GOALS, []));
    setEntries(getItem<JournalEntry[]>(STORAGE_KEYS.JOURNAL, []));
  }, []);

  const hasData = goals.length > 0 || entries.length > 0;

  if (!hasData) {
    return (
      <div style={{ padding: "0 20px" }}>
        <div style={{ padding: "20px 0 12px" }}>
          <h1 className="font-display" style={{ fontSize: 28, fontWeight: 600, margin: 0 }}>Progress</h1>
          <p style={{ fontSize: 14, color: "var(--text-dim)", margin: "4px 0 0" }}>See how far you{"'"}ve come</p>
        </div>
        <div className="card fade-in-up" style={{ padding: "48px 24px", textAlign: "center", marginTop: 12 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>{"\u{1F4C8}"}</div>
          <h3 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 8px", color: "var(--text)" }}>No data yet</h3>
          <p style={{ fontSize: 14, color: "var(--text-dim)", margin: 0, lineHeight: 1.6 }}>
            Start creating goals and journal entries to see your progress here.
          </p>
        </div>
      </div>
    );
  }

  // Computed stats
  const activeGoals = goals.filter((g) => !g.completed);
  const completedGoals = goals.filter((g) => g.completed);
  const totalTasks = goals.reduce((n, g) => n + g.tasks.length, 0);
  const completedTasks = goals.reduce((n, g) => n + g.tasks.filter((t) => t.completed).length, 0);
  const overallGoalProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : (completedGoals.length > 0 ? 100 : 0);

  // Journal streak
  const journalStreak = computeStreak(entries);

  // This week mood
  const weekDates = getWeekDates();
  const moodByDate = new Map<string, Mood>();
  entries.forEach((e) => { if (!moodByDate.has(e.date)) moodByDate.set(e.date, e.mood); });

  // Mood distribution
  const moodCounts: Record<Mood, number> = { great: 0, good: 0, okay: 0, low: 0, rough: 0 };
  entries.forEach((e) => moodCounts[e.mood]++);
  const totalEntries = entries.length;

  // Focus area breakdown (from both goals and journal)
  const focusCounts = new Map<FocusAreaId, number>();
  goals.forEach((g) => focusCounts.set(g.focusArea, (focusCounts.get(g.focusArea) ?? 0) + 1));
  entries.forEach((e) => e.focusAreas.forEach((f) => focusCounts.set(f, (focusCounts.get(f) ?? 0) + 1)));
  const topFocusAreas = [...focusCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxFocusCount = topFocusAreas.length > 0 ? topFocusAreas[0][1] : 1;

  // Calendar data
  const calDays = getCalendarDays(calYear, calMonth);

  const prevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1); }
    else setCalMonth(calMonth - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1); }
    else setCalMonth(calMonth + 1);
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <div style={{ padding: "0 20px" }}>
      <div style={{ padding: "20px 0 12px" }}>
        <h1 className="font-display" style={{ fontSize: 28, fontWeight: 600, margin: 0 }}>Progress</h1>
        <p style={{ fontSize: 14, color: "var(--text-dim)", margin: "4px 0 0" }}>See how far you{"'"}ve come</p>
      </div>

      <div className="stagger-children" style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 4 }}>

        {/* ===== Overview Stats ===== */}
        <div style={{ display: "flex", gap: 10 }}>
          <div className="card" style={{ flex: 1, padding: "16px 12px", textAlign: "center" }}>
            <p style={{ fontSize: 28, fontWeight: 700, color: "var(--primary)", margin: 0 }}>{completedGoals.length}</p>
            <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "2px 0 0" }}>Goals Done</p>
          </div>
          <div className="card" style={{ flex: 1, padding: "16px 12px", textAlign: "center" }}>
            <p style={{ fontSize: 28, fontWeight: 700, color: "var(--accent)", margin: 0 }}>{entries.length}</p>
            <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "2px 0 0" }}>Journal Entries</p>
          </div>
          <div className="card" style={{ flex: 1, padding: "16px 12px", textAlign: "center" }}>
            <p style={{ fontSize: 28, fontWeight: 700, color: "var(--secondary)", margin: 0 }}>{journalStreak}</p>
            <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "2px 0 0" }}>Day Streak</p>
          </div>
        </div>

        {/* ===== Goal Progress ===== */}
        {goals.length > 0 && (
          <div className="card" style={{ padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Goal Progress
              </span>
              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--primary)" }}>{overallGoalProgress}%</span>
            </div>
            <div style={{ height: 10, borderRadius: 5, background: "var(--bg-secondary)", overflow: "hidden", marginBottom: 12 }}>
              <div style={{ height: "100%", width: `${overallGoalProgress}%`, borderRadius: 5, background: "var(--primary)", transition: "width 0.3s ease" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--text-dim)" }}>
              <span>{activeGoals.length} active</span>
              <span>{completedTasks}/{totalTasks} steps done</span>
            </div>

            {/* Individual goal bars */}
            {activeGoals.length > 0 && (
              <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                {activeGoals.map((goal) => {
                  const p = goalProgress(goal);
                  return (
                    <div key={goal.id}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 13, color: "var(--text)", fontWeight: 500 }}>{goal.title}</span>
                        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{p}%</span>
                      </div>
                      <div style={{ height: 6, borderRadius: 3, background: "var(--bg-secondary)", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${p}%`, borderRadius: 3, background: "var(--primary-light)", transition: "width 0.3s" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ===== This Week Mood ===== */}
        {entries.length > 0 && (
          <div className="card" style={{ padding: 16 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 12 }}>
              This Week
            </span>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              {weekDates.map((date, i) => {
                const mood = moodByDate.get(date);
                const isToday = date === today;
                return (
                  <div key={date} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flex: 1 }}>
                    <span style={{ fontSize: 11, fontWeight: 500, color: isToday ? "var(--primary)" : "var(--text-muted)" }}>{DAY_LABELS[i]}</span>
                    <div style={{
                      width: 36, height: 36, borderRadius: "50%",
                      background: mood ? getMoodColor(mood) : "var(--bg-secondary)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      border: isToday ? "2px solid var(--primary)" : "none",
                      fontSize: 18,
                    }}>
                      {mood ? getMoodEmoji(mood) : ""}
                    </div>
                    <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
                      {new Date(date + "T12:00:00").getDate()}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ===== Mood Calendar ===== */}
        {entries.length > 0 && (
          <div className="card" style={{ padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <button onClick={prevMonth} aria-label="Previous month"
                style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--bg-secondary)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
              </button>
              <span style={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>
                {MONTH_NAMES[calMonth]} {calYear}
              </span>
              <button onClick={nextMonth} aria-label="Next month"
                style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--bg-secondary)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
              </button>
            </div>

            {/* Day headers */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 4 }}>
              {DAY_LABELS.map((d, i) => (
                <div key={i} style={{ textAlign: "center", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", padding: "4px 0" }}>
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
              {calDays.map((date, i) => {
                if (!date) return <div key={`empty-${i}`} />;
                const mood = moodByDate.get(date);
                const isToday = date === today;
                const day = new Date(date + "T12:00:00").getDate();
                return (
                  <div key={date} style={{
                    aspectRatio: "1", borderRadius: "var(--radius-sm)",
                    background: mood ? getMoodColor(mood) : "var(--bg-secondary)",
                    opacity: mood ? 1 : 0.4,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, fontWeight: isToday ? 700 : 400,
                    color: mood ? "#fff" : "var(--text-muted)",
                    border: isToday ? "2px solid var(--primary)" : "none",
                    position: "relative",
                  }}>
                    {day}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
              {MOODS.map((m) => (
                <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: getMoodColor(m.id) }} />
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{m.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== Mood Distribution ===== */}
        {entries.length > 0 && (
          <div className="card" style={{ padding: 16 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 12 }}>
              Mood Distribution
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {MOODS.map((m) => {
                const count = moodCounts[m.id];
                const pct = totalEntries > 0 ? Math.round((count / totalEntries) * 100) : 0;
                return (
                  <div key={m.id}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 13, color: "var(--text)" }}>
                        {m.emoji} {m.label}
                      </span>
                      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        {count} ({pct}%)
                      </span>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: "var(--bg-secondary)", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, borderRadius: 3, background: getMoodColor(m.id), transition: "width 0.3s" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ===== Focus Area Breakdown ===== */}
        {topFocusAreas.length > 0 && (
          <div className="card" style={{ padding: 16 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 12 }}>
              Top Focus Areas
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {topFocusAreas.map(([id, count]) => {
                const pct = Math.round((count / maxFocusCount) * 100);
                return (
                  <div key={id}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 13, color: "var(--text)", fontWeight: 500 }}>{getFocusLabel(id)}</span>
                      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{count}</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: "var(--bg-secondary)", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, borderRadius: 3, background: "var(--primary)", transition: "width 0.3s" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ===== Milestones ===== */}
        {completedGoals.length > 0 && (
          <div className="card" style={{ padding: 16 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 12 }}>
              Milestones Reached
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {completedGoals.map((goal) => (
                <div key={goal.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 20 }}>{"\u{1F3C6}"}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", margin: 0 }}>{goal.title}</p>
                    <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "2px 0 0" }}>
                      {getFocusLabel(goal.focusArea)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{ height: 24 }} />
    </div>
  );
}
