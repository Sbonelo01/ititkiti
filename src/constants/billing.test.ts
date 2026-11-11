import { describe, expect, it } from "vitest";
import { TIKITI_BILL_TO, visibleTikitiBillToEmail } from "@/constants/billing";

describe("Tikiti invoice contact", () => {
  it("uses info@tikiti.fun for new invoices and old billing addresses", () => {
    expect(TIKITI_BILL_TO.email).toBe("info@tikiti.fun");
    expect(visibleTikitiBillToEmail("billing@tikiti.fun")).toBe("info@tikiti.fun");
    expect(visibleTikitiBillToEmail(" Billing@Tikiti.fun ")).toBe("info@tikiti.fun");
    expect(visibleTikitiBillToEmail("info@tikiti.fun")).toBe("info@tikiti.fun");
    expect(visibleTikitiBillToEmail("organizer@example.com")).toBe("organizer@example.com");
    expect(visibleTikitiBillToEmail("")).toBeNull();
    expect(visibleTikitiBillToEmail(null)).toBeNull();
  });
});
