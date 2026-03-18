import { STORAGE_KEY } from "./constants";

export interface SavedSession {
  id: string;
  date: string;
  sourceLang: string;
  targetLang: string;
  original: string;
  translation: string;
  duration: number;
}

export function loadSessions(): SavedSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

export function saveSessions(sessions: SavedSession[]): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    return true;
  } catch {
    return false;
  }
}

export function saveSession(session: SavedSession): boolean {
  const sessions = loadSessions();
  sessions.unshift(session);
  if (sessions.length > 50) sessions.length = 50;
  return saveSessions(sessions);
}

export function deleteSession(id: string) {
  const sessions = loadSessions().filter((s) => s.id !== id);
  saveSessions(sessions);
}

export function clearAllSessions() {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* */ }
}

export function exportSession(session: SavedSession): string {
  const lines = [
    `LiveListen Session - ${formatDate(session.date)}`,
    `${session.sourceLang} → ${session.targetLang}`,
    `Duration: ${formatTime(session.duration)}`,
    "",
    "--- Original ---",
    session.original || "(empty)",
    "",
    "--- Translation ---",
    session.translation || "(empty)",
  ];
  return lines.join("\n");
}

export function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) +
    " at " + d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function formatTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function wordCount(text: string) {
  if (!text.trim()) return 0;
  return text.trim().split(/\s+/).length;
}
