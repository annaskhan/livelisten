"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface LangOption {
  code: string;
  label: string;
  speechCode: string;
  deepgramCode: string;
}

const LANGUAGES: LangOption[] = [
  { code: "Arabic", label: "Arabic", speechCode: "ar-SA", deepgramCode: "ar" },
  { code: "English", label: "English", speechCode: "en-US", deepgramCode: "en-US" },
  { code: "French", label: "Fran\u00e7ais", speechCode: "fr-FR", deepgramCode: "fr" },
  { code: "Spanish", label: "Espa\u00f1ol", speechCode: "es-ES", deepgramCode: "es" },
  { code: "Urdu", label: "Urdu", speechCode: "ur-PK", deepgramCode: "ur" },
  { code: "Turkish", label: "T\u00fcrk\u00e7e", speechCode: "tr-TR", deepgramCode: "tr" },
  { code: "Malay", label: "Bahasa Melayu", speechCode: "ms-MY", deepgramCode: "ms" },
  { code: "Indonesian", label: "Indonesian", speechCode: "id-ID", deepgramCode: "id" },
  { code: "Bengali", label: "Bengali", speechCode: "bn-BD", deepgramCode: "bn" },
  { code: "Somali", label: "Soomaali", speechCode: "so-SO", deepgramCode: "so" },
];

const isRTL = (code: string) => code === "Arabic" || code === "Urdu";

// --- Saved sessions ---
interface SavedSession {
  id: string;
  date: string;
  sourceLang: string;
  targetLang: string;
  original: string;
  translation: string;
  duration: number;
}

const STORAGE_KEY = "livelisten_sessions";

