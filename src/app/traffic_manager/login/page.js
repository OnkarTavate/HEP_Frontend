"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "sonner";
import {
  Lock,
  User,
  RefreshCw,
  Eye,
  EyeOff,
  ShieldAlert,
  Activity,
  TrendingUp,
  Truck,
} from "lucide-react";
import { jwtDecode } from "jwt-decode";

const AUTH_API = process.env.NEXT_PUBLIC_AUTH_API || "http://localhost:5006/api";
const AGENT_API = process.env.NEXT_PUBLIC_AGENT_API || "http://localhost:5001/api";

// --- Design tokens -------------------------------------------------------------
const BG = "#07101f";
const ACCENT_AMBER = "#f59e0b";
const ACCENT_ORANGE = "#f97316";
const ACCENT_RED = "#ef4444";
const ACCENT_INDIGO = "#6366f1";
const ACCENT_EMERALD = "#10b981";

// --- Allowed roles for Traffic Manager portal ---------------------------------
const TRAFFIC_MANAGER_ROLES = ["tm", "traffic manager", "traffic_manager"];

export default function TrafficManagerLogin() {
  const router = useRouter();
  const [formData, setFormData] = useState({ username: "", password: "", captcha: "" });
  const [captchaData, setCaptchaData] = useState({ question: "", token: "" });
  const [isCaptchaLoading, setIsCaptchaLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [typedText, setTypedText] = useState("");

  const HEADLINE = "Traffic Manager Portal";

  useEffect(() => {
    let i = 0;
    const iv = setInterval(() => {
      i += 1;
      setTypedText(HEADLINE.slice(0, i));
      if (i >= HEADLINE.length) clearInterval(iv);
    }, 60);
    return () => clearInterval(iv);
  }, []);

  // --- Check if already logged in ---------------------------------------------
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    const user = localStorage.getItem("user");
    if (token && user) {
      try {
        const u = JSON.parse(user);
        const role = (u.role || "").toLowerCase();
        if (TRAFFIC_MANAGER_ROLES.includes(role)) {
          router.push("/traffic_manager");
        }
      } catch {}
    }
    fetchCaptcha();
  }, [router]);

  const fetchCaptcha = async () => {
    setIsCaptchaLoading(true);
    try {
      const res = await axios.get(`${AGENT_API}/captcha/get-captcha`);
      if (res.data?.question && res.data?.token) {
        setCaptchaData({ question: res.data.question, token: res.data.token });
      }
    } catch {
      toast.error("Failed to load captcha");
    } finally {
      setIsCaptchaLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData((p) => ({ ...p, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.username.trim()) { toast.warning("Please enter your username"); return; }
    if (!formData.password.trim()) { toast.warning("Please enter your password"); return; }
    if (!formData.captcha.trim()) { toast.warning("Please enter the security code"); return; }

    setIsLoading(true);
    try {
      const res = await axios.post(
        `${AUTH_API}/auth/login`,
        {
          loginId: formData.username.trim(),
          password: formData.password,
          captchaToken: captchaData.token,
          captchaValue: formData.captcha,
        },
        { validateStatus: (s) => s < 600 }
      );

      if (res.data?.success) {
        const { accessToken, refreshToken, role, departmentId, departmentName, isPasswordChanged } = res.data;
        const roleLower = (role || "").toLowerCase();

        // Only allow Traffic Manager role
        if (!TRAFFIC_MANAGER_ROLES.includes(roleLower)) {
          toast.error("Access Denied", { description: "This portal is for Traffic Managers only." });
          fetchCaptcha();
          setIsLoading(false);
          return;
        }

        // Store session
        localStorage.setItem("accessToken", accessToken);
        localStorage.setItem("refreshToken", refreshToken);

        let decoded = {};
        try { decoded = jwtDecode(accessToken); } catch {}

        localStorage.setItem(
          "user",
          JSON.stringify({
            role: roleLower,
            departmentId,
            departmentName,
            isPasswordChanged,
            userId: decoded.userId,
            name: decoded.userName || formData.username,
            username: formData.username,
          })
        );

        toast.success("Login Successful", { description: "Welcome, Traffic Manager!" });
        router.push("/traffic_manager");
      } else {
        toast.error(res.data?.message || "Invalid username or password");
        fetchCaptcha();
        setFormData((p) => ({ ...p, captcha: "" }));
      }
    } catch (err) {
      if (err.response?.status === 401) {
        toast.error("Login Failed", { description: err.response.data?.message || "Invalid credentials" });
      } else if (err.code === "ERR_NETWORK" || err.code === "ECONNREFUSED") {
        toast.error("Connection Error", { description: "Unable to reach server. Please check your network." });
      } else {
        toast.error("Server not reachable");
      }
      fetchCaptcha();
      setFormData((p) => ({ ...p, captcha: "" }));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: `linear-gradient(135deg, ${BG} 0%, #0a1420 40%, #0d1220 100%)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Inter', sans-serif",
        padding: "24px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        @keyframes fadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse-dot { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        @keyframes shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
        @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-10px); } }
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .tm-card { animation: fadeUp 0.5s ease both; }
        .tm-input { transition: border-color 0.2s, box-shadow 0.2s; }
        .tm-input:focus { outline: none; border-color: ${ACCENT_AMBER} !important; box-shadow: 0 0 0 3px rgba(245,158,11,0.15) !important; }
        .tm-btn { transition: all 0.15s ease; }
        .tm-btn:hover:not(:disabled) { transform: translateY(-2px); filter: brightness(1.1); }
        .tm-btn:active:not(:disabled) { transform: scale(0.98); }
        .tm-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .shimmer-title { background: linear-gradient(90deg, #fff 0%, ${ACCENT_AMBER} 40%, ${ACCENT_ORANGE} 60%, #fff 100%); background-size: 200%; -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; animation: shimmer 3s ease infinite; }
        .float-icon { animation: float 4s ease-in-out infinite; }
      `}</style>

      {/* Ambient glow blobs */}
      <div style={{ position: "absolute", top: "10%", left: "5%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(245,158,11,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: "5%", right: "5%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(239,68,68,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 800, height: 800, borderRadius: "50%", background: "radial-gradient(circle, rgba(245,158,11,0.03) 0%, transparent 70%)", pointerEvents: "none" }} />

      {/* Dot grid */}
      <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)", backgroundSize: "32px 32px", pointerEvents: "none" }} />

      {/* Main Card */}
      <div
        className="tm-card"
        style={{
          width: "100%",
          maxWidth: 460,
          background: "rgba(255,255,255,0.04)",
          border: `1px solid rgba(245,158,11,0.2)`,
          borderRadius: 24,
          padding: "40px 36px",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          boxShadow: "0 0 60px rgba(245,158,11,0.08), 0 40px 80px rgba(0,0,0,0.5)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Card glow top */}
        <div style={{ position: "absolute", top: -100, right: -100, width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(245,158,11,0.12) 0%, transparent 70%)", pointerEvents: "none" }} />

        {/* Logo / Icon */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 28 }}>
          <div
            className="float-icon"
            style={{
              width: 72,
              height: 72,
              borderRadius: 22,
              background: `linear-gradient(135deg, rgba(245,158,11,0.25) 0%, rgba(239,68,68,0.2) 100%)`,
              border: `1px solid rgba(245,158,11,0.35)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
              boxShadow: "0 0 40px rgba(245,158,11,0.2)",
            }}
          >
            <Truck size={32} color={ACCENT_AMBER} />
          </div>

          {/* Live badge */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 20, background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", marginBottom: 12 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: ACCENT_EMERALD, animation: "pulse-dot 2s ease infinite" }} />
            <span style={{ color: ACCENT_EMERALD, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em" }}>Chennai Port Authority</span>
          </div>

          <h1 className="shimmer-title" style={{ fontSize: 26, fontWeight: 900, margin: "0 0 6px", letterSpacing: "-0.03em", textAlign: "center" }}>
            {typedText}
            <span style={{ opacity: 0.5 }}>|</span>
          </h1>
          <p style={{ color: "#64748b", fontSize: 13, margin: 0, textAlign: "center" }}>
            Dedicated access for Traffic Management officials
          </p>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(245,158,11,0.3), transparent)", marginBottom: 28 }} />

        {/* Login Form */}
        <form onSubmit={handleSubmit}>
          {/* Username */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", color: "#94a3b8", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
              Username / Department ID
            </label>
            <div style={{ position: "relative" }}>
              <User size={16} color="#64748b" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} />
              <input
                id="tm-username"
                name="username"
                type="text"
                value={formData.username}
                onChange={handleChange}
                placeholder="Enter your username"
                autoComplete="username"
                className="tm-input"
                style={{
                  width: "100%",
                  paddingLeft: 44,
                  paddingRight: 16,
                  paddingTop: 12,
                  paddingBottom: 12,
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 12,
                  color: "#f1f5f9",
                  fontSize: 14,
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          {/* Password */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", color: "#94a3b8", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
              Password
            </label>
            <div style={{ position: "relative" }}>
              <Lock size={16} color="#64748b" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} />
              <input
                id="tm-password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                autoComplete="current-password"
                className="tm-input"
                style={{
                  width: "100%",
                  paddingLeft: 44,
                  paddingRight: 48,
                  paddingTop: 12,
                  paddingBottom: 12,
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 12,
                  color: "#f1f5f9",
                  fontSize: 14,
                  boxSizing: "border-box",
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 4 }}
              >
                {showPassword ? <EyeOff size={16} color="#64748b" /> : <Eye size={16} color="#64748b" />}
              </button>
            </div>
          </div>

          {/* Captcha */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", color: "#94a3b8", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
              Security Code
            </label>
            <div style={{ display: "flex", gap: 10, alignItems: "stretch" }}>
              {/* Captcha question box */}
              <div
                style={{
                  flex: 1,
                  padding: "11px 14px",
                  background: "rgba(245,158,11,0.08)",
                  border: "1px solid rgba(245,158,11,0.25)",
                  borderRadius: 12,
                  color: ACCENT_AMBER,
                  fontSize: 15,
                  fontWeight: 800,
                  letterSpacing: "0.05em",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: 100,
                  userSelect: "none",
                  fontStyle: "italic",
                }}
              >
                {isCaptchaLoading ? "Loading…" : captchaData.question || "Loading…"}
              </div>

              {/* Captcha answer */}
              <input
                id="tm-captcha"
                name="captcha"
                type="text"
                value={formData.captcha}
                onChange={handleChange}
                placeholder="Answer"
                className="tm-input"
                style={{
                  width: 90,
                  padding: "12px 14px",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 12,
                  color: "#f1f5f9",
                  fontSize: 14,
                  textAlign: "center",
                  boxSizing: "border-box",
                }}
              />

              {/* Refresh captcha */}
              <button
                type="button"
                onClick={fetchCaptcha}
                disabled={isCaptchaLoading}
                style={{
                  padding: "12px",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 12,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <RefreshCw size={15} color="#64748b" style={{ animation: isCaptchaLoading ? "spin-slow 1s linear infinite" : "none" }} />
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            id="tm-login-btn"
            type="submit"
            disabled={isLoading}
            className="tm-btn"
            style={{
              width: "100%",
              padding: "14px",
              background: `linear-gradient(135deg, ${ACCENT_AMBER} 0%, ${ACCENT_ORANGE} 100%)`,
              border: "none",
              borderRadius: 14,
              color: "#0a0a0a",
              fontSize: 15,
              fontWeight: 800,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              boxShadow: "0 4px 24px rgba(245,158,11,0.35)",
              letterSpacing: "0.02em",
            }}
          >
            {isLoading ? (
              <>
                <RefreshCw size={16} style={{ animation: "spin-slow 0.8s linear infinite" }} />
                Authenticating…
              </>
            ) : (
              <>
                <ShieldAlert size={16} />
                Sign In to Traffic Manager
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid rgba(255,255,255,0.06)", textAlign: "center" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 8 }}>
            <Activity size={12} color="#334155" />
            <span style={{ color: "#334155", fontSize: 11, fontWeight: 600 }}>APACS — Automated Port Access & Control System</span>
          </div>
          <p style={{ color: "#1e293b", fontSize: 10, margin: 0 }}>
            Authorised access only · Chennai Port Authority
          </p>
        </div>

        {/* Back to main login */}
        <div style={{ marginTop: 16, textAlign: "center" }}>
          <button
            type="button"
            onClick={() => router.push("/")}
            style={{ background: "none", border: "none", color: "#475569", fontSize: 12, cursor: "pointer", textDecoration: "underline" }}
          >
            ? Back to main login
          </button>
        </div>
      </div>
    </div>
  );
}
