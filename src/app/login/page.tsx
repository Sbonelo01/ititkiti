"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/utils/supabaseClient";
import Image from "next/image";
import { 
  TicketIcon, 
  UserIcon, 
  BuildingOfficeIcon,
  SparklesIcon,
  ShieldCheckIcon,
  CreditCardIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';

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
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/dashboard";

  // Check if user is already logged in
  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        router.push(redirectTo);
      }
    };
    checkUser();
  }, [router, redirectTo]);

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
        setTimeout(() => router.push(redirectTo), 1000);
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
        // Redirect based on the redirect parameter or role
        // If redirect is to create-event and user is organizer, go there
        // Otherwise use the redirect parameter or default dashboard
        const finalRedirect = redirectTo || (role === "organizer" ? "/dashboard/create-event" : "/dashboard");
        setTimeout(() => router.push(finalRedirect), 1500);
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
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-green-600 via-green-700 to-green-800 py-16 overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-32 h-32 bg-white rounded-full animate-bounce"></div>
          <div className="absolute top-20 right-20 w-24 h-24 bg-green-200 rounded-full animate-pulse"></div>
          <div className="absolute bottom-10 left-1/4 w-20 h-20 bg-emerald-200 rounded-full animate-spin"></div>
          <div className="absolute bottom-20 right-1/3 w-28 h-28 bg-teal-200 rounded-full animate-bounce"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center">
            <div className="flex items-center justify-center mb-6">
              <SparklesIcon className="h-8 w-8 text-yellow-300 mr-3" />
              <span className="bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-semibold">
                Welcome to Tikiti
              </span>
              <SparklesIcon className="h-8 w-8 text-yellow-300 ml-3" />
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
              {isLogin ? "Welcome Back!" : "Join Tikiti Today"}
            </h1>
            
            <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
              {isLogin 
                ? "Sign in to access your events and manage your tickets"
                : "Create your account and start discovering amazing events or organizing your own"
              }
            </p>
          </div>
        </div>
      </section>

      {/* Login/Signup Form Section */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Form Side */}
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <div className="text-center mb-8">
                <div className="flex items-center justify-center mb-4">
                  <div className="bg-green-500 w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg">
                    <TicketIcon className="h-8 w-8 text-white" />
                  </div>
                </div>
                <h2 className="text-3xl font-bold text-gray-800 mb-2">
                  {isLogin ? "Sign In" : "Create Account"}
                </h2>
                <p className="text-gray-600">
                  {isLogin ? "Welcome back to Tikiti" : "Join thousands of event organizers and attendees"}
                </p>
              </div>

              <form onSubmit={handleAuth} className="space-y-6">
                {/* Error/Success Messages */}
                {(error || message) && (
                  <div className="mb-6">
                    {error && (
                      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                        {error}
                      </div>
                    )}
                    {message && (
                      <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm">
                        {message}
                      </div>
                    )}
                  </div>
                )}

                {/* Role Selection - only in signup mode */}
                {!isLogin && (
                  <div className="bg-gray-50 p-6 rounded-xl">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                      <UserGroupIcon className="h-5 w-5 mr-2 text-green-500" />
                      I am a:
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <label className="flex items-center p-4 bg-white rounded-xl border-2 border-gray-200 hover:border-green-500 cursor-pointer transition-all duration-200">
                        <input
                          type="radio"
                          name="role"
                          value="attendee"
                          checked={role === "attendee"}
                          onChange={(e) =>
                            setRole(e.target.value as "organizer" | "attendee")
                          }
                          className="h-4 w-4 text-green-500 focus:ring-green-500 border-gray-300"
                        />
                        <div className="ml-3">
                          <div className="flex items-center">
                            <UserIcon className="h-5 w-5 text-green-500 mr-2" />
                            <span className="font-semibold text-gray-800">Attendee</span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">I want to buy tickets</p>
                        </div>
                      </label>
                      <label className="flex items-center p-4 bg-white rounded-xl border-2 border-gray-200 hover:border-green-500 cursor-pointer transition-all duration-200">
                        <input
                          type="radio"
                          name="role"
                          value="organizer"
                          checked={role === "organizer"}
                          onChange={(e) =>
                            setRole(e.target.value as "organizer" | "attendee")
                          }
                          className="h-4 w-4 text-green-500 focus:ring-green-500 border-gray-300"
                        />
                        <div className="ml-3">
                          <div className="flex items-center">
                            <BuildingOfficeIcon className="h-5 w-5 text-green-500 mr-2" />
                            <span className="font-semibold text-gray-800">Organizer</span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">I want to create events</p>
                        </div>
                      </label>
                    </div>
                  </div>
                )}

                {/* Account Information */}
                <div className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                      Email Address
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white text-gray-800 placeholder-gray-500"
                      placeholder="Enter your email"
                    />
                  </div>
                  <div>
                    <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
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
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white text-gray-800 placeholder-gray-500"
                      placeholder="Enter your password"
                    />
                  </div>
                </div>

                {/* Personal Information - only in signup mode */}
                {!isLogin && (
                  <div className="bg-gray-50 p-6 rounded-xl space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                      <UserIcon className="h-5 w-5 mr-2 text-green-500" />
                      Personal Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          First Name
                        </label>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          required
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white text-gray-800 placeholder-gray-500"
                          placeholder="Your first name"
                        />
                      </div>
                      {role === "organizer" && (
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Last Name
                          </label>
                          <input
                            type="text"
                            value={surname}
                            onChange={(e) => setSurname(e.target.value)}
                            required
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white text-gray-800 placeholder-gray-500"
                            placeholder="Your last name"
                          />
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={cellphone}
                        onChange={(e) => setCellphone(e.target.value)}
                        required
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white text-gray-800 placeholder-gray-500"
                        placeholder="e.g. 0123456789"
                      />
                    </div>
                  </div>
                )}

                {/* Organization Details - only for organizers */}
                {!isLogin && role === "organizer" && (
                  <div className="bg-gray-50 p-6 rounded-xl space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                      <BuildingOfficeIcon className="h-5 w-5 mr-2 text-green-500" />
                      Organization Details
                    </h3>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Company Name
                      </label>
                      <input
                        type="text"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        required
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white text-gray-800 placeholder-gray-500"
                        placeholder="Your company name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Company Logo (Optional)
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoChange}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white text-gray-800 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-green-500 file:text-white hover:file:bg-green-600"
                      />
                      {companyLogoPreview && (
                        <div className="mt-4 w-full h-32 relative rounded-xl overflow-hidden border border-gray-200">
                          <Image
                            src={companyLogoPreview}
                            alt="Company Logo Preview"
                            fill
                            className="object-contain"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-4 px-6 rounded-xl font-semibold hover:from-green-600 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      {isLogin ? "Signing In..." : "Creating Account..."}
                    </div>
                  ) : (
                    isLogin ? "Sign In" : "Create Account"
                  )}
                </button>

                {/* Toggle between login/signup */}
                <div className="text-center">
                  <p className="text-gray-600">
                    {isLogin ? "Don&apos;t have an account? " : "Already have an account? "}
                    <button
                      type="button"
                      onClick={handleToggle}
                      className="text-green-600 hover:text-green-700 font-semibold transition-colors duration-200"
                    >
                      {isLogin ? "Sign up" : "Sign in"}
                    </button>
                  </p>
                </div>
              </form>
            </div>

            {/* Features Side */}
            <div className="space-y-8">
              <div className="bg-gradient-to-br from-green-50 to-white p-8 rounded-2xl shadow-lg">
                <h3 className="text-2xl font-bold text-gray-800 mb-6">
                  Why Choose Tikiti?
                </h3>
                <div className="space-y-6">
                  <div className="flex items-start">
                    <div className="bg-green-500 w-10 h-10 rounded-xl flex items-center justify-center mr-4 flex-shrink-0">
                      <ShieldCheckIcon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-1">Secure & Safe</h4>
                      <p className="text-gray-600 text-sm">Bank-level security for all transactions</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="bg-green-500 w-10 h-10 rounded-xl flex items-center justify-center mr-4 flex-shrink-0">
                      <CreditCardIcon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-1">Instant Delivery</h4>
                      <p className="text-gray-600 text-sm">Get your tickets instantly via email</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="bg-green-500 w-10 h-10 rounded-xl flex items-center justify-center mr-4 flex-shrink-0">
                      <UserGroupIcon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-1">Easy Management</h4>
                      <p className="text-gray-600 text-sm">Create and manage events effortlessly</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-white p-8 rounded-2xl shadow-lg">
                <h3 className="text-2xl font-bold text-gray-800 mb-4">
                  Join Thousands of Users
                </h3>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-3xl font-bold text-green-600 mb-1">10K+</div>
                    <div className="text-sm text-gray-600">Events Created</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-green-600 mb-1">50K+</div>
                    <div className="text-sm text-gray-600">Tickets Sold</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Logo Upload Prompt Modal */}
      {showLogoPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
            <div className="text-center mb-6">
              <div className="bg-green-500 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <BuildingOfficeIcon className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">
                Upload Company Logo
              </h3>
              <p className="text-gray-600">
                You selected a company logo during sign up. Would you like to upload it now?
              </p>
            </div>
            
            {companyLogoPreview && (
              <div className="mb-6 w-full h-32 relative rounded-xl overflow-hidden border border-gray-200">
                <Image
                  src={companyLogoPreview}
                  alt="Company Logo Preview"
                  fill
                  className="object-contain"
                />
              </div>
            )}
            
            {(error || message) && (
              <div className="mb-6">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                    {error}
                  </div>
                )}
                {message && (
                  <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm">
                    {message}
                  </div>
                )}
              </div>
            )}
            
            <div className="flex gap-4">
              <button
                className="flex-1 px-6 py-3 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all duration-200"
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
                className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold hover:from-green-600 hover:to-green-700 transition-all duration-200"
                onClick={handleLogoUploadAfterAuth}
                disabled={logoUploadLoading}
              >
                {logoUploadLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Uploading...
                  </div>
                ) : (
                  "Upload Logo"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}