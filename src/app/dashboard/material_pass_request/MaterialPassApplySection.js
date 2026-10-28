"use client";

import React, { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import axios from "axios";
import {
  Wallet,
  Info,
  Users,
  Truck,
  Send,
  X,
  Calculator,
  Plus,
  Upload,
  Search,
  FileText,
  ShieldCheck,
  Phone,
  UserPlus,
  BookOpen,
  FileCheck2,
  CheckCircle2,
  Eye,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Edit3,
  Car,
  User,
  ChevronDown,
  Boxes,
} from "lucide-react";

import MaterialTable from "./Materialtable";
import {
  createMaterialPassSchema,
  MAX_ENTRY_DAYS_AHEAD,
  VALIDITY_MONTHS,
  calculateValidTillDate,
  formatDisplayDate,
  getMaxEntryDateString,
} from "./materialValidations";

const AGENT_API =
  process.env.NEXT_PUBLIC_AGENT_API || "http://localhost:5001/api";
const DEPT_API = process.env.NEXT_PUBLIC_ADMIN_API;

const getTodayString = () => {
  const today = new Date();

  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`;
};

const validateFile = (file, type = "pdf") => {
  if (!file) return "No file selected";

  const allowedTypes = { pdf: ["application/pdf"] };
  const maxSize = 1 * 1024 * 1024; // 1MB

  if (!allowedTypes[type].includes(file.type)) {
    return "Only PDF files are allowed";
  }
  if (file.size > maxSize) {
    return "File size must be less than 1MB";
  }
  return null;
};

const ALLOWED_DEPARTMENTS = {
  Traffic: "Traffic",
  Marine: "Marine",
  "Engineering Civil": "Civil",
  "Engineering Mechanical": "Mechanical",
  Finance: "Finance",
  "General Administration": "General Administration",
};

export default function MaterialPassApplySection({
  getLabelById,
  onSubmitSuccess,
}) {
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);

  const [returnables, setReturnables] = useState([]);
  const [nonReturnables, setNonReturnables] = useState([]);
  const [materialDrafts, setMaterialDrafts] = useState({
    RETURNABLE: false,
    NON_RETURNABLE: false,
  });

  const [generalForm, setGeneralForm] = useState({
    companyName: "",
    email: "",
    mobile: "",
    balance: "7725.00",
    utilizedBalance: "0.00",
    purpose: null,
    purposeOther: "",
    concernedDepartment: null,
    location: [],
    locationOther: "",
    entryDate: getTodayString(),
    requisitionLetter: null, // NEW
    workOrder: null, // NEW
  });

  const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);
  const locationDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        locationDropdownRef.current &&
        !locationDropdownRef.current.contains(event.target)
      ) {
        setIsLocationDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [masterData, setMasterData] = useState({
    passTypes: [],
    purposes: [],
    departments: [],
    locations: [],
    units: [],
  });

  const fetchProfile = async () => {
    try {
      setProfileLoading(true);
      const token = localStorage.getItem("accessToken");
      const config = { headers: { Authorization: `Bearer ${token}` } };

      const res = await axios.get(`${AGENT_API}/agents/profile`, config);
      const profile = res?.data?.data || res?.data || {};

      setGeneralForm((prev) => ({
        ...prev,
        companyName: profile.entityName ?? prev.companyName,
        email: profile.email ?? prev.email,
        mobile: profile.mobileNo ?? prev.mobile,
      }));
    } catch (error) {
      console.error("Error loading profile data", error);
      toast.error("Failed to load company profile details.");
    } finally {
      setProfileLoading(false);
    }
  };

  const fetchMasterData = async () => {
    try {
      const token = localStorage.getItem("accessToken");
      const config = { headers: { Authorization: `Bearer ${token}` } };

      const [purposeRes, deprtmentRes, linkMastersRes, passTypeRes, unitRes] =
        await Promise.all([
          axios
            .get(`${AGENT_API}/pass-request/get-visit-purposes`, config)
            .catch(() => ({ data: [] })),
          axios
            .get(`${DEPT_API}/user/departments`, config)
            .catch(() => ({ data: [] })),
          axios
            .get(`${AGENT_API}/vendor-material-pass/link-masters`, config)
            .catch(() => ({ data: [] })),
          axios
            .get(`${AGENT_API}/material-pass/RegularPassTypes`, config)
            .catch(() => ({ data: [] })),
          axios
            .get(`${AGENT_API}/material-pass/units`, config)
            .catch(() => ({ data: [] })),
        ]);

      const extractArray = (res) =>
        Array.isArray(res?.data?.data)
          ? res.data.data
          : Array.isArray(res?.data)
            ? res.data
            : [];

      const rawGates =
        linkMastersRes?.data?.data?.gates ||
        linkMastersRes?.data?.gates ||
        (Array.isArray(linkMastersRes?.data?.data) ? linkMastersRes.data.data : []);

      const hasOthers =
        Array.isArray(rawGates) &&
        rawGates.some(
          (g) => g.name && g.name.trim().toLowerCase() === "others"
        );

      const locationList = Array.isArray(rawGates)
        ? hasOthers
          ? rawGates
          : [...rawGates, { id: "OTHERS", name: "Others" }]
        : [{ id: "OTHERS", name: "Others" }];

      setMasterData((prev) => ({
        ...prev,
        purposes: extractArray(purposeRes),
        departments: extractArray(deprtmentRes),
        locations: locationList,
        passTypes: extractArray(passTypeRes),
        units: extractArray(unitRes),
      }));
    } catch (error) {
      console.error("Error loading API master data", error);
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchMasterData();
  }, []);

  const [locationSearch, setLocationSearch] = useState("");

  const othersPurposeId = masterData.purposes.find(
    (p) => p.name.trim().toLowerCase() === "others",
  )?.id;

  const othersLocationId = masterData.locations.find(
    (l) => l.name?.trim().toLowerCase() === "others",
  )?.id;

  const isOthersLocationSelected =
    Array.isArray(generalForm.location) &&
    generalForm.location.some(
      (id) =>
        String(id) === String(othersLocationId) ||
        masterData.locations.find((l) => String(l.id) === String(id))?.name?.toLowerCase() === "others",
    );

  const hasGateSelected =
    Array.isArray(generalForm.location) &&
    generalForm.location.some(
      (id) =>
        String(id) !== String(othersLocationId) &&
        masterData.locations.find((l) => String(l.id) === String(id))?.name?.toLowerCase() !== "others",
    );

  const handleToggleLocation = (id) => {
    const loc = masterData.locations.find((l) => String(l.id) === String(id));
    const isTogglingOthers =
      String(id) === String(othersLocationId) ||
      loc?.name?.toLowerCase() === "others";

    if (isTogglingOthers && hasGateSelected) {
      toast.warning(
        "Cannot select 'Others' when gate values are selected. Please uncheck gates first.",
      );
      return;
    }

    if (!isTogglingOthers && isOthersLocationSelected) {
      toast.warning(
        "Cannot select gates when 'Others' is selected. Please uncheck 'Others' first.",
      );
      return;
    }

    setGeneralForm((prev) => {
      const currentList = Array.isArray(prev.location) ? prev.location : [];
      const exists = currentList.some((item) => String(item) === String(id));
      const nextList = exists
        ? currentList.filter((item) => String(item) !== String(id))
        : [...currentList, id];

      const isDeselectingOthers = exists && isTogglingOthers;

      return {
        ...prev,
        location: nextList,
        locationOther: isDeselectingOthers ? "" : prev.locationOther,
      };
    });
  };

  const handleSelectAllGates = () => {
    if (isOthersLocationSelected) {
      toast.warning(
        "Cannot select gates while 'Others' is selected. Please uncheck 'Others' first.",
      );
      return;
    }

    const gateIds = masterData.locations
      .filter(
        (l) =>
          String(l.id) !== String(othersLocationId) &&
          l.name?.toLowerCase() !== "others",
      )
      .map((l) => l.id);

    setGeneralForm((prev) => ({
      ...prev,
      location: gateIds,
      locationOther: "",
    }));
  };

  const handleClearLocations = () => {
    setGeneralForm((prev) => ({
      ...prev,
      location: [],
      locationOther: "",
    }));
  };

  const filteredLocations = masterData.locations.filter((loc) =>
    (loc.name || "")
      .toLowerCase()
      .includes(locationSearch.trim().toLowerCase()),
  );

  const validTillDate = generalForm.entryDate
    ? calculateValidTillDate(generalForm.entryDate, VALIDITY_MONTHS)
    : "";

  const handleSubmitRequest = async () => {
    if (Object.values(materialDrafts).some(Boolean)) {
      return toast.warning(
        "Save or cancel the open material editor before submitting.",
      );
    }

    if (!generalForm.requisitionLetter)
      return toast.warning("Please upload the Requisition Letter.");

    if (!agreedToTerms)
      return toast.warning("Please agree to the Terms and Conditions.");

    const schema = createMaterialPassSchema(othersPurposeId, othersLocationId);

    const result = schema.safeParse({
      ...generalForm,
      returnables,
      nonReturnables,
    });

    if (!result.success) {
      console.log(result.error.flatten());
      toast.warning(result.error.issues[0].message);
      console.log(result.error.issues);
      return;
    }

    const validTill = calculateValidTillDate(
      generalForm.entryDate,
      VALIDITY_MONTHS
    );

    const selectedLocIds = Array.isArray(generalForm.location)
      ? generalForm.location
      : generalForm.location
        ? [generalForm.location]
        : [];

    const numericGateId = selectedLocIds
      .map((id) => Number(id))
      .find(
        (num) =>
          !isNaN(num) &&
          num > 0 &&
          String(num) !== String(othersLocationId)
      );

    const backendLocationId =
      numericGateId && numericGateId >= 1 && numericGateId <= 8
        ? numericGateId
        : (othersLocationId && !isNaN(Number(othersLocationId)) && Number(othersLocationId) <= 8
            ? Number(othersLocationId)
            : 8);

    const selectedGateNames = masterData.locations
      .filter((l) => selectedLocIds.some((id) => String(id) === String(l.id)))
      .map((l) => l.name);

    let locationOtherPayload = generalForm.locationOther?.trim() || "";
    if (!locationOtherPayload && selectedGateNames.length > 0) {
      locationOtherPayload = selectedGateNames.join(", ");
    } else if (locationOtherPayload && selectedGateNames.length > 0) {
      const nonOthersGateNames = selectedGateNames.filter(
        (n) => n.toLowerCase() !== "others",
      );
      if (nonOthersGateNames.length > 0) {
        locationOtherPayload = `${nonOthersGateNames.join(", ")}; Other: ${locationOtherPayload}`;
      }
    }

    const validLocationIds = selectedLocIds
      .map(Number)
      .filter((n) => !isNaN(n) && n > 0);

    const payload = {
      ...result.data,
      location: backendLocationId,
      locations: validLocationIds.length > 0 ? validLocationIds : [backendLocationId],
      locationOther: locationOtherPayload || undefined,
      entryDate: generalForm.entryDate,
      entryFromDate: generalForm.entryDate,
      validTillDate: validTill,
      validTill: validTill,
      returnables: (result.data.returnables || []).map((item) => ({
        ...item,
        isHazardous: Boolean(item.isHazardous),
      })),
      nonReturnables: (result.data.nonReturnables || []).map((item) => ({
        ...item,
        isHazardous: Boolean(item.isHazardous),
      })),
    };
    console.log(payload);

    try {
      setLoading(true);
      const token = localStorage.getItem("accessToken");

      const formData = new FormData();
      formData.append("payload", JSON.stringify(payload));
      formData.append(
        "materialPassRequisitionLetter",
        generalForm.requisitionLetter,
      );
      if (generalForm.workOrder) {
        formData.append("materialPassWorkOrder", generalForm.workOrder);
      }

      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };

      const response = await axios.post(
        `${AGENT_API}/material-pass/createRegularMaterialPassRequest`,
        formData,
        config,
      );

      toast.success(response.data.message);

      setGeneralForm((prev) => ({
        ...prev,
        purpose: null,
        purposeOther: "",
        concernedDepartment: null,
        location: [],
        locationOther: "",
        entryDate: getTodayString(),
        requisitionLetter: null,
        workOrder: null,
      }));

      setReturnables([]);
      setNonReturnables([]);
      setMaterialDrafts({
        RETURNABLE: false,
        NON_RETURNABLE: false,
      });
      setAgreedToTerms(false);

      console.log(response.data);
      onSubmitSuccess?.();
    } catch (error) {
      console.error(error);
      toast.error(
        error?.response?.data?.message ||
          "Failed to submit material pass request.",
      );
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full h-10 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 px-3 shadow-sm bg-white outline-none transition-all";

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center rounded-t-2xl">
          <h3 className="font-black text-[#0a1e4d] flex items-center gap-2 uppercase text-sm tracking-wider">
            <Info className="h-5 w-5 text-orange-500" /> General Details
          </h3>
          <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">
            Important: Please ensure all materials listed below are moved in
            within 48 hours of your chosen entry date.
          </span>
        </div>
        <div className="p-6">
          <div className="bg-slate-50 rounded-xl p-5 border border-slate-100 grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Company Name
              </p>
              <p className="text-sm font-bold text-[#0a1e4d] mt-1">
                {profileLoading ? "Loading..." : generalForm.companyName || "—"}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Email ID
              </p>
              <p className="text-sm font-semibold text-slate-700 mt-1">
                {profileLoading ? "Loading..." : generalForm.email || "—"}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Mobile No
              </p>
              <p className="text-sm font-semibold text-slate-700 mt-1">
                {profileLoading
                  ? "Loading..."
                  : generalForm.mobile
                    ? `+91 ${generalForm.mobile}`
                    : "—"}
              </p>
            </div>
            {/* <div>
								<p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
									Utilized Balance
								</p>
								<p className="text-sm font-black text-red-600 mt-1">
									₹ {generalForm.utilizedBalance}
								</p>
							</div> */}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Purpose of Visit <span className="text-red-500">*</span>
              </label>
              <select
                value={generalForm.purpose ?? ""}
                onChange={(e) =>
                  setGeneralForm({
                    ...generalForm,
                    purpose: e.target.value ? Number(e.target.value) : null,
                  })
                }
                className={inputClass}
              >
                <option value="">Select Purpose</option>
                {masterData.purposes.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              {generalForm.purpose === othersPurposeId && (
                <input
                  type="text"
                  onChange={(e) =>
                    setGeneralForm({
                      ...generalForm,
                      purposeOther: e.target.value,
                    })
                  }
                  className={`${inputClass} mt-3 animate-in fade-in`}
                  placeholder="Specify other purpose..."
                />
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Department <span className="text-red-500">*</span>
              </label>
              <select
                value={generalForm.concernedDepartment ?? ""}
                onChange={(e) =>
                  setGeneralForm({
                    ...generalForm,
                    concernedDepartment: e.target.value
                      ? Number(e.target.value)
                      : null,
                  })
                }
                className={inputClass}
              >
                <option value="">Select Department</option>
                {masterData.departments
                  .filter((d) =>
                    ALLOWED_DEPARTMENTS.hasOwnProperty(d.departmentName),
                  )
                  .map((d) => (
                    <option key={d.id} value={d.id}>
                      {ALLOWED_DEPARTMENTS[d.departmentName]}
                    </option>
                  ))}
              </select>
            </div>
            <div className="space-y-1.5" ref={locationDropdownRef}>
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Location <span className="text-red-500">*</span>
                </label>
                {Array.isArray(generalForm.location) &&
                  generalForm.location.length > 0 && (
                    <span className="text-[11px] font-semibold text-orange-700 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">
                      {generalForm.location.length} selected
                    </span>
                  )}
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsLocationDropdownOpen((prev) => !prev)}
                  className={`${inputClass} flex items-center justify-between text-left cursor-pointer hover:border-orange-400`}
                >
                  <span className="truncate pr-2">
                    {Array.isArray(generalForm.location) &&
                    generalForm.location.length > 0 ? (
                      <span className="font-semibold text-slate-800">
                        {masterData.locations
                          .filter((l) =>
                            generalForm.location.some(
                              (id) => String(id) === String(l.id)
                            )
                          )
                          .map((l) => l.name)
                          .join(", ")}
                      </span>
                    ) : (
                      <span className="text-slate-400 font-normal">Select Location / Gates</span>
                    )}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {Array.isArray(generalForm.location) &&
                      generalForm.location.length > 0 && (
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            handleClearLocations();
                          }}
                          title="Clear selection"
                          className="p-0.5 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </span>
                      )}
                    <ChevronDown
                      className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
                        isLocationDropdownOpen ? "rotate-180 text-orange-500" : ""
                      }`}
                    />
                  </div>
                </button>

                {isLocationDropdownOpen && (
                  <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white rounded-xl border border-slate-300 shadow-2xl overflow-hidden ring-1 ring-black/10 animate-in fade-in-50 zoom-in-95">
                    <div className="p-2.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                        Gates & Locations ({masterData.locations.length})
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={isOthersLocationSelected}
                          onClick={handleSelectAllGates}
                          className={`text-[11px] font-semibold ${
                            isOthersLocationSelected
                              ? "text-slate-300 cursor-not-allowed"
                              : "text-orange-600 hover:text-orange-800 hover:underline"
                          }`}
                          title={
                            isOthersLocationSelected
                              ? "Cannot select gates while 'Others' is selected"
                              : "Select all available gates"
                          }
                        >
                          Select All Gates
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          type="button"
                          onClick={handleClearLocations}
                          className="text-[11px] font-semibold text-slate-500 hover:text-slate-700 hover:underline"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    {(hasGateSelected || isOthersLocationSelected) && (
                      <div className="px-3 py-1.5 bg-amber-50 border-b border-amber-100 text-[10px] text-amber-800 font-medium flex items-center gap-1.5">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                        <span>
                          {hasGateSelected
                            ? "Gate(s) selected: 'Others' is disabled"
                            : "'Others' selected: Gate selection is disabled"}
                        </span>
                      </div>
                    )}

                    {masterData.locations.length > 4 && (
                      <div className="p-2 border-b border-slate-100 bg-white">
                        <div className="relative">
                          <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            value={locationSearch}
                            onChange={(e) => setLocationSearch(e.target.value)}
                            placeholder="Filter gates..."
                            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-orange-500 transition-all text-slate-700"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </div>
                    )}

                    <div className="max-h-60 overflow-y-auto p-1 divide-y divide-slate-50">
                      {filteredLocations.length === 0 ? (
                        <p className="text-xs text-slate-400 px-3 py-3 text-center">
                          No matching locations found.
                        </p>
                      ) : (
                        filteredLocations.map((l) => {
                          const isChecked =
                            Array.isArray(generalForm.location) &&
                            generalForm.location.some(
                              (id) => String(id) === String(l.id)
                            );
                          const isOthers =
                            String(l.id) === String(othersLocationId) ||
                            l.name?.toLowerCase() === "others";
                          const isDisabled = isOthers
                            ? hasGateSelected
                            : isOthersLocationSelected;

                          return (
                            <label
                              key={l.id}
                              title={
                                isDisabled
                                  ? isOthers
                                    ? "Cannot select 'Others' when specific gates are selected"
                                    : "Cannot select gates when 'Others' is selected"
                                  : ""
                              }
                              className={`flex items-center gap-3 px-3 py-2 text-xs rounded-lg transition-colors ${
                                isDisabled
                                  ? "opacity-40 cursor-not-allowed bg-slate-50 text-slate-400"
                                  : isChecked
                                    ? "bg-orange-50 text-orange-900 font-semibold cursor-pointer"
                                    : "text-slate-700 hover:bg-slate-50 font-medium cursor-pointer"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                disabled={isDisabled}
                                onChange={() => handleToggleLocation(l.id)}
                                className={`h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500 shrink-0 accent-orange-600 ${
                                  isDisabled
                                    ? "cursor-not-allowed opacity-50"
                                    : "cursor-pointer"
                                }`}
                              />
                              <span className="truncate">{l.name}</span>
                              {isOthers && (
                                <span
                                  className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                                    isDisabled
                                      ? "bg-slate-100 text-slate-400 border-slate-200"
                                      : "bg-amber-50 text-amber-700 border-amber-200"
                                  }`}
                                >
                                  Custom Entry
                                </span>
                              )}
                            </label>
                          );
                        })
                      )}
                    </div>

                    <div className="p-2 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                      <span className="text-[11px] text-slate-500 font-medium">
                        {generalForm.location.length} of {masterData.locations.length} selected
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsLocationDropdownOpen(false)}
                        className="px-3.5 py-1 bg-[#0a1e4d] hover:bg-[#142d6f] text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {isOthersLocationSelected && (
                <input
                  type="text"
                  value={generalForm.locationOther || ""}
                  onChange={(e) =>
                    setGeneralForm({
                      ...generalForm,
                      locationOther: e.target.value,
                    })
                  }
                  className={`${inputClass} mt-3 animate-in fade-in`}
                  placeholder="Specify location..."
                />
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Entry Date <span className="text-red-500">*</span>
              </label>

              <div className="flex flex-col sm:flex-row items-stretch rounded-lg border border-slate-300 bg-white shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-orange-500/20 focus-within:border-orange-500 transition-all">
                <div className="flex-1 flex items-center px-3 py-1 min-w-0">
                  <input
                    type="date"
                    value={generalForm.entryDate || ""}
                    onChange={(e) =>
                      setGeneralForm({
                        ...generalForm,
                        entryDate: e.target.value,
                      })
                    }
                    className="w-full h-8 text-sm bg-transparent outline-none font-medium text-slate-800 cursor-pointer"
                    min={getTodayString()}
                    max={getMaxEntryDateString(MAX_ENTRY_DAYS_AHEAD)}
                  />
                </div>
                <div className="flex items-center gap-1.5 px-3 py-2 sm:py-0 bg-slate-50 border-t sm:border-t-0 sm:border-l border-slate-200 select-none shrink-0">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Valid Till:
                  </span>
                  {validTillDate ? (
                    <span className="font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-xs whitespace-nowrap">
                      {formatDisplayDate(validTillDate)}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400 font-medium whitespace-nowrap">
                      —
                    </span>
                  )}
                  <span className="text-[10px] text-slate-400 font-medium">
                    (Read-only)
                  </span>
                </div>
              </div>

              <p className="text-[10px] text-slate-400 px-1">
                {generalForm.entryDate
                  ? `Valid for ${VALIDITY_MONTHS} months from selected entry date.`
                  : `Please select an entry date within ${MAX_ENTRY_DAYS_AHEAD} days from today.`}
              </p>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Requisition Letter <span className="text-red-500">*</span>
              </label>
              <label className="w-full h-10 border-2 border-dashed border-slate-300 bg-slate-50 rounded-lg px-4 flex items-center justify-center gap-2 cursor-pointer hover:bg-orange-50 hover:border-orange-300 transition-colors group">
                <Upload className="h-4 w-4 text-slate-400 group-hover:text-orange-500" />
                <span className="text-sm text-slate-600 font-medium truncate group-hover:text-orange-600">
                  {generalForm.requisitionLetter
                    ? generalForm.requisitionLetter.name
                    : "Upload PDF (Max 1MB)"}
                </span>
                <input
                  className="hidden"
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    const error = validateFile(file, "pdf");
                    if (error) {
                      toast.error(error);
                      e.target.value = "";
                      return;
                    }
                    setGeneralForm({ ...generalForm, requisitionLetter: file });
                  }}
                />
              </label>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Work Order{" "}
                <span className="text-slate-400 font-medium normal-case">
                  (optional)
                </span>
              </label>
              <label className="w-full h-10 border-2 border-dashed border-slate-300 bg-slate-50 rounded-lg px-4 flex items-center justify-center gap-2 cursor-pointer hover:bg-orange-50 hover:border-orange-300 transition-colors group">
                <Upload className="h-4 w-4 text-slate-400 group-hover:text-orange-500" />
                <span className="text-sm text-slate-600 font-medium truncate group-hover:text-orange-600">
                  {generalForm.workOrder
                    ? generalForm.workOrder.name
                    : "Upload PDF (Max 1MB)"}
                </span>
                <input
                  className="hidden"
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    const error = validateFile(file, "pdf");
                    if (error) {
                      toast.error(error);
                      e.target.value = "";
                      return;
                    }
                    setGeneralForm({ ...generalForm, workOrder: file });
                  }}
                />
              </label>
            </div>
          </div>
        </div>
      </section>

      <MaterialTable
        type="RETURNABLE"
        title="Returnable materials"
        materials={returnables}
        setMaterials={setReturnables}
        units={masterData.units}
        getLabelById={getLabelById}
        onDraftChange={(type, isOpen) =>
          setMaterialDrafts((prev) => ({ ...prev, [type]: isOpen }))
        }
      />

      <MaterialTable
        type="NON_RETURNABLE"
        title="Non-returnable materials"
        materials={nonReturnables}
        setMaterials={setNonReturnables}
        units={masterData.units}
        getLabelById={getLabelById}
        onDraftChange={(type, isOpen) =>
          setMaterialDrafts((prev) => ({ ...prev, [type]: isOpen }))
        }
      />

      <footer className="pt-2 pb-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
            {/* Left Column: Summary of Request */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-2">
                  <Boxes className="h-4 w-4 text-orange-600" /> Pass Summary
                </span>
                <span className="text-xs font-bold text-[#0a1e4d] bg-white border border-slate-200 px-2.5 py-1 rounded-lg">
                  {returnables.length + nonReturnables.length} Total Items
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-slate-400 font-medium">Returnable Items:</p>
                  <p className="font-bold text-slate-800">{returnables.length} items configured</p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">Non-Returnable Items:</p>
                  <p className="font-bold text-slate-800">{nonReturnables.length} items configured</p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">Entry Date:</p>
                  <p className="font-bold text-slate-800">{formatDisplayDate(generalForm.entryDate) || "—"}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">Requisition Letter:</p>
                  <p className={`font-bold ${generalForm.requisitionLetter ? "text-emerald-700" : "text-amber-700"}`}>
                    {generalForm.requisitionLetter ? "✓ Uploaded" : "Required"}
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column: Terms & Submission */}
            <div className="space-y-4">
              <div className="bg-orange-50/50 p-4 rounded-xl border border-orange-100 space-y-2.5">
                <h4 className="text-xs font-black text-[#0a1e4d] uppercase flex items-center gap-2 tracking-wider">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" /> Terms & Conditions
                </h4>
                <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                  I/We hereby certify that the above permits are required only for our official purpose. We hold responsibility for identification and all activities inside the port.
                </p>
                <label className="flex items-center gap-3 cursor-pointer pt-2 group">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-[#0a1e4d] group-hover:text-orange-600 transition-colors uppercase tracking-wider">
                    I agree to the Terms & Conditions
                  </span>
                </label>
              </div>

              <button
                type="button"
                onClick={handleSubmitRequest}
                disabled={loading || !agreedToTerms}
                className="w-full h-12 bg-[#0a1e4d] hover:bg-[#1a2f64] disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl font-black text-base shadow-lg shadow-[#0a1e4d]/20 flex items-center justify-center gap-3 transition-all uppercase tracking-widest"
              >
                {loading ? "Processing..." : "Submit Request"}
                {!loading && <Send className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
