import Link from "next/link";
import {
  DevicePhoneMobileIcon,
  QrCodeIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import AppStoreBadges from "@/components/AppStoreBadges";
import { ORGANIZER_APP } from "@/constants/branding";

type OrganizerAppPromoProps = {
  variant?: "section" | "banner";
};

export default function OrganizerAppPromo({ variant = "section" }: OrganizerAppPromoProps) {
  if (variant === "banner") {
    return (
      <div className="rounded-2xl border border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-green-600 text-white">
              <DevicePhoneMobileIcon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-green-700">
                Included for organizers
              </p>
              <h2 className="text-xl font-bold text-gray-900">{ORGANIZER_APP.name}</h2>
              <p className="mt-1 max-w-xl text-sm text-gray-600">{ORGANIZER_APP.description}</p>
            </div>
          </div>
          <AppStoreBadges layout="column" className="shrink-0" />
        </div>
      </div>
    );
  }

  return (
    <section
      id="organizer-app"
      className="relative overflow-hidden bg-gradient-to-br from-emerald-900 via-green-800 to-green-900 py-20"
    >
      <div className="absolute inset-0 opacity-10">
        <div className="absolute -left-10 top-10 h-40 w-40 rounded-full bg-white blur-2xl" />
        <div className="absolute bottom-0 right-0 h-56 w-56 rounded-full bg-emerald-300 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm font-semibold text-emerald-100 backdrop-blur-sm">
              <QrCodeIcon className="h-4 w-4" />
              For event organizers
            </p>
            <h2 className="text-4xl font-bold leading-tight text-white md:text-5xl">
              Your door team, in your pocket
            </h2>
            <p className="mt-4 text-lg text-emerald-100/95">{ORGANIZER_APP.description}</p>

            <ul className="mt-8 space-y-3">
              {ORGANIZER_APP.features.map((feature) => (
                <li key={feature} className="flex items-center gap-3 text-emerald-50">
                  <CheckCircleIcon className="h-5 w-5 shrink-0 text-emerald-300" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
              <Link
                href="/dashboard/create-event"
                className="inline-flex items-center justify-center rounded-xl bg-white px-6 py-3 font-semibold text-green-800 shadow-lg transition hover:bg-green-50"
              >
                Create an event — get app access
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-white/20 bg-white/10 p-8 backdrop-blur-md">
            <div className="mx-auto max-w-sm text-center">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-green-500 shadow-xl">
                <DevicePhoneMobileIcon className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white">{ORGANIZER_APP.name}</h3>
              <p className="mt-2 text-sm text-emerald-100">
                Download free from the App Store or Google Play. Sign in with your Tikiti
                organizer account to start scanning.
              </p>
              <AppStoreBadges className="mt-8" />
              <p className="mt-4 text-xs text-emerald-200/80">
                Paperless check-in — faster lines, zero ticket stubs.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
