/** Best-effort. Sign-in still finishes if this request fails. */
export async function linkScannerMemberships(accessToken: string): Promise<void> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  try {
    await fetch("/api/scanner/link-memberships", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
      signal: controller.signal,
    });
  } catch {
    // The scanner access check links again on the next request.
  } finally {
    clearTimeout(timeout);
  }
}
