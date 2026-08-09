"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  BadgeCheck,
  Car,
  FileText,
  Plus,
  Upload,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getVvipPass,
  resubmitVvipPass,
  submitVvipPass,
} from "@/lib/vvipPassApi";

const emptyPerson = {
  name: "",
  designation: "",
  mobile: "",
  idProofType: "",
  idProofNo: "",
  idProofFilePath: "",
  documentPath: "",
  idProofFile: null,
  document: null,
};

const emptyVehicle = {
  vehicleNo: "",
  vehicleType: "",
  driverName: "",
  driverMobile: "",
  rcBookPath: "",
  insuranceDocumentPath: "",
  rcBook: null,
  insuranceDocument: null,
};

const MAX_PERSONS = 10;
const MAX_VEHICLES = 10;

const inputClass =
  "w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100 dark:border-white/10 dark:bg-slate-950 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-orange-400 dark:focus:ring-orange-400/10";

const fileLabelClass =
  "flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 text-sm font-semibold text-slate-500 transition-colors hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600 dark:border-white/10 dark:bg-slate-950 dark:text-stone-400 dark:hover:border-orange-400/60 dark:hover:bg-orange-400/10 dark:hover:text-orange-300";

const visitorNamePattern = /^[A-Za-z][A-Za-z .'-]*$/;
const designationPattern = /^[A-Za-z][A-Za-z .,'/&()-]*$/;
const indianMobilePattern = /^[6-9]\d{9}$/;

const removeNumbers = (value) => value.replace(/[0-9]/g, "");

const toDateTimeLocalValue = (date) => {
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 16);
};

const toDateInputValue = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toISOString().slice(0, 10);
};

const toDateTimeInputValue = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return toDateTimeLocalValue(date);
};

const fileDisplayName = (file, path, fallback) => {
  if (file?.name) return file.name;
  if (path) return String(path).split("/").pop();
  return fallback;
};

const getLoggedInHodDepartment = () => {
  if (typeof window === "undefined") return "";

  try {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) return "";

    const parsedUser = JSON.parse(storedUser);
    return (
      parsedUser?.departmentName ||
      parsedUser?.department ||
      parsedUser?.department_name ||
      ""
    );
  } catch {
    return "";
  }
};

