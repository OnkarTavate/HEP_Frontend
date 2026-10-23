"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Check,
  Wallet,
  CreditCard,
  Split,
  Lock,
  Truck,
  User,
  Loader2,
  AlertTriangle,
  QrCode,
  Download,
  Copy,
  CheckCheck,
  PartyPopper,
  ChevronRight,
  CalendarDays,
  Clock,
  Send,
  MessageSquare,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  useWallet,
  simulatePassPayment,
  priceBreakup,
  sumBreakup,
  daysUntil,
  maskMobile,
  round2,
  formatINR,
  formatDateTime,
} from "@/lib/walletMock";
import { downloadTaxInvoice, downloadQrSheet } from "@/lib/walletDocs";
import { CARD, GatewayMethodPicker, validityLabel } from "@/components/wallet/WalletUI";

function affordableIds(passes, balance) {
  let left = balance;
  const ids = [];
  for (const p of passes) {
    const t = priceBreakup(p.baseAmount).total;
    if (t <= left) {
      ids.push(p.id);
      left -= t;
    }
  }
  return ids.length ? ids : passes.slice(0, 1).map((p) => p.id);
}

function urgency(p) {
  const d = daysUntil(p.validFrom);
  if (d <= 0) return { label: "Starts today", cls: "bg-red-50 text-red-700 ring-red-200 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/20" };
  if (d === 1) return { label: "Starts tomorrow", cls: "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20" };
  if (d <= 3) return { label: `Starts in ${d} days`, cls: "bg-stone-100 text-stone-700 ring-stone-200 dark:bg-white/5 dark:text-stone-300 dark:ring-white/10" };
  return null;
}

