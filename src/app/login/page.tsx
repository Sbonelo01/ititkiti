"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/utils/supabaseClient";
import { getProductRole, sanitizeProductRole } from "@/utils/roles";
import Image from "next/image";
import Link from "next/link";
import {
  UserIcon,
  BuildingOfficeIcon,
} from "@heroicons/react/24/outline";
import { AuthPageSkeleton } from "@/components/AppLoadingSkeleton";
import { CtaButton } from "@/components/ui/CtaButton";
import { buildPricingExamples, formatZar } from "@/constants/pricing";
import {
  consumeAuthRedirectPath,
  getOAuthRedirectTo,
  initialAuthScreenMode,
  initialSignupRole,
  isSellAuthRedirect,
  persistAuthRedirectPath,
  resolvePostAuthPath,
  safeAuthRedirectPath,
} from "@/utils/authRedirect";
import { userHasOrganizerEvents } from "@/utils/postAuthLanding";
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

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect");
  const redirectTo = safeAuthRedirectPath(redirectParam);
  const isCheckoutRedirect = redirectTo.startsWith("/events/");
  const isSellRedirect = isSellAuthRedirect(redirectParam);
  const [isLogin, setIsLogin] = useState(
    () => initialAuthScreenMode(redirectParam) === "signin"
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"organizer" | "attendee">(() =>
    initialSignupRole(redirectParam)
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [cellphone, setCellphone] = useState("");
  const [companyLogo, setCompanyLogo] = useState<File | null>(null);
  const [companyLogoPreview, setCompanyLogoPreview] = useState<string | null>(
    null
  );
  const [showLogoPrompt, setShowLogoPrompt] = useState(false);
  const [logoUploadLoading, setLogoUploadLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Arrive on organizer signup for sell CTAs. Re-apply only when the redirect
  // target changes so an existing user can stay on Sign in after toggling.
  useEffect(() => {
    if (!isSellRedirect) return;
    setIsLogin(false);
    setRole("organizer");
  }, [isSellRedirect]);

  useEffect(() => {
    if (!isLogin && isSellRedirect) {
      setRole("organizer");
    }
  }, [isLogin, isSellRedirect]);

  // Redirect if already logged in (attendees can reach sell flow to upgrade)
  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        const destination = await resolvePostAuthPath(
          session.user.id,
          redirectTo,
          userHasOrganizerEvents
        );
        consumeAuthRedirectPath(redirectParam);
        router.push(destination);
      }
    };
    checkUser();
  }, [router, redirectTo, redirectParam]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setCompanyLogo(file);
    if (file) {
      setCompanyLogoPreview(URL.createObjectURL(file));
    } else {
      setCompanyLogoPreview(null);
    }
  };

  const handleLogoUpload = async (file: File) => {
    const fileExt = file.name.split(".").pop();
    const fileName = `company-${Date.now()}.${fileExt}`;
    const { error } = await supabase.storage
      .from("company-logos")
      .upload(fileName, file);
    if (error) throw error;
    const { data: publicUrlData } = supabase.storage
      .from("company-logos")
      .getPublicUrl(fileName);
    return publicUrlData.publicUrl;
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    if (isLogin) {
      persistAuthRedirectPath(redirectTo);
      // Login
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setError(error.message);
      } else {
        if (data.session?.access_token) {
          await linkScannerMemberships(data.session.access_token);
        }
        setMessage("Logged in successfully! Redirecting...");
        const destination = await resolvePostAuthPath(
          data.user?.id,
          redirectTo,
          userHasOrganizerEvents
        );
        consumeAuthRedirectPath(redirectParam);
        setTimeout(() => router.push(destination), 1000);
      }
    } else {
      // Validate required fields
      if (role === "organizer") {
        if (!name || !surname || !companyName || !cellphone || !email || !password) {
          setError("Please fill in all required fields.");
          setLoading(false);
          return;
        }
      } else {
        if (!name || !cellphone || !email || !password) {
          setError("Please fill in all required fields.");
          setLoading(false);
          return;
        }
      }
      // Do NOT upload logo here
      persistAuthRedirectPath(
        redirectTo || (role === "organizer" ? "/dashboard/create-event" : "/dashboard")
      );
      // Signup with extended metadata (without company_logo)
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: getOAuthRedirectTo(window.location.origin),
          data: {
            role: sanitizeProductRole(role),
            name,
            surname: role === "organizer" ? surname : undefined,
            company_name: role === "organizer" ? companyName : undefined,
            cellphone,
            // company_logo: logoUrl, // REMOVE from here
          },
        },
      });
      if (error) {
        setError(error.message);
      } else {
        setMessage("Signup successful! Check your email to confirm your account.");
        const destination = await resolvePostAuthPath(
          data.user?.id ?? data.session?.user?.id,
          redirectTo,
          userHasOrganizerEvents
        );
        if (data.session?.access_token) {
          await linkScannerMemberships(data.session.access_token);
          consumeAuthRedirectPath(redirectParam);
        }
        setTimeout(() => router.push(destination), 1500);
      }
    }
    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setMessage(null);
    setGoogleLoading(true);
    persistAuthRedirectPath(redirectTo);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: getOAuthRedirectTo(window.location.origin),
        queryParams: {
          prompt: "select_account",
        },
      },
    });
    if (oauthError) {
      setError(oauthError.message);
      setGoogleLoading(false);
    }
  };

  // Prompt for logo upload after login if organizer and logo file is present
  useEffect(() => {
    const checkForLogoPrompt = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (
        user &&
        getProductRole(user) === "organizer" &&
        companyLogo &&
        !user.user_metadata?.company_logo
      ) {
        setShowLogoPrompt(true);
      } else {
        setShowLogoPrompt(false);
      }
    };
    checkForLogoPrompt();
  }, [companyLogo]);

  // Handler for uploading logo after login
  const handleLogoUploadAfterAuth = async () => {
    setLogoUploadLoading(true);
    setError(null);
    try {
      if (!companyLogo) throw new Error("No logo file selected.");
      const logoUrl = await handleLogoUpload(companyLogo);
      // Update user_metadata with logo URL
      const { error } = await supabase.auth.updateUser({
        data: {
          company_logo: logoUrl,
        },
      });
      if (error) {
        setError("Failed to update user profile with logo.");
      } else {
        setMessage("Company logo uploaded and profile updated!");
        setCompanyLogo(null);
        setCompanyLogoPreview(null);
        setShowLogoPrompt(false);
      }
    } catch (err: unknown) {
      if (err && typeof err === "object" && "message" in err) {
        setError(
          (err as { message?: string }).message ||
            "Company logo upload failed after authentication."
        );
      } else {
        setError("Company logo upload failed after authentication.");
      }
    }
    setLogoUploadLoading(false);
  };

  const handleToggle = () => {
    setIsLogin(!isLogin);
    setName("");
    setSurname("");
    setCompanyName("");
    setCellphone("");
    setCompanyLogo(null);
    setCompanyLogoPreview(null);
  };

  const fieldClass =
    "mb-3 w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-base text-gray-900 placeholder:text-gray-500 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-green-700)]";
  const labelClass = "mb-1.5 block text-sm font-bold text-gray-900";
  const sellSignup = isSellRedirect && !isLogin;
  const examples = buildPricingExamples();

  const title = isCheckoutRedirect
    ? isLogin
      ? "Almost there"
      : "Quick signup to checkout"
    : sellSignup
      ? "Create your seller account"
      : isSellRedirect
        ? "Sign in to sell tickets"
        : isLogin
          ? "Sign in"
          : "Create your account";

  const lede = isCheckoutRedirect
    ? "Sign in once — your QR tickets land in your dashboard right after payment."
    : sellSignup
      ? "Create an organizer account, then continue into listing your event. You keep 100% of ticket face value. Listing is free."
      : isSellRedirect
        ? "Sign in, then we'll help you enable organizer tools on your account."
        : isLogin
          ? "Sign in to your events and tickets."
          : "Create an account to buy QR tickets or list an event. Listing is free, and organizers keep 100% of ticket face value.";

  return (
    <div className="bg-[#F7FBF8] text-gray-950">
      <section className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
        <p className="inline-flex rounded-full bg-green-100 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-green-700">
          {sellSignup ? "Organizer sign-up" : isLogin ? "Sign in" : "Create account"}
        </p>
        <h1 id="auth-title" className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">
          {title}
        </h1>
        <p id="auth-lede" className="mt-3 max-w-2xl text-lg text-gray-600">
          {lede}
        </p>
      </section>

      <section className="mx-auto grid max-w-6xl items-start gap-8 px-4 py-8 sm:px-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-lg sm:p-8">
          {sellSignup && (
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-green-200 bg-green-50 px-4 py-3">
              <div>
                <p className="font-bold">Organizer account</p>
                <p className="text-sm text-gray-600">You&apos;ll list your event right after this.</p>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-green-900">
                Selling tickets
              </span>
            </div>
          )}
          {sellSignup && (
            <p className="mb-4 text-sm text-gray-600">
              Buying tickets instead?{" "}
              <Link href="/events" className="font-bold text-green-800 underline">
                Browse events
              </Link>
              .
            </p>
          )}

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading || googleLoading}
            className="inline-flex w-full items-center justify-center gap-3 rounded-xl border border-gray-300 bg-white px-4 py-3 font-bold text-gray-900 hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-green-700)] disabled:cursor-not-allowed disabled:opacity-50"
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
          <p className="mt-2 text-center text-xs text-gray-600">
            New Google accounts start as ticket buyers. You can enable selling after sign-in.
          </p>

          <div className="my-4 flex items-center gap-3 text-sm text-gray-500">
            <span className="h-px flex-1 bg-gray-200" />
            or continue with email
            <span className="h-px flex-1 bg-gray-200" />
          </div>

          {(error || message) && (
            <div className="mb-4">
              {error && (
                <p id="form-error" role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </p>
              )}
              {message && (
                <p id="form-status" role="status" className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                  {message}
                </p>
              )}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-1">
            {!isLogin && !sellSignup && (
              <fieldset className="mb-4">
                <legend className="mb-2 text-sm font-bold text-gray-900">I am a</legend>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 bg-white p-3 ${role === "attendee" ? "border-green-600" : "border-gray-200"}`}>
                    <input
                      type="radio"
                      name="role"
                      value="attendee"
                      checked={role === "attendee"}
                      onChange={() => setRole("attendee")}
                      className="mt-1"
                    />
                    <span>
                      <span className="flex items-center font-semibold">
                        <UserIcon className="mr-2 h-5 w-5 text-green-700" aria-hidden />
                        Attendee
                      </span>
                      <span className="block text-sm text-gray-600">I want to buy tickets</span>
                    </span>
                  </label>
                  <label className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 bg-white p-3 ${role === "organizer" ? "border-green-600" : "border-gray-200"}`}>
                    <input
                      type="radio"
                      name="role"
                      value="organizer"
                      checked={role === "organizer"}
                      onChange={() => setRole("organizer")}
                      className="mt-1"
                    />
                    <span>
                      <span className="flex items-center font-semibold">
                        <BuildingOfficeIcon className="mr-2 h-5 w-5 text-green-700" aria-hidden />
                        Organizer
                      </span>
                      <span className="block text-sm text-gray-600">I want to create events</span>
                    </span>
                  </label>
                </div>
              </fieldset>
            )}

            {!isLogin && (
              <div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="given-name" className={labelClass}>First name</label>
                    <input
                      id="given-name"
                      name="given-name"
                      type="text"
                      autoComplete="given-name"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={fieldClass}
                      placeholder="Your first name"
                    />
                  </div>
                  {role === "organizer" && (
                    <div>
                      <label htmlFor="family-name" className={labelClass}>Last name</label>
                      <input
                        id="family-name"
                        name="family-name"
                        type="text"
                        autoComplete="family-name"
                        required
                        value={surname}
                        onChange={(e) => setSurname(e.target.value)}
                        className={fieldClass}
                        placeholder="Your last name"
                      />
                    </div>
                  )}
                </div>
                {role === "organizer" && (
                  <div>
                    <label htmlFor="company-name" className={labelClass}>Organizer or company name</label>
                    <input
                      id="company-name"
                      name="organization"
                      type="text"
                      autoComplete="organization"
                      required
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className={fieldClass}
                      placeholder="Your company name"
                    />
                  </div>
                )}
                <div>
                  <label htmlFor="phone" className={labelClass}>Phone number</label>
                  <input
                    id="phone"
                    name="tel"
                    type="tel"
                    autoComplete="tel"
                    required
                    value={cellphone}
                    onChange={(e) => setCellphone(e.target.value)}
                    className={fieldClass}
                    placeholder="e.g. 061 069 2364"
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="email" className={labelClass}>Email address</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={fieldClass}
                placeholder="Enter your email"
                aria-describedby={error ? "form-error" : undefined}
              />
            </div>
            <div>
              <label htmlFor="password" className={labelClass}>Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete={isLogin ? "current-password" : "new-password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={fieldClass}
                placeholder="Enter your password"
              />
            </div>

            {!isLogin && role === "organizer" && (
              <details className="mb-4 rounded-xl border border-gray-200 p-4">
                <summary className="cursor-pointer text-sm font-bold text-gray-900">
                  Company logo (optional)
                </summary>
                <p className="mt-2 text-xs text-gray-600">
                  You can add a logo now or later from your profile.
                </p>
                <label htmlFor="company-logo" className={`${labelClass} mt-3`}>
                  Upload a logo
                </label>
                <input
                  id="company-logo"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="w-full text-sm"
                />
                {companyLogoPreview && (
                  <div className="relative mt-3 h-32 w-full overflow-hidden rounded-xl border border-gray-200">
                    <Image src={companyLogoPreview} alt="Company logo preview" fill className="object-contain" />
                  </div>
                )}
              </details>
            )}

            <CtaButton
              type="submit"
              disabled={loading || googleLoading}
              variant="primary"
              className="mt-2 w-full rounded-full py-4 text-base font-bold"
            >
              {loading ? (
                isLogin ? "Signing in…" : "Creating account…"
              ) : isCheckoutRedirect ? (
                isLogin ? "Sign in & continue to checkout" : "Create account & continue"
              ) : sellSignup ? (
                "Create organizer account"
              ) : (
                isLogin ? "Sign in" : "Create account"
              )}
            </CtaButton>

            <p className="pt-4 text-center text-gray-600">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button
                type="button"
                onClick={handleToggle}
                className="font-bold text-green-800 underline"
              >
                {isLogin ? "Sign up" : "Sign in"}
              </button>
            </p>
          </form>
        </div>

        <aside className="space-y-4">
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-lg">
            <h2 className="text-xl font-extrabold">What you keep</h2>
            <p className="mt-2 text-sm text-gray-600">
              You receive 100% of ticket face value. Buyers pay the platform fee at checkout.
            </p>
            <dl className="mt-4 text-sm">
              {examples.map((example) => (
                <div key={example.tierId} className="flex justify-between gap-3 border-b border-gray-100 py-2">
                  <dt>{example.label}</dt>
                  <dd className="font-bold">Buyer pays {example.tierAmountLabel}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-xs text-gray-500">
              Listing is free. Card processing is included in the buyer fee. Example: a{" "}
              {formatZar(examples[1]?.faceZar ?? 100)} ticket adds a {formatZar(examples[1]?.feeZar ?? 10)} buyer fee.
            </p>
          </div>
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-lg">
            <h2 className="text-xl font-extrabold">What happens next</h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-gray-700">
              {sellSignup ? (
                <>
                  <li>Create your organizer account.</li>
                  <li>Confirm your email before continuing. That confirmation step is part of the live sign-up.</li>
                  <li>Continue into listing your event. Listing is free.</li>
                  <li>Door scanning is included at scan.tikiti.fun. After the event starts, generate a settlement invoice for 100% of face value.</li>
                </>
              ) : isCheckoutRedirect ? (
                <>
                  <li>Sign in or create an account.</li>
                  <li>Return to checkout and pay with Paystack.</li>
                  <li>Your QR ticket appears in your dashboard after payment.</li>
                </>
              ) : (
                <>
                  <li>Sign in to the dashboard for your tickets or events.</li>
                  <li>Guests get QR tickets after payment. Organizers list events for free.</li>
                  <li>Door scanning is in the browser at scan.tikiti.fun.</li>
                </>
              )}
            </ol>
          </div>
        </aside>
      </section>

      {showLogoPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" role="dialog" aria-labelledby="logo-upload-title">
            <h2 id="logo-upload-title" className="text-2xl font-bold text-gray-900">
              Upload company logo
            </h2>
            <p className="mt-2 text-gray-600">
              You selected a company logo during sign up. Would you like to upload it now?
            </p>
            {companyLogoPreview && (
              <div className="relative mt-4 h-32 w-full overflow-hidden rounded-xl border border-gray-200">
                <Image src={companyLogoPreview} alt="Company logo preview" fill className="object-contain" />
              </div>
            )}
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-gray-800 hover:bg-gray-50"
                onClick={() => {
                  setShowLogoPrompt(false);
                  setCompanyLogo(null);
                  setCompanyLogoPreview(null);
                }}
                disabled={logoUploadLoading}
              >
                Skip
              </button>
              <button
                type="button"
                className="flex-1 rounded-xl bg-green-600 px-4 py-3 font-semibold text-white hover:bg-green-700 disabled:opacity-60"
                onClick={handleLogoUploadAfterAuth}
                disabled={logoUploadLoading}
              >
                {logoUploadLoading ? "Uploading..." : "Upload logo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Login() {
  return (
    <Suspense fallback={<AuthPageSkeleton />}>
      <LoginForm />
    </Suspense>
  );
}
