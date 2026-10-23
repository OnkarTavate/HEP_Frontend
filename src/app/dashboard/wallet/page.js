"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Wallet,
  ShieldCheck,
  ArrowRight,
  Lock,
  Search,
  X,
  Receipt,
  AlertCircle,
  AlertTriangle,
  Inbox,
  Bell,
  Download,
  ChevronRight,
  RotateCcw,
  Truck,
  User,
  Clock,
  PartyPopper,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  useWallet,
  sumBreakup,
  withRunningBalance,
  setLowBalanceThreshold,
  resetWalletDemo,
  formatINR,
  formatDateTime,
  formatTime,
  priceBreakup,
  myRefunds,
  amountOnHold,
  cancelRefund,
  REFUND_LIMITS,
  QUICK_AMOUNTS,
  TOPUP_LIMITS,
} from "@/lib/walletMock";
import { downloadStatementCsv } from "@/lib/walletDocs";
import {
  CARD,
  StatusPill,
  CopyRef,
  ActivityIcon,
  AmountText,
  TopUpGatewayModal,
  TransactionDrawer,
  urgency,
  RefundStatusPill,
  RefundTracker,
  RefundIcon,
} from "@/components/wallet/WalletUI";
import RefundRequestModal from "@/components/wallet/RefundRequestModal";

const FILTERS = [
  { key: "all", label: "All", test: () => true },
  { key: "credit", label: "Top-ups", test: (a) => a.type === "TOPUP" && a.status === "SUCCESS" },
  { key: "debit", label: "Payments", test: (a) => a.type === "PASS_PAYMENT" },
  { key: "refund", label: "Refunds", test: (a) => a.type === "REFUND" },
  { key: "pending", label: "Pending", test: (a) => a.status === "PENDING" },
  { key: "failed", label: "Failed", test: (a) => a.status === "FAILED" },
];

const STATEMENT_RANGES = [
  { key: "month", label: "This month" },
  { key: "30", label: "Last 30 days" },
  { key: "90", label: "Last 90 days" },
  { key: "all", label: "All time" },
];

const PAGE_SIZE = 8;

const parseAmount = (str) => Number(String(str).replace(/[^\d]/g, "")) || 0;
const groupDigits = (n) => (n ? n.toLocaleString("en-IN") : "");

