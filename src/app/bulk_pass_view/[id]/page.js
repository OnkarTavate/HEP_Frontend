"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  Users,
  Car,
  Building2,
} from "lucide-react";
import { getBulkPassScan } from "@/lib/bulkPassApi";

// ── Styles ──────────────────────────────────────────────────────────────────

const card =
  "rounded-3xl border-0 bg-white ring-1 ring-stone-200/70 " +
  "shadow-[0_1px_3px_rgba(15,23,42,0.04),0_18px_40px_-20px_rgba(15,23,42,0.20)]";

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});

const fmtDate = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d) ? v : fmt.format(d);
};

const visitorLabel = (v) =>
  v
    ? v
        .toLowerCase()
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase())
    : "—";

function Field({ label, value }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-1">
        {label}
      </p>
      <p className="text-sm font-semibold text-stone-800 break-words">{value || "—"}</p>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

function BulkPassViewContent() {
  const params = useParams();
  const searchParams = useSearchParams();

  const [activeId, setActiveId] = useState(null);
  const [activeVehicle, setActiveVehicle] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // The URL carries an AES-encrypted batch id (and optional encrypted vehicle).
  // Capture them, stash in sessionStorage, then strip from the address bar.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const p = params?.id;
    const v = searchParams.get("vehicle");
    if (p) {
      sessionStorage.setItem("bulk_pass_view_id", p);
      if (v) sessionStorage.setItem("bulk_pass_view_vehicle", v);
      else sessionStorage.removeItem("bulk_pass_view_vehicle");
      setActiveId(p);
      setActiveVehicle(v || null);
      window.history.replaceState(null, "", "/bulk_pass_view");
    } else {
      const sid = sessionStorage.getItem("bulk_pass_view_id");
      const sv = sessionStorage.getItem("bulk_pass_view_vehicle");
      if (sid) {
        setActiveId(sid);
        setActiveVehicle(sv || null);
      } else {
        setError("This pass could not be found or is not available for viewing.");
        setLoading(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!activeId) return;
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const res = await getBulkPassScan(activeId, activeVehicle);
        if (active) setData(res);
      } catch (err) {
        if (active)
          setError(
            err?.response?.data?.message ||
              "This pass could not be found or is not available for viewing."
          );
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [activeId, activeVehicle]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="flex flex-col items-center gap-3 text-stone-500">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
          <p className="text-sm font-semibold">Loading pass details…</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
        <div className={`${card} max-w-md w-full p-8 text-center`}>
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-stone-800 mb-1">Pass Not Available</h2>
          <p className="text-sm text-stone-500">{error}</p>
        </div>
      </div>
    );
  }

  const { batch, persons = [], vehicles = [], highlightVehicleId } = data;
  const highlighted =
    highlightVehicleId &&
    vehicles.find((v) => String(v.id) === String(highlightVehicleId));

  return (
    <div className="min-h-screen bg-stone-50 py-8 px-4">
      <div className="max-w-3xl mx-auto flex flex-col gap-5">
        {/* Header card */}
        <div className={`${card} overflow-hidden`}>
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-5 text-white">
            <p className="text-xs font-bold uppercase tracking-widest opacity-90 mb-1">
              Chennai Port Authority — Bulk Visitor Pass
            </p>
            <h1 className="text-2xl font-black font-mono">{batch.refNo || "—"}</h1>
            <div className="flex items-center gap-1.5 mt-2 text-sm font-semibold">
              <CheckCircle2 className="h-4 w-4" />
              Approved &amp; Valid
            </div>
          </div>

          <div className="px-6 py-5 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
            <Field label="Department" value={batch.departmentName} />
            <Field label="Visitor Type" value={visitorLabel(batch.visitorType)} />
            <Field label="Company" value={batch.companyName} />
            <Field label="No. of Persons" value={String(batch.noOfPersons ?? persons.length)} />
            <Field label="No. of Vehicles" value={String(batch.noOfVehicles ?? vehicles.length)} />
            <Field label="Contact" value={batch.applicantMobile} />
            <Field label="Valid From" value={fmtDate(batch.validityFrom)} />
            <Field label="Valid Upto" value={fmtDate(batch.validityUpto)} />
            <div className="col-span-2 sm:col-span-3">
              <Field label="Purpose of Visit" value={batch.purpose} />
            </div>
          </div>
        </div>

        {/* Highlighted vehicle (when scanned from a vehicle pass) */}
        {highlighted && (
          <div className={`${card} p-6 ring-2 ring-amber-400`}>
            <div className="flex items-center gap-2 mb-4">
              <Car className="h-5 w-5 text-amber-600" />
              <h2 className="text-base font-bold text-stone-800">Vehicle Pass</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
              <Field label="Vehicle Number" value={highlighted.vehicleNumber} />
              <Field label="Vehicle Type" value={highlighted.vehicleType} />
              <Field label="Driver / Person" value={highlighted.driverName} />
              <Field label="Contact" value={highlighted.mobile} />
            </div>
          </div>
        )}

        {/* Persons */}
        {persons.length > 0 && (
          <div className={`${card} p-6`}>
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-5 w-5 text-amber-600" />
              <h2 className="text-base font-bold text-stone-800">
                Persons ({persons.length})
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-stone-400 border-b border-stone-100">
                    <th className="py-2 pr-4">#</th>
                    <th className="py-2 pr-4">Name</th>
                    <th className="py-2 pr-4">Aadhaar</th>
                    <th className="py-2 pr-4">Mobile</th>
                    <th className="py-2 pr-4">Vehicle</th>
                  </tr>
                </thead>
                <tbody>
                  {persons.map((p, i) => (
                    <tr key={p.id} className="border-b border-stone-50">
                      <td className="py-2.5 pr-4 text-stone-400">{i + 1}</td>
                      <td className="py-2.5 pr-4 font-semibold text-stone-800">
                        {p.name || "—"}
                      </td>
                      <td className="py-2.5 pr-4 font-mono text-stone-600">{p.aadhaar || "—"}</td>
                      <td className="py-2.5 pr-4 text-stone-600">{p.mobile || "—"}</td>
                      <td className="py-2.5 pr-4 text-stone-600">
                        {p.vehicleNumber ? `${p.vehicleNumber}${p.vehicleType ? ` (${p.vehicleType})` : ""}` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Vehicles */}
        {vehicles.length > 0 && (
          <div className={`${card} p-6`}>
            <div className="flex items-center gap-2 mb-4">
              <Car className="h-5 w-5 text-amber-600" />
              <h2 className="text-base font-bold text-stone-800">
                Vehicles ({vehicles.length})
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-stone-400 border-b border-stone-100">
                    <th className="py-2 pr-4">#</th>
                    <th className="py-2 pr-4">Vehicle Number</th>
                    <th className="py-2 pr-4">Type</th>
                    <th className="py-2 pr-4">Driver / Person</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicles.map((v, i) => (
                    <tr
                      key={v.id}
                      className={`border-b border-stone-50 ${
                        highlighted && String(v.id) === String(highlighted.id)
                          ? "bg-amber-50"
                          : ""
                      }`}
                    >
                      <td className="py-2.5 pr-4 text-stone-400">{i + 1}</td>
                      <td className="py-2.5 pr-4 font-mono font-semibold text-stone-800">
                        {v.vehicleNumber}
                      </td>
                      <td className="py-2.5 pr-4 text-stone-600">{v.vehicleType || "—"}</td>
                      <td className="py-2.5 pr-4 text-stone-600">{v.driverName || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex items-center justify-center gap-2 text-xs text-stone-400 pb-4">
          <Building2 className="h-3.5 w-3.5" />
          Issued by Chennai Port Authority
        </div>
      </div>
    </div>
  );
}

export default function BulkPassViewPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-stone-50">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
        </div>
      }
    >
      <BulkPassViewContent />
    </Suspense>
  );
}
