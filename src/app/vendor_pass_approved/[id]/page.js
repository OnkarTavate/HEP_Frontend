"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import axios from "axios";
import { QRCodeSVG } from "qrcode.react";
import { CheckCircle, User, Car, Download, AlertCircle, Loader2, ChevronLeft, QrCode, Calendar, Building2, FileBadge, Edit, Edit3, X as CloseIcon, Upload, Eye, CheckCircle2, UserPlus, Phone, Users, Truck, RefreshCw, BookOpen, FileCheck2 } from "lucide-react";
import { toast } from "sonner";

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


export default function VendorPassApprovedPage() {
  const params = useParams();
  const vendorPassId = params.id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [passData, setPassData] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingEntity, setEditingEntity] = useState(null);
  const [formData, setFormData] = useState({});
  const [submitLoading, setSubmitLoading] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [entityType, setEntityType] = useState(null); // 'person' or 'vehicle'
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [masterData, setMasterData] = useState({
    designations: [],
    idProofTypes: [],
    passTypes: [],
    nationalities: [],
    accessAreas: [],
    vehicleTypes: [],
    countries: [
      { id: 75, name: "India", iso2: "IN" },
      { id: 1, name: "Afghanistan", iso2: "AF" },
      { id: 9, name: "Australia", iso2: "AU" },
      { id: 31, name: "Canada", iso2: "CA" },
      { id: 36, name: "China", iso2: "CN" },
    ],
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
  });


  const [revertedPersons, setRevertedPersons] = useState([]);
  const [revertedVehicles, setRevertedVehicles] = useState([]);
  const [revertedEditModal, setRevertedEditModal] = useState(false);

  const [modals, setModals] = useState({ person: false, vehicle: false });
  const [personErrors, setPersonErrors] = useState({});
  const [vehicleErrors, setVehicleErrors] = useState({});
  const [editingPersonIndex, setEditingPersonIndex] = useState(null);
  const [editingVehicleIndex, setEditingVehicleIndex] = useState(null);
  const [editingRevertedEntity, setEditingRevertedEntity] = useState(null);

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
  
  const inputClass = "w-full h-10 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 px-3 shadow-sm bg-white outline-none transition-all";
  
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
  
  const handleAddPerson = () => { handleSaveRevertedEntity(); };
  const handleAddVehicle = () => { handleSaveRevertedEntity(); };
  const handleClearPerson = () => {
    setPersonForm(initialPersonForm);
    setPersonErrors({});
  };
  
  const handleHepTypeChange = (e) => {
    const selectedType = String(e.target.value);
    if (selectedType === "1") {
      setPersonForm({
        ...personForm,
        hepType: selectedType,
        designation: "13",
        idProofType: "1",
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
  
  const getFilteredDesignations = () => {
    return masterData.designations || [];
  };


  useEffect(() => {
    fetchVendorPassData();
    fetchMasterData();
  }, [vendorPassId]);
  
  const fetchMasterData = async () => {
    try {
      const [natRes, passRes, idRes, accessRes, vehRes, desigRes] = await Promise.all([
        axios.get(`${AGENT_API}/pass-request/get-nationality`).catch(() => ({ data: [] })),
        axios.get(`${AGENT_API}/pass-request/get-pass-types`).catch(() => ({ data: [] })),
        axios.get(`${AGENT_API}/pass-request/get-id-proof-types`).catch(() => ({ data: [] })),
        axios.get(`${AGENT_API}/pass-request/get-access-areas`).catch(() => ({ data: [] })),
        axios.get(`${AGENT_API}/pass-request/getVehicleTypes`).catch(() => ({ data: [] })),
        axios.get(`${AGENT_API}/pass-request/getDesignations`).catch(() => ({ data: [] })),
      ]);
      const extractArray = (res) => Array.isArray(res?.data?.data) ? res.data.data : Array.isArray(res?.data) ? res.data : [];
      setMasterData(prev => ({
        ...prev,
        nationalities: extractArray(natRes),
        passTypes: extractArray(passRes),
        idProofTypes: extractArray(idRes),
        accessAreas: extractArray(accessRes),
        vehicleTypes: extractArray(vehRes),
        designations: extractArray(desigRes),
      }));
    } catch (e) { console.error(e); }
  };

  const fetchVendorPassData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.get(
        `${AGENT_API}/pass-request/vendor-qr-data/${vendorPassId}`
      );

      setPassData(response.data);
      if (response.data) {
        setRevertedPersons(response.data.persons?.filter(p => p.status === 'reverted' || p.status === 'updated') || []);
        setRevertedVehicles(response.data.vehicles?.filter(v => v.status === 'reverted' || v.status === 'updated') || []);
      }
    } catch (err) {
      console.error("Error fetching vendor pass data:", err);
      setError(
        err.response?.data?.message ||
        "Failed to load pass data. Please check your link or contact support."
      );
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = () => setRevertedEditModal(true);

  const closeRevertedEditModal = () => {
    setRevertedEditModal(false);
    setEditingRevertedEntity(null);
  };

  
  const handleEditEntity = (type, index, entity) => {
    // Close the reverted edit modal first
    setRevertedEditModal(false);
    // Store editing context
    setEditingRevertedEntity({ type, index, id: entity.id, passId: vendorPassId });

    if (type === 'person') {
      setEditingPersonIndex('reverted');

      // Helper: resolve a value to a numeric ID string.
      // If the raw value is already a numeric string ("1","2"…) use it directly.
      // Otherwise try to match by name/label in the provided array.
      const resolveId = (arr, raw, fallback = '') => {
        if (!raw) return fallback;
        if (/^\d+$/.test(String(raw))) return String(raw); // already numeric
        const found = arr.find(x => (x.value || x.label || x.name || '').toUpperCase() === String(raw).toUpperCase());
        return found ? String(found.id || found.value) : fallback;
      };

      const nationalityId = resolveId(masterData.nationalities, entity.nationality, entity.nationality === 'FOREIGNER' ? '2' : '1');
      const accessAreaId  = resolveId(masterData.accessAreas,   entity.accessAreaId, '');
      const idProofTypeId = resolveId(masterData.idProofTypes,  entity.idProofType,  entity.idProofType || '');
      const passTypeId    = resolveId(masterData.passTypes,     entity.passType,     entity.passType || '1');

      setPersonForm({
        ...initialPersonForm,
        id: entity.id,
        masterId: entity.masterId || '',
        name: entity.name || '',
        mobile: entity.mobile || '',
        email: entity.email || '',
        aadharNo: entity.aadharNo || '',
        designation: String(entity.designationId || entity.designation || ''),
        designationOther: '',
        idProofType: idProofTypeId,
        idProofNumber: entity.idProofNumber || entity.aadharNo || '',
        hepType: String(entity.hepTypeId || '2'),
        passType: passTypeId,
        passPeriod: String(entity.passPeriod || '1'),
        dateFrom: entity.dateFrom ? (String(entity.dateFrom).includes('T') ? String(entity.dateFrom).split('T')[0] : String(entity.dateFrom)) + 'T00:00' : '',
        dateTo: entity.dateTo ? (String(entity.dateTo).includes('T') ? String(entity.dateTo).split('T')[0] : String(entity.dateTo)) + 'T05:59' : '',
        amount: entity.amount || '',
        nationality: nationalityId,
        country: String(entity.countryId || '75'),
        visaNo: entity.visaNo || '',
        cardNumber: entity.cardNumber || '',
        withTwoWheeler: entity.withTwoWheeler === true || entity.withTwoWheeler === 'true',
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
        existingPassRequestId: vendorPassId,
        existingPhotoName: entity.photoFileName,
        existingAadharName: entity.aadharPDFFileName,
        existingDlName: entity.driverLicenseName,
        existingReqName: entity.requisitionLetterName,
        existingPassportName: entity.passportName,
        existingPoliceName: entity.policeVerificationName,
        existingEmpName: entity.employmentProofName,
        existingChaName: entity.chaLicenseName,
        existingIdProofName: entity.idProofFileName,
        existingCdcName: entity.cdcDocumentName,
        existingDeclarationName: entity.declarationFormName,
        isEditing: true,
        editIndex: index
      });

      toggleModal("person", true);
      toast.success('Person details loaded for editing');

    } else if (type === 'vehicle') {
      setEditingVehicleIndex('reverted');

      const resolveId = (arr, raw, fallback = '') => {
        if (!raw) return fallback;
        if (/^\d+$/.test(String(raw))) return String(raw);
        const found = arr.find(x => (x.value || x.label || x.name || '').toUpperCase() === String(raw).toUpperCase());
        return found ? String(found.id || found.value) : fallback;
      };

      const accessAreaId  = resolveId(masterData.accessAreas,  entity.accessAreaId, '');
      const vehicleTypeId = resolveId(masterData.vehicleTypes, entity.vehicleTypeId, entity.vehicleTypeId || '');
      const passTypeId    = resolveId(masterData.passTypes,    entity.passType,      entity.passType || '1');

      const toDateOnly = (val) => {
        if (!val) return '';
        return String(val).split('T')[0];
      };

      setVehicleForm({
        ...initialVehicleForm,
        id: entity.id,
        regNo: entity.registrationNo || entity.regNo || '',
        type: vehicleTypeId,
        fuelType: entity.fuelType || '',
        accessArea: accessAreaId,
        insuranceExpiry: toDateOnly(entity.insuranceExpiry),
        rcValidity: toDateOnly(entity.rcValidity),
        passType: passTypeId,
        passPeriod: String(entity.passPeriod || '1'),
        dateFrom: entity.dateFrom ? toDateOnly(entity.dateFrom) + 'T00:00' : '',
        dateTo: entity.dateTo ? toDateOnly(entity.dateTo) + 'T05:59' : '',
        amount: entity.amount || '',
        rcDocument: null,
        insuranceDocument: null,
        permit: null,
        fitnessCert: null,
        requestLetter: null,
        taxDoc: null,
        emissionCert: null,
        existingPassRequestId: vendorPassId,
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

      toggleModal("vehicle", true);
      toast.success('Vehicle details loaded for editing');
    }
  };

  const handleInputChange = (e) => {
    const { name, value, files } = e.target;
    if (files) {
      setFormData({ ...formData, [name]: files[0] });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const submitEntityUpdate = async () => {
    setSubmitLoading(true);
    try {
      const data = new FormData();
      Object.keys(formData).forEach(key => {
        if (formData[key] !== null && formData[key] !== undefined) {
          data.append(key, formData[key]);
        }
      });

      const endpoint = editingEntity.type === 'person'
        ? `/api/vendor-pass/public/${vendorPassId}/update-person/${editingEntity.index}`
        : `/api/vendor-pass/public/${vendorPassId}/update-vehicle/${editingEntity.index}`;

      await axios.put(`${process.env.NEXT_PUBLIC_AGENT_API || 'http://localhost:5001/api'}${endpoint.replace('/api', '')}`, data);

      // Refresh
      await fetchVendorPassData();
      setEditingEntity(null);
    } catch (err) {
      console.error(err);
      alert("Failed to update");
    }
    setSubmitLoading(false);
  };

  
  const handleSaveRevertedEntity = async () => {
    if (!editingRevertedEntity) return;

    const { type, index, id } = editingRevertedEntity;

    const passTypeEnumMap = { '1': 'DAILY', '2': 'MONTHLY', '3': 'YEARLY' };
    const toPassTypeEnum = (val) => passTypeEnumMap[String(val)] || val || 'DAILY';

    const nationalityEnumMap = { '1': 'INDIAN', '2': 'FOREIGNER' };
    const toNationalityEnum = (val) => nationalityEnumMap[String(val)] || val || 'INDIAN';

    const idProofTypeEnumMap = {
      '1': 'DRIVING LICENSE',
      '2': 'PAN CARD',
      '3': 'PASSPORT',
      '4': 'ELECTION CARD',
      '5': 'COMPANY ID CARD'
    };
    const toIdProofTypeEnum = (val) => idProofTypeEnumMap[String(val)] || val || '';

    try {
      if (type === 'person') {
        const updateData = {
          id: id,
          name: personForm.name,
          mobile: personForm.mobile,
          email: personForm.email,
          aadharNo: personForm.aadharNo,
          designation: personForm.designation,
          designationOther: personForm.designationOther,
          idProofType: toIdProofTypeEnum(personForm.idProofType),
          idProofNumber: personForm.idProofNumber,
          hepTypeId: personForm.hepType,
          hepType: personForm.hepType,
          passType: toPassTypeEnum(personForm.passType),
          passPeriod: personForm.passPeriod,
          dateFrom: personForm.dateFrom,
          dateTo: personForm.dateTo,
          amount: personForm.amount,
          nationality: toNationalityEnum(personForm.nationality),
          countryId: personForm.country,
          accessAreaId: personForm.accessArea,
          visaNo: personForm.visaNo,
          passportNo: personForm.passportNo,
          cdcNumber: personForm.cdcNumber,
          seafarerPassFor: personForm.seafarerPassFor,
          seafarerIdType: personForm.seafarerIdType,
          withTwoWheeler: personForm.withTwoWheeler,
          vehicleNo: personForm.vehicleNo,
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
          // Newly uploaded files:
          newPhoto: personForm.photo,
          newAadhar: personForm.aadharFile,
          newIdProof: personForm.idProofFile,
          newDriverLicence: personForm.driverLicence,
          newPoliceVerification: personForm.policeVerification,
          newEmploymentProof: personForm.proofOfEmployment,
          newChaLicence: personForm.copyOfLicence,
          newPassport: personForm.passportDoc,
          newCdc: personForm.cdcDocument,
          newDeclaration: personForm.declarationForm,
          newRequisitionLetter: personForm.requisitionLetter,
        };

        const updatedPersons = [...revertedPersons];
        updatedPersons[index] = { ...updateData, status: 'updated' };
        setRevertedPersons(updatedPersons);

        toggleModal("person", false);
        setPersonForm(initialPersonForm);
        // Reopen the reverted edit modal
        setRevertedEditModal(true);

      } else if (type === 'vehicle') {
        const updateData = {
          id: id,
          registrationNo: vehicleForm.regNo,
          regNo: vehicleForm.regNo,
          vehicleRegistrationNo: vehicleForm.regNo,
          vehicleTypeId: vehicleForm.type,
          vehicleType: vehicleForm.type,
          fuelType: vehicleForm.fuelType,
          accessAreaId: vehicleForm.accessArea,
          insuranceExpiry: vehicleForm.insuranceExpiry,
          rcValidity: vehicleForm.rcValidity,
          passType: toPassTypeEnum(vehicleForm.passType),
          passPeriod: vehicleForm.passPeriod,
          dateFrom: vehicleForm.dateFrom,
          dateTo: vehicleForm.dateTo,
          amount: vehicleForm.amount,
          scannedCopyFileName: vehicleForm.existingRcName,
          insuranceFileName: vehicleForm.existingInsName,
          permitFileName: vehicleForm.existingPermitName,
          fitnessFileName: vehicleForm.existingFitnessName,
          requestLetterName: vehicleForm.existingReqName,
          taxDocName: vehicleForm.existingTaxName,
          emissionCertName: vehicleForm.existingEmissionName,
          // Newly uploaded files:
          newRc: vehicleForm.rcDocument,
          newInsurance: vehicleForm.insuranceDocument,
          newPermit: vehicleForm.permit,
          newFitness: vehicleForm.fitnessCert,
          newRequestLetter: vehicleForm.requestLetter,
          newTax: vehicleForm.taxDoc,
          newEmission: vehicleForm.emissionCert
        };

        const updatedVehicles = [...revertedVehicles];
        updatedVehicles[index] = { ...updateData, status: 'updated' };
        setRevertedVehicles(updatedVehicles);

        toggleModal("vehicle", false);
        setVehicleForm(initialVehicleForm);
        // Reopen the reverted edit modal
        setRevertedEditModal(true);
      }

      toast.success(`${type === 'person' ? 'Person' : 'Vehicle'} updated successfully`);
      setEditingRevertedEntity(null);

    } catch (error) {
      console.error('Error updating reverted entity:', error);
      toast.error('Failed to update entity locally');
    }
  };

  const handleResubmitPass = async () => {
    setSubmitLoading(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_AGENT_API || 'http://localhost:5001/api';

      // 1. Update reverted persons
      for (let i = 0; i < revertedPersons.length; i++) {
        const person = revertedPersons[i];
        if (person.status === 'updated') {
          const formData = new FormData();
          
          // Append text fields
          formData.append('name', person.name || '');
          formData.append('mobile', person.mobile || '');
          formData.append('email', person.email || '');
          formData.append('aadharNo', person.aadharNo || '');
          formData.append('designation', person.designation || '');
          formData.append('designationOther', person.designationOther || '');
          formData.append('idProofType', person.idProofType || '');
          formData.append('idProofNumber', person.idProofNumber || '');
          formData.append('hepTypeId', person.hepTypeId || '');
          formData.append('hepType', person.hepType || '');
          formData.append('passType', person.passType || '');
          formData.append('passPeriod', person.passPeriod || '');
          formData.append('dateFrom', person.dateFrom || '');
          formData.append('dateTo', person.dateTo || '');
          formData.append('amount', person.amount || '');
          formData.append('nationality', person.nationality || '');
          formData.append('countryId', person.countryId || '');
          formData.append('accessAreaId', person.accessAreaId || '');
          formData.append('visaNo', person.visaNo || '');
          formData.append('passportNo', person.passportNo || '');
          formData.append('cdcNumber', person.cdcNumber || '');
          formData.append('seafarerPassFor', person.seafarerPassFor || '');
          formData.append('seafarerIdType', person.seafarerIdType || '');
          formData.append('withTwoWheeler', person.withTwoWheeler ? 'true' : 'false');
          formData.append('vehicleNo', person.vehicleNo || '');
          
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

          // Append file fields
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

          await axios.put(`${apiBase}/vendor-pass/public/${vendorPassId}/update-person/${i}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        }
      }

      // 2. Update reverted vehicles
      for (let i = 0; i < revertedVehicles.length; i++) {
        const vehicle = revertedVehicles[i];
        if (vehicle.status === 'updated') {
          const formData = new FormData();

          // Append text fields
          formData.append('registrationNo', vehicle.registrationNo || '');
          formData.append('regNo', vehicle.regNo || '');
          formData.append('vehicleRegistrationNo', vehicle.vehicleRegistrationNo || vehicle.regNo || '');
          formData.append('vehicleTypeId', vehicle.vehicleTypeId || '');
          formData.append('vehicleType', vehicle.vehicleType || vehicle.vehicleTypeId || '');
          formData.append('fuelType', vehicle.fuelType || '');
          formData.append('accessAreaId', vehicle.accessAreaId || '');
          formData.append('insuranceExpiry', vehicle.insuranceExpiry || '');
          formData.append('rcValidity', vehicle.rcValidity || '');
          formData.append('passType', vehicle.passType || '');
          formData.append('passPeriod', vehicle.passPeriod || '');
          formData.append('dateFrom', vehicle.dateFrom || '');
          formData.append('dateTo', vehicle.dateTo || '');
          formData.append('amount', vehicle.amount || '');

          formData.append('scannedCopyFileName', vehicle.scannedCopyFileName || '');
          formData.append('insuranceFileName', vehicle.insuranceFileName || '');
          formData.append('permitFileName', vehicle.permitFileName || '');
          formData.append('fitnessFileName', vehicle.fitnessFileName || '');
          formData.append('requestLetterName', vehicle.requestLetterName || '');
          formData.append('taxDocName', vehicle.taxDocName || '');
          formData.append('emissionCertName', vehicle.emissionCertName || '');

          // Append file fields
          if (vehicle.newRc) formData.append('vehicleRC', vehicle.newRc);
          if (vehicle.newInsurance) formData.append('vehicleInsurance', vehicle.newInsurance);
          if (vehicle.newPermit) formData.append('vehiclePermit', vehicle.newPermit);
          if (vehicle.newFitness) formData.append('vehicleFitness', vehicle.newFitness);
          if (vehicle.newRequestLetter) formData.append('vehicleRequestLetter', vehicle.newRequestLetter);
          if (vehicle.newTax) formData.append('vehicleTax', vehicle.newTax);
          if (vehicle.newEmission) formData.append('vehicleEmission', vehicle.newEmission);

          await axios.put(`${apiBase}/vendor-pass/public/${vendorPassId}/update-vehicle/${i}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        }
      }

      // 3. Resubmit pass
      await axios.put(`${apiBase}/vendor-pass/public/${vendorPassId}/resubmit`);
      toast.success("Pass resubmitted successfully!");
      setRevertedEditModal(false);
      fetchVendorPassData();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to resubmit pass");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleViewQR = (entity, type, index) => {
    setSelectedEntity(entity);
    setEntityType(type);
    setSelectedIndex(index);
  };

  const handleBack = () => {
    setSelectedEntity(null);
    setEntityType(null);
    setSelectedIndex(null);
  };

  const downloadSinglePDF = async () => {
    if (!selectedEntity || selectedIndex === null || !entityType) return;
    try {
      const response = await axios.get(
        `http://localhost:5007/api/qr/vendor-generate-single-qr/${vendorPassId}/${entityType}/${selectedIndex}`,
        { responseType: "blob" }
      );
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const passNo = selectedEntity.personPassNo || selectedEntity.vehiclePassNo || "pass";
      link.download = `Pass_${passNo}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to download pass PDF:", error);
      alert("Failed to download pass PDF. Please try again.");
    }
  };

  const downloadSinglePDFByIndex = async (entity, type, index) => {
    try {
      const response = await axios.get(
        `http://localhost:5007/api/qr/vendor-generate-single-qr/${vendorPassId}/${type}/${index}`,
        { responseType: "blob" }
      );
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const passNo = entity.personPassNo || entity.vehiclePassNo || "pass";
      link.download = `Pass_${passNo}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to download pass PDF:", error);
      alert("Failed to download pass PDF. Please try again.");
    }
  };

  const downloadPDF = async () => {
    try {
      const response = await axios.get(
        `http://localhost:5007/api/qr/vendor-generate-qr/${vendorPassId}`,
        { responseType: "blob" }
      );
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `VendorPass-${vendorPassId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to download PDF:", error);
      alert("Failed to download PDF. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-slate-600">Loading your approved pass...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">Error Loading Pass</h2>
          <p className="text-slate-600 mb-6">{error}</p>
          <button
            onClick={fetchVendorPassData}
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!passData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <AlertCircle className="h-16 w-16 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">No Data Found</h2>
          <p className="text-slate-600">Unable to retrieve pass information.</p>
        </div>
      </div>
    );
  }

  const { persons = [], vehicles = [], referenceNo } = passData;

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

  const approvedPersons = persons.filter(p => p.status === 'approved');
  const rejectedPersons = persons.filter(p => p.status === 'rejected');
  const initialRevertedPersons = persons.filter(p => p.status === 'reverted');

  const approvedVehicles = vehicles.filter(v => v.status === 'approved');
  const rejectedVehicles = vehicles.filter(v => v.status === 'rejected');
  const initialRevertedVehicles = vehicles.filter(v => v.status === 'reverted');

  const isReverted = initialRevertedPersons.length > 0 || initialRevertedVehicles.length > 0;

  // QR Detail View
  if (selectedEntity) {
    const isPerson = entityType === "person";
    const passNo = isPerson
      ? selectedEntity.personPassNo
      : selectedEntity.vehiclePassNo;
    const qrData = passNo || String(selectedEntity.id);

    return (
      <div className="min-h-screen bg-slate-50 py-8 px-4">
        <div className="max-w-md mx-auto">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-4 transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
            Back to Pass List
          </button>

          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-6 text-white">
              <div className="flex items-center gap-3 mb-2">
                <QrCode className="h-6 w-6" />
                <h1 className="text-xl font-bold">Pass QR Code</h1>
              </div>
              <p className="text-white/90 text-sm">{referenceNo}</p>
            </div>

            {/* QR Code */}
            <div className="p-8 text-center">
              <div className="bg-white p-4 rounded-xl shadow-inner inline-block mb-6">
                <QRCodeSVG
                  id="qr-code-svg"
                  value={qrData}
                  size={250}
                  level="H"
                  includeMargin={true}
                  className="mx-auto"
                />
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center justify-center gap-2">
                  {isPerson ? (
                    <User className="h-5 w-5 text-slate-400" />
                  ) : (
                    <Car className="h-5 w-5 text-slate-400" />
                  )}
                  <span className="font-semibold text-slate-800">
                    {isPerson ? selectedEntity.name : selectedEntity.registrationNo}
                  </span>
                </div>

                <div className="bg-slate-50 rounded-lg p-4 text-left space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500 text-sm">Pass Number:</span>
                    <span className="font-mono font-semibold text-slate-800">{passNo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 text-sm">Company:</span>
                    <span className="text-slate-800">{selectedEntity.company}</span>
                  </div>
                  {isPerson && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-slate-500 text-sm">Mobile:</span>
                        <span className="text-slate-800">{selectedEntity.mobile || "N/A"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 text-sm">Aadhar:</span>
                        <span className="text-slate-800">{selectedEntity.aadharNo || "N/A"}</span>
                      </div>
                    </>
                  )}
                  {selectedEntity.validFrom && (
                    <div className="flex justify-between">
                      <span className="text-slate-500 text-sm">Valid From:</span>
                      <span className="text-slate-800">{selectedEntity.validFrom}</span>
                    </div>
                  )}
                  {selectedEntity.validTo && (
                    <div className="flex justify-between">
                      <span className="text-slate-500 text-sm">Valid To:</span>
                      <span className="text-slate-800">{selectedEntity.validTo}</span>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={downloadSinglePDF}
                className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-lg font-semibold transition-colors"
              >
                <Download className="h-5 w-5" />
                Download Pass PDF
              </button>
            </div>
          </div>

          <p className="text-center text-slate-500 text-sm mt-6">
            Show this QR code at the gate for entry/exit scanning.
          </p>
        </div>
      </div>
    );
  }

  // List View
  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className={isReverted ? "bg-orange-100 p-3 rounded-full" : "bg-green-100 p-3 rounded-full"}>
                {isReverted ? (
                  <AlertCircle className="h-8 w-8 text-orange-600" />
                ) : (
                  <CheckCircle className="h-8 w-8 text-green-600" />
                )}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">
                  {isReverted ? "Action Required: Reverted Passes" : "Pass Review Completed"}
                </h1>
                <p className="text-slate-600">
                  Reference: <span className="font-mono font-semibold">{referenceNo}</span>
                </p>
              </div>
            </div>
            {(approvedPersons.length > 0 || approvedVehicles.length > 0) && (
              <button
                onClick={downloadPDF}
                className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 3H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download All Passes PDF
              </button>
            )}
          </div>
        </div>

        {/* Work Order Info */}
        {passData?.workOrderFilePath && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-slate-200">
            <h2 className="text-base font-bold text-slate-700 mb-3 flex items-center gap-2">
              <FileBadge className="h-5 w-5 text-orange-500" />
              Work Order Details
            </h2>
            <div className="flex flex-wrap gap-6 text-sm">
              {passData.companyName && (
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Company</span>
                  <span className="font-semibold text-slate-700">{passData.companyName}</span>
                </div>
              )}
              {passData.workOrderFileName && (
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Work Order Copy</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-700">{passData.workOrderFileName}</span>
                    <button
                      type="button"
                      onClick={() => window.open(`${AGENT_API}/vendor-pass/public/work-order/${vendorPassId}`, "_blank")}
                      className="flex items-center gap-1 text-[10px] font-bold text-blue-700 hover:text-blue-800 bg-white px-2 py-1 rounded shadow-sm border border-slate-200"
                    >
                      <Eye className="h-3 w-3" /> View
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Persons Section */}
        {approvedPersons.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <User className="h-5 w-5 text-emerald-500" />
              Approved Persons ({approvedPersons.length})
            </h2>

            <div className="grid gap-4 md:grid-cols-2">
              {approvedPersons.map((person, index) => (
                <div
                  key={index}
                  className="border border-slate-200 rounded-lg p-4 hover:border-emerald-300 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="bg-emerald-50 p-2 rounded-lg">
                      <User className="h-6 w-6 text-emerald-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-800 truncate">
                        {person.name}
                      </h3>
                      <p className="text-sm text-slate-500">
                        Pass: {person.personPassNo}
                      </p>
                      <p className="text-sm text-slate-500">
                        Mobile: {person.mobile || "N/A"}
                      </p>
                      {person.validTo && (
                        <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                          <Calendar className="h-3 w-3" />
                          Valid until: {person.validTo}
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleViewQR(person, "person", index)}
                    className="w-full mt-4 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    <QrCode className="h-4 w-4" />
                    View QR Code
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Vehicles Section */}
        {approvedVehicles.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Car className="h-5 w-5 text-emerald-500" />
              Approved Vehicles ({approvedVehicles.length})
            </h2>

            <div className="grid gap-4 md:grid-cols-2">
              {approvedVehicles.map((vehicle, index) => (
                <div
                  key={index}
                  className="border border-slate-200 rounded-lg p-4 hover:border-emerald-300 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="bg-blue-50 p-2 rounded-lg">
                      <Car className="h-6 w-6 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-800 truncate">
                        {vehicle.registrationNo}
                      </h3>
                      <p className="text-sm text-slate-500">
                        Pass: {vehicle.vehiclePassNo}
                      </p>
                      <p className="text-sm text-slate-500">
                        Type: {vehicle.vehicleType || "N/A"}
                      </p>
                      {vehicle.validTo && (
                        <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                          <Calendar className="h-3 w-3" />
                          Valid until: {vehicle.validTo}
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleViewQR(vehicle, "vehicle", index)}
                    className="w-full mt-4 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    <QrCode className="h-4 w-4" />
                    View QR Code
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rejected Section */}
        {(rejectedPersons.length > 0 || rejectedVehicles.length > 0) && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-rose-200">
            <h2 className="text-lg font-bold text-rose-700 mb-4 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Rejected Passes ({rejectedPersons.length + rejectedVehicles.length})
            </h2>

            <div className="space-y-4">
              {rejectedPersons.map((person, index) => (
                <div key={`rp-${index}`} className="bg-rose-50 rounded-lg p-4 flex flex-col md:flex-row gap-4 justify-between items-start">
                  <div className="flex items-start gap-4">
                    <div className="bg-white p-2 rounded-lg text-rose-500">
                      <User className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-rose-800">{person.name}</h3>
                      <p className="text-sm text-rose-600 font-medium mt-1">Reason: {person.rejectedReason || "Not specified"}</p>
                    </div>
                  </div>
                </div>
              ))}

              {rejectedVehicles.map((vehicle, index) => (
                <div key={`rv-${index}`} className="bg-rose-50 rounded-lg p-4 flex flex-col md:flex-row gap-4 justify-between items-start">
                  <div className="flex items-start gap-4">
                    <div className="bg-white p-2 rounded-lg text-rose-500">
                      <Car className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-rose-800">{vehicle.registrationNo}</h3>
                      <p className="text-sm text-rose-600 font-medium mt-1">Reason: {vehicle.rejectedReason || "Not specified"}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Resubmitted — pending re-review banner */}
        {passData?.status === 'VENDOR_SUBMITTED' && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-blue-200">
            <div className="flex items-start gap-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <RefreshCw className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-base font-bold text-blue-700 mb-1">Resubmitted — Awaiting Re-Review</h2>
                <p className="text-sm text-blue-600">Your updated passes have been submitted for re-approval. No further action is required at this time.</p>
              </div>
            </div>
          </div>
        )}

        {/* Reverted Section — only show when status is REVERTED (not after resubmission) */}
        {(passData?.status === 'REVERTED' || (!passData?.status && (revertedPersons.length > 0 || revertedVehicles.length > 0))) && (revertedPersons.length > 0 || revertedVehicles.length > 0) && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-orange-200">
            <h2 className="text-lg font-bold text-orange-700 mb-4 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Returned for Correction ({revertedPersons.length + revertedVehicles.length})
            </h2>

            <div className="space-y-4">
              {revertedPersons.map((person, index) => (
                <div key={`revp-${index}`} className="bg-orange-50 rounded-lg p-4 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                  <div className="flex items-start gap-4">
                    <div className="bg-white p-2 rounded-lg text-orange-500">
                      <User className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-orange-800">{person.name}</h3>
                      <p className="text-sm text-orange-600 font-medium mt-1">Please correct: {person.revertReason || "Check details"}</p>
                    </div>
                  </div>
                </div>
              ))}

              {revertedVehicles.map((vehicle, index) => (
                <div key={`revv-${index}`} className="bg-orange-50 rounded-lg p-4 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                  <div className="flex items-start gap-4">
                    <div className="bg-white p-2 rounded-lg text-orange-500">
                      <Car className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-orange-800">{vehicle.registrationNo}</h3>
                      <p className="text-sm text-orange-600 font-medium mt-1">Please correct: {vehicle.revertReason || "Check details"}</p>
                    </div>
                  </div>
                </div>
              ))}

              <div className="mt-4 pt-4 border-t border-orange-200">
                <p className="text-sm text-orange-700 mb-3 font-medium">To correct these passes, you need to click the button below and submit the requested changes.</p>
                <button
                  onClick={openEditModal}
                  className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-sm"
                >
                  <Edit3 className="h-4 w-4" />
                  Edit & Resubmit Passes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
          <h3 className="font-semibold text-amber-800 mb-2 flex items-center gap-2">
            <FileBadge className="h-5 w-5" />
            Important Instructions
          </h3>
          <ul className="text-amber-700 text-sm space-y-1 list-disc list-inside">
            <li>Click "View QR Code" to see your individual pass QR</li>
            <li>Download and save the QR code for offline use</li>
            <li>Show the QR code at the gate for scanning</li>
            <li>Each QR code is unique and linked to your approved pass</li>
            <li>QR codes are only valid for the approved date range</li>
          </ul>
        </div>

        {/* Footer */}
        <div className="text-center text-slate-400 text-sm mt-8">
          <p className="flex items-center justify-center gap-2">
            <Building2 className="h-4 w-4" />
            Chennai Port Authority
          </p>
          <p className="mt-1">Traffic Department</p>
        </div>
      </div>

      {/* REVERTED PASS EDIT MODAL */}
      {revertedEditModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in zoom-in-95 duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-200">

            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 bg-amber-600 text-white shrink-0">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Edit3 className="h-5 w-5" />
                  Edit & Resubmit Reverted Pass
                </h3>
                <p className="text-xs text-amber-100 mt-0.5">
                  Update reverted entries below, then resubmit for approval
                </p>
              </div>
              <button
                onClick={closeRevertedEditModal}
                className="text-white hover:text-amber-100 transition-colors p-1"
              >
                <CloseIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50">

              {/* Warning Banner */}
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl mb-6 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                <div className="text-sm text-amber-800">
                  <p className="font-semibold">Action Required</p>
                  <p>Please review and update all reverted entries below. Once all are updated, you can resubmit for approval.</p>
                </div>
              </div>

              {/* Reverted Persons */}
              {revertedPersons.length > 0 && (
                <div className="mb-8">
                  <h4 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    Reverted Persons ({revertedPersons.length})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {revertedPersons.map((person, idx) => (
                      <div
                        key={person.id || idx}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          person.status === 'updated'
                            ? 'bg-green-50 border-green-300'
                            : 'bg-white border-amber-300'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              person.status === 'updated' ? 'bg-green-100' : 'bg-amber-100'
                            }`}>
                              <User className={`h-5 w-5 ${
                                person.status === 'updated' ? 'text-green-600' : 'text-amber-600'
                              }`} />
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800">{person.name || 'Person'}</p>
                              <p className="text-xs text-slate-500 font-mono">{person.aadharNo || ''}</p>
                            </div>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            person.status === 'updated'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}>
                            {person.status === 'updated' ? 'Updated ✓' : 'Needs Update'}
                          </span>
                        </div>

                        {/* Revert Reason */}
                        {(person.revertReason || person.rejectedReason) && (
                          <div className="bg-red-50 border border-red-200 p-3 rounded-lg mb-3">
                            <p className="text-xs text-red-600 font-semibold mb-1">Revert Reason:</p>
                            <p className="text-sm text-red-700">{person.revertReason || person.rejectedReason}</p>
                          </div>
                        )}

                        {/* Edit Button */}
                        {person.status !== 'updated' && (
                          <button
                            onClick={() => handleEditEntity('person', idx, person)}
                            className="w-full bg-amber-500 hover:bg-amber-600 text-white py-2 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                          >
                            <Edit3 className="h-4 w-4" />
                            Update Person
                          </button>
                        )}
                        {person.status === 'updated' && (
                          <button
                            onClick={() => handleEditEntity('person', idx, person)}
                            className="w-full bg-slate-200 hover:bg-slate-300 text-slate-700 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                          >
                            <Edit3 className="h-4 w-4" />
                            Edit Again
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reverted Vehicles */}
              {revertedVehicles.length > 0 && (
                <div className="mb-8">
                  <h4 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Truck className="h-5 w-5 text-emerald-600" />
                    Reverted Vehicles ({revertedVehicles.length})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {revertedVehicles.map((vehicle, idx) => (
                      <div
                        key={vehicle.id || idx}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          vehicle.status === 'updated'
                            ? 'bg-green-50 border-green-300'
                            : 'bg-white border-amber-300'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              vehicle.status === 'updated' ? 'bg-green-100' : 'bg-amber-100'
                            }`}>
                              <Car className={`h-5 w-5 ${
                                vehicle.status === 'updated' ? 'text-green-600' : 'text-amber-600'
                              }`} />
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800">{vehicle.registrationNo || vehicle.regNo || 'Vehicle'}</p>
                              <p className="text-xs text-slate-500">{vehicle.vehicleType || ''}</p>
                            </div>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            vehicle.status === 'updated'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}>
                            {vehicle.status === 'updated' ? 'Updated ✓' : 'Needs Update'}
                          </span>
                        </div>

                        {/* Revert Reason */}
                        {(vehicle.revertReason || vehicle.rejectedReason) && (
                          <div className="bg-red-50 border border-red-200 p-3 rounded-lg mb-3">
                            <p className="text-xs text-red-600 font-semibold mb-1">Revert Reason:</p>
                            <p className="text-sm text-red-700">{vehicle.revertReason || vehicle.rejectedReason}</p>
                          </div>
                        )}

                        {/* Edit Button */}
                        {vehicle.status !== 'updated' && (
                          <button
                            onClick={() => handleEditEntity('vehicle', idx, vehicle)}
                            className="w-full bg-amber-500 hover:bg-amber-600 text-white py-2 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                          >
                            <Edit3 className="h-4 w-4" />
                            Update Vehicle
                          </button>
                        )}
                        {vehicle.status === 'updated' && (
                          <button
                            onClick={() => handleEditEntity('vehicle', idx, vehicle)}
                            className="w-full bg-slate-200 hover:bg-slate-300 text-slate-700 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                          >
                            <Edit3 className="h-4 w-4" />
                            Edit Again
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* All Updated Message */}
              {revertedPersons.length + revertedVehicles.length > 0 &&
               revertedPersons.every(p => p.status === 'updated') &&
               revertedVehicles.every(v => v.status === 'updated') && (
                <div className="bg-green-50 border border-green-200 p-4 rounded-xl flex items-center gap-3 mb-2">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                  <div>
                    <p className="font-semibold text-green-800">All entities updated!</p>
                    <p className="text-sm text-green-700">You can now resubmit your pass for approval.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 bg-white flex justify-between items-center shrink-0">
              <button
                onClick={closeRevertedEditModal}
                className="bg-slate-200 text-slate-800 px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleResubmitPass}
                disabled={
                  submitLoading ||
                  revertedPersons.some(p => p.status !== 'updated') ||
                  revertedVehicles.some(v => v.status !== 'updated')
                }
                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center gap-2 ${
                  submitLoading ||
                  revertedPersons.some(p => p.status !== 'updated') ||
                  revertedVehicles.some(v => v.status !== 'updated')
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : 'bg-amber-500 hover:bg-amber-600 text-white'
                }`}
              >
                {submitLoading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Resubmitting...</>
                ) : (
                  <><RefreshCw className="h-4 w-4" /> Resubmit Pass to Traffic Dept</>
                )}
              </button>
            </div>
          </div>
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
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="p-8 overflow-y-auto flex-1 bg-slate-50 space-y-8">

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
                          className={`w-full h-10 border rounded-lg text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 px-3 shadow-sm outline-none transition-all ${personErrors.aadharNo
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
                              `${AGENT_API}/pass-request/viewPassRequestsDocument?passRequestId=${personForm.existingPassRequestId}&documentType=personAadhar&isVendorPass=true&entityIndex=${editingRevertedEntity?.index ?? 0}`,
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
                            window.open(
                              `${AGENT_API}/pass-request/viewPassRequestsDocument?passRequestId=${personForm.existingPassRequestId}&documentType=passportDoc&isVendorPass=true&entityIndex=${editingRevertedEntity?.index ?? 0}`,
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
                              `${AGENT_API}/pass-request/viewPassRequestsDocument?passRequestId=${personForm.existingPassRequestId}&documentType=cdcDocument&isVendorPass=true&entityIndex=${editingRevertedEntity?.index ?? 0}`,
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
                              `${AGENT_API}/pass-request/viewPassRequestsDocument?passRequestId=${personForm.existingPassRequestId}&documentType=declarationForm&isVendorPass=true&entityIndex=${editingRevertedEntity?.index ?? 0}`,
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
                              : `${AGENT_API}/pass-request/viewPassRequestsDocument?passRequestId=${personForm.existingPassRequestId}&documentType=personPhoto&isVendorPass=true&entityIndex=${editingRevertedEntity?.index ?? 0}`
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
                          <CloseIcon className="h-3.5 w-3.5" />
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
                          `${AGENT_API}/pass-request/viewPassRequestsDocument?passRequestId=${personForm.existingPassRequestId}&documentType=personIdProof&isVendorPass=true&entityIndex=${editingRevertedEntity?.index ?? 0}`,
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
                        {["2", "MONTHLY"].includes(String(personForm.passType)) && (
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

              {["2", "3", "MONTHLY", "ANNUAL", "YEARLY"].includes(String(personForm.passType)) && (
              <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-3 flex items-center gap-2">
                  <FileCheck2 className="h-5 w-5 text-orange-500" /> 2.
                  Mandatory Documents
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <FileUploadBox
                    label="Police Verification Certificate"
                    isRequired
                    file={personForm.policeVerification}
                    existingFileName={personForm.existingPoliceName}
                    onView={() =>
                      window.open(
                        `${AGENT_API}/pass-request/viewPassRequestsDocument?passRequestId=${personForm.existingPassRequestId}&documentType=policeVerification&isVendorPass=true&entityIndex=${editingRevertedEntity?.index ?? 0}`,
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
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="p-8 overflow-y-auto flex-1 bg-slate-50/50 space-y-8">

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
                      window.open(
                        `${AGENT_API}/pass-request/viewPassRequestsDocument?passRequestId=${vehicleForm.existingPassRequestId}&documentType=vehicleRC&isVendorPass=true&entityIndex=${editingRevertedEntity?.index ?? 0}`,
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
                        `${AGENT_API}/pass-request/viewPassRequestsDocument?passRequestId=${vehicleForm.existingPassRequestId}&documentType=vehicleInsurance&isVendorPass=true&entityIndex=${editingRevertedEntity?.index ?? 0}`,
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
                        `${AGENT_API}/pass-request/viewPassRequestsDocument?passRequestId=${vehicleForm.existingPassRequestId}&documentType=vehiclePermit&isVendorPass=true&entityIndex=${editingRevertedEntity?.index ?? 0}`,
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
                        `${AGENT_API}/pass-request/viewPassRequestsDocument?passRequestId=${vehicleForm.existingPassRequestId}&documentType=vehicleFitness&isVendorPass=true&entityIndex=${editingRevertedEntity?.index ?? 0}`,
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
                  {["2", "3", "MONTHLY", "ANNUAL", "YEARLY"].includes(String(vehicleForm.passType)) && (
                    <>
                      <FileUploadBox
                        label="Tax Document"
                        isRequired
                        file={vehicleForm.taxDoc}
                        existingFileName={vehicleForm.existingTaxName}
                        onView={() =>
                          window.open(
                            `${AGENT_API}/pass-request/viewPassRequestsDocument?passRequestId=${vehicleForm.existingPassRequestId}&documentType=vehicleTax&isVendorPass=true&entityIndex=${editingRevertedEntity?.index ?? 0}`,
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
                            `${AGENT_API}/pass-request/viewPassRequestsDocument?passRequestId=${vehicleForm.existingPassRequestId}&documentType=vehicleEmission&isVendorPass=true&entityIndex=${editingRevertedEntity?.index ?? 0}`,
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
</div>
  );
}
