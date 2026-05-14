"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
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
  FileText,
  ShieldCheck,
  Phone,
  UserPlus,
  BookOpen,
  FileCheck2,
  CheckCircle2,
  Eye,
} from "lucide-react";

const AGENT_API = process.env.NEXT_PUBLIC_AGENT_API;

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
  // Always lock the expiry time to 05:59 AM (port pass cutoff).
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

  const [persons, setPersons] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [submittedPasses, setSubmittedPasses] = useState([]);

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
    balance: "7725.00", // Keep mock for now if wallet isn't built
    utilizedBalance: "0.00",
    purpose: "",
    purposeOther: "",
    authLetter: null,
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
    amount: 10.2,
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
    passType: "1", // Default: 1 (Daily)
    passPeriod: "1",
    dateFrom: getCurrentDateTime(),
    dateTo: "",
    amount: 25.5,
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

  useEffect(() => {
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

    let amt = 10.2;
    if (String(personForm.passType) === "2") amt = 153.0;
    if (String(personForm.passType) === "3") amt = 407.0;

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

    let amt = 25.5;
    if (String(vehicleForm.passType) === "2") amt = 306.0;
    if (String(vehicleForm.passType) === "3") amt = 2035.0;

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
  }, [vehicleForm.passType, vehicleForm.passPeriod, vehicleForm.dateFrom]);

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

  const fetchSubmittedPasses = async () => {
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
        },
      );

      if (response.data && response.data.success) {
        setSubmittedPasses(response.data.data);
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
  };

  // Trigger fetch when "view" tab is selected
  useEffect(() => {
    if (activeTab === "view") {
      fetchSubmittedPasses();
    }
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
      });

      toast.success("Vehicle details & documents auto-filled");
    } else {
      setVehicleForm(initialVehicleForm);
    }
  };

  const handleAddPerson = () => {
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

    if (!(personForm.requisitionLetter || personForm.existingReqName))
      return toast.error("Requisition Letter is mandatory.");

    if (
      personForm.hepType === "1" &&
      !(personForm.driverLicence || personForm.existingDlName)
    )
      return toast.error("Driver Licence is mandatory for Drivers.");

    if (
      personForm.hepType === "3" &&
      !(personForm.passportDoc || personForm.existingPassportName)
    )
      return toast.error("Passport is mandatory for Seafarers.");

    if (personForm.passType === "2" || personForm.passType === "3") {
      if (
        !(personForm.policeVerification || personForm.existingPoliceName) ||
        !(personForm.proofOfEmployment || personForm.existingEmpName) ||
        !(personForm.copyOfLicence || personForm.existingChaName)
      ) {
        return toast.error(
          "Police Verification, Employment Proof, and Licence are mandatory for Monthly/Yearly passes.",
        );
      }
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
    setPersonForm(initialPersonForm);
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
    setPersonForm(initialPersonForm);
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
    setVehicleForm(initialVehicleForm);
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
    if (!generalForm.purpose)
      return toast.warning("Please select a Purpose of Visit.");
    if (!generalForm.authLetter)
      return toast.warning("Please upload the Authorised Letter.");
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

        return {
          rateId: 1,
          hepTypeId: parseInt(p.hepType, 10) || 2,
          name: p.name,
          aadharNo: p.aadharNo,
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
          idProofType: getEnumValue(masterData.idProofTypes, p.idProofType, ""),
          idProofNumber: p.idProofNumber,
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

      // =========================
      // FILES APPENDING
      // =========================

      // ===== CHANGE START =====
      // Send files for every person (indexed)

      persons.forEach((p) => {
        if (p.photo) formData.append("personPhoto", p.photo);
        if (p.aadharFile) formData.append("personAadhar", p.aadharFile);
        if (p.idProofFile) formData.append("personIdProof", p.idProofFile);
        if (p.requisitionLetter)
          formData.append("requisitionLetter", p.requisitionLetter);
        if (p.driverLicence) formData.append("driverLicense", p.driverLicence);
        if (p.policeVerification)
          formData.append("policeVerification", p.policeVerification);
        if (p.proofOfEmployment)
          formData.append("employmentProof", p.proofOfEmployment);
        if (p.copyOfLicence) formData.append("chaLicenseCopy", p.copyOfLicence);
        if (p.passportDoc) formData.append("passportDoc", p.passportDoc);
        if (p.cdcDocument) formData.append("cdcDocument", p.cdcDocument);
        if (p.declarationForm)
          formData.append("declarationForm", p.declarationForm);
      });

      // Send files for every vehicle

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
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border ${
            file
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
          onClick={() => setActiveTab("apply")}
          className={`px-8 py-4 text-base transition-all ${activeTab === "apply" ? "font-bold text-[#0a1e4d] dark:text-white border-b-2 border-[#0a1e4d] dark:border-white" : "font-semibold text-slate-500 dark:text-stone-400 hover:text-[#0a1e4d] dark:hover:text-white"}`}
        >
          Apply New Pass
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                className="bg-orange-600 text-white text-xs font-bold px-6 py-3 rounded-xl shadow-lg hover:bg-orange-700 transition-all uppercase tracking-wider"
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
                className="bg-orange-600 text-white text-xs font-bold px-6 py-3 rounded-xl shadow-lg hover:bg-orange-700 transition-all uppercase tracking-wider"
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
                onClick={fetchSubmittedPasses}
                disabled={loadingPasses}
                className="bg-white text-[#0a1e4d] px-4 py-2 rounded-lg border border-slate-200 text-xs font-bold hover:bg-slate-50 disabled:opacity-50 transition-colors flex items-center gap-2 shadow-sm"
              >
                {loadingPasses ? "Refreshing..." : "Refresh List"}
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#0a1e4d] text-white">
                  <tr>
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
                  {loadingPasses ? (
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
                  ) : submittedPasses.length === 0 ? (
                    <tr>
                      <td
                        colSpan="6"
                        className="p-12 text-center text-sm font-medium text-slate-400 italic"
                      >
                        No pass requests found in the database.
                      </td>
                    </tr>
                  ) : (
                    submittedPasses.map((pass, idx) => {
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

                  {/* Aadhaar Fields - Show for non-seafarers OR seafarers who selected aadhaar */}
                  {(personForm.hepType !== "3" || personForm.seafarerIdType === "aadhaar") && (
                    <>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase">
                          Aadhaar No. <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={personForm.aadharNo}
                          onChange={(e) => {
                            const val = e.target.value
                              .replace(/\D/g, "")
                              .slice(0, 12);
                            setPersonForm({ ...personForm, aadharNo: val });
                            // Clear error on change
                            if (personErrors.aadharNo) {
                              setPersonErrors((prev) => ({ ...prev, aadharNo: null }));
                            }
                          }}
                          className={`w-full h-10 border rounded-lg text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 px-3 shadow-sm outline-none transition-all ${
                            personErrors.aadharNo
                              ? "border-red-400 bg-red-50"
                              : "border-slate-300 bg-white"
                          }`}
                          placeholder="XXXX XXXX XXXX"
                          maxLength={12}
                          inputMode="numeric"
                        />
                        {personErrors.aadharNo && (
                          <p className="text-xs text-red-500 mt-0.5 font-medium">
                            {personErrors.aadharNo}
                          </p>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase">
                          Upload Aadhar <span className="text-red-500">*</span>
                        </label>
                        <FileUploadBox
                          file={personForm.aadharFile}
                          existingFileName={personForm.existingAadharName}
                          onView={() =>
                            window.open(
                              `${AGENT_API}/pass-request/viewPassRequestsDocument?passRequestId=${personForm.existingPassRequestId}&documentType=personAadhar`,
                              "_blank",
                            )
                          }
                          onChange={(e) =>
                            setPersonForm({
                              ...personForm,
                              aadharFile: e.target.files[0],
                            })
                          }
                        />
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
                          className={`w-full h-10 border rounded-lg text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 px-3 shadow-sm outline-none uppercase transition-all ${
                            personErrors.passportNo
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
                            window.open(
                              `${AGENT_API}/pass-request/viewPassRequestsDocument?passRequestId=${personForm.existingPassRequestId}&documentType=passportDoc`,
                              "_blank",
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
                    <div className="flex h-10 shadow-sm rounded-lg overflow-hidden border border-slate-300 focus-within:ring-2 focus-within:ring-orange-500/30 focus-within:border-orange-500 transition-all">
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
                        placeholder="Vehicle No (e.g. TN01AB1234)"
                        className="w-full text-sm disabled:bg-slate-100 disabled:cursor-not-allowed px-3 outline-none uppercase font-bold text-[#0a1e4d]"
                        onBlur={(e) => {
                          if (personForm.withTwoWheeler)
                            validatePersonField("vehicleNo", e.target.value);
                        }}
                        // Combined single onChange handler
                        onChange={(e) => {
                          const val = e.target.value.toUpperCase().slice(0, 13);

                          // Update the form state
                          setPersonForm({
                            ...personForm,
                            vehicleNo: val,
                          });

                          // Run validation if applicable
                          if (personForm.withTwoWheeler && val.length >= 8) {
                            validatePersonField("vehicleNo", val);
                          }
                        }}
                      />
                    </div>
                    {personErrors.vehicleNo && personForm.withTwoWheeler && (
                      <p className="text-xs text-red-500 mt-1 font-medium">
                        {personErrors.vehicleNo}
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
                            window.open(
                              `${AGENT_API}/pass-request/viewPassRequestsDocument?passRequestId=${personForm.existingPassRequestId}&documentType=cdcDocument`,
                              "_blank",
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
                            window.open(
                              `${AGENT_API}/pass-request/viewPassRequestsDocument?passRequestId=${personForm.existingPassRequestId}&documentType=declarationForm`,
                              "_blank",
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
                        window.open(
                          `${AGENT_API}/pass-request/viewPassRequestsDocument?passRequestId=${personForm.existingPassRequestId}&documentType=personIdProof`,
                          "_blank",
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

                            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-3 flex items-center gap-2">
                  <FileCheck2 className="h-5 w-5 text-orange-500" /> 2.
                  Mandatory Documents
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <FileUploadBox
                    label="Requisition Letter"
                    isRequired
                    file={personForm.requisitionLetter}
                    existingFileName={personForm.existingReqName}
                    onView={() =>
                      window.open(
                        `${AGENT_API}/pass-request/viewPassRequestsDocument?passRequestId=${personForm.existingPassRequestId}&documentType=requisitionLetter`,
                        "_blank",
                      )
                    }
                    onChange={(e) =>
                      setPersonForm({
                        ...personForm,
                        requisitionLetter: e.target.files[0],
                      })
                    }
                  />
                  {personForm.hepType === "1" && ( // 1 = Driver ID
                    <FileUploadBox
                      label="Driver Licence"
                      isRequired
                      file={personForm.driverLicence}
                      existingFileName={personForm.existingDlName}
                      onView={() =>
                        window.open(
                          `${AGENT_API}/pass-request/viewPassRequestsDocument?passRequestId=${personForm.existingPassRequestId}&documentType=driverLicense`,
                          "_blank",
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
                    <>
                      <FileUploadBox
                        label="Police Verification"
                        isRequired
                        file={personForm.policeVerification}
                        existingFileName={personForm.existingPoliceName}
                        onView={() =>
                          window.open(
                            `${AGENT_API}/pass-request/viewPassRequestsDocument?passRequestId=${personForm.existingPassRequestId}&documentType=policeVerification`,
                            "_blank",
                          )
                        }
                        onChange={(e) =>
                          setPersonForm({
                            ...personForm,
                            policeVerification: e.target.files[0],
                          })
                        }
                      />
                      <FileUploadBox
                        label="Proof of Employment"
                        isRequired
                        file={personForm.proofOfEmployment}
                        existingFileName={personForm.existingEmpName}
                        onView={() =>
                          window.open(
                            `${AGENT_API}/pass-request/viewPassRequestsDocument?passRequestId=${personForm.existingPassRequestId}&documentType=employmentProof`,
                            "_blank",
                          )
                        }
                        onChange={(e) =>
                          setPersonForm({
                            ...personForm,
                            proofOfEmployment: e.target.files[0],
                          })
                        }
                      />
                      <FileUploadBox
                        label="Copy of Licence"
                        hint="(Stevedore/CHA)"
                        isRequired
                        file={personForm.copyOfLicence}
                        existingFileName={personForm.existingChaName}
                        onView={() =>
                          window.open(
                            `${AGENT_API}/pass-request/viewPassRequestsDocument?passRequestId=${personForm.existingPassRequestId}&documentType=chaLicenseCopy`,
                            "_blank",
                          )
                        }
                        onChange={(e) =>
                          setPersonForm({
                            ...personForm,
                            copyOfLicence: e.target.files[0],
                          })
                        }
                      />
                    </>
                  )}
                  {(String(personForm.passType) === "2" ||
                    String(personForm.passType) === "3" ||
                    personForm.hepType === "3") && (
                    <FileUploadBox
                      label="Passport"
                      isRequired={personForm.hepType === "3"}
                      hint={personForm.hepType !== "3" && "(Optional)"}
                      file={personForm.passportDoc}
                      existingFileName={personForm.existingPassportName}
                      onView={() =>
                        window.open(
                          `${AGENT_API}/pass-request/viewPassRequestsDocument?passRequestId=${personForm.existingPassRequestId}&documentType=passportDoc`,
                          "_blank",
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
                      className={`${inputClass} uppercase font-bold text-[#0a1e4d] tracking-wider ${vehicleErrors.regNo ? "border-red-400 focus:border-red-500 focus:ring-red-500/20" : ""}`}
                      placeholder="TN-XX-XX-XXXX"
                      maxLength={13}
                    />
                    {vehicleErrors.regNo && (
                      <p className="text-xs text-red-500 mt-0.5 font-medium">
                        {vehicleErrors.regNo}
                      </p>
                    )}
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
                      window.open(
                        `${AGENT_API}/pass-request/viewPassRequestsDocument?passRequestId=${vehicleForm.existingPassRequestId}&documentType=vehicleRC`,
                        "_blank",
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
                      window.open(
                        `${AGENT_API}/pass-request/viewPassRequestsDocument?passRequestId=${vehicleForm.existingPassRequestId}&documentType=vehicleInsurance`,
                        "_blank",
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
                      window.open(
                        `${AGENT_API}/pass-request/viewPassRequestsDocument?passRequestId=${vehicleForm.existingPassRequestId}&documentType=vehiclePermit`,
                        "_blank",
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
                      window.open(
                        `${AGENT_API}/pass-request/viewPassRequestsDocument?passRequestId=${vehicleForm.existingPassRequestId}&documentType=vehicleFitness`,
                        "_blank",
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
                          window.open(
                            `${AGENT_API}/pass-request/viewPassRequestsDocument?passRequestId=${vehicleForm.existingPassRequestId}&documentType=vehicleRequestLetter`,
                            "_blank",
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
                          window.open(
                            `${AGENT_API}/pass-request/viewPassRequestsDocument?passRequestId=${vehicleForm.existingPassRequestId}&documentType=vehicleTax`,
                            "_blank",
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
                          window.open(
                            `${AGENT_API}/pass-request/viewPassRequestsDocument?passRequestId=${vehicleForm.existingPassRequestId}&documentType=vehicleEmission`,
                            "_blank",
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
                                  className={`px-2 py-1 rounded-full text-[10px] font-bold ${String(p.status).toUpperCase() === "APPROVED" ? "bg-emerald-100 text-emerald-700" : String(p.status).toUpperCase() === "REJECTED" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}
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
                                  className={`px-2 py-1 rounded-full text-[10px] font-bold ${String(v.status).toUpperCase() === "APPROVED" ? "bg-emerald-100 text-emerald-700" : String(v.status).toUpperCase() === "REJECTED" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}
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
                        10.20
                      </td>
                      <td className="p-3 text-sm font-bold text-slate-700 text-right border-r border-slate-100">
                        153.00
                      </td>
                      <td className="p-3 text-sm font-bold text-slate-700 text-right border-r border-slate-100">
                        407.00
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
                        10.20
                      </td>
                      <td className="p-3 text-sm font-bold text-slate-700 text-right border-r border-slate-100">
                        153.00
                      </td>
                      <td className="p-3 text-sm font-bold text-slate-700 text-right border-r border-slate-100">
                        407.00
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
                        10.20
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
                        25.50
                      </td>
                      <td className="p-3 text-sm font-bold text-slate-700 text-right border-r border-slate-100">
                        306.00
                      </td>
                      <td className="p-3 text-sm font-bold text-slate-700 text-right border-r border-slate-100">
                        2035.00
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
                        40.70
                      </td>
                      <td className="p-3 text-sm font-bold text-slate-700 text-right border-r border-slate-100">
                        458.00
                      </td>
                      <td className="p-3 text-sm font-bold text-slate-700 text-right border-r border-slate-100">
                        3053.00
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
                        10.20
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
                        25.50
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
    </div>
  );
}
