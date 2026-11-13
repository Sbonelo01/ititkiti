"use client";

import { useState, type FormEvent } from "react";
import { supabase } from "@/utils/supabaseClient";
import { getOAuthRedirectTo, persistAuthRedirectPath } from "@/utils/authRedirect";
import { linkScannerMemberships } from "@/lib/scanner/linkScannerMemberships";

function GoogleGlyph() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

type ScanLoginProps = {
  returnPath: string;
};

export default function ScanLogin({ returnPath }: ScanLoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const createAccountHref = `/login?redirect=${encodeURIComponent(returnPath)}`;

  const handlePassword = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setPasswordLoading(true);
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (signInError) {
      setError(signInError.message);
      setPasswordLoading(false);
      return;
    }
    if (data.session?.access_token) {
      await linkScannerMemberships(data.session.access_token);
    }
    setPasswordLoading(false);
  };

  const handleGoogle = async () => {
    setError(null);
    setGoogleLoading(true);
    persistAuthRedirectPath(returnPath);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: getOAuthRedirectTo(window.location.origin),
        queryParams: { prompt: "select_account" },
      },
    });
    if (oauthError) {
      setError(oauthError.message);
      setGoogleLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black px-4 text-white">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold">Staff scanner</h1>
        <p className="mt-2 text-sm text-gray-400">
          Sign in with the email an organizer invited. Google sign-in alone does not grant access.
        </p>

        <button
          type="button"
          onClick={() => {
            void handleGoogle();
          }}
          disabled={passwordLoading || googleLoading}
          className="mt-6 inline-flex w-full items-center justify-center gap-3 rounded-xl border border-white/20 bg-white px-4 py-3 font-bold text-gray-900 hover:bg-gray-100 disabled:opacity-50"
        >
          {googleLoading ? (
            "Continuing with Google…"
          ) : (
            <>
              <GoogleGlyph />
              Continue with Google
            </>
          )}
        </button>

        <div className="my-4 flex items-center gap-3 text-sm text-gray-500">
          <span className="h-px flex-1 bg-white/15" />
          or email
          <span className="h-px flex-1 bg-white/15" />
        </div>

        <form onSubmit={(event) => { void handlePassword(event); }} className="space-y-3">
          <label className="block text-sm font-semibold" htmlFor="scan-email">
            Email
          </label>
          <input
            id="scan-email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-green-500"
          />
          <label className="block text-sm font-semibold" htmlFor="scan-password">
            Password
          </label>
          <input
            id="scan-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-green-500"
          />
          {error && (
            <p role="alert" className="text-sm text-red-300">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={passwordLoading || googleLoading}
            className="w-full rounded-xl bg-green-600 px-4 py-3 font-semibold text-white hover:bg-green-700 disabled:opacity-50"
          >
            {passwordLoading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-400">
          No account yet?{" "}
          <a href={createAccountHref} className="font-semibold text-green-400">
            Create one
          </a>
        </p>
      </div>
    </div>
  );
}
