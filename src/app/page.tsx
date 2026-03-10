"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface LangOption {
  code: string;
  label: string;
  speechCode: string;
}

const LANGUAGES: LangOption[] = [
  { code: "Arabic", label: "Arabic", speechCode: "ar-SA" },
  { code: "English", label: "English", speechCode: "en-US" },
  { code: "French", label: "Fran\u00e7ais", speechCode: "fr-FR" },
  { code: "Spanish", label: "Espa\u00f1ol", speechCode: "es-ES" },
  { code: "Urdu", label: "Urdu", speechCode: "ur-PK" },
  { code: "Turkish", label: "T\u00fcrk\u00e7e", speechCode: "tr-TR" },
  { code: "Malay", label: "Bahasa Melayu", speechCode: "ms-MY" },
  { code: "Indonesian", label: "Indonesian", speechCode: "id-ID" },
  { code: "Bengali", label: "Bengali", speechCode: "bn-BD" },
  { code: "Somali", label: "Soomaali", speechCode: "so-SO" },
];

const isRTL = (code: string) => code === "Arabic" || code === "Urdu";

// Format seconds to mm:ss
function formatTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// Count words across languages (rough split)
function wordCount(text: string) {
  if (!text.trim()) return 0;
  return text.trim().split(/\s+/).length;
}

// --- Audio Visualizer Hook ---
function useAudioVisualizer(isListening: boolean) {
  const [levels, setLevels] = useState<number[]>(new Array(24).fill(0));
  const animRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!isListening) {
      // Decay bars to zero
      setLevels(new Array(24).fill(0));
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (ctxRef.current) {
        ctxRef.current.close();
        ctxRef.current = null;
      }
      analyserRef.current = null;
      if (animRef.current) cancelAnimationFrame(animRef.current);
      return;
    }

    let cancelled = false;

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        const ctx = new AudioContext();
        ctxRef.current = ctx;
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        analyser.smoothingTimeConstant = 0.75;
        source.connect(analyser);
        analyserRef.current = analyser;

        const data = new Uint8Array(analyser.frequencyBinCount);

        function tick() {
          if (cancelled) return;
          analyser.getByteFrequencyData(data);
          // Map to 24 bars
          const bars: number[] = [];
          const binCount = data.length;
          for (let i = 0; i < 24; i++) {
            const idx = Math.floor((i / 24) * binCount);
            bars.push(data[idx] / 255);
          }
          setLevels(bars);
          animRef.current = requestAnimationFrame(tick);
        }
        tick();
      } catch {
        // mic access denied — fall back to silent
      }
    }

    start();

    return () => {
      cancelled = true;
      if (animRef.current) cancelAnimationFrame(animRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      if (ctxRef.current) ctxRef.current.close();
    };
  }, [isListening]);

  return levels;
}

