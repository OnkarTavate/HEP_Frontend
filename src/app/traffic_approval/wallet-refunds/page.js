"use client";

import { useMemo, useState, useEffect } from "react";
import {
  Search,
  X,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  AlertCircle,
  Landmark,
  Building2,
  Clock,
  Send,
  Inbox,
  ChevronRight,
  ShieldCheck,
  BadgeIndianRupee,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useWallet, approveRefund, rejectRefund, formatINR, formatDateTime } from "@/lib/walletMock";
import { CARD, RefundStatusPill, RefundTracker } from "@/components/wallet/WalletUI";

const TABS = [
  { key: "PENDING_TRAFFIC", label: "Awaiting approval" },
  { key: "SENT_TO_EBS", label: "With EBS" },
  { key: "REFUNDED", label: "Refunded" },
  { key: "REJECTED", label: "Rejected" },
  { key: "all", label: "All" },
];

const REJECT_TEMPLATES = [
  "Bank account holder name does not match the registered company.",
  "Outstanding penalties / dues must be cleared first.",
  "Insufficient supporting details. Please resubmit with more information.",
];

const SLA_DAYS = 2;

const ageDays = (iso) => Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
const ageLabel = (iso) => {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${Math.max(mins, 1)} min ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)} h ago`;
  const d = Math.floor(mins / 1440);
  return `${d} day${d > 1 ? "s" : ""} ago`;
};

function currentOfficer() {
  try {
    const u = JSON.parse(localStorage.getItem("user") || "{}");
    const name = u.name || u.fullName || u.username || "Traffic Officer";
    return `${name} (Traffic)`;
  } catch {
    return "Traffic Officer (Traffic)";
  }
}

export default function WalletRefundApprovalsPage() {
  const { refunds } = useWallet();
  const [tab, setTab] = useState("PENDING_TRAFFIC");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState(null);

  const stats = useMemo(() => {
    const by = (st) => refunds.filter((r) => r.status === st);
    const sum = (list) => list.reduce((s, r) => s + r.amount, 0);
    const now = new Date();
    const refundedThisMonth = by("REFUNDED").filter((r) => {
      const d = new Date(r.timeline.at(-1).at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    return {
      pending: { count: by("PENDING_TRAFFIC").length, amount: sum(by("PENDING_TRAFFIC")), overdue: by("PENDING_TRAFFIC").filter((r) => ageDays(r.requestedAt) >= SLA_DAYS).length },
      ebs: { count: by("SENT_TO_EBS").length, amount: sum(by("SENT_TO_EBS")) },
      refunded: { count: refundedThisMonth.length, amount: sum(refundedThisMonth) },
      rejected: { count: by("REJECTED").length },
    };
  }, [refunds]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return refunds
      .filter((r) => (tab === "all" ? r.status !== "CANCELLED" : r.status === tab))
      .filter((r) => !q || [r.id, r.agent.company, r.agent.loginId, r.agent.gstin].some((v) => v.toLowerCase().includes(q)))
      .sort((a, b) => (tab === "PENDING_TRAFFIC" ? a.requestedAt.localeCompare(b.requestedAt) : b.requestedAt.localeCompare(a.requestedAt)));
  }, [refunds, tab, query]);

  const open = refunds.find((r) => r.id === openId) || null;

  const STAT_TILES = [
    { key: "PENDING_TRAFFIC", label: "Awaiting your approval", value: stats.pending.count, sub: formatINR(stats.pending.amount), icon: Clock, tone: "text-amber-600 bg-amber-50 dark:bg-amber-500/10", extra: stats.pending.overdue ? `${stats.pending.overdue} overdue` : null },
    { key: "SENT_TO_EBS", label: "With EBS for payment", value: stats.ebs.count, sub: formatINR(stats.ebs.amount), icon: Send, tone: "text-sky-600 bg-sky-50 dark:bg-sky-500/10" },
    { key: "REFUNDED", label: "Refunded this month", value: stats.refunded.count, sub: formatINR(stats.refunded.amount), icon: CheckCircle2, tone: "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10" },
    { key: "REJECTED", label: "Rejected", value: stats.rejected.count, sub: "All time", icon: XCircle, tone: "text-red-600 bg-red-50 dark:bg-red-500/10" },
  ];

  return (
    <div className="w-full py-2 space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1f1f1f] dark:text-white">Wallet Refund Requests</h1>
          <p className="text-sm sm:text-base text-stone-500 dark:text-stone-400 mt-1">
            Review companies&apos; wallet refund requests. Approved requests are sent to EBS, which pays the company&apos;s bank account.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
          <AlertCircle className="h-3.5 w-3.5" /> Demo data · UI only
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {STAT_TILES.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(CARD, "p-5 text-left transition-shadow hover:shadow-md", tab === t.key && "ring-2 ring-amber-400 dark:ring-amber-400")}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-semibold text-stone-500 dark:text-stone-400">{t.label}</p>
              <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl", t.tone)}>
                <t.icon className="h-5 w-5" />
              </span>
            </div>
            <p className="mt-1 text-3xl font-extrabold tabular-nums text-[#1f1f1f] dark:text-white">{t.value}</p>
            <p className="text-sm font-semibold tabular-nums text-stone-500">
              {t.sub}
              {t.extra && <span className="ml-2 rounded-full bg-red-50 px-2 py-0.5 text-xs font-bold text-red-700 dark:bg-red-500/10 dark:text-red-300">{t.extra}</span>}
            </p>
          </button>
        ))}
      </div>

      {/* List */}
      <section className={cn(CARD, "@container p-5 sm:p-6")}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Refund status">
            {TABS.map((t) => (
              <button
                key={t.key}
                role="tab"
                aria-selected={tab === t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  "rounded-full px-4 py-1.5 text-sm font-bold transition-colors",
                  tab === t.key
                    ? "bg-[#1f1f1f] text-white dark:bg-amber-400 dark:text-black"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-white/5 dark:text-stone-300 dark:hover:bg-white/10",
                )}
              >
                {t.label}
                {t.key === "PENDING_TRAFFIC" && stats.pending.count > 0 && (
                  <span className="ml-1.5 rounded-full bg-amber-400 px-1.5 text-xs text-black">{stats.pending.count}</span>
                )}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search company, login ID, GSTIN, request ID"
              aria-label="Search refund requests"
              className="w-full rounded-xl bg-stone-50 dark:bg-white/5 ring-1 ring-stone-200 dark:ring-white/10 py-2.5 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-amber-400 dark:text-white"
            />
          </div>
        </div>

        {list.length === 0 ? (
          <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-dashed border-stone-200 dark:border-white/10 py-14 text-center">
            <Inbox className="h-8 w-8 text-stone-300" />
            <p className="mt-2 text-sm font-semibold text-stone-500">
              {tab === "PENDING_TRAFFIC" && !query ? "No refund requests waiting for approval." : "No refund requests match."}
            </p>
          </div>
        ) : (
          <>
            {/* Table */}
            <div className="mt-5 hidden @min-[900px]:block overflow-hidden rounded-2xl ring-1 ring-stone-100 dark:ring-white/5">
              <table className="w-full text-sm">
                <thead className="bg-stone-50 dark:bg-white/5 text-left text-xs font-bold uppercase tracking-wider text-stone-500">
                  <tr>
                    <th className="px-5 py-3">Company</th>
                    <th className="px-5 py-3">Request</th>
                    <th className="px-5 py-3 text-right">Amount</th>
                    <th className="px-5 py-3">Reason</th>
                    <th className="px-5 py-3">Refund to</th>
                    <th className="px-5 py-3">Requested</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-white/5">
                  {list.map((r) => {
                    const overdue = r.status === "PENDING_TRAFFIC" && ageDays(r.requestedAt) >= SLA_DAYS;
                    return (
                      <tr key={r.id} className="cursor-pointer hover:bg-amber-50/40 dark:hover:bg-white/[0.03]" onClick={() => setOpenId(r.id)}>
                        <td className="px-5 py-3.5">
                          <p className="font-bold text-[#1f1f1f] dark:text-white">{r.agent.company}</p>
                          <p className="font-mono text-xs text-stone-500">{r.agent.loginId}</p>
                        </td>
                        <td className="px-5 py-3.5 font-mono text-xs text-stone-600 dark:text-stone-300">{r.id}</td>
                        <td className="px-5 py-3.5 text-right font-extrabold tabular-nums text-[#1f1f1f] dark:text-white">{formatINR(r.amount)}</td>
                        <td className="px-5 py-3.5 max-w-[220px]">
                          <p className="truncate text-stone-700 dark:text-stone-200">{r.reason}</p>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-stone-600 dark:text-stone-300">
                          {r.bank.bankName}
                          <span className="block font-mono text-stone-500">{r.bank.accountMasked}</span>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <p className="text-stone-600 dark:text-stone-300">{ageLabel(r.requestedAt)}</p>
                          {overdue && <p className="text-xs font-bold text-red-600">Overdue</p>}
                        </td>
                        <td className="px-5 py-3.5"><RefundStatusPill status={r.status} /></td>
                        <td className="px-5 py-3.5 text-right">
                          <span className={cn("inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold", r.status === "PENDING_TRAFFIC" ? "bg-[#1f1f1f] text-white dark:bg-amber-400 dark:text-black" : "text-stone-600 dark:text-stone-300")}>
                            {r.status === "PENDING_TRAFFIC" ? "Review" : "View"} <ChevronRight className="h-3.5 w-3.5" />
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Cards */}
            <ul className="mt-5 grid gap-3 @min-[560px]:grid-cols-2 @min-[900px]:hidden">
              {list.map((r) => (
                <li key={r.id}>
                  <button onClick={() => setOpenId(r.id)} className="w-full rounded-2xl ring-1 ring-stone-100 dark:ring-white/5 p-4 text-left hover:bg-stone-50 dark:hover:bg-white/[0.03]">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-bold text-[#1f1f1f] dark:text-white">{r.agent.company}</p>
                        <p className="font-mono text-xs text-stone-500">{r.id}</p>
                      </div>
                      <p className="font-extrabold tabular-nums text-[#1f1f1f] dark:text-white">{formatINR(r.amount)}</p>
                    </div>
                    <p className="mt-2 truncate text-sm text-stone-600 dark:text-stone-300">{r.reason}</p>
                    <div className="mt-3 flex items-center justify-between text-xs text-stone-500">
                      <span>{ageLabel(r.requestedAt)}</span>
                      <RefundStatusPill status={r.status} />
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <ReviewDrawer key={openId} refund={open} onClose={() => setOpenId(null)} />
    </div>
  );
}

function ReviewDrawer({ refund, onClose }) {
  const [remarks, setRemarks] = useState("");
  const [confirm, setConfirm] = useState(null); // "approve" | "reject"
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!refund) return;
    const onKey = (e) => e.key === "Escape" && !busy && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [refund, busy, onClose]);

  if (!refund) return null;

  const pending = refund.status === "PENDING_TRAFFIC";
  const nameMatches = refund.bank.holder.trim().toLowerCase() === refund.agent.company.trim().toLowerCase();
  const checks = [
    { ok: refund.amount <= refund.walletBalanceAtRequest, label: `Amount within wallet balance at request (${formatINR(refund.walletBalanceAtRequest)})` },
    { ok: nameMatches, label: nameMatches ? "Bank account holder matches company name" : `Account holder "${refund.bank.holder}" differs from company name` },
    { ok: true, label: "Bank account verified with EBS" },
    { ok: true, label: "No unpaid penalties or overstay dues" },
  ];
  const rejectNeedsRemarks = confirm === "reject" && remarks.trim().length < 5;

  const decide = async () => {
    if (confirm === "reject" && rejectNeedsRemarks) return setTouched(true);
    setBusy(true);
    try {
      if (confirm === "approve") {
        const ebsRef = await approveRefund(refund.id, { by: currentOfficer(), remarks: remarks.trim() });
        toast.success(`Approved and sent to EBS`, { description: `${refund.id} · EBS request ${ebsRef}` });
      } else {
        await rejectRefund(refund.id, { by: currentOfficer(), remarks: remarks.trim() });
        toast.success(`Refund ${refund.id} rejected`, { description: "The company has been notified and the amount released to their wallet." });
      }
      setConfirm(null);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex justify-end" role="dialog" aria-modal="true" aria-labelledby="review-title">
      <button aria-label="Close" onClick={() => !busy && onClose()} className="absolute inset-0 bg-black/40 backdrop-blur-[2px] animate-in fade-in" />
      <aside className="relative flex h-full w-full max-w-xl flex-col bg-white dark:bg-[#1f232d] shadow-2xl animate-in slide-in-from-right-10 duration-200">
        <div className="flex items-start justify-between gap-3 border-b border-stone-100 dark:border-white/5 px-6 py-5">
          <div className="min-w-0">
            <p className="font-mono text-xs text-stone-500">{refund.id}</p>
            <h2 id="review-title" className="truncate text-xl font-extrabold text-[#1f1f1f] dark:text-white">{refund.agent.company}</h2>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="text-2xl font-extrabold tabular-nums text-[#1f1f1f] dark:text-white">{formatINR(refund.amount)}</span>
              <RefundStatusPill status={refund.status} long />
            </div>
          </div>
          <button onClick={() => !busy && onClose()} aria-label="Close" className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-white/10">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          <RefundTracker refund={refund} />

          <Block title="Request">
            <Row label="Reason">{refund.reason}</Row>
            {refund.note && <Row label="Company's note"><span className="font-normal">{refund.note}</span></Row>}
            <Row label="Requested">{formatDateTime(refund.requestedAt)}</Row>
          </Block>

          <Block title="Pay-out bank account" icon={Landmark}>
            <Row label="Bank">{refund.bank.bankName}</Row>
            <Row label="Account"><span className="font-mono">{refund.bank.accountMasked}</span></Row>
            <Row label="IFSC"><span className="font-mono">{refund.bank.ifsc}</span></Row>
            <Row label="Account holder">{refund.bank.holder}</Row>
          </Block>

          <Block title="Company" icon={Building2}>
            <Row label="Login ID"><span className="font-mono">{refund.agent.loginId}</span></Row>
            <Row label="GSTIN"><span className="font-mono">{refund.agent.gstin}</span></Row>
            <Row label="SAP Customer ID (EBS)"><span className="font-mono">{refund.agent.sapCustomerId}</span></Row>
          </Block>

          <Block title="Checks" icon={ShieldCheck}>
            <ul className="space-y-2 py-1">
              {checks.map((c) => (
                <li key={c.label} className="flex items-start gap-2 text-sm">
                  {c.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />}
                  <span className={c.ok ? "text-stone-700 dark:text-stone-200" : "font-semibold text-amber-800 dark:text-amber-300"}>{c.label}</span>
                </li>
              ))}
            </ul>
          </Block>

          {refund.ebsRef && (
            <Block title="EBS" icon={BadgeIndianRupee}>
              <Row label="EBS request"><span className="font-mono">{refund.ebsRef}</span></Row>
              {refund.ebsDocNo && <Row label="SAP document no."><span className="font-mono">{refund.ebsDocNo}</span></Row>}
              {refund.utr && <Row label="Bank UTR"><span className="font-mono">{refund.utr}</span></Row>}
              {refund.status === "SENT_TO_EBS" && (
                <p className="flex items-center gap-1.5 py-2 text-xs text-sky-700 dark:text-sky-300">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Waiting for EBS to confirm the bank payment…
                </p>
              )}
            </Block>
          )}

          {pending && (
            <div>
              <label htmlFor="remarks" className="mb-2 block text-sm font-bold text-stone-600 dark:text-stone-300">
                Remarks <span className="font-normal text-stone-400">(required to reject, shared with the company)</span>
              </label>
              <textarea
                id="remarks"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={3}
                placeholder="Add a note for the company and EBS"
                className={cn(
                  "w-full rounded-2xl bg-white dark:bg-[#1a1d27] px-4 py-3 text-sm outline-none ring-1 focus:ring-2 dark:text-white",
                  touched && rejectNeedsRemarks ? "ring-red-400" : "ring-stone-200 dark:ring-white/10 focus:ring-amber-400",
                )}
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {REJECT_TEMPLATES.map((t) => (
                  <button key={t} onClick={() => setRemarks(t)} className="rounded-full bg-stone-100 dark:bg-white/5 px-2.5 py-1 text-xs text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-white/10">
                    {t.length > 48 ? `${t.slice(0, 46)}…` : t}
                  </button>
                ))}
              </div>
              {touched && rejectNeedsRemarks && <p className="mt-1.5 text-xs font-medium text-red-600">Please add a reason for rejecting.</p>}
            </div>
          )}
        </div>

        {pending && (
          <div className="border-t border-stone-100 dark:border-white/5 px-6 py-4">
            {confirm ? (
              <div className="space-y-3">
                <p className="text-sm text-stone-700 dark:text-stone-200">
                  {confirm === "approve" ? (
                    <>Approve <strong>{formatINR(refund.amount)}</strong> for {refund.agent.company}? It will be sent to <strong>EBS</strong> for payment to {refund.bank.bankName} {refund.bank.accountMasked.slice(-4)}.</>
                  ) : (
                    <>Reject this request? The held {formatINR(refund.amount)} goes back to the company&apos;s wallet.</>
                  )}
                </p>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setConfirm(null)} disabled={busy} className="rounded-2xl px-4 py-2.5 text-sm font-bold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-white/5">
                    Back
                  </button>
                  <button
                    onClick={decide}
                    disabled={busy}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60",
                      confirm === "approve" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700",
                    )}
                  >
                    {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                    {confirm === "approve" ? "Yes, approve & send to EBS" : "Yes, reject"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirm("reject")}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold text-red-600 ring-1 ring-red-200 hover:bg-red-50 dark:ring-red-500/30 dark:hover:bg-red-500/10"
                >
                  <XCircle className="h-4 w-4" /> Reject
                </button>
                <button
                  onClick={() => setConfirm("approve")}
                  className="inline-flex flex-[2] items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700"
                >
                  <CheckCircle2 className="h-4 w-4" /> Approve & send to EBS
                </button>
              </div>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}

function Block({ title, icon: Icon, children }) {
  return (
    <div>
      <p className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-stone-500">
        {Icon && <Icon className="h-3.5 w-3.5" />} {title}
      </p>
      <dl className="divide-y divide-stone-100 dark:divide-white/5 text-sm">{children}</dl>
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <dt className="shrink-0 text-stone-500 dark:text-stone-400">{label}</dt>
      <dd className="text-right font-semibold text-[#1f1f1f] dark:text-white">{children}</dd>
    </div>
  );
}
