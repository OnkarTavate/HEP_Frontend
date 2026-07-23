"use client";

import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import {
  FileText,
  Download,
  Search,
  RefreshCw,
  Filter,
  Truck,
  User,
  CreditCard,
  Building2,
  Clock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  BarChart2,
} from "lucide-react";

const ADMIN_API = process.env.NEXT_PUBLIC_ADMIN_API;

const ENTITY_CONFIGS = {
  VEHICLE: { label: "Vehicle", short: "VEH", icon: Truck, color: "bg-blue-50 text-blue-700 border-blue-200" },
  PERSON: { label: "Person", short: "PER", icon: User, color: "bg-teal-50 text-teal-700 border-teal-200" },
  DRIVER: { label: "Driver", short: "DRV", icon: CreditCard, color: "bg-purple-50 text-purple-700 border-purple-200" },
  COMPANY: { label: "Company", short: "CO", icon: Building2, color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
};

const STATUS_CONFIGS = {
  BLACKLISTED: { color: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-500", label: "Blacklisted" },
  PENDING_BLACKLIST: { color: "bg-indigo-50 text-indigo-700 border-indigo-200", dot: "bg-indigo-400 animate-pulse", label: "Pending Approval" },
  UNBLACKLIST_REQUESTED: { color: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500", label: "Unblacklist Req." },
  UNBLACKLISTED: { color: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500", label: "Reinstated" },
  REJECTED: { color: "bg-slate-50 text-slate-500 border-slate-200", dot: "bg-slate-400", label: "Rejected" },
};

const REASON_LABELS = {
  "001": "Unauthorized Parking",
  "002": "Tampering of Documents",
  "003": "Misbehaviour",
  "004": "Criminal Offense",
  "005": "Unauthorized Entry",
  "006": "Traffic Violation",
  "007": "Others",
};

const fmtDate = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const fmtDateTime = (d) => {
  if (!d) return "—";
  const dt = new Date(d);
  return (
    dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) +
    " " +
    dt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
  );
};

const ITEMS_PER_PAGE = 20;

export default function BlacklistReportsPage() {
  const [allData, setAllData] = useState([]);
  const [serverTotal, setServerTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  // Filters
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [entityType, setEntityType] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");

  // Pagination
  const [page, setPage] = useState(1);

  // Filtered data (client-side search on top of server data)
  const filteredData = search.trim()
    ? allData.filter((r) => {
        const q = search.toLowerCase();
        return (
          (r.identifier || "").toLowerCase().includes(q) ||
          (r.entity_name || "").toLowerCase().includes(q) ||
          (r.authorizing_officer || "").toLowerCase().includes(q) ||
          (r.reason || "").toLowerCase().includes(q)
        );
      })
    : allData;

  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
  const paginatedData = filteredData.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  // Summary stats
  const stats = {
    total: filteredData.length,
    blacklisted: filteredData.filter((d) => d.status === "BLACKLISTED").length,
    unblacklisted: filteredData.filter((d) => d.status === "UNBLACKLISTED").length,
    pending: filteredData.filter((d) => d.status === "PENDING_BLACKLIST").length,
    penaltyPending: filteredData.filter((d) => d.penalty_status === "PENDING").length,
    penaltyTotal: filteredData.reduce((s, d) => s + (parseFloat(d.penalty_amount) || 0), 0),
  };

  const getAuthHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
  });

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: 200 });
      if (fromDate) params.set("from_date", fromDate);
      if (toDate) params.set("to_date", toDate);
      if (entityType) params.set("entity_type", entityType);
      if (status) params.set("status", status);

      const res = await axios.get(`${ADMIN_API}/blacklist/reports?${params}`, {
        headers: getAuthHeaders(),
      });
      if (res.data.success) {
        setAllData(res.data.data || []);
        setServerTotal(res.data.total || 0);
        setPage(1);
      }
    } catch (err) {
      console.error("Report fetch error:", err);
      toast.error("Failed to fetch blacklist report");
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, entityType, status]);

  useEffect(() => {
    fetchReport();
  }, []);

  // CSV Export
  const exportCSV = () => {
    if (filteredData.length === 0) { toast.warning("No data to export"); return; }
    const headers = [
      "ID", "Entity Type", "Identifier", "Name", "Reason Code", "Reason",
      "Status", "Has Penalty", "Penalty Amount", "Penalty Status",
      "Payment Method", "Transaction ID", "Authorizing Officer",
      "Blacklisted At", "Unblacklisted At", "Blacklisted By", "Gate-Out Permitted", "Gate-Out Used",
    ];
    const rows = filteredData.map((r) => [
      r.id, r.entity_type, r.identifier, r.entity_name || "",
      r.reason_code || "", (r.reason || "").replace(/,/g, ";"),
      r.status, r.has_penalty ? "Yes" : "No",
      r.has_penalty ? r.penalty_amount : "",
      r.penalty_status || "", r.payment_method || "", r.transaction_id || "",
      r.authorizing_officer || "",
      fmtDateTime(r.blacklisted_at), fmtDateTime(r.unblacklisted_at),
      r.blacklisted_by_name || "",
      r.permit_one_gate_out ? "Yes" : "No",
      r.gate_out_used ? "Yes" : "No",
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `blacklist_report_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filteredData.length} records to CSV!`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-slate-100">
      {/* ── Hero Header ── */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center">
                <BarChart2 className="w-5 h-5 text-indigo-200" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Blacklist Reports</h1>
                <p className="text-indigo-300 text-sm">Complete historical record — Chennai Port Authority</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchReport}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 transition-colors rounded-lg text-sm font-medium"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </button>
              <button
                onClick={exportCSV}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 transition-colors rounded-lg text-sm font-bold shadow"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            </div>
          </div>

          {/* Summary Stat Cards */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: "Total Shown", val: stats.total, from: "from-white/10", to: "to-white/5" },
              { label: "Blacklisted", val: stats.blacklisted, from: "from-red-500/30", to: "to-red-500/10" },
              { label: "Reinstated", val: stats.unblacklisted, from: "from-emerald-500/30", to: "to-emerald-500/10" },
              { label: "Pending ATM", val: stats.pending, from: "from-indigo-500/30", to: "to-indigo-500/10" },
              { label: "Unpaid Penalties", val: stats.penaltyPending, from: "from-amber-500/30", to: "to-amber-500/10" },
              {
                label: "Total Fine (₹)",
                val: `₹${stats.penaltyTotal.toLocaleString("en-IN")}`,
                from: "from-purple-500/30",
                to: "to-purple-500/10",
              },
            ].map((s) => (
              <div key={s.label} className={`bg-gradient-to-br ${s.from} ${s.to} border border-white/10 rounded-xl p-3`}>
                <div className="text-xs text-indigo-200 mb-1">{s.label}</div>
                <div className="text-xl font-bold text-white">{s.val}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        {/* ── Filters Panel ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-4 h-4 text-indigo-600" />
            <span className="text-sm font-semibold text-slate-700">Filter Report</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">From Date</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">To Date</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Entity Type</label>
              <select
                value={entityType}
                onChange={(e) => setEntityType(e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                <option value="">All Types</option>
                <option value="VEHICLE">Vehicle</option>
                <option value="PERSON">Person</option>
                <option value="DRIVER">Driver</option>
                <option value="COMPANY">Company</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                <option value="">All Statuses</option>
                <option value="BLACKLISTED">Blacklisted</option>
                <option value="PENDING_BLACKLIST">Pending ATM</option>
                <option value="UNBLACKLIST_REQUESTED">Unblacklist Req.</option>
                <option value="UNBLACKLISTED">Reinstated</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Search</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="ID / Name..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="w-full text-sm border border-slate-200 rounded-lg pl-8 pr-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={fetchReport}
                className="flex-1 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-2 transition-colors shadow-sm"
              >
                Apply
              </button>
              <button
                onClick={() => { setFromDate(""); setToDate(""); setEntityType(""); setStatus(""); setSearch(""); setTimeout(fetchReport, 50); }}
                className="flex-1 text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 rounded-lg py-2 transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
          <div className="mt-3 text-xs text-slate-400">
            {loading ? "Fetching data..." : `Showing ${filteredData.length} records · Server total: ${serverTotal}`}
          </div>
        </div>

        {/* ── Table ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin mb-3 text-indigo-400" />
              <p className="text-sm font-medium">Loading report...</p>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <FileText className="w-12 h-12 mb-3 opacity-30" />
              <p className="font-semibold">No records found</p>
              <p className="text-sm mt-1 text-slate-400">Try adjusting the filters above</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-sm">
                <thead>
                  <tr className="bg-gradient-to-r from-slate-50 to-indigo-50/30 border-b border-slate-200">
                    {["#", "Type", "Identifier / Name", "Reason", "Status", "Penalty", "Pen. Status", "Officer", "Blacklisted On", "Reinstated On", "Gate-OUT"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedData.map((row, idx) => {
                    const ec = ENTITY_CONFIGS[row.entity_type] || { short: row.entity_type, icon: FileText, color: "bg-slate-50 text-slate-600 border-slate-200" };
                    const sc = STATUS_CONFIGS[row.status] || STATUS_CONFIGS.REJECTED;
                    const Icon = ec.icon;
                    const globalIdx = (page - 1) * ITEMS_PER_PAGE + idx + 1;
                    return (
                      <tr key={row.id} className="hover:bg-indigo-50/30 transition-colors">
                        <td className="px-4 py-3 text-slate-400 text-xs font-mono w-10">{globalIdx}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-bold ${ec.color}`}>
                            <Icon className="w-3 h-3" />
                            {ec.short}
                          </span>
                        </td>
                        <td className="px-4 py-3 min-w-[150px]">
                          <div className="font-mono text-xs font-bold text-slate-800 break-all">{row.identifier}</div>
                          {row.entity_name && <div className="text-xs text-slate-500 mt-0.5">{row.entity_name}</div>}
                        </td>
                        <td className="px-4 py-3 min-w-[160px]">
                          <div className="flex flex-col gap-0.5">
                            {row.reason_code && (
                              <span className="inline-block bg-slate-100 text-slate-600 text-[10px] font-bold px-1.5 py-0.5 rounded w-fit">
                                Code {row.reason_code}
                              </span>
                            )}
                            <span className="text-xs text-slate-600 line-clamp-1">
                              {REASON_LABELS[row.reason_code] || (row.reason || "").substring(0, 40)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-semibold ${sc.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                            {sc.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {row.has_penalty ? (
                            <span className="text-sm font-bold text-slate-800">
                              ₹{parseFloat(row.penalty_amount || 0).toLocaleString("en-IN")}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {row.penalty_status === "PAID" ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" /> Paid
                            </span>
                          ) : row.penalty_status === "PENDING" ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                              <Clock className="w-3 h-3" /> Pending
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">N/A</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600 max-w-[100px] truncate">{row.authorizing_officer || "—"}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-xs font-semibold text-slate-700">{fmtDate(row.blacklisted_at)}</div>
                          {row.blacklisted_by_name && (
                            <div className="text-[10px] text-slate-400 mt-0.5">by {row.blacklisted_by_name}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {row.unblacklisted_at ? (
                            <div className="text-xs font-semibold text-emerald-700">{fmtDate(row.unblacklisted_at)}</div>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {row.permit_one_gate_out ? (
                            row.gate_out_used ? (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded-full border border-slate-200">
                                <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Used
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-200">
                                <Clock className="w-3 h-3" /> Allowed
                              </span>
                            )
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Pagination ── */}
          {!loading && totalPages > 1 && (
            <div className="border-t border-slate-100 px-5 py-3 flex items-center justify-between bg-slate-50/50">
              <span className="text-xs text-slate-500">
                Page <span className="font-semibold text-slate-700">{page}</span> of {totalPages} · {filteredData.length} records
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-100 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                  const pg = start + i;
                  return (
                    <button
                      key={pg}
                      onClick={() => setPage(pg)}
                      className={`w-8 h-8 text-xs font-medium rounded-lg transition-colors ${pg === page ? "bg-indigo-600 text-white shadow-sm" : "border border-slate-200 hover:bg-slate-100"}`}
                    >
                      {pg}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-100 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
