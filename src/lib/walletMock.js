"use client";

// UI-only dummy wallet store for the Wallet / Pay-for-passes / refund screens.
// No backend: state lives in memory and is mirrored to localStorage so it is
// shared between the applicant's wallet and the Traffic department's refund
// approvals (same browser), and syncs live across open tabs.

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "apacs_wallet_demo_v3";

export const GST_RATE = { cgst: 0.09, sgst: 0.09 };
export const TOPUP_LIMITS = { min: 100, max: 100000 };
export const QUICK_AMOUNTS = [500, 1000, 2000, 5000];
export const GATEWAY_METHODS = ["UPI", "Debit / Credit Card", "Net Banking"];
// SAC heading 9967: supporting services in transport (demo invoice only).
export const SAC_CODE = "9967";

export const CUSTOMER = {
  loginId: "190231026999",
  name: "S. Kailash",
  company: "Kailash Shipping Agencies Pvt Ltd",
  gstin: "33AABCK1234F1Z5",
  sapCustomerId: "1000234567",
  mobile: "9840011223",
  email: "accounts@kailashshipping.in",
  address: "No. 12, Rajaji Salai, Chennai – 600001, Tamil Nadu",
};

// Dates are relative to today so the demo always has realistic "starts tomorrow" passes.
const dayOffset = (days, time = "00:00") => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const [h, m] = time.split(":").map(Number);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};
const ymd = (days) => {
  // Local calendar date (toISOString would shift IST midnight to the previous UTC day).
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const pass = (id, passType, kind, subject, from, to, baseAmount, contact, extra = {}) => ({
  id,
  passType,
  kind,
  subject,
  validFrom: ymd(from),
  validTo: ymd(to),
  baseAmount,
  contact, // { name, mobile } — driver for vehicle passes, holder for person passes
  ...extra,
});

// Refunds are paid only to bank accounts registered with EBS for the customer.
export const BANK_ACCOUNTS = [
  { id: "B1", bankName: "HDFC Bank", accountMasked: "XXXX XXXX 4821", ifsc: "HDFC0000123", holder: "Kailash Shipping Agencies Pvt Ltd", primary: true },
  { id: "B2", bankName: "Indian Overseas Bank", accountMasked: "XXXX XXXX 0937", ifsc: "IOBA0000456", holder: "Kailash Shipping Agencies Pvt Ltd", primary: false },
];

export const REFUND_REASONS = [
  "Excess balance not required",
  "Wrong top-up amount",
  "Duplicate top-up",
  "Stopping operations at the port",
  "Other",
];

export const REFUND_LIMITS = { min: 100 };

/** Ordered workflow: applicant → Traffic dept → EBS (finance) → bank. */
export const REFUND_STEPS = [
  { key: "REQUESTED", label: "Requested" },
  { key: "TRAFFIC", label: "Traffic approval" },
  { key: "EBS", label: "Sent to EBS" },
  { key: "PAID", label: "Paid to bank" },
];

export const REFUND_STATUS = {
  PENDING_TRAFFIC: { label: "Pending Traffic approval", short: "Pending approval", step: 1 },
  SENT_TO_EBS: { label: "Approved · Processing in EBS", short: "With EBS", step: 2 },
  REFUNDED: { label: "Refunded to bank", short: "Refunded", step: 4 },
  REJECTED: { label: "Rejected by Traffic", short: "Rejected", step: 1 },
  CANCELLED: { label: "Cancelled by you", short: "Cancelled", step: 1 },
};

const EBS_PROCESSING_MS = 8000; // demo: EBS confirms the bank payment after a few seconds

const otherAgent = (company, loginId, gstin, sapCustomerId) => ({ company, loginId, gstin, sapCustomerId });

function seedRefunds() {
  const ev = (status, days, time, by, note) => ({ status, at: dayOffset(days, time), by, note });
  return [
    {
      id: "RF-2026-000118", agent: otherAgent("Coromandel Logistics Pvt Ltd", "190150926113", "33AACCC4521L1Z2", "1000231877"),
      amount: 25000, reason: "Stopping operations at the port", note: "Contract with liner ended; closing APACS wallet.",
      bank: { bankName: "State Bank of India", accountMasked: "XXXX XXXX 7710", ifsc: "SBIN0001234", holder: "Coromandel Logistics Pvt Ltd" },
      walletBalanceAtRequest: 25000, status: "PENDING_TRAFFIC", requestedAt: dayOffset(-2, "11:20"),
      timeline: [ev("REQUESTED", -2, "11:20", "Coromandel Logistics Pvt Ltd")],
    },
    {
      id: "RF-2026-000121", agent: otherAgent("Bay Line Shipping Agency", "190030826077", "33AAFCB7788K1Z9", "1000229014"),
      amount: 4800, reason: "Duplicate top-up", note: "Top-up TOP26101900044 was charged twice by the bank.",
      bank: { bankName: "ICICI Bank", accountMasked: "XXXX XXXX 3302", ifsc: "ICIC0000876", holder: "Bay Line Shipping Agency" },
      walletBalanceAtRequest: 9100, status: "PENDING_TRAFFIC", requestedAt: dayOffset(0, "09:05"),
      timeline: [ev("REQUESTED", 0, "09:05", "Bay Line Shipping Agency")],
    },
    {
      id: "RF-2026-000109", agent: otherAgent("Marina CFS Pvt Ltd", "190210726031", "33AADCM1290P1Z4", "1000225561"),
      amount: 12000, reason: "Excess balance not required", note: "",
      bank: { bankName: "Axis Bank", accountMasked: "XXXX XXXX 5521", ifsc: "UTIB0000321", holder: "Marina CFS Pvt Ltd" },
      walletBalanceAtRequest: 18450, status: "REFUNDED", requestedAt: dayOffset(-9, "15:40"),
      ebsRef: "EBS-RF-7712045", utr: "HDFCR52026101500918", ebsDocNo: "1900045512",
      timeline: [
        ev("REQUESTED", -9, "15:40", "Marina CFS Pvt Ltd"),
        ev("TRAFFIC_APPROVED", -8, "10:12", "R. Venkatesh (Traffic)", "Balance verified, no dues."),
        ev("SENT_TO_EBS", -8, "10:12", "APACS", "EBS request EBS-RF-7712045"),
        ev("REFUNDED", -6, "16:30", "EBS / SAP FICO", "UTR HDFCR52026101500918"),
      ],
    },
    {
      id: "RF-2026-000112", agent: otherAgent("Sri Balaji Transports", "190110826052", "33AAGFS3344M1Z1", "1000227390"),
      amount: 3000, reason: "Other", note: "Need funds for other expenses.",
      bank: { bankName: "Canara Bank", accountMasked: "XXXX XXXX 1188", ifsc: "CNRB0000654", holder: "S. Balaji" },
      walletBalanceAtRequest: 3200, status: "REJECTED", requestedAt: dayOffset(-6, "12:00"),
      timeline: [
        ev("REQUESTED", -6, "12:00", "Sri Balaji Transports"),
        ev("REJECTED", -5, "11:45", "R. Venkatesh (Traffic)", "Bank account holder name does not match the registered company. Please update bank details with EBS."),
      ],
    },
  ];
}

const PAID_10391 = pass("AP-2026-10391", "Daily Vehicle Pass", "vehicle", "TN 04 BZ 5512", -3, -3, 1000, { name: "K. Murugan", mobile: "9840012345" });
const PAID_10217 = pass("AP-2026-10217", "Daily Person Pass", "person", "A. Rahman", -12, -12, 500, { name: "A. Rahman", mobile: "9884455667" });
const PAID_10102 = pass("AP-2026-10102", "Weekly Person Pass", "person", "V. Lakshmi", -14, -8, 2000, { name: "V. Lakshmi", mobile: "9790011223" });

function buildInitialState() {
  return {
    balance: 7725,
    lowBalanceThreshold: 5000,
    lastGatewayMethod: "UPI",
    refunds: seedRefunds(),
    activity: [
      { id: "TOP26102200031", type: "TOPUP", description: "Wallet top-up", method: "UPI", amount: 5000, status: "SUCCESS", at: dayOffset(-1, "10:24") },
      { id: "TXN26102000077", type: "PASS_PAYMENT", description: "Pass payment · AP-2026-10391", method: "Wallet", amount: -1180, status: "SUCCESS", at: dayOffset(-3, "16:18"), passes: [PAID_10391], invoiceNo: "APX/2026-27/004812" },
      { id: "TOP26101800012", type: "TOPUP", description: "Wallet top-up", method: "Net Banking", amount: 2000, status: "FAILED", at: dayOffset(-5, "11:02"), failureReason: "Declined by bank" },
      { id: "TOP26101500009", type: "TOPUP", description: "Wallet top-up", method: "Debit / Credit Card", amount: 3000, status: "SUCCESS", at: dayOffset(-8, "09:41") },
      { id: "TXN26101100054", type: "PASS_PAYMENT", description: "Pass payment · AP-2026-10217", method: "Wallet", amount: -590, status: "SUCCESS", at: dayOffset(-12, "14:05"), passes: [PAID_10217], invoiceNo: "APX/2026-27/004655" },
      { id: "TXN26100800021", type: "PASS_PAYMENT", description: "Pass payment · AP-2026-10102", method: "Wallet", amount: -2360, status: "SUCCESS", at: dayOffset(-15, "12:30"), passes: [PAID_10102], invoiceNo: "APX/2026-27/004501" },
      { id: "TOP26100200004", type: "TOPUP", description: "Wallet top-up", method: "UPI", amount: 1000, status: "SUCCESS", at: dayOffset(-21, "17:55") },
    ],
    approvedPasses: [
      pass("AP-2026-10482", "Daily Vehicle Pass", "vehicle", "TN 09 AB 1234", 1, 1, 1000, { name: "P. Ganesan", mobile: "9876543210" }),
      pass("AP-2026-10487", "Weekly Vehicle Pass", "vehicle", "TN 22 CK 7781", 1, 7, 4500, { name: "S. Raja", mobile: "9944556677" }),
      pass("AP-2026-10490", "Daily Person Pass", "person", "R. Senthil Kumar", 2, 2, 250, { name: "R. Senthil Kumar", mobile: "9003344556" }),
      pass("AP-2026-10495", "Monthly Person Pass", "person", "M. Priya", 9, 38, 2500, { name: "M. Priya", mobile: "9123456780" }),
      // A gateway payment for this pass was started but the bank hasn't confirmed yet.
      pass("AP-2026-10479", "Daily Vehicle Pass", "vehicle", "TN 05 AR 9087", 1, 1, 1000, { name: "D. Prakash", mobile: "9500011122" }, { paymentPending: true }),
    ],
  };
}

const INITIAL_STATE = buildInitialState();
let state = INITIAL_STATE;
let hydrated = false;
const listeners = new Set();

function readStored() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? { ...INITIAL_STATE, ...JSON.parse(raw) } : null;
  } catch {
    return null; // ignore corrupt demo state
  }
}

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  state = readStored() || state;
  // Another tab (e.g. the Traffic user approving) changed the demo data.
  window.addEventListener("storage", (e) => {
    if (e.key !== STORAGE_KEY) return;
    state = readStored() || buildInitialState();
    listeners.forEach((l) => l());
  });
  // EBS confirms approved refunds after a short delay (survives reloads).
  setInterval(tickEbs, 2000);
}

