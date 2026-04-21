"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Search,
  Users,
  Truck,
  PlusCircle,
  FileSpreadsheet,
  FolderKanban,
  Edit,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

const AGENT_API =
  process.env.NEXT_PUBLIC_AGENT_API || "http://localhost:5001/api";

export default function MasterRecordsPage() {
  const [activeTab, setActiveTab] = useState("personnel");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // Dynamic DB States
  const [personnel, setPersonnel] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [stats, setStats] = useState({ personCount: 0, vehicleCount: 0 });

  // Fetch Master Directory from Backend
  const fetchMasterRecords = async () => {
    try {
      setLoading(true);
      let token = localStorage.getItem("accessToken");
      if (token) token = token.replace(/^["']|["']$/g, "");

      const response = await axios.get(
        `${AGENT_API}/pass-request/my-master-records`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (response.data && response.data.success) {
        const { persons, vehicles, personCount, vehicleCount } =
          response.data.data;

        // Map DB array to Personnel State
        setPersonnel(
          persons.map((p) => ({
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
            isActive: true, // backend query currently only returns isActive=true
          })),
        );

        // Map DB array to Vehicles State
        setVehicles(
          vehicles.map((v) => ({
            id: v.id,
            regNo: v.registrationNo,
            type: v.vehicleTypeName || "N/A",
            owner: v.referenceNo || "N/A",
            fcExpiry: "N/A", // Not stored in this DB query currently
            dateAdded: new Date(v.createdAt).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            }),
            isActive: true,
          })),
        );

        setStats({ personCount, vehicleCount });
      }
    } catch (error) {
      console.error("Failed to fetch master records", error);
      toast.error("Failed to load Master Directory from database.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMasterRecords();
  }, []);

  // --- Handlers ---
  const togglePersonStatus = (id) => {
    setPersonnel(
      personnel.map((p) => {
        if (p.id === id) {
          const newStatus = !p.isActive;
          toast(
            newStatus
              ? "Person Unblocked & Active"
              : "Person Blocked Successfully",
            {
              icon: newStatus ? (
                <ShieldCheck className="text-emerald-500" />
              ) : (
                <ShieldAlert className="text-red-500" />
              ),
            },
          );
          return { ...p, isActive: newStatus };
        }
        return p;
      }),
    );
  };

  const toggleVehicleStatus = (id) => {
    setVehicles(
      vehicles.map((v) => {
        if (v.id === id) {
          const newStatus = !v.isActive;
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
          return { ...v, isActive: newStatus };
        }
        return v;
      }),
    );
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

  return (
    <div className="space-y-6 font-sans max-w-7xl mx-auto text-slate-800">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#0a1e4d]">
            Master Directory
          </h2>
          <p className="text-sm text-slate-500 font-medium">
            Manage Personnel & Vehicles centrally
          </p>
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
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-300">
        {/* Toolbar: Search & Add */}
        <div className="p-6 bg-slate-50 flex flex-col md:flex-row justify-between items-center gap-4 border-b border-slate-200">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder={`Search ${activeTab === "personnel" ? "Aadhar / Name" : "Registration No"}...`}
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
                    Aadhar No
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider border-r border-white/10">
                    Phone Number
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider border-r border-white/10">
                    Date Added
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-center border-r border-white/10">
                    Edit
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-center">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td
                      colSpan="7"
                      className="p-8 text-center text-slate-500 italic animate-pulse"
                    >
                      Loading personnel from DB...
                    </td>
                  </tr>
                ) : (
                  filteredPersonnel.map((p) => (
                    <tr
                      key={p.id}
                      className={`hover:bg-slate-50 transition-colors ${!p.isActive ? "bg-red-50/30 opacity-70" : ""}`}
                    >
                      <td className="px-6 py-4 border-r border-slate-100">
                        <p className="text-sm font-bold text-[#0a1e4d]">
                          {p.name}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                          ID: {p.id}
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
                      <td className="px-6 py-4 text-center border-r border-slate-100">
                        <button className="text-slate-400 hover:text-orange-600 transition-colors">
                          <Edit className="h-4 w-4 mx-auto" />
                        </button>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => togglePersonStatus(p.id)}
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
                      colSpan="7"
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
                    FC Expiry Date
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider border-r border-white/10">
                    Date Added
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-center border-r border-white/10">
                    Edit
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-center">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td
                      colSpan="7"
                      className="p-8 text-center text-slate-500 italic animate-pulse"
                    >
                      Loading vehicles from DB...
                    </td>
                  </tr>
                ) : (
                  filteredVehicles.map((v) => (
                    <tr
                      key={v.id}
                      className={`hover:bg-slate-50 transition-colors ${!v.isActive ? "bg-red-50/30 opacity-70" : ""}`}
                    >
                      <td className="px-6 py-4 border-r border-slate-100">
                        <p className="text-sm font-bold text-[#0a1e4d] uppercase tracking-wide">
                          {v.regNo}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                          ID: {v.id}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-700 border-r border-slate-100">
                        {v.type}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 border-r border-slate-100">
                        {v.owner}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 border-r border-slate-100">
                        {v.fcExpiry}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 border-r border-slate-100">
                        {v.dateAdded}
                      </td>
                      <td className="px-6 py-4 text-center border-r border-slate-100">
                        <button className="text-slate-400 hover:text-orange-600 transition-colors">
                          <Edit className="h-4 w-4 mx-auto" />
                        </button>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => toggleVehicleStatus(v.id)}
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
                      colSpan="7"
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

        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
          <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">
            Showing{" "}
            {activeTab === "personnel"
              ? filteredPersonnel.length
              : filteredVehicles.length}{" "}
            Records
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-12">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Database Records
            </p>
            <h3 className="text-3xl font-black text-[#0a1e4d]">
              {stats.personCount + stats.vehicleCount}
            </h3>
            <p className="text-xs text-orange-600 font-bold">
              {stats.personCount} Personnel | {stats.vehicleCount} Vehicles
            </p>
          </div>
          <div className="w-14 h-14 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600 shadow-inner">
            <FolderKanban className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#0a1e4d] to-[#1a2f64] p-6 rounded-2xl flex flex-col justify-between shadow-xl">
          <div className="flex items-start justify-between">
            <p className="text-xs font-bold text-white/80 uppercase tracking-wider">
              Directory Backup
            </p>
            <FileSpreadsheet className="text-white/50 h-6 w-6" />
          </div>
          <div className="mt-4">
            <button className="w-full bg-white text-[#0a1e4d] font-black py-3 rounded-xl text-xs hover:bg-orange-50 transition-colors shadow-lg uppercase tracking-widest">
              Export Excel Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
