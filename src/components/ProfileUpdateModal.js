"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import {
  X,
  Upload,
  FileText,
  AlertTriangle,
  Clock,
  Building2,
  Calendar,
  RefreshCw,
  MapPin,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const AGENT_API = process.env.NEXT_PUBLIC_AGENT_API;

const FIELD_VALIDATORS = {
  mobileNo: (v) => /^[6-9]\d{9}$/.test(String(v || "").replace(/\s/g, "")),
  pincode: (v) => /^\d{6}$/.test(String(v || "").trim()),
  licenseNumber: (v) => String(v || "").trim().length >= 2,
  gstinNumber: (v) =>
    /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(
      String(v || "").toUpperCase().trim()
    ),
  panNumber: (v) => /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(String(v || "").toUpperCase().trim()),
  tanNumber: (v) =>
    !v || String(v).trim() === "" || /^[A-Z]{4}[0-9]{5}[A-Z]{1}$/.test(String(v).toUpperCase().trim()),
};

const getFieldError = (field, value) => {
  if (!value && field !== "tanNumber") return null;
  switch (field) {
    case "mobileNo":
      return FIELD_VALIDATORS.mobileNo(value)
        ? null
        : "Enter a valid 10-digit Indian mobile number starting with 6-9";
    case "pincode":
      return FIELD_VALIDATORS.pincode(value) ? null : "PIN code must be exactly 6 digits";
    case "licenseNumber":
      return FIELD_VALIDATORS.licenseNumber(value) ? null : "License number must contain numbers only";
    case "gstinNumber":
      return FIELD_VALIDATORS.gstinNumber(value)
        ? null
        : "Enter a valid 15-character GSTIN (e.g. 22AAAAA0000A1Z5)";
    case "panNumber":
      return FIELD_VALIDATORS.panNumber(value) ? null : "PAN must be in format: ABCDE1234F";
    case "tanNumber":
      return FIELD_VALIDATORS.tanNumber(value) ? null : "TAN must be in format: AAAA12345A (optional)";
    default:
      return null;
  }
};

