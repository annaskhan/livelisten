"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/constants";
import { useState, useEffect, useCallback } from "react";

function NavIcon({ icon, active, hovered, pressed }: { icon: string; active: boolean; hovered: boolean; pressed: boolean }) {
  const [wasJustActivated, setWasJustActivated] = useState(false);

  useEffect(() => {
    if (active) {
      setWasJustActivated(true);
      const t = setTimeout(() => setWasJustActivated(false), 600);
      return () => clearTimeout(t);
    }
  }, [active]);

  const activeColor = "var(--primary)";
  const hoverColor = "var(--primary-light)";
  const baseColor = active ? activeColor : hovered ? hoverColor : "var(--text-muted)";
  const fillColor = active ? "var(--primary-glow)" : hovered ? "rgba(108, 60, 224, 0.06)" : "none";
  const strokeW = active ? 2.3 : hovered ? 2.1 : 1.8;

  const getScale = () => {
    if (pressed) return "scale(0.8)";
    if (wasJustActivated) return "scale(1.25)";
    if (hovered && !active) return "scale(1.15)";
    return "scale(1)";
  };

  const wrapperStyle: React.CSSProperties = {
    transition: pressed ? "all 0.1s ease" : "all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)",
    transform: getScale(),
    filter: active
      ? "drop-shadow(0 0 8px rgba(108, 60, 224, 0.3))"
      : hovered
        ? "drop-shadow(0 0 4px rgba(108, 60, 224, 0.15))"
        : "none",
  };

  switch (icon) {
    case "home":
      return (
        <div className="nav-icon-wrapper" style={wrapperStyle}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill={fillColor} stroke={baseColor} strokeWidth={strokeW} strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z">
              {hovered && !active && (
                <animate attributeName="d" values="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z;M3 8l9-6 9 6v12a2 2 0 01-2 2H5a2 2 0 01-2-2z;M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" dur="0.6s" repeatCount="1" />
              )}
            </path>
            <polyline points="9 22 9 12 15 12 15 22" />
            {(active || hovered) && (
              <circle cx="12" cy="8" r={active ? 1.5 : 1} fill="var(--accent)" stroke="none">
                <animate attributeName="opacity" values="0.6;1;0.6" dur={active ? "2s" : "1s"} repeatCount="indefinite" />
                {active && <animate attributeName="r" values="1.5;2.2;1.5" dur="2s" repeatCount="indefinite" />}
              </circle>
            )}
            {hovered && !active && (
              <path d="M8 15h8" stroke="var(--accent)" strokeWidth="1.5" fill="none" opacity="0.5">
                <animate attributeName="opacity" values="0;0.6;0" dur="0.8s" repeatCount="1" />
              </path>
            )}
          </svg>
        </div>
      );
    case "target":
      return (
        <div className="nav-icon-wrapper" style={wrapperStyle}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={baseColor} strokeWidth={strokeW} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10">
              {hovered && !active && (
                <animate attributeName="r" values="10;10.8;10" dur="0.5s" repeatCount="1" />
              )}
              {active && (
                <animate attributeName="stroke-opacity" values="1;0.6;1" dur="2s" repeatCount="indefinite" />
              )}
            </circle>
            <circle cx="12" cy="12" r="6">
              {hovered && !active && (
                <animate attributeName="r" values="6;5;6" dur="0.5s" repeatCount="1" />
              )}
            </circle>
            <circle cx="12" cy="12" r="2" fill={active ? "var(--accent)" : hovered ? "var(--primary-lighter)" : "none"} stroke={active ? "var(--accent)" : baseColor}>
              {active && <animate attributeName="r" values="2;3;2" dur="1.5s" repeatCount="indefinite" />}
              {hovered && !active && <animate attributeName="r" values="2;3.5;2" dur="0.6s" repeatCount="1" />}
            </circle>
            {hovered && !active && (
              <>
                <line x1="12" y1="2" x2="12" y2="5" stroke="var(--accent)" strokeWidth="1.5" opacity="0">
                  <animate attributeName="opacity" values="0;0.7;0" dur="0.6s" repeatCount="1" />
                </line>
                <line x1="22" y1="12" x2="19" y2="12" stroke="var(--accent)" strokeWidth="1.5" opacity="0">
                  <animate attributeName="opacity" values="0;0.7;0" dur="0.6s" repeatCount="1" begin="0.1s" />
                </line>
                <line x1="12" y1="22" x2="12" y2="19" stroke="var(--accent)" strokeWidth="1.5" opacity="0">
                  <animate attributeName="opacity" values="0;0.7;0" dur="0.6s" repeatCount="1" begin="0.2s" />
                </line>
                <line x1="2" y1="12" x2="5" y2="12" stroke="var(--accent)" strokeWidth="1.5" opacity="0">
                  <animate attributeName="opacity" values="0;0.7;0" dur="0.6s" repeatCount="1" begin="0.3s" />
                </line>
              </>
            )}
          </svg>
        </div>
      );
    case "pen":
      return (
        <div className="nav-icon-wrapper" style={wrapperStyle}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={baseColor} strokeWidth={strokeW} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" fill={fillColor}>
              {hovered && !active && (
                <animate attributeName="fill-opacity" values="0;0.15;0.08" dur="0.4s" fill="freeze" repeatCount="1" />
              )}
            </path>
            {(active || hovered) && (
              <line x1="4" y1="20" x2="8" y2="20" stroke="var(--accent)" strokeWidth="2">
                <animate attributeName="x2" values="4;11;4" dur={active ? "2s" : "0.8s"} repeatCount={active ? "indefinite" : "1"} />
                <animate attributeName="opacity" values="0.4;1;0.4" dur={active ? "2s" : "0.8s"} repeatCount={active ? "indefinite" : "1"} />
              </line>
            )}
            {hovered && !active && (
              <>
                <circle cx="18" cy="4" r="0.8" fill="var(--accent)" opacity="0">
                  <animate attributeName="opacity" values="0;1;0" dur="0.5s" repeatCount="1" />
                  <animate attributeName="r" values="0;1.5;0" dur="0.5s" repeatCount="1" />
                </circle>
              </>
            )}
          </svg>
        </div>
      );
    case "chart":
      return (
        <div className="nav-icon-wrapper" style={wrapperStyle}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" strokeWidth={strokeW} strokeLinecap="round" strokeLinejoin="round">
            {active ? (
              <>
                <line x1="6" y1="20" x2="6" y2="14" stroke="var(--accent)" strokeWidth="2.5">
                  <animate attributeName="y2" values="14;11;14" dur="1.5s" repeatCount="indefinite" />
                </line>
                <line x1="12" y1="20" x2="12" y2="4" stroke={baseColor} strokeWidth="2.5">
                  <animate attributeName="y2" values="4;7;4" dur="2s" repeatCount="indefinite" />
                </line>
                <line x1="18" y1="20" x2="18" y2="10" stroke="var(--secondary)" strokeWidth="2.5">
                  <animate attributeName="y2" values="10;6;10" dur="1.8s" repeatCount="indefinite" />
                </line>
              </>
            ) : hovered ? (
              <>
                <line x1="6" y1="20" x2="6" y2="14" stroke="var(--accent)" strokeWidth="2.2">
                  <animate attributeName="y2" values="20;14" dur="0.3s" fill="freeze" />
                </line>
                <line x1="12" y1="20" x2="12" y2="4" stroke={baseColor} strokeWidth="2.2">
                  <animate attributeName="y2" values="20;4" dur="0.4s" fill="freeze" />
                </line>
                <line x1="18" y1="20" x2="18" y2="10" stroke="var(--secondary)" strokeWidth="2.2">
                  <animate attributeName="y2" values="20;10" dur="0.35s" fill="freeze" />
                </line>
              </>
            ) : (
              <>
                <line x1="6" y1="20" x2="6" y2="14" stroke={baseColor} />
                <line x1="12" y1="20" x2="12" y2="4" stroke={baseColor} />
                <line x1="18" y1="20" x2="18" y2="10" stroke={baseColor} />
              </>
            )}
          </svg>
        </div>
      );
    default:
      return null;
  }
}