function setState(updater) {
  state = { ...state, ...updater(state) };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable — keep in-memory */
  }
  listeners.forEach((l) => l());
}

function subscribe(listener) {
  hydrate();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  hydrate();
  return state;
}

export function useWallet() {
  return useSyncExternalStore(subscribe, getSnapshot, () => INITIAL_STATE);
}

export function resetWalletDemo() {
  setState(() => buildInitialState());
}

export function setLowBalanceThreshold(value) {
  setState(() => ({ lowBalanceThreshold: value }));
}

// ── Helpers ────────────────────────────────────────────────────────────────

const pad = (n, len = 2) => String(n).padStart(len, "0");

function makeRef(prefix) {
  const d = new Date();
  return `${prefix}${String(d.getFullYear()).slice(2)}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(Math.floor(Math.random() * 100000), 5)}`;
}

function makeInvoiceNo() {
  const d = new Date();
  const fyStart = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1; // Indian FY starts April
  return `APX/${fyStart}-${String(fyStart + 1).slice(2)}/${pad(4800 + Math.floor(Math.random() * 1000), 6)}`;
}

export const round2 = (n) => Math.round(n * 100) / 100;

export function priceBreakup(baseAmount) {
  const cgst = round2(baseAmount * GST_RATE.cgst);
  const sgst = round2(baseAmount * GST_RATE.sgst);
  return { base: baseAmount, cgst, sgst, total: round2(baseAmount + cgst + sgst) };
}

