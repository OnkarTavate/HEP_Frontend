"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Mail,
  Shield,
  Building2,
  Users,
  FileText,
  MessageSquare,
  Send,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

// ── Constants ─────────────────────────────────────────────────────────────────

const VISITOR_TYPES = [
  { value: "VENDOR", label: "Vendor" },
  { value: "CONTRACTOR", label: "Contractor" },
  { value: "VISITOR", label: "Visitor" },
  { value: "TEMPORARY_STAFF", label: "Temporary Staff" },
];

const PAYMENT_MODES = [
  { value: "CASH", label: "Cash" },
  { value: "ONLINE", label: "Online" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "DD", label: "Demand Draft" },
];

// ── Validation ────────────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(fields) {
  const errors = {};

  // Email verification check
  if (!fields.emailVerified) {
    errors.email = "Please verify your email address before submitting.";
  }

  // Company details
  if (!fields.companyName?.trim()) {
    errors.companyName = "Company name is required.";
  } else if (fields.companyName.trim().length < 3 || fields.companyName.trim().length > 255) {
    errors.companyName = "Company name must be between 3 and 255 characters.";
  }

  if (!fields.visitorType) {
    errors.visitorType = "Visitor type is required.";
  }

  if (!fields.applicantEmail?.trim()) {
    errors.applicantEmail = "Applicant email is required.";
  } else if (!EMAIL_RE.test(fields.applicantEmail.trim())) {
    errors.applicantEmail = "Invalid email format.";
  }

  if (!fields.applicantMobile?.trim()) {
    errors.applicantMobile = "Applicant mobile is required.";
  } else if (!/^\d{10}$/.test(fields.applicantMobile.trim())) {
    errors.applicantMobile = "Mobile number must be exactly 10 digits.";
  }

  // Pass requirements
  const persons = parseInt(fields.noOfPersons, 10);
  if (isNaN(persons) || persons < 0 || persons > 30) {
    errors.noOfPersons = "Number of persons must be between 0 and 30.";
  }

  const vehicles = parseInt(fields.noOfVehicles, 10);
  if (isNaN(vehicles) || vehicles < 0 || vehicles > 20) {
    errors.noOfVehicles = "Number of vehicles must be between 0 and 20.";
  }

  if (!fields.validityUpto) {
    errors.validityUpto = "Validity date is required.";
  } else if (new Date(fields.validityUpto) <= new Date()) {
    errors.validityUpto = "Validity date must be in the future.";
  }

  if (!fields.paymentMode) {
    errors.paymentMode = "Payment mode is required.";
  }

  // Purpose
  if (!fields.purpose?.trim()) {
    errors.purpose = "Purpose is required.";
  } else if (fields.purpose.trim().length > 1000) {
    errors.purpose = "Purpose must not exceed 1000 characters.";
  }

  // Remarks
  if (fields.remarks && fields.remarks.trim().length > 1000) {
    errors.remarks = "Remarks must not exceed 1000 characters.";
  }

  return errors;
}

// ── Shared styling ────────────────────────────────────────────────────────────

const cardShell =
  "rounded-3xl border-0 bg-white dark:bg-[#1f232d] " +
  "ring-1 ring-stone-200/70 dark:ring-white/[0.06] " +
  "shadow-[0_1px_3px_rgba(15,23,42,0.04),0_18px_40px_-20px_rgba(15,23,42,0.20)] " +
  "dark:shadow-[0_1px_3px_rgba(0,0,0,0.55),0_30px_60px_-24px_rgba(0,0,0,0.70)] " +
  "transition-all duration-300";

// ── Field components ──────────────────────────────────────────────────────────

