"use client";

/**
 * DeptPortalScaffold.js
 *
 * Reusable thin-portal wrapper used by Finance, CISF, Safety, Gate, and
 * any future single-role portals that don't yet have bespoke features.
 *
 * Responsibilities:
 *  - Verifies the logged-in user's role matches the allowed roles list
 *  - Forces first-login mandatory password change
 *  - Runs session heartbeat
 *  - Provides a minimal top-bar with logout / dark-mode toggle
 *  - Renders children in a clean main area
 */

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "sonner";
import {
  LogOut, Moon, Sun, Lock, RefreshCw, EyeOff, Eye,
  ShieldAlert, CheckCircle,
} from "lucide-react";
import useSessionHeartbeat from "@/lib/useSessionHeartbeat";

const AUTH_API = process.env.NEXT_PUBLIC_AUTH_API || "http://localhost:5006";
const ADMIN_API = process.env.NEXT_PUBLIC_ADMIN_API || "http://localhost:5005/api";

const cn = (...c) => c.filter(Boolean).join(" ");

/** Password strength rules */
const PWD_RULES = [
  { label: "8–15 characters",       test: (p) => p.length >= 8 && p.length <= 15 },
  { label: "One uppercase letter",   test: (p) => /[A-Z]/.test(p) },
  { label: "One lowercase letter",   test: (p) => /[a-z]/.test(p) },
  { label: "One number",             test: (p) => /[0-9]/.test(p) },
  { label: "One special character",  test: (p) => /[^A-Za-z0-9]/.test(p) },
];

