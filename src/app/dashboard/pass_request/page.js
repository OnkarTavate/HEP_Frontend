"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import PaginationBar from "@/components/ui/PaginationBar";
import FaceCaptureDialog from "@/components/face/FaceCaptureDialog";
import axios from "axios";
import { toast } from "sonner";
import Select from "react-select";
import { extractAadharFromPdf } from "@/lib/extractAadharFromPdf";
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
  Minimize,
  Maximize,
  Loader2,
  XCircle,
  Calendar,
  Filter,
  Clock,
  Edit,
} from "lucide-react";

import {
  getPassRequestCategory,
  getItemCategoryTag,
} from "@/utils/passCategoryHelper";

const AGENT_API = process.env.NEXT_PUBLIC_AGENT_API;
const ADMIN_API =
  process.env.NEXT_PUBLIC_ADMIN_API || "http://localhost:5005/api";

// --- URL Helper to reliably strip '/api' for static file fetching ---
const getFileUrl = (path) => {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${AGENT_API}${path.startsWith("/") ? "" : "/"}${path}`;
};

// --- Date Format Helpers for DD/MM/YYYY ---
const formatISOToDDMMYYYY = (isoStr) => {
  if (!isoStr) return "";
  if (isoStr.includes("/")) return isoStr; // Already in DD/MM/YYYY format
  const parts = String(isoStr).split("T")[0].split("-");
  if (parts.length === 3) {
    const [yyyy, mm, dd] = parts;
    return `${dd}/${mm}/${yyyy}`;
  }
  return isoStr;
};

const formatDDMMYYYYToISO = (ddmmyyyy) => {
  if (!ddmmyyyy) return "";
  if (ddmmyyyy.includes("-")) return ddmmyyyy; // Already in YYYY-MM-DD format
  const parts = String(ddmmyyyy).split("/");
  if (parts.length === 3 && parts[2].length === 4) {
    const [dd, mm, yyyy] = parts;
    return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  }
  return "";
};

// --- DateTime Format Helpers for DD/MM/YYYY, hh:mm AM/PM ---
const formatDateTimeISOToDisplay = (isoStr) => {
  if (!isoStr) return "";
  if (isoStr.includes("/")) return isoStr; // Already formatted
  const [datePart, timePart] = String(isoStr).split("T");
  if (!datePart) return isoStr;
  const dateSubParts = datePart.split("-");
  if (dateSubParts.length !== 3) return isoStr;
  const [yyyy, mm, dd] = dateSubParts;

  if (!timePart) return `${dd}/${mm}/${yyyy}`;
  const [hhStr, minStr] = timePart.split(":");
  let hh = parseInt(hhStr, 10);
  const ampm = hh >= 12 ? "PM" : "AM";
  hh = hh % 12 || 12;
  const formattedHH = String(hh).padStart(2, "0");
  return `${dd}/${mm}/${yyyy}, ${formattedHH}:${minStr || "00"} ${ampm}`;
};

const formatDateTimeDisplayToISO = (displayStr) => {
  if (!displayStr) return "";
  if (displayStr.includes("T")) return displayStr; // Already ISO
  const parts = String(displayStr).split(",");
  if (parts.length < 1) return "";
  const dateParts = parts[0].trim().split("/");
  if (dateParts.length !== 3 || dateParts[2].length !== 4) return "";
  const [dd, mm, yyyy] = dateParts;
  const isoDate = `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;

  if (parts.length >= 2) {
    const timeStr = parts[1].trim();
    const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (match) {
      let [_, hhStr, minStr, ampm] = match;
      let hh = parseInt(hhStr, 10);
      if (ampm.toUpperCase() === "PM" && hh < 12) hh += 12;
      if (ampm.toUpperCase() === "AM" && hh === 12) hh = 0;
      return `${isoDate}T${String(hh).padStart(2, "0")}:${minStr}`;
    }
  }
  return `${isoDate}T00:00`;
};

const getCurrentDateTime = () => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
};

// All passes — daily, monthly, yearly — must expire at 05:59 AM on the
// computed end date, regardless of the time selected for dateFrom.
const PASS_EXPIRY_TIME = "05:59";

/* ════════════════════════════════════════════════════════════════════════
   Charges for Harbour Entry Permit (HEP)
   Period of validity of HEP — rates in ₹, INCLUSIVE of GST.

     Sl.  Description                       Daily   Monthly   Yearly
     1    Individual                           13       191      508
     2    Vehicle                              32       382     2539
     3    Cargo Handling Equipments            51       571     3807
          (Poclain, Dozers, Excavators, Forklift, Dumper, JCB Earthmover,
           Crane, Mobile Crane, Pay loader)

   Because these figures already include GST, calculateTotals() reports
   gst = 0 and net = base; the amount shown to the agent is the amount
   payable. Single source of truth — the rate-card modal renders from
   this same table, so the quoted price can never drift from the charged
   price.
   ════════════════════════════════════════════════════════════════════════ */
const DEFAULT_HEP_RATES = {
  INDIVIDUAL: { label: "Individual", daily: 13, monthly: 191, yearly: 508 },
  VEHICLE: { label: "Vehicle", daily: 32, monthly: 382, yearly: 2539 },
  CARGO: {
    label: "Cargo Handling Equipments",
    description:
      "Poclain, Dozers, Excavators, Forklift, Dumper, JCB Earthmover, Crane, Mobile Crane, Pay loader",
    daily: 51,
    monthly: 571,
    yearly: 3807,
  },
};

/* Vehicle types charged at the cargo-handling-equipment rate. Compared
   upper-cased and trimmed against the master vehicle-type name. */
const CARGO_EQUIPMENT_TYPES = [
  "CRANE",
  "DOZERS",
  "DUMPER",
  "DUMPERS",
  "EXCAVATORS",
  "FORKLIFT",
  "JCB EARTHMOVER",
  "MOBILE CRANE",
  "PAY LOADER",
  "POCLAIN",
];

const isCargoEquipmentType = (typeName) =>
  CARGO_EQUIPMENT_TYPES.includes(
    String(typeName || "")
      .toUpperCase()
      .trim(),
  );

/* passType: "1" = Daily, "2" = Monthly, "3" = Yearly.
   Daily is multiplied by the number of days; monthly and yearly are flat
   rates for the single period, matching how calculateDateTo() derives the
   end date. */
const getHepAmount = (
  category,
  passType,
  period = 1,
  rateTable = DEFAULT_HEP_RATES,
) => {
  const rate =
    rateTable[category] || rateTable.INDIVIDUAL || DEFAULT_HEP_RATES.INDIVIDUAL;
  const days = Math.max(1, parseInt(period, 10) || 1);

  switch (String(passType)) {
    case "2":
      return rate.monthly;
    case "3":
      return rate.yearly;
    case "1":
    default:
      return rate.daily * days;
  }
};

const resolveEffectiveHepRates = (feeMaster) => {
  if (!feeMaster) return DEFAULT_HEP_RATES;

  const toNum = (v, fallback) => {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : fallback;
  };

  const buildRate = (key) => {
    const source = feeMaster[key] || {};
    const fallback = DEFAULT_HEP_RATES[key];
    return {
      ...fallback,
      daily: toNum(source.daily, fallback.daily),
      monthly: toNum(source.monthly, fallback.monthly),
      yearly: toNum(source.yearly, fallback.yearly),
    };
  };

  return {
    INDIVIDUAL: buildRate("INDIVIDUAL"),
    VEHICLE: buildRate("VEHICLE"),
    CARGO: buildRate("CARGO"),
  };
};

const calculateDateTo = (fromDate, period, type) => {
  if (!fromDate || !period) return "";

  const [datePart] = String(fromDate).split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  if (!year || !month || !day) return "";

  const d = new Date(year, month - 1, day); // local midnight — no UTC shift
  if (isNaN(d.getTime())) return "";

  const p = parseInt(period, 10);

  if (type === "DAILY" || type === "1" || type === 1) {
    d.setDate(d.getDate() + p); // +1 day for 1-day pass ✅
  } else if (type === "MONTHLY" || type === "2" || type === 2) {
    d.setMonth(d.getMonth() + p); // +1 month, same day ✅
  } else if (
    type === "YEARLY" ||
    type === "ANNUAL" ||
    type === "3" ||
    type === 3
  ) {
    d.setFullYear(d.getFullYear() + p); // +1 year, same day ✅
  }

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  // All passes expire at 05:59 AM on the computed end date.
  return `${yyyy}-${mm}-${dd}T${PASS_EXPIRY_TIME}`;
};

const formatDateGB = (dateInput) => {
  if (!dateInput) return "N/A";
  const dateStr = String(dateInput).split("T")[0];
  const [yyyy, mm, dd] = dateStr.split("-").map(Number);
  if (!yyyy || !mm || !dd) return String(dateInput);
  return `${String(dd).padStart(2, "0")}/${String(mm).padStart(2, "0")}/${yyyy}`;
};

const formatDateLong = (dateInput) => {
  if (!dateInput) return "N/A";
  const dateStr = String(dateInput).split("T")[0];
  const [yyyy, mm, dd] = dateStr.split("-").map(Number);
  if (!yyyy || !mm || !dd) return String(dateInput);

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const monthName = monthNames[mm - 1] || "";
  const formattedDay = String(dd).padStart(2, "0");
  return `${formattedDay} ${monthName} ${yyyy}`;
};

const getLabelById = (arr, val, key = "label") => {
  if (!val) return "";
  if (!Array.isArray(arr)) return val;
  const item = arr.find(
    (x) => String(x.id) === String(val) || String(x.value) === String(val),
  );
  return item ? item[key] || item.name : val;
};

const validateFile = (file, type) => {
  if (!file) return "No file selected";

  const allowedTypes = {
    pdf: ["application/pdf"],
    image: ["image/jpeg", "image/png", "image/jpg"],
  };

  const maxSize = 5 * 1024 * 1024; // 5MB

  if (!allowedTypes[type].includes(file.type)) {
    return type === "pdf"
      ? "Only PDF files are allowed"
      : "Only JPG, JPEG, PNG images are allowed";
  }

  if (file.size > maxSize) {
    return "File size must be less than 5MB";
  }

  return null;
};

