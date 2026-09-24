"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/utils/supabaseClient";
import { isStaffOrAdmin } from "@/utils/roles";
import { persistAuthRedirectPath } from "@/utils/authRedirect";
import StaffTicketScanner from "@/components/StaffTicketScanner";

const LOGIN_HREF = "/login?redirect=%2Fscan";

type AccessState = "loading" | "anonymous" | "denied" | "ready";

function FullScreenStatus({ label }: { label: string }) {
  return (
    <div className="fixed inset-0 z-[80] flex flex-col items-center justify-center bg-black text-white">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-green-500" />
      <p className="mt-4 text-gray-300">{label}</p>
    </div>
  );
}

export default function ScanPage() {
  const router = useRouter();
  const [access, setAccess] = useState<AccessState>("loading");

  useEffect(() => {
    let cancelled = false;

    const applySession = (session: Session | null) => {
      if (cancelled) return;
      const user = session?.user ?? null;
      if (!user) {
        setAccess("anonymous");
        persistAuthRedirectPath("/scan");
        router.replace(LOGIN_HREF);
        return;
      }
      // Same rule as POST /api/validate-ticket: staff/admin live in app_metadata only.
      setAccess(isStaffOrAdmin(user) ? "ready" : "denied");
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
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
  }, [router]);

  const signOut = async () => {
    await supabase.auth.signOut();
    persistAuthRedirectPath("/scan");
    router.replace(LOGIN_HREF);
  };

  if (access === "loading" || access === "anonymous") {
    return (
      <FullScreenStatus
        label={access === "anonymous" ? "Redirecting to sign in…" : "Checking access…"}
      />
    );
  }

  if (access === "denied") {
    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black px-6 text-center text-white">
        <div className="max-w-sm">
          <h1 className="text-2xl font-bold">Access denied</h1>
          <p className="mt-3 text-gray-400">
            Only staff and admin accounts can use the scanner.
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
