"use client"; // Required in Next.js for hooks like useState

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "sonner";
import {
  Ship,
  Lock,
  User,
  UserPlus,
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
  // const [captchaData, setCaptchaData] = useState({ svg: "", token: "" });
  const [captchaData, setCaptchaData] = useState({
    question: "",
    token: "",
  });
  const [isCaptchaLoading, setIsCaptchaLoading] = useState(false);
  const [isTrackModalOpen, setIsTrackModalOpen] = useState(false);
  const [trackReference, setTrackReference] = useState("");
  const [trackResult, setTrackResult] = useState(null);
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackError, setTrackError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showForceLogoutDialog, setShowForceLogoutDialog] = useState(false);
  const [forceLogoutLoading, setForceLogoutLoading] = useState(false);

  // Typing animation for the welcome headline (50ms per character)
  const HEADLINE_LINE1 = "Welcome to the";
  const HEADLINE_LINE2 = "Automated Port Access and Control System";
  const HEADLINE_FULL = `${HEADLINE_LINE1}\n${HEADLINE_LINE2}`;
  const [typedHeadline, setTypedHeadline] = useState("");

  useEffect(() => {
    setTypedHeadline("");
    let i = 0;
    const interval = setInterval(() => {
      i += 1;
      setTypedHeadline(HEADLINE_FULL.slice(0, i));
      if (i >= HEADLINE_FULL.length) clearInterval(interval);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // AsmrProg-style card toggle: "signin" shows the Sign-In form, "forgot"
  // slides over to the Forgot-Password form. The orange side panel content
  // updates in lock-step.
  const [authMode, setAuthMode] = useState("signin"); // "signin" | "forgot"
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      toast.warning("Please enter your registered email or login ID.");
      return;
    }
    setForgotLoading(true);
    try {
      const res = await axios.post(
        `${AUTH_API}/auth/forgot-password`,
        { loginId: forgotEmail.trim() },
        {
          // Don't throw on 404 — backend may not have implemented this yet.
          validateStatus: (s) => s < 500,
        },
      );
      if (res.status >= 200 && res.status < 300 && res.data?.success) {
        toast.success("Reset link sent", {
          description:
            "If an account exists for this ID, a password reset link has been emailed.",
        });
        setAuthMode("signin");
        setForgotEmail("");
      } else if (res.status === 404) {
        toast.error("Feature unavailable", {
          description:
            "Password reset is not yet enabled. Please contact your administrator.",
        });
      } else {
        toast.error(res.data?.message || "Unable to process the request.");
      }
    } catch (err) {
      console.error("Forgot password error:", err);
      toast.error("Server not reachable");
    } finally {
      setForgotLoading(false);
    }
  };

  const fetchCaptcha = async () => {
    setIsCaptchaLoading(true);

    try {
      const res = await axios.get(`${AGENT_API}/captcha/get-captcha`);

      if (res.data.success) {
        setCaptchaData({
          question: res.data.captchaQuestion,
          token: res.data.captchaToken,
        });

        // clear old entered captcha
        setFormData((prev) => ({
          ...prev,
          captcha: "",
        }));
      }
    } catch (error) {
      console.error("Failed to fetch captcha", error);
    } finally {
      setIsCaptchaLoading(false);
    }
  };

  // const fetchCaptcha = async () => {
  //   setIsCaptchaLoading(true);
  //   try {
  //     const res = await axios.get(`${AGENT_API}/captcha/get-captcha`);
  //     if (res.data.success) {
  //       setCaptchaData({
  //         svg: res.data.captchaSvg,
  //         token: res.data.captchaToken,
  //       });
  //       // Clear the user's previous input when captcha refreshes
  //       setFormData((prev) => ({ ...prev, captcha: "" }));
  //     }
  //   } catch (error) {
  //     console.error("Failed to fetch captcha", error);
  //   } finally {
  //     setIsCaptchaLoading(false);
  //   }
  // };

  // Fetch on component mount — uses ignore flag for React 18 Strict Mode compatibility
  useEffect(() => {
    let ignore = false;

    const loadCaptcha = async () => {
      setIsCaptchaLoading(true);
      try {
        const res = await axios.get(`${AGENT_API}/captcha/get-captcha`);
        if (!ignore && res.data.success) {
          // setCaptchaData({
          //   svg: res.data.captchaSvg,
          //   token: res.data.captchaToken,
          // });
          setCaptchaData({
            question: res.data.captchaQuestion,
            token: res.data.captchaToken,
          });
          setFormData((prev) => ({ ...prev, captcha: "" }));
        }
      } catch (error) {
        if (!ignore) {
          console.error("Failed to fetch captcha", error);
        }
      } finally {
        if (!ignore) {
          setIsCaptchaLoading(false);
        }
      }
    };

    loadCaptcha();

    return () => {
      ignore = true;
    };
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
        setShowForceLogoutDialog(false);
        // Captcha tokens are single-use; fetch a fresh one and ask the user
        // to re-enter it rather than silently auto-retrying (which was
        // failing because the previous 409 flow already cleared the captcha).
        fetchCaptcha();
        toast.success("Previous session terminated", {
          description: "Please re-enter the security code and sign in again.",
        });
      }
    } catch (err) {
      console.error("Force logout error:", err);
      toast.error("Force logout failed", {
        description:
          err.response?.data?.message || "Unable to terminate previous session",
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
      const res = await axios.post(
        `${AUTH_API}/auth/login`,
        {
          loginId: formData.username.trim(),
          password: formData.password,
          captchaToken: captchaData.token,
          captchaValue: formData.captcha,
        },
        {
          validateStatus: (status) =>
            (status >= 200 && status < 300) || status === 409,
        },
      );

      // Concurrent-session conflict — show force-logout dialog.
      if (res.status === 409) {
        setShowForceLogoutDialog(true);
        return;
      }

      const data = res.data;

      console.log("LOGIN RESPONSE:", data);

      if (data.success) {
        // ✅ Store tokens
        localStorage.setItem("accessToken", data.accessToken);
        localStorage.setItem("refreshToken", data.refreshToken);

        // ✅ Store role + department so layouts can gate access correctly.
        //    Backend change #1 (see BACKEND_CHANGES_REQUIRED.md) must include
        //    departmentName + departmentId in the login response. Until then
        //    those fields will be null and Vendor Pass routing won't work.
        const user = {
          username: formData.username,
          role: data.role,
          departmentName: data.departmentName || null,
          departmentId: data.departmentId || null,
        };

        localStorage.setItem("user", JSON.stringify(user));

        toast.success("Login successful!");

        // 🚀 ROLE-BASED ROUTING
        const role = (data.role || "").toLowerCase();
        const dept = (data.departmentName || "").toLowerCase();

        if (role === "admin" || role === "administrator") {
          router.push("/admin");
        } else if (role === "approval" && dept.includes("traffic")) {
          router.push("/traffic_approval");
        } else if (role === "approval") {
          router.push("/admin/vendor_pass");
        } else {
          router.push("/dashboard");
        }
      } else {
        toast.error(data.message || "Invalid username or password"); // ❌ Error Toast
        fetchCaptcha(); // Refresh captcha on failed attempt
      }
    } catch (err) {
      if (err.response) {
        const status = err.response.status;
        const message = err.response.data?.message || "Login failed";

        console.error("Login error:", err);

        if (status === 401) {
          // Invalid credentials
          toast.error("Login Failed", {
            description: message,
            duration: 4000,
          });
        } else {
          toast.error(message);
        }
      } else if (err.code === "ECONNREFUSED" || err.code === "ERR_NETWORK") {
        console.error("Login error:", err);
        toast.error("Connection Error", {
          description:
            "Unable to reach the authentication server. Please check your network connection.",
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
    <div
      className="h-screen relative overflow-hidden bg-zinc-900"
      style={{ fontFamily: "Arial, sans-serif" }}
    >
      {/* Cinematic ship video background */}
      <video
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        poster="/file.svg"
        aria-hidden="true"
      >
        <source src="/Ship.mp4" type="video/mp4" />
      </video>

      {/* Layered overlays for legibility + warm port mood */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900/70 via-slate-900/55 to-orange-900/60"></div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30"></div>

      {/* Subtle floating orbs to keep the orange brand glow */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-orange-500/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-orange-600/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative z-10 h-screen flex items-center p-4 sm:p-6 lg:pl-12 lg:pr-16 lg:py-6 overflow-hidden">
        <div className="w-full mx-auto grid lg:grid-cols-[5fr_6fr] gap-6 lg:gap-10 items-center">
          {/* Left Section - Branding */}
          <div className="hidden lg:block space-y-8 animate-in fade-in duration-700">
            <div className="inline-flex items-center gap-4 bg-white/15 backdrop-blur-xl p-6 rounded-3xl shadow-lg ring-1 ring-white/20">
              <div className="w-16 h-16 bg-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-900/40">
                <Ship className="h-9 w-9 text-white" strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-white leading-none drop-shadow-lg chennai-port-glow">
                  Chennai Port
                </h1>
                <style jsx>{`
                  @keyframes chennaiPortBreath {
                    0%,
                    100% {
                      text-shadow: none;
                    }
                    50% {
                      text-shadow:
                        0 0 6px rgba(96, 165, 250, 0.55),
                        0 0 14px rgba(59, 130, 246, 0.45),
                        0 0 28px rgba(37, 99, 235, 0.35);
                    }
                  }
                  .chennai-port-glow {
                    animation: chennaiPortBreath 3.6s ease-in-out infinite;
                    will-change: text-shadow;
                  }
                  @media (prefers-reduced-motion: reduce) {
                    .chennai-port-glow {
                      animation: none;
                    }
                  }
                `}</style>
                <p className="text-lg font-medium text-orange-300 mt-1">
                  Authority
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <h2 className="text-4xl xl:text-5xl font-bold leading-tight text-white drop-shadow-[0_4px_20px_rgba(0,0,0,0.5)] min-h-[7rem] xl:min-h-[8.5rem]">
                {(() => {
                  const newlineIdx = HEADLINE_FULL.indexOf("\n");
                  const firstPart = typedHeadline.slice(
                    0,
                    Math.min(typedHeadline.length, newlineIdx),
                  );
                  const secondPart =
                    typedHeadline.length > newlineIdx
                      ? typedHeadline.slice(newlineIdx + 1)
                      : "";
                  const onFirstLine = typedHeadline.length <= newlineIdx;
                  const isDone = typedHeadline.length >= HEADLINE_FULL.length;
                  return (
                    <>
                      {firstPart}
                      {onFirstLine && !isDone && (
                        <span className="inline-block w-[2px] h-[0.9em] align-[-0.1em] ml-1 bg-white animate-pulse" />
                      )}
                      {!onFirstLine && (
                        <>
                          <br />
                          <span className="bg-clip-text text-transparent bg-gradient-to-r from-orange-300 to-amber-200">
                            {secondPart}
                          </span>
                          {!isDone && (
                            <span className="inline-block w-[2px] h-[0.9em] align-[-0.1em] ml-1 bg-orange-300 animate-pulse" />
                          )}
                        </>
                      )}
                    </>
                  );
                })()}
              </h2>
              <p className="text-base xl:text-lg text-stone-100/90 leading-relaxed max-w-xl drop-shadow">
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
                  className="bg-white/10 backdrop-blur-xl p-5 rounded-2xl ring-1 ring-white/20 hover:bg-white/15 hover:scale-105 transition-all cursor-default"
                >
                  <div className="w-12 h-12 bg-orange-600 rounded-xl flex items-center justify-center mb-3 shadow-lg shadow-orange-900/40">
                    <item.icon className="h-6 w-6 text-white" />
                  </div>
                  <p className="font-semibold text-white text-sm">
                    {item.title}
                  </p>
                  <p className="text-xs text-stone-200/80 mt-1">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right Section - Login Form */}
          <div className="w-full">
            {/* Soft orange glow halo behind the card for extra polish */}
            <div className="relative w-full">
              <div
                aria-hidden
                className="hidden lg:block absolute -inset-6 bg-gradient-to-br from-orange-400/30 via-orange-300/20 to-transparent blur-3xl rounded-[40px] -z-10"
              />
              <div className="relative bg-white/95 backdrop-blur-2xl rounded-[30px] shadow-[0_30px_80px_-15px_rgba(0,0,0,0.6)] ring-1 ring-white/40 overflow-hidden w-full max-w-[820px] mx-auto lg:ml-auto lg:mr-0 min-h-[560px] sm:min-h-[600px] lg:h-[78vh] lg:max-h-[680px] transition-shadow duration-500 hover:shadow-[0_35px_90px_-15px_rgba(0,0,0,0.7)]">
                {/* ── Form column (slides to the right half when forgot is active) ─── */}
                <div
                  className={`md:absolute md:top-0 md:left-0 md:w-1/2 md:h-full bg-white z-[2] transition-transform duration-700 ease-in-out ${authMode === "forgot" ? "md:translate-x-full" : "md:translate-x-0"}`}
                >
                  <div className="h-full flex flex-col justify-center px-6 md:px-8 lg:px-10 py-8 max-w-md mx-auto w-full">
                    {authMode === "signin" ? (
                      <div
                        key="signin-panel"
                        className="animate-in fade-in duration-500 ease-out"
                      >
                        <div className="text-center mb-4">
                          <h3 className="text-2xl lg:text-3xl font-bold text-gray-900">
                            Sign In
                          </h3>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                          {error && (
                            <div className="p-3 text-sm bg-red-50 border border-red-200 text-red-800 rounded-lg">
                              {error}
                            </div>
                          )}

                          {/* Username */}
                          <div className="relative">
                            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                              type="text"
                              placeholder="Username / Employee ID"
                              value={formData.username}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  username: e.target.value,
                                })
                              }
                              className="w-full pl-11 pr-3 py-3.5 text-base bg-[#eee] border-none rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                              required
                            />
                          </div>

                          {/* Password */}
                          <div className="relative">
                            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                              type={showPassword ? "text" : "password"}
                              placeholder="Password"
                              value={formData.password}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  password: e.target.value,
                                })
                              }
                              className="w-full pl-11 pr-11 py-3.5 text-base bg-[#eee] border-none rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                              required
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-orange-600 transition-colors focus:outline-none"
                              title={
                                showPassword ? "Hide password" : "Show password"
                              }
                            >
                              {showPassword ? (
                                <EyeOff className="h-5 w-5" />
                              ) : (
                                <Eye className="h-5 w-5" />
                              )}
                            </button>
                          </div>

                          {/* Captcha — input on the left, captcha image + refresh on the right.
                      Stacks vertically on very small screens for readability. */}
                          <div className="flex flex-col sm:flex-row gap-2 w-full">
                            <input
                              placeholder="Security Code"
                              value={formData.captcha}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  captcha: e.target.value,
                                })
                              }
                              className="flex-1 min-w-0 px-4 py-3.5 text-base bg-[#eee] border-none rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                              required
                            />
                            {/* <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-xl px-3 py-2 w-full sm:w-[170px] shrink-0 justify-between">
                      <div className="flex-1 flex items-center justify-center min-w-0 overflow-hidden">
                        {isCaptchaLoading ? (
                          <RefreshCw className="h-5 w-5 text-orange-400 animate-spin" />
                        ) : (
                          <div
                            className="flex items-center justify-center w-full [&>svg]:w-full [&>svg]:max-w-[130px] [&>svg]:h-11"
                            dangerouslySetInnerHTML={{
                              __html: captchaData.svg,
                            }}
                          />
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={fetchCaptcha}
                        disabled={!!isCaptchaLoading}
                        title="Get a new security code"
                        className="shrink-0 bg-white border border-orange-200 rounded-md p-1.5 hover:bg-orange-100 active:scale-95 transition-all disabled:opacity-50"
                      >
                        <RefreshCw
                          className={`h-4 w-4 text-orange-600 ${isCaptchaLoading ? "animate-spin" : ""}`}
                        />
                      </button>
                    </div> */}
                            <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-xl px-3 py-2 w-full sm:w-[190px] shrink-0 justify-between">
                              <div className="flex-1 flex items-center justify-center min-w-0 overflow-hidden">
                                {isCaptchaLoading ? (
                                  <RefreshCw className="h-5 w-5 text-orange-400 animate-spin" />
                                ) : (
                                  <div className="font-bold text-lg text-blue-700 tracking-wide select-none">
                                    {captchaData.question}
                                  </div>
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={fetchCaptcha}
                                disabled={!!isCaptchaLoading}
                                title="Refresh captcha"
                                className="shrink-0 bg-white border border-orange-200 rounded-md p-1.5 hover:bg-orange-100 active:scale-95 transition-all disabled:opacity-50"
                              >
                                <RefreshCw
                                  className={`h-4 w-4 text-orange-600 ${
                                    isCaptchaLoading ? "animate-spin" : ""
                                  }`}
                                />
                              </button>
                            </div>
                          </div>

                          {/* <div className="text-center">
                    <button
                      type="button"
                      onClick={() => setAuthMode("forgot")}
                      className="text-sm text-gray-600 hover:text-orange-600 hover:underline"
                    >
                      Forget Your Password?
                    </button>
                  </div> */}

                          <button
                            type="submit"
                            className="w-full py-3.5 bg-orange-600 text-white text-base font-semibold tracking-wider uppercase rounded-xl hover:bg-orange-700 shadow-lg shadow-orange-600/20 transition-all"
                          >
                            Sign In
                          </button>

                          {/* Quick-action: Track Pass button (below Sign In). */}
                          <button
                            type="button"
                            onClick={() => {
                              setIsTrackModalOpen(true);
                              setTrackResult(null);
                              setTrackError("");
                              setTrackReference("");
                            }}
                            className="w-full py-3.5 bg-white text-orange-600 text-base font-semibold tracking-wider uppercase rounded-xl border-2 border-orange-600 hover:bg-orange-50 active:scale-[0.99] transition-all"
                          >
                            Track Pass
                          </button>
                        </form>
                      </div>
                    ) : (
                      <div
                        key="forgot-panel"
                        className="animate-in fade-in slide-in-from-right-6 duration-500 ease-out"
                      >
                        <div className="text-center mb-6">
                          <h3 className="text-2xl lg:text-3xl font-bold text-gray-900">
                            Reset Password
                          </h3>
                          <p className="text-sm text-gray-500 mt-2">
                            Enter your registered email or employee ID —
                            we&apos;ll send you a reset link.
                          </p>
                        </div>

                        <form
                          onSubmit={handleForgotSubmit}
                          className="space-y-4"
                        >
                          <div className="relative">
                            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                              type="text"
                              placeholder="Email or Employee ID"
                              value={forgotEmail}
                              onChange={(e) => setForgotEmail(e.target.value)}
                              className="w-full pl-11 pr-3 py-3.5 text-base bg-[#eee] border-none rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                              required
                            />
                          </div>

                          <button
                            type="submit"
                            disabled={forgotLoading}
                            className="w-full py-3.5 bg-orange-600 text-white text-base font-semibold tracking-wider uppercase rounded-xl hover:bg-orange-700 shadow-lg shadow-orange-600/20 transition-all disabled:opacity-70 flex items-center justify-center"
                          >
                            {forgotLoading ? (
                              <RefreshCw className="h-5 w-5 animate-spin" />
                            ) : (
                              "Send Reset Link"
                            )}
                          </button>

                          <div className="text-center">
                            <button
                              type="button"
                              onClick={() => setAuthMode("signin")}
                              className="text-sm text-gray-600 hover:text-orange-600 hover:underline"
                            >
                              ← Back to Sign In
                            </button>
                          </div>
                        </form>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Orange side panel (slides from right to left when forgot is active) ─── */}
                <div
                  className={`hidden md:flex absolute top-0 right-0 w-1/2 h-full flex-col items-center justify-center text-center text-white px-8 bg-gradient-to-br from-orange-500 to-orange-700 transition-all duration-700 ease-in-out ${authMode === "forgot" ? "md:-translate-x-full" : "md:translate-x-0"}`}
                  style={{
                    borderRadius:
                      authMode === "forgot"
                        ? "0 150px 100px 0"
                        : "150px 0 0 100px",
                  }}
                >
                  <h2 className="text-2xl lg:text-3xl font-bold mb-3">
                    Hello, Friend!
                  </h2>
                  <p className="text-sm leading-relaxed opacity-95 max-w-[280px] mb-6">
                    Register with your personal details to use all site features
                  </p>
                  <button
                    type="button"
                    onClick={() => router.push("/register")}
                    className="px-10 py-3 border border-white text-white text-sm font-semibold uppercase tracking-wider rounded-lg hover:bg-white hover:text-orange-600 transition-colors mb-3"
                  >
                    Sign Up
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setAuthMode(authMode === "forgot" ? "signin" : "forgot")
                    }
                    className="px-10 py-3 bg-white/10 border border-white/60 text-white text-sm font-semibold uppercase tracking-wider rounded-lg hover:bg-white hover:text-orange-600 transition-colors"
                  >
                    {authMode === "forgot"
                      ? "Back to Sign In"
                      : "Forgot Password?"}
                  </button>
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
                  style={{ fontFamily: "Arial, sans-serif" }}
                  required
                />
                <button
                  type="submit"
                  disabled={trackLoading}
                  className="px-8 py-4 text-lg bg-[#0a1e4d] text-white font-bold rounded-xl hover:bg-orange-600 transition-colors shadow-md disabled:opacity-70 flex items-center justify-center min-w-[130px]"
                  style={{ fontFamily: "Arial, sans-serif" }}
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
                        style={{ fontFamily: "Arial, sans-serif" }}
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
                    <span>
                      Wait for the other session to expire (15-30 minutes)
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-500 font-bold">•</span>
                    <span>Logout from the other device manually</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-500 font-bold">•</span>
                    <span className="font-semibold text-gray-700">
                      Force logout and login here (recommended)
                    </span>
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