export default function PayApprovedPassesPage() {
  const wallet = useWallet();
  const [selected, setSelected] = useState(null); // null = smart default until the user touches it
  const [method, setMethod] = useState("wallet"); // wallet | ecash | split
  const [gatewayChoice, setGatewayChoice] = useState(null); // null = last used method
  const [processing, setProcessing] = useState(false);
  const [receipt, setReceipt] = useState(null);

  // Soonest-starting passes first, so the urgent ones are paid first.
  const passes = useMemo(
    () => [...wallet.approvedPasses].sort((a, b) => a.validFrom.localeCompare(b.validFrom)),
    [wallet.approvedPasses],
  );
  const payable = useMemo(() => passes.filter((p) => !p.paymentPending), [passes]);
  const lockedCount = passes.length - payable.length;

  // Default: pre-select the passes the wallet can cover (in list order) so the
  // page never opens on an "insufficient balance" error.
  const defaultIds = useMemo(() => affordableIds(payable, wallet.balance), [payable, wallet.balance]);
  const selectedIds = selected ?? defaultIds;
  const isDefaultPartial = selected === null && defaultIds.length < payable.length;
  const selectedPasses = payable.filter((p) => selectedIds.includes(p.id));
  const totals = useMemo(() => sumBreakup(selectedPasses), [selectedPasses]);

  const gatewayMethod = gatewayChoice ?? wallet.lastGatewayMethod;
  const shortfall = round2(Math.max(0, totals.total - wallet.balance));
  const canSplit = shortfall > 0 && wallet.balance > 0;
  const effectiveMethod = method === "split" && !canSplit ? "wallet" : method;
  const walletShort = effectiveMethod === "wallet" && shortfall > 0;
  const walletPart = effectiveMethod === "wallet" ? totals.total : effectiveMethod === "split" ? wallet.balance : 0;
  const gatewayPart = round2(totals.total - walletPart);
  const canPay = selectedPasses.length > 0 && !walletShort && !processing;
  const allChecked = payable.length > 0 && selectedPasses.length === payable.length;

  const toggle = (id) =>
    setSelected((prev) => {
      const cur = prev ?? defaultIds;
      return cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
    });

  const toggleAll = () => setSelected(allChecked ? [] : payable.map((p) => p.id));

  const pay = async () => {
    if (!canPay) return;
    setProcessing(true);
    try {
      const r = await simulatePassPayment(selectedIds, effectiveMethod, gatewayMethod);
      setReceipt(r);
      setSelected(null);
      document.querySelector("main")?.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      toast.error(e.message);
    } finally {
      setProcessing(false);
    }
  };

  if (receipt) {
    return <Confirmation receipt={receipt} remaining={payable.length} onPayMore={() => setReceipt(null)} />;
  }

  const payLabel =
    effectiveMethod === "wallet"
      ? `Pay ${formatINR(totals.total)} with Wallet`
      : effectiveMethod === "ecash"
        ? `Pay ${formatINR(totals.total)} via ${gatewayMethod}`
        : `Pay ${formatINR(totals.total)} · Wallet + ${gatewayMethod}`;

  return (
    <div className="max-w-6xl mx-auto py-2 pb-32 space-y-5">
      <Breadcrumb current="Pay for Approved Passes" />

      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1f1f1f] dark:text-white">Pay for Approved Passes</h1>
        <p className="text-sm sm:text-base text-stone-500 dark:text-stone-400 mt-1">Select the passes to pay for. Your QR codes are issued as soon as payment succeeds.</p>
      </div>

      {payable.length === 0 && lockedCount === 0 ? (
        <EmptyState />
      ) : (
        <>
          {payable.length > 0 && (
            <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 ring-1 ring-emerald-200 dark:ring-emerald-500/20 px-5 py-4">
              <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600" />
              <p className="text-sm sm:text-base font-semibold text-emerald-800 dark:text-emerald-300">
                {payable.length === 1 ? "Your pass request is approved." : `${payable.length} pass requests are approved.`} Complete payment to receive your pass QR code.
              </p>
            </div>
          )}

          {/* Pass selection */}
          <section className={cn(CARD, "p-5 sm:p-6")}>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <h2 className="text-xl font-extrabold text-[#1f1f1f] dark:text-white">Approved Passes</h2>
              <span className="text-sm font-semibold text-stone-500">
                {selectedPasses.length} of {payable.length} selected
              </span>
            </div>
            {isDefaultPartial && (
              <p className="-mt-2 mb-4 text-sm text-stone-500 dark:text-stone-400">
                We&apos;ve selected the passes your wallet balance covers, soonest first. Tick the rest to pay for them too.
              </p>
            )}

            <div className="overflow-hidden rounded-2xl ring-1 ring-stone-100 dark:ring-white/5">
              {/* Header row (desktop) */}
              <div className="hidden md:grid grid-cols-[44px_1.7fr_1.1fr_1.2fr_1.5fr_auto] items-center gap-4 bg-stone-50 dark:bg-white/5 px-4 py-3 text-xs font-bold uppercase tracking-wider text-stone-500">
                <Checkbox checked={allChecked} indeterminate={!allChecked && selectedPasses.length > 0} onChange={toggleAll} label="Select all passes" disabled={!payable.length} />
                <span>Pass Type</span>
                <span>Reference No.</span>
                <span>Vehicle / Person</span>
                <span>Validity</span>
                <span className="text-right min-w-[110px]">Amount</span>
              </div>
              {/* Select-all (mobile) */}
              {payable.length > 0 && (
                <button onClick={toggleAll} className="md:hidden flex w-full items-center gap-3 bg-stone-50 dark:bg-white/5 px-4 py-3 text-sm font-bold text-stone-600 dark:text-stone-300">
                  <Checkbox checked={allChecked} indeterminate={!allChecked && selectedPasses.length > 0} asSpan />
                  Select all
                </button>
              )}

              <ul className="divide-y divide-stone-100 dark:divide-white/5">
                {passes.map((p) => {
                  const locked = Boolean(p.paymentPending);
                  const checked = !locked && selectedIds.includes(p.id);
                  const Icon = p.kind === "vehicle" ? Truck : User;
                  const urg = !locked && urgency(p);
                  return (
                    <li key={p.id}>
                      <label
                        className={cn(
                          "grid items-center gap-x-4 gap-y-1 px-4 py-4 transition-colors",
                          "grid-cols-[44px_1fr_auto] md:grid-cols-[44px_1.7fr_1.1fr_1.2fr_1.5fr_auto]",
                          locked
                            ? "cursor-not-allowed bg-stone-50/70 dark:bg-white/[0.02]"
                            : checked
                              ? "cursor-pointer bg-amber-50/50 dark:bg-amber-500/[0.04]"
                              : "cursor-pointer hover:bg-stone-50 dark:hover:bg-white/[0.02]",
                        )}
                      >
                        {locked ? (
                          <span className="flex h-5 w-5 items-center justify-center" title="Payment being confirmed">
                            <Clock className="h-4 w-4 text-amber-600" />
                          </span>
                        ) : (
                          <Checkbox checked={checked} onChange={() => toggle(p.id)} label={`Select ${p.passType} ${p.id}`} />
                        )}
                        <span className="flex items-center gap-3 min-w-0">
                          <span className="hidden sm:flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-stone-100 dark:bg-white/5">
                            <Icon className="h-4 w-4 text-stone-600 dark:text-stone-300" />
                          </span>
                          <span className="min-w-0">
                            <span className={cn("block font-bold", locked ? "text-stone-500" : "text-[#1f1f1f] dark:text-white")}>{p.passType}</span>
                            <span className="block md:hidden text-xs text-stone-500">
                              {p.subject} · {p.id}
                            </span>
                            <span className="flex md:hidden items-center gap-1 text-xs text-stone-500">
                              <CalendarDays className="h-3 w-3" /> {validityLabel(p)}
                            </span>
                            {locked ? (
                              <span className="mt-1 inline-block text-xs font-semibold text-amber-700 dark:text-amber-300">
                                Payment started — waiting for bank confirmation. Don&apos;t pay again.
                              </span>
                            ) : (
                              urg && (
                                <span className={cn("mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ring-1", urg.cls)}>
                                  <Clock className="h-3 w-3" /> {urg.label}
                                </span>
                              )
                            )}
                          </span>
                        </span>
                        <span className="hidden md:block font-mono text-sm text-stone-600 dark:text-stone-300">{p.id}</span>
                        <span className="hidden md:block text-sm font-semibold text-stone-700 dark:text-stone-200">{p.subject}</span>
                        <span className="hidden md:block text-sm text-stone-600 dark:text-stone-300">{validityLabel(p)}</span>
                        <span className="text-right min-w-[110px]">
                          <span className={cn("block font-extrabold tabular-nums", locked ? "text-stone-400" : "text-[#1f1f1f] dark:text-white")}>
                            {formatINR(priceBreakup(p.baseAmount).total)}
                          </span>
                          <span className="block text-[11px] text-stone-400">{locked ? "Confirming…" : "incl. 18% GST"}</span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>

          {payable.length > 0 && (
            <div className="grid gap-5 lg:grid-cols-[1fr_1.25fr]">
              {/* Summary */}
              <section className={cn(CARD, "p-5 sm:p-6 h-fit")}>
                <h2 className="text-xl font-extrabold text-[#1f1f1f] dark:text-white">Payment Summary</h2>
                {selectedPasses.length === 0 ? (
                  <p className="mt-6 rounded-2xl bg-stone-50 dark:bg-white/5 p-5 text-sm text-stone-500 text-center">Select at least one pass to see the amount payable.</p>
                ) : (
                  <dl className="mt-4 divide-y divide-stone-100 dark:divide-white/5 text-sm sm:text-base">
                    <Row label={`Pass amount${selectedPasses.length > 1 ? ` (${selectedPasses.length} passes)` : ""}`} value={formatINR(totals.base)} />
                    <Row label="CGST (9%)" value={formatINR(totals.cgst)} />
                    <Row label="SGST (9%)" value={formatINR(totals.sgst)} />
                    <div className="flex items-center justify-between py-4">
                      <dt className="font-extrabold text-[#1f1f1f] dark:text-white">Total payable</dt>
                      <dd className="text-2xl font-extrabold tabular-nums text-[#1f1f1f] dark:text-white">{formatINR(totals.total)}</dd>
                    </div>
                    {effectiveMethod === "split" && (
                      <div className="space-y-1.5 pt-3 text-sm">
                        <div className="flex justify-between text-stone-600 dark:text-stone-300">
                          <span className="flex items-center gap-1.5"><Wallet className="h-3.5 w-3.5" /> From wallet</span>
                          <span className="font-semibold tabular-nums">{formatINR(walletPart)}</span>
                        </div>
                        <div className="flex justify-between text-stone-600 dark:text-stone-300">
                          <span className="flex items-center gap-1.5"><CreditCard className="h-3.5 w-3.5" /> Via {gatewayMethod}</span>
                          <span className="font-semibold tabular-nums">{formatINR(gatewayPart)}</span>
                        </div>
                      </div>
                    )}
                  </dl>
                )}
                <p className="mt-4 flex items-center gap-1.5 text-xs text-stone-500">
                  <FileText className="h-3.5 w-3.5" /> A GST tax invoice is generated for every payment.
                </p>
              </section>

              {/* Method */}
              <section className={cn(CARD, "p-5 sm:p-6")}>
                <h2 className="text-xl font-extrabold text-[#1f1f1f] dark:text-white">Payment Method</h2>
                <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">Choose how you want to pay.</p>

                <div className={cn("mt-4 grid gap-3", canSplit ? "sm:grid-cols-3" : "sm:grid-cols-2")} role="radiogroup" aria-label="Payment method">
                  <MethodCard active={effectiveMethod === "wallet"} onSelect={() => setMethod("wallet")} icon={Wallet} title="Wallet">
                    <p className="text-xs text-stone-600 dark:text-stone-300">Available balance</p>
                    <p className={cn("text-xl font-extrabold tabular-nums", shortfall > 0 ? "text-red-600 dark:text-red-400" : "text-emerald-700 dark:text-emerald-400")}>
                      {formatINR(wallet.balance)}
                    </p>
                    {selectedPasses.length > 0 &&
                      (shortfall > 0 ? (
                        <p className="mt-1 flex items-center gap-1 text-xs font-bold text-red-600 dark:text-red-400">
                          <AlertTriangle className="h-3.5 w-3.5" /> Short by {formatINR(shortfall)}
                        </p>
                      ) : (
                        <p className="mt-1 flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Sufficient balance
                        </p>
                      ))}
                  </MethodCard>

                  {canSplit && (
                    <MethodCard active={effectiveMethod === "split"} onSelect={() => setMethod("split")} icon={Split} title="Wallet + Pay rest" badge="No top-up needed">
                      <p className="text-xs text-stone-600 dark:text-stone-300 tabular-nums">
                        <span className="font-bold">{formatINR(wallet.balance)}</span> wallet
                        <br />+ <span className="font-bold">{formatINR(shortfall)}</span> via gateway
                      </p>
                    </MethodCard>
                  )}

                  <MethodCard active={effectiveMethod === "ecash"} onSelect={() => setMethod("ecash")} icon={CreditCard} title="E-Cash">
                    <p className="text-xs text-stone-600 dark:text-stone-300">Pay the full amount using UPI, Net Banking or Debit/Credit Card.</p>
                  </MethodCard>
                </div>

                {walletShort && (
                  <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-red-50 dark:bg-red-500/10 ring-1 ring-red-200 dark:ring-red-500/20 p-4">
                    <p className="text-sm text-red-800 dark:text-red-300">
                      Your wallet is short by <strong className="tabular-nums">{formatINR(shortfall)}</strong>.
                    </p>
                    <div className="flex flex-wrap gap-2 shrink-0">
                      {canSplit && (
                        <button onClick={() => setMethod("split")} className="rounded-xl bg-red-600 px-3 py-2 text-sm font-bold text-white hover:bg-red-700">
                          Pay rest via gateway
                        </button>
                      )}
                      <Link
                        href={`/dashboard/wallet?amount=${Math.max(100, Math.ceil(shortfall))}`}
                        className="rounded-xl px-3 py-2 text-sm font-bold text-red-700 dark:text-red-300 ring-1 ring-red-300 dark:ring-red-500/30 hover:bg-red-100 dark:hover:bg-red-500/10"
                      >
                        Top up wallet
                      </Link>
                    </div>
                  </div>
                )}

                {(effectiveMethod === "ecash" || effectiveMethod === "split") && (
                  <div className="mt-5">
                    <p className="mb-2 text-sm font-bold text-stone-600 dark:text-stone-300">
                      Pay {formatINR(gatewayPart)} using
                    </p>
                    <GatewayMethodPicker value={gatewayMethod} onChange={setGatewayChoice} compact />
                  </div>
                )}
              </section>
            </div>
          )}
        </>
      )}

      {/* Sticky action bar */}
      {payable.length > 0 && (
        <div className="sticky bottom-0 z-20 -mx-4 sm:-mx-6 lg:-mx-8 border-t border-stone-200 dark:border-white/10 bg-white/90 dark:bg-[#1a1d27]/90 backdrop-blur-md px-4 sm:px-6 lg:px-8 py-4">
          <div className="max-w-6xl mx-auto flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3">
            <Link
              href="/dashboard/wallet"
              className="inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold ring-1 ring-stone-300 dark:ring-white/15 text-[#1f1f1f] dark:text-white hover:bg-stone-50 dark:hover:bg-white/5"
            >
              <ArrowLeft className="h-4 w-4" /> Back to wallet
            </Link>
            <div className="flex flex-col items-stretch sm:items-end gap-1.5">
              <button
                onClick={pay}
                disabled={!canPay}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-7 py-3.5 text-base font-bold text-white shadow-lg shadow-orange-500/25 hover:bg-orange-600 active:scale-[0.99] transition-all disabled:cursor-not-allowed disabled:bg-stone-300 disabled:shadow-none dark:disabled:bg-white/10"
              >
                {processing ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" /> Processing payment…
                  </>
                ) : selectedPasses.length === 0 ? (
                  "Select a pass to pay"
                ) : walletShort ? (
                  "Insufficient wallet balance"
                ) : (
                  <>
                    {payLabel} <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>
              <p className="flex items-center justify-center gap-1.5 text-xs text-stone-500">
                <Lock className="h-3 w-3" /> Secured by APACS · All payments are processed securely.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Confirmation (slide 6) ────────────────────────────────────────────────

function Confirmation({ receipt, remaining, onPayMore }) {
  const [copied, setCopied] = useState(false);
  const [sendingFor, setSendingFor] = useState(null);
  const [sent, setSent] = useState({}); // passId -> channel
  const { totals, passes } = receipt;
  const usedWallet = receipt.walletPaid > 0;
  const isSplit = usedWallet && receipt.gatewayPaid > 0;

  const markSent = (ids, channel) => {
    setSent((s) => ({ ...s, ...Object.fromEntries(ids.map((id) => [id, channel])) }));
  };

  const sendAll = () => {
    const ids = passes.map((p) => p.id);
    markSent(ids, "SMS");
    toast.success(`Pass QR sent to ${ids.length} driver${ids.length > 1 ? "s" : ""}/holder${ids.length > 1 ? "s" : ""} by SMS`);
  };

  const downloadQrs = () => {
    const svgs = Object.fromEntries(passes.map((p) => [p.id, document.getElementById(`qr-${p.id}`)?.outerHTML || ""]));
    downloadQrSheet(passes, svgs, receipt.txnId);
    toast.success("Pass QR codes downloaded", { description: "Open the file and print, or share it with your drivers." });
  };

  return (
    <div className="max-w-3xl mx-auto py-2 space-y-5">
      <Breadcrumb current="Payment Confirmation" />

      <section className={cn(CARD, "p-6 sm:p-8")}>
        <div className="flex flex-col items-center text-center" aria-live="polite">
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/15 animate-in zoom-in-50 duration-300">
            <Check className="h-11 w-11 text-emerald-600" strokeWidth={3} />
          </span>
          <h1 className="mt-4 text-2xl sm:text-3xl font-extrabold text-emerald-800 dark:text-emerald-400">Payment Successful</h1>
          <p className="mt-1 text-stone-600 dark:text-stone-300">
            Your payment is complete and your pass{passes.length > 1 ? "es are" : " is"} ready. Share the QR with your driver{passes.length > 1 ? "s" : ""} below.
          </p>
        </div>

        <div className="mt-6 grid gap-6 border-t border-stone-100 dark:border-white/5 pt-6 sm:grid-cols-2 sm:divide-x sm:divide-stone-100 dark:sm:divide-white/5">
          <div className="space-y-4">
            <Field label="Amount Paid">
              <span className="text-3xl font-extrabold tabular-nums text-[#1f1f1f] dark:text-white">{formatINR(totals.total)}</span>
            </Field>
            <Field label="Payment Method">
              {receipt.methodLabel}
              {isSplit && (
                <span className="mt-0.5 block text-xs font-medium text-stone-500 tabular-nums">
                  {formatINR(receipt.walletPaid)} wallet + {formatINR(receipt.gatewayPaid)} {receipt.gatewayMethod}
                </span>
              )}
            </Field>
            <Field label="GST Invoice No.">
              <span className="font-mono text-sm">{receipt.invoiceNo}</span>
            </Field>
          </div>
          <div className="space-y-4 sm:pl-6">
            <Field label="Transaction ID">
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(receipt.txnId);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                className="group inline-flex items-center gap-2 font-mono hover:text-orange-600"
                title="Copy transaction ID"
              >
                {receipt.txnId}
                {copied ? <CheckCheck className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4 opacity-40 group-hover:opacity-100" />}
              </button>
            </Field>
            <Field label="Date & Time">{formatDateTime(receipt.at)}</Field>
            <Field label="Status">
              <span className="inline-flex rounded-full bg-emerald-100 dark:bg-emerald-500/15 px-3 py-1 text-xs font-extrabold tracking-wide text-emerald-800 dark:text-emerald-300">SUCCESS</span>
            </Field>
          </div>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-3 border-t border-stone-100 dark:border-white/5 pt-5">
          <button
            onClick={() => {
              downloadTaxInvoice(receipt);
              toast.success("GST invoice downloaded");
            }}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold ring-1 ring-stone-300 dark:ring-white/15 text-[#1f1f1f] dark:text-white hover:bg-stone-50 dark:hover:bg-white/5"
          >
            <FileText className="h-4 w-4" /> Download GST invoice
          </button>
          <button
            onClick={downloadQrs}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold ring-1 ring-stone-300 dark:ring-white/15 text-[#1f1f1f] dark:text-white hover:bg-stone-50 dark:hover:bg-white/5"
          >
            <Download className="h-4 w-4" /> Download QR passes
          </button>
        </div>
      </section>

      {usedWallet && (
        <section className={cn(CARD, "flex flex-wrap items-center justify-between gap-4 p-5 sm:px-8")}>
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 dark:bg-orange-500/10">
              <Wallet className="h-7 w-7 text-orange-500" />
            </span>
            <div>
              <p className="text-sm text-stone-500 dark:text-stone-400">Updated wallet balance</p>
              <p className="text-2xl font-extrabold tabular-nums text-[#1f1f1f] dark:text-white">{formatINR(receipt.balanceAfter)}</p>
            </div>
          </div>
          <Link href="/dashboard/wallet" className="inline-flex items-center gap-1.5 text-sm font-bold text-orange-600 dark:text-orange-400 hover:underline">
            View transactions <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      )}

      <section className={cn(CARD, "p-5 sm:p-6")}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-extrabold text-[#1f1f1f] dark:text-white">Your pass{passes.length > 1 ? "es" : ""}</h2>
          {passes.length > 1 && (
            <button onClick={sendAll} className="inline-flex items-center gap-1.5 text-sm font-bold text-orange-600 dark:text-orange-400 hover:underline">
              <Send className="h-4 w-4" /> Send all by SMS
            </button>
          )}
        </div>
        <ul className="divide-y divide-stone-100 dark:divide-white/5">
          {passes.map((p) => {
            const Icon = p.kind === "vehicle" ? Truck : User;
            const sentVia = sent[p.id];
            return (
              <li key={p.id} className="py-4 first:pt-1">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="shrink-0 self-center sm:self-start rounded-2xl bg-white p-2.5 ring-1 ring-stone-200">
                    <QRCodeSVG id={`qr-${p.id}`} value={`APACS|${p.id}|${receipt.txnId}`} size={112} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Icon className="h-4 w-4 text-stone-500" />
                      <p className="text-lg font-extrabold text-[#1f1f1f] dark:text-white">{p.passType}</p>
                      <span className="rounded-full bg-emerald-100 dark:bg-emerald-500/15 px-2.5 py-0.5 text-xs font-extrabold text-emerald-800 dark:text-emerald-300">PAID</span>
                    </div>
                    <p className="text-sm font-semibold text-stone-600 dark:text-stone-300">
                      {p.subject} · <span className="font-mono">{p.id}</span>
                    </p>
                    <p className="text-sm text-stone-500 flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5" /> {validityLabel(p)}
                    </p>

                    {sendingFor === p.id ? (
                      <SendPanel
                        pass={p}
                        onCancel={() => setSendingFor(null)}
                        onSend={(channel) => {
                          markSent([p.id], channel);
                          setSendingFor(null);
                          toast.success(`QR sent to ${p.contact.name} via ${channel}`, { description: maskMobile(p.contact.mobile) });
                        }}
                      />
                    ) : (
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => setSendingFor(p.id)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-[#1f1f1f] dark:bg-amber-400 px-3.5 py-2 text-sm font-bold text-white dark:text-black hover:opacity-90"
                        >
                          <Send className="h-4 w-4" /> {sentVia ? "Send again" : `Send to ${p.kind === "vehicle" ? "driver" : "pass holder"}`}
                        </button>
                        {sentVia && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                            <CheckCheck className="h-4 w-4" /> Sent via {sentVia} to {p.contact.name}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <span className="hidden sm:block font-bold tabular-nums text-[#1f1f1f] dark:text-white">{formatINR(priceBreakup(p.baseAmount).total)}</span>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="mt-2 flex justify-end border-t border-stone-100 dark:border-white/5 pt-5">
          <Link
            href="/dashboard/pass_request"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 py-3 text-sm font-bold text-white hover:bg-orange-600"
          >
            <QrCode className="h-4 w-4" /> View My Passes
          </Link>
        </div>
      </section>

      {remaining > 0 && (
        <button
          onClick={onPayMore}
          className="flex w-full items-center justify-between rounded-2xl bg-amber-50 dark:bg-amber-500/10 ring-1 ring-amber-200 dark:ring-amber-500/20 px-5 py-4 text-left hover:bg-amber-100/70 dark:hover:bg-amber-500/15"
        >
          <span className="text-sm font-semibold text-amber-900 dark:text-amber-200">
            {remaining} more approved pass{remaining > 1 ? "es" : ""} awaiting payment
          </span>
          <span className="inline-flex items-center gap-1 text-sm font-bold text-amber-900 dark:text-amber-200">
            Pay now <ChevronRight className="h-4 w-4" />
          </span>
        </button>
      )}
    </div>
  );
}

function SendPanel({ pass, onSend, onCancel }) {
  const [channel, setChannel] = useState("WhatsApp");
  return (
    <div className="mt-3 rounded-2xl bg-stone-50 dark:bg-white/5 p-4">
      <p className="text-sm text-stone-600 dark:text-stone-300">
        Send QR to <span className="font-bold text-[#1f1f1f] dark:text-white">{pass.contact.name}</span>{" "}
        <span className="font-mono text-xs">{maskMobile(pass.contact.mobile)}</span>
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Send via">
        {[
          { key: "WhatsApp", icon: MessageSquare },
          { key: "SMS", icon: Send },
        ].map((c) => (
          <button
            key={c.key}
            role="radio"
            aria-checked={channel === c.key}
            onClick={() => setChannel(c.key)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-bold ring-1",
              channel === c.key ? "bg-orange-500 text-white ring-orange-500" : "bg-white dark:bg-transparent text-stone-700 dark:text-stone-200 ring-stone-200 dark:ring-white/10",
            )}
          >
            <c.icon className="h-4 w-4" /> {c.key}
          </button>
        ))}
        <span className="flex-1" />
        <button onClick={onCancel} className="rounded-xl px-3 py-1.5 text-sm font-bold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-white/5">
          Cancel
        </button>
        <button onClick={() => onSend(channel)} className="rounded-xl bg-[#1f1f1f] dark:bg-amber-400 px-4 py-1.5 text-sm font-bold text-white dark:text-black">
          Send
        </button>
      </div>
    </div>
  );
}

// ── Pieces ─────────────────────────────────────────────────────────────────

function Breadcrumb({ current }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-stone-500">
      <Link href="/dashboard" className="hover:text-orange-600">Dashboard</Link>
      <ChevronRight className="h-3.5 w-3.5" />
      <Link href="/dashboard/wallet" className="hover:text-orange-600">Wallet</Link>
      <ChevronRight className="h-3.5 w-3.5" />
      <span className="font-semibold text-[#1f1f1f] dark:text-stone-200">{current}</span>
    </nav>
  );
}

function Checkbox({ checked, indeterminate, onChange, label, asSpan, disabled }) {
  const box = (
    <span
      className={cn(
        "flex h-5 w-5 items-center justify-center rounded-md ring-2 transition-colors",
        checked || indeterminate ? "bg-amber-400 ring-amber-400" : "bg-white dark:bg-transparent ring-stone-300 dark:ring-white/20",
      )}
    >
      {checked ? <Check className="h-3.5 w-3.5 text-black" strokeWidth={3.5} /> : indeterminate ? <span className="h-0.5 w-2.5 rounded bg-black" /> : null}
    </span>
  );
  if (asSpan) return box;
  return (
    <span className="relative flex items-center">
      <input type="checkbox" checked={checked} onChange={onChange} disabled={disabled} aria-label={label} className="peer absolute inset-0 h-5 w-5 cursor-pointer opacity-0" />
      <span className="rounded-md peer-focus-visible:ring-2 peer-focus-visible:ring-orange-500 peer-focus-visible:ring-offset-2">{box}</span>
    </span>
  );
}

function MethodCard({ active, onSelect, icon: Icon, title, badge, children }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onSelect}
      className={cn(
        "relative rounded-2xl p-4 text-left ring-1 transition-all",
        active ? "ring-2 ring-amber-400 bg-amber-50/70 dark:bg-amber-500/[0.06]" : "ring-stone-200 dark:ring-white/10 hover:ring-stone-300",
      )}
    >
      <span className={cn("absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full ring-2", active ? "ring-amber-500" : "ring-stone-300")}>
        {active && <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />}
      </span>
      <span className="flex items-center gap-2.5 mb-2.5 pr-6">
        <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", active ? "bg-amber-100 dark:bg-amber-500/15" : "bg-stone-100 dark:bg-white/5")}>
          <Icon className={cn("h-5 w-5", active ? "text-orange-600" : "text-stone-700 dark:text-stone-200")} />
        </span>
        <span className="font-extrabold leading-tight text-[#1f1f1f] dark:text-white">{title}</span>
      </span>
      {badge && (
        <span className="mb-2 inline-block rounded-full bg-emerald-100 dark:bg-emerald-500/15 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
          {badge}
        </span>
      )}
      {children}
    </button>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between py-3.5">
      <dt className="text-stone-600 dark:text-stone-300">{label}</dt>
      <dd className="font-semibold tabular-nums text-[#1f1f1f] dark:text-white">{value}</dd>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <p className="text-sm text-stone-500 dark:text-stone-400">{label}</p>
      <div className="mt-0.5 font-bold text-[#1f1f1f] dark:text-white">{children}</div>
    </div>
  );
}

function EmptyState() {
  return (
    <section className={cn(CARD, "flex flex-col items-center px-6 py-14 text-center")}>
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-500/10">
        <PartyPopper className="h-8 w-8 text-emerald-600" />
      </span>
      <h2 className="mt-4 text-xl font-extrabold text-[#1f1f1f] dark:text-white">You&apos;re all caught up</h2>
      <p className="mt-1 max-w-sm text-sm text-stone-500">No approved passes are waiting for payment. New approvals will appear here.</p>
      <div className="mt-6 flex gap-3">
        <Link href="/dashboard/wallet" className="rounded-2xl px-5 py-3 text-sm font-bold ring-1 ring-stone-300 dark:ring-white/15 dark:text-white hover:bg-stone-50 dark:hover:bg-white/5">
          Go to wallet
        </Link>
        <Link href="/dashboard/pass_request" className="rounded-2xl bg-orange-500 px-5 py-3 text-sm font-bold text-white hover:bg-orange-600">
          Apply for a pass
        </Link>
      </div>
    </section>
  );
}
