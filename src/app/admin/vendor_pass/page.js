"use client";

/**
 * Vendor Pass admin page
 * ──────────────────────────────────────────────────────────────────────
 * Sits at /admin/vendor_pass and is gated by the parent admin layout
 * (Admin OR any Approval department user).
 *
 * Two tabs:
 *   • Create — intake form matching the "Vendor Or Contractors" screenshot
 *   • List   — Vendor Pass List matching the second screenshot
 *
 * Department name for each intake is taken from the logged-in user's department,
 * so EDP users create EDP vendor passes, Traffic users create Traffic vendor passes, etc.
 */

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  createIntake,
  getVisitorTypes,
  getVisitPurposes,
  listIntakes,
  resendLink,
  revokeIntake,
} from "@/lib/vendorPassApi";
import {
  ClipboardList,
  FileText,
  Plus,
  RefreshCcw,
  Search,
  Copy,
  Send,
  XCircle,
  Loader2,
} from "lucide-react";

/* ──────────────────────────────────────────────────────────────────────
   Small reusable presentational helpers (no shadcn deps)
   ────────────────────────────────────────────────────────────────────── */

const Label = ({ children, required }) => (
  <label className="block text-xs font-medium text-slate-700 mb-1">
    {children}
    {required ? <span className="text-rose-500 ml-0.5">*</span> : null}
  </label>
);

const inputCls =
  "w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-sm focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 disabled:bg-slate-100 disabled:text-slate-500";

const textareaCls =
  "w-full px-3 py-2 rounded-md border border-slate-300 bg-white text-sm focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100";

