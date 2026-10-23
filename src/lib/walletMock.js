"use client";

// UI-only dummy wallet store for the Wallet / Pay-for-passes screens.
// No backend: state lives in memory and is mirrored to sessionStorage so the
// balance carries across /dashboard/wallet and /dashboard/wallet/pay.

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "apacs_wallet_demo_v2";

export const GST_RATE = { cgst: 0.09, sgst: 0.09 };
export const TOPUP_LIMITS = { min: 100, max: 100000 };
export const QUICK_AMOUNTS = [500, 1000, 2000, 5000];
export const GATEWAY_METHODS = ["UPI", "Debit / Credit Card", "Net Banking"];
// SAC heading 9967: supporting services in transport (demo invoice only).
export const SAC_CODE = "9967";

export const CUSTOMER = {
  name: "S. Kailash",
  company: "Kailash Shipping Agencies Pvt Ltd",
  gstin: "33AABCK1234F1Z5",
  sapCustomerId: "1000234567",
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

const PAID_10391 = pass("AP-2026-10391", "Daily Vehicle Pass", "vehicle", "TN 04 BZ 5512", -3, -3, 1000, { name: "K. Murugan", mobile: "9840012345" });
const PAID_10217 = pass("AP-2026-10217", "Daily Person Pass", "person", "A. Rahman", -12, -12, 500, { name: "A. Rahman", mobile: "9884455667" });
const PAID_10102 = pass("AP-2026-10102", "Weekly Person Pass", "person", "V. Lakshmi", -14, -8, 2000, { name: "V. Lakshmi", mobile: "9790011223" });

function buildInitialState() {
  return {
    balance: 7725,
    lowBalanceThreshold: 5000,
    lastGatewayMethod: "UPI",
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

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (raw) state = { ...INITIAL_STATE, ...JSON.parse(raw) };
  } catch {
    /* ignore corrupt demo state */
  }
}

function setState(updater) {
  state = { ...state, ...updater(state) };
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable — keep in-memory */
  }
  listeners.forEach((l) => l());
}

function subscribe(listener) {
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
export function withRunningBalance(activity, currentBalance) {
  let bal = currentBalance;
  return activity.map((a) => {
    const row = { ...a, balanceAfter: a.status === "SUCCESS" ? bal : null };
    if (a.status === "SUCCESS") bal = round2(bal - a.amount);
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
