"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { supabase } from "@/utils/supabaseClient";
import { isSuperAdminEmail } from "@/utils/superAdmin";
import {
  searchAdminUsers,
  updateAdminUserRole,
  type AdminUserView,
} from "@/utils/adminUsersApi";
import { ASSIGNABLE_ROLES, type AssignableRole } from "@/utils/roles";

const ROLE_LABELS: Record<AssignableRole, string> = {
  clear: "Clear (attendee)",
  organizer: "Organizer",
  staff: "Staff",
  admin: "Admin",
};

export default function SuperAdminUsersPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [emailQuery, setEmailQuery] = useState("");
  const [users, setUsers] = useState<AdminUserView[]>([]);
  const [draftRoles, setDraftRoles] = useState<Record<string, AssignableRole>>({});
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [addingStaff, setAddingStaff] = useState(false);
  const [toast, setToast] = useState<{ tone: "success" | "error"; message: string } | null>(
    null
  );

  useEffect(() => {
    async function checkAuth() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user || !isSuperAdminEmail(session.user.email)) {
        setAuthorized(false);
        setTimeout(() => router.push("/dashboard"), 2000);
        return;
      }
      setAuthorized(true);
    }
    checkAuth();
  }, [router]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(id);
  }, [toast]);

  const showToast = (tone: "success" | "error", message: string) => {
    setToast({ tone, message });
  };

  const applyUsers = (next: AdminUserView[]) => {
    setUsers(next);
    setDraftRoles(Object.fromEntries(next.map((user) => [user.id, user.role])));
  };

  const handleSearch = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      applyUsers(await searchAdminUsers(emailQuery));
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Search failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (user: AdminUserView) => {
    const role = draftRoles[user.id] ?? user.role;
    setSavingId(user.id);
    try {
      const updated = await updateAdminUserRole(user.email, role);
      applyUsers(users.map((row) => (row.id === updated.id ? updated : row)));
      showToast("success", `${updated.email} is now ${ROLE_LABELS[updated.role]}`);
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Update failed");
    } finally {
      setSavingId(null);
    }
  };

  const handleAddStaff = async () => {
    setAddingStaff(true);
    try {
      const updated = await updateAdminUserRole(emailQuery, "staff");
      const existing = users.some((row) => row.id === updated.id);
      applyUsers(existing ? users.map((row) => (row.id === updated.id ? updated : row)) : [updated, ...users]);
      showToast("success", `${updated.email} is now staff`);
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Could not add staff");
    } finally {
      setAddingStaff(false);
    }
  };

  if (authorized === false) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Unauthorized</h2>
          <p className="text-gray-600 mb-4">You do not have permission to view this page.</p>
          <p className="text-gray-500 text-sm">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  if (authorized !== true) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white pb-24 md:pb-8">
      <div className="bg-gray-900 text-white px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <Link
            href="/dashboard/admin"
            className="inline-flex items-center gap-1 text-gray-300 hover:text-white text-sm mb-4"
          >
            <ArrowLeftIcon className="h-4 w-4" aria-hidden />
            Admin
          </Link>
          <h1 className="text-2xl font-bold">Users &amp; staff</h1>
          <p className="text-gray-400 text-sm mt-1">
            Search an existing account by email, then set organizer, staff, or admin.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {toast && (
          <div
            role={toast.tone === "error" ? "alert" : "status"}
            className={`mb-6 rounded-xl px-4 py-3 text-sm font-semibold ${
              toast.tone === "success"
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {toast.message}
          </div>
        )}

        <form
          onSubmit={handleSearch}
          className="bg-white rounded-2xl shadow border border-gray-100 p-5 mb-8 flex flex-col sm:flex-row gap-3"
        >
          <label className="sr-only" htmlFor="admin-user-email">
            Email
          </label>
          <input
            id="admin-user-email"
            type="email"
            required
            value={emailQuery}
            onChange={(e) => setEmailQuery(e.target.value)}
            placeholder="user@example.com"
            className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-gray-800 text-white px-5 py-3 rounded-xl font-semibold hover:bg-gray-900 disabled:opacity-50"
          >
            {loading ? "Searching…" : "Search"}
          </button>
          <button
            type="button"
            disabled={addingStaff || !emailQuery.trim()}
            onClick={handleAddStaff}
            className="bg-green-600 text-white px-5 py-3 rounded-xl font-semibold hover:bg-green-700 disabled:opacity-50"
          >
            {addingStaff ? "Adding…" : "Add as staff"}
          </button>
        </form>

        {!loading && users.length === 0 && (
          <p className="text-gray-600 text-sm">Search for a signed-up user to change their role.</p>
        )}

        {users.length > 0 && (
          <div className="overflow-x-auto bg-white rounded-xl shadow border border-gray-100">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-500">
                <tr>
                  <th className="p-3 font-semibold">Email</th>
                  <th className="p-3 font-semibold">Current role</th>
                  <th className="p-3 font-semibold">Set role</th>
                  <th className="p-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-t border-gray-100">
                    <td className="p-3 font-medium text-gray-800">{user.email}</td>
                    <td className="p-3">{ROLE_LABELS[user.role]}</td>
                    <td className="p-3">
                      <select
                        value={draftRoles[user.id] ?? user.role}
                        onChange={(e) =>
                          setDraftRoles((prev) => ({
                            ...prev,
                            [user.id]: e.target.value as AssignableRole,
                          }))
                        }
                        className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
                      >
                        {ASSIGNABLE_ROLES.map((role) => (
                          <option key={role} value={role}>
                            {ROLE_LABELS[role]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-3">
                      <button
                        type="button"
                        disabled={savingId === user.id}
                        onClick={() => handleSave(user)}
                        className="text-sm font-semibold text-green-700 hover:underline disabled:opacity-50"
                      >
                        {savingId === user.id ? "Saving…" : "Save"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
