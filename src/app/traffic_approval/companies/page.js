"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Search,
  Building2,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  FileText,
  Eye,
  History,
} from "lucide-react";

const BASE_URL = process.env.NEXT_PUBLIC_ADMIN_API;
// Fallback logic to grab the documents from the agent API port (5001)
const AGENT_API =
  process.env.NEXT_PUBLIC_AGENT_API || "http://localhost:5001/api";
const DOC_BASE_URL = AGENT_API.replace("/api", "");

export default function TrafficCompanyApprovals() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("pending");

  // Modal States
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [remarks, setRemarks] = useState("");

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/user/agent-users`);
      setRequests(response.data.data || response.data);
    } catch (error) {
      console.error("Failed to fetch requests", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (decision) => {
    // 1. Frontend Validation (Matches your backend's rejection requirement)
    if (decision === "rejected" && !remarks.trim()) {
      alert("Please provide a reason for rejection in the remarks field.");
      return;
    }

    if (!window.confirm(`Are you sure you want to ${decision} this company?`))
      return;

    try {
      // 2. API Trigger: Matches router.put("/agent-request") in your userRoutes.js
      const response = await axios.put(`${BASE_URL}/user/agent-request`, {
        agentId: selectedRequest.id,
        decision: decision, // Sends "approved" or "rejected"
        rejectedReason: decision === "rejected" ? remarks : null,
      });

      if (response.data.success) {
        alert(
          `Company ${decision} successfully! Email notifications have been triggered.`,
        );

        // 3. Cleanup & Refresh UI
        setSelectedRequest(null);
        setRemarks("");
        fetchDashboardData();
      }
    } catch (error) {
      console.error("Action failed:", error);
      // Grabs the exact error message from your backend if it fails
      alert(
        error.response?.data?.message ||
          "Failed to process action. Please check your backend services.",
      );
    }
  };

  if (loading)
    return (
      <div className="p-12 text-center text-slate-500 font-medium">
        Loading Company Requests...
      </div>
    );

  // Filter Data for Tabs
  const pendingRequests = requests.filter(
    (r) => r.status === "pending" || !r.status,
  );
  const processedRequests = requests.filter(
    (r) => r.status === "approved" || r.status === "rejected",
  );

  const displayedRequests = (
    activeTab === "pending" ? pendingRequests : processedRequests
  ).filter(
    (req) =>
      req.referenceNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.entityName?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-6 font-sans">
      <header className="bg-white/80 backdrop-blur-lg rounded-xl p-6 flex items-center justify-between shadow-sm border border-slate-200">
        <div className="flex items-center gap-4">
          <div className="bg-orange-100 p-3 rounded-xl">
            <Building2 className="h-6 w-6 text-[#ff6b00]" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[#0a1e4d]">
              Company Registration Approvals
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Verify documents and approve new port operators
            </p>
          </div>
        </div>
      </header>

      {/* TABS */}
      <div className="flex gap-4 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab("pending")}
          className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === "pending" ? "bg-slate-800 text-white" : "text-slate-500 hover:bg-slate-100"}`}
        >
          Pending Approvals ({pendingRequests.length})
        </button>
        <button
          onClick={() => setActiveTab("processed")}
          className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === "processed" ? "bg-slate-800 text-white" : "text-slate-500 hover:bg-slate-100"}`}
        >
          Processed ({processedRequests.length})
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="flex flex-col md:flex-row items-center justify-between border-b border-slate-100 bg-slate-50/50 p-4 gap-4">
          <h3 className="font-bold text-slate-900 uppercase text-xs tracking-widest pl-2 flex items-center gap-2">
            {activeTab === "pending" ? (
              <ShieldAlert className="h-4 w-4 text-[#ff6b00]" />
            ) : (
              <History className="h-4 w-4 text-[#ff6b00]" />
            )}
            {activeTab === "pending"
              ? "Awaiting Traffic Approval"
              : "Processed Companies"}
          </h3>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search Company or Ref..."
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
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">
                  Ref No
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">
                  Company Name
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">
                  Operator Type
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-center">
                  {activeTab === "pending" ? "Action" : "Status"}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {displayedRequests.map((req) => (
                <tr
                  key={req.id}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <td className="px-6 py-4 text-sm font-bold text-[#0a1e4d]">
                    {req.referenceNumber}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-bold text-slate-800">
                      {req.entityName}
                    </div>
                    <div className="text-xs text-slate-500">{req.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-[11px] font-bold border border-blue-200">
                      {req.userTypeName || "Agent"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {activeTab === "pending" ? (
                      <button
                        onClick={() => setSelectedRequest(req)}
                        className="bg-[#0a1e4d] text-white px-5 py-2 rounded-lg text-xs font-bold hover:opacity-90 shadow-md"
                      >
                        Review Details
                      </button>
                    ) : (
                      <span
                        className={`px-3 py-1 rounded-full text-[11px] font-bold border ${req.status === "approved" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"}`}
                      >
                        {req.status.toUpperCase()}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {displayedRequests.length === 0 && (
                <tr>
                  <td colSpan="4" className="py-16 text-center text-slate-500">
                    <Building2 className="h-10 w-10 mx-auto text-slate-200 mb-3" />
                    <p className="text-sm font-medium">No records found.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADMIN-STYLE REVIEW DETAILS MODAL */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h2 className="text-xl font-bold text-[#0a1e4d] flex items-center gap-2">
                <Building2 className="text-orange-600" /> Company Verification
              </h2>
              <button
                onClick={() => {
                  setSelectedRequest(null);
                  setRemarks("");
                }}
                className="text-slate-400 hover:text-red-500 transition-colors"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50 space-y-6">
              {/* General Information */}
              <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2 text-sm uppercase tracking-wider text-orange-600">
                  Company Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Reference Number
                    </label>
                    <div className="bg-slate-50 border border-slate-200 rounded p-2 text-sm font-bold text-[#0a1e4d]">
                      {selectedRequest.referenceNumber}
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Entity Name
                    </label>
                    <div className="bg-slate-50 border border-slate-200 rounded p-2 text-sm font-medium">
                      {selectedRequest.entityName}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Operator Type
                    </label>
                    <div className="bg-slate-50 border border-slate-200 rounded p-2 text-sm font-bold text-blue-700">
                      {selectedRequest.userTypeName || "N/A"}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Contact Email
                    </label>
                    <div className="bg-slate-50 border border-slate-200 rounded p-2 text-sm font-medium">
                      {selectedRequest.email}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Mobile No.
                    </label>
                    <div className="bg-slate-50 border border-slate-200 rounded p-2 text-sm font-medium">
                      {selectedRequest.mobileNo}
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Address
                    </label>
                    <div className="bg-slate-50 border border-slate-200 rounded p-2 text-sm font-medium">
                      {selectedRequest.addressLine}, {selectedRequest.city},{" "}
                      {selectedRequest.state} - {selectedRequest.pincode}
                    </div>
                  </div>
                </div>
              </div>

              {/* Identification */}
              <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-800 mb-3 border-b border-slate-100 pb-2 text-sm uppercase tracking-wider text-[#0a1e4d]">
                  Identification Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      GSTIN Number
                    </label>
                    <div className="text-sm font-bold text-slate-800">
                      {selectedRequest.gstinNumber || "N/A"}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      PAN Number
                    </label>
                    <div className="text-sm font-bold text-slate-800">
                      {selectedRequest.panNumber || "N/A"}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      TAN Number
                    </label>
                    <div className="text-sm font-bold text-slate-800">
                      {selectedRequest.tanNumber || "N/A"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Verification Documents */}
              <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-2 mb-4 uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle2 className="text-[#ff6b00] h-5 w-5" />{" "}
                  Verification Documents
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {selectedRequest.entityFile && (
                    <a
                      href={`${DOC_BASE_URL}/${selectedRequest.entityFile}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-colors group"
                    >
                      <FileText className="text-blue-500 h-5 w-5" />
                      <span className="text-xs font-bold text-slate-700 truncate group-hover:text-blue-700">
                        Entity Document
                      </span>
                      <Eye className="h-4 w-4 ml-auto text-slate-400 group-hover:text-blue-500" />
                    </a>
                  )}
                  {selectedRequest.gstinDoc && (
                    <a
                      href={`${DOC_BASE_URL}/${selectedRequest.gstinDoc}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-colors group"
                    >
                      <FileText className="text-blue-500 h-5 w-5" />
                      <span className="text-xs font-bold text-slate-700 truncate group-hover:text-blue-700">
                        GSTIN Document
                      </span>
                      <Eye className="h-4 w-4 ml-auto text-slate-400 group-hover:text-blue-500" />
                    </a>
                  )}
                  {selectedRequest.panDoc && (
                    <a
                      href={`${DOC_BASE_URL}/${selectedRequest.panDoc}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-colors group"
                    >
                      <FileText className="text-blue-500 h-5 w-5" />
                      <span className="text-xs font-bold text-slate-700 truncate group-hover:text-blue-700">
                        PAN Document
                      </span>
                      <Eye className="h-4 w-4 ml-auto text-slate-400 group-hover:text-blue-500" />
                    </a>
                  )}
                  {selectedRequest.tanDoc && (
                    <a
                      href={`${DOC_BASE_URL}/${selectedRequest.tanDoc}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-colors group"
                    >
                      <FileText className="text-blue-500 h-5 w-5" />
                      <span className="text-xs font-bold text-slate-700 truncate group-hover:text-blue-700">
                        TAN Document
                      </span>
                      <Eye className="h-4 w-4 ml-auto text-slate-400 group-hover:text-blue-500" />
                    </a>
                  )}
                </div>
              </div>

              {/* Remarks */}
              <div className="bg-orange-50 p-5 rounded-lg border border-orange-200 shadow-sm">
                <label className="block text-xs font-bold text-orange-900 uppercase tracking-wider mb-3">
                  Authority Remarks / Reason for Rejection
                </label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full border border-orange-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-[#ff6b00]/20 focus:border-[#ff6b00] outline-none shadow-inner bg-white"
                  rows="3"
                  placeholder="Enter specific remarks if rejecting..."
                ></textarea>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-4 border-t border-slate-200 bg-white">
              <button
                onClick={() => handleAction("rejected")}
                className="bg-white border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 transition-all"
              >
                <XCircle className="h-5 w-5" />
                Reject Application
              </button>
              <button
                onClick={() => handleAction("approved")}
                className="bg-[#10b981] text-white px-8 py-2.5 rounded-lg shadow-md font-bold hover:bg-[#059669] flex items-center gap-2 transition-all"
              >
                <CheckCircle2 className="h-5 w-5" />
                Approve Company
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
