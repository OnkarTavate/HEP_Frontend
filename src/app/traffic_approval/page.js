"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  Search,
  FileText,
  History,
  ShieldAlert,
  Clock,
  XCircle,
  Truck,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function TrafficPassesPage() {
  const [activeTab, setActiveTab] = useState("pending");
  const [searchQuery, setSearchQuery] = useState("");

  // Dummy data based on your wireframe requirements
  const pendingPasses = [
    {
      id: "REQ-9001",
      company: "Global Marine Traders",
      type: "Vehicle Heavy (Yearly)",
      date: "18-Mar-2026 09:30 AM",
    },
    {
      id: "REQ-9002",
      company: "Evergreen Logistics",
      type: "Driver (Monthly)",
      date: "18-Mar-2026 10:15 AM",
    },
  ];

  const processedPasses = [
    {
      id: "REQ-8990",
      company: "Alpha Transports",
      type: "Personnel (Daily)",
      date: "17-Mar-2026",
      status: "approved",
    },
    {
      id: "REQ-8985",
      company: "Omega Shipping",
      type: "Vehicle (Monthly)",
      date: "16-Mar-2026",
      status: "rejected",
    },
  ];

  // Derived stats for the Cards
  const totalPasses = pendingPasses.length + processedPasses.length;
  const approvedCount = processedPasses.filter(
    (p) => p.status === "approved",
  ).length;
  const rejectedCount = processedPasses.filter(
    (p) => p.status === "rejected",
  ).length;

  const currentData = activeTab === "pending" ? pendingPasses : processedPasses;
  const filteredData = currentData.filter(
    (req) =>
      req.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.company.toLowerCase().includes(searchQuery.toLowerCase()),
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
        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
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
        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
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
        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
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
        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
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
                  Pass Type
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
              {filteredData.map((pass) => (
                <tr
                  key={pass.id}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <td className="px-6 py-4 text-sm font-bold text-[#0a1e4d]">
                    {pass.id}
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-slate-700">
                    {pass.company}
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-[11px] font-bold border border-blue-200">
                      {pass.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {pass.date}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {activeTab === "pending" ? (
                      <button className="bg-[#0a1e4d] text-white px-5 py-2 rounded-lg text-xs font-bold hover:opacity-90 shadow-md transition-all">
                        Review Details
                      </button>
                    ) : (
                      <span
                        className={`px-3 py-1 rounded-full text-[11px] font-bold border ${pass.status === "approved" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"}`}
                      >
                        {pass.status.toUpperCase()}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan="5" className="py-16 text-center text-slate-500">
                    <ShieldAlert className="h-10 w-10 mx-auto text-slate-200 mb-3" />
                    <p className="text-sm font-medium">No requests found.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
