"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { QRCodeSVG } from "qrcode.react";
import {
  X,
  Copy,
  CheckCheck,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Smartphone,
  CreditCard,
  Landmark,
  Lock,
  Download,
  LifeBuoy,
  Truck,
  User,
  ArrowDownLeft,
  ArrowUpRight,
  Undo2,
  Ban,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  GATEWAY_METHODS,
  simulateTopUp,
  priceBreakup,
  formatINR,
  formatDateTime,
  formatDate,
  daysUntil,
  REFUND_STEPS,
  REFUND_STATUS,
} from "@/lib/walletMock";
import { downloadTaxInvoice } from "@/lib/walletDocs";

export const CARD = "rounded-3xl bg-white dark:bg-[#1f232d] ring-1 ring-stone-200/70 dark:ring-white/5 shadow-sm";

export const validityLabel = (p) =>
  p.validFrom === p.validTo ? formatDate(p.validFrom) : `${formatDate(p.validFrom)} – ${formatDate(p.validTo)}`;

/** "Starts tomorrow"-style chip for passes whose validity begins soon. */
export function urgency(p) {
  const d = daysUntil(p.validFrom);
  if (d <= 0) return { label: "Starts today", cls: "bg-red-50 text-red-700 ring-red-200 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/20" };
  if (d === 1) return { label: "Starts tomorrow", cls: "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20" };
  if (d <= 3) return { label: `Starts in ${d} days`, cls: "bg-stone-100 text-stone-700 ring-stone-200 dark:bg-white/5 dark:text-stone-300 dark:ring-white/10" };
  return null;
}

const METHOD_META = {
  UPI: { icon: Smartphone, hint: "GPay, PhonePe, Paytm, BHIM" },
  "Debit / Credit Card": { icon: CreditCard, hint: "Visa, Mastercard, RuPay" },
  "Net Banking": { icon: Landmark, hint: "All major Indian banks" },
};

// ── Small pieces ───────────────────────────────────────────────────────────

const STATUS_STYLE = {
  SUCCESS: { label: "Success", pill: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400", dot: "bg-emerald-500" },
  FAILED: { label: "Failed", pill: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400", dot: "bg-red-500" },
  PENDING: { label: "Pending", pill: "bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300", dot: "bg-amber-500 animate-pulse" },
  REVERSED: { label: "Released", pill: "bg-stone-100 text-stone-600 dark:bg-white/5 dark:text-stone-300", dot: "bg-stone-400" },
};

export function StatusPill({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.PENDING;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold whitespace-nowrap", s.pill)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
      {s.label}
    </span>
  );
}

export function CopyRef({ value, className }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard?.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      title="Copy reference"
      className={cn("group inline-flex items-center gap-1.5 font-mono text-xs text-stone-600 dark:text-stone-300 hover:text-orange-600", className)}
    >
      {value}
      {copied ? <CheckCheck className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5 opacity-40 group-hover:opacity-100" />}
    </button>
  );
}

/** What the user actually paid for a row (pass payments via gateway don't move the wallet). */
export const displayAmount = (a) => (a.type === "PASS_PAYMENT" ? -(a.totalPaid ?? -a.amount) : a.amount);

export function ActivityIcon({ item }) {
  const credit = item.amount > 0;
  const Icon = credit ? ArrowDownLeft : ArrowUpRight;
  return (
    <span
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
        item.status === "FAILED"
          ? "bg-stone-100 text-stone-400 dark:bg-white/5"
          : item.status === "PENDING"
            ? "bg-amber-50 text-amber-600 dark:bg-amber-500/10"
            : item.status === "REVERSED"
              ? "bg-stone-100 text-stone-400 dark:bg-white/5"
              : credit
              ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
              : "bg-red-50 text-red-500 dark:bg-red-500/10 dark:text-red-400",
      )}
    >
      <Icon className="h-4 w-4" strokeWidth={2.5} />
    </span>
  );
}

export function AmountText({ item, className }) {
  const value = displayAmount(item);
  return (
    <span
      className={cn(
        "font-extrabold tabular-nums whitespace-nowrap",
        item.status === "FAILED" || item.status === "REVERSED"
          ? "text-stone-400 line-through"
          : item.status === "PENDING"
            ? "text-amber-700 dark:text-amber-300"
            : value > 0
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-red-600 dark:text-red-400",
        className,
      )}
    >
      {formatINR(value, { sign: true })}
    </span>
  );
}

// ── Gateway method picker ──────────────────────────────────────────────────