function FieldLabel({ children, required }) {
  return (
    <label className="block text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-1.5">
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}

function FieldError({ msg }) {
  if (!msg) return null;
  return (
    <p className="flex items-center gap-1 mt-1.5 text-xs font-semibold text-red-500">
      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
      {msg}
    </p>
  );
}

const inputCls = (hasError) =>
  `w-full px-4 py-3 rounded-2xl border text-sm text-stone-800 dark:text-stone-200 bg-stone-50 dark:bg-white/5 placeholder:text-stone-400 outline-none transition focus:ring-2 ${
    hasError
      ? "border-red-400 dark:border-red-500 focus:ring-red-300/50"
      : "border-stone-200 dark:border-white/10 focus:ring-amber-400/50"
  }`;

// ── Main Page Component ───────────────────────────────────────────────────────

export default function PublicBulkPassRequestPage() {
  const router = useRouter();

  // Form state
  const [form, setForm] = useState({
    // Email verification
    applicantEmail: "",
    otp: "",
    emailVerified: false,

    // CAPTCHA (inline, like login page)
    captchaAnswer: "",

    // Company details
    companyName: "",
    visitorType: "",
    applicantMobile: "",

    // Pass requirements
    noOfPersons: "0",
    noOfVehicles: "0",
    validityUpto: "",
    paymentMode: "",

    // Work order
    workOrderRequired: false,
    refDocNo: "",

    // Purpose & remarks
    purpose: "",
    remarks: "",
  });

  // UI state
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);

  // Email verification state
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);

  // CAPTCHA state
  const [captcha, setCaptcha] = useState(null);
  const [loadingCaptcha, setLoadingCaptcha] = useState(false);
  const [captchaVerified, setCaptchaVerified] = useState(false);

  // Countdown timer for OTP
  useEffect(() => {
    if (otpTimer > 0) {
      const interval = setInterval(() => {
        setOtpTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [otpTimer]);

  // Load CAPTCHA on mount
  useEffect(() => {
    fetchCaptcha();
  }, []);

  // ── Helper functions ──────────────────────────────────────────────────────

  const set = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (touched[key]) {
      // re-validate just this field inline
      setErrors((prev) => {
        const e = validate({ ...form, [key]: value });
        return { ...prev, [key]: e[key] };
      });
    }
  };

  const touch = (key) => {
    setTouched((prev) => ({ ...prev, [key]: true }));
    const e = validate(form);
    setErrors((prev) => ({ ...prev, [key]: e[key] }));
  };

  // ── Email verification functions ──────────────────────────────────────────

  const requestOTP = async () => {
    if (!form.applicantEmail?.trim()) {
      toast.error("Please enter your email address.");
      return;
    }
    if (!EMAIL_RE.test(form.applicantEmail.trim())) {
      toast.error("Please enter a valid email address.");
      return;
    }
    if (!form.captchaAnswer?.trim()) {
      toast.error("Please enter the security code.");
      return;
    }

    setSendingOtp(true);
    try {
      // Step 1: Verify captcha first
      const captchaRes = await fetch(
        `${process.env.NEXT_PUBLIC_USER_SERVICE_URL}/api/captcha/verify-captcha`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: captcha?.token,
            answer: form.captchaAnswer.trim(),
          }),
        }
      );

      const captchaData = await captchaRes.json();

      if (!captchaRes.ok || !captchaData.success || !captchaData.valid) {
        toast.error(captchaData.message || "Invalid security code. Please try again.");
        fetchCaptcha(); // Get a new captcha
        setForm({ ...form, captchaAnswer: "" }); // Clear the captcha answer
        setSendingOtp(false);
        return; // STOP HERE - do not proceed to OTP request
      }

      setCaptchaVerified(true);

      // Step 2: Send OTP after captcha is verified
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_USER_SERVICE_URL}/api/bulk-pass/public/request-otp`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: form.applicantEmail.trim() }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          toast.error(data.message || "Too many requests. Please try again later.");
        } else {
          toast.error(data.message || "Failed to send OTP. Please try again.");
        }
        setSendingOtp(false);
        return;
      }

      setOtpSent(true);
      setOtpTimer(600); // 10 minutes
      toast.success("OTP sent to your email. Please check your inbox.");
    } catch (err) {
      console.error("Request OTP error:", err);
      toast.error(err.message || "Failed to send OTP. Please try again.");
    } finally {
      setSendingOtp(false);
    }
  };

  const verifyOTP = async () => {
    if (!form.otp?.trim() || form.otp.length !== 6) {
      toast.error("Please enter the 6-digit OTP.");
      return;
    }

    setVerifyingOtp(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_USER_SERVICE_URL}/api/bulk-pass/public/verify-otp`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: form.applicantEmail.trim(),
            otp: form.otp.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || "Invalid OTP");
      }

      if (data.verified) {
        set("emailVerified", true);
        toast.success("Email verified successfully!");
      } else {
        throw new Error("Email verification failed");
      }
    } catch (err) {
      toast.error(err.message || "OTP verification failed. Please try again.");
    } finally {
      setVerifyingOtp(false);
    }
  };

  // ── CAPTCHA functions ─────────────────────────────────────────────────────

  const fetchCaptcha = async () => {
    setLoadingCaptcha(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_USER_SERVICE_URL}/api/captcha/get-captcha`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || "Failed to load CAPTCHA");
      }

      setCaptcha(data);
      set("captchaAnswer", "");
      setCaptchaVerified(false);
    } catch (err) {
      toast.error("Failed to load CAPTCHA. Please refresh the page.");
    } finally {
      setLoadingCaptcha(false);
    }
  };

  // ── Form submission with retry logic ───────────────────────────────────────

  const submitWithRetry = async (payload, maxRetries = 3, delay = 1000) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_USER_SERVICE_URL}/api/bulk-pass/public/request`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          // Check if error is retryable (5xx server errors or network issues)
          if (response.status >= 500 && attempt < maxRetries) {
            console.warn(`Request failed with ${response.status}, retrying in ${delay}ms... (attempt ${attempt}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2; // Exponential backoff
            continue;
          }
          throw new Error(data.message || data.error || "Failed to submit request");
        }

        return data;
      } catch (error) {
        // Check if error is retryable (network errors)
        if ((error.name === 'TypeError' || error.message.includes('fetch')) && attempt < maxRetries) {
          console.warn(`Network error, retrying in ${delay}ms... (attempt ${attempt}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2; // Exponential backoff
          continue;
        }
        throw error;
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Mark all as touched and validate
    const allTouched = Object.keys(form).reduce((acc, k) => ({ ...acc, [k]: true }), {});
    setTouched(allTouched);
    const errs = validate(form);
    setErrors(errs);

    if (Object.keys(errs).length > 0) {
      toast.error("Please fix the errors before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        companyName: form.companyName.trim(),
        applicantEmail: form.applicantEmail.trim(),
        applicantMobile: form.applicantMobile.trim(),
        visitorType: form.visitorType,
        noOfPersons: parseInt(form.noOfPersons, 10),
        noOfVehicles: parseInt(form.noOfVehicles, 10),
        validityUpto: form.validityUpto,
        paymentMode: form.paymentMode,
        purpose: form.purpose.trim(),
        workOrderRequired: form.workOrderRequired,
        refDocNo: form.refDocNo.trim(),
        remarks: form.remarks.trim(),
        emailVerified: form.emailVerified,
      };

      // Only include captcha credentials if they are available
      // (captcha was already verified during the OTP request step)
      if (captcha?.token && form.captchaAnswer?.trim()) {
        payload.captchaToken = captcha.token;
        payload.captchaAnswer = form.captchaAnswer.trim();
      }

      // Use retry logic for submission
      const data = await submitWithRetry(payload);

      // Store result and show success modal
      setSubmissionResult({
        trackingNumber: data.trackingNumber,
        requestId: data.requestId,
        timestamp: new Date().toISOString(),
      });
      setShowSuccessModal(true);

    } catch (err) {
      toast.error(err.message || "Failed to submit request. Please try again.");
      // Refresh CAPTCHA on error
      fetchCaptcha();
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-amber-50/30 to-stone-100 dark:from-[#0f0f0f] dark:via-[#1a1a1a] dark:to-[#0f0f0f] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 mb-4">
            <Building2 className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold text-stone-900 dark:text-stone-100 mb-2">
            Public Bulk Pass Request
          </h1>
          <p className="text-sm text-stone-600 dark:text-stone-400 max-w-2xl mx-auto">
            Submit a bulk pass request for multiple visitors to Chennai Port. Your request will
            be reviewed by the General Administrator Department.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="flex flex-col gap-6">
            {/* ── Section 1: Email Verification (with inline CAPTCHA) ── */}
            <div className={`${cardShell} p-6`}>
              <SectionHeading
                icon={<Mail className="h-4 w-4" />}
                title="Email Verification"
              />
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-2 mb-4">
                Complete the security check and verify your email to proceed.
              </p>

              <div className="space-y-4">
                {/* Email input */}
                <div>
                  <FieldLabel required>Email Address</FieldLabel>
                  <input
                    type="email"
                    placeholder="your.email@example.com"
                    value={form.applicantEmail}
                    onChange={(e) => set("applicantEmail", e.target.value)}
                    onBlur={() => touch("applicantEmail")}
                    disabled={form.emailVerified || otpSent}
                    className={`${inputCls(
                      !!errors.applicantEmail
                    )} ${form.emailVerified || otpSent ? "opacity-60" : ""}`}
                    autoComplete="email"
                  />
                  <FieldError msg={errors.applicantEmail || errors.email} />
                </div>

                {/* Inline CAPTCHA — same style as login page (hidden after OTP sent) */}
                {!otpSent && !form.emailVerified && (
                  <div>
                    <FieldLabel required>Security Code</FieldLabel>
                    <div className="flex flex-col sm:flex-row gap-2.5 w-full">
                      <input
                        placeholder="Security Code"
                        value={form.captchaAnswer}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^0-9-]/g, "");
                          set("captchaAnswer", value);
                        }}
                        className="flex-1 min-w-0 px-4 py-3 text-sm bg-stone-50 dark:bg-white/5 border border-stone-200 dark:border-white/10 text-stone-800 dark:text-stone-200 placeholder-stone-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-400/50 rounded-2xl outline-none transition"
                      />
                      <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/30 rounded-2xl px-3 py-2 w-full sm:w-[190px] shrink-0 justify-between">
                        <div className="flex-1 flex items-center justify-center min-w-0 overflow-hidden">
                          {loadingCaptcha ? (
                            <RefreshCw className="h-5 w-5 text-amber-400 animate-spin" />
                          ) : (
                            <div className="font-bold text-lg text-blue-700 dark:text-blue-400 tracking-wide select-none">
                              {captcha?.question || captcha?.captchaQuestion || "Loading..."}
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={fetchCaptcha}
                          disabled={loadingCaptcha}
                          title="Refresh captcha"
                          className="shrink-0 bg-white dark:bg-white/10 border border-amber-200 dark:border-amber-700/30 rounded-md p-1.5 hover:bg-amber-100 dark:hover:bg-amber-900/40 active:scale-95 transition-all disabled:opacity-50"
                        >
                          <RefreshCw
                            className={`h-4 w-4 text-amber-600 dark:text-amber-400 ${loadingCaptcha ? "animate-spin" : ""}`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Verify Email / Send OTP button (verifies captcha first) */}
                {!otpSent && !form.emailVerified && (
                  <button
                    type="button"
                    onClick={requestOTP}
                    disabled={sendingOtp}
                    className="w-full py-3 rounded-2xl bg-amber-400 hover:bg-amber-500 disabled:opacity-60 disabled:cursor-not-allowed text-[#1f1f1f] font-bold text-sm transition flex items-center justify-center gap-2"
                  >
                    {sendingOtp ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        <Shield className="h-4 w-4" />
                        Verify & Send OTP
                      </>
                    )}
                  </button>
                )}

                {/* Verified badge */}
                {form.emailVerified && (
                  <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-sm font-bold">Email Verified</span>
                  </div>
                )}

                {/* OTP input - shown after OTP sent */}
                {otpSent && !form.emailVerified && (
                  <div>
                    <FieldLabel required>Enter OTP</FieldLabel>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="123456"
                        maxLength={6}
                        value={form.otp}
                        onChange={(e) => set("otp", e.target.value.replace(/\D/g, ""))}
                        className={`${inputCls(false)} flex-1`}
                        autoComplete="one-time-code"
                      />
                      <button
                        type="button"
                        onClick={verifyOTP}
                        disabled={verifyingOtp}
                        className="px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-sm whitespace-nowrap transition"
                      >
                        {verifyingOtp ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Verify OTP"
                        )}
                      </button>
                    </div>
                    {otpTimer > 0 && (
                      <p className="flex items-center gap-1.5 mt-1.5 text-xs text-stone-500">
                        <Clock className="h-3.5 w-3.5" />
                        OTP expires in {Math.floor(otpTimer / 60)}:
                        {String(otpTimer % 60).padStart(2, "0")}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ── Section 3: Company Details ── */}
            <div className={`${cardShell} p-6`}>
              <SectionHeading
                icon={<Building2 className="h-4 w-4" />}
                title="Company Details"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-5">
                {/* Company name */}
                <div className="sm:col-span-2">
                  <FieldLabel required>Company / Organisation Name</FieldLabel>
                  <input
                    type="text"
                    placeholder="e.g. ABC Productions Pvt Ltd"
                    value={form.companyName}
                    onChange={(e) => set("companyName", e.target.value)}
                    onBlur={() => touch("companyName")}
                    className={inputCls(!!errors.companyName)}
                  />
                  <FieldError msg={errors.companyName} />
                </div>

                {/* Visitor type */}
                <div>
                  <FieldLabel required>Visitor Type</FieldLabel>
                  <select
                    value={form.visitorType}
                    onChange={(e) => set("visitorType", e.target.value)}
                    onBlur={() => touch("visitorType")}
                    className={inputCls(!!errors.visitorType)}
                  >
                    <option value="">Select visitor type...</option>
                    {VISITOR_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <FieldError msg={errors.visitorType} />
                </div>

                {/* Mobile */}
                <div>
                  <FieldLabel required>Contact Mobile</FieldLabel>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-stone-500 font-semibold select-none">
                      +91
                    </span>
                    <input
                      type="tel"
                      placeholder="9876543210"
                      maxLength={10}
                      value={form.applicantMobile}
                      onChange={(e) =>
                        set("applicantMobile", e.target.value.replace(/\D/g, ""))
                      }
                      onBlur={() => touch("applicantMobile")}
                      className={`${inputCls(!!errors.applicantMobile)} pl-12`}
                      autoComplete="tel"
                    />
                  </div>
                  <FieldError msg={errors.applicantMobile} />
                </div>
              </div>
            </div>

            {/* ── Section 4: Pass Requirements ── */}
            <div className={`${cardShell} p-6`}>
              <SectionHeading icon={<Users className="h-4 w-4" />} title="Pass Requirements" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-5">
                {/* Number of persons */}
                <div>
                  <FieldLabel required>Number of Persons (0-30)</FieldLabel>
                  <input
                    type="number"
                    min={0}
                    max={30}
                    value={form.noOfPersons}
                    onChange={(e) => set("noOfPersons", e.target.value)}
                    onBlur={() => touch("noOfPersons")}
                    className={inputCls(!!errors.noOfPersons)}
                  />
                  <FieldError msg={errors.noOfPersons} />
                </div>

                {/* Number of vehicles */}
                <div>
                  <FieldLabel required>Number of Vehicles (0-20)</FieldLabel>
                  <input
                    type="number"
                    min={0}
                    max={20}
                    value={form.noOfVehicles}
                    onChange={(e) => set("noOfVehicles", e.target.value)}
                    onBlur={() => touch("noOfVehicles")}
                    className={inputCls(!!errors.noOfVehicles)}
                  />
                  <FieldError msg={errors.noOfVehicles} />
                </div>

                {/* Validity date */}
                <div>
                  <FieldLabel required>Validity Upto</FieldLabel>
                  <input
                    type="date"
                    min={new Date().toISOString().split("T")[0]}
                    value={form.validityUpto}
                    onChange={(e) => set("validityUpto", e.target.value)}
                    onBlur={() => touch("validityUpto")}
                    className={inputCls(!!errors.validityUpto)}
                  />
                  <FieldError msg={errors.validityUpto} />
                </div>

                {/* Payment mode */}
                <div>
                  <FieldLabel required>Payment Mode</FieldLabel>
                  <select
                    value={form.paymentMode}
                    onChange={(e) => set("paymentMode", e.target.value)}
                    onBlur={() => touch("paymentMode")}
                    className={inputCls(!!errors.paymentMode)}
                  >
                    <option value="">Select payment mode...</option>
                    {PAYMENT_MODES.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                  <FieldError msg={errors.paymentMode} />
                </div>
              </div>
            </div>

            {/* ── Section 5: Work Order ── */}
            <div className={`${cardShell} p-6`}>
              <SectionHeading icon={<FileText className="h-4 w-4" />} title="Work Order" />
              <div className="space-y-4 mt-5">
                {/* Work order required checkbox */}
                <div>
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={form.workOrderRequired}
                      onChange={(e) => set("workOrderRequired", e.target.checked)}
                      className="h-5 w-5 rounded border-stone-300 dark:border-white/20 text-amber-500 focus:ring-amber-400/50"
                    />
                    <span className="text-sm font-semibold text-stone-700 dark:text-stone-300">
                      Work Order Required
                    </span>
                  </label>
                </div>

                {/* Reference document number */}
                <div>
                  <FieldLabel>Reference Document Number (optional)</FieldLabel>
                  <input
                    type="text"
                    placeholder="e.g. WO/2026/1234"
                    value={form.refDocNo}
                    onChange={(e) => set("refDocNo", e.target.value)}
                    className={inputCls(false)}
                  />
                </div>
              </div>
            </div>

            {/* ── Section 6: Purpose & Remarks ── */}
            <div className={`${cardShell} p-6`}>
              <SectionHeading
                icon={<MessageSquare className="h-4 w-4" />}
                title="Purpose & Remarks"
              />
              <div className="space-y-5 mt-5">
                {/* Purpose */}
                <div>
                  <FieldLabel required>Purpose of Visit</FieldLabel>
                  <textarea
                    rows={4}
                    maxLength={1000}
                    placeholder="Describe the purpose of this bulk pass request..."
                    value={form.purpose}
                    onChange={(e) => set("purpose", e.target.value)}
                    onBlur={() => touch("purpose")}
                    className={`${inputCls(!!errors.purpose)} resize-none`}
                  />
                  <div className="flex justify-between items-start gap-2 mt-1.5">
                    <div className="flex-1">
                      <FieldError msg={errors.purpose} />
                    </div>
                    <span className="text-xs text-stone-400 shrink-0">
                      {form.purpose.length}/1000
                    </span>
                  </div>
                </div>

                {/* Remarks */}
                <div>
                  <FieldLabel>Additional Remarks (optional)</FieldLabel>
                  <textarea
                    rows={3}
                    maxLength={1000}
                    placeholder="Any additional information or remarks..."
                    value={form.remarks}
                    onChange={(e) => set("remarks", e.target.value)}
                    onBlur={() => touch("remarks")}
                    className={`${inputCls(!!errors.remarks)} resize-none`}
                  />
                  <div className="flex justify-between items-start gap-2 mt-1.5">
                    <div className="flex-1">
                      <FieldError msg={errors.remarks} />
                    </div>
                    <span className="text-xs text-stone-400 shrink-0">
                      {form.remarks.length}/1000
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Submit Button ── */}
            <div className="flex justify-center pb-4">
              <button
                type="submit"
                disabled={submitting || !form.emailVerified}
                className="inline-flex items-center gap-2.5 px-10 py-4 rounded-2xl bg-amber-400 hover:bg-amber-500 disabled:opacity-60 disabled:cursor-not-allowed text-[#1f1f1f] font-bold text-base shadow-lg hover:shadow-xl transition"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Submitting Request...
                  </>
                ) : (
                  <>
                    <Send className="h-5 w-5" />
                    Submit Request
                  </>
                )}
              </button>
            </div>

            {/* Information banner */}
            <div className="rounded-2xl border border-amber-200 dark:border-amber-900/30 bg-amber-50 dark:bg-amber-900/10 p-5">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="text-sm text-amber-900 dark:text-amber-200">
                  <p className="font-bold mb-1">Important Information</p>
                  <ul className="space-y-1 text-xs list-disc list-inside text-amber-800 dark:text-amber-300">
                    <li>Your request will be reviewed by the General Administrator Department</li>
                    <li>You will receive approval status via email within 2-3 business days</li>
                    <li>
                      Upon approval, you will receive an upload link to submit visitor details
                    </li>
                    <li>The upload link will remain active until the approved validity period</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* Success Modal */}
        {showSuccessModal && (
          <SuccessModal
            result={submissionResult}
            onClose={() => setShowSuccessModal(false)}
            onSubmitAnother={() => {
              setShowSuccessModal(false);
              // Reset form
              setForm({
                applicantEmail: "",
                otp: "",
                emailVerified: false,
                captchaAnswer: "",
                companyName: "",
                visitorType: "",
                applicantMobile: "",
                noOfPersons: "0",
                noOfVehicles: "0",
                validityUpto: "",
                paymentMode: "",
                workOrderRequired: false,
                refDocNo: "",
                purpose: "",
                remarks: "",
              });
              setErrors({});
              setTouched({});
              setOtpSent(false);
              setOtpTimer(0);
              setCaptchaVerified(false);
              fetchCaptcha();
            }}
          />
        )}
      </div>
    </div>
  );
}

// ── Section heading component ─────────────────────────────────────────────────

function SectionHeading({ icon, title }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex items-center justify-center h-8 w-8 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
        {icon}
      </span>
      <h3 className="text-base font-bold text-stone-800 dark:text-stone-200">{title}</h3>
    </div>
  );
}

// ── Success Modal component ───────────────────────────────────────────────────

function SuccessModal({ result, onClose, onSubmitAnother }) {
  if (!result) return null;

  const formatDate = (isoString) => {
    return new Date(isoString).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white dark:bg-[#1f232d] rounded-3xl shadow-2xl border border-stone-200 dark:border-white/10 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-6 text-white text-center">
          <div className="inline-flex items-center justify-center h-16 w-16 bg-white/20 rounded-full mb-4">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Request Submitted Successfully!</h2>
          <p className="text-emerald-100 text-sm">
            Your bulk pass request has been received and is now under review.
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Tracking Information */}
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/30 rounded-2xl p-4">
            <h3 className="text-sm font-bold text-amber-800 dark:text-amber-200 mb-3 uppercase tracking-wider">
              Tracking Information
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-stone-600 dark:text-stone-400">Tracking Number:</span>
                <span className="font-mono font-bold text-amber-600 dark:text-amber-400 text-lg">
                  {result.trackingNumber}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-stone-600 dark:text-stone-400">Submitted:</span>
                <span className="text-sm font-semibold text-stone-800 dark:text-stone-200">
                  {formatDate(result.timestamp)}
                </span>
              </div>
            </div>
          </div>

          {/* Next Steps */}
          <div>
            <h3 className="text-sm font-bold text-stone-700 dark:text-stone-300 mb-3 uppercase tracking-wider">
              What Happens Next?
            </h3>
            <div className="space-y-3 text-sm text-stone-600 dark:text-stone-400">
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center h-6 w-6 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-xs font-bold shrink-0 mt-0.5">
                  1
                </div>
                <p>
                  <span className="font-semibold text-stone-800 dark:text-stone-200">Review Process:</span> Your request will be reviewed by the General Administrator Department within 2-3 business days.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center h-6 w-6 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-xs font-bold shrink-0 mt-0.5">
                  2
                </div>
                <p>
                  <span className="font-semibold text-stone-800 dark:text-stone-200">Email Notification:</span> You will receive an email with the approval status and further instructions.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center h-6 w-6 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-xs font-bold shrink-0 mt-0.5">
                  3
                </div>
                <p>
                  <span className="font-semibold text-stone-800 dark:text-stone-200">Upload Link:</span> If approved, you'll receive a link to upload visitor details and documents.
                </p>
              </div>
            </div>
          </div>

          {/* Important Note */}
          <div className="bg-stone-50 dark:bg-white/5 border border-stone-200 dark:border-white/10 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-stone-800 dark:text-stone-200 mb-1">
                  Keep Your Tracking Number Safe
                </p>
                <p className="text-stone-600 dark:text-stone-400">
                  Use this tracking number for any inquiries about your request. 
                  We recommend saving this information or taking a screenshot.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-stone-50 dark:bg-white/5 border-t border-stone-200 dark:border-white/10 p-6 flex flex-col sm:flex-row gap-3">
          <button
            onClick={onSubmitAnother}
            className="flex-1 px-6 py-3 rounded-2xl bg-amber-400 hover:bg-amber-500 text-[#1f1f1f] font-bold text-sm transition"
          >
            Submit Another Request
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 rounded-2xl bg-stone-200 hover:bg-stone-300 dark:bg-white/10 dark:hover:bg-white/20 text-stone-700 dark:text-stone-300 font-bold text-sm transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
