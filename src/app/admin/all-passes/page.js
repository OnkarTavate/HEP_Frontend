"use client";

import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { toast } from "sonner";
import {
  FileText,
  Search,
  Loader2,
  CheckCircle2,
  Clock,
  XCircle,
  ShieldAlert,
} from "lucide-react";

const AGENT_API = process.env.NEXT_PUBLIC_AGENT_API;

const STATUS_STYLES = {
  APPROVED: {
    icon: CheckCircle2,
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  REJECTED: {
    icon: XCircle,
    className: "bg-rose-50 text-rose-700 border-rose-200",
  },
  PENDING: {
    icon: Clock,
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
};

function StatusPill({ status }) {
  const key = (status || "PENDING").toUpperCase();
  const style = STATUS_STYLES[key] || STATUS_STYLES.PENDING;
  const Icon = style.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border text-[11px] font-semibold ${style.className}`}
    >
      <Icon className="h-3 w-3" />
      {key}
    </span>
  );
}

export default function AdminAllPassesPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  useEffect(() => {
    let cancelled = false;
    const fetchAll = async () => {
      try {
        const token = localStorage.getItem("accessToken");
        const response = await axios.get(
          `${AGENT_API}/pass-request/get-agent-pass-requests`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (cancelled) return;
        if (response.data && response.data.success) {
          setRequests(response.data.data || []);
        } else {
          setRequests([]);
        }
      } catch (err) {
        console.error("Failed to fetch passes", err);
        if (!cancelled) {
          setError("Failed to load passes.");
          toast.error("Failed to load passes.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchAll();
    return () => {
      cancelled = true;
    };
  }, []);

  const counts = useMemo(() => {
    const c = { ALL: requests.length, PENDING: 0, APPROVED: 0, REJECTED: 0 };
    for (const r of requests) {
      const s = (r.status || "PENDING").toUpperCase();
      if (c[s] !== undefined) c[s] += 1;
    }
    return c;
  }, [requests]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return requests.filter((r) => {
      const status = (r.status || "PENDING").toUpperCase();
      if (statusFilter !== "ALL" && status !== statusFilter) return false;
      if (!q) return true;
      const haystack = [
        r.passRequestId,
        r.passType,
        r.purpose,
        r.companyName,
        r.entityName,
        r.agentName,
        r.requestedBy,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [requests, searchQuery, statusFilter]);

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <FileText className="h-6 w-6 text-orange-600" />
          All Passes
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Administrator view of every pass request across the system.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { key: "ALL", label: "Total", color: "from-slate-500 to-slate-600" },
          { key: "PENDING", label: "Pending", color: "from-amber-500 to-amber-600" },
          { key: "APPROVED", label: "Approved", color: "from-emerald-500 to-emerald-600" },
          { key: "REJECTED", label: "Rejected", color: "from-rose-500 to-rose-600" },
        ].map((card) => (
          <button
            key={card.key}
            onClick={() => setStatusFilter(card.key)}
            className={`text-left rounded-2xl p-4 border transition-all ${
              statusFilter === card.key
                ? "border-orange-400 ring-2 ring-orange-200 bg-white shadow"
                : "border-slate-200 bg-white hover:border-orange-300"
            }`}
          >
            <div
              className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full text-white bg-gradient-to-r ${card.color}`}
            >
              {card.label}
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-800">
              {counts[card.key] ?? 0}
            </div>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-4 flex items-center gap-3">
        <Search className="h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by pass ID, company, purpose, applicant..."
          className="flex-1 bg-transparent outline-none text-sm text-slate-700 placeholder:text-slate-400"
        />
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Loading passes...
          </div>
        ) : error ? (
          <div className="p-12 text-center text-rose-600 flex flex-col items-center gap-2">
            <ShieldAlert className="h-6 w-6" />
            {error}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            No passes found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left px-4 py-3">Pass ID</th>
                  <th className="text-left px-4 py-3">Company</th>
                  <th className="text-left px-4 py-3">Type</th>
                  <th className="text-left px-4 py-3">Purpose</th>
                  <th className="text-left px-4 py-3">Requested</th>
                  <th className="text-left px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, idx) => (
                  <tr
                    key={r.passRequestId || r.id || idx}
                    className="border-t border-slate-100 hover:bg-orange-50/40"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-slate-700">
                      {r.passRequestId || r.id || "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {r.companyName || r.entityName || "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {r.passType || "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-xs truncate">
                      {r.purpose || "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {r.createdAt
                        ? new Date(r.createdAt).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={r.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
