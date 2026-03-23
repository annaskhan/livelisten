"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { APP_NAME, STORAGE_KEYS, FOCUS_AREAS, type FocusAreaId } from "@/lib/constants";
import { getItem, setItem, removeItem } from "@/lib/storage";
import { type Goal, type JournalEntry } from "@/lib/models";
import { useTheme } from "@/components/ThemeProvider";
import Link from "next/link";

export default function SettingsPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [name, setName] = useState("");
  const [focusAreas, setFocusAreas] = useState<FocusAreaId[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setName(getItem(STORAGE_KEYS.USER_NAME, ""));
    setFocusAreas(getItem<FocusAreaId[]>(STORAGE_KEYS.FOCUS_AREAS, []));
  }, []);

  const handleSave = () => {
    setItem(STORAGE_KEYS.USER_NAME, name.trim());
    setItem(STORAGE_KEYS.FOCUS_AREAS, focusAreas);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const toggleFocus = (id: FocusAreaId) => {
    setFocusAreas((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id],
    );
  };

  const handleExport = useCallback(() => {
    const goals = getItem<Goal[]>(STORAGE_KEYS.GOALS, []);
    const journal = getItem<JournalEntry[]>(STORAGE_KEYS.JOURNAL, []);
    const exportData = {
      exportedAt: new Date().toISOString(),
      app: APP_NAME,
      userName: getItem(STORAGE_KEYS.USER_NAME, ""),
      focusAreas: getItem<FocusAreaId[]>(STORAGE_KEYS.FOCUS_AREAS, []),
      goals,
      journal,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `evolv-export-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleReset = () => {
    if (confirm("This will reset all your data and show the onboarding screen again. Are you sure?")) {
      Object.values(STORAGE_KEYS).forEach((key) => removeItem(key));
      window.location.href = "/";
    }
  };

  return (
    <div style={{ padding: "0 20px" }}>
      {/* Header with back button */}
      <div style={{ padding: "20px 0 12px", display: "flex", alignItems: "center", gap: 12 }}>
        <button
          onClick={() => router.back()}
          aria-label="Go back"
          style={{
            width: 40, height: 40, borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 0, border: "none", cursor: "pointer", background: "var(--bg-secondary)",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="font-display" style={{ fontSize: 28, fontWeight: 600, margin: 0 }}>Settings</h1>
      </div>

      <div className="stagger-children" style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 8 }}>
        {/* Name */}
        <div className="card" style={{ padding: 20 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Your Name
          </label>
          <input
            type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={50}
            style={{
              width: "100%", padding: "12px 14px", fontSize: 15,
              borderRadius: "var(--radius-md)", border: "1.5px solid var(--surface-border)",
              background: "var(--bg)", color: "var(--text)", outline: "none",
              marginTop: 8, fontFamily: "var(--font-sans)",
            }}
          />
        </div>

        {/* Theme */}
        <div className="card" style={{ padding: 20 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Theme
          </label>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            {(["light", "dark", "system"] as const).map((t) => (
              <button key={t} onClick={() => setTheme(t)}
                className={theme === t ? "btn btn-primary" : "btn btn-secondary"}
                style={{ flex: 1, padding: "10px 12px", fontSize: 14, textTransform: "capitalize" }}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Focus Areas */}
        <div className="card" style={{ padding: 20 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Focus Areas
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
            {FOCUS_AREAS.map((area) => (
              <button key={area.id}
                className={`focus-chip ${focusAreas.includes(area.id) ? "selected" : ""}`}
                onClick={() => toggleFocus(area.id)}
                style={{ fontSize: 13, padding: "8px 14px" }}>
                {area.label}
              </button>
            ))}
          </div>
        </div>

        {/* Save */}
        <button className="btn btn-primary" onClick={handleSave} style={{ width: "100%", marginTop: 4 }}>
          {saved ? "\u{2713} Saved!" : "Save Changes"}
        </button>

        {/* Data */}
        <div className="card" style={{ padding: 20 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Your Data
          </label>
          <p style={{ fontSize: 13, color: "var(--text-dim)", margin: "8px 0 12px" }}>
            All data is stored locally on your device.
          </p>
          <button className="btn btn-secondary" onClick={handleExport} style={{ width: "100%", fontSize: 14 }}>
            Export Data (JSON)
          </button>
        </div>

        {/* Links */}
        <div className="card" style={{ padding: 20 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12, display: "block" }}>
            Legal
          </label>
          <Link href="/privacy" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid var(--surface-border)", textDecoration: "none", color: "var(--text)" }}>
            <span style={{ fontSize: 15 }}>Privacy Policy</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
          </Link>
          <Link href="/terms" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", textDecoration: "none", color: "var(--text)" }}>
            <span style={{ fontSize: 15 }}>Terms of Service</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
          </Link>
        </div>

        {/* Reset */}
        <div className="card" style={{ padding: 20 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--danger)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Danger Zone
          </label>
          <p style={{ fontSize: 13, color: "var(--text-dim)", margin: "8px 0 16px" }}>
            This will permanently delete all goals, journal entries, and settings.
          </p>
          <button className="btn" onClick={handleReset}
            style={{ background: "rgba(193, 87, 78, 0.1)", color: "var(--danger)", width: "100%", border: "1px solid rgba(193, 87, 78, 0.2)" }}>
            Reset Everything
          </button>
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", padding: "16px 0 32px" }}>
          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
            {APP_NAME} v2.0.0
          </p>
        </div>
      </div>
    </div>
  );
}
