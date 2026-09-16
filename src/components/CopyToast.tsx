"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useCopyToast(durationMs = 2800) {
  const [message, setMessage] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const showToast = useCallback(
    (next: string) => {
      clearTimer();
      setMessage(next);
      timerRef.current = window.setTimeout(() => {
        setMessage(null);
        timerRef.current = null;
      }, durationMs);
    },
    [clearTimer, durationMs]
  );

  useEffect(() => () => clearTimer(), [clearTimer]);

  return { message, showToast };
}

export default function CopyToast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      role="status"
      className="fixed bottom-4 left-1/2 z-[100] -translate-x-1/2 rounded-xl bg-[#166534] px-4 py-2.5 text-sm font-medium text-white shadow-lg"
    >
      {message}
    </div>
  );
}
