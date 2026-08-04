"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import axios from "axios";
import Link from "next/link";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";
import {
  Ship,
  ArrowLeft,
  UploadCloud,
  CheckCircle2,
  ShieldCheck,
  RefreshCw,
  Building2,
  MapPin,
  Contact2,
  FileText,
  Loader2,
  Maximize,
  Minimize,
  XCircle,
  Eye,
  Calendar,
} from "lucide-react";

// --- Date Format Helpers for DD/MM/YYYY ---
const formatISOToDDMMYYYY = (isoStr) => {
  if (!isoStr) return "";
  if (isoStr.includes("/")) return isoStr;
  const parts = String(isoStr).split("T")[0].split("-");
  if (parts.length === 3) {
    const [yyyy, mm, dd] = parts;
    return `${dd}/${mm}/${yyyy}`;
  }
  return isoStr;
};

const formatDDMMYYYYToISO = (ddmmyyyy) => {
  if (!ddmmyyyy) return "";
  if (ddmmyyyy.includes("-")) return ddmmyyyy;
  const parts = String(ddmmyyyy).split("/");
  if (parts.length === 3 && parts[2].length === 4) {
    const [dd, mm, yyyy] = parts;
    return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  }
  return "";
};

// identificationTypes is now computed dynamically inside the component
// to support conditional required fields based on user type (e.g. Transport)

