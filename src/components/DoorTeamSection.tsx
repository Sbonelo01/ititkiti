"use client";

import { useCallback, useEffect, useState } from "react";
import { UserGroupIcon, TrashIcon } from "@heroicons/react/24/outline";
import { supabase } from "@/utils/supabaseClient";

interface ScannerMember {
  id: string;
  invited_email: string;
  user_id: string | null;
  created_at: string;
}

interface DoorTeamSectionProps {
  eventId: string;
}

export default function DoorTeamSection({ eventId }: DoorTeamSectionProps) {
  const [members, setMembers] = useState<ScannerMember[]>([]);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

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
      setMessage("Scanner access added. They can sign in to the Tikiti Scanner app with their Tikiti account.");
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

  return (
    <div className="mt-10 pt-8 border-t border-gray-100">
      <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900 mb-2">
        <UserGroupIcon className="h-6 w-6 text-green-500" />
        Door team (scanner access)
      </h2>
      <p className="text-gray-600 mb-6 text-sm">
        Invite people to scan tickets for this event in the Tikiti Scanner app. They sign in with their
        Tikiti account (any role). Access is limited to this event only.
      </p>

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
          {members.map((member) => (
            <li
              key={member.id}
              className="flex items-center justify-between gap-4 px-4 py-3 bg-gray-50 rounded-xl border border-gray-100"
            >
              <div>
                <p className="font-medium text-gray-900">{member.invited_email}</p>
                <p className="text-xs text-gray-500">
                  {member.user_id ? "Account linked" : "Pending until they sign up with this email"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleRevoke(member.id)}
                className="text-red-600 hover:text-red-800 p-2 rounded-lg hover:bg-red-50"
                aria-label={`Revoke ${member.invited_email}`}
              >
                <TrashIcon className="h-5 w-5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
