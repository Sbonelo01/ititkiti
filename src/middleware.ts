import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SCANNER_API_PATHS = new Set([
  "/api/scanner/access",
  "/api/validate-ticket",
  "/api/validate-ticket-mobile",
]);

function isScannerMobileApi(pathname: string): boolean {
  return SCANNER_API_PATHS.has(pathname) || pathname.startsWith("/api/scanner/");
}

function resolveCorsOrigin(request: NextRequest): string | null {
  const origin = request.headers.get("origin");
  const allowlist = process.env.SCANNER_CORS_ORIGINS?.split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (allowlist?.length) {
    if (origin && allowlist.includes(origin)) {
      return origin;
    }
    return null;
  }

  return origin ?? "*";
}

function applyScannerCorsHeaders(response: NextResponse, request: NextRequest): void {
  const allowedOrigin = resolveCorsOrigin(request);
  if (allowedOrigin) {
    response.headers.set("Access-Control-Allow-Origin", allowedOrigin);
  }
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
  response.headers.set("Access-Control-Max-Age", "86400");
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isScannerMobileApi(pathname)) {
    if (request.method === "OPTIONS") {
      const preflight = new NextResponse(null, { status: 204 });
      applyScannerCorsHeaders(preflight, request);
      preflight.headers.set("Cache-Control", "no-store");
      return preflight;
    }

    const response = NextResponse.next();
    applyScannerCorsHeaders(response, request);
    response.headers.set("Cache-Control", "no-store");
    return response;
  }

  const response = NextResponse.next();

  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(self), microphone=()");

  if (pathname.startsWith("/api/")) {
    response.headers.set("Cache-Control", "no-store");
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
