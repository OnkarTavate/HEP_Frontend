"use client";

import { useEffect, useRef, useState } from "react";
import { MessageSquare, Mail, Loader2, ShieldCheck, RotateCw, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const OTP_LENGTH = 6;
const RESEND_SECONDS = 30;
const EXPIRY_SECONDS = 300;
const MAX_ATTEMPTS = 3;

const makeCode = () => String(Math.floor(Math.random() * 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, "0");
const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/**
 * UI-only OTP step (no backend): pick SMS or email, enter the 6-digit code.
 * channels: [{ key: "sms" | "email", label, destination (masked) }]
 * onVerified(channelKey) is awaited; busy disables the form while it runs.
 */
export default function OtpVerification({ channels, purpose, onVerified, onBack, busy = false }) {
  const [channel, setChannel] = useState(channels[0].key);
  const [sent, setSent] = useState(null); // { code, channel, sentAt }
  const [sending, setSending] = useState(false);
  const [digits, setDigits] = useState(Array(OTP_LENGTH).fill(""));
  const [attemptsLeft, setAttemptsLeft] = useState(MAX_ATTEMPTS);
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const inputs = useRef([]);

  useEffect(() => {
    if (!sent) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [sent]);

  const elapsed = sent ? Math.floor((now - sent.sentAt) / 1000) : 0;
  const resendIn = Math.max(0, RESEND_SECONDS - elapsed);
  const expiresIn = Math.max(0, EXPIRY_SECONDS - elapsed);
  const expired = sent && expiresIn === 0;
  const locked = attemptsLeft === 0;
  const code = digits.join("");
  const dest = channels.find((c) => c.key === (sent?.channel || channel));

  const send = async () => {
    setSending(true);
    await new Promise((r) => setTimeout(r, 700)); // simulated SMS / email gateway
    const otp = { code: makeCode(), channel, sentAt: Date.now() };
    setSent(otp);
    setNow(otp.sentAt);
    setDigits(Array(OTP_LENGTH).fill(""));
    setAttemptsLeft(MAX_ATTEMPTS);
    setError("");
    setSending(false);
    toast.success(`OTP sent by ${channel === "sms" ? "SMS" : "email"}`, { description: dest?.destination });
    setTimeout(() => inputs.current[0]?.focus(), 50);
  };

  const setAt = (i, v) => {
    setDigits((d) => {
      const next = [...d];
      next[i] = v;
      return next;
    });
    setError("");
  };

  const onChange = (i, e) => {
    const v = e.target.value.replace(/\D/g, "");
    if (!v) return setAt(i, "");
    if (v.length > 1) return fillFrom(i, v); // typed fast or autofill
    setAt(i, v);
    if (i < OTP_LENGTH - 1) inputs.current[i + 1]?.focus();
  };

  const fillFrom = (start, str) => {
    const chars = str.replace(/\D/g, "").slice(0, OTP_LENGTH - start).split("");
    setDigits((d) => {
      const next = [...d];
      chars.forEach((c, k) => (next[start + k] = c));
      return next;
    });
    setError("");
    inputs.current[Math.min(start + chars.length, OTP_LENGTH - 1)]?.focus();
  };

  const onKeyDown = (i, e) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) inputs.current[i - 1]?.focus();
    if (e.key === "ArrowLeft" && i > 0) inputs.current[i - 1]?.focus();
    if (e.key === "ArrowRight" && i < OTP_LENGTH - 1) inputs.current[i + 1]?.focus();
    if (e.key === "Enter") verify();
  };

  const verify = async () => {
    if (busy || !sent || locked) return;
    if (expired) return setError("This OTP has expired. Please request a new one.");
    if (code.length < OTP_LENGTH) return setError(`Enter all ${OTP_LENGTH} digits`);
    if (code !== sent.code) {
      const left = attemptsLeft - 1;
      setAttemptsLeft(left);
      setDigits(Array(OTP_LENGTH).fill(""));
      inputs.current[0]?.focus();
      return setError(left ? `Incorrect OTP. ${left} attempt${left > 1 ? "s" : ""} left.` : "Too many incorrect attempts. Request a new OTP.");
    }
    await onVerified(sent.channel);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-500/10">
          <ShieldCheck className="h-6 w-6 text-emerald-600" />
        </span>
        <div>
          <p className="font-extrabold text-[#1f1f1f] dark:text-white">Verify it&apos;s you</p>
          <p className="text-sm text-stone-500 dark:text-stone-400">We&apos;ll send a one-time password to confirm {purpose}.</p>
        </div>
      </div>

      {!sent ? (
        <>
          <div className="grid gap-2.5 sm:grid-cols-2" role="radiogroup" aria-label="Send OTP via">
            {channels.map((c) => {
              const Icon = c.key === "sms" ? MessageSquare : Mail;
              const active = channel === c.key;
              return (
                <button
                  key={c.key}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setChannel(c.key)}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl p-3.5 text-left ring-1 transition-all",
                    active ? "ring-2 ring-orange-500 bg-orange-50/60 dark:bg-orange-500/10" : "ring-stone-200 dark:ring-white/10 hover:ring-stone-300",
                  )}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-stone-100 dark:bg-white/5">
                    <Icon className="h-5 w-5 text-stone-700 dark:text-stone-200" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-[#1f1f1f] dark:text-white">{c.label}</span>
                    <span className="block truncate font-mono text-xs text-stone-500">{c.destination}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <div className="flex items-center justify-between gap-3">
            <button onClick={onBack} className="inline-flex items-center gap-1.5 rounded-2xl px-4 py-3 text-sm font-bold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-white/5">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <button
              onClick={send}
              disabled={sending}
              className="inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-6 py-3 text-sm font-bold text-white hover:bg-orange-600 disabled:opacity-60"
            >
              {sending && <Loader2 className="h-4 w-4 animate-spin" />}
              {sending ? "Sending…" : "Send OTP"}
            </button>
          </div>
        </>
      ) : (
        <>
          <div>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm text-stone-600 dark:text-stone-300">
                Enter the code sent to <span className="font-mono font-bold">{dest.destination}</span>
              </p>
              <button
                onClick={() => {
                  setSent(null);
                  setError("");
                }}
                className="text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline"
              >
                Change
              </button>
            </div>

            <div className="mt-3 flex justify-between gap-2" onPaste={(e) => { e.preventDefault(); fillFrom(0, e.clipboardData.getData("text")); }}>
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => (inputs.current[i] = el)}
                  value={d}
                  onChange={(e) => onChange(i, e)}
                  onKeyDown={(e) => onKeyDown(i, e)}
                  onFocus={(e) => e.target.select()}
                  inputMode="numeric"
                  autoComplete={i === 0 ? "one-time-code" : "off"}
                  maxLength={OTP_LENGTH}
                  disabled={locked || expired || busy}
                  aria-label={`Digit ${i + 1}`}
                  className={cn(
                    "h-14 w-full min-w-0 rounded-xl bg-white dark:bg-[#1a1d27] text-center text-2xl font-extrabold tabular-nums text-[#1f1f1f] dark:text-white outline-none ring-1 transition-shadow focus:ring-2 disabled:opacity-50",
                    error ? "ring-red-400 focus:ring-red-500" : d ? "ring-amber-400" : "ring-stone-200 dark:ring-white/10 focus:ring-amber-400",
                  )}
                />
              ))}
            </div>

            <div className="mt-2 min-h-5 text-xs" aria-live="polite">
              {error ? (
                <span className="font-medium text-red-600 dark:text-red-400">{error}</span>
              ) : (
                <span className="text-stone-500">{expired ? "OTP expired." : `Code expires in ${mmss(expiresIn)}`}</span>
              )}
            </div>

            <div className="mt-2 flex items-center justify-between text-sm">
              <button
                onClick={send}
                disabled={resendIn > 0 || sending}
                className="inline-flex items-center gap-1.5 font-bold text-orange-600 dark:text-orange-400 hover:underline disabled:cursor-not-allowed disabled:text-stone-400 disabled:no-underline"
              >
                <RotateCw className={cn("h-3.5 w-3.5", sending && "animate-spin")} />
                {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend OTP"}
              </button>
              {channels.length > 1 && resendIn === 0 && (
                <button
                  onClick={() => {
                    setChannel(sent.channel === "sms" ? "email" : "sms");
                    setSent(null);
                  }}
                  className="text-xs font-bold text-stone-500 hover:text-stone-800 dark:hover:text-white"
                >
                  Try {sent.channel === "sms" ? "email" : "SMS"} instead
                </button>
              )}
            </div>

            <p className="mt-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
              Demo only. No real {sent.channel === "sms" ? "SMS" : "email"} is sent. Your OTP is <span className="font-mono font-bold tracking-widest">{sent.code}</span>
            </p>
          </div>

          <div className="flex items-center justify-between gap-3">
            <button onClick={onBack} disabled={busy} className="inline-flex items-center gap-1.5 rounded-2xl px-4 py-3 text-sm font-bold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-white/5">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <button
              onClick={verify}
              disabled={busy || locked || expired || code.length < OTP_LENGTH}
              className="inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-orange-500/25 hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {busy ? "Submitting…" : "Verify & submit"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
