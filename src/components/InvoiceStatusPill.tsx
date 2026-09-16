import { invoiceStatusHelper, organizerInvoicePillLabel, type OrganizerInvoicePill } from "@/constants/organizerCopy";

const PILL_CLASS: Record<OrganizerInvoicePill, string> = {
  ready: "bg-[#22C55E] text-white",
  draft: "bg-white text-[#166534] border border-[#22C55E]/40",
  submitted: "bg-amber-100 text-amber-900",
  settled: "bg-[#DCFCE7] text-[#166534]",
  void: "bg-gray-200 text-gray-700",
  not_ready: "bg-white/80 text-[#166534] border border-[#166534]/15",
};

function helperForPill(pill: OrganizerInvoicePill): string | undefined {
  switch (pill) {
    case "draft":
      return invoiceStatusHelper("draft") ?? undefined;
    case "submitted":
      return invoiceStatusHelper("issued") ?? undefined;
    case "ready":
    case "settled":
    case "void":
    case "not_ready":
      return undefined;
    default: {
      const _exhaustive: never = pill;
      return _exhaustive;
    }
  }
}

export default function InvoiceStatusPill({
  pill,
  className = "",
}: {
  pill: OrganizerInvoicePill;
  className?: string;
}) {
  const helper = helperForPill(pill);
  return (
    <span
      title={helper}
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${PILL_CLASS[pill]} ${className}`}
    >
      {organizerInvoicePillLabel(pill)}
    </span>
  );
}
