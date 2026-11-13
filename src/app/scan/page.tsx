"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/utils/supabaseClient";
import { allowlistedScanRedirect, scannerAccessPath } from "@/lib/scanner/scanRedirect";
import { clearScannerBrowserSession } from "@/lib/scanner/ticketScan";
import ScanLogin from "@/components/ScanLogin";
import StaffTicketScanner from "@/components/StaffTicketScanner";

type AccessState = "loading" | "anonymous" | "denied" | "ready" | "error";

function FullScreenStatus({ label }: { label: string }) {
  return (
    <div className="fixed inset-0 z-[80] flex flex-col items-center justify-center bg-black text-white">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-green-500" />
      <p className="mt-4 text-gray-300">{label}</p>
    </div>
  );
}

async function resolveScannerAccess(
  session: Session,
  eventId: string | null
): Promise<Exclude<AccessState, "loading">> {
  try {
    const response = await fetch(scannerAccessPath(eventId), {
      headers: { Authorization: `Bearer ${session.access_token}` },
      cache: "no-store",
    });
    if (response.status === 401) return "anonymous";
    const body = (await response.json().catch(() => null)) as { allowed?: boolean } | null;
    if (!response.ok || !body) return "error";
    return body.allowed ? "ready" : "denied";
  } catch {
    return "error";
  }
}

function ScanScreen() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get("event");
  const returnPath = allowlistedScanRedirect(eventId ? `/scan?event=${eventId}` : "/scan");
  const [access, setAccess] = useState<AccessState>("loading");

  useEffect(() => {
    let cancelled = false;

    const applySession = (session: Session | null) => {
      if (cancelled) return;
      if (!session?.user || !session.access_token) {
        setAccess("anonymous");
        return;
      }
      setAccess("loading");
      void resolveScannerAccess(session, eventId).then((next) => {
        if (!cancelled) setAccess(next);
      });
    };

    void supabase.auth.getSession().then(({ data: { session } }) => {
      applySession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [eventId]);

  const signOut = async () => {
    await clearScannerBrowserSession({
      signOut: () => supabase.auth.signOut({ scope: "global" }),
      storageKeys: Object.keys(localStorage),
      removeItem: (key) => localStorage.removeItem(key),
    });
    window.location.assign(returnPath);
  };

  if (access === "loading") {
    return <FullScreenStatus label="Checking access…" />;
  }

  if (access === "anonymous") {
    return <ScanLogin returnPath={returnPath} />;
  }

  if (access === "error") {
    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black px-6 text-center text-white">
        <div className="max-w-sm">
          <h1 className="text-2xl font-bold">Couldn&apos;t check access</h1>
          <p className="mt-3 text-gray-400">Check the connection and try again.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 font-semibold text-green-500"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (access === "denied") {
    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black px-6 text-center text-white">
        <div className="max-w-sm">
          <h1 className="text-2xl font-bold">Access denied</h1>
          <p className="mt-3 text-gray-400">
            This account can&apos;t scan this event. Ask the organizer to invite your email.
            Signing in with Google does not grant access on its own.
          </p>
          <button
            type="button"
            onClick={() => {
              void signOut();
            }}
            className="mt-6 font-semibold text-green-500"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return <StaffTicketScanner onLogout={() => { void signOut(); }} />;
}

export default function ScanPage() {
  return (
    <Suspense fallback={<FullScreenStatus label="Checking access…" />}>
      <ScanScreen />
    </Suspense>
  );
}
