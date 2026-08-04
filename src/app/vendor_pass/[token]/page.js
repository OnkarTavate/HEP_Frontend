"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "sonner";
import { extractAadharFromPdf } from "@/lib/extractAadharFromPdf";
import Select from "react-select";
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
  Phone,
  UserPlus,
  BookOpen,
  FileCheck2,
  CheckCircle2,
  Eye,
  Ship,
  AlertTriangle,
  Loader2,
  FileText,
  ShieldCheck,
  Maximize,
  Minimize,
  XCircle,
} from "lucide-react";
import {
  getPublicIntake,
  submitPublicVendorForm,
} from "@/lib/vendorPassApi";

const AGENT_API =
  process.env.NEXT_PUBLIC_AGENT_API || "http://localhost:5001/api";
const ADMIN_API = process.env.NEXT_PUBLIC_ADMIN_API || "http://localhost:5005/api";

const getCurrentDateTime = () => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
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

const formatDateTimeISOToDisplay = (isoStr) => {
  if (!isoStr) return "";
  if (isoStr.includes("/")) return isoStr;
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

// All passes expire at 05:59 AM on the computed end date.
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
  } else if (type === "YEARLY" || type === "ANNUAL" || type === "3" || type === 3) {
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
  const item = arr.find((x) => String(x.id || x.value) === String(val));
  return item ? item[key] || item.label || item.name : "";
};

const getFilteredPassTypes = (intakeData, passTypesData) => {
  if (!intakeData) return passTypesData;
  if (intakeData.allowAuctionPassOnly) {
    // Only show Auction pass type - add it if not present
    const auctionPass = passTypesData.find(
      (t) => (t.label || t.name || "").toUpperCase() === "AUCTION"
    );
    if (auctionPass) {
      return [auctionPass];
    } else {
      // Add Auction pass type manually if not in backend data
      return [{ id: "4", value: "AUCTION", label: "Auction" }];
    }
  } else {
    // Filter out Auction pass type
    return passTypesData.filter(
      (t) => (t.label || t.name || "").toUpperCase() !== "AUCTION"
    );
  }
};

