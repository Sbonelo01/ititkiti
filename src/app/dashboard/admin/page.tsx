"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabaseClient";
import { getPrivilegedRole, isStaffOrAdmin } from "@/utils/roles";
import { isSuperAdminUser } from "@/utils/superAdmin";
import { useRouter } from "next/navigation";
import Link from "next/link";
import QRScanner from "@/components/QRScanner";

export default function AdminDashboard() {
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const router = useRouter();
  const [showScanner, setShowScanner] = useState(false);
  const [scanResult, setScanResult] = useState<{ message: string; tone: "success" | "warning" | "error" | "info" } | null>(null);
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user || !isStaffOrAdmin(user)) {
        setAuthorized(false);
        setTimeout(() => router.push("/dashboard"), 2000);
        return;
      }
      setAuthorized(true);
    }
    checkAuth();
  }, [router]);

  // Get user role for conditional rendering
  const [userRole, setUserRole] = useState<string | null>(null);
  const [showUserAdmin, setShowUserAdmin] = useState(false);

  useEffect(() => {
    async function getUserRole() {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (user) {
        setUserRole(getPrivilegedRole(user));
        setShowUserAdmin(isSuperAdminUser(user));
      }
    }
    getUserRole();
  }, []);

  async function handleScan(qrValue: string) {
    setValidating(true);
    setScanResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      const res = await fetch("/api/validate-ticket", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ qr_code_data: qrValue }),
      });
      const data = await res.json();
      if (data.success) {
        setScanResult({
          message: `Ticket valid for: ${data.ticket.attendee_name} (${data.ticket.email})`,
          tone: "success",
        });
      } else if (data.status === "already_used") {
        const name = data.ticket?.attendee_name ?? "Unknown";
        const email = data.ticket?.email ?? "";
        setScanResult({
          message: `Already used — ${name}${email ? ` (${email})` : ""}`,
          tone: "warning",
        });
      } else if (data.status === "not_found") {
        setScanResult({ message: data.error || "Ticket not found", tone: "error" });
      } else if (data.status === "unauthorized") {
        setScanResult({ message: "You are not authorized to scan tickets", tone: "error" });
      } else {
        setScanResult({ message: data.error || "Invalid ticket", tone: "error" });
      }
    } catch {
      setScanResult({ message: "Validation error. Try again.", tone: "error" });
    }
    setValidating(false);
  }

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
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {showUserAdmin && (
          <div className="mb-6 flex flex-wrap gap-3">
            <Link
              href="/dashboard/admin/sales"
              className="inline-block bg-green-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-700 transition-colors"
            >
              Events &amp; sales
            </Link>
            <Link
              href="/dashboard/admin/users"
              className="inline-block bg-gray-800 text-white px-6 py-3 rounded-xl font-semibold hover:bg-gray-900 transition-colors"
            >
              Users &amp; staff
            </Link>
          </div>
        )}
        {userRole === "staff" ? (
          // Staff view - only scanner
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-8">Staff Ticket Scanner</h1>
            <div className="mb-8 flex flex-col items-center gap-3">
              <Link
                href="/scan"
                className="bg-green-600 text-white px-6 py-3 rounded-xl font-bold text-lg hover:bg-green-700 transition-colors"
              >
                Open door scanner
              </Link>
              <button
                className="bg-white text-green-700 px-6 py-3 rounded-xl font-semibold border border-green-200 hover:bg-green-50 transition-colors"
                onClick={() => { setShowScanner(true); setScanResult(null); }}
              >
                Open Ticket Scanner
              </button>
            </div>
            {showScanner && (
              <QRScanner
                onScan={qrValue => { setShowScanner(false); handleScan(qrValue); }}
                onClose={() => setShowScanner(false)}
              />
            )}
            {validating && (
              <div className="mb-4 text-blue-600 font-semibold" role="status" aria-live="polite">
                Validating ticket...
              </div>
            )}
            {scanResult && (
              <div
                className={`mb-4 text-lg font-bold text-center ${
                  scanResult.tone === "success"
                    ? "text-green-700"
                    : scanResult.tone === "warning"
                      ? "text-amber-600"
                      : "text-red-600"
                }`}
                role="status"
                aria-live="polite"
              >
                {scanResult.message}
              </div>
            )}
          </div>
        ) : (
          <>
            <h1 className="text-4xl font-bold mb-4">Admin</h1>
            <div className="flex flex-wrap gap-3 mb-8">
              <Link
                href="/dashboard/admin/invoices"
                className="bg-gray-800 text-white px-6 py-3 rounded-xl font-semibold hover:bg-gray-900 transition-colors"
              >
                Organizer invoices
              </Link>
              <Link
                href="/scan"
                className="bg-green-600 text-white px-6 py-3 rounded-xl font-bold text-lg hover:bg-green-700 transition-colors"
              >
                Door scanner
              </Link>
              <button
                className="bg-white text-green-700 px-6 py-3 rounded-xl font-semibold border border-green-200 hover:bg-green-50 transition-colors"
                onClick={() => { setShowScanner(true); setScanResult(null); }}
              >
                Open Ticket Scanner
              </button>
            </div>
            {showScanner && (
              <QRScanner
                onScan={qrValue => { setShowScanner(false); handleScan(qrValue); }}
                onClose={() => setShowScanner(false)}
              />
            )}
            {validating && (
              <div className="mb-4 text-blue-600 font-semibold" role="status" aria-live="polite">
                Validating ticket...
              </div>
            )}
            {scanResult && (
              <div
                className={`mb-4 text-lg font-bold text-center ${
                  scanResult.tone === "success"
                    ? "text-green-700"
                    : scanResult.tone === "warning"
                      ? "text-amber-600"
                      : "text-red-600"
                }`}
                role="status"
                aria-live="polite"
              >
                {scanResult.message}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
} 