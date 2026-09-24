"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/utils/supabaseClient";
import {
  acceptScan,
  outcomeFromValidation,
  postValidateTicket,
  type ScannerOutcome,
} from "@/lib/scanner/ticketScan";
import {
  cameraUnavailableMessage,
  isCameraPermissionError,
  startQrScanSession,
  type QrScanSession,
} from "@/lib/scanner/qrCamera";

type CameraState = "idle" | "starting" | "live" | "denied" | "unavailable" | "error";
type Phase = "idle" | "validating" | "result";

type StaffTicketScannerProps = {
  onLogout: () => void;
};

async function readAccessToken(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

function ScannerButton({
  children,
  onClick,
}: {
  children: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-2 rounded-xl bg-green-600 px-8 py-3.5 text-base font-semibold text-white hover:bg-green-700"
    >
      {children}
    </button>
  );
}

function AttendeeDetails({ ticket }: { ticket: { attendee_name: string; email: string } | null }) {
  if (!ticket) return null;
  return (
    <div className="mb-4 w-full rounded-xl bg-gray-100 px-4 py-3 text-center text-sm text-gray-700">
      <p>Attendee: {ticket.attendee_name}</p>
      <p className="mt-2">Email: {ticket.email}</p>
    </div>
  );
}

function ResultCard({
  outcome,
  onReset,
  onLogout,
}: {
  outcome: ScannerOutcome;
  onReset: () => void;
  onLogout: () => void;
}) {
  switch (outcome.kind) {
    case "valid":
      return (
        <article className="w-[min(100%,24rem)] rounded-2xl border-l-4 border-green-500 bg-white px-6 py-8 text-center">
          <p className="text-5xl" aria-hidden>✓</p>
          <h2 className="mt-3 text-2xl font-bold text-green-600">Ticket Valid!</h2>
          <div className="mt-4">
            <AttendeeDetails ticket={outcome.ticket} />
          </div>
          <ScannerButton onClick={onReset}>Scan Another</ScannerButton>
        </article>
      );
    case "already_used":
      return (
        <article className="w-[min(100%,24rem)] rounded-2xl border-l-4 border-amber-500 bg-white px-6 py-8 text-center">
          <p className="text-5xl" aria-hidden>⚠</p>
          <h2 className="mt-3 text-2xl font-bold text-amber-600">Ticket Already Used</h2>
          <div className="mt-4">
            <AttendeeDetails ticket={outcome.ticket} />
          </div>
          <ScannerButton onClick={onReset}>Scan Another</ScannerButton>
        </article>
      );
    case "not_found":
      return (
        <article className="w-[min(100%,24rem)] rounded-2xl border-l-4 border-red-500 bg-white px-6 py-8 text-center">
          <p className="text-5xl" aria-hidden>✗</p>
          <h2 className="mt-3 text-2xl font-bold text-red-600">Ticket Not Found</h2>
          <p className="mb-4 mt-3 text-sm text-gray-500">{outcome.message}</p>
          <ScannerButton onClick={onReset}>Try Again</ScannerButton>
        </article>
      );
    case "unauthorized":
      return (
        <article className="w-[min(100%,24rem)] rounded-2xl border-l-4 border-red-500 bg-white px-6 py-8 text-center">
          <p className="text-5xl" aria-hidden>✗</p>
          <h2 className="mt-3 text-2xl font-bold text-red-600">Not Authorized</h2>
          <p className="mb-4 mt-3 text-sm text-gray-500">{outcome.message}</p>
          <ScannerButton onClick={onLogout}>Sign Out</ScannerButton>
        </article>
      );
    case "error":
      return (
        <article className="w-[min(100%,24rem)] rounded-2xl border-l-4 border-red-500 bg-white px-6 py-8 text-center">
          <p className="text-5xl" aria-hidden>✗</p>
          <h2 className="mt-3 text-2xl font-bold text-red-600">Validation Error</h2>
          <p className="mb-4 mt-3 text-sm text-gray-500">{outcome.message}</p>
          <ScannerButton onClick={onReset}>Try Again</ScannerButton>
        </article>
      );
    default: {
      const _exhaustive: never = outcome;
      return _exhaustive;
    }
  }
}

export default function StaffTicketScanner({ onLogout }: StaffTicketScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onCodeRef = useRef<(code: string) => void>(() => {});
  const phaseRef = useRef<Phase>("idle");
  const offlineRef = useRef(false);
  const lastScannedAt = useRef<Record<string, number>>({});
  const mountedRef = useRef(true);

  const [cameraState, setCameraState] = useState<CameraState>("idle");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [outcome, setOutcome] = useState<ScannerOutcome | null>(null);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const sync = () => {
      const next = typeof navigator !== "undefined" ? !navigator.onLine : false;
      offlineRef.current = next;
      setOffline(next);
    };
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  useEffect(() => {
    if (sessionId === 0) return;
    const video = videoRef.current;
    if (!video) return;

    let stopped = false;
    let session: QrScanSession | null = null;

    startQrScanSession(video, (code) => {
      if (!stopped) onCodeRef.current(code);
    })
      .then((next) => {
        if (stopped) {
          next.stop();
          return;
        }
        session = next;
        setCameraState("live");
      })
      .catch((error: unknown) => {
        if (stopped) return;
        if (isCameraPermissionError(error)) {
          setCameraState("denied");
          setCameraError(null);
          return;
        }
        setCameraState("error");
        setCameraError("Unable to open the camera. Check that a camera is available and try again.");
      });

    return () => {
      stopped = true;
      session?.stop();
    };
  }, [sessionId]);

  const resetScanner = () => {
    phaseRef.current = "idle";
    setPhase("idle");
    setOutcome(null);
  };

  onCodeRef.current = (code: string) => {
    const now = Date.now();
    const decision = acceptScan({
      code,
      now,
      isOffline: offlineRef.current,
      isBusy: phaseRef.current !== "idle",
      lastScannedAt: lastScannedAt.current,
    });
    if (!decision.accept) return;

    lastScannedAt.current[code] = now;
    phaseRef.current = "validating";
    setPhase("validating");
    setOutcome(null);

    void postValidateTicket(code, { getAccessToken: readAccessToken })
      .then((response) => {
        if (!mountedRef.current) return;
        phaseRef.current = "result";
        setOutcome(outcomeFromValidation(response));
        setPhase("result");
      })
      .catch(() => {
        if (!mountedRef.current) return;
        phaseRef.current = "result";
        setOutcome({ kind: "error", message: "Unexpected validation error" });
        setPhase("result");
      });
  };

  const requestCamera = () => {
    const unavailable = cameraUnavailableMessage();
    if (unavailable) {
      setCameraState("unavailable");
      setCameraError(unavailable);
      return;
    }
    setCameraError(null);
    setCameraState("starting");
    setSessionId((id) => id + 1);
  };

  const showVideo = cameraState === "starting" || cameraState === "live";

  return (
    <div className="fixed inset-0 z-[80] bg-black text-white">
      <video
        ref={videoRef}
        className={`absolute inset-0 h-full w-full object-cover ${showVideo ? "block" : "hidden"}`}
        autoPlay
        muted
        playsInline
        aria-hidden
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-col gap-2 px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onLogout}
            className="pointer-events-auto rounded-lg border border-white/30 bg-black/60 px-4 py-2 text-sm font-semibold"
          >
            Logout
          </button>
        </div>
        {offline && (
          <p className="rounded-lg bg-red-600/90 px-3 py-2 text-center text-sm font-semibold">
            Offline — scans paused
          </p>
        )}
      </div>

      {showVideo && phase === "idle" && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="relative h-[min(72vw,420px)] w-[min(72vw,420px)]">
            <span className="absolute left-0 top-0 h-8 w-8 border-l-4 border-t-4 border-green-500" />
            <span className="absolute right-0 top-0 h-8 w-8 border-r-4 border-t-4 border-green-500" />
            <span className="absolute bottom-0 left-0 h-8 w-8 border-b-4 border-l-4 border-green-500" />
            <span className="absolute bottom-0 right-0 h-8 w-8 border-b-4 border-r-4 border-green-500" />
          </div>
          <p className="absolute inset-x-4 bottom-[max(1.5rem,env(safe-area-inset-bottom))] text-center">
            <span className="inline-block rounded-full bg-black/60 px-5 py-2.5 text-sm">
              {cameraState === "starting"
                ? "Starting camera…"
                : "Position the QR code within the frame"}
            </span>
          </p>
        </div>
      )}

      {phase !== "idle" && (
        <div
          className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 px-5"
          role="status"
          aria-live="polite"
        >
          {phase === "validating" || !outcome ? (
            <div className="w-[min(100%,24rem)] rounded-2xl bg-white px-6 py-8 text-center text-gray-900">
              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-green-100 border-t-green-500" />
              <p className="mt-4 text-lg font-semibold">Validating ticket...</p>
            </div>
          ) : (
            <ResultCard outcome={outcome} onReset={resetScanner} onLogout={onLogout} />
          )}
        </div>
      )}

      {!showVideo && (
        <div className="absolute inset-0 z-10 flex items-center justify-center px-6 text-center">
          <div className="max-w-sm">
            <h1 className="text-3xl font-bold">Tikiti Scanner</h1>
            <p className="mt-3 text-gray-300">
              {cameraState === "denied"
                ? "Camera access is blocked. Allow the camera for this site in your browser settings, then try again."
                : cameraError || "Camera permission is required to scan tickets."}
            </p>
            <button
              type="button"
              onClick={requestCamera}
              className="mt-6 rounded-xl bg-green-600 px-8 py-3.5 text-base font-semibold text-white hover:bg-green-700"
            >
              {cameraState === "idle" ? "Grant Permission" : "Try Again"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