// --- Component ---
export default function LiveListen() {
  const [isListening, setIsListening] = useState(false);
  const [fullOriginal, setFullOriginal] = useState("");
  const [fullTranslation, setFullTranslation] = useState("");
  const [currentPartial, setCurrentPartial] = useState("");
  const [streamingTranslation, setStreamingTranslation] = useState("");
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [sourceLang, setSourceLang] = useState<LangOption>(LANGUAGES[0]);
  const [targetLang, setTargetLang] = useState<LangOption>(LANGUAGES[1]);
  const [error, setError] = useState<string | null>(null);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>("");
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [elapsed, setElapsed] = useState(0);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const leftPanelRef = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);
  const pendingTextRef = useRef("");
  const isListeningRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const interimTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastInterimRef = useRef("");
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const audioLevels = useAudioVisualizer(isListening);

  useEffect(() => { isListeningRef.current = isListening; }, [isListening]);

  // Elapsed timer
  useEffect(() => {
    if (isListening) {
      setElapsed(0);
      elapsedRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } else {
      if (elapsedRef.current) { clearInterval(elapsedRef.current); elapsedRef.current = null; }
    }
    return () => { if (elapsedRef.current) clearInterval(elapsedRef.current); };
  }, [isListening]);

  useEffect(() => {
    const loadVoices = () => {
      const v = speechSynthesis.getVoices();
      if (v.length > 0) setAvailableVoices(v);
    };
    loadVoices();
    speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => speechSynthesis.removeEventListener("voiceschanged", loadVoices);
  }, []);

  useEffect(() => {
    if (leftPanelRef.current) leftPanelRef.current.scrollTop = leftPanelRef.current.scrollHeight;
    if (rightPanelRef.current) rightPanelRef.current.scrollTop = rightPanelRef.current.scrollHeight;
  }, [fullOriginal, fullTranslation, currentPartial, streamingTranslation]);

  const getBestVoice = useCallback((): SpeechSynthesisVoice | null => {
    const voices = speechSynthesis.getVoices();
    if (!voices.length) return null;
    if (selectedVoiceURI) {
      const s = voices.find((v) => v.voiceURI === selectedVoiceURI);
      if (s) return s;
    }
    const lc = targetLang.speechCode.split("-")[0];
    const lv = voices.filter((v) => v.lang.startsWith(lc));
    if (!lv.length) return null;
    const p = lv.find((v) => /natural|premium|enhanced|neural/i.test(v.name));
    if (p) return p;
    return lv[0];
  }, [targetLang.speechCode, selectedVoiceURI]);

  const speak = useCallback((text: string) => {
    if (!voiceEnabled || !text) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = targetLang.speechCode;
    u.rate = 0.85; u.pitch = 0.95; u.volume = 0.9;
    const v = getBestVoice();
    if (v) u.voice = v;
    speechSynthesis.speak(u);
  }, [voiceEnabled, targetLang.speechCode, getBestVoice]);

  const translateText = useCallback(async (text: string, isInterim = false) => {
    if (!text.trim()) return;

    if (isInterim && abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    if (isInterim) abortRef.current = controller;

    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, sourceLang: sourceLang.code, targetLang: targetLang.code, stream: true }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const data = await res.json();
        if (data.error) setError(data.error);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) return;
      const decoder = new TextDecoder();
      let result = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        result += decoder.decode(value, { stream: true });
        setStreamingTranslation(result);
      }

      if (!isInterim) {
        setFullOriginal((prev) => prev + (prev ? " " : "") + text);
        setFullTranslation((prev) => prev + (prev ? " " : "") + result);
        setStreamingTranslation("");
        setCurrentPartial("");
        speak(result);
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      console.error(e);
      if (!isInterim) setError("Translation service error");
    } finally {
      if (isInterim) abortRef.current = null;
    }
  }, [sourceLang.code, targetLang.code, speak]);

  const startListening = useCallback(() => {
    setError(null);
    setFullOriginal("");
    setFullTranslation("");
    setStreamingTranslation("");
    setCurrentPartial("");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setError("Speech recognition not supported. Try Chrome or Safari."); return; }

    const recognition = new SR();
    recognition.lang = sourceLang.speechCode;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) {
          const t = r[0].transcript.trim();
          if (t) {
            pendingTextRef.current += (pendingTextRef.current ? " " : "") + t;
            // Clear interim timer — final text arrived
            if (interimTimerRef.current) { clearTimeout(interimTimerRef.current); interimTimerRef.current = null; }
            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = setTimeout(() => {
              if (pendingTextRef.current.trim()) {
                const txt = pendingTextRef.current;
                pendingTextRef.current = "";
                translateText(txt, false);
              }
            }, 500);
          }
        } else {
          interim += r[0].transcript;
        }
      }

      const full = [pendingTextRef.current, interim].filter(Boolean).join(" ");
      if (full) setCurrentPartial(full);

      // Smart interim translation — only if enough text and no recent final
      const combined = [pendingTextRef.current, interim].filter(Boolean).join(" ");
      if (combined.trim().length > 10 && combined !== lastInterimRef.current) {
        lastInterimRef.current = combined;
        if (interimTimerRef.current) clearTimeout(interimTimerRef.current);
        interimTimerRef.current = setTimeout(() => {
          translateText(combined, true);
        }, 600);
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      if (event.error === "no-speech" || event.error === "aborted") return;
      setError(`Microphone error: ${event.error}`);
    };

    recognition.onend = () => {
      if (isListeningRef.current) {
        try { recognition.start(); } catch { /* */ }
      }
    };

    recognitionRef.current = recognition;
    try { recognition.start(); setIsListening(true); }
    catch { setError("Could not start microphone."); }
  }, [sourceLang.speechCode, translateText]);

  const stopListening = useCallback(() => {
    setIsListening(false);
    if (debounceTimerRef.current) { clearTimeout(debounceTimerRef.current); debounceTimerRef.current = null; }
    if (interimTimerRef.current) { clearTimeout(interimTimerRef.current); interimTimerRef.current = null; }
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }
    if (recognitionRef.current) { recognitionRef.current.onend = null; recognitionRef.current.abort(); recognitionRef.current = null; }
    speechSynthesis.cancel();
    if (pendingTextRef.current.trim()) {
      const rem = pendingTextRef.current;
      pendingTextRef.current = "";
      translateText(rem, false);
    }
  }, [translateText]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) { recognitionRef.current.onend = null; recognitionRef.current.abort(); }
      speechSynthesis.cancel();
    };
  }, []);

  const sourceIsRTL = isRTL(sourceLang.code);
  const targetIsRTL = isRTL(targetLang.code);

  const displayOriginal = fullOriginal + (currentPartial ? (fullOriginal ? " " : "") + currentPartial : "");
  const displayTranslation = fullTranslation + (streamingTranslation ? (fullTranslation ? " " : "") + streamingTranslation : "");

  const origWords = wordCount(displayOriginal);
  const transWords = wordCount(displayTranslation);

  return (
    <div className="h-dvh flex flex-col relative overflow-hidden" style={{ background: "var(--bg)" }}>
      {/* Ambient floating orbs — only visible while listening */}
      {isListening && (
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="ambient-orb ambient-orb-1" />
          <div className="ambient-orb ambient-orb-2" />
          <div className="ambient-orb ambient-orb-3" />
        </div>
      )}

      {/* Header */}
      <header className="flex items-center justify-between px-5 py-3 shrink-0 relative z-10" style={{ borderBottom: "1px solid var(--surface-border)" }}>
        <h1 className="text-lg font-bold tracking-tight gradient-text">LiveListen</h1>
        <div className="flex items-center gap-2">
          {/* Live stats */}
          {isListening && (
            <div className="flex items-center gap-2 mr-2">
              <span className="elapsed-timer stat-badge">{formatTime(elapsed)}</span>
            </div>
          )}
          <button onClick={() => setVoiceEnabled(!voiceEnabled)}
            className="p-2 rounded-xl transition-all"
            style={{
              background: voiceEnabled ? "rgba(139, 156, 247, 0.15)" : "rgba(139, 144, 160, 0.08)",
              color: voiceEnabled ? "var(--accent)" : "var(--text-muted)",
              border: voiceEnabled ? "1px solid rgba(139, 156, 247, 0.25)" : "1px solid transparent",
            }}
            title={voiceEnabled ? "Voice on" : "Voice off"}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {voiceEnabled ? (
                <><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" /></>
              ) : (
                <><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" /></>
              )}
            </svg>
          </button>
          <button onClick={() => setShowSettings(true)}
            className="p-2 rounded-xl transition-all"
            style={{ background: "rgba(139, 144, 160, 0.08)", color: "var(--text-muted)", border: "1px solid transparent" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>
      </header>

      {/* Error */}
      {error && (
        <div className="mx-4 mt-2 px-4 py-2.5 rounded-xl text-sm shrink-0 flex items-center justify-between relative z-10"
          style={{ background: "rgba(217, 112, 135, 0.1)", color: "var(--danger)", border: "1px solid rgba(217, 112, 135, 0.2)" }}>
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-3 opacity-70 hover:opacity-100 text-lg leading-none">&times;</button>
        </div>
      )}

      {/* Split screen */}
      <div className="flex-1 flex min-h-0 relative z-10">
        {/* LEFT: Translation */}
        <div className={`flex-1 flex flex-col min-h-0 ${isListening ? "panel-breathing" : ""}`}>
          <div className="px-4 py-2 shrink-0 flex items-center justify-between" style={{ borderBottom: "1px solid var(--surface-border)" }}>
            <span className="lang-pill">{targetLang.label}</span>
            <div className="flex items-center gap-2">
              {transWords > 0 && <span className="stat-badge">{transWords} words</span>}
              {isListening && streamingTranslation && (
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 rounded-full pulse-ring" style={{ background: "var(--accent)" }} />
                  <div className="w-1.5 h-1.5 rounded-full pulse-ring" style={{ background: "var(--accent)", animationDelay: "0.15s" }} />
                  <div className="w-1.5 h-1.5 rounded-full pulse-ring" style={{ background: "var(--accent)", animationDelay: "0.3s" }} />
                </div>
              )}
            </div>
          </div>
          <div ref={leftPanelRef} className="flex-1 overflow-y-auto px-5 py-4" style={{ direction: targetIsRTL ? "rtl" : "ltr" }}>
            {!isListening && !displayTranslation && (
              <div className="flex flex-col items-center justify-center h-full gap-4" style={{ color: "var(--text-muted)" }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4 }}>
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
                </svg>
                <p className="text-sm text-center">Translation will appear here</p>
              </div>
            )}
            {isListening && !displayTranslation && (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <div className="visualizer-container">
                  {audioLevels.slice(0, 12).map((l, i) => (
                    <div key={i} className="viz-bar" style={{ height: `${Math.max(2, l * 36)}px` }} />
                  ))}
                </div>
                <p className="text-sm" style={{ color: "var(--accent)" }}>Waiting for speech...</p>
              </div>
            )}
            {displayTranslation && (
              <p className={`text-base leading-[1.9] font-medium ${streamingTranslation ? "streaming-cursor" : ""}`}
                style={{ color: "var(--text)" }}>
                {displayTranslation}
              </p>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="panel-divider shrink-0" />

        {/* RIGHT: Original */}
        <div className={`flex-1 flex flex-col min-h-0 ${isListening ? "panel-breathing" : ""}`}>
          <div className="px-4 py-2 shrink-0 flex items-center justify-between" style={{ borderBottom: "1px solid var(--surface-border)" }}>
            <span className="lang-pill">{sourceLang.label}</span>
            <div className="flex items-center gap-2">
              {origWords > 0 && <span className="stat-badge">{origWords} words</span>}
              {isListening && currentPartial && (
                <div className="flex items-end gap-1 h-3">
                  {audioLevels.slice(0, 3).map((l, i) => (
                    <div key={i} className="viz-bar" style={{ width: 2, height: `${Math.max(2, l * 12)}px` }} />
                  ))}
                </div>
              )}
            </div>
          </div>
          <div ref={rightPanelRef} className="flex-1 overflow-y-auto px-5 py-4" style={{ direction: sourceIsRTL ? "rtl" : "ltr" }}>
            {!isListening && !displayOriginal && (
              <div className="flex flex-col items-center justify-center h-full" style={{ color: "var(--text-muted)" }}>
                <p className="text-sm text-center">Original speech will appear here</p>
              </div>
            )}
            {isListening && !displayOriginal && (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <div className="visualizer-container">
                  {audioLevels.map((l, i) => (
                    <div key={i} className="viz-bar" style={{ height: `${Math.max(2, l * 36)}px` }} />
                  ))}
                </div>
                <p className="text-sm" style={{ color: "var(--accent)" }}>Listening...</p>
              </div>
            )}
            {displayOriginal && (
              <p className="text-base leading-[1.9]" style={{ color: "var(--text-dim)" }}>
                {fullOriginal && <span>{fullOriginal} </span>}
                {currentPartial && <span style={{ color: "var(--accent)", opacity: 0.7 }}>{currentPartial}</span>}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="shrink-0 py-3 flex items-center justify-center gap-4 glass relative z-10" style={{ borderTop: "1px solid var(--surface-border)" }}>
        {/* Real-time audio visualizer left side */}
        {isListening && (
          <div className="flex items-center gap-1 h-8">
            {audioLevels.slice(0, 8).map((l, i) => (
              <div key={i} className="viz-bar" style={{ height: `${Math.max(2, l * 28)}px` }} />
            ))}
          </div>
        )}

        {/* Mic button with ripple */}
        <div className="relative">
          {isListening && (
            <>
              <div className="mic-ripple" />
              <div className="mic-ripple" />
              <div className="mic-ripple" />
            </>
          )}
          <button
            onClick={isListening ? stopListening : startListening}
            className={`relative w-14 h-14 rounded-full flex items-center justify-center transition-all ${isListening ? "" : "glow-btn"}`}
            style={{
              background: isListening ? "var(--danger)" : "var(--accent-gradient)",
              border: "none",
              cursor: "pointer",
              boxShadow: isListening ? "0 0 24px rgba(217, 112, 135, 0.25)" : undefined,
              zIndex: 1,
            }}>
            {isListening ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><rect x="6" y="6" width="12" height="12" rx="3" /></svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            )}
          </button>
        </div>

        {/* Audio visualizer right side */}
        {isListening && (
          <div className="flex items-center gap-1 h-8">
            {audioLevels.slice(8, 16).map((l, i) => (
              <div key={i} className="viz-bar" style={{ height: `${Math.max(2, l * 28)}px` }} />
            ))}
          </div>
        )}

        {!isListening && (
          <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Tap to start</p>
        )}
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.7)" }} onClick={() => setShowSettings(false)}>
          <div className="w-full max-w-lg rounded-t-3xl p-6 pb-10 glass" style={{ border: "1px solid var(--surface-border)", borderBottom: "none" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold gradient-text">Settings</h2>
              <button onClick={() => setShowSettings(false)} className="p-1.5 rounded-lg" style={{ color: "var(--text-dim)", background: "rgba(139, 144, 160, 0.08)" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-dim)" }}>Source Language</label>
                <select value={sourceLang.code} onChange={(e) => { const l = LANGUAGES.find((x) => x.code === e.target.value); if (l) setSourceLang(l); }} className="settings-select">
                  {LANGUAGES.map((l) => (<option key={l.code} value={l.code}>{l.label}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-dim)" }}>Target Language</label>
                <select value={targetLang.code} onChange={(e) => { const l = LANGUAGES.find((x) => x.code === e.target.value); if (l) setTargetLang(l); }} className="settings-select">
                  {LANGUAGES.map((l) => (<option key={l.code} value={l.code}>{l.label}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-dim)" }}>Voice</label>
                <select value={selectedVoiceURI} onChange={(e) => setSelectedVoiceURI(e.target.value)} className="settings-select">
                  <option value="">Auto (best available)</option>
                  {availableVoices.filter((v) => v.lang.startsWith(targetLang.speechCode.split("-")[0])).map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>{v.name}{v.localService ? "" : " (cloud)"}</option>
                  ))}
                </select>
              </div>
            </div>
            <p className="text-xs mt-6 text-center" style={{ color: "var(--text-muted)" }}>Changes take effect on next session</p>
          </div>
        </div>
      )}
    </div>
  );
}