export default function ProfileUpdateModal({ isOpen, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [activeRequest, setActiveRequest] = useState(null);
  const [isResubmitting, setIsResubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  // Address Location Dropdown states
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);

  // Form inputs
  const [formData, setFormData] = useState({
    entityName: "",
    address: "",
    country: "India",
    state: "",
    city: "",
    pincode: "",
    authorizedPersonName: "",
    mobileNo: "",
    email: "",
    gstinNumber: "",
    panNumber: "",
    tanNumber: "",
    licenseNumber: "",
    licenseValidityDate: "",
    remarks: "",
  });

  // File uploads
  const [files, setFiles] = useState({
    licenseDoc: null,
    entityNameDoc: null,
    addressDoc: null,
    gstinDoc: null,
    panDoc: null,
    tanDoc: null,
  });

  // Dynamic mandatory flags
  const [requiredDocs, setRequiredDocs] = useState({
    licenseDoc: false,
    entityNameDoc: false,
    addressDoc: false,
    gstinDoc: false,
    panDoc: false,
    tanDoc: false,
  });

  // Calculate if any field or document has been modified compared to current profile
  const profAuthPerson = profile?.authorizedPersonName || (profile?.firstName ? `${profile.firstName} ${profile.lastName || ""}`.trim() : "");
  const profMobile = profile?.mobileNo || profile?.mobileNumber || profile?.contactMobile || "";
  const profEmail = profile?.email || profile?.contactEmail || "";
  const profAddress = profile?.address || profile?.addressLine || "";
  const profLicDate = profile?.licenseValidityDate ? String(profile.licenseValidityDate).substring(0, 10) : "";

  const licNumChanged = (formData.licenseNumber || "").trim() !== (profile?.licenseNumber || "").trim();
  const licDateChanged = (formData.licenseValidityDate || "").trim() !== profLicDate.trim();
  const nameChanged = (formData.entityName || "").trim() !== (profile?.entityName || "").trim();
  const authPersonChanged = (formData.authorizedPersonName || "").trim() !== profAuthPerson.trim();
  const mobileChanged = (formData.mobileNo || "").trim() !== profMobile.trim();
  const emailChanged = (formData.email || "").trim() !== profEmail.trim();
  const addrChanged =
    (formData.address || "").trim() !== profAddress.trim() ||
    (formData.country || "").trim().toLowerCase() !== (profile?.country || "India").trim().toLowerCase() ||
    (formData.state || "").trim().toLowerCase() !== (profile?.state || "").trim().toLowerCase() ||
    (formData.city || "").trim().toLowerCase() !== (profile?.city || "").trim().toLowerCase() ||
    (formData.pincode || "").trim() !== (profile?.pincode || "").trim();
  const gstinChanged = (formData.gstinNumber || "").trim() !== (profile?.gstinNumber || "").trim();
  const panChanged = (formData.panNumber || "").trim() !== (profile?.panNumber || "").trim();
  const tanChanged = (formData.tanNumber || "").trim() !== (profile?.tanNumber || "").trim();

  const hasFileUploaded = Object.values(files).some((f) => !!f);

  const hasAnyChange =
    licNumChanged ||
    licDateChanged ||
    nameChanged ||
    authPersonChanged ||
    mobileChanged ||
    emailChanged ||
    addrChanged ||
    gstinChanged ||
    panChanged ||
    tanChanged ||
    hasFileUploaded;

  useEffect(() => {
    if (isOpen) {
      fetchCountries();
      loadData();
    }
  }, [isOpen]);

  const fetchCountries = async () => {
    try {
      const res = await axios.get(`${AGENT_API}/pass-request/get-countries`);
      if (res.data?.success) {
        setCountries(res.data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch countries:", err);
    }
  };

  const fetchStates = async (countryId) => {
    setLoadingStates(true);
    try {
      const res = await axios.get(`${AGENT_API}/pass-request/get-states`, {
        params: { countryId },
      });
      if (res.data?.success) {
        setStates(res.data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch states:", err);
    } finally {
      setLoadingStates(false);
    }
  };

  const fetchCities = async (stateId) => {
    setLoadingCities(true);
    try {
      const res = await axios.get(`${AGENT_API}/pass-request/get-cities`, {
        params: { stateId },
      });
      if (res.data?.success) {
        setCities(res.data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch cities:", err);
    } finally {
      setLoadingCities(false);
    }
  };

  const loadData = async () => {
    setFetchLoading(true);
    try {
      const token = localStorage.getItem("accessToken");
      const headers = { Authorization: `Bearer ${token}` };

      // 1. Fetch current profile
      const profRes = await axios.get(`${AGENT_API}/agents/profile`, { headers });
      if (profRes.data?.success) {
        const p = profRes.data.data;
        setProfile(p);
        const countryVal = p.country || "India";
        const stateVal = p.state || "";
        const cityVal = p.city || "";

        setFormData({
          entityName: p.entityName || "",
          address: p.address || p.addressLine || "",
          country: countryVal,
          state: stateVal,
          city: cityVal,
          pincode: p.pincode || "",
          authorizedPersonName: p.authorizedPersonName || (p.firstName ? `${p.firstName} ${p.lastName || ""}`.trim() : ""),
          mobileNo: p.mobileNo || p.mobileNumber || p.contactMobile || "",
          email: p.email || p.contactEmail || "",
          gstinNumber: p.gstinNumber || "",
          panNumber: p.panNumber || "",
          tanNumber: p.tanNumber || "",
          licenseNumber: p.licenseNumber || "",
          licenseValidityDate: p.licenseValidityDate ? p.licenseValidityDate.substring(0, 10) : "",
          remarks: "",
        });
      }

      // 2. Fetch latest request status
      const reqRes = await axios.get(`${AGENT_API}/agents/profile-update-requests/my-requests`, { headers });
      if (reqRes.data?.success && reqRes.data.data?.length > 0) {
        const latest = reqRes.data.data[0];
        setActiveRequest(latest);
        if (latest.status === "reverted") {
          setIsResubmitting(true);
          const reqData = latest.requestedChanges || {};
          setFormData((prev) => ({
            ...prev,
            ...reqData,
            licenseValidityDate: reqData.licenseValidityDate ? reqData.licenseValidityDate.substring(0, 10) : prev.licenseValidityDate,
            remarks: latest.remarks || "",
          }));
        }
      } else {
        setActiveRequest(null);
        setIsResubmitting(false);
      }
    } catch (err) {
      console.error("Failed to load profile update data:", err);
      toast.error("Failed to load company profile details.");
    } finally {
      setFetchLoading(false);
    }
  };

  // Synchronize state & city options when country or state changes
  useEffect(() => {
    if (countries.length > 0 && formData.country) {
      const cObj = countries.find((c) => c.name.toLowerCase() === formData.country.toLowerCase());
      if (cObj) {
        fetchStates(cObj.id);
      }
    }
  }, [countries, formData.country]);

  useEffect(() => {
    if (states.length > 0 && formData.state) {
      const sObj = states.find((s) => s.name.toLowerCase() === formData.state.toLowerCase());
      if (sObj) {
        fetchCities(sObj.id);
      }
    }
  }, [states, formData.state]);

  // Evaluate dynamic document requirements when form data changes
  useEffect(() => {
    if (!profile) return;

    const licChanged =
      formData.licenseNumber !== (profile.licenseNumber || "") ||
      formData.licenseValidityDate !== (profile.licenseValidityDate ? profile.licenseValidityDate.substring(0, 10) : "");

    const nameChanged = formData.entityName !== (profile.entityName || "");

    const addrChanged =
      formData.address !== (profile.address || profile.addressLine || "") ||
      formData.country !== (profile.country || "India") ||
      formData.state !== (profile.state || "") ||
      formData.city !== (profile.city || "") ||
      formData.pincode !== (profile.pincode || "");

    const gstinChanged = formData.gstinNumber !== (profile.gstinNumber || "");
    const panChanged = formData.panNumber !== (profile.panNumber || "");
    const tanChanged = formData.tanNumber !== (profile.tanNumber || "");

    setRequiredDocs({
      licenseDoc: licChanged,
      entityNameDoc: nameChanged,
      addressDoc: addrChanged,
      gstinDoc: gstinChanged,
      panDoc: panChanged,
      tanDoc: tanChanged,
    });
  }, [formData, profile]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    let formattedValue = value;

    if (name === "mobileNo") {
      formattedValue = value.replace(/\D/g, "").slice(0, 10);
    } else if (name === "pincode") {
      formattedValue = value.replace(/\D/g, "").slice(0, 6);
    } else if (name === "licenseNumber") {
      formattedValue = value.replace(/\D/g, "");
    } else if (name === "gstinNumber") {
      formattedValue = value.toUpperCase().slice(0, 15);
    } else if (name === "panNumber") {
      formattedValue = value.toUpperCase().slice(0, 10);
    } else if (name === "tanNumber") {
      formattedValue = value.toUpperCase().slice(0, 10);
    }

    setFormData((prev) => ({ ...prev, [name]: formattedValue }));

    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleCountryChange = (e) => {
    const countryName = e.target.value;
    setFormData((prev) => ({ ...prev, country: countryName, state: "", city: "" }));
    setStates([]);
    setCities([]);
    const cObj = countries.find((c) => c.name === countryName);
    if (cObj) {
      fetchStates(cObj.id);
    }
  };

  const handleStateChange = (e) => {
    const stateName = e.target.value;
    setFormData((prev) => ({ ...prev, state: stateName, city: "" }));
    setCities([]);
    const sObj = states.find((s) => s.name === stateName);
    if (sObj) {
      fetchCities(sObj.id);
    }
  };

  const handleCityChange = (e) => {
    const cityName = e.target.value;
    setFormData((prev) => ({ ...prev, city: cityName }));
  };

  const handleFileChange = (e, field) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type !== "application/pdf") {
        toast.error("Only PDF files are allowed.");
        e.target.value = "";
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        toast.error("File size exceeds 2MB limit. Please upload a file under 2MB.");
        e.target.value = "";
        return;
      }
      setFiles((prev) => ({ ...prev, [field]: file }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Strict format validations
    const errors = {};
    if (formData.mobileNo) {
      const err = getFieldError("mobileNo", formData.mobileNo);
      if (err) errors.mobileNo = err;
    }
    if (formData.pincode) {
      const err = getFieldError("pincode", formData.pincode);
      if (err) errors.pincode = err;
    }
    if (formData.licenseNumber) {
      const err = getFieldError("licenseNumber", formData.licenseNumber);
      if (err) errors.licenseNumber = err;
    }
    if (formData.gstinNumber) {
      const err = getFieldError("gstinNumber", formData.gstinNumber);
      if (err) errors.gstinNumber = err;
    }
    if (formData.panNumber) {
      const err = getFieldError("panNumber", formData.panNumber);
      if (err) errors.panNumber = err;
    }
    if (formData.tanNumber) {
      const err = getFieldError("tanNumber", formData.tanNumber);
      if (err) errors.tanNumber = err;
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      toast.error("Please fix the highlighted field errors before submitting.");
      return;
    }

    if (!hasAnyChange && !isResubmitting) {
      toast.error("No changes detected in your profile details. Please update at least one detail or upload a document before submitting.");
      return;
    }

    // Check mandatory document upload requirements
    if (requiredDocs.licenseDoc && !files.licenseDoc && !isResubmitting) {
      toast.error("License Copy PDF is mandatory when updating License details.");
      return;
    }
    if (requiredDocs.entityNameDoc && !files.entityNameDoc && !isResubmitting) {
      toast.error("Company Name proof PDF is mandatory when updating Company Name.");
      return;
    }
    if (requiredDocs.addressDoc && !files.addressDoc && !isResubmitting) {
      toast.error("Address Proof PDF is mandatory when updating Address details.");
      return;
    }
    if (requiredDocs.gstinDoc && !files.gstinDoc && !isResubmitting) {
      toast.error("GST Certificate PDF is mandatory when updating GSTIN.");
      return;
    }
    if (requiredDocs.panDoc && !files.panDoc && !isResubmitting) {
      toast.error("PAN Card PDF is mandatory when updating PAN number.");
      return;
    }
    if (requiredDocs.tanDoc && !files.tanDoc && !isResubmitting) {
      toast.error("TAN Document PDF is mandatory when updating TAN number.");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("accessToken");
      const fd = new FormData();

      Object.keys(formData).forEach((key) => {
        fd.append(key, formData[key]);
      });
      fd.append("addressLine", formData.address || "");

      Object.keys(files).forEach((key) => {
        if (files[key]) {
          fd.append(key, files[key]);
        }
      });

      const res = await axios.post(`${AGENT_API}/agents/profile-update-requests`, fd, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      if (res.data?.success) {
        toast.success(res.data.message || "Profile update request submitted successfully!");
        if (onSuccess) onSuccess();
        onClose();
      } else {
        toast.error(res.data?.message || "Failed to submit profile update request.");
      }
    } catch (err) {
      console.error("Profile update submit error:", err);
      toast.error(err.response?.data?.message || "Server error while submitting request.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="w-full max-w-4xl bg-white dark:bg-[#1f232d] rounded-3xl shadow-2xl border border-stone-200/50 dark:border-white/10 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1f1f1f] via-[#2a2520] to-[#3a2f1f] px-6 py-5 flex items-center justify-between text-white border-b border-amber-500/20">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400 text-black font-extrabold shadow-md">
              <Building2 className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-lg font-extrabold tracking-tight">Company Profile</h3>
              <p className="text-xs text-amber-300 font-medium">Request profile updates for approval</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-stone-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 max-h-[80vh] overflow-y-auto [scrollbar-width:thin]">
          {fetchLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <RefreshCw className="h-8 w-8 text-amber-500 animate-spin" />
              <p className="text-sm font-semibold text-stone-600 dark:text-stone-300">Loading company profile details...</p>
            </div>
          ) : (
            <>
              {/* Status Banners */}
              {activeRequest && activeRequest.status === "pending" && (
                <div className="mb-6 p-4 rounded-2xl bg-amber-50 dark:bg-amber-400/10 border border-amber-200 dark:border-amber-400/20 flex items-start gap-3">
                  <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-extrabold text-amber-900 dark:text-amber-300">
                      Pending Approval Request ({activeRequest.referenceNumber})
                    </h4>
                    <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                      You have an active profile update request submitted on{" "}
                      {new Date(activeRequest.createdAt).toLocaleDateString("en-GB")}. It is currently under verification by the Traffic Pass Section. You cannot submit another request until this request is processed.
                    </p>
                  </div>
                </div>
              )}

              {activeRequest && activeRequest.status === "reverted" && (
                <div className="mb-6 p-4 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/30 flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-extrabold text-amber-900 dark:text-amber-300">
                      Action Required: Profile Request Reverted ({activeRequest.referenceNumber})
                    </h4>
                    <p className="text-xs text-amber-800 dark:text-amber-300 mt-1 font-semibold">
                      Reason for Reversion: {activeRequest.rejectedReason || "Please verify and re-upload supporting documents."}
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                      Please make the requested corrections below and re-upload any required PDF documents to resubmit.
                    </p>
                  </div>
                </div>
              )}

              {/* Disabled form overlay if pending */}
              <form onSubmit={handleSubmit} className={activeRequest && activeRequest.status === "pending" ? "pointer-events-none opacity-60" : ""}>

                {/* 1. Basic Company Information */}
                <div className="mb-6">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-3 flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-amber-500" /> 1. Company Identity & Contact
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                        Company / Entity Name {requiredDocs.entityNameDoc && <span className="text-amber-600 dark:text-amber-400 text-[11px] font-extrabold">* (Proof PDF Required)</span>}
                      </label>
                      <input
                        type="text"
                        name="entityName"
                        value={formData.entityName}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2.5 text-sm bg-stone-50 dark:bg-[#1a1d27] border border-stone-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-stone-900 dark:text-white"
                        required
                      />
                      {/* Contextual Inline Upload for Company Name */}
                      {requiredDocs.entityNameDoc && (
                        <div className="mt-2.5 p-3 rounded-xl border border-amber-400 bg-amber-50/70 dark:bg-amber-400/10 animate-in fade-in duration-200">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                              <Upload className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                              Upload Company Name Change Proof (PDF, max 2MB) <span className="text-red-500 font-extrabold">*</span>
                            </span>
                            {files.entityNameDoc && (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                                Selected
                              </span>
                            )}
                          </div>
                          <input
                            type="file"
                            accept="application/pdf"
                            onChange={(e) => handleFileChange(e, "entityNameDoc")}
                            className="text-xs text-stone-600 dark:text-stone-400 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-amber-400 file:text-black hover:file:bg-amber-500 cursor-pointer"
                            required={!isResubmitting}
                          />
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">Contact Person</label>
                      <input
                        type="text"
                        name="authorizedPersonName"
                        value={formData.authorizedPersonName}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2.5 text-sm bg-stone-50 dark:bg-[#1a1d27] border border-stone-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-stone-900 dark:text-white"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">Mobile Number</label>
                      <input
                        type="text"
                        name="mobileNo"
                        value={formData.mobileNo}
                        onChange={handleChange}
                        className={`w-full px-3.5 py-2.5 text-sm bg-stone-50 dark:bg-[#1a1d27] border ${fieldErrors.mobileNo ? "border-red-500 ring-1 ring-red-500" : "border-stone-200 dark:border-white/10"} rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-stone-900 dark:text-white`}
                        required
                      />
                      {fieldErrors.mobileNo && <p className="text-[11px] font-semibold text-red-500 mt-1">{fieldErrors.mobileNo}</p>}
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">Email Address</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2.5 text-sm bg-stone-50 dark:bg-[#1a1d27] border border-stone-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-stone-900 dark:text-white"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Address Information with Dynamic Country, State & City Dropdowns */}
                <div className="mb-6">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-3 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-amber-500" /> 2. Address Details {requiredDocs.addressDoc && <span className="text-amber-600 dark:text-amber-400 text-[11px] font-extrabold">* (Proof PDF Required)</span>}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">Registered Address Line</label>
                      <input
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2.5 text-sm bg-stone-50 dark:bg-[#1a1d27] border border-stone-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-stone-900 dark:text-white"
                        required
                      />
                    </div>

                    {/* Country Dropdown */}
                    <div>
                      <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">Country</label>
                      <select
                        name="country"
                        value={formData.country}
                        onChange={handleCountryChange}
                        className="w-full px-3.5 py-2.5 text-sm bg-stone-50 dark:bg-[#1a1d27] border border-stone-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-stone-900 dark:text-white"
                        required
                      >
                        <option value="">Select Country</option>
                        {countries.map((c) => (
                          <option key={c.id} value={c.name}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* State Dropdown */}
                    <div>
                      <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                        State {loadingStates && <span className="text-amber-500 text-[10px] ml-1 animate-pulse">(Loading...)</span>}
                      </label>
                      <select
                        name="state"
                        value={formData.state}
                        onChange={handleStateChange}
                        disabled={loadingStates || states.length === 0}
                        className="w-full px-3.5 py-2.5 text-sm bg-stone-50 dark:bg-[#1a1d27] border border-stone-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-stone-900 dark:text-white disabled:opacity-50"
                        required
                      >
                        <option value="">{loadingStates ? "Loading states..." : "Select State"}</option>
                        {states.map((s) => (
                          <option key={s.id} value={s.name}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* City Dropdown */}
                    <div>
                      <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                        City {loadingCities && <span className="text-amber-500 text-[10px] ml-1 animate-pulse">(Loading...)</span>}
                      </label>
                      <select
                        name="city"
                        value={formData.city}
                        onChange={handleCityChange}
                        disabled={loadingCities || cities.length === 0}
                        className="w-full px-3.5 py-2.5 text-sm bg-stone-50 dark:bg-[#1a1d27] border border-stone-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-stone-900 dark:text-white disabled:opacity-50"
                        required
                      >
                        <option value="">{loadingCities ? "Loading cities..." : "Select City"}</option>
                        {cities.map((ct) => (
                          <option key={ct.id} value={ct.name}>
                            {ct.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Pincode */}
                    <div>
                      <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">Pincode</label>
                      <input
                        type="text"
                        name="pincode"
                        value={formData.pincode}
                        onChange={handleChange}
                        className={`w-full px-3.5 py-2.5 text-sm bg-stone-50 dark:bg-[#1a1d27] border ${fieldErrors.pincode ? "border-red-500 ring-1 ring-red-500" : "border-stone-200 dark:border-white/10"} rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-stone-900 dark:text-white`}
                        required
                      />
                      {fieldErrors.pincode && <p className="text-[11px] font-semibold text-red-500 mt-1">{fieldErrors.pincode}</p>}
                    </div>

                    {/* Contextual Inline Upload for Address Details */}
                    {requiredDocs.addressDoc && (
                      <div className="md:col-span-2 mt-1 p-3 rounded-xl border border-amber-400 bg-amber-50/70 dark:bg-amber-400/10 animate-in fade-in duration-200">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                            <Upload className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                            Upload Address Proof / Utility Bill (PDF, max 2MB) <span className="text-red-500 font-extrabold">*</span>
                          </span>
                          {files.addressDoc && (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                              Selected
                            </span>
                          )}
                        </div>
                        <input
                          type="file"
                          accept="application/pdf"
                          onChange={(e) => handleFileChange(e, "addressDoc")}
                          className="text-xs text-stone-600 dark:text-stone-400 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-amber-400 file:text-black hover:file:bg-amber-500 cursor-pointer"
                          required={!isResubmitting}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. License & Tax Information */}
                <div className="mb-6">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-3 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-amber-500" /> 3. License & Tax Registration
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                        License Number {requiredDocs.licenseDoc && <span className="text-amber-600 dark:text-amber-400 text-[11px] font-extrabold">* (Proof Required)</span>}
                      </label>
                      <input
                        type="text"
                        name="licenseNumber"
                        value={formData.licenseNumber}
                        onChange={handleChange}
                        className={`w-full px-3.5 py-2.5 text-sm bg-stone-50 dark:bg-[#1a1d27] border ${fieldErrors.licenseNumber ? "border-red-500 ring-1 ring-red-500" : "border-stone-200 dark:border-white/10"} rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-stone-900 dark:text-white`}
                      />
                      {fieldErrors.licenseNumber && <p className="text-[11px] font-semibold text-red-500 mt-1">{fieldErrors.licenseNumber}</p>}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                        License Expiry Date {requiredDocs.licenseDoc && <span className="text-amber-600 dark:text-amber-400 text-[11px] font-extrabold">* (Proof Required)</span>}
                      </label>
                      <input
                        type="date"
                        name="licenseValidityDate"
                        value={formData.licenseValidityDate}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2.5 text-sm bg-stone-50 dark:bg-[#1a1d27] border border-stone-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-stone-900 dark:text-white"
                      />
                    </div>

                    {/* Contextual Inline Upload for License */}
                    {requiredDocs.licenseDoc && (
                      <div className="md:col-span-2 mt-1 p-3 rounded-xl border border-amber-400 bg-amber-50/70 dark:bg-amber-400/10 animate-in fade-in duration-200">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                            <Upload className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                            Upload Renewed License Copy (PDF, max 2MB) <span className="text-red-500 font-extrabold">*</span>
                          </span>
                          {files.licenseDoc && (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                              Selected
                            </span>
                          )}
                        </div>
                        <input
                          type="file"
                          accept="application/pdf"
                          onChange={(e) => handleFileChange(e, "licenseDoc")}
                          className="text-xs text-stone-600 dark:text-stone-400 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-amber-400 file:text-black hover:file:bg-amber-500 cursor-pointer"
                          required={!isResubmitting}
                        />
                      </div>
                    )}

                    {/* GSTIN Field */}
                    <div>
                      <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                        GSTIN Number {requiredDocs.gstinDoc && <span className="text-amber-600 dark:text-amber-400 text-[11px] font-extrabold">* (Proof Required)</span>}
                      </label>
                      <input
                        type="text"
                        name="gstinNumber"
                        value={formData.gstinNumber}
                        onChange={handleChange}
                        className={`w-full px-3.5 py-2.5 text-sm bg-stone-50 dark:bg-[#1a1d27] border ${fieldErrors.gstinNumber ? "border-red-500 ring-1 ring-red-500" : "border-stone-200 dark:border-white/10"} rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-stone-900 dark:text-white`}
                      />
                      {fieldErrors.gstinNumber && <p className="text-[11px] font-semibold text-red-500 mt-1">{fieldErrors.gstinNumber}</p>}
                      {/* Contextual Inline Upload for GSTIN */}
                      {requiredDocs.gstinDoc && (
                        <div className="mt-2.5 p-3 rounded-xl border border-amber-400 bg-amber-50/70 dark:bg-amber-400/10 animate-in fade-in duration-200">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                              <Upload className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                              Upload GST Certificate (PDF, max 2MB) <span className="text-red-500 font-extrabold">*</span>
                            </span>
                            {files.gstinDoc && (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                                Selected
                              </span>
                            )}
                          </div>
                          <input
                            type="file"
                            accept="application/pdf"
                            onChange={(e) => handleFileChange(e, "gstinDoc")}
                            className="text-xs text-stone-600 dark:text-stone-400 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-amber-400 file:text-black hover:file:bg-amber-500 cursor-pointer"
                            required={!isResubmitting}
                          />
                        </div>
                      )}
                    </div>

                    {/* PAN Field */}
                    <div>
                      <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                        PAN Number {requiredDocs.panDoc && <span className="text-amber-600 dark:text-amber-400 text-[11px] font-extrabold">* (Proof Required)</span>}
                      </label>
                      <input
                        type="text"
                        name="panNumber"
                        value={formData.panNumber}
                        onChange={handleChange}
                        className={`w-full px-3.5 py-2.5 text-sm bg-stone-50 dark:bg-[#1a1d27] border ${fieldErrors.panNumber ? "border-red-500 ring-1 ring-red-500" : "border-stone-200 dark:border-white/10"} rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-stone-900 dark:text-white`}
                      />
                      {fieldErrors.panNumber && <p className="text-[11px] font-semibold text-red-500 mt-1">{fieldErrors.panNumber}</p>}
                      {/* Contextual Inline Upload for PAN */}
                      {requiredDocs.panDoc && (
                        <div className="mt-2.5 p-3 rounded-xl border border-amber-400 bg-amber-50/70 dark:bg-amber-400/10 animate-in fade-in duration-200">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                              <Upload className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                              Upload PAN Card Copy (PDF, max 2MB) <span className="text-red-500 font-extrabold">*</span>
                            </span>
                            {files.panDoc && (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                                Selected
                              </span>
                            )}
                          </div>
                          <input
                            type="file"
                            accept="application/pdf"
                            onChange={(e) => handleFileChange(e, "panDoc")}
                            className="text-xs text-stone-600 dark:text-stone-400 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-amber-400 file:text-black hover:file:bg-amber-500 cursor-pointer"
                            required={!isResubmitting}
                          />
                        </div>
                      )}
                    </div>

                    {/* TAN Field */}
                    <div>
                      <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                        TAN Number {requiredDocs.tanDoc && <span className="text-amber-600 dark:text-amber-400 text-[11px] font-extrabold">* (Proof Required)</span>}
                      </label>
                      <input
                        type="text"
                        name="tanNumber"
                        value={formData.tanNumber}
                        onChange={handleChange}
                        className={`w-full px-3.5 py-2.5 text-sm bg-stone-50 dark:bg-[#1a1d27] border ${fieldErrors.tanNumber ? "border-red-500 ring-1 ring-red-500" : "border-stone-200 dark:border-white/10"} rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-stone-900 dark:text-white`}
                      />
                      {fieldErrors.tanNumber && <p className="text-[11px] font-semibold text-red-500 mt-1">{fieldErrors.tanNumber}</p>}
                      {/* Contextual Inline Upload for TAN */}
                      {requiredDocs.tanDoc && (
                        <div className="mt-2.5 p-3 rounded-xl border border-amber-400 bg-amber-50/70 dark:bg-amber-400/10 animate-in fade-in duration-200">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                              <Upload className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                              Upload TAN Document Copy (PDF, max 2MB) <span className="text-red-500 font-extrabold">*</span>
                            </span>
                            {files.tanDoc && (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                                Selected
                              </span>
                            )}
                          </div>
                          <input
                            type="file"
                            accept="application/pdf"
                            onChange={(e) => handleFileChange(e, "tanDoc")}
                            className="text-xs text-stone-600 dark:text-stone-400 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-amber-400 file:text-black hover:file:bg-amber-500 cursor-pointer"
                            required={!isResubmitting}
                          />
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">Remarks / Reason for Update</label>
                      <input
                        type="text"
                        name="remarks"
                        placeholder="e.g. License Renewal / Address Change"
                        value={formData.remarks}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2.5 text-sm bg-stone-50 dark:bg-[#1a1d27] border border-stone-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-stone-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Submit button bar */}
                {(!activeRequest || activeRequest.status !== "pending") && (
                  <div className="flex items-center justify-between border-t border-stone-200 dark:border-white/10 pt-4 gap-3">
                    {!hasAnyChange && !isResubmitting ? (
                      <span className="text-xs font-semibold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 px-3 py-1.5 rounded-xl border border-amber-200/80 dark:border-amber-800/40">
                        ℹ️ Modify at least one detail to submit request
                      </span>
                    ) : (
                      <div />
                    )}
                    <div className="flex justify-end gap-3 shrink-0">
                      <Button type="button" variant="outline" onClick={onClose}>
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={loading || fetchLoading || (!hasAnyChange && !isResubmitting)}
                        className="bg-amber-400 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-amber-400 text-black font-extrabold px-6"
                      >
                        {loading ? (
                          <>
                            <RefreshCw className="h-4 w-4 animate-spin mr-2" /> Submitting Request...
                          </>
                        ) : isResubmitting ? (
                          "Resubmit Update Request"
                        ) : (
                          "Submit Update Request"
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