export function sumBreakup(passes) {
  return passes.reduce(
    (acc, p) => {
      const b = priceBreakup(p.baseAmount);
      return { base: acc.base + b.base, cgst: acc.cgst + b.cgst, sgst: acc.sgst + b.sgst, total: round2(acc.total + b.total) };
    },
    { base: 0, cgst: 0, sgst: 0, total: 0 },
  );
}

/** Attaches the wallet balance after each entry (newest first), bank-statement style. */
/** Whether an activity entry has moved the available balance (refund holds do, while pending). */
export const affectsBalance = (a) => a.status === "SUCCESS" || (a.type === "REFUND" && a.status === "PENDING");

export function withRunningBalance(activity, currentBalance) {
  let bal = currentBalance;
  return activity.map((a) => {
    const counts = affectsBalance(a);
    const row = { ...a, balanceAfter: counts ? bal : null };
    if (counts) bal = round2(bal - a.amount);
    return row;
  });
}

export const formatINR = (value, { sign = false } = {}) => {
  const abs = Math.abs(value).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (!sign) return `₹${abs}`;
  return `${value < 0 ? "−" : "+"} ₹${abs}`;
};

export const formatDateTime = (iso) =>
  new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true });

export const formatTime = (iso) => new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });

export const formatDate = (iso) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

