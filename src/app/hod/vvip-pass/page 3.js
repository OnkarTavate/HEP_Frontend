"use client";

import { useEffect, useState } from "react";
import {
  BadgeCheck,
  CalendarDays,
  FileText,
  ListChecks,
  Plus,
  Truck,
  Upload,
  Users,
  X,
} from "lucide-react";

const inputCls =
  "w-full h-10 px-3 rounded-md border border-slate-300 bg-white text-sm focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 disabled:bg-slate-100 disabled:text-slate-500";

const textareaCls =
  "w-full px-3 py-2 rounded-md border border-slate-300 bg-white text-sm focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100";

const Label = ({ children }) => (
  <label className="block text-xs font-medium text-slate-700 mb-1">
    {children}
  </label>
);

const toDateTimeLocalValue = (date) => {
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 16);
};

const addDaysToDateTimeLocal = (dateTimeValue, days) => {
  if (!dateTimeValue) return "";

  const date = new Date(dateTimeValue);
  date.setDate(date.getDate() + days);

  return toDateTimeLocalValue(date);
};

export default function HodVvipPassPage() {
  const [activeTab, setActiveTab] = useState("CREATE");
  const [user, setUser] = useState(null);
  const [validityFrom, setValidityFrom] = useState("");
  const [validityTo, setValidityTo] = useState("");
  const [showPersonModal, setShowPersonModal] = useState(false);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [personForm, setPersonForm] = useState({
    visitorName: "",
    designation: "",
    organization: "",
    mobileNumber: "",
    documentName: "",
  });
  const [persons, setPersons] = useState([]);
  const [vehicleForm, setVehicleForm] = useState({
    vehicleNumber: "",
    vehicleType: "",
    driverName: "",
    driverMobile: "",
    documentName: "",
  });
  const [vehicles, setVehicles] = useState([]);

  const maxValidityTo = addDaysToDateTimeLocal(validityFrom, 2);

  const resetPersonForm = () => {
    setPersonForm({
      visitorName: "",
      designation: "",
      organization: "",
      mobileNumber: "",
      documentName: "",
    });
  };

  const handleAddPerson = () => {
    const hasPersonValue = Object.values(personForm).some((value) =>
      String(value || "").trim(),
    );

    if (!hasPersonValue || persons.length >= 10) return;

    setPersons((currentPersons) => [
      ...currentPersons,
      {
        ...personForm,
        id: `${Date.now()}-${currentPersons.length}`,
      },
    ]);
    resetPersonForm();
    setShowPersonModal(false);
  };

  const resetVehicleForm = () => {
    setVehicleForm({
      vehicleNumber: "",
      vehicleType: "",
      driverName: "",
      driverMobile: "",
      documentName: "",
    });
  };

  const handleAddVehicle = () => {
    const hasVehicleValue = Object.values(vehicleForm).some((value) =>
      String(value || "").trim(),
    );

    if (!hasVehicleValue || vehicles.length >= 10) return;

    setVehicles((currentVehicles) => [
      ...currentVehicles,
      {
        ...vehicleForm,
        id: `${Date.now()}-${currentVehicles.length}`,
      },
    ]);
    resetVehicleForm();
    setShowVehicleModal(false);
  };

  useEffect(() => {
    let timer;
    try {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        timer = setTimeout(() => setUser(parsedUser), 0);
      }
    } catch {
      timer = setTimeout(() => setUser(null), 0);
    }

    return () => clearTimeout(timer);
  }, []);

  return (
    <main className="p-6 lg:p-8">
      <section className="mx-auto max-w-7xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                <BadgeCheck className="h-6 w-6" />
              </span>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">
                  VVIP Pass
                </h1>
                <p className="text-sm text-slate-400 mt-1">
                  Initiate and monitor VVIP pass requests.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 border-b border-slate-200">
          {[
            { key: "CREATE", label: "Create Request", icon: Plus },
            { key: "LIST", label: "Request List", icon: ListChecks },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition ${
                  active
                    ? "border-orange-500 text-orange-600"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === "CREATE" ? (
          <>
          <form className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
            <div className="px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white">
              <h2 className="text-base font-semibold">VVIP Request Details</h2>
            </div>

            <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-4">
              <div>
                <Label>Name of the Department</Label>
                <input
                  className={inputCls}
                  value={user?.departmentName || ""}
                  disabled
                  placeholder="Auto-filled from HOD login"
                />
              </div>

              <div>
                <Label>Visit Date</Label>
                <div className="relative">
                  <CalendarDays className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input type="date" className={`${inputCls} pl-9`} />
                </div>
              </div>

              <div>
                <Label>Validity From</Label>
                <input
                  type="datetime-local"
                  className={inputCls}
                  value={validityFrom}
                  onChange={(event) => {
                    const nextValidityFrom = event.target.value;
                    const nextMaxValidityTo = addDaysToDateTimeLocal(nextValidityFrom, 2);

                    setValidityFrom(nextValidityFrom);

                    if (validityTo && nextMaxValidityTo && validityTo > nextMaxValidityTo) {
                      setValidityTo(nextMaxValidityTo);
                    }
                  }}
                />
              </div>

              <div>
                <Label>Validity To</Label>
                <input
                  type="datetime-local"
                  className={inputCls}
                  value={validityTo}
                  min={validityFrom}
                  max={maxValidityTo}
                  onChange={(event) => {
                    const selectedValidityTo = event.target.value;

                    if (maxValidityTo && selectedValidityTo > maxValidityTo) {
                      setValidityTo(maxValidityTo);
                      return;
                    }

                    setValidityTo(selectedValidityTo);
                  }}
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  Maximum validity allowed: 2 days.
                </p>
              </div>

              <div>
                <Label>No. of Passes</Label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={2}
                  className={inputCls}
                  placeholder="Max 10 per day"
                  onInput={(event) => {
                    event.currentTarget.value = event.currentTarget.value
                      .replace(/\D/g, "")
                      .slice(0, 2);
                  }}
                />
              </div>

              <div>
                <Label>Supporting Document</Label>
                <label className="flex h-10 cursor-pointer items-center gap-2 rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 text-sm text-slate-500 hover:border-orange-300 hover:bg-orange-50">
                  <Upload className="h-4 w-4" />
                  Upload request document
                  <input type="file" className="hidden" />
                </label>
              </div>

              <div className="lg:col-span-2">
                <Label>Purpose / Remarks</Label>
                <textarea
                  rows={4}
                  className={textareaCls}
                  placeholder="Enter visit purpose and remarks"
                />
              </div>
            </div>

            <section className="border-t border-slate-100 bg-white">
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
                        Organization
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold border-r border-white/10 uppercase tracking-wider">
                        Mobile
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold border-r border-white/10 uppercase tracking-wider">
                        Document
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold text-center">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {persons.length ? (
                      persons.map((person, index) => (
                        <tr key={person.id}>
                          <td className="px-4 py-4 text-sm text-slate-500 font-medium border-r border-slate-100">
                            {(index + 1).toString().padStart(2, "0")}
                          </td>
                          <td className="px-4 py-4 border-r border-slate-100">
                            <p className="text-sm font-bold text-[#0a1e4d]">
                              {person.visitorName || "—"}
                            </p>
                            <p className="text-xs text-slate-500 font-medium">
                              {person.designation || "—"}
                            </p>
                          </td>
                          <td className="px-4 py-4 text-sm text-slate-600 border-r border-slate-100 font-medium">
                            {person.organization || "—"}
                          </td>
                          <td className="px-4 py-4 text-sm text-slate-600 border-r border-slate-100 font-medium">
                            {person.mobileNumber || "—"}
                          </td>
                          <td className="px-4 py-4 text-sm text-slate-600 border-r border-slate-100 font-medium">
                            {person.documentName || "—"}
                          </td>
                          <td className="px-4 py-4 text-center">
                            <button
                              type="button"
                              onClick={() =>
                                setPersons((currentPersons) =>
                                  currentPersons.filter((item) => item.id !== person.id),
                                )
                              }
                              className="bg-red-50 text-red-600 hover:text-red-800 hover:bg-red-100 px-3 py-1 rounded-lg text-xs font-bold transition-colors"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="p-10 text-center text-sm text-slate-400 italic bg-white" colSpan={6}>
                          No persons added yet. Click Add Person below.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="p-4 bg-white border-t border-slate-200 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowPersonModal(true)}
                  disabled={persons.length >= 10}
                  className="bg-orange-600 text-white text-xs font-bold px-6 py-3 rounded-xl shadow-lg hover:bg-orange-700 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed transition-all uppercase tracking-wider"
                >
                  Add Person
                </button>
              </div>
            </section>

            <section className="border-t border-slate-100 bg-white">
              <div className="px-6 py-4 flex justify-between items-center bg-slate-50 border-b border-slate-100">
                <h3 className="text-sm font-black text-[#0a1e4d] uppercase tracking-wide flex items-center gap-2">
                  <Truck className="h-5 w-5 text-orange-500" /> Detail of Vehicles:
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
                        Driver
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold border-r border-white/10 uppercase tracking-wider">
                        Mobile
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold border-r border-white/10 uppercase tracking-wider">
                        Document
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold text-center">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {vehicles.length ? (
                      vehicles.map((vehicle, index) => (
                        <tr key={vehicle.id}>
                          <td className="px-4 py-4 text-sm text-slate-500 font-medium border-r border-slate-100">
                            {(index + 1).toString().padStart(2, "0")}
                          </td>
                          <td className="px-4 py-4 border-r border-slate-100">
                            <p className="text-sm font-bold text-[#0a1e4d] uppercase">
                              {vehicle.vehicleNumber || "—"}
                            </p>
                            <p className="text-xs text-slate-500 font-medium">
                              {vehicle.vehicleType || "—"}
                            </p>
                          </td>
                          <td className="px-4 py-4 text-sm text-slate-600 border-r border-slate-100 font-medium">
                            {vehicle.driverName || "—"}
                          </td>
                          <td className="px-4 py-4 text-sm text-slate-600 border-r border-slate-100 font-medium">
                            {vehicle.driverMobile || "—"}
                          </td>
                          <td className="px-4 py-4 text-sm text-slate-600 border-r border-slate-100 font-medium">
                            {vehicle.documentName || "—"}
                          </td>
                          <td className="px-4 py-4 text-center">
                            <button
                              type="button"
                              onClick={() =>
                                setVehicles((currentVehicles) =>
                                  currentVehicles.filter((item) => item.id !== vehicle.id),
                                )
                              }
                              className="bg-red-50 text-red-600 hover:text-red-800 hover:bg-red-100 px-3 py-1 rounded-lg text-xs font-bold transition-colors"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="p-10 text-center text-sm text-slate-400 italic bg-white" colSpan={6}>
                          No vehicles added yet. Click Add Vehicle below.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="p-4 bg-white border-t border-slate-200 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowVehicleModal(true)}
                  disabled={vehicles.length >= 10}
                  className="bg-orange-600 text-white text-xs font-bold px-6 py-3 rounded-xl shadow-lg hover:bg-orange-700 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed transition-all uppercase tracking-wider"
                >
                  Add Vehicle
                </button>
              </div>
            </section>

            <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
              <button
                type="button"
                onClick={() => {
                  setValidityFrom("");
                  setValidityTo("");
                  resetPersonForm();
                  resetVehicleForm();
                  setPersons([]);
                  setVehicles([]);
                }}
                className="rounded-xl bg-slate-100 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-200"
              >
                Reset
              </button>
              <button
                type="button"
                className="rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-orange-600"
              >
                Submit Request
              </button>
            </div>
          </form>

          {showPersonModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in zoom-in-95 duration-200">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[92vh] border border-slate-200 overflow-hidden">
                <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-[#0a1e4d] text-white">
                  <div className="flex items-center gap-3">
                    <div className="bg-white/10 p-2 rounded-lg">
                      <Users className="h-5 w-5 text-orange-400" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold tracking-wide">
                        Add Person
                      </h2>
                      <p className="text-xs text-white/70">
                        VVIP visitor documents are optional.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPersonModal(false)}
                    className="text-white/70 hover:text-white hover:bg-white/10 p-2 rounded-xl transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="p-8 overflow-y-auto flex-1 bg-slate-50/50 space-y-6">
                  <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-3">
                      1. Visitor Details
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-5">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase">
                          Visitor Name
                        </label>
                        <input
                          className={inputCls}
                          placeholder="Enter visitor name"
                          value={personForm.visitorName}
                          onChange={(event) =>
                            setPersonForm((current) => ({
                              ...current,
                              visitorName: event.target.value,
                            }))
                          }
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase">
                          Designation / Category
                        </label>
                        <input
                          className={inputCls}
                          placeholder="Enter designation"
                          value={personForm.designation}
                          onChange={(event) =>
                            setPersonForm((current) => ({
                              ...current,
                              designation: event.target.value,
                            }))
                          }
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase">
                          Organization
                        </label>
                        <input
                          className={inputCls}
                          placeholder="Enter organization name"
                          value={personForm.organization}
                          onChange={(event) =>
                            setPersonForm((current) => ({
                              ...current,
                              organization: event.target.value,
                            }))
                          }
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase">
                          Mobile Number
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={10}
                          className={inputCls}
                          placeholder="Enter 10-digit mobile number"
                          value={personForm.mobileNumber}
                          onChange={(event) => {
                            const value = event.target.value.replace(/\D/g, "");
                            setPersonForm((current) => ({
                              ...current,
                              mobileNumber: value,
                            }));
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-3">
                      2. Documents
                    </h4>
                    <label className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 text-sm font-semibold text-slate-600 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600 transition-colors">
                      <Upload className="h-4 w-4" />
                      {personForm.documentName || "Upload Visitor Document"}
                      <input
                        type="file"
                        className="hidden"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          setPersonForm((current) => ({
                            ...current,
                            documentName: file?.name || "",
                          }));
                        }}
                      />
                    </label>
                  </div>
                </div>

                <div className="flex justify-end gap-3 px-6 py-5 border-t border-slate-200 bg-white rounded-b-2xl">
                  <button
                    type="button"
                    onClick={resetPersonForm}
                    className="bg-white border border-slate-300 text-slate-700 px-8 py-2.5 rounded-xl shadow-sm text-sm font-bold hover:bg-slate-50 transition-colors uppercase tracking-wider"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={handleAddPerson}
                    className="bg-orange-600 text-white px-10 py-2.5 rounded-xl shadow-lg shadow-orange-600/20 text-sm font-bold hover:bg-orange-700 transition-colors uppercase tracking-wider flex items-center gap-2"
                  >
                    Add Person
                  </button>
                </div>
              </div>
            </div>
          )}

          {showVehicleModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in zoom-in-95 duration-200">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[92vh] border border-slate-200 overflow-hidden">
                <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-[#0a1e4d] text-white">
                  <div className="flex items-center gap-3">
                    <div className="bg-white/10 p-2 rounded-lg">
                      <Truck className="h-5 w-5 text-orange-400" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold tracking-wide">
                        Add Vehicle
                      </h2>
                      <p className="text-xs text-white/70">
                        VVIP vehicle documents are optional.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowVehicleModal(false)}
                    className="text-white/70 hover:text-white hover:bg-white/10 p-2 rounded-xl transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="p-8 overflow-y-auto flex-1 bg-slate-50/50 space-y-6">
                  <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-3">
                      1. Vehicle Details
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-5">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase">
                          Registration No.
                        </label>
                        <input
                          className={`${inputCls} uppercase font-bold text-[#0a1e4d] tracking-wider`}
                          placeholder="TN-XX-XX-XXXX"
                          maxLength={13}
                          value={vehicleForm.vehicleNumber}
                          onChange={(event) => {
                            const value = event.target.value
                              .toUpperCase()
                              .replace(/[^A-Z0-9-\s]/g, "")
                              .slice(0, 13);
                            setVehicleForm((current) => ({
                              ...current,
                              vehicleNumber: value,
                            }));
                          }}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase">
                          Vehicle Type
                        </label>
                        <input
                          className={inputCls}
                          placeholder="Car / SUV / Official Vehicle"
                          value={vehicleForm.vehicleType}
                          onChange={(event) =>
                            setVehicleForm((current) => ({
                              ...current,
                              vehicleType: event.target.value,
                            }))
                          }
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase">
                          Driver Name
                        </label>
                        <input
                          className={inputCls}
                          placeholder="Enter driver name"
                          value={vehicleForm.driverName}
                          onChange={(event) =>
                            setVehicleForm((current) => ({
                              ...current,
                              driverName: event.target.value,
                            }))
                          }
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase">
                          Driver Mobile Number
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={10}
                          className={inputCls}
                          placeholder="Enter 10-digit mobile number"
                          value={vehicleForm.driverMobile}
                          onChange={(event) => {
                            const value = event.target.value.replace(/\D/g, "");
                            setVehicleForm((current) => ({
                              ...current,
                              driverMobile: value,
                            }));
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-3">
                      2. Documents
                    </h4>
                    <label className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 text-sm font-semibold text-slate-600 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600 transition-colors">
                      <Upload className="h-4 w-4" />
                      {vehicleForm.documentName || "Upload Vehicle Document"}
                      <input
                        type="file"
                        className="hidden"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          setVehicleForm((current) => ({
                            ...current,
                            documentName: file?.name || "",
                          }));
                        }}
                      />
                    </label>
                  </div>
                </div>

                <div className="flex justify-end gap-3 px-6 py-5 border-t border-slate-200 bg-white rounded-b-2xl">
                  <button
                    type="button"
                    onClick={resetVehicleForm}
                    className="bg-white border border-slate-300 text-slate-700 px-8 py-2.5 rounded-xl shadow-sm text-sm font-bold hover:bg-slate-50 transition-colors uppercase tracking-wider"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={handleAddVehicle}
                    className="bg-orange-600 text-white px-10 py-2.5 rounded-xl shadow-lg shadow-orange-600/20 text-sm font-bold hover:bg-orange-700 transition-colors uppercase tracking-wider flex items-center gap-2"
                  >
                    Add Vehicle
                  </button>
                </div>
              </div>
            </div>
          )}
          </>
        ) : (
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
            <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
              <FileText className="h-4 w-4 text-slate-500" />
              <h2 className="text-base font-semibold text-slate-800">
                VVIP Pass Requests
              </h2>
            </div>
            <div className="p-12 text-center text-sm text-slate-400">
              No VVIP pass requests yet.
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
