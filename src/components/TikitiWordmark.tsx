import { ORGANIZER_COPY } from "@/constants/organizerCopy";

export default function TikitiWordmark({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full bg-[#16A34A] px-3 py-1 text-sm font-semibold lowercase tracking-tight text-white ${className}`}
    >
      {ORGANIZER_COPY.wordmark}
    </span>
  );
}