// ============================================================
// VALIDATION UTILITIES  (same pattern as pass-request page)
// ============================================================
const FIELD_VALIDATORS = {
  mobileNo: (v) => /^[6-9]\d{9}$/.test(v.replace(/\s/g, "")),
  contactMobile: (v) => /^[6-9]\d{9}$/.test(v.replace(/\s/g, "")),
  email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
  contactEmail: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
  entityName: (v) => v.trim().length >= 2,
  licenseNumber: (v) => v.trim().length >= 2,
  licenseValidityDate: (v) => {
    if (!v) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selected = new Date(v);
    return selected >= today;
  },
  firstName: (v) => /^[a-zA-Z\s.'-]{2,50}$/.test(v.trim()),
  lastName: (v) => /^[a-zA-Z\s.'-]{1,50}$/.test(v.trim()),
  pincode: (v) => /^\d{6}$/.test(v),
  gstinNumber: (v) =>
    /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(
      v.toUpperCase(),
    ),
  panNumber: (v) => /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(v.toUpperCase()),
  tanNumber: (v) =>
    v === "" || /^[A-Z]{4}[0-9]{5}[A-Z]{1}$/.test(v.toUpperCase()),
  addressLine: (v) => v.trim().length >= 10,
};

const getFieldError = (field, value) => {
  if (!value && value !== false) return null; // skip truly empty optionals
  switch (field) {
    case "mobileNo":
    case "contactMobile":
      return FIELD_VALIDATORS[field](value)
        ? null
        : "Enter a valid 10-digit Indian mobile number starting with 6-9";
    case "email":
    case "contactEmail":
      return FIELD_VALIDATORS[field](value)
        ? null
        : "Enter a valid email address (e.g. name@domain.com)";
    case "entityName":
      return FIELD_VALIDATORS.entityName(value)
        ? null
        : "Entity name must be at least 2 characters";
    case "licenseNumber":
      return FIELD_VALIDATORS.licenseNumber(value)
        ? null
        : "License number must be at least 2 characters";
    case "firstName":
      return FIELD_VALIDATORS.firstName(value)
        ? null
        : "First name must be 2-50 letters only";
    case "lastName":
      return FIELD_VALIDATORS.lastName(value)
        ? null
        : "Last name must be at least 1 letter";
    case "pincode":
      return FIELD_VALIDATORS.pincode(value)
        ? null
        : "PIN code must be exactly 6 digits";
    case "gstinNumber":
      return FIELD_VALIDATORS.gstinNumber(value)
        ? null
        : "Enter a valid 15-character GSTIN (e.g. 22AAAAA0000A1Z5)";
    case "panNumber":
      return FIELD_VALIDATORS.panNumber(value)
        ? null
        : "PAN must be in format: ABCDE1234F";
    case "tanNumber":
      return FIELD_VALIDATORS.tanNumber(value)
        ? null
        : "TAN must be in format: AAAA12345A (optional)";
    case "addressLine":
      return FIELD_VALIDATORS.addressLine(value)
        ? null
        : "Please enter a valid address (at least 10 characters)";
    default:
      return null;
  }
};

// ============================================================
// PDF FILE VALIDATION  (replaces the old alert-based version)
// ============================================================
const PDF_MAX_SIZE = 1 * 1024 * 1024; // 1 MB

/**
 * Validates that a file is a PDF and within size limit.
 * Returns an error string or null if valid.
 */
const validatePdfFile = (file) => {
  if (!file) return null;
  if (file.type !== "application/pdf") {
    return "Only PDF files are allowed";
  }
  if (file.size > PDF_MAX_SIZE) {
    return "File must be less than 1 MB";
  }
  return null;
};
// ============================================================

// Context to share errors with static components declared outside of render
const ErrorContext = React.createContext({ fieldErrors: {}, fileErrors: {} });

const SectionHeader = ({ icon: Icon, title }) => (
  <div className="flex items-center gap-3 mb-6 pb-3 border-b border-orange-100">
    <div className="p-2 bg-orange-100 rounded-lg">
      <Icon className="h-5 w-5 text-orange-600" />
    </div>
    <h3 className="text-xl font-bold text-slate-800">{title}</h3>
  </div>
);

const FieldError = ({ field }) => {
  const { fieldErrors } = React.useContext(ErrorContext);
  return fieldErrors[field] ? (
    <p className="text-xs text-red-500 font-medium mt-0.5 flex items-center gap-1 animate-in fade-in duration-200">
      <XCircle className="h-3.5 w-3.5 shrink-0" />
      {fieldErrors[field]}
    </p>
  ) : null;
};

const FileError = ({ fileKey }) => {
  const { fileErrors } = React.useContext(ErrorContext);
  return fileErrors[fileKey] ? (
    <p className="text-xs text-red-500 font-medium mt-1 flex items-center gap-1 animate-in fade-in duration-200">
      <XCircle className="h-3.5 w-3.5 shrink-0" />
      {fileErrors[fileKey]}
    </p>
  ) : null;
};

export default function RegisterPage() {
  const searchParams = useSearchParams(); // <-- 2. Initialize hook
  const editRef = searchParams.get("ref");
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); // NEW: Prevents double-clicks
  const [referenceNo, setReferenceNo] = useState("");
  const [entityFileName, setEntityFileName] = useState("");
  const [requisitionLetterFileName, setRequisitionLetterFileName] = useState("");
  const [workOrderFileName, setWorkOrderFileName] = useState("");
  const [licenseDocFileName, setLicenseDocFileName] = useState("");
  const [tableFiles, setTableFiles] = useState({});

  // ── Inline field error state ──────────────────────────────
  const [fieldErrors, setFieldErrors] = useState({});
  // File-level error state keyed by fileId (e.g. "entityFileInput", "gstFileInput")
  const [fileErrors, setFileErrors] = useState({});
  // ─────────────────────────────────────────────────────────

  const [viewingDocUrl, setViewingDocUrl] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(true);

  const [isEditMode, setIsEditMode] = useState(false);
  const [existingData, setExistingData] = useState(null);
  const [isFetchingOldData, setIsFetchingOldData] = useState(false);

  // Dynamic User Types State
  const [userTypes, setUserTypes] = useState([]);
  const [selectedUserTypeId, setSelectedUserTypeId] = useState("");

  // Captcha State
  const [captchaQuestion, setCaptchaQuestion] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaInput, setCaptchaInput] = useState("");
  const [captchaError, setCaptchaError] = useState("");

  // Controlled state for fields that need live validation
  // (uncontrolled fields in the form use defaultValue, so we read from event)
  const [fieldValues, setFieldValues] = useState({
    mobileNo: "",
    email: "",
    entityName: "",
    licenseNumber: "",
    isLifetimeLicense: false,
    licenseValidityDate: "",
    addressLine: "",
    pincode: "",
    gstinNumber: "",
    panNumber: "",
    tanNumber: "",
    firstName: "",
    lastName: "",
    contactMobile: "",
    contactEmail: "",
  });

  // --- Address information states ---
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [selectedCountryId, setSelectedCountryId] = useState("");
  const [selectedStateId, setSelectedStateId] = useState("");
  const [selectedCountryName, setSelectedCountryName] = useState("");
  const [selectedStateName, setSelectedStateName] = useState("");
  const [selectedCityName, setSelectedCityName] = useState("");
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);

  const fetchCountries = async () => {
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_AGENT_API}/pass-request/get-countries`);
      if (res.data && res.data.success) {
        const countriesList = res.data.data || [];
        setCountries(countriesList);

        // If in new mode (not edit mode) and we haven't selected a country, default to "India"
        if (!editRef && !selectedCountryName) {
          const indiaObj = countriesList.find(c => c.name.toLowerCase() === "india");
          if (indiaObj) {
            setSelectedCountryName(indiaObj.name);
            setSelectedCountryId(indiaObj.id);
            // Fetch states for India
            fetchStates(indiaObj.id);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching countries:", error);
    }
  };

  const fetchStates = async (countryId) => {
    setLoadingStates(true);
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_AGENT_API}/pass-request/get-states`, {
        params: { countryId }
      });
      if (res.data && res.data.success) {
        const statesList = res.data.data || [];
        setStates(statesList);

        // If in new mode (not edit mode) and we haven't selected a state yet, default to "Tamil Nadu"
        if (!editRef && !selectedStateName) {
          const tnObj = statesList.find(s => s.name.toLowerCase() === "tamil nadu");
          if (tnObj) {
            setSelectedStateName(tnObj.name);
            setSelectedStateId(tnObj.id);
            fetchCities(tnObj.id);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching states:", error);
    } finally {
      setLoadingStates(false);
    }
  };

  const fetchCities = async (stateId) => {
    setLoadingCities(true);
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_AGENT_API}/pass-request/get-cities`, {
        params: { stateId }
      });
      if (res.data && res.data.success) {
        setCities(res.data.data || []);
      }
    } catch (error) {
      console.error("Error fetching cities:", error);
    } finally {
      setLoadingCities(false);
    }
  };

  const handleCountryChange = (countryName) => {
    setSelectedCountryName(countryName);
    setSelectedStateName("");
    setSelectedCityName("");
    setStates([]);
    setCities([]);

    const countryObj = countries.find(c => c.name === countryName);
    if (countryObj) {
      setSelectedCountryId(countryObj.id);
      fetchStates(countryObj.id);
    } else {
      setSelectedCountryId("");
    }
  };

  const handleStateChange = (stateName) => {
    setSelectedStateName(stateName);
    setSelectedCityName("");
    setCities([]);

    const stateObj = states.find(s => s.name === stateName);
    if (stateObj) {
      setSelectedStateId(stateObj.id);
      fetchCities(stateObj.id);
    } else {
      setSelectedStateId("");
    }
  };

  useEffect(() => {
    const loadCountryDetails = async () => {
      if (!existingData || countries.length === 0) return;

      const countryObj = countries.find(c => c.name === existingData.country);
      if (countryObj) {
        setSelectedCountryId(countryObj.id);
        setSelectedCountryName(countryObj.name);
        setLoadingStates(true);
        try {
          const stateRes = await axios.get(`${process.env.NEXT_PUBLIC_AGENT_API}/pass-request/get-states`, {
            params: { countryId: countryObj.id }
          });
          if (stateRes.data && stateRes.data.success) {
            const statesList = stateRes.data.data || [];
            setStates(statesList);

            const stateObj = statesList.find(s => s.name === existingData.state);
            if (stateObj) {
              setSelectedStateId(stateObj.id);
              setSelectedStateName(stateObj.name);
              setLoadingCities(true);
              const cityRes = await axios.get(`${process.env.NEXT_PUBLIC_AGENT_API}/pass-request/get-cities`, {
                params: { stateId: stateObj.id }
              });
              if (cityRes.data && cityRes.data.success) {
                setCities(cityRes.data.data || []);
                setSelectedCityName(existingData.city || "");
              }
            }
          }
        } catch (err) {
          console.error("Error loading states/cities in edit mode:", err);
        } finally {
          setLoadingStates(false);
          setLoadingCities(false);
        }
      }
    };
    loadCountryDetails();
  }, [existingData, countries]);

  const rafRef = useRef(null);

  const handleMouseMove = useCallback((e) => {
    // Throttle via requestAnimationFrame — fires at most once per frame (~16ms)
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      const x = (e.clientX - window.innerWidth / 2) / 50;
      const y = (e.clientY - window.innerHeight / 2) / 50;
      setMousePos({ x, y });
      rafRef.current = null;
    });
  }, []);

  // Validate a single field and update fieldErrors state
  const validateField = (field, value) => {
    const err = getFieldError(field, value);
    setFieldErrors((prev) => ({ ...prev, [field]: err }));
    return !err;
  };

  // Handle controlled field changes with live validation
  const handleFieldChange = (field, value) => {
    setFieldValues((prev) => ({ ...prev, [field]: value }));
    if (value) validateField(field, value); // validate while typing (only if non-empty)
  };

  // Handle file upload with PDF validation
  const handleFileChange = (fileKey, file, onValidCb) => {
    const err = validatePdfFile(file);
    setFileErrors((prev) => ({ ...prev, [fileKey]: err }));
    if (!err && file) {
      onValidCb(file.name); // callback to set the display filename
    } else if (err) {
      onValidCb(""); // clear filename on error
      // Reset the actual input so user can re-select
      const inputEl = document.getElementById(fileKey);
      if (inputEl) inputEl.value = "";
    }
  };

  // Fetch User Types and Captcha from API
  const fetchInitialData = async () => {
    try {
      const url = `${process.env.NEXT_PUBLIC_AGENT_API}/user-types/getUserTypes`;
      const response = await axios.get(url, { withCredentials: true });
      const data = response.data;

      if (data.success) {
        setUserTypes(data.userTypes);
        setCaptchaQuestion(data.captchaQuestion);
        setCaptchaToken(data.captchaToken);
        setCaptchaInput("");
        setCaptchaError("");
      }
    } catch (error) {
      console.error("Error fetching initial data:", error);
    }
  };



  useEffect(() => {
    const fetchExistingApplication = async () => {
      if (!editRef) return;

      setIsFetchingOldData(true);
      try {
        const token = localStorage.getItem("accessToken");

        // Pass token and trim the reference number
        const res = await axios.get(
          `${process.env.NEXT_PUBLIC_AGENT_API}/agents/getTrackRequest`,
          {
            params: { referenceNumber: editRef.trim() },
            headers: {
              Authorization: token ? `Bearer ${token}` : "",
            },
            withCredentials: true,
          },
        );

        console.log("BACKEND FETCH RESPONSE:", res.data);

        if (res.data.success && res.data.data) {
          const data = res.data.data;
          setExistingData(data);
          setIsEditMode(true);

          if (data.userTypeId) setSelectedUserTypeId(data.userTypeId);

          // 🚀 FIX: Tell the UI that files exist in the database
          if (data.entityFile)
            setEntityFileName("Previously Uploaded Document.pdf");
          if (data.requisitionLetter)
            setRequisitionLetterFileName("Previously Uploaded Document.pdf");
          if (data.workOrder)
            setWorkOrderFileName("Previously Uploaded Document.pdf");
          if (data.licenseDoc)
            setLicenseDocFileName("Previously Uploaded Document.pdf");

          setTableFiles({
            gstinDoc: data.gstinDoc ? "Previously Uploaded Document.pdf" : "",
            panDoc: data.panDoc ? "Previously Uploaded Document.pdf" : "",
            tanDoc: data.tanDoc ? "Previously Uploaded Document.pdf" : "",
          });

          // Pre-populate controlled field values so validation works in edit mode
          setFieldValues({
            mobileNo: data.mobileNo || "",
            email: data.email || "",
            entityName: data.entityName || "",
            licenseNumber: data.licenseNumber || "",
            licenseValidityDate: data.licenseValidityDate || "",
            addressLine: data.addressLine || "",
            pincode: data.pincode || "",
            gstinNumber: data.gstinNumber || "",
            panNumber: data.panNumber || "",
            tanNumber: data.tanNumber || "",
            firstName: data.firstName || "",
            lastName: data.lastName || "",
            contactMobile: data.contactMobile || "",
            contactEmail: data.contactEmail || "",
          });
        } else {
          throw new Error("Backend returned success: false or empty data.");
        }
      } catch (err) {
        console.error("Failed to load existing data", err);
        toast.error("Could not load your previous application data.");
      } finally {
        setIsFetchingOldData(false);
      }
    };

    if (editRef) {
      fetchExistingApplication();
    }
  }, [editRef]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchInitialData();
    fetchCountries();
  }, []);

  // Legacy validateFile kept for backward compat (now only used as a passthrough)
  // Real validation is handled by handleFileChange above
  const validateFile = (file, setFileName, inputRef) => {
    const maxSize = 1 * 1024 * 1024; // 1MB
    if (!file) return false;

    if (file.size > maxSize) {
      alert("File must be less than 1MB");
      inputRef.value = "";
      setFileName("");
      return false;
    }

    if (file.type !== "application/pdf") {
      alert("Only PDF files are allowed");
      inputRef.value = "";
      setFileName("");
      return false;
    }

    setFileName(file.name);
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isSubmitting) return;

    // ── Run all field validations before submitting ──
    const errors = {};
    const fieldsToValidate = [
      "mobileNo",
      "email",
      "entityName",
      "addressLine",
      "pincode",
      "gstinNumber",
      "panNumber",
      "firstName",
      "lastName",
      "contactMobile",
      "contactEmail",
    ];
    if (fieldValues.tanNumber) {
      fieldsToValidate.push("tanNumber");
    }

    fieldsToValidate.forEach((field) => {
      if (fieldValues[field]) {
        const err = getFieldError(field, fieldValues[field]);
        if (err) errors[field] = err;
      }
    });

    // Captcha check
    if (!captchaInput.trim()) {
      setCaptchaError("Please enter the security code");
      errors._captcha = true;
    } else {
      setCaptchaError("");
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      toast.error("Please fix the highlighted errors before submitting.");
      return;
    }
    // ────────────────────────────────────────────────

    setIsSubmitting(true);

    const formData = new FormData();
    const formElements = e.target.elements;

    const selectedTypeObj = userTypes.find(
      (type) => type.id.toString() === selectedUserTypeId.toString(),
    );
    const userTypeName = selectedTypeObj
      ? selectedTypeObj.name
      : selectedUserTypeId;

    // 1. Append Text Fields FIRST
    formData.append("userTypeName", userTypeName || "");
    formData.append("userTypeId", selectedUserTypeId || "");
    formData.append("mobileNo", formElements.mobileNo.value || "");
    formData.append("entityName", formElements.entityName.value || "");
    formData.append("email", formElements.email.value || "");
    formData.append("licenseNumber", fieldValues.licenseNumber || "");
    formData.append("isLifetimeLicense", fieldValues.isLifetimeLicense ? "true" : "false");
    formData.append("licenseValidityDate", fieldValues.isLifetimeLicense ? "" : (fieldValues.licenseValidityDate || ""));

    formData.append("addressLine", formElements.addressLine.value || "");
    formData.append("city", formElements.city.value || "");
    formData.append("state", formElements.state.value || "");
    formData.append("pincode", formElements.pincode.value || "");
    formData.append("country", formElements.country.value || "");

    formData.append("gstinNumber", formElements.gstinNumber.value || "");
    formData.append("panNumber", formElements.panNumber.value || "");
    formData.append("tanNumber", formElements.tanNumber.value || "");

    formData.append("remark", formElements.remark?.value || "");

    formData.append("title", formElements.title.value || "");
    formData.append("firstName", formElements.firstName.value || "");
    formData.append("lastName", formElements.lastName.value || "");
    formData.append("contactMobile", formElements.contactMobile.value || "");
    formData.append("contactEmail", formElements.contactEmail.value || "");

    formData.append(
      "termsAccepted",
      formElements.termsAccepted.checked ? "true" : "false",
    );

    formData.append("captchaValue", captchaInput || "");
    formData.append("captchaToken", captchaToken || "");

    // 🚀 CRITICAL: Append referenceNumber for updates
    if (isEditMode && editRef) {
      formData.append("referenceNumber", editRef.trim());
    }

    // 2. Append File Fields
    const entityFile = document.getElementById("entityFileInput")?.files[0];
    const requisitionLetterFile = document.getElementById("requisitionLetterFileInput")?.files[0];
    const workOrderFile = document.getElementById("workOrderFileInput")?.files[0];
    const licenseDocFile = document.getElementById("licenseDocFileInput")?.files[0];
    const gstFile = document.getElementById("gstFileInput")?.files[0];
    const panFile = document.getElementById("panFileInput")?.files[0];
    const tanFile = document.getElementById("tanFileInput")?.files[0];

    if (entityFile) formData.append("entityFile", entityFile);
    if (requisitionLetterFile) formData.append("requisitionLetter", requisitionLetterFile);
    if (workOrderFile) formData.append("workOrder", workOrderFile);
    if (licenseDocFile) formData.append("licenseDoc", licenseDocFile);
    if (gstFile) formData.append("gstinDoc", gstFile);
    if (panFile) formData.append("panDoc", panFile);
    if (tanFile) formData.append("tanDoc", tanFile);

    try {
      const token = localStorage.getItem("accessToken");

      // Set the dynamic endpoint based on mode
      const apiUrl = isEditMode
        ? `${process.env.NEXT_PUBLIC_AGENT_API}/agents/updateAgentByRevert`
        : `${process.env.NEXT_PUBLIC_AGENT_API}/agents/registerAgent`;

      const apiMethod = isEditMode ? "put" : "post";

      const response = await axios({
        method: apiMethod,
        url: apiUrl,
        data: formData,
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: token ? `Bearer ${token}` : "",
        },
        withCredentials: true,
      });

      const data = response.data;

      setReferenceNo(data.data?.referenceNumber || editRef || "CHPT103152");
      window.scrollTo({ top: 0, behavior: "smooth" });
      setIsSubmitted(true);

      toast.success(
        isEditMode
          ? "Application Updated Successfully!"
          : "Registration Submitted!",
      );
    } catch (error) {
      console.error("Error submitting form:", error);

      if (error.response && error.response.data) {
        toast.error(`Action Failed: ${error.response.data.message}`);
      } else {
        toast.error(
          "Network error occurred. Ensure your backend server is running.",
        );
      }

      fetchInitialData();
    } finally {
      setIsSubmitting(false);
    }
  };



  // Determine if the selected user type is a Transport category (case-insensitive)
  // Covers: Truck owners, Trailer operators, Container transport companies,
  //         Logistics service providers, Fleet operators, Lorry owners, Transport contractors
  const TRANSPORT_KEYWORDS = [
    "transport", "truck", "trailer", "logistics",
    "fleet", "lorry", "carrier", "haulage",
  ];
  const selectedTypeObj = userTypes.find(
    (type) => type.id.toString() === selectedUserTypeId.toString(),
  );
  const selectedTypeName = (selectedTypeObj?.type_name || selectedTypeObj?.name || "").toLowerCase();
  const isTransportUser = TRANSPORT_KEYWORDS.some((kw) => selectedTypeName.includes(kw));
  const isGovtUser = selectedTypeName.includes("govt") || selectedTypeName.includes("government");

  // Placeholder for identificationTypes
  const identificationTypes = useMemo(() => [
    {
      label: "GST",
      numName: "gstinNumber",
      fileName: "gstinDoc",
      fileId: "gstFileInput",
      req: !isTransportUser && !isGovtUser, // optional for Transport and Govt users
      docType: "gst",
    },
    {
      label: "PAN",
      numName: "panNumber",
      fileName: "panDoc",
      fileId: "panFileInput",
      req: !isGovtUser, // optional for Govt users
      docType: "pan",
    },
    {
      label: "TAN",
      numName: "tanNumber",
      fileName: "tanDoc",
      fileId: "tanFileInput",
      req: false,
      docType: "tan",
    },
  ], [isTransportUser, isGovtUser]);

  // Shared input class helper
  const inputCls = (field) =>
    `w-full h-12 px-4 bg-stone-50 border focus:bg-white text-gray-900 placeholder-stone-400 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 rounded-xl transition-all duration-200 ${fieldErrors[field]
      ? "border-red-400 focus:ring-red-500/20 focus:border-red-500 bg-red-50"
      : "border-stone-200"
    }`;

  const documentUploadLabel = selectedTypeObj
    ? selectedTypeObj.document_instruction
    : "Upload Required Document";

  return (
    <ErrorContext.Provider value={{ fieldErrors, fileErrors }}>
      <div
        onMouseMove={handleMouseMove}
        className="min-h-screen relative bg-zinc-950 overflow-x-hidden flex flex-col"
      >
        <div
          className="fixed inset-0 z-0 bg-cover bg-center transition-transform duration-500 ease-out pointer-events-none"
          style={{
            backgroundImage: "url('/port-bg.jpg')",
            transform: `scale(1.1) translate(${-mousePos.x}px, ${-mousePos.y}px)`,
            filter: "brightness(0.4)",
          }}
        />

        <div className="relative z-10 flex-grow w-full">
          <nav className="w-full max-w-6xl mx-auto px-6 py-6 flex justify-between items-center animate-in fade-in duration-700">
            <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/20">
              <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                <Ship className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white leading-none">
                  APACS
                </h1>
              </div>
            </div>
            <Link
              href="/"
              className="flex items-center gap-2 text-white hover:text-orange-400 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-200 font-medium bg-white/10 px-4 py-2 rounded-xl backdrop-blur-md border border-white/20 focus:outline-none focus:ring-2 focus:ring-white/20"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Login
            </Link>
          </nav>

          <main className="max-w-5xl mx-auto px-4 pb-20 pt-4 animate-in slide-in-from-bottom-8 duration-700">
            <div className="bg-white/95 backdrop-blur-xl rounded-2xl sm:rounded-[2.5rem] shadow-2xl border border-white/40 overflow-hidden">
              {!isSubmitted ? (
                <div className="p-4 sm:p-8 md:p-12">
                  <div className="mb-10 text-center max-w-2xl mx-auto">
                    <h2 className="text-4xl font-bold text-slate-900 mb-3">
                      User Registration
                    </h2>
                    <p className="text-slate-500">
                      Register your organization to access the Harbor Entry Permit
                      System.
                    </p>
                  </div>

                  {isFetchingOldData && (
                    <div className="flex flex-col items-center justify-center py-20">
                      <Loader2 className="h-12 w-12 text-orange-600 animate-spin mb-4" />
                      <p className="text-slate-600 font-bold">
                        Loading your previous application...
                      </p>
                    </div>
                  )}

                  {/* The Form - Only render if not fetching old data */}
                  {!isFetchingOldData && (
                    <form
                      key={existingData ? "edit-mode" : "new-mode"}
                      onSubmit={handleSubmit}
                      className="space-y-10"
                    >
                      {" "}
                      {/* REVERT REASON BANNER */}
                      {isEditMode && existingData?.rejectedReason && (
                        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6 flex gap-4 items-start shadow-sm">
                          <ShieldCheck className="h-6 w-6 text-amber-600 shrink-0" />
                          <div>
                            <h4 className="text-amber-900 font-bold text-sm uppercase tracking-wider mb-1">
                              Application Reverted - Action Required
                            </h4>
                            <p className="text-amber-700 text-sm">
                              {existingData.rejectedReason}
                            </p>
                          </div>
                        </div>
                      )}
                      {/* ── GENERAL INFORMATION ── */}
                      <div className="bg-orange-50/30 p-4 sm:p-8 rounded-2xl sm:rounded-3xl border border-orange-100/50">
                        <SectionHeader
                          icon={Building2}
                          title="General Information"
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* User Type */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider ml-1">
                              User Type <span className="text-red-500">*</span>
                            </label>
                            <select
                              name="userType"
                              value={selectedUserTypeId}
                              onChange={(e) =>
                                setSelectedUserTypeId(e.target.value)
                              }
                              className="w-full h-12 px-4 bg-stone-50 border border-stone-200 focus:bg-white text-gray-900 focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 rounded-xl transition-all duration-200 focus:outline-none cursor-pointer"
                              required
                            >
                              <option value="">-- Select User Type --</option>
                              {userTypes.map((type) => (
                                <option key={type.id} value={type.id}>
                                  {type.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Mobile No. */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider ml-1">
                              Mobile No. <span className="text-red-500">*</span>
                            </label>
                            <input
                              name="mobileNo"
                              type="text"
                              value={fieldValues.mobileNo}
                              inputMode="numeric"
                              maxLength={10}
                              title="Enter 10 digit mobile number"
                              placeholder="Enter 10-digit mobile number"
                              className={inputCls("mobileNo")}
                              onChange={(e) => {
                                const val = e.target.value
                                  .replace(/\D/g, "")
                                  .slice(0, 10);
                                handleFieldChange("mobileNo", val);
                              }}
                              onBlur={(e) =>
                                validateField("mobileNo", e.target.value)
                              }
                              required
                            />
                            <FieldError field="mobileNo" />
                          </div>

                          {/* Entity Name */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider ml-1">
                              Name of the Firm{" "}
                              <span className="text-red-500">*</span>
                            </label>
                            <input
                              name="entityName"
                              type="text"
                              value={fieldValues.entityName}
                              placeholder="Enter organization name"
                              className={inputCls("entityName")}
                              onChange={(e) =>
                                handleFieldChange("entityName", e.target.value.toUpperCase())
                              }
                              onBlur={(e) =>
                                validateField("entityName", e.target.value)
                              }
                              required
                            />
                            <FieldError field="entityName" />
                          </div>

                          {/* License Number */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider ml-1">
                              License Number{" "}
                              {!isTransportUser && !isGovtUser && <span className="text-red-500">*</span>}
                            </label>
                            <input
                              name="licenseNumber"
                              type="text"
                              value={fieldValues.licenseNumber}
                              placeholder="Enter license number"
                              className={inputCls("licenseNumber")}
                              onChange={(e) =>
                                handleFieldChange("licenseNumber", e.target.value.toUpperCase())
                              }
                              onBlur={(e) =>
                                validateField("licenseNumber", e.target.value)
                              }
                              required={!isTransportUser && !isGovtUser}
                            />
                            <FieldError field="licenseNumber" />
                          </div>

                          {/* License Validity Type Toggle */}
                          <div className="space-y-1.5 col-span-full">
                            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider ml-1">
                              License Validity Type
                            </label>
                            <div className="flex items-center gap-6 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-stone-300">
                                <input
                                  type="radio"
                                  name="isLifetimeLicense"
                                  checked={!fieldValues.isLifetimeLicense}
                                  onChange={() => {
                                    handleFieldChange("isLifetimeLicense", false);
                                  }}
                                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                                />
                                Specify Validity Expiry Date
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-stone-300">
                                <input
                                  type="radio"
                                  name="isLifetimeLicense"
                                  checked={Boolean(fieldValues.isLifetimeLicense)}
                                  onChange={() => {
                                    handleFieldChange("isLifetimeLicense", true);
                                    handleFieldChange("licenseValidityDate", "");
                                  }}
                                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                                />
                                Lifetime Validity (No Expiry)
                              </label>
                            </div>
                          </div>

                          {/* License Validity Date (Only if not Lifetime) */}
                          {!fieldValues.isLifetimeLicense && (
                            <div className="space-y-1.5">
                              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider ml-1">
                                License Validity Date{" "}
                                {!isTransportUser && !isGovtUser && <span className="text-red-500">*</span>}
                              </label>
                              <div className="relative flex items-center">
                                <input
                                  name="licenseValidityDate"
                                  type="text"
                                  placeholder="DD/MM/YYYY"
                                  maxLength={10}
                                  value={formatISOToDDMMYYYY(fieldValues.licenseValidityDate)}
                                  className={`${inputCls("licenseValidityDate")} pr-10`}
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
                                    handleFieldChange("licenseValidityDate", val);
                                  }}
                                  onBlur={(e) =>
                                    validateField("licenseValidityDate", fieldValues.licenseValidityDate)
                                  }
                                  required={!isTransportUser && !isGovtUser}
                                />
                                <div className="absolute right-2 flex items-center">
                                  <input
                                    type="date"
                                    id="reg-lic-hidden-picker"
                                    tabIndex={-1}
                                    value={
                                      fieldValues.licenseValidityDate && fieldValues.licenseValidityDate.includes("-")
                                        ? fieldValues.licenseValidityDate
                                        : formatDDMMYYYYToISO(fieldValues.licenseValidityDate)
                                    }
                                    onChange={(e) => {
                                      if (e.target.value) {
                                        handleFieldChange("licenseValidityDate", e.target.value);
                                        validateField("licenseValidityDate", e.target.value);
                                      }
                                    }}
                                    className="sr-only"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const picker = document.getElementById("reg-lic-hidden-picker");
                                      if (picker && typeof picker.showPicker === "function") {
                                        picker.showPicker();
                                      } else if (picker) {
                                        picker.focus();
                                        picker.click();
                                      }
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                                    title="Choose License Validity Date"
                                  >
                                    <Calendar className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                              <FieldError field="licenseValidityDate" />
                              {fieldValues.licenseValidityDate && (() => {
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                const selected = new Date(fieldValues.licenseValidityDate);
                                return selected < today ? (
                                  <p className="text-xs text-red-600 font-semibold mt-1 flex items-center gap-1 bg-red-50 px-2 py-1 rounded border border-red-200">
                                    ⚠️ This license has expired. Your request may be reverted if the validity date does not match the submitted document.
                                  </p>
                                ) : null;
                              })()}
                            </div>
                          )}

                          {/* Entity Email */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider ml-1">
                              Entity Email <span className="text-red-500">*</span>
                            </label>
                            <input
                              name="email"
                              type="email"
                              value={fieldValues.email}
                              placeholder="official@example.com"
                              className={inputCls("email")}
                              onChange={(e) =>
                                handleFieldChange("email", e.target.value)
                              }
                              onBlur={(e) =>
                                validateField("email", e.target.value)
                              }
                              required
                            />
                            <FieldError field="email" />
                          </div>


                          {/* Requisition Letter Upload */}
                          <div className="md:col-span-1 space-y-1.5 mt-2">
                            <label className="text-xs font-semibold text-orange-700 uppercase tracking-wider ml-1 bg-orange-100 px-3 py-1 rounded-full">
                              Requisition Letter {!isGovtUser && <span className="text-red-500">*</span>}
                            </label>

                            <div className="flex flex-col gap-2 w-full mt-3">
                              {/* Top Row: Status & View Action */}
                              {isEditMode && existingData?.requisitionLetter && (
                                <div className="flex items-center justify-between bg-slate-50 border border-slate-200 p-2.5 rounded-lg w-full">
                                  <div className="flex items-center gap-2 px-1">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                    <span className="text-xs font-bold text-slate-600">
                                      PREVIOUSLY UPLOADED
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      setIframeLoading(true);
                                      setViewingDocUrl(
                                        `${process.env.NEXT_PUBLIC_AGENT_API}/agents/viewAgentDocument?referenceNumber=${editRef}&documentType=requisitionLetter`,
                                      );
                                    }}
                                    className="flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:text-blue-800 bg-blue-100/50 hover:bg-blue-100 px-3 py-1.5 rounded-md transition-colors shadow-sm border border-blue-200/50"
                                  >
                                    <Eye className="h-4 w-4" /> View Document
                                  </button>
                                </div>
                              )}

                              {/* File Input */}
                              <label
                                className={`cursor-pointer bg-white border hover:border-orange-500 hover:bg-orange-50 px-4 py-6 rounded-xl text-sm font-bold transition-all shadow-sm flex flex-col items-center justify-center gap-2 w-full text-center ${fileErrors["requisitionLetterFileInput"]
                                  ? "border-red-400 bg-red-50"
                                  : isEditMode && existingData?.requisitionLetter
                                    ? "border-orange-300 text-orange-700"
                                    : "border-slate-300 text-slate-600 border-dashed border-2"
                                  }`}
                              >
                                <div className="flex items-center gap-2">
                                  <UploadCloud className="h-6 w-6" />
                                  {isEditMode && existingData?.requisitionLetter
                                    ? "Replace File"
                                    : "Click to upload or drag and drop"}
                                </div>
                                <span className="text-[11px] font-normal text-slate-400">
                                  PDF only · Max 1 MB
                                </span>

                                {requisitionLetterFileName && (
                                  <span className="text-emerald-600 text-xs truncate max-w-sm mt-1 bg-emerald-50 px-2 py-1 rounded border border-emerald-100">
                                    {requisitionLetterFileName}
                                  </span>
                                )}

                                <input
                                  id="requisitionLetterFileInput"
                                  name="requisitionLetter"
                                  type="file"
                                  accept="application/pdf"
                                  className="absolute opacity-0 w-px h-px pointer-events-none"
                                  required={!isEditMode && !isGovtUser}
                                  onChange={(e) => {
                                    const file = e.target.files[0];
                                    handleFileChange(
                                      "requisitionLetterFileInput",
                                      file,
                                      (name) => setRequisitionLetterFileName(name),
                                    );
                                  }}
                                />
                              </label>
                              <FileError fileKey="requisitionLetterFileInput" />
                            </div>
                          </div>

                          {/* Work Order Upload */}
                          <div className="md:col-span-1 space-y-1.5 mt-2">
                            <label className="text-xs font-semibold text-orange-700 uppercase tracking-wider ml-1 bg-orange-100 px-3 py-1 rounded-full">
                              Work Order {!isTransportUser && !isGovtUser && <span className="text-red-500">*</span>}
                            </label>

                            <div className="flex flex-col gap-2 w-full mt-3">
                              {/* Top Row: Status & View Action */}
                              {isEditMode && existingData?.workOrder && (
                                <div className="flex items-center justify-between bg-slate-50 border border-slate-200 p-2.5 rounded-lg w-full">
                                  <div className="flex items-center gap-2 px-1">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                    <span className="text-xs font-bold text-slate-600">
                                      PREVIOUSLY UPLOADED
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      setIframeLoading(true);
                                      setViewingDocUrl(
                                        `${process.env.NEXT_PUBLIC_AGENT_API}/agents/viewAgentDocument?referenceNumber=${editRef}&documentType=workOrder`,
                                      );
                                    }}
                                    className="flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:text-blue-800 bg-blue-100/50 hover:bg-blue-100 px-3 py-1.5 rounded-md transition-colors shadow-sm border border-blue-200/50"
                                  >
                                    <Eye className="h-4 w-4" /> View Document
                                  </button>
                                </div>
                              )}

                              {/* File Input */}
                              <label
                                className={`cursor-pointer bg-white border hover:border-orange-500 hover:bg-orange-50 px-4 py-6 rounded-xl text-sm font-bold transition-all shadow-sm flex flex-col items-center justify-center gap-2 w-full text-center ${fileErrors["workOrderFileInput"]
                                  ? "border-red-400 bg-red-50"
                                  : isEditMode && existingData?.workOrder
                                    ? "border-orange-300 text-orange-700"
                                    : "border-slate-300 text-slate-600 border-dashed border-2"
                                  }`}
                              >
                                <div className="flex items-center gap-2">
                                  <UploadCloud className="h-6 w-6" />
                                  {isEditMode && existingData?.workOrder
                                    ? "Replace File"
                                    : "Click to upload or drag and drop"}
                                </div>
                                <span className="text-[11px] font-normal text-slate-400">
                                  PDF only · Max 1 MB
                                </span>

                                {workOrderFileName && (
                                  <span className="text-emerald-600 text-xs truncate max-w-sm mt-1 bg-emerald-50 px-2 py-1 rounded border border-emerald-100">
                                    {workOrderFileName}
                                  </span>
                                )}

                                <input
                                  id="workOrderFileInput"
                                  name="workOrder"
                                  type="file"
                                  accept="application/pdf"
                                  className="absolute opacity-0 w-px h-px pointer-events-none"
                                  required={!isEditMode && !isTransportUser && !isGovtUser}
                                  onChange={(e) => {
                                    const file = e.target.files[0];
                                    handleFileChange(
                                      "workOrderFileInput",
                                      file,
                                      (name) => setWorkOrderFileName(name),
                                    );
                                  }}
                                />
                              </label>
                              <FileError fileKey="workOrderFileInput" />
                            </div>
                          </div>

                          {/* License Copy Upload */}
                          <div className="md:col-span-1 space-y-1.5 mt-2">
                            <label className="text-xs font-semibold text-orange-700 uppercase tracking-wider ml-1 bg-orange-100 px-3 py-1 rounded-full">
                              License Copy {!isTransportUser && !isGovtUser && <span className="text-red-500">*</span>}
                            </label>

                            <div className="flex flex-col gap-2 w-full mt-3">
                              {/* Top Row: Status & View Action */}
                              {isEditMode && existingData?.licenseDoc && (
                                <div className="flex items-center justify-between bg-slate-50 border border-slate-200 p-2.5 rounded-lg w-full">
                                  <div className="flex items-center gap-2 px-1">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                    <span className="text-xs font-bold text-slate-600">
                                      PREVIOUSLY UPLOADED
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      setIframeLoading(true);
                                      setViewingDocUrl(
                                        `${process.env.NEXT_PUBLIC_AGENT_API}/agents/viewAgentDocument?referenceNumber=${editRef}&documentType=licenseDoc`,
                                      );
                                    }}
                                    className="flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:text-blue-800 bg-blue-100/50 hover:bg-blue-100 px-3 py-1.5 rounded-md transition-colors shadow-sm border border-blue-200/50"
                                  >
                                    <Eye className="h-4 w-4" /> View Document
                                  </button>
                                </div>
                              )}

                              {/* File Input */}
                              <label
                                className={`cursor-pointer bg-white border hover:border-orange-500 hover:bg-orange-50 px-4 py-6 rounded-xl text-sm font-bold transition-all shadow-sm flex flex-col items-center justify-center gap-2 w-full text-center ${fileErrors["licenseDocFileInput"]
                                  ? "border-red-400 bg-red-50"
                                  : isEditMode && existingData?.licenseDoc
                                    ? "border-orange-300 text-orange-700"
                                    : "border-slate-300 text-slate-600 border-dashed border-2"
                                  }`}
                              >
                                <div className="flex items-center gap-2">
                                  <UploadCloud className="h-6 w-6" />
                                  {isEditMode && existingData?.licenseDoc
                                    ? "Replace File"
                                    : "Click to upload or drag and drop"}
                                </div>
                                <span className="text-[11px] font-normal text-slate-400">
                                  PDF only · Max 1 MB
                                </span>

                                {licenseDocFileName && (
                                  <span className="text-emerald-600 text-xs truncate max-w-sm mt-1 bg-emerald-50 px-2 py-1 rounded border border-emerald-100">
                                    {licenseDocFileName}
                                  </span>
                                )}

                                <input
                                  id="licenseDocFileInput"
                                  name="licenseDoc"
                                  type="file"
                                  accept="application/pdf"
                                  className="absolute opacity-0 w-px h-px pointer-events-none"
                                  required={!isEditMode && !isTransportUser && !isGovtUser}
                                  onChange={(e) => {
                                    const file = e.target.files[0];
                                    handleFileChange(
                                      "licenseDocFileInput",
                                      file,
                                      (name) => setLicenseDocFileName(name),
                                    );
                                  }}
                                />
                              </label>
                              <FileError fileKey="licenseDocFileInput" />
                            </div>
                          </div>
                        </div>
                      </div>
                      {/* ── ADDRESS INFORMATION ── */}
                      <div className="bg-orange-50/30 p-4 sm:p-8 rounded-2xl sm:rounded-3xl border border-orange-100/50">
                        <SectionHeader
                          icon={MapPin}
                          title="Address Information"
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="md:col-span-2 space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider ml-1">
                              Full Address <span className="text-red-500">*</span>
                            </label>
                            <textarea
                              name="addressLine"
                              rows="2"
                              value={fieldValues.addressLine}
                              placeholder="Enter complete address"
                              className={`w-full p-4 bg-stone-50 border focus:bg-white text-gray-900 placeholder-stone-400 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 rounded-xl transition-all duration-200 focus:outline-none ${fieldErrors.addressLine
                                ? "border-red-400 focus:ring-red-500/20 focus:border-red-500 bg-red-50"
                                : "border-stone-200"
                                }`}
                              onChange={(e) =>
                                handleFieldChange("addressLine", e.target.value)
                              }
                              onBlur={(e) =>
                                validateField("addressLine", e.target.value)
                              }
                              required
                            ></textarea>
                            <FieldError field="addressLine" />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider ml-1">
                              Country <span className="text-red-500">*</span>
                            </label>
                            <select
                              name="country"
                              value={selectedCountryName}
                              onChange={(e) => handleCountryChange(e.target.value)}
                              className="w-full h-12 px-4 bg-stone-50 border border-stone-200 focus:bg-white text-gray-900 focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 rounded-xl transition-all duration-200 focus:outline-none cursor-pointer"
                              required
                            >
                              <option value="">-- Select Country --</option>
                              {countries.map((c) => (
                                <option key={c.id} value={c.name}>
                                  {c.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider ml-1">
                              State <span className="text-red-500">*</span>
                            </label>
                            <select
                              name="state"
                              value={selectedStateName}
                              onChange={(e) => handleStateChange(e.target.value)}
                              disabled={!!(loadingStates || !selectedCountryId)}
                              className="w-full h-12 px-4 bg-stone-50 border border-stone-200 focus:bg-white text-gray-900 focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 rounded-xl transition-all duration-200 focus:outline-none cursor-pointer disabled:opacity-50"
                              required
                            >
                              <option value="">
                                {loadingStates ? "Loading States..." : "-- Select State --"}
                              </option>
                              {states.map((s) => (
                                <option key={s.id} value={s.name}>
                                  {s.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider ml-1">
                              City <span className="text-red-500">*</span>
                            </label>
                            <select
                              name="city"
                              value={selectedCityName}
                              onChange={(e) => setSelectedCityName(e.target.value)}
                              disabled={!!(loadingCities || !selectedStateId)}
                              className="w-full h-12 px-4 bg-stone-50 border border-stone-200 focus:bg-white text-gray-900 focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 rounded-xl transition-all duration-200 focus:outline-none cursor-pointer disabled:opacity-50"
                              required
                            >
                              <option value="">
                                {loadingCities ? "Loading Cities..." : "-- Select City --"}
                              </option>
                              {cities.map((ct) => (
                                <option key={ct.id} value={ct.name}>
                                  {ct.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider ml-1">
                              Pin Code <span className="text-red-500">*</span>
                            </label>
                            <input
                              name="pincode"
                              type="text"
                              value={fieldValues.pincode}
                              inputMode="numeric"
                              maxLength={6}
                              title="Enter 6 digit PIN code"
                              placeholder="6-digit PIN code"
                              className={inputCls("pincode")}
                              onChange={(e) => {
                                const val = e.target.value
                                  .replace(/\D/g, "")
                                  .slice(0, 6);
                                handleFieldChange("pincode", val);
                              }}
                              onBlur={(e) =>
                                validateField("pincode", e.target.value)
                              }
                              required
                            />
                            <FieldError field="pincode" />
                          </div>
                        </div>
                      </div>
                      {/* ── IDENTIFICATION INFORMATION ── */}
                      <div className="bg-orange-50/30 p-4 sm:p-8 rounded-2xl sm:rounded-3xl border border-orange-100/50">
                        <SectionHeader
                          icon={FileText}
                          title="Identification Information"
                        />
                        <table className="w-full text-left border-collapse min-w-0 md:min-w-[600px] md:table md:table-fixed block">
                          <thead className="hidden md:table-header-group">
                            <tr className="border-b-2 border-orange-100">
                              <th className="py-3 px-2 text-xs font-bold text-slate-500 uppercase tracking-wider w-[15%]">
                                Type
                              </th>
                              <th className="py-3 px-2 text-xs font-bold text-slate-500 uppercase tracking-wider w-[45%]">
                                Identification No.
                              </th>
                              <th className="py-3 px-2 text-xs font-bold text-slate-500 uppercase tracking-wider w-[40%]">
                                ID Copy (PDF only)
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 md:table-row-group block space-y-6 md:space-y-0 md:divide-y">
                            {identificationTypes.map((idType) => (
                              <tr
                                key={idType.label}
                                className="hover:bg-white/50 transition-colors md:table-row flex flex-col gap-4 bg-white md:bg-transparent p-5 md:p-0 rounded-2xl md:rounded-none border border-stone-200/60 md:border-none shadow-sm md:shadow-none"
                              >
                                {/* COLUMN 1: Label */}
                                <td className="text-sm font-bold text-slate-800 md:table-cell block md:py-4 md:px-2 py-0 px-0 w-full">
                                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1 md:hidden">
                                    Type
                                  </span>
                                  {idType.label}{" "}
                                  {idType.req && (
                                    <span className="text-red-500">*</span>
                                  )}
                                </td>

                                {/* COLUMN 2: Identification Number */}
                                <td className="md:table-cell block md:py-4 md:px-2 py-0 px-0 w-full">
                                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1 md:hidden">
                                    Identification No.
                                  </label>
                                  <input
                                    name={idType.numName}
                                    type="text"
                                    value={fieldValues[idType.numName] ?? ""}
                                    placeholder={
                                      idType.label === "GST"
                                        ? "22AAAAA0000A1Z5"
                                        : idType.label === "PAN"
                                          ? "ABCDE1234F"
                                          : idType.label === "TAN"
                                            ? "AAAA12345A (optional)"
                                            : ""
                                    }
                                    className={`w-full h-11 px-3 bg-stone-50 border focus:bg-white text-gray-900 placeholder-stone-400 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 rounded-xl transition-all duration-200 uppercase font-mono tracking-wider ${fieldErrors[idType.numName]
                                      ? "border-red-400 focus:ring-red-500/20 focus:border-red-500 bg-red-50"
                                      : existingData?.rejectedReason
                                        ?.toLowerCase()
                                        .includes(
                                          idType.label.toLowerCase(),
                                        )
                                        ? "border-red-400 bg-red-50"
                                        : "border-stone-200"
                                      }`}
                                    onChange={(e) => {
                                      const val = e.target.value.toUpperCase();
                                      handleFieldChange(idType.numName, val);
                                    }}
                                    onBlur={(e) =>
                                      validateField(
                                        idType.numName,
                                        e.target.value,
                                      )
                                    }
                                    required={idType.req}
                                  />
                                  {fieldErrors[idType.numName] && (
                                    <p className="text-xs text-red-500 font-medium mt-1 flex items-center gap-1">
                                      <XCircle className="h-3.5 w-3.5 shrink-0" />
                                      {fieldErrors[idType.numName]}
                                    </p>
                                  )}
                                </td>

                                {/* COLUMN 3: ID Copy (File Input & Badge) */}
                                <td className="align-middle md:w-[40%] md:table-cell block md:py-4 md:px-2 py-0 px-0 w-full">
                                  <div className="flex flex-col gap-2">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block md:hidden">
                                      ID Copy (PDF only)
                                    </label>
                                    {/* Top Row: Status & View Action */}
                                    {isEditMode &&
                                      existingData?.[idType.fileName] && (
                                        <div className="flex items-center justify-between bg-slate-50 border border-slate-200 p-2 rounded-lg w-full">
                                          <div className="flex items-center gap-1.5 px-1">
                                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                            <span className="text-[10px] font-bold text-slate-600">
                                              UPLOADED
                                            </span>
                                          </div>
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.preventDefault();
                                              setIframeLoading(true);
                                              setViewingDocUrl(
                                                `${process.env.NEXT_PUBLIC_AGENT_API}/agents/viewAgentDocument?referenceNumber=${editRef}&documentType=${idType.docType}`,
                                              );
                                            }}
                                            className="flex items-center gap-1 text-[10px] font-bold text-blue-700 hover:text-blue-800 bg-blue-100/50 hover:bg-blue-100 px-2.5 py-1.5 rounded transition-colors shadow-sm border border-blue-200/50"
                                          >
                                            <Eye className="h-3 w-3" /> View Document
                                          </button>
                                        </div>
                                      )}

                                    {/* UNIFIED CUSTOM UPLOAD BUTTON */}
                                    <label
                                      className={`cursor-pointer bg-white border hover:border-orange-500 hover:bg-orange-50 px-3 py-3 rounded-xl text-xs font-bold transition-all shadow-sm flex flex-col items-center justify-center gap-1 w-full text-center ${fileErrors[idType.fileId]
                                        ? "border-red-400 bg-red-50"
                                        : isEditMode &&
                                          existingData?.[idType.fileName]
                                          ? "border-orange-300 text-orange-700"
                                          : "border-slate-300 text-slate-600 border-dashed border-2"
                                        }`}
                                    >
                                      <div className="flex items-center gap-1.5">
                                        <UploadCloud className="h-4.5 w-4.5" />
                                        {isEditMode &&
                                          existingData?.[idType.fileName]
                                          ? "Replace File"
                                          : "Upload PDF"}
                                      </div>
                                      <span className="text-[10px] font-normal text-slate-400">
                                        PDF only · Max 1 MB
                                      </span>

                                      {/* Display selected filename */}
                                      {tableFiles[idType.fileName] && (
                                        <span className="text-emerald-600 truncate max-w-xs mt-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                                          {tableFiles[idType.fileName]}
                                        </span>
                                      )}

                                      <input
                                        id={idType.fileId}
                                        name={idType.fileName}
                                        type="file"
                                        accept="application/pdf"
                                        className="absolute opacity-0 w-px h-px pointer-events-none"
                                        onChange={(e) => {
                                          const file = e.target.files[0];
                                          handleFileChange(
                                            idType.fileId,
                                            file,
                                            (name) => {
                                              if (name) {
                                                setTableFiles((prev) => ({
                                                  ...prev,
                                                  [idType.fileName]: name,
                                                }));
                                              } else {
                                                setTableFiles((prev) => ({
                                                  ...prev,
                                                  [idType.fileName]: "",
                                                }));
                                              }
                                            },
                                          );
                                        }}
                                        required={idType.req && !isEditMode}
                                      />
                                    </label>
                                    <FileError fileKey={idType.fileId} />
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <div className="mt-6 pt-4 border-t border-orange-100">
                          <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider ml-1">
                            General Remark (Optional)
                          </label>
                          <input
                            name="remark"
                            type="text"
                            className="mt-1 w-full h-11 px-3 bg-stone-50 border border-stone-200 focus:bg-white text-gray-900 placeholder-stone-400 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 rounded-xl focus:outline-none transition-all duration-200"
                            placeholder="Notes about your documentation"
                          />
                        </div>
                      </div>
                      {/* ── CONTACT INFORMATION ── */}
                      <div className="bg-orange-50/30 p-4 sm:p-8 rounded-2xl sm:rounded-3xl border border-orange-100/50">
                        <SectionHeader
                          icon={Contact2}
                          title="Contact Information"
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Title */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider ml-1">
                              Title <span className="text-red-500">*</span>
                            </label>
                            <select
                              name="title"
                              defaultValue={existingData?.title || "Mr."}
                              className="w-full h-12 px-4 bg-stone-50 border border-stone-200 focus:bg-white text-gray-900 focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 rounded-xl transition-all duration-200 focus:outline-none cursor-pointer"
                              required
                            >
                              <option value="Mr.">Mr.</option>
                              <option value="Ms.">Ms.</option>
                              <option value="Mrs.">Mrs.</option>
                            </select>
                          </div>

                          {/* Contact Mobile */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider ml-1">
                              Mobile Number{" "}
                              <span className="text-red-500">*</span>
                            </label>
                            <input
                              name="contactMobile"
                              type="text"
                              value={fieldValues.contactMobile}
                              inputMode="numeric"
                              maxLength={10}
                              placeholder="10-digit mobile number"
                              className={inputCls("contactMobile")}
                              onChange={(e) => {
                                const val = e.target.value
                                  .replace(/\D/g, "")
                                  .slice(0, 10);
                                handleFieldChange("contactMobile", val);
                              }}
                              onBlur={(e) =>
                                validateField("contactMobile", e.target.value)
                              }
                              required
                            />
                            <FieldError field="contactMobile" />
                          </div>

                          {/* First Name */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider ml-1">
                              First Name <span className="text-red-500">*</span>
                            </label>
                            <input
                              name="firstName"
                              type="text"
                              value={fieldValues.firstName}
                              placeholder="First name"
                              className={inputCls("firstName")}
                              onChange={(e) =>
                                handleFieldChange("firstName", e.target.value)
                              }
                              onBlur={(e) =>
                                validateField("firstName", e.target.value)
                              }
                              required
                            />
                            <FieldError field="firstName" />
                          </div>

                          {/* Last Name */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider ml-1">
                              Last Name <span className="text-red-500">*</span>
                            </label>
                            <input
                              name="lastName"
                              type="text"
                              value={fieldValues.lastName}
                              placeholder="Last name"
                              className={inputCls("lastName")}
                              onChange={(e) =>
                                handleFieldChange("lastName", e.target.value)
                              }
                              onBlur={(e) =>
                                validateField("lastName", e.target.value)
                              }
                              required
                            />
                            <FieldError field="lastName" />
                          </div>

                          {/* Contact Email */}
                          <div className="md:col-span-2 space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider ml-1">
                              Contact Email{" "}
                              <span className="text-red-500">*</span>
                            </label>
                            <input
                              name="contactEmail"
                              type="email"
                              value={fieldValues.contactEmail}
                              placeholder="official@example.com"
                              className={inputCls("contactEmail")}
                              onChange={(e) =>
                                handleFieldChange("contactEmail", e.target.value)
                              }
                              onBlur={(e) =>
                                validateField("contactEmail", e.target.value)
                              }
                              required
                            />
                            <FieldError field="contactEmail" />
                          </div>
                        </div>
                      </div>
                      {/* Terms and Submit */}
                      <div className="space-y-8 pt-4">
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                          <div className="flex items-start gap-4">
                            <div className="pt-1">
                              <input
                                name="termsAccepted"
                                type="checkbox"
                                id="terms"
                                className="w-5 h-5 text-orange-600 border-slate-300 rounded focus:ring-orange-500 cursor-pointer"
                                required
                              />
                            </div>
                            <label
                              htmlFor="terms"
                              className="text-sm text-slate-600 cursor-pointer leading-relaxed"
                            >
                              <span className="font-bold text-slate-900">
                                I Read and Accept Terms & Conditions.
                              </span>
                              <span className="block mt-1">
                                I/We hereby certify that the above permits are
                                required only for our official purpose. We hold
                                responsibility for all activities and events of the mentioned
                                persons/vehicles inside the port. I/We declare that
                                Chennai Port Authority will not be held responsible
                                for any untoward incidents.
                              </span>
                            </label>
                          </div>
                        </div>

                        <div className="flex flex-col items-center gap-6">
                          <div className="flex flex-col items-center gap-2">
                            <div className="flex gap-2">
                              {/* <div
                              className="flex items-center justify-center bg-white border border-slate-300 rounded-xl h-14 overflow-hidden w-40 shadow-sm"
                              dangerouslySetInnerHTML={{ __html: captchaSvg }}
                            /> */}
                              <div className="flex items-center justify-center bg-white border border-orange-200 rounded-xl h-14 w-40 shadow-sm text-xl font-bold tracking-widest text-blue-700">
                                {captchaQuestion || "Loading..."}
                              </div>
                              <button
                                type="button"
                                onClick={fetchInitialData}
                                className="p-4 bg-white border border-stone-200 rounded-xl hover:bg-stone-50 active:scale-95 transition-all duration-200 shadow-sm focus:outline-none focus:ring-4 focus:ring-orange-500/10"
                              >
                                <RefreshCw className="h-5 w-5 text-stone-500" />
                              </button>
                            </div>
                            <input
                              name="captchaInput"
                              type="text"
                              value={captchaInput}
                              onChange={(e) => {
                                setCaptchaInput(e.target.value);
                                if (e.target.value.trim()) setCaptchaError(""); // clear error as user types
                              }}
                              onBlur={() => {
                                if (!captchaInput.trim())
                                  setCaptchaError(
                                    "Please enter the security code",
                                  );
                              }}
                              placeholder="Enter Security Code"
                              className={`w-full text-center h-12 bg-stone-50 border focus:bg-white text-gray-900 placeholder-stone-400 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 rounded-xl tracking-widest font-bold shadow-sm transition-all duration-200 focus:outline-none ${captchaError
                                ? "border-red-400 focus:ring-red-500/20 focus:border-red-500 bg-red-50"
                                : "border-stone-200"
                                }`}
                              required
                            />
                            {captchaError && (
                              <p className="text-xs text-red-500 font-medium flex items-center gap-1">
                                <XCircle className="h-3.5 w-3.5 shrink-0" />
                                {captchaError}
                              </p>
                            )}
                          </div>

                          <div className="flex flex-col sm:flex-row gap-4 w-full justify-center items-center">
                            <Link
                              href="/"
                              className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-4 px-10 rounded-2xl shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] transition-all duration-200 text-lg w-full sm:w-auto justify-center focus:outline-none focus:ring-4 focus:ring-slate-500/20 border border-slate-200"
                            >
                              <ArrowLeft className="h-5 w-5" />
                              Back to Login
                            </Link>

                            <button
                              type="submit"
                              disabled={isSubmitting}
                              className={`gradient-orange hover:opacity-90 text-white font-bold py-4 px-16 rounded-2xl shadow-lg shadow-orange-600/25 hover:shadow-orange-600/35 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] transition-all duration-200 text-lg flex items-center gap-2 w-full sm:w-auto justify-center focus:outline-none focus:ring-4 focus:ring-orange-500/20 ${isSubmitting ? "opacity-70 cursor-not-allowed pointer-events-none" : ""
                                }`}
                            >
                              {isSubmitting ? (
                                <>
                                  <Loader2 className="h-6 w-6 animate-spin" />
                                  Submitting...
                                </>
                              ) : (
                                <>
                                  <ShieldCheck className="h-6 w-6" />
                                  Submit Registration
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </form>
                  )}
                </div>
              ) : (
                <div className="p-12 md:p-24 text-center animate-in zoom-in-95 duration-500">
                  <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner border-4 border-emerald-50">
                    <CheckCircle2 className="h-12 w-12 text-emerald-600" />
                  </div>
                  <h2 className="text-4xl font-extrabold text-slate-900 mb-4">
                    Registration Submitted!
                  </h2>

                  <div className="bg-gradient-to-br from-orange-50 to-white border border-orange-100 rounded-2xl p-8 my-10 inline-block shadow-sm">
                    <p className="text-sm text-orange-600 font-bold mb-2 uppercase tracking-widest">
                      Your Request Reference Number
                    </p>
                    <p className="text-5xl font-black text-slate-800 tracking-widest font-mono">
                      {referenceNo}
                    </p>
                  </div>

                  <div className="space-y-4 text-slate-600 max-w-lg mx-auto text-lg mb-12">
                    <p>
                      Your registration request has been submitted for competent
                      authority approval.
                    </p>
                    <p>
                      Upon approval, your{" "}
                      <strong className="text-slate-900">
                        Login ID & Password
                      </strong>{" "}
                      will be generated and sent to your registered email address.
                    </p>
                  </div>

                  <Link
                    href="/"
                    className="inline-flex items-center gap-2 bg-slate-900 hover:bg-orange-600 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] text-white font-bold py-4 px-10 rounded-xl shadow-lg transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-slate-500/20"
                  >
                    Return to Login
                  </Link>
                </div>
              )}
            </div>
          </main>
          {/* 🚀 PDF VIEWER OVERLAY 🚀 */}
          {viewingDocUrl && (
            <div
              className={`fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm transition-all duration-300 ${isFullscreen ? "p-0" : "p-4 md:p-8"
                }`}
            >
              <div
                className={`bg-white w-full h-full flex flex-col overflow-hidden shadow-2xl transition-all duration-300 animate-in zoom-in-95 duration-200 ${isFullscreen
                  ? "max-w-full rounded-none border-none"
                  : "max-w-6xl rounded-xl border border-slate-700"
                  }`}
              >
                {/* Viewer Header */}
                <div className="flex justify-between items-center px-4 py-3 bg-slate-800 text-white">
                  <h3 className="font-bold flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-400" />
                    Document Viewer
                  </h3>

                  {/* Action Buttons */}
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

                {/* Iframe Container */}
                <div className="flex-1 w-full bg-slate-100 relative">
                  {iframeLoading && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-50">
                      <Loader2 className="h-10 w-10 text-[#ff6b00] animate-spin mb-4" />
                      <p className="text-slate-500 font-bold animate-pulse">
                        Fetching secure document...
                      </p>
                    </div>
                  )}

                  <iframe
                    src={viewingDocUrl}
                    className="w-full h-full border-none relative z-0"
                    title="Document Viewer"
                    onLoad={() => setIframeLoading(false)}
                  />
                </div>
              </div>
            </div>
          )}
          <footer className="text-center py-6 text-zinc-500 text-xs font-bold uppercase tracking-widest">
            © 2026 - Chennai Port Authority
          </footer>
        </div>
      </div>
    </ErrorContext.Provider>
  );
}
