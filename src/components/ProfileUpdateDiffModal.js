"use client";

import { useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import {
  X,
  CheckCircle2,
  XCircle,
  RotateCcw,
  FileText,
  Building2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Clock,
  ArrowRight,
  Maximize2,
  Minimize2,
  Loader2,
  Eye,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const ADMIN_API = process.env.NEXT_PUBLIC_ADMIN_API || "http://localhost:5005/api";

export default function ProfileUpdateDiffModal({ request, isOpen, onClose, onActionSuccess }) {
  const [remarks, setRemarks] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionType, setActionType] = useState(null); // 'approve', 'revert', 'reject'
  const [docViewerUrl, setDocViewerUrl] = useState(null);
  const [docViewerTitle, setDocViewerTitle] = useState("");
  const [docViewerLoading, setDocViewerLoading] = useState(false);
  const [docIsFullscreen, setDocIsFullscreen] = useState(false);

  if (!isOpen || !request) return null;

  const currentProfile = request.currentProfile || {
    entityName: request.currentEntityName,
    authorizedPersonName:
      request.currentFirstName && request.currentLastName
        ? `${request.currentFirstName} ${request.currentLastName}`
        : request.currentFirstName || request.currentLastName || "",
    mobileNo: request.currentMobileNo,
    email: request.currentEmail,
    address: request.currentAddressLine,
    city: request.currentCity,
    state: request.currentState,
    pincode: request.currentPincode,
    licenseNumber: request.currentLicenseNumber,
    licenseValidityDate: request.currentIsLifetimeLicense ? "Lifetime Validity" : request.currentLicenseValidityDate,
    gstinNumber: request.currentGstinNumber,
    panNumber: request.currentPanNumber,
    tanNumber: request.currentTanNumber,
  };

  const requestedChanges = request.requestedChanges || {
    entityName: request.entityName,
    authorizedPersonName: request.authorizedPersonName,
    mobileNo: request.mobileNo,
    email: request.email,
    address: request.addressLine || request.address,
    city: request.city,
    state: request.state,
    pincode: request.pincode,
    licenseNumber: request.licenseNumber,
    licenseValidityDate: (request.isLifetimeLicense || request.requestedChanges?.isLifetimeLicense) ? "Lifetime Validity" : (request.requestedChanges?.licenseValidityDate || request.licenseValidityDate),
    gstinNumber: request.gstinNumber,
    panNumber: request.panNumber,
    tanNumber: request.tanNumber,
  };

  const fieldDefs = [
    { key: "entityName", label: "Company / Entity Name" },
    { key: "authorizedPersonName", label: "Authorized Person Name" },
    { key: "mobileNo", label: "Mobile Number" },
    { key: "email", label: "Email Address" },
    { key: "address", label: "Address" },
    { key: "city", label: "City" },
    { key: "state", label: "State" },
    { key: "pincode", label: "Pincode" },
    { key: "licenseNumber", label: "License Number" },
    { key: "licenseValidityDate", label: "License Validity Date", isDate: true },
    { key: "gstinNumber", label: "GSTIN Number" },
    { key: "panNumber", label: "PAN Number" },
    { key: "tanNumber", label: "TAN Number" },
  ];

  const normStr = (val) => (val === null || val === undefined ? "" : String(val).trim());

  const modifiedFields = fieldDefs.filter((fd) => {
    const reqVal = normStr(requestedChanges[fd.key]);
    if (!reqVal) return false;
    const currVal = normStr(currentProfile[fd.key]);
    if (fd.isDate) {
      const d1 = reqVal.substring(0, 10);
      const d2 = currVal.substring(0, 10);
      return Boolean(d1) && d1 !== d2;
    }
    return reqVal !== currVal;
  });

  const formatVal = (val, isDate) => {
    if (!val) return "—";
    if (val === "Lifetime Validity") return "Lifetime Validity (No Expiry)";
    if (isDate) {
      try {
        return new Date(val).toLocaleDateString("en-GB");
      } catch {
        return val;
      }
    }
    return String(val);
  };

  const handleOpenDoc = async (filePath, docLabel = "Verification Document") => {
    if (!filePath) {
      toast.error("No file uploaded for this document.");
      return;
    }
    setDocViewerLoading(true);
    setDocViewerTitle(docLabel);
    try {
      const token = localStorage.getItem("accessToken");
      const url = `${ADMIN_API}/user/profile-update-requests/document?filePath=${encodeURIComponent(filePath)}`;
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      });
      const contentType = response.headers["content-type"] || "application/pdf";
      const blob = new Blob([response.data], { type: contentType });
      const blobUrl = window.URL.createObjectURL(blob);
      setDocViewerUrl(blobUrl);
    } catch (err) {
      console.error("Failed to view document:", err);
      toast.error(err.response?.data?.message || "Failed to load verification document.");
      setDocViewerUrl(null);
    } finally {
      setDocViewerLoading(false);
    }
  };

  const closeDocViewer = () => {
    if (docViewerUrl) {
      window.URL.revokeObjectURL(docViewerUrl);
    }
    setDocViewerUrl(null);
    setDocIsFullscreen(false);
  };

  const handleAction = async (action) => {
    if ((action === "revert" || action === "reject") && !remarks.trim()) {
      toast.warning(`Please provide remarks/reason for ${action === "revert" ? "reverting" : "rejecting"} the request.`);
      return;
    }

    setActionLoading(true);
    setActionType(action);
    try {
      const token = localStorage.getItem("accessToken");
      const res = await axios.post(
        `${ADMIN_API}/user/profile-update-requests/${request.id}/action`,
        {
          action,
          rejectedReason: remarks,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.data?.success) {
        toast.success(res.data.message || `Request successfully ${action}d!`);
        if (onActionSuccess) onActionSuccess();
        onClose();
      } else {
        toast.error(res.data?.message || `Failed to ${action} request.`);
      }
    } catch (err) {
      console.error("Action processing error:", err);
      toast.error(err.response?.data?.message || `Server error during ${action}.`);
    } finally {
      setActionLoading(false);
      setActionType(null);
    }
  };

  const modifiedKeys = new Set(modifiedFields.map((f) => f.key));

  const docs = [
    {
      label: "Renewed License Copy",
      path: request.licenseDocPath || request.licenseDoc,
      show: Boolean(request.licenseDocPath || request.licenseDoc) && (modifiedKeys.has("licenseNumber") || modifiedKeys.has("licenseValidityDate")),
    },
    {
      label: "Entity Name Proof",
      path: request.entityNameDocPath || request.entityNameDoc,
      show: Boolean(request.entityNameDocPath || request.entityNameDoc) && modifiedKeys.has("entityName"),
    },
    {
      label: "Address Proof",
      path: request.addressDocPath || request.addressDoc,
      show: Boolean(request.addressDocPath || request.addressDoc) && (modifiedKeys.has("address") || modifiedKeys.has("city") || modifiedKeys.has("state") || modifiedKeys.has("pincode")),
    },
    {
      label: "GST Certificate",
      path: request.gstinDocPath || request.gstinDoc,
      show: Boolean(request.gstinDocPath || request.gstinDoc) && modifiedKeys.has("gstinNumber"),
    },
    {
      label: "PAN Card Copy",
      path: request.panDocPath || request.panDoc,
      show: Boolean(request.panDocPath || request.panDoc) && modifiedKeys.has("panNumber"),
    },
    {
      label: "TAN Document Copy",
      path: request.tanDocPath || request.tanDoc,
      show: Boolean(request.tanDocPath || request.tanDoc) && modifiedKeys.has("tanNumber"),
    },
  ].filter((d) => d.show);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="w-full max-w-5xl bg-white dark:bg-[#1f232d] rounded-3xl shadow-2xl border border-stone-200/50 dark:border-white/10 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-gradient-to-r from-[#1f1f1f] via-[#2a2520] to-[#3a2f1f] px-6 py-5 flex items-center justify-between text-white border-b border-amber-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                Profile Update Request
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {request.referenceNumber || `#${request.id}`}
                </span>
              </h2>
              <p className="text-xs text-stone-400 font-medium">
                {currentProfile.entityName || request.currentEntityName || request.entityName || "Company Profile Changes"}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {request.remarks && request.remarks.trim() !== "" && (
            <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 flex items-start gap-3">
              <MessageSquare className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-stone-700 dark:text-stone-300">
                  Company Submission Remarks
                </h4>
                <p className="text-xs text-stone-600 dark:text-stone-400 mt-1 font-medium leading-relaxed">
                  "{request.remarks}"
                </p>
              </div>
            </div>
          )}

          {request.status !== "pending" && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-amber-500 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">
                    Request Status: {request.status}
                  </p>
                  <p className="text-xs text-stone-600 dark:text-stone-400">
                    Processed by {request.processedBy || "Approver"} on{" "}
                    {request.processedAt ? new Date(request.processedAt).toLocaleString("en-GB") : "N/A"}
                  </p>
                </div>
              </div>
              {request.rejectedReason && (
                <div className="text-right text-xs text-stone-600 dark:text-stone-400 max-w-xs">
                  <span className="font-semibold text-stone-900 dark:text-stone-200">Remarks:</span>{" "}
                  {request.rejectedReason}
                </div>
              )}
            </div>
          )}

          <div className="space-y-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-amber-500" />
              Requested Field Updates ({modifiedFields.length} Modified)
            </h3>

            {modifiedFields.length === 0 ? (
              <div className="p-4 text-center text-xs font-semibold text-stone-500 bg-stone-50 dark:bg-[#1a1d27] rounded-xl">
                No specific text field changes detected in this request.
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-stone-200 dark:border-white/10 shadow-sm">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-stone-100 dark:bg-[#181b24] text-stone-600 dark:text-stone-400 font-bold border-b border-stone-200 dark:border-white/10">
                    <tr>
                      <th className="py-3 px-4 w-1/4">Field Name</th>
                      <th className="py-3 px-4 w-3/8 text-stone-500">Current Value</th>
                      <th className="py-3 px-4 w-3/8 text-amber-600 dark:text-amber-400">Requested Update</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200 dark:divide-white/5 bg-white dark:bg-[#1f232d]">
                    {modifiedFields.map((field) => {
                      const currentVal = currentProfile[field.key];
                      const newVal = requestedChanges[field.key];

                      return (
                        <tr key={field.key} className="hover:bg-amber-50/50 dark:hover:bg-amber-500/5 transition-colors bg-amber-500/5 dark:bg-amber-500/10">
                          <td className="py-3 px-4 font-bold text-stone-800 dark:text-stone-200">
                            {field.label}
                          </td>
                          <td className="py-3 px-4 text-stone-500 font-mono line-through opacity-80">
                            {formatVal(currentVal, field.isDate)}
                          </td>
                          <td className="py-3 px-4 font-bold font-mono text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                            {formatVal(newVal, field.isDate)}
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 font-sans font-bold">
                              NEW
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-amber-500" />
              Attached Verification Supporting Documents ({docs.length})
            </h3>

            {docs.length === 0 ? (
              <div className="p-4 rounded-xl bg-stone-50 dark:bg-[#1a1d27] border border-stone-200 dark:border-white/10 text-xs text-stone-500 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-stone-400 shrink-0" />
                No additional verification documents were required or attached for this request.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {docs.map((doc, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-stone-50 dark:bg-[#1a1d27] border border-stone-200 dark:border-white/10 flex items-center justify-between gap-3 group hover:border-amber-500/40 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                        <FileText className="h-4 w-4 text-amber-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-stone-800 dark:text-stone-200 truncate">
                          {doc.label}
                        </p>
                        <p className="text-[10px] text-stone-400 truncate font-mono">
                          {doc.path.split("/").pop()}
                        </p>
                      </div>
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenDoc(doc.path, doc.label)}
                      className="shrink-0 text-xs font-bold border-amber-400 text-amber-700 dark:text-amber-300 hover:bg-amber-400 hover:text-black"
                    >
                      <Eye className="h-3.5 w-3.5 mr-1" /> View PDF
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {request.status === "pending" && (
            <div className="p-5 rounded-2xl bg-stone-50 dark:bg-[#1a1d27] border border-stone-200 dark:border-white/10 space-y-4">
              <div>
                <label className="block text-xs font-extrabold text-stone-700 dark:text-stone-300 mb-1.5 uppercase tracking-wider">
                  Approver Remarks / Reason (Mandatory for Revert & Reject)
                </label>
                <textarea
                  rows={2}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Enter remarks or correction instructions for the agent..."
                  className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-[#1f232d] border border-stone-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-stone-900 dark:text-white"
                />
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleAction("revert")}
                  className="bg-amber-500 hover:bg-amber-600 text-black font-bold px-5"
                >
                  {actionLoading && actionType === "revert" ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-1.5" />
                  ) : (
                    <RotateCcw className="h-4 w-4 mr-1.5" />
                  )}
                  Revert to Agent
                </Button>

                <Button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleAction("reject")}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold px-5"
                >
                  {actionLoading && actionType === "reject" ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-1.5" />
                  ) : (
                    <XCircle className="h-4 w-4 mr-1.5" />
                  )}
                  Reject Request
                </Button>

                <Button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleAction("approve")}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6"
                >
                  {actionLoading && actionType === "approve" ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-1.5" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 mr-1.5" />
                  )}
                  Approve & Update Profile
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {(docViewerUrl || docViewerLoading) && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className={`bg-slate-900 rounded-3xl shadow-2xl overflow-hidden ring-1 ring-white/10 flex flex-col transition-all duration-300 ${docIsFullscreen ? "w-full h-full rounded-none" : "w-full max-w-5xl h-[85vh]"}`}>
            <div className="bg-slate-950 px-6 py-4 flex items-center justify-between border-b border-white/10">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-amber-500" />
                <h3 className="font-semibold text-white text-base">{docViewerTitle}</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setDocIsFullscreen(!docIsFullscreen)}
                  className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
                  title={docIsFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                >
                  {docIsFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
                </button>
                <button
                  onClick={closeDocViewer}
                  className="text-slate-400 hover:text-red-400 p-2 rounded-lg hover:bg-red-500/10 transition-colors"
                  title="Close Preview"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="flex-1 w-full bg-slate-950 relative overflow-hidden">
              {docViewerLoading && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-950/90 text-white">
                  <Loader2 className="h-10 w-10 text-amber-500 animate-spin mb-3" />
                  <p className="text-slate-400 font-medium text-sm animate-pulse">Loading document preview...</p>
                </div>
              )}
              {docViewerUrl && (
                <iframe
                  src={docViewerUrl}
                  className="w-full h-full border-none"
                  title="Document Preview"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