function loadSessions(): SavedSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveSessions(sessions: SavedSession[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

function saveSession(session: SavedSession) {
  const sessions = loadSessions();
  sessions.unshift(session);
  // Keep last 50 sessions
  if (sessions.length > 50) sessions.length = 50;
  saveSessions(sessions);
}

function deleteSession(id: string) {
  const sessions = loadSessions().filter((s) => s.id !== id);
  saveSessions(sessions);
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) +
    " at " + d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function formatTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function wordCount(text: string) {
  if (!text.trim()) return 0;
  return text.trim().split(/\s+/).length;
}

function useAudioVisualizer(stream: MediaStream | null) {
  const [levels, setLevels] = useState<number[]>(new Array(24).fill(0));
  const animRef = useRef<number>(0);

  useEffect(() => {
    if (!stream) {
      setLevels(new Array(24).fill(0));
      if (animRef.current) cancelAnimationFrame(animRef.current);
      return;
    }
    const ctx = new AudioContext();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 64;
    analyser.smoothingTimeConstant = 0.75;
    source.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);
    let cancelled = false;

    function tick() {
      if (cancelled) return;
      analyser.getByteFrequencyData(data);
      const bars: number[] = [];
      for (let i = 0; i < 24; i++) {
        bars.push(data[Math.floor((i / 24) * data.length)] / 255);
      }
      setLevels(bars);
      animRef.current = requestAnimationFrame(tick);
    }
    tick();
    return () => { cancelled = true; if (animRef.current) cancelAnimationFrame(animRef.current); ctx.close(); };
  }, [stream]);

  return levels;
}

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
  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  const [useDeepgram, setUseDeepgram] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [viewingSession, setViewingSession] = useState<SavedSession | null>(null);
  const [sessions, setSessions] = useState<SavedSession[]>([]);

  const leftPanelRef = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);
  const pendingTextRef = useRef("");
  const isListeningRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const interimTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastInterimRef = useRef("");
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  const audioLevels = useAudioVisualizer(micStream);

  useEffect(() => { isListeningRef.current = isListening; }, [isListening]);

  // Load saved sessions on mount
  useEffect(() => { setSessions(loadSessions()); }, []);

  // Register service worker for PWA
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

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
    const loadVoices = () => { const v = speechSynthesis.getVoices(); if (v.length > 0) setAvailableVoices(v); };
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
    if (selectedVoiceURI) { const s = voices.find((v) => v.voiceURI === selectedVoiceURI); if (s) return s; }
    const lc = targetLang.speechCode.split("-")[0];
    const lv = voices.filter((v) => v.lang.startsWith(lc));
    if (!lv.length) return null;
    return lv.find((v) => /natural|premium|enhanced|neural/i.test(v.name)) || lv[0];
  }, [targetLang.speechCode, selectedVoiceURI]);

  const speak = useCallback((text: string) => {
    if (!voiceEnabled || !text) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = targetLang.speechCode; u.rate = 0.85; u.pitch = 0.95; u.volume = 0.9;
    const v = getBestVoice(); if (v) u.voice = v;
    speechSynthesis.speak(u);
  }, [voiceEnabled, targetLang.speechCode, getBestVoice]);

  const translateText = useCallback(async (text: string, isInterim = false) => {
    if (!text.trim()) return;
    if (isInterim && abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    if (isInterim) abortRef.current = controller;

    try {
      const res = await fetch("/api/translate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, sourceLang: sourceLang.code, targetLang: targetLang.code, stream: true }),
        signal: controller.signal,
      });
      if (!res.ok) { const d = await res.json(); if (d.error) setError(d.error); return; }
      const reader = res.body?.getReader(); if (!reader) return;
      const decoder = new TextDecoder();
      let result = "";
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        result += decoder.decode(value, { stream: true });
        setStreamingTranslation(result);
      }
      if (!isInterim) {
        setFullOriginal((prev) => prev + (prev ? " " : "") + text);
        setFullTranslation((prev) => prev + (prev ? " " : "") + result);
        setStreamingTranslation(""); setCurrentPartial(""); speak(result);
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      console.error(e); if (!isInterim) setError("Translation service error");
    } finally { if (isInterim) abortRef.current = null; }
  }, [sourceLang.code, targetLang.code, speak]);

  const startDeepgram = useCallback(async () => {
    setError(null); setFullOriginal(""); setFullTranslation(""); setStreamingTranslation(""); setCurrentPartial("");
    try {
      const tokenRes = await fetch("/api/deepgram-token");
      const tokenData = await tokenRes.json();
      if (tokenData.error) { setError(tokenData.error + " — using browser recognition"); setUseDeepgram(false); return false; }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, sampleRate: 16000, echoCancellation: true, noiseSuppression: true } });
      setMicStream(stream);

      const wsUrl = `wss://api.deepgram.com/v1/listen?language=${sourceLang.deepgramCode}&model=nova-3&punctuate=true&interim_results=true&utterance_end_ms=1000&vad_events=true&smart_format=true&encoding=linear16&sample_rate=16000`;
      const ws = new WebSocket(wsUrl, ["token", tokenData.key]);
      wsRef.current = ws;

      ws.onopen = () => {
        const audioCtx = new AudioContext({ sampleRate: 16000 });
        const source = audioCtx.createMediaStreamSource(stream);
        const processor = audioCtx.createScriptProcessor(4096, 1, 1);
        processor.onaudioprocess = (e) => {
          if (ws.readyState !== WebSocket.OPEN) return;
          const f = e.inputBuffer.getChannelData(0);
          const int16 = new Int16Array(f.length);
          for (let i = 0; i < f.length; i++) { const s = Math.max(-1, Math.min(1, f[i])); int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff; }
          ws.send(int16.buffer);
        };
        source.connect(processor); processor.connect(audioCtx.destination);
        mediaRecorderRef.current = { stop: () => { processor.disconnect(); source.disconnect(); audioCtx.close(); } } as unknown as MediaRecorder;
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "Results") {
          const transcript = data.channel?.alternatives?.[0]?.transcript || "";
          const isFinal = data.is_final;
          if (transcript) {
            if (isFinal) {
              pendingTextRef.current += (pendingTextRef.current ? " " : "") + transcript;
              setCurrentPartial(pendingTextRef.current);
              if (interimTimerRef.current) { clearTimeout(interimTimerRef.current); interimTimerRef.current = null; }
              if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
              debounceTimerRef.current = setTimeout(() => {
                if (pendingTextRef.current.trim()) { const t = pendingTextRef.current; pendingTextRef.current = ""; translateText(t, false); }
              }, 500);
            } else {
              const display = [pendingTextRef.current, transcript].filter(Boolean).join(" ");
              setCurrentPartial(display);
              if (display.trim().length > 10 && display !== lastInterimRef.current) {
                lastInterimRef.current = display;
                if (interimTimerRef.current) clearTimeout(interimTimerRef.current);
                interimTimerRef.current = setTimeout(() => translateText(display, true), 600);
              }
            }
          }
        }
        if (data.type === "UtteranceEnd" && pendingTextRef.current.trim()) {
          if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
          const t = pendingTextRef.current; pendingTextRef.current = ""; translateText(t, false);
        }
      };

      ws.onerror = () => { setError("Deepgram connection error — using browser recognition"); setUseDeepgram(false); };
      ws.onclose = () => { if (pendingTextRef.current.trim() && isListeningRef.current) { const t = pendingTextRef.current; pendingTextRef.current = ""; translateText(t, false); } };
      setIsListening(true); return true;
    } catch (e) { console.error(e); setError("Could not start Deepgram"); setUseDeepgram(false); return false; }
  }, [sourceLang.deepgramCode, translateText]);

  const startBrowserRecognition = useCallback(async () => {
    setError(null); setFullOriginal(""); setFullTranslation(""); setStreamingTranslation(""); setCurrentPartial("");
    try { const s = await navigator.mediaDevices.getUserMedia({ audio: true }); setMicStream(s); } catch { /* */ }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setError("Speech recognition not supported. Try Chrome or Safari."); return; }
    const recognition = new SR();
    recognition.lang = sourceLang.speechCode; recognition.continuous = true; recognition.interimResults = true; recognition.maxAlternatives = 1;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) { const t = r[0].transcript.trim(); if (t) { pendingTextRef.current += (pendingTextRef.current ? " " : "") + t; if (interimTimerRef.current) { clearTimeout(interimTimerRef.current); interimTimerRef.current = null; } if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current); debounceTimerRef.current = setTimeout(() => { if (pendingTextRef.current.trim()) { const txt = pendingTextRef.current; pendingTextRef.current = ""; translateText(txt, false); } }, 500); } }
        else { interim += r[0].transcript; }
      }
      const full = [pendingTextRef.current, interim].filter(Boolean).join(" "); if (full) setCurrentPartial(full);
      const combined = [pendingTextRef.current, interim].filter(Boolean).join(" ");
      if (combined.trim().length > 10 && combined !== lastInterimRef.current) { lastInterimRef.current = combined; if (interimTimerRef.current) clearTimeout(interimTimerRef.current); interimTimerRef.current = setTimeout(() => translateText(combined, true), 600); }
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => { if (event.error === "no-speech" || event.error === "aborted") return; setError(`Microphone error: ${event.error}`); };
    recognition.onend = () => { if (isListeningRef.current) { try { recognition.start(); } catch { /* */ } } };
    recognitionRef.current = recognition;
    try { recognition.start(); setIsListening(true); } catch { setError("Could not start microphone."); }
  }, [sourceLang.speechCode, translateText]);

  const startListening = useCallback(async () => {
    if (useDeepgram) { const ok = await startDeepgram(); if (!ok) startBrowserRecognition(); }
    else startBrowserRecognition();
  }, [useDeepgram, startDeepgram, startBrowserRecognition]);

  const stopListening = useCallback(() => {
    setIsListening(false);
    if (debounceTimerRef.current) { clearTimeout(debounceTimerRef.current); debounceTimerRef.current = null; }
    if (interimTimerRef.current) { clearTimeout(interimTimerRef.current); interimTimerRef.current = null; }
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }
    if (wsRef.current) { try { wsRef.current.close(); } catch { /* */ } wsRef.current = null; }
    if (mediaRecorderRef.current) { try { mediaRecorderRef.current.stop(); } catch { /* */ } mediaRecorderRef.current = null; }
    if (recognitionRef.current) { recognitionRef.current.onend = null; recognitionRef.current.abort(); recognitionRef.current = null; }
    if (micStream) { micStream.getTracks().forEach((t) => t.stop()); setMicStream(null); }
    speechSynthesis.cancel();
    if (pendingTextRef.current.trim()) { const r = pendingTextRef.current; pendingTextRef.current = ""; translateText(r, false); }

    // Auto-save session if there's content
    // Use setTimeout to let final translation complete
    setTimeout(() => {
      setFullOriginal((orig) => {
        setFullTranslation((trans) => {
          if (orig.trim() || trans.trim()) {
            const session: SavedSession = {
              id: Date.now().toString(),
              date: new Date().toISOString(),
              sourceLang: sourceLang.code,
              targetLang: targetLang.code,
              original: orig,
              translation: trans,
              duration: elapsedRef.current ? elapsed : elapsed,
            };
            saveSession(session);
            setSessions(loadSessions());
          }
          return trans;
        });
        return orig;
      });
    }, 2000);
  }, [translateText, micStream, sourceLang.code, targetLang.code, elapsed]);

  useEffect(() => {
    return () => { if (recognitionRef.current) { recognitionRef.current.onend = null; recognitionRef.current.abort(); } if (wsRef.current) { try { wsRef.current.close(); } catch { /* */ } } speechSynthesis.cancel(); };
  }, []);

  const sourceIsRTL = isRTL(sourceLang.code);
  const targetIsRTL = isRTL(targetLang.code);
  const displayOriginal = fullOriginal + (currentPartial ? (fullOriginal ? " " : "") + currentPartial : "");
  const displayTranslation = fullTranslation + (streamingTranslation ? (fullTranslation ? " " : "") + streamingTranslation : "");
  const origWords = wordCount(displayOriginal);
  const transWords = wordCount(displayTranslation);

  // --- Welcome screen (not listening, no text) ---
  if (!isListening && !displayOriginal && !displayTranslation) {
    return (
      <div className="h-dvh flex flex-col relative overflow-hidden" style={{ background: "var(--bg)" }}>
        {/* Ambient orbs for warmth */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="ambient-orb ambient-orb-1" />
          <div className="ambient-orb ambient-orb-2" />
        </div>

        {/* Top bar */}
        <header className="flex items-center justify-between px-5 py-4 shrink-0 relative z-10">
          {sessions.length > 0 ? (
            <button onClick={() => setShowHistory(true)} className="flex items-center gap-1.5 p-2 rounded-xl" style={{ color: "var(--text-muted)" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 8v4l3 3" /><circle cx="12" cy="12" r="10" />
              </svg>
              <span style={{ fontSize: 12, fontFamily: "var(--font-sans)", fontWeight: 500 }}>History</span>
            </button>
          ) : <div />}
          <button onClick={() => setShowSettings(true)} className="p-2 rounded-xl" style={{ color: "var(--text-muted)" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </header>

        {/* Welcome content */}
        <div className="flex-1 flex flex-col items-center justify-center px-8 relative z-10 fade-in">
          <h1 className="text-3xl font-semibold tracking-tight mb-3" style={{ fontFamily: "var(--font-serif)", color: "var(--text)" }}>
            LiveListen
          </h1>
          <p className="text-center mb-1" style={{ fontFamily: "var(--font-serif)", fontSize: 17, color: "var(--text-dim)", maxWidth: 340, lineHeight: 1.6 }}>
            Real-time translation for sermons, speeches, and conversations.
          </p>
          <p className="text-center mb-10" style={{ fontFamily: "var(--font-serif)", fontSize: 15, color: "var(--text-muted)", maxWidth: 300, lineHeight: 1.5 }}>
            Tap below to begin listening. The translation will appear as the speaker talks.
          </p>

          {/* Language indicator */}
          <div className="flex items-center gap-3 mb-10">
            <span style={{ fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 500, color: "var(--text-dim)" }}>{sourceLang.label}</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
            <span style={{ fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 500, color: "var(--text-dim)" }}>{targetLang.label}</span>
          </div>

          {/* Start button */}
          <div className="relative">
            <button
              onClick={startListening}
              className="relative w-20 h-20 rounded-full flex items-center justify-center glow-btn"
              style={{ background: "var(--accent-gradient)", border: "none", cursor: "pointer", zIndex: 1 }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            </button>
          </div>

          <p className="mt-5 text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--font-sans)" }}>
            Tap to start listening
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="absolute bottom-6 left-4 right-4 px-4 py-3 rounded-xl text-sm flex items-center justify-between z-20"
            style={{ background: "rgba(194, 112, 112, 0.1)", color: "var(--danger)", border: "1px solid rgba(194, 112, 112, 0.15)" }}>
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-3 opacity-70 hover:opacity-100">&times;</button>
          </div>
        )}

        {renderSettings()}
        {renderHistory()}
        {renderSessionViewer()}
      </div>
    );
  }

  // --- Viewing a past session ---
  if (viewingSession) {
    const vSourceRTL = isRTL(viewingSession.sourceLang);
    const vTargetRTL = isRTL(viewingSession.targetLang);
    return (
      <div className="h-dvh flex flex-col" style={{ background: "var(--bg)" }}>
        <header className="flex items-center justify-between px-5 py-3 shrink-0" style={{ borderBottom: "1px solid var(--surface-border)" }}>
          <button onClick={() => setViewingSession(null)} className="flex items-center gap-2 p-1" style={{ color: "var(--accent)" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            <span style={{ fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 500 }}>Back</span>
          </button>
          <div className="text-right">
            <p style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--text-muted)" }}>{formatDate(viewingSession.date)}</p>
            <p style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--text-muted)" }}>
              {viewingSession.sourceLang} &rarr; {viewingSession.targetLang} &middot; {formatTime(viewingSession.duration)}
            </p>
          </div>
        </header>

        <div className="flex-1 flex min-h-0">
          <div className="flex-1 flex flex-col min-h-0">
            <div className="px-5 py-2.5 shrink-0" style={{ borderBottom: "1px solid var(--surface-border)" }}>
              <span className="panel-label">{viewingSession.targetLang}</span>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5" style={{ direction: vTargetRTL ? "rtl" : "ltr" }}>
              <div className="transcript-translation">{viewingSession.translation || <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>No translation recorded</span>}</div>
            </div>
          </div>
          <div className="panel-divider shrink-0" />
          <div className="flex-1 flex flex-col min-h-0">
            <div className="px-5 py-2.5 shrink-0" style={{ borderBottom: "1px solid var(--surface-border)" }}>
              <span className="panel-label">{viewingSession.sourceLang}</span>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5" style={{ direction: vSourceRTL ? "rtl" : "ltr" }}>
              <div className={vSourceRTL ? "transcript-original-rtl" : "transcript-original"}>{viewingSession.original || <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>No transcript recorded</span>}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- Active / transcript screen ---
  return (
    <div className="h-dvh flex flex-col relative overflow-hidden" style={{ background: "var(--bg)" }}>
      {isListening && (
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="ambient-orb ambient-orb-1" />
          <div className="ambient-orb ambient-orb-2" />
          <div className="ambient-orb ambient-orb-3" />
        </div>
      )}

      {/* Header */}
      <header className="flex items-center justify-between px-5 py-3 shrink-0 relative z-10" style={{ borderBottom: "1px solid var(--surface-border)" }}>
        <span style={{ fontFamily: "var(--font-serif)", fontSize: 16, fontWeight: 600, color: "var(--accent)" }}>LiveListen</span>
        <div className="flex items-center gap-3">
          {isListening && <span className="elapsed-timer stat-badge">{formatTime(elapsed)}</span>}
          <button onClick={() => setVoiceEnabled(!voiceEnabled)} className="p-1.5 rounded-lg transition-all"
            style={{ color: voiceEnabled ? "var(--accent)" : "var(--text-muted)" }}
            title={voiceEnabled ? "Voice on" : "Voice off"}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {voiceEnabled ? (
                <><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /></>
              ) : (
                <><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" /></>
              )}
            </svg>
          </button>
          <button onClick={() => setShowHistory(true)} className="p-1.5 rounded-lg" style={{ color: "var(--text-muted)" }} title="Session history">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
          </button>
          <button onClick={() => setShowSettings(true)} className="p-1.5 rounded-lg" style={{ color: "var(--text-muted)" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>
      </header>

      {error && (
        <div className="mx-4 mt-2 px-4 py-2.5 rounded-xl text-sm shrink-0 flex items-center justify-between relative z-10"
          style={{ background: "rgba(194, 112, 112, 0.1)", color: "var(--danger)", border: "1px solid rgba(194, 112, 112, 0.15)" }}>
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-3 opacity-70 hover:opacity-100">&times;</button>
        </div>
      )}

      {/* Split panels */}
      <div className="flex-1 flex min-h-0 relative z-10">
        {/* LEFT: Translation */}
        <div className={`flex-1 flex flex-col min-h-0 ${isListening ? "panel-breathing" : ""}`}>
          <div className="px-5 py-2.5 shrink-0 flex items-center justify-between" style={{ borderBottom: "1px solid var(--surface-border)" }}>
            <span className="panel-label">{targetLang.label}</span>
            {transWords > 0 && <span className="stat-badge">{transWords} words</span>}
          </div>
          <div ref={leftPanelRef} className="flex-1 overflow-y-auto px-6 py-5" style={{ direction: targetIsRTL ? "rtl" : "ltr" }}>
            {!displayTranslation && isListening && (
              <div className="flex flex-col items-center justify-center h-full gap-4 fade-in">
                <div className="visualizer-container">
                  {audioLevels.slice(0, 12).map((l, i) => (
                    <div key={i} className="viz-bar" style={{ height: `${Math.max(2, l * 36)}px` }} />
                  ))}
                </div>
                <p style={{ fontFamily: "var(--font-serif)", fontSize: 15, color: "var(--text-muted)" }}>Waiting for speech...</p>
              </div>
            )}
            {displayTranslation && (
              <div className={`transcript-translation ${streamingTranslation ? "streaming-cursor" : ""}`}>
                {displayTranslation}
              </div>
            )}
          </div>
        </div>

        <div className="panel-divider shrink-0" />

        {/* RIGHT: Original */}
        <div className={`flex-1 flex flex-col min-h-0 ${isListening ? "panel-breathing" : ""}`}>
          <div className="px-5 py-2.5 shrink-0 flex items-center justify-between" style={{ borderBottom: "1px solid var(--surface-border)" }}>
            <span className="panel-label">{sourceLang.label}</span>
            {origWords > 0 && <span className="stat-badge">{origWords} words</span>}
          </div>
          <div ref={rightPanelRef} className="flex-1 overflow-y-auto px-6 py-5" style={{ direction: sourceIsRTL ? "rtl" : "ltr" }}>
            {!displayOriginal && isListening && (
              <div className="flex flex-col items-center justify-center h-full gap-4 fade-in">
                <div className="visualizer-container">
                  {audioLevels.map((l, i) => (
                    <div key={i} className="viz-bar" style={{ height: `${Math.max(2, l * 36)}px` }} />
                  ))}
                </div>
                <p style={{ fontFamily: "var(--font-serif)", fontSize: 15, color: "var(--text-muted)" }}>Listening...</p>
              </div>
            )}
            {displayOriginal && (
              <div className={sourceIsRTL ? "transcript-original-rtl" : "transcript-original"}>
                {fullOriginal && <span>{fullOriginal} </span>}
                {currentPartial && <span className="transcript-partial">{currentPartial}</span>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom */}
      <div className="shrink-0 py-3 flex items-center justify-center gap-4 glass relative z-10" style={{ borderTop: "1px solid var(--surface-border)" }}>
        {isListening && (
          <div className="flex items-center gap-1 h-7">
            {audioLevels.slice(0, 8).map((l, i) => (
              <div key={i} className="viz-bar" style={{ height: `${Math.max(2, l * 24)}px` }} />
            ))}
          </div>
        )}

        <div className="relative">
          {isListening && (<><div className="mic-ripple" /><div className="mic-ripple" /><div className="mic-ripple" /></>)}
          <button onClick={isListening ? stopListening : startListening}
            className={`relative w-12 h-12 rounded-full flex items-center justify-center transition-all ${isListening ? "" : "glow-btn"}`}
            style={{
              background: isListening ? "var(--danger)" : "var(--accent-gradient)",
              border: "none", cursor: "pointer",
              boxShadow: isListening ? "0 0 20px rgba(194, 112, 112, 0.2)" : undefined,
              zIndex: 1,
            }}>
            {isListening ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><rect x="6" y="6" width="12" height="12" rx="3" /></svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            )}
          </button>
        </div>

        {isListening && (
          <div className="flex items-center gap-1 h-7">
            {audioLevels.slice(8, 16).map((l, i) => (
              <div key={i} className="viz-bar" style={{ height: `${Math.max(2, l * 24)}px` }} />
            ))}
          </div>
        )}
      </div>

      {renderSettings()}
      {renderHistory()}
    </div>
  );

  function renderHistory() {
    if (!showHistory) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.65)" }} onClick={() => setShowHistory(false)}>
        <div className="w-full max-w-lg rounded-t-3xl p-6 pb-10 glass fade-in" style={{ border: "1px solid var(--surface-border)", borderBottom: "none", maxHeight: "75vh", display: "flex", flexDirection: "column" }} onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-4 shrink-0">
            <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 20, fontWeight: 600, color: "var(--text)" }}>Session History</h2>
            <button onClick={() => setShowHistory(false)} className="p-1.5 rounded-lg" style={{ color: "var(--text-dim)" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2">
            {sessions.length === 0 && (
              <p style={{ fontFamily: "var(--font-serif)", fontSize: 14, color: "var(--text-muted)", textAlign: "center", padding: "2rem 0" }}>
                No saved sessions yet. Sessions are saved automatically when you stop listening.
              </p>
            )}
            {sessions.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-xl p-3 transition-colors" style={{ background: "rgba(196, 168, 130, 0.04)", border: "1px solid var(--surface-border)", cursor: "pointer" }}
                onClick={() => { setShowHistory(false); setViewingSession(s); }}>
                <div className="flex-1 min-w-0">
                  <p style={{ fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 500, color: "var(--text-dim)", marginBottom: 2 }}>
                    {formatDate(s.date)}
                  </p>
                  <p style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--text-muted)" }}>
                    {s.sourceLang} &rarr; {s.targetLang} &middot; {formatTime(s.duration)} &middot; {wordCount(s.translation)} words
                  </p>
                  {s.translation && (
                    <p className="mt-1 truncate" style={{ fontFamily: "var(--font-serif)", fontSize: 13, color: "var(--text-dim)", maxWidth: "100%" }}>
                      {s.translation.slice(0, 80)}{s.translation.length > 80 ? "..." : ""}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-3 shrink-0">
                  <button className="p-1.5 rounded-lg transition-colors" style={{ color: "var(--text-muted)" }}
                    onClick={(e) => { e.stopPropagation(); deleteSession(s.id); setSessions(loadSessions()); }}
                    title="Delete">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function renderSessionViewer() {
    // This is handled by the top-level viewingSession check now
    return null;
  }

  function renderSettings() {
    if (!showSettings) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.65)" }} onClick={() => setShowSettings(false)}>
        <div className="w-full max-w-lg rounded-t-3xl p-6 pb-10 glass fade-in" style={{ border: "1px solid var(--surface-border)", borderBottom: "none" }} onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-6">
            <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 20, fontWeight: 600, color: "var(--text)" }}>Settings</h2>
            <button onClick={() => setShowSettings(false)} className="p-1.5 rounded-lg" style={{ color: "var(--text-dim)" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Source Language</label>
              <select value={sourceLang.code} onChange={(e) => { const l = LANGUAGES.find((x) => x.code === e.target.value); if (l) setSourceLang(l); }} className="settings-select">
                {LANGUAGES.map((l) => (<option key={l.code} value={l.code}>{l.label}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Target Language</label>
              <select value={targetLang.code} onChange={(e) => { const l = LANGUAGES.find((x) => x.code === e.target.value); if (l) setTargetLang(l); }} className="settings-select">
                {LANGUAGES.map((l) => (<option key={l.code} value={l.code}>{l.label}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Voice</label>
              <select value={selectedVoiceURI} onChange={(e) => setSelectedVoiceURI(e.target.value)} className="settings-select">
                <option value="">Auto</option>
                {availableVoices.filter((v) => v.lang.startsWith(targetLang.speechCode.split("-")[0])).map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>{v.name}{v.localService ? "" : " (cloud)"}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Speech Engine</label>
              <select value={useDeepgram ? "deepgram" : "browser"} onChange={(e) => setUseDeepgram(e.target.value === "deepgram")} className="settings-select">
                <option value="deepgram">Deepgram Nova-3</option>
                <option value="browser">Browser built-in</option>
              </select>
            </div>
          </div>
          <p className="text-xs mt-6 text-center" style={{ color: "var(--text-muted)", fontFamily: "var(--font-sans)" }}>Changes apply on next session</p>
        </div>
      </div>
    );
  }
}
