"use client";

import { useEffect, useRef } from "react";

interface LifecycleCallbacks {
  onPause?: () => void;
  onResume?: () => void;
}

export function useAppLifecycle({ onPause, onResume }: LifecycleCallbacks) {
  const callbacksRef = useRef({ onPause, onResume });
  callbacksRef.current = { onPause, onResume };

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        callbacksRef.current.onPause?.();
      } else {
        callbacksRef.current.onResume?.();
      }
    };

    const handleBeforeUnload = () => {
      callbacksRef.current.onPause?.();
    };

    // Handle both web and native app lifecycle events
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    // Capacitor-specific lifecycle events
    const handleCapPause = () => callbacksRef.current.onPause?.();
    const handleCapResume = () => callbacksRef.current.onResume?.();
    document.addEventListener("pause", handleCapPause);
    document.addEventListener("resume", handleCapResume);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("pause", handleCapPause);
      document.removeEventListener("resume", handleCapResume);
    };
  }, []);
}
