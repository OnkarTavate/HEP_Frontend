"use client";

import { useEffect, useState } from "react";
import { X, Loader2, Landmark, ShieldCheck, Info, CheckCircle2, ArrowRight, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { BANK_ACCOUNTS, REFUND_REASONS, REFUND_LIMITS, CUSTOMER, requestRefund, formatINR, maskMobile, maskEmail } from "@/lib/walletMock";
import { RefundTracker } from "@/components/wallet/WalletUI";
import OtpVerification from "@/components/wallet/OtpVerification";

const OTP_CHANNELS = [
  { key: "sms", label: "SMS to registered mobile", destination: maskMobile(CUSTOMER.mobile) },
  { key: "email", label: "Email to registered address", destination: maskEmail(CUSTOMER.email) },
];

const parseAmount = (str) => Number(String(str).replace(/[^\d]/g, "")) || 0;
const groupDigits = (n) => (n ? n.toLocaleString("en-IN") : "");

/**
 * Applicant refund request: amount → reason → registered bank account → OTP → submit.
 * Workflow after submit: Traffic department approval → EBS pays to bank.
 */
export default function RefundRequestModal({ balance, pendingPassesTotal, onClose }) {
  const [amountText, setAmountText] = useState("");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [bankId, setBankId] = useState(BANK_ACCOUNTS.find((b) => b.primary)?.id);
  const [agree, setAgree] = useState(false);
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState(null);
  const [step, setStep] = useState("form"); // form | otp

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && !submitting && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [submitting, onClose]);

  const amount = parseAmount(amountText);
  const maxRefundable = Math.floor(balance);
  const errors = {
    amount:
      amount === 0
        ? "Enter the amount to refund"
        : amount < REFUND_LIMITS.min
          ? `Minimum refund is ${formatINR(REFUND_LIMITS.min)}`
          : amount > balance
            ? `You can refund up to ${formatINR(balance)}`
            : null,
    reason: !reason ? "Choose a reason" : reason === "Other" && note.trim().length < 5 ? "Tell us a little more" : null,
    agree: !agree ? "Please confirm to continue" : null,
  };
  const valid = !errors.amount && !errors.reason && !errors.agree;
  const leavesShort = !errors.amount && pendingPassesTotal > 0 && balance - amount < pendingPassesTotal;

  const toOtp = () => {
    setTouched(true);
    if (valid) setStep("otp");
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      const r = await requestRefund({ amount, reason, note: note.trim(), bankId });
      setCreated(r);
      toast.success(`Refund request ${r.id} submitted`, { description: "Sent to the Traffic department for approval." });
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4 animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="refund-title"
    >
      <div className="flex w-full sm:max-w-xl max-h-[94vh] flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl bg-white dark:bg-[#1f232d] shadow-2xl animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
        <div className="flex items-center justify-between bg-[#1a1d27] px-6 py-4 text-white">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-stone-400">Wallet</p>
            <h3 id="refund-title" className="text-lg font-extrabold">Request a refund</h3>
          </div>
          {!submitting && (
            <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {created ? (
          <div className="overflow-y-auto px-6 py-8">
            <div className="flex flex-col items-center text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/15">
                <CheckCircle2 className="h-9 w-9 text-emerald-600" />
              </span>
              <p className="mt-4 text-xl font-extrabold text-[#1f1f1f] dark:text-white">Refund request submitted</p>
              <p className="mt-1 max-w-sm text-sm text-stone-500">
                <span className="font-bold tabular-nums">{formatINR(created.amount)}</span>{" "}is on hold in your wallet. We&apos;ll notify you at each step.
              </p>
              <p className="mt-2 font-mono text-xs text-stone-500">Request ID: {created.id}</p>
            </div>
            <div className="mt-6 rounded-2xl bg-stone-50 dark:bg-white/5 p-4">
              <RefundTracker refund={created} showHistory={false} />
            </div>
            <button onClick={onClose} className="mt-6 w-full rounded-2xl bg-[#1f1f1f] dark:bg-amber-400 py-3 text-sm font-bold text-white dark:text-black">
              Done
            </button>
          </div>
        ) : step === "otp" ? (
          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-6">
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-stone-50 dark:bg-white/5 px-4 py-3 text-sm">
              <span className="text-stone-500">Refund</span>
              <span className="text-right">
                <span className="block font-extrabold tabular-nums text-[#1f1f1f] dark:text-white">{formatINR(amount)}</span>
                <span className="block text-xs text-stone-500">
                  to {BANK_ACCOUNTS.find((b) => b.id === bankId)?.bankName} {BANK_ACCOUNTS.find((b) => b.id === bankId)?.accountMasked.slice(-4)}
                </span>
              </span>
            </div>
            <OtpVerification
              channels={OTP_CHANNELS}
              purpose="this refund request"
              busy={submitting}
              onBack={() => setStep("form")}
              onVerified={submit}
            />
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
              {/* How it works */}
              <div className="flex gap-3 rounded-2xl bg-sky-50 dark:bg-sky-500/10 p-4 text-sm text-sky-900 dark:text-sky-200">
                <Info className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  Your request goes to the <strong>Traffic department</strong> for approval, then to <strong>EBS</strong> (finance), which pays it to your registered bank account. Usually 3–5 working days. The amount is held in your wallet until then.
                </p>
              </div>

              {/* Amount */}
              <div>
                <div className="mb-2 flex items-end justify-between">
                  <label htmlFor="refund-amount" className="text-sm font-bold text-stone-600 dark:text-stone-300">Refund amount</label>
                  <span className="text-xs text-stone-500">Available: <span className="font-bold tabular-nums">{formatINR(balance)}</span></span>
                </div>
                <div
                  className={cn(
                    "flex items-stretch overflow-hidden rounded-2xl ring-1 focus-within:ring-2",
                    touched && errors.amount ? "ring-red-400 focus-within:ring-red-500" : "ring-stone-200 dark:ring-white/10 focus-within:ring-amber-400",
                  )}
                >
                  <span className="flex items-center bg-stone-100 dark:bg-white/5 px-4 text-lg font-bold text-stone-500">₹</span>
                  <input
                    id="refund-amount"
                    inputMode="numeric"
                    autoFocus
                    value={amountText}
                    onChange={(e) => setAmountText(groupDigits(parseAmount(e.target.value)))}
                    placeholder="0"
                    aria-invalid={Boolean(touched && errors.amount)}
                    className="w-full bg-white dark:bg-transparent px-4 py-3.5 text-xl font-extrabold tabular-nums text-[#1f1f1f] dark:text-white outline-none placeholder:text-stone-300"
                  />
                  <button
                    type="button"
                    onClick={() => setAmountText(groupDigits(maxRefundable))}
                    className="m-1.5 shrink-0 rounded-xl bg-stone-100 dark:bg-white/10 px-3 text-xs font-bold text-stone-700 dark:text-stone-200 hover:bg-stone-200 hover:text-stone-900 dark:hover:bg-white/20 dark:hover:text-white"
                  >
                    Full balance
                  </button>
                </div>
                {touched && errors.amount && <p className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">{errors.amount}</p>}
                {leavesShort && (
                  <p className="mt-2 flex items-start gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
                    <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" />
                    You have approved passes worth {formatINR(pendingPassesTotal)} awaiting payment. After this refund your wallet won&apos;t cover them.
                  </p>
                )}
              </div>

              {/* Reason */}
              <div>
                <label htmlFor="refund-reason" className="mb-2 block text-sm font-bold text-stone-600 dark:text-stone-300">Reason</label>
                <select
                  id="refund-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  aria-invalid={Boolean(touched && errors.reason)}
                  className={cn(
                    "w-full rounded-2xl bg-white dark:bg-[#1a1d27] px-4 py-3 text-sm font-semibold outline-none ring-1 focus:ring-2 dark:text-white",
                    touched && errors.reason ? "ring-red-400" : "ring-stone-200 dark:ring-white/10 focus:ring-amber-400",
                  )}
                >
                  <option value="">Select a reason…</option>
                  {REFUND_REASONS.map((r) => <option key={r}>{r}</option>)}
                </select>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  maxLength={300}
                  placeholder={reason === "Other" ? "Please describe the reason (required)" : "Add details for the approver (optional)"}
                  className="mt-2 w-full rounded-2xl bg-white dark:bg-[#1a1d27] px-4 py-3 text-sm outline-none ring-1 ring-stone-200 dark:ring-white/10 focus:ring-2 focus:ring-amber-400 dark:text-white"
                />
                {touched && errors.reason && <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">{errors.reason}</p>}
              </div>

              {/* Bank */}
              <div>
                <p className="mb-2 text-sm font-bold text-stone-600 dark:text-stone-300">Refund to</p>
                <div className="space-y-2.5" role="radiogroup" aria-label="Bank account">
                  {BANK_ACCOUNTS.map((b) => {
                    const active = bankId === b.id;
                    return (
                      <button
                        key={b.id}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => setBankId(b.id)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-2xl p-3.5 text-left ring-1 transition-all",
                          active ? "ring-2 ring-orange-500 bg-orange-50/60 dark:bg-orange-500/10" : "ring-stone-200 dark:ring-white/10 hover:ring-stone-300",
                        )}
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-stone-100 dark:bg-white/5">
                          <Landmark className="h-5 w-5 text-stone-700 dark:text-stone-200" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2 text-sm font-bold text-[#1f1f1f] dark:text-white">
                            {b.bankName} · <span className="font-mono">{b.accountMasked}</span>
                            {b.primary && <span className="rounded-full bg-stone-100 dark:bg-white/10 px-1.5 text-[10px] font-bold uppercase text-stone-500">Primary</span>}
                          </span>
                          <span className="block text-xs text-stone-500">{b.holder} · IFSC {b.ifsc}</span>
                        </span>
                        <span className={cn("h-5 w-5 shrink-0 rounded-full ring-2 flex items-center justify-center", active ? "ring-orange-500" : "ring-stone-300")}>
                          {active && <span className="h-2.5 w-2.5 rounded-full bg-orange-500" />}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 flex items-center gap-1.5 text-xs text-stone-500">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> For your security, refunds go only to bank accounts verified with EBS.
                </p>
              </div>

              <label className="flex items-start gap-2.5 text-sm text-stone-600 dark:text-stone-300 cursor-pointer">
                <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 h-4 w-4 accent-orange-500" />
                <span>
                  I confirm this refund is for unused wallet balance, and understand the amount will be held until the request is approved or rejected.
                  {touched && errors.agree && <span className="block text-xs font-medium text-red-600 dark:text-red-400">{errors.agree}</span>}
                </span>
              </label>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-stone-100 dark:border-white/5 px-6 py-4">
              <button onClick={onClose} disabled={submitting} className="rounded-2xl px-5 py-3 text-sm font-bold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-white/5">
                Cancel
              </button>
              <button
                onClick={toOtp}
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-orange-500/25 hover:bg-orange-600 disabled:opacity-60"
              >
                {amount && !errors.amount ? `Continue · ${formatINR(amount)}` : "Continue"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
