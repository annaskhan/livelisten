"use client";

import { useState, useCallback, useEffect } from "react";
import { APP_NAME, APP_TAGLINE, FOCUS_AREAS, STORAGE_KEYS, type FocusAreaId } from "@/lib/constants";
import { setItem } from "@/lib/storage";

interface OnboardingProps {
  onComplete: () => void;
}

const STEPS = ["welcome", "name", "focus", "ready"] as const;
type Step = (typeof STEPS)[number];

function FocusIcon({ icon }: { icon: string }) {
  const icons: Record<string, string> = {
    pray: "\u{1F64F}",
    heart: "\u{2764}\u{FE0F}",
    brain: "\u{1F9E0}",
    briefcase: "\u{1F4BC}",
    users: "\u{1F465}",
    book: "\u{1F4DA}",
    "check-circle": "\u{2705}",
    wallet: "\u{1F4B0}",
  };
  return <span className="text-lg chip-icon" style={{ display: "inline-block", transition: "all 0.3s var(--spring)" }}>{icons[icon] || "\u{2B50}"}</span>;
}

/* ===== Seed-to-Plant Evolution Animation ===== */
function GrowthAnimation() {
  const [phase, setPhase] = useState(0); // 0=seed, 1=pot, 2=watering, 3=sprout, 4=plant

  useEffect(() => {
    const timings = [800, 1600, 2400, 3200];
    const timers = timings.map((ms, i) =>
      setTimeout(() => setPhase(i + 1), ms)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div style={{ width: 120, height: 120, position: "relative", margin: "0 auto 16px" }}>
      <svg width="120" height="120" viewBox="0 0 120 120">
        {/* Ground/soil */}
        <ellipse cx="60" cy="95" rx="40" ry="8" fill="var(--secondary)" opacity="0.2">
          <animate attributeName="rx" values="20;40" dur="0.6s" fill="freeze" />
        </ellipse>

        {/* Pot */}
        <g opacity={phase >= 1 ? 1 : 0} style={{ transition: "opacity 0.4s" }}>
          <path d="M38 70 L42 95 L78 95 L82 70 Z" fill="var(--accent)" stroke="none">
            {phase === 1 && <animate attributeName="d" values="M55 85 L57 95 L63 95 L65 85 Z;M38 70 L42 95 L78 95 L82 70 Z" dur="0.5s" fill="freeze" />}
          </path>
          <rect x="35" y="66" width="50" height="8" rx="3" fill="var(--accent)" opacity="0.8">
            {phase === 1 && <animate attributeName="width" values="10;50" dur="0.5s" fill="freeze" />}
            {phase === 1 && <animate attributeName="x" values="55;35" dur="0.5s" fill="freeze" />}
          </rect>
          {/* Soil in pot */}
          <ellipse cx="60" cy="72" rx="20" ry="4" fill="var(--secondary)" opacity="0.5">
            {phase === 1 && <animate attributeName="rx" values="0;20" dur="0.4s" fill="freeze" begin="0.3s" />}
          </ellipse>
        </g>

        {/* Seed (phase 0) */}
        {phase === 0 && (
          <g>
            <ellipse cx="60" cy="78" rx="6" ry="8" fill="var(--secondary)">
              <animate attributeName="cy" values="40;78" dur="0.6s" fill="freeze" />
              <animate attributeName="opacity" values="0;1" dur="0.3s" fill="freeze" />
            </ellipse>
            <path d="M58 74 Q60 70 62 74" fill="none" stroke="var(--secondary-light)" strokeWidth="1.5">
              <animate attributeName="opacity" values="0;1" dur="0.3s" fill="freeze" begin="0.3s" />
            </path>
          </g>
        )}

        {/* Water drops (phase 2) */}
        {phase >= 2 && (
          <g>
            {/* Watering can silhouette */}
            <g opacity={phase === 2 ? 1 : 0} style={{ transition: "opacity 0.5s" }}>
              <rect x="72" y="30" width="20" height="14" rx="3" fill="var(--primary)" opacity="0.7">
                <animate attributeName="x" values="100;72" dur="0.4s" fill="freeze" />
              </rect>
              <line x1="72" y1="37" x2="66" y2="45" stroke="var(--primary)" strokeWidth="2" opacity="0.7">
                <animate attributeName="x1" values="100;72" dur="0.4s" fill="freeze" />
                <animate attributeName="x2" values="94;66" dur="0.4s" fill="freeze" />
              </line>
            </g>
            {/* Water drops */}
            <circle cx="64" cy="48" r="2" fill="var(--primary-lighter)" opacity="0">
              <animate attributeName="cy" values="48;68" dur="0.6s" repeatCount="3" />
              <animate attributeName="opacity" values="0;0.8;0" dur="0.6s" repeatCount="3" />
            </circle>
            <circle cx="58" cy="50" r="1.5" fill="var(--primary-lighter)" opacity="0">
              <animate attributeName="cy" values="50;70" dur="0.6s" repeatCount="3" begin="0.15s" />
              <animate attributeName="opacity" values="0;0.6;0" dur="0.6s" repeatCount="3" begin="0.15s" />
            </circle>
            <circle cx="68" cy="46" r="1.5" fill="var(--primary-lighter)" opacity="0">
              <animate attributeName="cy" values="46;66" dur="0.6s" repeatCount="3" begin="0.3s" />
              <animate attributeName="opacity" values="0;0.7;0" dur="0.6s" repeatCount="3" begin="0.3s" />
            </circle>
          </g>
        )}

        {/* Sprout (phase 3) */}
        {phase >= 3 && (
          <g>
            {/* Stem */}
            <line x1="60" y1="68" x2="60" y2="45" stroke="var(--success)" strokeWidth="3" strokeLinecap="round">
              <animate attributeName="y2" values="68;45" dur="0.6s" fill="freeze" />
            </line>
            {/* First leaf left */}
            <path d="M60 55 Q50 48 52 58" fill="var(--success)" opacity="0.9">
              <animate attributeName="d" values="M60 55 Q58 54 59 56;M60 55 Q50 48 52 58" dur="0.5s" fill="freeze" begin="0.3s" />
              <animate attributeName="opacity" values="0;0.9" dur="0.3s" fill="freeze" begin="0.3s" />
            </path>
            {/* First leaf right */}
            <path d="M60 52 Q70 44 68 54" fill="var(--success)" opacity="0.9">
              <animate attributeName="d" values="M60 52 Q62 50 61 53;M60 52 Q70 44 68 54" dur="0.5s" fill="freeze" begin="0.5s" />
              <animate attributeName="opacity" values="0;0.9" dur="0.3s" fill="freeze" begin="0.5s" />
            </path>
          </g>
        )}

        {/* Full plant (phase 4) */}
        {phase >= 4 && (
          <g>
            {/* Extended stem */}
            <line x1="60" y1="45" x2="60" y2="28" stroke="var(--success)" strokeWidth="3" strokeLinecap="round">
              <animate attributeName="y2" values="45;28" dur="0.5s" fill="freeze" />
            </line>
            {/* Upper left leaf */}
            <path d="M60 38 Q46 28 50 42" fill="var(--success)" opacity="0">
              <animate attributeName="opacity" values="0;0.85" dur="0.4s" fill="freeze" begin="0.2s" />
            </path>
            {/* Upper right leaf */}
            <path d="M60 34 Q74 24 70 38" fill="var(--success)" opacity="0">
              <animate attributeName="opacity" values="0;0.85" dur="0.4s" fill="freeze" begin="0.4s" />
            </path>
            {/* Flower/bud at top */}
            <circle cx="60" cy="25" r="0" fill="var(--accent)" opacity="0">
              <animate attributeName="r" values="0;6" dur="0.5s" fill="freeze" begin="0.5s" />
              <animate attributeName="opacity" values="0;1" dur="0.3s" fill="freeze" begin="0.5s" />
            </circle>
            <circle cx="60" cy="25" r="0" fill="var(--secondary)" opacity="0">
              <animate attributeName="r" values="0;3" dur="0.4s" fill="freeze" begin="0.7s" />
              <animate attributeName="opacity" values="0;1" dur="0.3s" fill="freeze" begin="0.7s" />
            </circle>
            {/* Sparkles */}
            <circle cx="45" cy="20" r="0" fill="var(--primary)" opacity="0">
              <animate attributeName="r" values="0;2;0" dur="0.8s" fill="freeze" begin="0.8s" />
              <animate attributeName="opacity" values="0;0.8;0" dur="0.8s" fill="freeze" begin="0.8s" />
            </circle>
            <circle cx="78" cy="30" r="0" fill="var(--accent)" opacity="0">
              <animate attributeName="r" values="0;1.5;0" dur="0.8s" fill="freeze" begin="1s" />
              <animate attributeName="opacity" values="0;0.8;0" dur="0.8s" fill="freeze" begin="1s" />
            </circle>
            <circle cx="40" cy="40" r="0" fill="var(--secondary)" opacity="0">
              <animate attributeName="r" values="0;1.5;0" dur="0.8s" fill="freeze" begin="1.1s" />
              <animate attributeName="opacity" values="0;0.7;0" dur="0.8s" fill="freeze" begin="1.1s" />
            </circle>
          </g>
        )}
      </svg>
    </div>
  );
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState<Step>("welcome");
  const [name, setName] = useState("");
  const [focusAreas, setFocusAreas] = useState<FocusAreaId[]>([]);

  const stepIndex = STEPS.indexOf(step);

  const next = useCallback(() => {
    const nextIdx = stepIndex + 1;
    if (nextIdx < STEPS.length) {
      setStep(STEPS[nextIdx]);
    }
  }, [stepIndex]);

  const back = useCallback(() => {
    const prevIdx = stepIndex - 1;
    if (prevIdx >= 0) {
      setStep(STEPS[prevIdx]);
    }
  }, [stepIndex]);

  const toggleFocus = useCallback((id: FocusAreaId) => {
    setFocusAreas((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id],
    );
  }, []);

  const finish = useCallback(() => {
    if (name.trim()) setItem(STORAGE_KEYS.USER_NAME, name.trim());
    if (focusAreas.length > 0) setItem(STORAGE_KEYS.FOCUS_AREAS, focusAreas);
    setItem(STORAGE_KEYS.ONBOARDED, true);
    onComplete();
  }, [name, focusAreas, onComplete]);

  return (
    <div className="onboarding-screen">
      {/* Progress dots */}
      <div className="onboarding-dots">
        {STEPS.map((s, i) => (
          <div
            key={s}
            className={`onboarding-dot ${i === stepIndex ? "active" : ""}`}
          />
        ))}
      </div>

      {/* Step content */}
      <div className="slide-up" key={step} style={{ maxWidth: 400, width: "100%" }}>
        {step === "welcome" && (
          <>
            <GrowthAnimation />
            <h1 className="font-display gradient-text" style={{ fontSize: 40, fontWeight: 600, marginBottom: 8 }}>
              {APP_NAME}
            </h1>
            <p style={{ fontSize: 18, color: "var(--text-dim)", marginBottom: 40, lineHeight: 1.5 }}>
              {APP_TAGLINE}
            </p>
            <p style={{ fontSize: 15, color: "var(--text-secondary)", marginBottom: 48, lineHeight: 1.7, padding: "0 12px" }}>
              Track your goals, journal your journey, and watch yourself grow — one day at a time.
            </p>
            <button className="btn btn-primary" onClick={next} style={{ width: "100%", padding: "16px 24px", fontSize: 16, borderRadius: "var(--radius-lg)" }}>
              Get Started
            </button>
          </>
        )}

        {step === "name" && (
          <>
            <div className="pop-in" style={{ fontSize: 44, marginBottom: 12 }}>{"\u{1F44B}"}</div>
            <h2 className="font-display" style={{ fontSize: 28, fontWeight: 600, marginBottom: 8 }}>
              {"What\u2019s your name?"}
            </h2>
            <p style={{ fontSize: 15, color: "var(--text-dim)", marginBottom: 32 }}>
              {"We\u2019ll use this to personalize your experience."}
            </p>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              autoFocus
              maxLength={50}
              style={{
                width: "100%",
                padding: "16px 20px",
                fontSize: 18,
                fontWeight: 500,
                borderRadius: "var(--radius-lg)",
                border: "2px solid var(--surface-border)",
                background: "var(--bg-card)",
                color: "var(--text)",
                outline: "none",
                marginBottom: 32,
                fontFamily: "var(--font-sans)",
                transition: "all 0.3s var(--smooth)",
                textAlign: "center",
              }}
              onKeyDown={(e) => e.key === "Enter" && name.trim() && next()}
            />
            <div style={{ display: "flex", gap: 12 }}>
              <button className="btn btn-secondary" onClick={back} style={{ flex: 1 }}>
                Back
              </button>
              <button className="btn btn-primary" onClick={next} style={{ flex: 2 }} disabled={!name.trim()}>
                Continue
              </button>
            </div>
          </>
        )}

        {step === "focus" && (
          <>
            <div className="pop-in" style={{ fontSize: 44, marginBottom: 12 }}>{"\u{1F3AF}"}</div>
            <h2 className="font-display" style={{ fontSize: 28, fontWeight: 600, marginBottom: 8 }}>
              What are you working on?
            </h2>
            <p style={{ fontSize: 15, color: "var(--text-dim)", marginBottom: 24 }}>
              Choose areas you want to focus on. You can change these later.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", marginBottom: 32 }}>
              {FOCUS_AREAS.map((area, i) => (
                <button
                  key={area.id}
                  className={`focus-chip ${focusAreas.includes(area.id) ? "selected" : ""}`}
                  onClick={() => toggleFocus(area.id)}
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <FocusIcon icon={area.icon} />
                  {area.label}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button className="btn btn-secondary" onClick={back} style={{ flex: 1 }}>
                Back
              </button>
              <button
                className="btn btn-primary"
                onClick={next}
                style={{ flex: 2 }}
                disabled={focusAreas.length === 0}
              >
                Continue
              </button>
            </div>
          </>
        )}

        {step === "ready" && (
          <>
            <div className="celebrate" style={{ fontSize: 56, marginBottom: 16, display: "inline-block" }}>{"\u{2728}"}</div>
            <h2 className="font-display" style={{ fontSize: 28, fontWeight: 600, marginBottom: 8 }}>
              {"You\u2019re all set, " + (name.trim() || "friend") + "!"}
            </h2>
            <p style={{ fontSize: 15, color: "var(--text-dim)", marginBottom: 16, lineHeight: 1.7 }}>
              Your journey begins now. Set your first goal, write your first journal entry, or just explore.
            </p>
            <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 40 }}>
              Remember: progress, not perfection.
            </p>
            <div style={{ display: "flex", gap: 12 }}>
              <button className="btn btn-secondary" onClick={back} style={{ flex: 1 }}>
                Back
              </button>
              <button className="btn btn-primary" onClick={finish} style={{ flex: 2, fontSize: 16, padding: "16px 24px" }}>
                {"Let\u2019s Go"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
