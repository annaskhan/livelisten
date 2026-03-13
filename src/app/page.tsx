"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { LANGUAGES, ONBOARDING_KEY, isRTL, API_BASE_URL, type LangOption } from "@/lib/constants";
import { type SavedSession, loadSessions, saveSession, deleteSession as deleteSessionById, formatTime, wordCount } from "@/lib/sessions";
import { useAudioVisualizer } from "@/hooks/useAudioVisualizer";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useAppLifecycle } from "@/hooks/useAppLifecycle";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { OnboardingScreen } from "@/components/OnboardingScreen";
import { SessionViewer } from "@/components/SessionViewer";
import { SettingsModal } from "@/components/SettingsModal";
import { HistoryModal } from "@/components/HistoryModal";
import { ConsentBanner } from "@/components/ConsentBanner";
import { PermissionDeniedScreen } from "@/components/PermissionGate";

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
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [micDenied, setMicDenied] = useState(false);

  const isOnline = useOnlineStatus();
  const prefersReducedMotion = useReducedMotion();

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

  // App lifecycle: pause/resume mic tracks on background/foreground
  useAppLifecycle({
    onPause: () => {
      if (isListeningRef.current && micStream) {
        micStream.getTracks().forEach((t) => { t.enabled = false; });
      }
    },
    onResume: () => {
      if (isListeningRef.current && micStream) {
        micStream.getTracks().forEach((t) => { t.enabled = true; });
      }
    },
  });

  useEffect(() => { isListeningRef.current = isListening; }, [isListening]);

  useEffect(() => {
    setSessions(loadSessions());
    if (!localStorage.getItem(ONBOARDING_KEY)) {
      setShowOnboarding(true);
    }
  }, []);

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

  // Track accumulated original text for context
  const accumulatedOriginalRef = useRef("");

  const translateText = useCallback(async (text: string, isInterim = false, retryCount = 0) => {
    if (!text.trim()) return;
    if (isInterim && abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    if (isInterim) abortRef.current = controller;

    try {
      const res = await fetch(`${API_BASE_URL}/api/translate`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text.slice(0, 2000),
          sourceLang: sourceLang.code,
          targetLang: targetLang.code,
          stream: true,
          context: accumulatedOriginalRef.current || undefined,
        }),
        signal: controller.signal,
      });
      if (!res.ok) {
        let errorMsg = "Translation service error";
        try { const d = await res.json(); if (d.error) errorMsg = d.error; } catch { /* non-JSON response */ }
        if (res.status === 429) { errorMsg = "Rate limited — please wait a moment"; }
        setError(errorMsg);
        if (res.status >= 500 && retryCount < 3) {
          const delay = Math.pow(2, retryCount) * 1000;
          setTimeout(() => translateText(text, isInterim, retryCount + 1), delay);
        }
        return;
      }
      const reader = res.body?.getReader(); if (!reader) return;
      const decoder = new TextDecoder();
      let result = "";
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        result += decoder.decode(value, { stream: true });
        setStreamingTranslation(result);
      }
      if (!isInterim) {
        accumulatedOriginalRef.current += (accumulatedOriginalRef.current ? " " : "") + text;
        setFullOriginal((prev) => prev + (prev ? " " : "") + text);
        setFullTranslation((prev) => prev + (prev ? " " : "") + result);
        setStreamingTranslation(""); setCurrentPartial(""); speak(result);
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      console.error(e);
      if (!isInterim) {
        if (retryCount < 3) {
          const delay = Math.pow(2, retryCount) * 1000;
          setTimeout(() => translateText(text, isInterim, retryCount + 1), delay);
        } else {
          setError("Translation failed — please check your connection");
        }
      }
    } finally { if (isInterim) abortRef.current = null; }
  }, [sourceLang.code, targetLang.code, speak]);

  const startDeepgram = useCallback(async () => {
    setError(null); setFullOriginal(""); setFullTranslation(""); setStreamingTranslation(""); setCurrentPartial(""); accumulatedOriginalRef.current = "";

    if (!navigator.onLine) {
      setError("You are offline. Please check your connection.");
      return false;
    }

    try {
      const tokenRes = await fetch(`${API_BASE_URL}/api/deepgram-token`);
      const tokenData = await tokenRes.json();
      if (tokenData.error) { setError(tokenData.error + " — using browser recognition"); setUseDeepgram(false); return false; }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, sampleRate: 16000, echoCancellation: true, noiseSuppression: true } });
      } catch (micErr) {
        const err = micErr as DOMException;
        if (err.name === "NotAllowedError") {
          setMicDenied(true);
          setError("Microphone access denied.");
        } else if (err.name === "NotFoundError") {
          setError("No microphone found. Please connect a microphone and try again.");
        } else {
          setError("Could not access microphone. Please check your device settings.");
        }
        return false;
      }
      setMicDenied(false);
      setMicStream(stream);

      const wsUrl = `wss://api.deepgram.com/v1/listen?language=${sourceLang.deepgramCode}&model=nova-3&punctuate=true&interim_results=true&utterance_end_ms=2000&vad_events=true&smart_format=true&encoding=linear16&sample_rate=16000&diarize=false&profanity_filter=false&redact=false&numerals=false`;
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
        let data;
        try { data = JSON.parse(event.data); } catch { return; }
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
    setError(null); setFullOriginal(""); setFullTranslation(""); setStreamingTranslation(""); setCurrentPartial(""); accumulatedOriginalRef.current = "";

    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicStream(s);
      setMicDenied(false);
    } catch (micErr) {
      const err = micErr as DOMException;
      if (err.name === "NotAllowedError") {
        setMicDenied(true);
        setError("Microphone access denied.");
      } else if (err.name === "NotFoundError") {
        setError("No microphone found. Please connect a microphone.");
      } else {
        setError("Could not access microphone.");
      }
      return;
    }

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
    if (!navigator.onLine) {
      setError("You are offline. Translation requires an internet connection.");
      return;
    }
    setMicDenied(false);
    if (useDeepgram) { const ok = await startDeepgram(); if (!ok && !micDenied) startBrowserRecognition(); }
    else startBrowserRecognition();
  }, [useDeepgram, startDeepgram, startBrowserRecognition, micDenied]);

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
              duration: elapsed,
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

  const dismissOnboarding = () => {
    setShowOnboarding(false);
    try { localStorage.setItem(ONBOARDING_KEY, "1"); } catch { /* */ }
  };

  const handleDeleteSession = (id: string) => {
    deleteSessionById(id);
    setSessions(loadSessions());
  };

  const sourceIsRTL = isRTL(sourceLang.code);
  const targetIsRTL = isRTL(targetLang.code);
  const displayOriginal = fullOriginal + (currentPartial ? (fullOriginal ? " " : "") + currentPartial : "");
  const displayTranslation = fullTranslation + (streamingTranslation ? (fullTranslation ? " " : "") + streamingTranslation : "");
  const origWords = wordCount(displayOriginal);
  const transWords = wordCount(displayTranslation);

  const offlineBanner = !isOnline && (
    <div className="offline-banner" role="alert" aria-live="assertive">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <line x1="1" y1="1" x2="23" y2="23" /><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" /><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" /><path d="M10.71 5.05A16 16 0 0 1 22.56 9" /><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" /><path d="M8.53 16.11a6 6 0 0 1 6.95 0" /><line x1="12" y1="20" x2="12.01" y2="20" />
      </svg>
      <span>You are offline — translation requires a connection</span>
    </div>
  );

  const errorBanner = error && (
    <div className="error-banner" role="alert" aria-live="polite">
      <span>{error}</span>
      <button onClick={() => setError(null)} className="ml-3 opacity-70 hover:opacity-100" aria-label="Dismiss error">&times;</button>
    </div>
  );

  // Settings icon SVG (reusable)
  const settingsIcon = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );

  // Shared modals
  const modals = (
    <>
      <SettingsModal show={showSettings} onClose={() => setShowSettings(false)} sourceLang={sourceLang} targetLang={targetLang} onSourceLangChange={setSourceLang} onTargetLangChange={setTargetLang} selectedVoiceURI={selectedVoiceURI} onVoiceChange={setSelectedVoiceURI} availableVoices={availableVoices} useDeepgram={useDeepgram} onEngineChange={setUseDeepgram} />
      <HistoryModal show={showHistory} onClose={() => setShowHistory(false)} sessions={sessions} onViewSession={setViewingSession} onDeleteSession={handleDeleteSession} onSessionsChanged={() => setSessions(loadSessions())} />
      <ConsentBanner />
    </>
  );

  // --- Onboarding ---
  if (showOnboarding) {
    return <OnboardingScreen onDismiss={dismissOnboarding} />;
  }

  // --- Viewing a past session ---
  if (viewingSession) {
    return <SessionViewer session={viewingSession} onBack={() => setViewingSession(null)} />;
  }

  // --- Mic denied screen ---
  if (micDenied && !isListening && !displayOriginal && !displayTranslation) {
    return (
      <div className="h-dvh flex flex-col relative overflow-hidden" style={{ background: "var(--bg)" }}>
        {offlineBanner}
        <header className="flex items-center justify-between px-5 py-4 shrink-0 relative z-10">
          <div />
          <button onClick={() => setShowSettings(true)} className="p-2 rounded-xl" style={{ color: "var(--text-muted)" }} aria-label="Open settings">
            {settingsIcon}
          </button>
        </header>
        <PermissionDeniedScreen onRetry={() => { setMicDenied(false); setError(null); startListening(); }} />
        {modals}
      </div>
    );
  }

  // --- Welcome screen (not listening, no text) ---
  if (!isListening && !displayOriginal && !displayTranslation) {
    return (
      <div className="h-dvh flex flex-col relative overflow-hidden" style={{ background: "var(--bg)" }}>
        {offlineBanner}
        {!prefersReducedMotion && (
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            <div className="ambient-orb ambient-orb-1" />
            <div className="ambient-orb ambient-orb-2" />
          </div>
        )}

        <header className="flex items-center justify-between px-5 py-4 shrink-0 relative z-10">
          {sessions.length > 0 ? (
            <button onClick={() => setShowHistory(true)} className="flex items-center gap-1.5 p-2 rounded-xl" style={{ color: "var(--text-muted)" }} aria-label="View session history">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 8v4l3 3" /><circle cx="12" cy="12" r="10" />
              </svg>
              <span style={{ fontSize: 12, fontFamily: "var(--font-sans)", fontWeight: 500 }}>History</span>
            </button>
          ) : <div />}
          <button onClick={() => setShowSettings(true)} className="p-2 rounded-xl" style={{ color: "var(--text-muted)" }} aria-label="Open settings">
            {settingsIcon}
          </button>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center px-8 relative z-10 fade-in">
          <h1 className="text-3xl font-semibold tracking-tight mb-3" style={{ fontFamily: "var(--font-serif)", color: "var(--text)" }}>
            LiveListen
          </h1>
          <p className="text-center mb-1" style={{ fontFamily: "var(--font-serif)", fontSize: 17, color: "var(--text-dim)", maxWidth: 340, lineHeight: 1.6 }}>
            Real-time translation for conversations, meetings, speeches, and more.
          </p>
          <p className="text-center mb-10" style={{ fontFamily: "var(--font-serif)", fontSize: 15, color: "var(--text-muted)", maxWidth: 300, lineHeight: 1.5 }}>
            Tap below to begin listening. The translation will appear as the speaker talks.
          </p>

          <div className="flex items-center gap-3 mb-10" aria-label={`Translating from ${sourceLang.label} to ${targetLang.label}`}>
            <span style={{ fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 500, color: "var(--text-dim)" }}>{sourceLang.label}</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
            <span style={{ fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 500, color: "var(--text-dim)" }}>{targetLang.label}</span>
          </div>

          <div className="relative">
            <button
              onClick={startListening}
              className={`relative w-20 h-20 rounded-full flex items-center justify-center ${prefersReducedMotion ? "" : "glow-btn"}`}
              style={{ background: "var(--accent-gradient)", border: "none", cursor: "pointer", zIndex: 1 }}
              aria-label="Start listening and translating">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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

        {errorBanner && <div className="absolute bottom-6 left-4 right-4 z-20">{errorBanner}</div>}
        {modals}
      </div>
    );
  }

  // --- Active / transcript screen ---
  return (
    <div className="h-dvh flex flex-col relative overflow-hidden" style={{ background: "var(--bg)" }}>
      {offlineBanner}
      {isListening && !prefersReducedMotion && (
        <div className="absolute inset-0 pointer-events-none z-0" aria-hidden="true">
          <div className="ambient-orb ambient-orb-1" />
          <div className="ambient-orb ambient-orb-2" />
          <div className="ambient-orb ambient-orb-3" />
        </div>
      )}

      <header className="flex items-center justify-between px-5 py-3 shrink-0 relative z-10" style={{ borderBottom: "1px solid var(--surface-border)" }}>
        <span style={{ fontFamily: "var(--font-serif)", fontSize: 16, fontWeight: 600, color: "var(--accent)" }}>LiveListen</span>
        <div className="flex items-center gap-3">
          {isListening && <span className="elapsed-timer stat-badge" aria-live="off" aria-label={`Elapsed time: ${formatTime(elapsed)}`}>{formatTime(elapsed)}</span>}
          <button onClick={() => setVoiceEnabled(!voiceEnabled)} className="p-1.5 rounded-lg transition-all"
            style={{ color: voiceEnabled ? "var(--accent)" : "var(--text-muted)" }}
            aria-label={voiceEnabled ? "Disable voice output" : "Enable voice output"}
            aria-pressed={voiceEnabled}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {voiceEnabled ? (
                <><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /></>
              ) : (
                <><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" /></>
              )}
            </svg>
          </button>
          <button onClick={() => setShowHistory(true)} className="p-1.5 rounded-lg" style={{ color: "var(--text-muted)" }} aria-label="View session history">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
          </button>
          <button onClick={() => setShowSettings(true)} className="p-1.5 rounded-lg" style={{ color: "var(--text-muted)" }} aria-label="Open settings">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>
      </header>

      {errorBanner && <div className="mx-4 mt-2 shrink-0 relative z-10">{errorBanner}</div>}

      <div className="flex-1 flex flex-col lg:flex-row min-h-0 relative z-10">
        <div className={`flex-1 flex flex-col min-h-0 ${isListening && !prefersReducedMotion ? "panel-breathing" : ""}`}>
          <div className="px-5 py-2.5 shrink-0 flex items-center justify-between" style={{ borderBottom: "1px solid var(--surface-border)" }}>
            <span className="panel-label">{targetLang.label}</span>
            {transWords > 0 && <span className="stat-badge" aria-label={`${transWords} words translated`}>{transWords} words</span>}
          </div>
          <div ref={leftPanelRef} className="flex-1 overflow-y-auto px-6 py-5" style={{ direction: targetIsRTL ? "rtl" : "ltr" }}>
            {!displayTranslation && isListening && (
              <div className="flex flex-col items-center justify-center h-full gap-4 fade-in">
                <div className="visualizer-container" aria-hidden="true">
                  {audioLevels.slice(0, 12).map((l, i) => (
                    <div key={i} className="viz-bar" style={{ height: `${Math.max(2, l * 36)}px` }} />
                  ))}
                </div>
                <p style={{ fontFamily: "var(--font-serif)", fontSize: 15, color: "var(--text-muted)" }}>Waiting for speech...</p>
              </div>
            )}
            {displayTranslation && (
              <div className={`transcript-translation ${streamingTranslation ? "streaming-cursor" : ""}`} dir={targetIsRTL ? "rtl" : "ltr"}>
                {displayTranslation}
              </div>
            )}
          </div>
        </div>

        <div className="panel-divider-responsive shrink-0" />

        <div className={`flex-1 flex flex-col min-h-0 ${isListening && !prefersReducedMotion ? "panel-breathing" : ""}`}>
          <div className="px-5 py-2.5 shrink-0 flex items-center justify-between" style={{ borderBottom: "1px solid var(--surface-border)" }}>
            <span className="panel-label">{sourceLang.label}</span>
            {origWords > 0 && <span className="stat-badge" aria-label={`${origWords} words recognized`}>{origWords} words</span>}
          </div>
          <div ref={rightPanelRef} className="flex-1 overflow-y-auto px-6 py-5" style={{ direction: sourceIsRTL ? "rtl" : "ltr" }}>
            {!displayOriginal && isListening && (
              <div className="flex flex-col items-center justify-center h-full gap-4 fade-in">
                <div className="visualizer-container" aria-hidden="true">
                  {audioLevels.map((l, i) => (
                    <div key={i} className="viz-bar" style={{ height: `${Math.max(2, l * 36)}px` }} />
                  ))}
                </div>
                <p style={{ fontFamily: "var(--font-serif)", fontSize: 15, color: "var(--text-muted)" }}>Listening...</p>
              </div>
            )}
            {displayOriginal && (
              <div className={sourceIsRTL ? "transcript-original-rtl" : "transcript-original"} dir={sourceIsRTL ? "rtl" : "ltr"}>
                {fullOriginal && <span>{fullOriginal} </span>}
                {currentPartial && <span className="transcript-partial">{currentPartial}</span>}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="shrink-0 py-3 flex items-center justify-center gap-4 glass relative z-10" style={{ borderTop: "1px solid var(--surface-border)" }}>
        {isListening && (
          <div className="flex items-center gap-1 h-7" aria-hidden="true">
            {audioLevels.slice(0, 8).map((l, i) => (
              <div key={i} className="viz-bar" style={{ height: `${Math.max(2, l * 24)}px` }} />
            ))}
          </div>
        )}

        <div className="relative">
          {isListening && !prefersReducedMotion && (<><div className="mic-ripple" aria-hidden="true" /><div className="mic-ripple" aria-hidden="true" /><div className="mic-ripple" aria-hidden="true" /></>)}
          <button onClick={isListening ? stopListening : startListening}
            className={`relative w-12 h-12 rounded-full flex items-center justify-center transition-all ${isListening || prefersReducedMotion ? "" : "glow-btn"}`}
            style={{
              background: isListening ? "var(--danger)" : "var(--accent-gradient)",
              border: "none", cursor: "pointer",
              boxShadow: isListening ? "0 0 20px rgba(194, 112, 112, 0.2)" : undefined,
              zIndex: 1,
            }}
            aria-label={isListening ? "Stop listening" : "Start listening and translating"}>
            {isListening ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="3" /></svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            )}
          </button>
        </div>

        {isListening && (
          <div className="flex items-center gap-1 h-7" aria-hidden="true">
            {audioLevels.slice(8, 16).map((l, i) => (
              <div key={i} className="viz-bar" style={{ height: `${Math.max(2, l * 24)}px` }} />
            ))}
          </div>
        )}
      </div>

      {modals}
    </div>
  );
}
