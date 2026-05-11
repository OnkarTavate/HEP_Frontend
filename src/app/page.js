"use client"; // Required in Next.js for hooks like useState

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "sonner";
import {
  Ship,
  Lock,
  User,
  RefreshCw,
  Sparkles,
  Shield,
  TrendingUp,
  Clock,
  X,
  Search,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  ShieldAlert,
} from "lucide-react";

import { jwtDecode } from "jwt-decode";
const AUTH_API = process.env.NEXT_PUBLIC_AUTH_API;
const AGENT_API = process.env.NEXT_PUBLIC_AGENT_API;

const LoginPage = () => {
  const router = useRouter();

  const [formData, setFormData] = useState({
    username: "",
    password: "",
    captcha: "",
  });
  const [error, setError] = useState("");
  const [captchaData, setCaptchaData] = useState({ svg: "", token: "" });
  const [isCaptchaLoading, setIsCaptchaLoading] = useState(false);
  const [isTrackModalOpen, setIsTrackModalOpen] = useState(false);
  const [trackReference, setTrackReference] = useState("");
  const [trackResult, setTrackResult] = useState(null);
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackError, setTrackError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showForceLogoutDialog, setShowForceLogoutDialog] = useState(false);
  const [forceLogoutLoading, setForceLogoutLoading] = useState(false);

  const fetchCaptcha = async () => {
    setIsCaptchaLoading(true);
    try {
      const res = await axios.get(`${AGENT_API}/captcha/get-captcha`);
      if (res.data.success) {
        setCaptchaData({
          svg: res.data.captchaSvg,
          token: res.data.captchaToken,
        });
        // Clear the user's previous input when captcha refreshes
        setFormData((prev) => ({ ...prev, captcha: "" }));
      }
    } catch (error) {
      console.error("Failed to fetch captcha", error);
    } finally {
      setIsCaptchaLoading(false);
    }
  };

  // Fetch on component mount
  useEffect(() => {
    fetchCaptcha();
  }, []);

  const handleTrackSubmit = async (e) => {
    e.preventDefault();
    if (!trackReference.trim()) return;

    setTrackLoading(true);
    setTrackError("");
    setTrackResult(null);

    try {
      const res = await axios.get(`${AGENT_API}/agents/getTrackRequest`, {
        params: { referenceNumber: trackReference.trim() },
      });

      if (res.data.success && res.data.data) {
        setTrackResult(res.data.data);
        toast.success("Application status retrieved!"); // <-- Success Toast!
      } else {
        // setTrackError("No registration found with this reference number.");
        toast.error("No registration found with this reference number."); // <-- Error Toast!
      }
    } catch (err) {
      console.error("Track Error:", err);
      setTrackError(
        "Failed to fetch status. Please verify the reference number.",
      );
      toast.error("Failed to fetch status."); // <-- Error Toast!
    } finally {
      setTrackLoading(false);
    }
  };
  // const handleSubmit = async (e) => {
  //   e.preventDefault();
  //   setError("");

  //   if (formData.captcha !== captchaCode) {
  //     setError("Invalid security code");
  //     return;
  //   }

  //   if (!formData.username || !formData.password) {
  //     setError("Please enter valid credentials");
  //     return;
  //   }

  //   try {
  //     console.log("AUTH_API:", AUTH_API);
  //     const res = await axios.post(
  //       `${AUTH_API}/auth/login`,
  //       {
  //         loginId: formData.username.trim(),
  //         password: formData.password,
  //       },
  //       {
  //         headers: {
  //           "Content-Type": "application/json",
  //         },
  //       },
  //     );

  //     const data = res.data;

  //     if (data.success) {
  //       localStorage.setItem("accessToken", data.accessToken);
  //       localStorage.setItem("refreshToken", data.refreshToken);

  //       // 1. Safely extract role and department from your API response
  //       const userPayload = data.user || data.data || {};
  //       const exactRole = data.role || userPayload.role || "";
  //       const role = exactRole.toLowerCase();
  //       const department = data.department || userPayload.department || "";

  //       // 2. Save the full user object so dashboards know who is logged in
  //       const user = {
  //         username: formData.username,
  //         role: exactRole, // Keep exact casing (e.g., "Admin", "Approval Admin")
  //         department: department, // e.g., "Traffic" or "Marine"
  //       };

  //       localStorage.setItem("user", JSON.stringify(user));

  //       // 3. 🚀 SMART ROLE-BASED ROUTING 🚀
  //       if (role === "admin" || role === "administrator") {
  //         // Global Admins go to the dedicated Admin folder
  //         router.push("/admin");
  //       } else if (
  //         role === "approval admin" ||
  //         department === "Traffic" ||
  //         department === "Marine"
  //       ) {
  //         // Traffic and Marine Depts share the unified wireframe folder
  //         router.push("/approval_admin");
  //       } else {
  //         // Normal applicants go to the standard dashboard
  //         router.push("/dashboard");
  //       }
  //     } else {
  //       setError(data.message || "Invalid username or password");
  //     }
  //   } catch (err) {
  //     console.error("Login error:", err);

  //     if (err.response) {
  //       setError(err.response.data?.message || "Login failed");
  //     } else {
  //       setError("Server not reachable");
  //     }
  //   }
  // };

  const handleForceLogout = async () => {
    setForceLogoutLoading(true);
    try {
      const res = await axios.post(`${AUTH_API}/auth/force-logout`, {
        loginId: formData.username.trim(),
        password: formData.password,
      });

      if (res.data.success) {
        toast.success("Previous session terminated", {
          description: "You can now login with your credentials.",
        });
        setShowForceLogoutDialog(false);
        
        // Automatically retry login after force logout
        setTimeout(() => {
          handleSubmit(new Event('submit'));
        }, 500);
      }
    } catch (err) {
      console.error("Force logout error:", err);
      toast.error("Force logout failed", {
        description: err.response?.data?.message || "Unable to terminate previous session",
      });
    } finally {
      setForceLogoutLoading(false);
    }
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); // You can remove this state entirely later if you only want to use toasts

    // Validating all required fields at once
    if (!formData.username || !formData.password || !formData.captcha) {
      toast.warning("Please fill in all fields including the security code.");
      return;
    }

    try {
      const res = await axios.post(`${AUTH_API}/auth/login`, {
        loginId: formData.username.trim(),
        password: formData.password,
        captchaToken: captchaData.token,
        captchaValue: formData.captcha,
      });

      const data = res.data;

      console.log("LOGIN RESPONSE:", data);

      if (data.success) {
        // ✅ Store tokens
        localStorage.setItem("accessToken", data.accessToken);
        localStorage.setItem("refreshToken", data.refreshToken);

        // ✅ Store ONLY what backend gives (role)
        const user = {
          username: formData.username,
          role: data.role, // IMPORTANT
        };

        localStorage.setItem("user", JSON.stringify(user));

        toast.success("Login successful!"); // ✅ Success Toast

        // 🚀 ROLE-BASED ROUTING (TEMP SOLUTION)
        if (data.role === "Admin" || data.role === "Administrator") {
          console.log("➡️ Redirecting to /admin");
          router.push("/admin");
        } else if (data.role === "Approval") {
          console.log("➡️ Redirecting to /traffic_approval");
          router.push("/traffic_approval"); // TEMP (all approvals go here)
        } else {
          console.log("➡️ Redirecting to /dashboard");
          router.push("/dashboard");
        }
      } else {
        toast.error(data.message || "Invalid username or password"); // ❌ Error Toast
        fetchCaptcha(); // Refresh captcha on failed attempt
      }
    } catch (err) {
      console.error("Login error:", err);

      if (err.response) {
        const status = err.response.status;
        const message = err.response.data?.message || "Login failed";
        
        if (status === 409) {
          // Concurrent session conflict - offer force logout option
          setShowForceLogoutDialog(true);
        } else if (status === 401) {
          // Invalid credentials
          toast.error("Login Failed", {
            description: message,
            duration: 4000,
          });
        } else {
          toast.error(message);
        }
      } else if (err.code === 'ECONNREFUSED' || err.code === 'ERR_NETWORK') {
        toast.error("Connection Error", {
          description: "Unable to reach the authentication server. Please check your network connection.",
          duration: 4000,
        });
      } else {
        toast.error("Server not reachable");
      }

      fetchCaptcha(); // Refresh captcha on failed attempt
    }
  };

  const quickFillDemo = (role) => {
    const demoUsers = {
      applicant: { username: "applicant@gmt.com", password: "demo123" },
      pass_officer: { username: "pass.officer", password: "demo123" },
      traffic_officer: { username: "traffic.officer", password: "demo123" },
      admin: { username: "admin", password: "admin123" },
    };
    setFormData({ ...formData, ...demoUsers[role] });
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-zinc-50" style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* Animated Background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-white"></div>

      {/* Floating Orbs */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-orange-500/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-orange-600/10 rounded-full blur-3xl"></div>

      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-7xl grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Section - Branding */}
          <div className="hidden lg:block space-y-8 animate-in fade-in duration-700">
            <div className="inline-flex items-center gap-4 bg-white/60 backdrop-blur-md p-6 rounded-3xl shadow-lg border border-white/40">
              <div className="w-16 h-16 bg-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Ship className="h-9 w-9 text-white" strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="text-5xl font-bold text-gray-900 leading-none">
                  Chennai Port
                </h1>
                <p className="text-xl font-medium text-orange-600 mt-1">
                  Authority
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <h2 className="text-6xl font-bold leading-tight text-gray-900">
                Welcome to the
                <br />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-orange-600 to-orange-400">
                  Chennai Port Gate Automation System
                </span>
              </h2>
              <p className="text-2xl text-gray-600 leading-relaxed max-w-xl">
                A centralized digital system for controlling and monitoring
                personnel, vehicle, and cargo movement through automated gate
                pass management at Chennai Port.
              </p>
            </div>

            {/* Feature Cards */}
            <div className="grid grid-cols-3 gap-4">
              {[
                {
                  icon: Shield,
                  title: "Secure Access",
                  desc: "Security protocols",
                },
                {
                  icon: TrendingUp,
                  title: "Real-Time",
                  desc: "Instant processing",
                },
                {
                  icon: Clock,
                  title: "24/7 Support",
                  desc: "Always available",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="bg-white/60 backdrop-blur-md p-5 rounded-2xl border border-white/40 hover:scale-105 transition-transform cursor-default"
                >
                  <div className="w-12 h-12 bg-orange-600 rounded-xl flex items-center justify-center mb-3">
                    <item.icon className="h-6 w-6 text-white" />
                  </div>
                  <p className="font-semibold text-gray-900 text-lg">{item.title}</p>
                  <p className="text-base text-gray-600 mt-1">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right Section - Login Form */}
          <div className="animate-in slide-in-from-bottom duration-700">
            <div className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/40">
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-orange-600 rounded-2xl shadow-lg mb-4">
                    <Sparkles className="h-10 w-10 text-white" />
                  </div>
                  <h3 className="text-5xl font-bold text-gray-900">Sign In</h3>
                  <p className="text-xl text-gray-600">Access your secure portal</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {error && (
                    <div className="p-4 text-lg bg-red-50 border border-red-200 text-red-800 rounded-lg">
                      {error}
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-lg font-medium text-gray-700">
                      Username / Employee ID
                    </label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Enter your credentials"
                        value={formData.username}
                        onChange={(e) =>
                          setFormData({ ...formData, username: e.target.value })
                        }
                        className="w-full pl-14 pr-4 h-16 text-lg bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 rounded-xl transition-all"
                        style={{ fontFamily: 'Arial, sans-serif' }}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-lg font-medium text-gray-700">
                        Password
                      </label>
                      <button
                        type="button"
                        className="text-base text-orange-600 hover:underline font-medium"
                      >
                        Forgot?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-gray-400" />
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={formData.password}
                        onChange={(e) =>
                          setFormData({ ...formData, password: e.target.value })
                        }
                        className="w-full pl-14 pr-14 h-16 text-lg bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 rounded-xl transition-all"
                        style={{ fontFamily: 'Arial, sans-serif' }}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-orange-600 transition-colors focus:outline-none"
                        title={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? (
                          <EyeOff className="h-6 w-6" />
                        ) : (
                          <Eye className="h-6 w-6" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-lg font-medium text-gray-700">
                      Security Check
                    </label>
                    <div className="flex gap-3">
                      <input
                        placeholder="Enter answer"
                        value={formData.captcha}
                        onChange={(e) =>
                          setFormData({ ...formData, captcha: e.target.value })
                        }
                        className="flex-1 px-4 h-16 text-xl bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 rounded-xl"
                        style={{ fontFamily: 'Arial, sans-serif' }}
                        required
                      />
                      <div className="flex items-center gap-2 bg-orange-50 px-4 rounded-xl border border-orange-200 min-w-[200px] justify-center relative shadow-inner">
                        {isCaptchaLoading ? (
                          <RefreshCw className="h-8 w-8 text-orange-400 animate-spin" />
                        ) : (
                          /* Render the backend SVG string securely */
                          <div
                            className="h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-16"
                            dangerouslySetInnerHTML={{
                              __html: captchaData.svg,
                            }}
                          />
                        )}

                        {/* Refresh Button */}
                        <button
                          type="button"
                          onClick={fetchCaptcha}
                          disabled={!!isCaptchaLoading}
                          className="absolute -right-3 -top-3 bg-white border border-orange-200 shadow-md rounded-full p-2 hover:bg-orange-50 transition-all active:scale-95 disabled:opacity-50"
                          title="Get a new security code"
                        >
                          <RefreshCw
                            className={`h-5 w-5 text-orange-600 ${isCaptchaLoading ? "animate-spin" : "hover:rotate-180 transition-transform duration-500"}`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full h-16 bg-orange-600 text-white text-2xl font-semibold rounded-xl hover:bg-orange-700 shadow-lg shadow-orange-600/20 transition-all"
                    style={{ fontFamily: 'Arial, sans-serif' }}
                  >
                    Login to Portal
                  </button>
                </form>
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="grid grid-cols-3 gap-4">
                    {/* Register */}
                    <button
                      type="button"
                      onClick={() => router.push("/register")}
                      className="flex flex-col items-center gap-2 group"
                    >
                      <div className="p-3.5 rounded-xl bg-gray-50 group-hover:bg-orange-50 transition-all border border-transparent group-hover:border-orange-200">
                        <User className="h-7 w-7 text-gray-700 group-hover:text-orange-600 transition-colors" />
                      </div>
                      <span className="text-sm font-bold text-gray-800 uppercase tracking-wide text-center">
                        Register
                      </span>
                    </button>

                    {/* Track Registration */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsTrackModalOpen(true);
                        setTrackResult(null);
                        setTrackError("");
                        setTrackReference("");
                      }}
                      className="flex flex-col items-center gap-2 group"
                    >
                      <div className="p-3.5 rounded-xl bg-gray-50 group-hover:bg-orange-50 transition-all border border-transparent group-hover:border-orange-200">
                        <TrendingUp className="h-7 w-7 text-gray-700 group-hover:text-orange-600 transition-colors" />
                      </div>
                      <span className="text-sm font-bold text-gray-800 uppercase tracking-wide text-center">
                        Track Status
                      </span>
                    </button>

                    {/* Manual */}
                    {/* <button
                      type="button"
                      onClick={() => router.push("/manual")}
                      className="flex flex-col items-center gap-2 group"
                    >
                      <div className="p-3.5 rounded-xl bg-gray-50 group-hover:bg-orange-50 transition-all border border-transparent group-hover:border-orange-200">
                        <Sparkles className="h-7 w-7 text-gray-700 group-hover:text-orange-600 transition-colors" />
                      </div>
                      <span className="text-[11px] font-bold text-gray-800 uppercase tracking-wide text-center">
                        Manual
                      </span>
                    </button> */}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* 🚀 TRACKING MODAL OVERLAY 🚀 */}
      {isTrackModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-gray-100">
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 bg-slate-50 border-b border-gray-100">
              <h3 className="font-bold text-xl text-gray-900 flex items-center gap-2">
                <Search className="h-6 w-6 text-orange-600" />
                Track Registration
              </h3>
              <button
                onClick={() => setIsTrackModalOpen(false)}
                className="text-gray-400 hover:text-red-500 transition-colors bg-white p-1.5 rounded-lg shadow-sm"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Form */}
              <form onSubmit={handleTrackSubmit} className="flex gap-3">
                <input
                  type="text"
                  placeholder="e.g. CHPT00001"
                  value={trackReference}
                  onChange={(e) =>
                    setTrackReference(e.target.value.toUpperCase())
                  }
                  className="flex-1 px-4 py-4 text-lg bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-medium uppercase transition-all"
                  style={{ fontFamily: 'Arial, sans-serif' }}
                  required
                />
                <button
                  type="submit"
                  disabled={trackLoading}
                  className="px-8 py-4 text-lg bg-[#0a1e4d] text-white font-bold rounded-xl hover:bg-orange-600 transition-colors shadow-md disabled:opacity-70 flex items-center justify-center min-w-[130px]"
                  style={{ fontFamily: 'Arial, sans-serif' }}
                >
                  {trackLoading ? (
                    <RefreshCw className="h-6 w-6 animate-spin" />
                  ) : (
                    "Track"
                  )}
                </button>
              </form>

              {/* Error Message */}
              {trackError && (
                <div className="p-4 bg-red-50 text-red-700 text-base font-medium rounded-xl border border-red-100 flex items-start gap-2">
                  <XCircle className="h-6 w-6 shrink-0" />
                  {trackError}
                </div>
              )}

              {/* Result Card */}
              {trackResult && (
                <div className="bg-gray-50 rounded-2xl p-5 border border-gray-200 space-y-4 animate-in slide-in-from-bottom-2">
                  <div className="flex justify-between items-start border-b border-gray-200 pb-4">
                    <div>
                      <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">
                        Company
                      </p>
                      <p className="font-bold text-gray-900 text-xl">
                        {trackResult.entityName}
                      </p>
                    </div>
                    {/* Dynamic Status Badge */}
                    <div
                      className={`px-4 py-2 rounded-lg text-sm font-bold border flex items-center gap-1.5 shadow-sm
                      ${
                        trackResult.status === "approved"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : trackResult.status === "rejected"
                            ? "bg-red-50 text-red-700 border-red-200"
                            : trackResult.status === "reverted"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-yellow-50 text-yellow-700 border-yellow-200"
                      }`}
                    >
                      {trackResult.status === "approved" && (
                        <CheckCircle className="h-4 w-4" />
                      )}
                      {trackResult.status === "rejected" && (
                        <XCircle className="h-4 w-4" />
                      )}
                      {trackResult.status === "reverted" && (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      )}
                      {(!trackResult.status ||
                        trackResult.status === "pending") && (
                        <Clock className="h-4 w-4" />
                      )}
                      {(trackResult.status || "PENDING").toUpperCase()}
                    </div>
                  </div>

                  {/* 🚀 REVERTED ACTION PANEL 🚀 */}
                  {trackResult.status === "reverted" && (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
                      <div className="flex items-center gap-2 text-amber-800 font-bold text-base">
                        <ShieldAlert className="h-5 w-5" />
                        Attention Required
                      </div>
                      <p className="text-sm text-amber-700 leading-relaxed bg-white/50 p-2 rounded-lg border border-amber-100">
                        <span className="font-bold">Remarks: </span>
                        {trackResult.rejectedReason ||
                          "Please update the requested details."}
                      </p>
                      <button
                        onClick={() =>
                          router.push(
                            `/register?ref=${trackResult.referenceNumber}`,
                          )
                        }
                        className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 shadow-sm"
                        style={{ fontFamily: 'Arial, sans-serif' }}
                      >
                        <RefreshCw className="h-5 w-5" />
                        UPDATE APPLICATION
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Applicant
                      </p>
                      <p className="text-base font-semibold text-gray-800">
                        {trackResult.title} {trackResult.firstName}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Applied On
                      </p>
                      <p className="text-base font-semibold text-gray-800">
                        {new Date(trackResult.createdAt).toLocaleDateString(
                          "en-GB",
                        )}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Contact
                      </p>
                      <p className="text-base font-semibold text-gray-800">
                        {trackResult.email} • {trackResult.mobileNo}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 🔐 FORCE LOGOUT DIALOG 🔐 */}
      {showForceLogoutDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-orange-200">
            <div className="bg-gradient-to-r from-orange-500 to-red-500 p-6 text-white">
              <div className="flex items-center gap-3">
                <ShieldAlert className="h-8 w-8" />
                <div>
                  <h3 className="text-xl font-bold">Session Already Active</h3>
                  <p className="text-sm text-orange-100 mt-1">
                    You are logged in from another device
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <p className="text-sm text-gray-700 leading-relaxed">
                  Your account is currently active on another device or browser. 
                  You can either:
                </p>
                <ul className="mt-3 space-y-2 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="text-orange-500 font-bold">•</span>
                    <span>Wait for the other session to expire (15-30 minutes)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-500 font-bold">•</span>
                    <span>Logout from the other device manually</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-500 font-bold">•</span>
                    <span className="font-semibold text-gray-700">Force logout and login here (recommended)</span>
                  </li>
                </ul>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowForceLogoutDialog(false)}
                  disabled={forceLogoutLoading}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleForceLogout}
                  disabled={forceLogoutLoading}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-semibold hover:from-orange-600 hover:to-red-600 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {forceLogoutLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Terminating...
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="h-4 w-4" />
                      Force Logout & Login
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
