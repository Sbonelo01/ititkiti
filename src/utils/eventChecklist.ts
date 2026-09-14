export type EventChecklistState = {
  dismissed: boolean;
  shareDone: boolean;
  scannerDone: boolean;
};

const DEFAULT_STATE: EventChecklistState = {
  dismissed: false,
  shareDone: false,
  scannerDone: false,
};

export function eventChecklistStorageKey(eventId: string): string {
  return `tikiti.event-checklist.${eventId}`;
}

export function readEventChecklist(eventId: string): EventChecklistState {
  if (typeof window === "undefined") return { ...DEFAULT_STATE };
  try {
    const raw = window.localStorage.getItem(eventChecklistStorageKey(eventId));
    if (!raw) return { ...DEFAULT_STATE };
    const parsed = JSON.parse(raw) as Partial<EventChecklistState>;
    return {
      dismissed: Boolean(parsed.dismissed),
      shareDone: Boolean(parsed.shareDone),
      scannerDone: Boolean(parsed.scannerDone),
    };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export function writeEventChecklist(eventId: string, next: EventChecklistState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(eventChecklistStorageKey(eventId), JSON.stringify(next));
}

export function patchEventChecklist(
  eventId: string,
  patch: Partial<EventChecklistState>
): EventChecklistState {
  const next = { ...readEventChecklist(eventId), ...patch };
  writeEventChecklist(eventId, next);
  return next;
}
