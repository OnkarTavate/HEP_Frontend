"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
} from "@/lib/walletMock";
import { downloadTaxInvoice } from "@/lib/walletDocs";

export const CARD = "rounded-3xl bg-white dark:bg-[#1f232d] ring-1 ring-stone-200/70 dark:ring-white/5 shadow-sm";

export const validityLabel = (p) =>
  p.validFrom === p.validTo ? formatDate(p.validFrom) : `${formatDate(p.validFrom)} – ${formatDate(p.validTo)}`;

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
        item.status === "FAILED"
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

export function TopUpGatewayModal({ amount, defaultMethod, onClose, onDone }) {
  const [method, setMethod] = useState(defaultMethod || "UPI");
  const [outcome, setOutcome] = useState("success");
  const [phase, setPhase] = useState("choose"); // choose | processing | result
  const [result, setResult] = useState(null);
  useEscape(phase !== "processing", onClose);

  const pay = async () => {
    setPhase("processing");
    const entry = await simulateTopUp(amount, method, outcome);
    setResult(entry);
    setPhase("result");
    if (entry.status !== "FAILED") onDone();
    if (entry.status === "SUCCESS") toast.success(`${formatINR(amount)} added to your wallet`, { description: `Reference ${entry.id}` });
    if (entry.status === "PENDING") toast.message("Top-up pending bank confirmation", { description: "We'll credit your wallet automatically." });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4 animate-in fade-in"
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
                </div>
              </div>
            )}

            <label className="mt-4 flex items-center gap-2 text-xs text-stone-500">
              Demo outcome:
              <select
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
                className="rounded-lg bg-stone-100 dark:bg-white/5 px-2 py-1 font-semibold text-stone-700 dark:text-stone-200 outline-none"
              >
                <option value="success">Success</option>
                <option value="pending">Pending (bank confirms later)</option>
                <option value="failed">Failed</option>
              </select>
            </label>

            <button
              onClick={pay}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 py-3.5 font-bold text-white hover:bg-orange-600 transition-colors"
            >
              <Lock className="h-4 w-4" /> Pay {formatINR(amount)} via {method}
            </button>
          </div>
        )}

        {phase === "processing" && (
          <div className="flex flex-col items-center px-6 py-12 text-center" aria-live="polite">
            <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
            <p className="mt-4 font-bold text-[#1f1f1f] dark:text-white">Waiting for gateway confirmation…</p>
            <p className="mt-1 text-sm text-stone-500">Please don&apos;t close this window or press back.</p>
          </div>
        )}

        {phase === "result" && result && (
          <ResultPanel
            entry={result}
            amount={amount}
            onClose={onClose}
            onRetry={() => {
              setOutcome("success");
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
      <p className="mt-3 font-mono text-xs text-stone-500">Ref: {entry.id}</p>
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

export function TransactionDrawer({ item, onClose }) {
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState(ISSUE_REASONS[0]);
  const [note, setNote] = useState("");
  useEscape(Boolean(item), onClose);

  if (!item) return null;
  const isPass = item.type === "PASS_PAYMENT";
  const walletPart = -item.amount;

  const submitIssue = () => {
    const ticket = `SR-${Math.floor(100000 + Math.random() * 900000)}`;
    toast.success(`Issue raised · ${ticket}`, { description: `Our finance team will contact you about ${item.id}.` });
    setReporting(false);
    setNote("");
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-labelledby="txn-title">
      <button aria-label="Close details" onClick={onClose} className="absolute inset-0 bg-black/40 backdrop-blur-[2px] animate-in fade-in" />
      <aside className="relative flex h-full w-full max-w-md flex-col bg-white dark:bg-[#1f232d] shadow-2xl animate-in slide-in-from-right-10 duration-200">
        <div className="flex items-start justify-between gap-3 border-b border-stone-100 dark:border-white/5 px-6 py-5">
          <div className="flex items-center gap-3">
            <ActivityIcon item={item} />
            <div>
              <p id="txn-title" className="font-extrabold text-[#1f1f1f] dark:text-white">{isPass ? "Pass payment" : "Wallet top-up"}</p>
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
            <StatusPill status={item.status} />
          </div>

          {item.status === "PENDING" && (
            <p className="rounded-2xl bg-amber-50 dark:bg-amber-500/10 p-4 text-sm text-amber-900 dark:text-amber-200">
              Waiting for your bank to confirm. Your wallet will be credited automatically. Please don&apos;t pay again.
            </p>
          )}
          {item.status === "FAILED" && (
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
            {item.balanceAfter != null && <DrawerRow label="Wallet balance after">{formatINR(item.balanceAfter)}</DrawerRow>}
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
