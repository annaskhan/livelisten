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
    const timings = [1200, 2400, 3600, 4800];
    const timers = timings.map((ms, i) =>
      setTimeout(() => setPhase(i + 1), ms)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div style={{ width: 220, height: 240, position: "relative", margin: "0 auto 16px" }}>
      <svg width="220" height="240" viewBox="0 0 260 280">
        {/* Ground/soil shadow */}
        <ellipse cx="130" cy="248" rx="70" ry="12" fill="var(--secondary)" opacity="0.15">
          <animate attributeName="rx" values="30;70" dur="0.8s" fill="freeze" />
        </ellipse>

        {/* Pot */}
        <g opacity={phase >= 1 ? 1 : 0} style={{ transition: "opacity 0.5s" }}>
          {/* Pot body */}
          <path d="M72 185 L82 242 L178 242 L188 185 Z" fill="var(--accent)" stroke="none">
            {phase === 1 && <animate attributeName="d" values="M120 230 L122 242 L138 242 L140 230 Z;M72 185 L82 242 L178 242 L188 185 Z" dur="0.6s" fill="freeze" />}
          </path>
          {/* Pot rim */}
          <rect x="64" y="176" width="132" height="14" rx="5" fill="var(--accent)" opacity="0.85">
            {phase === 1 && <animate attributeName="width" values="20;132" dur="0.6s" fill="freeze" />}
            {phase === 1 && <animate attributeName="x" values="120;64" dur="0.6s" fill="freeze" />}
          </rect>
          {/* Pot highlight */}
          <path d="M84 192 L90 236 L102 236 L96 192 Z" fill="rgba(255,255,255,0.12)" opacity={phase >= 1 ? 1 : 0}>
            {phase === 1 && <animate attributeName="opacity" values="0;1" dur="0.4s" fill="freeze" begin="0.4s" />}
          </path>
          {/* Soil in pot */}
          <ellipse cx="130" cy="184" rx="50" ry="8" fill="#8B6914" opacity="0.6">
            {phase === 1 && <animate attributeName="rx" values="0;50" dur="0.5s" fill="freeze" begin="0.3s" />}
          </ellipse>
          {/* Soil texture */}
          <circle cx="112" cy="184" r="2.5" fill="#6B4F10" opacity={phase >= 1 ? 0.4 : 0} />
          <circle cx="142" cy="183" r="2" fill="#6B4F10" opacity={phase >= 1 ? 0.3 : 0} />
          <circle cx="124" cy="186" r="1.5" fill="#6B4F10" opacity={phase >= 1 ? 0.35 : 0} />
        </g>

        {/* Seed (phase 0) */}
        {phase === 0 && (
          <g>
            <ellipse cx="130" cy="195" rx="11" ry="15" fill="var(--secondary)">
              <animate attributeName="cy" values="80;195" dur="0.7s" fill="freeze" />
              <animate attributeName="opacity" values="0;1" dur="0.4s" fill="freeze" />
            </ellipse>
            <path d="M127 184 Q130 178 133 184" fill="none" stroke="var(--secondary-light)" strokeWidth="1.5" opacity="0">
              <animate attributeName="opacity" values="0;0.8" dur="0.3s" fill="freeze" begin="0.4s" />
            </path>
            <path d="M125 194 Q130 206 135 194" fill="none" stroke="rgba(0,0,0,0.1)" strokeWidth="1" opacity="0">
              <animate attributeName="opacity" values="0;1" dur="0.3s" fill="freeze" begin="0.5s" />
            </path>
          </g>
        )}

        {/* Water drops (phase 2) */}
        {phase >= 2 && (
          <g>
            {/* Watering can */}
            <g opacity={phase === 2 ? 1 : 0} style={{ transition: "opacity 0.6s" }}>
              <rect x="160" y="70" width="40" height="26" rx="5" fill="var(--primary)" opacity="0.75">
                <animate attributeName="x" values="240;160" dur="0.5s" fill="freeze" />
              </rect>
              <path d="M180 70 Q185 56 190 70" fill="none" stroke="var(--primary)" strokeWidth="3" opacity="0.6">
                <animate attributeName="d" values="M260 70 Q265 56 270 70;M180 70 Q185 56 190 70" dur="0.5s" fill="freeze" />
              </path>
              <line x1="160" y1="86" x2="144" y2="108" stroke="var(--primary)" strokeWidth="3" opacity="0.7">
                <animate attributeName="x1" values="240;160" dur="0.5s" fill="freeze" />
                <animate attributeName="x2" values="224;144" dur="0.5s" fill="freeze" />
              </line>
            </g>
            {/* Smooth flowing water stream */}
            <path d="M144 108 Q140 140 136 174" fill="none" stroke="var(--primary-lighter)" strokeWidth="2.5" strokeLinecap="round" opacity="0">
              <animate attributeName="opacity" values="0;0.6;0.6;0" dur="1.8s" fill="freeze" />
              <animate attributeName="stroke-dasharray" values="0 80;40 40;80 0" dur="1.8s" fill="freeze" />
            </path>
            <path d="M140 110 Q136 142 132 176" fill="none" stroke="var(--primary-lighter)" strokeWidth="2" strokeLinecap="round" opacity="0">
              <animate attributeName="opacity" values="0;0.5;0.5;0" dur="1.8s" fill="freeze" begin="0.15s" />
              <animate attributeName="stroke-dasharray" values="0 80;35 45;80 0" dur="1.8s" fill="freeze" begin="0.15s" />
            </path>
            <path d="M148 106 Q144 138 138 170" fill="none" stroke="var(--primary-lighter)" strokeWidth="1.5" strokeLinecap="round" opacity="0">
              <animate attributeName="opacity" values="0;0.4;0.4;0" dur="1.8s" fill="freeze" begin="0.3s" />
              <animate attributeName="stroke-dasharray" values="0 80;30 50;80 0" dur="1.8s" fill="freeze" begin="0.3s" />
            </path>
            {/* Small splash at soil */}
            <ellipse cx="134" cy="178" rx="0" ry="0" fill="var(--primary-lighter)" opacity="0">
              <animate attributeName="rx" values="0;8;12;0" dur="1s" fill="freeze" begin="0.6s" />
              <animate attributeName="ry" values="0;2;3;0" dur="1s" fill="freeze" begin="0.6s" />
              <animate attributeName="opacity" values="0;0.4;0.2;0" dur="1s" fill="freeze" begin="0.6s" />
            </ellipse>
          </g>
        )}

        {/* Sprout (phase 3) */}
        {phase >= 3 && (
          <g>
            {/* Main stem */}
            <line x1="130" y1="178" x2="130" y2="105" stroke="#2d8a4e" strokeWidth="5" strokeLinecap="round">
              <animate attributeName="y2" values="178;105" dur="0.8s" fill="freeze" />
            </line>
            <line x1="130" y1="178" x2="130" y2="105" stroke="#3ca85e" strokeWidth="2.5" strokeLinecap="round" opacity="0.4">
              <animate attributeName="y2" values="178;105" dur="0.8s" fill="freeze" />
            </line>
            {/* Left leaf */}
            <path d="M130 140 Q100 118 108 148" fill="#3ca85e" opacity="0">
              <animate attributeName="d" values="M130 140 Q128 138 129 141;M130 140 Q100 118 108 148" dur="0.6s" fill="freeze" begin="0.4s" />
              <animate attributeName="opacity" values="0;0.95" dur="0.4s" fill="freeze" begin="0.4s" />
            </path>
            <path d="M127 138 Q114 128 110 145" fill="none" stroke="#2d8a4e" strokeWidth="1" opacity="0">
              <animate attributeName="opacity" values="0;0.5" dur="0.3s" fill="freeze" begin="0.7s" />
            </path>
            {/* Right leaf */}
            <path d="M130 128 Q160 106 154 136" fill="#3ca85e" opacity="0">
              <animate attributeName="d" values="M130 128 Q132 126 131 129;M130 128 Q160 106 154 136" dur="0.6s" fill="freeze" begin="0.6s" />
              <animate attributeName="opacity" values="0;0.95" dur="0.4s" fill="freeze" begin="0.6s" />
            </path>
            <path d="M133 126 Q148 114 152 134" fill="none" stroke="#2d8a4e" strokeWidth="1" opacity="0">
              <animate attributeName="opacity" values="0;0.5" dur="0.3s" fill="freeze" begin="0.9s" />
            </path>
          </g>
        )}

        {/* Full plant with flower (phase 4) */}
        {phase >= 4 && (
          <g>
            {/* Extended stem */}
            <line x1="130" y1="105" x2="130" y2="55" stroke="#2d8a4e" strokeWidth="5" strokeLinecap="round">
              <animate attributeName="y2" values="105;55" dur="0.7s" fill="freeze" />
            </line>
            <line x1="130" y1="105" x2="130" y2="55" stroke="#3ca85e" strokeWidth="2.5" strokeLinecap="round" opacity="0.4">
              <animate attributeName="y2" values="105;55" dur="0.7s" fill="freeze" />
            </line>

            {/* Upper left leaf */}
            <path d="M130 90 Q96 68 106 98" fill="#3ca85e" opacity="0">
              <animate attributeName="opacity" values="0;0.9" dur="0.5s" fill="freeze" begin="0.3s" />
            </path>
            <path d="M127 88 Q108 76 108 96" fill="none" stroke="#2d8a4e" strokeWidth="1" opacity="0">
              <animate attributeName="opacity" values="0;0.4" dur="0.3s" fill="freeze" begin="0.5s" />
            </path>

            {/* Upper right leaf */}
            <path d="M130 76 Q166 52 158 84" fill="#3ca85e" opacity="0">
              <animate attributeName="opacity" values="0;0.9" dur="0.5s" fill="freeze" begin="0.5s" />
            </path>
            <path d="M133 74 Q154 60 156 82" fill="none" stroke="#2d8a4e" strokeWidth="1" opacity="0">
              <animate attributeName="opacity" values="0;0.4" dur="0.3s" fill="freeze" begin="0.7s" />
            </path>

            {/* Flower — large multi-petal bloom */}
            <g opacity="0">
              <animate attributeName="opacity" values="0;1" dur="0.6s" fill="freeze" begin="0.7s" />
              {/* Top petal */}
              <ellipse cx="130" cy="28" rx="12" ry="18" fill="var(--accent)" opacity="0.9">
                <animate attributeName="ry" values="0;18" dur="0.5s" fill="freeze" begin="0.7s" />
              </ellipse>
              {/* Top-left petal */}
              <ellipse cx="114" cy="38" rx="11" ry="17" fill="var(--accent)" opacity="0.85" transform="rotate(-40 114 38)">
                <animate attributeName="ry" values="0;17" dur="0.5s" fill="freeze" begin="0.8s" />
              </ellipse>
              {/* Top-right petal */}
              <ellipse cx="146" cy="38" rx="11" ry="17" fill="var(--accent)" opacity="0.85" transform="rotate(40 146 38)">
                <animate attributeName="ry" values="0;17" dur="0.5s" fill="freeze" begin="0.85s" />
              </ellipse>
              {/* Left petal */}
              <ellipse cx="110" cy="54" rx="10" ry="15" fill="var(--accent)" opacity="0.75" transform="rotate(-75 110 54)">
                <animate attributeName="ry" values="0;15" dur="0.5s" fill="freeze" begin="0.9s" />
              </ellipse>
              {/* Right petal */}
              <ellipse cx="150" cy="54" rx="10" ry="15" fill="var(--accent)" opacity="0.75" transform="rotate(75 150 54)">
                <animate attributeName="ry" values="0;15" dur="0.5s" fill="freeze" begin="0.95s" />
              </ellipse>
              {/* Flower center */}
              <circle cx="130" cy="46" r="0" fill="var(--secondary)">
                <animate attributeName="r" values="0;10" dur="0.5s" fill="freeze" begin="1s" />
              </circle>
              <circle cx="130" cy="46" r="0" fill="var(--secondary-light)" opacity="0.6">
                <animate attributeName="r" values="0;5" dur="0.4s" fill="freeze" begin="1.1s" />
              </circle>
            </g>

            {/* Sparkles */}
            <circle cx="80" cy="22" r="0" fill="var(--primary)">
              <animate attributeName="r" values="0;4;0" dur="1s" fill="freeze" begin="1.2s" />
              <animate attributeName="opacity" values="0;0.9;0" dur="1s" fill="freeze" begin="1.2s" />
            </circle>
            <circle cx="185" cy="50" r="0" fill="var(--accent)">
              <animate attributeName="r" values="0;3.5;0" dur="1s" fill="freeze" begin="1.4s" />
              <animate attributeName="opacity" values="0;0.8;0" dur="1s" fill="freeze" begin="1.4s" />
            </circle>
            <circle cx="70" cy="70" r="0" fill="var(--secondary)">
              <animate attributeName="r" values="0;3;0" dur="1s" fill="freeze" begin="1.5s" />
              <animate attributeName="opacity" values="0;0.7;0" dur="1s" fill="freeze" begin="1.5s" />
            </circle>
            <circle cx="178" cy="20" r="0" fill="var(--primary-lighter)">
              <animate attributeName="r" values="0;3;0" dur="0.9s" fill="freeze" begin="1.3s" />
              <animate attributeName="opacity" values="0;0.8;0" dur="0.9s" fill="freeze" begin="1.3s" />
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
            <h1 className="gradient-text" style={{ fontSize: 38, fontWeight: 700, marginBottom: 8, letterSpacing: "0.04em", textTransform: "uppercase", fontFamily: "var(--font-sans)" }}>
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
