"use client";

import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { toast } from "sonner";
import {
  FileText,
  X,
  AlertCircle,
  CheckCircle2,
  Edit3,
  Package,
  Recycle,
  Send,
  ChevronLeft,
  Loader2,
  ClipboardList,
} from "lucide-react";

import MaterialTable from "./Materialtable";
import { materialSchema } from "./materialValidations";

const AGENT_API = process.env.NEXT_PUBLIC_AGENT_API;

const getLabelById = (arr, val, key = "label") => {
  if (!val) return "";
  if (!Array.isArray(arr)) return val;
  const item = arr.find(
    (x) => String(x.id) === String(val) || String(x.value) === String(val)
  );
  return item ? item[key] || item.unitName || item.name : val;
};

// Best-effort mapping of whatever the backend sent back for `unit`
// (could be an id, a name, or a stale value) onto the current units list.
const resolveUnitId = (units, val) => {
  if (val === null || val === undefined || val === "") return null;
  const match = units.find(
    (u) =>
      String(u.id) === String(val) ||
      String(u.unitName || u.name || u.label || "").toLowerCase() === String(val).toLowerCase()
  );
  return match ? Number(match.id) : (Number(val) || val);
};

const TYPE_META = {
  returnable: {
    key: "returnable",
    dataKey: "returnablePass",
    label: "Returnable Materials",
    icon: Recycle,
  },
  nonReturnable: {
    key: "nonReturnable",
    dataKey: "nonReturnablePass",
    label: "Non-Returnable Materials",
    icon: Package,
  },
};

const cleanRemarks = (raw) => {
  if (!raw || typeof raw !== "string") return "";
  const parts = raw.split(/\s*\|\s*/);
  const cleaned = [];
  for (let part of parts) {
    const stripped = part.replace(/^(RETURNABLE|NON[-_]RETURNABLE)\s*:\s*/i, "").trim();
    if (stripped && !cleaned.includes(stripped)) {
      cleaned.push(stripped);
    }
  }
  return cleaned.join(" | ") || raw.trim();
};