function dayGroup(iso) {
  const d = new Date(iso);
  const today = new Date();
  const startOf = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((startOf(today) - startOf(d)) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()) return "Earlier this month";
  return d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

function inRange(iso, range) {
  if (range === "all") return true;
  const d = new Date(iso);
  const now = new Date();
  if (range === "month") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  return now - d <= Number(range) * 86400000;
}

export default function WalletPageRoute() {
  return (
    <Suspense>
      <WalletPage />
    </Suspense>
  );
}

function WalletPage() {
  const wallet = useWallet();
  // Deep-links like /dashboard/wallet?amount=1180 (from the pay screen) prefill the amount.
  const presetAmount = parseAmount(useSearchParams().get("amount") || "");
  const [amountText, setAmountText] = useState(() =>
    groupDigits(presetAmount ? Math.min(presetAmount, TOPUP_LIMITS.max) : 2000),
  );
  const [touched, setTouched] = useState(false);
  const [gatewayAmount, setGatewayAmount] = useState(null); // frozen while the gateway modal is open

  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [openTxnId, setOpenTxnId] = useState(null);
  const [statementRange, setStatementRange] = useState("month");
  const [refundOpen, setRefundOpen] = useState(false);

  const amount = parseAmount(amountText);
  const amountError =
    amount === 0
      ? "Enter an amount to add"
      : amount < TOPUP_LIMITS.min
        ? `Minimum top-up is ${formatINR(TOPUP_LIMITS.min)}`
        : amount > TOPUP_LIMITS.max
          ? `Maximum top-up is ${formatINR(TOPUP_LIMITS.max)} per transaction`
          : null;

  const payable = useMemo(() => wallet.approvedPasses.filter((p) => !p.paymentPending), [wallet.approvedPasses]);
  const pending = useMemo(() => sumBreakup(payable), [payable]);
  const shortfall = Math.max(0, Math.ceil(pending.total - wallet.balance));
  const lowBalance = wallet.balance < wallet.lowBalanceThreshold;

  const rows = useMemo(() => withRunningBalance(wallet.activity, wallet.balance), [wallet.activity, wallet.balance]);
  const counts = useMemo(() => Object.fromEntries(FILTERS.map((f) => [f.key, rows.filter(f.test).length])), [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const test = FILTERS.find((f) => f.key === filter).test;
    return rows.filter(
      (a) =>
        test(a) &&
        (!q || [a.id, a.description, a.method, a.invoiceNo].some((v) => v?.toLowerCase().includes(q))),
    );
  }, [rows, filter, query]);

  const groups = useMemo(() => {
    const out = [];
    for (const a of filtered.slice(0, visible)) {
      const label = dayGroup(a.at);
      if (out.at(-1)?.label !== label) out.push({ label, items: [] });
      out.at(-1).items.push(a);
    }
    return out;
  }, [filtered, visible]);

  const monthStats = useMemo(() => {
    const inMonth = rows.filter((a) => a.status === "SUCCESS" && inRange(a.at, "month"));
    return {
      added: inMonth.filter((a) => a.amount > 0).reduce((s, a) => s + a.amount, 0),
      spent: inMonth.filter((a) => a.type === "PASS_PAYMENT").reduce((s, a) => s + (a.totalPaid ?? -a.amount), 0),
    };
  }, [rows]);

  const openTxn = rows.find((a) => a.id === openTxnId) || null;
  const mine = useMemo(() => myRefunds(wallet.refunds), [wallet.refunds]);
  const onHold = amountOnHold(wallet.refunds);
  const refundAwaiting = mine.some((r) => r.status === "PENDING_TRAFFIC");
  const refundBlockedReason = refundAwaiting
    ? "You already have a refund awaiting Traffic approval"
    : wallet.balance < REFUND_LIMITS.min
      ? `Minimum refundable balance is ${formatINR(REFUND_LIMITS.min)}`
      : null;

  const handleContinue = () => {
    setTouched(true);
    if (amountError) return;
    setGatewayAmount(amount);
  };

  const downloadStatement = () => {
    const list = rows.filter((a) => inRange(a.at, statementRange));
    if (!list.length) return toast.error("No transactions in this period");
    downloadStatementCsv(list, STATEMENT_RANGES.find((r) => r.key === statementRange).label);
    toast.success("Statement downloaded", { description: `${list.length} transactions · opens in Excel` });
  };

  return (
    <div className="w-full py-2 space-y-5">
      {/* Title */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1f1f1f] dark:text-white">Wallet Top-up</h1>
          <p className="text-sm sm:text-base text-stone-500 dark:text-stone-400 mt-1">Add funds to your APACS wallet securely.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
            <AlertCircle className="h-3.5 w-3.5" /> Demo mode · no real money is moved
          </span>
          <button
            onClick={() => {
              resetWalletDemo();
              toast.success("Demo data reset");
            }}
            title="Reset demo data"
            aria-label="Reset demo data"
            className="rounded-full p-1.5 text-stone-400 hover:bg-stone-200/60 hover:text-stone-700 dark:hover:bg-white/10"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_400px] xl:grid-rows-[auto_1fr] 2xl:grid-cols-[minmax(0,1fr)_440px]">
      {/* Balance hero */}
      <section className="xl:col-start-1 relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#1a1d27] via-[#252836] to-[#1a1d27] dark:from-black dark:via-[#1a1d27] dark:to-black text-white ring-1 ring-white/5 shadow-[0_24px_56px_-20px_rgba(15,23,42,0.40)]">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-orange-500/10 blur-3xl" />
        <div className="relative grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_auto] xl:grid-cols-1 2xl:grid-cols-[1fr_auto] lg:items-center">
          <div className="flex items-center gap-5">
            <span className="flex h-16 w-16 sm:h-20 sm:w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/30 to-orange-600/20 ring-1 ring-amber-400/30">
              <Wallet className="h-8 w-8 sm:h-10 sm:w-10 text-amber-400" strokeWidth={2.2} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-stone-300">Available Balance</p>
              <p className="text-3xl sm:text-5xl font-extrabold tracking-tight tabular-nums" aria-live="polite">
                {formatINR(wallet.balance)}
              </p>
              <LowBalanceSetting threshold={wallet.lowBalanceThreshold} low={lowBalance} />
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setRefundOpen(true)}
                  disabled={Boolean(refundBlockedReason)}
                  title={refundBlockedReason || "Get unused balance back to your bank account"}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1.5 text-xs sm:text-sm font-bold text-white ring-1 ring-white/15 hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RefundIcon className="h-4 w-4" /> Request refund
                </button>
                {onHold > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-400/15 px-3 py-1 text-xs font-bold text-sky-200">
                    <Clock className="h-3.5 w-3.5" /> {formatINR(onHold)} on hold for refund
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:min-w-[320px]">
            <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Added this month</p>
              <p className="text-lg font-extrabold text-emerald-400 tabular-nums">{formatINR(monthStats.added)}</p>
            </div>
            <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Spent on passes</p>
              <p className="text-lg font-extrabold text-orange-300 tabular-nums">{formatINR(monthStats.spent)}</p>
            </div>
          </div>
        </div>

      </section>

      {/* Right column on wide screens: primary action + what's due */}
      <aside className="space-y-5 xl:col-start-2 xl:row-start-1 xl:row-span-2">
      {/* Add money */}
      <section className={cn(CARD, "p-6 sm:p-7")}>
        <div className="grid gap-6 md:grid-cols-2 md:gap-8 xl:grid-cols-1 xl:gap-6">
          <div>
            <h2 className="text-xl font-extrabold text-[#1f1f1f] dark:text-white">Add Money</h2>
            <label htmlFor="topup-amount" className="block mt-5 mb-2 text-sm font-bold text-stone-600 dark:text-stone-300">
              Amount
            </label>
            <div
              className={cn(
                "flex items-stretch overflow-hidden rounded-2xl ring-1 transition-shadow focus-within:ring-2",
                touched && amountError
                  ? "ring-red-400 focus-within:ring-red-500"
                  : "ring-stone-200 dark:ring-white/10 focus-within:ring-amber-400",
              )}
            >
              <span className="flex items-center px-5 bg-stone-100 dark:bg-white/5 text-xl font-bold text-stone-500 dark:text-stone-400">₹</span>
              <input
                id="topup-amount"
                inputMode="numeric"
                autoComplete="off"
                value={amountText}
                onChange={(e) => setAmountText(groupDigits(parseAmount(e.target.value)))}
                onBlur={() => setTouched(true)}
                onKeyDown={(e) => e.key === "Enter" && handleContinue()}
                placeholder="0"
                aria-invalid={Boolean(touched && amountError)}
                aria-describedby="topup-help"
                className="w-full bg-white dark:bg-transparent px-4 py-4 text-2xl font-extrabold tabular-nums text-[#1f1f1f] dark:text-white outline-none placeholder:text-stone-300"
              />
              {amount > 0 && (
                <button
                  type="button"
                  onClick={() => setAmountText("")}
                  aria-label="Clear amount"
                  className="px-4 text-stone-400 hover:text-stone-700 dark:hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
            <p id="topup-help" className={cn("mt-2 text-xs font-medium", touched && amountError ? "text-red-600 dark:text-red-400" : "text-stone-500")}>
              {touched && amountError
                ? amountError
                : `Min ${formatINR(TOPUP_LIMITS.min)} · Max ${formatINR(TOPUP_LIMITS.max)} per transaction`}
            </p>

            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {QUICK_AMOUNTS.map((v) => {
                const active = amount === v;
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => {
                      setAmountText(groupDigits(v));
                      setTouched(false);
                    }}
                    aria-pressed={active}
                    className={cn(
                      "rounded-xl py-3 text-sm font-bold tabular-nums ring-1 transition-all active:scale-[0.98]",
                      active
                        ? "bg-amber-400 text-black ring-amber-400 shadow-md shadow-amber-400/20"
                        : "bg-white dark:bg-white/5 text-stone-700 dark:text-stone-200 ring-stone-200 dark:ring-white/10 hover:ring-amber-400",
                    )}
                  >
                    ₹{v.toLocaleString("en-IN")}
                  </button>
                );
              })}
            </div>

            {shortfall > 0 && amount !== Math.max(shortfall, TOPUP_LIMITS.min) && (
              <button
                type="button"
                onClick={() => {
                  setAmountText(groupDigits(Math.max(shortfall, TOPUP_LIMITS.min)));
                  setTouched(false);
                }}
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-orange-600 dark:text-orange-400 hover:underline"
              >
                <Receipt className="h-4 w-4" /> Add exactly {formatINR(Math.max(shortfall, TOPUP_LIMITS.min))} to cover pending passes
              </button>
            )}
          </div>

          <div className="flex flex-col border-stone-200 dark:border-white/10 md:border-l md:pl-8 xl:border-l-0 xl:pl-0 xl:border-t xl:pt-6">
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-orange-50 dark:bg-orange-500/10">
                <ShieldCheck className="h-6 w-6 text-orange-500" />
              </span>
              <div>
                <p className="font-bold text-[#1f1f1f] dark:text-white">Secure payment via payment gateway</p>
                <p className="text-sm text-stone-500 dark:text-stone-400">
                  UPI (scan a QR), cards or net banking. Last used: <span className="font-semibold">{wallet.lastGatewayMethod}</span>
                </p>
              </div>
            </div>

            <dl className="mt-6 space-y-2.5 rounded-2xl bg-stone-50 dark:bg-white/5 p-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-stone-500 dark:text-stone-400">Current balance</dt>
                <dd className="font-semibold tabular-nums text-stone-700 dark:text-stone-200">{formatINR(wallet.balance)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-stone-500 dark:text-stone-400">Adding</dt>
                <dd className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">+ {formatINR(amountError ? 0 : amount)}</dd>
              </div>
              <div className="flex justify-between border-t border-stone-200 dark:border-white/10 pt-2.5">
                <dt className="font-bold text-stone-700 dark:text-stone-200">Balance after top-up</dt>
                <dd className="font-extrabold tabular-nums text-[#1f1f1f] dark:text-white">
                  {formatINR(wallet.balance + (amountError ? 0 : amount))}
                </dd>
              </div>
            </dl>

            <button
              type="button"
              onClick={handleContinue}
              disabled={Boolean(amountError)}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 px-6 py-4 text-base font-bold text-white shadow-lg shadow-orange-500/25 hover:bg-orange-600 active:scale-[0.99] transition-all disabled:cursor-not-allowed disabled:bg-stone-300 disabled:shadow-none dark:disabled:bg-white/10 dark:disabled:text-stone-500"
            >
              {amountError ? "Continue to Payment" : `Add ${formatINR(amount)} · Continue`}
              <ArrowRight className="h-5 w-5" />
            </button>
            <p className="mt-4 flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
              <Lock className="h-3.5 w-3.5 shrink-0" /> Wallet is credited only after the gateway confirms payment. Every top-up is recorded below.
            </p>
          </div>
        </div>
      </section>

      <PendingPaymentsCard passes={wallet.approvedPasses} total={pending.total} shortfall={shortfall} />
      {mine.length > 0 && <RefundRequestsCard refunds={mine} />}
      </aside>

      {/* Activity */}
      <section className={cn(CARD, "@container xl:col-start-1 min-w-0 p-6 sm:p-7")}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-[#1f1f1f] dark:text-white">Wallet Activity</h2>
            <p className="text-xs text-stone-500 mt-0.5">Tap a transaction for details, GST invoice or to report an issue.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-60 sm:flex-none">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setVisible(PAGE_SIZE);
                }}
                placeholder="Search reference, pass or invoice"
                aria-label="Search wallet activity"
                className="w-full rounded-xl bg-stone-50 dark:bg-white/5 ring-1 ring-stone-200 dark:ring-white/10 py-2.5 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-amber-400 dark:text-white"
              />
            </div>
            <div className="flex items-stretch overflow-hidden rounded-xl ring-1 ring-stone-200 dark:ring-white/10">
              <select
                value={statementRange}
                onChange={(e) => setStatementRange(e.target.value)}
                aria-label="Statement period"
                className="bg-stone-50 dark:bg-white/5 px-2.5 text-sm font-semibold text-stone-700 dark:text-stone-200 outline-none"
              >
                {STATEMENT_RANGES.map((r) => (
                  <option key={r.key} value={r.key}>{r.label}</option>
                ))}
              </select>
              <button
                onClick={downloadStatement}
                className="inline-flex items-center gap-1.5 bg-[#1f1f1f] dark:bg-amber-400 px-3.5 py-2.5 text-sm font-bold text-white dark:text-black hover:opacity-90"
              >
                <Download className="h-4 w-4" /> Statement
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Filter activity">
          {FILTERS.filter((f) => f.key === "all" || counts[f.key] > 0).map((f) => (
            <button
              key={f.key}
              role="tab"
              aria-selected={filter === f.key}
              onClick={() => {
                setFilter(f.key);
                setVisible(PAGE_SIZE);
              }}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-bold transition-colors",
                filter === f.key
                  ? "bg-[#1f1f1f] text-white dark:bg-amber-400 dark:text-black"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-white/5 dark:text-stone-300 dark:hover:bg-white/10",
              )}
            >
              {f.label}
              <span className={cn("text-xs tabular-nums", filter === f.key ? "opacity-70" : "text-stone-400")}>{counts[f.key]}</span>
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-dashed border-stone-200 dark:border-white/10 py-12 text-center">
            <Inbox className="h-8 w-8 text-stone-300" />
            <p className="mt-2 text-sm font-semibold text-stone-500">No transactions match your filters.</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="mt-5 hidden @min-[860px]:block overflow-hidden rounded-2xl ring-1 ring-stone-100 dark:ring-white/5">
              <table className="w-full text-sm">
                <thead className="bg-stone-50 dark:bg-white/5 text-left text-xs font-bold uppercase tracking-wider text-stone-500">
                  <tr>
                    <th className="px-5 py-3">Description</th>
                    <th className="px-5 py-3">Reference No.</th>
                    <th className="px-5 py-3 text-right">Amount</th>
                    <th className="px-5 py-3 text-right">Balance</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                {groups.map((g) => (
                  <tbody key={g.label} className="divide-y divide-stone-100 dark:divide-white/5">
                    <tr>
                      <th colSpan={6} className="bg-white dark:bg-[#1f232d] px-5 pt-4 pb-1.5 text-left text-xs font-extrabold uppercase tracking-wider text-stone-400">
                        {g.label}
                      </th>
                    </tr>
                    {g.items.map((a) => (
                      <tr
                        key={a.id}
                        tabIndex={0}
                        onClick={() => setOpenTxnId(a.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setOpenTxnId(a.id);
                          }
                        }}
                        className="group cursor-pointer hover:bg-amber-50/40 dark:hover:bg-white/[0.03] focus:outline-none focus-visible:bg-amber-50 dark:focus-visible:bg-white/5"
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3 min-w-0">
                            <ActivityIcon item={a} />
                            <div className="min-w-0">
                              <p className="font-bold text-[#1f1f1f] dark:text-white truncate max-w-[300px]">{a.description}</p>
                              <p className="text-xs text-stone-500">
                                {g.label === "Today" || g.label === "Yesterday" ? formatTime(a.at) : formatDateTime(a.at)} · {a.method}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5"><CopyRef value={a.id} /></td>
                        <td className="px-5 py-3.5 text-right"><AmountText item={a} /></td>
                        <td className="px-5 py-3.5 text-right tabular-nums text-stone-500 dark:text-stone-400">
                          {a.balanceAfter != null ? formatINR(a.balanceAfter) : "—"}
                        </td>
                        <td className="px-5 py-3.5"><StatusPill status={a.status} /></td>
                        <td className="pr-4"><ChevronRight className="h-4 w-4 text-stone-300 group-hover:text-stone-500" /></td>
                      </tr>
                    ))}
                  </tbody>
                ))}
              </table>
            </div>

            {/* Mobile cards */}
            <div className="mt-5 space-y-5 @min-[860px]:hidden">
              {groups.map((g) => (
                <div key={g.label}>
                  <p className="mb-2 text-xs font-extrabold uppercase tracking-wider text-stone-400">{g.label}</p>
                  <ul className="grid gap-2.5 @min-[560px]:grid-cols-2">
                    {g.items.map((a) => (
                      <li key={a.id}>
                        <button
                          onClick={() => setOpenTxnId(a.id)}
                          className="w-full rounded-2xl ring-1 ring-stone-100 dark:ring-white/5 p-4 text-left active:bg-stone-50 dark:active:bg-white/5"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <ActivityIcon item={a} />
                              <div className="min-w-0">
                                <p className="font-bold text-[#1f1f1f] dark:text-white truncate">{a.description}</p>
                                <p className="text-xs text-stone-500">{g.label === "Today" || g.label === "Yesterday" ? formatTime(a.at) : formatDateTime(a.at)} · {a.method}</p>
                              </div>
                            </div>
                            <AmountText item={a} />
                          </div>
                          <div className="mt-3 flex items-center justify-between gap-2 text-xs text-stone-500">
                            <span className="tabular-nums">{a.balanceAfter != null ? `Balance ${formatINR(a.balanceAfter)}` : a.id}</span>
                            <StatusPill status={a.status} />
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {filtered.length > visible && (
              <div className="mt-4 text-center">
                <button
                  onClick={() => setVisible((v) => v + PAGE_SIZE)}
                  className="rounded-full px-5 py-2 text-sm font-bold text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-500/10"
                >
                  Show {Math.min(PAGE_SIZE, filtered.length - visible)} more
                </button>
              </div>
            )}
          </>
        )}
      </section>
      </div>

      {gatewayAmount !== null && (
        <TopUpGatewayModal
          amount={gatewayAmount}
          defaultMethod={wallet.lastGatewayMethod}
          onClose={() => setGatewayAmount(null)}
          onDone={() => {
            setAmountText("");
            setTouched(false);
          }}
        />
      )}

      <TransactionDrawer
        key={openTxnId}
        item={openTxn}
        refund={openTxn?.refundId ? wallet.refunds.find((r) => r.id === openTxn.refundId) : null}
        onClose={() => setOpenTxnId(null)}
      />

      {refundOpen && (
        <RefundRequestModal balance={wallet.balance} pendingPassesTotal={pending.total} onClose={() => setRefundOpen(false)} />
      )}
    </div>
  );
}

function LowBalanceSetting({ threshold, low }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(threshold));

  if (editing) {
    return (
      <form
        className="mt-2 flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const v = parseAmount(draft);
          setLowBalanceThreshold(v);
          setEditing(false);
          toast.success(v ? `We'll alert you when balance drops below ${formatINR(v)}` : "Low-balance alert turned off");
        }}
      >
        <label className="text-xs text-stone-300" htmlFor="low-bal">Alert me below ₹</label>
        <input
          id="low-bal"
          autoFocus
          inputMode="numeric"
          value={draft}
          onChange={(e) => setDraft(e.target.value.replace(/[^\d]/g, ""))}
          className="w-24 rounded-lg bg-white/10 px-2 py-1 text-sm font-bold tabular-nums text-white outline-none ring-1 ring-white/20 focus:ring-amber-400"
        />
        <button type="submit" className="rounded-lg bg-amber-400 px-2.5 py-1 text-xs font-bold text-black">Save</button>
        <button type="button" onClick={() => setEditing(false)} className="text-xs text-stone-400 hover:text-white">Cancel</button>
      </form>
    );
  }

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm">
      {low && threshold > 0 && (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/15 px-2.5 py-0.5 font-bold text-amber-300">
          <AlertTriangle className="h-3.5 w-3.5" /> Below your {formatINR(threshold)} alert
        </span>
      )}
      <button
        onClick={() => {
          setDraft(String(threshold || ""));
          setEditing(true);
        }}
        className="inline-flex items-center gap-1 text-stone-300 underline-offset-2 hover:text-amber-300 hover:underline"
      >
        <Bell className="h-3.5 w-3.5" /> {threshold ? `Low-balance alert: ${formatINR(threshold)}` : "Set low-balance alert"}
      </button>
    </div>
  );
}

