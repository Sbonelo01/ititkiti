import { TicketIcon, CalendarDaysIcon } from "@heroicons/react/24/outline";
import { CtaLink } from "@/components/ui/CtaButton";

export default function AudienceSplit({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xl">
        <CtaLink href="/events" variant="secondary" className="flex-1 py-3">
          <TicketIcon className="h-5 w-5" aria-hidden />
          Buy tickets
        </CtaLink>
        <CtaLink href="/dashboard/create-event" variant="primary" className="flex-1 py-3">
          <CalendarDaysIcon className="h-5 w-5" aria-hidden />
          Sell tickets
        </CtaLink>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 max-w-3xl mx-auto w-full">
      <div className="rounded-2xl bg-white/95 p-6 text-left shadow-lg border border-green-100">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-100 text-green-700 mb-4">
          <TicketIcon className="h-6 w-6" aria-hidden />
        </div>
        <h3 className="text-lg font-bold text-gray-900">I want tickets</h3>
        <p className="mt-1 text-sm text-gray-600 leading-relaxed">
          Browse events, pay securely, get instant QR tickets on your phone — no printing.
        </p>
        <CtaLink href="/events" variant="primary" className="mt-4 w-full">
          Find events near me
        </CtaLink>
      </div>

      <div className="rounded-2xl bg-white/95 p-6 text-left shadow-lg border border-emerald-200 ring-1 ring-emerald-300/40">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-white mb-4">
          <CalendarDaysIcon className="h-6 w-6" aria-hidden />
        </div>
        <h3 className="text-lg font-bold text-gray-900">I&apos;m selling tickets</h3>
        <p className="mt-1 text-sm text-gray-600 leading-relaxed">
          List your event in minutes. We handle payments, digital tickets, and door scanning.
        </p>
        <CtaLink href="/dashboard/create-event" variant="primary" className="mt-4 w-full">
          Start selling — it&apos;s free to list
        </CtaLink>
      </div>
    </div>
  );
}