export const maskMobile = (m) => `+91 ••••• ${String(m).slice(-5)}`;

export const maskEmail = (e) => {
  const [user, domain] = String(e).split("@");
  return `${user.slice(0, 2)}${"•".repeat(Math.max(user.length - 2, 3))}@${domain}`;
};

/** Days from today (local) until the given yyyy-mm-dd. */
export function daysUntil(ymdStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [y, m, d] = ymdStr.split("-").map(Number);
  return Math.round((new Date(y, m - 1, d) - today) / 86400000);
}

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Simulated actions ──────────────────────────────────────────────────────

/**
 * Simulates a gateway round-trip. Wallet is credited only on success.
 * outcome: "success" | "failed" | "pending" (pending confirms itself after a few seconds).
 */
export async function simulateTopUp(amount, method, outcome = "success") {
  await delay(1400);
  const status = outcome === "failed" ? "FAILED" : outcome === "pending" ? "PENDING" : "SUCCESS";
  const entry = {
    id: makeRef("TOP"),
    type: "TOPUP",
    description: "Wallet top-up",
    method,
    amount,
    status,
    at: new Date().toISOString(),
    ...(status === "FAILED" ? { failureReason: "Declined by bank" } : {}),
  };
  setState((s) => ({
    balance: status === "SUCCESS" ? round2(s.balance + amount) : s.balance,
    lastGatewayMethod: method,
    activity: [entry, ...s.activity],
  }));
  if (status === "PENDING") {
    setTimeout(() => {
      setState((s) => ({
        balance: round2(s.balance + amount),
        activity: s.activity.map((a) => (a.id === entry.id ? { ...a, status: "SUCCESS" } : a)),
      }));
    }, 8000);
  }
  return entry;
}

