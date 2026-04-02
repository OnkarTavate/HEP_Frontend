"use client";

import React, { useState } from "react";
import {
  Search,
  Building2,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  FileText,
  Filter,
  ShieldAlert,
  ChevronRight,
  Download,
  AlertCircle
} from "lucide-react";

// Mock Data representing the Agents table from your backend
const initialRequests = [
  {
    id: "CHPT103152",
    company: "Global Marine Traders",
    userType: "Steamer Agent",
    applicant: "S. Karthikeyan",
    email: "admin@gmt.com",
    mobile: "+91 9876543210",
    date: "26-Mar-2026 09:30 AM",
    status: "pending",
    documents: [
      { name: "Customs_License.pdf", status: "uploaded" },
      { name: "Port_Approval.pdf", status: "uploaded" },
      { name: "PAN_Card.pdf", status: "uploaded" },
      { name: "GST_Certificate.pdf", status: "uploaded" }
    ]
  },
  {
    id: "CHPT103153",
    company: "Evergreen Logistics",
    userType: "Transporting firms",
    applicant: "Rajesh Kumar",
    email: "contact@evergreen.in",
    mobile: "+91 9123456789",
    date: "26-Mar-2026 10:15 AM",
    status: "pending",
    documents: [
      { name: "Cert_of_Incorporation.pdf", status: "uploaded" },
      { name: "PAN_Card.pdf", status: "uploaded" },
      { name: "GST_Certificate.pdf", status: "uploaded" }
    ]
  },
  {
    id: "CHPT103140",
    company: "Alpha Transports",
    userType: "CHA",
    applicant: "Vikram Singh",
    email: "ops@alpha.com",
    mobile: "+91 9988776655",
    date: "25-Mar-2026 04:20 PM",
    status: "approved",
    processedDate: "26-Mar-2026 08:10 AM"
  }
];

