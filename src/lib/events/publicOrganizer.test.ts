import { describe, expect, it } from "vitest";
import {
  displayNameFromAuthMetadata,
  publicOrganizerCardFromAuthMetadata,
  publicOrganizerCardFromProfileRow,
  safePublicEmail,
  safePublicHttpUrl,
  safePublicPhone,
  telHref,
} from "./publicOrganizer";

const SECRET_EMAIL = "ada.private@example.com";
const SECRET_PHONE = "0820000000";
const SECRET_BANK = "62200000000";
const SECRET_ID = "11111111-1111-4111-8111-111111111111";

const privateMetadata = {
  email: SECRET_EMAIL,
  phone: SECRET_PHONE,
  cellphone: SECRET_PHONE,
  company_logo: "https://cdn.example/private-logo.png",
  full_name: "Derived From Provider",
  id: SECRET_ID,
  organizer_id: SECRET_ID,
  user_metadata: { cellphone: SECRET_PHONE },
  app_metadata: { role: "organizer" },
  bank_account: SECRET_BANK,
};

describe("display name from auth metadata", () => {
  it("uses the company or event name the organiser typed", () => {
    expect(
      displayNameFromAuthMetadata({
        ...privateMetadata,
        company_name: "  Analytical Engines  ",
        name: "Ada",
        surname: "Lovelace",
      })
    ).toBe("Analytical Engines");
  });

  it("falls back to the typed personal name when company name is absent", () => {
    expect(displayNameFromAuthMetadata({ ...privateMetadata, name: "Ada", surname: "Lovelace" })).toBe(
      "Ada Lovelace"
    );
    expect(displayNameFromAuthMetadata({ name: "Ada" })).toBe("Ada");
    expect(displayNameFromAuthMetadata({ surname: "Lovelace" })).toBe("Lovelace");
  });

  it("does not derive a name from email, phone, logo, or provider full_name", () => {
    expect(publicOrganizerCardFromAuthMetadata(privateMetadata)).toBeNull();
    expect(publicOrganizerCardFromAuthMetadata({ email: SECRET_EMAIL })).toBeNull();
    expect(publicOrganizerCardFromAuthMetadata({ full_name: "Ada Lovelace" })).toBeNull();
    expect(publicOrganizerCardFromAuthMetadata({ company_name: "   " })).toBeNull();
    expect(publicOrganizerCardFromAuthMetadata(null)).toBeNull();
  });

  it("returns only the display name from metadata", () => {
    const card = publicOrganizerCardFromAuthMetadata({
      ...privateMetadata,
      company_name: "Analytical Engines",
    });

    expect(card).toEqual({ displayName: "Analytical Engines" });
    expect(Object.keys(card ?? {})).toEqual(["displayName"]);
    const serialized = JSON.stringify(card);
    expect(serialized).not.toContain(SECRET_EMAIL);
    expect(serialized).not.toContain(SECRET_PHONE);
    expect(serialized).not.toContain(SECRET_BANK);
    expect(serialized).not.toContain(SECRET_ID);
    expect(serialized).not.toContain("private-logo");
    expect(serialized).not.toContain("full_name");
    expect(serialized).not.toContain("user_metadata");
  });

  it("keeps a long typed name and drops an unbounded value", () => {
    const longName = "A".repeat(200);
    expect(displayNameFromAuthMetadata({ company_name: longName })).toBe(longName);
    expect(displayNameFromAuthMetadata({ company_name: "A".repeat(201) })).toBeNull();
  });
});

describe("explicit public profile row", () => {
  it("keeps published fields and drops private keys on the same row", () => {
    const card = publicOrganizerCardFromProfileRow({
      display_name: "Analytical Engines",
      bio: "Live shows in Durban.",
      website_url: "https://events.example/nights",
      logo_url: "https://cdn.example/logo.png",
      public_email: "press@example.com",
      public_phone: "+27 61 069 2364",
      organizer_id: SECRET_ID,
      email: SECRET_EMAIL,
      cellphone: SECRET_PHONE,
      phone: SECRET_PHONE,
      user_metadata: privateMetadata,
      bank_account: SECRET_BANK,
    });

    expect(card).toEqual({
      displayName: "Analytical Engines",
      bio: "Live shows in Durban.",
      websiteUrl: "https://events.example/nights",
      logoUrl: "https://cdn.example/logo.png",
      publicEmail: "press@example.com",
      publicPhone: "+27 61 069 2364",
    });
    const serialized = JSON.stringify(card);
    expect(serialized).not.toContain(SECRET_EMAIL);
    expect(serialized).not.toContain(SECRET_PHONE);
    expect(serialized).not.toContain(SECRET_BANK);
    expect(serialized).not.toContain(SECRET_ID);
  });

  it("hides the card when the published name is missing", () => {
    expect(
      publicOrganizerCardFromProfileRow({
        public_email: "press@example.com",
        public_phone: "+27 61 069 2364",
        email: SECRET_EMAIL,
      })
    ).toBeNull();
    expect(publicOrganizerCardFromProfileRow({ display_name: "   " })).toBeNull();
    expect(publicOrganizerCardFromProfileRow(null)).toBeNull();
  });

  it("omits absent optional fields", () => {
    expect(publicOrganizerCardFromProfileRow({ display_name: "Ada" })).toEqual({
      displayName: "Ada",
    });
  });
});

describe("public link validation", () => {
  it("allows http and https urls", () => {
    expect(safePublicHttpUrl("https://events.example/nights?q=1")).toBe(
      "https://events.example/nights?q=1"
    );
    expect(safePublicHttpUrl("http://events.example")).toBe("http://events.example/");
  });

  it("rejects unsafe and non-public links", () => {
    expect(safePublicHttpUrl("javascript:alert(1)")).toBeNull();
    expect(safePublicHttpUrl("data:text/html,hi")).toBeNull();
    expect(safePublicHttpUrl("mailto:press@example.com")).toBeNull();
    expect(safePublicHttpUrl("tel:+27610692364")).toBeNull();
    expect(safePublicHttpUrl("//events.example")).toBeNull();
    expect(safePublicHttpUrl("https://user:pass@events.example/logo.png")).toBeNull();
    expect(safePublicHttpUrl("https://events.example\\@evil.test")).toBeNull();
    expect(safePublicHttpUrl("")).toBeNull();
  });

  it("accepts only an explicit public email or phone", () => {
    expect(safePublicEmail("press@example.com")).toBe("press@example.com");
    expect(safePublicEmail("not-an-email")).toBeNull();
    expect(safePublicEmail("Ada <press@example.com>")).toBeNull();
    expect(safePublicPhone("+27 61 069 2364")).toBe("+27 61 069 2364");
    expect(safePublicPhone("call me")).toBeNull();
    expect(safePublicPhone("123")).toBeNull();
    expect(telHref("+27 61 069 2364")).toBe("tel:+27610692364");
    expect(telHref("javascript:alert(1)")).toBeNull();
  });

  it("drops bad links and still returns the published name", () => {
    expect(
      publicOrganizerCardFromProfileRow({
        display_name: "Analytical Engines",
        website_url: "javascript:alert(1)",
        logo_url: "data:text/html,hi",
        public_email: "not-an-email",
        public_phone: "call me",
        bio: "B".repeat(2001),
      })
    ).toEqual({ displayName: "Analytical Engines" });
  });
});