function PendingPaymentsCard({ passes, total, shortfall }) {
  const sorted = [...passes].sort((a, b) => a.validFrom.localeCompare(b.validFrom));
  const payable = sorted.filter((p) => !p.paymentPending);
  const confirming = sorted.length - payable.length;
  const shown = payable.slice(0, 4);

  return (
    <section className={cn(CARD, "p-6")}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-extrabold text-[#1f1f1f] dark:text-white">Awaiting payment</h2>
        {payable.length > 0 && (
          <span className="rounded-full bg-orange-100 dark:bg-orange-500/15 px-2.5 py-0.5 text-xs font-extrabold text-orange-700 dark:text-orange-300">
            {payable.length}
          </span>
        )}
      </div>

      {payable.length === 0 ? (
        <div className="mt-4 flex items-center gap-3 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 p-4">
          <PartyPopper className="h-5 w-5 shrink-0 text-emerald-600" />
          <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">All approved passes are paid.</p>
        </div>
      ) : (
        <>
          <ul className="mt-3 divide-y divide-stone-100 dark:divide-white/5">
            {shown.map((p) => {
              const Icon = p.kind === "vehicle" ? Truck : User;
              const urg = urgency(p);
              return (
                <li key={p.id} className="flex items-center gap-3 py-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-stone-100 dark:bg-white/5">
                    <Icon className="h-4 w-4 text-stone-600 dark:text-stone-300" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-[#1f1f1f] dark:text-white">{p.passType}</p>
                    <p className="truncate text-xs text-stone-500">{p.subject}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold tabular-nums text-[#1f1f1f] dark:text-white">{formatINR(priceBreakup(p.baseAmount).total)}</p>
                    {urg && <p className={cn("mt-0.5 inline-block rounded-full px-1.5 text-[10px] font-bold ring-1", urg.cls)}>{urg.label}</p>}
                  </div>
                </li>
              );
            })}
          </ul>
          {payable.length > shown.length && (
            <p className="text-xs text-stone-500">+ {payable.length - shown.length} more</p>
          )}

          <div className="mt-3 flex items-center justify-between border-t border-stone-100 dark:border-white/5 pt-3 text-sm">
            <span className="text-stone-500">Total due</span>
            <span className="font-extrabold tabular-nums text-[#1f1f1f] dark:text-white">{formatINR(total)}</span>
          </div>
          {shortfall > 0 && (
            <p className="mt-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
              Wallet short by {formatINR(shortfall)} — you can pay the rest by UPI at checkout.
            </p>
          )}
          <Link
            href="/dashboard/wallet/pay"
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1f1f1f] dark:bg-amber-400 py-3 text-sm font-bold text-white dark:text-black hover:opacity-90"
          >
            Review &amp; pay <ArrowRight className="h-4 w-4" />
          </Link>
        </>
      )}

      {confirming > 0 && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-stone-500">
          <Clock className="h-3.5 w-3.5 text-amber-600" /> {confirming} payment{confirming > 1 ? "s" : ""} waiting for bank confirmation
        </p>
      )}
    </section>
  );
}

function RefundRequestsCard({ refunds }) {
  const [expanded, setExpanded] = useState(null);
  const [cancelling, setCancelling] = useState(null);
  const shown = refunds.slice(0, 3);

  const cancel = async (id) => {
    setCancelling(id);
    try {
      await cancelRefund(id);
      toast.success("Refund request cancelled", { description: "The held amount is back in your wallet." });
    } catch (e) {
      toast.error(e.message);
    } finally {
      setCancelling(null);
    }
  };

  return (
    <section className={cn(CARD, "p-6")}>
      <h2 className="text-lg font-extrabold text-[#1f1f1f] dark:text-white">Refund requests</h2>
      <ul className="mt-3 space-y-3">
        {shown.map((r) => {
          const open = expanded === r.id || (expanded === null && r === shown[0]);
          const lastNote = [...r.timeline].reverse().find((t) => t.note)?.note;
          return (
            <li key={r.id} className="rounded-2xl ring-1 ring-stone-100 dark:ring-white/5 p-4">
              <button onClick={() => setExpanded(open ? "" : r.id)} className="flex w-full items-start justify-between gap-3 text-left" aria-expanded={open}>
                <div className="min-w-0">
                  <p className="font-extrabold tabular-nums text-[#1f1f1f] dark:text-white">{formatINR(r.amount)}</p>
                  <p className="text-xs text-stone-500">
                    <span className="font-mono">{r.id}</span> · {formatDateTime(r.requestedAt)}
                  </p>
                </div>
                <RefundStatusPill status={r.status} />
              </button>
              {open && (
                <div className="mt-4 space-y-3">
                  <RefundTracker refund={r} showHistory={false} />
                  {r.status === "REJECTED" && lastNote && (
                    <p className="rounded-xl bg-red-50 dark:bg-red-500/10 p-3 text-xs text-red-800 dark:text-red-300">
                      <span className="font-bold">Reason: </span>{lastNote}
                    </p>
                  )}
                  {r.status === "REFUNDED" && r.utr && (
                    <p className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 p-3 text-xs text-emerald-800 dark:text-emerald-300">
                      Paid to {r.bank.bankName} {r.bank.accountMasked.slice(-4)} · UTR <span className="font-mono">{r.utr}</span>
                    </p>
                  )}
                  {r.status === "SENT_TO_EBS" && (
                    <p className="flex items-center gap-1.5 text-xs text-sky-700 dark:text-sky-300">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Approved. EBS is processing payment to {r.bank.bankName} {r.bank.accountMasked.slice(-4)}.
                    </p>
                  )}
                  {r.status === "PENDING_TRAFFIC" && (
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-stone-500">Waiting for Traffic department review.</p>
                      <button
                        onClick={() => cancel(r.id)}
                        disabled={cancelling === r.id}
                        className="rounded-xl px-3 py-1.5 text-xs font-bold text-red-600 ring-1 ring-red-200 hover:bg-red-50 dark:ring-red-500/30 dark:hover:bg-red-500/10 disabled:opacity-50"
                      >
                        {cancelling === r.id ? "Cancelling…" : "Cancel request"}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {refunds.length > shown.length && <p className="mt-2 text-xs text-stone-500">+ {refunds.length - shown.length} older requests</p>}
    </section>
  );
}