export default function DeptPortalScaffold({
  /** Array of role strings (case-insensitive) that may access this portal */
  allowedRoles,
  /** Portal title shown in the header */
  portalTitle,
  /** Subtitle / department description */
  portalSubtitle = "",
  /** Hex or Tailwind colour class for the accent strip */
  accentColor = "#0a1e4d",
  /** Icon component (lucide) for header decoration */
  HeaderIcon,
  /** Children — the actual portal content */
  children,
}) {
  const router = useRouter();
  const [user, setUser] = useState(null);

  // Password change modal state
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [newPwd, setNewPwd]             = useState("");
  const [confirmPwd, setConfirmPwd]     = useState("");
  const [showNew, setShowNew]           = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);
  const [pwdLoading, setPwdLoading]     = useState(false);

  // Dark mode
  const [dark, setDark] = useState(() =>
    typeof window !== "undefined" && localStorage.getItem("theme") === "dark"
  );
  const toggleDark = () =>
    setDark((p) => {
      localStorage.setItem("theme", !p ? "dark" : "light");
      return !p;
    });

  useSessionHeartbeat();

  // ── Auth gate ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const raw = localStorage.getItem("user");
    if (!raw) { router.replace("/"); return; }

    const parsed = JSON.parse(raw);
    const role = String(parsed.role || "").toLowerCase().trim();

    const allowed = (allowedRoles || []).map((r) => r.toLowerCase());
    if (!allowed.includes(role)) {
      toast.error("Unauthorized: you don't have access to this portal.");
      router.replace("/");
      return;
    }

    setUser(parsed);
    if (parsed.isPasswordChanged === false) setShowPwdModal(true);
  }, [router, allowedRoles]);

  // ── Logout ────────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    try {
      const token = localStorage.getItem("accessToken")?.replace(/^["']|["']$/g, "");
      await axios.post(
        `${AUTH_API}/auth/logout`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch { /* best-effort */ }
    localStorage.clear();
    router.replace("/");
  };

  // ── Password change ───────────────────────────────────────────────────────
  const handlePwdSubmit = async (e) => {
    e.preventDefault();
    if (!newPwd || !confirmPwd) { toast.warning("Fill in all fields."); return; }
    if (newPwd !== confirmPwd) { toast.warning("Passwords do not match."); return; }
    if (!PWD_RULES.every((r) => r.test(newPwd))) {
      toast.warning("Password does not meet the strength requirements."); return;
    }
    setPwdLoading(true);
    try {
      const token = localStorage.getItem("accessToken")?.replace(/^["']|["']$/g, "");
      await axios.post(
        `${ADMIN_API}/user/change-password`,
        { newPassword: newPwd, confirmNewPassword: confirmPwd },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Password updated successfully.");
      const updated = { ...user, isPasswordChanged: true };
      localStorage.setItem("user", JSON.stringify(updated));
      setUser(updated);
      setShowPwdModal(false);
      setNewPwd(""); setConfirmPwd("");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update password.");
    } finally { setPwdLoading(false); }
  };

  const pwdPassed = PWD_RULES.filter((r) => r.test(newPwd)).length;
  const pwdPct    = (pwdPassed / PWD_RULES.length) * 100;
  const pwdBar    = pwdPct === 100 ? "bg-emerald-500" : pwdPct >= 60 ? "bg-amber-500" : "bg-slate-300";

  if (!user) return null;

  const initials = (user.name || user.userName || user.username || "?")
    .split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className={cn("min-h-screen flex flex-col", dark ? "dark bg-slate-900" : "bg-slate-50")}>

      {/* ── Top bar ── */}
      <header
        className="flex items-center justify-between gap-4 px-4 sm:px-6 py-3 shadow-sm border-b border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 z-30 relative"
      >
        <div className="flex items-center gap-3 min-w-0">
          {HeaderIcon && (
            <span
              className="flex h-9 w-9 items-center justify-center rounded-xl shrink-0 text-white"
              style={{ backgroundColor: accentColor }}
            >
              <HeaderIcon className="h-5 w-5" strokeWidth={2.2} />
            </span>
          )}
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-extrabold text-slate-800 dark:text-white truncate leading-tight">
              {portalTitle}
            </h1>
            {portalSubtitle && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{portalSubtitle}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Dark mode toggle */}
          <button
            onClick={toggleDark}
            className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-slate-300 transition-colors"
            title={dark ? "Light mode" : "Dark mode"}
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {/* Avatar / name */}
          <div className="flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-white/10 px-3 py-1.5">
            <span
              className="flex h-7 w-7 items-center justify-center rounded-lg text-white text-xs font-bold shrink-0"
              style={{ backgroundColor: accentColor }}
            >
              {initials}
            </span>
            <span className="text-xs font-semibold text-slate-700 dark:text-white hidden sm:block truncate max-w-[120px]">
              {user.name || user.userName || user.username}
            </span>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider hidden md:block">
              {user.role}
            </span>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 border border-red-200 dark:border-red-500/30 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
        {children}
      </main>

      {/* ── Mandatory password change modal ── */}
      {showPwdModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md bg-white dark:bg-[#1f232d] rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200/50 dark:border-white/5 relative">
            <div className="text-center mb-6">
              <span className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-orange-100 dark:bg-orange-500/10 mb-4">
                <Lock className="h-7 w-7 text-orange-500" strokeWidth={2.4} />
              </span>
              <h3 className="text-xl font-extrabold text-slate-800 dark:text-white">
                {user?.isPasswordChanged === false ? "Mandatory Password Update" : "Update Password"}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                {user?.isPasswordChanged === false
                  ? "Welcome! Please set a new password before continuing."
                  : "Enter your new password below."}
              </p>
            </div>

            <form onSubmit={handlePwdSubmit} className="space-y-4">
              {/* New password */}
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type={showNew ? "text" : "password"}
                  placeholder="New Password"
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 text-sm bg-slate-50 dark:bg-[#1a1d27] border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-400/40 transition-all"
                  required
                />
                <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* Confirm password */}
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type={showConfirm ? "text" : "password"}
                  placeholder="Confirm New Password"
                  value={confirmPwd}
                  onChange={(e) => setConfirmPwd(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 text-sm bg-slate-50 dark:bg-[#1a1d27] border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-400/40 transition-all"
                  required
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* Strength bar + checklist */}
              <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-white/5 px-4 py-3 space-y-2">
                <div className="h-1.5 w-full bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-300 ${pwdBar}`} style={{ width: `${pwdPct}%` }} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                  {PWD_RULES.map((rule, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs">
                      {rule.test(newPwd)
                        ? <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        : <span className="h-3.5 w-3.5 rounded-full border-[1.5px] border-slate-300 shrink-0" />}
                      <span className={rule.test(newPwd) ? "text-slate-700 dark:text-slate-200 font-medium" : "text-slate-400"}>
                        {rule.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                {user?.isPasswordChanged !== false && (
                  <button type="button" onClick={() => setShowPwdModal(false)} className="w-1/2 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-2xl transition-all">
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={pwdLoading}
                  className={`py-3 bg-orange-500 text-white text-sm font-bold rounded-2xl hover:bg-orange-600 shadow-lg shadow-orange-500/20 transition-all disabled:opacity-70 flex items-center justify-center ${user?.isPasswordChanged !== false ? "w-1/2" : "w-full"}`}
                >
                  {pwdLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Update Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
