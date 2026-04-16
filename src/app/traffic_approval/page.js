"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import {
  CheckCircle2,
  Search,
  FileText,
  History,
  ShieldAlert,
  Clock,
  XCircle,
  Truck,
  Eye,
  X,
  Users,
  FileCheck2,
  ShieldCheck,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const AGENT_API =
  process.env.NEXT_PUBLIC_AGENT_API || "http://localhost:5001/api";

export default function TrafficPassesPage() {
  const [activeTab, setActiveTab] = useState("pending");
  const [searchQuery, setSearchQuery] = useState("");

  // Dynamic API States
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch all requests
  const fetchPassRequests = async () => {
    try {
      const token = localStorage.getItem("accessToken");
      // Replace with your actual GET endpoint for Traffic Admin requests
      const response = await axios.get(`${AGENT_API}/pass-request/pending`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setRequests(response.data.requests || []);
    } catch (error) {
      console.error("Failed to fetch requests", error);
      // Fallback/Mock data to ensure the UI works even if backend is not ready yet
      setRequests([
        {
          id: "1",
          agentName: "Global Marine Traders",
          purposeOfVisitId: "Cargo Inspection",
          status: "SUBMITTED",
          createdAt: "2026-04-15",
          authLetterFilePath: "uploads/docs/auth.pdf",
          persons: [
            {
              name: "Rajesh Kumar",
              hepTypeId: "Driver",
              aadharNo: "123456789012",
              passType: "DAILY",
            },
          ],
          vehicles: [
            {
              registrationNo: "TN-01-AB-1234",
              vehicleTypeId: "Heavy Truck",
              passType: "DAILY",
            },
          ],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPassRequests();
  }, []);

  // Handle Approve/Reject Action
  const handleAction = async (requestId, action) => {
    try {
      const token = localStorage.getItem("accessToken");
      await axios.post(
        `${AGENT_API}/pass-request/${action}`,
        { requestId },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      toast.success(`Pass Request ${action.toUpperCase()} successfully`);
      setIsModalOpen(false);
      fetchPassRequests(); // Refresh list after action
    } catch (error) {
      toast.error(`Failed to ${action} request`);

      // OPTIONAL: Fallback UI update if API fails during testing
      setRequests(
        requests.map((r) =>
          r.id === requestId
            ? { ...r, status: action === "approve" ? "APPROVED" : "REJECTED" }
            : r,
        ),
      );
      setIsModalOpen(false);
    }
  };

  // Derived stats & grouping for Cards and Tabs
  const pendingPasses = requests.filter(
    (r) => r.status === "SUBMITTED" || r.status === "PENDING",
  );
  const processedPasses = requests.filter(
    (r) => r.status === "APPROVED" || r.status === "REJECTED",
  );

  const totalPasses = requests.length;
  const approvedCount = processedPasses.filter(
    (p) => p.status === "APPROVED",
  ).length;
  const rejectedCount = processedPasses.filter(
    (p) => p.status === "REJECTED",
  ).length;

  const currentData = activeTab === "pending" ? pendingPasses : processedPasses;
  const filteredData = currentData.filter(
    (req) =>
      req.id.toString().includes(searchQuery) ||
      (req.agentName &&
        req.agentName.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-6 font-sans">
      {/* HEADER */}
      <header className="bg-white/80 backdrop-blur-lg rounded-xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between shadow-sm border border-slate-200 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#0a1e4d]">
            Traffic Passes Dashboard
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Review and approve individual and vehicle harbor entry permits.
          </p>
        </div>
      </header>

      {/* STATS CARDS (Matching Admin Theme) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow bg-white">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">
                Total Requests
              </p>
              <h3 className="text-3xl font-bold text-[#0a1e4d]">
                {totalPasses}
              </h3>
            </div>
            <div className="h-12 w-12 bg-blue-50 rounded-full flex items-center justify-center">
              <Truck className="h-6 w-6 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow bg-white">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">
                Pending Passes
              </p>
              <h3 className="text-3xl font-bold text-amber-600">
                {pendingPasses.length}
              </h3>
            </div>
            <div className="h-12 w-12 bg-amber-50 rounded-full flex items-center justify-center">
              <Clock className="h-6 w-6 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow bg-white">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">
                Approved
              </p>
              <h3 className="text-3xl font-bold text-emerald-600">
                {approvedCount}
              </h3>
            </div>
            <div className="h-12 w-12 bg-emerald-50 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow bg-white">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">
                Rejected
              </p>
              <h3 className="text-3xl font-bold text-red-600">
                {rejectedCount}
              </h3>
            </div>
            <div className="h-12 w-12 bg-red-50 rounded-full flex items-center justify-center">
              <XCircle className="h-6 w-6 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* TABS */}
      <div className="flex gap-4 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab("pending")}
          className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === "pending" ? "bg-slate-800 text-white" : "text-slate-500 hover:bg-slate-100"}`}
        >
          Pending Approvals ({pendingPasses.length})
        </button>
        <button
          onClick={() => setActiveTab("processed")}
          className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === "processed" ? "bg-slate-800 text-white" : "text-slate-500 hover:bg-slate-100"}`}
        >
          Processed Passes ({processedPasses.length})
        </button>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="flex flex-col md:flex-row items-center justify-between border-b border-slate-100 bg-slate-50/50 p-4 gap-4">
          <h3 className="font-bold text-slate-900 uppercase text-xs tracking-widest flex items-center gap-2 pl-2">
            {activeTab === "pending" ? (
              <ShieldAlert className="h-4 w-4 text-[#ff6b00]" />
            ) : (
              <History className="h-4 w-4 text-[#ff6b00]" />
            )}
            {activeTab === "pending"
              ? "Awaiting Traffic Approval"
              : "Processed Traffic Passes"}
          </h3>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search Request..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#ff6b00] focus:ring-1 focus:ring-[#ff6b00]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Req ID
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Company
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Pass Entities
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {activeTab === "pending" ? "Applied On" : "Processed On"}
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">
                  {activeTab === "pending" ? "Action" : "Status"}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan="5" className="py-16 text-center text-slate-500">
                    <Clock className="h-10 w-10 mx-auto text-slate-300 mb-3 animate-pulse" />
                    <p className="text-sm font-medium">Loading requests...</p>
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-16 text-center text-slate-500">
                    <ShieldAlert className="h-10 w-10 mx-auto text-slate-200 mb-3" />
                    <p className="text-sm font-medium">No requests found.</p>
                  </td>
                </tr>
              ) : (
                filteredData.map((pass) => (
                  <tr
                    key={pass.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm font-bold text-[#0a1e4d]">
                      REQ-{pass.id}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-700">
                      {pass.agentName}
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-[11px] font-bold border border-blue-200">
                        {pass.persons?.length || 0} Persons |{" "}
                        {pass.vehicles?.length || 0} Vehicles
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {new Date(pass.createdAt).toLocaleDateString() ||
                        pass.createdAt}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {activeTab === "pending" ? (
                        <button
                          onClick={() => {
                            setSelectedRequest(pass);
                            setIsModalOpen(true);
                          }}
                          className="bg-[#0a1e4d] text-white px-5 py-2 rounded-lg text-xs font-bold hover:opacity-90 shadow-md transition-all"
                        >
                          Review Details
                        </button>
                      ) : (
                        <span
                          className={`px-3 py-1 rounded-full text-[11px] font-bold border ${pass.status === "APPROVED" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"}`}
                        >
                          {pass.status.toUpperCase()}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================================== */}
      {/* VERIFICATION MODAL */}
      {/* ============================================================== */}
      {isModalOpen && selectedRequest && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in zoom-in-95 duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-200">
            <div className="flex justify-between items-center px-6 py-4 bg-[#0a1e4d] text-white">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-6 w-6 text-orange-500" />
                <h2 className="text-xl font-bold tracking-wide">
                  Verify Request: REQ-{selectedRequest.id}
                </h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-white/70 hover:text-white hover:bg-white/10 p-2 rounded-xl transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 bg-slate-50 space-y-6">
              {/* Auth Letter Verification */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center">
                <div>
                  <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                    <FileCheck2 className="h-4 w-4 text-orange-500" />{" "}
                    Authorised Letter
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Review the company request letter for purpose:{" "}
                    <strong>{selectedRequest.purposeOfVisitId}</strong>
                  </p>
                </div>
                <a
                  href={`${AGENT_API}/${selectedRequest.authLetterFilePath}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-orange-50 text-orange-700 border border-orange-200 px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-orange-100 transition-colors"
                >
                  <Eye className="h-4 w-4" /> View Document
                </a>
              </div>

              {/* Personnel Verification */}
              {selectedRequest.persons &&
                selectedRequest.persons.length > 0 && (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-3 bg-slate-100 border-b border-slate-200">
                      <h4 className="text-xs font-black text-[#0a1e4d] uppercase tracking-widest flex items-center gap-2">
                        <Users className="h-4 w-4" /> Personnel Data
                      </h4>
                    </div>
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="p-3 font-semibold text-slate-600 uppercase text-xs">
                            Name & Role
                          </th>
                          <th className="p-3 font-semibold text-slate-600 uppercase text-xs">
                            Aadhar
                          </th>
                          <th className="p-3 font-semibold text-slate-600 uppercase text-xs">
                            Pass Details
                          </th>
                          <th className="p-3 font-semibold text-slate-600 uppercase text-xs text-right">
                            Docs
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedRequest.persons.map((p, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-3 font-bold text-[#0a1e4d]">
                              {p.name}{" "}
                              <span className="block font-medium text-xs text-slate-500">
                                {p.hepTypeId}
                              </span>
                            </td>
                            <td className="p-3 text-slate-600 font-mono text-xs">
                              {p.aadharNo}
                            </td>
                            <td className="p-3 text-slate-600 text-xs font-bold capitalize">
                              {p.passType}
                            </td>
                            <td className="p-3 text-right">
                              <button className="text-blue-600 hover:text-blue-800 text-xs font-bold underline">
                                Verify Docs
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

              {/* Vehicles Verification */}
              {selectedRequest.vehicles &&
                selectedRequest.vehicles.length > 0 && (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-3 bg-slate-100 border-b border-slate-200">
                      <h4 className="text-xs font-black text-[#0a1e4d] uppercase tracking-widest flex items-center gap-2">
                        <Truck className="h-4 w-4" /> Vehicle Data
                      </h4>
                    </div>
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="p-3 font-semibold text-slate-600 uppercase text-xs">
                            Reg No
                          </th>
                          <th className="p-3 font-semibold text-slate-600 uppercase text-xs">
                            Type
                          </th>
                          <th className="p-3 font-semibold text-slate-600 uppercase text-xs">
                            Pass Details
                          </th>
                          <th className="p-3 font-semibold text-slate-600 uppercase text-xs text-right">
                            Docs
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedRequest.vehicles.map((v, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-3 font-bold text-[#0a1e4d] uppercase">
                              {v.registrationNo}
                            </td>
                            <td className="p-3 text-slate-600 text-xs font-medium">
                              {v.vehicleTypeId}
                            </td>
                            <td className="p-3 text-slate-600 text-xs font-bold capitalize">
                              {v.passType}
                            </td>
                            <td className="p-3 text-right">
                              <button className="text-blue-600 hover:text-blue-800 text-xs font-bold underline">
                                Verify Docs
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
            </div>

            {/* Action Footer */}
            <div className="flex justify-end gap-4 p-5 border-t border-slate-200 bg-white rounded-b-2xl">
              <button
                onClick={() => handleAction(selectedRequest.id, "reject")}
                className="bg-white text-red-600 border border-red-200 px-6 py-2.5 rounded-xl font-bold hover:bg-red-50 transition-colors flex items-center gap-2"
              >
                <XCircle className="h-5 w-5" /> Reject Request
              </button>
              <button
                onClick={() => handleAction(selectedRequest.id, "approve")}
                className="bg-emerald-600 text-white px-8 py-2.5 rounded-xl font-bold shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-colors flex items-center gap-2"
              >
                <CheckCircle2 className="h-5 w-5" /> Approve Passes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
