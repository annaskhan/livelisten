"use client";

import { useState, useEffect } from "react";
import { STORAGE_KEYS } from "@/lib/constants";
import { getItem } from "@/lib/storage";
import ThemeProvider from "./ThemeProvider";
import BottomNav from "./BottomNav";
import Onboarding from "./Onboarding";

function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);
    setOffline(!navigator.onLine);
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
      padding: "8px 12px", background: "rgba(233, 196, 106, 0.15)", color: "var(--warning)",
      fontSize: 13, fontWeight: 500, flexShrink: 0,
    }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="1" y1="1" x2="23" y2="23" /><path d="M16.72 11.06A10.94 10.94 0 0119 12.55" /><path d="M5 12.55a10.94 10.94 0 015.17-2.39" /><path d="M10.71 5.05A16 16 0 0122.56 9" /><path d="M1.42 9a15.91 15.91 0 014.7-2.88" /><path d="M8.53 16.11a6 6 0 016.95 0" /><line x1="12" y1="20" x2="12.01" y2="20" />
      </svg>
      You{"'"}re offline — your data is saved locally
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div style={{ padding: "24px 20px" }}>
      <div style={{ width: 180, height: 14, borderRadius: 4, background: "var(--bg-secondary)", marginBottom: 8 }} />
      <div style={{ width: 240, height: 28, borderRadius: 6, background: "var(--bg-secondary)", marginBottom: 24 }} />
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        {[1, 2, 3].map((i) => (
          <div key={i} style={{ flex: 1, height: 70, borderRadius: "var(--radius-lg)", background: "var(--bg-secondary)" }} />
        ))}
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} style={{ height: 80, borderRadius: "var(--radius-lg)", background: "var(--bg-secondary)", marginBottom: 12 }} />
      ))}
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    setOnboarded(getItem(STORAGE_KEYS.ONBOARDED, false));
  }, []);

  // Loading state with skeleton
  if (onboarded === null) {
    return (
      <ThemeProvider>
        <div className="page-shell">
          <LoadingSkeleton />
        </div>
      </ThemeProvider>
    );
  }

  if (!onboarded) {
    return (
      <ThemeProvider>
        <Onboarding onComplete={() => setOnboarded(true)} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <div className="page-shell">
        <OfflineBanner />
        <div className="page-content">
          {children}
        </div>
        <BottomNav />
      </div>
    </ThemeProvider>
  );
}
