import { describe, expect, it } from "vitest";
import {
  DEFAULT_AUTH_REDIRECT,
  getOAuthRedirectTo,
  oauthErrorFromParams,
  safeAuthRedirectPath,
} from "@/utils/authRedirect";

describe("safeAuthRedirectPath", () => {
  it("returns the fallback when next is missing", () => {
    expect(safeAuthRedirectPath(null)).toBe(DEFAULT_AUTH_REDIRECT);
    expect(safeAuthRedirectPath(undefined)).toBe(DEFAULT_AUTH_REDIRECT);
    expect(safeAuthRedirectPath("")).toBe(DEFAULT_AUTH_REDIRECT);
  });

  it("allows relative app paths including checkout and sell flows", () => {
    expect(safeAuthRedirectPath("/dashboard")).toBe("/dashboard");
    expect(safeAuthRedirectPath("/dashboard/create-event")).toBe(
      "/dashboard/create-event"
    );
    expect(safeAuthRedirectPath("/events/abc-123")).toBe("/events/abc-123");
  });

  it("rejects open redirects", () => {
    expect(safeAuthRedirectPath("https://evil.example")).toBe(DEFAULT_AUTH_REDIRECT);
    expect(safeAuthRedirectPath("//evil.example")).toBe(DEFAULT_AUTH_REDIRECT);
    expect(safeAuthRedirectPath("/\\evil.example")).toBe(DEFAULT_AUTH_REDIRECT);
    expect(safeAuthRedirectPath("events/no-slash")).toBe(DEFAULT_AUTH_REDIRECT);
  });
});

describe("getOAuthRedirectTo", () => {
  it("builds a callback URL with a sanitized next path", () => {
    expect(getOAuthRedirectTo("https://www.tikiti.fun", "/events/1")).toBe(
      "https://www.tikiti.fun/auth/callback?next=%2Fevents%2F1"
    );
  });

  it("falls back when next is not a safe path", () => {
    expect(getOAuthRedirectTo("http://localhost:3000", "https://evil.example")).toBe(
      "http://localhost:3000/auth/callback?next=%2Fdashboard"
    );
  });
});

describe("oauthErrorFromParams", () => {
  it("prefers error_description from the query string", () => {
    const search = new URLSearchParams("error=access_denied&error_description=User+cancelled");
    expect(oauthErrorFromParams(search, new URLSearchParams())).toBe("User cancelled");
  });

  it("reads implicit-flow errors from the hash", () => {
    const hash = new URLSearchParams("error=server_error");
    expect(oauthErrorFromParams(new URLSearchParams(), hash)).toBe("server_error");
  });
});