/**
 * Simulates paying for approved passes.
 * method: "wallet" | "ecash" | "split" (wallet balance first, remainder via gateway).
 */
export async function simulatePassPayment(passIds, method, gatewayMethod) {
  await delay(1400);
  const passes = state.approvedPasses.filter((p) => passIds.includes(p.id) && !p.paymentPending);
  const totals = sumBreakup(passes);
  const walletPaid = method === "wallet" ? totals.total : method === "split" ? Math.min(state.balance, totals.total) : 0;
  const gatewayPaid = round2(totals.total - walletPaid);
  if (walletPaid > state.balance) throw new Error("Insufficient wallet balance");

  const txnId = `APW-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${pad(Math.floor(Math.random() * 1000000), 6)}`;
  const at = new Date().toISOString();
  const invoiceNo = makeInvoiceNo();
  const methodLabel =
    method === "wallet" ? "APACS Wallet" : method === "ecash" ? `E-Cash · ${gatewayMethod}` : `Wallet + ${gatewayMethod}`;

  setState((s) => ({
    balance: round2(s.balance - walletPaid),
    lastGatewayMethod: method === "wallet" ? s.lastGatewayMethod : gatewayMethod,
    approvedPasses: s.approvedPasses.filter((p) => !passIds.includes(p.id)),
    activity: [
      {
        id: txnId,
        type: "PASS_PAYMENT",
        description: `Pass payment · ${passes.map((p) => p.id).join(", ")}`,
        method: method === "wallet" ? "Wallet" : method === "ecash" ? `E-Cash (${gatewayMethod})` : `Wallet + ${gatewayMethod}`,
        // Only the wallet share moves the wallet balance; the full amount is kept for the record.
        amount: method === "ecash" ? 0 : -walletPaid,
        totalPaid: totals.total,
        gatewayPaid,
        status: "SUCCESS",
        at,
        passes,
        invoiceNo,
      },
      ...s.activity,
    ],
  }));
  return { txnId, at, invoiceNo, methodLabel, method, gatewayMethod, passes, totals, walletPaid, gatewayPaid, balanceAfter: state.balance };
}

// ── Refunds ────────────────────────────────────────────────────────────────

const isMine = (r) => r.agent.loginId === CUSTOMER.loginId;
export const myRefunds = (refunds) => refunds.filter(isMine);
export const OPEN_REFUND_STATUSES = ["PENDING_TRAFFIC", "SENT_TO_EBS"];
export const amountOnHold = (refunds) =>
  myRefunds(refunds).filter((r) => OPEN_REFUND_STATUSES.includes(r.status)).reduce((s, r) => s + r.amount, 0);

function makeRefundId(refunds) {
  const max = refunds.reduce((m, r) => Math.max(m, Number(r.id.split("-").pop()) || 0), 0);
  return `RF-${new Date().getFullYear()}-${pad(max + 1, 6)}`;
}

const setRefund = (id, fn) => (s) => ({ refunds: s.refunds.map((r) => (r.id === id ? fn(r) : r)) });

/** Applicant: request a refund. The amount is put on hold immediately. */
export async function requestRefund({ amount, reason, note, bankId }) {
  await delay(900);
  if (amount > state.balance) throw new Error("Amount is more than your available balance");
  if (myRefunds(state.refunds).some((r) => r.status === "PENDING_TRAFFIC")) throw new Error("You already have a refund awaiting approval");
  const bank = BANK_ACCOUNTS.find((b) => b.id === bankId) || BANK_ACCOUNTS[0];
  const at = new Date().toISOString();
  const refund = {
    id: makeRefundId(state.refunds),
    agent: { company: CUSTOMER.company, loginId: CUSTOMER.loginId, gstin: CUSTOMER.gstin, sapCustomerId: CUSTOMER.sapCustomerId },
    amount,
    reason,
    note,
    bank: { bankName: bank.bankName, accountMasked: bank.accountMasked, ifsc: bank.ifsc, holder: bank.holder },
    walletBalanceAtRequest: state.balance,
    status: "PENDING_TRAFFIC",
    requestedAt: at,
    timeline: [{ status: "REQUESTED", at, by: CUSTOMER.company }],
  };
  setState((s) => ({
    balance: round2(s.balance - amount),
    refunds: [refund, ...s.refunds],
    activity: [
      { id: refund.id, type: "REFUND", description: `Refund request · ${refund.id}`, method: `To ${bank.bankName} ${bank.accountMasked.slice(-4)}`, amount: -amount, status: "PENDING", at, refundId: refund.id },
      ...s.activity,
    ],
  }));
  return refund;
}

