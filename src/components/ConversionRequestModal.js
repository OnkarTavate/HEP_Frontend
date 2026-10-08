"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Upload,
  Building2,
  FileText,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  User,
  Truck,
  Calendar,
  Eye,
  ExternalLink,
  Maximize,
  Minimize,
  Loader2,
} from "lucide-react";
import axios from "axios";

// Helper: format YYYY-MM-DD to DD/MM/YYYY for display
const formatDateDMY = (dateStr) => {
  if (!dateStr) return "";
  const parts = String(dateStr).split("T")[0].split("-");
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

// Helper: today as YYYY-MM-DD
const getTodayStr = () => {
  const d = new Date();
  return d.toISOString().split("T")[0];
};

// Custom date input that displays DD/MM/YYYY
const DateInputDMY = ({ value, onChange, min, max, required, className }) => {
  const dateRef = useRef(null);
  return (
    <div className={`relative ${className || ""}`}>
      <div
        onClick={() => dateRef.current?.showPicker?.() || dateRef.current?.click()}
        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-medium focus-within:ring-2 focus-within:ring-indigo-500 outline-none cursor-pointer bg-white flex items-center justify-between gap-1"
      >
        <span className={value ? "text-slate-800" : "text-slate-400"}>
          {value ? formatDateDMY(value) : "DD/MM/YYYY"}
        </span>
        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
      </div>
      <input
        ref={dateRef}
        type="date"
        value={value || ""}
        min={min}
        max={max}
        required={required}
        onChange={onChange}
        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
        tabIndex={-1}
      />
    </div>
  );
};

export default function ConversionRequestModal({
  isOpen,
  onClose,
  entityData = null,
  entityType = "person",
  selectedItems = [],
  onSuccess,
}) {
  const [departmentId, setDepartmentId] = useState("3");
  const [purpose, setPurpose] = useState("");
  const [requisitionFile, setRequisitionFile] = useState(null);
  const [existingRequisitionPath, setExistingRequisitionPath] = useState(null);
  const [revertReason, setRevertReason] = useState(null);
  const [itemsData, setItemsData] = useState([]);

  // Batch default date helpers
  const [batchStartDate, setBatchStartDate] = useState("");
  const [batchEndDate, setBatchEndDate] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Requisition Letter Document Viewer Modal
  const [docViewerUrl, setDocViewerUrl] = useState(null);
  const [docViewerTitle, setDocViewerTitle] = useState("Requisition Letter");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [docLoading, setDocLoading] = useState(false);
  const [isDocImage, setIsDocImage] = useState(false);
  const docBlobUrlRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      setPurpose("");
      setRequisitionFile(null);
      setExistingRequisitionPath(null);
      setRevertReason(null);
      setErrorMessage("");
      setSuccessMessage("");
      setBatchStartDate("");
      setBatchEndDate("");
      setItemsData([]);
      if (docBlobUrlRef.current) {
        URL.revokeObjectURL(docBlobUrlRef.current);
        docBlobUrlRef.current = null;
      }
      setDocViewerUrl(null);
      setIsFullscreen(false);
      setDocLoading(false);
      setIsDocImage(false);
      return;
    }

    let itemsToProcess = [];
    if (selectedItems && selectedItems.length > 0) {
      itemsToProcess = selectedItems;
    } else if (entityData) {
      itemsToProcess = [
        {
          id: entityData.id,
          type: entityType || entityData.type || "person",
          name:
            entityData.name ||
            entityData.person_name ||
            entityData.registrationNo ||
            entityData.regNo ||
            `ID: ${entityData.id}`,
          passNo: entityData.personPassNo || entityData.vehiclePassNo,
          dateFrom: entityData.dateFrom || entityData.fromDate,
          dateTo: entityData.dateTo || entityData.toDate,
          conversionStartDate: entityData.conversionStartDate,
          conversionEndDate: entityData.conversionEndDate,
          conversionDepartmentId: entityData.conversionDepartmentId,
          conversionPurpose: entityData.conversionPurpose,
          conversionRequisitionFilePath:
            entityData.conversionRequisitionFilePath,
          conversionRevertReason: entityData.conversionRevertReason,
        },
      ];
    }

    // Prefill old conversion data from items or entityData
    const reqPath =
      itemsToProcess
        .map(
          (it) =>
            it.conversionRequisitionFilePath ||
            it.requisitionLetterPath ||
            it.requisitionLetterFilePath ||
            it.existingRequisitionPath ||
            it.passRequisitionLetter
        )
        .find(Boolean) ||
      entityData?.conversionRequisitionFilePath ||
      entityData?.requisitionLetterPath ||
      entityData?.requisitionLetterFilePath ||
      entityData?.existingRequisitionPath ||
      entityData?.passRequisitionLetter ||
      null;

    if (reqPath) {
      setExistingRequisitionPath(reqPath);
    } else {
      setExistingRequisitionPath(null);
    }

    const dept =
      itemsToProcess
        .map((it) => it.conversionDepartmentId || it.departmentId)
        .find(Boolean) ||
      entityData?.conversionDepartmentId ||
      entityData?.departmentId;
    if (dept) {
      setDepartmentId(String(dept));
    } else {
      setDepartmentId("3");
    }

    const purp =
      itemsToProcess
        .map((it) => it.conversionPurpose || it.purpose)
        .find(Boolean) ||
      entityData?.conversionPurpose ||
      entityData?.purpose;
    if (purp) {
      setPurpose(purp);
    } else {
      setPurpose("");
    }

    const revReason =
      itemsToProcess
        .map(
          (it) =>
            it.conversionRevertReason ||
            it.revertReason ||
            it.rejectedReason
        )
        .find(Boolean) ||
      entityData?.conversionRevertReason ||
      entityData?.revertReason ||
      entityData?.rejectedReason;
    if (revReason) {
      setRevertReason(revReason);
    } else {
      setRevertReason(null);
    }

    const today = getTodayStr();
    const initialized = itemsToProcess.map((item) => {
      const fromStr = item.dateFrom || item.fromDate
        ? String(item.dateFrom || item.fromDate).split("T")[0]
        : "";
      const toStr = item.dateTo || item.toDate
        ? String(item.dateTo || item.toDate).split("T")[0]
        : "";

      // Default start date: today if it falls within validity, otherwise pass start
      let defaultStart = today;
      if (fromStr && defaultStart < fromStr) defaultStart = fromStr;
      if (toStr && defaultStart > toStr) defaultStart = toStr;

      const convStart = item.conversionStartDate
        ? String(item.conversionStartDate).split("T")[0]
        : defaultStart;
      const convEnd = item.conversionEndDate
        ? String(item.conversionEndDate).split("T")[0]
        : toStr;

      return {
        ...item,
        type: item.type || entityType || "person",
        name:
          item.name ||
          item.person_name ||
          item.registrationNo ||
          item.regNo ||
          item.registration_no ||
          `ID: ${item.id}`,
        passNo:
          item.passNo || item.personPassNo || item.vehiclePassNo || "N/A",
        fromStr,
        toStr,
        conversionStartDate: convStart,
        conversionEndDate: convEnd,
      };
    });
    setItemsData(initialized);
  }, [isOpen, selectedItems, entityData, entityType]);

  if (!isOpen) return null;

  const handleApplyBatchDates = () => {
    if (!batchStartDate || !batchEndDate) {
      setErrorMessage("Please select both batch start and end dates to apply.");
      return;
    }
    setErrorMessage("");
    setItemsData((prev) =>
      prev.map((item) => {
        let start = batchStartDate;
        let end = batchEndDate;
        if (item.fromStr && start < item.fromStr) start = item.fromStr;
        if (item.toStr && start > item.toStr) start = item.toStr;
        if (item.toStr && end > item.toStr) end = item.toStr;
        if (item.fromStr && end < item.fromStr) end = item.fromStr;
        return {
          ...item,
          conversionStartDate: start,
          conversionEndDate: end,
        };
      })
    );
  };

  const handleItemDateChange = (id, type, field, value) => {
    setItemsData((prev) =>
      prev.map((item) => {
        if (item.id === id && item.type === type) {
          return { ...item, [field]: value };
        }
        return item;
      })
    );
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (selected.type !== "application/pdf" && !selected.name.endsWith(".pdf")) {
        setErrorMessage("Please upload a valid PDF document for the Requisition Letter.");
        return;
      }
      setErrorMessage("");
      setRequisitionFile(selected);
    }
  };

  const handleViewExistingLetter = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!existingRequisitionPath) return;
    const cleanPath = String(existingRequisitionPath).replace(/\\/g, "/");
    const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5001";
    const url = cleanPath.startsWith("http")
      ? cleanPath
      : `${backendBase.replace(/\/$/, "")}/${cleanPath.replace(/^\//, "")}`;
    const fileName = existingRequisitionPath.split(/[\/\\]/).pop() || "Requisition Letter";
    setDocViewerTitle(fileName);
    setDocLoading(true);

    if (docBlobUrlRef.current) {
      URL.revokeObjectURL(docBlobUrlRef.current);
      docBlobUrlRef.current = null;
    }

    try {
      // Fetch file to inspect magic bytes (in case an image was uploaded and saved with a .pdf extension)
      const resp = await fetch(url);
      if (!resp.ok) throw new Error("Failed to load document");
      const blob = await resp.blob();
      const headerBuf = await blob.slice(0, 4).arrayBuffer();
      const bytes = new Uint8Array(headerBuf);

      // JPEG: FF D8 FF | PNG: 89 50 4E 47 | GIF: 47 49 46
      const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
      const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
      const isGif = bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46;

      if (isJpeg || isPng || isGif) {
        const mime = isJpeg ? "image/jpeg" : isPng ? "image/png" : "image/gif";
        const imgBlob = new Blob([blob], { type: mime });
        const blobUrl = URL.createObjectURL(imgBlob);
        docBlobUrlRef.current = blobUrl;
        setIsDocImage(true);
        setDocViewerUrl(blobUrl);
      } else {
        const pdfBlob = new Blob([blob], { type: "application/pdf" });
        const blobUrl = URL.createObjectURL(pdfBlob);
        docBlobUrlRef.current = blobUrl;
        setIsDocImage(false);
        setDocViewerUrl(blobUrl);
      }
    } catch (err) {
      console.error("Error inspecting document format:", err);
      setIsDocImage(false);
      setDocViewerUrl(url);
    }
  };

  const handleViewNewFile = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!requisitionFile) return;
    if (docBlobUrlRef.current) {
      URL.revokeObjectURL(docBlobUrlRef.current);
      docBlobUrlRef.current = null;
    }
    const isImg = requisitionFile.type.startsWith("image/");
    setIsDocImage(isImg);
    const url = URL.createObjectURL(requisitionFile);
    docBlobUrlRef.current = url;
    setDocViewerTitle(requisitionFile.name || "Uploaded Requisition Letter");
    setDocLoading(true);
    setDocViewerUrl(url);
  };

  const closeDocViewer = () => {
    if (docBlobUrlRef.current) {
      URL.revokeObjectURL(docBlobUrlRef.current);
      docBlobUrlRef.current = null;
    }
    setDocViewerUrl(null);
    setIsFullscreen(false);
    setDocLoading(false);
    setIsDocImage(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!requisitionFile && !existingRequisitionPath) {
      setErrorMessage("Requisition Letter PDF upload is mandatory for essential conversion.");
      return;
    }

    const payloadItems = [];
    for (const item of itemsData) {
      if (!item.conversionStartDate || !item.conversionEndDate) {
        setErrorMessage(`Please specify both start and end dates for ${item.name || item.passNo || "item"}.`);
        return;
      }
      if (item.conversionStartDate > item.conversionEndDate) {
        setErrorMessage(`Start date cannot be after end date for ${item.name || item.passNo || "item"}.`);
        return;
      }
      if (item.fromStr && item.conversionStartDate < item.fromStr) {
        setErrorMessage(`Start date for ${item.name} cannot be earlier than pass start date (${formatDateDMY(item.fromStr)}).`);
        return;
      }
      if (item.toStr && item.conversionEndDate > item.toStr) {
        setErrorMessage(`End date for ${item.name} cannot be later than pass expiry date (${formatDateDMY(item.toStr)}).`);
        return;
      }

      payloadItems.push({
        entityType: item.type,
        entityId: item.id,
        conversionStartDate: item.conversionStartDate,
        conversionEndDate: item.conversionEndDate,
      });
    }

    try {
      setLoading(true);
      const token = localStorage.getItem("accessToken");

      const formData = new FormData();
      formData.append("items", JSON.stringify(payloadItems));
      formData.append("departmentId", departmentId);
      formData.append("purpose", purpose);
      if (existingRequisitionPath) {
        formData.append("existingRequisitionPath", existingRequisitionPath);
      }
      if (requisitionFile) {
        formData.append("passRequisitionLetter", requisitionFile);
      }

      const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5001";
      const response = await axios.post(
        `${backendBase.replace(/\/$/, "")}/api/pass-request/request-bulk-pass-conversion`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.data?.success) {
        setSuccessMessage(
          revertReason
            ? "Essential conversion request updated and resubmitted successfully!"
            : itemsData.length === 1
              ? "Essential conversion request submitted successfully!"
              : `Essential conversion requested for ${itemsData.length} passes successfully!`
        );
        setTimeout(() => {
          if (onSuccess) onSuccess();
          onClose();
        }, 1500);
      } else {
        setErrorMessage(response.data?.message || "Failed to submit conversion request.");
      }
    } catch (err) {
      console.error("Conversion request error:", err);
      setErrorMessage(err.response?.data?.message || err.message || "Server error while submitting request.");
    } finally {
      setLoading(false);
    }
  };

  const isBulk = itemsData.length > 1;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-[#0a1e4d] to-indigo-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <FileText className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">
                {revertReason
                  ? (isBulk ? "Edit & Resubmit Bulk Essential Access" : "Edit & Resubmit Essential Conversion")
                  : (isBulk ? "Request Bulk Essential Access" : "Request Essential Pass (Oil Dock)")}
              </h3>
              <p className="text-xs text-indigo-200">
                {revertReason
                  ? `Update requisition details and resubmit for approval`
                  : (isBulk
                    ? `Convert ${itemsData.length} Ordinary Passes to Essential Pass`
                    : `Convert Pass for ${itemsData[0]?.name || "Entity"}`)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Revert Reason Warning Banner */}
          {revertReason && (
            <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-3 text-xs text-amber-900 shadow-sm animate-in fade-in duration-200">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-950 uppercase tracking-wider text-[11px]">
                  Approver Revert Reason:
                </p>
                <p className="text-amber-900 font-semibold mt-0.5 text-sm">
                  {revertReason}
                </p>
                <p className="text-[11px] text-amber-700 mt-1">
                  Please review the remarks and update requisition dates, department, or upload a revised letter below before resubmitting.
                </p>
              </div>
            </div>
          )}

          {/* Alerts */}
          {errorMessage && (() => {
            const parts = errorMessage.split(" | ").filter(Boolean);
            return (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  {parts.length === 1 ? (
                    <span>{parts[0]}</span>
                  ) : (
                    <ul className="list-disc pl-4 space-y-0.5">
                      {parts.map((msg, i) => (
                        <li key={i}>{msg.trim()}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            );
          })()}

          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-700 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Common Settings Card */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Department Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                Select Supervising Department *
              </label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
                required
              >
                <option value="3">Civil Department</option>
                <option value="4">Mechanical Department</option>
                <option value="9">Traffic (Pass Section) Department</option>
              </select>
            </div>

            {/* Purpose / Justification */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Purpose / Work Justification
              </label>
              <input
                type="text"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="Reason for temporary Oil Dock access..."
                className="w-full px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
              />
            </div>

            {/* Requisition Letter Upload & View */}
            <div className="md:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <Upload className="w-3.5 h-3.5 text-indigo-600" />
                  Requisition Letter (PDF) {existingRequisitionPath ? "(Optional to Replace)" : "*"}
                </label>
                <div className="flex items-center gap-2">
                  {existingRequisitionPath && (
                      <button
                        type="button"
                        onClick={handleViewExistingLetter}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md shadow-xs transition-colors cursor-pointer"
                        title="Click to view existing requisition letter PDF"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View Document
                      </button>
                  )}
                </div>
              </div>
              <div className="relative border-2 border-dashed border-slate-300 rounded-xl p-3 text-center hover:border-indigo-500 transition-colors bg-white">
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  required={!existingRequisitionPath}
                />
                <div className="flex flex-col items-center justify-center gap-1">
                  <Upload className="w-5 h-5 text-indigo-500" />
                  <span className="text-xs font-semibold text-slate-700">
                    {requisitionFile
                      ? requisitionFile.name
                      : existingRequisitionPath
                        ? `Click or drag to upload a replacement Requisition Letter PDF`
                        : `Click or drag to upload Requisition Letter PDF ${isBulk ? "(Applies to all selected passes)" : ""}`}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {existingRequisitionPath && !requisitionFile
                      ? "Leave empty to retain existing requisition letter"
                      : "PDF format required"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Date Filling Tool (Only if multiple items) */}
          {isBulk && (
            <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-100 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-bold text-indigo-900">Quick Date Fill (Optional):</span>
              </div>
              <div className="flex items-center gap-2">
                <DateInputDMY
                  min={getTodayStr()}
                  value={batchStartDate}
                  onChange={(e) => setBatchStartDate(e.target.value)}
                  className=""
                />
                <span className="text-xs text-indigo-400">to</span>
                <DateInputDMY
                  min={batchStartDate || getTodayStr()}
                  value={batchEndDate}
                  onChange={(e) => setBatchEndDate(e.target.value)}
                  className=""
                />
                <button
                  type="button"
                  onClick={handleApplyBatchDates}
                  className="px-3 py-1 text-xs font-bold bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                >
                  Apply to All
                </button>
              </div>
            </div>
          )}

          {/* Selected Passes Table */}
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              {isBulk
                ? `Selected Passes (${itemsData.length}) — Set essential validity dates per pass`
                : "Pass Conversion Details"}
            </h4>
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 font-bold text-slate-700 border-b border-slate-200">
                  <tr>
                    <th className="p-3">Entity Details</th>
                    <th className="p-3">Pass Validity</th>
                    <th className="p-3">Essential Start Date *</th>
                    <th className="p-3">Essential End Date *</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {itemsData.map((item) => (
                    <tr key={`${item.type}-${item.id}`} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className={`p-1.5 rounded-lg shrink-0 ${item.type === "person" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}>
                            {item.type === "person" ? <User className="w-3.5 h-3.5" /> : <Truck className="w-3.5 h-3.5" />}
                          </span>
                          <div>
                            <p className="font-bold text-slate-800">{item.name || `ID: ${item.id}`}</p>
                            <p className="text-[11px] font-mono text-indigo-600">Pass #: {item.passNo || "N/A"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        {item.fromStr && item.toStr ? (
                          <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-700 font-mono text-[11px] rounded border border-slate-200 font-medium">
                            {formatDateDMY(item.fromStr)} to {formatDateDMY(item.toStr)}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Active</span>
                        )}
                      </td>
                      <td className="p-3">
                        <DateInputDMY
                          min={(() => {
                            const today = getTodayStr();
                            const passStart = item.fromStr || "";
                            return passStart > today ? passStart : today;
                          })()}
                          max={item.toStr || undefined}
                          value={item.conversionStartDate}
                          onChange={(e) => handleItemDateChange(item.id, item.type, "conversionStartDate", e.target.value)}
                          required
                        />
                      </td>
                      <td className="p-3">
                        <DateInputDMY
                          min={(() => {
                            const today = getTodayStr();
                            const start = item.conversionStartDate || item.fromStr || "";
                            return start > today ? start : today;
                          })()}
                          max={item.toStr || undefined}
                          value={item.conversionEndDate}
                          onChange={(e) => handleItemDateChange(item.id, item.type, "conversionEndDate", e.target.value)}
                          required
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-[#0a1e4d] to-indigo-700 hover:from-indigo-900 hover:to-indigo-800 rounded-lg shadow-md hover:shadow-lg disabled:opacity-50 transition-all flex items-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Submitting Request...
                </>
              ) : revertReason ? (
                "Resubmit Conversion Request"
              ) : (
                `Submit ${isBulk ? `Bulk Conversion (${itemsData.length} Passes)` : "Essential Request"}`
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Embedded Document Viewer Modal */}
      {docViewerUrl && (
        <div className="fixed inset-0 z-[10001] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 md:p-6 lg:p-8 animate-in fade-in duration-200">
          <div
            className={`bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 border border-slate-200 ${
              isFullscreen ? "w-full h-full" : "w-full max-w-4xl h-[85vh]"
            }`}
          >
            {/* Header */}
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-400" />
                <h3 className="font-bold text-sm tracking-wide truncate max-w-md">
                  {docViewerTitle}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={docViewerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 p-1.5 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold px-2.5"
                  title="Open in new window"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Open New Tab</span>
                </a>
                <button
                  type="button"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 p-1.5 rounded-lg transition-colors"
                  title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                >
                  {isFullscreen ? (
                    <Minimize className="h-4 w-4" />
                  ) : (
                    <Maximize className="h-4 w-4" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={closeDocViewer}
                  className="bg-slate-800 hover:bg-red-600 text-slate-200 hover:text-white p-1.5 rounded-lg transition-colors"
                  title="Close Viewer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Document View Container (PDF or Image) */}
            <div className="flex-1 w-full bg-slate-100 relative flex items-center justify-center overflow-auto p-2">
              {docLoading && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-50/90 gap-2">
                  <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
                  <p className="text-xs font-semibold text-slate-600">Loading document...</p>
                </div>
              )}
              {isDocImage ? (
                <div className="w-full h-full flex items-center justify-center bg-slate-900/90 p-4 rounded-lg overflow-auto">
                  <img
                    src={docViewerUrl}
                    alt="Document"
                    className="max-w-full max-h-[75vh] object-contain rounded-md shadow-2xl bg-white"
                    onLoad={() => setDocLoading(false)}
                  />
                </div>
              ) : (
                <iframe
                  src={docViewerUrl}
                  className="w-full h-full border-none bg-white"
                  title="Document Viewer"
                  onLoad={() => setDocLoading(false)}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
