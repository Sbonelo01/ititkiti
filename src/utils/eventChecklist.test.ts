import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  eventChecklistStorageKey,
  patchEventChecklist,
  readEventChecklist,
} from "./eventChecklist";

describe("eventChecklist", () => {
  const mem = new Map<string, string>();

  beforeEach(() => {
    mem.clear();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => mem.get(key) ?? null,
        setItem: (key: string, value: string) => {
          mem.set(key, value);
        },
        clear: () => mem.clear(),
      },
    });
  });

  it("returns defaults when nothing is stored", () => {
    expect(readEventChecklist("evt-1")).toEqual({
      dismissed: false,
      shareDone: false,
      scannerDone: false,
    });
  });

  it("patches and persists share/scanner without unlocking settlement", () => {
    const key = eventChecklistStorageKey("evt-1");
    const next = patchEventChecklist("evt-1", { shareDone: true });
    expect(next.shareDone).toBe(true);
    expect(next.scannerDone).toBe(false);
    expect(JSON.parse(mem.get(key) || "{}")).toMatchObject({
      shareDone: true,
    });
  });
});
