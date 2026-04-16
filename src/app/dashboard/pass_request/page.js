"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
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
} from "lucide-react";

const AGENT_API =
  process.env.NEXT_PUBLIC_AGENT_API || "http://localhost:5001/api";

const getCurrentDateTime = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 16);
};

const calculateDateTo = (fromDate, period, type) => {
  if (!fromDate || !period) return "";
  const d = new Date(fromDate);
  if (isNaN(d.getTime())) return "";
  const p = parseInt(period, 10);

  if (type === "DAILY" || type === "1" || type === 1) {
    d.setDate(d.getDate() + p - 1);
  } else if (type === "MONTHLY" || type === "2" || type === 2) {
    d.setMonth(d.getMonth() + p);
    d.setDate(d.getDate() - 1);
  } else if (type === "YEARLY" || type === "3" || type === 3) {
    d.setFullYear(d.getFullYear() + p);
    d.setDate(d.getDate() - 1);
  }
  return d.toISOString().split("T")[0];
};

const getLabelById = (arr, val, key = "label") => {
  if (!val) return "";
  if (!Array.isArray(arr)) return val;
  const item = arr.find(
    (x) => String(x.id) === String(val) || String(x.value) === String(val),
  );
  return item ? item[key] || item.name : val;
};

export default function PassRequestPage() {
  const [activeTab, setActiveTab] = useState("apply");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [paymentMode, setPaymentMode] = useState("Account");

  const [modals, setModals] = useState({
    person: false,
    vehicle: false,
    rateCard: false,
  });

  const [persons, setPersons] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [submittedPasses, setSubmittedPasses] = useState([]);

  const [editingPersonIndex, setEditingPersonIndex] = useState(null);
  const [editingVehicleIndex, setEditingVehicleIndex] = useState(null);

  const [masterPersonsDB, setMasterPersonsDB] = useState({});
  const [masterVehiclesDB, setMasterVehiclesDB] = useState({});

  const [generalForm, setGeneralForm] = useState({
    companyName: "Global Marine Traders",
    email: "admin@gmt.com",
    mobile: "9876543210",
    balance: "7725.00",
    utilizedBalance: "0.00",
    purpose: "",
    purposeOther: "",
    authLetter: null,
  });

  const initialPersonForm = {
    masterId: "",
    hepType: "2", // Default: 2 (Personnel)
    seafarerPassFor: "Sign-On",
    name: "",
    aadharNo: "",
    aadharFile: null,
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

  useEffect(() => {
    const pData = JSON.parse(localStorage.getItem("masterPersonnel") || "[]");
    const vData = JSON.parse(localStorage.getItem("masterVehicles") || "[]");
    const pDict = {};
    pData.forEach((p) => (pDict[p.id] = p));
    setMasterPersonsDB(pDict);
    const vDict = {};
    vData.forEach((v) => (vDict[v.id] = v));
    setMasterVehiclesDB(vDict);
  }, [modals.person, modals.vehicle]);

  const toggleModal = (modalName, state) => {
    setModals({ ...modals, [modalName]: state });
    if (!state) {
      if (modalName === "person") setEditingPersonIndex(null);
      if (modalName === "vehicle") setEditingVehicleIndex(null);
    }
  };

  useEffect(() => {
    let amt = 10.2;
    if (String(personForm.passType) === "2") amt = 153.0; // 2 = MONTHLY
    if (String(personForm.passType) === "3") amt = 407.0; // 3 = YEARLY
    const newDateTo = calculateDateTo(
      personForm.dateFrom,
      personForm.passPeriod,
      personForm.passType,
    );
    setPersonForm((prev) => ({ ...prev, amount: amt, dateTo: newDateTo }));
  }, [personForm.passType, personForm.passPeriod, personForm.dateFrom]);

  useEffect(() => {
    let amt = 25.5;
    if (String(vehicleForm.passType) === "2") amt = 306.0;
    if (String(vehicleForm.passType) === "3") amt = 2035.0;
    const newDateTo = calculateDateTo(
      vehicleForm.dateFrom,
      vehicleForm.passPeriod,
      vehicleForm.passType,
    );
    setVehicleForm((prev) => ({ ...prev, amount: amt, dateTo: newDateTo }));
  }, [vehicleForm.passType, vehicleForm.passPeriod, vehicleForm.dateFrom]);

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
      setPersonForm({
        ...personForm,
        masterId: id,
        name: data.name,
        hepType: data.designation === "Driver" ? "1" : "2",
        aadharNo: data.aadhar,
        mobile: data.phone,
        email: data.email || "",
      });
      toast.success("Person details auto-filled");
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
          `ERROR: Vehicle ${data.regNo} is BLOCKED in the Master Directory.`,
        );
        setVehicleForm(initialVehicleForm);
        return;
      }
      setVehicleForm({
        ...vehicleForm,
        masterId: id,
        regNo: data.regNo,
      });
      toast.success("Vehicle details auto-filled");
    } else {
      setVehicleForm(initialVehicleForm);
    }
  };

  const handleAddPerson = () => {
    if (
      !personForm.name.trim() ||
      !personForm.designation ||
      !personForm.mobile ||
      !personForm.photo
    ) {
      return toast.error("Please fill all mandatory fields including Photo.");
    }
    if (!personForm.requisitionLetter)
      return toast.error("Requisition Letter is mandatory.");
    if (personForm.hepType === "1" && !personForm.driverLicence)
      return toast.error("Driver Licence is mandatory for Drivers."); // 1 = Driver DB
    if (personForm.hepType === "3" && !personForm.passportDoc)
      return toast.error("Passport is mandatory for Seafarers.");

    if (personForm.passType === "2" || personForm.passType === "3") {
      if (
        !personForm.policeVerification ||
        !personForm.proofOfEmployment ||
        !personForm.copyOfLicence
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
    if (
      !vehicleForm.regNo.trim() ||
      !vehicleForm.rcDocument ||
      !vehicleForm.insuranceDocument ||
      !vehicleForm.permit ||
      !vehicleForm.fitnessCert ||
      !vehicleForm.insuranceExpiry || // <--- ADDED VALIDATION
      !vehicleForm.rcValidity // <--- ADDED VALIDATION
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
        !vehicleForm.requestLetter ||
        !vehicleForm.taxDoc ||
        !vehicleForm.emissionCert
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
      const token = localStorage.getItem("accessToken");
      const user = JSON.parse(localStorage.getItem("user") || "{}");
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
        return item ? item.value : fallback;
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
          idProofType: getEnumValue(
            masterData.idProofTypes,
            p.idProofType,
            null,
          ),
          idProofNumber: p.idProofNumber,
          passType: getEnumValue(masterData.passTypes, p.passType, "DAILY"),
          passPeriod: parseInt(p.passPeriod, 10) || 1,

          // ✅ FIX: Strip the "T00:00" time string to prevent Postgres syntax errors
          dateFrom: p.dateFrom.split("T")[0],
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

          // ✅ FIX: Force empty strings to be strict 'null' to prevent Postgres date crash
          insuranceExpiry: v.insuranceExpiry || null,
          rcValidity: v.rcValidity || null,

          accessAreaId: getEnumValue(
            masterData.accessAreas,
            v.accessArea,
            "OTHER GATES ONLY",
          ),
          passType: getEnumValue(masterData.passTypes, v.passType, "DAILY"),
          passPeriod: parseInt(v.passPeriod, 10) || 1,

          // ✅ FIX: Strip the "T00:00" time string to prevent Postgres syntax errors
          dateFrom: v.dateFrom.split("T")[0],
          dateTo: computedDateTo,
          amount: parseFloat(v.amount) || 0,
        };
      });

      // =========================
      // PAYLOAD
      // =========================
      const requestPayload = {
        agentId: parseInt(user.id, 10) || parseInt(user.agentId, 10) || 1, // ✅ Strictly send integer ID
        purposeOfVisitId: finalPurpose,
        paymentMode: paymentMode.toUpperCase(),
        persons: formattedPersons,
        vehicles: formattedVehicles,
      };

      formData.append("payload", JSON.stringify(requestPayload));
      formData.append("authLetter", generalForm.authLetter);

      // =========================
      // FILES APPENDING
      // =========================
      if (persons.length > 0) {
        if (persons[0].photo) formData.append("personPhoto", persons[0].photo);
        if (persons[0].aadharFile)
          formData.append("personAadhar", persons[0].aadharFile);
        if (persons[0].idProofFile)
          formData.append("personIdProof", persons[0].idProofFile);
      }

      if (vehicles.length > 0) {
        if (vehicles[0].rcDocument)
          formData.append("vehicleRC", vehicles[0].rcDocument);
      }

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
        error.message ||
          error.response?.data?.message ||
          "Submission failed. Server Error.",
      );
      console.error("Submit Error:", error);
    } finally {
      setLoading(false);
    }
  };
  const inputClass =
    "w-full h-10 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 px-3 shadow-sm bg-white outline-none transition-all";

  const FileUploadBox = ({ label, isRequired, file, onChange, hint }) => (
    <div className="bg-white p-4 border border-slate-200 rounded-xl shadow-sm hover:border-orange-300 hover:shadow-md transition-all group">
      <label className="text-xs font-bold text-slate-800 block mb-2">
        {label} {isRequired && <span className="text-red-500">*</span>}{" "}
        {hint && (
          <span className="text-slate-400 font-normal ml-1">{hint}</span>
        )}
      </label>
      <div className="relative">
        <input
          type="file"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          onChange={onChange}
        />
        <div
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border ${file ? "border-emerald-200 bg-emerald-50" : "border-dashed border-slate-300 bg-slate-50 group-hover:bg-orange-50 group-hover:border-orange-300"} transition-colors`}
        >
          <Upload
            className={`w-4 h-4 flex-shrink-0 ${file ? "text-emerald-600" : "text-orange-500"}`}
          />
          <span
            className={`text-xs truncate font-medium ${file ? "text-emerald-700" : "text-slate-500"}`}
          >
            {file ? file.name : "Choose file..."}
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
    <div className="space-y-6 font-sans max-w-7xl mx-auto text-slate-800">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#0a1e4d]">Pass Request</h2>
          <p className="text-sm text-slate-500 font-medium">
            Apply for new harbor entry permits
          </p>
        </div>
        <div className="bg-white border border-slate-200 px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-3 shadow-sm text-[#0a1e4d]">
          <Wallet className="h-5 w-5 text-orange-500" /> Wallet Balance:{" "}
          <span className="text-lg">₹{generalForm.balance}</span>
        </div>
      </div>

      <div className="flex border-b border-slate-300">
        <button
          onClick={() => setActiveTab("apply")}
          className={`px-8 py-4 text-sm transition-all ${activeTab === "apply" ? "font-bold text-[#0a1e4d] border-b-2 border-[#0a1e4d]" : "font-semibold text-slate-500 hover:text-[#0a1e4d]"}`}
        >
          Apply New Pass
        </button>
        <button
          onClick={() => setActiveTab("view")}
          className={`px-8 py-4 text-sm transition-all ${activeTab === "view" ? "font-bold text-[#0a1e4d] border-b-2 border-[#0a1e4d]" : "font-semibold text-slate-500 hover:text-[#0a1e4d]"}`}
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
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Utilized Balance
                  </p>
                  <p className="text-sm font-black text-red-600 mt-1">
                    ₹ {generalForm.utilizedBalance}
                  </p>
                </div>
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
                      onChange={(e) =>
                        setGeneralForm({
                          ...generalForm,
                          authLetter: e.target.files[0],
                        })
                      }
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
                          {p.photo ? (
                            <img
                              src={
                                p.photo instanceof File
                                  ? URL.createObjectURL(p.photo)
                                  : ""
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
              {!editingPersonIndex && (
                <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center gap-4 shadow-sm">
                  <label className="text-xs font-black text-[#0a1e4d] uppercase tracking-wider whitespace-nowrap">
                    Fast-Fill from Master Directory:
                  </label>
                  <select
                    value={personForm.masterId}
                    onChange={handleMasterPersonSelect}
                    className="w-full max-w-md h-11 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none px-3 font-semibold text-slate-700"
                  >
                    <option value="">-- Apply Fresh (Manual Entry) --</option>
                    {Object.values(masterPersonsDB).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} - Aadhar: {p.aadhar}
                      </option>
                    ))}
                  </select>
                </div>
              )}

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
                      onChange={(e) =>
                        setPersonForm({ ...personForm, name: e.target.value })
                      }
                      className={inputClass}
                      placeholder="Full Name"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase">
                      Aadhar No. <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={personForm.aadharNo}
                      onChange={(e) =>
                        setPersonForm({
                          ...personForm,
                          aadharNo: e.target.value,
                        })
                      }
                      className={inputClass}
                      placeholder="XXXX XXXX XXXX"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase text-red-500">
                      Upload Aadhar <span className="text-red-500">*</span>
                    </label>
                    <FileUploadBox
                      file={personForm.aadharFile}
                      onChange={(e) =>
                        setPersonForm({
                          ...personForm,
                          aadharFile: e.target.files[0],
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
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
                        onChange={(e) =>
                          setPersonForm({
                            ...personForm,
                            mobile: e.target.value,
                          })
                        }
                        className="w-full pl-[5.5rem] pr-3 h-10 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 outline-none transition-all"
                        placeholder="00000 00000"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase">
                      Email Id
                    </label>
                    <input
                      type="email"
                      value={personForm.email}
                      onChange={(e) =>
                        setPersonForm({ ...personForm, email: e.target.value })
                      }
                      className={inputClass}
                      placeholder="email@domain.com"
                    />
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
                        onChange={(e) =>
                          setPersonForm({
                            ...personForm,
                            vehicleNo: e.target.value,
                          })
                        }
                        disabled={!personForm.withTwoWheeler}
                        placeholder="Vehicle No"
                        className="w-full text-sm disabled:bg-slate-100 disabled:cursor-not-allowed px-3 outline-none uppercase font-bold text-[#0a1e4d]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase">
                      Nationality <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={personForm.nationality}
                      onChange={(e) =>
                        setPersonForm({
                          ...personForm,
                          nationality: e.target.value,
                        })
                      }
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
                    >
                      <option value="">Select Country</option>
                      {masterData.countries.map((c) => (
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
                      onChange={(e) =>
                        setPersonForm({ ...personForm, visaNo: e.target.value })
                      }
                      disabled={String(personForm.country) === "75"}
                      placeholder="Visa number"
                      className={`disabled:bg-slate-100 disabled:cursor-not-allowed ${inputClass}`}
                    />
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
                  <div className="space-y-1.5 col-span-1 md:col-span-2 flex gap-4">
                    <div className="flex-1 space-y-1.5">
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
                    <div
                      className={`flex-1 space-y-1.5 ${personForm.designation === "Others" ? "opacity-100" : "opacity-0 pointer-events-none"}`}
                    >
                      <label className="text-xs font-bold text-transparent uppercase select-none">
                        .
                      </label>
                      <input
                        type="text"
                        placeholder="Specify Others"
                        onChange={(e) =>
                          setPersonForm({
                            ...personForm,
                            designationOther: e.target.value,
                          })
                        }
                        className={inputClass}
                      />
                    </div>
                  </div>
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
                      onChange={(e) =>
                        setPersonForm({
                          ...personForm,
                          idProofNumber: e.target.value,
                        })
                      }
                      className={inputClass}
                      placeholder={idProofPlaceholder}
                    />
                  </div>
                  <div className="space-y-1.5 md:col-span-2 max-w-sm">
                    <label className="text-xs font-bold text-slate-700 uppercase">
                      Upload Photo <span className="text-red-500">*</span>
                    </label>
                    {personForm.photo ? (
                      <div className="relative w-24 h-28 rounded-xl border border-slate-300 overflow-hidden shadow-sm group">
                        <img
                          src={
                            personForm.photo instanceof File
                              ? URL.createObjectURL(personForm.photo)
                              : ""
                          }
                          alt="Profile"
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() =>
                            setPersonForm({ ...personForm, photo: null })
                          }
                          className="absolute top-1.5 right-1.5 bg-white/90 hover:bg-red-500 text-slate-700 hover:text-white p-1 rounded-full shadow-sm transition-colors"
                          title="Remove"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <FileUploadBox
                        file={personForm.photo}
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
                      Copy of ID Proof <span className="text-red-500">*</span>
                    </label>
                    <FileUploadBox
                      file={personForm.idProofFile}
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

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-3 flex items-center gap-2">
                  <FileCheck2 className="h-5 w-5 text-orange-500" /> 2.
                  Mandatory Documents
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <FileUploadBox
                    label="Requisition Letter"
                    isRequired
                    file={personForm.requisitionLetter}
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
                            onChange={(e) =>
                              setPersonForm({
                                ...personForm,
                                passPeriod: e.target.value,
                              })
                            }
                            className="w-20 h-10 border border-slate-300 rounded-lg text-sm px-2 text-center outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-bold"
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
                          type="date"
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
              {!editingVehicleIndex && (
                <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center gap-4 shadow-sm">
                  <label className="text-xs font-black text-[#0a1e4d] uppercase tracking-wider whitespace-nowrap">
                    Select from Vehicle Fleet:
                  </label>
                  <select
                    value={vehicleForm.masterId}
                    onChange={handleMasterVehicleSelect}
                    className="w-full max-w-md h-11 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none px-3 font-semibold text-slate-700"
                  >
                    <option value="">-- Apply Fresh (Manual Entry) --</option>
                    {Object.values(masterVehiclesDB).map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.regNo}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
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
                      onChange={(e) =>
                        setVehicleForm({
                          ...vehicleForm,
                          regNo: e.target.value,
                        })
                      }
                      className={`${inputClass} uppercase font-bold text-[#0a1e4d] tracking-wider`}
                      placeholder="TN-XX-XX-XXXX"
                    />
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
                      onChange={(e) =>
                        setVehicleForm({
                          ...vehicleForm,
                          insuranceExpiry: e.target.value,
                        })
                      }
                      className={inputClass}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase">
                      RC Validity Date
                    </label>
                    <input
                      type="date"
                      value={vehicleForm.rcValidity}
                      onChange={(e) =>
                        setVehicleForm({
                          ...vehicleForm,
                          rcValidity: e.target.value,
                        })
                      }
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-3 flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-orange-500" /> 2. Mandatory
                  Documents
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <FileUploadBox
                    label="RC Book"
                    isRequired
                    file={vehicleForm.rcDocument}
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
                            onChange={(e) =>
                              setVehicleForm({
                                ...vehicleForm,
                                passPeriod: e.target.value,
                              })
                            }
                            className="w-20 h-10 border border-slate-300 rounded-lg text-sm px-2 text-center outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-bold"
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
                          type="date"
                          value={vehicleForm.dateTo}
                          className="w-full h-10 bg-slate-100 border border-slate-200 rounded-lg text-sm px-3 text-slate-700 font-bold cursor-not-allowed outline-none"
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
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
    </div>
  );
}
