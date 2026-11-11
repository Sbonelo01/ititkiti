"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import EventSalesReportView from "@/components/admin/EventSalesReportView";
import type { PublicEventSalesDashboard, SalesWhen } from "@/server/admin/eventSalesReport";
import { supabase } from "@/utils/supabaseClient";
import { isSuperAdminUser } from "@/utils/superAdmin";

export default function AdminEventSalesPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [search, setSearch] = useState("");
  const [when, setWhen] = useState<SalesWhen>("all");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [appliedWhen, setAppliedWhen] = useState<SalesWhen>("all");
  const [page, setPage] = useState(1);
  const [report, setReport] = useState<PublicEventSalesDashboard | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function checkAuth() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!session?.user || !isSuperAdminUser(session.user)) {
        setAuthorized(false);
        window.setTimeout(() => router.push("/dashboard"), 2000);
        return;
      }
      setAuthorized(true);
    }
    void checkAuth();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token || !isSuperAdminUser(session.user)) {
        setAuthorized(false);
        setReport(null);
        return;
      }
      const params = new URLSearchParams({
        q: appliedSearch,
        when: appliedWhen,
        page: String(page),
      });
      const res = await fetch(`/api/admin/event-sales?${params.toString()}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: "no-store",
      });
      const body = (await res.json()) as { error?: string };
      if (res.status === 401) {
        setReport(null);
        setError("Sign in required.");
        return;
      }
      if (res.status === 403) {
        setReport(null);
        setError("You do not have permission to view event sales.");
        return;
      }
      if (!res.ok) {
        setError(body.error || "Failed to load event sales");
        return;
      }
      setReport(body as PublicEventSalesDashboard);
    } catch {
      setError("Failed to load event sales");
    } finally {
      setLoading(false);
    }
  }, [appliedSearch, appliedWhen, page]);

  useEffect(() => {
    if (authorized !== true) return;
    void load();
  }, [authorized, load, reloadKey]);

  if (authorized === false) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="rounded-2xl bg-white p-8 text-center shadow-xl">
          <h2 className="mb-4 text-2xl font-bold text-gray-800">Unauthorized</h2>
          <p className="mb-4 text-gray-600">You do not have permission to view this page.</p>
          <p className="text-sm text-gray-500">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  if (authorized !== true) {
    return null;
  }

  return (
    <EventSalesReportView
      report={report}
      search={search}
      when={when}
      loading={loading}
      error={error}
      onSearchChange={setSearch}
      onWhenChange={setWhen}
      onSubmit={() => {
        setAppliedSearch(search.trim());
        setAppliedWhen(when);
        setPage(1);
      }}
      onRefresh={() => setReloadKey((value) => value + 1)}
      onPage={setPage}
    />
  );
}