/** Releases a held refund amount back to the wallet (rejected / cancelled). */
function releaseHold(s, refund, label) {
  if (!isMine(refund)) return {};
  return {
    balance: round2(s.balance + refund.amount),
    activity: s.activity.map((a) =>
      a.refundId === refund.id ? { ...a, status: "REVERSED", description: `Refund ${label} · ${refund.id}` } : a,
    ),
  };
}

export async function cancelRefund(id) {
  await delay(500);
  const r = state.refunds.find((x) => x.id === id);
  if (!r || r.status !== "PENDING_TRAFFIC") throw new Error("This request can no longer be cancelled");
  const at = new Date().toISOString();
  setState((s) => ({
    ...setRefund(id, (x) => ({ ...x, status: "CANCELLED", timeline: [...x.timeline, { status: "CANCELLED", at, by: CUSTOMER.company }] }))(s),
    ...releaseHold(s, r, "cancelled"),
  }));
}

/** Traffic department: approve → forwarded to EBS for payment. */
export async function approveRefund(id, { by, remarks }) {
  await delay(900);
  const at = new Date().toISOString();
  const ebsRef = `EBS-RF-${Math.floor(7000000 + Math.random() * 999999)}`;
  setState(
    setRefund(id, (r) => ({
      ...r,
      status: "SENT_TO_EBS",
      ebsRef,
      ebsDueAt: Date.now() + EBS_PROCESSING_MS,
      timeline: [
        ...r.timeline,
        { status: "TRAFFIC_APPROVED", at, by, note: remarks || "" },
        { status: "SENT_TO_EBS", at, by: "APACS", note: `EBS request ${ebsRef}` },
      ],
    })),
  );
  return ebsRef;
}

export async function rejectRefund(id, { by, remarks }) {
  await delay(700);
  const r = state.refunds.find((x) => x.id === id);
  const at = new Date().toISOString();
  setState((s) => ({
    ...setRefund(id, (x) => ({ ...x, status: "REJECTED", timeline: [...x.timeline, { status: "REJECTED", at, by, note: remarks }] }))(s),
    ...releaseHold(s, r, "rejected"),
  }));
}

/** Simulated EBS / SAP FICO callback: pays approved refunds to the bank. */
function tickEbs() {
  const due = state.refunds.filter((r) => r.status === "SENT_TO_EBS" && r.ebsDueAt && r.ebsDueAt <= Date.now());
  if (!due.length) return;
  const at = new Date().toISOString();
  setState((s) => ({
    refunds: s.refunds.map((r) => {
      if (!due.some((d) => d.id === r.id)) return r;
      const utr = `HDFCR5${Date.now().toString().slice(-13)}`;
      return {
        ...r,
        status: "REFUNDED",
        utr,
        ebsDocNo: String(1900000000 + Math.floor(Math.random() * 99999)),
        timeline: [...r.timeline, { status: "REFUNDED", at, by: "EBS / SAP FICO", note: `UTR ${utr}` }],
      };
    }),
    activity: s.activity.map((a) =>
      due.some((d) => d.id === a.refundId) && a.status === "PENDING"
        ? { ...a, status: "SUCCESS", description: `Refund to bank · ${a.refundId}` }
        : a,
    ),
  }));
}