export default function BottomNav() {
  const pathname = usePathname();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [pressedId, setPressedId] = useState<string | null>(null);

  const handlePointerDown = useCallback((id: string) => {
    setPressedId(id);
  }, []);

  const handlePointerUp = useCallback(() => {
    setPressedId(null);
  }, []);

  useEffect(() => {
    window.addEventListener("pointerup", handlePointerUp);
    return () => window.removeEventListener("pointerup", handlePointerUp);
  }, [handlePointerUp]);

  return (
    <nav className="bottom-nav safe-area-bottom" role="navigation" aria-label="Main navigation">
      {NAV_ITEMS.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        const hovered = hoveredId === item.id;
        const pressed = pressedId === item.id;
        return (
          <Link
            key={item.id}
            href={item.href}
            className={`nav-item ${active ? "active" : ""}`}
            aria-current={active ? "page" : undefined}
            onMouseEnter={() => setHoveredId(item.id)}
            onMouseLeave={() => setHoveredId(null)}
            onPointerDown={() => handlePointerDown(item.id)}
          >
            <NavIcon icon={item.icon} active={active} hovered={hovered} pressed={pressed} />
            <span style={{
              transition: pressed ? "all 0.1s ease" : "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
              fontWeight: active ? 700 : hovered ? 600 : 500,
              fontSize: active ? 11.5 : 11,
              letterSpacing: active ? "0.02em" : "normal",
              color: active ? undefined : hovered ? "var(--primary-light)" : undefined,
              background: active ? "var(--gradient-primary)" : "none",
              WebkitBackgroundClip: active ? "text" : undefined,
              WebkitTextFillColor: active ? "transparent" : undefined,
              backgroundClip: active ? "text" : undefined,
              display: "inline-block",
              transform: pressed ? "scale(0.85)" : hovered && !active ? "translateY(-1px)" : "none",
            }}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