export default function EditRevertedPassModal({ pass, onClose, onResubmitSuccess }) {
  const [units, setUnits] = useState([]);
  const [unitsLoading, setUnitsLoading] = useState(true);

  // { returnable?: { passId, status: 'reverted'|'updated', remarks, materials: [] },
  //   nonReturnable?: { ... } }
  const [edits, setEdits] = useState({});
  const [editingType, setEditingType] = useState(null); // null | 'returnable' | 'nonReturnable'
  const [draft, setDraft] = useState(null); // { passId, status, remarks, materials } — scratch copy
  const [submitting, setSubmitting] = useState(false);
  const tableRef = useRef(null);

  // --- Fetch units master data (needed by MaterialTable) ---
  useEffect(() => {
    const fetchUnits = async () => {
      try {
        setUnitsLoading(true);
        const token = localStorage.getItem("accessToken");
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const res = await axios
          .get(`${AGENT_API}/material-pass/units`, config)
          .catch(() => ({ data: [] }));
        const list = Array.isArray(res?.data?.data)
          ? res.data.data
          : Array.isArray(res?.data)
            ? res.data
            : [];
        setUnits(list);
      } catch (error) {
        console.error("Error loading units", error);
        setUnits([]);
      } finally {
        setUnitsLoading(false);
      }
    };
    fetchUnits();
  }, []);

  // --- Seed local edit state from the pass's reverted material-pass types ---
  useEffect(() => {
    if (!pass || unitsLoading) return;

    const next = {};
    Object.values(TYPE_META).forEach((meta) => {
      const data = pass[meta.dataKey];
      if (data && String(data.status || "").toUpperCase() === "REVERTED") {
        next[meta.key] = {
          passId: data.id,
          status: "reverted",
          remarks: data.remarks || data.rejectedReason || "",
          materials: (data.materials || [])
            .slice()
            .sort((a, b) => Number(a.id || 0) - Number(b.id || 0))
            .map((m) => ({
            name: m.name || "",
            isHazardous: Boolean(m.isHazardous),
            quantity:
              m.quantity !== null && m.quantity !== undefined
                ? Number(m.quantity)
                : m.requestedQty !== null && m.requestedQty !== undefined
                  ? Number(m.requestedQty)
                  : null,
            unit: m.unitId ? Number(m.unitId) : resolveUnitId(units, m.unit),
            description: m.description || "",
            approverRemarks: m.approverRemarks || "",
          })),
        };
      }
    });
    setEdits(next);
  }, [pass, units, unitsLoading]);

  if (!pass) return null;

  const passIdStr = pass.referenceNo || (pass.id ? `REQ-${pass.id}` : "MREQ-0001");
  const createdAtStr = pass.createdAt || pass.submittedAt;

  const typeKeys = Object.keys(edits);
  const updatedCount = typeKeys.filter((t) => edits[t].status === "updated").length;
  const allUpdated = typeKeys.length > 0 && updatedCount === typeKeys.length;

  const overallRevertRemarks = cleanRemarks(
    pass.rejectedReason ||
    pass.remarks ||
    pass.returnablePass?.rejectedReason ||
    pass.returnablePass?.remarks ||
    pass.nonReturnablePass?.rejectedReason ||
    pass.nonReturnablePass?.remarks ||
    Object.values(edits).map((e) => e.remarks).filter(Boolean).join(" | ") ||
    ""
  );

  const openEditingType = (type) => {
    setDraft({
      ...edits[type],
      materials: edits[type].materials.map((m) => ({ ...m })),
    });
    setEditingType(type);
  };

  const handleBackToSummary = () => {
    setEditingType(null);
    setDraft(null);
  };

  const handleDoneEditing = () => {
    if (!draft) return;
    if (tableRef.current?.isEditing) {
      const ok = tableRef.current.commitDraft();
      if (!ok) {
        toast.warning("Please complete or fix the active material row before updating.");
        return;
      }
    }
    if (!draft.materials.length) {
      toast.warning(`Please add at least one material to ${TYPE_META[editingType].label}.`);
      return;
    }
    const cleanMaterials = draft.materials.map((m) => ({
      ...m,
      name: (m.name || "").trim(),
      quantity: Number(m.quantity),
      unit: Number(m.unit),
      isHazardous: Boolean(m.isHazardous),
      description: (m.description || "").trim(),
    }));
    const allValid = cleanMaterials.every((m) => materialSchema.safeParse(m).success);
    if (!allValid) {
      toast.warning("Please fix incomplete material rows before continuing.");
      return;
    }
    setEdits((prev) => ({
      ...prev,
      [editingType]: { ...prev[editingType], materials: cleanMaterials, status: "updated" },
    }));
    setEditingType(null);
    setDraft(null);
    toast.success(`${TYPE_META[editingType].label} updated.`);
  };

  const handleViewRequestDoc = (passRequestId, documentType) => {
    window.open(
      `${AGENT_API}/material-pass/viewMaterialPassDocument?passRequestId=${passRequestId}&documentType=${documentType}`,
      "_blank"
    );
  };

  const handleResubmit = async () => {
    if (!allUpdated) {
      toast.warning("Please update all reverted material lists before resubmitting.");
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem("accessToken");
      const config = { headers: { Authorization: `Bearer ${token}` } };

      const payload = typeKeys.reduce((acc, type) => {
        const entry = edits[type];
        acc[type] = {
          passId: entry.passId,
          materials: entry.materials.map(({ name, unit, quantity, description, isHazardous }) => ({
            name: (name || "").trim(),
            unit: Number(unit),
            quantity: Number(quantity),
            description: description || null,
            isHazardous: Boolean(isHazardous),
          })),
        };
        return acc;
      }, {});

      const res = await axios.put(
        `${AGENT_API}/material-pass/resubmit-reverted-pass/${pass.id}`,
        payload,
        config
      );

      toast.success(
        "Material pass resubmitted successfully! The approval workflow has restarted from the beginning (Concerned Department)."
      );
      onResubmitSuccess?.(res.data?.data);
      onClose?.();
    } catch (error) {
      console.error("Error resubmitting material pass:", error);
      toast.error(
        error?.response?.data?.message || "Failed to resubmit material pass."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in zoom-in-95 duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex justify-between items-center gap-2 px-4 sm:px-6 py-4 bg-[#0a1e4d] text-white shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Edit3 className="h-5 w-5 sm:h-6 sm:w-6 text-orange-400 shrink-0" />
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold tracking-wide truncate">
                Edit & Resubmit Material Pass
              </h2>
              <p className="text-[11px] text-white/70 font-medium truncate">
                {passIdStr}
                {createdAtStr &&
                  ` · Submitted ${new Date(createdAtStr).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white p-2 shrink-0 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Pre-filled pass overview & Attached Documents */}
        <div className="px-4 sm:px-6 py-2.5 bg-slate-100/90 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex flex-wrap items-center gap-4 text-slate-600">
            {pass.companyName && (
              <span>
                <strong className="text-slate-800">Company:</strong> {pass.companyName}
              </span>
            )}
            {pass.concernedDepartment && (
              <span>
                <strong className="text-slate-800">Department:</strong> {pass.concernedDepartment}
              </span>
            )}
            {pass.purpose && (
              <span>
                <strong className="text-slate-800">Purpose:</strong> {pass.purpose}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {pass.requisitionLetterFilePath && (
              <button
                type="button"
                onClick={() => handleViewRequestDoc(pass.id, "requisitionLetter")}
                className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <FileText className="h-3.5 w-3.5 text-blue-600" /> View Requisition Letter
              </button>
            )}
            {pass.workOrderFilePath && (
              <button
                type="button"
                onClick={() => handleViewRequestDoc(pass.id, "workOrder")}
                className="bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <FileText className="h-3.5 w-3.5 text-orange-600" /> View Work Order
              </button>
            )}
          </div>
        </div>

        {/* Meta / progress bar — becomes a sticky "Back to Summary" bar while editing */}
        {!unitsLoading && typeKeys.length > 0 && (
          <div className="px-4 sm:px-6 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-4 shrink-0">
            {editingType ? (
              <button
                onClick={handleBackToSummary}
                className="inline-flex items-center gap-2 text-sm font-black text-[#0a1e4d] hover:text-orange-600 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" /> Back to Summary
              </button>
            ) : (
              <>
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0">
                  <ClipboardList className="h-3.5 w-3.5 text-orange-500" />
                  {typeKeys.length} pass{typeKeys.length === 1 ? "" : "es"} reverted
                </div>
                <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-orange-500 to-orange-600 transition-all duration-300"
                    style={{
                      width: `${typeKeys.length ? (updatedCount / typeKeys.length) * 100 : 0}%`,
                    }}
                  />
                </div>
                <span className="text-xs font-bold text-[#0a1e4d] shrink-0">
                  {updatedCount}/{typeKeys.length} updated
                </span>
              </>
            )}
          </div>
        )}

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-50 space-y-5">
          {unitsLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="h-8 w-8 text-orange-500 animate-spin" />
              <p className="text-sm font-bold text-slate-400">Loading pass details...</p>
            </div>
          ) : typeKeys.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <CheckCircle2 className="h-12 w-12 text-emerald-400" />
              <p className="text-sm font-bold text-slate-600">
                Nothing to update on this request.
              </p>
              <p className="text-xs text-slate-400">
                No returnable or non-returnable pass is currently marked as reverted.
              </p>
            </div>
          ) : editingType ? (
            // ── Edit view for the selected pass type ──
            <div className="space-y-4 animate-in fade-in duration-200">

              {edits[editingType].remarks && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] font-bold text-amber-900 uppercase tracking-wider mb-1">
                      Reviewer Remarks — Action Required
                    </p>
                    <p className="text-sm text-amber-700">{cleanRemarks(edits[editingType].remarks)}</p>
                  </div>
                </div>
              )}

              {draft.materials.some((m) => m.approverRemarks) && (
                <div className="bg-amber-50/90 border border-amber-300 rounded-xl p-3.5 flex items-start gap-2.5 text-xs shadow-sm">
                  <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="font-bold uppercase tracking-wider text-[10px] text-amber-900 mb-1">
                      Item-Level Reviewer Remarks:
                    </p>
                    <div className="space-y-1">
                      {draft.materials
                        .filter((m) => m.approverRemarks)
                        .map((m, i) => (
                          <div key={i} className="text-amber-800">
                            <span className="font-bold underline">{m.name}:</span>{" "}
                            {m.approverRemarks}
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              )}

              <MaterialTable
                ref={tableRef}
                title={TYPE_META[editingType].label}
                materials={draft.materials}
                setMaterials={(updater) =>
                  setDraft((prev) => ({
                    ...prev,
                    materials: typeof updater === "function" ? updater(prev.materials) : updater,
                  }))
                }
                units={units}
                getLabelById={getLabelById}
              />
            </div>
          ) : (
            // ── Summary view: one card per reverted pass type ──
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="font-bold text-amber-900 uppercase tracking-wide text-xs mb-1">
                    Action Required
                  </p>
                  <p className="text-amber-700">
                    One or more material lists on this request need correction. Review the
                    remarks below, update the affected items, then resubmit.
                  </p>
                </div>
              </div>

              {overallRevertRemarks && (
                <div className="bg-amber-50/90 border border-amber-300 p-4 rounded-xl shadow-xs">
                  <p className="text-[11px] font-bold text-amber-900 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-amber-600" />
                    Reviewer Remarks
                  </p>
                  <p className="text-sm font-semibold text-amber-950 bg-white/90 p-3 rounded-lg border border-amber-200">
                    {overallRevertRemarks}
                  </p>
                </div>
              )}

              {typeKeys.map((type) => {
                const meta = TYPE_META[type];
                const entry = edits[type];
                const Icon = meta.icon;
                const isUpdated = entry.status === "updated";

                return (
                  <div
                    key={type}
                    className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-colors ${
                      isUpdated ? "border-emerald-200" : "border-amber-200 border-dashed"
                    }`}
                  >
                    <div className="px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                            isUpdated
                              ? "bg-emerald-50 text-emerald-600"
                              : "bg-amber-50 text-amber-600"
                          }`}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-black text-[#0a1e4d] truncate">
                            {meta.label}
                          </p>
                          <p className="text-xs text-slate-500 font-medium">
                            {entry.materials.length} item
                            {entry.materials.length === 1 ? "" : "s"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`px-3 py-1 rounded-full text-[11px] font-bold border flex items-center gap-1 ${
                            isUpdated
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          {isUpdated ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          ) : (
                            <AlertCircle className="h-3.5 w-3.5" />
                          )}
                          {isUpdated ? "Updated" : "Needs Update"}
                        </span>
                        <button
                          onClick={() => openEditingType(type)}
                          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
                            isUpdated
                              ? "border border-slate-200 text-slate-600 hover:bg-slate-50"
                              : "bg-amber-500 hover:bg-amber-600 text-white shadow-sm"
                          }`}
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          {isUpdated ? "Edit Again" : "Update Materials"}
                        </button>
                      </div>
                    </div>

                    {entry.remarks && cleanRemarks(entry.remarks) !== overallRevertRemarks && (
                      <div className="px-5 py-3 bg-amber-50/70 border-t border-amber-100">
                        <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider mb-1">
                          Reviewer Remarks
                        </p>
                        <p className="text-sm text-amber-700">{cleanRemarks(entry.remarks)}</p>
                      </div>
                    )}
                  </div>
                );
              })}

              {allUpdated && (
                <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                  <p className="text-sm font-bold text-emerald-800">
                    All material lists updated — ready to resubmit.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {!editingType && typeKeys.length > 0 && (
          <div className="flex justify-between items-center gap-3 px-4 sm:px-6 py-4 border-t border-slate-200 bg-white shrink-0">
            <button
              onClick={onClose}
              className="bg-white border border-slate-300 text-slate-700 px-6 py-2.5 rounded-xl shadow-sm text-sm font-bold hover:bg-slate-50 transition-colors uppercase tracking-wider"
            >
              Cancel
            </button>
            <button
              onClick={handleResubmit}
              disabled={!allUpdated || submitting}
              className="bg-[#0a1e4d] hover:bg-[#1a2f64] disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-8 py-2.5 rounded-xl shadow-lg shadow-[#0a1e4d]/20 text-sm font-black flex items-center gap-2 transition-all uppercase tracking-wider"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" /> Resubmit Pass
                </>
              )}
            </button>
          </div>
        )}

        {(typeKeys.length === 0 && !unitsLoading) && (
          <div className="flex justify-end px-4 sm:px-6 py-4 border-t border-slate-200 bg-white shrink-0">
            <button
              onClick={onClose}
              className="bg-[#0a1e4d] text-white px-8 py-2.5 rounded-xl shadow-lg font-bold hover:bg-opacity-90 transition-colors uppercase tracking-wider text-sm"
            >
              Close
            </button>
          </div>
        )}

        {/* Sticky footer while editing a pass type */}
        {editingType && (
          <div className="flex justify-end items-center px-4 sm:px-6 py-4 border-t border-slate-200 bg-white shrink-0">
            <button
              onClick={handleDoneEditing}
              className="bg-[#0a1e4d] hover:bg-[#1a2f64] text-white px-8 py-2.5 rounded-xl text-sm font-black shadow-lg shadow-[#0a1e4d]/20 transition-all flex items-center gap-2 uppercase tracking-wider"
            >
              <CheckCircle2 className="h-4 w-4" /> Update
            </button>
          </div>
        )}
      </div>
    </div>
  );
}