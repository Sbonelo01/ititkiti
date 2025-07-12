"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabaseClient";
import Image from "next/image";

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"organizer" | "attendee">("attendee");
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
  const router = useRouter();

  // Check if user is already logged in
  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        router.push("/dashboard");
      }
    };
    checkUser();
  }, [router]);

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
      // Login
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setError(error.message);
      } else {
        setMessage("Logged in successfully! Redirecting...");
        setTimeout(() => router.push("/dashboard"), 1000);
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
      // Signup with extended metadata (without company_logo)
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role,
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
        if (role === "organizer") {
          setTimeout(() => router.push("/dashboard"), 1500);
        }
      }
    }
    setLoading(false);
  };

  // Prompt for logo upload after login if organizer and logo file is present
  useEffect(() => {
    const checkForLogoPrompt = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (
        user &&
        user.user_metadata?.role === "organizer" &&
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

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          {/* Spotify-like logo/icon area */}
          <div className="mx-auto h-12 w-12 bg-spotify-green rounded-full flex items-center justify-center shadow-lg">
          <div className="h-9 w-9 rounded-full bg-spotify-green flex items-center justify-center shadow-lg">
            <svg className="h-6 w-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
            </svg>
          </div>
          <span className="text-2xl font-bold tracking-tight text-green-500">Tikiti</span>
          </div>
          <h2 className="mt-6 text-center text-3xl font-bold text-green-500">
            {isLogin ? "Sign in to your account" : "Create your account"}
          </h2>
          <p className="mt-2 text-center text-sm text-green-500">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={handleToggle}
              className="font-medium text-green-600 hover:text-green-700 transition duration-200"
            >
              {isLogin ? "Sign up" : "Sign in"}
            </button>
          </p>
        </div>
        <form
          className="mt-8 space-y-6 bg-white p-8 rounded-lg shadow-xl"
          onSubmit={handleAuth}
        >
          {/* Error/Success Messages */}
          {(error || message) && (
            <div className="mb-4">
              {error && (
                <div
                  className="text-red-400 text-sm bg-red-900 bg-opacity-30 p-3 rounded-md mb-2 border border-red-700"
                  role="alert"
                >
                  {error}
                </div>
              )}
              {message && (
                <div
                  className="text-spotify-green text-sm bg-green-900 bg-opacity-30 p-3 rounded-md border border-spotify-green"
                  role="status"
                >
                  {message}
                </div>
              )}
            </div>
          )}

          {/* Role Selection - always at the top in signup mode */}
          {!isLogin && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-foreground mb-2">
                I am a:
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="role"
                    value="attendee"
                    checked={role === "attendee"}
                    onChange={(e) =>
                      setRole(e.target.value as "organizer" | "attendee")
                    }
                    className="h-4 w-4 text-spotify-green focus:ring-spotify-green border-gray-600 bg-card-background checked:bg-spotify-green checked:border-transparent"
                  />
                  <span className="ml-2 text-sm text-foreground">Attendee</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="role"
                    value="organizer"
                    checked={role === "organizer"}
                    onChange={(e) =>
                      setRole(e.target.value as "organizer" | "attendee")
                    }
                    className="h-4 w-4 text-spotify-green focus:ring-spotify-green border-gray-600 bg-card-background checked:bg-spotify-green checked:border-transparent"
                  />
                  <span className="ml-2 text-sm text-foreground">Organizer</span>
                </label>
              </div>
            </div>
          )}

          {/* Account Information Section */}
          <div className="mb-6">
                          <h3 className="text-lg font-semibold text-green-500 mb-2">
                Account Information
              </h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-foreground">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full px-4 py-2 rounded-md shadow placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 sm:text-sm bg-input-background text-foreground"
                  placeholder="Email address"
                  aria-required={true}
                />
                <p className="text-xs text-text-faded mt-1">
                  We will send a confirmation email to this address.
                </p>
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-foreground">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full px-4 py-2 rounded-md shadow placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 sm:text-sm bg-input-background text-foreground"
                  placeholder="Password"
                  aria-required={true}
                />
                <p className="text-xs text-text-faded mt-1">
                  Must be at least 6 characters.
                </p>
              </div>
            </div>
          </div>

          {/* Personal Information Section */}
          {!isLogin && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-green-500 mb-2">
                Personal Information
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground">Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="mt-1 block w-full px-4 py-2 rounded-md shadow placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 sm:text-sm bg-input-background text-foreground"
                    placeholder="Your name"
                    aria-required={true}
                  />
                </div>
                {/* Organizer-only Surname */}
                {role === "organizer" && (
                  <div>
                    <label className="block text-sm font-medium text-foreground">Surname</label>
                    <input
                      type="text"
                      value={surname}
                      onChange={(e) => setSurname(e.target.value)}
                      required
                      className="mt-1 block w-full px-4 py-2 rounded-md shadow placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 sm:text-sm bg-input-background text-foreground"
                      placeholder="Your surname"
                      aria-required={true}
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-foreground">
                    Cellphone Number
                  </label>
                  <input
                    type="tel"
                    value={cellphone}
                    onChange={(e) => setCellphone(e.target.value)}
                    required
                    className="mt-1 block w-full px-4 py-2 rounded-md shadow placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 sm:text-sm bg-input-background text-foreground"
                    placeholder="e.g. 0123456789"
                    aria-required={true}
                  />
                  <p className="text-xs text-text-faded mt-1">
                    We will use this to contact you about your tickets.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Organization Details Section (Organizer only) */}
          {!isLogin && role === "organizer" && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-green-500 mb-2">
                Organization Details
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground">
                    Company Name
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    required
                    className="mt-1 block w-full px-4 py-2 rounded-md shadow placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 sm:text-sm bg-input-background text-foreground"
                    placeholder="Your company name"
                    aria-required={true}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground">
                    Company Logo (optional)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="block w-full text-sm text-foreground file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-spotify-green file:text-black hover:file:bg-green-400"
                  />
                  {companyLogoPreview && (
                    <div
                      className="mt-4 rounded w-full max-h-32 object-contain border border-gray-600 relative overflow-hidden"
                      style={{ height: 128 }}
                    >
                      <Image
                        src={companyLogoPreview}
                        alt="Company Logo Preview"
                        layout="fill"
                        objectFit="contain"
                        className="rounded"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-md font-bold rounded-[10px] text-white bg-green-500 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black"></div>
              ) : (
                isLogin ? "Sign in" : "Sign up"
              )}
            </button>
          </div>
        </form>

        {/* Logo Upload Prompt Modal */}
        {showLogoPrompt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
            <div className="bg-card-background rounded-lg shadow-lg p-8 max-w-sm w-full text-foreground">
              <h3 className="text-xl font-bold mb-4 text-text-light">
                Upload Company Logo
              </h3>
              <p className="mb-6 text-sm text-text-faded">
                You selected a company logo during sign up. Would you like to upload
                it now?
              </p>
              {companyLogoPreview && (
                <div
                  className="mb-4 rounded w-full max-h-32 object-contain border border-gray-600 relative overflow-hidden"
                  style={{ height: 128 }}
                >
                  <Image
                    src={companyLogoPreview}
                    alt="Company Logo Preview"
                    layout="fill"
                    objectFit="contain"
                    className="rounded"
                  />
                </div>
              )}
              {error && (
                <div className="text-red-400 text-sm bg-red-900 bg-opacity-30 p-2 rounded mb-2 border border-red-700">
                  {error}
                </div>
              )}
              {message && (
                <div className="text-spotify-green text-sm bg-green-900 bg-opacity-30 p-2 rounded mb-2 border border-spotify-green">
                  {message}
                </div>
              )}
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  className="px-5 py-2 rounded-[10px] bg-green-500 text-white hover:bg-green-700 transition duration-200"
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
                  className="px-5 py-2 rounded-[10px] bg-green-500 text-white font-semibold hover:bg-green-700 disabled:opacity-50 transition duration-200"
                  onClick={handleLogoUploadAfterAuth}
                  disabled={logoUploadLoading}
                >
                  {logoUploadLoading ? "Uploading..." : "Upload Logo"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}