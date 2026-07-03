"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import PaginationBar from "@/components/ui/PaginationBar";
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
} from "lucide-react";

const AGENT_API = process.env.NEXT_PUBLIC_AGENT_API;
const ADMIN_API = process.env.NEXT_PUBLIC_ADMIN_API || "http://localhost:5005/api";

// --- URL Helper to reliably strip '/api' for static file fetching ---
const getFileUrl = (path) => {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${AGENT_API}${path.startsWith("/") ? "" : "/"}${path}`;
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
  } else if (type === "YEARLY" || type === "3" || type === 3) {
    d.setFullYear(d.getFullYear() + p); // +1 year, same day ✅
  }

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  // All passes expire at 05:59 AM on the computed end date.
  return `${yyyy}-${mm}-${dd}T${PASS_EXPIRY_TIME}`;
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

const DetailItem = ({ label, value, highlight = false }) => (
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

export default function PassRequestPage() {
  const [activeTab, setActiveTab] = useState("apply");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [paymentMode, setPaymentMode] = useState("Account");
  const [loadingPasses, setLoadingPasses] = useState(false);
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
    }
  }, [viewingDocUrl]);

  const handleViewDoc = (passRequestId, documentType, staticPath, entityIndex = 0, isVendorPass = false) => {
    // Check if the file is an image based on its extension
    const isImg = staticPath && /\.(jpe?g|png|gif|webp)$/i.test(staticPath);
    setIsImage(!!isImg);

    if (documentType === "authLetter" || documentType === "requisitionLetter") {
      setViewingDocUrl(getFileUrl(staticPath));
    } else {
      setViewingDocUrl(
        `${AGENT_API}/pass-request/viewPassRequestsDocument?passRequestId=${passRequestId}&documentType=${documentType}&entityIndex=${entityIndex}&isVendorPass=${isVendorPass}`,
      );
    }
  };

  const [persons, setPersons] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [submittedPasses, setSubmittedPasses] = useState([]);

  // Pagination States
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [paginationMeta, setPaginationMeta] = useState({ totalRecords: 0, totalPages: 1, currentPage: 1, pageSize: 20 });
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
      const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
      const res = await axios.get(
        `${adminApi}/blacklist/check?entity_type=${entityType}&identifier=${encodeURIComponent(identifier.trim().toUpperCase())}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success && res.data.isBlacklisted) {
        const entry = res.data.data[0];
        setBlacklistWarnings((prev) => ({
          ...prev,
          [entityType + "_" + identifier.trim().toUpperCase()]: `⚠️ BLACKLISTED (${entry.reason_code || "Code 007"}) — ${entry.reason}`
        }));
        toast.warning(`${entityType === "VEHICLE" ? "Vehicle" : entityType === "DRIVER" ? "Driver" : "Person"} is currently BLACKLISTED at the Port!`, {
          description: `Reason: ${entry.reason}. Pass request for this entity is blocked.`,
          duration: 6000,
        });
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
    hepType: "2", // Default: 2 (Personnel)
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
    country: "75", // Default: 75 (India)
    visaNo: "",
    accessArea: "",
    designation: "",
    designationOther: "",
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
    passType: "1", // Default: 1 (Daily)
    passPeriod: "1",
    dateFrom: getCurrentDateTime(),
    dateTo: "",
    validUptoTime: "",
    amount: 10.3,
  };
  const [personForm, setPersonForm] = useState(initialPersonForm);

  // const personOptions = [
  //   { value: "", label: "-- Apply Fresh (Manual Entry) --" },
  //   ...Object.values(masterPersonsDB).map((p) => ({
  //     value: String(p.id),
  //     label: `${p.name} - Aadhar: ${p.aadhar || ""}`,
  //   })),
  // ];
  const selectedMasterPersonIds = persons
    .filter((p) => p.masterId)
    .map((p) => String(p.masterId));

  const personOptions = [
    { value: "", label: "-- Apply Fresh (Manual Entry) --" },
    ...Object.values(masterPersonsDB)
      .filter(
        (p) =>
          !selectedMasterPersonIds.includes(String(p.id)) ||
          String(personForm.masterId) === String(p.id) // allow current edit
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
    passType: "1", // Default: 1 (Daily)
    passPeriod: "1",
    dateFrom: getCurrentDateTime(),
    dateTo: "",
    amount: 25.7,
  };
  const [vehicleForm, setVehicleForm] = useState(initialVehicleForm);
  const selectedMasterVehicleIds = vehicles
    .filter((v) => v.masterId)
    .map((v) => String(v.masterId));

  const vehicleOptions = [
    { value: "", label: "-- Apply Fresh (Manual Entry) --" },
    ...Object.values(masterVehiclesDB)
      .filter(
        (v) =>
          !selectedMasterVehicleIds.includes(String(v.id)) ||
          String(vehicleForm.masterId) === String(v.id)
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

        const [natRes, passRes, idRes, accessRes, desigRes, vehRes] =
          await Promise.all([
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
          ]);

        const extractArray = (res) =>
          Array.isArray(res?.data?.data)
            ? res.data.data
            : Array.isArray(res?.data)
              ? res.data
              : [];

        setMasterData((prev) => ({
          ...prev,
          nationalities: extractArray(natRes),
          passTypes: extractArray(passRes),
          idProofTypes: extractArray(idRes),
          accessAreas: extractArray(accessRes),
          designations: extractArray(desigRes),
          vehicleTypes: extractArray(vehRes),
        }));
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

          // Populate the General Form with the DB data
          setGeneralForm((prev) => ({
            ...prev,
            companyName: agentData.entityName || "N/A",
            email: agentData.email || "N/A",
            mobile: agentData.mobileNo || "N/A",
          }));

          // Set company blacklisting details if blacklisted
          if (agentData.isBlacklisted) {
            setCompanyBlacklisted(true);
            setCompanyBlacklistReason(agentData.blacklistReason || "Company is blacklisted");
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

  useEffect(() => {
    let updatedPeriod = personForm.passPeriod;

    // ✅ Restrict DAILY to max 7 days
    if (String(personForm.passType) === "1") {
      if (parseInt(updatedPeriod) > 7) {
        updatedPeriod = "7";
        toast.warning("Maximum 7 days allowed for daily pass");
      }
    } else {
      // ❌ Disable period for Monthly/Yearly
      updatedPeriod = "1";
    }

    let amt = 10.3;
    if (String(personForm.passType) === "1") {
      amt = 10.3 * parseInt(updatedPeriod || 1);
    } else if (String(personForm.passType) === "2") {
      amt = 154.0;
    } else if (String(personForm.passType) === "3") {
      amt = 410.0;
    }

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
  }, [personForm.passType, personForm.passPeriod, personForm.dateFrom]);

  useEffect(() => {
    let updatedPeriod = vehicleForm.passPeriod;

    if (String(vehicleForm.passType) === "1") {
      if (parseInt(updatedPeriod) > 7) {
        updatedPeriod = "7";
        toast.warning("Daily pass max allowed is 7 days");
      }
    } else {
      updatedPeriod = "1";
    }

    const selectedTypeObj = masterData.vehicleTypes.find(t => String(t.id) === String(vehicleForm.type));
    const typeName = selectedTypeObj ? String(selectedTypeObj.name).toUpperCase().trim() : "";
    const isCargoEquipment = ["CRANE", "DOZERS", "DUMPERS", "EXCAVATORS", "FORKLIFT", "JCB EARTHMOVER", "MOBILE CRANE", "PAY LOADER", "POCLAIN"].includes(typeName);

    let amt = 25.7;
    if (isCargoEquipment) {
      if (String(vehicleForm.passType) === "1") {
        amt = 41.0 * parseInt(updatedPeriod || 1);
      } else if (String(vehicleForm.passType) === "2") {
        amt = 461.0;
      } else if (String(vehicleForm.passType) === "3") {
        amt = 3073.0;
      }
    } else {
      if (String(vehicleForm.passType) === "1") {
        amt = 25.7 * parseInt(updatedPeriod || 1);
      } else if (String(vehicleForm.passType) === "2") {
        amt = 308.0;
      } else if (String(vehicleForm.passType) === "3") {
        amt = 2049.0;
      }
    }

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
  }, [vehicleForm.passType, vehicleForm.passPeriod, vehicleForm.dateFrom, vehicleForm.type, masterData.vehicleTypes]);

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
    const selectedNationality = getLabelById(
      masterData.nationalities,
      personForm.nationality,
      "label",
    )?.toUpperCase();

    if (selectedNationality === "INDIAN") {
      setPersonForm((prev) => ({
        ...prev,
        country: "75", // India
      }));
    } else if (selectedNationality && selectedNationality !== "INDIAN") {
      // If switching from Indian → foreign, clear India
      if (String(personForm.country) === "75") {
        setPersonForm((prev) => ({
          ...prev,
          country: "",
        }));
      }
    }
  }, [personForm.nationality, masterData.nationalities]);

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
      const first = await axios.get(`${AGENT_API}/pass-request/my-pass-requests`, {
        headers,
        params: { page: 1, limit: 100 },
      });
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
          if (r.status === "fulfilled" && r.value.data?.success) all = all.concat(r.value.data.data || []);
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
  }, [viewStatusFilter, viewDateFilter, viewCustomFrom, viewCustomTo, debouncedSearch, allViewPasses.length]);

  // Per-status counts over ALL passes (the "number system")
  const viewCounts = useMemo(() => {
    const c = { total: allViewPasses.length, submitted: 0, underReview: 0, completed: 0, reverted: 0, rejected: 0, draft: 0, thisMonth: 0 };
    const now = new Date();
    allViewPasses.forEach((p) => {
      const s = String(p.status || "").toUpperCase();
      if (s === "SUBMITTED") c.submitted++;
      else if (s === "UNDER_REVIEW") c.underReview++;
      else if (s === "COMPLETED" || s === "APPROVED" || s === "ISSUED") c.completed++;
      else if (s === "REVERTED") c.reverted++;
      else if (s === "REJECTED") c.rejected++;
      else if (s === "DRAFT") c.draft++;
      const d = new Date(p.createdAt || p.submittedAt);
      if (!Number.isNaN(d.getTime()) && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) c.thisMonth++;
    });
    return c;
  }, [allViewPasses]);

  // Client-side filtered list (status + date range + search)
  const filteredViewPasses = useMemo(() => {
    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const q = (debouncedSearch || "").trim().toLowerCase();

    return allViewPasses.filter((p) => {
      // Status
      if (viewStatusFilter !== "ALL") {
        const s = String(p.status || "").toUpperCase();
        if (viewStatusFilter === "COMPLETED") {
          if (!(s === "COMPLETED" || s === "APPROVED" || s === "ISSUED")) return false;
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
          if (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) return false;
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
        const inRef = String(p.referenceNo || "").toLowerCase().includes(q);
        const inPerson = (p.persons || []).some(
          (pp) => String(pp.name || "").toLowerCase().includes(q) || String(pp.aadharNo || "").toLowerCase().includes(q),
        );
        const inVeh = (p.vehicles || []).some((vv) => String(vv.registrationNo || "").toLowerCase().includes(q));
        if (!inRef && !inPerson && !inVeh) return false;
      }
      return true;
    });
  }, [allViewPasses, viewStatusFilter, viewDateFilter, viewCustomFrom, viewCustomTo, debouncedSearch]);

  const viewTotalPages = Math.max(1, Math.ceil(filteredViewPasses.length / viewPageSize));
  const viewPageSlice = filteredViewPasses.slice((viewPage - 1) * viewPageSize, (viewPage - 1) * viewPageSize + viewPageSize);

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
    let base = 0;
    persons.forEach((p) => (base += p.amount));
    vehicles.forEach((v) => (base += v.amount));
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
      (p) => String(p.masterId) === String(id)
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
      const dateFromValue =
        data.dateFrom
          ? new Date(data.dateFrom).toISOString().slice(0, 16)
          : getCurrentDateTime();

      const dateToValue = calculateDateTo(
        dateFromValue,
        data.passPeriod
          ? String(data.passPeriod)
          : "1",
        passTypeVal
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
      (v) => String(v.masterId) === String(id)
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
      const dateFromValue =
        data.dateFrom
          ? new Date(data.dateFrom).toISOString().slice(0, 16)
          : getCurrentDateTime();

      const dateToValue = calculateDateTo(
        dateFromValue,
        data.passPeriod
          ? String(data.passPeriod)
          : "1",
        passTypeVal
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
    const cleanAadhaar = personForm.aadharNo ? personForm.aadharNo.replace(/\s/g, "").toUpperCase() : "";
    const cleanIdProof = personForm.idProofNumber ? personForm.idProofNumber.replace(/[\s-]/g, "").toUpperCase() : "";
    const cleanTwoWheeler = (personForm.withTwoWheeler && personForm.vehicleNo) ? personForm.vehicleNo.replace(/[\s-]/g, "").toUpperCase() : "";

    const aadharWarning = blacklistWarnings["PERSON_" + cleanAadhaar] || blacklistWarnings["DRIVER_" + cleanAadhaar];
    const idProofWarning = blacklistWarnings["DRIVER_" + cleanIdProof] || blacklistWarnings["PERSON_" + cleanIdProof];
    const twoWheelerWarning = cleanTwoWheeler ? blacklistWarnings["VEHICLE_" + cleanTwoWheeler] : null;

    if (aadharWarning) {
      return toast.error(`Cannot add/update person: Aadhaar Number is blacklisted! Reason: ${aadharWarning.replace("⚠️ BLACKLISTED ", "")}`);
    }
    if (idProofWarning) {
      return toast.error(`Cannot add/update person: Driving License / ID Number is blacklisted! Reason: ${idProofWarning.replace("⚠️ BLACKLISTED ", "")}`);
    }
    if (twoWheelerWarning) {
      return toast.error(`Cannot add/update person: Two Wheeler is blacklisted! Reason: ${twoWheelerWarning.replace("⚠️ BLACKLISTED ", "")}`);
    }

    // ---- Full field validation before add ----
    const errors = {};
    if (!personForm.name.trim()) errors.name = "Full name is required";
    else if (!/^[a-zA-Z\s.'-]{2,80}$/.test(personForm.name.trim()))
      errors.name = "Name must be 2-80 characters (letters only)";

    // Aadhaar validation - required for non-seafarers OR seafarers who chose aadhaar
    if (personForm.hepType !== "3" || personForm.seafarerIdType === "aadhaar") {
      if (!personForm.aadharNo) errors.aadharNo = "Aadhaar number is required";
      else if (!/^\d{12}$/.test(personForm.aadharNo.replace(/\s/g, "")))
        errors.aadharNo = "Aadhaar must be exactly 12 digits";
    }

    // Passport validation - required for seafarers who chose passport
    if (personForm.hepType === "3" && personForm.seafarerIdType === "passport") {
      if (!personForm.passportNo) errors.passportNo = "Passport number is required";
      else if (!/^[A-Z][0-9]{7}$/.test(personForm.passportNo))
        errors.passportNo = "Passport must be 1 letter + 7 digits (e.g., A1234567)";
    }

    // Seafarer must select ID type
    if (personForm.hepType === "3" && !personForm.seafarerIdType) {
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

    if (
      personForm.visaNo &&
      String(personForm.country) !== "75" &&
      !/^[A-Z0-9]{5,20}$/i.test(personForm.visaNo)
    )
      errors.visaNo = "Visa number must be 5-20 alphanumeric characters";

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
      return toast.error(
        "Please fix the highlighted field errors before adding.",
      );
    }
    setPersonErrors({});
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

    // Passport doc is only required for Seafarers who selected "passport" as their ID type
    if (
      personForm.hepType === "3" &&
      personForm.seafarerIdType === "passport" &&
      !(personForm.passportDoc || personForm.existingPassportName)
    )
      return toast.error("Please upload the Passport document for this Seafarer.");

    if (personForm.passType === "2" || personForm.passType === "3") {
      if (!(personForm.policeVerification || personForm.existingPoliceName)) {
        return toast.error(
          "Police Verification is mandatory for Monthly/Yearly passes.",
        );
      }
    }

    // Check if we're editing a reverted entity
    if (editingRevertedEntity && editingRevertedEntity.type === 'person') {
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
    setPersonForm({
      ...initialPersonForm,
      dateFrom: now,
      dateTo: calculateDateTo(now, initialPersonForm.passPeriod, initialPersonForm.passType),
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
      dateTo: calculateDateTo(now, initialPersonForm.passPeriod, initialPersonForm.passType),
    });
    setEditingPersonIndex(null);
  };

  const handleAddVehicle = () => {
    // ---- Blacklist blocking check ----
    const cleanRegNo = vehicleForm.regNo ? vehicleForm.regNo.replace(/[\s-]/g, "").toUpperCase() : "";
    const regNoWarning = blacklistWarnings["VEHICLE_" + cleanRegNo];
    if (regNoWarning) {
      return toast.error(`Cannot add/update vehicle: Registration Number is blacklisted! Reason: ${regNoWarning.replace("⚠️ BLACKLISTED ", "")}`);
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
    // ---- End validation ----
    if (
      !vehicleForm.regNo.trim() ||
      !(vehicleForm.rcDocument || vehicleForm.existingRcName) ||
      !(vehicleForm.insuranceDocument || vehicleForm.existingInsName) ||
      !(vehicleForm.permit || vehicleForm.existingPermitName) ||
      !(vehicleForm.fitnessCert || vehicleForm.existingFitnessName) ||
      !vehicleForm.insuranceExpiry ||
      !vehicleForm.rcValidity
    ) {
      return toast.error(
        "RC Book, Insurance, Permit, Fitness Certificate, and their Validity Dates are mandatory.",
      );
    }
    if (
      String(vehicleForm.passType) === "2" ||
      String(vehicleForm.passType) === "3"
    ) {
      if (
        !(vehicleForm.requestLetter || vehicleForm.existingReqName) ||
        !(vehicleForm.taxDoc || vehicleForm.existingTaxName) ||
        !(vehicleForm.emissionCert || vehicleForm.existingEmissionName)
      ) {
        return toast.error(
          "Request Letter, Tax, and Emission Cert are mandatory for Monthly/Yearly passes.",
        );
      }
    }

    // Check if we're editing a reverted entity
    if (editingRevertedEntity && editingRevertedEntity.type === 'vehicle') {
      // Call API to update reverted vehicle
      handleSaveRevertedEntity();
      return;
    }

    if (editingVehicleIndex !== null) {
      const updated = [...vehicles];
      updated[editingVehicleIndex] = vehicleForm;
      setVehicles(updated);
      setEditingVehicleIndex(null);
      toast.success("Vehicle updated successfully.");
    } else {
      setVehicles([...vehicles, vehicleForm]);
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
      dateTo: calculateDateTo(now, initialVehicleForm.passPeriod, initialVehicleForm.passType),
    });
    setEditingVehicleIndex(null);
    toggleModal("vehicle", true);
  };

  const deleteVehicleRow = (index) => {
    const updated = [...vehicles];
    updated.splice(index, 1);
    setVehicles(updated);
    toast.success("Vehicle removed.");
  };

  const handleSubmitRequest = async () => {
    if (companyBlacklisted) {
      return toast.error("Pass application blocked. Your company is blacklisted.", {
        description: `Reason: ${companyBlacklistReason}`,
        duration: 8000
      });
    }
    if (!generalForm.purpose)
      return toast.warning("Please select a Purpose of Visit.");
    if (!generalForm.authLetter)
      return toast.warning("Please upload the Authorised Letter.");
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
          designationId:
            p.designation === "Others"
              ? null
              : parseInt(p.designation, 10) || null,
          cardNumber: p.cardNumber,
          accessAreaId: getEnumValue(
            masterData.accessAreas,
            p.accessArea,
            "OTHER GATES ONLY",
          ),
          withTwoWheeler: p.withTwoWheeler,
          vehicleNo: p.vehicleNo,
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
        if (p.idProofFile) formData.append(`personIdProof_${idx}`, p.idProofFile);

        // Auto-fallback if driverLicence is empty for a Driver
        const dlFile = p.driverLicence || (p.hepType === "1" ? p.idProofFile : null);
        if (dlFile) formData.append(`driverLicense_${idx}`, dlFile);

        if (p.policeVerification)
          formData.append(`policeVerification_${idx}`, p.policeVerification);
        if (p.proofOfEmployment)
          formData.append(`employmentProof_${idx}`, p.proofOfEmployment);
        if (p.copyOfLicence) formData.append(`chaLicenseCopy_${idx}`, p.copyOfLicence);
        if (p.passportDoc) formData.append(`passportDoc_${idx}`, p.passportDoc);
        if (p.cdcDocument) formData.append(`cdcDocument_${idx}`, p.cdcDocument);
        if (p.declarationForm)
          formData.append(`declarationForm_${idx}`, p.declarationForm);
      });

      // Send files for every vehicle

      vehicles.forEach((v, idx) => {
        if (v.rcDocument) formData.append(`vehicleRC_${idx}`, v.rcDocument);
        if (v.insuranceDocument)
          formData.append(`vehicleInsurance_${idx}`, v.insuranceDocument);
        if (v.permit) formData.append(`vehiclePermit_${idx}`, v.permit);
        if (v.fitnessCert) formData.append(`vehicleFitness_${idx}`, v.fitnessCert);
        if (v.requestLetter)
          formData.append(`vehicleRequestLetter_${idx}`, v.requestLetter);
        if (v.taxDoc) formData.append(`vehicleTax_${idx}`, v.taxDoc);
        if (v.emissionCert) formData.append(`vehicleEmission_${idx}`, v.emissionCert);
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
        setAgreedToTerms(false);
        setActiveTab("view");
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Submission failed. Server Error.",
      );
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
    disabled = false
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
          className={`absolute inset-0 w-full h-full opacity-0 z-10 ${disabled
              ? "cursor-not-allowed"
              : "cursor-pointer"
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
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border ${disabled
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
    const revertedPersonsList = pass.persons?.filter(p => p.status === 'reverted') || [];
    const revertedVehiclesList = pass.vehicles?.filter(v => v.status === 'reverted') || [];

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

    // Store the entity being edited for later use
    setEditingRevertedEntity({ type, index, id: entity.id, passId: editingRevertedPass?.id });

    if (type === 'person') {
      // Set editing index so master directory dropdown is hidden and button shows "Update Person"
      setEditingPersonIndex('reverted');

      // Map ENUM strings to numeric IDs using masterData
      const nationalityEnum = entity.nationality; // "INDIAN" or "FOREIGNER"
      const nationalityObj = masterData.nationalities.find(n => (n.value || n.label || n.name || "").toUpperCase() === nationalityEnum?.toUpperCase());
      const nationalityId = nationalityObj ? String(nationalityObj.id || nationalityObj.value) : (nationalityEnum === "INDIAN" ? "1" : "2");

      const accessAreaEnum = entity.accessAreaId; // "OIL JETTY AND OTHER GATES" or "OTHER GATES ONLY"
      const accessAreaObj = masterData.accessAreas.find(a => (a.value || a.label || a.name || "").toUpperCase() === accessAreaEnum?.toUpperCase());
      const accessAreaId = accessAreaObj ? String(accessAreaObj.id || accessAreaObj.value) : '';

      const idProofTypeEnum = entity.idProofType; // "PASSPORT", "PAN CARD", etc.
      const idProofTypeObj = masterData.idProofTypes.find(i => (i.value || i.label || i.name || "").toUpperCase() === idProofTypeEnum?.toUpperCase());
      const idProofTypeId = idProofTypeObj ? String(idProofTypeObj.id || idProofTypeObj.value) : idProofTypeEnum;

      const passTypeEnum = entity.passType; // "DAILY", "MONTHLY", "YEARLY"
      const passTypeObj = masterData.passTypes.find(p => (p.value || p.label || p.name || "").toUpperCase() === passTypeEnum?.toUpperCase());
      const passTypeId = passTypeObj ? String(passTypeObj.id || passTypeObj.value) : passTypeEnum;

      // Map reverted person data to personForm structure
      // NOTE: personForm uses: country, designation, accessArea (not countryId, designationId, accessAreaId)
      console.log("REVERTED ENTITY1657", entity);
      setPersonForm({
        id: entity.id,
        masterId: entity.masterPersonId,
        name: entity.name || '',
        mobile: entity.mobile || '',
        email: entity.email || '',
        aadharNo: entity.aadharNo || entity.aadharNumber || entity.idProofNumber || '',
        designation: String(entity.designationId || ''),
        designationOther: '',
        idProofType: idProofTypeId,
        idProofNumber: entity.idProofNumber || entity.aadharNo || '',
        hepType: String(entity.hepTypeId || '2'),
        passType: passTypeId,
        passPeriod: entity.passPeriod || '1',
        dateFrom: entity.dateFrom ? (entity.dateFrom.includes('T') ? entity.dateFrom.split('T')[0] : entity.dateFrom) + 'T00:00' : '',
        dateTo: entity.dateTo ? (entity.dateTo.includes('T') ? entity.dateTo.split('T')[0] : entity.dateTo) + 'T00:00' : '',
        amount: entity.amount || '',
        nationality: nationalityId,
        country: String(entity.countryId || '75'),
        visaNo: entity.visaNo || '',
        cardNumber: entity.cardNumber || '',
        withTwoWheeler: entity.withTwoWheeler || false,
        vehicleNo: entity.vehicleNo || '',
        accessArea: accessAreaId,
        passportNo: entity.passportNo || '',
        cdcNumber: entity.cdcNumber || '',
        seafarerPassFor: entity.seafarerPassFor || 'Sign-On',
        seafarerIdType: entity.seafarerIdType || '',
        photo: null,
        aadharFile: null,
        driverLicence: null,
        requisitionLetter: null,
        passportDoc: null,
        policeVerification: null,
        proofOfEmployment: null,
        copyOfLicence: null,
        idProofFile: null,
        cdcDocument: null,
        declarationForm: null,
        // Existing file names for viewing
        existingPassRequestId: editingRevertedPass?.id,

        existingPhotoName: entity.photoFileName,
        existingPhotoPath: entity.photoFilePath,

        existingAadharName: entity.aadharPDFFileName,
        existingAadharPath: entity.aadharPDFFilePath,

        existingIdProofName: entity.idProofFileName,
        existingIdProofPath: entity.idProofFilePath,

        existingDlName: entity.driverLicenseName,
        existingDlPath: entity.driverLicensePath,

        existingReqName: entity.requisitionLetterName,
        existingPassportName: entity.passportName,
        existingPoliceName: entity.policeVerificationName,
        existingEmpName: entity.employmentProofName,
        existingChaName: entity.chaLicenseName,
        existingCdcName: entity.cdcDocumentName,
        existingDeclarationName: entity.declarationFormName,
        isEditing: true,
        editIndex: index
      });

      // Open the person form modal
      toggleModal("person", true);
      toast.success('Person details loaded for editing');

    } else if (type === 'vehicle') {
      // Set editing index so fleet dropdown is hidden and button shows "Update Vehicle"
      setEditingVehicleIndex('reverted');

      // Map ENUM string to numeric ID using masterData
      const accessAreaEnum = entity.accessAreaId; // "OIL JETTY AND OTHER GATES" or "OTHER GATES ONLY"
      const accessAreaObj = masterData.accessAreas.find(a => (a.value || a.label || a.name || "").toUpperCase() === accessAreaEnum?.toUpperCase());
      const accessAreaId = accessAreaObj ? String(accessAreaObj.id || accessAreaObj.value) : '';
      console.log("REVERTED ENTITY1726", entity);
      // Map reverted vehicle data to vehicleForm structure
      setVehicleForm({
        id: entity.id,
        regNo: entity.registrationNo || entity.regNo || '',
        engineNo: entity.engineNo || '',
        chassisNo: entity.chassisNo || '',
        type: String(entity.vehicleTypeId || ''),
        fuelType: entity.fuelType || '',
        accessArea: accessAreaId,
        insuranceExpiry: entity.insuranceExpiry ? entity.insuranceExpiry.split('T')[0] : '',
        rcValidity: entity.rcValidity ? entity.rcValidity.split('T')[0] : '',
        passType: String(entity.passType || ''),
        passPeriod: entity.passPeriod || '',
        dateFrom: entity.dateFrom ? (entity.dateFrom.includes('T') ? entity.dateFrom.split('T')[0] : entity.dateFrom) + 'T00:00' : '',
        dateTo: entity.dateTo ? (entity.dateTo.includes('T') ? entity.dateTo.split('T')[0] : entity.dateTo) + 'T00:00' : '',
        amount: entity.amount || '',
        rcDocument: null,
        insuranceDocument: null,
        permit: null,
        fitnessCert: null,
        requestLetter: null,
        taxDoc: null,
        emissionCert: null,
        // Existing file names for viewing
        existingPassRequestId: editingRevertedPass?.id,
        existingRcName: entity.scannedCopyFileName,
        existingInsName: entity.insuranceFileName,
        existingPermitName: entity.permitFileName,
        existingFitnessName: entity.fitnessFileName,
        existingReqName: entity.requestLetterName,
        existingTaxName: entity.taxDocName,
        existingEmissionName: entity.emissionCertName,
        isEditing: true,
        editIndex: index
      });

      // Open the vehicle form modal
      toggleModal("vehicle", true);
      toast.success('Vehicle details loaded for editing');
    }
  };

  const handleSaveRevertedEntity = async () => {
    if (!editingRevertedEntity) return;

    const { type, index, id } = editingRevertedEntity;

    try {
      const token = localStorage.getItem("accessToken");
      const headers = { Authorization: `Bearer ${token}` };

      if (type === 'person') {
        // Use personForm data for the update
        const updateData = {
          id: id,
          name: personForm.name,
          mobile: personForm.mobile,
          aadharNo: personForm.aadharNo,
          designation: personForm.designation,
          idProofType: personForm.idProofType,
          hepTypeId: personForm.hepType,
          passType: personForm.passType,
          passPeriod: personForm.passPeriod,
          dateFrom: personForm.dateFrom,
          dateTo: personForm.dateTo,
          amount: personForm.amount,
          countryId: personForm.nationality,
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
          declarationFormName: personForm.existingDeclarationName,
        };

        // Only update local reverted persons state (no DB update yet)
        // Preserve actual File objects for upload during resubmission
        const updatedPersons = [...revertedPersons];
        updatedPersons[index] = {
          ...updateData,
          id,
          status: 'updated',
          // Carry File objects from personForm for resubmission
          newPhoto: personForm.photo || null,
          newAadhar: personForm.aadharFile || null,
          newIdProof: personForm.idProofFile || null,
          newDriverLicence: personForm.driverLicence || null,
          newPoliceVerification: personForm.policeVerification || null,
          newEmploymentProof: personForm.proofOfEmployment || null,
          newChaLicence: personForm.copyOfLicence || null,
          newPassport: personForm.passportDoc || null,
          newRequisitionLetter: personForm.requisitionLetter || null,
          newCdc: personForm.cdcDocument || null,
          newDeclaration: personForm.declarationForm || null,
        };
        setRevertedPersons(updatedPersons);

        // Close person form and reset
        toggleModal("person", false);
        setPersonForm(initialPersonForm);

        // Reopen the reverted edit modal
        setRevertedEditModal(true);

      } else if (type === 'vehicle') {
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
          // File names for reference
          scannedCopyFileName: vehicleForm.existingRcName,
          insuranceFileName: vehicleForm.existingInsName,
          permitFileName: vehicleForm.existingPermitName,
          fitnessFileName: vehicleForm.existingFitnessName,
          requestLetterName: vehicleForm.existingReqName,
          taxDocName: vehicleForm.existingTaxName,
          emissionCertName: vehicleForm.existingEmissionName,
        };

        // Only update local reverted vehicles state (no DB update yet)
        // Preserve actual File objects for upload during resubmission
        const updatedVehicles = [...revertedVehicles];
        updatedVehicles[index] = {
          ...updateData,
          id,
          status: 'updated',
          // Carry File objects from vehicleForm for resubmission
          newRc: vehicleForm.rcDocument || null,
          newInsurance: vehicleForm.insuranceDocument || null,
          newPermit: vehicleForm.permit || null,
          newFitness: vehicleForm.fitnessCert || null,
          newRequestLetter: vehicleForm.requestLetter || null,
          newTax: vehicleForm.taxDoc || null,
          newEmission: vehicleForm.emissionCert || null,
        };
        setRevertedVehicles(updatedVehicles);

        // Close vehicle form and reset
        toggleModal("vehicle", false);
        setVehicleForm(initialVehicleForm);

        // Reopen the reverted edit modal
        setRevertedEditModal(true);
      }

      toast.success(`${type === 'person' ? 'Person' : 'Vehicle'} updated successfully`);
      setEditingRevertedEntity(null);

    } catch (error) {
      console.error('Error updating reverted entity:', error);
      toast.error(error.response?.data?.message || 'Failed to update entity');
    }
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
            '1': 'DAILY',
            '2': 'MONTHLY',
            '3': 'YEARLY'
          };
          const passTypeEnum = passTypeMap[person.passType] || person.passType;

          const formData = new FormData();

          // Append text fields
          formData.append('name', person.name || '');
          formData.append('mobile', person.mobile || '');
          formData.append('aadharNo', person.aadharNo || '');
          formData.append('designation', person.designation || '');
          formData.append('idProofType', person.idProofType || '');
          formData.append('hepTypeId', person.hepTypeId || '');
          formData.append('passType', passTypeEnum);
          formData.append('passPeriod', person.passPeriod || '');
          formData.append('dateFrom', person.dateFrom || '');
          formData.append('dateTo', person.dateTo || '');
          formData.append('amount', person.amount || '');
          formData.append('countryId', person.countryId || '');

          // File name references
          formData.append('photoFileName', person.photoFileName || '');
          formData.append('aadharPDFFileName', person.aadharPDFFileName || '');
          formData.append('driverLicenseName', person.driverLicenseName || '');
          formData.append('requisitionLetterName', person.requisitionLetterName || '');
          formData.append('passportName', person.passportName || '');
          formData.append('policeVerificationName', person.policeVerificationName || '');
          formData.append('employmentProofName', person.employmentProofName || '');
          formData.append('chaLicenseName', person.chaLicenseName || '');
          formData.append('idProofFileName', person.idProofFileName || '');
          formData.append('cdcDocumentName', person.cdcDocumentName || '');
          formData.append('declarationFormName', person.declarationFormName || '');

          // Append actual File objects if re-uploaded
          if (person.newPhoto) formData.append('personPhoto', person.newPhoto);
          if (person.newAadhar) formData.append('personAadhar', person.newAadhar);
          if (person.newIdProof) formData.append('personIdProof', person.newIdProof);
          if (person.newDriverLicence) formData.append('driverLicense', person.newDriverLicence);
          if (person.newPoliceVerification) formData.append('policeVerification', person.newPoliceVerification);
          if (person.newEmploymentProof) formData.append('employmentProof', person.newEmploymentProof);
          if (person.newChaLicence) formData.append('chaLicenseCopy', person.newChaLicence);
          if (person.newPassport) formData.append('passportDoc', person.newPassport);
          if (person.newRequisitionLetter) formData.append('requisitionLetter', person.newRequisitionLetter);
          if (person.newCdc) formData.append('cdcDocument', person.newCdc);
          if (person.newDeclaration) formData.append('declarationForm', person.newDeclaration);

          console.log('Updating person:', person.id);
          await axios.put(
            `${AGENT_API}/pass-request/update-pass-person/${person.id}`,
            formData,
            { headers: { ...headers, 'Content-Type': 'multipart/form-data' } }
          );
          console.log('Person updated successfully:', person.id);
        } catch (error) {
          console.error('Error updating person:', person.id, error);
          throw error;
        }
      }

      // Update all vehicles in DB
      for (const vehicle of revertedVehicles) {
        try {
          const passTypeMap = {
            '1': 'DAILY',
            '2': 'MONTHLY',
            '3': 'ANNUAL'
          };
          const passTypeEnum = passTypeMap[vehicle.passType] || vehicle.passType;

          const formData = new FormData();

          // Append text fields
          formData.append('registrationNo', vehicle.registrationNo || vehicle.regNo || '');
          formData.append('vehicleTypeId', vehicle.vehicleTypeId || '');
          formData.append('fuelType', vehicle.fuelType || '');
          formData.append('insuranceExpiry', vehicle.insuranceExpiry || '');
          formData.append('rcValidity', vehicle.rcValidity || '');
          formData.append('passType', passTypeEnum);
          formData.append('passPeriod', vehicle.passPeriod || '');
          formData.append('dateFrom', vehicle.dateFrom || '');
          formData.append('dateTo', vehicle.dateTo || '');
          formData.append('amount', vehicle.amount || '');

          // File name references
          formData.append('scannedCopyFileName', vehicle.scannedCopyFileName || '');
          formData.append('insuranceFileName', vehicle.insuranceFileName || '');
          formData.append('permitFileName', vehicle.permitFileName || '');
          formData.append('fitnessFileName', vehicle.fitnessFileName || '');
          formData.append('requestLetterName', vehicle.requestLetterName || '');
          formData.append('taxDocName', vehicle.taxDocName || '');
          formData.append('emissionCertName', vehicle.emissionCertName || '');

          // Append actual File objects if re-uploaded
          if (vehicle.newRc) formData.append('vehicleRC', vehicle.newRc);
          if (vehicle.newInsurance) formData.append('vehicleInsurance', vehicle.newInsurance);
          if (vehicle.newPermit) formData.append('vehiclePermit', vehicle.newPermit);
          if (vehicle.newFitness) formData.append('vehicleFitness', vehicle.newFitness);
          if (vehicle.newRequestLetter) formData.append('vehicleRequestLetter', vehicle.newRequestLetter);
          if (vehicle.newTax) formData.append('vehicleTax', vehicle.newTax);
          if (vehicle.newEmission) formData.append('vehicleEmission', vehicle.newEmission);

          console.log('Updating vehicle:', vehicle.id);
          await axios.put(
            `${AGENT_API}/pass-request/update-pass-vehicle/${vehicle.id}`,
            formData,
            { headers: { ...headers, 'Content-Type': 'multipart/form-data' } }
          );
          console.log('Vehicle updated successfully:', vehicle.id);
        } catch (error) {
          console.error('Error updating vehicle:', vehicle.id, error);
          throw error;
        }
      }

      // Resubmit the pass - change status back to PENDING
      console.log('Resubmitting pass:', editingRevertedPass.id);
      await axios.put(
        `${AGENT_API}/pass-request/resubmit-reverted-pass/${editingRevertedPass.id}`,
        {},
        { headers }
      );
      console.log('Pass resubmitted successfully');

      toast.success('Pass resubmitted successfully!');
      closeRevertedEditModal();

      // Reset pagination and switch to 'view' tab to show resubmitted pass
      setCurrentPage(1);
      setActiveTab("view");

    } catch (error) {
      console.error('Error resubmitting pass:', error);
      toast.error(error.response?.data?.message || 'Failed to resubmit pass');
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
          <h2 className="text-3xl font-bold text-[#0a1e4d] dark:text-white">Pass Request</h2>
          <p className="text-base text-slate-500 dark:text-stone-300 font-medium">
            Apply for new harbor entry permits
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
                <h4 className="text-base font-extrabold tracking-wide uppercase">Your Company is Blacklisted!</h4>
                <p className="text-sm text-red-100 mt-1 leading-relaxed font-semibold">
                  Pass requests and applications are disabled for your company.
                </p>
                <div className="inline-flex items-center gap-2 mt-3 px-3 py-1.5 bg-black/20 hover:bg-black/35 rounded-xl border border-white/10 text-xs font-bold text-white transition-all">
                  <span className="text-red-300 uppercase tracking-widest text-[10px]">Suspension Reason:</span>
                  <span className="uppercase tracking-wide">{companyBlacklistReason}</span>
                </div>
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
                    Authorised Letter Copy{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <label className="w-full h-10 border-2 border-dashed border-slate-300 bg-slate-50 rounded-lg px-4 flex items-center justify-center gap-2 cursor-pointer hover:bg-orange-50 hover:border-orange-300 transition-colors group">
                    <Upload className="h-4 w-4 text-slate-400 group-hover:text-orange-500" />
                    <span className="text-sm text-slate-600 font-medium truncate group-hover:text-orange-600">
                      {generalForm.authLetter
                        ? generalForm.authLetter.name
                        : "Upload PDF/JPG (Max 2MB)"}
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
                    Requisition Letter <span className="text-red-500">*</span>
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
                <Users className="h-5 w-5 text-orange-500" /> Detail of Persons:
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
                          {getLabelById(masterData.passTypes, p.passType)} Pass
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
                          {getLabelById(masterData.passTypes, v.passType)} Pass
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
                  <ShieldCheck className="h-4 w-4 text-emerald-600" /> Terms &
                  Conditions
                </h4>
                <p className="text-[10px] text-slate-600 text-justify leading-relaxed font-medium">
                  I/We hereby certify that the above permits are required only
                  for our official purpose. We hold responsibility for
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
                <RefreshCw className={`h-4 w-4 ${allViewLoading ? "animate-spin" : ""}`} />
                {allViewLoading ? "Refreshing..." : "Refresh List"}
              </button>
            </div>

            {/* ── Number system: per-status count cards (click to filter) ── */}
            <div className="px-6 pt-5 pb-1 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { key: "ALL", label: "Total", value: viewCounts.total, icon: FileText, color: "text-[#0a1e4d]", ring: "ring-[#0a1e4d]/30", bg: "bg-[#0a1e4d]/5" },
                { key: "SUBMITTED", label: "Submitted", value: viewCounts.submitted, icon: Send, color: "text-blue-600", ring: "ring-blue-300", bg: "bg-blue-50" },
                { key: "UNDER_REVIEW", label: "Under Review", value: viewCounts.underReview, icon: Clock, color: "text-amber-600", ring: "ring-amber-300", bg: "bg-amber-50" },
                { key: "COMPLETED", label: "Completed", value: viewCounts.completed, icon: CheckCircle, color: "text-emerald-600", ring: "ring-emerald-300", bg: "bg-emerald-50" },
                { key: "REVERTED", label: "Reverted", value: viewCounts.reverted, icon: RefreshCw, color: "text-orange-600", ring: "ring-orange-300", bg: "bg-orange-50" },
                { key: "REJECTED", label: "Rejected", value: viewCounts.rejected, icon: XCircle, color: "text-red-600", ring: "ring-red-300", bg: "bg-red-50" },
              ].map((c) => {
                const active = viewStatusFilter === c.key;
                return (
                  <button
                    key={c.key}
                    onClick={() => setViewStatusFilter(active && c.key !== "ALL" ? "ALL" : c.key)}
                    title={`Filter by ${c.label}`}
                    className={`text-left rounded-xl p-3 ring-1 transition-all active:scale-[0.98] ${active ? `${c.bg} ${c.ring} shadow-sm` : "bg-white ring-slate-200 hover:bg-slate-50 hover:ring-slate-300"}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${active ? c.color : "text-slate-500"}`}>{c.label}</span>
                      <c.icon className={`h-3.5 w-3.5 ${c.color}`} />
                    </div>
                    <p className={`mt-1 text-2xl font-black tabular-nums ${active ? c.color : "text-[#0a1e4d]"}`}>
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

              {(viewDateFilter !== "all" || viewStatusFilter !== "ALL" || debouncedSearch) && (
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
                Showing {filteredViewPasses.length > 0 ? (viewPage - 1) * viewPageSize + 1 : 0}–
                {Math.min(viewPage * viewPageSize, filteredViewPasses.length)} of {filteredViewPasses.length} records
                {filteredViewPasses.length !== viewCounts.total && (
                  <span className="ml-2 text-orange-500 normal-case tracking-normal">(filtered from {viewCounts.total})</span>
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

                      return (
                        <tr
                          key={pass.id || idx}
                          onClick={() => setSelectedPassDetails(pass)}
                          className="hover:bg-blue-50/50 transition-colors cursor-pointer"
                        >
                          <td className="px-6 py-4 text-sm font-bold text-slate-400 text-center border-r border-slate-100 tabular-nums">
                            {(viewPage - 1) * viewPageSize + idx + 1}
                          </td>
                          <td className="px-6 py-4 text-sm font-bold text-[#0a1e4d] border-r border-slate-100">
                            {passIdStr}
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
                              className={`inline-block px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${currentStatus === "SUBMITTED"
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
                <AlertCircle className="h-5 w-5 text-amber-600" /> Reverted Applications - Action Required
              </h3>
              <button
                onClick={fetchSubmittedPasses}
                disabled={loadingPasses}
                className="bg-white text-amber-700 px-4 py-2 rounded-lg border border-amber-200 text-xs font-bold hover:bg-amber-50 disabled:opacity-50 transition-colors flex items-center gap-2 shadow-sm"
              >
                <RefreshCw className={`h-4 w-4 ${loadingPasses ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>

            <div className="px-6 py-4 bg-amber-50/30 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-xs font-bold text-amber-900 uppercase tracking-widest">
                Showing {paginationMeta.totalRecords > 0 ? (paginationMeta.currentPage - 1) * paginationMeta.pageSize + 1 : 0}–
                {Math.min(paginationMeta.currentPage * paginationMeta.pageSize, paginationMeta.totalRecords)} of {paginationMeta.totalRecords} reverted records
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
                  ) : submittedPasses.filter(p => p.status === 'REVERTED' || p.hasRevertedEntities).length === 0 ? (
                    <tr>
                      <td
                        colSpan="5"
                        className="p-12 text-center text-sm font-medium text-slate-400 italic"
                      >
                        <div className="flex flex-col items-center gap-3">
                          <CheckCircle2 className="h-12 w-12 text-emerald-400" />
                          <p>No reverted applications found.</p>
                          <p className="text-xs">All your pass applications are under review or completed.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    submittedPasses
                      .filter(p => p.status === 'REVERTED' || p.hasRevertedEntities)
                      .map((pass) => {
                        const totalEntities = (pass.persons?.length || 0) + (pass.vehicles?.length || 0);
                        const revertedEntities = [
                          ...(pass.persons || []).filter(p => p.status === 'reverted'),
                          ...(pass.vehicles || []).filter(v => v.status === 'reverted')
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
                              {new Date(pass.submittedAt || pass.createdAt).toLocaleDateString('en-GB', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
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
                    isClearable
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
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase">
                      Type of HEP <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={personForm.hepType}
                      onChange={handleHepTypeChange}
                      className={inputClass}
                    >
                      <option value="">Select Type</option>
                      {masterData.hepTypes.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.name}
                        </option>
                      ))}
                    </select>
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
                            // Clear opposite field when switching
                            aadharNo: value === "passport" ? "" : personForm.aadharNo,
                            passportNo: value === "aadhaar" ? "" : personForm.passportNo,
                            aadharFile: value === "passport" ? null : personForm.aadharFile,
                          });
                          // Clear error when selection is made
                          if (personErrors.seafarerIdType) {
                            setPersonErrors((prev) => ({ ...prev, seafarerIdType: null }));
                          }
                        }}
                        className={`w-full h-10 border rounded-lg text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 px-3 outline-none shadow-sm transition-all ${personErrors.seafarerIdType
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

                  {/* Aadhaar Fields - Show for non-seafarers OR seafarers who selected aadhaar */}
                  {(personForm.hepType !== "3" || personForm.seafarerIdType === "aadhaar") && (
                    <>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase">
                          Upload Aadhar <span className="text-red-500">*</span>


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
                              personForm.editIndex
                            )
                          }

                          // onChange={async (e) => {
                          //   const file =
                          //     e?.target?.files?.[0] ||
                          //     e?.files?.[0] ||
                          //     e?.file ||
                          //     e;

                          //   setPersonForm((prev) => ({
                          //     ...prev,
                          //     aadharFile: file,
                          //   }));

                          //   if (!file) return;

                          //   try {
                          //     toast.loading("Reading Aadhaar PDF...", {
                          //       id: "aadhar-ocr",
                          //     });

                          //     const extractedAadhar =
                          //       await extractAadharFromPdf(file);

                          //     if (!extractedAadhar) {
                          //       setPersonForm((prev) => ({
                          //         ...prev,
                          //         aadharFile: file,
                          //         aadharNo: "", // clear old number
                          //       }));

                          //       toast.warning(
                          //         "Could not detect Aadhaar automatically. Please enter manually."
                          //       );

                          //       return;
                          //     }

                          //     toast.dismiss("aadhar-ocr");

                          //     if (extractedAadhar) {

                          //       setPersonForm((prev) => ({
                          //         ...prev,
                          //         aadharFile: file,
                          //         aadharNo: extractedAadhar,
                          //       }));

                          //       toast.success(
                          //         `Aadhaar detected: ${extractedAadhar}`
                          //       );

                          //     } else {

                          //       toast.warning(
                          //         "Could not detect Aadhaar automatically. Please enter manually."
                          //       );
                          //     }

                          //   } catch (error) {

                          //     toast.dismiss("aadhar-ocr");

                          //     console.error(error);

                          //     toast.error("Failed to read Aadhaar PDF");
                          //   }
                          // }}
                          onChange={async (e) => {

                            if (personForm.masterId) {
                              toast.error(
                                "Aadhaar document comes from Master Directory and cannot be changed."
                              );
                              return;
                            }


                            const file =
                              e?.target?.files?.[0] ||
                              e?.files?.[0] ||
                              e?.file ||
                              e;

                            if (!file) return;

                            // Immediately store uploaded file
                            setPersonForm((prev) => ({
                              ...prev,
                              aadharFile: file,
                            }));

                            try {
                              toast.loading(
                                "Reading Aadhaar PDF...",
                                {
                                  id: "aadhar-ocr",
                                }
                              );

                              const extractedAadhar =
                                await extractAadharFromPdf(file);

                              // Always stop loading toast
                              toast.dismiss("aadhar-ocr");

                              // ==========================
                              // Aadhaar NOT detected
                              // ==========================
                              if (!extractedAadhar) {
                                setPersonForm((prev) => ({
                                  ...prev,
                                  aadharFile: file,
                                  aadharNo: "", // clear previous Aadhaar
                                }));

                                toast.warning(
                                  "Could not detect Aadhaar automatically. Please enter manually."
                                );

                                return;
                              }

                              // ==========================
                              // Aadhaar detected
                              // ==========================
                              setPersonForm((prev) => ({
                                ...prev,
                                aadharFile: file,
                                aadharNo: extractedAadhar,
                              }));

                              toast.success(
                                `Aadhaar detected: ${extractedAadhar}`
                              );

                            } catch (error) {
                              toast.dismiss("aadhar-ocr");

                              console.error(error);

                              // Clear old Aadhaar on failure
                              setPersonForm((prev) => ({
                                ...prev,
                                aadharFile: file,
                                aadharNo: "",
                              }));

                              toast.error(
                                "Failed to read Aadhaar PDF"
                              );
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
                          const isValid = /^\d{12}$/.test(personForm.aadharNo);
                          const hasError = !!personErrors.aadharNo;

                          let customBorderClass = "border-slate-300 focus:ring-orange-500/20 focus:border-orange-500";
                          if (hasVal) {
                            customBorderClass = (hasError || !isValid)
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
                                  setPersonForm({ ...personForm, aadharNo: val });
                                  if (val.length === 12) {
                                    validatePersonField("aadharNo", val);
                                    // Real-time blacklist check — fires the moment 12 digits are complete
                                    checkBlacklistStatus("PERSON", val);
                                    checkBlacklistStatus("DRIVER", val);
                                  }
                                }}
                                onBlur={(e) => validatePersonField("aadharNo", e.target.value)}
                                className={`w-full h-10 border rounded-lg text-sm px-3 shadow-sm outline-none transition-all focus:ring-2 ${customBorderClass}`}
                                placeholder="XXXX XXXX XXXX"
                                maxLength={12}
                                inputMode="numeric"
                              />
                              {hasVal && (
                                <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold transition-all animate-in fade-in duration-200">
                                  {(hasError || !isValid) ? (
                                    <>
                                      <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                                      <span className="text-red-500">Aadhaar must be exactly 12 digits</span>
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                      <span className="text-emerald-600">Valid Aadhaar format</span>
                                    </>
                                  )}
                                </div>
                              )}
                              {/* Real-time blacklist inline warning — same pattern as vehicle reg field */}
                              {isValid && (blacklistWarnings["PERSON_" + personForm.aadharNo] || blacklistWarnings["DRIVER_" + personForm.aadharNo]) && (
                                <div className="mt-1.5 flex items-start gap-1.5 bg-red-50 border border-red-300 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-red-700 animate-in fade-in duration-200">
                                  <AlertCircle className="h-3.5 w-3.5 text-red-600 shrink-0 mt-0.5" />
                                  <span>
                                    PORT BLACKLISTED —{" "}
                                    {(blacklistWarnings["PERSON_" + personForm.aadharNo] || blacklistWarnings["DRIVER_" + personForm.aadharNo])?.replace("⚠️ BLACKLISTED ", "")}
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
                  {personForm.hepType === "3" && personForm.seafarerIdType === "passport" && (
                    <>
                      <div className="space-y-1.5 animate-in zoom-in">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Passport No. <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={personForm.passportNo}
                          onChange={(e) => {
                            const val = e.target.value.toUpperCase().slice(0, 8);
                            setPersonForm({ ...personForm, passportNo: val });
                            // Clear error on change
                            if (personErrors.passportNo) {
                              setPersonErrors((prev) => ({ ...prev, passportNo: null }));
                            }
                          }}
                          className={`w-full h-10 border rounded-lg text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 px-3 shadow-sm outline-none uppercase transition-all ${personErrors.passportNo
                            ? "border-red-400 bg-red-50"
                            : "border-slate-300 bg-white"
                            }`}
                          placeholder="A1234567"
                          maxLength={8}
                        />
                        {personErrors.passportNo && (
                          <p className="text-xs text-red-500 mt-0.5 font-medium">
                            {personErrors.passportNo}
                          </p>
                        )}
                      </div>
                      <div className="space-y-1.5 animate-in zoom-in">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Upload Passport <span className="text-red-500">*</span>
                        </label>
                        <FileUploadBox
                          file={personForm.passportDoc}
                          existingFileName={personForm.existingPassportName}
                          onView={() =>
                            handleViewDoc(
                              personForm.existingPassRequestId,
                              "passportDoc",
                              personForm.existingPassportName,
                              personForm.editIndex
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
                  {/* <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase">
                      Card Number
                    </label>
                    <input
                      type="text"
                      value={personForm.cardNumber}
                      onChange={(e) =>
                        setPersonForm({
                          ...personForm,
                          cardNumber: e.target.value,
                        })
                      }
                      className={inputClass}
                      placeholder="RFID card number"
                    />
                  </div> */}
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
                        value={personForm.mobile} // Fixed: Removed URL wrapper
                        className={`w-full pl-[5.5rem] pr-3 h-10 border rounded-lg text-sm focus:ring-2 outline-none transition-all ${personErrors.mobile
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
                          // Logic merged: Clean the input AND update state
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
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase">
                      With Two wheeler
                    </label>
                    {(() => {
                      const hasVal = !!personForm.vehicleNo.trim();
                      const isTwoWheeler = personForm.withTwoWheeler;
                      const hasError = !!personErrors.vehicleNo;

                      let containerClass = "border-slate-300 focus-within:ring-2 focus-within:ring-orange-500/30 focus-within:border-orange-500";
                      if (isTwoWheeler && hasVal) {
                        containerClass = hasError
                          ? "border-red-400 focus-within:ring-2 focus-within:ring-red-500/20 focus-within:border-red-400"
                          : "border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500";
                      }

                      return (
                        <div className={`flex h-10 shadow-sm rounded-lg overflow-hidden border transition-all ${containerClass}`}>
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
                                validatePersonField("vehicleNo", e.target.value);
                              }
                            }}
                            onChange={(e) => {
                              const val = e.target.value.toUpperCase().slice(0, 13);
                              setPersonForm({
                                ...personForm,
                                vehicleNo: val,
                              });
                              if (personForm.withTwoWheeler) {
                                if (val.length >= 8) {
                                  validatePersonField("vehicleNo", val);
                                }
                                if (/^[A-Z]{2}[-\s]?[0-9]{1,2}[-\s]?[A-Z]{1,3}[-\s]?[0-9]{4}$/i.test(val)) {
                                  checkBlacklistStatus("VEHICLE", val.replace(/[\s-]/g, ""));
                                }
                              }
                            }}
                          />
                        </div>
                      );
                    })()}
                    {personForm.withTwoWheeler && personForm.vehicleNo.trim() && (
                      <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold transition-all">
                        {personErrors.vehicleNo ? (
                          <>
                            <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                            <span className="text-red-500">{personErrors.vehicleNo}</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                            <span className="text-emerald-600">Valid Two Wheeler registration format</span>
                          </>
                        )}
                      </div>
                    )}
                    {!personErrors.vehicleNo && blacklistWarnings["VEHICLE_" + personForm.vehicleNo.replace(/[\s-]/g, "").toUpperCase()] && (
                      <div className="mt-1.5 flex items-start gap-1.5 bg-red-50 border border-red-300 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-red-700 animate-in fade-in duration-200">
                        <AlertCircle className="h-3.5 w-3.5 text-red-600 shrink-0 mt-0.5" />
                        <span>PORT BLACKLISTED — {blacklistWarnings["VEHICLE_" + personForm.vehicleNo.replace(/[\s-]/g, "").toUpperCase()]?.replace("⚠️ BLACKLISTED ", "")}</span>
                      </div>
                    )}
                  </div>
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

                        setPersonForm((prev) => ({
                          ...prev,
                          nationality: value,
                          country: nationalityName === "INDIAN" ? "75" : "",
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
                      disabled={
                        getLabelById(
                          masterData.nationalities,
                          personForm.nationality,
                          "label",
                        )?.toUpperCase() === "INDIAN"
                      }
                    >
                      <option value="">Select Country</option>

                      {masterData.countries
                        .filter((c) => {
                          const nationality = getLabelById(
                            masterData.nationalities,
                            personForm.nationality,
                            "label",
                          )?.toUpperCase();

                          if (nationality === "INDIAN") {
                            return c.id === 75; // only India
                          } else if (nationality) {
                            return c.id !== 75; // exclude India
                          }
                          return true;
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
                      Visa No. <span className="text-red-500">*</span>
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
                      disabled={String(personForm.country) === "75"}
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
                  <div
                    className={`col-span-1 md:col-span-2 grid gap-4 ${personForm.designation === "Others" ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"}`}
                  >
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase">
                        Designation <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={personForm.designation}
                        onChange={(e) =>
                          setPersonForm({
                            ...personForm,
                            designation: e.target.value,
                          })
                        }
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
                          onChange={(e) =>
                            setPersonForm({
                              ...personForm,
                              designationOther: e.target.value,
                            })
                          }
                          className={inputClass}
                        />
                      </div>
                    )}
                  </div>
                  {personForm.designation === "Crew" && (
                    <div className="col-span-1 md:col-span-4 grid grid-cols-1 md:grid-cols-3 gap-x-5 gap-y-5 items-start">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase">
                          CDC Document No. <span className="text-red-500">*</span>
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
                              personForm.editIndex
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
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase">
                          Declaration Form Document <span className="text-red-500">*</span>
                        </label>
                        <FileUploadBox
                          file={personForm.declarationForm}
                          existingFileName={personForm.existingDeclarationName}
                          onView={() =>
                            handleViewDoc(
                              personForm.existingPassRequestId,
                              "declarationForm",
                              personForm.existingDeclarationName,
                              personForm.editIndex
                            )
                          }
                          onChange={(e) =>
                            setPersonForm({
                              ...personForm,
                              declarationForm: e.target.files[0],
                            })
                          }
                        />
                      </div>
                    </div>
                  )}
                  {/* Secondary ID Proof — hidden for Seafarers who have their own dedicated ID flow above */}
                  {personForm.hepType !== "3" && (
                    <>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase">
                          Type of Id proof
                        </label>
                        <select
                          value={personForm.idProofType}
                          onChange={(e) =>
                            setPersonForm({
                              ...personForm,
                              idProofType: e.target.value,
                            })
                          }
                          className={inputClass}
                          disabled={personForm.hepType === "1"}
                        >
                          <option value="">-- Select --</option>
                          {masterData.idProofTypes.map((t) => (
                            <option key={t.id || t.value} value={t.id || t.value}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase">
                          {idProofLabel}
                        </label>
                        <input
                          type="text"
                          value={personForm.idProofNumber}
                          onChange={(e) => {
                            const val = e.target.value.toUpperCase();
                            setPersonForm({ ...personForm, idProofNumber: val });
                            if (val) {
                              const isValid = validatePersonField("idProofNumber", val, {
                                idProofType: personForm.idProofType,
                              });
                              if (isValid) {
                                const valClean = val.replace(/[\s-]/g, "");
                                checkBlacklistStatus("DRIVER", valClean);
                                checkBlacklistStatus("PERSON", valClean);
                              }
                            }
                          }}
                          onBlur={(e) => {
                            if (e.target.value) {
                              validatePersonField("idProofNumber", e.target.value, {
                                idProofType: personForm.idProofType,
                              });
                            }
                          }}
                          className={`${inputClass} ${personErrors.idProofNumber ? "border-red-400 focus:border-red-500 focus:ring-red-500/20" : ""}`}
                          placeholder={idProofPlaceholder}
                        />
                        {personErrors.idProofNumber && (
                          <p className="text-xs text-red-500 mt-0.5 font-medium">
                            {personErrors.idProofNumber}
                          </p>
                        )}
                        {!personErrors.idProofNumber && personForm.idProofNumber && (blacklistWarnings["DRIVER_" + personForm.idProofNumber.replace(/[\s-]/g, "").toUpperCase()] || blacklistWarnings["PERSON_" + personForm.idProofNumber.replace(/[\s-]/g, "").toUpperCase()]) && (
                          <div className="mt-1.5 flex items-start gap-1.5 bg-red-50 border border-red-300 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-red-700 animate-in fade-in duration-200">
                            <AlertCircle className="h-3.5 w-3.5 text-red-600 shrink-0 mt-0.5" />
                            <span>PORT BLACKLISTED — {(blacklistWarnings["DRIVER_" + personForm.idProofNumber.replace(/[\s-]/g, "").toUpperCase()] || blacklistWarnings["PERSON_" + personForm.idProofNumber.replace(/[\s-]/g, "").toUpperCase()])?.replace("⚠️ BLACKLISTED ", "")}</span>
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
                    ) : (
                      <FileUploadBox
                        label="Photo"
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
                    )}
                  </div>
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
                          personForm.editIndex
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
                          {masterData.passTypes.map((t) => (
                            <option
                              key={t.id || t.value}
                              value={t.id || t.value}
                            >
                              {t.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-3 border-r border-slate-200">
                        <div className="flex items-center gap-3">
                          <input
                            type="number"
                            value={personForm.passPeriod}
                            min="1"
                            max={
                              String(personForm.passType) === "1" ? "7" : "1"
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
                        <input
                          type="datetime-local"
                          value={personForm.dateFrom}
                          min={getCurrentDateTime()}
                          onChange={(e) =>
                            setPersonForm({
                              ...personForm,
                              dateFrom: e.target.value,
                            })
                          }
                          className="w-full h-10 border border-slate-300 rounded-lg text-sm px-3 outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                        />
                      </td>
                      <td className="p-3 border-r border-slate-200 flex items-center gap-2">
                        <input
                          readOnly
                          type="datetime-local"
                          value={personForm.dateTo}
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

              {((personForm.hepType === "1" && personForm.idProofType !== "1") ||
                String(personForm.passType) === "2" ||
                String(personForm.passType) === "3") && (
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
                              personForm.editIndex
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
                                personForm.editIndex
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
                              personForm.editIndex
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

                      let customBorderClass = "border-slate-300 focus:ring-orange-500/20 focus:border-orange-500";
                      if (hasVal) {
                        customBorderClass = hasError
                          ? "border-red-400 focus:border-red-500 focus:ring-red-500/20"
                          : "border-emerald-500 focus:border-emerald-500 focus:ring-emerald-500/20";
                      }

                      const baseInputClass = "w-full h-10 rounded-lg text-sm px-3 shadow-sm bg-white outline-none transition-all border focus:ring-2";

                      return (
                        <>
                          <input
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
                          />
                          {hasVal && (
                            <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold transition-all">
                              {hasError ? (
                                <>
                                  <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                                  <span className="text-red-500">{vehicleErrors.regNo}</span>
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                  <span className="text-emerald-600">Valid vehicle registration format</span>
                                </>
                              )}
                            </div>
                          )}
                          {!hasError && blacklistWarnings["VEHICLE_" + vehicleForm.regNo.replace(/[\s-]/g, "")] && (
                            <div className="mt-1.5 flex items-start gap-1.5 bg-red-50 border border-red-300 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-red-700 animate-in fade-in duration-200">
                              <AlertCircle className="h-3.5 w-3.5 text-red-600 shrink-0 mt-0.5" />
                              <span>PORT BLACKLISTED — {blacklistWarnings["VEHICLE_" + vehicleForm.regNo.replace(/[\s-]/g, "")]?.replace("⚠️ BLACKLISTED ", "")}</span>
                            </div>
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
                    <input
                      type="date"
                      value={vehicleForm.insuranceExpiry}
                      min={new Date().toISOString().split("T")[0]}
                      onChange={(e) => {
                        setVehicleForm({
                          ...vehicleForm,
                          insuranceExpiry: e.target.value,
                        });
                        validateVehicleField("insuranceExpiry", e.target.value);
                      }}
                      className={`${inputClass} ${vehicleErrors.insuranceExpiry ? "border-red-400" : ""}`}
                    />
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
                    <input
                      type="date"
                      value={vehicleForm.rcValidity}
                      min={new Date().toISOString().split("T")[0]}
                      onChange={(e) => {
                        setVehicleForm({
                          ...vehicleForm,
                          rcValidity: e.target.value,
                        });
                        validateVehicleField("rcValidity", e.target.value);
                      }}
                      className={`${inputClass} ${vehicleErrors.rcValidity ? "border-red-400" : ""}`}
                    />
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
                          {masterData.passTypes.map((t) => (
                            <option
                              key={t.id || t.value}
                              value={t.id || t.value}
                            >
                              {t.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-3 border-r border-slate-200">
                        <div className="flex items-center gap-3">
                          <input
                            type="number"
                            value={vehicleForm.passPeriod}
                            min="1"
                            max={
                              String(vehicleForm.passType) === "1" ? "7" : "1"
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
                        <input
                          type="datetime-local"
                          value={vehicleForm.dateFrom}
                          min={getCurrentDateTime()}
                          onChange={(e) =>
                            setVehicleForm({
                              ...vehicleForm,
                              dateFrom: e.target.value,
                            })
                          }
                          className="w-full h-10 border border-slate-300 rounded-lg text-sm px-3 outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                        />
                      </td>
                      <td className="p-3 border-r border-slate-200">
                        <input
                          readOnly
                          type="datetime-local"
                          value={vehicleForm.dateTo}
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
                    label="RC Book"
                    isRequired
                    file={vehicleForm.rcDocument}
                    existingFileName={vehicleForm.existingRcName}
                    onView={() =>
                      handleViewDoc(
                        vehicleForm.existingPassRequestId,
                        "vehicleRC",
                        vehicleForm.existingRcName,
                        vehicleForm.editIndex
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
                        vehicleForm.editIndex
                      )
                    }
                    onChange={(e) =>
                      setVehicleForm({
                        ...vehicleForm,
                        insuranceDocument: e.target.files[0],
                      })
                    }
                  />
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
                        vehicleForm.editIndex
                      )
                    }
                    onChange={(e) =>
                      setVehicleForm({
                        ...vehicleForm,
                        permit: e.target.files[0],
                      })
                    }
                  />
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
                        vehicleForm.editIndex
                      )
                    }
                    onChange={(e) =>
                      setVehicleForm({
                        ...vehicleForm,
                        fitnessCert: e.target.files[0],
                      })
                    }
                  />
                  {(String(vehicleForm.passType) === "2" ||
                    String(vehicleForm.passType) === "3") && (
                      <>
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
                              vehicleForm.editIndex
                            )
                          }
                          onChange={(e) =>
                            setVehicleForm({
                              ...vehicleForm,
                              requestLetter: e.target.files[0],
                            })
                          }
                        />
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
                              vehicleForm.editIndex
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
                              vehicleForm.editIndex
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
                <h3 className="font-black text-slate-800 mb-4 border-b border-slate-100 pb-2 text-sm uppercase tracking-wider">
                  General Information
                </h3>
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
                      className={`w-full mt-1 bg-slate-50 border border-slate-200 rounded-lg h-10 px-3 text-sm font-bold cursor-not-allowed ${(selectedPassDetails.status || "").toUpperCase() ===
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
                                <span
                                  className={`px-2 py-1 rounded-full text-[10px] font-bold ${String(p.status).toUpperCase() === "APPROVED" ? "bg-emerald-100 text-emerald-700" : String(p.status).toUpperCase() === "REJECTED" ? "bg-red-100 text-red-700" : String(p.status).toUpperCase() === "REVERTED" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}
                                >
                                  {(p.status || "PENDING").toUpperCase()}
                                </span>
                              </td>
                              <td className="p-3 text-center">
                                {String(p.status).toUpperCase() ===
                                  "APPROVED" ? (
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
                              colSpan="4"
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
                                <span
                                  className={`px-2 py-1 rounded-full text-[10px] font-bold ${String(v.status).toUpperCase() === "APPROVED" ? "bg-emerald-100 text-emerald-700" : String(v.status).toUpperCase() === "REJECTED" ? "bg-red-100 text-red-700" : String(v.status).toUpperCase() === "REVERTED" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}
                                >
                                  {(v.status || "PENDING").toUpperCase()}
                                </span>
                              </td>
                              <td className="p-3 text-center">
                                {String(v.status).toUpperCase() ===
                                  "APPROVED" ? (
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
                The following are rates(Excluding GST) RFID based Harbour Entry
                Permits.
              </p>

              <div className="border border-slate-300 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse bg-white">
                  <thead className="bg-slate-100 border-b border-slate-200">
                    <tr>
                      <th className="p-3 text-xs font-bold text-slate-700 uppercase tracking-wider border-r border-slate-200 w-12 text-center">
                        SNo
                      </th>
                      <th className="p-3 text-xs font-bold text-slate-700 uppercase tracking-wider border-r border-slate-200 whitespace-nowrap">
                        Type Of Hep
                      </th>
                      <th className="p-3 text-xs font-bold text-slate-700 uppercase tracking-wider border-r border-slate-200">
                        Description
                      </th>
                      <th className="p-3 text-xs font-bold text-slate-700 uppercase tracking-wider text-right border-r border-slate-200 whitespace-nowrap">
                        Daily ₹
                      </th>
                      <th className="p-3 text-xs font-bold text-slate-700 uppercase tracking-wider text-right border-r border-slate-200 whitespace-nowrap">
                        Monthly ₹
                      </th>
                      <th className="p-3 text-xs font-bold text-slate-700 uppercase tracking-wider text-right border-r border-slate-200 whitespace-nowrap">
                        Annual ₹
                      </th>
                      <th className="p-3 text-xs font-bold text-slate-700 uppercase tracking-wider text-right whitespace-nowrap">
                        Auction ₹
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr className="hover:bg-slate-50">
                      <td className="p-3 text-sm text-slate-600 text-center border-r border-slate-100">
                        1
                      </td>
                      <td className="p-3 text-sm font-medium text-slate-800 border-r border-slate-100">
                        Driver
                      </td>
                      <td className="p-3 text-sm text-slate-600 border-r border-slate-100">
                        Person
                      </td>
                      <td className="p-3 text-sm font-bold text-slate-700 text-right border-r border-slate-100">
                        10.30
                      </td>
                      <td className="p-3 text-sm font-bold text-slate-700 text-right border-r border-slate-100">
                        154.00
                      </td>
                      <td className="p-3 text-sm font-bold text-slate-700 text-right border-r border-slate-100">
                        410.00
                      </td>
                      <td className="p-3 text-sm font-bold text-slate-700 text-right">
                        100.00
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="p-3 text-sm text-slate-600 text-center border-r border-slate-100">
                        2
                      </td>
                      <td className="p-3 text-sm font-medium text-slate-800 border-r border-slate-100">
                        Personal
                      </td>
                      <td className="p-3 text-sm text-slate-600 border-r border-slate-100">
                        Person
                      </td>
                      <td className="p-3 text-sm font-bold text-slate-700 text-right border-r border-slate-100">
                        10.30
                      </td>
                      <td className="p-3 text-sm font-bold text-slate-700 text-right border-r border-slate-100">
                        154.00
                      </td>
                      <td className="p-3 text-sm font-bold text-slate-700 text-right border-r border-slate-100">
                        410.00
                      </td>
                      <td className="p-3 text-sm font-bold text-slate-700 text-right">
                        100.00
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="p-3 text-sm text-slate-600 text-center border-r border-slate-100">
                        3
                      </td>
                      <td className="p-3 text-sm font-medium text-slate-800 border-r border-slate-100">
                        Seafarers
                      </td>
                      <td className="p-3 text-sm text-slate-600 border-r border-slate-100">
                        Person
                      </td>
                      <td className="p-3 text-sm font-bold text-slate-700 text-right border-r border-slate-100">
                        10.30
                      </td>
                      <td className="p-3 text-sm font-bold text-slate-400 text-right border-r border-slate-100">
                        0.00
                      </td>
                      <td className="p-3 text-sm font-bold text-slate-400 text-right border-r border-slate-100">
                        0.00
                      </td>
                      <td className="p-3 text-sm font-bold text-slate-400 text-right">
                        0.00
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="p-3 text-sm text-slate-600 text-center border-r border-slate-100">
                        4
                      </td>
                      <td className="p-3 text-sm font-medium text-slate-800 border-r border-slate-100">
                        Vehicle
                      </td>
                      <td className="p-3 text-xs text-slate-600 border-r border-slate-100 leading-relaxed">
                        ARTICULATED, BACK-HOES, Bus, CAR, CEMENT MIXER, CONCRETE
                        MIXER LORRY, CYCLE RICKSHAW, DEFENCE TANK, Four wheeler,
                        INDIVIDUAL ONLY, JEEP, LIGHT VEHICLE, LORRY, OPEN LORRY,
                        OPEN TRACTOR, OPEN TRUCK, PFS VEHICLE, RECOVERY,
                        ROADROLLER, Tanker, Tarus, TAURUS TIPPER, TAXI, Tipper,
                        TRACTOR TRAILER, TRAILER LORRY, Trailors, TRI CYCLE,
                        Trucks, VAN
                      </td>
                      <td className="p-3 text-sm font-bold text-slate-700 text-right border-r border-slate-100">
                        25.70
                      </td>
                      <td className="p-3 text-sm font-bold text-slate-700 text-right border-r border-slate-100">
                        308.00
                      </td>
                      <td className="p-3 text-sm font-bold text-slate-700 text-right border-r border-slate-100">
                        2049.00
                      </td>
                      <td className="p-3 text-sm font-bold text-slate-400 text-right">
                        0.00
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="p-3 text-sm text-slate-600 text-center border-r border-slate-100">
                        5
                      </td>
                      <td className="p-3 text-sm font-medium text-slate-800 border-r border-slate-100">
                        Vehicle
                      </td>
                      <td className="p-3 text-xs text-slate-600 border-r border-slate-100 leading-relaxed">
                        (JCB)EARTHMOVER, CRANE, DOZERS, DUMPERS, EXCAVATORS,
                        Forklift, MOBILE CRANE, PAY LOADER, Poclain
                      </td>
                      <td className="p-3 text-sm font-bold text-slate-700 text-right border-r border-slate-100">
                        41.00
                      </td>
                      <td className="p-3 text-sm font-bold text-slate-700 text-right border-r border-slate-100">
                        461.00
                      </td>
                      <td className="p-3 text-sm font-bold text-slate-700 text-right border-r border-slate-100">
                        3073.00
                      </td>
                      <td className="p-3 text-sm font-bold text-slate-400 text-right">
                        0.00
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="p-3 text-sm text-slate-600 text-center border-r border-slate-100">
                        6
                      </td>
                      <td className="p-3 text-sm font-medium text-slate-800 border-r border-slate-100">
                        Visitor
                      </td>
                      <td className="p-3 text-sm text-slate-600 border-r border-slate-100">
                        Person
                      </td>
                      <td className="p-3 text-sm font-bold text-slate-700 text-right border-r border-slate-100">
                        10.30
                      </td>
                      <td className="p-3 text-sm font-bold text-slate-400 text-right border-r border-slate-100">
                        0.00
                      </td>
                      <td className="p-3 text-sm font-bold text-slate-400 text-right border-r border-slate-100">
                        0.00
                      </td>
                      <td className="p-3 text-sm font-bold text-slate-400 text-right">
                        0.00
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="p-3 text-sm text-slate-600 text-center border-r border-slate-100">
                        7
                      </td>
                      <td className="p-3 text-sm font-medium text-slate-800 border-r border-slate-100">
                        Visitor
                      </td>
                      <td className="p-3 text-sm text-slate-600 border-r border-slate-100">
                        Four wheeler
                      </td>
                      <td className="p-3 text-sm font-bold text-slate-700 text-right border-r border-slate-100">
                        25.70
                      </td>
                      <td className="p-3 text-sm font-bold text-slate-400 text-right border-r border-slate-100">
                        0.00
                      </td>
                      <td className="p-3 text-sm font-bold text-slate-400 text-right border-r border-slate-100">
                        0.00
                      </td>
                      <td className="p-3 text-sm font-bold text-slate-400 text-right">
                        0.00
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
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
                (entityModal.data.revertReason || entityModal.data.rejectedReason) && (
                  <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                    <div>
                      <h4 className="text-xs font-black text-amber-900 uppercase tracking-wider mb-1">
                        Action Required - Application Reverted
                      </h4>
                      <p className="text-sm text-amber-700 font-medium">
                        {entityModal.data.revertReason || entityModal.data.rejectedReason}
                      </p>
                      <p className="text-xs text-amber-600 mt-2">
                        Please update the required information and re-submit.
                      </p>
                    </div>
                  </div>
                )}

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 bg-slate-100 border-b border-slate-200">
                  <h4 className="text-xs font-black text-[#0a1e4d] uppercase tracking-widest">
                    Submitted Data
                  </h4>
                </div>
                <div className="p-5 grid grid-cols-2 gap-y-6 gap-x-4">
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
                        label="Aadhar No."
                        value={entityModal.data.aadharNo}
                      />
                      <DetailItem
                        label="Mobile No."
                        value={entityModal.data.mobile}
                      />
                      <DetailItem
                        label="Nationality"
                        value={entityModal.data.nationality}
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
                            ).toLocaleDateString()
                            : ""
                        }
                      />
                      <DetailItem
                        label="Valid To"
                        value={
                          entityModal.data.dateTo
                            ? new Date(
                              entityModal.data.dateTo,
                            ).toLocaleDateString()
                            : ""
                        }
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
                            ).toLocaleDateString()
                            : ""
                        }
                      />
                      <DetailItem
                        label="Valid To"
                        value={
                          entityModal.data.dateTo
                            ? new Date(
                              entityModal.data.dateTo,
                            ).toLocaleDateString()
                            : ""
                        }
                      />
                      <DetailItem
                        label="Insurance Expiry"
                        value={
                          entityModal.data.insuranceExpiry
                            ? new Date(
                              entityModal.data.insuranceExpiry,
                            ).toLocaleDateString()
                            : ""
                        }
                      />
                      <DetailItem
                        label="RC Validity"
                        value={
                          entityModal.data.rcValidity
                            ? new Date(
                              entityModal.data.rcValidity,
                            ).toLocaleDateString()
                            : ""
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
            </div>

            <div className="p-4 border-t border-slate-200 bg-white text-right shrink-0">
              <button
                onClick={() =>
                  setEntityModal({ isOpen: false, data: null, type: null })
                }
                className="bg-slate-200 text-slate-800 px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-300 transition-colors"
              >
                Close
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
                    Please review and update all reverted entities below. Once updated, you can resubmit the pass for approval.
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {revertedPersons.map((person, index) => (
                      <div
                        key={person.id}
                        className={`p-4 rounded-xl border-2 transition-all ${person.status === 'reverted'
                          ? 'bg-white border-amber-300'
                          : 'bg-green-50 border-green-300'
                          }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${person.status === 'reverted' ? 'bg-amber-100' : 'bg-green-100'
                              }`}>
                              <User className={`h-5 w-5 ${person.status === 'reverted' ? 'text-amber-600' : 'text-green-600'
                                }`} />
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800">{person.name}</p>
                              <p className="text-xs text-slate-500">ID: {person.id}</p>
                            </div>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${person.status === 'reverted'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-green-100 text-green-700'
                            }`}>
                            {person.status === 'reverted' ? 'Needs Update' : 'Updated'}
                          </span>
                        </div>

                        {/* Revert Reason */}
                        {person.rejectedReason && (
                          <div className="bg-red-50 border border-red-200 p-3 rounded-lg mb-3">
                            <p className="text-xs text-red-600 font-semibold mb-1">Revert Reason:</p>
                            <p className="text-sm text-red-700">{person.rejectedReason}</p>
                          </div>
                        )}

                        {/* Edit Button */}
                        {person.status === 'reverted' && (
                          <button
                            onClick={() => handleEditRevertedEntity('person', index, person)}
                            className="w-full bg-amber-500 hover:bg-amber-600 text-white py-2 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                          >
                            <Edit3 className="h-4 w-4" />
                            Update Person
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {revertedVehicles.map((vehicle, index) => (
                      <div
                        key={vehicle.id}
                        className={`p-4 rounded-xl border-2 transition-all ${vehicle.status === 'reverted'
                          ? 'bg-white border-amber-300'
                          : 'bg-green-50 border-green-300'
                          }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${vehicle.status === 'reverted' ? 'bg-amber-100' : 'bg-green-100'
                              }`}>
                              <Car className={`h-5 w-5 ${vehicle.status === 'reverted' ? 'text-amber-600' : 'text-green-600'
                                }`} />
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800">{vehicle.registrationNo || vehicle.regNo}</p>
                              <p className="text-xs text-slate-500">ID: {vehicle.id}</p>
                            </div>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${vehicle.status === 'reverted'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-green-100 text-green-700'
                            }`}>
                            {vehicle.status === 'reverted' ? 'Needs Update' : 'Updated'}
                          </span>
                        </div>

                        {/* Revert Reason */}
                        {vehicle.rejectedReason && (
                          <div className="bg-red-50 border border-red-200 p-3 rounded-lg mb-3">
                            <p className="text-xs text-red-600 font-semibold mb-1">Revert Reason:</p>
                            <p className="text-sm text-red-700">{vehicle.rejectedReason}</p>
                          </div>
                        )}

                        {/* Edit Button */}
                        {vehicle.status === 'reverted' && (
                          <button
                            onClick={() => handleEditRevertedEntity('vehicle', index, vehicle)}
                            className="w-full bg-amber-500 hover:bg-amber-600 text-white py-2 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                          >
                            <Edit3 className="h-4 w-4" />
                            Update Vehicle
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* All Updated Message */}
              {revertedPersons.every(p => p.status !== 'reverted') &&
                revertedPersons.every(p => p.status === 'updated') &&
                revertedVehicles.every(v => v.status === 'updated') && (
                  <div className="bg-green-50 border border-green-200 p-4 rounded-xl flex items-center gap-3 mb-6">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                    <div>
                      <p className="font-semibold text-green-800">All entities updated!</p>
                      <p className="text-sm text-green-700">You can now resubmit your pass for approval.</p>
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
                  revertedPersons.some(p => p.status === 'reverted') ||
                  revertedVehicles.some(v => v.status === 'reverted')
                }
                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center gap-2 ${revertedPersons.some(p => p.status === 'reverted') ||
                  revertedVehicles.some(v => v.status === 'reverted')
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  : 'bg-amber-500 hover:bg-amber-600 text-white'
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
            className={`bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ${isFullscreen ? "w-full h-full" : "w-full max-w-5xl h-[85vh]"
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
                <span className="text-xs font-bold text-slate-400 dark:text-stone-500 uppercase">Suspended Entity</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-900/40">
                  Suspended
                </span>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 dark:text-stone-500 uppercase tracking-wider">Company Name</p>
                <p className="text-sm font-extrabold text-slate-900 dark:text-stone-100">
                  {generalForm.companyName}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 dark:text-stone-500 uppercase tracking-wider">Blacklist Reason</p>
                <p className="text-sm font-semibold text-red-800 dark:text-red-400 leading-relaxed bg-red-50 dark:bg-red-950/20 p-3 rounded-xl border border-red-100/50 dark:border-red-900/10">
                  {companyBlacklistReason}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-500 dark:text-stone-400 text-center leading-relaxed mb-6 font-medium">
              You are blocked from submitting new harbor entry passes. To restore access, please contact the Traffic Department or request reinstatement through the ATM Portal once compliance terms are met.
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