// ============================================================
// VALIDATION UTILITIES
// ============================================================
const VALIDATORS = {
  email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
  mobile: (v) => /^[6-9]\d{9}$/.test(v.replace(/\s/g, "")),
  aadhar: (v) => /^\d{12}$/.test(v.replace(/\s/g, "")),
  pan: (v) => /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(v.toUpperCase()),
  passport: (v) => /^[A-Z][0-9]{7}$/.test(v.toUpperCase()),
  visaNo: (v) => /^[A-Z0-9]{5,20}$/i.test(v),
  vehicleReg: (v) =>
    /^[A-Z]{2}[-\s]?[0-9]{1,2}[-\s]?[A-Z]{1,3}[-\s]?[0-9]{4}$/i.test(
      v.replace(/\s/g, ""),
    ),
  name: (v) => /^[a-zA-Z\s.'-]{2,80}$/.test(v.trim()),
  rfidCard: (v) => /^[A-Z0-9]{4,20}$/i.test(v),
  drivingLicence: (v) =>
    /^[A-Z]{2}[0-9]{13}$/.test(v.toUpperCase().replace(/[-\s]/g, "")),
  idProofNumber: (idType, v) => {
    if (!v) return true; // optional field
    if (!idType) return true;
    const t = String(idType);
    if (t === "1") return VALIDATORS.drivingLicence(v); // DL
    if (t === "2") return VALIDATORS.pan(v); // PAN
    if (t === "3") return VALIDATORS.passport(v); // Passport
    return v.trim().length >= 4; // generic
  },
};

const getValidationError = (field, value, extra = {}) => {
  if (field === "hepType") {
    return value && String(value).trim() !== ""
      ? null
      : "Please select Type of HEP";
  }
  if (!value && value !== false) return null; // skip empty optional
  switch (field) {
    case "email":
      return VALIDATORS.email(value)
        ? null
        : "Enter a valid email (e.g. name@domain.com)";
    case "mobile":
      return VALIDATORS.mobile(value)
        ? null
        : "Enter a valid 10-digit Indian mobile number starting with 6-9";
    case "aadharNo":
      return VALIDATORS.aadhar(value)
        ? null
        : "Aadhaar must be exactly 12 digits";
    case "name":
      return VALIDATORS.name(value)
        ? null
        : "Name must be 2-80 characters (letters only)";
    case "cardNumber":
      return value && !VALIDATORS.rfidCard(value)
        ? "RFID Card must be 4-20 alphanumeric characters"
        : null;
    case "vehicleNo": // two-wheeler plate
      return value && !VALIDATORS.vehicleReg(value)
        ? "Enter a valid vehicle registration (e.g. TN-01-AB-1234)"
        : null;
    case "regNo": // four-wheeler plate
      return VALIDATORS.vehicleReg(value)
        ? null
        : "Enter a valid registration number (e.g. TN-01-AB-1234)";
    case "visaNo":
      return VALIDATORS.visaNo(value)
        ? null
        : "Visa number must be 5-20 alphanumeric characters";
    case "idProofNumber":
      return VALIDATORS.idProofNumber(extra.idProofType, value)
        ? null
        : extra.idProofType === "1"
          ? "Driving licence must be in format: State code + 13 digits"
          : extra.idProofType === "2"
            ? "PAN must be in format: ABCDE1234F"
            : extra.idProofType === "3"
              ? "Passport must be: 1 letter + 7 digits"
              : "Enter a valid ID number";
    case "insuranceExpiry":
    case "rcValidity": {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const d = new Date(value);
      return d < today
        ? `${field === "insuranceExpiry" ? "Insurance expiry" : "RC validity"} date must be in the future`
        : null;
    }
    default:
      return null;
  }
};

// ============================================================

const DetailItem = ({
  label,
  value,
  highlight = false,
  showIfEmpty = false,
}) => {
  if (
    !showIfEmpty &&
    (!value ||
      value === "N/A" ||
      value === "null" ||
      value === "undefined" ||
      String(value).trim() === "")
  ) {
    return null;
  }
  return (
    <div className="flex flex-col">
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
        {label}
      </span>
      <span
        className={`text-sm font-semibold ${highlight ? "text-[#0a1e4d] font-black" : "text-slate-700"}`}
      >
        {value || "N/A"}
      </span>
    </div>
  );
};
const getEnumValue = (arr, id, fallback) => {
  if (!id) return fallback;

  const item = arr.find(
    (x) => String(x.id) === String(id) || String(x.value) === String(id),
  );

  let value = item ? item.value || item.label || item.name : fallback;

  // 🔧 FIX: convert YEARLY → ANNUAL to match DB enum
  if (value === "YEARLY") value = "ANNUAL";

  return value;
};

export default function PassRequestPage() {
  const [activeTab, setActiveTab] = useState("apply");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [paymentMode, setPaymentMode] = useState("Account");
  const [loadingPasses, setLoadingPasses] = useState(false);
  const [faceCaptureOpen, setFaceCaptureOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState({});
  const [selectedPassDetails, setSelectedPassDetails] = useState(null);
  const [modals, setModals] = useState({
    person: false,
    vehicle: false,
    rateCard: false,
  });

  const [entityModal, setEntityModal] = useState({
    isOpen: false,
    data: null,
    type: null,
  });

  // State for editing reverted passes (Phase 2)
  const [editingRevertedPass, setEditingRevertedPass] = useState(null);
  const [revertedEditModal, setRevertedEditModal] = useState(false);
  const [revertedPersons, setRevertedPersons] = useState([]);
  const [revertedVehicles, setRevertedVehicles] = useState([]);
  const [editingRevertedEntity, setEditingRevertedEntity] = useState(null); // { type: 'person'|'vehicle', index: number, data: object }

  const [viewingDocUrl, setViewingDocUrl] = useState(null);
  const [isImage, setIsImage] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (viewingDocUrl) {
      setIframeLoading(true);
      // Fallback: dismiss the spinner after 5s even if onLoad doesn't fire
      // (cross-origin iframes may not always trigger onLoad)
      const timer = setTimeout(() => setIframeLoading(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [viewingDocUrl]);

  const handleViewDoc = (
    passRequestId,
    documentType,
    staticPath,
    entityIndex = 0,
    isVendorPass = false,
  ) => {
    // Check if the file is an image based on its extension
    const isImg = staticPath && /\.(jpe?g|png|gif|webp)$/i.test(staticPath);
    setIsImage(!!isImg);

    setViewingDocUrl(
      `${AGENT_API}/pass-request/viewPassRequestsDocument?passRequestId=${passRequestId}&documentType=${documentType}&entityIndex=${entityIndex}&isVendorPass=${isVendorPass}`,
    );
  };

  const [persons, setPersons] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [submittedPasses, setSubmittedPasses] = useState([]);
  const [twoWheelerRequests, setTwoWheelerRequests] = useState([]);
  const [disableModal, setDisableModal] = useState(false);
  const [disableReason, setDisableReason] = useState("");
  const [disableLoading, setDisableLoading] = useState(false);
  const [enableLoading, setEnableLoading] = useState(false);

  const fetchTwoWheelerRequests = useCallback(async () => {
    try {
      const token =
        localStorage.getItem("accessToken") ||
        localStorage.getItem("hep_token");
      if (!token) return;
      const res = await axios.get(
        `${AGENT_API}/pass-request/two-wheeler-update-requests`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (res.data?.success) {
        setTwoWheelerRequests(res.data.data || []);
      }
    } catch (err) {
      console.error("fetchTwoWheelerRequests error:", err);
    }
  }, []);

  useEffect(() => {
    fetchTwoWheelerRequests();
  }, [fetchTwoWheelerRequests]);

  const [twoWheelerModal, setTwoWheelerModal] = useState({
    isOpen: false,
    person: null,
    newVehicleNo: "",
    reason: "",
    loading: false,
  });

  const handleOpenTwoWheelerModal = (person) => {
    const count = parseInt(person.twoWheelerChangeCount || 0, 10);
    if (count >= 3) {
      return toast.error(
        "You have changed the two-wheeler number 3 times already this year, so you cannot change it again.",
      );
    }
    setTwoWheelerModal({
      isOpen: true,
      person,
      newVehicleNo: "",
      reason: "",
      loading: false,
    });
  };

  const handleSubmitTwoWheelerUpdate = async () => {
    if (!twoWheelerModal.newVehicleNo.trim()) {
      return toast.error("Please enter the new two-wheeler vehicle number.");
    }
    const cleanVehicleNo = twoWheelerModal.newVehicleNo.trim().toUpperCase();
    const vehicleRegex =
      /^[A-Z]{2}[-\s]?[0-9]{1,2}[-\s]?[A-Z]{1,3}[-\s]?[0-9]{1,4}$/i;
    if (!vehicleRegex.test(cleanVehicleNo)) {
      return toast.error(
        "Invalid vehicle registration number format. Valid examples: MH01AB1234, KA-02-C-5678.",
      );
    }
    try {
      setTwoWheelerModal((prev) => ({ ...prev, loading: true }));
      const token =
        localStorage.getItem("accessToken") ||
        localStorage.getItem("hep_token") ||
        sessionStorage.getItem("hep_token");
      await axios.post(
        `${AGENT_API}/pass-request/two-wheeler-update-request`,
        {
          personId: twoWheelerModal.person.id,
          passRequestId:
            selectedPassDetails?.id || twoWheelerModal.person.passRequestId,
          newVehicleNo: twoWheelerModal.newVehicleNo.trim(),
          reason: twoWheelerModal.reason,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      toast.success(
        "Two-wheeler vehicle number update request submitted successfully for approval!",
      );
      setTwoWheelerModal({
        isOpen: false,
        person: null,
        newVehicleNo: "",
        reason: "",
        loading: false,
      });
      setEntityModal({ isOpen: false, data: null, type: null });
      fetchSubmittedPasses();
      fetchTwoWheelerRequests();
    } catch (err) {
      console.error("Two-wheeler update request failed:", err);
      toast.error(
        err?.response?.data?.message ||
          "Failed to submit two-wheeler update request.",
      );
      setTwoWheelerModal((prev) => ({ ...prev, loading: false }));
    }
  };

  // Pagination States
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [paginationMeta, setPaginationMeta] = useState({
    totalRecords: 0,
    totalPages: 1,
    currentPage: 1,
    pageSize: 20,
  });
  const [globalCounts, setGlobalCounts] = useState({ total: 0, reverted: 0 });

  // Search States
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // ── View-tab analytics & filters (client-side over ALL of the agent's passes) ──
  const [allViewPasses, setAllViewPasses] = useState([]);
  const [allViewLoading, setAllViewLoading] = useState(false);
  const [viewDateFilter, setViewDateFilter] = useState("all"); // all | today | 7days | 30days | month | custom
  const [viewStatusFilter, setViewStatusFilter] = useState("ALL");
  const [viewCustomFrom, setViewCustomFrom] = useState("");
  const [viewCustomTo, setViewCustomTo] = useState("");
  const [viewPage, setViewPage] = useState(1);
  const [viewPageSize, setViewPageSize] = useState(10);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchInput]);

  const [editingPersonIndex, setEditingPersonIndex] = useState(null);
  const [editingVehicleIndex, setEditingVehicleIndex] = useState(null);

  const [personErrors, setPersonErrors] = useState({});
  const [vehicleErrors, setVehicleErrors] = useState({});

  // Blacklist check warnings (non-blocking — Traffic Approver makes final call)
  const [blacklistWarnings, setBlacklistWarnings] = useState({});
  const [companyBlacklisted, setCompanyBlacklisted] = useState(false);
  const [companyBlacklistReason, setCompanyBlacklistReason] = useState("");
  const [showBlacklistPopup, setShowBlacklistPopup] = useState(false);

  const checkBlacklistStatus = async (entityType, identifier) => {
    // Resolve the admin API base locally so this never depends on the
    // module-scoped const closure (avoids "ADMIN_API is not defined" runtime
    // ReferenceError seen with stale/HMR client bundles).
    const adminApi =
      process.env.NEXT_PUBLIC_ADMIN_API || "http://localhost:5005/api";
    if (!identifier || !identifier.trim() || !adminApi) return;
    try {
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("accessToken")
          : null;
      const res = await axios.get(
        `${adminApi}/blacklist/check?entity_type=${entityType}&identifier=${encodeURIComponent(identifier.trim().toUpperCase())}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.data.success && res.data.isBlacklisted) {
        const entry = res.data.data[0];
        setBlacklistWarnings((prev) => ({
          ...prev,
          [entityType + "_" + identifier.trim().toUpperCase()]:
            `⚠️ BLACKLISTED (${entry.reason_code || "Code 007"}) — ${entry.reason}`,
        }));
        toast.warning(
          `${entityType === "VEHICLE" ? "Vehicle" : entityType === "DRIVER" ? "Driver" : "Person"} is currently BLACKLISTED at the Port!`,
          {
            description: `Reason: ${entry.reason}. Pass request for this entity is blocked.`,
            duration: 6000,
          },
        );
      } else {
        setBlacklistWarnings((prev) => {
          const next = { ...prev };
          delete next[entityType + "_" + identifier.trim().toUpperCase()];
          return next;
        });
      }
    } catch {
      // Silently fail — do not block user if blacklist service is down
    }
  };

  const validatePersonField = (field, value, extra = {}) => {
    const err = getValidationError(field, value, extra);
    setPersonErrors((prev) => ({ ...prev, [field]: err }));
    return !err;
  };

  const validateVehicleField = (field, value) => {
    const err = getValidationError(field, value);
    setVehicleErrors((prev) => ({ ...prev, [field]: err }));
    return !err;
  };

  const [masterPersonsDB, setMasterPersonsDB] = useState({});
  const [masterVehiclesDB, setMasterVehiclesDB] = useState({});

  const [generalForm, setGeneralForm] = useState({
    companyName: "Loading...",
    email: "Loading...",
    mobile: "Loading...",
    balance: "7725.00", // Keep mock for now if wallet isn't built
    utilizedBalance: "0.00",
    purpose: "",
    purposeOther: "",
    authLetter: null,
    requisitionLetter: null,
  });

  const initialPersonForm = {
    masterId: "",
    hepType: "", // Default: empty (user must explicitly select type)
    seafarerPassFor: "Sign-On",
    seafarerIdType: "", // New: "aadhaar" or "passport"
    name: "",
    aadharNo: "",
    aadharFile: null,
    passportNo: "", // New: Passport number for seafarers
    cardNumber: "",
    mobile: "",
    email: "",
    withTwoWheeler: false,
    vehicleNo: "",
    nationality: "1", // Default: 1 (INDIAN)
    country: "75", // Default: India
    visaNo: "",
    accessArea: "",
    designation: "",
    designationOther: "",
    dob: "",
    cdcNumber: "",
    cdcDocument: null,
    declarationForm: null,
    idProofType: "",
    idProofNumber: "",
    photo: null,
    idProofFile: null,
    requisitionLetter: null,
    policeVerification: null,
    proofOfEmployment: null,
    copyOfLicence: null,
    passportDoc: null,
    driverLicence: null,
    entryAuthorization: null,
    existingEntryAuthName: "",
    visaDoc: null,
    immigrationDoc: null,
    existingVisaDocName: "",
    existingImmigrationDocName: "",
    passType: "1", // Default: 1 (Daily)
    passPeriod: "1",
    dateFrom: getCurrentDateTime(),
    dateTo: "",
    validUptoTime: "",
    amount: DEFAULT_HEP_RATES.INDIVIDUAL.daily,
  };
  const [personForm, setPersonForm] = useState(initialPersonForm);
  const [dlVerification, setDlVerification] = useState({
    loading: false,
    verified: false,
    message: "",
    data: null,
  });

  // const isCurrentlyActive = (entity) => {
  //   if (!entity?.dateFrom || !entity?.dateTo) return false;

  //   const today = new Date();
  //   today.setHours(0, 0, 0, 0);

  //   const from = new Date(entity.dateFrom);
  //   from.setHours(0, 0, 0, 0);

  //   const to = new Date(entity.dateTo);
  //   to.setHours(23, 59, 59, 999);

  //   const workflowStatus = String(entity.status || "").toUpperCase();
  //   const passStatus = String(entity.passStatus || "ACTIVE").toUpperCase();

  //   return (
  //     workflowStatus === "APPROVED" &&
  //     passStatus === "ACTIVE" &&
  //     today >= from &&
  //     today <= to
  //   );
  // };

  // const isPassDisabled = (entity) =>
  //   String(entity?.passStatus || "").toUpperCase() === "DISABLED";

  // const isPassApprovedAndActive = (entity) =>
  //   String(entity?.status || "")
  //     .trim()
  //     .toUpperCase() === "APPROVED" &&
  //   String(entity?.passStatus || "ACTIVE")
  //     .trim()
  //     .toUpperCase() === "ACTIVE" &&
  //   isCurrentlyActive(entity);

  // const handleDisablePass = async () => {
  //   if (!disableReason.trim()) {
  //     toast.error("Please enter reason.");
  //     return;
  //   }

  //   try {
  //     setDisableLoading(true);

  //     const token = localStorage.getItem("accessToken");

  //     const url =
  //       entityModal.type === "person"
  //         ? `${AGENT_API}/pass-request/disable-person-pass`
  //         : `${AGENT_API}/pass-request/disable-vehicle-pass`;

  //     const payload =
  //       entityModal.type === "person"
  //         ? {
  //             passPersonId: entityModal.data.id,
  //             reason: disableReason,
  //           }
  //         : {
  //             passVehicleId: entityModal.data.id,
  //             reason: disableReason,
  //           };

  //     const res = await axios.put(url, payload, {
  //       headers: {
  //         Authorization: `Bearer ${token}`,
  //       },
  //     });

  //     if (res.data.success) {
  //       toast.success(res.data.message);
  //       const disabledId = String(entityModal.data.id);
  //       const disabledType = entityModal.type;
  //       setSelectedPassDetails((prev) => {
  //         if (!prev) return prev;

  //         const key = disabledType === "person" ? "persons" : "vehicles";

  //         return {
  //           ...prev,
  //           [key]: (prev[key] || []).map((item) =>
  //             String(item.id) === disabledId
  //               ? {
  //                   ...item,
  //                   passStatus: "DISABLED",
  //                 }
  //               : item,
  //           ),
  //         };
  //       });

  //       // =====================================================
  //       // CLOSE DISABLE MODAL
  //       // =====================================================

  //       setDisableModal(false);
  //       setDisableReason("");

  //       setEntityModal({
  //         isOpen: false,
  //         data: null,
  //         type: null,
  //       });

  //       fetchSubmittedPasses();
  //       fetchAllViewPasses();
  //     }
  //   } catch (err) {
  //     toast.error(err.response?.data?.message || "Unable to disable pass.");
  //   } finally {
  //     setDisableLoading(false);
  //   }
  // };

  // const personOptions = [
  //   { value: "", label: "-- Apply Fresh (Manual Entry) --" },
  //   ...Object.values(masterPersonsDB).map((p) => ({
  //     value: String(p.id),
  //     label: `${p.name} - Aadhar: ${p.aadhar || ""}`,
  //   })),
  // ];

  const getPassStatus = (entity) => {
    return String(
      entity?.passStatus ??
        entity?.pass_status ??
        entity?.passstatus ??
        "ACTIVE",
    )
      .trim()
      .toUpperCase();
  };

  const isPassDisabled = (entity) => {
    return getPassStatus(entity) === "DISABLED";
  };

  const isCurrentlyActive = (entity) => {
    if (!entity?.dateFrom || !entity?.dateTo) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const from = new Date(entity.dateFrom);
    from.setHours(0, 0, 0, 0);

    const to = new Date(entity.dateTo);
    to.setHours(23, 59, 59, 999);

    const workflowStatus = String(entity?.status || "")
      .trim()
      .toUpperCase();

    const passStatus = getPassStatus(entity);

    return (
      workflowStatus === "APPROVED" &&
      passStatus === "ACTIVE" &&
      today >= from &&
      today <= to
    );
  };

  const isPassApprovedAndActive = (entity) => {
    return (
      String(entity?.status || "")
        .trim()
        .toUpperCase() === "APPROVED" &&
      getPassStatus(entity) === "ACTIVE" &&
      isCurrentlyActive(entity)
    );
  };

  const handleDisablePass = async () => {
    if (!disableReason.trim()) {
      toast.error("Please enter reason.");
      return;
    }

    if (!entityModal?.data?.id || !entityModal?.type) {
      toast.error("Pass details are missing.");
      return;
    }

    try {
      setDisableLoading(true);

      const token = localStorage.getItem("accessToken");

      if (!token) {
        toast.error("Authentication token missing. Please login again.");
        return;
      }

      const url =
        entityModal.type === "person"
          ? `${AGENT_API}/pass-request/disable-person-pass`
          : `${AGENT_API}/pass-request/disable-vehicle-pass`;

      const payload =
        entityModal.type === "person"
          ? {
              passPersonId: entityModal.data.id,
              reason: disableReason.trim(),
            }
          : {
              passVehicleId: entityModal.data.id,
              reason: disableReason.trim(),
            };

      const res = await axios.put(url, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.data?.success) {
        toast.success(res.data.message || "Pass disabled successfully.");

        // Immediately update currently opened pass details
        setSelectedPassDetails((prev) => {
          if (!prev) return prev;

          const key = entityModal.type === "person" ? "persons" : "vehicles";

          return {
            ...prev,
            [key]: (prev[key] || []).map((item) =>
              String(item.id) === String(entityModal.data.id)
                ? {
                    ...item,
                    passStatus: "DISABLED",
                    disabledReason: disableReason.trim(),
                    disabledAt: new Date().toISOString(),
                  }
                : item,
            ),
          };
        });

        // Close disable modal
        setDisableModal(false);
        setDisableReason("");

        // Close entity preview
        setEntityModal({
          isOpen: false,
          data: null,
          type: null,
        });

        // Refresh main lists
        await fetchSubmittedPasses();
        await fetchAllViewPasses();
      }
    } catch (err) {
      console.error("Disable pass error:", err);

      toast.error(err.response?.data?.message || "Unable to disable pass.");
    } finally {
      setDisableLoading(false);
    }
  };

  const selectedMasterPersonIds = persons
    .filter((p) => p.masterId)
    .map((p) => String(p.masterId));

  const personOptions = [
    { value: "", label: "-- Apply Fresh (Manual Entry) --" },
    ...Object.values(masterPersonsDB)
      .filter(
        (p) =>
          !selectedMasterPersonIds.includes(String(p.id)) ||
          String(personForm.masterId) === String(p.id), // allow current edit
      )
      .map((p) => ({
        value: String(p.id),
        label: `${p.name} - Aadhar: ${p.aadhar || ""}`,
      })),
  ];

  // const vehicleOptions = [
  //   { value: "", label: "-- Apply Fresh (Manual Entry) --" },
  //   ...Object.values(masterVehiclesDB).map((v) => ({
  //     value: String(v.id),
  //     label: `${v.registrationNo || v.regNo || ""}`,
  //   })),
  // ];

  const initialVehicleForm = {
    masterId: "",
    regNo: "",
    type: "",
    cardNumber: "",
    insuranceExpiry: "",
    rcValidity: "",
    accessArea: "",
    rcDocument: null,
    insuranceDocument: null,
    permit: null,
    fitnessCert: null,
    requestLetter: null,
    taxDoc: null,
    emissionCert: null,
    sparkArrester: null,
    existingSparkArresterName: "",
    twistLock: null,
    existingTwistLockName: "",
    passType: "1", // Default: 1 (Daily)
    passPeriod: "1",
    dateFrom: getCurrentDateTime(),
    dateTo: "",
    amount: DEFAULT_HEP_RATES.VEHICLE.daily,
  };
  const [vehicleForm, setVehicleForm] = useState(initialVehicleForm);
  const [vehicleVerification, setVehicleVerification] = useState({
    loading: false,
    verified: false,
    message: "",
    data: null,
  });
  const ulipVehicleFetched = Boolean(vehicleVerification.data);

  const ulipVehicleActive =
    String(vehicleVerification.data?.vehicleStatus || "").toUpperCase() ===
    "ACTIVE";

  const ulipVehicleInactive = ulipVehicleFetched && !ulipVehicleActive;
  const selectedMasterVehicleIds = vehicles
    .filter((v) => v.masterId)
    .map((v) => String(v.masterId));

  const vehicleOptions = [
    { value: "", label: "-- Apply Fresh (Manual Entry) --" },
    ...Object.values(masterVehiclesDB)
      .filter(
        (v) =>
          !selectedMasterVehicleIds.includes(String(v.id)) ||
          String(vehicleForm.masterId) === String(v.id),
      )
      .map((v) => ({
        value: String(v.id),
        label: `${v.registrationNo || v.regNo || ""}`,
      })),
  ];

  // --- DYNAMIC & DB MAPPED MASTER DATA ---
  const [masterData, setMasterData] = useState({
    designations: [],
    idProofTypes: [],
    passTypes: [],
    nationalities: [],
    accessAreas: [],
    vehicleTypes: [],
    countries: [],
    hepTypes: [
      { id: 1, name: "Drivers" },
      { id: 2, name: "Personnel" },
      { id: 3, name: "Seafarers" },
    ],
    purposes: [
      { id: 1, name: "Inspection" },
      { id: 2, name: "Maintenance" },
      { id: 3, name: "Repairs" },
      { id: 4, name: "Site Visit" },
      { id: 5, name: "New Project" },
      { id: 6, name: "Others" },
    ],
    countries: [
      { id: 75, name: "India", iso2: "IN" },
      { id: 1, name: "Afghanistan", iso2: "AF" },
      { id: 9, name: "Australia", iso2: "AU" },
      { id: 31, name: "Canada", iso2: "CA" },
      { id: 36, name: "China", iso2: "CN" },
    ],
  });

  useEffect(() => {
    try {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        setCurrentUser(JSON.parse(userStr));
      }
    } catch (error) {
      console.error("Failed to parse user from local storage", error);
    }
  }, []);

  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const token = localStorage.getItem("accessToken");
        const config = { headers: { Authorization: `Bearer ${token}` } };

        const [
          natRes,
          passRes,
          idRes,
          accessRes,
          desigRes,
          vehRes,
          countryRes,
        ] = await Promise.all([
          axios
            .get(`${AGENT_API}/pass-request/get-nationality`, config)
            .catch(() => ({ data: [] })),
          axios
            .get(`${AGENT_API}/pass-request/get-pass-types`, config)
            .catch(() => ({ data: [] })),
          axios
            .get(`${AGENT_API}/pass-request/get-id-proof-types`, config)
            .catch(() => ({ data: [] })),
          axios
            .get(`${AGENT_API}/pass-request/get-access-areas`, config)
            .catch(() => ({ data: [] })),
          axios
            .get(`${AGENT_API}/pass-request/getDesignations`, config)
            .catch(() => ({ data: [] })),
          axios
            .get(`${AGENT_API}/pass-request/getVehicleTypes`, config)
            .catch(() => ({ data: [] })),
          axios
            .get(`${AGENT_API}/pass-request/get-countries`, config)
            .catch(() => ({ data: [] })),
        ]);

        const extractArray = (res) =>
          Array.isArray(res?.data?.data)
            ? res.data.data
            : Array.isArray(res?.data)
              ? res.data
              : [];

        const fetchedCountries = extractArray(countryRes);

        setMasterData((prev) => ({
          ...prev,
          nationalities: extractArray(natRes),
          passTypes: extractArray(passRes),
          idProofTypes: extractArray(idRes),
          accessAreas: extractArray(accessRes),
          designations: extractArray(desigRes),
          vehicleTypes: extractArray(vehRes),
          countries:
            fetchedCountries.length > 0 ? fetchedCountries : prev.countries,
        }));

        // Auto-set country to India's real DB ID when nationality is Indian
        if (fetchedCountries.length > 0) {
          const indiaEntry = fetchedCountries.find(
            (c) =>
              String(c.name || "")
                .trim()
                .toLowerCase() === "india",
          );
          if (indiaEntry) {
            setPersonForm((prev) => {
              // Only set if nationality is Indian (default) and country is empty or stale
              if (
                prev.nationality === "1" &&
                (!prev.country || prev.country === "75")
              ) {
                return { ...prev, country: String(indiaEntry.id) };
              }
              return prev;
            });
          }
        }
      } catch (error) {
        console.error("Error loading API master data", error);
      }
    };
    fetchMasterData();
  }, []);

  // --- FETCH LOGGED-IN AGENT PROFILE ---
  useEffect(() => {
    const fetchAgentProfile = async () => {
      try {
        let token = localStorage.getItem("accessToken");
        if (!token) return;

        // Remove extra quotes if present
        token = token.replace(/^["']|["']$/g, "");

        // Call your backend agent profile route
        const response = await axios.get(`${AGENT_API}/agents/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.data && response.data.success) {
          const agentData = response.data.data;

          let remainingDays = null;
          let isLicenseExpired = false;
          const isLifetimeLicense = Boolean(agentData.isLifetimeLicense);

          if (!isLifetimeLicense && agentData.licenseValidityDate) {
            const datePart = String(agentData.licenseValidityDate).split(
              "T",
            )[0];
            const [yyyy, mm, dd] = datePart.split("-").map(Number);
            if (yyyy && mm && dd) {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const expDate = new Date(yyyy, mm - 1, dd, 0, 0, 0, 0);
              const diffMs = expDate.getTime() - today.getTime();
              remainingDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
              isLicenseExpired = remainingDays <= 0;
            }
          }

          // Populate the General Form with the DB data
          setGeneralForm((prev) => ({
            ...prev,
            companyName: agentData.entityName || "N/A",
            email: agentData.email || "N/A",
            mobile: agentData.mobileNo || "N/A",
            licenseValidityDate: isLifetimeLicense
              ? null
              : agentData.licenseValidityDate || null,
            isLifetimeLicense,
            remainingDays,
            isLicenseExpired,
          }));

          // Set company blacklisting details if blacklisted
          if (agentData.isBlacklisted) {
            setCompanyBlacklisted(true);
            setCompanyBlacklistReason(
              agentData.blacklistReason || "Company is blacklisted",
            );
            setShowBlacklistPopup(true);
          }
        }
      } catch (error) {
        console.error("Failed to fetch agent profile:", error);
        toast.error("Failed to load company profile data.");

        // Fallback if API fails
        setGeneralForm((prev) => ({
          ...prev,
          companyName: "Error loading profile",
          email: "-",
          mobile: "-",
        }));
      }
    };

    fetchAgentProfile();
  }, []);

  const fetchMasterRecords = async () => {
    try {
      let token = localStorage.getItem("accessToken");
      if (!token) return;

      token = token.replace(/^["']|["']$/g, "");

      const res = await axios.get(
        `${AGENT_API}/pass-request/my-master-records`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (res.data?.success) {
        const persons = res.data.data.persons || [];
        const vehicles = res.data.data.vehicles || [];

        const pDict = {};
        persons.forEach((p) => (pDict[p.id] = p));

        const vDict = {};
        vehicles.forEach((v) => (vDict[v.id] = v));

        setMasterPersonsDB(pDict);
        setMasterVehiclesDB(vDict);
      }
    } catch (err) {
      console.error("Master records fetch failed", err);
    }
  };

  useEffect(() => {
    fetchMasterRecords();
  }, []);

  const toggleModal = (modalName, state) => {
    if (
      state &&
      generalForm.isLicenseExpired &&
      (modalName === "person" || modalName === "vehicle")
    ) {
      toast.error(
        "Pass generation is locked because your company license has expired.",
      );
      return;
    }
    setModals({ ...modals, [modalName]: state });
    if (!state) {
      if (modalName === "person") {
        setEditingPersonIndex(null);
        setPersonErrors({});
      }
      if (modalName === "vehicle") {
        setEditingVehicleIndex(null);
        setVehicleErrors({});
      }
    }
  };

  const [feeMaster, setFeeMaster] = useState(null); // { INDIVIDUAL: {...}, VEHICLE: {...}, CARGO: {...} }
  const effectiveHepRates = useMemo(
    () => resolveEffectiveHepRates(feeMaster),
    [feeMaster],
  );

  useEffect(() => {
    const fetchFeeMaster = async () => {
      try {
        const token =
          typeof window !== "undefined"
            ? localStorage.getItem("accessToken")
            : null;
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        const res = await axios.get(`${ADMIN_API}/hep-rate`, { headers });
        const feesByCategory = {};
        (res.data?.data || []).forEach((row) => {
          const category = String(row.category || "").toUpperCase();
          feesByCategory[category] = {
            daily: parseFloat(row.daily_rate),
            monthly: parseFloat(row.monthly_rate),
            yearly: parseFloat(row.yearly_rate),
          };
        });
        setFeeMaster(feesByCategory);
      } catch (err) {
        toast.error("Failed to load fee configuration. Please refresh.");
      }
    };
    fetchFeeMaster();
  }, []);

  useEffect(() => {
    let updatedPeriod = personForm.passPeriod;

    // Check license remaining days lock
    if (
      generalForm.remainingDays !== null &&
      generalForm.remainingDays !== undefined &&
      !generalForm.isLicenseExpired
    ) {
      const pTypeStr = String(personForm.passType);
      if (
        (pTypeStr === "2" || pTypeStr === "MONTHLY") &&
        generalForm.remainingDays < 30
      ) {
        toast.warning(
          `Monthly passes are locked because your license expires in ${generalForm.remainingDays} days.`,
        );
        setPersonForm((prev) => ({ ...prev, passType: "1" }));
        return;
      }
      if (
        (pTypeStr === "3" || pTypeStr === "YEARLY" || pTypeStr === "ANNUAL") &&
        generalForm.remainingDays < 365
      ) {
        toast.warning(
          `Yearly passes are locked because your license expires in ${generalForm.remainingDays} days.`,
        );
        setPersonForm((prev) => ({ ...prev, passType: "1" }));
        return;
      }
    }

    // ✅ Restrict DAILY to max 7 days or remaining license days
    if (String(personForm.passType) === "1") {
      let maxAllowed = 7;
      if (
        generalForm.remainingDays !== null &&
        generalForm.remainingDays !== undefined &&
        generalForm.remainingDays < 7
      ) {
        maxAllowed = Math.max(1, generalForm.remainingDays);
      }
      if (parseInt(updatedPeriod, 10) > maxAllowed) {
        updatedPeriod = String(maxAllowed);
        toast.warning(`Maximum ${maxAllowed} days allowed for daily pass`);
      }
    } else {
      // ❌ Disable period for Monthly/Yearly
      updatedPeriod = "1";
    }

    // Individual HEP rate — ₹13/day, ₹191/month, ₹508/year (incl. GST)
    const amt = getHepAmount(
      "INDIVIDUAL",
      personForm.passType,
      updatedPeriod,
      effectiveHepRates,
    );

    const newDateTo = calculateDateTo(
      personForm.dateFrom,
      updatedPeriod,
      personForm.passType,
    );

    setPersonForm((prev) => ({
      ...prev,
      passPeriod: updatedPeriod,
      amount: amt,
      dateTo: newDateTo,
    }));
  }, [
    personForm.passType,
    personForm.passPeriod,
    personForm.dateFrom,
    generalForm.remainingDays,
    generalForm.isLicenseExpired,
    effectiveHepRates,
  ]);

  useEffect(() => {
    let updatedPeriod = vehicleForm.passPeriod;

    // Check license remaining days lock
    if (
      generalForm.remainingDays !== null &&
      generalForm.remainingDays !== undefined &&
      !generalForm.isLicenseExpired
    ) {
      const vTypeStr = String(vehicleForm.passType);
      if (
        (vTypeStr === "2" || vTypeStr === "MONTHLY") &&
        generalForm.remainingDays < 30
      ) {
        toast.warning(
          `Monthly passes are locked because your license expires in ${generalForm.remainingDays} days.`,
        );
        setVehicleForm((prev) => ({ ...prev, passType: "1" }));
        return;
      }
      if (
        (vTypeStr === "3" || vTypeStr === "YEARLY" || vTypeStr === "ANNUAL") &&
        generalForm.remainingDays < 365
      ) {
        toast.warning(
          `Yearly passes are locked because your license expires in ${generalForm.remainingDays} days.`,
        );
        setVehicleForm((prev) => ({ ...prev, passType: "1" }));
        return;
      }
    }

    if (String(vehicleForm.passType) === "1") {
      let maxAllowed = 7;
      if (
        generalForm.remainingDays !== null &&
        generalForm.remainingDays !== undefined &&
        generalForm.remainingDays < 7
      ) {
        maxAllowed = Math.max(1, generalForm.remainingDays);
      }
      if (parseInt(updatedPeriod, 10) > maxAllowed) {
        updatedPeriod = String(maxAllowed);
        toast.warning(`Daily pass max allowed is ${maxAllowed} days`);
      }
    } else {
      updatedPeriod = "1";
    }

    const selectedTypeObj = masterData.vehicleTypes.find(
      (t) => String(t.id) === String(vehicleForm.type),
    );
    const typeName = selectedTypeObj
      ? String(selectedTypeObj.name).toUpperCase().trim()
      : "";

    // Cargo handling equipment is charged at a higher rate than a plain vehicle:
    // ₹51/day vs ₹32/day, ₹571 vs ₹382 monthly, ₹3807 vs ₹2539 yearly (incl. GST)
    const amt = getHepAmount(
      isCargoEquipmentType(typeName) ? "CARGO" : "VEHICLE",
      vehicleForm.passType,
      updatedPeriod,
      effectiveHepRates,
    );

    const newDateTo = calculateDateTo(
      vehicleForm.dateFrom,
      updatedPeriod,
      vehicleForm.passType,
    );

    setVehicleForm((prev) => ({
      ...prev,
      passPeriod: updatedPeriod,
      amount: amt,
      dateTo: newDateTo,
    }));
  }, [
    vehicleForm.passType,
    vehicleForm.passPeriod,
    vehicleForm.dateFrom,
    vehicleForm.type,
    masterData.vehicleTypes,
    generalForm.remainingDays,
    generalForm.isLicenseExpired,
    effectiveHepRates,
  ]);

  // Live running time: update dateFrom every 30s while person modal is open
  useEffect(() => {
    if (!modals.person) return;

    const interval = setInterval(() => {
      const now = getCurrentDateTime();
      setPersonForm((prev) => {
        const newDateTo = calculateDateTo(now, prev.passPeriod, prev.passType);
        return { ...prev, dateFrom: now, dateTo: newDateTo };
      });
    }, 30000);

    return () => clearInterval(interval);
  }, [modals.person]);

  // Live running time: update dateFrom every 30s while vehicle modal is open
  useEffect(() => {
    if (!modals.vehicle) return;

    const interval = setInterval(() => {
      const now = getCurrentDateTime();
      setVehicleForm((prev) => {
        const newDateTo = calculateDateTo(now, prev.passPeriod, prev.passType);
        return { ...prev, dateFrom: now, dateTo: newDateTo };
      });
    }, 30000);

    return () => clearInterval(interval);
  }, [modals.vehicle]);

  useEffect(() => {
    const natObj = (masterData.nationalities || []).find(
      (n) => String(n.id || n.value) === String(personForm.nationality),
    );
    const selectedNationality = (
      natObj?.label ||
      natObj?.name ||
      ""
    ).toUpperCase();

    const indiaObj = (masterData.countries || []).find(
      (c) =>
        String(c.name || "")
          .trim()
          .toLowerCase() === "india",
    );
    const indiaId = indiaObj ? String(indiaObj.id) : "";

    if (
      (selectedNationality === "INDIAN" ||
        !personForm.nationality ||
        String(personForm.nationality) === "1") &&
      indiaId
    ) {
      setPersonForm((prev) => {
        if (String(prev.country) !== indiaId) {
          return { ...prev, country: indiaId };
        }
        return prev;
      });
    } else if (
      selectedNationality &&
      selectedNationality !== "INDIAN" &&
      String(personForm.nationality) !== "1"
    ) {
      // If switching from Indian → foreign, clear country if it was India
      if (String(personForm.country) === indiaId) {
        setPersonForm((prev) => ({
          ...prev,
          country: "",
        }));
      }
    }
  }, [personForm.nationality, masterData.nationalities, masterData.countries]);

  const isPersonForeigner = useCallback(
    (natValue) => {
      const natObj = (masterData.nationalities || []).find(
        (n) =>
          String(n.id || n.value) === String(natValue) ||
          (n.label || n.name || "").toUpperCase() ===
            String(natValue).toUpperCase(),
      );
      const label = (natObj?.label || natObj?.name || "").toUpperCase();
      return (
        label === "FOREIGNER" ||
        String(natValue) === "2" ||
        String(natValue).toUpperCase() === "FOREIGNER"
      );
    },
    [masterData.nationalities],
  );

  const fetchSubmittedPasses = useCallback(async () => {
    setLoadingPasses(true);
    try {
      const token = localStorage.getItem("accessToken");

      if (!token) {
        toast.error("Authentication token missing. Please log in again.");
        setLoadingPasses(false);
        return;
      }

      const response = await axios.get(
        `${AGENT_API}/pass-request/my-pass-requests`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: {
            page: currentPage,
            limit: pageSize,
            status: activeTab === "reverted" ? "reverted" : undefined,
            search: debouncedSearch || undefined,
          },
        },
      );

      if (response.data && response.data.success) {
        setSubmittedPasses(response.data.data || []);
        setPaginationMeta(response.data.pagination || {});
        setGlobalCounts(response.data.counts || { total: 0, reverted: 0 });
      } else {
        setSubmittedPasses([]);
      }
    } catch (error) {
      console.error("Error fetching pass requests:", error);
      toast.error(
        error.response?.data?.message || "Failed to load submitted passes.",
      );
      setSubmittedPasses([]);
    } finally {
      setLoadingPasses(false);
    }
  }, [currentPage, pageSize, activeTab, debouncedSearch]);

  // Loads ALL of the agent's passes (paginated, 100/page) so the View tab can
  // show accurate per-status counts and apply date/status filters client-side.
  const fetchAllViewPasses = useCallback(async () => {
    setAllViewLoading(true);
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        setAllViewLoading(false);
        return;
      }
      const headers = { Authorization: `Bearer ${token}` };
      const first = await axios.get(
        `${AGENT_API}/pass-request/my-pass-requests`,
        {
          headers,
          params: { page: 1, limit: 100 },
        },
      );
      if (!first.data?.success) {
        setAllViewPasses([]);
        setAllViewLoading(false);
        return;
      }
      let all = first.data.data || [];
      const totalPages = first.data.pagination?.totalPages || 1;
      if (totalPages > 1) {
        const reqs = [];
        for (let p = 2; p <= totalPages; p++) {
          reqs.push(
            axios.get(`${AGENT_API}/pass-request/my-pass-requests`, {
              headers,
              params: { page: p, limit: 100 },
            }),
          );
        }
        const rest = await Promise.allSettled(reqs);
        rest.forEach((r) => {
          if (r.status === "fulfilled" && r.value.data?.success)
            all = all.concat(r.value.data.data || []);
        });
      }
      setAllViewPasses(all);
      // Keep the reverted-tab badge accurate even while on the view tab
      if (first.data.counts) setGlobalCounts(first.data.counts);
    } catch (error) {
      console.error("Error fetching all pass requests:", error);
      setAllViewPasses([]);
    } finally {
      setAllViewLoading(false);
    }
  }, []);

  // Trigger fetch when "view" or "reverted" tab is selected or page changes
  useEffect(() => {
    if (activeTab === "reverted") {
      fetchSubmittedPasses();
    }
  }, [activeTab, currentPage, fetchSubmittedPasses]);

  // View tab → load everything once for counts + client-side filtering
  useEffect(() => {
    if (activeTab === "view") {
      fetchAllViewPasses();
    }
  }, [activeTab, fetchAllViewPasses]);

  // Reset the client page whenever a filter/search changes
  useEffect(() => {
    setViewPage(1);
  }, [
    viewStatusFilter,
    viewDateFilter,
    viewCustomFrom,
    viewCustomTo,
    debouncedSearch,
    allViewPasses.length,
  ]);

  // Per-status counts over ALL passes (the "number system")
  const viewCounts = useMemo(() => {
    const c = {
      total: allViewPasses.length,
      submitted: 0,
      underReview: 0,
      completed: 0,
      reverted: 0,
      rejected: 0,
      draft: 0,
      thisMonth: 0,
    };
    const now = new Date();
    allViewPasses.forEach((p) => {
      const s = String(p.status || "").toUpperCase();
      if (s === "SUBMITTED") c.submitted++;
      else if (s === "UNDER_REVIEW") c.underReview++;
      else if (s === "COMPLETED" || s === "APPROVED" || s === "ISSUED")
        c.completed++;
      else if (s === "REVERTED") c.reverted++;
      else if (s === "REJECTED") c.rejected++;
      else if (s === "DRAFT") c.draft++;
      const d = new Date(p.createdAt || p.submittedAt);
      if (
        !Number.isNaN(d.getTime()) &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear()
      )
        c.thisMonth++;
    });
    return c;
  }, [allViewPasses]);

  // Client-side filtered list (status + date range + search)
  const filteredViewPasses = useMemo(() => {
    const now = new Date();
    const startToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const q = (debouncedSearch || "").trim().toLowerCase();

    return allViewPasses.filter((p) => {
      // Status
      if (viewStatusFilter !== "ALL") {
        const s = String(p.status || "").toUpperCase();
        if (viewStatusFilter === "COMPLETED") {
          if (!(s === "COMPLETED" || s === "APPROVED" || s === "ISSUED"))
            return false;
        } else if (s !== viewStatusFilter) return false;
      }
      // Date
      if (viewDateFilter !== "all") {
        const d = new Date(p.createdAt || p.submittedAt);
        if (Number.isNaN(d.getTime())) return false;
        if (viewDateFilter === "today") {
          if (d < startToday) return false;
        } else if (viewDateFilter === "7days") {
          if (d < new Date(startToday.getTime() - 6 * 864e5)) return false;
        } else if (viewDateFilter === "30days") {
          if (d < new Date(startToday.getTime() - 29 * 864e5)) return false;
        } else if (viewDateFilter === "month") {
          if (
            d.getMonth() !== now.getMonth() ||
            d.getFullYear() !== now.getFullYear()
          )
            return false;
        } else if (viewDateFilter === "custom") {
          if (viewCustomFrom) {
            const f = new Date(viewCustomFrom);
            f.setHours(0, 0, 0, 0);
            if (d < f) return false;
          }
          if (viewCustomTo) {
            const t = new Date(viewCustomTo);
            t.setHours(23, 59, 59, 999);
            if (d > t) return false;
          }
        }
      }
      // Search
      if (q) {
        const inRef = String(p.referenceNo || "")
          .toLowerCase()
          .includes(q);
        const inPerson = (p.persons || []).some(
          (pp) =>
            String(pp.name || "")
              .toLowerCase()
              .includes(q) ||
            String(pp.aadharNo || "")
              .toLowerCase()
              .includes(q),
        );
        const inVeh = (p.vehicles || []).some((vv) =>
          String(vv.registrationNo || "")
            .toLowerCase()
            .includes(q),
        );
        if (!inRef && !inPerson && !inVeh) return false;
      }
      return true;
    });
  }, [
    allViewPasses,
    viewStatusFilter,
    viewDateFilter,
    viewCustomFrom,
    viewCustomTo,
    debouncedSearch,
  ]);

  const viewTotalPages = Math.max(
    1,
    Math.ceil(filteredViewPasses.length / viewPageSize),
  );
  const viewPageSlice = filteredViewPasses.slice(
    (viewPage - 1) * viewPageSize,
    (viewPage - 1) * viewPageSize + viewPageSize,
  );

  // Reset page to 1 and clear search when changing tabs
  useEffect(() => {
    setCurrentPage(1);
    setSearchInput("");
  }, [activeTab]);

  const handlePrintQR = async (entity, type) => {
    // Extract IDs safely based on how your DB returns them
    const passRequestId =
      selectedPassDetails?.id || selectedPassDetails?.passId;
    const entityId = entity?.id || entity?.person_id || entity?.vehicle_id;

    if (!passRequestId || !entityId) {
      toast.error("Missing pass or entity ID. Cannot generate QR.");
      return;
    }

    toast.info(`Generating QR for ${type}...`);

    try {
      let token = localStorage.getItem("accessToken");
      if (token) token = token.replace(/^["']|["']$/g, "");

      // Directing explicitly to your QR Service on Port 5007
      const QR_SERVICE_URL =
        process.env.NEXT_PUBLIC_QR_API || "http://localhost:5007/api";

      const response = await axios.get(
        `${QR_SERVICE_URL}/qr/generate-pass/${passRequestId}?type=${type}&entityId=${entityId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: "blob", // CRITICAL: Tells Axios to handle a PDF file, not JSON
        },
      );

      // Create a URL for the downloaded PDF blob
      const pdfBlob = new Blob([response.data], { type: "application/pdf" });
      const pdfUrl = URL.createObjectURL(pdfBlob);

      // ==========================================
      // NEW LOGIC: Print seamlessly in the same tab
      // ==========================================

      // 1. Create an invisible iframe
      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      iframe.src = pdfUrl;

      // 2. Append it to the document body
      document.body.appendChild(iframe);

      // 3. Wait for the PDF to load, then trigger the print dialog
      iframe.onload = () => {
        // Triggers the native browser print popup seamlessly
        iframe.contentWindow.print();

        // Clean up the DOM and memory after a minute
        setTimeout(() => {
          document.body.removeChild(iframe);
          URL.revokeObjectURL(pdfUrl);
        }, 60000);
      };
    } catch (error) {
      let errorMessage = "Failed to generate QR pass.";

      // If the backend fails, it sends JSON wrapped in a Blob. We must decode it.
      if (error.response && error.response.data) {
        if (error.response.data instanceof Blob) {
          const text = await error.response.data.text();
          try {
            const json = JSON.parse(text);
            errorMessage = json.message || errorMessage;
          } catch (e) {
            errorMessage = text;
          }
        } else {
          errorMessage = error.response.data.message || errorMessage;
        }
      }

      toast.error(`QR Error: ${errorMessage}`);
      console.error("QR Generation Error:", error);
    }
  };

  const calculateTotals = () => {
    // Amounts can arrive as strings when an existing entity is loaded for
    // edit, so coerce before summing — otherwise `+=` concatenates.
    const toNum = (v) => {
      const n = parseFloat(v);
      return Number.isFinite(n) ? n : 0;
    };
    let base = 0;
    persons.forEach((p) => (base += toNum(p.amount)));
    vehicles.forEach((v) => (base += toNum(v.amount)));
    // HEP rates are GST-inclusive, so there is no GST to add on top.
    return {
      base: base.toFixed(2),
      gst: (0.0).toFixed(2),
      net: base.toFixed(2),
    };
  };
  const totals = calculateTotals();

  const handleMasterPersonSelect = (e) => {
    const id = e.target.value;
    const alreadySelected = persons.some(
      (p) => String(p.masterId) === String(id),
    );

    if (alreadySelected) {
      toast.error("This person is already added to the request.");
      return;
    }
    if (id && masterPersonsDB[id]) {
      const data = masterPersonsDB[id];
      if (data.isActive === false) {
        toast.error(
          `ERROR: ${data.name} is BLOCKED in the Master Directory. Pass cannot be issued.`,
        );
        console.log("MASTER PERSON DATA", data);
        setPersonForm(initialPersonForm);
        return;
      }

      // Safe mapping for DB String values -> Dropdown IDs
      const natObj = masterData.nationalities.find(
        (n) =>
          (n.label || n.name || "").toUpperCase() ===
          String(data.nationality).toUpperCase(),
      );
      const natVal = natObj ? String(natObj.id || natObj.value) : "1"; // Default Indian

      const idObj = masterData.idProofTypes.find(
        (t) =>
          (t.label || t.name || "").toUpperCase() ===
          String(data.idProofType).toUpperCase(),
      );
      const idVal = idObj
        ? String(idObj.id || idObj.value)
        : data.idProofType || "";

      const areaObj = masterData.accessAreas.find(
        (a) =>
          (a.label || a.name || "").toUpperCase() ===
          String(data.accessAreaId).toUpperCase(),
      );
      const areaVal = areaObj ? String(areaObj.id || areaObj.value) : "";

      const pTypeStr = String(data.passType || "").toUpperCase();
      const passTypeVal =
        pTypeStr === "MONTHLY"
          ? "2"
          : pTypeStr === "YEARLY" || pTypeStr === "ANNUAL"
            ? "3"
            : "1";
      console.log("MASTER PERSON DATA837", JSON.stringify(data, null, 2));
      const dateFromValue = data.dateFrom
        ? new Date(data.dateFrom).toISOString().slice(0, 16)
        : getCurrentDateTime();

      const dateToValue = calculateDateTo(
        dateFromValue,
        data.passPeriod ? String(data.passPeriod) : "1",
        passTypeVal,
      );
      setPersonForm({
        ...initialPersonForm,
        masterId: id,
        existingPassRequestId: data.passRequestId || data.id, // Crucial for fetching old documents
        hepType: data.hepTypeId
          ? String(data.hepTypeId)
          : data.designationName === "Driver"
            ? "1"
            : "2",
        name: data.name || "",
        aadharNo: data.aadharNo || "",
        mobile: data.mobile || "",
        email: data.email || "",
        nationality: natVal,
        country: data.countryId ? String(data.countryId) : "75",
        visaNo: data.visaNo || "",
        accessArea: areaVal,
        designation: data.designationId ? String(data.designationId) : "",
        designationOther: data.designationOther || "",
        cardNumber: data.cardNumber || "",
        withTwoWheeler: data.withTwoWheeler || false,
        vehicleNo: data.vehicleNo || "",
        idProofType: idVal,
        idProofNumber: data.idProofNumber || "",

        // 🚀 FIX: Pre-fill pass type and dates so UI reacts correctly
        passType: passTypeVal,
        passPeriod: data.passPeriod ? String(data.passPeriod) : "1",
        dateFrom: data.dateFrom
          ? new Date(data.dateFrom).toISOString().slice(0, 16)
          : getCurrentDateTime(),
        dateTo: dateToValue,

        // Map Existing Files
        existingAadharName: data.aadharPDFFileName,
        existingPhotoName: data.photoFileName,
        existingPhotoUrl: data.photoFilePath,
        existingIdProofName: data.idProofFileName,
        existingReqName: data.requisitionLetterName,
        existingDlName: data.driverLicenseName,
        existingPoliceName: data.policeVerificationName,
        existingEmpName: data.employmentProofName,
        existingChaName: data.chaLicenseName,
        existingPassportName: data.passportName,
      });
      toast.success("Person details & documents auto-filled");
    } else {
      setPersonForm(initialPersonForm);
    }
  };

  const handleMasterVehicleSelect = (e) => {
    const id = e.target.value;
    const alreadySelected = vehicles.some(
      (v) => String(v.masterId) === String(id),
    );

    if (alreadySelected) {
      toast.error("This vehicle is already added to the request.");
      return;
    }
    if (id && masterVehiclesDB[id]) {
      const data = masterVehiclesDB[id];

      if (data.isActive === false) {
        toast.error(
          `ERROR: Vehicle ${data.registrationNo || data.regNo} is BLOCKED in the Master Directory.`,
        );
        console.log("MASTER VEHICLE DATA898", data);
        setVehicleForm(initialVehicleForm);
        return;
      }

      const areaObj = masterData.accessAreas.find(
        (a) =>
          (a.label || a.name || "").toUpperCase() ===
          String(data.accessAreaId).toUpperCase(),
      );
      const areaVal = areaObj ? String(areaObj.id || areaObj.value) : "";

      // 🚀 FIX: Correctly map Pass Type
      const pTypeStr = String(data.passType || "").toUpperCase();
      const passTypeVal =
        pTypeStr === "MONTHLY"
          ? "2"
          : pTypeStr === "YEARLY" || pTypeStr === "ANNUAL"
            ? "3"
            : "1";
      console.log("MASTER VEHICLE DATA918", JSON.stringify(data, null, 2));
      const dateFromValue = data.dateFrom
        ? new Date(data.dateFrom).toISOString().slice(0, 16)
        : getCurrentDateTime();

      const dateToValue = calculateDateTo(
        dateFromValue,
        data.passPeriod ? String(data.passPeriod) : "1",
        passTypeVal,
      );
      setVehicleForm({
        ...initialVehicleForm,
        masterId: id,
        existingPassRequestId: data.passRequestId || data.id, // For fetching old documents
        regNo: data.registrationNo || data.regNo || "",
        type: data.vehicleTypeId || data.type || "",
        cardNumber: data.rfidCardNumber || "",
        accessArea: areaVal,
        insuranceExpiry: data.insuranceExpiry
          ? new Date(data.insuranceExpiry).toISOString().split("T")[0]
          : "",
        rcValidity: data.rcValidity
          ? new Date(data.rcValidity).toISOString().split("T")[0]
          : "",

        // 🚀 FIX: Pre-fill pass type and dates
        passType: passTypeVal,
        passPeriod: data.passPeriod ? String(data.passPeriod) : "1",
        dateFrom: data.dateFrom
          ? new Date(data.dateFrom).toISOString().slice(0, 16)
          : getCurrentDateTime(),
        dateTo: dateToValue,

        // Map Existing Files
        existingRcName: data.scannedCopyFileName,
        existingInsName: data.insuranceFileName,
        existingPermitName: data.permitFileName,
        existingFitnessName: data.fitnessFileName,
        existingReqName: data.requestLetterName,
        existingTaxName: data.taxDocName,
        existingEmissionName: data.emissionCertName,
      });

      toast.success("Vehicle details & documents auto-filled");
    } else {
      setVehicleForm(initialVehicleForm);
    }
  };

  const handleAddPerson = () => {
    // ---- License Expiry & Duration Lock Check ----
    if (!generalForm.isLifetimeLicense) {
      if (generalForm.isLicenseExpired) {
        return toast.error(
          "Pass generation is locked because your company license has expired.",
        );
      }
      if (
        generalForm.remainingDays !== null &&
        generalForm.remainingDays !== undefined
      ) {
        const pTypeStr = String(personForm.passType || "1");
        if (
          (pTypeStr === "2" || pTypeStr === "MONTHLY") &&
          generalForm.remainingDays < 30
        ) {
          return toast.error(
            `Cannot add Monthly pass. Your company license expires in ${generalForm.remainingDays} days.`,
          );
        }
        if (
          (pTypeStr === "3" ||
            pTypeStr === "YEARLY" ||
            pTypeStr === "ANNUAL") &&
          generalForm.remainingDays < 365
        ) {
          return toast.error(
            `Cannot add Yearly pass. Your company license expires in ${generalForm.remainingDays} days.`,
          );
        }
        if (personForm.dateTo && generalForm.licenseValidityDate) {
          const passEnd = new Date(personForm.dateTo);
          const datePart = String(generalForm.licenseValidityDate).split(
            "T",
          )[0];
          const [yyyy, mm, dd] = datePart.split("-").map(Number);
          if (yyyy && mm && dd) {
            const licExp = new Date(yyyy, mm - 1, dd, 23, 59, 59, 999);
            if (passEnd > licExp) {
              return toast.error(
                `Cannot add pass. Pass end date (${formatDateGB(personForm.dateTo)}) exceeds company license expiry date (${formatDateLong(generalForm.licenseValidityDate)}).`,
              );
            }
          }
        }
      }
    }

    // ---- Full field validation before add ----
    const errors = {};

    // ---- DOB & Under-18 Age Validation Check ----
    if (!personForm.dob) {
      errors.dob = "Date of Birth is required";
    } else {
      const isoDob = formatDDMMYYYYToISO(personForm.dob) || personForm.dob;
      const dobDate = new Date(isoDob);
      if (isNaN(dobDate.getTime())) {
        errors.dob = "Enter a valid Date of Birth";
      } else {
        const today = new Date();
        let age = today.getFullYear() - dobDate.getFullYear();
        const monthDiff = today.getMonth() - dobDate.getMonth();
        if (
          monthDiff < 0 ||
          (monthDiff === 0 && today.getDate() < dobDate.getDate())
        ) {
          age--;
        }
        const desigObj = (masterData.designations || []).find(
          (d) => String(d.id) === String(personForm.designation),
        );
        const selectedDesigName = desigObj
          ? desigObj.name
          : personForm.designation;
        const desigStr = String(
          selectedDesigName || personForm.designationOther || "",
        ).toLowerCase();
        const isVisitor = desigStr.includes("visitor");
        if (age < 18 && !isVisitor) {
          errors.dob =
            "Pass application is not allowed for persons below 18 years of age (except Visitor designation).";
        }
      }
    }

    // ---- Auto-fallback for Driver Licence if ID proof is DL ----
    if (personForm.hepType === "1") {
      if (!personForm.driverLicence && personForm.idProofFile) {
        personForm.driverLicence = personForm.idProofFile;
      }
      if (!personForm.existingDlName && personForm.existingIdProofName) {
        personForm.existingDlName = personForm.existingIdProofName;
      }
    }

    // ---- Blacklist validation checks ----
    const cleanAadhaar = personForm.aadharNo
      ? personForm.aadharNo.replace(/\s/g, "").toUpperCase()
      : "";
    const cleanIdProof = personForm.idProofNumber
      ? personForm.idProofNumber.replace(/[\s-]/g, "").toUpperCase()
      : "";
    const cleanTwoWheeler =
      personForm.withTwoWheeler && personForm.vehicleNo
        ? personForm.vehicleNo.replace(/[\s-]/g, "").toUpperCase()
        : "";

    const aadharWarning =
      blacklistWarnings["PERSON_" + cleanAadhaar] ||
      blacklistWarnings["DRIVER_" + cleanAadhaar];
    const idProofWarning =
      blacklistWarnings["DRIVER_" + cleanIdProof] ||
      blacklistWarnings["PERSON_" + cleanIdProof];
    const twoWheelerWarning = cleanTwoWheeler
      ? blacklistWarnings["VEHICLE_" + cleanTwoWheeler]
      : null;

    if (aadharWarning) {
      return toast.error(
        `Cannot add/update person: Aadhaar Number is blacklisted! Reason: ${aadharWarning.replace("⚠️ BLACKLISTED ", "")}`,
      );
    }
    if (idProofWarning) {
      return toast.error(
        `Cannot add/update person: Driving License / ID Number is blacklisted! Reason: ${idProofWarning.replace("⚠️ BLACKLISTED ", "")}`,
      );
    }
    if (twoWheelerWarning) {
      return toast.error(
        `Cannot add/update person: Two Wheeler is blacklisted! Reason: ${twoWheelerWarning.replace("⚠️ BLACKLISTED ", "")}`,
      );
    }

    if (!personForm.hepType || personForm.hepType.trim() === "") {
      errors.hepType =
        "Please select Type of HEP (Drivers, Personnel, or Seafarers)";
    }

    if (!personForm.name.trim()) errors.name = "Full name is required";
    else if (!/^[a-zA-Z\s.'-]{2,80}$/.test(personForm.name.trim()))
      errors.name = "Name must be 2-80 characters (letters only)";

    const isForeigner = isPersonForeigner(personForm.nationality);

    // Aadhaar validation - required for non-foreigners (non-seafarers OR seafarers who chose aadhaar)
    if (
      !isForeigner &&
      (personForm.hepType !== "3" || personForm.seafarerIdType === "aadhaar")
    ) {
      if (!personForm.aadharNo) errors.aadharNo = "Aadhaar number is required";
      else if (!/^\d{12}$/.test(personForm.aadharNo.replace(/\s/g, "")))
        errors.aadharNo = "Aadhaar must be exactly 12 digits";
    }

    // Passport validation - required for seafarers who chose passport OR for Foreigners
    if (isForeigner) {
      if (!personForm.idProofNumber && !personForm.passportNo) {
        errors.idProofNumber = "Passport number is required for Foreigners";
      }
    } else if (
      personForm.hepType === "3" &&
      personForm.seafarerIdType === "passport"
    ) {
      if (!personForm.passportNo)
        errors.passportNo = "Passport number is required";
      else if (!/^[A-Z0-9]{5,20}$/i.test(personForm.passportNo))
        errors.passportNo =
          "Passport number must be 5-20 alphanumeric characters";
    }

    // Seafarer must select ID type
    if (
      personForm.hepType === "3" &&
      !personForm.seafarerIdType &&
      !isForeigner
    ) {
      errors.seafarerIdType = "Please select Aadhaar or Passport";
    }

    if (!personForm.mobile) errors.mobile = "Mobile number is required";
    else if (!/^[6-9]\d{9}$/.test(personForm.mobile.replace(/\s/g, "")))
      errors.mobile =
        "Enter a valid 10-digit Indian mobile number starting with 6-9";

    if (
      personForm.email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(personForm.email)
    )
      errors.email = "Enter a valid email address";

    if (
      personForm.withTwoWheeler &&
      personForm.vehicleNo &&
      !/^[A-Z]{2}[-\s]?[0-9]{1,2}[-\s]?[A-Z]{1,3}[-\s]?[0-9]{4}$/i.test(
        personForm.vehicleNo,
      )
    )
      errors.vehicleNo = "Enter a valid vehicle registration number";

    if (isForeigner) {
      if (!personForm.visaNo || !personForm.visaNo.trim()) {
        errors.visaNo = "Visa number is required for Foreigners";
      } else if (!/^[A-Z0-9]{5,20}$/i.test(personForm.visaNo.trim())) {
        errors.visaNo = "Visa number must be 5-20 alphanumeric characters";
      }
    }

    if (personForm.idProofNumber) {
      const err = getValidationError(
        "idProofNumber",
        personForm.idProofNumber,
        { idProofType: personForm.idProofType },
      );
      if (err) errors.idProofNumber = err;
    }

    if (Object.keys(errors).length > 0) {
      setPersonErrors(errors);
      return;
    }
    setPersonErrors({});

    //====================
    // DL Verification
    //====================

    if (personForm.idProofType === "1" && !dlVerification.verified) {
      return toast.error("Please verify the Driving Licence before adding.");
    }

    if (
      !personForm.name.trim() ||
      !personForm.designation ||
      !personForm.mobile ||
      !(personForm.photo || personForm.existingPhotoName)
    ) {
      return toast.error("Please fill all mandatory fields including Photo.");
    }

    if (
      personForm.hepType === "1" &&
      !(personForm.driverLicence || personForm.existingDlName)
    )
      return toast.error("Driver Licence is mandatory for Drivers.");

    // Copy of Passport doc is required for Foreigners or Seafarers who selected "passport"
    if (
      isForeigner &&
      !(
        personForm.idProofFile ||
        personForm.existingIdProofName ||
        personForm.passportDoc ||
        personForm.existingPassportName
      )
    )
      return toast.error("Copy of Passport is mandatory for Foreigners.");

    if (isForeigner && !(personForm.visaDoc || personForm.existingVisaDocName))
      return toast.error("Visa document is mandatory for Foreigners.");

    if (
      isForeigner &&
      !(personForm.immigrationDoc || personForm.existingImmigrationDocName)
    )
      return toast.error(
        "Immigration Clearance document is mandatory for Foreigners.",
      );

    if (personForm.passType === "2" || personForm.passType === "3") {
      if (!(personForm.policeVerification || personForm.existingPoliceName)) {
        return toast.error(
          "Police Verification is mandatory for Monthly/Yearly passes.",
        );
      }
    }

    const isPersonOilDock =
      String(personForm.accessArea).toUpperCase().includes("OIL JETTY") ||
      String(personForm.accessArea) === "1";
    if (
      isPersonOilDock &&
      !(personForm.entryAuthorization || personForm.existingEntryAuthName)
    ) {
      return toast.error(
        "Entry Authorization is mandatory for Oil Dock passes.",
      );
    }

    // Check if we're editing a reverted entity
    if (editingRevertedEntity && editingRevertedEntity.type === "person") {
      // Call API to update reverted person
      handleSaveRevertedEntity();
      return;
    }

    if (editingPersonIndex !== null) {
      const updated = [...persons];
      updated[editingPersonIndex] = personForm;
      setPersons(updated);
      setEditingPersonIndex(null);
      toast.success("Person updated successfully.");
    } else {
      setPersons([...persons, personForm]);
      toast.success("Person added successfully.");
    }

    toggleModal("person", false);
    setPersonForm(initialPersonForm);
  };

  const editPersonRow = (index) => {
    setPersonForm(persons[index]);
    setEditingPersonIndex(index);
    toggleModal("person", true);
  };

  const openAddPersonModal = () => {
    const now = getCurrentDateTime();
    const indiaObj = masterData.countries.find(
      (c) =>
        String(c.name || "")
          .trim()
          .toLowerCase() === "india",
    );
    const indiaId = indiaObj ? String(indiaObj.id) : "";

    setPersonForm({
      ...initialPersonForm,
      country: indiaId,
      dateFrom: now,
      dateTo: calculateDateTo(
        now,
        initialPersonForm.passPeriod,
        initialPersonForm.passType,
      ),
    });
    setEditingPersonIndex(null);
    toggleModal("person", true);
  };

  const deletePersonRow = (index) => {
    const updated = [...persons];
    updated.splice(index, 1);
    setPersons(updated);
    toast.success("Person removed.");
  };

  const handleClearPerson = () => {
    const now = getCurrentDateTime();
    setPersonForm({
      ...initialPersonForm,
      dateFrom: now,
      dateTo: calculateDateTo(
        now,
        initialPersonForm.passPeriod,
        initialPersonForm.passType,
      ),
    });
    setEditingPersonIndex(null);
  };

  const convertDate = (dateStr) => {
    if (!dateStr) return "";

    const months = {
      Jan: "01",
      Feb: "02",
      Mar: "03",
      Apr: "04",
      May: "05",
      Jun: "06",
      Jul: "07",
      Aug: "08",
      Sep: "09",
      Oct: "10",
      Nov: "11",
      Dec: "12",
    };

    const parts = dateStr.split("-");

    if (parts.length !== 3) return "";

    return `${parts[2]}-${months[parts[1]]}-${parts[0]}`;
  };

  //   const verifyVehicle = async (vehicleNo) => {
  //     try {
  //       setVehicleVerification({
  //         loading: true,
  //         verified: false,
  //         message: "",
  //         data: null,
  //       });

  //       const token = localStorage.getItem("accessToken");

  //       const res = await axios.post(
  //         `${AGENT_API}/ulip/vahan`,
  //         {
  //           vehiclenumber: vehicleNo,
  //         },
  //         {
  //           headers: {
  //             Authorization: `Bearer ${token}`,
  //           },
  //         }
  //       );
  //       // const ulipData = res.data?.response?.[0]?.response;
  //       const ulipData = res.data?.response?.[0]?.response;

  //       const isVerified = res.data.vehicleStatus === "ACTIVE";

  //       const statusMessage =res.data.vehicleStatus || "INACTIVE";

  //       // const statusMessage = ulipData?.statusMessage || "";

  //       // const isVerified =
  //       //     statusMessage === "Vehicle Details Found";

  //       setVehicleVerification({

  //           loading: false,

  //           verified: isVerified,

  //           message: statusMessage,

  //           data: res.data

  //       });
  //       if (ulipData) {

  //     setVehicleForm(prev => ({
  //         ...prev,
  //         insuranceExpiry:
  //             convertDate(ulipData.rcInsuranceUpto),

  //         rcValidity:
  //             convertDate(ulipData.rcRegnUpto),

  //         // map your vehicle type if needed
  //     }));

  // }

  //       // ==========================
  //       // Update Verification Status
  //       // ==========================
  //       // setVehicleVerification({
  //       //   loading: false,
  //       //   verified: true,
  //       //   message: "Vehicle Verified Successfully",
  //       //   data: res.data,
  //       // });
  //       console.log("ULIP Vehicle Response", res.data);

  //       // ==========================
  //       // OPTIONAL : Auto-fill fields
  //       // ==========================
  //       if (res.data?.data) {
  //         setVehicleForm((prev) => ({
  //           ...prev,

  //           insuranceExpiry:
  //             res.data.data.insuranceExpiry || prev.insuranceExpiry,

  //           rcValidity:
  //             res.data.data.rcValidity || prev.rcValidity,

  //           type:
  //             res.data.data.vehicleTypeId || prev.type,
  //         }));
  //       }
  //     } catch (err) {
  //       setVehicleVerification({
  //         loading: false,
  //         verified: false,
  //         message:
  //           err.response?.data?.message ||
  //           "Vehicle not found",
  //         data: null,
  //       });
  //     }
  //   };

  const verifyVehicle = async (vehicleNo) => {
    try {
      setVehicleVerification({
        loading: true,
        verified: false,
        message: "",
        data: null,
      });

      const token = localStorage.getItem("accessToken");

      const res = await axios.post(
        `${AGENT_API}/ulip/vahan`,
        {
          vehiclenumber: vehicleNo,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const ulipData = res.data?.response?.[0]?.response;

      const vehicleStatus = String(
        res.data?.vehicleStatus || ulipData?.rcStatus || "INACTIVE",
      ).toUpperCase();

      const isVerified = vehicleStatus === "ACTIVE";

      setVehicleVerification({
        loading: false,
        verified: isVerified,
        message: vehicleStatus,
        data: res.data,
      });

      /*
       * ==========================================
       * VAHAN DATE VALUES
       * ==========================================
       */
      if (ulipData) {
        const insuranceExpiry = convertDate(ulipData.rcInsuranceUpto);
        const rcValidity = convertDate(ulipData.rcRegnUpto);

        setVehicleForm((prev) => ({
          ...prev,

          // Always take these two dates from VAHAN
          insuranceExpiry,
          rcValidity,
        }));
      }

      console.log("ULIP Vehicle Response:", res.data);
    } catch (err) {
      setVehicleVerification({
        loading: false,
        verified: false,
        message: err.response?.data?.message || "Vehicle not found",
        data: null,
      });

      // Clear VAHAN dates when verification fails
      setVehicleForm((prev) => ({
        ...prev,
        insuranceExpiry: "",
        rcValidity: "",
      }));
    }
  };

  const verifyDL = async (dl) => {
    try {
      setDlVerification({
        loading: true,
        verified: false,
        message: "",
        data: null,
      });

      const token = localStorage.getItem("accessToken");

      const res = await axios.post(
        `${AGENT_API}/ulip/sarathi02`,
        {
          dlnumber: dl,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      // ==========================================
      // ACTUAL SARATHI RESPONSE STRUCTURE
      // ==========================================

      const sarathiResult = res.data?.response?.[0];

      const ulipResponse = sarathiResult?.response;

      // responseStatus is sibling of response
      const responseStatus = sarathiResult?.responseStatus;

      // Actual DL status is inside DLInformation
      const dlStatus =
        ulipResponse?.DLinformation?.DL_status;

      const normalizedDlStatus = String(dlStatus || "")
        .trim()
        .toUpperCase()
        .replace(/[.\s]/g, "");

      const isVerified =
        String(responseStatus || "").trim().toUpperCase() === "SUCCESS" &&
        normalizedDlStatus === "ACTIVE";

      console.log("=================================");
      console.log("ULIP DL Response:", res.data);
      console.log("Sarathi Result:", sarathiResult);
      console.log("Sarathi Response:", ulipResponse);
      console.log("Sarathi responseStatus:", responseStatus);
      console.log("Sarathi DL_status:", dlStatus);
      console.log("DL Verified:", isVerified);
      console.log("=================================");

      setDlVerification({
        loading: false,
        verified: isVerified,
        message: isVerified
          ? "Driving Licence Verified Successfully"
          : "Driving Licence verification failed",
        data: res.data,
      });

    } catch (err) {
      console.error("DL Verification Error:", err);

      setDlVerification({
        loading: false,
        verified: false,
        message:
          err.response?.data?.message ||
          "Driving Licence Not Found",
        data: null,
      });
    }
  };

  const handleAddVehicle = () => {
    // ---- License Expiry & Duration Lock Check ----
    if (!generalForm.isLifetimeLicense) {
      if (generalForm.isLicenseExpired) {
        return toast.error(
          "Pass generation is locked because your company license has expired.",
        );
      }
      if (
        generalForm.remainingDays !== null &&
        generalForm.remainingDays !== undefined
      ) {
        const vTypeStr = String(vehicleForm.passType || "1");
        if (
          (vTypeStr === "2" || vTypeStr === "MONTHLY") &&
          generalForm.remainingDays < 30
        ) {
          return toast.error(
            `Cannot add Monthly pass. Your company license expires in ${generalForm.remainingDays} days.`,
          );
        }
        if (
          (vTypeStr === "3" ||
            vTypeStr === "YEARLY" ||
            vTypeStr === "ANNUAL") &&
          generalForm.remainingDays < 365
        ) {
          return toast.error(
            `Cannot add Yearly pass. Your company license expires in ${generalForm.remainingDays} days.`,
          );
        }
        if (vehicleForm.dateTo && generalForm.licenseValidityDate) {
          const passEnd = new Date(vehicleForm.dateTo);
          const datePart = String(generalForm.licenseValidityDate).split(
            "T",
          )[0];
          const [yyyy, mm, dd] = datePart.split("-").map(Number);
          if (yyyy && mm && dd) {
            const licExp = new Date(yyyy, mm - 1, dd, 23, 59, 59, 999);
            if (passEnd > licExp) {
              return toast.error(
                `Cannot add pass. Pass end date (${formatDateGB(vehicleForm.dateTo)}) exceeds company license expiry date (${formatDateLong(generalForm.licenseValidityDate)}).`,
              );
            }
          }
        }
      }
    }

    // ---- Blacklist blocking check ----
    const cleanRegNo = vehicleForm.regNo
      ? vehicleForm.regNo.replace(/[\s-]/g, "").toUpperCase()
      : "";
    const regNoWarning = blacklistWarnings["VEHICLE_" + cleanRegNo];
    if (regNoWarning) {
      return toast.error(
        `Cannot add/update vehicle: Registration Number is blacklisted! Reason: ${regNoWarning.replace("⚠️ BLACKLISTED ", "")}`,
      );
    }

    // ---- Full field validation before add ----
    const vErrors = {};
    if (!vehicleForm.regNo.trim())
      vErrors.regNo = "Registration number is required";
    else if (
      !/^[A-Z]{2}[-\s]?[0-9]{1,2}[-\s]?[A-Z]{1,3}[-\s]?[0-9]{4}$/i.test(
        vehicleForm.regNo,
      )
    )
      vErrors.regNo = "Enter a valid registration number (e.g. TN-01-AB-1234)";

    if (vehicleForm.insuranceExpiry) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (new Date(vehicleForm.insuranceExpiry) < today)
        vErrors.insuranceExpiry = "Insurance expiry date must be in the future";
    }
    if (vehicleForm.rcValidity) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (new Date(vehicleForm.rcValidity) < today)
        vErrors.rcValidity = "RC validity date must be in the future";
    }
    if (Object.keys(vErrors).length > 0) {
      setVehicleErrors(vErrors);
      return toast.error(
        "Please fix the highlighted field errors before adding.",
      );
    }
    setVehicleErrors({});

    //====================
    // ULIP Verification
    //====================
    console.log("vehicleVerification =", vehicleVerification);
    if (!vehicleVerification.verified) {
      return toast.error(
        "Please verify the Vehicle Registration Number before adding.",
      );
    }
    // ---- End validation ----
    if (
      !vehicleForm.regNo.trim() ||
      !(vehicleForm.rcDocument || vehicleForm.existingRcName) ||
      !(vehicleForm.insuranceDocument || vehicleForm.existingInsName) ||
      !(vehicleForm.fitnessCert || vehicleForm.existingFitnessName) ||
      !vehicleForm.insuranceExpiry ||
      !vehicleForm.rcValidity
    ) {
      return toast.error(
        "RC/NOC, Insurance, Fitness Certificate, and their Validity Dates are mandatory.",
      );
    }
    if (
      ["2", "3", "MONTHLY", "ANNUAL", "YEARLY"].includes(
        String(vehicleForm.passType),
      )
    ) {
      if (!(vehicleForm.permit || vehicleForm.existingPermitName)) {
        return toast.error(
          "Permit Document is mandatory for Monthly/Yearly passes.",
        );
      }
      if (
        !(vehicleForm.requestLetter || vehicleForm.existingReqName) ||
        !(vehicleForm.taxDoc || vehicleForm.existingTaxName) ||
        !(vehicleForm.emissionCert || vehicleForm.existingEmissionName)
      ) {
        return toast.error(
          "Request Letter, Tax, Emission Cert, and Permit are mandatory for Monthly/Yearly passes.",
        );
      }
    }

    const isVehicleOilDock =
      String(vehicleForm.accessArea).toUpperCase().includes("OIL JETTY") ||
      String(vehicleForm.accessArea) === "1";
    if (isVehicleOilDock) {
      if (
        !(vehicleForm.sparkArrester || vehicleForm.existingSparkArresterName)
      ) {
        return toast.error(
          "Spark Arrester Certificate is mandatory for Oil Dock passes.",
        );
      }
    }
    const isMonthlyYearly = ["2", "3", "MONTHLY", "ANNUAL", "YEARLY"].includes(
      String(vehicleForm.passType),
    );
    if (
      isMonthlyYearly &&
      !(vehicleForm.twistLock || vehicleForm.existingTwistLockName)
    ) {
      return toast.error(
        "Twist Lock Certificate is mandatory for Monthly/Yearly passes.",
      );
    }
    if (
      isVehicleOilDock &&
      !isMonthlyYearly &&
      !(vehicleForm.requestLetter || vehicleForm.existingReqName)
    ) {
      return toast.error(
        "Request Letter is mandatory for Oil Dock Daily passes.",
      );
    }

    // Check if we're editing a reverted entity
    if (editingRevertedEntity && editingRevertedEntity.type === "vehicle") {
      // Call API to update reverted vehicle
      handleSaveRevertedEntity();
      return;
    }

    const vehicleData = {
      ...vehicleForm,

      ulipVerified: vehicleVerification.verified,

      vehicleStatus: vehicleVerification.verified ? "ACTIVE" : "INACTIVE",

      ulipVerifiedAt: new Date().toISOString(),

      ulipResponse: vehicleVerification.data,
    };

    console.log("Vehicle Data");
    console.log(vehicleData);

    // if (editingVehicleIndex !== null) {
    //   const updated = [...vehicles];
    //   updated[editingVehicleIndex] = vehicleForm;
    //   setVehicles(updated);
    //   setEditingVehicleIndex(null);
    //   toast.success("Vehicle updated successfully.");
    // } else {
    //   setVehicles([...vehicles, vehicleForm]);
    //   toast.success("Vehicle added successfully.");
    // }
    if (editingVehicleIndex !== null) {
      const updated = [...vehicles];

      // CHANGE HERE
      updated[editingVehicleIndex] = vehicleData;

      setVehicles(updated);
      setEditingVehicleIndex(null);
      toast.success("Vehicle updated successfully.");
    } else {
      // CHANGE HERE
      setVehicles([...vehicles, vehicleData]);

      toast.success("Vehicle added successfully.");
    }

    toggleModal("vehicle", false);
    setVehicleForm(initialVehicleForm);
  };

  const editVehicleRow = (index) => {
    setVehicleForm(vehicles[index]);
    setEditingVehicleIndex(index);
    toggleModal("vehicle", true);
  };

  const openAddVehicleModal = () => {
    const now = getCurrentDateTime();
    setVehicleForm({
      ...initialVehicleForm,
      dateFrom: now,
      dateTo: calculateDateTo(
        now,
        initialVehicleForm.passPeriod,
        initialVehicleForm.passType,
      ),
    });
    setEditingVehicleIndex(null);
    toggleModal("vehicle", true);
  };

  const handleEnablePass = async () => {
    if (!entityModal?.data?.id) {
      toast.error("Pass information is missing.");
      return;
    }

    try {
      setEnableLoading(true);

      const token = localStorage.getItem("accessToken");

      const url =
        entityModal.type === "person"
          ? `${AGENT_API}/pass-request/enable-person-pass`
          : `${AGENT_API}/pass-request/enable-vehicle-pass`;

      const payload =
        entityModal.type === "person"
          ? {
              passPersonId: entityModal.data.id,
            }
          : {
              passVehicleId: entityModal.data.id,
            };

      const response = await axios.put(url, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.data?.success) {
        throw new Error(response.data?.message || "Unable to enable pass.");
      }

      toast.success(response.data.message || "Pass enabled successfully.");

      // Update current entity immediately
      setEntityModal((prev) => ({
        ...prev,
        data: {
          ...prev.data,
          passStatus: "ACTIVE",
          disabledReason: null,
          disabledAt: null,
        },
      }));

      // Update selected pass details immediately
      setSelectedPassDetails((prev) => {
        if (!prev) return prev;

        const key = entityModal.type === "person" ? "persons" : "vehicles";

        return {
          ...prev,
          [key]: (prev[key] || []).map((item) =>
            String(item.id) === String(entityModal.data.id)
              ? {
                  ...item,
                  passStatus: "ACTIVE",
                  disabledReason: null,
                  disabledAt: null,
                }
              : item,
          ),
        };
      });

      // Refresh list so parent request also comes back normally
      fetchAllViewPasses();
    } catch (error) {
      console.error("Enable pass error:", error);

      toast.error(
        error.response?.data?.message ||
          error.message ||
          "Unable to enable pass.",
      );
    } finally {
      setEnableLoading(false);
    }
  };

  const deleteVehicleRow = (index) => {
    const updated = [...vehicles];
    updated.splice(index, 1);
    setVehicles(updated);
    toast.success("Vehicle removed.");
  };

  const handleSubmitRequest = async () => {
    if (companyBlacklisted) {
      return toast.error(
        "Pass application blocked. Your company is blacklisted.",
        {
          description: `Reason: ${companyBlacklistReason}`,
          duration: 8000,
        },
      );
    }
    if (!generalForm.purpose)
      return toast.warning("Please select a Purpose of Visit.");
    if (!generalForm.authLetter)
      return toast.warning(
        "Please upload the Licence / Work Order / Contract document.",
      );
    if (!generalForm.requisitionLetter)
      return toast.warning("Please upload the Requisition Letter.");
    if (!agreedToTerms)
      return toast.warning("Please agree to the Terms and Conditions.");
    if (persons.length === 0 && vehicles.length === 0)
      return toast.warning("Add at least one person or vehicle.");

    setLoading(true);

    try {
      // 1. CLEAN TOKEN: Prevents malformed JWT backend crashes
      let token = localStorage.getItem("accessToken");
      if (token) token = token.replace(/^["']|["']$/g, "");

      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const formData = new FormData();

      const finalPurpose =
        String(generalForm.purpose) === "6"
          ? 6
          : parseInt(generalForm.purpose, 10);

      // 2. SAFE EXTRACTION: Prevent undefined values breaking the DB insertion
      const getEnumValue = (arr, id, fallback) => {
        if (!id) return fallback;

        const item = arr.find(
          (x) => String(x.id) === String(id) || String(x.value) === String(id),
        );

        let value = item ? item.value || item.label || item.name : fallback;

        // 🔧 FIX: convert YEARLY → ANNUAL to match DB enum
        if (value === "YEARLY") value = "ANNUAL";

        return value;
      };

      // =========================
      // PERSONS
      // =========================
      const formattedPersons = persons.map((p) => {
        if (!p.dateFrom)
          throw new Error(`DateFrom missing for person ${p.name}`);

        const computedDateTo = calculateDateTo(
          p.dateFrom,
          p.passPeriod,
          p.passType,
        );
        if (!computedDateTo)
          throw new Error(`DateTo not calculated for person ${p.name}`);

        // For Seafarers using passport as primary ID, store passportNo in aadharNo field
        // (re-uses the primary-identifier DB column since no separate passportNo column exists)
        const primaryIdNo =
          p.hepType === "3" && p.seafarerIdType === "passport"
            ? p.passportNo
            : p.aadharNo;

        const isCustomDesig =
          p.designation === "Crew" ||
          p.designation === "Supernumerary" ||
          p.designation === "Others";
        const desigIdVal = isCustomDesig
          ? null
          : parseInt(p.designation, 10) || null;
        const desigOtherVal =
          p.designation === "Crew" || p.designation === "Supernumerary"
            ? p.designation
            : p.designation === "Others"
              ? p.designationOther
              : null;

        return {
          rateId: 1,
          hepTypeId: parseInt(p.hepType, 10) || 2,
          name: p.name,
          aadharNo: primaryIdNo,
          mobile: p.mobile,
          email: p.email,
          nationality: getEnumValue(
            masterData.nationalities,
            p.nationality,
            "INDIAN",
          ),
          countryId: parseInt(p.country, 10) || 75,
          visaNo: p.visaNo || "",
          designationId: desigIdVal,
          designationOther: desigOtherVal,
          cardNumber: p.cardNumber,
          accessAreaId: getEnumValue(
            masterData.accessAreas,
            p.accessArea,
            "OTHER GATES ONLY",
          ),
          withTwoWheeler: p.withTwoWheeler,
          vehicleNo: p.vehicleNo,
          dob: p.dob || null,
          cdcNumber: p.cdcNumber || null,
          passportNo: p.passportNo || null,
          seafarerPassFor: p.seafarerPassFor || null,
          seafarerIdType: p.seafarerIdType || null,
          // Secondary ID proof — only relevant for non-seafarers
          idProofType:
            p.hepType !== "3"
              ? getEnumValue(masterData.idProofTypes, p.idProofType, "")
              : "",
          idProofNumber: p.hepType !== "3" ? p.idProofNumber : "",
          passType: getEnumValue(masterData.passTypes, p.passType, "DAILY"),
          passPeriod: parseInt(p.passPeriod, 10) || 1,
          dateFrom: p.dateFrom,
          dateTo: computedDateTo,
          amount: parseFloat(p.amount) || 0,
        };
      });

      // =========================
      // VEHICLES
      // =========================
      const formattedVehicles = vehicles.map((v) => {
        if (!v.dateFrom)
          throw new Error(`DateFrom missing for vehicle ${v.regNo}`);

        const computedDateTo = calculateDateTo(
          v.dateFrom,
          v.passPeriod,
          v.passType,
        );
        if (!computedDateTo)
          throw new Error(`DateTo not calculated for vehicle ${v.regNo}`);

        return {
          rateId: 2,
          vehicleTypeId: parseInt(v.type, 10) || 1,
          registrationNo: v.regNo,
          rfidCardNumber: v.cardNumber,
          insuranceExpiry: v.insuranceExpiry || null,
          rcValidity: v.rcValidity || null,
          accessAreaId: getEnumValue(
            masterData.accessAreas,
            v.accessArea,
            "OTHER GATES ONLY",
          ),
          passType: getEnumValue(masterData.passTypes, v.passType, "DAILY"),
          passPeriod: parseInt(v.passPeriod, 10) || 1,
          dateFrom: v.dateFrom,
          dateTo: computedDateTo,
          amount: parseFloat(v.amount) || 0,
          // ULIP
          ulipVerified: v.ulipVerified,
          vehicleStatus: v.vehicleStatus,
          ulipVerifiedAt: v.ulipVerifiedAt,
        };
      });

      // =========================
      // PAYLOAD
      // =========================
      const requestPayload = {
        // agentId: parseInt(user.id, 10) || parseInt(user.agentId, 10) || 1,
        purposeOfVisitId: finalPurpose,
        paymentMode: paymentMode.toUpperCase(),
        // 3. INJECT MISSING TOTALS required by your PostgreSQL Schema
        baseTotal: parseFloat(totals.base) || 0.0,
        grossTotal: parseFloat(totals.base) || 0.0,
        gstAmount: parseFloat(totals.gst) || 0.0,
        netAmount: parseFloat(totals.net) || 0.0,
        persons: formattedPersons,
        vehicles: formattedVehicles,
      };

      console.log("REQUEST PAYLOAD");
      console.log(requestPayload);
      console.log("Vehicles Payload");
      console.log(requestPayload.vehicles);

      formData.append("payload", JSON.stringify(requestPayload));
      formData.append("authLetter", generalForm.authLetter);
      if (generalForm.requisitionLetter)
        formData.append("passRequisitionLetter", generalForm.requisitionLetter);
      for (const pair of formData.entries()) {
        console.log("FORMDATA =>", pair[0]);
      }

      // =========================
      // FILES APPENDING
      // =========================

      // ===== CHANGE START =====
      // Send files for every person (indexed to prevent file shifting)

      persons.forEach((p, idx) => {
        if (p.photo) formData.append(`personPhoto_${idx}`, p.photo);
        if (p.aadharFile) formData.append(`personAadhar_${idx}`, p.aadharFile);
        if (p.idProofFile)
          formData.append(`personIdProof_${idx}`, p.idProofFile);

        // Auto-fallback if driverLicence is empty for a Driver
        const dlFile =
          p.driverLicence || (p.hepType === "1" ? p.idProofFile : null);
        if (dlFile) formData.append(`driverLicense_${idx}`, dlFile);

        if (p.policeVerification)
          formData.append(`policeVerification_${idx}`, p.policeVerification);
        if (p.proofOfEmployment)
          formData.append(`employmentProof_${idx}`, p.proofOfEmployment);
        if (p.copyOfLicence)
          formData.append(`chaLicenseCopy_${idx}`, p.copyOfLicence);
        if (p.passportDoc) formData.append(`passportDoc_${idx}`, p.passportDoc);
        if (p.visaDoc) formData.append(`visaDoc_${idx}`, p.visaDoc);
        if (p.immigrationDoc)
          formData.append(`immigrationDoc_${idx}`, p.immigrationDoc);
        if (p.cdcDocument) formData.append(`cdcDocument_${idx}`, p.cdcDocument);
        if (p.declarationForm)
          formData.append(`declarationForm_${idx}`, p.declarationForm);
        if (p.entryAuthorization)
          formData.append(`entryAuthorization_${idx}`, p.entryAuthorization);
      });

      // Send files for every vehicle

      vehicles.forEach((v, idx) => {
        if (v.rcDocument) formData.append(`vehicleRC_${idx}`, v.rcDocument);
        if (v.insuranceDocument)
          formData.append(`vehicleInsurance_${idx}`, v.insuranceDocument);
        if (v.permit) formData.append(`vehiclePermit_${idx}`, v.permit);
        if (v.fitnessCert)
          formData.append(`vehicleFitness_${idx}`, v.fitnessCert);
        if (v.requestLetter)
          formData.append(`vehicleRequestLetter_${idx}`, v.requestLetter);
        if (v.taxDoc) formData.append(`vehicleTax_${idx}`, v.taxDoc);
        if (v.emissionCert)
          formData.append(`vehicleEmission_${idx}`, v.emissionCert);
        if (v.sparkArrester)
          formData.append(`sparkArrester_${idx}`, v.sparkArrester);
        if (v.twistLock) formData.append(`twistLock_${idx}`, v.twistLock);
      });
      // ===== CHANGE END =====

      const response = await axios.post(
        `${AGENT_API}/pass-request/createPassRequest`,
        formData,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (response.data) {
        toast.success("Request Submitted Successfully!");
        await fetchMasterRecords();
        setSubmittedPasses([
          {
            passId: `REQ-${Math.floor(Math.random() * 10000)}`,
            applicant: user.firstName || "Applicant",
            status: "Pending Approval",
            createdAt: new Date().toISOString(),
            paymentMode: paymentMode.toUpperCase(),
            netAmount: totals.net,
          },
          ...submittedPasses,
        ]);

        setPersons([]);
        setVehicles([]);
        // setVehicles([
        //     ...vehicles,
        //     {
        //         ...vehicleForm,

        //         ulipVerified: vehicleVerification.verified,

        //         vehicleStatus:
        //             vehicleVerification.verified
        //                 ? "ACTIVE"
        //                 : "INACTIVE",

        //         ulipVerifiedAt: new Date().toISOString(),

        //         ulipResponse: vehicleVerification.data
        //     }
        // ]);
        setAgreedToTerms(false);
        setActiveTab("view");
      }
    } catch (error) {
      const errData = error.response?.data;
      if (
        errData &&
        (errData.code === "LICENSE_EXPIRED" ||
          errData.code === "PASS_EXCEEDS_LICENSE")
      ) {
        toast.custom(
          (t) => (
            <div className="flex flex-col gap-3 w-[360px] p-4 bg-white dark:bg-stone-900 border-l-4 border-red-500 rounded-xl shadow-2xl animate-in slide-in-from-top-4 duration-300">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-lg shrink-0">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-stone-900 dark:text-white">
                    {errData.code === "LICENSE_EXPIRED"
                      ? "License Expired"
                      : "Exceeds Expiry"}
                  </h5>
                  <p className="text-[11px] text-stone-600 dark:text-stone-400 mt-1 leading-relaxed">
                    {errData.message}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-1 border-t border-stone-100 dark:border-stone-850">
                <button
                  onClick={() => toast.dismiss(t)}
                  className="px-2.5 py-1.5 text-[10px] font-bold text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 transition-all uppercase"
                >
                  Dismiss
                </button>
                <button
                  onClick={() => {
                    toast.dismiss(t);
                    window.dispatchEvent(new Event("open-profile-update"));
                  }}
                  className="px-3 py-1.5 text-[10px] font-black bg-amber-400 hover:bg-amber-500 text-black rounded-lg transition-all shadow-sm uppercase tracking-wide"
                >
                  Update Profile
                </button>
              </div>
            </div>
          ),
          { duration: 8000 },
        );
      } else {
        toast.error(errData?.message || "Submission failed. Server Error.");
      }
      console.error("Submit Error:", error);
    } finally {
      setLoading(false);
    }
  };
  const inputClass =
    "w-full h-10 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 px-3 shadow-sm bg-white outline-none transition-all";

  const FileUploadBox = ({
    label,
    isRequired,
    file,
    onChange,
    hint,
    existingFileName,
    onView,
    fileType = "pdf",
    disabled = false,
  }) => (
    <div className="bg-white p-4 border border-slate-200 rounded-xl shadow-sm hover:border-orange-300 hover:shadow-md transition-all group flex flex-col justify-between h-full">
      <label className="text-xs font-bold text-slate-800 block mb-3">
        {label}{" "}
        {isRequired && !existingFileName && !file && (
          <span className="text-red-500">*</span>
        )}
        {hint && (
          <span className="text-slate-400 font-normal ml-1 block mt-0.5">
            {hint}
          </span>
        )}
      </label>

      {/* RENDER EXISTING FILE BADGE */}
      {existingFileName && !file && (
        <div className="flex flex-col gap-2 mb-3">
          <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 px-2 py-2 rounded-lg">
            <div className="flex items-center gap-1.5 overflow-hidden">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              <span
                className="text-[10px] font-bold text-emerald-700 truncate"
                title={existingFileName}
              >
                {existingFileName}
              </span>
            </div>
            {onView && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  onView();
                }}
                className="flex items-center gap-1 text-[10px] font-bold text-blue-700 hover:text-blue-800 bg-white px-2 py-1 rounded shadow-sm border border-emerald-200 ml-2 shrink-0"
              >
                <Eye className="h-3 w-3" /> View
              </button>
            )}
          </div>
          <span className="text-[9px] text-slate-400 font-medium italic">
            (Upload a new file below to replace)
          </span>
        </div>
      )}

      {/* UPLOAD INPUT */}
      <div className="relative mt-auto">
        <input
          type="file"
          disabled={disabled}
          accept={fileType === "image" ? "image/*" : "application/pdf"}
          className={`absolute inset-0 w-full h-full opacity-0 z-10 ${
            disabled ? "cursor-not-allowed" : "cursor-pointer"
          }`}
          required={isRequired && !existingFileName && !file}
          onChange={(e) => {
            const file = e.target.files[0];

            const error = validateFile(file, fileType);

            if (error) {
              toast.error(error);
              e.target.value = ""; // reset input
              return;
            }

            onChange(e); // proceed only if valid
          }}
        />
        <div
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border ${
            disabled
              ? "bg-slate-100 border-slate-300 opacity-60"
              : file
                ? "border-orange-300 bg-orange-50"
                : "border-dashed border-slate-300 bg-slate-50 group-hover:bg-slate-100"
          } transition-colors`}
        >
          <Upload
            className={`w-4 h-4 flex-shrink-0 ${file ? "text-orange-600" : "text-slate-400"}`}
          />
          <span
            className={`text-xs truncate font-medium ${file ? "text-orange-700" : "text-slate-500"}`}
          >
            {file
              ? file.name
              : existingFileName
                ? "Choose new file..."
                : "Choose file..."}
          </span>
        </div>
      </div>
    </div>
  );

  const handleHepTypeChange = (e) => {
    const selectedType = String(e.target.value);
    if (selectedType === "1") {
      // 1 = Driver ID in DB
      setPersonForm({
        ...personForm,
        hepType: selectedType,
        designation: "13",
        idProofType: "1",
      }); // 13=Driver Desig, 1=DL
    } else if (selectedType === "3") {
      // 3 = Seafarers: force Daily pass type (1)
      setPersonForm({
        ...personForm,
        hepType: selectedType,
        passType: "1",
        designation: "",
        idProofType: "",
      });
    } else {
      setPersonForm({
        ...personForm,
        hepType: selectedType,
        designation: "",
        idProofType: "",
      });
    }
  };

  // ============================================
  // PHASE 2: EDIT REVERTED PASS FUNCTIONS
  // ============================================

  const handleEditRevertedPass = (pass) => {
    setEditingRevertedPass(pass);

    // Extract only reverted entities
    const revertedPersonsList =
      pass.persons?.filter((p) => p.status === "reverted") || [];
    const revertedVehiclesList =
      pass.vehicles?.filter((v) => v.status === "reverted") || [];

    setRevertedPersons(revertedPersonsList);
    setRevertedVehicles(revertedVehiclesList);
    setRevertedEditModal(true);
  };

  const closeRevertedEditModal = () => {
    setRevertedEditModal(false);
    setEditingRevertedPass(null);
    setRevertedPersons([]);
    setRevertedVehicles([]);
    setEditingRevertedEntity(null);
  };

  const handleEditRevertedEntity = (type, index, entity) => {
    // Close the reverted edit modal first
    setRevertedEditModal(false);

    // Find original index in full list
    let originalIdx = index;
    if (type === "person" && editingRevertedPass?.persons) {
      originalIdx = editingRevertedPass.persons.findIndex(
        (p) => p.id === entity.id,
      );
    } else if (type === "vehicle" && editingRevertedPass?.vehicles) {
      originalIdx = editingRevertedPass.vehicles.findIndex(
        (v) => v.id === entity.id,
      );
    }
    if (originalIdx === -1) originalIdx = index;

    // Store the entity being edited for later use
    setEditingRevertedEntity({
      type,
      index: originalIdx,
      id: entity.id,
      passId: editingRevertedPass?.id,
      revertedIndex: index,
    });

    if (type === "person") {
      // Set editing index so master directory dropdown is hidden and button shows "Update Person"
      setEditingPersonIndex("reverted");

      // Resolve HEP Type ID (1: Drivers, 2: Personnel, 3: Seafarers, 4: Vendors)
      const rawHep = entity.hepTypeId || entity.hepType;
      let resolvedHepType = "2";
      if (
        String(rawHep) === "3" ||
        String(rawHep).toUpperCase().includes("SEAFARER")
      ) {
        resolvedHepType = "3";
      } else if (
        String(rawHep) === "1" ||
        String(rawHep).toUpperCase().includes("DRIVER")
      ) {
        resolvedHepType = "1";
      } else if (
        String(rawHep) === "4" ||
        String(rawHep).toUpperCase().includes("VENDOR")
      ) {
        resolvedHepType = "4";
      } else if (rawHep) {
        resolvedHepType = String(rawHep);
      }

      // Map ENUM strings to numeric IDs using masterData
      const nationalityEnum = entity.nationality; // "INDIAN" or "FOREIGNER"
      const nationalityObj = masterData.nationalities.find(
        (n) =>
          (n.value || n.label || n.name || "").toUpperCase() ===
          nationalityEnum?.toUpperCase(),
      );
      const nationalityId = nationalityObj
        ? String(nationalityObj.id || nationalityObj.value)
        : nationalityEnum === "FOREIGNER"
          ? "2"
          : "1";

      const accessAreaEnum = entity.accessAreaId || entity.accessArea; // "OIL JETTY AND OTHER GATES" or "OTHER GATES ONLY"
      const accessAreaObj = masterData.accessAreas.find(
        (a) =>
          (a.value || a.label || a.name || "").toUpperCase() ===
          accessAreaEnum?.toUpperCase(),
      );
      const accessAreaId = accessAreaObj
        ? String(accessAreaObj.id || accessAreaObj.value)
        : "";

      const idProofTypeEnum = entity.idProofType; // "PASSPORT", "PAN CARD", etc.
      const idProofTypeObj = masterData.idProofTypes.find(
        (i) =>
          (i.value || i.label || i.name || "").toUpperCase() ===
          idProofTypeEnum?.toUpperCase(),
      );
      const idProofTypeId = idProofTypeObj
        ? String(idProofTypeObj.id || idProofTypeObj.value)
        : idProofTypeEnum;

      const passTypeEnum = entity.passType; // "DAILY", "MONTHLY", "YEARLY"
      const passTypeObj = masterData.passTypes.find(
        (p) =>
          (p.value || p.label || p.name || "").toUpperCase() ===
          passTypeEnum?.toUpperCase(),
      );
      const passTypeId = passTypeObj
        ? String(passTypeObj.id || passTypeObj.value)
        : passTypeEnum;

      // Resolve Seafarer ID Type (passport or aadhaar)
      let resolvedSeafarerIdType = entity.seafarerIdType || "";
      if (resolvedHepType === "3" && !resolvedSeafarerIdType) {
        if (
          entity.passportPath ||
          entity.passportName ||
          entity.passportNo ||
          String(entity.idProofType).toUpperCase().includes("PASSPORT")
        ) {
          resolvedSeafarerIdType = "passport";
        } else {
          resolvedSeafarerIdType = "aadhaar";
        }
      }

      // Resolve Designation
      const rawDesig = String(
        entity.designationId ||
          entity.designation ||
          entity.designationOther ||
          "",
      );
      let resolvedDesignation = rawDesig;
      const desigMatch = masterData.designations.find(
        (d) =>
          String(d.id) === rawDesig ||
          String(d.name || "").toUpperCase() === rawDesig.toUpperCase(),
      );
      if (desigMatch) {
        resolvedDesignation = String(desigMatch.id);
      } else if (rawDesig.toUpperCase().includes("CREW")) {
        resolvedDesignation = "Crew";
      } else if (rawDesig.toUpperCase().includes("SUPERNUMERARY")) {
        resolvedDesignation = "Supernumerary";
      }
      if (
        resolvedHepType === "3" &&
        (!resolvedDesignation ||
          resolvedDesignation === "null" ||
          resolvedDesignation === "undefined" ||
          resolvedDesignation === "")
      ) {
        resolvedDesignation = "Crew";
      }

      // Resolve Country
      const rawCountry = entity.countryId || entity.country;
      const countryObj = masterData.countries.find(
        (c) =>
          String(c.id) === String(rawCountry) ||
          String(c.name || "")
            .trim()
            .toUpperCase() ===
            String(rawCountry || "")
              .trim()
              .toUpperCase(),
      );
      const indiaObj = masterData.countries.find(
        (c) =>
          String(c.name || "")
            .trim()
            .toLowerCase() === "india",
      );
      const defaultIndiaId = indiaObj ? String(indiaObj.id) : "75";
      const resolvedCountry = countryObj
        ? String(countryObj.id)
        : rawCountry
          ? String(rawCountry)
          : defaultIndiaId;

      // Resolve Passport No
      const resolvedPassportNo =
        entity.passportNo ||
        (resolvedSeafarerIdType === "passport"
          ? entity.aadharNo || entity.idProofNumber || ""
          : "");

      // Map reverted person data to personForm structure
      console.log("REVERTED ENTITY1657", entity);
      setPersonForm({
        id: entity.id,
        masterId: entity.masterPersonId,
        name: entity.name || "",
        mobile: entity.mobile || "",
        email: entity.email || "",
        aadharNo:
          resolvedSeafarerIdType === "passport"
            ? ""
            : entity.aadharNo || entity.aadharNumber || "",
        designation: resolvedDesignation,
        designationOther: entity.designationOther || "",
        idProofType: idProofTypeId,
        idProofNumber: entity.idProofNumber || "",
        hepType: resolvedHepType,
        passType: passTypeId,
        passPeriod: entity.passPeriod || "1",
        dateFrom: entity.dateFrom
          ? (entity.dateFrom.includes("T")
              ? entity.dateFrom.split("T")[0]
              : entity.dateFrom) + "T00:00"
          : "",
        dateTo: entity.dateTo
          ? (entity.dateTo.includes("T")
              ? entity.dateTo.split("T")[0]
              : entity.dateTo) + "T00:00"
          : "",
        amount: entity.amount || "",
        nationality: nationalityId,
        country: resolvedCountry,
        visaNo: entity.visaNo || "",
        cardNumber: entity.cardNumber || "",
        withTwoWheeler: entity.withTwoWheeler || false,
        vehicleNo: entity.vehicleNo || "",
        accessArea: accessAreaId,
        dob: entity.dob
          ? entity.dob.includes("T")
            ? entity.dob.split("T")[0]
            : entity.dob
          : "",
        passportNo: resolvedPassportNo,
        cdcNumber: entity.cdcNumber || "",
        seafarerPassFor: entity.seafarerPassFor || "Sign-On",
        seafarerIdType: resolvedSeafarerIdType,

        // Preserve newly uploaded files
        photo: entity.newPhoto || null,
        aadharFile: entity.newAadhar || null,
        driverLicence: entity.newDriverLicence || null,
        requisitionLetter: entity.newRequisitionLetter || null,
        passportDoc: entity.newPassport || null,
        visaDoc: entity.newVisaDoc || null,
        immigrationDoc: entity.newImmigrationDoc || null,
        policeVerification: entity.newPoliceVerification || null,
        proofOfEmployment: entity.newEmploymentProof || null,
        copyOfLicence: entity.newChaLicence || null,
        idProofFile: entity.newIdProof || null,
        cdcDocument: entity.newCdc || null,
        declarationForm: entity.newDeclaration || null,
        entryAuthorization: entity.newEntryAuthorization || null,

        // Existing file names and paths for viewing
        existingPassRequestId: editingRevertedPass?.id,

        existingPhotoName: entity.photoFileName,
        existingPhotoPath: entity.photoFilePath,

        existingAadharName: entity.aadharPDFFileName,
        existingAadharPath:
          entity.aadharPDFFilePath || entity.aadharPDFFilePATH,

        existingIdProofName: entity.idProofFileName,
        existingIdProofPath: entity.idProofFilePath,

        existingDlName: entity.driverLicenseName,
        existingDlPath: entity.driverLicensePath,

        existingReqName: entity.requisitionLetterName,
        existingPassportName: entity.passportName,
        existingPassportPath: entity.passportPath,
        existingVisaDocName: entity.visaDocName,
        existingVisaDocPath: entity.visaDocPath,
        existingImmigrationDocName: entity.immigrationDocName,
        existingImmigrationDocPath: entity.immigrationDocPath,
        existingPoliceName: entity.policeVerificationName,
        existingEmpName: entity.employmentProofName,
        existingChaName: entity.chaLicenseName,
        existingCdcName: entity.cdcDocumentName,
        existingCdcPath: entity.cdcDocumentPath,
        existingDeclarationName: entity.declarationFormName,
        existingEntryAuthName: entity.entryAuthorizationFileName,
        existingEntryAuthPath: entity.entryAuthorizationFilePath,
        isEditing: true,
        editIndex: index,
      });

      // Open the person form modal
      toggleModal("person", true);
      toast.success("Person details loaded for editing");
    } else if (type === "vehicle") {
      // Set editing index so fleet dropdown is hidden and button shows "Update Vehicle"
      setEditingVehicleIndex("reverted");

      // Map ENUM string to numeric ID using masterData
      const accessAreaEnum = entity.accessAreaId; // "OIL JETTY AND OTHER GATES" or "OTHER GATES ONLY"
      const accessAreaObj = masterData.accessAreas.find(
        (a) =>
          (a.value || a.label || a.name || "").toUpperCase() ===
          accessAreaEnum?.toUpperCase(),
      );
      const accessAreaId = accessAreaObj
        ? String(accessAreaObj.id || accessAreaObj.value)
        : "";

      const passTypeEnum = entity.passType;
      const passTypeObj = masterData.passTypes.find(
        (p) =>
          (p.value || p.label || p.name || "").toUpperCase() ===
          passTypeEnum?.toUpperCase(),
      );
      const passTypeId = passTypeObj
        ? String(passTypeObj.id || passTypeObj.value)
        : passTypeEnum === "MONTHLY"
          ? "2"
          : passTypeEnum === "YEARLY" || passTypeEnum === "ANNUAL"
            ? "3"
            : "1";

      console.log("REVERTED ENTITY1726", entity);
      // Map reverted vehicle data to vehicleForm structure
      setVehicleForm({
        id: entity.id,
        regNo: entity.registrationNo || entity.regNo || "",
        engineNo: entity.engineNo || "",
        chassisNo: entity.chassisNo || "",
        type: String(entity.vehicleTypeId || ""),
        fuelType: entity.fuelType || "",
        accessArea: accessAreaId,
        insuranceExpiry: entity.insuranceExpiry
          ? entity.insuranceExpiry.split("T")[0]
          : "",
        rcValidity: entity.rcValidity ? entity.rcValidity.split("T")[0] : "",
        passType: passTypeId,
        passPeriod: entity.passPeriod || "",
        dateFrom: entity.dateFrom
          ? (entity.dateFrom.includes("T")
              ? entity.dateFrom.split("T")[0]
              : entity.dateFrom) + "T00:00"
          : "",
        dateTo: entity.dateTo
          ? (entity.dateTo.includes("T")
              ? entity.dateTo.split("T")[0]
              : entity.dateTo) + "T00:00"
          : "",
        amount: entity.amount || "",

        // Preserve newly uploaded files
        rcDocument: entity.newRc || null,
        insuranceDocument: entity.newInsurance || null,
        permit: entity.newPermit || null,
        fitnessCert: entity.newFitness || null,
        requestLetter: entity.newRequestLetter || null,
        taxDoc: entity.newTax || null,
        emissionCert: entity.newEmission || null,
        sparkArrester: entity.newSparkArrester || null,
        twistLock: entity.newTwistLock || null,

        // Existing file names for viewing
        existingPassRequestId: editingRevertedPass?.id,
        existingRcName: entity.scannedCopyFileName,
        existingInsName: entity.insuranceFileName,
        existingPermitName: entity.permitFileName,
        existingFitnessName: entity.fitnessFileName,
        existingReqName: entity.requestLetterName,
        existingTaxName: entity.taxDocName,
        existingEmissionName: entity.emissionCertName,
        existingSparkArresterName: entity.sparkArresterFileName,
        existingSparkArresterPath: entity.sparkArresterFilePath,
        existingTwistLockName: entity.twistLockFileName,
        existingTwistLockPath: entity.twistLockFilePath,
        isEditing: true,
        editIndex: index,
      });

      // Open the vehicle form modal
      toggleModal("vehicle", true);
      toast.success("Vehicle details loaded for editing");
    }
  };

  const handleSaveRevertedEntity = async () => {
    if (!editingRevertedEntity) return;

    const { type, index, id, revertedIndex } = editingRevertedEntity;
    const targetIdx = revertedIndex !== undefined ? revertedIndex : index;

    try {
      const token = localStorage.getItem("accessToken");
      const headers = { Authorization: `Bearer ${token}` };

      if (type === "person") {
        const currentEntity = revertedPersons[targetIdx] || {};
        const isCustomDesig =
          personForm.designation === "Crew" ||
          personForm.designation === "Supernumerary" ||
          personForm.designation === "Others";
        const desigIdVal = isCustomDesig
          ? null
          : parseInt(personForm.designation, 10) || null;
        const desigOtherVal =
          personForm.designation === "Crew" ||
          personForm.designation === "Supernumerary"
            ? personForm.designation
            : personForm.designation === "Others"
              ? personForm.designationOther
              : null;
        const primaryIdNo =
          personForm.hepType === "3" && personForm.seafarerIdType === "passport"
            ? personForm.passportNo
            : personForm.aadharNo;

        const nationalityEnum = getEnumValue(
          masterData.nationalities,
          personForm.nationality,
          "INDIAN",
        );
        const idProofTypeEnum = getEnumValue(
          masterData.idProofTypes,
          personForm.idProofType,
          "",
        );

        // Use personForm data for the update
        const updateData = {
          id: id,
          name: personForm.name,
          mobile: personForm.mobile,
          aadharNo: primaryIdNo,
          designation: personForm.designation,
          designationId: desigIdVal,
          designationOther: desigOtherVal,
          idProofType: idProofTypeEnum,
          hepTypeId: personForm.hepType,
          passType: personForm.passType,
          passPeriod: personForm.passPeriod,
          dateFrom: personForm.dateFrom,
          dateTo: personForm.dateTo,
          amount: personForm.amount,
          countryId: personForm.country,
          accessAreaId: getEnumValue(
            masterData.accessAreas,
            personForm.accessArea,
            "OTHER GATES ONLY",
          ),
          email: personForm.email || "",
          visaNo: personForm.visaNo || "",
          dob: personForm.dob || null,
          nationality: nationalityEnum,
          idProofNumber: personForm.idProofNumber || "",
          withTwoWheeler: personForm.withTwoWheeler || false,
          vehicleNo: personForm.vehicleNo || "",
          cdcNumber: personForm.cdcNumber || null,
          passportNo: personForm.passportNo || null,
          seafarerPassFor: personForm.seafarerPassFor || null,
          seafarerIdType: personForm.seafarerIdType || null,
          // File names for reference
          photoFileName: personForm.existingPhotoName,
          aadharPDFFileName: personForm.existingAadharName,
          driverLicenseName: personForm.existingDlName,
          requisitionLetterName: personForm.existingReqName,
          passportName: personForm.existingPassportName,
          policeVerificationName: personForm.existingPoliceName,
          employmentProofName: personForm.existingEmpName,
          chaLicenseName: personForm.existingChaName,
          idProofFileName: personForm.existingIdProofName,
          cdcDocumentName: personForm.existingCdcName,
          visaDocName:
            personForm.visaDoc?.name ||
            personForm.existingVisaDocName ||
            currentEntity.visaDocName,
          immigrationDocName:
            personForm.immigrationDoc?.name ||
            personForm.existingImmigrationDocName ||
            currentEntity.immigrationDocName,
          declarationFormName: personForm.existingDeclarationName,
          entryAuthorizationFileName: personForm.existingEntryAuthName,
        };

        // Only update local reverted persons state (no DB update yet)
        // Preserve actual File objects for upload during resubmission
        const updatedPersons = [...revertedPersons];
        updatedPersons[targetIdx] = {
          ...updateData,
          id,
          status: "updated",
          // Carry file paths so they don't get lost on subsequent edits
          photoFilePath:
            personForm.existingPhotoPath || currentEntity.photoFilePath,
          aadharPDFFilePATH:
            personForm.existingAadharPath ||
            currentEntity.aadharPDFFilePATH ||
            currentEntity.aadharPDFFilePath,
          aadharPDFFilePath:
            personForm.existingAadharPath ||
            currentEntity.aadharPDFFilePath ||
            currentEntity.aadharPDFFilePATH,
          idProofFilePath:
            personForm.existingIdProofPath || currentEntity.idProofFilePath,
          driverLicensePath:
            personForm.existingDlPath || currentEntity.driverLicensePath,
          visaDocPath:
            personForm.existingVisaDocPath || currentEntity.visaDocPath,
          immigrationDocPath:
            personForm.existingImmigrationDocPath ||
            currentEntity.immigrationDocPath,
          entryAuthorizationFilePath:
            personForm.existingEntryAuthPath ||
            currentEntity.entryAuthorizationFilePath,

          // Carry File objects from personForm for resubmission
          newPhoto: personForm.photo || currentEntity.newPhoto || null,
          newAadhar: personForm.aadharFile || currentEntity.newAadhar || null,
          newIdProof:
            personForm.idProofFile || currentEntity.newIdProof || null,
          newDriverLicence:
            personForm.driverLicence || currentEntity.newDriverLicence || null,
          newPoliceVerification:
            personForm.policeVerification ||
            currentEntity.newPoliceVerification ||
            null,
          newEmploymentProof:
            personForm.proofOfEmployment ||
            currentEntity.newEmploymentProof ||
            null,
          newChaLicence:
            personForm.copyOfLicence || currentEntity.newChaLicence || null,
          newPassport:
            personForm.passportDoc || currentEntity.newPassport || null,
          newVisaDoc: personForm.visaDoc || currentEntity.newVisaDoc || null,
          newImmigrationDoc:
            personForm.immigrationDoc ||
            currentEntity.newImmigrationDoc ||
            null,
          newRequisitionLetter:
            personForm.requisitionLetter ||
            currentEntity.newRequisitionLetter ||
            null,
          newCdc: personForm.cdcDocument || currentEntity.newCdc || null,
          newDeclaration:
            personForm.declarationForm || currentEntity.newDeclaration || null,
          newEntryAuthorization:
            personForm.entryAuthorization ||
            currentEntity.newEntryAuthorization ||
            null,
        };
        setRevertedPersons(updatedPersons);

        // Close person form and reset
        toggleModal("person", false);
        setPersonForm(initialPersonForm);

        // Reopen the reverted edit modal
        setRevertedEditModal(true);
      } else if (type === "vehicle") {
        const currentEntity = revertedVehicles[targetIdx] || {};
        // Use vehicleForm data for the update
        const updateData = {
          id: id,
          registrationNo: vehicleForm.regNo,
          regNo: vehicleForm.regNo,
          engineNo: vehicleForm.engineNo,
          chassisNo: vehicleForm.chassisNo,
          vehicleTypeId: vehicleForm.type,
          fuelType: vehicleForm.fuelType,
          insuranceExpiry: vehicleForm.insuranceExpiry,
          rcValidity: vehicleForm.rcValidity,
          passType: vehicleForm.passType,
          passPeriod: vehicleForm.passPeriod,
          dateFrom: vehicleForm.dateFrom,
          dateTo: vehicleForm.dateTo,
          amount: vehicleForm.amount,
          accessAreaId: getEnumValue(
            masterData.accessAreas,
            vehicleForm.accessArea,
            "OTHER GATES ONLY",
          ),
          // File names for reference
          scannedCopyFileName: vehicleForm.existingRcName,
          insuranceFileName: vehicleForm.existingInsName,
          permitFileName: vehicleForm.existingPermitName,
          fitnessFileName: vehicleForm.existingFitnessName,
          requestLetterName: vehicleForm.existingReqName,
          taxDocName: vehicleForm.existingTaxName,
          emissionCertName: vehicleForm.existingEmissionName,
          sparkArresterFileName: vehicleForm.existingSparkArresterName,
          twistLockFileName: vehicleForm.existingTwistLockName,
        };

        // Only update local reverted vehicles state (no DB update yet)
        // Preserve actual File objects for upload during resubmission
        const updatedVehicles = [...revertedVehicles];
        updatedVehicles[targetIdx] = {
          ...updateData,
          id,
          status: "updated",
          // Carry file paths
          scannedCopyFilePath: currentEntity.scannedCopyFilePath,
          insuranceFilePath: currentEntity.insuranceFilePath,
          permitFilePath: currentEntity.permitFilePath,
          fitnessFilePath: currentEntity.fitnessFilePath,
          requestLetterPath: currentEntity.requestLetterPath,
          taxDocFilePath: currentEntity.taxDocFilePath,
          emissionCertFilePath: currentEntity.emissionCertFilePath,
          sparkArresterFilePath:
            vehicleForm.existingSparkArresterPath ||
            currentEntity.sparkArresterFilePath,
          twistLockFilePath:
            vehicleForm.existingTwistLockPath ||
            currentEntity.twistLockFilePath,

          // Carry File objects from vehicleForm for resubmission
          newRc: vehicleForm.rcDocument || currentEntity.newRc || null,
          newInsurance:
            vehicleForm.insuranceDocument || currentEntity.newInsurance || null,
          newPermit: vehicleForm.permit || currentEntity.newPermit || null,
          newFitness:
            vehicleForm.fitnessCert || currentEntity.newFitness || null,
          newRequestLetter:
            vehicleForm.requestLetter || currentEntity.newRequestLetter || null,
          newTax: vehicleForm.taxDoc || currentEntity.newTax || null,
          newEmission:
            vehicleForm.emissionCert || currentEntity.newEmission || null,
          newSparkArrester:
            vehicleForm.sparkArrester || currentEntity.newSparkArrester || null,
          newTwistLock:
            vehicleForm.twistLock || currentEntity.newTwistLock || null,
        };
        setRevertedVehicles(updatedVehicles);

        // Close vehicle form and reset
        toggleModal("vehicle", false);
        setVehicleForm(initialVehicleForm);

        // Reopen the reverted edit modal
        setRevertedEditModal(true);
      }

      toast.success(
        `${type === "person" ? "Person" : "Vehicle"} updated successfully`,
      );
      setEditingRevertedEntity(null);
    } catch (error) {
      console.error("Error updating reverted entity:", error);
      toast.error(error.response?.data?.message || "Failed to update entity");
    }
  };

  // const handleVehicleNumberChange = (e) => {

  //     const value = e.target.value.toUpperCase();

  //     setVehicleForm(prev => ({
  //         ...prev,
  //         regNo: value
  //     }));

  //     // NEW
  //     setVehicleVerification({
  //         loading: false,
  //         verified: false,
  //         message: "",
  //         data: null
  //     });

  //     if (!VALIDATORS.vehicleReg(value)) {
  //         return;
  //     }

  //     verifyVehicle(value);
  // }

  const handleVehicleNumberChange = (e) => {
    const value = e.target.value.toUpperCase();

    // Registration number changed:
    // old VAHAN verification is no longer valid.
    setVehicleForm((prev) => ({
      ...prev,
      regNo: value,

      // Clear old VAHAN dates immediately
      insuranceExpiry: "",
      rcValidity: "",
    }));

    // Clear old verification
    setVehicleVerification({
      loading: false,
      verified: false,
      message: "",
      data: null,
    });

    // Don't call VAHAN until registration format is valid
    if (!VALIDATORS.vehicleReg(value)) {
      return;
    }

    verifyVehicle(value);
  };

  const handleDLChange = (e) => {
    const value = e.target.value.toUpperCase();

    // Update textbox
    setPersonForm((prev) => ({
      ...prev,
      idProofNumber: value,
    }));

    // Clear previous verification
    setDlVerification({
      loading: false,
      verified: false,
      message: "",
      data: null,
    });

    // Validate field
    validatePersonField("idProofNumber", value, {
      idProofType: personForm.idProofType,
    });

    // Only verify DL
    if (personForm.idProofType !== "1") {
      return;
    }

    // Wait until DL format is valid
    if (!VALIDATORS.drivingLicence(value)) {
      setDlVerification({
        loading: false,
        verified: false,
        message: "",
        data: null,
      });

      return;
    }

    // Call backend
    verifyDL(value);
  };

  const handleResubmitRevertedPass = async () => {
    if (!editingRevertedPass) return;

    try {
      const token = localStorage.getItem("accessToken");
      const headers = { Authorization: `Bearer ${token}` };

      // Update all persons in DB
      for (const person of revertedPersons) {
        try {
          const passTypeMap = {
            1: "DAILY",
            2: "MONTHLY",
            3: "YEARLY",
          };
          const passTypeEnum = passTypeMap[person.passType] || person.passType;

          const formData = new FormData();

          // Append text fields
          formData.append("name", person.name || "");
          formData.append("mobile", person.mobile || "");
          formData.append("aadharNo", person.aadharNo || "");
          formData.append("designation", person.designation || "");
          if (person.designationId)
            formData.append("designationId", person.designationId);
          if (person.designationOther)
            formData.append("designationOther", person.designationOther);
          const natEnum = getEnumValue(
            masterData.nationalities,
            person.nationality,
            "INDIAN",
          );
          const idTypeEnum = getEnumValue(
            masterData.idProofTypes,
            person.idProofType,
            "",
          );

          formData.append("idProofType", idTypeEnum || "");
          formData.append("hepTypeId", person.hepTypeId || "");
          formData.append("passType", passTypeEnum);
          formData.append("passPeriod", person.passPeriod || "");
          formData.append("dateFrom", person.dateFrom || "");
          formData.append("dateTo", person.dateTo || "");
          formData.append("amount", person.amount || "");
          formData.append("countryId", person.countryId || "");
          formData.append("accessAreaId", person.accessAreaId || "");
          formData.append("email", person.email || "");
          formData.append("visaNo", person.visaNo || "");
          formData.append("nationality", natEnum || "INDIAN");
          formData.append("idProofNumber", person.idProofNumber || "");
          formData.append(
            "withTwoWheeler",
            person.withTwoWheeler ? "true" : "false",
          );
          formData.append("vehicleNo", person.vehicleNo || "");
          formData.append("passportNo", person.passportNo || "");
          formData.append("cdcNumber", person.cdcNumber || "");
          formData.append("seafarerPassFor", person.seafarerPassFor || "");
          formData.append("seafarerIdType", person.seafarerIdType || "");
          formData.append("dob", person.dob || "");

          // File name references
          formData.append("photoFileName", person.photoFileName || "");
          formData.append("aadharPDFFileName", person.aadharPDFFileName || "");
          formData.append("driverLicenseName", person.driverLicenseName || "");
          formData.append(
            "requisitionLetterName",
            person.requisitionLetterName || "",
          );
          formData.append("passportName", person.passportName || "");
          formData.append("visaDocName", person.visaDocName || "");
          formData.append(
            "immigrationDocName",
            person.immigrationDocName || "",
          );
          formData.append(
            "policeVerificationName",
            person.policeVerificationName || "",
          );
          formData.append(
            "employmentProofName",
            person.employmentProofName || "",
          );
          formData.append("chaLicenseName", person.chaLicenseName || "");
          formData.append("idProofFileName", person.idProofFileName || "");
          formData.append("cdcDocumentName", person.cdcDocumentName || "");
          formData.append(
            "declarationFormName",
            person.declarationFormName || "",
          );
          formData.append(
            "entryAuthorizationFileName",
            person.entryAuthorizationFileName || "",
          );

          // Append actual File objects if re-uploaded
          if (person.newPhoto) formData.append("personPhoto", person.newPhoto);
          if (person.newAadhar)
            formData.append("personAadhar", person.newAadhar);
          if (person.newIdProof)
            formData.append("personIdProof", person.newIdProof);
          if (person.newDriverLicence)
            formData.append("driverLicense", person.newDriverLicence);
          if (person.newPoliceVerification)
            formData.append("policeVerification", person.newPoliceVerification);
          if (person.newEmploymentProof)
            formData.append("employmentProof", person.newEmploymentProof);
          if (person.newChaLicence)
            formData.append("chaLicenseCopy", person.newChaLicence);
          if (person.newPassport)
            formData.append("passportDoc", person.newPassport);
          if (person.newVisaDoc) formData.append("visaDoc", person.newVisaDoc);
          if (person.newImmigrationDoc)
            formData.append("immigrationDoc", person.newImmigrationDoc);
          if (person.newRequisitionLetter)
            formData.append("requisitionLetter", person.newRequisitionLetter);
          if (person.newCdc) formData.append("cdcDocument", person.newCdc);
          if (person.newDeclaration)
            formData.append("declarationForm", person.newDeclaration);
          if (person.newEntryAuthorization)
            formData.append("entryAuthorization", person.newEntryAuthorization);

          console.log("Updating person:", person.id);
          await axios.put(
            `${AGENT_API}/pass-request/update-pass-person/${person.id}`,
            formData,
            { headers: { ...headers, "Content-Type": "multipart/form-data" } },
          );
          console.log("Person updated successfully:", person.id);
        } catch (error) {
          console.error("Error updating person:", person.id, error);
          throw error;
        }
      }

      // Update all vehicles in DB
      for (const vehicle of revertedVehicles) {
        try {
          const passTypeMap = {
            1: "DAILY",
            2: "MONTHLY",
            3: "ANNUAL",
          };
          const passTypeEnum =
            passTypeMap[vehicle.passType] || vehicle.passType;

          const formData = new FormData();

          // Append text fields
          formData.append(
            "registrationNo",
            vehicle.registrationNo || vehicle.regNo || "",
          );
          formData.append("vehicleTypeId", vehicle.vehicleTypeId || "");
          formData.append("fuelType", vehicle.fuelType || "");
          formData.append("insuranceExpiry", vehicle.insuranceExpiry || "");
          formData.append("rcValidity", vehicle.rcValidity || "");
          formData.append("passType", passTypeEnum);
          formData.append("passPeriod", vehicle.passPeriod || "");
          formData.append("dateFrom", vehicle.dateFrom || "");
          formData.append("dateTo", vehicle.dateTo || "");
          formData.append("amount", vehicle.amount || "");
          formData.append("accessAreaId", vehicle.accessAreaId || "");

          // File name references
          formData.append(
            "scannedCopyFileName",
            vehicle.scannedCopyFileName || "",
          );
          formData.append("insuranceFileName", vehicle.insuranceFileName || "");
          formData.append("permitFileName", vehicle.permitFileName || "");
          formData.append("fitnessFileName", vehicle.fitnessFileName || "");
          formData.append("requestLetterName", vehicle.requestLetterName || "");
          formData.append("taxDocName", vehicle.taxDocName || "");
          formData.append("emissionCertName", vehicle.emissionCertName || "");
          formData.append(
            "sparkArresterFileName",
            vehicle.sparkArresterFileName || "",
          );
          formData.append("twistLockFileName", vehicle.twistLockFileName || "");

          // Append actual File objects if re-uploaded
          if (vehicle.newRc) formData.append("vehicleRC", vehicle.newRc);
          if (vehicle.newInsurance)
            formData.append("vehicleInsurance", vehicle.newInsurance);
          if (vehicle.newPermit)
            formData.append("vehiclePermit", vehicle.newPermit);
          if (vehicle.newFitness)
            formData.append("vehicleFitness", vehicle.newFitness);
          if (vehicle.newRequestLetter)
            formData.append("vehicleRequestLetter", vehicle.newRequestLetter);
          if (vehicle.newTax) formData.append("vehicleTax", vehicle.newTax);
          if (vehicle.newEmission)
            formData.append("vehicleEmission", vehicle.newEmission);
          if (vehicle.newSparkArrester)
            formData.append("sparkArrester", vehicle.newSparkArrester);
          if (vehicle.newTwistLock)
            formData.append("twistLock", vehicle.newTwistLock);

          console.log("Updating vehicle:", vehicle.id);
          await axios.put(
            `${AGENT_API}/pass-request/update-pass-vehicle/${vehicle.id}`,
            formData,
            { headers: { ...headers, "Content-Type": "multipart/form-data" } },
          );
          console.log("Vehicle updated successfully:", vehicle.id);
        } catch (error) {
          console.error("Error updating vehicle:", vehicle.id, error);
          throw error;
        }
      }

      // Resubmit the pass - change status back to PENDING
      console.log("Resubmitting pass:", editingRevertedPass.id);
      await axios.put(
        `${AGENT_API}/pass-request/resubmit-reverted-pass/${editingRevertedPass.id}`,
        {},
        { headers },
      );
      console.log("Pass resubmitted successfully");

      toast.success("Pass resubmitted successfully!");
      closeRevertedEditModal();

      // Reset pagination and switch to 'view' tab to show resubmitted pass
      setCurrentPage(1);
      setActiveTab("view");
    } catch (error) {
      console.error("Error resubmitting pass:", error);
      toast.error(error.response?.data?.message || "Failed to resubmit pass");
    }
  };

  const getFilteredDesignations = () => {
    // If Seafarer (ID: 3) is selected, only show Crew and Supernumerary
    if (String(personForm.hepType) === "3") {
      return masterData.designations.filter(
        (d) =>
          (d.name || d).includes("Crew") ||
          (d.name || d).includes("Supernumerary"),
      );
    }
    return masterData.designations || [];
  };
  // ----------------------------------------

  // Dynamic Identity Proof Label Logic
  const currentIdProofName = getLabelById(
    masterData.idProofTypes,
    personForm.idProofType,
  );
  const idProofLabel = personForm.idProofType
    ? `${currentIdProofName} Number`
    : "ID Proof Number";
  const idProofPlaceholder = personForm.idProofType
    ? `Enter ${currentIdProofName} No`
    : "Enter Identification Proof number";

  return (
    <div className="space-y-6 font-sans w-full text-slate-800 dark:text-stone-200">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-[#0a1e4d] dark:text-white">
            Pass Request
          </h2>
          <p className="text-base text-slate-500 dark:text-stone-300 font-medium">
            Apply for new harbour entry permits
          </p>
        </div>
        {/* <div className="bg-white border border-slate-200 px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-3 shadow-sm text-[#0a1e4d]">
          <Wallet className="h-5 w-5 text-orange-500" /> Wallet Balance:{" "}
          <span className="text-lg">₹{generalForm.balance}</span>
        </div> */}
      </div>

      <div className="flex border-b border-slate-300 dark:border-white/10">
        <button
          onClick={() => {
            setActiveTab("apply");
            if (companyBlacklisted) {
              setShowBlacklistPopup(true);
            }
          }}
          className={`px-8 py-4 text-base transition-all ${activeTab === "apply" ? "font-bold text-[#0a1e4d] dark:text-white border-b-2 border-[#0a1e4d] dark:border-white" : "font-semibold text-slate-500 dark:text-stone-400 hover:text-[#0a1e4d] dark:hover:text-white"}`}
        >
          Apply New Pass
        </button>
        <button
          onClick={() => setActiveTab("reverted")}
          className={`px-8 py-4 text-base transition-all ${activeTab === "reverted" ? "font-bold text-amber-600 dark:text-amber-400 border-b-2 border-amber-600 dark:border-amber-400" : "font-semibold text-slate-500 dark:text-stone-400 hover:text-amber-600 dark:hover:text-amber-400"}`}
        >
          ⚠️ Reverted Applications
          {globalCounts.reverted > 0 && (
            <span className="ml-2 px-2 py-0.5 text-xs font-bold bg-amber-100 text-amber-700 rounded-full">
              {globalCounts.reverted}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("view")}
          className={`px-8 py-4 text-base transition-all ${activeTab === "view" ? "font-bold text-[#0a1e4d] dark:text-white border-b-2 border-[#0a1e4d] dark:border-white" : "font-semibold text-slate-500 dark:text-stone-400 hover:text-[#0a1e4d] dark:hover:text-white"}`}
        >
          View Submitted Passes
        </button>
      </div>

      {activeTab === "apply" && (
        <div className="space-y-8 animate-in fade-in duration-300">
          {companyBlacklisted && (
            <div className="bg-gradient-to-br from-red-600 via-red-700 to-red-800 border border-red-500/30 text-white rounded-2xl p-5 flex items-start gap-4 animate-in slide-in-from-top-2 duration-300 shadow-lg shadow-red-950/20">
              <div className="bg-white/10 text-white p-3 rounded-xl border border-white/20 shadow-inner shrink-0">
                <AlertCircle className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="text-base font-extrabold tracking-wide uppercase">
                  Your Company is Blacklisted!
                </h4>
                <p className="text-sm text-red-100 mt-1 leading-relaxed font-semibold">
                  Pass requests and applications are disabled for your company.
                </p>
                <div className="inline-flex items-center gap-2 mt-3 px-3 py-1.5 bg-black/20 hover:bg-black/35 rounded-xl border border-white/10 text-xs font-bold text-white transition-all">
                  <span className="text-red-300 uppercase tracking-widest text-[10px]">
                    Suspension Reason:
                  </span>
                  <span className="uppercase tracking-wide">
                    {companyBlacklistReason}
                  </span>
                </div>
              </div>
            </div>
          )}

          {!generalForm.isLifetimeLicense && generalForm.isLicenseExpired ? (
            <div className="bg-white rounded-2xl border border-red-200 shadow-xl p-10 text-center max-w-2xl mx-auto my-8 animate-in zoom-in-95 duration-300">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-200 shadow-sm animate-pulse">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-xl font-black text-stone-900 uppercase tracking-wide">
                Pass Generation Locked — License Expired
              </h3>
              <p className="text-sm text-stone-600 mt-2 leading-relaxed font-medium">
                Your company license expired on{" "}
                <strong className="text-red-700 font-bold">
                  {formatDateLong(generalForm.licenseValidityDate)}
                </strong>
                . Pass application form is disabled until your company license
                is renewed.
              </p>
              <div className="mt-6 flex justify-center">
                <button
                  onClick={() =>
                    window.dispatchEvent(new Event("open-profile-update"))
                  }
                  className="px-6 py-3 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-sm tracking-wider uppercase rounded-xl shadow-lg transition-all flex items-center gap-2"
                >
                  Renew / Update License Now
                </button>
              </div>
            </div>
          ) : (
            <>
              {!generalForm.isLifetimeLicense &&
                !generalForm.isLicenseExpired &&
                generalForm.remainingDays !== null &&
                generalForm.remainingDays <= 30 && (
                  <div className="bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 border border-amber-400/30 text-[#4c2d00] rounded-2xl p-5 flex items-start gap-4 animate-in slide-in-from-top-2 duration-300 shadow-lg shadow-amber-950/10">
                    <div className="bg-white/20 text-[#4c2d00] p-3 rounded-xl border border-white/30 shadow-inner shrink-0">
                      <AlertCircle className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-base font-extrabold tracking-wide uppercase">
                        Company License Expiring Soon!
                      </h4>
                      <p className="text-sm text-[#5c3c00] mt-1 leading-relaxed font-semibold">
                        Your license expires in{" "}
                        <span className="font-extrabold text-red-700 bg-red-100/50 px-1.5 py-0.5 rounded">
                          {generalForm.remainingDays} days
                        </span>{" "}
                        (on {formatDateLong(generalForm.licenseValidityDate)}).
                        Passes valid beyond this date cannot be created.
                      </p>
                      <button
                        onClick={() =>
                          window.dispatchEvent(new Event("open-profile-update"))
                        }
                        className="mt-3.5 px-5 py-2.5 bg-stone-900 text-amber-400 hover:bg-stone-850 active:scale-95 transition-all text-xs font-black tracking-wider uppercase rounded-xl shadow-md flex items-center gap-1.5"
                      >
                        Renew / Update License Now
                      </button>
                    </div>
                  </div>
                )}
              <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                  <h3 className="font-black text-[#0a1e4d] flex items-center gap-2 uppercase text-sm tracking-wider">
                    <Info className="h-5 w-5 text-orange-500" /> General Details
                  </h3>
                  <button
                    onClick={() => toggleModal("rateCard", true)}
                    className="bg-white text-[#0a1e4d] px-4 py-2 rounded-lg border border-slate-200 text-xs font-bold hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm"
                  >
                    <Calculator className="h-4 w-4 text-orange-500" /> View Rate
                    Card
                  </button>
                </div>
                <div className="p-6">
                  <div className="bg-slate-50 rounded-xl p-5 border border-slate-100 grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Company Name
                      </p>
                      <p className="text-sm font-bold text-[#0a1e4d] mt-1">
                        {generalForm.companyName}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Email ID
                      </p>
                      <p className="text-sm font-semibold text-slate-700 mt-1">
                        {generalForm.email}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Mobile No
                      </p>
                      <p className="text-sm font-semibold text-slate-700 mt-1">
                        +91 {generalForm.mobile}
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
                        value={generalForm.purpose}
                        onChange={(e) =>
                          setGeneralForm({
                            ...generalForm,
                            purpose: e.target.value,
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
                      {String(generalForm.purpose) === "6" && (
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
                        Licence / Work Order / Contract{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <label className="w-full h-10 border-2 border-dashed border-slate-300 bg-slate-50 rounded-lg px-4 flex items-center justify-center gap-2 cursor-pointer hover:bg-orange-50 hover:border-orange-300 transition-colors group">
                        <Upload className="h-4 w-4 text-slate-400 group-hover:text-orange-500" />
                        <span className="text-sm text-slate-600 font-medium truncate group-hover:text-orange-600">
                          {generalForm.authLetter
                            ? generalForm.authLetter.name
                            : "Upload PDF (Max 2MB)"}
                        </span>
                        <input
                          className="hidden"
                          type="file"
                          accept="application/pdf" // 🔥 restrict file picker
                          onChange={(e) => {
                            const file = e.target.files[0];

                            const error = validateFile(file, "pdf"); // 🔥 reuse your validator

                            if (error) {
                              toast.error(error);
                              e.target.value = ""; // reset input
                              return;
                            }

                            setGeneralForm({
                              ...generalForm,
                              authLetter: file,
                            });
                          }}
                        />
                      </label>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Requisition Letter{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <label className="w-full h-10 border-2 border-dashed border-slate-300 bg-slate-50 rounded-lg px-4 flex items-center justify-center gap-2 cursor-pointer hover:bg-orange-50 hover:border-orange-300 transition-colors group">
                        <Upload className="h-4 w-4 text-slate-400 group-hover:text-orange-500" />
                        <span className="text-sm text-slate-600 font-medium truncate group-hover:text-orange-600">
                          {generalForm.requisitionLetter
                            ? generalForm.requisitionLetter.name
                            : "Upload PDF (Max 2MB)"}
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

                            setGeneralForm({
                              ...generalForm,
                              requisitionLetter: file,
                            });
                          }}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </section>

              <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
                <div className="px-6 py-4 flex justify-between items-center bg-slate-50 border-b border-slate-100">
                  <h3 className="text-sm font-black text-[#0a1e4d] uppercase tracking-wide flex items-center gap-2">
                    <Users className="h-5 w-5 text-orange-500" /> Detail of
                    Persons:
                  </h3>
                  <span className="px-4 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-[#0a1e4d] font-black shadow-sm">
                    Total: {persons.length}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-[#0a1e4d] text-white">
                      <tr>
                        <th className="px-4 py-3 text-xs font-semibold border-r border-white/10 uppercase tracking-wider">
                          SNo.
                        </th>
                        <th className="px-4 py-3 text-xs font-semibold border-r border-white/10 uppercase tracking-wider">
                          Name & Desig.
                        </th>
                        <th className="px-4 py-3 text-xs font-semibold border-r border-white/10 uppercase tracking-wider">
                          Pass Type
                        </th>
                        <th className="px-4 py-3 text-xs font-semibold border-r border-white/10 uppercase tracking-wider">
                          Date From
                        </th>
                        <th className="px-4 py-3 text-xs font-semibold border-r border-white/10 uppercase tracking-wider">
                          Date To
                        </th>
                        <th className="px-4 py-3 text-xs font-semibold border-r border-white/10 uppercase tracking-wider text-right">
                          Amount
                        </th>
                        <th className="px-4 py-3 text-xs font-semibold text-center">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {persons.length === 0 && (
                        <tr>
                          <td
                            colSpan="7"
                            className="p-10 text-center text-sm text-slate-400 italic bg-white"
                          >
                            No persons added yet. Click "Add Person" below.
                          </td>
                        </tr>
                      )}
                      {persons.map((p, i) => (
                        <tr
                          key={i}
                          onClick={() => editPersonRow(i)}
                          className="hover:bg-orange-50/50 transition-colors cursor-pointer"
                        >
                          <td className="px-4 py-4 text-sm text-slate-500 font-medium border-r border-slate-100">
                            {(i + 1).toString().padStart(2, "0")}
                          </td>
                          <td className="px-4 py-4 border-r border-slate-100">
                            <div className="flex items-center gap-3">
                              {p.photo || p.existingPhotoName ? (
                                <img
                                  src={
                                    p.photo instanceof File
                                      ? URL.createObjectURL(p.photo)
                                      : p.existingPhotoPath
                                        ? `${AGENT_API}/${p.existingPhotoPath}`
                                        : `${AGENT_API}/pass-request/viewMasterDocument?masterId=${p.masterId}&entityType=person&documentType=personPhoto`
                                  }
                                  alt="Profile"
                                  className="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-sm"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                                  <Users className="h-5 w-5 text-slate-400" />
                                </div>
                              )}
                              <div>
                                <p className="text-sm font-bold text-[#0a1e4d]">
                                  {p.name}
                                </p>
                                <p className="text-xs text-slate-500 font-medium">
                                  {p.designation === "Others"
                                    ? p.designationOther
                                    : getLabelById(
                                        masterData.designations,
                                        p.designation,
                                      )}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 border-r border-slate-100">
                            <p className="text-sm font-semibold text-slate-800">
                              {getLabelById(masterData.hepTypes, p.hepType)}
                            </p>
                            <p className="text-xs text-orange-600 font-bold capitalize">
                              {getLabelById(masterData.passTypes, p.passType)}{" "}
                              Pass
                            </p>
                          </td>
                          <td className="px-4 py-4 text-sm text-slate-600 border-r border-slate-100 font-medium">
                            {p.dateFrom}
                          </td>
                          <td className="px-4 py-4 text-sm text-slate-600 border-r border-slate-100 font-medium">
                            {p.dateTo || "-"}
                          </td>
                          <td className="px-4 py-4 text-sm font-black text-[#0a1e4d] border-r border-slate-100 text-right">
                            ₹ {p.amount.toFixed(2)}
                          </td>
                          <td className="px-4 py-4 text-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deletePersonRow(i);
                              }}
                              className="bg-red-50 text-red-600 hover:text-red-800 hover:bg-red-100 px-3 py-1 rounded-lg text-xs font-bold transition-colors"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                      {persons.length > 0 && (
                        <tr className="bg-slate-50 border-t-2 border-slate-200">
                          <td
                            colSpan="5"
                            className="px-4 py-3 text-right text-xs font-black text-slate-700 uppercase tracking-widest border-r border-slate-200"
                          >
                            Total Amount
                          </td>
                          <td className="px-4 py-3 text-base font-black text-orange-600 text-right border-r border-slate-200">
                            ₹{" "}
                            {persons
                              .reduce((acc, curr) => acc + curr.amount, 0)
                              .toFixed(2)}
                          </td>
                          <td></td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="p-4 bg-white border-t border-slate-200 flex justify-end">
                  <button
                    onClick={openAddPersonModal}
                    disabled={companyBlacklisted}
                    className="bg-orange-600 text-white text-xs font-bold px-6 py-3 rounded-xl shadow-lg hover:bg-orange-700 disabled:cursor-not-allowed transition-all uppercase tracking-wider"
                  >
                    Add Person
                  </button>
                </div>
              </section>

              <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
                <div className="px-6 py-4 flex justify-between items-center bg-slate-50 border-b border-slate-100">
                  <h3 className="text-sm font-black text-[#0a1e4d] uppercase tracking-wide flex items-center gap-2">
                    <Truck className="h-5 w-5 text-orange-500" /> Detail of
                    Vehicles:
                  </h3>
                  <span className="px-4 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-[#0a1e4d] font-black shadow-sm">
                    Total: {vehicles.length}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-[#0a1e4d] text-white">
                      <tr>
                        <th className="px-4 py-3 text-xs font-semibold border-r border-white/10 uppercase tracking-wider">
                          SNo.
                        </th>
                        <th className="px-4 py-3 text-xs font-semibold border-r border-white/10 uppercase tracking-wider">
                          Reg. No. & Type
                        </th>
                        <th className="px-4 py-3 text-xs font-semibold border-r border-white/10 uppercase tracking-wider">
                          Pass Details
                        </th>
                        <th className="px-4 py-3 text-xs font-semibold border-r border-white/10 uppercase tracking-wider">
                          Date From
                        </th>
                        <th className="px-4 py-3 text-xs font-semibold border-r border-white/10 uppercase tracking-wider">
                          Date To
                        </th>
                        <th className="px-4 py-3 text-xs font-semibold border-r border-white/10 uppercase tracking-wider text-right">
                          Amount
                        </th>
                        <th className="px-4 py-3 text-xs font-semibold text-center">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {vehicles.length === 0 && (
                        <tr>
                          <td
                            colSpan="7"
                            className="p-10 text-center text-sm text-slate-400 italic bg-white"
                          >
                            No vehicles added yet. Click "Add Vehicle" below.
                          </td>
                        </tr>
                      )}
                      {vehicles.map((v, i) => (
                        <tr
                          key={i}
                          onClick={() => editVehicleRow(i)}
                          className="hover:bg-orange-50/50 transition-colors cursor-pointer"
                        >
                          <td className="px-4 py-4 text-sm text-slate-500 font-medium border-r border-slate-100">
                            {(i + 1).toString().padStart(2, "0")}
                          </td>
                          <td className="px-4 py-4 border-r border-slate-100">
                            <p className="text-sm font-bold text-[#0a1e4d] uppercase">
                              {v.regNo}
                            </p>
                            <p className="text-xs text-slate-500 font-medium">
                              {getLabelById(masterData.vehicleTypes, v.type)}
                            </p>
                          </td>
                          <td className="px-4 py-4 border-r border-slate-100">
                            <p className="text-sm font-semibold text-slate-800 capitalize">
                              {getLabelById(masterData.passTypes, v.passType)}{" "}
                              Pass
                            </p>
                          </td>
                          <td className="px-4 py-4 text-sm text-slate-600 border-r border-slate-100 font-medium">
                            {v.dateFrom}
                          </td>
                          <td className="px-4 py-4 text-sm text-slate-600 border-r border-slate-100 font-medium">
                            {v.dateTo || "-"}
                          </td>
                          <td className="px-4 py-4 text-sm font-black text-[#0a1e4d] border-r border-slate-100 text-right">
                            ₹ {v.amount.toFixed(2)}
                          </td>
                          <td className="px-4 py-4 text-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteVehicleRow(i);
                              }}
                              className="bg-red-50 text-red-600 hover:text-red-800 hover:bg-red-100 px-3 py-1 rounded-lg text-xs font-bold transition-colors"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                      {vehicles.length > 0 && (
                        <tr className="bg-slate-50 border-t-2 border-slate-200">
                          <td
                            colSpan="5"
                            className="px-4 py-3 text-right text-xs font-black text-slate-700 uppercase tracking-widest border-r border-slate-200"
                          >
                            Total Amount
                          </td>
                          <td className="px-4 py-3 text-base font-black text-orange-600 text-right border-r border-slate-200">
                            ₹{" "}
                            {vehicles
                              .reduce((sum, v) => sum + v.amount, 0)
                              .toFixed(2)}
                          </td>
                          <td></td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="p-4 bg-white border-t border-slate-200 flex justify-end">
                  <button
                    onClick={openAddVehicleModal}
                    disabled={companyBlacklisted}
                    className="bg-orange-600 text-white text-xs font-bold px-6 py-3 rounded-xl shadow-lg hover:bg-orange-700 disabled:bg-slate-350 disabled:text-slate-500 disabled:cursor-not-allowed transition-all uppercase tracking-wider"
                  >
                    Add Vehicle
                  </button>
                </div>
              </section>

              <footer className="flex justify-end pt-2 pb-8">
                <div className="bg-white p-8 w-full max-w-md shadow-2xl rounded-2xl border border-slate-200">
                  <div className="space-y-4 bg-slate-50 p-5 rounded-xl border border-slate-100">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-bold text-slate-500 uppercase tracking-wider text-xs">
                        Base Total:
                      </span>
                      <span className="font-bold text-[#0a1e4d]">
                        ₹ {totals.base}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-bold text-slate-500 uppercase tracking-wider text-xs">
                        GST (0%):
                      </span>
                      <span className="font-bold text-[#0a1e4d]">
                        ₹ {totals.gst}
                      </span>
                    </div>
                    <div className="pt-4 border-t border-slate-200 flex justify-between items-center">
                      <span className="text-sm font-black text-[#0a1e4d] uppercase tracking-wider">
                        Net Amount:
                      </span>
                      <span className="text-3xl font-black text-orange-600">
                        ₹ {totals.net}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-center items-center gap-8 py-4">
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-black text-slate-700 hover:text-orange-600 transition-colors">
                      <input
                        type="radio"
                        name="paymentMode"
                        value="Account"
                        checked={paymentMode === "Account"}
                        onChange={(e) => setPaymentMode(e.target.value)}
                        className="w-4 h-4 text-orange-600 focus:ring-orange-500 cursor-pointer"
                      />
                      ACCOUNT
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-black text-slate-700 hover:text-orange-600 transition-colors">
                      <input
                        type="radio"
                        name="paymentMode"
                        value="E-Cash"
                        checked={paymentMode === "E-Cash"}
                        onChange={(e) => setPaymentMode(e.target.value)}
                        className="w-4 h-4 text-orange-600 focus:ring-orange-500 cursor-pointer"
                      />
                      E-CASH
                    </label>
                  </div>
                  <div className="bg-orange-50/50 p-5 rounded-xl border border-orange-100 space-y-3">
                    <h4 className="text-xs font-black text-[#0a1e4d] uppercase flex items-center gap-2 tracking-wider">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" /> Terms
                      & Conditions
                    </h4>
                    <p className="text-[10px] text-slate-600 text-justify leading-relaxed font-medium">
                      I/We hereby certify that the above permits are required
                      only for our official purpose. We hold responsibility for
                      identification and all activities inside the port...
                    </p>
                    <label className="flex items-center gap-3 cursor-pointer pt-3 group">
                      <input
                        type="checkbox"
                        checked={agreedToTerms}
                        onChange={(e) => setAgreedToTerms(e.target.checked)}
                        className="w-5 h-5 rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                      />
                      <span className="text-xs font-black text-[#0a1e4d] group-hover:text-orange-600 transition-colors uppercase tracking-wider">
                        I agree to the Terms & Conditions
                      </span>
                    </label>
                  </div>
                  <button
                    onClick={handleSubmitRequest}
                    disabled={loading || !agreedToTerms || companyBlacklisted}
                    className="w-full mt-6 h-14 bg-[#0a1e4d] hover:bg-[#1a2f64] disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl font-black text-lg shadow-xl shadow-[#0a1e4d]/20 flex items-center justify-center gap-3 transition-all uppercase tracking-widest"
                  >
                    {loading ? "Processing..." : "Submit Request"}{" "}
                    {!loading && <Send className="h-5 w-5" />}
                  </button>
                </div>
              </footer>
            </>
          )}
        </div>
      )}

      {/* VIEW SUBMITTED PASSES TAB */}
      {activeTab === "view" && (
        <div className="space-y-8 animate-in fade-in duration-300">
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h3 className="font-black text-[#0a1e4d] flex items-center gap-2 uppercase text-sm tracking-wider">
                <FileText className="h-5 w-5 text-orange-500" /> My Pass
                Requests
              </h3>
              <button
                onClick={fetchAllViewPasses}
                disabled={allViewLoading}
                className="bg-white text-[#0a1e4d] px-4 py-2 rounded-lg border border-slate-200 text-xs font-bold hover:bg-slate-50 disabled:opacity-50 transition-colors flex items-center gap-2 shadow-sm"
              >
                <RefreshCw
                  className={`h-4 w-4 ${allViewLoading ? "animate-spin" : ""}`}
                />
                {allViewLoading ? "Refreshing..." : "Refresh List"}
              </button>
            </div>

            {/* ── Number system: per-status count cards (click to filter) ── */}
            <div className="px-6 pt-5 pb-1 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                {
                  key: "ALL",
                  label: "Total",
                  value: viewCounts.total,
                  icon: FileText,
                  color: "text-[#0a1e4d]",
                  ring: "ring-[#0a1e4d]/30",
                  bg: "bg-[#0a1e4d]/5",
                },
                {
                  key: "SUBMITTED",
                  label: "Submitted",
                  value: viewCounts.submitted,
                  icon: Send,
                  color: "text-blue-600",
                  ring: "ring-blue-300",
                  bg: "bg-blue-50",
                },
                {
                  key: "UNDER_REVIEW",
                  label: "Under Review",
                  value: viewCounts.underReview,
                  icon: Clock,
                  color: "text-amber-600",
                  ring: "ring-amber-300",
                  bg: "bg-amber-50",
                },
                {
                  key: "COMPLETED",
                  label: "Completed",
                  value: viewCounts.completed,
                  icon: CheckCircle,
                  color: "text-emerald-600",
                  ring: "ring-emerald-300",
                  bg: "bg-emerald-50",
                },
                {
                  key: "REVERTED",
                  label: "Reverted",
                  value: viewCounts.reverted,
                  icon: RefreshCw,
                  color: "text-orange-600",
                  ring: "ring-orange-300",
                  bg: "bg-orange-50",
                },
                {
                  key: "REJECTED",
                  label: "Rejected",
                  value: viewCounts.rejected,
                  icon: XCircle,
                  color: "text-red-600",
                  ring: "ring-red-300",
                  bg: "bg-red-50",
                },
              ].map((c) => {
                const active = viewStatusFilter === c.key;
                return (
                  <button
                    key={c.key}
                    onClick={() =>
                      setViewStatusFilter(
                        active && c.key !== "ALL" ? "ALL" : c.key,
                      )
                    }
                    title={`Filter by ${c.label}`}
                    className={`text-left rounded-xl p-3 ring-1 transition-all active:scale-[0.98] ${active ? `${c.bg} ${c.ring} shadow-sm` : "bg-white ring-slate-200 hover:bg-slate-50 hover:ring-slate-300"}`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider ${active ? c.color : "text-slate-500"}`}
                      >
                        {c.label}
                      </span>
                      <c.icon className={`h-3.5 w-3.5 ${c.color}`} />
                    </div>
                    <p
                      className={`mt-1 text-2xl font-black tabular-nums ${active ? c.color : "text-[#0a1e4d]"}`}
                    >
                      {allViewLoading ? "…" : c.value}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* ── Date / period filter toolbar ── */}
            <div className="px-6 py-3 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center gap-3">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0">
                <Filter className="h-3.5 w-3.5" /> Filter by date
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { k: "all", l: "All Time" },
                  { k: "today", l: "Today" },
                  { k: "7days", l: "Last 7 Days" },
                  { k: "30days", l: "Last 30 Days" },
                  { k: "month", l: "This Month" },
                  { k: "custom", l: "Custom" },
                ].map((o) => (
                  <button
                    key={o.k}
                    onClick={() => setViewDateFilter(o.k)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewDateFilter === o.k ? "bg-[#0a1e4d] text-white shadow" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                  >
                    {o.l}
                  </button>
                ))}
              </div>

              {viewDateFilter === "custom" && (
                <div className="flex items-center gap-2 lg:ml-2">
                  <div className="relative">
                    <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="date"
                      value={viewCustomFrom}
                      max={viewCustomTo || undefined}
                      onChange={(e) => setViewCustomFrom(e.target.value)}
                      className="pl-8 pr-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <span className="text-slate-400 text-xs">to</span>
                  <div className="relative">
                    <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="date"
                      value={viewCustomTo}
                      min={viewCustomFrom || undefined}
                      onChange={(e) => setViewCustomTo(e.target.value)}
                      className="pl-8 pr-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>
              )}

              {(viewDateFilter !== "all" ||
                viewStatusFilter !== "ALL" ||
                debouncedSearch) && (
                <button
                  onClick={() => {
                    setViewDateFilter("all");
                    setViewStatusFilter("ALL");
                    setViewCustomFrom("");
                    setViewCustomTo("");
                    setSearchInput("");
                  }}
                  className="lg:ml-auto inline-flex items-center gap-1 text-xs font-bold text-red-500 hover:text-red-600"
                >
                  <X className="h-3.5 w-3.5" /> Clear Filters
                </button>
              )}
            </div>

            <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                Showing{" "}
                {filteredViewPasses.length > 0
                  ? (viewPage - 1) * viewPageSize + 1
                  : 0}
                –{Math.min(viewPage * viewPageSize, filteredViewPasses.length)}{" "}
                of {filteredViewPasses.length} records
                {filteredViewPasses.length !== viewCounts.total && (
                  <span className="ml-2 text-orange-500 normal-case tracking-normal">
                    (filtered from {viewCounts.total})
                  </span>
                )}
              </div>
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search Ref ID, Name, Reg No..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value.toUpperCase())}
                  className="w-full pl-9 pr-10 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-orange-500"
                />
                {searchInput && (
                  <button
                    onClick={() => setSearchInput("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 transition-colors"
                    title="Clear Search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#0a1e4d] text-white">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-bold border-r border-white/10 uppercase tracking-wider text-center w-16">
                      S.No.
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold border-r border-white/10 uppercase tracking-wider">
                      Request ID
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold border-r border-white/10 uppercase tracking-wider">
                      Application Date
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold border-r border-white/10 uppercase tracking-wider">
                      Payment Mode
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold border-r border-white/10 uppercase tracking-wider text-right">
                      Net Amount
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold border-r border-white/10 uppercase tracking-wider text-center">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allViewLoading ? (
                    <tr>
                      <td
                        colSpan="6"
                        className="p-12 text-center text-sm font-bold text-slate-400"
                      >
                        <div className="flex justify-center items-center gap-2">
                          <span className="animate-pulse">
                            Loading pass records...
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : viewPageSlice.length === 0 ? (
                    <tr>
                      <td
                        colSpan="6"
                        className="p-12 text-center text-sm font-medium text-slate-400 italic"
                      >
                        {viewCounts.total === 0
                          ? "No pass requests found in the database."
                          : "No pass requests match the current filters."}
                      </td>
                    </tr>
                  ) : (
                    viewPageSlice.map((pass, idx) => {
                      // Robust DB mapping handling camelCase, snake_case, and flat text from PostgreSQL
                      const passIdStr = pass.referenceNo
                        ? pass.referenceNo
                        : pass.id
                          ? `REQ-${pass.id}`
                          : pass.passId || `REQ-XXXX`;

                      const createdAtStr =
                        pass.createdAt ||
                        pass.created_at ||
                        pass.createdat ||
                        pass.submittedAt ||
                        pass.submitted_at ||
                        pass.submittedat;

                      const paymentModeStr =
                        pass.paymentMode ||
                        pass.payment_mode ||
                        pass.paymentmode ||
                        "-";

                      const netAmountVal =
                        pass.netAmount ||
                        pass.net_amount ||
                        pass.netamount ||
                        pass.baseTotal ||
                        pass.basetotal ||
                        "0.00";

                      const currentStatus = (
                        pass.status || "PENDING"
                      ).toUpperCase();

                      const isApproved =
                        currentStatus === "APPROVED" ||
                        currentStatus === "ISSUED";

                      const catInfo = getPassRequestCategory(pass);

                      return (
                        <tr
                          key={pass.id || idx}
                          // onClick={() => setSelectedPassDetails(pass)}
                          onClick={() =>
                            setSelectedPassDetails({
                              ...pass,

                              persons: (pass.persons || []).map((person) => ({
                                ...person,
                                passStatus:
                                  person.passStatus ??
                                  person.pass_status ??
                                  person.passstatus ??
                                  null,
                              })),

                              vehicles: (pass.vehicles || []).map(
                                (vehicle) => ({
                                  ...vehicle,
                                  passStatus:
                                    vehicle.passStatus ??
                                    vehicle.pass_status ??
                                    vehicle.passstatus ??
                                    null,
                                }),
                              ),
                            })
                          }
                          className={`hover:bg-blue-50/50 transition-colors cursor-pointer ${catInfo.borderAccent}`}
                        >
                          <td className="px-6 py-4 text-sm font-bold text-slate-400 text-center border-r border-slate-100 tabular-nums">
                            {(viewPage - 1) * viewPageSize + idx + 1}
                          </td>
                          <td className="px-6 py-4 text-sm font-bold text-[#0a1e4d] border-r border-slate-100">
                            <div className="flex flex-col gap-1">
                              <span>{passIdStr}</span>
                              <span
                                className={`self-start px-2 py-0.5 rounded-full text-[9px] font-extrabold border ${catInfo.badgeClass}`}
                              >
                                {catInfo.label}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600 font-medium border-r border-slate-100">
                            {createdAtStr
                              ? new Date(createdAtStr).toLocaleString("en-IN", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "-"}
                          </td>
                          <td className="px-6 py-4 text-sm font-bold text-slate-600 border-r border-slate-100">
                            {paymentModeStr}
                          </td>
                          <td className="px-6 py-4 text-sm font-black text-[#0a1e4d] text-right border-r border-slate-100">
                            ₹ {parseFloat(netAmountVal).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 text-center border-r border-slate-100">
                            <span
                              className={`inline-block px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                                currentStatus === "SUBMITTED"
                                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                                  : isApproved
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : currentStatus === "REJECTED"
                                      ? "bg-red-50 text-red-700 border border-red-200"
                                      : "bg-amber-50 text-amber-700 border border-amber-200"
                              }`}
                            >
                              {currentStatus}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination for main submitted list */}
            <div className="px-6 py-4 border-t border-slate-100">
              <PaginationBar
                currentPage={viewPage}
                totalPages={viewTotalPages}
                totalRecords={filteredViewPasses.length}
                pageSize={viewPageSize}
                onPageChange={(page) => setViewPage(page)}
                onPageSizeChange={(limit) => {
                  setViewPageSize(limit);
                  setViewPage(1);
                }}
                loading={allViewLoading}
              />
            </div>
          </section>
        </div>
      )}

      {/* REVERTED APPLICATIONS TAB */}
      {activeTab === "reverted" && (
        <div className="space-y-8 animate-in fade-in duration-300">
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-amber-50 flex justify-between items-center">
              <h3 className="font-black text-amber-900 flex items-center gap-2 uppercase text-sm tracking-wider">
                <AlertCircle className="h-5 w-5 text-amber-600" /> Reverted
                Applications - Action Required
              </h3>
              <button
                onClick={fetchSubmittedPasses}
                disabled={loadingPasses}
                className="bg-white text-amber-700 px-4 py-2 rounded-lg border border-amber-200 text-xs font-bold hover:bg-amber-50 disabled:opacity-50 transition-colors flex items-center gap-2 shadow-sm"
              >
                <RefreshCw
                  className={`h-4 w-4 ${loadingPasses ? "animate-spin" : ""}`}
                />
                Refresh
              </button>
            </div>

            <div className="px-6 py-4 bg-amber-50/30 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-xs font-bold text-amber-900 uppercase tracking-widest">
                Showing{" "}
                {paginationMeta.totalRecords > 0
                  ? (paginationMeta.currentPage - 1) * paginationMeta.pageSize +
                    1
                  : 0}
                –
                {Math.min(
                  paginationMeta.currentPage * paginationMeta.pageSize,
                  paginationMeta.totalRecords,
                )}{" "}
                of {paginationMeta.totalRecords} reverted records
              </div>
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search Ref ID, Name, Reg No..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value.toUpperCase())}
                  className="w-full pl-9 pr-10 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-amber-500"
                />
                {searchInput && (
                  <button
                    onClick={() => setSearchInput("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 transition-colors"
                    title="Clear Search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#0a1e4d] text-white">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-bold border-r border-white/10 uppercase tracking-wider">
                      Reference No
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold border-r border-white/10 uppercase tracking-wider">
                      Submitted Date
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold border-r border-white/10 uppercase tracking-wider">
                      Entities
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold border-r border-white/10 uppercase tracking-wider text-center">
                      Reverted Count
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold border-r border-white/10 uppercase tracking-wider text-center">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingPasses ? (
                    <tr>
                      <td colSpan="5" className="p-12 text-center">
                        <RefreshCw className="h-8 w-8 animate-spin mx-auto text-amber-500 mb-3" />
                        <p className="text-sm font-medium text-slate-500">
                          Loading reverted applications...
                        </p>
                      </td>
                    </tr>
                  ) : submittedPasses.filter(
                      (p) => p.status === "REVERTED" || p.hasRevertedEntities,
                    ).length === 0 ? (
                    <tr>
                      <td
                        colSpan="5"
                        className="p-12 text-center text-sm font-medium text-slate-400 italic"
                      >
                        <div className="flex flex-col items-center gap-3">
                          <CheckCircle2 className="h-12 w-12 text-emerald-400" />
                          <p>No reverted applications found.</p>
                          <p className="text-xs">
                            All your pass applications are under review or
                            completed.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    submittedPasses
                      .filter(
                        (p) => p.status === "REVERTED" || p.hasRevertedEntities,
                      )
                      .map((pass) => {
                        const totalEntities =
                          (pass.persons?.length || 0) +
                          (pass.vehicles?.length || 0);
                        const revertedEntities = [
                          ...(pass.persons || []).filter(
                            (p) => p.status === "reverted",
                          ),
                          ...(pass.vehicles || []).filter(
                            (v) => v.status === "reverted",
                          ),
                        ];

                        return (
                          <tr
                            key={pass.id}
                            className="hover:bg-amber-50/50 transition-colors border-l-4 border-amber-400"
                          >
                            <td className="px-6 py-4 border-r border-slate-100">
                              <span className="font-mono font-bold text-[#0a1e4d]">
                                {pass.referenceNo}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-600 border-r border-slate-100">
                              {new Date(
                                pass.submittedAt || pass.createdAt,
                              ).toLocaleDateString("en-GB", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-600 border-r border-slate-100">
                              <div className="flex flex-col gap-1">
                                <span>{totalEntities} Total</span>
                                <span className="text-amber-600 font-bold">
                                  {revertedEntities.length} Reverted
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center border-r border-slate-100">
                              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 text-amber-700 font-bold text-sm">
                                {pass.revertCount || 1}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <button
                                onClick={() => handleEditRevertedPass(pass)}
                                className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 mx-auto"
                              >
                                <Edit3 className="h-4 w-4" />
                                Edit & Resubmit
                              </button>
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination for reverted list */}
            <div className="px-6 py-4 border-t border-slate-100">
              <PaginationBar
                currentPage={paginationMeta.currentPage || currentPage}
                totalPages={paginationMeta.totalPages || 1}
                totalRecords={paginationMeta.totalRecords || 0}
                pageSize={paginationMeta.pageSize || pageSize}
                onPageChange={(page) => setCurrentPage(page)}
                onPageSizeChange={(limit) => {
                  setPageSize(limit);
                  setCurrentPage(1);
                }}
                loading={loadingPasses}
              />
            </div>
          </section>
        </div>
      )}

      {/* PERSON MODAL */}
      {modals.person && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in zoom-in-95 duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl flex flex-col max-h-[95vh] border border-slate-200 overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 bg-[#0a1e4d] text-white">
              <div className="flex items-center gap-3">
                <div className="bg-white/10 p-2 rounded-lg">
                  <UserPlus className="h-5 w-5 text-orange-400" />
                </div>
                <h2 className="text-xl font-bold tracking-wide">
                  {editingPersonIndex !== null ? "Edit Person" : "Add Person"}
                </h2>
                <span className="text-[10px] text-white/80 ml-4 font-medium tracking-wider bg-white/10 px-2.5 py-1 rounded-full border border-white/20">
                  All documents in red asterisk(*) must be .pdf
                </span>
              </div>
              <button
                onClick={() => toggleModal("person", false)}
                className="text-white/70 hover:text-white hover:bg-white/10 p-2 rounded-xl transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-8 overflow-y-auto flex-1 bg-slate-50 space-y-8">
              {!editingPersonIndex && (
                <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center gap-4 shadow-sm">
                  <label className="text-xs font-black text-[#0a1e4d] uppercase tracking-wider whitespace-nowrap">
                    Fast-Fill from Master Directory:
                  </label>
                  <Select
                    options={personOptions}
                    value={personOptions.find(
                      (opt) => opt.value === String(personForm.masterId || ""),
                    )}
                    onChange={(selected) => {
                      const id = selected?.value || "";
                      handleMasterPersonSelect({ target: { value: id } });
                    }}
                    placeholder="Search person..."
                    className="max-w-md w-full"
                    classNamePrefix="react-select"
                  />
                </div>
              )}

              <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-3">
                  1. Role & Identity
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-x-5 gap-y-5">
                  {/* Basic Profile Info */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase">
                      Type of HEP <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={personForm.hepType}
                      onChange={(e) => {
                        handleHepTypeChange(e);
                        validatePersonField("hepType", e.target.value);
                      }}
                      className={inputClass}
                    >
                      <option value="">Select Type</option>
                      {masterData.hepTypes.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.name}
                        </option>
                      ))}
                    </select>
                    {personErrors.hepType && (
                      <p className="text-xs text-red-500 font-semibold mt-1">
                        {personErrors.hepType}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={personForm.name}
                      onChange={(e) => {
                        setPersonForm({ ...personForm, name: e.target.value });
                        validatePersonField("name", e.target.value);
                      }}
                      onBlur={(e) =>
                        validatePersonField("name", e.target.value)
                      }
                      className={`${inputClass} ${personErrors.name ? "border-red-400 focus:border-red-500 focus:ring-red-500/20" : ""}`}
                      placeholder="Full Name"
                      maxLength={80}
                    />
                    {personErrors.name && (
                      <p className="text-xs text-red-500 mt-0.5 font-medium">
                        {personErrors.name}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase">
                      Mobile <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <Phone className="h-4 w-4 text-slate-400" />
                        <span className="text-xs text-slate-500 font-bold ml-1 border-r border-slate-300 pr-2">
                          +91
                        </span>
                      </div>
                      <input
                        type="tel"
                        value={personForm.mobile}
                        className={`w-full pl-[5.5rem] pr-3 h-10 border rounded-lg text-sm focus:ring-2 outline-none transition-all ${
                          personErrors.mobile
                            ? "border-red-400 focus:border-red-500 focus:ring-red-500/30"
                            : "border-slate-300 focus:ring-orange-500/30 focus:border-orange-500"
                        }`}
                        placeholder="00000 00000"
                        maxLength={10}
                        inputMode="numeric"
                        onBlur={(e) =>
                          validatePersonField("mobile", e.target.value)
                        }
                        onChange={(e) => {
                          const val = e.target.value
                            .replace(/\D/g, "")
                            .slice(0, 10);
                          setPersonForm({ ...personForm, mobile: val });

                          if (val.length === 10) {
                            validatePersonField("mobile", val);
                          }
                        }}
                      />
                    </div>
                    {personErrors.mobile && (
                      <p className="text-xs text-red-500 mt-0.5 font-medium">
                        {personErrors.mobile}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase">
                      Email Id
                    </label>
                    <input
                      type="email"
                      value={personForm.email}
                      onChange={(e) => {
                        setPersonForm({ ...personForm, email: e.target.value });
                        if (e.target.value)
                          validatePersonField("email", e.target.value);
                      }}
                      onBlur={(e) => {
                        if (e.target.value)
                          validatePersonField("email", e.target.value);
                      }}
                      className={`${inputClass} ${personErrors.email ? "border-red-400 focus:border-red-500 focus:ring-red-500/20" : ""}`}
                      placeholder="email@domain.com"
                    />
                    {personErrors.email && (
                      <p className="text-xs text-red-500 mt-0.5 font-medium">
                        {personErrors.email}
                      </p>
                    )}
                  </div>

                  {/* Nationality & Travel Details */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase">
                      Nationality <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={personForm.nationality}
                      onChange={(e) => {
                        const value = e.target.value;

                        const nationalityName = getLabelById(
                          masterData.nationalities,
                          value,
                          "label",
                        )?.toUpperCase();

                        const isForeignerVal =
                          nationalityName === "FOREIGNER" || value === "2";
                        const passportIdObj = (
                          masterData.idProofTypes || []
                        ).find((t) =>
                          (t.label || t.name || "")
                            .toLowerCase()
                            .includes("passport"),
                        );
                        const passportTypeId = passportIdObj
                          ? String(passportIdObj.id || passportIdObj.value)
                          : "4";

                        const dlIdObj = (masterData.idProofTypes || []).find(
                          (t) =>
                            (t.label || t.name || "")
                              .toLowerCase()
                              .includes("driver") ||
                            (t.label || t.name || "")
                              .toLowerCase()
                              .includes("licence"),
                        );
                        const dlTypeId = dlIdObj
                          ? String(dlIdObj.id || dlIdObj.value)
                          : "1";

                        const indiaObj = (masterData.countries || []).find(
                          (c) =>
                            String(c.name || "")
                              .trim()
                              .toUpperCase() === "INDIA",
                        );
                        const indiaId = indiaObj
                          ? String(indiaObj.id || indiaObj.value)
                          : "";

                        setPersonForm((prev) => ({
                          ...prev,
                          nationality: value,
                          country:
                            nationalityName === "INDIAN"
                              ? indiaId || prev.country
                              : prev.country === indiaId
                                ? ""
                                : prev.country,
                          idProofType:
                            prev.hepType === "1"
                              ? dlTypeId
                              : isForeignerVal
                                ? passportTypeId
                                : prev.idProofType,
                          aadharNo: isForeignerVal ? "" : prev.aadharNo,
                          aadharFile: isForeignerVal ? null : prev.aadharFile,
                        }));
                      }}
                      className={inputClass}
                    >
                      <option value="">Select Nationality</option>
                      {masterData.nationalities.map((n) => (
                        <option key={n.id || n.value} value={n.id || n.value}>
                          {n.label || n.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase">
                      Country <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={personForm.country}
                      onChange={(e) =>
                        setPersonForm({
                          ...personForm,
                          country: e.target.value,
                        })
                      }
                      className={inputClass}
                      disabled={!isPersonForeigner(personForm.nationality)}
                    >
                      <option value="">Select Country</option>

                      {masterData.countries
                        .filter((c) => {
                          const isForeigner = isPersonForeigner(
                            personForm.nationality,
                          );
                          if (!isForeigner) {
                            return (
                              c.name && c.name.trim().toUpperCase() === "INDIA"
                            );
                          } else {
                            return (
                              c.name && c.name.trim().toUpperCase() !== "INDIA"
                            );
                          }
                        })
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase">
                      Visa No.{" "}
                      {isPersonForeigner(personForm.nationality) && (
                        <span className="text-red-500">*</span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={personForm.visaNo}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        setPersonForm({ ...personForm, visaNo: val });
                        if (val) validatePersonField("visaNo", val);
                      }}
                      onBlur={(e) => {
                        if (e.target.value)
                          validatePersonField("visaNo", e.target.value);
                      }}
                      disabled={!isPersonForeigner(personForm.nationality)}
                      placeholder="Visa number (5-20 alphanumeric)"
                      maxLength={20}
                      className={`disabled:bg-slate-100 disabled:cursor-not-allowed ${inputClass} ${personErrors.visaNo ? "border-red-400" : ""}`}
                    />
                    {personErrors.visaNo && (
                      <p className="text-xs text-red-500 mt-0.5 font-medium">
                        {personErrors.visaNo}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase">
                      With Two wheeler
                    </label>
                    {(() => {
                      const hasVal = !!personForm.vehicleNo.trim();
                      const isTwoWheeler = personForm.withTwoWheeler;
                      const hasError = !!personErrors.vehicleNo;

                      let containerClass =
                        "border-slate-300 focus-within:ring-2 focus-within:ring-orange-500/30 focus-within:border-orange-500";
                      if (isTwoWheeler && hasVal) {
                        containerClass = hasError
                          ? "border-red-400 focus-within:ring-2 focus-within:ring-red-500/20 focus-within:border-red-400"
                          : "border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500";
                      }

                      return (
                        <div
                          className={`flex h-10 shadow-sm rounded-lg overflow-hidden border transition-all ${containerClass}`}
                        >
                          <div className="border-r border-slate-300 flex items-center justify-center px-4 bg-slate-50">
                            <input
                              type="checkbox"
                              checked={personForm.withTwoWheeler}
                              onChange={(e) =>
                                setPersonForm({
                                  ...personForm,
                                  withTwoWheeler: e.target.checked,
                                })
                              }
                              className="rounded text-[#0a1e4d] focus:ring-[#0a1e4d] h-4 w-4 cursor-pointer"
                            />
                          </div>
                          <input
                            type="text"
                            value={personForm.vehicleNo}
                            disabled={!personForm.withTwoWheeler}
                            placeholder="Vehicle No (e.g. TN-01-AB-1234)"
                            className="w-full text-sm disabled:bg-slate-100 disabled:cursor-not-allowed px-3 outline-none uppercase font-bold text-[#0a1e4d]"
                            onBlur={(e) => {
                              if (personForm.withTwoWheeler) {
                                validatePersonField(
                                  "vehicleNo",
                                  e.target.value,
                                );
                              }
                            }}
                            onChange={(e) => {
                              const val = e.target.value
                                .toUpperCase()
                                .slice(0, 13);
                              setPersonForm({
                                ...personForm,
                                vehicleNo: val,
                              });
                              if (personForm.withTwoWheeler) {
                                if (val.length >= 8) {
                                  validatePersonField("vehicleNo", val);
                                }
                                if (
                                  /^[A-Z]{2}[-\s]?[0-9]{1,2}[-\s]?[A-Z]{1,3}[-\s]?[0-9]{4}$/i.test(
                                    val,
                                  )
                                ) {
                                  checkBlacklistStatus(
                                    "VEHICLE",
                                    val.replace(/[\s-]/g, ""),
                                  );
                                }
                              }
                            }}
                          />
                        </div>
                      );
                    })()}
                    {personForm.withTwoWheeler &&
                      personForm.vehicleNo.trim() && (
                        <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold transition-all">
                          {personErrors.vehicleNo ? (
                            <>
                              <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                              <span className="text-red-500">
                                {personErrors.vehicleNo}
                              </span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                              <span className="text-emerald-600">
                                Valid Two Wheeler registration format
                              </span>
                            </>
                          )}
                        </div>
                      )}
                    {!personErrors.vehicleNo &&
                      blacklistWarnings[
                        "VEHICLE_" +
                          personForm.vehicleNo
                            .replace(/[\s-]/g, "")
                            .toUpperCase()
                      ] && (
                        <div className="mt-1.5 flex items-start gap-1.5 bg-red-50 border border-red-300 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-red-700 animate-in fade-in duration-200">
                          <AlertCircle className="h-3.5 w-3.5 text-red-600 shrink-0 mt-0.5" />
                          <span>
                            PORT BLACKLISTED —{" "}
                            {blacklistWarnings[
                              "VEHICLE_" +
                                personForm.vehicleNo
                                  .replace(/[\s-]/g, "")
                                  .toUpperCase()
                            ]?.replace("⚠️ BLACKLISTED ", "")}
                          </span>
                        </div>
                      )}
                  </div>

                  {/* Seafarer ID Type Selection */}
                  {personForm.hepType === "3" && (
                    <div className="space-y-1.5 animate-in zoom-in">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        ID Proof Type <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={personForm.seafarerIdType}
                        onChange={(e) => {
                          const value = e.target.value;
                          setPersonForm({
                            ...personForm,
                            seafarerIdType: value,
                            aadharNo:
                              value === "passport" ? "" : personForm.aadharNo,
                            passportNo:
                              value === "aadhaar" ? "" : personForm.passportNo,
                            aadharFile:
                              value === "passport"
                                ? null
                                : personForm.aadharFile,
                          });
                          if (personErrors.seafarerIdType) {
                            setPersonErrors((prev) => ({
                              ...prev,
                              seafarerIdType: null,
                            }));
                          }
                        }}
                        className={`w-full h-10 border rounded-lg text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 px-3 outline-none shadow-sm transition-all ${
                          personErrors.seafarerIdType
                            ? "border-red-400 bg-red-50"
                            : "border-slate-300 bg-white"
                        }`}
                      >
                        <option value="">-- Select ID Type --</option>
                        <option value="aadhaar">Aadhaar</option>
                        <option value="passport">Passport</option>
                      </select>
                      {personErrors.seafarerIdType && (
                        <p className="text-xs text-red-500 mt-0.5 font-medium">
                          {personErrors.seafarerIdType}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Aadhaar Fields - Show for non-foreigners (non-seafarers OR seafarers who selected aadhaar) */}
                  {!isPersonForeigner(personForm.nationality) &&
                    (personForm.hepType !== "3" ||
                      personForm.seafarerIdType === "aadhaar") && (
                      <>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-700 uppercase">
                            Upload Aadhar{" "}
                            <span className="text-red-500">*</span>
                          </label>
                          <FileUploadBox
                            disabled={!!personForm.masterId}
                            file={personForm.aadharFile}
                            existingFileName={personForm.existingAadharName}
                            onView={() =>
                              handleViewDoc(
                                personForm.existingPassRequestId,
                                "personAadhar",
                                personForm.existingAadharName,
                                personForm.editIndex,
                              )
                            }
                            onChange={async (e) => {
                              if (personForm.masterId) {
                                toast.error(
                                  "Aadhaar document comes from Master Directory and cannot be changed.",
                                );
                                return;
                              }

                              const file =
                                e?.target?.files?.[0] ||
                                e?.files?.[0] ||
                                e?.file ||
                                e;

                              if (!file) return;

                              setPersonForm((prev) => ({
                                ...prev,
                                aadharFile: file,
                              }));

                              try {
                                toast.loading("Reading Aadhaar PDF...", {
                                  id: "aadhar-ocr",
                                });

                                const extractedAadhar =
                                  await extractAadharFromPdf(file);

                                toast.dismiss("aadhar-ocr");

                                if (!extractedAadhar) {
                                  setPersonForm((prev) => ({
                                    ...prev,
                                    aadharFile: file,
                                    aadharNo: "",
                                  }));

                                  toast.warning(
                                    "Could not detect Aadhaar automatically. Please enter manually.",
                                  );
                                  return;
                                }

                                setPersonForm((prev) => ({
                                  ...prev,
                                  aadharFile: file,
                                  aadharNo: extractedAadhar,
                                }));

                                toast.success(
                                  `Aadhaar detected: ${extractedAadhar}`,
                                );
                              } catch (error) {
                                toast.dismiss("aadhar-ocr");
                                console.error(error);
                                setPersonForm((prev) => ({
                                  ...prev,
                                  aadharFile: file,
                                  aadharNo: "",
                                }));

                                toast.error("Failed to read Aadhaar PDF");
                              }
                            }}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-700 uppercase">
                            Aadhaar No. <span className="text-red-500">*</span>
                          </label>
                          {(() => {
                            const hasVal = !!personForm.aadharNo.trim();
                            const isValid = /^\d{12}$/.test(
                              personForm.aadharNo,
                            );
                            const hasError = !!personErrors.aadharNo;

                            let customBorderClass =
                              "border-slate-300 focus:ring-orange-500/20 focus:border-orange-500";
                            if (hasVal) {
                              customBorderClass =
                                hasError || !isValid
                                  ? "border-red-400 focus:ring-red-500/20 focus:border-red-400"
                                  : "border-emerald-500 focus:ring-emerald-500/20 focus:border-emerald-500";
                            }

                            return (
                              <>
                                <input
                                  type="text"
                                  value={personForm.aadharNo}
                                  readOnly={!!personForm.masterId}
                                  onChange={(e) => {
                                    const val = e.target.value
                                      .replace(/\D/g, "")
                                      .slice(0, 12);
                                    setPersonForm({
                                      ...personForm,
                                      aadharNo: val,
                                    });
                                    if (val.length === 12) {
                                      validatePersonField("aadharNo", val);
                                      checkBlacklistStatus("PERSON", val);
                                      checkBlacklistStatus("DRIVER", val);
                                    }
                                  }}
                                  onBlur={(e) =>
                                    validatePersonField(
                                      "aadharNo",
                                      e.target.value,
                                    )
                                  }
                                  className={`w-full h-10 border rounded-lg text-sm px-3 shadow-sm outline-none transition-all focus:ring-2 ${customBorderClass}`}
                                  placeholder="XXXX XXXX XXXX"
                                  maxLength={12}
                                  inputMode="numeric"
                                />
                                {hasVal && (
                                  <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold transition-all animate-in fade-in duration-200">
                                    {hasError || !isValid ? (
                                      <>
                                        <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                                        <span className="text-red-500">
                                          Aadhaar must be exactly 12 digits
                                        </span>
                                      </>
                                    ) : (
                                      <>
                                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                        <span className="text-emerald-600">
                                          Valid Aadhaar format
                                        </span>
                                      </>
                                    )}
                                  </div>
                                )}
                                {isValid &&
                                  (blacklistWarnings[
                                    "PERSON_" + personForm.aadharNo
                                  ] ||
                                    blacklistWarnings[
                                      "DRIVER_" + personForm.aadharNo
                                    ]) && (
                                    <div className="mt-1.5 flex items-start gap-1.5 bg-red-50 border border-red-300 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-red-700 animate-in fade-in duration-200">
                                      <AlertCircle className="h-3.5 w-3.5 text-red-600 shrink-0 mt-0.5" />
                                      <span>
                                        PORT BLACKLISTED —{" "}
                                        {(
                                          blacklistWarnings[
                                            "PERSON_" + personForm.aadharNo
                                          ] ||
                                          blacklistWarnings[
                                            "DRIVER_" + personForm.aadharNo
                                          ]
                                        )?.replace("⚠️ BLACKLISTED ", "")}
                                      </span>
                                    </div>
                                  )}
                              </>
                            );
                          })()}
                        </div>
                      </>
                    )}

                  {/* Passport Fields - Show only for seafarers who selected passport */}
                  {personForm.hepType === "3" &&
                    personForm.seafarerIdType === "passport" && (
                      <>
                        <div className="space-y-1.5 animate-in zoom-in">
                          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                            Passport No. <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={personForm.passportNo}
                            onChange={(e) => {
                              const val = e.target.value
                                .toUpperCase()
                                .slice(0, 15);
                              setPersonForm({ ...personForm, passportNo: val });
                              if (personErrors.passportNo) {
                                setPersonErrors((prev) => ({
                                  ...prev,
                                  passportNo: null,
                                }));
                              }
                            }}
                            className={`w-full h-10 border rounded-lg text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 px-3 shadow-sm outline-none uppercase transition-all ${
                              personErrors.passportNo
                                ? "border-red-400 bg-red-50"
                                : "border-slate-300 bg-white"
                            }`}
                            placeholder="Passport Number"
                            maxLength={15}
                          />
                          {personErrors.passportNo && (
                            <p className="text-xs text-red-500 mt-0.5 font-medium">
                              {personErrors.passportNo}
                            </p>
                          )}
                        </div>
                        <div className="space-y-1.5 animate-in zoom-in">
                          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                            Upload Passport{" "}
                            <span className="text-red-500">*</span>
                          </label>
                          <FileUploadBox
                            file={personForm.passportDoc}
                            existingFileName={personForm.existingPassportName}
                            onView={() =>
                              handleViewDoc(
                                personForm.existingPassRequestId,
                                "passportDoc",
                                personForm.existingPassportName,
                                personForm.editIndex,
                              )
                            }
                            onChange={(e) =>
                              setPersonForm({
                                ...personForm,
                                passportDoc: e.target.files[0],
                              })
                            }
                          />
                        </div>
                      </>
                    )}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase">
                      Access Area <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={personForm.accessArea}
                      onChange={(e) =>
                        setPersonForm({
                          ...personForm,
                          accessArea: e.target.value,
                        })
                      }
                      className={inputClass}
                    >
                      <option value="">Select Access Area</option>
                      {masterData.accessAreas.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase">
                      Date of Birth (DOB){" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        placeholder="DD/MM/YYYY"
                        maxLength={10}
                        value={formatISOToDDMMYYYY(personForm.dob)}
                        onChange={(e) => {
                          let input = e.target.value.replace(/\D/g, "");
                          if (input.length > 8) input = input.substring(0, 8);

                          let formatted = "";
                          if (input.length > 0) {
                            formatted += input.substring(0, 2);
                            if (input.length >= 3) {
                              formatted += "/" + input.substring(2, 4);
                              if (input.length >= 5) {
                                formatted += "/" + input.substring(4, 8);
                              }
                            }
                          }

                          const iso = formatDDMMYYYYToISO(formatted);
                          setPersonForm((prev) => ({
                            ...prev,
                            dob: iso || formatted,
                          }));
                          if (personErrors.dob) {
                            setPersonErrors((prev) => ({ ...prev, dob: null }));
                          }
                        }}
                        className={`${inputClass} pr-10 ${personErrors.dob ? "border-red-400 focus:border-red-500 focus:ring-red-500/20 bg-red-50/20" : ""}`}
                      />
                      <div className="absolute right-2 flex items-center">
                        <input
                          type="date"
                          id="dob-hidden-picker"
                          tabIndex={-1}
                          value={
                            personForm.dob && personForm.dob.includes("-")
                              ? personForm.dob
                              : formatDDMMYYYYToISO(personForm.dob)
                          }
                          onChange={(e) => {
                            if (e.target.value) {
                              setPersonForm((prev) => ({
                                ...prev,
                                dob: e.target.value,
                              }));
                              if (personErrors.dob) {
                                setPersonErrors((prev) => ({
                                  ...prev,
                                  dob: null,
                                }));
                              }
                            }
                          }}
                          className="sr-only"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const picker =
                              document.getElementById("dob-hidden-picker");
                            if (
                              picker &&
                              typeof picker.showPicker === "function"
                            ) {
                              picker.showPicker();
                            } else if (picker) {
                              picker.focus();
                              picker.click();
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                          title="Choose Date of Birth from calendar"
                        >
                          <Calendar className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    {personErrors.dob && (
                      <p className="text-[11px] font-semibold text-red-500 flex items-center gap-1 mt-1">
                        <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />{" "}
                        {personErrors.dob}
                      </p>
                    )}
                  </div>

                  <div
                    className={`col-span-1 md:col-span-2 grid gap-4 ${personForm.designation === "Others" ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"}`}
                  >
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase">
                        Designation <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={personForm.designation}
                        onChange={(e) => {
                          setPersonForm({
                            ...personForm,
                            designation: e.target.value,
                          });
                          if (personErrors.dob) {
                            setPersonErrors((prev) => ({ ...prev, dob: null }));
                          }
                        }}
                        className={inputClass}
                        disabled={personForm.hepType === "1"}
                      >
                        <option value="">-- Select --</option>
                        {personForm.hepType === "1" && (
                          <option value="13">Driver</option>
                        )}
                        {getFilteredDesignations().map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                        <option value="Crew">Crew</option>
                        <option value="Supernumerary">Supernumerary</option>
                        <option value="Others">Others</option>
                      </select>
                    </div>
                    {personForm.designation === "Others" && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase">
                          Specify Others <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="Specify designation"
                          value={personForm.designationOther || ""}
                          onChange={(e) => {
                            setPersonForm({
                              ...personForm,
                              designationOther: e.target.value,
                            });
                            if (personErrors.dob) {
                              setPersonErrors((prev) => ({
                                ...prev,
                                dob: null,
                              }));
                            }
                          }}
                          className={inputClass}
                        />
                      </div>
                    )}
                  </div>
                  {personForm.designation === "Crew" && (
                    <div className="col-span-1 md:col-span-4 grid grid-cols-1 md:grid-cols-3 gap-x-5 gap-y-5 items-start">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase">
                          CDC Document No.{" "}
                          <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={personForm.cdcNumber}
                          onChange={(e) =>
                            setPersonForm({
                              ...personForm,
                              cdcNumber: e.target.value,
                            })
                          }
                          className={inputClass}
                          placeholder="Enter CDC document number"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase">
                          CDC Document <span className="text-red-500">*</span>
                        </label>
                        <FileUploadBox
                          file={personForm.cdcDocument}
                          existingFileName={personForm.existingCdcName}
                          onView={() =>
                            handleViewDoc(
                              personForm.existingPassRequestId,
                              "cdcDocument",
                              personForm.existingCdcName,
                              personForm.editIndex,
                            )
                          }
                          onChange={(e) =>
                            setPersonForm({
                              ...personForm,
                              cdcDocument: e.target.files[0],
                            })
                          }
                        />
                      </div>
                    </div>
                  )}
                  {/* Secondary ID Proof — hidden for Seafarers who have their own dedicated ID flow */}
                  {personForm.hepType !== "3" && (
                    <>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase">
                          Type of Id proof{" "}
                          {isPersonForeigner(personForm.nationality) && (
                            <span className="text-red-500">*</span>
                          )}
                        </label>
                        <select
                          value={personForm.idProofType}
                          // onChange={(e) =>
                          //   setPersonForm({
                          //     ...personForm,
                          //     idProofType: e.target.value,
                          //   })
                          // }
                          onChange={(e) => {
                            const value = e.target.value;

                            setPersonForm((prev) => ({
                              ...prev,
                              idProofType: value,
                              idProofNumber: "",
                            }));

                            setDlVerification({
                              loading: false,
                              verified: false,
                              message: "",
                              data: null,
                            });
                          }}
                          className={inputClass}
                          disabled={
                            isPersonForeigner(personForm.nationality) ||
                            personForm.hepType === "1"
                          }
                        >
                          <option value="">-- Select --</option>
                          {masterData.idProofTypes.map((t) => (
                            <option
                              key={t.id || t.value}
                              value={t.id || t.value}
                            >
                              {t.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase">
                          {idProofLabel}{" "}
                          {isPersonForeigner(personForm.nationality) && (
                            <span className="text-red-500">*</span>
                          )}
                        </label>
                        <input
                          type="text"
                          readOnly={dlVerification.loading}
                          value={personForm.idProofNumber}
                          // onChange={(e) => {
                          //   const val = e.target.value.toUpperCase();
                          //   setPersonForm({ ...personForm, idProofNumber: val });
                          //   if (val) {
                          //     const isValid = validatePersonField("idProofNumber", val, {
                          //       idProofType: personForm.idProofType,
                          //     });
                          //     if (isValid) {
                          //       const valClean = val.replace(/[\s-]/g, "");
                          //       checkBlacklistStatus("DRIVER", valClean);
                          //       checkBlacklistStatus("PERSON", valClean);
                          //     }
                          //   }
                          // }}
                          onChange={(e) => {
                            if (personForm.idProofType === "1") {
                              handleDLChange(e);

                              const valClean = e.target.value
                                .replace(/[\s-]/g, "")
                                .toUpperCase();

                              checkBlacklistStatus("DRIVER", valClean);
                              checkBlacklistStatus("PERSON", valClean);
                            } else {
                              const val = e.target.value.toUpperCase();

                              setPersonForm((prev) => ({
                                ...prev,
                                idProofNumber: val,
                              }));

                              if (val) {
                                const isValid = validatePersonField(
                                  "idProofNumber",
                                  val,
                                  {
                                    idProofType: personForm.idProofType,
                                  },
                                );

                                if (isValid) {
                                  const valClean = val.replace(/[\s-]/g, "");

                                  checkBlacklistStatus("DRIVER", valClean);
                                  checkBlacklistStatus("PERSON", valClean);
                                }
                              }
                            }
                          }}
                          onBlur={(e) => {
                            if (e.target.value) {
                              validatePersonField(
                                "idProofNumber",
                                e.target.value,
                                {
                                  idProofType: personForm.idProofType,
                                },
                              );
                            }
                          }}
                          className={`${inputClass} ${personErrors.idProofNumber ? "border-red-400 focus:border-red-500 focus:ring-red-500/20" : ""}`}
                          placeholder={idProofPlaceholder}
                        />
                        {dlVerification.loading && (
                          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-orange-500" />
                        )}
                        {personErrors.idProofNumber && (
                          <p className="text-xs text-red-500 mt-0.5 font-medium">
                            {personErrors.idProofNumber}
                          </p>
                        )}
                        {dlVerification.message && (
                          <p
                            className={`text-xs mt-1 font-medium ${
                              dlVerification.verified
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {dlVerification.message}
                          </p>
                        )}
                        {!personErrors.idProofNumber &&
                          personForm.idProofNumber &&
                          (blacklistWarnings[
                            "DRIVER_" +
                              personForm.idProofNumber
                                .replace(/[\s-]/g, "")
                                .toUpperCase()
                          ] ||
                            blacklistWarnings[
                              "PERSON_" +
                                personForm.idProofNumber
                                  .replace(/[\s-]/g, "")
                                  .toUpperCase()
                            ]) && (
                            <div className="mt-1.5 flex items-start gap-1.5 bg-red-50 border border-red-300 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-red-700 animate-in fade-in duration-200">
                              <AlertCircle className="h-3.5 w-3.5 text-red-600 shrink-0 mt-0.5" />
                              <span>
                                PORT BLACKLISTED —{" "}
                                {(
                                  blacklistWarnings[
                                    "DRIVER_" +
                                      personForm.idProofNumber
                                        .replace(/[\s-]/g, "")
                                        .toUpperCase()
                                  ] ||
                                  blacklistWarnings[
                                    "PERSON_" +
                                      personForm.idProofNumber
                                        .replace(/[\s-]/g, "")
                                        .toUpperCase()
                                  ]
                                )?.replace("⚠️ BLACKLISTED ", "")}
                              </span>
                            </div>
                          )}
                      </div>
                    </>
                  )}

                  {/* Photo upload — always shown */}
                  <div className="space-y-1.5 md:col-span-2 max-w-sm">
                    <label className="text-xs font-bold text-slate-700 uppercase">
                      Upload Photo <span className="text-red-500">*</span>
                    </label>

                    {!personForm.photo && !personForm.existingPhotoName && (
                      <div className="mb-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <FileUploadBox
                            label="Upload Photo"
                            fileType="image"
                            isRequired={true}
                            file={personForm.photo}
                            existingFileName={personForm.existingPhotoName}
                            onChange={(e) =>
                              setPersonForm({
                                ...personForm,
                                photo: e.target.files[0],
                              })
                            }
                          />

                          <button
                            type="button"
                            onClick={() => setFaceCaptureOpen(true)}
                            className="inline-flex h-10 items-center justify-center rounded-lg border border-[#0a1e4d] bg-white px-4 text-sm font-bold text-[#0a1e4d] transition-colors hover:bg-[#0a1e4d] hover:text-white"
                          >
                            Capture Photo
                          </button>
                        </div>
                      </div>
                    )}

                    {personForm.photo || personForm.existingPhotoName ? (
                      <div className="relative w-24 h-28 rounded-xl border border-slate-300 overflow-hidden shadow-sm group">
                        <img
                          src={
                            personForm.photo instanceof File
                              ? URL.createObjectURL(personForm.photo)
                              : personForm.masterId
                                ? `${AGENT_API}/pass-request/viewMasterDocument?masterId=${personForm.masterId}&entityType=person&documentType=personPhoto`
                                : personForm.existingPassRequestId
                                  ? `${AGENT_API}/pass-request/viewPassRequestsDocument?passRequestId=${personForm.existingPassRequestId}&entityType=person&entityId=${personForm.id}&documentType=personPhoto`
                                  : ""
                          }
                          alt="Profile"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setPersonForm({
                              ...personForm,
                              photo: null,
                              existingPhotoName: null,
                            })
                          }
                          className="absolute top-1.5 right-1.5 bg-white/90 hover:bg-red-500 text-slate-700 hover:text-white p-1 rounded-full shadow-sm transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : null}

                    {(personForm.photo || personForm.existingPhotoName) && (
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => setFaceCaptureOpen(true)}
                          className="inline-flex h-8 items-center justify-center rounded-md border border-[#0a1e4d] bg-white px-3 text-xs font-bold text-[#0a1e4d] transition-colors hover:bg-[#0a1e4d] hover:text-white"
                        >
                          Capture Photo
                        </button>
                      </div>
                    )}
                  </div>
                  {personForm.hepType !== "3" && (
                    <div className="space-y-1.5 md:col-span-2 max-w-sm">
                      <label className="text-xs font-bold text-slate-700 uppercase">
                        Copy of{" "}
                        {getLabelById(
                          masterData.idProofTypes,
                          personForm.idProofType,
                          "label",
                        ) || "ID Proof"}{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <FileUploadBox
                        file={personForm.idProofFile}
                        existingFileName={personForm.existingIdProofName}
                        onView={() =>
                          handleViewDoc(
                            personForm.existingPassRequestId,
                            "personIdProof",
                            personForm.existingIdProofName,
                            personForm.editIndex,
                          )
                        }
                        onChange={(e) =>
                          setPersonForm({
                            ...personForm,
                            idProofFile: e.target.files[0],
                          })
                        }
                      />
                    </div>
                  )}
                  {isPersonForeigner(personForm.nationality) && (
                    <>
                      <div className="space-y-1.5 md:col-span-2 max-w-sm">
                        <label className="text-xs font-bold text-slate-700 uppercase">
                          Visa <span className="text-red-500">*</span>
                        </label>
                        <FileUploadBox
                          file={personForm.visaDoc}
                          existingFileName={personForm.existingVisaDocName}
                          onView={() =>
                            handleViewDoc(
                              personForm.existingPassRequestId,
                              "visaDoc",
                              personForm.existingVisaDocName,
                              personForm.editIndex,
                            )
                          }
                          onChange={(e) =>
                            setPersonForm({
                              ...personForm,
                              visaDoc: e.target.files[0],
                            })
                          }
                        />
                      </div>
                      <div className="space-y-1.5 md:col-span-2 max-w-sm">
                        <label className="text-xs font-bold text-slate-700 uppercase">
                          Immigration Clearance{" "}
                          <span className="text-red-500">*</span>
                        </label>
                        <FileUploadBox
                          file={personForm.immigrationDoc}
                          existingFileName={
                            personForm.existingImmigrationDocName
                          }
                          onView={() =>
                            handleViewDoc(
                              personForm.existingPassRequestId,
                              "immigrationDoc",
                              personForm.existingImmigrationDocName,
                              personForm.editIndex,
                            )
                          }
                          onChange={(e) =>
                            setPersonForm({
                              ...personForm,
                              immigrationDoc: e.target.files[0],
                            })
                          }
                        />
                      </div>
                    </>
                  )}
                  {personForm.hepType === "3" && (
                    <div className="space-y-1.5 animate-in zoom-in">
                      <label className="text-xs text-orange-600 font-black uppercase tracking-wider">
                        Seafarer Pass For{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={personForm.seafarerPassFor}
                        onChange={(e) =>
                          setPersonForm({
                            ...personForm,
                            seafarerPassFor: e.target.value,
                          })
                        }
                        className="w-full h-10 border-2 border-orange-300 bg-orange-50 rounded-lg text-sm focus:ring-2 focus:ring-orange-500/30 px-3 outline-none font-bold text-orange-900"
                      >
                        <option>Sign-On</option>
                        <option>Sign-Off</option>
                        <option>Shore Leave</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>

              <div className="border border-slate-300 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[#0a1e4d] text-white">
                    <tr>
                      <th className="p-3 text-xs font-semibold border-r border-white/10 uppercase tracking-wider">
                        Type of Pass <span className="text-orange-400">*</span>
                      </th>
                      <th className="p-3 text-xs font-semibold border-r border-white/10 uppercase tracking-wider">
                        Pass Period <span className="text-orange-400">*</span>
                      </th>
                      <th className="p-3 text-xs font-semibold border-r border-white/10 uppercase tracking-wider">
                        Date From <span className="text-orange-400">*</span>
                      </th>
                      <th className="p-3 text-xs font-semibold border-r border-white/10 uppercase tracking-wider">
                        Date To <span className="text-orange-400">*</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    <tr>
                      <td className="p-3 border-r border-slate-200">
                        <select
                          value={personForm.passType}
                          onChange={(e) =>
                            setPersonForm({
                              ...personForm,
                              passType: e.target.value,
                            })
                          }
                          className="w-full h-10 border border-slate-300 rounded-lg text-sm px-3 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all"
                        >
                          {masterData.passTypes
                            .filter((t) => {
                              const val = String(t.id || t.value);
                              const name = String(
                                t.label || t.name || "",
                              ).toUpperCase();
                              if (String(personForm.hepType) === "3") {
                                if (val !== "1" && !name.includes("DAILY"))
                                  return false;
                              }
                              return true;
                            })
                            .map((t) => {
                              const val = String(t.id || t.value);
                              const name = String(
                                t.label || t.name || "",
                              ).toUpperCase();
                              let isLocked = false;
                              let lockSuffix = "";
                              if (
                                generalForm.remainingDays !== null &&
                                generalForm.remainingDays !== undefined &&
                                !generalForm.isLicenseExpired
                              ) {
                                if (
                                  (val === "2" || name.includes("MONTHLY")) &&
                                  generalForm.remainingDays < 30
                                ) {
                                  isLocked = true;
                                  lockSuffix = ` (Locked — License expires in ${generalForm.remainingDays} days)`;
                                } else if (
                                  (val === "3" ||
                                    name.includes("YEARLY") ||
                                    name.includes("ANNUAL")) &&
                                  generalForm.remainingDays < 365
                                ) {
                                  isLocked = true;
                                  lockSuffix = ` (Locked — License expires in ${generalForm.remainingDays} days)`;
                                }
                              }
                              return (
                                <option
                                  key={t.id || t.value}
                                  value={t.id || t.value}
                                  disabled={isLocked}
                                >
                                  {(t.label || t.name) + lockSuffix}
                                </option>
                              );
                            })}
                        </select>
                      </td>
                      <td className="p-3 border-r border-slate-200">
                        <div className="flex items-center gap-3">
                          <input
                            type="number"
                            value={personForm.passPeriod}
                            min="1"
                            max={
                              String(personForm.passType) === "1"
                                ? generalForm.remainingDays !== null &&
                                  generalForm.remainingDays !== undefined &&
                                  generalForm.remainingDays < 7
                                  ? String(
                                      Math.max(1, generalForm.remainingDays),
                                    )
                                  : "7"
                                : "1"
                            }
                            disabled={String(personForm.passType) !== "1"}
                            onChange={(e) =>
                              setPersonForm({
                                ...personForm,
                                passPeriod: e.target.value,
                              })
                            }
                            className={inputClass}
                          />
                          <span className="text-sm font-bold text-slate-700">
                            Days
                          </span>
                        </div>
                      </td>
                      <td className="p-3 border-r border-slate-200">
                        <div className="relative flex items-center">
                          <input
                            type="text"
                            placeholder="DD/MM/YYYY, hh:mm AM/PM"
                            value={formatDateTimeISOToDisplay(
                              personForm.dateFrom,
                            )}
                            onChange={(e) => {
                              const iso = formatDateTimeDisplayToISO(
                                e.target.value,
                              );
                              if (iso) {
                                setPersonForm((prev) => ({
                                  ...prev,
                                  dateFrom: iso,
                                }));
                              }
                            }}
                            className="w-full h-10 border border-slate-300 rounded-lg text-sm px-3 pr-10 outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium text-slate-800"
                          />
                          <div className="absolute right-2 flex items-center">
                            <input
                              type="datetime-local"
                              id="dateFrom-person-hidden-picker"
                              tabIndex={-1}
                              value={personForm.dateFrom || ""}
                              min={getCurrentDateTime()}
                              onChange={(e) => {
                                if (e.target.value) {
                                  setPersonForm((prev) => ({
                                    ...prev,
                                    dateFrom: e.target.value,
                                  }));
                                }
                              }}
                              className="sr-only"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const picker = document.getElementById(
                                  "dateFrom-person-hidden-picker",
                                );
                                if (
                                  picker &&
                                  typeof picker.showPicker === "function"
                                ) {
                                  picker.showPicker();
                                } else if (picker) {
                                  picker.focus();
                                  picker.click();
                                }
                              }}
                              className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                              title="Choose Date & Time from calendar"
                            >
                              <Calendar className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 border-r border-slate-200 flex items-center gap-2">
                        <input
                          readOnly
                          type="text"
                          value={formatDateTimeISOToDisplay(personForm.dateTo)}
                          className="w-full h-10 bg-slate-100 border border-slate-200 rounded-lg text-sm px-3 text-slate-700 font-bold cursor-not-allowed outline-none"
                        />
                        {String(personForm.passType) === "2" && (
                          <input
                            type="time"
                            title="Valid Upto Time"
                            onChange={(e) =>
                              setPersonForm({
                                ...personForm,
                                validUptoTime: e.target.value,
                              })
                            }
                            className="w-28 h-10 border border-red-300 bg-red-50 rounded-lg text-sm px-2 outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-red-900 font-bold animate-in fade-in"
                          />
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {((personForm.hepType === "1" &&
                personForm.idProofType !== "1") ||
                String(personForm.passType) === "2" ||
                String(personForm.passType) === "3" ||
                String(personForm.accessArea)
                  .toUpperCase()
                  .includes("OIL JETTY") ||
                String(personForm.accessArea) === "1") && (
                <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-3 flex items-center gap-2">
                    <FileCheck2 className="h-5 w-5 text-orange-500" /> 2.
                    Mandatory Documents
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {personForm.hepType === "1" && ( // 1 = Driver ID
                      <FileUploadBox
                        label="Driver Licence"
                        isRequired
                        file={personForm.driverLicence}
                        existingFileName={personForm.existingDlName}
                        onView={() =>
                          handleViewDoc(
                            personForm.existingPassRequestId,
                            "driverLicense",
                            personForm.existingDlName,
                            personForm.editIndex,
                          )
                        }
                        onChange={(e) =>
                          setPersonForm({
                            ...personForm,
                            driverLicence: e.target.files[0],
                          })
                        }
                      />
                    )}
                    {(String(personForm.passType) === "2" ||
                      String(personForm.passType) === "3") && (
                      <FileUploadBox
                        label="Police Verification"
                        isRequired
                        file={personForm.policeVerification}
                        existingFileName={personForm.existingPoliceName}
                        onView={() =>
                          handleViewDoc(
                            personForm.existingPassRequestId,
                            "policeVerification",
                            personForm.existingPoliceName,
                            personForm.editIndex,
                          )
                        }
                        onChange={(e) =>
                          setPersonForm({
                            ...personForm,
                            policeVerification: e.target.files[0],
                          })
                        }
                      />
                    )}
                    {personForm.hepType === "3" && (
                      <FileUploadBox
                        label="Passport"
                        isRequired
                        file={personForm.passportDoc}
                        existingFileName={personForm.existingPassportName}
                        onView={() =>
                          handleViewDoc(
                            personForm.existingPassRequestId,
                            "passportDoc",
                            personForm.existingPassportName,
                            personForm.editIndex,
                          )
                        }
                        onChange={(e) =>
                          setPersonForm({
                            ...personForm,
                            passportDoc: e.target.files[0],
                          })
                        }
                      />
                    )}
                    {(String(personForm.accessArea)
                      .toUpperCase()
                      .includes("OIL JETTY") ||
                      String(personForm.accessArea) === "1") && (
                      <FileUploadBox
                        label="Entry Authorization Document"
                        isRequired
                        file={personForm.entryAuthorization}
                        existingFileName={personForm.existingEntryAuthName}
                        onView={() =>
                          handleViewDoc(
                            personForm.existingPassRequestId,
                            "entryAuthorization",
                            personForm.existingEntryAuthName,
                            personForm.editIndex,
                          )
                        }
                        onChange={(e) =>
                          setPersonForm({
                            ...personForm,
                            entryAuthorization: e.target.files[0],
                          })
                        }
                      />
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 px-6 py-5 border-t border-slate-200 bg-white rounded-b-2xl">
              <button
                onClick={handleClearPerson}
                className="bg-white border border-slate-300 text-slate-700 px-8 py-2.5 rounded-xl shadow-sm text-sm font-bold hover:bg-slate-50 transition-colors uppercase tracking-wider"
              >
                Clear
              </button>
              <button
                onClick={handleAddPerson}
                className="bg-orange-600 text-white px-10 py-2.5 rounded-xl shadow-lg shadow-orange-600/20 text-sm font-bold hover:bg-orange-700 transition-colors uppercase tracking-wider flex items-center gap-2"
              >
                {editingPersonIndex !== null ? "Update Person" : "Add Person"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VEHICLE MODAL */}
      {modals.vehicle && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in zoom-in-95 duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl flex flex-col max-h-[95vh] border border-slate-200 overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-[#0a1e4d] text-white">
              <div className="flex items-center gap-3">
                <div className="bg-white/10 p-2 rounded-lg">
                  <Truck className="h-5 w-5 text-orange-400" />
                </div>
                <h2 className="text-xl font-bold tracking-wide">
                  {editingVehicleIndex !== null
                    ? "Edit Vehicle"
                    : "Add Vehicle"}
                </h2>
                <span className="text-[10px] text-white/80 ml-4 font-medium tracking-wider bg-white/10 px-2.5 py-1 rounded-full border border-white/20">
                  All documents in red asterisk(*) must be .pdf
                </span>
              </div>
              <button
                onClick={() => toggleModal("vehicle", false)}
                className="text-white/70 hover:text-white hover:bg-white/10 p-2 rounded-xl transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-8 overflow-y-auto flex-1 bg-slate-50/50 space-y-8">
              {!editingVehicleIndex && (
                <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center gap-4 shadow-sm">
                  <label className="text-xs font-black text-[#0a1e4d] uppercase tracking-wider whitespace-nowrap">
                    Select from Vehicle Fleet:
                  </label>
                  <Select
                    options={vehicleOptions}
                    value={vehicleOptions.find(
                      (opt) => opt.value === String(vehicleForm.masterId || ""),
                    )}
                    onChange={(selected) => {
                      const id = selected?.value || "";
                      handleMasterVehicleSelect({ target: { value: id } });
                    }}
                    placeholder="Search vehicle..."
                    isClearable
                    className="max-w-md w-full"
                    classNamePrefix="react-select"
                  />
                </div>
              )}

              <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-3">
                  1. Vehicle Details
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-x-5 gap-y-5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase">
                      Registration No. <span className="text-red-500">*</span>
                    </label>
                    {(() => {
                      const hasVal = !!vehicleForm.regNo.trim();
                      const hasError = !!vehicleErrors.regNo;

                      let customBorderClass =
                        "border-slate-300 focus:ring-orange-500/20 focus:border-orange-500";
                      if (hasVal) {
                        customBorderClass = hasError
                          ? "border-red-400 focus:border-red-500 focus:ring-red-500/20"
                          : "border-emerald-500 focus:border-emerald-500 focus:ring-emerald-500/20";
                      }

                      const baseInputClass =
                        "w-full h-10 rounded-lg text-sm px-3 shadow-sm bg-white outline-none transition-all border focus:ring-2";

                      return (
                        <>
                          {/* <input
                            type="text"
                            value={vehicleForm.regNo}
                            onChange={(e) => {
                              const val = e.target.value.toUpperCase().slice(0, 13);
                              setVehicleForm({ ...vehicleForm, regNo: val });
                              if (val.length >= 8) validateVehicleField("regNo", val);
                              // Real-time blacklist check — fires as soon as reg number format is valid
                              if (/^[A-Z]{2}[-\s]?[0-9]{1,2}[-\s]?[A-Z]{1,3}[-\s]?[0-9]{4}$/i.test(val)) {
                                checkBlacklistStatus("VEHICLE", val.replace(/[\s-]/g, ""));
                              }
                            }}
                            onBlur={(e) => {
                              validateVehicleField("regNo", e.target.value);
                            }}
                            className={`${baseInputClass} ${customBorderClass} uppercase font-bold text-[#0a1e4d] tracking-wider`}
                            placeholder="TN-XX-XX-XXXX"
                            maxLength={13}
                          /> */}
                          <div className="relative">
                            <input
                              type="text"
                              value={vehicleForm.regNo}
                              readOnly={vehicleVerification.loading}
                              onChange={handleVehicleNumberChange}
                              // onChange={(e) => {
                              //   const val = e.target.value.toUpperCase().slice(0, 13);
                              //   setVehicleForm({ ...vehicleForm, regNo: val });
                              //   if (val.length >= 8) validateVehicleField("regNo", val);
                              //   // Real-time blacklist check — fires as soon as reg number format is valid
                              //   if (/^[A-Z]{2}[-\s]?[0-9]{1,2}[-\s]?[A-Z]{1,3}[-\s]?[0-9]{4}$/i.test(val)) {
                              //     checkBlacklistStatus("VEHICLE", val.replace(/[\s-]/g, ""));
                              //   }
                              // }}
                              onBlur={(e) => {
                                validateVehicleField("regNo", e.target.value);
                              }}
                              className={`${baseInputClass} ${customBorderClass} uppercase font-bold text-[#0a1e4d] tracking-wider`}
                              placeholder="TN-XX-XX-XXXX"
                              maxLength={13}
                            />
                            {vehicleVerification.loading && (
                              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin h-4 w-4 text-orange-500" />
                            )}
                          </div>
                          {hasVal && (
                            <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold transition-all">
                              {hasError ? (
                                <>
                                  <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                                  <span className="text-red-500">
                                    {vehicleErrors.regNo}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                  <span className="text-emerald-600">
                                    Vehicle number format is valid
                                  </span>
                                </>
                              )}
                            </div>
                          )}
                          {!hasError &&
                            blacklistWarnings[
                              "VEHICLE_" +
                                vehicleForm.regNo.replace(/[\s-]/g, "")
                            ] && (
                              <div className="mt-1.5 flex items-start gap-1.5 bg-red-50 border border-red-300 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-red-700 animate-in fade-in duration-200">
                                <AlertCircle className="h-3.5 w-3.5 text-red-600 shrink-0 mt-0.5" />
                                <span>
                                  PORT BLACKLISTED —{" "}
                                  {blacklistWarnings[
                                    "VEHICLE_" +
                                      vehicleForm.regNo.replace(/[\s-]/g, "")
                                  ]?.replace("⚠️ BLACKLISTED ", "")}
                                </span>
                              </div>
                            )}
                          {vehicleVerification.message && (
                            <p
                              className={`text-xs mt-1 ${
                                vehicleVerification.verified
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              {vehicleVerification.message}
                            </p>
                          )}
                        </>
                      );
                    })()}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase">
                      Vehicle Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={vehicleForm.type}
                      onChange={(e) =>
                        setVehicleForm({ ...vehicleForm, type: e.target.value })
                      }
                      className={inputClass}
                    >
                      <option value="">Select Type</option>
                      {masterData.vehicleTypes.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {/* <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase">
                      RFID Card Number
                    </label>
                    <input
                      type="text"
                      value={vehicleForm.cardNumber}
                      onChange={(e) =>
                        setVehicleForm({
                          ...vehicleForm,
                          cardNumber: e.target.value,
                        })
                      }
                      className={inputClass}
                      placeholder="Enter RFID if available"
                    />
                  </div> */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase">
                      Access Area <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={vehicleForm.accessArea}
                      onChange={(e) =>
                        setVehicleForm({
                          ...vehicleForm,
                          accessArea: e.target.value,
                        })
                      }
                      className={inputClass}
                    >
                      <option value="">Select Access Area</option>
                      {masterData.accessAreas.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase">
                      Insurance Expiry Date
                    </label>

                    <div className="relative flex items-center">
                      <input
                        type="text"
                        placeholder="DD/MM/YYYY"
                        maxLength={10}
                        value={formatISOToDDMMYYYY(vehicleForm.insuranceExpiry)}
                        readOnly={ulipVehicleFetched}
                        onChange={(e) => {
                          // Once VAHAN has returned data,
                          // this field must not be editable.
                          if (ulipVehicleFetched) return;

                          let input = e.target.value.replace(/\D/g, "");

                          if (input.length > 8) {
                            input = input.substring(0, 8);
                          }

                          let formatted = "";

                          if (input.length > 0) {
                            formatted += input.substring(0, 2);

                            if (input.length >= 3) {
                              formatted += "/" + input.substring(2, 4);

                              if (input.length >= 5) {
                                formatted += "/" + input.substring(4, 8);
                              }
                            }
                          }

                          const iso = formatDDMMYYYYToISO(formatted);
                          const val = iso || formatted;

                          setVehicleForm((prev) => ({
                            ...prev,
                            insuranceExpiry: val,
                          }));

                          validateVehicleField("insuranceExpiry", val);
                        }}
                        className={`${inputClass} pr-10 ${
                          vehicleErrors.insuranceExpiry ? "border-red-400" : ""
                        } ${
                          ulipVehicleFetched
                            ? "bg-slate-50 cursor-not-allowed"
                            : ""
                        }`}
                      />

                      {/* =========================================
                          RIGHT SIDE STATUS ICON
                          ========================================= */}
                      <div className="absolute right-2 flex items-center">
                        {ulipVehicleFetched ? (
                          ulipVehicleActive ? (
                            <CheckCircle2
                              className="h-5 w-5 text-blue-600"
                              strokeWidth={2.5}
                              title="Insurance verified by VAHAN"
                            />
                          ) : (
                            <XCircle
                              className="h-5 w-5 text-red-500"
                              strokeWidth={2.5}
                              title="Vehicle is inactive according to VAHAN"
                            />
                          )
                        ) : (
                          <>
                            <input
                              type="date"
                              id="ins-hidden-picker"
                              tabIndex={-1}
                              value={
                                vehicleForm.insuranceExpiry &&
                                vehicleForm.insuranceExpiry.includes("-")
                                  ? vehicleForm.insuranceExpiry
                                  : formatDDMMYYYYToISO(
                                      vehicleForm.insuranceExpiry,
                                    )
                              }
                              onChange={(e) => {
                                if (ulipVehicleFetched) return;

                                if (e.target.value) {
                                  setVehicleForm((prev) => ({
                                    ...prev,
                                    insuranceExpiry: e.target.value,
                                  }));

                                  validateVehicleField(
                                    "insuranceExpiry",
                                    e.target.value,
                                  );
                                }
                              }}
                              className="sr-only"
                            />

                            <button
                              type="button"
                              onClick={() => {
                                const picker =
                                  document.getElementById("ins-hidden-picker");

                                if (
                                  picker &&
                                  typeof picker.showPicker === "function"
                                ) {
                                  picker.showPicker();
                                } else if (picker) {
                                  picker.focus();
                                  picker.click();
                                }
                              }}
                              className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                              title="Choose Insurance Expiry Date"
                            >
                              <Calendar className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {vehicleErrors.insuranceExpiry && (
                      <p className="text-xs text-red-500 mt-0.5 font-medium">
                        {vehicleErrors.insuranceExpiry}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase">
                      RC Validity Date
                    </label>

                    <div className="relative flex items-center">
                      <input
                        type="text"
                        placeholder="DD/MM/YYYY"
                        maxLength={10}
                        value={formatISOToDDMMYYYY(vehicleForm.rcValidity)}
                        readOnly={ulipVehicleFetched}
                        onChange={(e) => {
                          // Once VAHAN has returned data,
                          // this field must not be editable.
                          if (ulipVehicleFetched) return;

                          let input = e.target.value.replace(/\D/g, "");

                          if (input.length > 8) {
                            input = input.substring(0, 8);
                          }

                          let formatted = "";

                          if (input.length > 0) {
                            formatted += input.substring(0, 2);

                            if (input.length >= 3) {
                              formatted += "/" + input.substring(2, 4);

                              if (input.length >= 5) {
                                formatted += "/" + input.substring(4, 8);
                              }
                            }
                          }

                          const iso = formatDDMMYYYYToISO(formatted);
                          const val = iso || formatted;

                          setVehicleForm((prev) => ({
                            ...prev,
                            rcValidity: val,
                          }));

                          validateVehicleField("rcValidity", val);
                        }}
                        className={`${inputClass} pr-10 ${
                          vehicleErrors.rcValidity ? "border-red-400" : ""
                        } ${
                          ulipVehicleFetched
                            ? "bg-slate-50 cursor-not-allowed"
                            : ""
                        }`}
                      />

                      {/* =========================================
                          RIGHT SIDE STATUS ICON
                          ========================================= */}
                      <div className="absolute right-2 flex items-center">
                        {ulipVehicleFetched ? (
                          ulipVehicleActive ? (
                            <CheckCircle2
                              className="h-5 w-5 text-blue-600"
                              strokeWidth={2.5}
                              title="RC validity verified by VAHAN"
                            />
                          ) : (
                            <XCircle
                              className="h-5 w-5 text-red-500"
                              strokeWidth={2.5}
                              title="Vehicle is inactive according to VAHAN"
                            />
                          )
                        ) : (
                          <>
                            <input
                              type="date"
                              id="rc-hidden-picker"
                              tabIndex={-1}
                              value={
                                vehicleForm.rcValidity &&
                                vehicleForm.rcValidity.includes("-")
                                  ? vehicleForm.rcValidity
                                  : formatDDMMYYYYToISO(vehicleForm.rcValidity)
                              }
                              onChange={(e) => {
                                if (ulipVehicleFetched) return;

                                if (e.target.value) {
                                  setVehicleForm((prev) => ({
                                    ...prev,
                                    rcValidity: e.target.value,
                                  }));

                                  validateVehicleField(
                                    "rcValidity",
                                    e.target.value,
                                  );
                                }
                              }}
                              className="sr-only"
                            />

                            <button
                              type="button"
                              onClick={() => {
                                const picker =
                                  document.getElementById("rc-hidden-picker");

                                if (
                                  picker &&
                                  typeof picker.showPicker === "function"
                                ) {
                                  picker.showPicker();
                                } else if (picker) {
                                  picker.focus();
                                  picker.click();
                                }
                              }}
                              className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                              title="Choose RC Validity Date"
                            >
                              <Calendar className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {vehicleErrors.rcValidity && (
                      <p className="text-xs text-red-500 mt-0.5 font-medium">
                        {vehicleErrors.rcValidity}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-8 border border-slate-300 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[#0a1e4d] text-white">
                    <tr>
                      <th className="p-3 text-xs font-semibold border-r border-white/10 uppercase tracking-wider">
                        Type of Pass <span className="text-orange-400">*</span>
                      </th>
                      <th className="p-3 text-xs font-semibold border-r border-white/10 uppercase tracking-wider">
                        Pass Period <span className="text-orange-400">*</span>
                      </th>
                      <th className="p-3 text-xs font-semibold border-r border-white/10 uppercase tracking-wider">
                        Date From <span className="text-orange-400">*</span>
                      </th>
                      <th className="p-3 text-xs font-semibold border-r border-white/10 uppercase tracking-wider">
                        Date To <span className="text-orange-400">*</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    <tr>
                      <td className="p-3 border-r border-slate-200">
                        <select
                          value={vehicleForm.passType}
                          onChange={(e) =>
                            setVehicleForm({
                              ...vehicleForm,
                              passType: e.target.value,
                            })
                          }
                          className="w-full h-10 border border-slate-300 rounded-lg text-sm px-3 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all"
                        >
                          {masterData.passTypes.map((t) => {
                            const val = String(t.id || t.value);
                            const name = String(
                              t.label || t.name || "",
                            ).toUpperCase();
                            let isLocked = false;
                            let lockSuffix = "";
                            if (
                              generalForm.remainingDays !== null &&
                              generalForm.remainingDays !== undefined &&
                              !generalForm.isLicenseExpired
                            ) {
                              if (
                                (val === "2" || name.includes("MONTHLY")) &&
                                generalForm.remainingDays < 30
                              ) {
                                isLocked = true;
                                lockSuffix = ` (Locked — License expires in ${generalForm.remainingDays} days)`;
                              } else if (
                                (val === "3" ||
                                  name.includes("YEARLY") ||
                                  name.includes("ANNUAL")) &&
                                generalForm.remainingDays < 365
                              ) {
                                isLocked = true;
                                lockSuffix = ` (Locked — License expires in ${generalForm.remainingDays} days)`;
                              }
                            }
                            return (
                              <option
                                key={t.id || t.value}
                                value={t.id || t.value}
                                disabled={isLocked}
                              >
                                {(t.label || t.name) + lockSuffix}
                              </option>
                            );
                          })}
                        </select>
                      </td>
                      <td className="p-3 border-r border-slate-200">
                        <div className="flex items-center gap-3">
                          <input
                            type="number"
                            value={vehicleForm.passPeriod}
                            min="1"
                            max={
                              String(vehicleForm.passType) === "1"
                                ? generalForm.remainingDays !== null &&
                                  generalForm.remainingDays !== undefined &&
                                  generalForm.remainingDays < 7
                                  ? String(
                                      Math.max(1, generalForm.remainingDays),
                                    )
                                  : "7"
                                : "1"
                            }
                            disabled={String(vehicleForm.passType) !== "1"}
                            onChange={(e) =>
                              setVehicleForm({
                                ...vehicleForm,
                                passPeriod: e.target.value,
                              })
                            }
                            className={inputClass}
                          />
                          <span className="text-sm font-bold text-slate-700">
                            Days
                          </span>
                        </div>
                      </td>
                      <td className="p-3 border-r border-slate-200">
                        <div className="relative flex items-center">
                          <input
                            type="text"
                            placeholder="DD/MM/YYYY, hh:mm AM/PM"
                            value={formatDateTimeISOToDisplay(
                              vehicleForm.dateFrom,
                            )}
                            onChange={(e) => {
                              const iso = formatDateTimeDisplayToISO(
                                e.target.value,
                              );
                              if (iso) {
                                setVehicleForm((prev) => ({
                                  ...prev,
                                  dateFrom: iso,
                                }));
                              }
                            }}
                            className="w-full h-10 border border-slate-300 rounded-lg text-sm px-3 pr-10 outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium text-slate-800"
                          />
                          <div className="absolute right-2 flex items-center">
                            <input
                              type="datetime-local"
                              id="dateFrom-vehicle-hidden-picker"
                              tabIndex={-1}
                              value={vehicleForm.dateFrom || ""}
                              min={getCurrentDateTime()}
                              onChange={(e) => {
                                if (e.target.value) {
                                  setVehicleForm((prev) => ({
                                    ...prev,
                                    dateFrom: e.target.value,
                                  }));
                                }
                              }}
                              className="sr-only"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const picker = document.getElementById(
                                  "dateFrom-vehicle-hidden-picker",
                                );
                                if (
                                  picker &&
                                  typeof picker.showPicker === "function"
                                ) {
                                  picker.showPicker();
                                } else if (picker) {
                                  picker.focus();
                                  picker.click();
                                }
                              }}
                              className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                              title="Choose Date & Time from calendar"
                            >
                              <Calendar className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 border-r border-slate-200">
                        <input
                          readOnly
                          type="text"
                          value={formatDateTimeISOToDisplay(vehicleForm.dateTo)}
                          className="w-full h-10 bg-slate-100 border border-slate-200 rounded-lg text-sm px-3 text-slate-700 font-bold cursor-not-allowed outline-none"
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-3 flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-orange-500" /> 2. Mandatory
                  Documents
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <FileUploadBox
                    label="RC/NOC"
                    isRequired
                    file={vehicleForm.rcDocument}
                    existingFileName={vehicleForm.existingRcName}
                    onView={() =>
                      handleViewDoc(
                        vehicleForm.existingPassRequestId,
                        "vehicleRC",
                        vehicleForm.existingRcName,
                        vehicleForm.editIndex,
                      )
                    }
                    onChange={(e) =>
                      setVehicleForm({
                        ...vehicleForm,
                        rcDocument: e.target.files[0],
                      })
                    }
                  />
                  <FileUploadBox
                    label="Insurance"
                    isRequired
                    file={vehicleForm.insuranceDocument}
                    existingFileName={vehicleForm.existingInsName}
                    onView={() =>
                      handleViewDoc(
                        vehicleForm.existingPassRequestId,
                        "vehicleInsurance",
                        vehicleForm.existingInsName,
                        vehicleForm.editIndex,
                      )
                    }
                    onChange={(e) =>
                      setVehicleForm({
                        ...vehicleForm,
                        insuranceDocument: e.target.files[0],
                      })
                    }
                  />
                  {String(vehicleForm.passType) !== "1" && (
                    <FileUploadBox
                      label="Permit"
                      isRequired
                      file={vehicleForm.permit}
                      existingFileName={vehicleForm.existingPermitName}
                      onView={() =>
                        handleViewDoc(
                          vehicleForm.existingPassRequestId,
                          "vehiclePermit",
                          vehicleForm.existingPermitName,
                          vehicleForm.editIndex,
                        )
                      }
                      onChange={(e) =>
                        setVehicleForm({
                          ...vehicleForm,
                          permit: e.target.files[0],
                        })
                      }
                    />
                  )}
                  <FileUploadBox
                    label="Fitness Certificate"
                    isRequired
                    file={vehicleForm.fitnessCert}
                    existingFileName={vehicleForm.existingFitnessName}
                    onView={() =>
                      handleViewDoc(
                        vehicleForm.existingPassRequestId,
                        "vehicleFitness",
                        vehicleForm.existingFitnessName,
                        vehicleForm.editIndex,
                      )
                    }
                    onChange={(e) =>
                      setVehicleForm({
                        ...vehicleForm,
                        fitnessCert: e.target.files[0],
                      })
                    }
                  />
                  {(String(vehicleForm.accessArea)
                    .toUpperCase()
                    .includes("OIL JETTY") ||
                    String(vehicleForm.accessArea) === "1") && (
                    <FileUploadBox
                      label="Spark Arrester Certificate"
                      isRequired
                      file={vehicleForm.sparkArrester}
                      existingFileName={vehicleForm.existingSparkArresterName}
                      onView={() =>
                        handleViewDoc(
                          vehicleForm.existingPassRequestId,
                          "sparkArrester",
                          vehicleForm.existingSparkArresterName,
                          vehicleForm.editIndex,
                        )
                      }
                      onChange={(e) =>
                        setVehicleForm({
                          ...vehicleForm,
                          sparkArrester: e.target.files[0],
                        })
                      }
                    />
                  )}
                  {["2", "3", "MONTHLY", "ANNUAL", "YEARLY"].includes(
                    String(vehicleForm.passType),
                  ) && (
                    <FileUploadBox
                      label="Twist Lock Certificate"
                      isRequired
                      file={vehicleForm.twistLock}
                      existingFileName={vehicleForm.existingTwistLockName}
                      onView={() =>
                        handleViewDoc(
                          vehicleForm.existingPassRequestId,
                          "twistLock",
                          vehicleForm.existingTwistLockName,
                          vehicleForm.editIndex,
                        )
                      }
                      onChange={(e) =>
                        setVehicleForm({
                          ...vehicleForm,
                          twistLock: e.target.files[0],
                        })
                      }
                    />
                  )}

                  {(["2", "3", "MONTHLY", "ANNUAL", "YEARLY"].includes(
                    String(vehicleForm.passType),
                  ) ||
                    ((String(vehicleForm.passType) === "1" ||
                      String(vehicleForm.passType).toUpperCase() === "DAILY") &&
                      (String(vehicleForm.accessArea)
                        .toUpperCase()
                        .includes("OIL JETTY") ||
                        String(vehicleForm.accessArea) === "1"))) && (
                    <FileUploadBox
                      label="Request Letters"
                      isRequired
                      file={vehicleForm.requestLetter}
                      existingFileName={vehicleForm.existingReqName}
                      onView={() =>
                        handleViewDoc(
                          vehicleForm.existingPassRequestId,
                          "vehicleRequestLetter",
                          vehicleForm.existingReqName,
                          vehicleForm.editIndex,
                        )
                      }
                      onChange={(e) =>
                        setVehicleForm({
                          ...vehicleForm,
                          requestLetter: e.target.files[0],
                        })
                      }
                    />
                  )}

                  {["2", "3", "MONTHLY", "ANNUAL", "YEARLY"].includes(
                    String(vehicleForm.passType),
                  ) && (
                    <>
                      <FileUploadBox
                        label="Tax Document"
                        isRequired
                        file={vehicleForm.taxDoc}
                        existingFileName={vehicleForm.existingTaxName}
                        onView={() =>
                          handleViewDoc(
                            vehicleForm.existingPassRequestId,
                            "vehicleTax",
                            vehicleForm.existingTaxName,
                            vehicleForm.editIndex,
                          )
                        }
                        onChange={(e) =>
                          setVehicleForm({
                            ...vehicleForm,
                            taxDoc: e.target.files[0],
                          })
                        }
                      />
                      <FileUploadBox
                        label="Emission Certificate"
                        isRequired
                        file={vehicleForm.emissionCert}
                        existingFileName={vehicleForm.existingEmissionName}
                        onView={() =>
                          handleViewDoc(
                            vehicleForm.existingPassRequestId,
                            "vehicleEmission",
                            vehicleForm.existingEmissionName,
                            vehicleForm.editIndex,
                          )
                        }
                        onChange={(e) =>
                          setVehicleForm({
                            ...vehicleForm,
                            emissionCert: e.target.files[0],
                          })
                        }
                      />
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-5 border-t border-slate-200 bg-white rounded-b-2xl">
              <button
                onClick={() => {
                  setVehicleForm(initialVehicleForm);
                  setEditingVehicleIndex(null);
                }}
                className="bg-white border border-slate-300 text-slate-700 px-8 py-2.5 rounded-xl shadow-sm text-sm font-bold hover:bg-slate-50 transition-colors uppercase tracking-wider"
              >
                Clear
              </button>
              <button
                onClick={handleAddVehicle}
                className="bg-orange-600 text-white px-10 py-2.5 rounded-xl shadow-lg shadow-orange-600/20 text-sm font-bold hover:bg-orange-700 transition-colors uppercase tracking-wider flex items-center gap-2"
              >
                {editingVehicleIndex !== null
                  ? "Update Vehicle"
                  : "Add Vehicle"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* PASS DETAILS READ-ONLY MODAL */}
      {selectedPassDetails && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in zoom-in-95 duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 bg-[#0a1e4d] text-white">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <FileText className="h-5 w-5 text-orange-400" />
                Submitted Application Details
              </h2>
              <button
                onClick={() => setSelectedPassDetails(null)}
                className="text-white/70 hover:text-white transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 bg-slate-50">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
                  <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider">
                    General Information
                  </h3>
                  {(() => {
                    const catInfo = getPassRequestCategory(selectedPassDetails);
                    return (
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${catInfo.badgeClass}`}
                      >
                        {catInfo.label}
                      </span>
                    );
                  })()}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Pass ID
                    </label>
                    <input
                      className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-lg h-10 px-3 text-sm font-bold text-[#0a1e4d] cursor-not-allowed"
                      readOnly
                      type="text"
                      value={
                        selectedPassDetails.referenceNo ||
                        `REQ-${selectedPassDetails.id || selectedPassDetails.passId || "XXXX"}`
                      }
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Company
                    </label>
                    <input
                      className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-lg h-10 px-3 text-sm text-slate-700 cursor-not-allowed"
                      readOnly
                      type="text"
                      value={generalForm.companyName || "Global Marine Traders"}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Application Date
                    </label>
                    <input
                      className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-lg h-10 px-3 text-sm text-slate-700 cursor-not-allowed"
                      readOnly
                      type="text"
                      value={
                        selectedPassDetails.createdAt ||
                        selectedPassDetails.created_at ||
                        selectedPassDetails.submittedAt ||
                        selectedPassDetails.submitted_at ||
                        selectedPassDetails.createdat ||
                        selectedPassDetails.submittedat
                          ? new Date(
                              selectedPassDetails.createdAt ||
                                selectedPassDetails.created_at ||
                                selectedPassDetails.submittedAt ||
                                selectedPassDetails.submitted_at ||
                                selectedPassDetails.createdat ||
                                selectedPassDetails.submittedat,
                            ).toLocaleString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "-"
                      }
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Payment Mode
                    </label>
                    <input
                      className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-lg h-10 px-3 text-sm text-slate-700 cursor-not-allowed"
                      readOnly
                      type="text"
                      value={
                        selectedPassDetails.paymentMode ||
                        selectedPassDetails.payment_mode ||
                        selectedPassDetails.paymentmode ||
                        "-"
                      }
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Net Amount
                    </label>
                    <input
                      className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-lg h-10 px-3 text-sm font-black text-[#0a1e4d] cursor-not-allowed"
                      readOnly
                      type="text"
                      value={`₹ ${parseFloat(selectedPassDetails.netAmount || selectedPassDetails.net_amount || selectedPassDetails.netamount || selectedPassDetails.baseTotal || selectedPassDetails.basetotal || "0").toFixed(2)}`}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Status
                    </label>
                    <input
                      className={`w-full mt-1 bg-slate-50 border border-slate-200 rounded-lg h-10 px-3 text-sm font-bold cursor-not-allowed ${
                        (selectedPassDetails.status || "").toUpperCase() ===
                        "APPROVED"
                          ? "text-emerald-600"
                          : "text-orange-600"
                      }`}
                      readOnly
                      type="text"
                      value={(
                        selectedPassDetails.status || "PENDING"
                      ).toUpperCase()}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <h3 className="font-black text-slate-800 mb-3 border-b border-slate-100 pb-2 text-sm uppercase tracking-wider">
                    Persons Included
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="p-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                            Pass No
                          </th>
                          <th className="p-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                            Name
                          </th>
                          <th className="p-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                            Pass Type
                          </th>
                          <th className="p-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                            Status
                          </th>
                          <th className="p-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 text-center">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedPassDetails.persons &&
                        selectedPassDetails.persons.length > 0 ? (
                          selectedPassDetails.persons.map((p, i) => (
                            <tr
                              key={i}
                              className="hover:bg-blue-50 cursor-pointer transition-colors"
                              onClick={() =>
                                setEntityModal({
                                  isOpen: true,
                                  data: p,
                                  type: "person",
                                })
                              }
                            >
                              <td className="p-3 text-xs font-mono font-bold text-[#0a1e4d]">
                                {p.personPassNo || "-"}
                              </td>
                              <td className="p-3 text-sm font-medium text-slate-800">
                                {p.name || p.person_name}
                              </td>
                              <td className="p-3">
                                {(() => {
                                  const pCat = getItemCategoryTag(p, true);
                                  return pCat ? (
                                    <span
                                      className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-extrabold border ${pCat.tagClass}`}
                                    >
                                      {pCat.label}
                                    </span>
                                  ) : (
                                    "-"
                                  );
                                })()}
                              </td>
                              <td className="p-3">
                                {isPassDisabled(p) ? (
                                  <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-700">
                                    DISABLED
                                  </span>
                                ) : (
                                  <span
                                    className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                                      String(p.status || "").toUpperCase() ===
                                      "APPROVED"
                                        ? "bg-emerald-100 text-emerald-700"
                                        : String(
                                              p.status || "",
                                            ).toUpperCase() === "REJECTED"
                                          ? "bg-red-100 text-red-700"
                                          : String(
                                                p.status || "",
                                              ).toUpperCase() === "REVERTED"
                                            ? "bg-amber-100 text-amber-700"
                                            : "bg-blue-100 text-blue-700"
                                    }`}
                                  >
                                    {(p.status || "PENDING").toUpperCase()}
                                  </span>
                                )}
                              </td>
                              <td className="p-3 text-center">
                                {isPassApprovedAndActive(p) ? (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handlePrintQR(p, "person");
                                    }}
                                    className="bg-orange-100 text-orange-700 hover:bg-orange-200 border border-orange-200 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors shadow-sm"
                                  >
                                    Print QR
                                  </button>
                                ) : (
                                  <span className="text-xs text-slate-400">
                                    -
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td
                              colSpan="5"
                              className="p-4 text-sm text-slate-400 text-center italic"
                            >
                              No persons found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <h3 className="font-black text-slate-800 mb-3 border-b border-slate-100 pb-2 text-sm uppercase tracking-wider">
                    Vehicles Included
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="p-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                            Pass No
                          </th>
                          <th className="p-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                            Reg. No
                          </th>
                          <th className="p-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                            Pass Type
                          </th>
                          <th className="p-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                            Status
                          </th>
                          <th className="p-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 text-center">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedPassDetails.vehicles &&
                        selectedPassDetails.vehicles.length > 0 ? (
                          selectedPassDetails.vehicles.map((v, i) => (
                            <tr
                              key={i}
                              className="hover:bg-blue-50 cursor-pointer transition-colors"
                              onClick={() =>
                                setEntityModal({
                                  isOpen: true,
                                  data: v,
                                  type: "vehicle",
                                })
                              }
                            >
                              <td className="p-3 text-xs font-mono font-bold text-[#0a1e4d]">
                                {v.vehiclePassNo || "-"}
                              </td>
                              <td className="p-3 text-sm font-bold text-[#0a1e4d] uppercase">
                                {v.registrationNo ||
                                  v.registration_no ||
                                  v.regNo}
                              </td>
                              <td className="p-3">
                                {(() => {
                                  const vCat = getItemCategoryTag(v, false);
                                  return vCat ? (
                                    <span
                                      className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-extrabold border ${vCat.tagClass}`}
                                    >
                                      {vCat.label}
                                    </span>
                                  ) : (
                                    "-"
                                  );
                                })()}
                              </td>
                              <td className="p-3">
                                {isPassDisabled(v) ? (
                                  <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-700">
                                    DISABLED
                                  </span>
                                ) : (
                                  <span
                                    className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                                      String(v.status || "").toUpperCase() ===
                                      "APPROVED"
                                        ? "bg-emerald-100 text-emerald-700"
                                        : String(
                                              v.status || "",
                                            ).toUpperCase() === "REJECTED"
                                          ? "bg-red-100 text-red-700"
                                          : String(
                                                v.status || "",
                                              ).toUpperCase() === "REVERTED"
                                            ? "bg-amber-100 text-amber-700"
                                            : "bg-blue-100 text-blue-700"
                                    }`}
                                  >
                                    {(v.status || "PENDING").toUpperCase()}
                                  </span>
                                )}
                              </td>
                              <td className="p-3 text-center">
                                {isPassApprovedAndActive(v) ? (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handlePrintQR(v, "vehicle");
                                    }}
                                    className="bg-orange-100 text-orange-700 hover:bg-orange-200 border border-orange-200 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors shadow-sm"
                                  >
                                    Print QR
                                  </button>
                                ) : (
                                  <span className="text-xs text-slate-400">
                                    -
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td
                              colSpan="4"
                              className="p-4 text-sm text-slate-400 text-center italic"
                            >
                              No vehicles found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end p-5 border-t border-slate-200 bg-white rounded-b-2xl">
              <button
                onClick={() => setSelectedPassDetails(null)}
                className="bg-[#0a1e4d] text-white px-8 py-2.5 rounded-xl shadow-lg font-bold hover:bg-opacity-90 transition-colors uppercase tracking-wider text-sm"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
      <FaceCaptureDialog
        open={faceCaptureOpen}
        onClose={() => setFaceCaptureOpen(false)}
        passId={
          personForm.passId ||
          personForm.personPassNo ||
          personForm.passNo ||
          personForm.cardNumber ||
          null
        }
        onUsePhoto={(file) => {
          setPersonForm((prev) => ({
            ...prev,
            photo: file,
            existingPhotoName: null,
            existingPhotoPath: null,
          }));
          toast.success("Captured photo attached successfully.");
        }}
      />
      {/* RATE CARD MODAL */}
      {modals.rateCard && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in zoom-in-95 duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl flex flex-col max-h-[90vh] border border-slate-200 overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 bg-[#0a1e4d] text-white">
              <h2 className="text-xl font-bold tracking-wide flex items-center gap-2">
                <Calculator className="h-5 w-5 text-orange-400" />
                Rate Master - HEP Rate Details
              </h2>
              <button
                onClick={() => toggleModal("rateCard", false)}
                className="text-white/70 hover:text-white hover:bg-white/10 p-2 rounded-xl transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 bg-slate-50">
              <p className="text-sm font-semibold text-slate-700 mb-4 bg-blue-50 p-3 rounded-lg border border-blue-100">
                Charges for Harbour Entry Permit (HEP) — period of validity of
                HEP. All rates are in ₹ and <strong>include GST</strong>, so the
                amount shown on your request is the amount payable.
              </p>

              <div className="border border-slate-300 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse bg-white">
                  <thead className="bg-slate-100 border-b border-slate-200">
                    <tr>
                      <th className="p-3 text-xs font-bold text-slate-700 uppercase tracking-wider border-r border-slate-200 w-16 text-center">
                        Sl. No.
                      </th>
                      <th className="p-3 text-xs font-bold text-slate-700 uppercase tracking-wider border-r border-slate-200">
                        Description
                      </th>
                      <th className="p-3 text-xs font-bold text-slate-700 uppercase tracking-wider text-right border-r border-slate-200 whitespace-nowrap">
                        Daily (Rs.)
                      </th>
                      <th className="p-3 text-xs font-bold text-slate-700 uppercase tracking-wider text-right border-r border-slate-200 whitespace-nowrap">
                        Monthly (Rs.)
                      </th>
                      <th className="p-3 text-xs font-bold text-slate-700 uppercase tracking-wider text-right whitespace-nowrap">
                        Yearly (Rs.)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {[
                      effectiveHepRates.INDIVIDUAL,
                      effectiveHepRates.VEHICLE,
                      effectiveHepRates.CARGO,
                    ].map((rate, idx) => (
                      <tr key={rate.label} className="hover:bg-slate-50">
                        <td className="p-3 text-sm text-slate-600 text-center border-r border-slate-100">
                          {idx + 1}
                        </td>
                        <td className="p-3 border-r border-slate-100">
                          <span className="text-sm font-medium text-slate-800">
                            {rate.label}
                          </span>
                          {rate.description && (
                            <span className="block text-xs text-slate-500 leading-relaxed mt-0.5">
                              ({rate.description})
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-sm font-bold text-slate-700 text-right border-r border-slate-100 tabular-nums">
                          {rate.daily}
                        </td>
                        <td className="p-3 text-sm font-bold text-slate-700 text-right border-r border-slate-100 tabular-nums">
                          {rate.monthly}
                        </td>
                        <td className="p-3 text-sm font-bold text-slate-700 text-right tabular-nums">
                          {rate.yearly}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="mt-4 text-xs text-slate-500 leading-relaxed">
                Daily passes are charged per day (rate × number of days).
                Monthly and yearly passes are flat rates for the full period.
              </p>
            </div>
          </div>
        </div>
      )}
      {/* INDIVIDUAL ENTITY DETAILS MODAL (READ-ONLY FOR COMPANY) */}
      {/* ============================================================== */}
      {entityModal.isOpen && entityModal.data && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in zoom-in-95 duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[85vh] overflow-hidden border border-slate-200">
            <div className="flex justify-between items-center px-6 py-4 bg-slate-800 text-white shrink-0">
              <div className="flex items-center gap-3">
                {entityModal.type === "person" ? (
                  <UserPlus className="h-5 w-5 text-orange-400" />
                ) : (
                  <Truck className="h-5 w-5 text-orange-400" />
                )}
                <h3 className="text-lg font-bold">
                  {entityModal.type === "person"
                    ? entityModal.data.name
                    : entityModal.data.registrationNo || entityModal.data.regNo}
                </h3>
              </div>
              <button
                onClick={() =>
                  setEntityModal({ isOpen: false, data: null, type: null })
                }
                className="text-white/70 hover:text-white p-1 bg-slate-700 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-slate-50 space-y-6">
              {/* REJECTION REASON BANNER (IF APPLICABLE) */}
              {String(entityModal.data.status).toUpperCase() === "REJECTED" &&
                entityModal.data.rejectedReason && (
                  <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-start gap-3">
                    <X className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
                    <div>
                      <h4 className="text-xs font-black text-red-900 uppercase tracking-wider mb-1">
                        Reason for Rejection
                      </h4>
                      <p className="text-sm text-red-700 font-medium">
                        {entityModal.data.rejectedReason}
                      </p>
                    </div>
                  </div>
                )}

              {/* REVERT REASON BANNER (IF APPLICABLE) */}
              {String(entityModal.data.status).toUpperCase() === "REVERTED" &&
                (entityModal.data.revertReason ||
                  entityModal.data.rejectedReason) && (
                  <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                    <div>
                      <h4 className="text-xs font-black text-amber-900 uppercase tracking-wider mb-1">
                        Action Required - Application Reverted
                      </h4>
                      <p className="text-sm text-amber-700 font-medium">
                        {entityModal.data.revertReason ||
                          entityModal.data.rejectedReason}
                      </p>
                      <p className="text-xs text-amber-600 mt-2">
                        Please update the required information and re-submit.
                      </p>
                    </div>
                  </div>
                )}

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 bg-slate-100 border-b border-slate-200 flex justify-between items-center">
                  <h4 className="text-xs font-black text-[#0a1e4d] uppercase tracking-widest">
                    Full Submitted Preview (Read-Only)
                  </h4>
                  <div className="flex items-center gap-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold
                        ${
                          isPassDisabled(entityModal.data)
                            ? "bg-red-100 text-red-700"
                            : "bg-green-100 text-green-700"
                        }`}
                    >
                      {getPassStatus(entityModal.data)}
                    </span>

                    {isPassApprovedAndActive(entityModal.data) ? (
                      <button
                        onClick={() => setDisableModal(true)}
                        className="px-4 py-2 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700"
                      >
                        Disable Pass
                      </button>
                    ) : isPassDisabled(entityModal.data) ? (
                      <button
                        onClick={handleEnablePass}
                        disabled={enableLoading}
                        className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {enableLoading ? "Enabling..." : "Enable Pass"}
                      </button>
                    ) : null}
                  </div>
                  {entityModal.type === "person" &&
                    (String(entityModal.data.passType).toUpperCase() ===
                      "YEARLY" ||
                      String(entityModal.data.passType).toUpperCase() ===
                        "ANNUAL" ||
                      String(entityModal.data.passType) === "3") &&
                    (entityModal.data.withTwoWheeler === true ||
                      String(entityModal.data.withTwoWheeler) === "true") &&
                    String(entityModal.data.status).toUpperCase() ===
                      "APPROVED" &&
                    (() => {
                      const count = parseInt(
                        entityModal.data.twoWheelerChangeCount || 0,
                        10,
                      );
                      if (count >= 3) {
                        return (
                          <button
                            onClick={() => {
                              toast.error(
                                "Change Limit Reached: You have already changed the two-wheeler vehicle number 3 times this year. Further changes are not allowed.",
                              );
                            }}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow flex items-center gap-1.5 cursor-pointer"
                          >
                            <Edit className="h-3.5 w-3.5 text-red-200" />
                            Change Two-Wheeler No.
                          </button>
                        );
                      }
                      const pendingReq = twoWheelerRequests.find(
                        (r) =>
                          String(r.personId) === String(entityModal.data.id) &&
                          r.status === "PENDING",
                      );
                      if (pendingReq) {
                        return (
                          <span className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 border border-amber-300 shadow-sm">
                            <Clock className="h-3.5 w-3.5 text-amber-600 animate-pulse" />
                            Update Pending ({pendingReq.newVehicleNo})
                          </span>
                        );
                      }
                      return (
                        <button
                          onClick={() =>
                            handleOpenTwoWheelerModal(entityModal.data)
                          }
                          className="bg-[#0a1e4d] hover:bg-blue-900 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow flex items-center gap-1.5"
                        >
                          <Edit className="h-3.5 w-3.5 text-orange-400" />
                          Change Two-Wheeler No.
                        </button>
                      );
                    })()}
                </div>
                <div className="p-5 grid grid-cols-2 md:grid-cols-3 gap-y-6 gap-x-4">
                  {entityModal.type === "person" ? (
                    <>
                      <DetailItem
                        label="Pass No."
                        value={entityModal.data.personPassNo || "Not Issued"}
                        highlight
                      />
                      <DetailItem
                        label="Full Name"
                        value={entityModal.data.name}
                        highlight
                      />
                      <DetailItem
                        label="Category / HEP Type"
                        value={
                          String(entityModal.data.hepType) === "1"
                            ? "Driver"
                            : "Personnel"
                        }
                      />
                      <DetailItem
                        label="Designation"
                        value={
                          entityModal.data.designationOther ||
                          entityModal.data.designationId ||
                          entityModal.data.designation ||
                          "-"
                        }
                      />
                      <DetailItem
                        label="Access Area"
                        value={
                          entityModal.data.accessArea || "OTHER GATES ONLY"
                        }
                      />
                      <DetailItem
                        label="Aadhar No."
                        value={entityModal.data.aadharNo || "-"}
                      />
                      <DetailItem
                        label="Mobile No."
                        value={entityModal.data.mobile || "-"}
                      />
                      <DetailItem
                        label="Email ID"
                        value={entityModal.data.email || "-"}
                      />
                      <DetailItem
                        label="Nationality"
                        value={entityModal.data.nationality || "INDIAN"}
                      />
                      <DetailItem
                        label="Country"
                        value={entityModal.data.country || "India"}
                      />
                      <DetailItem
                        label="ID Proof Type"
                        value={entityModal.data.idProofType || "-"}
                      />
                      <DetailItem
                        label="ID Proof Number"
                        value={entityModal.data.idProofNumber || "-"}
                      />
                      <DetailItem
                        label="Pass Type"
                        value={entityModal.data.passType}
                        highlight
                      />
                      <DetailItem
                        label="Valid From"
                        value={
                          entityModal.data.dateFrom
                            ? new Date(
                                entityModal.data.dateFrom,
                              ).toLocaleDateString("en-GB")
                            : "-"
                        }
                      />
                      <DetailItem
                        label="Valid To"
                        value={
                          entityModal.data.dateTo
                            ? new Date(
                                entityModal.data.dateTo,
                              ).toLocaleDateString("en-GB")
                            : "-"
                        }
                      />
                      <DetailItem
                        label="Two-Wheeler Availed"
                        value={
                          entityModal.data.withTwoWheeler === true ||
                          String(entityModal.data.withTwoWheeler) === "true"
                            ? "Yes"
                            : "No"
                        }
                      />
                      <DetailItem
                        label="Two-Wheeler Reg No."
                        value={entityModal.data.vehicleNo || "-"}
                        highlight
                      />
                      <DetailItem
                        label="Calculated Amount"
                        value={`₹${parseFloat(entityModal.data.amount || 0).toFixed(2)}`}
                      />
                    </>
                  ) : (
                    <>
                      <DetailItem
                        label="Pass No."
                        value={entityModal.data.vehiclePassNo || "Not Issued"}
                        highlight
                      />
                      <DetailItem
                        label="Registration No."
                        value={
                          entityModal.data.registrationNo ||
                          entityModal.data.regNo
                        }
                        highlight
                      />
                      <DetailItem
                        label="Vehicle Type"
                        value={
                          entityModal.data.vehicleTypeName ||
                          entityModal.data.vehicle_type_name ||
                          (masterData?.vehicleTypes &&
                            getLabelById(
                              masterData.vehicleTypes,
                              entityModal.data.vehicleTypeId ||
                                entityModal.data.vehicle_type_id ||
                                entityModal.data.vehicleType ||
                                entityModal.data.type,
                              "name",
                            )) ||
                          (masterData?.vehicleTypes &&
                            getLabelById(
                              masterData.vehicleTypes,
                              entityModal.data.vehicleTypeId ||
                                entityModal.data.vehicle_type_id ||
                                entityModal.data.vehicleType ||
                                entityModal.data.type,
                              "label",
                            )) ||
                          (entityModal.data.vehicleType &&
                          isNaN(entityModal.data.vehicleType)
                            ? entityModal.data.vehicleType
                            : null) ||
                          (entityModal.data.type && isNaN(entityModal.data.type)
                            ? entityModal.data.type
                            : null) ||
                          entityModal.data.vehicleTypeId ||
                          entityModal.data.type ||
                          "-"
                        }
                      />
                      <DetailItem
                        label="Access Area"
                        value={
                          entityModal.data.accessArea || "OTHER GATES ONLY"
                        }
                      />
                      <DetailItem
                        label="Pass Type"
                        value={entityModal.data.passType}
                        highlight
                      />
                      <DetailItem
                        label="Valid From"
                        value={
                          entityModal.data.dateFrom
                            ? new Date(
                                entityModal.data.dateFrom,
                              ).toLocaleDateString("en-GB")
                            : "-"
                        }
                      />
                      <DetailItem
                        label="Valid To"
                        value={
                          entityModal.data.dateTo
                            ? new Date(
                                entityModal.data.dateTo,
                              ).toLocaleDateString("en-GB")
                            : "-"
                        }
                      />
                      <DetailItem
                        label="Insurance Expiry"
                        value={
                          entityModal.data.insuranceExpiry
                            ? new Date(
                                entityModal.data.insuranceExpiry,
                              ).toLocaleDateString("en-GB")
                            : "-"
                        }
                      />
                      <DetailItem
                        label="RC Validity"
                        value={
                          entityModal.data.rcValidity
                            ? new Date(
                                entityModal.data.rcValidity,
                              ).toLocaleDateString("en-GB")
                            : "-"
                        }
                      />
                      <DetailItem
                        label="Calculated Amount"
                        value={`₹${parseFloat(entityModal.data.amount || 0).toFixed(2)}`}
                      />
                    </>
                  )}
                </div>
              </div>

              {/* UPLOADED DOCUMENTS SECTION */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 bg-slate-100 border-b border-slate-200">
                  <h4 className="text-xs font-black text-[#0a1e4d] uppercase tracking-widest">
                    Uploaded Documents
                  </h4>
                </div>
                <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {entityModal.type === "person" ? (
                    <>
                      {entityModal.data.photoFileName && (
                        <button
                          onClick={() =>
                            handleViewDoc(
                              selectedPassDetails?.id ||
                                entityModal.data.passRequestId,
                              "personPhoto",
                              entityModal.data.photoFileName,
                            )
                          }
                          className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200 hover:border-[#0a1e4d] text-left text-xs font-bold text-slate-700"
                        >
                          <span className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-orange-500" />{" "}
                            Photo
                          </span>
                          <Eye className="h-4 w-4 text-slate-400" />
                        </button>
                      )}
                      {(entityModal.data.aadharPDFFileName ||
                        entityModal.data.aadharFileName) && (
                        <button
                          onClick={() =>
                            handleViewDoc(
                              selectedPassDetails?.id ||
                                entityModal.data.passRequestId,
                              "personAadhar",
                              entityModal.data.aadharPDFFileName ||
                                entityModal.data.aadharFileName,
                            )
                          }
                          className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200 hover:border-[#0a1e4d] text-left text-xs font-bold text-slate-700"
                        >
                          <span className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-orange-500" />{" "}
                            Aadhar PDF
                          </span>
                          <Eye className="h-4 w-4 text-slate-400" />
                        </button>
                      )}
                      {(entityModal.data.idProofFileName ||
                        entityModal.data.idProofName) && (
                        <button
                          onClick={() =>
                            handleViewDoc(
                              selectedPassDetails?.id ||
                                entityModal.data.passRequestId,
                              "personIdProof",
                              entityModal.data.idProofFileName ||
                                entityModal.data.idProofName,
                            )
                          }
                          className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200 hover:border-[#0a1e4d] text-left text-xs font-bold text-slate-700"
                        >
                          <span className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-orange-500" /> ID
                            Proof
                          </span>
                          <Eye className="h-4 w-4 text-slate-400" />
                        </button>
                      )}
                      {(entityModal.data.driverLicenseName ||
                        entityModal.data.dlName) && (
                        <button
                          onClick={() =>
                            handleViewDoc(
                              selectedPassDetails?.id ||
                                entityModal.data.passRequestId,
                              "personDrivingLicense",
                              entityModal.data.driverLicenseName ||
                                entityModal.data.dlName,
                            )
                          }
                          className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200 hover:border-[#0a1e4d] text-left text-xs font-bold text-slate-700"
                        >
                          <span className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-orange-500" />{" "}
                            Driving Licence
                          </span>
                          <Eye className="h-4 w-4 text-slate-400" />
                        </button>
                      )}
                      {(entityModal.data.policeVerificationName ||
                        entityModal.data.policeName) && (
                        <button
                          onClick={() =>
                            handleViewDoc(
                              selectedPassDetails?.id ||
                                entityModal.data.passRequestId,
                              "policeVerification",
                              entityModal.data.policeVerificationName ||
                                entityModal.data.policeName,
                            )
                          }
                          className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200 hover:border-[#0a1e4d] text-left text-xs font-bold text-slate-700"
                        >
                          <span className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-orange-500" />{" "}
                            Police Verification
                          </span>
                          <Eye className="h-4 w-4 text-slate-400" />
                        </button>
                      )}
                      {(entityModal.data.employmentProofName ||
                        entityModal.data.empName) && (
                        <button
                          onClick={() =>
                            handleViewDoc(
                              selectedPassDetails?.id ||
                                entityModal.data.passRequestId,
                              "employmentProof",
                              entityModal.data.employmentProofName ||
                                entityModal.data.empName,
                            )
                          }
                          className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200 hover:border-[#0a1e4d] text-left text-xs font-bold text-slate-700"
                        >
                          <span className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-orange-500" />{" "}
                            Employment Proof
                          </span>
                          <Eye className="h-4 w-4 text-slate-400" />
                        </button>
                      )}
                      {(entityModal.data.visaDocName ||
                        entityModal.data.visaDocPath) && (
                        <button
                          onClick={() =>
                            handleViewDoc(
                              selectedPassDetails?.id ||
                                entityModal.data.passRequestId,
                              "visaDoc",
                              entityModal.data.visaDocName ||
                                entityModal.data.visaDocPath,
                            )
                          }
                          className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200 hover:border-[#0a1e4d] text-left text-xs font-bold text-slate-700"
                        >
                          <span className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-orange-500" />{" "}
                            Visa
                          </span>
                          <Eye className="h-4 w-4 text-slate-400" />
                        </button>
                      )}
                      {(entityModal.data.immigrationDocName ||
                        entityModal.data.immigrationDocPath) && (
                        <button
                          onClick={() =>
                            handleViewDoc(
                              selectedPassDetails?.id ||
                                entityModal.data.passRequestId,
                              "immigrationDoc",
                              entityModal.data.immigrationDocName ||
                                entityModal.data.immigrationDocPath,
                            )
                          }
                          className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200 hover:border-[#0a1e4d] text-left text-xs font-bold text-slate-700"
                        >
                          <span className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-orange-500" />{" "}
                            Immigration Clearance
                          </span>
                          <Eye className="h-4 w-4 text-slate-400" />
                        </button>
                      )}
                      {(entityModal.data.passportName ||
                        entityModal.data.passportPath) && (
                        <button
                          onClick={() =>
                            handleViewDoc(
                              selectedPassDetails?.id ||
                                entityModal.data.passRequestId,
                              "passportDoc",
                              entityModal.data.passportName ||
                                entityModal.data.passportPath,
                            )
                          }
                          className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200 hover:border-[#0a1e4d] text-left text-xs font-bold text-slate-700"
                        >
                          <span className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-orange-500" />{" "}
                            Passport
                          </span>
                          <Eye className="h-4 w-4 text-slate-400" />
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      {(entityModal.data.scannedCopyFileName ||
                        entityModal.data.rcName) && (
                        <button
                          onClick={() =>
                            handleViewDoc(
                              selectedPassDetails?.id ||
                                entityModal.data.passRequestId,
                              "vehicleRC",
                              entityModal.data.scannedCopyFileName ||
                                entityModal.data.rcName,
                            )
                          }
                          className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200 hover:border-[#0a1e4d] text-left text-xs font-bold text-slate-700"
                        >
                          <span className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-orange-500" /> RC
                            / NOC
                          </span>
                          <Eye className="h-4 w-4 text-slate-400" />
                        </button>
                      )}
                      {(entityModal.data.insuranceFileName ||
                        entityModal.data.insName) && (
                        <button
                          onClick={() =>
                            handleViewDoc(
                              selectedPassDetails?.id ||
                                entityModal.data.passRequestId,
                              "vehicleInsurance",
                              entityModal.data.insuranceFileName ||
                                entityModal.data.insName,
                            )
                          }
                          className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200 hover:border-[#0a1e4d] text-left text-xs font-bold text-slate-700"
                        >
                          <span className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-orange-500" />{" "}
                            Insurance
                          </span>
                          <Eye className="h-4 w-4 text-slate-400" />
                        </button>
                      )}
                      {(entityModal.data.fitnessFileName ||
                        entityModal.data.fitnessName) && (
                        <button
                          onClick={() =>
                            handleViewDoc(
                              selectedPassDetails?.id ||
                                entityModal.data.passRequestId,
                              "vehicleFitness",
                              entityModal.data.fitnessFileName ||
                                entityModal.data.fitnessName,
                            )
                          }
                          className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200 hover:border-[#0a1e4d] text-left text-xs font-bold text-slate-700"
                        >
                          <span className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-orange-500" />{" "}
                            Fitness Cert
                          </span>
                          <Eye className="h-4 w-4 text-slate-400" />
                        </button>
                      )}
                      {(entityModal.data.permitFileName ||
                        entityModal.data.permitName) && (
                        <button
                          onClick={() =>
                            handleViewDoc(
                              selectedPassDetails?.id ||
                                entityModal.data.passRequestId,
                              "vehiclePermit",
                              entityModal.data.permitFileName ||
                                entityModal.data.permitName,
                            )
                          }
                          className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200 hover:border-[#0a1e4d] text-left text-xs font-bold text-slate-700"
                        >
                          <span className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-orange-500" />{" "}
                            Permit
                          </span>
                          <Eye className="h-4 w-4 text-slate-400" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-white text-right shrink-0">
              <button
                onClick={() =>
                  setEntityModal({ isOpen: false, data: null, type: null })
                }
                className="bg-slate-200 text-slate-800 px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-300 transition-colors"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
      {disableModal && (
        <div className="fixed inset-0 z-[120] bg-black/40 flex justify-center items-center">
          <div className="bg-white rounded-xl w-[450px] p-6">
            <h2 className="text-lg font-bold">Disable Pass</h2>

            <p className="text-sm text-slate-500 mt-2">
              Please enter the reason.
            </p>

            <textarea
              rows={5}
              className="w-full border rounded-lg mt-4 p-3"
              value={disableReason}
              onChange={(e) => setDisableReason(e.target.value)}
            />

            <div className="flex justify-end gap-3 mt-6">
              <button
                className="px-5 py-2 bg-slate-300 rounded-lg"
                onClick={() => {
                  setDisableModal(false);
                  setDisableReason("");
                }}
              >
                Cancel
              </button>

              <button
                disabled={disableLoading}
                onClick={handleDisablePass}
                className="px-5 py-2 bg-red-600 text-white rounded-lg"
              >
                {disableLoading ? "Disabling..." : "Disable"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TWO WHEELER UPDATE MODAL */}
      {twoWheelerModal.isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in zoom-in-95 duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200">
            <div className="flex justify-between items-center px-6 py-4 bg-[#0a1e4d] text-white">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Edit className="h-5 w-5 text-orange-400" />
                Change Two-Wheeler Vehicle No.
              </h3>
              <button
                onClick={() =>
                  setTwoWheelerModal({
                    isOpen: false,
                    person: null,
                    newVehicleNo: "",
                    reason: "",
                    loading: false,
                  })
                }
                className="text-white/70 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 bg-slate-50">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Person Name
                </label>
                <input
                  readOnly
                  type="text"
                  value={twoWheelerModal.person?.name || ""}
                  className="w-full mt-1 bg-slate-100 border border-slate-200 rounded-lg h-10 px-3 text-sm font-bold text-slate-700 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Current Vehicle No.
                </label>
                <input
                  readOnly
                  type="text"
                  value={twoWheelerModal.person?.vehicleNo || "N/A"}
                  className="w-full mt-1 bg-slate-100 border border-slate-200 rounded-lg h-10 px-3 text-sm font-mono font-bold text-slate-700 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  New Two-Wheeler Vehicle No.{" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={twoWheelerModal.newVehicleNo}
                  onChange={(e) =>
                    setTwoWheelerModal({
                      ...twoWheelerModal,
                      newVehicleNo: e.target.value.toUpperCase(),
                    })
                  }
                  placeholder="e.g. MH01AB1234, KA-02-C-5678"
                  className={`w-full mt-1 border rounded-lg h-10 px-3 text-sm font-mono font-bold focus:outline-none transition-all ${
                    twoWheelerModal.newVehicleNo.trim().length === 0
                      ? "border-slate-300 focus:ring-2 focus:ring-[#0a1e4d] text-[#0a1e4d]"
                      : /^[A-Z]{2}[-\s]?[0-9]{1,2}[-\s]?[A-Z]{1,3}[-\s]?[0-9]{1,4}$/i.test(
                            twoWheelerModal.newVehicleNo.trim(),
                          )
                        ? "border-emerald-500 bg-emerald-50/50 text-emerald-800 focus:ring-2 focus:ring-emerald-500"
                        : "border-red-400 bg-red-50/50 text-red-700 focus:ring-2 focus:ring-red-500"
                  }`}
                />
                {twoWheelerModal.newVehicleNo.trim().length > 0 && (
                  <p
                    className={`text-[11px] font-semibold mt-1 flex items-center gap-1 ${
                      /^[A-Z]{2}[-\s]?[0-9]{1,2}[-\s]?[A-Z]{1,3}[-\s]?[0-9]{1,4}$/i.test(
                        twoWheelerModal.newVehicleNo.trim(),
                      )
                        ? "text-emerald-600"
                        : "text-red-500"
                    }`}
                  >
                    {/^[A-Z]{2}[-\s]?[0-9]{1,2}[-\s]?[A-Z]{1,3}[-\s]?[0-9]{1,4}$/i.test(
                      twoWheelerModal.newVehicleNo.trim(),
                    ) ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Valid vehicle registration number format
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-3.5 w-3.5" />
                        Invalid format. Valid examples: MH01AB1234, KA-02-C-5678
                      </>
                    )}
                  </p>
                )}
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Reason for Change (Optional)
                </label>
                <textarea
                  rows={2}
                  value={twoWheelerModal.reason}
                  onChange={(e) =>
                    setTwoWheelerModal({
                      ...twoWheelerModal,
                      reason: e.target.value,
                    })
                  }
                  placeholder="Reason for changing two-wheeler vehicle..."
                  className="w-full mt-1 border border-slate-300 rounded-lg p-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0a1e4d]"
                />
              </div>
            </div>
            <div className="p-4 border-t border-slate-200 bg-white flex justify-end gap-3">
              <button
                onClick={() =>
                  setTwoWheelerModal({
                    isOpen: false,
                    person: null,
                    newVehicleNo: "",
                    reason: "",
                    loading: false,
                  })
                }
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={
                  twoWheelerModal.loading ||
                  !twoWheelerModal.newVehicleNo.trim() ||
                  !/^[A-Z]{2}[-\s]?[0-9]{1,2}[-\s]?[A-Z]{1,3}[-\s]?[0-9]{1,4}$/i.test(
                    twoWheelerModal.newVehicleNo.trim(),
                  )
                }
                onClick={handleSubmitTwoWheelerUpdate}
                className="px-5 py-2 rounded-xl bg-[#0a1e4d] hover:bg-blue-900 text-white text-sm font-bold shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {twoWheelerModal.loading ? "Submitting..." : "Submit Request"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PHASE 2: REVERTED PASS EDIT MODAL */}
      {revertedEditModal && editingRevertedPass && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in zoom-in-95 duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-200">
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 bg-amber-600 text-white shrink-0">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Edit3 className="h-5 w-5" />
                  Edit Reverted Pass - {editingRevertedPass.referenceNo}
                </h3>
                <p className="text-xs text-amber-100 mt-0.5">
                  Update reverted entities and resubmit your application
                </p>
              </div>
              <button
                onClick={closeRevertedEditModal}
                className="text-white hover:text-amber-100 transition-colors p-1"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
              {/* Warning Banner */}
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl mb-6 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                <div className="text-sm text-amber-800">
                  <p className="font-semibold">Action Required</p>
                  <p>
                    Please review and update all reverted entities below. Once
                    updated, you can resubmit the pass for approval.
                  </p>
                </div>
              </div>

              {/* Reverted Persons Section */}
              {revertedPersons.length > 0 && (
                <div className="mb-8">
                  <h4 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    Reverted Persons ({revertedPersons.length})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                    {revertedPersons.map((person, index) => (
                      <div
                        key={person.id}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          person.status === "reverted"
                            ? "bg-white border-amber-300"
                            : "bg-green-50 border-green-300"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                person.status === "reverted"
                                  ? "bg-amber-100"
                                  : "bg-green-100"
                              }`}
                            >
                              <User
                                className={`h-5 w-5 ${
                                  person.status === "reverted"
                                    ? "text-amber-600"
                                    : "text-green-600"
                                }`}
                              />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-slate-800">
                                  {person.name}
                                </p>
                                {(() => {
                                  const pCat = getItemCategoryTag(person, true);
                                  return pCat ? (
                                    <span
                                      className={`px-2 py-0.5 rounded text-[10px] font-extrabold border ${pCat.tagClass}`}
                                    >
                                      {pCat.label}
                                    </span>
                                  ) : null;
                                })()}
                              </div>
                              <p className="text-xs text-slate-500">
                                {person.id}
                              </p>
                            </div>
                          </div>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              person.status === "reverted"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-green-100 text-green-700"
                            }`}
                          >
                            {person.status === "reverted"
                              ? "Needs Update"
                              : "Updated ✓"}
                          </span>
                        </div>

                        {/* Revert Reason */}
                        {person.rejectedReason && (
                          <div className="bg-red-50 border border-red-200 p-3 rounded-lg mb-3">
                            <p className="text-xs text-red-600 font-semibold mb-1">
                              Revert Reason:
                            </p>
                            <p className="text-sm text-red-700">
                              {person.rejectedReason}
                            </p>
                          </div>
                        )}

                        {/* Edit Button */}
                        {(person.status === "reverted" ||
                          person.status === "updated") && (
                          <button
                            onClick={() =>
                              handleEditRevertedEntity("person", index, person)
                            }
                            className={`w-full py-2 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
                              person.status === "updated"
                                ? "bg-slate-100 hover:bg-slate-200 text-slate-700"
                                : "bg-amber-500 hover:bg-amber-600 text-white"
                            }`}
                          >
                            <Edit3 className="h-4 w-4" />
                            {person.status === "updated"
                              ? "Edit Again"
                              : "Update Person"}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reverted Vehicles Section */}
              {revertedVehicles.length > 0 && (
                <div className="mb-8">
                  <h4 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Car className="h-5 w-5 text-emerald-600" />
                    Reverted Vehicles ({revertedVehicles.length})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                    {revertedVehicles.map((vehicle, index) => (
                      <div
                        key={vehicle.id}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          vehicle.status === "reverted"
                            ? "bg-white border-amber-300"
                            : "bg-green-50 border-green-300"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                vehicle.status === "reverted"
                                  ? "bg-amber-100"
                                  : "bg-green-100"
                              }`}
                            >
                              <Car
                                className={`h-5 w-5 ${
                                  vehicle.status === "reverted"
                                    ? "text-amber-600"
                                    : "text-green-600"
                                }`}
                              />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-slate-800">
                                  {vehicle.registrationNo || vehicle.regNo}
                                </p>
                                {(() => {
                                  const vCat = getItemCategoryTag(
                                    vehicle,
                                    false,
                                  );
                                  return vCat ? (
                                    <span
                                      className={`px-2 py-0.5 rounded text-[10px] font-extrabold border ${vCat.tagClass}`}
                                    >
                                      {vCat.label}
                                    </span>
                                  ) : null;
                                })()}
                              </div>
                              <p className="text-xs text-slate-500">
                                {vehicle.id}
                              </p>
                            </div>
                          </div>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              vehicle.status === "reverted"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-green-100 text-green-700"
                            }`}
                          >
                            {vehicle.status === "reverted"
                              ? "Needs Update"
                              : "Updated ✓"}
                          </span>
                        </div>

                        {/* Revert Reason */}
                        {vehicle.rejectedReason && (
                          <div className="bg-red-50 border border-red-200 p-3 rounded-lg mb-3">
                            <p className="text-xs text-red-600 font-semibold mb-1">
                              Revert Reason:
                            </p>
                            <p className="text-sm text-red-700">
                              {vehicle.rejectedReason}
                            </p>
                          </div>
                        )}

                        {/* Edit Button */}
                        {(vehicle.status === "reverted" ||
                          vehicle.status === "updated") && (
                          <button
                            onClick={() =>
                              handleEditRevertedEntity(
                                "vehicle",
                                index,
                                vehicle,
                              )
                            }
                            className={`w-full py-2 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
                              vehicle.status === "updated"
                                ? "bg-slate-100 hover:bg-slate-200 text-slate-700"
                                : "bg-amber-500 hover:bg-amber-600 text-white"
                            }`}
                          >
                            <Edit3 className="h-4 w-4" />
                            {vehicle.status === "updated"
                              ? "Edit Again"
                              : "Update Vehicle"}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* All Updated Message */}
              {revertedPersons.every((p) => p.status !== "reverted") &&
                revertedPersons.every((p) => p.status === "updated") &&
                revertedVehicles.every((v) => v.status === "updated") && (
                  <div className="bg-green-50 border border-green-200 p-4 rounded-xl flex items-center gap-3 mb-6">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                    <div>
                      <p className="font-semibold text-green-800">
                        All entities updated!
                      </p>
                      <p className="text-sm text-green-700">
                        You can now resubmit your pass for approval.
                      </p>
                    </div>
                  </div>
                )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 bg-white flex justify-between shrink-0">
              <button
                onClick={closeRevertedEditModal}
                className="bg-slate-200 text-slate-800 px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleResubmitRevertedPass}
                disabled={
                  revertedPersons.some((p) => p.status === "reverted") ||
                  revertedVehicles.some((v) => v.status === "reverted")
                }
                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center gap-2 ${
                  revertedPersons.some((p) => p.status === "reverted") ||
                  revertedVehicles.some((v) => v.status === "reverted")
                    ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                    : "bg-amber-500 hover:bg-amber-600 text-white"
                }`}
              >
                <Send className="h-4 w-4" />
                Resubmit Pass
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Viewer Modal Overlay */}
      {viewingDocUrl && (
        <div className="fixed inset-0 z-[150] bg-slate-900/85 backdrop-blur-sm flex items-center justify-center p-4 md:p-6 lg:p-10 animate-in fade-in duration-300">
          <div
            className={`bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ${
              isFullscreen ? "w-full h-full" : "w-full max-w-5xl h-[85vh]"
            }`}
          >
            {/* Header */}
            <div className="bg-slate-800 text-white px-6 py-4 flex items-center justify-between shrink-0">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-orange-500" />
                Document Viewer
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="bg-slate-700 hover:bg-slate-600 p-2 rounded-lg transition-colors"
                  title={isFullscreen ? "Exit Fullscreen" : "Maximize"}
                >
                  {isFullscreen ? (
                    <Minimize className="h-5 w-5" />
                  ) : (
                    <Maximize className="h-5 w-5" />
                  )}
                </button>
                <button
                  onClick={() => {
                    setViewingDocUrl(null);
                    setIsFullscreen(false);
                  }}
                  className="bg-slate-700 hover:bg-red-500 p-2 rounded-lg transition-colors"
                  title="Close Viewer"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Iframe / Image Container */}
            <div className="flex-1 w-full bg-slate-100 relative flex items-center justify-center p-4">
              {iframeLoading && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-50">
                  <Loader2 className="h-10 w-10 text-[#ff6b00] animate-spin mb-4" />
                  <p className="text-slate-500 font-bold animate-pulse">
                    Loading document...
                  </p>
                </div>
              )}

              {isImage ? (
                <img
                  src={viewingDocUrl}
                  alt="Document Viewer"
                  className="max-w-full max-h-full object-contain relative z-0 drop-shadow-lg rounded-md"
                  onLoad={() => setIframeLoading(false)}
                />
              ) : (
                <iframe
                  src={viewingDocUrl}
                  className="w-full h-full border-none relative z-0 bg-white"
                  title="Document Viewer"
                  onLoad={() => setIframeLoading(false)}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* COMPANY BLACKLIST POPUP OVERLAY */}
      {companyBlacklisted && showBlacklistPopup && activeTab === "apply" && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 border-2 border-red-500/20 dark:border-red-900/30 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
            {/* Top-right close button */}
            <button
              onClick={() => setShowBlacklistPopup(false)}
              className="absolute right-4 top-4 text-slate-400 dark:text-stone-400 hover:text-slate-600 dark:hover:text-stone-200 bg-slate-100 dark:bg-slate-800 p-2 rounded-full transition-all duration-200"
              aria-label="Close panel"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Glowing Icon Header */}
            <div className="text-center mb-6">
              <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-500 mb-4 ring-8 ring-red-500/5">
                <AlertCircle className="h-10 w-10 animate-bounce" />
                <span className="absolute inset-0 rounded-full border-2 border-red-500/30 animate-ping opacity-75" />
              </div>
              <h3 className="text-2xl font-black text-slate-950 dark:text-white tracking-tight uppercase">
                Access Restricted
              </h3>
              <p className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-widest mt-1">
                Company Blacklisted
              </p>
            </div>

            {/* Warning Message Card */}
            <div className="bg-red-50/50 dark:bg-red-950/10 border border-red-100 dark:border-red-900/20 rounded-2xl p-5 space-y-4 mb-6">
              <div className="flex justify-between items-center border-b border-red-100/50 dark:border-red-900/20 pb-3">
                <span className="text-xs font-bold text-slate-400 dark:text-stone-500 uppercase">
                  Suspended Entity
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-900/40">
                  Suspended
                </span>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 dark:text-stone-500 uppercase tracking-wider">
                  Company Name
                </p>
                <p className="text-sm font-extrabold text-slate-900 dark:text-stone-100">
                  {generalForm.companyName}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 dark:text-stone-500 uppercase tracking-wider">
                  Blacklist Reason
                </p>
                <p className="text-sm font-semibold text-red-800 dark:text-red-400 leading-relaxed bg-red-50 dark:bg-red-950/20 p-3 rounded-xl border border-red-100/50 dark:border-red-900/10">
                  {companyBlacklistReason}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-500 dark:text-stone-400 text-center leading-relaxed mb-6 font-medium">
              You are blocked from submitting new harbor entry passes. To
              restore access, please contact the Traffic Department or request
              reinstatement through the ATM Portal once compliance terms are
              met.
            </p>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => {
                  setShowBlacklistPopup(false);
                  setActiveTab("view");
                }}
                className="w-full sm:w-1/2 py-3 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white text-xs font-bold tracking-wider uppercase rounded-2xl transition duration-200 hover:-translate-y-0.5 active:translate-y-0 shadow-lg shadow-slate-950/10 hover:shadow-slate-950/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                <FileText className="h-4 w-4" /> View History
              </button>
              <button
                onClick={() => setShowBlacklistPopup(false)}
                className="w-full sm:w-1/2 py-3 bg-gradient-to-r from-red-600 to-red-800 hover:from-red-700 hover:to-red-900 text-white text-xs font-bold tracking-wider uppercase rounded-2xl transition duration-200 hover:-translate-y-0.5 active:translate-y-0 shadow-lg shadow-red-600/20 hover:shadow-red-600/30 flex items-center justify-center gap-2 cursor-pointer"
              >
                Ok
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
