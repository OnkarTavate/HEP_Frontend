"use client";

import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import Link from "next/link";
import { toast } from "sonner";
import {
  Ship,
  ArrowLeft,
  User,
  Lock,
  Eye,
  EyeOff,
  RefreshCw,
  Trash2,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";

export default function AccountDeletionPage() {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    captcha: "",
    reason: "",
    confirm: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [captchaData, setCaptchaData] = useState({ question: "", token: "" });
  const [isCaptchaLoading, setIsCaptchaLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedRequestId, setSubmittedRequestId] = useState(null);
  const [errors, setErrors] = useState({});

  const fetchCaptcha = useCallback(async () => {
    setIsCaptchaLoading(true);
    try {
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_AUTH_API}/auth/getCaptcha`,
        { withCredentials: true }
      );
      const question = res.data?.captchaQuestion || res.data?.question;
      const token = res.data?.captchaToken || res.data?.token || "";
      if (question) {
        setCaptchaData({ question, token });
      }
    } catch {
      setCaptchaData({ question: "3 + 2 = ?", token: "fallback" });
    } finally {
      setIsCaptchaLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCaptcha();
  }, [fetchCaptcha]);

  const validate = () => {
    const e = {};
    if (!formData.username.trim()) e.username = "Username is required";
    if (!formData.password.trim()) e.password = "Password is required";
    if (!formData.captcha.trim()) e.captcha = "Please enter the security code";
    if (!formData.confirm) e.confirm = "You must acknowledge this action";
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      toast.error("Please fill in all required fields.");
      return;
    }
    setErrors({});
    setIsSubmitting(true);
    try {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_AUTH_API}/auth/requestAccountDeletion`,
        {
          username: formData.username,
          password: formData.password,
          captchaValue: formData.captcha,
          captchaToken: captchaData.token,
          reason: formData.reason,
        },
        { withCredentials: true }
      );
      if (res.data?.requestId) {
        setSubmittedRequestId(res.data.requestId);
      }
      setIsSubmitted(true);
      toast.success(res.data?.message || "Account deletion request submitted.");
    } catch (err) {
      const msg = err.response?.data?.message || "Request failed. Please try again.";
      toast.error(msg);
      fetchCaptcha();
      setFormData((p) => ({ ...p, captcha: "" }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputCls = (field) =>
    `w-full pl-11 pr-3 py-3.5 text-base sm:text-[15px] bg-stone-50 border focus:bg-white text-gray-900 placeholder-stone-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 rounded-xl focus:outline-none transition-all duration-200 ${errors[field] ? "border-red-400 bg-red-50" : "border-stone-200"
    }`;

  return (
    <div className="min-h-screen bg-[#0c0e13] flex flex-col font-sans">
      {/* BG */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-center pointer-events-none"
        style={{
          backgroundImage: "url('/port-bg.jpg')",
          filter: "brightness(0.18) saturate(0.5)",
        }}
      />
      <div
        className="fixed inset-0 z-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }}
      />
      {/* Glow orbs */}
      <div className="fixed top-20 left-10 w-72 h-72 bg-red-600/10 rounded-full blur-3xl pointer-events-none z-0" />
      <div className="fixed bottom-10 right-10 w-96 h-96 bg-red-800/10 rounded-full blur-3xl pointer-events-none z-0" />

      <div className="relative z-10 flex-grow flex flex-col">
        {/* NAV */}
        <nav className="w-full max-w-4xl lg:max-w-5xl mx-auto px-6 py-5 flex justify-between items-center">
          <div className="flex items-center gap-3 bg-white/[0.07] backdrop-blur-xl px-4 py-2.5 rounded-2xl border border-white/10">
            <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-orange-700 rounded-xl flex items-center justify-center shadow-lg shadow-orange-900/40">
              <Ship className="h-5 w-5 text-white" />
            </div>
            <span className="text-base font-extrabold text-white tracking-wide">APACS</span>
          </div>
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-white/70 hover:text-white font-semibold bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 px-4 py-2.5 rounded-xl backdrop-blur-md transition-all duration-200"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Login
          </Link>
        </nav>

        {/* MAIN */}
        <main className="flex-grow flex items-center justify-center px-4 sm:px-6 py-10">
          <div className="w-full max-w-2xl lg:max-w-4xl xl:max-w-[960px]">

            {!isSubmitted ? (
              <>
                {/* Warning Header Card */}
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-red-700 via-red-600 to-rose-600 p-8 sm:p-10 md:p-12 mb-6 shadow-2xl shadow-red-900/50">
                  <div className="absolute -top-8 -right-8 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                  <div className="absolute bottom-0 left-6 w-36 h-36 bg-rose-300/15 rounded-full blur-xl pointer-events-none" />
                  <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center border border-white/30 flex-shrink-0 shadow-lg">
                      <Trash2 className="h-7 w-7 sm:h-8 sm:w-8 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-red-200 uppercase tracking-[0.2em] mb-1">
                        Irreversible Action
                      </p>
                      <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white leading-tight">
                        Request Account Deletion
                      </h1>
                      <p className="text-xs sm:text-sm text-red-100 mt-1 font-medium">
                        Formal verification and de-registration gateway for Chennai Port APACS accounts
                      </p>
                    </div>
                  </div>
                </div>

                {/* Warning Notice */}
                <div className="flex items-start gap-4 bg-amber-50 border border-amber-200 rounded-2xl p-5 sm:p-6 mb-6">
                  <AlertTriangle className="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-extrabold text-amber-900 uppercase tracking-wider mb-1">
                      Before You Proceed
                    </p>
                    <p className="text-xs sm:text-sm text-amber-800 leading-relaxed">
                      Submitting this request will permanently delete your APACS account, all submitted applications, issued passes, and associated data. This action <strong>cannot be undone</strong>. Your request will be reviewed by the Chennai Port Authority before processing.
                    </p>
                  </div>
                </div>

                {/* Form Card */}
                <div className="bg-white rounded-3xl shadow-[0_20px_80px_rgba(0,0,0,0.4)] overflow-hidden">
                  <div className="p-8 sm:p-10 md:p-12">
                    <form onSubmit={handleSubmit} className="space-y-6" noValidate>

                      {/* 2-column grid for Username and Password on medium+ screens */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
                        {/* Username */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                            Username / Login ID <span className="text-red-500">*</span>
                          </label>
                          <div className="relative group">
                            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-stone-400 group-focus-within:text-red-500 transition-colors duration-200" />
                            <input
                              type="text"
                              placeholder="Enter your username"
                              value={formData.username}
                              onChange={(e) => {
                                setFormData((p) => ({ ...p, username: e.target.value }));
                                if (errors.username) setErrors((p) => ({ ...p, username: null }));
                              }}
                              className={inputCls("username")}
                              required
                            />
                          </div>
                          {errors.username && (
                            <p className="flex items-center gap-1 text-xs text-red-500 font-medium">
                              <XCircle className="h-3.5 w-3.5 shrink-0" />
                              {errors.username}
                            </p>
                          )}
                        </div>

                        {/* Password */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                            Password <span className="text-red-500">*</span>
                          </label>
                          <div className="relative group">
                            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-stone-400 group-focus-within:text-red-500 transition-colors duration-200" />
                            <input
                              type={showPassword ? "text" : "password"}
                              placeholder="Enter your password"
                              value={formData.password}
                              onChange={(e) => {
                                setFormData((p) => ({ ...p, password: e.target.value }));
                                if (errors.password) setErrors((p) => ({ ...p, password: null }));
                              }}
                              className={`${inputCls("password")} pr-11`}
                              required
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword((p) => !p)}
                              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-red-500 transition-colors focus:outline-none"
                            >
                              {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                            </button>
                          </div>
                          {errors.password && (
                            <p className="flex items-center gap-1 text-xs text-red-500 font-medium">
                              <XCircle className="h-3.5 w-3.5 shrink-0" />
                              {errors.password}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Captcha */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Security Code <span className="text-red-500">*</span>
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                          <div>
                            <input
                              type="text"
                              placeholder="Enter security code answer"
                              value={formData.captcha}
                              onChange={(e) => {
                                setFormData((p) => ({ ...p, captcha: e.target.value }));
                                if (errors.captcha) setErrors((p) => ({ ...p, captcha: null }));
                              }}
                              className={`w-full px-4 py-3.5 text-base sm:text-[15px] bg-stone-50 border focus:bg-white text-gray-900 placeholder-stone-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 rounded-xl focus:outline-none transition-all duration-200 ${errors.captcha ? "border-red-400 bg-red-50" : "border-stone-200"
                                }`}
                              required
                            />
                            {errors.captcha && (
                              <p className="flex items-center gap-1 text-xs text-red-500 font-medium mt-1">
                                <XCircle className="h-3.5 w-3.5 shrink-0" />
                                {errors.captcha}
                              </p>
                            )}
                          </div>
                          {/* Captcha display */}
                          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 justify-between">
                            <div className="font-bold text-base text-blue-700 tracking-wider select-none">
                              {isCaptchaLoading ? (
                                <RefreshCw className="h-4 w-4 text-slate-400 animate-spin" />
                              ) : (
                                captchaData.question || "Loading..."
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                fetchCaptcha();
                                setFormData((p) => ({ ...p, captcha: "" }));
                              }}
                              disabled={isCaptchaLoading}
                              className="bg-white border border-slate-200 rounded-lg p-1.5 hover:bg-slate-100 active:scale-95 transition-all disabled:opacity-50"
                              title="Refresh security code"
                            >
                              <RefreshCw className={`h-4 w-4 text-slate-500 ${isCaptchaLoading ? "animate-spin" : ""}`} />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Reason (Optional) */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                          <span>Reason for Deletion</span>
                          <span className="text-stone-400 font-normal lowercase">(optional)</span>
                        </label>
                        <textarea
                          rows={3}
                          placeholder="Briefly tell us why you are deleting this account..."
                          value={formData.reason}
                          onChange={(e) =>
                            setFormData((p) => ({ ...p, reason: e.target.value }))
                          }
                          className="w-full px-4 py-3 text-sm bg-stone-50 border border-stone-200 focus:bg-white text-gray-900 placeholder-stone-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 rounded-xl focus:outline-none transition-all duration-200 resize-none"
                        />
                      </div>

                      {/* Acknowledgement Checkbox */}
                      <div className={`p-4 sm:p-5 rounded-2xl border transition-colors ${errors.confirm ? "bg-red-50 border-red-300" : "bg-slate-50 border-slate-200"}`}>
                        <label className="flex items-start gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.confirm}
                            onChange={(e) => {
                              setFormData((p) => ({ ...p, confirm: e.target.checked }));
                              if (errors.confirm) setErrors((p) => ({ ...p, confirm: null }));
                            }}
                            className="mt-0.5 w-4 h-4 text-red-600 border-slate-300 rounded focus:ring-red-500 cursor-pointer flex-shrink-0"
                          />
                          <span className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                            I understand that this request will result in the{" "}
                            <strong className="text-red-700 font-bold">permanent deletion</strong> of my APACS account and all associated passes and records, and I confirm this is my own account.
                          </span>
                        </label>
                        {errors.confirm && (
                          <p className="flex items-center gap-1 text-xs text-red-500 font-medium mt-2 ml-7">
                            <XCircle className="h-3.5 w-3.5 shrink-0" />
                            {errors.confirm}
                          </p>
                        )}
                      </div>

                      {/* Submit */}
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className={`w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl text-base font-bold text-white transition-all duration-200 shadow-lg focus:outline-none focus:ring-4 focus:ring-red-500/20 ${isSubmitting
                          ? "bg-red-400 cursor-not-allowed opacity-70"
                          : "bg-red-600 hover:bg-red-700 hover:-translate-y-0.5 active:translate-y-0 shadow-red-600/30 hover:shadow-red-600/40"
                          }`}
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Submitting Request...
                          </>
                        ) : (
                          <>
                            <Trash2 className="h-5 w-5" />
                            Request Account Deletion
                          </>
                        )}
                      </button>

                      <p className="text-center text-xs sm:text-sm text-slate-500 pt-1">
                        Changed your mind?{" "}
                        <Link href="/" className="text-orange-600 font-bold hover:text-orange-700 hover:underline transition-colors">
                          Return to Login
                        </Link>
                      </p>
                    </form>
                  </div>
                </div>
              </>
            ) : (
              /* Success State */
              <div className="bg-white rounded-3xl shadow-[0_20px_80px_rgba(0,0,0,0.4)] overflow-hidden text-center p-10 sm:p-14 md:p-16">
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-emerald-50">
                  <CheckCircle2 className="h-10 w-10 text-emerald-600" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2">
                  Request Submitted
                </h2>
                {submittedRequestId && (
                  <div className="inline-block bg-slate-100 border border-slate-200 text-slate-700 text-xs font-mono font-bold py-1.5 px-4 rounded-full mb-4">
                    Tracking ID: #{submittedRequestId}
                  </div>
                )}
                <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-md mx-auto mb-8">
                  Your account deletion request has been received. The Chennai Port Authority team will review and process it within <strong className="text-slate-900">3–5 business days</strong>.
                </p>
                <div className="max-w-md mx-auto flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-8 text-left">
                  <ShieldAlert className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs sm:text-sm text-amber-800 leading-relaxed">
                    You will receive a confirmation on your registered email address once the deletion is processed.
                  </p>
                </div>
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 bg-slate-900 hover:bg-orange-600 text-white text-sm sm:text-base font-bold py-3.5 px-8 rounded-2xl shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Return to Login
                </Link>
              </div>
            )}
          </div>
        </main>

        <footer className="text-center py-5 text-zinc-600 text-xs font-semibold uppercase tracking-widest">
          © 2026 Chennai Port Authority · All Rights Reserved
        </footer>
      </div>
    </div>
  );
}
