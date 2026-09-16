"use client";

import { useEffect, useState } from "react";
import { CheckIcon, LockClosedIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { ORGANIZER_COPY } from "@/constants/organizerCopy";
import {
  patchEventChecklist,
  readEventChecklist,
  type EventChecklistState,
} from "@/utils/eventChecklist";
import { canGenerateInvoiceForEvent } from "@/utils/eventSchedule";

type EventOnboardingChecklistProps = {
  eventId: string;
  eventDate: string;
  settlementDone: boolean;
  onShareClick?: () => void;
};

export default function EventOnboardingChecklist({
  eventId,
  eventDate,
  settlementDone,
  onShareClick,
}: EventOnboardingChecklistProps) {
  const copy = ORGANIZER_COPY.onboarding;
  const [state, setState] = useState<EventChecklistState>({
    dismissed: false,
    shareDone: false,
    scannerDone: false,
  });

  useEffect(() => {
    setState(readEventChecklist(eventId));
  }, [eventId]);

  if (state.dismissed) return null;

  const settlementUnlocked = canGenerateInvoiceForEvent(eventDate) || settlementDone;
  const items = [
    {
      id: "share" as const,
      label: copy.checklistShare,
      helper: copy.checklistShareHelper,
      done: state.shareDone,
    },
    {
      id: "scanner" as const,
      label: copy.checklistScanner,
      helper: copy.checklistScannerHelper,
      extraHelper: copy.scannerTestHelper,
      done: state.scannerDone,
    },
    {
      id: "settle" as const,
      label: copy.checklistSettle,
      helper: copy.checklistSettleHelper,
      done: settlementDone,
      locked: !settlementUnlocked,
    },
  ];
  const doneCount = items.filter((item) => item.done).length;
  const progress = Math.round((doneCount / items.length) * 100);

  const toggle = (id: "share" | "scanner") => {
    const next = patchEventChecklist(eventId, {
      shareDone: id === "share" ? !state.shareDone : state.shareDone,
      scannerDone: id === "scanner" ? !state.scannerDone : state.scannerDone,
    });
    setState(next);
    if (id === "share") onShareClick?.();
  };

  return (
    <div className="rounded-2xl border border-[#22C55E]/20 bg-[#F0FDF4] p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold uppercase tracking-wide text-[#166534]">{copy.checklistTitle}</p>
        <button
          type="button"
          onClick={() => setState(patchEventChecklist(eventId, { dismissed: true }))}
          className="rounded-lg p-1 text-gray-400 hover:text-gray-600"
          aria-label={copy.checklistDismiss}
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      </div>
      <div className="h-1.5 rounded-full bg-white overflow-hidden mb-3">
        <div className="h-full rounded-full bg-[#22C55E] transition-all" style={{ width: `${progress}%` }} />
      </div>
      <ul className="space-y-2">
        {items.map((item) => {
          const locked = "locked" in item && item.locked;
          return (
            <li key={item.id}>
              {item.id === "settle" ? (
                <div
                  className={`flex items-start gap-2 text-sm ${
                    locked ? "text-gray-400" : item.done ? "text-[#166534]" : "text-gray-700"
                  }`}
                >
                  {locked ? (
                    <LockClosedIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  ) : item.done ? (
                    <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-[#16A34A]" aria-hidden />
                  ) : (
                    <span className="mt-0.5 h-4 w-4 shrink-0 rounded-full border border-[#22C55E]/40" />
                  )}
                  <span>
                    <span className={`block ${item.done ? "line-through" : ""}`}>{item.label}</span>
                    <span className="block text-xs font-normal text-gray-500 mt-0.5">{item.helper}</span>
                    {locked && <span className="block text-xs">({copy.checklistLocked})</span>}
                  </span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => toggle(item.id)}
                  className="flex w-full items-start gap-2 text-sm text-left text-gray-700"
                >
                  {item.done ? (
                    <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-[#16A34A]" aria-hidden />
                  ) : (
                    <span className="mt-0.5 h-4 w-4 shrink-0 rounded-full border border-[#22C55E]/50" />
                  )}
                  <span>
                    <span className={`block ${item.done ? "line-through text-[#166534]" : ""}`}>
                      {item.label}
                    </span>
                    {!item.done && (
                      <span className="block text-xs font-normal text-gray-500 mt-0.5">{item.helper}</span>
                    )}
                    {item.id === "scanner" && !item.done && "extraHelper" in item && (
                      <span className="block text-xs font-normal text-gray-500 mt-0.5">
                        {item.extraHelper}
                      </span>
                    )}
                  </span>
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
