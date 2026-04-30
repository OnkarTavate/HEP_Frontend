"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Search,
  Users,
  Truck,
  FolderKanban,
  ShieldAlert,
  ShieldCheck,
  XCircle,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

const AGENT_API = process.env.NEXT_PUBLIC_AGENT_API;

// Reusable component for the View Modal
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

export default function MasterRecordsPage() {
  const [activeTab, setActiveTab] = useState("personnel");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // Dynamic DB States
  const [personnel, setPersonnel] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [stats, setStats] = useState({ personCount: 0, vehicleCount: 0 });

  // View Modal States
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [recordType, setRecordType] = useState(""); // 'personnel' or 'vehicle'

  // Fetch Master Directory from Backend
  const fetchMasterRecords = async () => {
    try {
      setLoading(true);
      let token = localStorage.getItem("accessToken");

      if (!token) {
        toast.error("Session expired or token missing. Please log in again.");
        setLoading(false);
        return;
      }

      token = token.replace(/^["']|["']$/g, "");

      const response = await axios.get(
        `${AGENT_API}/pass-request/my-master-records`,
        {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        },
      );

      if (response.data && response.data.success) {
        const { persons, vehicles, personCount, vehicleCount } =
          response.data.data;

        setPersonnel(
          persons.map((p) => ({
            ...p,
            id: p.id,
            name: p.name,
            designation: p.designationName || "N/A",
            aadhar: p.aadharNo,
            phone: p.mobile,
            dateAdded: new Date(p.createdAt).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            }),
            // 🚀 FIX: Actually read the DB status rather than forcing it to true
            isActive: p.isActive === false ? false : true,
          })),
        );

        setVehicles(
          vehicles.map((v) => ({
            ...v,
            id: v.id,
            regNo: v.registrationNo,
            type: v.vehicleTypeName || "N/A",
            owner: v.referenceNo || "N/A",
            fcExpiry: "N/A",
            dateAdded: new Date(v.createdAt).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            }),
            // 🚀 FIX: Actually read the DB status rather than forcing it to true
            isActive: v.isActive === false ? false : true,
          })),
        );

        setStats({ personCount, vehicleCount });
      }
    } catch (error) {
      console.error("Failed to fetch master records", error);
      if (error.response && error.response.status === 401) {
        toast.error("Unauthorized: Please log out and log back in.");
      } else {
        toast.error("Failed to load Master Directory from database.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMasterRecords();
  }, []);

  // --- 🚀 FIX: HANDLERS NOW CALL BACKEND TO PERSIST STATUS ---
  const togglePersonStatus = async (id, currentStatus) => {
    const newStatus = !currentStatus;

    try {
      let token = localStorage
        .getItem("accessToken")
        .replace(/^["']|["']$/g, "");

      // 1. API Call to persist Block/Active status to DB
      await axios.put(
        `${AGENT_API}/pass-request/update-person-status`,
        { personId: id, isActive: newStatus },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      // 2. Update React State only if DB call succeeds
      setPersonnel(
        personnel.map((p) => (p.id === id ? { ...p, isActive: newStatus } : p)),
      );

      toast(
        newStatus ? "Person Unblocked & Active" : "Person Blocked Successfully",
        {
          icon: newStatus ? (
            <ShieldCheck className="text-emerald-500" />
          ) : (
            <ShieldAlert className="text-red-500" />
          ),
        },
      );
    } catch (error) {
      toast.error(
        "Failed to update status in database. Check backend connection.",
      );
    }
  };

  const toggleVehicleStatus = async (id, currentStatus) => {
    const newStatus = !currentStatus;

    try {
      let token = localStorage
        .getItem("accessToken")
        .replace(/^["']|["']$/g, "");

      // 1. API Call to persist Block/Active status to DB
      await axios.put(
        `${AGENT_API}/pass-request/update-vehicle-status`,
        { vehicleId: id, isActive: newStatus },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      // 2. Update React State only if DB call succeeds
      setVehicles(
        vehicles.map((v) => (v.id === id ? { ...v, isActive: newStatus } : v)),
      );

      toast(
        newStatus
          ? "Vehicle Unblocked & Active"
          : "Vehicle Blocked Successfully",
        {
          icon: newStatus ? (
            <ShieldCheck className="text-emerald-500" />
          ) : (
            <ShieldAlert className="text-red-500" />
          ),
        },
      );
    } catch (error) {
      toast.error(
        "Failed to update status in database. Check backend connection.",
      );
    }
  };

  const handleRowClick = (record, type) => {
    setSelectedRecord(record);
    setRecordType(type);
    setIsViewModalOpen(true);
  };

  // --- Filter Logic ---
  const filteredPersonnel = personnel.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.aadhar.includes(searchQuery),
  );

  const filteredVehicles = vehicles.filter((v) =>
    v.regNo.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // 🚀 FIX: Secure Math Logic
  const totalFastFillRecords =
    (parseInt(stats.personCount, 10) || 0) +
    (parseInt(stats.vehicleCount, 10) || 0);

  return (
    <div className="space-y-6 font-sans max-w-7xl mx-auto text-slate-800">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#0a1e4d]">
            Master Directory
          </h2>
          <p className="text-sm text-slate-500 font-medium">
            Manage Personnel & Vehicles centrally for Fast-Fill Passes
          </p>
        </div>
      </div>

      {/* 🚀 Clean 3-Card Summary Stats (At the Top) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Fast-Fill Records
            </p>
            {/* Displaying secure mathematical sum */}
            <h3 className="text-3xl font-black text-[#0a1e4d]">
              {totalFastFillRecords}
            </h3>
          </div>
          <div className="w-14 h-14 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600 shadow-inner">
            <FolderKanban className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Personnel
            </p>
            <h3 className="text-3xl font-black text-[#0a1e4d]">
              {stats.personCount}
            </h3>
          </div>
          <div className="w-14 h-14 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600 shadow-inner">
            <Users className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Vehicles
            </p>
            <h3 className="text-3xl font-black text-[#0a1e4d]">
              {stats.vehicleCount}
            </h3>
          </div>
          <div className="w-14 h-14 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 shadow-inner">
            <Truck className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-300">
        <button
          onClick={() => setActiveTab("personnel")}
          className={`px-8 py-4 text-sm transition-all flex items-center gap-2 ${activeTab === "personnel" ? "font-bold text-[#0a1e4d] border-b-2 border-[#0a1e4d]" : "font-semibold text-slate-500 hover:text-[#0a1e4d]"}`}
        >
          <Users className="h-4 w-4" /> Personnel Directory
        </button>
        <button
          onClick={() => setActiveTab("vehicle")}
          className={`px-8 py-4 text-sm transition-all flex items-center gap-2 ${activeTab === "vehicle" ? "font-bold text-[#0a1e4d] border-b-2 border-[#0a1e4d]" : "font-semibold text-slate-500 hover:text-[#0a1e4d]"}`}
        >
          <Truck className="h-4 w-4" /> Vehicle Fleet
        </button>
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-300 pb-8">
        {/* Toolbar: Search */}
        <div className="p-6 bg-slate-50 flex flex-col md:flex-row justify-between items-center gap-4 border-b border-slate-200">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder={`Search ${activeTab === "personnel" ? "Aadhar No / Name" : "Registration No"}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all shadow-sm"
            />
          </div>
        </div>

        {/* PERSONNEL TABLE */}
        {activeTab === "personnel" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#0a1e4d] text-white">
                <tr>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider border-r border-white/10">
                    Name & ID
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider border-r border-white/10">
                    Designation
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider border-r border-white/10">
                    Primary ID No
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider border-r border-white/10">
                    Phone Number
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider border-r border-white/10">
                    Date Added
                  </th>
                  {/* 🚀 Edit Column Removed */}
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-center">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td
                      colSpan="6"
                      className="p-8 text-center text-slate-500 italic animate-pulse"
                    >
                      Loading personnel from DB...
                    </td>
                  </tr>
                ) : (
                  filteredPersonnel.map((p) => (
                    <tr
                      key={p.id}
                      onClick={() => handleRowClick(p, "personnel")}
                      className={`cursor-pointer hover:bg-orange-50/50 transition-colors ${!p.isActive ? "bg-red-50/30 opacity-70" : ""}`}
                    >
                      <td className="px-6 py-4 border-r border-slate-100">
                        <p className="text-sm font-bold text-[#0a1e4d]">
                          {p.name}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                          MASTER ID: {p.id}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-700 border-r border-slate-100">
                        {p.designation}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 border-r border-slate-100 font-mono">
                        {p.aadhar}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 border-r border-slate-100 font-medium">
                        {p.phone}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 border-r border-slate-100">
                        {p.dateAdded}
                      </td>
                      {/* 🚀 Edit Cell Removed */}
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation(); // Prevents row click when toggling switch
                            togglePersonStatus(p.id, p.isActive);
                          }}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 focus:outline-none shadow-inner ${p.isActive ? "bg-emerald-500" : "bg-slate-300"}`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-300 shadow-sm ${p.isActive ? "translate-x-6" : "translate-x-1"}`}
                          />
                        </button>
                        <p
                          className={`text-[10px] mt-1 font-bold ${p.isActive ? "text-emerald-600" : "text-red-500"}`}
                        >
                          {p.isActive ? "ACTIVE" : "BLOCKED"}
                        </p>
                      </td>
                    </tr>
                  ))
                )}
                {!loading && filteredPersonnel.length === 0 && (
                  <tr>
                    <td
                      colSpan="6"
                      className="p-8 text-center text-slate-500 italic"
                    >
                      No personnel records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* VEHICLES TABLE */}
        {activeTab === "vehicle" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#0a1e4d] text-white">
                <tr>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider border-r border-white/10">
                    Registration No
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider border-r border-white/10">
                    Vehicle Type
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider border-r border-white/10">
                    RC Owner
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider border-r border-white/10">
                    Date Added
                  </th>
                  {/* 🚀 Edit Column Removed */}
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-center">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td
                      colSpan="5"
                      className="p-8 text-center text-slate-500 italic animate-pulse"
                    >
                      Loading vehicles from DB...
                    </td>
                  </tr>
                ) : (
                  filteredVehicles.map((v) => (
                    <tr
                      key={v.id}
                      onClick={() => handleRowClick(v, "vehicle")}
                      className={`cursor-pointer hover:bg-orange-50/50 transition-colors ${!v.isActive ? "bg-red-50/30 opacity-70" : ""}`}
                    >
                      <td className="px-6 py-4 border-r border-slate-100">
                        <p className="text-sm font-bold text-[#0a1e4d] uppercase tracking-wide">
                          {v.regNo}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                          MASTER ID: {v.id}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-700 border-r border-slate-100">
                        {v.type}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 border-r border-slate-100">
                        {v.owner}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 border-r border-slate-100">
                        {v.dateAdded}
                      </td>
                      {/* 🚀 Edit Cell Removed */}
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation(); // Prevents row click when toggling switch
                            toggleVehicleStatus(v.id, v.isActive);
                          }}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 focus:outline-none shadow-inner ${v.isActive ? "bg-emerald-500" : "bg-slate-300"}`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-300 shadow-sm ${v.isActive ? "translate-x-6" : "translate-x-1"}`}
                          />
                        </button>
                        <p
                          className={`text-[10px] mt-1 font-bold ${v.isActive ? "text-emerald-600" : "text-red-500"}`}
                        >
                          {v.isActive ? "ACTIVE" : "BLOCKED"}
                        </p>
                      </td>
                    </tr>
                  ))
                )}
                {!loading && filteredVehicles.length === 0 && (
                  <tr>
                    <td
                      colSpan="5"
                      className="p-8 text-center text-slate-500 italic"
                    >
                      No vehicle records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="p-4 bg-slate-50 flex justify-between items-center">
          <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">
            Showing{" "}
            {activeTab === "personnel"
              ? filteredPersonnel.length
              : filteredVehicles.length}{" "}
            Records
          </p>
        </div>
      </div>

      {/* MASTER RECORD READ-ONLY VIEW MODAL */}
      {isViewModalOpen && selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh] border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-[#0a1e4d] text-white">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <FileText className="text-orange-400 h-5 w-5" />
                {recordType === "personnel" ? "Personnel" : "Vehicle"} Master
                Record Details
              </h3>
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="text-white/70 hover:text-white p-1 transition-colors bg-white/10 hover:bg-red-500 rounded-lg"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-slate-50 space-y-6">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <h4 className="text-xs font-black text-[#0a1e4d] uppercase tracking-widest border-b border-slate-100 pb-3 mb-4">
                  Stored Data
                </h4>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-y-6 gap-x-4">
                  {recordType === "personnel" ? (
                    <>
                      <DetailItem
                        label="Full Name"
                        value={selectedRecord.name}
                        highlight
                      />
                      <DetailItem label="Master ID" value={selectedRecord.id} />
                      <DetailItem
                        label="Primary ID No."
                        value={selectedRecord.aadharNo || selectedRecord.aadhar}
                      />
                      <DetailItem
                        label="Mobile No."
                        value={selectedRecord.mobile || selectedRecord.phone}
                      />
                      <DetailItem label="Email" value={selectedRecord.email} />
                      <DetailItem
                        label="Nationality"
                        value={selectedRecord.nationality}
                      />
                      <DetailItem
                        label="Designation"
                        value={
                          selectedRecord.designationName ||
                          selectedRecord.designation
                        }
                      />
                      <DetailItem
                        label="Pass Type"
                        value={selectedRecord.passType}
                        highlight
                      />
                      <DetailItem
                        label="Pass Period"
                        value={
                          selectedRecord.passPeriod
                            ? `${selectedRecord.passPeriod} Days`
                            : "N/A"
                        }
                      />
                      <DetailItem
                        label="Date Added"
                        value={selectedRecord.dateAdded}
                      />
                      <DetailItem
                        label="Default Amount"
                        value={`₹${parseFloat(selectedRecord.amount || 0).toFixed(2)}`}
                      />
                    </>
                  ) : (
                    <>
                      <DetailItem
                        label="Registration No."
                        value={
                          selectedRecord.registrationNo || selectedRecord.regNo
                        }
                        highlight
                      />
                      <DetailItem label="Master ID" value={selectedRecord.id} />
                      <DetailItem
                        label="Vehicle Type"
                        value={
                          selectedRecord.vehicleTypeName || selectedRecord.type
                        }
                      />
                      <DetailItem
                        label="RFID Card No."
                        value={selectedRecord.rfidCardNumber}
                      />
                      <DetailItem
                        label="Insurance Expiry"
                        value={
                          selectedRecord.insuranceExpiry
                            ? new Date(
                                selectedRecord.insuranceExpiry,
                              ).toLocaleDateString()
                            : ""
                        }
                      />
                      <DetailItem
                        label="RC Validity"
                        value={
                          selectedRecord.rcValidity
                            ? new Date(
                                selectedRecord.rcValidity,
                              ).toLocaleDateString()
                            : ""
                        }
                      />
                      <DetailItem
                        label="Pass Type"
                        value={selectedRecord.passType}
                        highlight
                      />
                      <DetailItem
                        label="Pass Period"
                        value={
                          selectedRecord.passPeriod
                            ? `${selectedRecord.passPeriod} Days`
                            : "N/A"
                        }
                      />
                      <DetailItem
                        label="Date Added"
                        value={selectedRecord.dateAdded}
                      />
                      <DetailItem
                        label="Default Amount"
                        value={`₹${parseFloat(selectedRecord.amount || 0).toFixed(2)}`}
                      />
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 bg-white flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setIsViewModalOpen(false)}
                className="px-8 py-2.5 bg-slate-200 text-slate-800 font-bold hover:bg-slate-300 rounded-xl transition-colors text-sm"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
