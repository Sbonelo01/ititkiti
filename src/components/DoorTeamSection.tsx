"use client";

import { useCallback, useEffect, useState } from "react";
import { UserGroupIcon, TrashIcon, ClipboardDocumentIcon } from "@heroicons/react/24/outline";
import { supabase } from "@/utils/supabaseClient";
import { scanReturnPath } from "@/lib/scanner/scanRedirect";
import {
  scannerMemberStatus,
  scannerMemberStatusLabel,
  type ScannerMemberStatus,
} from "@/lib/scanner/scannerMemberStatus";

interface ScannerMember {
  id: string;
  invited_email: string;
  user_id: string | null;
  revoked_at: string | null;
  created_at: string;
  status?: ScannerMemberStatus;
}

interface DoorTeamSectionProps {
  eventId: string;
}

function memberStatus(member: ScannerMember): ScannerMemberStatus {
  if (member.status === "pending" || member.status === "active" || member.status === "removed") {
    return member.status;
  }
  return scannerMemberStatus({
    user_id: member.user_id,
    revoked_at: member.revoked_at,
  });
}

export default function DoorTeamSection({ eventId }: DoorTeamSectionProps) {
  const [members, setMembers] = useState<ScannerMember[]>([]);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const scanPath = scanReturnPath(eventId);

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  }, []);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) {
        setError("Not signed in");
        return;
      }

      const res = await fetch(`/api/events/${eventId}/scanner-members`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || "Failed to load door team");
        return;
      }

      const body = await res.json();
      setMembers(body.members ?? []);
    } finally {
      setLoading(false);
    }
  }, [eventId, getAccessToken]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const token = await getAccessToken();
      if (!token) {
        setError("Not signed in");
        return;
      }

      const res = await fetch(`/api/events/${eventId}/scanner-members`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error || "Failed to add member");
        return;
      }

      setEmail("");
      setMessage(
        "Scanner access saved. They get access when they sign in with this email (Google or password)."
      );
      await loadMembers();
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async (memberId: string) => {
    setError(null);
    setMessage(null);

    const token = await getAccessToken();
    if (!token) {
      setError("Not signed in");
      return;
    }

    const res = await fetch(`/api/events/${eventId}/scanner-members/${memberId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "Failed to revoke access");
      return;
    }

    await loadMembers();
  };

  const copyScanLink = async () => {
    const url = `${window.location.origin}${scanPath}`;
    try {
      await navigator.clipboard.writeText(url);
      setError(null);
      setMessage("Scanner link copied.");
    } catch {
      setError(null);
      setMessage(url);
    }
  };

  return (
    <div className="mt-10 pt-8 border-t border-gray-100">
      <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900 mb-2">
        <UserGroupIcon className="h-6 w-6 text-green-500" />
        Door team (scanner access)
      </h2>
      <p className="text-gray-600 mb-4 text-sm">
        Add people by email. They sign in at the scanner link with Google or a password. Access is
        only for this event, and only after that email is verified. Removing someone takes effect
        on their next scan.
      </p>

      <button
        type="button"
        onClick={() => {
          void copyScanLink();
        }}
        className="mb-6 inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
      >
        <ClipboardDocumentIcon className="h-5 w-5 text-green-600" />
        Copy scanner link
      </button>

      <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="volunteer@example.com"
          className="flex-1 px-4 py-3 bg-gray-50 text-gray-800 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500"
          required
          disabled={submitting}
        />
        <button
          type="submit"
          disabled={submitting || !email.trim()}
          className="px-6 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 disabled:opacity-50"
        >
          {submitting ? "Adding…" : "Add scanner"}
        </button>
      </form>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
      {message && <p className="text-green-700 text-sm mb-4">{message}</p>}

      {loading ? (
        <p className="text-gray-500 text-sm">Loading door team…</p>
      ) : members.length === 0 ? (
        <p className="text-gray-500 text-sm">No scanner access granted yet.</p>
      ) : (
        <ul className="space-y-2">
          {members.map((member) => {
            const status = memberStatus(member);
            return (
              <li
                key={member.id}
                className="flex items-center justify-between gap-4 px-4 py-3 bg-gray-50 rounded-xl border border-gray-100"
              >
                <div>
                  <p className="font-medium text-gray-900">{member.invited_email}</p>
                  <p className="text-xs text-gray-500">{scannerMemberStatusLabel(status)}</p>
                </div>
                {status !== "removed" && (
                  <button
                    type="button"
                    onClick={() => handleRevoke(member.id)}
                    className="text-red-600 hover:text-red-800 p-2 rounded-lg hover:bg-red-50"
                    aria-label={`Revoke ${member.invited_email}`}
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