const fmtDateTime = (iso) => {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const fmtDate = (iso) => (iso ? iso.slice(0, 10) : "-");

const todayISO = () => new Date().toISOString().slice(0, 10);

const STATUS_STYLES = {
  LINK_SENT: "bg-blue-50 text-blue-700 border-blue-200",
  VENDOR_SUBMITTED: "bg-amber-50 text-amber-700 border-amber-200",
  APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  REJECTED: "bg-rose-50 text-rose-700 border-rose-200",
  EXPIRED: "bg-slate-100 text-slate-600 border-slate-200",
  REVOKED: "bg-slate-200 text-slate-700 border-slate-300",
};

const StatusBadge = ({ status }) => (
  <span
    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
      STATUS_STYLES[status] || "bg-slate-100 text-slate-700 border-slate-200"
    }`}
  >
    {status?.replace(/_/g, " ")}
  </span>
);

/* ──────────────────────────────────────────────────────────────────────
   Intake form
   ────────────────────────────────────────────────────────────────────── */

const initialForm = {
  visitorTypeId: "",
  visitorTypeOther: "",
  purposeOfVisitId: "",
  purposeOther: "",
  passApplyMode: "MULTIPLE",
  companyName: "",
  vendorEmail: "",
  vendorMobile: "",
  hasWorkOrder: true,
  refDocNo: "",
  workOrderFile: null,
  equipmentMaterialDetails: "",
  remarks: "",
  noOfPersonsAllowed: 1,
  noOfVehiclesAllowed: 0,
  paymentMode: "CASH",
  allowAuctionPassOnly: false,
  validUpto: "",
};

function CreateIntakeForm({ user, onCreated }) {
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [visitorTypes, setVisitorTypes] = useState([]);
  const [purposes, setPurposes] = useState([]);

  useEffect(() => {
    let active = true;
    Promise.all([getVisitorTypes(), getVisitPurposes()]).then(([vt, vp]) => {
      if (!active) return;
      setVisitorTypes(vt);
      setPurposes(vp);
    });
    return () => {
      active = false;
    };
  }, []);

  const update = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  const visitorIsOther = useMemo(() => {
    const t = visitorTypes.find((v) => String(v.id) === String(form.visitorTypeId));
    return t?.name?.toLowerCase() === "others";
  }, [form.visitorTypeId, visitorTypes]);

  const purposeIsOther = useMemo(() => {
    const t = purposes.find((p) => String(p.id) === String(form.purposeOfVisitId));
    return t?.name?.toLowerCase() === "others";
  }, [form.purposeOfVisitId, purposes]);

  const reset = () => setForm(initialForm);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.visitorTypeId) return toast.error("Type of Visitors is required");
    if (visitorIsOther && !form.visitorTypeOther.trim())
      return toast.error("Please specify the visitor type in 'Others'");
    if (!form.purposeOfVisitId) return toast.error("Purpose of Visit is required");
    if (purposeIsOther && !form.purposeOther.trim())
      return toast.error("Please specify the purpose in 'Others'");
    if (!form.companyName.trim()) return toast.error("Company name is required");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.vendorEmail))
      return toast.error("Invalid vendor email");
    if (!/^\d{10}$/.test(String(form.vendorMobile)))
      return toast.error("Vendor mobile must be 10 digits");
    if (!form.validUpto) return toast.error("Validity date is required");
    if (form.validUpto < todayISO())
      return toast.error("Validity cannot be in the past");
    const persons = Number(form.noOfPersonsAllowed) || 0;
    const vehicles = Number(form.noOfVehiclesAllowed) || 0;
    if (persons + vehicles <= 0)
      return toast.error("At least one person or vehicle quota must be set");
    if (form.hasWorkOrder && !form.refDocNo.trim())
      return toast.error("Ref Doc / PO / Work Order No is required");

    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => {
      if (k === "workOrderFile" && v) {
        fd.append("vendorWorkOrder", v);
      } else if (typeof v === "boolean") {
        fd.append(k, v ? "true" : "false");
      } else if (v !== null && v !== undefined && v !== "") {
        fd.append(k, v);
      }
    });

    try {
      setSubmitting(true);
      const data = await createIntake(fd);
      toast.success("Vendor pass link generated", {
        description: `Reference ${data.referenceNo}`,
      });
      reset();
      onCreated?.(data);
    } catch (err) {
      toast.error(err.message || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden"
    >
      {/* Header bar */}
      <div className="px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white">
        <h2 className="text-base font-semibold">Vendor Or Contractors</h2>
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-4">
        {/* ── Left column ── */}
        <div className="space-y-4">
          <div>
            <Label required>Name of the Department</Label>
            <input
              className={inputCls}
              value={user?.departmentName || ""}
              disabled
              placeholder="Auto-filled from your account"
            />
          </div>

          <div>
            <Label required>Type of Visitors</Label>
            <select
              required
              className={inputCls}
              value={form.visitorTypeId}
              onChange={(e) => update("visitorTypeId", e.target.value)}
            >
              <option value="">-- Select --</option>
              {visitorTypes.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label>Others</Label>
            <input
              type="text"
              className={inputCls}
              disabled={!visitorIsOther}
              value={form.visitorTypeOther}
              onChange={(e) => update("visitorTypeOther", e.target.value)}
              placeholder={visitorIsOther ? "Specify visitor type" : ""}
            />
          </div>

          <div>
            <Label required>Company Name</Label>
            <input
              type="text"
              className={inputCls}
              value={form.companyName}
              onChange={(e) => update("companyName", e.target.value)}
            />
          </div>

          <div>
            <Label required>Vendor Email</Label>
            <input
              type="email"
              className={inputCls}
              value={form.vendorEmail}
              onChange={(e) => update("vendorEmail", e.target.value)}
            />
          </div>

          <div>
            <Label>Ref Doc No / PO No / Work Order No</Label>
            <input
              type="text"
              className={inputCls}
              value={form.refDocNo}
              onChange={(e) => update("refDocNo", e.target.value)}
              disabled={!form.hasWorkOrder}
            />
          </div>

          <div>
            <Label>Work order copy</Label>
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              className="block w-full text-sm text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
              onChange={(e) => update("workOrderFile", e.target.files?.[0] || null)}
              disabled={!form.hasWorkOrder}
            />
          </div>

          <div>
            <Label>Detail of Equipment/Material</Label>
            <textarea
              rows={2}
              className={textareaCls}
              value={form.equipmentMaterialDetails}
              onChange={(e) => update("equipmentMaterialDetails", e.target.value)}
            />
          </div>

          <div>
            <Label>No Of Person</Label>
            <select
              className={inputCls}
              value={form.noOfPersonsAllowed}
              onChange={(e) =>
                update("noOfPersonsAllowed", Number(e.target.value))
              }
            >
              {Array.from({ length: 51 }, (_, i) => i).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label>Payment</Label>
            <div className="flex items-center gap-6 h-9">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="radio"
                  name="paymentMode"
                  className="accent-orange-500"
                  checked={form.paymentMode === "CASH"}
                  onChange={() => update("paymentMode", "CASH")}
                />
                Cash
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="radio"
                  name="paymentMode"
                  className="accent-orange-500"
                  checked={form.paymentMode === "FREE"}
                  onChange={() => update("paymentMode", "FREE")}
                />
                Free
              </label>
            </div>
          </div>

          <div>
            <Label>Allow Auction Pass Only</Label>
            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                className="accent-orange-500 h-4 w-4"
                checked={form.allowAuctionPassOnly}
                onChange={(e) =>
                  update("allowAuctionPassOnly", e.target.checked)
                }
              />
              <span className="text-xs text-slate-500">
                When enabled, vendor sees only auction-rate pass options.
              </span>
            </label>
          </div>
        </div>

        {/* ── Right column ── */}
        <div className="space-y-4">
          <div>
            <Label required>Pass Type</Label>
            <select
              className={inputCls}
              value={form.passApplyMode}
              onChange={(e) => update("passApplyMode", e.target.value)}
            >
              <option value="MULTIPLE">Multiple</option>
              <option value="SINGLE">Single</option>
            </select>
          </div>

          <div>
            <Label required>Purpose of Visit</Label>
            <select
              required
              className={inputCls}
              value={form.purposeOfVisitId}
              onChange={(e) => update("purposeOfVisitId", e.target.value)}
            >
              <option value="">-- Select --</option>
              {purposes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label>Others</Label>
            <input
              type="text"
              className={inputCls}
              disabled={!purposeIsOther}
              value={form.purposeOther}
              onChange={(e) => update("purposeOther", e.target.value)}
              placeholder={purposeIsOther ? "Specify purpose" : ""}
            />
          </div>

          <div>
            <Label required>Vendor Mobile number</Label>
            <input
              type="tel"
              maxLength={10}
              className={inputCls}
              value={form.vendorMobile}
              onChange={(e) =>
                update("vendorMobile", e.target.value.replace(/\D/g, ""))
              }
            />
          </div>

          <div>
            <Label required>Work order</Label>
            <div className="flex items-center gap-6 h-9">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="radio"
                  name="hasWorkOrder"
                  className="accent-orange-500"
                  checked={form.hasWorkOrder === true}
                  onChange={() => update("hasWorkOrder", true)}
                />
                Yes
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="radio"
                  name="hasWorkOrder"
                  className="accent-orange-500"
                  checked={form.hasWorkOrder === false}
                  onChange={() => update("hasWorkOrder", false)}
                />
                No
              </label>
            </div>
          </div>

          <div>
            <Label>Remarks</Label>
            <textarea
              rows={2}
              className={textareaCls}
              value={form.remarks}
              onChange={(e) => update("remarks", e.target.value)}
            />
          </div>

          <div>
            <Label>No Of Vehicle</Label>
            <select
              className={inputCls}
              value={form.noOfVehiclesAllowed}
              onChange={(e) =>
                update("noOfVehiclesAllowed", Number(e.target.value))
              }
            >
              {Array.from({ length: 21 }, (_, i) => i).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label required>Validity Upto</Label>
            <input
              type="date"
              className={inputCls}
              min={todayISO()}
              value={form.validUpto}
              onChange={(e) => update("validUpto", e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={reset}
          disabled={submitting}
          className="h-9 px-4 rounded-md text-sm font-medium text-slate-700 border border-slate-300 hover:bg-slate-100 disabled:opacity-50"
        >
          Reset
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="h-9 px-5 rounded-md text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 inline-flex items-center gap-2 disabled:opacity-50"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          {submitting ? "Saving..." : "Save"}
        </button>
      </div>
    </form>
  );
}

/* ──────────────────────────────────────────────────────────────────────
   List view
   ────────────────────────────────────────────────────────────────────── */

function ListView({ user, refreshKey, onCreatedJump }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    fromDate: "",
    toDate: "",
    companyName: "",
    createdBy: user?.username || "",
    department: user?.departmentName || "",
  });
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await listIntakes({
        fromDate: filters.fromDate || undefined,
        toDate: filters.toDate || undefined,
        companyName: filters.companyName || undefined,
      });
      setRows(data);
    } catch (err) {
      toast.error(err.message || "Failed to load intakes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const copyLink = (row) => {
    const link = `${window.location.origin}/vendor_pass/${row.token}`;
    navigator.clipboard.writeText(link);
    toast.success("Vendor link copied");
  };

  const doResend = async (row) => {
    try {
      setBusyId(row.id);
      await resendLink(row.id);
      toast.success("Link re-sent to vendor email");
    } catch (err) {
      toast.error(err.message || "Failed to resend");
    } finally {
      setBusyId(null);
    }
  };

  const doRevoke = async (row) => {
    if (!confirm(`Revoke intake ${row.referenceNo}?`)) return;
    try {
      setBusyId(row.id);
      await revokeIntake(row.id);
      toast.success("Intake revoked");
      load();
    } catch (err) {
      toast.error(err.message || "Failed to revoke");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
      <div className="px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white flex items-center justify-between">
        <h2 className="text-base font-semibold">Vendor Pass List</h2>
        <button
          type="button"
          onClick={load}
          className="h-7 px-2 rounded-md text-xs font-medium bg-white/20 hover:bg-white/30 inline-flex items-center gap-1"
        >
          <RefreshCcw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="p-4 border-b border-slate-200 grid grid-cols-1 md:grid-cols-5 gap-3 bg-slate-50">
        <div>
          <Label>From Date</Label>
          <input
            type="date"
            className={inputCls}
            value={filters.fromDate}
            onChange={(e) =>
              setFilters((s) => ({ ...s, fromDate: e.target.value }))
            }
          />
        </div>
        <div>
          <Label>To Date</Label>
          <input
            type="date"
            className={inputCls}
            value={filters.toDate}
            onChange={(e) =>
              setFilters((s) => ({ ...s, toDate: e.target.value }))
            }
          />
        </div>
        <div>
          <Label>Company</Label>
          <input
            type="text"
            className={inputCls}
            value={filters.companyName}
            onChange={(e) =>
              setFilters((s) => ({ ...s, companyName: e.target.value }))
            }
            placeholder="Search..."
          />
        </div>
        <div>
          <Label>Created By</Label>
          <input className={inputCls} value={filters.createdBy} disabled />
        </div>
        <div className="flex items-end">
          <button
            type="button"
            onClick={load}
            className="h-9 w-full px-4 rounded-md text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 inline-flex items-center justify-center gap-2"
          >
            <Search className="h-4 w-4" />
            Search
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-blue-600 text-white">
            <tr>
              {[
                "Sno",
                "Req/Pass Id",
                "Created On",
                "Created By",
                "WorkOrder",
                "Department",
                "Company/Institution",
                "(P) Permitted",
                "(P) Applied",
                "(P) Approved",
                "(P) Rejected",
                "(V) Permitted",
                "(V) Applied",
                "(V) Approved",
                "(V) Rejected",
                "Status",
                "Action",
              ].map((h) => (
                <th
                  key={h}
                  className="px-3 py-2 text-left font-semibold text-xs whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={17} className="text-center py-10 text-slate-500">
                  <Loader2 className="h-5 w-5 animate-spin inline mr-2" />
                  Loading...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={17} className="text-center py-10 text-slate-500">
                  No vendor pass intakes yet. Use the "Create" tab to issue one.
                </td>
              </tr>
            ) : (
              rows.map((r, idx) => (
                <tr
                  key={r.id}
                  className="border-b border-slate-100 hover:bg-orange-50/30"
                >
                  <td className="px-3 py-2">{idx + 1}</td>
                  <td className="px-3 py-2 font-medium text-slate-800 whitespace-nowrap">
                    {r.referenceNo}
                  </td>
                  <td className="px-3 py-2 text-slate-600 whitespace-nowrap">
                    {fmtDateTime(r.createdAt)}
                  </td>
                  <td className="px-3 py-2 text-slate-600">
                    {r.createdByUserName}
                  </td>
                  <td className="px-3 py-2 text-blue-600">
                    {r.refDocNo || "-"}
                  </td>
                  <td className="px-3 py-2">{r.departmentName}</td>
                  <td className="px-3 py-2">{r.companyName}</td>
                  <td className="px-3 py-2 text-center">
                    {r.noOfPersonsAllowed}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {r.stats?.personApplied ?? 0}
                  </td>
                  <td className="px-3 py-2 text-center text-emerald-700">
                    {r.stats?.personApproved ?? 0}
                  </td>
                  <td className="px-3 py-2 text-center text-rose-700">
                    {r.stats?.personRejected ?? 0}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {r.noOfVehiclesAllowed}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {r.stats?.vehicleApplied ?? 0}
                  </td>
                  <td className="px-3 py-2 text-center text-emerald-700">
                    {r.stats?.vehicleApproved ?? 0}
                  </td>
                  <td className="px-3 py-2 text-center text-rose-700">
                    {r.stats?.vehicleRejected ?? 0}
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <button
                        title="Copy vendor link"
                        onClick={() => copyLink(r)}
                        className="h-7 w-7 rounded-md inline-flex items-center justify-center text-slate-600 hover:bg-slate-100"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <button
                        title="Re-send link"
                        onClick={() => doResend(r)}
                        disabled={busyId === r.id || r.status !== "LINK_SENT"}
                        className="h-7 w-7 rounded-md inline-flex items-center justify-center text-orange-600 hover:bg-orange-100 disabled:opacity-30"
                      >
                        <Send className="h-3.5 w-3.5" />
                      </button>
                      <button
                        title="Revoke"
                        onClick={() => doRevoke(r)}
                        disabled={busyId === r.id || r.status !== "LINK_SENT"}
                        className="h-7 w-7 rounded-md inline-flex items-center justify-center text-rose-600 hover:bg-rose-50 disabled:opacity-30"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────
   Page shell with tabs
   ────────────────────────────────────────────────────────────────────── */

export default function VendorPassPage() {
  const [tab, setTab] = useState("create");
  const [user, setUser] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) setUser(JSON.parse(stored));
  }, []);

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-orange-100 inline-flex items-center justify-center">
            <ClipboardList className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Vendor Pass</h1>
            <p className="text-xs text-slate-500">
              Department: <span className="font-semibold">{user?.departmentName || "—"}</span>{" "}
              · User: <span className="font-semibold">{user?.username || "—"}</span>
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="inline-flex rounded-lg bg-white border border-slate-200 p-1 shadow-sm">
          <button
            onClick={() => setTab("create")}
            className={`h-8 px-4 rounded-md text-sm font-medium inline-flex items-center gap-2 ${
              tab === "create"
                ? "bg-orange-500 text-white shadow"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Plus className="h-4 w-4" />
            Create
          </button>
          <button
            onClick={() => setTab("list")}
            className={`h-8 px-4 rounded-md text-sm font-medium inline-flex items-center gap-2 ${
              tab === "list"
                ? "bg-orange-500 text-white shadow"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <FileText className="h-4 w-4" />
            Vendor Pass List
          </button>
        </div>
      </div>

      {/* Body */}
      {tab === "create" ? (
        <CreateIntakeForm
          user={user}
          onCreated={() => {
            setRefreshKey((k) => k + 1);
            setTab("list");
          }}
        />
      ) : (
        <ListView user={user} refreshKey={refreshKey} />
      )}
    </div>
  );
}