const validateFile = (file, type) => {
  if (!file) return "No file selected";

  const allowedTypes = {
    pdf: ["application/pdf"],
    image: ["image/jpeg", "image/png", "image/jpg"],
  };

  const maxSize = 2 * 1024 * 1024; // 2MB

  if (!allowedTypes[type].includes(file.type)) {
    return type === "pdf"
      ? "Only PDF files are allowed"
      : "Only JPG, JPEG, PNG images are allowed";
  }

  if (file.size > maxSize) {
    return "File size must be less than 2MB";
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
    // case "cardNumber":
    //   return value && !VALIDATORS.rfidCard(value)
    //     ? "RFID Card must be 4-20 alphanumeric characters"
    //     : null;
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

const DetailItem = ({ label, value, highlight = false, showIfEmpty = false }) => {
  if (!showIfEmpty && (!value || value === "N/A" || value === "null" || value === "undefined" || String(value).trim() === "")) {
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

export default function VendorPassPublicPage() {
  const params = useParams();
  const router = useRouter();
  const token = params?.token;
  const [activeToken, setActiveToken] = useState(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      let t = token;
      if (t) {
        sessionStorage.setItem("vendor_pass_token", t);
        setActiveToken(t);
        window.history.replaceState(null, "", "/vendor_pass");
      } else {
        const stored = sessionStorage.getItem("vendor_pass_token");
        if (stored) {
          setActiveToken(stored);
        }
      }
    }
  }, [token]);

  // Intake (department-provided context)
  const [intake, setIntake] = useState(null);
  const [viewingDocUrl, setViewingDocUrl] = useState(null);
  const [isImage, setIsImage] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [docLoading, setDocLoading] = useState(false);

  const handleViewDoc = async (passRequestId, documentType, staticPath, entityIndex = 0, isVendorPass = false) => {
    let docUrl = "";
    if (documentType === "workOrder") {
      docUrl = `${AGENT_API}/vendor-pass/public/work-order/${passRequestId}`;
    } else {
      docUrl = `${AGENT_API}/pass-request/viewPassRequestsDocument?passRequestId=${passRequestId}&documentType=${documentType}&entityIndex=${entityIndex}&isVendorPass=${isVendorPass ? "true" : "false"}`;
    }

    setDocLoading(true);

    let detectedIsImage = false;
    try {
      const response = await fetch(docUrl, { method: 'HEAD' });
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.startsWith('image/')) {
        detectedIsImage = true;
      }
    } catch (err) {
      console.error("Error fetching head:", err);
      detectedIsImage = !!(staticPath && /\.(jpe?g|png|gif|webp)$/i.test(staticPath));
    }

    setIsImage(detectedIsImage);
    setViewingDocUrl(docUrl);
  };
  const [intakeLoading, setIntakeLoading] = useState(true);
  const [intakeError, setIntakeError] = useState("");

  // Vendor flow has no tabs / no history view
  const [activeTab] = useState("apply");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [paymentMode, setPaymentMode] = useState("Account");
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

  const [persons, setPersons] = useState([]);
  const [vehicles, setVehicles] = useState([]);

  const [editingPersonIndex, setEditingPersonIndex] = useState(null);
  const [editingVehicleIndex, setEditingVehicleIndex] = useState(null);

  const [personErrors, setPersonErrors] = useState({});
  const [vehicleErrors, setVehicleErrors] = useState({});

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
    balance: "7725.00",
    utilizedBalance: "0.00",
    purpose: "",
    purposeOther: "",
    authLetter: null,
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
    country: "", // Dynamically populated from masterData.countries
    visaNo: "",
    accessArea: "",
    designation: "",
    designationOther: "",
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
    passType: "1", // Default: 1 (Daily)
    passPeriod: "1",
    dateFrom: getCurrentDateTime(),
    dateTo: "",
    validUptoTime: "",
    amount: 10.3,
  };
  const [personForm, setPersonForm] = useState(initialPersonForm);

  const personOptions = [
    { value: "", label: "-- Apply Fresh (Manual Entry) --" },
    ...Object.values(masterPersonsDB).map((p) => ({
      value: String(p.id),
      label: `${p.name} - Aadhar: ${p.aadhar || ""}`,
    })),
  ];

  const vehicleOptions = [
    { value: "", label: "-- Apply Fresh (Manual Entry) --" },
    ...Object.values(masterVehiclesDB).map((v) => ({
      value: String(v.id),
      label: `${v.registrationNo || v.regNo || ""}`,
    })),
  ];

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
    amount: 25.7,
  };
  const [vehicleForm, setVehicleForm] = useState(initialVehicleForm);

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
    ],
    purposes: [
      { id: 1, name: "Inspection" },
      { id: 2, name: "Maintenance" },
      { id: 3, name: "Repairs" },
      { id: 4, name: "Site Visit" },
      { id: 5, name: "New Project" },
      { id: 6, name: "Others" },
    ],
    countries: [],
  });

  const isOilDockArea = (areaId) => {
    if (!areaId) return false;
    const area = masterData?.accessAreas?.find(a => String(a.id) === String(areaId));
    if (area) return String(area.label || area.value || area.name).toUpperCase().includes("OIL JETTY") || String(area.id) === "1";
    return String(areaId).toUpperCase().includes("OIL JETTY") || String(areaId) === "1";
  };


  // Fetch vendor intake by token; pre-fill general form from intake
  useEffect(() => {
    if (!activeToken) return;
    let alive = true;
    (async () => {
      try {
        setIntakeLoading(true);
        const data = await getPublicIntake(activeToken);
        if (!alive) return;
        setIntake(data);
        setIntakeError("");
        setGeneralForm((prev) => ({
          ...prev,
          companyName: data.companyName || "",
          email: data.vendorEmail || "",
          mobile: data.vendorMobile || "",
          purpose: data.purposeOfVisitId ? String(data.purposeOfVisitId) : "",
          purposeOther: data.purposeOther || "",
          visitorType: data.visitorTypeId ? String(data.visitorTypeId) : "",
          visitorTypeOther: data.visitorTypeOther || "",
          hasWorkOrder: data.hasWorkOrder || false,
          refDocNo: data.refDocNo || "",
          equipmentMaterialDetails: data.equipmentMaterialDetails || "",
          remarks: data.remarks || "",
          authLetter: null,
        }));
        if (data.paymentMode === "FREE") setPaymentMode("E-Cash");
        if (data.workOrderFilePath) {
          setGeneralForm((prev) => ({
            ...prev,
            workOrderFile: { name: data.workOrderFileName },
          }));
        }

        // Map existing persons (e.g. for reverted or re-opened passes)
        if (Array.isArray(data.persons) && data.persons.length > 0) {
          const mappedPersons = data.persons.map((p) => {
            let natVal = "1";
            if (String(p.nationality || "").toUpperCase() === "FOREIGNER" || String(p.nationality) === "2") {
              natVal = "2";
            }
            let countryVal = p.countryId ? String(p.countryId) : p.country ? String(p.country) : "";
            const pTypeStr = String(p.passType || "").toUpperCase();
            const passTypeVal = pTypeStr === "MONTHLY" || pTypeStr === "2" ? "2" : pTypeStr === "YEARLY" || pTypeStr === "ANNUAL" || pTypeStr === "3" ? "3" : "1";

            return {
              id: p.id,
              existingPassRequestId: p.vendorPassRequestId || data.id,
              personPassNo: p.personPassNo || "",
              hepType: p.hepTypeId ? String(p.hepTypeId) : (p.designation === "Driver" ? "1" : "2"),
              name: p.name || "",
              aadharNo: p.aadharNo || p.aadharNumber || "",
              mobile: p.mobile || "",
              email: p.email || "",
              nationality: natVal,
              country: countryVal,
              visaNo: p.visaNo || "",
              accessArea: p.accessAreaId ? String(p.accessAreaId) : (p.accessArea || ""),
              designation: p.designationId ? String(p.designationId) : (p.designation || ""),
              designationOther: p.designationOther || "",
              cardNumber: p.cardNumber || "",
              withTwoWheeler: p.withTwoWheeler === true || String(p.withTwoWheeler) === "true",
              vehicleNo: p.vehicleNo || "",
              idProofType: p.idProofType ? String(p.idProofType) : "",
              idProofNumber: p.idProofNumber || "",
              passType: passTypeVal,
              passPeriod: p.passPeriod ? String(p.passPeriod) : "1",
              dateFrom: p.dateFrom ? new Date(p.dateFrom).toISOString().slice(0, 16) : getCurrentDateTime(),
              dateTo: p.dateTo ? new Date(p.dateTo).toISOString().slice(0, 16) : "",
              amount: parseFloat(p.amount) || 10.3,
              status: p.status || "pending",
              revertReason: p.revertReason || "",
              existingPhotoName: p.photoFileName,
              existingAadharName: p.aadharPDFFileName,
              existingIdProofName: p.idProofFileName,
              existingDlName: p.driverLicenseName,
              existingPoliceName: p.policeVerificationName,
              existingEmpName: p.employmentProofName,
              existingChaName: p.chaLicenseName,
              existingPassportName: p.passportName,
            };
          });
          setPersons(mappedPersons);
        }
      } catch (err) {
        if (!alive) return;
        console.error("Vendor intake fetch failed:", err);
        setIntakeError(
          err?.response?.data?.message ||
          err?.message ||
          "This link is invalid or has expired."
        );
      } finally {
        if (alive) setIntakeLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [activeToken]);

  const [feeMaster, setFeeMaster] = useState(null); // { INDIVIDUAL: {...}, VEHICLE: {...}, CARGO_HANDLING_EQUIPMENT: {...} }

  useEffect(() => {
    const fetchFeeMaster = async () => {
      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        const res = await axios.get(`${ADMIN_API}/hep-rate`, { headers });
        const feesByCategory = {};
        (res.data?.data || []).forEach((row) => {
          const category = String(row.category || "").toUpperCase();
          const mappedCategory =
            category === "CARGO" ? "CARGO_HANDLING_EQUIPMENT" : category;

          const normalized = {
            daily: parseFloat(row.daily_rate),
            monthly: parseFloat(row.monthly_rate),
            yearly: parseFloat(row.yearly_rate),
          };

          feesByCategory[mappedCategory] = normalized;

          // Keep alias for backward compatibility in any existing UI blocks.
          if (category === "CARGO") {
            feesByCategory.CARGO = normalized;
          }
        });
        setFeeMaster(feesByCategory);
      } catch (err) {
        toast.error("Failed to load fee configuration. Please refresh.");
      }
    };
    fetchFeeMaster();
  }, []);

  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const config = {};

        const [natRes, passRes, idRes, accessRes, desigRes, vehRes, countryRes] =
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
          countries: fetchedCountries.length > 0 ? fetchedCountries : prev.countries,
        }));

        // Auto-set country to India's real DB ID when nationality is Indian
        if (fetchedCountries.length > 0) {
          const indiaEntry = fetchedCountries.find(
            (c) => String(c.name || "").trim().toLowerCase() === "india"
          );
          if (indiaEntry) {
            setPersonForm((prev) => {
              if (String(prev.nationality) === "1" || !prev.nationality) {
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

  // Agent profile + master records useEffects intentionally omitted —
  // the vendor flow has no logged-in agent and no saved master directory.

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
    if (!feeMaster) return; 
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

    const feeConfig = feeMaster["INDIVIDUAL"];
    if (!feeConfig) {
      toast.error("Fee configuration missing for INDIVIDUAL category.");
      return;
    }

    let amt = feeConfig.daily;
    if (String(personForm.passType) === "1") {
      amt = feeConfig.daily * parseInt(updatedPeriod || 1, 10);
    } else if (String(personForm.passType) === "2") {
      amt = feeConfig.monthly;
    } else if (String(personForm.passType) === "3") {
      amt = feeConfig.yearly;
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
  }, [personForm.passType, personForm.passPeriod, personForm.dateFrom, generalForm.remainingDays, generalForm.isLicenseExpired, feeMaster]);

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
    if (!feeMaster) return;
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

    const feeConfig = isCargoEquipment
      ? feeMaster["CARGO_HANDLING_EQUIPMENT"]
      : feeMaster["VEHICLE"];

    if (!feeConfig) {
      toast.error("Fee configuration missing for this category.");
      return;
    }

    let amt = feeConfig.daily; // default fallback
    if (String(vehicleForm.passType) === "1") {
      amt = feeConfig.daily * parseInt(updatedPeriod || 1, 10);
    } else if (String(vehicleForm.passType) === "2") {
      amt = feeConfig.monthly;
    } else if (String(vehicleForm.passType) === "3") {
      amt = feeConfig.yearly;
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
  }, [vehicleForm.passType, vehicleForm.passPeriod, vehicleForm.dateFrom, vehicleForm.type, masterData.vehicleTypes, generalForm.remainingDays, generalForm.isLicenseExpired, feeMaster]);

  useEffect(() => {
    const natObj = (masterData.nationalities || []).find(
      (n) => String(n.id || n.value) === String(personForm.nationality)
    );
    const selectedNationality = (natObj?.label || natObj?.name || "").toUpperCase();

    const indiaObj = (masterData.countries || []).find(
      (c) => String(c.name || "").trim().toLowerCase() === "india"
    );
    const indiaId = indiaObj ? String(indiaObj.id) : "";

    if ((selectedNationality === "INDIAN" || !personForm.nationality || String(personForm.nationality) === "1") && indiaId) {
      setPersonForm((prev) => {
        if (String(prev.country) !== indiaId) {
          return { ...prev, country: indiaId };
        }
        return prev;
      });
    } else if (selectedNationality && selectedNationality !== "INDIAN" && String(personForm.nationality) !== "1") {
      // If switching from Indian → foreign, clear country if it was India
      if (String(personForm.country) === indiaId) {
        setPersonForm((prev) => ({
          ...prev,
          country: "",
        }));
      }
    }
  }, [personForm.nationality, masterData.nationalities, masterData.countries]);

  const isPersonForeigner = React.useCallback(
    (natValue) => {
      const natObj = (masterData.nationalities || []).find(
        (n) => String(n.id || n.value) === String(natValue) || (n.label || n.name || "").toUpperCase() === String(natValue).toUpperCase()
      );
      const label = (natObj?.label || natObj?.name || "").toUpperCase();
      return label === "FOREIGNER" || String(natValue) === "2" || String(natValue).toUpperCase() === "FOREIGNER";
    },
    [masterData.nationalities]
  );

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
    if (id && masterPersonsDB[id]) {
      const data = masterPersonsDB[id];
      if (data.isActive === false) {
        toast.error(
          `ERROR: ${data.name} is BLOCKED in the Master Directory. Pass cannot be issued.`,
        );
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

      setPersonForm({
        ...initialPersonForm,
        masterId: id,
        existingPassRequestId: data.passRequestId, // Crucial for fetching old documents
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
        country: data.countryId ? String(data.countryId) : (() => {
          const indiaObj = (masterData.countries || []).find(
            (c) => String(c.name || "").trim().toUpperCase() === "INDIA"
          );
          return indiaObj ? String(indiaObj.id || indiaObj.value) : "";
        })(),
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

        // Map Existing Files
        existingAadharName: data.aadharPDFFileName,
        existingPhotoName: data.photoFileName,
        existingIdProofName: data.idProofFileName,
        existingReqName: data.requisitionLetterName,
        existingDlName: data.driverLicenseName,
        existingPoliceName: data.policeVerificationName,
        existingEmpName: data.employmentProofName,
        existingChaName: data.chaLicenseName,
        existingPassportName: data.passportName,
        existingEntryAuthName: data.entryAuthorizationFileName,
      });
      toast.success("Person details & documents auto-filled");
    } else {
      setPersonForm(initialPersonForm);
    }
  };

  const handleMasterVehicleSelect = (e) => {
    const id = e.target.value;

    if (id && masterVehiclesDB[id]) {
      const data = masterVehiclesDB[id];

      if (data.isActive === false) {
        toast.error(
          `ERROR: Vehicle ${data.registrationNo || data.regNo} is BLOCKED in the Master Directory.`,
        );
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

      setVehicleForm({
        ...initialVehicleForm,
        masterId: id,
        existingPassRequestId: data.passRequestId,
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

        // Map Existing Files
        existingRcName: data.scannedCopyFileName,
        existingInsName: data.insuranceFileName,
        existingPermitName: data.permitFileName,
        existingFitnessName: data.fitnessFileName,
        existingReqName: data.requestLetterName,
        existingTaxName: data.taxDocName,
        existingEmissionName: data.emissionCertName,
        existingSparkArresterName: data.sparkArresterFileName,
        existingTwistLockName: data.twistLockFileName,
      });

      toast.success("Vehicle details & documents auto-filled");
    } else {
      setVehicleForm(initialVehicleForm);
    }
  };

  const handleAddPerson = () => {
    // ---- Full field validation before add ----
    const errors = {};
    if (!personForm.hepType || !personForm.hepType.trim()) {
      errors.hepType = "Please select Type of HEP (Drivers, Personnel, or Seafarers)";
    }

    if (!personForm.name.trim()) errors.name = "Full name is required";
    else if (!/^[a-zA-Z\s.'-]{2,80}$/.test(personForm.name.trim()))
      errors.name = "Name must be 2-80 characters (letters only)";

    const isForeigner = isPersonForeigner(personForm.nationality);

    // Aadhaar validation - required for non-foreigners (non-seafarers OR seafarers who chose aadhaar)
    if (!isForeigner && (personForm.hepType !== "3" || personForm.seafarerIdType === "aadhaar")) {
      if (!personForm.aadharNo) errors.aadharNo = "Aadhaar number is required";
      else if (!/^\d{12}$/.test(personForm.aadharNo.replace(/\s/g, "")))
        errors.aadharNo = "Aadhaar must be exactly 12 digits";
    }

    // Passport validation - required for seafarers who chose passport OR for Foreigners
    if (isForeigner) {
      if (!personForm.idProofNumber && !personForm.passportNo) {
        errors.idProofNumber = "Passport number is required for Foreigners";
      }
    } else if (personForm.hepType === "3" && personForm.seafarerIdType === "passport") {
      if (!personForm.passportNo) errors.passportNo = "Passport number is required";
      else if (!/^[A-Z0-9]{5,20}$/i.test(personForm.passportNo))
        errors.passportNo = "Passport number must be 5-20 alphanumeric characters";
    }

    // Seafarer must select ID type
    if (personForm.hepType === "3" && !personForm.seafarerIdType && !isForeigner) {
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

    if (personForm.hepType === "1" && !(personForm.driverLicence || personForm.idProofFile || personForm.existingDlName || personForm.existingIdProofName)) {
      return toast.error("Driver Licence is mandatory for Drivers.");
    }

    if (!isForeigner && (personForm.hepType !== "3" || personForm.seafarerIdType === "aadhaar")) {
      if (!(personForm.aadharFile || personForm.existingAadharName)) {
        return toast.error("Aadhar Card upload is mandatory.");
      }
    }

    if (isForeigner && !(personForm.idProofFile || personForm.existingIdProofName || personForm.passportDoc || personForm.existingPassportName)) {
      return toast.error("Copy of Passport is mandatory for Foreigners.");
    }

    if (personForm.hepType === "3" && personForm.seafarerIdType === "passport") {
      if (!(personForm.passportDoc || personForm.existingPassportName)) {
        return toast.error("Passport upload is mandatory for Seafarers with Passport.");
      }
    }

    const isMonthlyOrYearly = ["2", "3", "MONTHLY", "ANNUAL", "YEARLY"].includes(String(personForm.passType).toUpperCase());
    if (isMonthlyOrYearly && !(personForm.policeVerification || personForm.existingPoliceName)) {
      return toast.error("Police Verification Certificate is mandatory for Monthly/Yearly passes.");
    }

    const isPersonOilDock = isOilDockArea(personForm.accessArea);
    if (isPersonOilDock && !(personForm.entryAuthorization || personForm.existingEntryAuthName)) {
      return toast.error("Entry Authorization is mandatory for Oil Dock passes.");
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
    const indiaObj = (masterData.countries || []).find(
      (c) => String(c.name || "").trim().toUpperCase() === "INDIA"
    );
    const indiaId = indiaObj ? String(indiaObj.id || indiaObj.value) : "";

    setPersonForm({
      ...initialPersonForm,
      country: indiaId,
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
    const indiaObj = (masterData.countries || []).find(
      (c) => String(c.name || "").trim().toUpperCase() === "INDIA"
    );
    const indiaId = indiaObj ? String(indiaObj.id || indiaObj.value) : "";

    setPersonForm({
      ...initialPersonForm,
      country: indiaId,
      dateFrom: now,
      dateTo: calculateDateTo(now, initialPersonForm.passPeriod, initialPersonForm.passType),
    });
    setPersonErrors({});
    setEditingPersonIndex(null);
  };

  const handleAddVehicle = () => {
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
      !(vehicleForm.fitnessCert || vehicleForm.existingFitnessName) ||
      !vehicleForm.insuranceExpiry ||
      !vehicleForm.rcValidity
    ) {
      return toast.error(
        "RC/NOC, Insurance, Fitness Certificate, and their Validity Dates are mandatory.",
      );
    }
    if (
      ["2", "3", "MONTHLY", "ANNUAL", "YEARLY"].includes(String(vehicleForm.passType))
    ) {
      if (!(vehicleForm.permit || vehicleForm.existingPermitName)) {
        return toast.error("Permit Document is mandatory for Monthly/Yearly passes.");
      }
      if (
        !(vehicleForm.requestLetter || vehicleForm.existingReqName) ||
        !(vehicleForm.taxDoc || vehicleForm.existingTaxName) ||
        !(vehicleForm.emissionCert || vehicleForm.existingEmissionName)
      ) {
        return toast.error("Request Letter, Tax Document, Emission Cert, and Permit are mandatory for Monthly/Yearly passes.");
      }
    }

    const isVehicleOilDock = isOilDockArea(vehicleForm.accessArea);
    if (isVehicleOilDock) {
      if (!(vehicleForm.sparkArrester || vehicleForm.existingSparkArresterName)) {
        return toast.error("Spark Arrester Certificate is mandatory for Oil Dock passes.");
      }
    }
    const isMonthlyYearly = ["2", "3", "MONTHLY", "ANNUAL", "YEARLY"].includes(String(vehicleForm.passType).toUpperCase());
    if (isMonthlyYearly && !(vehicleForm.twistLock || vehicleForm.existingTwistLockName)) {
      return toast.error("Twist Lock Certificate is mandatory for Monthly/Yearly passes.");
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
    if (!intake) return toast.error("Intake not loaded.");
    if (!agreedToTerms)
      return toast.warning("Please agree to the Terms and Conditions.");
    if (persons.length === 0 && vehicles.length === 0)
      return toast.warning("Add at least one person or vehicle.");

    // Enforce intake quotas
    if (persons.length > Number(intake.noOfPersonsAllowed || 0)) {
      return toast.error(
        `You can submit at most ${intake.noOfPersonsAllowed} persons.`
      );
    }
    if (vehicles.length > Number(intake.noOfVehiclesAllowed || 0)) {
      return toast.error(
        `You can submit at most ${intake.noOfVehiclesAllowed} vehicles.`
      );
    }

    setLoading(true);

    try {
      const formData = new FormData();

      const finalPurpose =
        String(generalForm.purpose) === "6"
          ? 6
          : parseInt(generalForm.purpose, 10);

      const getEnumValue = (arr, id, fallback) => {
        if (!id) return fallback;
        const item = arr.find(
          (x) => String(x.id) === String(id) || String(x.value) === String(id),
        );
        let value = item ? item.value || item.label || item.name : fallback;
        if (value === "YEARLY") value = "ANNUAL";
        return value;
      };

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
        return {
          rateId: 1,
          hepTypeId: parseInt(p.hepType, 10) || 2,
          name: p.name,
          aadharNo: p.aadharNo,
          mobile: p.mobile,
          email: p.email,
          visaNo: p.visaNo || '',
          dob: p.dob || null,
          nationality: getEnumValue(
            masterData.nationalities,
            p.nationality,
            "INDIAN",
          ),
          countryId: (() => {
            const parsed = parseInt(p.country, 10);
            if (!isNaN(parsed) && parsed > 0) return parsed;
            const indiaObj = (masterData.countries || []).find(
              (c) => String(c.name || "").trim().toUpperCase() === "INDIA"
            );
            return indiaObj ? (parseInt(indiaObj.id || indiaObj.value, 10) || 75) : 75;
          })(),
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
          idProofType: getEnumValue(masterData.idProofTypes, p.idProofType, ""),
          idProofNumber: p.idProofNumber,
          passType: getEnumValue(masterData.passTypes, p.passType, "DAILY"),
          passPeriod: parseInt(p.passPeriod, 10) || 1,
          dateFrom: p.dateFrom,
          dateTo: computedDateTo,
          amount: parseFloat(p.amount) || 0,
        };
      });

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

      // Vendor payload — no authLetter, no agentId
      formData.append("persons", JSON.stringify(formattedPersons));
      formData.append("vehicles", JSON.stringify(formattedVehicles));
      formData.append("purposeOfVisitId", String(finalPurpose || ""));
      formData.append("paymentMode", paymentMode.toUpperCase());
      formData.append("baseTotal", String(parseFloat(totals.base) || 0.0));
      formData.append("grossTotal", String(parseFloat(totals.base) || 0.0));
      formData.append("gstAmount", String(parseFloat(totals.gst) || 0.0));
      formData.append("netAmount", String(parseFloat(totals.net) || 0.0));

      // Files
      persons.forEach((p) => {
        if (p.photo) formData.append("personPhoto", p.photo);
        if (p.aadharFile) formData.append("personAadhar", p.aadharFile);
        if (p.idProofFile) formData.append("personIdProof", p.idProofFile);
        if (p.requisitionLetter)
          formData.append("requisitionLetter", p.requisitionLetter);
        const dlFile = p.driverLicence || (p.hepType === "1" ? p.idProofFile : null);
        if (dlFile) formData.append("driverLicense", dlFile);
        if (p.policeVerification)
          formData.append("policeVerification", p.policeVerification);
        if (p.proofOfEmployment)
          formData.append("employmentProof", p.proofOfEmployment);
        if (p.copyOfLicence) formData.append("chaLicenseCopy", p.copyOfLicence);
        if (p.passportDoc) formData.append("passportDoc", p.passportDoc);
        if (p.entryAuthorization) formData.append("entryAuthorization", p.entryAuthorization);
      });

      vehicles.forEach((v) => {
        if (v.rcDocument) formData.append("vehicleRC", v.rcDocument);
        if (v.insuranceDocument)
          formData.append("vehicleInsurance", v.insuranceDocument);
        if (v.permit) formData.append("vehiclePermit", v.permit);
        if (v.fitnessCert) formData.append("vehicleFitness", v.fitnessCert);
        if (v.requestLetter)
          formData.append("vehicleRequestLetter", v.requestLetter);
        if (v.taxDoc) formData.append("vehicleTax", v.taxDoc);
        if (v.emissionCert) formData.append("vehicleEmission", v.emissionCert);
        if (v.sparkArrester) formData.append("sparkArrester", v.sparkArrester);
        if (v.twistLock) formData.append("twistLock", v.twistLock);
      });

      const response = await axios.post(
        `${AGENT_API}/vendor-pass/public/${activeToken}/submit`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      if (response.data?.success) {
        toast.success("Application Submitted Successfully!", {
          description: response.data.data?.referenceNo
            ? `Reference ${response.data.data.referenceNo}`
            : undefined,
        });
        setPersons([]);
        setVehicles([]);
        setAgreedToTerms(false);
        router.push(`/vendor_pass/${activeToken}/submitted`);
      } else {
        toast.error(response.data?.message || "Submission failed.");
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
          accept={fileType === "image" ? "image/*" : "application/pdf"}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
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
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border ${file
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

  // Loading guard
  if (intakeLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex items-center gap-3 text-slate-600">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-sm font-medium">Validating link…</span>
        </div>
      </div>
    );
  }
  if (intakeError || !intake) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="bg-white border border-red-200 rounded-2xl shadow-sm max-w-md w-full p-8 text-center space-y-3">
          <AlertTriangle className="h-10 w-10 text-red-500 mx-auto" />
          <h2 className="text-lg font-bold text-[#0a1e4d]">Link Unavailable</h2>
          <p className="text-sm text-slate-600">
            {intakeError || "This link is no longer active."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="space-y-6 font-sans max-w-7xl mx-auto px-4 text-slate-800">
        {/* Vendor public header */}
        <header className="bg-gradient-to-r from-[#0a1e4d] to-[#1a2f64] text-white rounded-2xl p-6 shadow-lg flex flex-col md:flex-row justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="bg-white/10 p-3 rounded-xl">
              <Ship className="h-7 w-7 text-orange-400" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-slate-300 font-semibold">
                Chennai Port Authority — Vendor Pass Application
              </p>
              <h2 className="text-2xl font-bold mt-1">
                {intake.companyName || "Vendor"}
              </h2>
              <p className="text-xs text-slate-300 mt-1">
                Ref: <span className="font-mono">{intake.referenceNo}</span>{" "}
                · Dept: {intake.departmentName}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-start md:items-end gap-2 text-sm">
            <span className="bg-amber-400 text-[#0a1e4d] font-bold px-3 py-1 rounded-lg">
              Valid Till: {intake.validUpto}
            </span>
            <span className="text-xs text-slate-300">
              Persons Allowed: <b>{intake.noOfPersonsAllowed}</b> · Vehicles
              Allowed: <b>{intake.noOfVehiclesAllowed}</b>
            </span>
          </div>
        </header>

        {activeTab === "apply" && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* General Information Section */}
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
              <div className="px-6 py-4 flex justify-between items-center bg-slate-50 border-b border-slate-100">
                <h3 className="text-sm font-black text-[#0a1e4d] uppercase tracking-wide flex items-center gap-2">
                  <FileText className="h-5 w-5 text-orange-500" /> General Information:
                </h3>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <DetailItem label="Department Name" value={intake.departmentName} highlight />
                <DetailItem label="Pass Type" value={intake.passApplyMode} />
                <DetailItem label="Type of Visitors" value={generalForm.visitorType ? getLabelById(masterData.purposes, generalForm.visitorType) : "-"} />
                {generalForm.visitorType === "6" && (
                  <DetailItem label="Visitor Type (Other)" value={generalForm.visitorTypeOther} />
                )}
                <DetailItem label="Purpose of Visit" value={generalForm.purpose ? getLabelById(masterData.purposes, generalForm.purpose) : "-"} />
                {generalForm.purpose === "6" && (
                  <DetailItem label="Purpose (Other)" value={generalForm.purposeOther} />
                )}
                <DetailItem label="Company Name" value={generalForm.companyName} highlight />
                <DetailItem label="Vendor Mobile" value={generalForm.mobile} />
                <DetailItem label="Vendor Email" value={generalForm.email} />
                <DetailItem label="Work Order" value={generalForm.hasWorkOrder ? "Yes" : "No"} />
                {generalForm.hasWorkOrder && (
                  <>
                    <DetailItem label="Ref Doc No / PO No / Work Order No" value={generalForm.refDocNo} />
                    {generalForm.workOrderFile && (
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Work Order Copy</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-700">{generalForm.workOrderFile.name}</span>
                          {intake?.workOrderFilePath && (
                            <button
                              type="button"
                              onClick={() => handleViewDoc(intake.id, "workOrder", intake.workOrderFileName)}
                              className="flex items-center gap-1 text-[10px] font-bold text-blue-700 hover:text-blue-800 bg-white px-2 py-1 rounded shadow-sm border border-slate-200"
                            >
                              <Eye className="h-3 w-3" /> View
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
                <DetailItem label="Equipment/Material Details" value={generalForm.equipmentMaterialDetails} />
                <DetailItem label="Remarks" value={generalForm.remarks} />
                <DetailItem label="No. of Vehicles Allowed" value={intake.noOfVehiclesAllowed} highlight />
                <DetailItem label="No. of Persons Allowed" value={intake.noOfPersonsAllowed} highlight />
                <DetailItem label="Validity Upto" value={intake.validUpto} highlight />
                <DetailItem label="Payment Mode" value={intake.paymentMode} />
                {intake.allowAuctionPassOnly && (
                  <DetailItem label="Auction Pass Only" value="Yes" highlight />
                )}
              </div>
            </section>

            {Number(intake?.noOfPersonsAllowed || 0) > 0 && (
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
                        {intake?.paymentMode !== "FREE" && (
                          <th className="px-4 py-3 text-xs font-semibold border-r border-white/10 uppercase tracking-wider text-right">
                            Amount
                          </th>
                        )}
                        <th className="px-4 py-3 text-xs font-semibold text-center">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {persons.length === 0 && (
                        <tr>
                          <td
                            colSpan={intake?.paymentMode === "FREE" ? 6 : 7}
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
                                      : `${AGENT_API}/pass-request/viewPassRequestsDocument?passRequestId=${p.existingPassRequestId}&documentType=personPhoto`
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
                          {intake?.paymentMode !== "FREE" && (
                            <td className="px-4 py-4 text-sm font-black text-[#0a1e4d] border-r border-slate-100 text-right">
                              ₹ {p.amount.toFixed(2)}
                            </td>
                          )}
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
                      {persons.length > 0 && intake?.paymentMode !== "FREE" && (
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
                    disabled={persons.length >= (intake?.noOfPersonsAllowed || 0)}
                    className={`text-xs font-bold px-6 py-3 rounded-xl shadow-lg transition-all uppercase tracking-wider ${persons.length >= (intake?.noOfPersonsAllowed || 0)
                      ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                      : "bg-orange-600 text-white hover:bg-orange-700"
                      }`}
                  >
                    Add Person
                  </button>
                </div>
              </section>
            )}

            {Number(intake?.noOfVehiclesAllowed || 0) > 0 && (
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
                        {intake?.paymentMode !== "FREE" && (
                          <th className="px-4 py-3 text-xs font-semibold border-r border-white/10 uppercase tracking-wider text-right">
                            Amount
                          </th>
                        )}
                        <th className="px-4 py-3 text-xs font-semibold text-center">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {vehicles.length === 0 && (
                        <tr>
                          <td
                            colSpan={intake?.paymentMode === "FREE" ? 6 : 7}
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
                          {intake?.paymentMode !== "FREE" && (
                            <td className="px-4 py-4 text-sm font-black text-[#0a1e4d] border-r border-slate-100 text-right">
                              ₹ {v.amount.toFixed(2)}
                            </td>
                          )}
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
                      {vehicles.length > 0 && intake?.paymentMode !== "FREE" && (
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
                    disabled={vehicles.length >= (intake?.noOfVehiclesAllowed || 0)}
                    className={`text-xs font-bold px-6 py-3 rounded-xl shadow-lg transition-all uppercase tracking-wider ${vehicles.length >= (intake?.noOfVehiclesAllowed || 0)
                      ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                      : "bg-orange-600 text-white hover:bg-orange-700"
                      }`}
                  >
                    Add Vehicle
                  </button>
                </div>
              </section>
            )}

            <footer className="flex justify-end pt-2 pb-8">
              <div className="bg-white p-8 w-full max-w-md shadow-2xl rounded-2xl border border-slate-200">
                {intake?.paymentMode !== "FREE" && (
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
                )}
                {intake?.paymentMode !== "FREE" && (
                  <div className="flex justify-center items-center gap-8 py-4">
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
                )}
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
                  disabled={loading || !agreedToTerms}
                  className="w-full mt-6 h-14 bg-[#0a1e4d] hover:bg-[#1a2f64] disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl font-black text-lg shadow-xl shadow-[#0a1e4d]/20 flex items-center justify-center gap-3 transition-all uppercase tracking-widest"
                >
                  {loading ? "Processing..." : "Submit Request"}{" "}
                  {!loading && <Send className="h-5 w-5" />}
                </button>
              </div>
            </footer>
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

              <div className="p-6 overflow-y-auto flex-1 bg-slate-50 space-y-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
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
                        onChange={(e) => {
                          handleHepTypeChange(e);
                          if (personErrors.hepType) {
                            setPersonErrors((prev) => ({ ...prev, hepType: null }));
                          }
                        }}
                        className={`${inputClass} ${personErrors.hepType ? "border-red-400 focus:border-red-500 focus:ring-red-500/20" : ""}`}
                      >
                        <option value="">Select Type</option>
                        {masterData.hepTypes.map((h) => (
                          <option key={h.id} value={h.id}>
                            {h.name}
                          </option>
                        ))}
                      </select>
                      {personErrors.hepType && (
                        <p className="text-xs text-red-500 mt-0.5 font-medium">
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

                          const isForeignerVal = nationalityName === "FOREIGNER" || value === "2";
                          const passportIdObj = (masterData.idProofTypes || []).find(
                            (t) => (t.label || t.name || "").toLowerCase().includes("passport")
                          );
                          const passportTypeId = passportIdObj ? String(passportIdObj.id || passportIdObj.value) : "4";

                          const dlIdObj = (masterData.idProofTypes || []).find(
                            (t) => (t.label || t.name || "").toLowerCase().includes("driver") || (t.label || t.name || "").toLowerCase().includes("licence")
                          );
                          const dlTypeId = dlIdObj ? String(dlIdObj.id || dlIdObj.value) : "1";

                          const indiaObj = (masterData.countries || []).find(
                            (c) => String(c.name || "").trim().toUpperCase() === "INDIA"
                          );
                          const indiaId = indiaObj ? String(indiaObj.id || indiaObj.value) : "";

                          const isInd = nationalityName === "INDIAN" || value === "1";

                          setPersonForm((prev) => ({
                            ...prev,
                            nationality: value,
                            country: isInd ? (indiaId || prev.country) : (prev.country === indiaId ? "" : prev.country),
                            idProofType: prev.hepType === "1" ? dlTypeId : (isForeignerVal ? passportTypeId : prev.idProofType),
                            aadharNo: prev.aadharNo,
                            aadharFile: prev.aadharFile,
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
                          !isPersonForeigner(personForm.nationality)
                        }
                      >
                        <option value="">Select Country</option>

                        {masterData.countries
                          .filter((c) => {
                            const isForeigner = isPersonForeigner(personForm.nationality);
                            if (!isForeigner) {
                              return c.name && c.name.trim().toUpperCase() === "INDIA";
                            } else {
                              return c.name && c.name.trim().toUpperCase() !== "INDIA";
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
                        Visa No. {isPersonForeigner(personForm.nationality) && <span className="text-red-500">*</span>}
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
                                if (personForm.withTwoWheeler)
                                  validatePersonField("vehicleNo", e.target.value);
                              }}
                              onChange={(e) => {
                                const val = e.target.value.toUpperCase().slice(0, 13);
                                setPersonForm({
                                  ...personForm,
                                  vehicleNo: val,
                                });
                                if (personForm.withTwoWheeler && val.length >= 8) {
                                  validatePersonField("vehicleNo", val);
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
                              <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                              <span className="text-red-500">{personErrors.vehicleNo}</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                              <span className="text-emerald-600">Valid vehicle registration format</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
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
                              aadharNo: value === "passport" ? "" : personForm.aadharNo,
                              passportNo: value === "aadhaar" ? "" : personForm.passportNo,
                              aadharFile: value === "passport" ? null : personForm.aadharFile,
                            });
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
                    {!isPersonForeigner(personForm.nationality) && (personForm.hepType !== "3" || personForm.seafarerIdType === "aadhaar") && (
                      <>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-700 uppercase">
                            Upload Aadhar <span className="text-red-500">*</span>
                          </label>
                          <FileUploadBox
                            file={personForm.aadharFile}
                            existingFileName={personForm.existingAadharName}
                            onView={() =>
                              handleViewDoc(
                                personForm.existingPassRequestId,
                                "personAadhar",
                                personForm.existingAadharName,
                                personForm.editIndex || 0,
                                true
                              )
                            }
                            onChange={async (e) => {
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
                                toast.loading("Reading Aadhaar PDF...", { id: "aadhar-ocr" });
                                const extractedAadhar = await extractAadharFromPdf(file);
                                toast.dismiss("aadhar-ocr");

                                if (!extractedAadhar) {
                                  setPersonForm((prev) => ({
                                    ...prev,
                                    aadharFile: file,
                                    aadharNo: "",
                                  }));
                                  toast.warning("Could not detect Aadhaar automatically. Please enter manually.");
                                  return;
                                }

                                setPersonForm((prev) => ({
                                  ...prev,
                                  aadharFile: file,
                                  aadharNo: extractedAadhar,
                                }));
                                toast.success(`Aadhaar detected: ${extractedAadhar}`);
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
                                  onChange={(e) => {
                                    const val = e.target.value
                                      .replace(/\D/g, "")
                                      .slice(0, 12);
                                    setPersonForm({ ...personForm, aadharNo: val });
                                    if (val.length === 12) {
                                      validatePersonField("aadharNo", val);
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
                                        <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />
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
                              </>
                            );
                          })()}
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
                          placeholder="Specify Others"
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
                          if (val)
                            validatePersonField("idProofNumber", val, {
                              idProofType: personForm.idProofType,
                            });
                        }}
                        onBlur={(e) => {
                          if (e.target.value)
                            validatePersonField("idProofNumber", e.target.value, {
                              idProofType: personForm.idProofType,
                            });
                        }}
                        className={`${inputClass} ${personErrors.idProofNumber ? "border-red-400 focus:border-red-500 focus:ring-red-500/20" : ""}`}
                        placeholder={idProofPlaceholder}
                      />
                      {personErrors.idProofNumber && (
                        <p className="text-xs text-red-500 mt-0.5 font-medium">
                          {personErrors.idProofNumber}
                        </p>
                      )}
                    </div>
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
                                : `${AGENT_API}/pass-request/viewPassRequestsDocument?passRequestId=${personForm.existingPassRequestId}&documentType=personPhoto`
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
                          fileType="image" // 🔥 THIS IS THE KEY FIX
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
                      <label>
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
                            personForm.editIndex || 0,
                            true
                          )
                        }
                        onChange={(e) => {
                          const file = e.target.files[0];
                          setPersonForm((prev) => ({
                            ...prev,
                            idProofFile: file,
                            driverLicence: prev.hepType === "1" ? file : prev.driverLicence,
                          }));
                        }}
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
                            {getFilteredPassTypes(intake, masterData.passTypes).map((t) => (
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
                          <div className="relative flex items-center">
                            <input
                              type="text"
                              placeholder="DD/MM/YYYY, hh:mm AM/PM"
                              value={formatDateTimeISOToDisplay(personForm.dateFrom)}
                              onChange={(e) => {
                                const iso = formatDateTimeDisplayToISO(e.target.value);
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
                                id="vendor-person-datefrom-picker"
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
                                  const picker = document.getElementById("vendor-person-datefrom-picker");
                                  if (picker && typeof picker.showPicker === "function") {
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

                {((personForm.hepType === "1" && personForm.idProofType !== "1") ||
                  String(personForm.passType) === "2" ||
                  String(personForm.passType) === "3" ||
                  personForm.hepType === "3" ||
                  String(personForm.accessArea).toUpperCase().includes("OIL JETTY") ||
                  String(personForm.accessArea) === "1") && (
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
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
                                personForm.editIndex || 0,
                                true
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
                              label="Police Verification Certificate"
                              isRequired
                              file={personForm.policeVerification}
                              existingFileName={personForm.existingPoliceName}
                              onView={() =>
                                handleViewDoc(
                                  personForm.existingPassRequestId,
                                  "policeVerification",
                                  personForm.existingPoliceName,
                                  personForm.editIndex || 0,
                                  true
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
                          <>
                            {personForm.seafarerIdType === "passport" && (
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
                                    if (personErrors.passportNo) {
                                      setPersonErrors((prev) => ({ ...prev, passportNo: null }));
                                    }
                                  }}
                                  className={`w-full h-10 border rounded-lg text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 px-3 shadow-sm outline-none uppercase transition-all ${personErrors.passportNo ? "border-red-400 bg-red-50" : "border-slate-300 bg-white"
                                    }`}
                                  placeholder="A1234567"
                                  maxLength={8}
                                />
                                {personErrors.passportNo && (
                                  <p className="text-xs text-red-500 mt-0.5 font-medium">{personErrors.passportNo}</p>
                                )}
                              </div>
                            )}
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
                                  personForm.editIndex || 0,
                                  true
                                )
                              }
                              onChange={(e) =>
                                setPersonForm({
                                  ...personForm,
                                  passportDoc: e.target.files[0],
                                })
                              }
                            />
                          </>
                        )}
                        {(isOilDockArea(personForm.accessArea)) && (
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
                                personForm.editIndex || 0,
                                true
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

              <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50 space-y-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
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
                              }}
                              onBlur={(e) =>
                                validateVehicleField("regNo", e.target.value)
                              }
                              className={`${baseInputClass} ${customBorderClass} uppercase font-bold text-[#0a1e4d] tracking-wider`}
                              placeholder="TN-XX-XX-XXXX"
                              maxLength={13}
                            />
                            {hasVal && (
                              <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold transition-all">
                                {hasError ? (
                                  <>
                                    <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />
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
                            const val = iso || formatted;
                            setVehicleForm((prev) => ({
                              ...prev,
                              insuranceExpiry: val,
                            }));
                            validateVehicleField("insuranceExpiry", val);
                          }}
                          className={`${inputClass} pr-10 ${vehicleErrors.insuranceExpiry ? "border-red-400" : ""}`}
                        />
                        <div className="absolute right-2 flex items-center">
                          <input
                            type="date"
                            id="vendor-ins-hidden-picker"
                            tabIndex={-1}
                            value={
                              vehicleForm.insuranceExpiry && vehicleForm.insuranceExpiry.includes("-")
                                ? vehicleForm.insuranceExpiry
                                : formatDDMMYYYYToISO(vehicleForm.insuranceExpiry)
                            }
                            onChange={(e) => {
                              if (e.target.value) {
                                setVehicleForm((prev) => ({
                                  ...prev,
                                  insuranceExpiry: e.target.value,
                                }));
                                validateVehicleField("insuranceExpiry", e.target.value);
                              }
                            }}
                            className="sr-only"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const picker = document.getElementById("vendor-ins-hidden-picker");
                              if (picker && typeof picker.showPicker === "function") {
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
                            const val = iso || formatted;
                            setVehicleForm((prev) => ({
                              ...prev,
                              rcValidity: val,
                            }));
                            validateVehicleField("rcValidity", val);
                          }}
                          className={`${inputClass} pr-10 ${vehicleErrors.rcValidity ? "border-red-400" : ""}`}
                        />
                        <div className="absolute right-2 flex items-center">
                          <input
                            type="date"
                            id="vendor-rc-hidden-picker"
                            tabIndex={-1}
                            value={
                              vehicleForm.rcValidity && vehicleForm.rcValidity.includes("-")
                                ? vehicleForm.rcValidity
                                : formatDDMMYYYYToISO(vehicleForm.rcValidity)
                            }
                            onChange={(e) => {
                              if (e.target.value) {
                                setVehicleForm((prev) => ({
                                  ...prev,
                                  rcValidity: e.target.value,
                                }));
                                validateVehicleField("rcValidity", e.target.value);
                              }
                            }}
                            className="sr-only"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const picker = document.getElementById("vendor-rc-hidden-picker");
                              if (picker && typeof picker.showPicker === "function") {
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
                            {getFilteredPassTypes(intake, masterData.passTypes).map((t) => (
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
                          <div className="relative flex items-center">
                            <input
                              type="text"
                              placeholder="DD/MM/YYYY, hh:mm AM/PM"
                              value={formatDateTimeISOToDisplay(vehicleForm.dateFrom)}
                              onChange={(e) => {
                                const iso = formatDateTimeDisplayToISO(e.target.value);
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
                                id="vendor-vehicle-datefrom-picker"
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
                                  const picker = document.getElementById("vendor-vehicle-datefrom-picker");
                                  if (picker && typeof picker.showPicker === "function") {
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

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
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
                          vehicleForm.editIndex || 0,
                          true
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
                          vehicleForm.editIndex || 0,
                          true
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
                          vehicleForm.editIndex || 0,
                          true
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
                          vehicleForm.editIndex || 0,
                          true
                        )
                      }
                      onChange={(e) =>
                        setVehicleForm({
                          ...vehicleForm,
                          fitnessCert: e.target.files[0],
                        })
                      }
                    />
                    {(isOilDockArea(vehicleForm.accessArea)) && (
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
                            vehicleForm.editIndex || 0,
                            true
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
                    {["2", "3", "MONTHLY", "ANNUAL", "YEARLY"].includes(String(vehicleForm.passType).toUpperCase()) && (
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
                            vehicleForm.editIndex || 0,
                            true
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
                    {(!["2", "3", "MONTHLY", "ANNUAL", "YEARLY"].includes(String(vehicleForm.passType)) &&
                      ((String(vehicleForm.passType) === "1" || String(vehicleForm.passType).toUpperCase() === "DAILY") &&
                        (isOilDockArea(vehicleForm.accessArea)))) && (
                        <FileUploadBox
                          label="Request Letter"
                          isRequired
                          file={vehicleForm.requestLetter}
                          existingFileName={vehicleForm.existingReqName}
                          onView={() =>
                            handleViewDoc(
                              vehicleForm.existingPassRequestId,
                              "vehicleRequestLetter",
                              vehicleForm.existingReqName,
                              vehicleForm.editIndex || 0,
                              true
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
                    {["2", "3", "MONTHLY", "ANNUAL", "YEARLY"].includes(String(vehicleForm.passType)) && (
                      <>
                        <FileUploadBox
                          label="Request Letter"
                          isRequired
                          file={vehicleForm.requestLetter}
                          existingFileName={vehicleForm.existingReqName}
                          onView={() =>
                            handleViewDoc(
                              vehicleForm.existingPassRequestId,
                              "vehicleRequestLetter",
                              vehicleForm.existingReqName,
                              vehicleForm.editIndex || 0,
                              true
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
                              vehicleForm.editIndex || 0,
                              true
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
                              vehicleForm.editIndex || 0,
                              true
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
                    const now = getCurrentDateTime();
                    setVehicleForm({
                      ...initialVehicleForm,
                      dateFrom: now,
                      dateTo: calculateDateTo(now, initialVehicleForm.passPeriod, initialVehicleForm.passType),
                    });
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
    <th className="p-3 text-xs font-bold text-center border-r">S.No</th>
    <th className="p-3 text-xs font-bold border-r">Category</th>
    <th className="p-3 text-xs font-bold border-r">Description ₹</th>
    <th className="p-3 text-xs font-bold text-right border-r">Daily ₹</th>
    <th className="p-3 text-xs font-bold text-right border-r">Monthly ₹</th>
    <th className="p-3 text-xs font-bold text-right">Yearly ₹</th>
  </tr>
</thead>

<tbody className="divide-y divide-slate-100">
  {[
    {
      key: "INDIVIDUAL",
      name: "Individual",
      description: "Driver, Personal, Seafarer, Visitor",
    },
    {
      key: "VEHICLE",
      name: "Vehicle",
      description:
        "Articulated, Back-Hoes, Bus, Car, Cement Mixer, Concrete Mixer Lorry, Cycle Rickshaw, Defence Tank, Jeep, Light Vehicle, Lorry, Open Lorry, Open Tractor, Open Truck, PFS Vehicle, Recovery, Road Roller, Tanker, Taurus, Taurus Tipper, Taxi, Tipper, Tractor Trailer, Trailer Lorry, Tri Cycle, Truck, Van",
    },
    {
      key: "CARGO_HANDLING_EQUIPMENT",
      name: "Cargo Handling Equipment",
      description:
        "Poclain, Dozers, Excavators, Forklift, Dumpers, JCB Earthmover, Crane, Mobile Crane, Payloader",
    },
  ].map((item, index) => {
    const fee = feeMaster?.[item.key];
    if (!fee) return null;

    return (
      <tr key={item.key} className="hover:bg-slate-50">
        <td className="p-3 text-center border-r">
          {index + 1}
        </td>

        <td className="p-3 font-medium border-r">
          {item.name}
        </td>

        <td className="p-3 text-sm text-slate-600 border-r">
          {item.description}
        </td>

        <td className="p-3 text-right border-r whitespace-nowrap">
          ₹ {fee.daily.toFixed(2)}
        </td>

        <td className="p-3 text-right border-r whitespace-nowrap">
          ₹ {fee.monthly.toFixed(2)}
        </td>

        <td className="p-3 text-right whitespace-nowrap">
          ₹ {fee.yearly.toFixed(2)}
        </td>
      </tr>
    );
  })}
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

        {/* ============================================================== */}
        {/* PDF/IMAGE VIEWER OVERLAY */}
        {/* ============================================================== */}
        {viewingDocUrl && (
          <div
            className={`fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm transition-all duration-300 ${isFullscreen ? "p-0" : "p-4 md:p-8"}`}
          >
            <div
              className={`bg-white w-full h-full flex flex-col overflow-hidden shadow-2xl transition-all duration-300 ${isFullscreen ? "max-w-full rounded-none border-none" : "max-w-6xl rounded-xl border border-slate-700"}`}
            >
              <div className="flex justify-between items-center px-4 py-3 bg-slate-800 text-white">
                <h3 className="font-bold flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-400" />
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
                {docLoading && (
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
                    onLoad={() => setDocLoading(false)}
                  />
                ) : (
                  <iframe
                    src={viewingDocUrl}
                    className="w-full h-full border-none relative z-0 bg-white"
                    title="Document Viewer"
                    onLoad={() => setDocLoading(false)}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
