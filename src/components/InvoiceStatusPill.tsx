import { ORGANIZER_COPY, type OrganizerInvoicePill } from "@/constants/organizerCopy";

const PILL_CLASS: Record<OrganizerInvoicePill, string> = {
  ready: "bg-[#22C55E] text-white",
  draft: "bg-white text-[#166534] border border-[#22C55E]/40",
  submitted: "bg-amber-100 text-amber-900",
  settled: "bg-[#DCFCE7] text-[#166534]",
  void: "bg-gray-200 text-gray-700",
  not_ready: "bg-white/80 text-[#166534] border border-[#166534]/15",
};

export default function InvoiceStatusPill({
  pill,
  className = "",
}: {
  pill: OrganizerInvoicePill;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${PILL_CLASS[pill]} ${className}`}
    >
      {pill === "ready" ? ORGANIZER_COPY.invoice.statusReady : pillLabel(pill)}
    </span>
  );
}

function pillLabel(pill: OrganizerInvoicePill): string {
  switch (pill) {
    case "ready":
      return ORGANIZER_COPY.invoice.statusReady;
    case "draft":
      return ORGANIZER_COPY.invoice.statusDraft;
    case "submitted":
      return ORGANIZER_COPY.invoice.statusSubmitted;
    case "settled":
      return ORGANIZER_COPY.invoice.statusSettled;
    case "void":
      return ORGANIZER_COPY.invoice.statusVoid;
    case "not_ready":
      return "Not ready";
    default: {
      const _exhaustive: never = pill;
      return _exhaustive;
    }
  }
}