export default function HodVvipPassPage() {
  const [editingRequestId, setEditingRequestId] = useState(null);
  const [hodDepartment] = useState(getLoggedInHodDepartment);
  const [requestDetails, setRequestDetails] = useState({
    department: hodDepartment,
    visitPurpose: "",
    visitDate: "",
    validityFrom: "",
    validityTo: "",
    noOfPasses: "",
    remarks: "",
  });
  const [persons, setPersons] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [personModalOpen, setPersonModalOpen] = useState(false);
  const [vehicleModalOpen, setVehicleModalOpen] = useState(false);
  const [personForm, setPersonForm] = useState(emptyPerson);
  const [personErrors, setPersonErrors] = useState({});
  const [vehicleForm, setVehicleForm] = useState(emptyVehicle);
  const [editingPersonIndex, setEditingPersonIndex] = useState(null);
  const [editingVehicleIndex, setEditingVehicleIndex] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingRequest, setIsLoadingRequest] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestId = params.get("id");
    if (!requestId) return;

    let cancelled = false;

    const loadReturnedRequest = async () => {
      try {
        setIsLoadingRequest(true);
        const request = await getVvipPass(requestId);
        if (cancelled) return;

        if (request.status !== "RETURNED") {
          toast.error("Only returned VVIP pass requests can be edited and resubmitted.");
          return;
        }

        setEditingRequestId(request.id);
        setRequestDetails({
          department: request.departmentName || hodDepartment,
          visitPurpose: request.visitPurpose || "",
          visitDate: toDateInputValue(request.visitDate),
          validityFrom: toDateTimeInputValue(request.validityFrom),
          validityTo: toDateTimeInputValue(request.validityTo),
          noOfPasses: request.noOfPasses ? String(request.noOfPasses) : "",
          remarks: request.remarks || "",
        });
        setPersons(
          (request.persons || []).map((person) => ({
            name: person.name || "",
            designation: person.designation || "",
            mobile: person.mobile || "",
            idProofType: person.idProofType || "",
            idProofNo: person.idProofNo || "",
            idProofFilePath: person.idProofFilePath || "",
            documentPath: person.documentPath || "",
            idProofFile: null,
            document: null,
          })),
        );
        setVehicles(
          (request.vehicles || []).map((vehicle) => ({
            vehicleNo: vehicle.vehicleNo || "",
            vehicleType: vehicle.vehicleType || "",
            driverName: vehicle.driverName || "",
            driverMobile: vehicle.driverMobile || "",
            rcBookPath: vehicle.rcBookPath || "",
            insuranceDocumentPath: vehicle.insuranceDocumentPath || "",
            rcBook: null,
            insuranceDocument: null,
          })),
        );
        if (request.rejectedReason) {
          toast.warning(`Traffic returned this request: ${request.rejectedReason}`);
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(
            error?.response?.data?.message || "Failed to load returned VVIP pass request.",
          );
        }
      } finally {
        if (!cancelled) setIsLoadingRequest(false);
      }
    };

    loadReturnedRequest();
    return () => {
      cancelled = true;
    };
  }, [hodDepartment]);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const passLimit = useMemo(() => {
    const requestedPasses = Number(requestDetails.noOfPasses);
    return requestedPasses > 0 ? Math.min(requestedPasses, 10) : 10;
  }, [requestDetails.noOfPasses]);
  const maxValidityTo = useMemo(() => {
    if (!requestDetails.validityFrom) return "";

    const fromDate = new Date(requestDetails.validityFrom);
    if (Number.isNaN(fromDate.getTime())) return "";

    const maxDate = new Date(fromDate);
    maxDate.setDate(maxDate.getDate() + 2);
    return toDateTimeLocalValue(maxDate);
  }, [requestDetails.validityFrom]);

  const updateRequest = (field, value) => {
    if (field === "noOfPasses") {
      const numericValue = value.replace(/\D/g, "");
      const cappedValue = numericValue ? String(Math.min(Number(numericValue), 10)) : "";
      setRequestDetails((prev) => ({ ...prev, noOfPasses: cappedValue }));
      if (cappedValue) {
        setPersons((prev) => prev.slice(0, Number(cappedValue)));
      }
      return;
    }

    if (field === "validityFrom") {
      const maxDate = value ? new Date(value) : null;
      if (maxDate) maxDate.setDate(maxDate.getDate() + 2);
      const maxValue = maxDate ? toDateTimeLocalValue(maxDate) : "";

      setRequestDetails((prev) => ({
        ...prev,
        validityFrom: value,
        validityTo:
          prev.validityTo && maxValue && prev.validityTo > maxValue
            ? maxValue
            : prev.validityTo,
      }));
      return;
    }

    if (field === "validityTo" && maxValidityTo && value > maxValidityTo) {
      setRequestDetails((prev) => ({ ...prev, validityTo: maxValidityTo }));
      return;
    }

    setRequestDetails((prev) => ({ ...prev, [field]: value }));
  };

  const openAddPerson = () => {
    if (persons.length >= passLimit) {
      toast.error(`Only ${passLimit} VVIP person(s) can be added for this request.`);
      return;
    }

    setPersonForm(emptyPerson);
    setPersonErrors({});
    setEditingPersonIndex(null);
    setPersonModalOpen(true);
  };

  const savePerson = () => {
    const hasIdType = Boolean(personForm.idProofType);
    const hasIdNumber = Boolean(personForm.idProofNo.trim());
    const hasIdProofFile = Boolean(personForm.idProofFile || personForm.idProofFilePath);
    const visitorMobile = personForm.mobile.trim();
    const visitorName = personForm.name.trim();
    const hasPersonInfo = [
      personForm.name,
      personForm.designation,
      personForm.mobile,
      personForm.idProofType,
      personForm.idProofNo,
      personForm.idProofFilePath,
      personForm.documentPath,
    ].some((value) => String(value || "").trim()) || Boolean(personForm.idProofFile || personForm.document);

    if (!hasPersonInfo) {
      toast.error("Enter at least one VVIP person detail before adding.");
      return;
    }

    const errors = {};

    if (!visitorName) {
      errors.name = "Visitor Name is required.";
    } else if (!visitorNamePattern.test(visitorName)) {
      errors.name = "Visitor Name should contain alphabets only.";
    }

    if (
      personForm.designation.trim() &&
      !designationPattern.test(personForm.designation.trim())
    ) {
      errors.designation = "Designation should contain alphabets only.";
    }

    if (visitorMobile && !indianMobilePattern.test(visitorMobile)) {
      errors.mobile = "Enter a valid 10-digit mobile number starting with 6, 7, 8, or 9.";
    }

    if (Object.keys(errors).length) {
      setPersonErrors(errors);
      return;
    }

    if (hasIdType && (!hasIdNumber || !hasIdProofFile)) {
      toast.error(
        "If ID Proof Type is selected, ID Proof Number and Copy of ID Proof are required.",
      );
      return;
    }

    if (editingPersonIndex !== null) {
      setPersons((prev) =>
        prev.map((person, index) =>
          index === editingPersonIndex ? personForm : person,
        ),
      );
    } else {
      if (persons.length >= passLimit) {
        toast.error(`Only ${passLimit} VVIP person(s) can be added for this request.`);
        return;
      }
      setPersons((prev) => [...prev, personForm]);
    }
    setPersonModalOpen(false);
    setPersonForm(emptyPerson);
    setPersonErrors({});
    setEditingPersonIndex(null);
  };

  const editPerson = (index) => {
    setPersonForm(persons[index]);
    setPersonErrors({});
    setEditingPersonIndex(index);
    setPersonModalOpen(true);
  };

  const deletePerson = (index) => {
    setPersons((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const openAddVehicle = () => {
    if (vehicles.length >= MAX_VEHICLES) {
      toast.error(`Only ${MAX_VEHICLES} vehicle(s) can be added for this request.`);
      return;
    }

    setVehicleForm(emptyVehicle);
    setEditingVehicleIndex(null);
    setVehicleModalOpen(true);
  };

  const saveVehicle = () => {
    const driverMobile = vehicleForm.driverMobile.trim();
    const hasVehicleIdentity = [
      vehicleForm.vehicleNo,
      vehicleForm.vehicleType,
      vehicleForm.driverName,
      vehicleForm.driverMobile,
    ].some((value) => String(value || "").trim());

    if (!hasVehicleIdentity) {
      toast.error("Enter vehicle or driver details before adding a vehicle.");
      return;
    }

    if (driverMobile && !/^\d{10}$/.test(driverMobile)) {
      toast.error("Driver Mobile Number must be exactly 10 digits.");
      return;
    }

    if (
      (!vehicleForm.rcBook && !vehicleForm.rcBookPath) ||
      (!vehicleForm.insuranceDocument && !vehicleForm.insuranceDocumentPath)
    ) {
      toast.error("RC Book and Insurance Document are mandatory for vehicle pass.");
      return;
    }

    if (editingVehicleIndex !== null) {
      setVehicles((prev) =>
        prev.map((vehicle, index) =>
          index === editingVehicleIndex ? vehicleForm : vehicle,
        ),
      );
    } else {
      if (vehicles.length >= MAX_VEHICLES) {
        toast.error(`Only ${MAX_VEHICLES} vehicle(s) can be added for this request.`);
        return;
      }
      setVehicles((prev) => [...prev, vehicleForm]);
    }
    setVehicleModalOpen(false);
    setVehicleForm(emptyVehicle);
    setEditingVehicleIndex(null);
  };

  const editVehicle = (index) => {
    setVehicleForm(vehicles[index]);
    setEditingVehicleIndex(index);
    setVehicleModalOpen(true);
  };

  const deleteVehicle = (index) => {
    setVehicles((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const clearForm = () => {
    setRequestDetails({
      department: hodDepartment,
      visitPurpose: "",
      visitDate: "",
      validityFrom: "",
      validityTo: "",
      noOfPasses: "",
      remarks: "",
    });
    setPersons([]);
    setVehicles([]);
  };

  const submitForTrafficApproval = async () => {
    try {
      setIsSubmitting(true);

      if (!(requestDetails.department || hodDepartment).trim()) {
        toast.error("Department is required.");
        return;
      }
      if (!requestDetails.visitPurpose.trim()) {
        toast.error("Visit Purpose is required.");
        return;
      }
      if (!requestDetails.visitDate) {
        toast.error("Visit Date is required.");
        return;
      }
      if (!requestDetails.validityFrom || !requestDetails.validityTo) {
        toast.error("Validity From and Validity To are required.");
        return;
      }
      if (!requestDetails.noOfPasses) {
        toast.error("No. of Passes is required.");
        return;
      }
      const requestedPassCount = Number(requestDetails.noOfPasses);
      if (!requestedPassCount || requestedPassCount < 1 || requestedPassCount > MAX_PERSONS) {
        toast.error(`No. of Passes must be between 1 and ${MAX_PERSONS}.`);
        return;
      }
      if (!persons.length) {
        toast.error("Add at least one VVIP person before submitting.");
        return;
      }
      if (persons.length !== requestedPassCount) {
        toast.error(
          `No. of Passes is ${requestedPassCount}, so add exactly ${requestedPassCount} VVIP person(s) before submitting.`,
        );
        return;
      }
      if (persons.some((person) => !person.name.trim())) {
        toast.error("VVIP person name is required.");
        return;
      }

      const formData = new FormData();
      formData.append("department", requestDetails.department || hodDepartment || "");
      formData.append("visitPurpose", requestDetails.visitPurpose || "");
      formData.append("visitDate", requestDetails.visitDate || "");
      formData.append("validityFrom", requestDetails.validityFrom || "");
      formData.append("validityTo", requestDetails.validityTo || "");
      formData.append("noOfPasses", requestedPassCount);
      formData.append("remarks", requestDetails.remarks || "");

      formData.append(
        "persons",
        JSON.stringify(
          persons.map(({ idProofFile, document, ...person }) => person),
        ),
      );
      persons.forEach((person, index) => {
        if (person.idProofFile) {
          formData.append(`person_${index}_idProofFile`, person.idProofFile);
        }
        if (person.document) {
          formData.append(`person_${index}_document`, person.document);
        }
      });

      formData.append(
        "vehicles",
        JSON.stringify(
          vehicles.map(({ rcBook, insuranceDocument, ...vehicle }) => vehicle),
        ),
      );
      vehicles.forEach((vehicle, index) => {
        if (vehicle.rcBook) {
          formData.append(`vehicle_${index}_rcBook`, vehicle.rcBook);
        }
        if (vehicle.insuranceDocument) {
          formData.append(`vehicle_${index}_insuranceDocument`, vehicle.insuranceDocument);
        }
      });

      const created = editingRequestId
        ? await resubmitVvipPass(editingRequestId, formData)
        : await submitVvipPass(formData);
      toast.success(
        `VVIP pass request ${editingRequestId ? "resubmitted" : "submitted"} successfully${created?.referenceNo ? ` (${created.referenceNo})` : ""}.`,
      );
      if (editingRequestId) {
        setEditingRequestId(null);
        window.history.replaceState(null, "", "/hod/vvip-pass");
      }
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Failed to submit VVIP pass request.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full space-y-8 font-sans text-slate-800 dark:text-stone-200">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="mt-1 text-3xl font-bold text-[#0a1e4d] dark:text-white">
            {editingRequestId ? "Edit Returned VVIP Pass" : "VVIP Pass Request"}
          </h2>
        </div>
        <Link
          href="/hod/vvip-pass/requests"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-[#0a1e4d] shadow-sm transition hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900 dark:text-stone-100 dark:hover:bg-white/5"
        >
          <FileText className="h-4 w-4 text-orange-500" />
          View VVIP Requests
        </Link>
      </div>

      {isLoadingRequest && (
        <div className="rounded-2xl border border-orange-200 bg-orange-50 px-5 py-4 text-sm font-bold text-orange-700 dark:border-orange-400/20 dark:bg-orange-400/10 dark:text-orange-300">
          Loading returned VVIP request...
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900">
        <div className="border-b border-slate-100 bg-slate-50 px-6 py-4 dark:border-white/10 dark:bg-white/5">
          <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-[#0a1e4d] dark:text-white">
            <BadgeCheck className="h-5 w-5 text-orange-500" />
            General Information:
          </h3>
        </div>

        <div className="space-y-6 p-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-stone-300">
                Department *
              </label>
              <input
                className={inputClass}
                readOnly
                placeholder="HOD department"
                value={requestDetails.department || hodDepartment}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-stone-300">
                Visit Purpose *
              </label>
              <input
                className={inputClass}
                placeholder="Official visit / meeting / inspection"
                value={requestDetails.visitPurpose}
                onChange={(e) => updateRequest("visitPurpose", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-stone-300">
                No. of Passes *
              </label>
              <input
                className={inputClass}
                inputMode="numeric"
                max="10"
                min="1"
                placeholder="Max 10 per day"
                type="number"
                value={requestDetails.noOfPasses}
                onChange={(e) => updateRequest("noOfPasses", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-stone-300">
                Visit Date *
              </label>
              <input
                className={inputClass}
                min={today}
                type="date"
                value={requestDetails.visitDate}
                onChange={(e) => updateRequest("visitDate", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-stone-300">
                Validity From *
              </label>
              <input
                className={inputClass}
                min={toDateTimeLocalValue(new Date())}
                type="datetime-local"
                value={requestDetails.validityFrom}
                onChange={(e) => updateRequest("validityFrom", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-stone-300">
                Validity To *
              </label>
              <input
                className={inputClass}
                min={requestDetails.validityFrom || toDateTimeLocalValue(new Date())}
                max={maxValidityTo}
                type="datetime-local"
                value={requestDetails.validityTo}
                onChange={(e) => updateRequest("validityTo", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-stone-300">
              Purpose / Remarks
            </label>
            <textarea
              className="min-h-28 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100 dark:border-white/10 dark:bg-slate-950 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:ring-orange-400/10"
              placeholder="Enter visit purpose and remarks"
              value={requestDetails.remarks}
              onChange={(e) => updateRequest("remarks", e.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4 dark:border-white/10 dark:bg-white/5">
          <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-[#0a1e4d] dark:text-white">
            <Users className="h-5 w-5 text-orange-500" />
            Detail of VVIP Persons:
          </h3>
          <Badge
            variant="outline"
            className="h-auto rounded-lg border-slate-200 bg-white px-4 py-1.5 text-sm font-black text-[#0a1e4d] shadow-sm dark:border-white/10 dark:bg-slate-950 dark:text-stone-100"
          >
            Total: {persons.length}
          </Badge>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#0a1e4d] text-white">
              <tr>
                <th className="border-r border-white/10 px-4 py-3 text-xs font-semibold uppercase tracking-wider">
                  SNo.
                </th>
                <th className="border-r border-white/10 px-4 py-3 text-xs font-semibold uppercase tracking-wider">
                  Name & Desig.
                </th>
                <th className="border-r border-white/10 px-4 py-3 text-xs font-semibold uppercase tracking-wider">
                  Mobile
                </th>
                <th className="border-r border-white/10 px-4 py-3 text-xs font-semibold uppercase tracking-wider">
                  ID Proof
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/10">
              {persons.length === 0 && (
                <tr>
                  <td
                    colSpan="5"
                    className="bg-white p-10 text-center text-sm italic text-slate-400 dark:bg-slate-900 dark:text-stone-500"
                  >
                    No VVIP persons added yet. Click Add Person below.
                  </td>
                </tr>
              )}
              {persons.map((person, index) => (
                <tr
                  key={`${person.name}-${index}`}
                  className="cursor-pointer transition-colors hover:bg-orange-50/50 dark:hover:bg-orange-400/10"
                  onClick={() => editPerson(index)}
                >
                  <td className="border-r border-slate-100 px-4 py-4 text-sm font-medium text-slate-500 dark:border-white/10 dark:text-stone-400">
                    {String(index + 1).padStart(2, "0")}
                  </td>
                  <td className="border-r border-slate-100 px-4 py-4 dark:border-white/10">
                    <p className="text-sm font-bold text-[#0a1e4d] dark:text-stone-100">
                      {person.name || "-"}
                    </p>
                    <p className="text-xs font-medium text-slate-500 dark:text-stone-400">
                      {person.designation || "-"}
                    </p>
                  </td>
                  <td className="border-r border-slate-100 px-4 py-4 text-sm font-semibold text-slate-700 dark:border-white/10 dark:text-stone-200">
                    {person.mobile || "-"}
                  </td>
                  <td className="border-r border-slate-100 px-4 py-4 text-sm font-semibold text-slate-700 dark:border-white/10 dark:text-stone-200">
                    {person.idProofType || person.idProofNo
                      ? [person.idProofType, person.idProofNo].filter(Boolean).join(" - ")
                      : "-"}
                  </td>
                  <td className="px-4 py-4 text-center">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={(event) => {
                        event.stopPropagation();
                        deletePerson(index);
                      }}
                      className="rounded-lg px-3 py-1 text-xs font-bold"
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end border-t border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-900">
          <Button
            type="button"
            disabled={persons.length >= passLimit}
            onClick={openAddPerson}
            className="h-auto rounded-xl bg-orange-600 px-6 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-lg transition-all hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none"
          >
            {persons.length >= passLimit ? "Person Limit Reached" : "Add Person"}
          </Button>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4 dark:border-white/10 dark:bg-white/5">
          <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-[#0a1e4d] dark:text-white">
            <Car className="h-5 w-5 text-orange-500" />
            Detail of Vehicles:
          </h3>
          <Badge
            variant="outline"
            className="h-auto rounded-lg border-slate-200 bg-white px-4 py-1.5 text-sm font-black text-[#0a1e4d] shadow-sm dark:border-white/10 dark:bg-slate-950 dark:text-stone-100"
          >
            Total: {vehicles.length}
          </Badge>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#0a1e4d] text-white">
              <tr>
                <th className="border-r border-white/10 px-4 py-3 text-xs font-semibold uppercase tracking-wider">
                  SNo.
                </th>
                <th className="border-r border-white/10 px-4 py-3 text-xs font-semibold uppercase tracking-wider">
                  Vehicle No. & Type
                </th>
                <th className="border-r border-white/10 px-4 py-3 text-xs font-semibold uppercase tracking-wider">
                  Driver
                </th>
                <th className="border-r border-white/10 px-4 py-3 text-xs font-semibold uppercase tracking-wider">
                  Document
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/10">
              {vehicles.length === 0 && (
                <tr>
                  <td
                    colSpan="5"
                    className="bg-white p-10 text-center text-sm italic text-slate-400 dark:bg-slate-900 dark:text-stone-500"
                  >
                    No vehicles added yet. Click Add Vehicle below.
                  </td>
                </tr>
              )}
              {vehicles.map((vehicle, index) => (
                <tr
                  key={`${vehicle.vehicleNo}-${index}`}
                  className="cursor-pointer transition-colors hover:bg-orange-50/50 dark:hover:bg-orange-400/10"
                  onClick={() => editVehicle(index)}
                >
                  <td className="border-r border-slate-100 px-4 py-4 text-sm font-medium text-slate-500 dark:border-white/10 dark:text-stone-400">
                    {String(index + 1).padStart(2, "0")}
                  </td>
                  <td className="border-r border-slate-100 px-4 py-4 dark:border-white/10">
                    <p className="text-sm font-bold text-[#0a1e4d] dark:text-stone-100">
                      {vehicle.vehicleNo || "-"}
                    </p>
                    <p className="text-xs font-medium text-slate-500 dark:text-stone-400">
                      {vehicle.vehicleType || "-"}
                    </p>
                  </td>
                  <td className="border-r border-slate-100 px-4 py-4 dark:border-white/10">
                    <p className="text-sm font-semibold text-slate-700 dark:text-stone-200">
                      {vehicle.driverName || "-"}
                    </p>
                    <p className="text-xs font-medium text-slate-500 dark:text-stone-400">
                      {vehicle.driverMobile || "-"}
                    </p>
                  </td>
                  <td className="border-r border-slate-100 px-4 py-4 dark:border-white/10 text-sm font-semibold text-slate-700 dark:border-white/10 dark:text-stone-200">
                    <p>{fileDisplayName(vehicle.rcBook, vehicle.rcBookPath, "RC Book missing")}</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-stone-400">
                      {fileDisplayName(
                        vehicle.insuranceDocument,
                        vehicle.insuranceDocumentPath,
                        "Insurance missing",
                      )}
                    </p>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={(event) => {
                        event.stopPropagation();
                        deleteVehicle(index);
                      }}
                      className="rounded-lg px-3 py-1 text-xs font-bold"
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end border-t border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-900">
          <Button
            type="button"
            disabled={vehicles.length >= MAX_VEHICLES}
            onClick={openAddVehicle}
            className="h-auto rounded-xl bg-orange-600 px-6 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-lg transition-all hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none"
          >
            {vehicles.length >= MAX_VEHICLES ? "Vehicle Limit Reached" : "Add Vehicle"}
          </Button>
        </div>
      </section>

      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={clearForm}
          className="h-auto rounded-xl border-slate-300 bg-white px-8 py-3 text-sm font-bold uppercase tracking-wider text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-white/10 dark:bg-slate-950 dark:text-stone-200 dark:hover:bg-white/5"
        >
          Clear
        </Button>
        <Button
          type="button"
          disabled={isSubmitting}
          onClick={submitForTrafficApproval}
          className="h-auto rounded-xl bg-orange-600 px-10 py-3 text-sm font-bold uppercase tracking-wider text-white shadow-lg shadow-orange-600/20 transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none"
        >
          {isSubmitting
            ? "Submitting..."
            : editingRequestId
              ? "Resubmit VVIP Pass"
              : "Submit VVIP Pass"}
        </Button>
      </div>

      {personModalOpen && (
        <Modal title={editingPersonIndex !== null ? "Edit Person" : "Add Person"} onClose={() => {
          setPersonModalOpen(false);
          setPersonErrors({});
        }}>
          <div className="space-y-6">
            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900">
              <h4 className="mb-5 border-b border-slate-100 pb-3 text-sm font-black uppercase tracking-widest text-slate-800 dark:border-white/10 dark:text-stone-100">
                1. VVIP Visitor Details
              </h4>
              <div className="grid grid-cols-1 gap-x-5 gap-y-5 md:grid-cols-2">
                <Field label="Visitor Name" error={personErrors.name}>
                  <input
                    className={`${inputClass} ${personErrors.name ? "border-red-400 focus:border-red-400 focus:ring-red-100 dark:border-red-400/60 dark:focus:ring-red-400/10" : ""}`}
                    maxLength={80}
                    placeholder="Enter visitor full name"
                    value={personForm.name}
                    onChange={(e) => {
                      const rawValue = e.target.value;
                      const cleanedValue = removeNumbers(rawValue);
                      setPersonErrors((prev) => ({
                        ...prev,
                        name: /\d/.test(rawValue)
                          ? "Visitor Name should contain alphabets only."
                          : "",
                      }));
                      setPersonForm((prev) => ({ ...prev, name: cleanedValue }));
                    }}
                  />
                </Field>
                <Field label="Visitor Mobile Number" error={personErrors.mobile}>
                  <input
                    className={`${inputClass} ${personErrors.mobile ? "border-red-400 focus:border-red-400 focus:ring-red-100 dark:border-red-400/60 dark:focus:ring-red-400/10" : ""}`}
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="Enter 10-digit mobile"
                    value={personForm.mobile}
                    onChange={(e) => {
                      const mobile = e.target.value.replace(/\D/g, "").slice(0, 10);
                      setPersonErrors((prev) => ({
                        ...prev,
                        mobile:
                          mobile && !indianMobilePattern.test(mobile)
                            ? "Enter a valid 10-digit mobile number starting with 6, 7, 8, or 9."
                            : "",
                      }));
                      setPersonForm((prev) => ({
                        ...prev,
                        mobile,
                      }));
                    }}
                  />
                </Field>
                <Field label="Visitor Designation / Role" error={personErrors.designation}>
                  <input
                    className={`${inputClass} ${personErrors.designation ? "border-red-400 focus:border-red-400 focus:ring-red-100 dark:border-red-400/60 dark:focus:ring-red-400/10" : ""}`}
                    placeholder="e.g. Minister / Officer / Guest"
                    value={personForm.designation}
                    onChange={(e) => {
                      const rawValue = e.target.value;
                      const cleanedValue = removeNumbers(rawValue);
                      setPersonErrors((prev) => ({
                        ...prev,
                        designation: /\d/.test(rawValue)
                          ? "Designation should contain alphabets only."
                          : "",
                      }));
                      setPersonForm((prev) => ({
                        ...prev,
                        designation: cleanedValue,
                      }));
                    }}
                  />
                </Field>
                <Field label="ID Proof Type">
                  <select
                    className={inputClass}
                    value={personForm.idProofType}
                    onChange={(e) => {
                      setPersonForm((prev) => ({
                        ...prev,
                        idProofType: e.target.value,
                      }));
                    }}
                  >
                    <option value="">-- Select --</option>
                    <option value="Aadhaar">Aadhaar</option>
                    <option value="Passport">Passport</option>
                    <option value="PAN">PAN</option>
                    <option value="Driving Licence">Driving Licence</option>
                    <option value="Other">Other</option>
                  </select>
                </Field>
                <Field
                  label={
                    personForm.idProofType
                      ? "ID Proof Number *"
                      : "ID Proof Number"
                  }
                >
                  <input
                    className={inputClass}
                    placeholder="Enter selected ID proof number"
                    value={personForm.idProofNo}
                    onChange={(e) => {
                      setPersonForm((prev) => ({
                        ...prev,
                        idProofNo: e.target.value.toUpperCase(),
                      }));
                    }}
                  />
                </Field>
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900">
              <h4 className="mb-5 border-b border-slate-100 pb-3 text-sm font-black uppercase tracking-widest text-slate-800 dark:border-white/10 dark:text-stone-100">
                2. Documents
              </h4>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                <FileField
                  label={
                    personForm.idProofType
                      ? "Copy of ID Proof *"
                      : "Copy of ID Proof (Optional)"
                  }
                  file={personForm.idProofFile}
                  onChange={(file) => {
                    setPersonForm((prev) => ({ ...prev, idProofFile: file }))
                  }}
                />
                <FileField
                  label="Additional Document (Optional)"
                  file={personForm.document}
                  onChange={(file) => {
                    setPersonForm((prev) => ({ ...prev, document: file }))
                  }}
                />
              </div>
            </section>
          </div>

          <ModalActions
            onClear={() => {
              setPersonForm(emptyPerson);
            }}
            onSave={savePerson}
            saveLabel={editingPersonIndex !== null ? "Update Person" : "Add Person"}
          />
        </Modal>
      )}

      {vehicleModalOpen && (
        <Modal title={editingVehicleIndex !== null ? "Edit Vehicle" : "Add Vehicle"} onClose={() => setVehicleModalOpen(false)}>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Field label="Vehicle Number">
              <input
                className={inputClass}
                placeholder="TN-XX-XX-XXXX"
                value={vehicleForm.vehicleNo}
                onChange={(e) => {
                  setVehicleForm((prev) => ({
                    ...prev,
                    vehicleNo: e.target.value.toUpperCase(),
                  }));
                }}
              />
            </Field>
            <Field label="Vehicle Type">
              <input
                className={inputClass}
                placeholder="Car / SUV / Official Vehicle"
                value={vehicleForm.vehicleType}
                onChange={(e) => {
                  setVehicleForm((prev) => ({
                    ...prev,
                    vehicleType: e.target.value,
                  }));
                }}
              />
            </Field>
            <Field label="Driver Name">
              <input
                className={inputClass}
                placeholder="Enter driver name"
                value={vehicleForm.driverName}
                onChange={(e) => {
                  setVehicleForm((prev) => ({
                    ...prev,
                    driverName: e.target.value,
                  }));
                }}
              />
            </Field>
            <Field label="Driver Mobile Number">
              <input
                className={inputClass}
                inputMode="numeric"
                placeholder="Enter mobile number"
                value={vehicleForm.driverMobile}
                onChange={(e) => {
                  setVehicleForm((prev) => ({
                    ...prev,
                    driverMobile: e.target.value.replace(/\D/g, "").slice(0, 10),
                  }));
                }}
              />
            </Field>
            <div>
              <Field label="RC Book *">
                <label className={fileLabelClass}>
                  <Upload className="h-4 w-4" />
                  <span className="truncate">
                    {fileDisplayName(
                      vehicleForm.rcBook,
                      vehicleForm.rcBookPath,
                      "Upload RC Book (PDF/JPG/PNG)",
                    )}
                  </span>
                  <input
	                    className="hidden"
	                    type="file"
	                    accept="application/pdf,image/jpeg,image/png"
	                    onChange={(e) => {
                      setVehicleForm((prev) => ({
                        ...prev,
                        rcBook: e.target.files?.[0] || null,
                      }));
                    }}
                  />
                </label>
              </Field>
            </div>
            <div>
              <Field label="Insurance Document *">
                <label className={fileLabelClass}>
                  <Upload className="h-4 w-4" />
                  <span className="truncate">
                    {fileDisplayName(
	                      vehicleForm.insuranceDocument,
	                      vehicleForm.insuranceDocumentPath,
	                      "Upload Insurance Document (PDF/JPG/PNG)",
	                    )}
                  </span>
                  <input
	                    className="hidden"
	                    type="file"
	                    accept="application/pdf,image/jpeg,image/png"
	                    onChange={(e) => {
                      setVehicleForm((prev) => ({
                        ...prev,
                        insuranceDocument: e.target.files?.[0] || null,
                      }));
                    }}
                  />
                </label>
              </Field>
            </div>
          </div>

          <ModalActions
            onClear={() => {
              setVehicleForm(emptyVehicle);
            }}
            onSave={saveVehicle}
            saveLabel={editingVehicleIndex !== null ? "Update Vehicle" : "Add Vehicle"}
          />
        </Modal>
      )}
    </div>
  );
}

function Field({ label, children, error }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-stone-300">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-xs font-semibold text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function FileField({ label, file, onChange }) {
  return (
    <Field label={label}>
      <label className={fileLabelClass}>
        <Upload className="h-4 w-4" />
        <span className="truncate">{file?.name || `${label} (PDF/JPG/PNG)`}</span>
        <input
          className="hidden"
          type="file"
          accept="application/pdf,image/jpeg,image/png"
          onChange={(e) => onChange(e.target.files?.[0] || null)}
        />
      </label>
    </Field>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[95vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-900">
        <div className="flex items-center justify-between bg-[#0a1e4d] px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-white/10 p-2">
              <UserPlus className="h-5 w-5 text-orange-400" />
            </div>
            <h2 className="text-xl font-bold tracking-wide">{title}</h2>
          </div>
          <Button
            type="button"
            onClick={onClose}
            variant="ghost"
            size="icon"
            className="rounded-xl p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto bg-slate-50 p-8 dark:bg-slate-950">{children}</div>
      </div>
    </div>
  );
}

function ModalActions({ onClear, onSave, saveLabel }) {
  return (
    <div className="mt-8 flex justify-end gap-3 border-t border-slate-200 pt-5 dark:border-white/10">
      <Button
        type="button"
        onClick={onClear}
        variant="outline"
        className="h-auto rounded-xl border-slate-300 bg-white px-8 py-2.5 text-sm font-bold uppercase tracking-wider text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-white/10 dark:bg-slate-950 dark:text-stone-200 dark:hover:bg-white/5"
      >
        Clear
      </Button>
      <Button
        type="button"
        onClick={onSave}
        className="h-auto gap-2 rounded-xl bg-orange-600 px-10 py-2.5 text-sm font-bold uppercase tracking-wider text-white shadow-lg shadow-orange-600/20 transition-colors hover:bg-orange-700"
      >
        <Plus className="h-4 w-4" />
        {saveLabel}
      </Button>
    </div>
  );
}