export function GatewayMethodPicker({ value, onChange, compact = false }) {
  return (
    <div className={cn("grid gap-2.5", compact && "sm:grid-cols-3")} role="radiogroup" aria-label="Gateway payment option">
      {GATEWAY_METHODS.map((key) => {
        const m = METHOD_META[key];
        const active = value === key;
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(key)}
            className={cn(
              "flex w-full items-center gap-3 rounded-2xl text-left ring-1 transition-all",
              compact ? "p-3" : "p-3.5",
              active ? "ring-2 ring-orange-500 bg-orange-50/60 dark:bg-orange-500/10" : "ring-stone-200 dark:ring-white/10 hover:ring-stone-300",
            )}
          >
            <span className={cn("flex shrink-0 items-center justify-center rounded-xl bg-stone-100 dark:bg-white/5", compact ? "h-8 w-8" : "h-10 w-10")}>
              <m.icon className={cn("text-stone-700 dark:text-stone-200", compact ? "h-4 w-4" : "h-5 w-5")} />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-bold text-[#1f1f1f] dark:text-white">{key}</span>
              {!compact && <span className="block text-xs text-stone-500">{m.hint}</span>}
            </span>
            {!compact && (
              <span className={cn("h-5 w-5 shrink-0 rounded-full ring-2 flex items-center justify-center", active ? "ring-orange-500" : "ring-stone-300")}>
                {active && <span className="h-2.5 w-2.5 rounded-full bg-orange-500" />}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── Top-up gateway modal ───────────────────────────────────────────────────

function useEscape(enabled, onClose) {
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled, onClose]);
}

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function TopUpGatewayModal({ amount, defaultMethod, onClose, onDone }) {
  const [method, setMethod] = useState(defaultMethod || "UPI");
  const [phase, setPhase] = useState("choose"); // choose | processing | result
  const [result, setResult] = useState(null);
  const [statusText, setStatusText] = useState("Waiting for gateway confirmation…");
  const isTestMode =
    (process.env.NEXT_PUBLIC_RAZORPAY_MODE || "test").toLowerCase() === "test";
  useEscape(phase !== "processing", onClose);

  const pay = async () => {
    console.log("[WalletUI] PAY CLICKED! Amount:", amount);
    setPhase("processing");
    setStatusText("Initiating order with APACS Wallet Service...");

    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        toast.error("Please log in to initiate top-up");
        setPhase("choose");
        return;
      }

      const WALLET_API = process.env.NEXT_PUBLIC_WALLET_API || "http://localhost:5010/api";
      const topupKey = `TOPUP-FRONTEND-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

      const initRes = await axios.post(
        `${WALLET_API}/wallet/topups`,
        { amount: Number(amount), currency: "INR" },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "x-idempotency-key": topupKey,
          },
        }
      );

      const orderData = initRes.data?.data;
      if (!orderData || !orderData.razorpayOrderId) {
        throw new Error("Invalid topup order response from wallet service");
      }

      setStatusText("Launching Razorpay Checkout...");
      const loaded = await loadRazorpayScript();
      if (!loaded || !window.Razorpay) {
        throw new Error("Failed to load Razorpay Checkout SDK");
      }

      let prefillName = "UAT Agent";
      let prefillEmail = "uat.agent@apacs.internal";
      let prefillContact = "9900009001";
      try {
        const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
        if (storedUser.username) prefillName = storedUser.username;
        if (storedUser.email) prefillEmail = storedUser.email;
        if (storedUser.contact || storedUser.mobile) prefillContact = storedUser.contact || storedUser.mobile;
      } catch (_) {}

      const options = {
        key: orderData.razorpayKeyId,
        amount: orderData.amount, // in paise
        currency: orderData.currency || "INR",
        name: "APACS",
        description: `Wallet Top-up (${orderData.referenceNo})`,
        order_id: orderData.razorpayOrderId,
        prefill: {
          name: prefillName,
          email: prefillEmail,
          contact: prefillContact,
          method: method === "UPI" ? "upi" : method === "Debit / Credit Card" ? "card" : "netbanking",
        },
        theme: { color: "#ea580c" },
        modal: {
          ondismiss: () => {
            setPhase("choose");
            toast.message("Checkout cancelled", {
              description: "Payment window was closed by the user. No funds were debited.",
            });
          },
        },
        handler: async (resp) => {
          setPhase("processing");
          setStatusText("Payment authorized. Verifying cryptographic signature and crediting wallet...");

          const verifyKey = `VERIFY-${resp.razorpay_order_id}-${resp.razorpay_payment_id}`;

          try {
            const verifyRes = await axios.post(
              `${WALLET_API}/wallet/topups/verify`,
              {
                razorpay_order_id: resp.razorpay_order_id,
                razorpay_payment_id: resp.razorpay_payment_id,
                razorpay_signature: resp.razorpay_signature,
              },
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                  "x-idempotency-key": verifyKey,
                },
              }
            );

            const vData = verifyRes.data?.data;
            const entry = {
              id: vData?.referenceNo || orderData.referenceNo,
              status: "SUCCESS",
              method: method,
              amount: Number(amount),
              at: new Date().toISOString(),
              invoiceNo: `INV-${orderData.referenceNo}`,
              paymentId: resp.razorpay_payment_id,
              orderId: resp.razorpay_order_id,
              newBalance: vData?.newBalanceMinor,
            };
            setResult(entry);
            setPhase("result");
            if (onDone) onDone(entry);
            toast.success(`${formatINR(amount)} added to your wallet!`, {
              description: `APACS Ref: ${entry.id} · Payment ID: ${resp.razorpay_payment_id}`,
            });
          } catch (vErr) {
            console.error("Payment verification failed:", vErr);
            const errMsg = vErr.response?.data?.error?.message || vErr.response?.data?.message || vErr.message;
            toast.error("Payment verification failed", { description: errMsg });
            setResult({
              id: orderData.referenceNo,
              status: "FAILED",
              method: method,
              amount: Number(amount),
              at: new Date().toISOString(),
              error: errMsg,
              retryCallback: async () => {
                await options.handler(resp);
              },
            });
            setPhase("result");
          }
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (fResp) => {
        console.error("Payment failed at gateway:", fResp);
        const fDesc =
          fResp.error?.reason === "international_transaction_not_allowed"
            ? (isTestMode
                ? "International cards are not supported on this domestic account. Use a domestic test card (RuPay: 6527 6589 0000 1005, Visa: 4100 2800 0000 1007, or Mastercard: 5555 5100 0008 1006)."
                : "International cards are not supported on this domestic account. Please use an Indian domestic payment method.")
            : fResp.error?.description || "Payment failed or was declined at gateway";
        toast.error("Payment Failed", { description: fDesc });
        setResult({
          id: orderData.referenceNo,
          status: "FAILED",
          method: method,
          amount: Number(amount),
          at: new Date().toISOString(),
          error: fDesc,
        });
        setPhase("result");
      });

      rzp.open();
    } catch (err) {
      console.error("Payment initiate error:", err);
      const errMsg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        err.message ||
        "Failed to initiate top-up";
      toast.error("Top-up initiation error", { description: errMsg });
      // Important UI fix: If APACS top-up initiation returns an error,
      // do not launch or retain the Razorpay Checkout payment modal.
      if (onClose) {
        onClose();
      } else {
        setPhase("choose");
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4 animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gateway-title"
    >
      <div className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white dark:bg-[#1f232d] shadow-2xl animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
        <div className="sticky top-0 z-10 flex items-center justify-between bg-[#1a1d27] px-6 py-4 text-white">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-stone-400">Payment Gateway · Wallet top-up</p>
            <h3 id="gateway-title" className="text-lg font-extrabold tabular-nums">{formatINR(amount)}</h3>
          </div>
          {phase !== "processing" && (
            <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {phase === "choose" && (
          <div className="p-6">
            <p className="text-sm font-bold text-stone-600 dark:text-stone-300 mb-3">Choose how to pay</p>
            <GatewayMethodPicker value={method} onChange={setMethod} />

            {method === "UPI" && (
              <div className="mt-4 hidden sm:flex items-center gap-4 rounded-2xl bg-stone-50 dark:bg-white/5 p-4">
                <div className="rounded-xl bg-white p-2 ring-1 ring-stone-200">
                  <QRCodeSVG value={`upi://pay?pa=apacs.chennaiport@demo&pn=APACS%20Wallet&am=${amount}&cu=INR`} size={96} />
                </div>
                <div className="text-sm">
                  <p className="font-bold text-[#1f1f1f] dark:text-white">Scan with any UPI app</p>
                  <p className="text-stone-500">Open GPay, PhonePe or Paytm on your phone and scan this code, or tap Pay below to continue on this device.</p>
                  {isTestMode && (
                    <div className="mt-2 text-xs font-mono text-stone-600 dark:text-stone-400">
                      <p>UPI Success: <span className="font-bold text-emerald-600 dark:text-emerald-400">success@razorpay</span></p>
                      <p>UPI Failure: <span className="font-bold text-red-600 dark:text-red-400">failure@razorpay</span></p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {isTestMode && method === "Debit / Credit Card" && (
              <div className="mt-4 rounded-2xl bg-stone-50 dark:bg-white/5 p-4 text-xs space-y-2 border border-stone-200 dark:border-white/10">
                <p className="font-bold text-[#1f1f1f] dark:text-white">Domestic Test Cards (Test Mode):</p>
                <div className="space-y-1 font-mono text-stone-700 dark:text-stone-300">
                  <p><span className="font-sans font-semibold text-stone-500">Visa:</span> <span className="font-bold text-orange-600 dark:text-orange-400">4100 2800 0000 1007</span></p>
                  <p><span className="font-sans font-semibold text-stone-500">Mastercard:</span> <span className="font-bold text-orange-600 dark:text-orange-400">5555 5100 0008 1006</span></p>
                  <p><span className="font-sans font-semibold text-stone-500">RuPay:</span> <span className="font-bold text-orange-600 dark:text-orange-400">6527 6589 0000 1005</span></p>
                  <p className="font-sans text-[11px] text-stone-500 mt-1">Use any random CVV and future expiry.</p>
                </div>
              </div>
            )}

            {method === "Net Banking" && (
              <div className="mt-4 rounded-2xl bg-stone-50 dark:bg-white/5 p-4 text-xs space-y-1 border border-stone-200 dark:border-white/10 text-stone-600 dark:text-stone-300">
                <p className="font-bold text-[#1f1f1f] dark:text-white">Netbanking:</p>
                <p>Select any available bank in the Razorpay Checkout list to proceed.</p>
              </div>
            )}

            {isTestMode ? (
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-orange-50 dark:bg-orange-500/10 px-3.5 py-2 text-xs font-semibold text-orange-700 dark:text-orange-300 ring-1 ring-orange-200 dark:ring-orange-500/20">
                <Lock className="h-3.5 w-3.5 shrink-0" />
                <span>Razorpay Test Mode – Simulated payments only.</span>
              </div>
            ) : (
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-stone-50 dark:bg-white/5 px-3.5 py-2 text-xs font-semibold text-stone-700 dark:text-stone-300 ring-1 ring-stone-200 dark:ring-white/10">
                <Lock className="h-3.5 w-3.5 shrink-0" />
                <span>Secure 256-bit encrypted payment via Razorpay.</span>
              </div>
            )}

            <button
              onClick={pay}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 py-3.5 font-bold text-white hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/20"
            >
              <Lock className="h-4 w-4" /> Pay {formatINR(amount)} via Razorpay
            </button>
          </div>
        )}

        {phase === "processing" && (
          <div className="flex flex-col items-center px-6 py-12 text-center" aria-live="polite">
            <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
            <p className="mt-4 font-bold text-[#1f1f1f] dark:text-white">{statusText}</p>
            <p className="mt-1 text-sm text-stone-500">Please don&apos;t close this window or press back.</p>
          </div>
        )}

        {phase === "result" && result && (
          <ResultPanel
            entry={result}
            amount={amount}
            onClose={onClose}
            onRetry={() => {
              setResult(null);
              setPhase("choose");
            }}
          />
        )}
      </div>
    </div>
  );
}

function ResultPanel({ entry, amount, onClose, onRetry }) {
  const cfg = {
    SUCCESS: {
      icon: CheckCircle2,
      ring: "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600",
      title: "Top-up successful",
      titleCls: "text-emerald-700 dark:text-emerald-400",
      body: `${formatINR(amount)} credited via ${entry.method}.`,
    },
    PENDING: {
      icon: Clock,
      ring: "bg-amber-100 dark:bg-amber-500/15 text-amber-600",
      title: "Waiting for bank confirmation",
      titleCls: "text-amber-700 dark:text-amber-300",
      body: "Your bank hasn't confirmed yet. We'll credit your wallet automatically as soon as it does. Please don't pay again.",
    },
    FAILED: {
      icon: XCircle,
      ring: "bg-red-100 dark:bg-red-500/15 text-red-600",
      title: "Payment failed",
      titleCls: "text-red-700 dark:text-red-400",
      body: "Your wallet was not credited. If money was debited, your bank will refund it within 5–7 working days.",
    },
  }[entry.status];

  return (
    <div className="flex flex-col items-center px-6 py-10 text-center" aria-live={entry.status === "FAILED" ? "assertive" : "polite"}>
      <span className={cn("flex h-16 w-16 items-center justify-center rounded-full", cfg.ring)}>
        <cfg.icon className="h-9 w-9" />
      </span>
      <p className={cn("mt-4 text-xl font-extrabold", cfg.titleCls)}>{cfg.title}</p>
      <p className="mt-1 max-w-sm text-sm text-stone-500">{cfg.body}</p>
      {entry.error && (
        <p className="mt-2 max-w-sm rounded-lg bg-red-50 dark:bg-red-950/30 p-2 text-xs text-red-600 dark:text-red-400">
          {entry.error}
        </p>
      )}
      <div className="mt-4 w-full rounded-2xl bg-stone-50 dark:bg-white/5 p-3 text-left font-mono text-xs text-stone-600 dark:text-stone-300 space-y-1">
        <p><span className="font-sans font-bold text-stone-400">APACS Ref:</span> {entry.id}</p>
        {entry.orderId && <p><span className="font-sans font-bold text-stone-400">Order ID:</span> {entry.orderId}</p>}
        {entry.paymentId && <p><span className="font-sans font-bold text-stone-400">Payment ID:</span> {entry.paymentId}</p>}
        <p><span className="font-sans font-bold text-stone-400">Amount:</span> {formatINR(amount)}</p>
      </div>
      <div className="mt-6 grid w-full grid-cols-2 gap-3">
        <button onClick={onClose} className="rounded-2xl py-3 text-sm font-bold ring-1 ring-stone-200 dark:ring-white/10 dark:text-white hover:bg-stone-50 dark:hover:bg-white/5">
          {entry.status === "FAILED" ? "Close" : "Done"}
        </button>
        {entry.status === "FAILED" ? (
          <button onClick={onRetry} className="rounded-2xl bg-orange-500 py-3 text-sm font-bold text-white hover:bg-orange-600">
            Try again
          </button>
        ) : (
          <Link href="/dashboard/wallet/pay" className="rounded-2xl bg-orange-500 py-3 text-sm font-bold text-white hover:bg-orange-600">
            Pay for passes
          </Link>
        )}
      </div>
    </div>
  );
}

// ── Transaction detail drawer ──────────────────────────────────────────────

const ISSUE_REASONS = [
  "Money debited but wallet not credited",
  "Charged twice",
  "Wrong amount",
  "Pass not issued after payment",
  "Other",
];

export function TransactionDrawer({ item, refund, onClose, onStatusUpdated }) {
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState(ISSUE_REASONS[0]);
  const [note, setNote] = useState("");
  const [reconciling, setReconciling] = useState(false);
  const [lastChecked, setLastChecked] = useState(null);
  const [reconciledStatus, setReconciledStatus] = useState(null);
  const [reconciledBalance, setReconciledBalance] = useState(null);
  const currentStatus = reconciledStatus || item?.status || "PENDING";
  useEscape(Boolean(item), onClose);

  if (!item) return null;
  const isPass = item.type === "PASS_PAYMENT";
  const walletPart = -item.amount;

  const handleReconcile = async () => {
    setReconciling(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") || localStorage.getItem("token") : null;
      const WALLET_API = process.env.NEXT_PUBLIC_WALLET_API || "http://localhost:5010/api";
      const targetRef = item.referenceNo || item.id;
      const res = await axios.post(
        `${WALLET_API}/wallet/topups/${targetRef}/reconcile`,
        {},
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      const data = res.data?.data;
      setLastChecked(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));

      if (data && data.status === "SUCCESS") {
        setReconciledStatus("SUCCESS");
        if (data.availableBalanceRupees) {
          setReconciledBalance(data.availableBalanceRupees);
        }
        toast.success("Payment Confirmed!", {
          description: `₹${data.amountRupees || "10.00"} credited to your APACS wallet.`,
        });
        if (onStatusUpdated) onStatusUpdated(data);
      } else if (data && data.status === "FAILED") {
        setReconciledStatus("FAILED");
        toast.error("Payment Failed", {
          description: data.message || "Payment was rejected or declined by the bank.",
        });
        if (onStatusUpdated) onStatusUpdated(data);
      } else {
        toast.info("Status: " + (data?.status || "PENDING"), {
          description: data?.message || "No confirmed capture yet on gateway. If debited, please check again in 1–2 minutes.",
        });
      }
    } catch (err) {
      console.error("Reconciliation error:", err);
      toast.error("Recheck Failed", {
        description: err.response?.data?.message || err.message || "Unable to reach verification service.",
      });
    } finally {
      setReconciling(false);
    }
  };

  const submitIssue = () => {
    const ticket = `SR-${Math.floor(100000 + Math.random() * 900000)}`;
    toast.success(`Issue raised · ${ticket}`, { description: `Our finance team will contact you about ${item.id}.` });
    setReporting(false);
    setNote("");
  };

  return (
    <div className="fixed inset-0 z-[60] flex justify-end" role="dialog" aria-modal="true" aria-labelledby="txn-title">
      <button aria-label="Close details" onClick={onClose} className="absolute inset-0 bg-black/40 backdrop-blur-[2px] animate-in fade-in" />
      <aside className="relative flex h-full w-full max-w-md flex-col bg-white dark:bg-[#1f232d] shadow-2xl animate-in slide-in-from-right-10 duration-200">
        <div className="flex items-start justify-between gap-3 border-b border-stone-100 dark:border-white/5 px-6 py-5">
          <div className="flex items-center gap-3">
            <ActivityIcon item={item} />
            <div>
              <p id="txn-title" className="font-extrabold text-[#1f1f1f] dark:text-white">
                {isPass ? "Pass payment" : item.type === "REFUND" ? "Wallet refund" : "Wallet top-up"}
              </p>
              <p className="text-xs text-stone-500">{formatDateTime(item.at)}</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-white/10">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <div className="flex items-end justify-between">
            <AmountText item={item} className="text-3xl" />
            <StatusPill status={currentStatus} />
          </div>

          {refund && <RefundTracker refund={refund} />}

          {currentStatus === "PENDING" && item.type !== "REFUND" && (
            <div className="rounded-2xl bg-amber-50 dark:bg-amber-500/10 p-4 space-y-3 text-sm text-amber-900 dark:text-amber-200">
              <div className="flex items-start gap-2.5">
                <Clock className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                <div>
                  <p className="font-bold">Payment Awaiting Confirmation</p>
                  <p className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-1">
                    Waiting for confirmation from Razorpay and your bank. If money was deducted while your connection was interrupted, click below to verify and credit your wallet.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1 border-t border-amber-200/60 dark:border-amber-400/10">
                <span className="text-[11px] font-semibold text-amber-700/70 dark:text-amber-400/60">
                  {lastChecked ? `Checked at ${lastChecked}` : "Unverified callback"}
                </span>
                <button
                  type="button"
                  onClick={handleReconcile}
                  disabled={reconciling}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-[0.98] px-3.5 py-2 text-xs font-bold text-white shadow-sm transition-all disabled:opacity-50"
                >
                  {reconciling ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Verifying…
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-3.5 w-3.5" /> Check Payment Status
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
          {currentStatus === "FAILED" && (
            <p className="rounded-2xl bg-red-50 dark:bg-red-500/10 p-4 text-sm text-red-800 dark:text-red-300">
              {item.failureReason || "Payment failed"}. Your wallet was not credited. Any amount debited will be refunded by your bank in 5–7 working days.
            </p>
          )}

          <dl className="divide-y divide-stone-100 dark:divide-white/5 text-sm">
            <DrawerRow label="Reference No."><CopyRef value={item.id} /></DrawerRow>
            <DrawerRow label="Paid via">{item.method}</DrawerRow>
            {isPass && item.gatewayPaid > 0 && walletPart > 0 && (
              <DrawerRow label="Split">
                {formatINR(walletPart)} wallet + {formatINR(item.gatewayPaid)} gateway
              </DrawerRow>
            )}
            {item.invoiceNo && <DrawerRow label="Invoice No."><span className="font-mono text-xs">{item.invoiceNo}</span></DrawerRow>}
            {(reconciledBalance != null || item.balanceAfter != null) && (
              <DrawerRow label="Wallet balance after">
                {formatINR(reconciledBalance ?? item.balanceAfter)}
              </DrawerRow>
            )}
          </dl>

          {isPass && item.passes?.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-stone-500">Passes in this payment</p>
              <ul className="space-y-2">
                {item.passes.map((p) => {
                  const b = priceBreakup(p.baseAmount);
                  const Icon = p.kind === "vehicle" ? Truck : User;
                  return (
                    <li key={p.id} className="rounded-2xl ring-1 ring-stone-100 dark:ring-white/5 p-3.5">
                      <div className="flex items-start gap-3">
                        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-stone-500" />
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-[#1f1f1f] dark:text-white">{p.passType}</p>
                          <p className="text-xs text-stone-500">{p.subject} · {p.id} · {validityLabel(p)}</p>
                          <p className="mt-1.5 text-xs text-stone-500 tabular-nums">
                            {formatINR(b.base)} + CGST {formatINR(b.cgst)} + SGST {formatINR(b.sgst)}
                          </p>
                        </div>
                        <span className="font-bold tabular-nums text-[#1f1f1f] dark:text-white">{formatINR(b.total)}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {reporting && (
            <div className="rounded-2xl bg-stone-50 dark:bg-white/5 p-4 space-y-3">
              <p className="text-sm font-bold text-[#1f1f1f] dark:text-white">Report an issue</p>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full rounded-xl bg-white dark:bg-[#1a1d27] ring-1 ring-stone-200 dark:ring-white/10 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-400 dark:text-white"
              >
                {ISSUE_REASONS.map((r) => <option key={r}>{r}</option>)}
              </select>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="Anything else we should know? (optional)"
                className="w-full rounded-xl bg-white dark:bg-[#1a1d27] ring-1 ring-stone-200 dark:ring-white/10 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-400 dark:text-white"
              />
              <p className="text-xs text-stone-500">Reference {item.id} is attached automatically.</p>
              <div className="flex justify-end gap-2">
                <button onClick={() => setReporting(false)} className="rounded-xl px-4 py-2 text-sm font-bold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-white/5">Cancel</button>
                <button onClick={submitIssue} className="rounded-xl bg-[#1f1f1f] dark:bg-amber-400 px-4 py-2 text-sm font-bold text-white dark:text-black">Submit</button>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 border-t border-stone-100 dark:border-white/5 px-6 py-4">
          {!reporting && (
            <button
              onClick={() => setReporting(true)}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold ring-1 ring-stone-300 dark:ring-white/15 text-[#1f1f1f] dark:text-white hover:bg-stone-50 dark:hover:bg-white/5"
            >
              <LifeBuoy className="h-4 w-4" /> Report an issue
            </button>
          )}
          {isPass && item.passes?.length > 0 && (
            <button
              onClick={() =>
                downloadTaxInvoice({
                  txnId: item.id,
                  invoiceNo: item.invoiceNo,
                  at: item.at,
                  methodLabel: item.method,
                  passes: item.passes,
                  walletPaid: walletPart,
                  gatewayPaid: item.gatewayPaid,
                  gatewayMethod: item.method.replace(/^Wallet \+ |^E-Cash \(|\)$/g, ""),
                })
              }
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-orange-500 px-4 py-3 text-sm font-bold text-white hover:bg-orange-600"
            >
              <Download className="h-4 w-4" /> GST invoice
            </button>
          )}
        </div>
      </aside>
    </div>
  );
}

function DrawerRow({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <dt className="text-stone-500 dark:text-stone-400">{label}</dt>
      <dd className="text-right font-semibold text-[#1f1f1f] dark:text-white">{children}</dd>
    </div>
  );
}

// ── Refund pieces (shared by applicant wallet + Traffic approvals) ─────────

const REFUND_PILL = {
  PENDING_TRAFFIC: "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20",
  SENT_TO_EBS: "bg-sky-50 text-sky-800 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/20",
  REFUNDED: "bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20",
  REJECTED: "bg-red-50 text-red-700 ring-red-200 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/20",
  CANCELLED: "bg-stone-100 text-stone-600 ring-stone-200 dark:bg-white/5 dark:text-stone-300 dark:ring-white/10",
};

export function RefundStatusPill({ status, long = false }) {
  const meta = REFUND_STATUS[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ring-1", REFUND_PILL[status])}>
      {status === "SENT_TO_EBS" && <Loader2 className="h-3 w-3 animate-spin" />}
      {long ? meta.label : meta.short}
    </span>
  );
}

const TIMELINE_LABEL = {
  REQUESTED: "Refund requested",
  TRAFFIC_APPROVED: "Approved by Traffic department",
  SENT_TO_EBS: "Sent to EBS for payment",
  REFUNDED: "Paid to bank by EBS",
  REJECTED: "Rejected by Traffic department",
  CANCELLED: "Cancelled",
};

/** Four-step progress (Requested → Traffic → EBS → Paid) plus the dated history. */
export function RefundTracker({ refund, showHistory = true }) {
  const stopped = refund.status === "REJECTED" || refund.status === "CANCELLED";
  const current = REFUND_STATUS[refund.status].step; // index of the step in progress
  return (
    <div>
      <ol className="grid grid-cols-4 gap-1" aria-label="Refund progress">
        {REFUND_STEPS.map((step, i) => {
          const done = refund.status === "REFUNDED" ? true : i < current;
          const active = !stopped && i === current && refund.status !== "REFUNDED";
          const failed = stopped && i === current;
          return (
            <li key={step.key} className="flex flex-col items-center text-center">
              <div className="flex w-full items-center">
                <span className={cn("h-0.5 flex-1", i === 0 ? "bg-transparent" : done || active || failed ? "bg-emerald-400" : "bg-stone-200 dark:bg-white/10")} />
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ring-2",
                    failed
                      ? "bg-red-500 text-white ring-red-500"
                      : done
                        ? "bg-emerald-500 text-white ring-emerald-500"
                        : active
                          ? "bg-white dark:bg-[#1f232d] text-amber-600 ring-amber-400"
                          : "bg-white dark:bg-[#1f232d] text-stone-400 ring-stone-200 dark:ring-white/10",
                  )}
                >
                  {failed ? (refund.status === "REJECTED" ? <X className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />) : done ? <CheckCheck className="h-3.5 w-3.5" /> : active ? <Clock className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <span className={cn("h-0.5 flex-1", i === REFUND_STEPS.length - 1 ? "bg-transparent" : done ? "bg-emerald-400" : "bg-stone-200 dark:bg-white/10")} />
              </div>
              <span className={cn("mt-1.5 text-[11px] font-bold leading-tight", failed ? "text-red-600" : done || active ? "text-[#1f1f1f] dark:text-white" : "text-stone-400")}>
                {failed ? (refund.status === "REJECTED" ? "Rejected" : "Cancelled") : step.label}
              </span>
            </li>
          );
        })}
      </ol>

      {showHistory && (
        <ul className="mt-4 space-y-3 border-l-2 border-stone-100 dark:border-white/10 pl-4">
          {[...refund.timeline].reverse().map((t, i) => (
            <li key={i} className="relative">
              <span className={cn("absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-[#1f232d]", t.status === "REJECTED" ? "bg-red-500" : t.status === "CANCELLED" ? "bg-stone-400" : "bg-emerald-500")} />
              <p className="text-sm font-bold text-[#1f1f1f] dark:text-white">{TIMELINE_LABEL[t.status] || t.status}</p>
              <p className="text-xs text-stone-500">{formatDateTime(t.at)} · {t.by}</p>
              {t.note && <p className="mt-0.5 text-xs text-stone-600 dark:text-stone-300">{t.note}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ActivityPagination({
  currentPage = 1,
  pageSize = 20,
  totalRecords = 0,
  totalPages = 0,
  hasNextPage = false,
  hasPreviousPage = false,
  onPageChange,
  onPageSizeChange,
}) {
  if (totalRecords === 0) return null;

  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalRecords);

  const getPages = () => {
    const pages = [];
    const maxVisible = 5;
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("...");
      const startP = Math.max(2, currentPage - 1);
      const endP = Math.min(totalPages - 1, currentPage + 1);
      for (let i = startP; i <= endP; i++) {
        if (!pages.includes(i)) pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push("...");
      if (!pages.includes(totalPages)) pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-stone-100 dark:border-white/5 pt-4 text-sm text-stone-500">
      <div className="flex flex-wrap items-center gap-3">
        <span>
          Showing <span className="font-bold text-stone-800 dark:text-stone-200">{start}–{end}</span> of{" "}
          <span className="font-bold text-stone-800 dark:text-stone-200">{totalRecords}</span> transactions
        </span>
        <div className="flex items-center gap-1.5 text-xs">
          <span>Per page:</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
            className="rounded-lg border border-stone-200 dark:border-white/10 bg-white dark:bg-[#1f232d] px-2 py-1 text-xs font-semibold text-stone-700 dark:text-stone-300 outline-none"
          >
            {[10, 20, 50, 100].map((sz) => (
              <option key={sz} value={sz}>{sz}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={!hasPreviousPage || currentPage <= 1}
          onClick={() => onPageChange?.(currentPage - 1)}
          className="rounded-xl px-3 py-1.5 font-bold transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-stone-100 dark:hover:bg-white/5 text-stone-700 dark:text-stone-200"
        >
          Previous
        </button>

        {getPages().map((p, idx) =>
          p === "..." ? (
            <span key={`dots-${idx}`} className="px-2 text-stone-400">...</span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange?.(p)}
              className={cn(
                "h-8 w-8 rounded-xl font-bold text-xs transition-colors",
                currentPage === p
                  ? "bg-[#1f1f1f] text-white dark:bg-amber-400 dark:text-black shadow-sm"
                  : "text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-white/5"
              )}
            >
              {p}
            </button>
          )
        )}

        <button
          type="button"
          disabled={!hasNextPage || currentPage >= totalPages}
          onClick={() => onPageChange?.(currentPage + 1)}
          className="rounded-xl px-3 py-1.5 font-bold transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-stone-100 dark:hover:bg-white/5 text-stone-700 dark:text-stone-200"
        >
          Next
        </button>
      </div>
    </div>
  );
}

export { Undo2 as RefundIcon };
