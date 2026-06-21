"use client";

import { useState } from "react";
import Link from "next/link";
import { User } from "@supabase/supabase-js";
import {
  CalendarDaysIcon,
  QrCodeIcon,
  TicketIcon,
  BuildingOfficeIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import { supabase } from "@/utils/supabaseClient";
import { CtaButton } from "@/components/ui/CtaButton";

type OrganizerSellGateProps = {
  user: User;
  onUpgraded: () => void;
};

export default function OrganizerSellGate({ user, onUpgraded }: OrganizerSellGateProps) {
  const meta = user.user_metadata ?? {};
  const [companyName, setCompanyName] = useState(
    (meta.company_name as string | undefined) ?? ""
  );
  const [name, setName] = useState((meta.name as string | undefined) ?? "");
  const [surname, setSurname] = useState((meta.surname as string | undefined) ?? "");
  const [cellphone, setCellphone] = useState((meta.cellphone as string | undefined) ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpgrade = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!companyName.trim() || !name.trim() || !cellphone.trim()) {
      setError("Please fill in your name, phone number, and company or event name.");
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          role: "organizer",
          name: name.trim(),
          surname: surname.trim() || undefined,
          company_name: companyName.trim(),
          cellphone: cellphone.trim(),
        },
      });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      await supabase.auth.refreshSession();
      onUpgraded();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white pb-24 md:pb-8">
      <section className="bg-gradient-to-br from-green-600 to-green-800 py-8 sm:py-10 px-4">
        <div className="max-w-lg mx-auto">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-white/90 hover:text-white text-sm font-medium mb-6 touch-target"
          >
            <ArrowLeftIcon className="h-4 w-4" aria-hidden />
            Back to dashboard
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight">
            Ready to sell tickets?
          </h1>
          <p className="mt-2 text-green-100 text-sm sm:text-base leading-relaxed">
            You&apos;re signed in as a ticket buyer. Enable organizer tools on this account to
            list events — your purchased tickets stay right where they are.
          </p>
        </div>
      </section>

      <div className="max-w-lg mx-auto px-4 sm:px-6 -mt-4 relative z-10 space-y-5">
        <ul className="grid gap-3 sm:grid-cols-3">
          {[
            { icon: CalendarDaysIcon, label: "List events in minutes" },
            { icon: QrCodeIcon, label: "Paperless QR tickets" },
            { icon: TicketIcon, label: "Track sales live" },
          ].map(({ icon: Icon, label }) => (
            <li
              key={label}
              className="flex sm:flex-col items-center sm:text-center gap-3 sm:gap-2 rounded-xl bg-white p-3 shadow-sm border border-gray-100 text-sm text-gray-700"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-100 text-green-700">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              {label}
            </li>
          ))}
        </ul>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/80">
            <div className="flex items-center gap-2">
              <BuildingOfficeIcon className="h-5 w-5 text-green-600" aria-hidden />
              <h2 className="font-bold text-gray-900">Organizer details</h2>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              One quick step — then you can publish your first event.
            </p>
          </div>

          <form onSubmit={handleUpgrade} className="p-5 space-y-4">
            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700" role="alert">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="sell-company" className="block text-sm font-semibold text-gray-800">
                Company or event name <span className="text-red-500">*</span>
              </label>
              <input
                id="sell-company"
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-4 py-3 text-base rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="e.g. Tikiti Events Co."
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="sell-name" className="block text-sm font-semibold text-gray-800">
                  Your first name <span className="text-red-500">*</span>
                </label>
                <input
                  id="sell-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 text-base rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="sell-surname" className="block text-sm font-semibold text-gray-800">
                  Surname
                </label>
                <input
                  id="sell-surname"
                  type="text"
                  value={surname}
                  onChange={(e) => setSurname(e.target.value)}
                  className="w-full px-4 py-3 text-base rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="sell-phone" className="block text-sm font-semibold text-gray-800">
                Cellphone <span className="text-red-500">*</span>
              </label>
              <input
                id="sell-phone"
                type="tel"
                value={cellphone}
                onChange={(e) => setCellphone(e.target.value)}
                className="w-full px-4 py-3 text-base rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="082 123 4567"
                required
              />
            </div>

            <p className="text-xs text-gray-500 leading-relaxed">
              Signed in as <span className="font-medium text-gray-700">{user.email}</span>.
              You&apos;ll keep buying tickets and selling from the same account.
            </p>

            <CtaButton
              type="submit"
              disabled={loading}
              variant="primary"
              className="w-full py-3.5 text-base font-bold gap-2"
            >
              {loading ? (
                "Enabling selling…"
              ) : (
                <>
                  <CheckCircleIcon className="h-5 w-5" aria-hidden />
                  Enable selling & continue
                </>
              )}
            </CtaButton>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 pb-4">
          Not ready yet?{" "}
          <Link href="/events" className="font-semibold text-green-700 hover:underline">
            Browse events to buy tickets
          </Link>
        </p>
      </div>
    </div>
  );
}