export default function AdminApprovalPage() {
  const [activeTab, setActiveTab] = useState("pending");
  const [requests, setRequests] = useState(initialRequests);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modal State
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [remarks, setRemarks] = useState("");

  // Derived Data
  const pendingRequests = requests.filter(r => r.status === "pending" && (r.id.includes(searchQuery) || r.company.toLowerCase().includes(searchQuery.toLowerCase())));
  const processedRequests = requests.filter(r => r.status !== "pending" && (r.id.includes(searchQuery) || r.company.toLowerCase().includes(searchQuery.toLowerCase())));

  // Handlers
  const handleAction = (status) => {
    if (!selectedRequest) return;

    // Simulate API call to update status
    setRequests(prev => prev.map(req => 
      req.id === selectedRequest.id 
        ? { ...req, status, processedDate: "Just Now", remarks } 
        : req
    ));

    setSelectedRequest(null);
    setRemarks("");
  };

  return (
    <div className="space-y-6">
      {/* Page Header & Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-orange-100 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-orange-50 rounded-full blur-2xl group-hover:bg-orange-100 transition-colors" />
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Pending Approval</p>
              <p className="text-4xl font-black text-slate-800">{requests.filter(r => r.status === 'pending').length}</p>
            </div>
            <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center border border-orange-100">
              <Clock className="h-7 w-7 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-emerald-50 rounded-full blur-2xl group-hover:bg-emerald-100 transition-colors" />
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Approved Today</p>
              <p className="text-4xl font-black text-slate-800">{requests.filter(r => r.status === 'approved').length}</p>
            </div>
            <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center border border-emerald-100">
              <CheckCircle2 className="h-7 w-7 text-emerald-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-red-100 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-red-50 rounded-full blur-2xl group-hover:bg-red-100 transition-colors" />
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Rejected</p>
              <p className="text-4xl font-black text-slate-800">{requests.filter(r => r.status === 'rejected').length}</p>
            </div>
            <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center border border-red-100">
              <XCircle className="h-7 w-7 text-red-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 md:p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50/50">
          
          {/* Custom Tab Switcher */}
          <div className="flex bg-slate-200/50 p-1 rounded-xl w-full md:w-auto">
            <button 
              onClick={() => setActiveTab("pending")}
              className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'pending' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Clock className="h-4 w-4" /> Pending ({pendingRequests.length})
            </button>
            <button 
              onClick={() => setActiveTab("processed")}
              className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'processed' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <CheckCircle2 className="h-4 w-4" /> Processed
            </button>
          </div>

          {/* Search & Filter */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search Reference or Company..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 h-11 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all"
              />
            </div>
            <button className="h-11 px-4 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 flex items-center gap-2 font-medium text-sm transition-colors">
              <Filter className="h-4 w-4" /> Filter
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="py-4 px-6 text-xs font-extrabold text-slate-500 uppercase tracking-wider">Ref ID</th>
                <th className="py-4 px-6 text-xs font-extrabold text-slate-500 uppercase tracking-wider">Entity Details</th>
                <th className="py-4 px-6 text-xs font-extrabold text-slate-500 uppercase tracking-wider">Type</th>
                <th className="py-4 px-6 text-xs font-extrabold text-slate-500 uppercase tracking-wider">{activeTab === 'pending' ? 'Applied On' : 'Status'}</th>
                <th className="py-4 px-6 text-xs font-extrabold text-slate-500 uppercase tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(activeTab === 'pending' ? pendingRequests : processedRequests).map((req) => (
                <tr key={req.id} className="hover:bg-orange-50/30 transition-colors group">
                  <td className="py-4 px-6">
                    <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-1 rounded-md text-sm">{req.id}</span>
                  </td>
                  <td className="py-4 px-6">
                    <p className="font-bold text-slate-800">{req.company}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{req.applicant} • {req.mobile}</p>
                  </td>
                  <td className="py-4 px-6">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-700 border border-orange-200">
                      {req.userType}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    {activeTab === 'pending' ? (
                      <p className="text-sm text-slate-600 font-medium">{req.date}</p>
                    ) : (
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
                        req.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
                      }`}>
                        {req.status === 'approved' ? <CheckCircle2 className="h-3 w-3"/> : <XCircle className="h-3 w-3"/>}
                        {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button 
                      onClick={() => setSelectedRequest(req)}
                      className="inline-flex items-center gap-2 bg-white border border-slate-200 text-slate-700 hover:text-orange-600 hover:border-orange-300 hover:bg-orange-50 px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-all"
                    >
                      <Eye className="h-4 w-4" /> Review
                    </button>
                  </td>
                </tr>
              ))}

              {(activeTab === 'pending' ? pendingRequests : processedRequests).length === 0 && (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-slate-500">
                    <ShieldAlert className="h-12 w-12 mx-auto text-slate-300 mb-3" />
                    <p className="text-lg font-medium text-slate-600">No records found</p>
                    <p className="text-sm">You're all caught up!</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Modal / Slide-over Overlay */}
      {selectedRequest && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center px-8 py-5 border-b border-slate-100 bg-slate-50/80">
              <div className="flex items-center gap-4">
                <div className="bg-orange-100 p-2.5 rounded-xl border border-orange-200">
                  <Building2 className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800 leading-tight">Review Entity Registration</h2>
                  <p className="text-xs text-slate-500 font-medium tracking-wide mt-0.5 uppercase">Reference: {selectedRequest.id}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedRequest(null)}
                className="p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors"
              >
                <XCircle className="h-7 w-7" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-8 overflow-y-auto flex-1 bg-slate-50/30 space-y-8">
              
              {/* Info Grid */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-sm font-black text-slate-800 mb-5 border-b border-slate-100 pb-3 uppercase tracking-widest flex items-center gap-2">
                  <FileText className="h-4 w-4 text-orange-600" />
                  Entity Details
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">Company Name</label>
                    <p className="text-sm font-bold text-slate-800">{selectedRequest.company}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">User Type</label>
                    <span className="inline-flex px-2 py-1 rounded bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200">
                      {selectedRequest.userType}
                    </span>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">Applicant Name</label>
                    <p className="text-sm font-bold text-slate-800">{selectedRequest.applicant}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">Applied Date</label>
                    <p className="text-sm font-bold text-slate-800">{selectedRequest.date}</p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">Email Address</label>
                    <p className="text-sm font-bold text-slate-800">{selectedRequest.email}</p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">Mobile Number</label>
                    <p className="text-sm font-bold text-slate-800">{selectedRequest.mobile}</p>
                  </div>
                </div>
              </div>

              {/* Documents Checklist */}
              {selectedRequest.documents && (
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="text-sm font-black text-slate-800 mb-5 border-b border-slate-100 pb-3 uppercase tracking-widest flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-orange-600" />
                    Verification Documents
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedRequest.documents.map((doc, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-orange-300 hover:bg-orange-50 transition-colors group cursor-pointer">
                        <div className="flex items-center gap-3">
                          <div className="bg-slate-100 p-2 rounded-lg group-hover:bg-orange-100 transition-colors">
                            <FileText className="h-5 w-5 text-slate-500 group-hover:text-orange-600" />
                          </div>
                          <span className="text-sm font-bold text-slate-700">{doc.name}</span>
                        </div>
                        <button className="text-orange-600 hover:text-orange-800 bg-white p-2 rounded-lg shadow-sm border border-orange-100 opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1 text-xs font-bold">
                          <Download className="h-3 w-3" /> View
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Admin Remarks */}
              {selectedRequest.status === 'pending' && (
                <div className="bg-orange-50/50 p-6 rounded-2xl border border-orange-100 shadow-inner">
                  <label className="flex items-center gap-2 text-xs font-bold text-orange-900 uppercase tracking-wider mb-3">
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                    Authority Remarks / Reason for Rejection
                  </label>
                  <textarea 
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="w-full border border-orange-200 rounded-xl p-4 text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none bg-white shadow-sm"
                    rows="3"
                    placeholder="Enter official remarks before approving or rejecting..."
                  ></textarea>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="p-6 border-t border-slate-100 bg-white flex justify-end gap-4">
              {selectedRequest.status === 'pending' ? (
                <>
                  <button 
                    onClick={() => handleAction('rejected')}
                    className="px-8 py-3 bg-white border-2 border-red-100 text-red-600 hover:bg-red-50 hover:border-red-200 rounded-xl font-bold flex items-center gap-2 transition-all"
                  >
                    <XCircle className="h-5 w-5" /> Reject Application
                  </button>
                  <button 
                    onClick={() => handleAction('approved')}
                    className="gradient-orange hover:opacity-90 text-white shadow-lg shadow-orange-600/25 px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all"
                  >
                    <CheckCircle2 className="h-5 w-5" /> Approve & Generate ID
                  </button>
                </>
              ) : (
                <button 
                  onClick={() => setSelectedRequest(null)}
                  className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all"
                >
                  Close View
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}