"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import {
  CheckCircle2,
  Search,
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
  Building2,
  FileText,
  User,
  MapPin,
  Briefcase,
  AlertCircle,
  Maximize,
  Minimize,
  Loader2,
  Filter,
  Phone,
  Mail,
  CreditCard,
  RefreshCw,
} from "lucide-react";

const AGENT_API = process.env.NEXT_PUBLIC_AGENT_API || "http://localhost:5001/api";

const ADMIN_API = process.env.NEXT_PUBLIC_ADMIN_API;

// --- URL Helper to reliably strip '/api' for static file fetching ---
const getFileUrl = (path) => {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${AGENT_API}${path.startsWith("/") ? "" : "/"}${path}`;
};

const extractEntityIndex = (entityId) => {
  // Vendor pass entity IDs are in format "vpr-{id}-p-{index}" or "vpr-{id}-v-{index}"
  if (!entityId || typeof entityId !== "string") return 0;
  const parts = entityId.split("-");
  const index = parseInt(parts[parts.length - 1]);
  return isNaN(index) ? 0 : index;
};

// --- Reusable UI Components ---
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

const DocumentCard = ({
  label,
  filePath,
  documentType,
  passRequestId,
  onView,
  entityIndex = 0,
  isVendorPass = false,
}) => {
  if (!filePath) return null; // Only renders if the file exists in the JSON data
  return (
    <button
      onClick={() => onView(passRequestId, documentType, filePath, entityIndex, isVendorPass)}
      className="flex items-center w-full justify-between bg-white p-3 rounded-lg border border-slate-200 hover:border-[#0a1e4d] hover:shadow-sm transition-all group"
    >
      <div className="flex items-center gap-2 overflow-hidden">
        <FileText className="h-4 w-4 text-orange-500 flex-shrink-0" />
        <span className="font-medium text-xs text-slate-700 truncate group-hover:text-[#0a1e4d]">
          {label}
        </span>
      </div>
      <Eye className="h-4 w-4 text-slate-400 group-hover:text-[#0a1e4d] flex-shrink-0 ml-2" />
    </button>
  );
};

export default function TrafficPassesPage() {
  const [activeTab, setActiveTab] = useState("pending");
  const [cardFilter, setCardFilter] = useState("ALL");
  const [isViewMode, setIsViewMode] = useState(false);
  // Search and Sort States
  const [searchInput, setSearchInput] = useState("");
  const [sortBy, setSortBy] = useState("DATE_DESC");

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Main Modal & Profile States
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [companyProfile, setCompanyProfile] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Entity Verification Modal States
  const [entityModal, setEntityModal] = useState({
    isOpen: false,
    data: null,
    type: null,
  });

  // Granular Entity Tracking
  const [entityStatuses, setEntityStatuses] = useState({
    persons: {},
    vehicles: {},
  });
  const [entityRemarks, setEntityRemarks] = useState({
    persons: {},
    vehicles: {},
  });
  const [currentRemark, setCurrentRemark] = useState("");

  // PDF Viewer States
  const [viewingDocUrl, setViewingDocUrl] = useState(null);
  const [isImage, setIsImage] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(true);

  useEffect(() => {
    if (viewingDocUrl) {
      setIframeLoading(true);
    }
  }, [viewingDocUrl]);

  const fetchPassRequests = async () => {
    try {
      const token = localStorage.getItem("accessToken");
      const response = await axios.get(
        `${AGENT_API}/pass-request/get-agent-pass-requests`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (response.data && response.data.success) {
        console.log("API RESPONSE:", response.data.data); // ✅ ADD THIS
        setRequests(response.data.data || []);
      } else {
        setRequests([]);
      }
    } catch (error) {
      console.error("Failed to fetch requests", error);
      toast.error("Failed to load pass requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPassRequests();
    // fetchCompanyProfile();
  }, []);

  // const fetchCompanyProfile = async () => {
  //   try {
  //     const token = localStorage.getItem("accessToken");
  //     const response = await axios.get(`${AGENT_API}/agents/profile`, {
  //       headers: { Authorization: `Bearer ${token}` },
  //     });
  //     if (response.data && response.data.success) {
  //       setCompanyProfile(response.data.data);
  //     }
  //   } catch (error) {
  //     console.error("Failed to fetch company profile", error);
  //     setCompanyProfile({
  //       entityName: "N/A",
  //       email: "Not provided",
  //       mobileNo: "Not provided",
  //       gstinNumber: "N/A",
  //       panNumber: "N/A",
  //     });
  //   }
  // };

  const handleViewDoc = (passRequestId, documentType, staticPath, entityIndex = 0, isVendorPass = false) => {
    // Check if the file is an image based on its extension
    const isImg = staticPath && /\.(jpe?g|png|gif|webp)$/i.test(staticPath);
    setIsImage(!!isImg);

    if (documentType === "authLetter") {
      setViewingDocUrl(getFileUrl(staticPath));
    } else {
      setViewingDocUrl(
        `${AGENT_API}/pass-request/viewPassRequestsDocument?passRequestId=${passRequestId}&documentType=${documentType}&entityIndex=${entityIndex}&isVendorPass=${isVendorPass}`,
      );
    }
  };
  const handleEntityDecision = (status) => {
    if ((status === "REJECTED" || status === "REVERTED") && !currentRemark.trim()) {
      toast.error(`${status === "REVERTED" ? "Revert" : "Rejection"} Reason Required`, {
        description:
          status === "REVERTED"
            ? "You must provide a remark explaining what needs to be corrected."
            : "You must provide a remark explaining why this pass is being rejected.",
      });
      return;
    }

    const category = entityModal.type === "person" ? "persons" : "vehicles";

    setEntityStatuses((prev) => ({
      ...prev,
      [category]: { ...prev[category], [entityModal.data.id]: status },
    }));

    setEntityRemarks((prev) => ({
      ...prev,
      [category]: { ...prev[category], [entityModal.data.id]: currentRemark },
    }));

    setEntityModal({ isOpen: false, data: null, type: null });
  };

  const handleSubmitReview = async () => {
    const persons = selectedRequest.persons || [];
    const vehicles = selectedRequest.vehicles || [];
    let reviewStatus = null;
    let responseMessage = null;

    // 1. VALIDATION: Only pending/reverted entities need a decision
    // Already approved/rejected entities are pre-populated in entityStatuses
    const unverifiedPersons = persons.filter(
      (p) => !entityStatuses.persons[p.id] && (p.status === 'pending' || p.status === 'reverted'),
    );
    const unverifiedVehicles = vehicles.filter(
      (v) => !entityStatuses.vehicles[v.id] && (v.status === 'pending' || v.status === 'reverted'),
    );

    if (unverifiedPersons.length > 0 || unverifiedVehicles.length > 0) {
      toast.warning("Incomplete Verification", {
        description:
          "You must approve, reject, or revert all pending persons and vehicles before submitting.",
      });
      return;
    }

    const loadingToastId = toast.loading("Submitting review to backend...");

    try {
      const token = localStorage.getItem("accessToken");
      const headers = { Authorization: `Bearer ${token}` };

      // Check if this is a vendor pass
      const isVendorPass = selectedRequest.originType === "VENDOR";

      if (isVendorPass) {
        // --- VENDOR PASS APPROVAL FLOW ---
        // Use direct agent API endpoints for vendor passes
        const vendorPassId = selectedRequest.id;

        // 2. BUILD PERSON PROMISES for vendor passes
        const personPromises = persons.map((p) => {
          const status = entityStatuses.persons[p.id];
          const personIndex = extractEntityIndex(p.id);
          const remark = entityRemarks.persons[p.id];

          if (status === "APPROVED") {
            return axios.put(
              `${AGENT_API}/vendor-pass/${vendorPassId}/approve-person/${personIndex}`,
              {},
              { headers }
            );
          } else if (status === "REVERTED") {
            return axios.put(
              `${AGENT_API}/vendor-pass/${vendorPassId}/revert-person/${personIndex}`,
              { revertReason: remark },
              { headers }
            );
          } else {
            return axios.put(
              `${AGENT_API}/vendor-pass/${vendorPassId}/reject-person/${personIndex}`,
              { rejectedReason: remark },
              { headers }
            );
          }
        });

        // 3. BUILD VEHICLE PROMISES for vendor passes
        const vehiclePromises = vehicles.map((v) => {
          const status = entityStatuses.vehicles[v.id];
          const vehicleIndex = extractEntityIndex(v.id);
          const remark = entityRemarks.vehicles[v.id];

          if (status === "APPROVED") {
            return axios.put(
              `${AGENT_API}/vendor-pass/${vendorPassId}/approve-vehicle/${vehicleIndex}`,
              {},
              { headers }
            );
          } else if (status === "REVERTED") {
            return axios.put(
              `${AGENT_API}/vendor-pass/${vendorPassId}/revert-vehicle/${vehicleIndex}`,
              { revertReason: remark },
              { headers }
            );
          } else {
            return axios.put(
              `${AGENT_API}/vendor-pass/${vendorPassId}/reject-vehicle/${vehicleIndex}`,
              { rejectedReason: remark },
              { headers }
            );
          }
        });

        // 4. EXECUTE ALL ENTITY ACTIONS CONCURRENTLY
        await Promise.all([...personPromises, ...vehiclePromises]);

        // 5. FINALLY, SUBMIT THE 'COMPLETE-REVIEW' FLAG
        await axios.put(
          `${AGENT_API}/vendor-pass/${vendorPassId}/complete-review`,
          {},
          { headers }
        );
      } else {
        // --- NORMAL PASS APPROVAL FLOW (Admin Service) ---
        const actionUrl = `${ADMIN_API}/pass-request/agent-pass-request-action`;

        // 2. BUILD PERSON PAYLOADS
        const personPromises = persons.map((p) => {
          const status = entityStatuses.persons[p.id];
          const remark = entityRemarks.persons[p.id];

          const payload = {
            personId: p.id,
            decision:
              status === "APPROVED"
                ? "approve-person"
                : status === "REVERTED"
                  ? "revert-person"
                  : "reject-person",
          };

          if (status === "REJECTED") {
            payload.rejectedReason = remark;
          } else if (status === "REVERTED") {
            payload.revertReason = remark;
          }

          return axios.patch(actionUrl, payload, { headers });
        });

        // 3. BUILD VEHICLE PAYLOADS
        const vehiclePromises = vehicles.map((v) => {
          const status = entityStatuses.vehicles[v.id];
          const remark = entityRemarks.vehicles[v.id];

          const payload = {
            vehicleId: v.id,
            decision:
              status === "APPROVED"
                ? "approve-vehicle"
                : status === "REVERTED"
                  ? "revert-vehicle"
                  : "reject-vehicle",
          };

          if (status === "REJECTED") {
            payload.rejectedReason = remark;
          } else if (status === "REVERTED") {
            payload.revertReason = remark;
          }

          return axios.patch(actionUrl, payload, { headers });
        });

        // 4. EXECUTE ALL ENTITY ACTIONS CONCURRENTLY
        await Promise.all([...personPromises, ...vehiclePromises]);

        // 5. FINALLY, SUBMIT THE 'COMPLETE-REVIEW' FLAG
        const finalPayload = {
          passRequestId: selectedRequest.id,
          decision: "complete-review",
        };

        const completeResponse = await axios.patch(actionUrl, finalPayload, { headers });
        reviewStatus = completeResponse.data?.data?.reviewStatus;
        responseMessage = completeResponse.data?.data?.message;
      }

      // 6. HANDLE SUCCESS
      if (reviewStatus === 'REVERTED') {
        toast.success("Review Saved with Reverted Entities", {
          id: loadingToastId,
          description: responseMessage || "Pass request has been reverted to the applicant for corrections.",
        });
      } else {
        toast.success("Review Submitted", {
          id: loadingToastId,
          description: responseMessage || "Pass Request review processed successfully.",
        });
      }

      setIsModalOpen(false);
      fetchPassRequests(); // Refresh the dashboard table
    } catch (error) {
      console.error("Submission error:", error);
      toast.error("Submission Failed", {
        id: loadingToastId,
        description:
          error.response?.data?.message ||
          "Failed to submit complete review to backend.",
      });
    }
  };

  const openReviewModal = (pass, viewOnly = false) => {
    setSelectedRequest(pass);

    if (!viewOnly) {
      // Pre-populate entity statuses from DB for already-decided entities
      // Only pending/reverted entities should need fresh review
      const initialPersonStatuses = {};
      const initialPersonRemarks = {};
      const initialVehicleStatuses = {};
      const initialVehicleRemarks = {};

      (pass.persons || []).forEach((p) => {
        if (p.status === 'approved') {
          // Pre-fill as APPROVED (read-only, approver cannot change)
          initialPersonStatuses[p.id] = 'APPROVED';
        } else if (p.status === 'rejected') {
          initialPersonStatuses[p.id] = 'REJECTED';
          initialPersonRemarks[p.id] = p.rejectedReason || '';
        }
        // 'pending' and 'reverted' entities need fresh review — leave empty
      });

      (pass.vehicles || []).forEach((v) => {
        if (v.status === 'approved') {
          // Pre-fill as APPROVED (read-only, approver cannot change)
          initialVehicleStatuses[v.id] = 'APPROVED';
        } else if (v.status === 'rejected') {
          initialVehicleStatuses[v.id] = 'REJECTED';
          initialVehicleRemarks[v.id] = v.rejectedReason || '';
        }
        // 'pending' and 'reverted' entities need fresh review — leave empty
      });

      setEntityStatuses({
        persons: initialPersonStatuses,
        vehicles: initialVehicleStatuses,
      });
      setEntityRemarks({
        persons: initialPersonRemarks,
        vehicles: initialVehicleRemarks,
      });
    }

    setIsViewMode(viewOnly);
    setIsModalOpen(true);
  };

  // --- FILTER & SORT LOGIC ---
  const PENDING_STATUSES = ["SUBMITTED", "PENDING", "IN_REVIEW", "VENDOR_SUBMITTED"];
  const PROCESSED_STATUSES = ["APPROVED", "REJECTED", "REVERTED", "PROCESSED", "COMPLETED"];

  const pendingPasses = requests.filter((r) =>
    PENDING_STATUSES.includes(r.status),
  );

  const processedPasses = requests.filter((r) =>
    PROCESSED_STATUSES.includes(r.status),
  );

  const approvedCount = processedPasses.filter((r) =>
    ["APPROVED", "PROCESSED", "COMPLETED"].includes(r.status),
  ).length;

  const rejectedCount = requests.filter((r) => r.status === "REJECTED").length;

  let baseData = activeTab === "pending" ? pendingPasses : processedPasses;

  if (activeTab === "processed" && cardFilter === "APPROVED") {
    baseData = baseData.filter(
      (r) => r.status === "APPROVED" || r.status === "PROCESSED",
    );
  } else if (activeTab === "processed" && cardFilter === "REJECTED") {
    baseData = baseData.filter((r) => r.status === "REJECTED");
  }

  // LIVE REAL-TIME SEARCH FILTER
  if (searchInput) {
    const searchLower = searchInput.toLowerCase();

    baseData = baseData.filter((req) => {
      const computedRef = req.referenceNo
        ? req.referenceNo.toLowerCase()
        : `req-${req.id}`;
      const rawId = req.id?.toString() || "";
      const company = (req.entityName || "").toLowerCase();

      if (
        computedRef.includes(searchLower) ||
        rawId.includes(searchLower) ||
        company.includes(searchLower)
      ) {
        return true;
      }

      const hasMatchingPerson = req.persons?.some(
        (p) =>
          (p.name && p.name.toLowerCase().includes(searchLower)) ||
          (p.aadharNo && p.aadharNo.toLowerCase().includes(searchLower)),
      );

      const hasMatchingVehicle = req.vehicles?.some(
        (v) =>
          v.registrationNo &&
          v.registrationNo.toLowerCase().includes(searchLower),
      );

      return hasMatchingPerson || hasMatchingVehicle;
    });
  }

  // Sorting
  if (sortBy === "DATE_DESC") {
    baseData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } else if (sortBy === "DATE_ASC") {
    baseData.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  } else if (sortBy === "EXPIRY_SOON") {
    baseData.sort((a, b) => {
      const getEarliestExpiry = (req) => {
        let min = Infinity;
        [...(req.persons || []), ...(req.vehicles || [])].forEach((ent) => {
          if (ent.dateTo) {
            const d = new Date(ent.dateTo).getTime();
            if (d < min) min = d;
          }
        });
        return min;
      };
      return getEarliestExpiry(a) - getEarliestExpiry(b);
    });
  }

  const filteredData = baseData;

  const handleCardClick = (tab, filter) => {
    setActiveTab(tab);
    setCardFilter(filter);
    setSearchInput("");
  };

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-6 font-sans relative">
      <header className="bg-white/80 backdrop-blur-lg rounded-xl p-6 flex items-center justify-between shadow-sm border border-slate-200">
        <div className="flex items-center gap-4">
          <div className="bg-orange-100 p-3 rounded-xl">
            <ShieldCheck className="h-6 w-6 text-[#ff6b00]" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[#0a1e4d]">
              Pass Approvals
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Review and authorize personnel and vehicle entry passes
            </p>
          </div>
        </div>
      </header>

      {/* TABS, SEARCH & SORT */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-2 mt-4">
        <div className="flex gap-4">
          <button
            onClick={() => handleCardClick("pending", "ALL")}
            className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === "pending" ? "bg-slate-800 text-white" : "text-slate-500 hover:bg-slate-100"}`}
          >
            Pending Approvals ({pendingPasses.length})
          </button>
          <button
            onClick={() => handleCardClick("processed", "ALL")}
            className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === "processed" && cardFilter === "ALL" ? "bg-slate-800 text-white" : "text-slate-500 hover:bg-slate-100"}`}
          >
            All Processed ({processedPasses.length})
          </button>
        </div>

        <div className="flex flex-col md:flex-row w-full md:w-auto gap-3 items-center">
          <div className="relative w-full md:w-auto">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full md:w-auto pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 focus:outline-none focus:border-[#ff6b00] appearance-none cursor-pointer"
            >
              <option value="DATE_DESC">Newest First</option>
              <option value="DATE_ASC">Oldest First</option>
              <option value="EXPIRY_SOON">Expiring Soon</option>
            </select>
          </div>

          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search Ref ID, Name, Reg No..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value.toUpperCase())}
              className="w-full pl-9 pr-10 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#ff6b00] focus:ring-1 focus:ring-[#ff6b00]"
            />
            {searchInput && (
              <button
                onClick={() => setSearchInput("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 transition-colors"
                title="Clear Search"
              >
                <XCircle className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* MAIN DATA TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Reference
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Company
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Entities
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Applied On
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan="5" className="py-16 text-center text-slate-500">
                    <Loader2 className="h-10 w-10 mx-auto text-slate-300 mb-3 animate-spin" />
                    <p className="text-sm font-medium">Loading requests...</p>
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-16 text-center text-slate-500">
                    <Search className="h-10 w-10 mx-auto text-slate-200 mb-3" />
                    <p className="text-sm font-medium">
                      No records found for the current filter/search.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredData.map((pass) => (
                  <tr
                    key={pass.originType === "VENDOR" ? `vpr-${pass.id}` : pass.id}
                    onClick={() =>
                      openReviewModal(pass, activeTab === "processed")
                    }
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4 text-sm font-bold text-[#0a1e4d]">
                      {pass.referenceNo || `REQ-${pass.id}`}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-700">
                      {pass.entityName || "N/A"}
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-[11px] font-bold border border-blue-200">
                        {pass.persons?.length || 0} Persons
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {new Date(pass.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`px-3 py-1 rounded-full text-[11px] font-bold border ${pass.status === "PROCESSED" ||
                          pass.status === "APPROVED"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-red-50 text-red-700 border-red-200"
                          }`}
                      >
                        {pass.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================================== */}
      {/* MAIN REQUEST VERIFICATION MODAL WITH PROFILE INTEGRATION */}
      {/* ============================================================== */}
      {isModalOpen && selectedRequest && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in zoom-in-95 duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-200">
            <div className="flex justify-between items-center px-6 py-4 bg-[#0a1e4d] text-white">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-6 w-6 text-orange-500" />
                <h2 className="text-xl font-bold tracking-wide">
                  {isViewMode ? "View Processed Pass" : "Review Submissions"}:
                  {selectedRequest.referenceNo || `REQ-${selectedRequest.id}`}
                </h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-white/70 hover:text-white p-2"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 bg-slate-50 space-y-6">
              {/* COMPANY PROFILE SUMMARY */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-start mb-4 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-blue-50 rounded-full flex items-center justify-center">
                      <Building2 className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Requesting Agency Profile
                      </h4>
                      <p className="text-lg font-bold text-[#0a1e4d]">
                        {selectedRequest.entityName || "NA"}
                      </p>
                    </div>
                  </div>
                  {selectedRequest.authLetterFilePath && (
                    <button
                      onClick={() =>
                        handleViewDoc(
                          selectedRequest.id,
                          "authLetter",
                          selectedRequest.authLetterFilePath,
                        )
                      }
                      className="bg-orange-50 text-orange-700 border border-orange-200 px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-orange-100 transition-colors"
                    >
                      <FileCheck2 className="h-4 w-4" /> View Master Auth Letter
                    </button>
                  )}
                </div>

                {/* {companyProfile ? ( */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-slate-400" />
                    <span className="text-sm font-medium text-slate-700">
                      {selectedRequest.mobileNo || "N/A"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-slate-400" />
                    <span className="text-sm font-medium text-slate-700 truncate">
                      {selectedRequest.email || "N/A"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-slate-400" />
                    <span className="text-sm font-medium text-slate-700">
                      GST: {selectedRequest.gstinNumber || "N/A"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-slate-400" />
                    <span className="text-sm font-medium text-slate-700">
                      PAN: {selectedRequest.panNumber || "N/A"}
                    </span>
                  </div>
                </div>
                {/* ) : (
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading full
                    company profile data...
                  </div>
                )} */}
              </div>

              {/* PERSONNEL REVIEW LIST */}
              {selectedRequest.persons &&
                selectedRequest.persons.length > 0 && (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-3 bg-slate-100 border-b border-slate-200 flex justify-between items-center">
                      <h4 className="text-xs font-black text-[#0a1e4d] uppercase tracking-widest flex items-center gap-2">
                        <Users className="h-4 w-4" /> Personnel Validation Queue
                      </h4>
                    </div>
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="p-3 font-semibold text-slate-600 uppercase text-xs">
                            Pass No
                          </th>
                          <th className="p-3 font-semibold text-slate-600 uppercase text-xs">
                            Name & Role
                          </th>
                          <th className="p-3 font-semibold text-slate-600 uppercase text-xs">
                            Aadhar / ID
                          </th>
                          <th className="p-3 font-semibold text-slate-600 uppercase text-xs text-right">
                            Action / Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedRequest.persons.map((p) => (
                          <tr
                            key={p.id}
                            onClick={() => {
                              if (p.status === 'pending' || p.status === 'reverted') {
                                setEntityModal({
                                  isOpen: true,
                                  data: p,
                                  type: "person",
                                });
                                setCurrentRemark(
                                  entityRemarks.persons[p.id] ||
                                  p.revertReason ||
                                  p.rejectedReason ||
                                  "",
                                );
                              }
                            }}
                            className={`transition-all hover:shadow-sm ${(p.status === 'pending' || p.status === 'reverted') ? 'hover:bg-slate-50 cursor-pointer' : 'bg-slate-50/50 cursor-default'}`}
                          >
                            <td className="p-3 text-slate-800 font-mono font-bold text-xs">
                              {p.personPassNo || "-"}
                            </td>
                            <td className="p-3 font-bold text-[#0a1e4d]">
                              {p.name}
                              <span className="block font-medium text-xs text-slate-500">
                                {p.hepTypeId} • {p.passType}
                              </span>
                            </td>
                            <td className="p-3 text-slate-600 font-mono text-xs">
                              {p.aadharNo}
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex justify-end items-center gap-3">
                                {(() => {
                                  const personStatus =
                                    entityStatuses.persons[p.id] ||
                                    p.status ||
                                    p.decision;

                                  const personRemark =
                                    entityRemarks.persons[p.id] ||
                                    p.revertReason ||
                                    p.rejectedReason;

                                  return (
                                    <>
                                      {personStatus && (
                                        <span
                                          className={`px-2 py-1 rounded text-[10px] font-bold ${personStatus === "APPROVED"
                                            ? "bg-emerald-100 text-emerald-700"
                                            : personStatus === "REVERTED"
                                              ? "bg-amber-100 text-amber-700"
                                              : "bg-red-100 text-red-700"
                                            }`}
                                        >
                                          {personStatus}
                                        </span>
                                      )}

                                      {(personStatus === "REJECTED" || personStatus === "REVERTED") &&
                                        personRemark && (
                                          <div className={`mt-1 text-[10px] p-1 rounded border inline-block ${personStatus === "REVERTED"
                                            ? "text-amber-600 bg-amber-50 border-amber-100"
                                            : "text-red-600 bg-red-50 border-red-100"
                                            }`}>
                                            {personStatus === "REVERTED" ? "Revert: " : "Reason: "}{personRemark}
                                          </div>
                                        )}
                                    </>
                                  );
                                })()}
                                {!isViewMode && (p.status === 'pending' || p.status === 'reverted') && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEntityModal({
                                        isOpen: true,
                                        data: p,
                                        type: "person",
                                      });
                                      setCurrentRemark(
                                        entityRemarks.persons[p.id] || "",
                                      );
                                    }}
                                    className="bg-[#0a1e4d] text-white hover:bg-blue-900 px-4 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm"
                                  >
                                    {entityStatuses.persons[p.id]
                                      ? "Re-verify"
                                      : "Verify"}
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

              {/* VEHICLES REVIEW LIST */}
              {selectedRequest.vehicles &&
                selectedRequest.vehicles.length > 0 && (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-3 bg-slate-100 border-b border-slate-200 flex justify-between items-center">
                      <h4 className="text-xs font-black text-[#0a1e4d] uppercase tracking-widest flex items-center gap-2">
                        <Truck className="h-4 w-4" /> Vehicle Validation Queue
                      </h4>
                    </div>
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="p-3 font-semibold text-slate-600 uppercase text-xs">
                            Pass No
                          </th>
                          <th className="p-3 font-semibold text-slate-600 uppercase text-xs">
                            Reg No
                          </th>
                          <th className="p-3 font-semibold text-slate-600 uppercase text-xs">
                            Type
                          </th>
                          <th className="p-3 font-semibold text-slate-600 uppercase text-xs text-right">
                            Action / Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedRequest.vehicles.map((v) => (
                          <tr
                            key={v.id}
                            onClick={() => {
                              if (v.status === 'pending' || v.status === 'reverted') {
                                setEntityModal({
                                  isOpen: true,
                                  data: v,
                                  type: "vehicle",
                                });
                                setCurrentRemark(
                                  entityRemarks.vehicles[v.id] ||
                                  v.revertReason ||
                                  v.rejectedReason ||
                                  "",
                                );
                              }
                            }}
                            className={`transition-all hover:shadow-sm ${(v.status === 'pending' || v.status === 'reverted') ? 'hover:bg-slate-50 cursor-pointer' : 'bg-slate-50/50 cursor-default'}`}
                          >
                            <td className="p-3 text-slate-800 font-mono font-bold text-xs">
                              {v.vehiclePassNo || "-"}
                            </td>
                            <td className="p-3 font-bold text-[#0a1e4d] uppercase">
                              {v.registrationNo}
                            </td>
                            <td className="p-3 text-slate-600 text-xs font-medium">
                              {v.vehicleTypeId} • {v.passType}
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex justify-end items-center gap-3">
                                {(() => {
                                  const vehicleStatus =
                                    entityStatuses.vehicles[v.id] ||
                                    v.status ||
                                    v.decision;

                                  const vehicleRemark =
                                    entityRemarks.vehicles[v.id] ||
                                    v.revertReason ||
                                    v.rejectedReason;

                                  return (
                                    <>
                                      {vehicleStatus && (
                                        <span
                                          className={`px-2 py-1 rounded text-[10px] font-bold ${vehicleStatus === "APPROVED"
                                            ? "bg-emerald-100 text-emerald-700"
                                            : vehicleStatus === "REVERTED"
                                              ? "bg-amber-100 text-amber-700"
                                              : "bg-red-100 text-red-700"
                                            }`}
                                        >
                                          {vehicleStatus}
                                        </span>
                                      )}

                                      {(vehicleStatus === "REJECTED" || vehicleStatus === "REVERTED") &&
                                        vehicleRemark && (
                                          <div className={`mt-1 text-[10px] p-1 rounded border inline-block ${vehicleStatus === "REVERTED"
                                            ? "text-amber-600 bg-amber-50 border-amber-100"
                                            : "text-red-600 bg-red-50 border-red-100"
                                            }`}>
                                            {vehicleStatus === "REVERTED" ? "Revert: " : "Reason: "}{vehicleRemark}
                                          </div>
                                        )}
                                    </>
                                  );
                                })()}
                                {!isViewMode && (v.status === 'pending' || v.status === 'reverted') && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEntityModal({
                                        isOpen: true,
                                        data: v,
                                        type: "vehicle",
                                      });
                                      setCurrentRemark(
                                        entityRemarks.vehicles[v.id] || "",
                                      );
                                    }}
                                    className="bg-[#0a1e4d] text-white hover:bg-blue-900 px-4 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm"
                                  >
                                    {entityStatuses.vehicles[v.id]
                                      ? "Re-verify"
                                      : "Verify"}
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
            </div>

            <div className="flex justify-between items-center p-5 border-t border-slate-200 bg-white rounded-b-2xl">
              <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                <AlertCircle className="h-4 w-4 text-orange-500" /> Ensure all
                entities are thoroughly verified before submission.
              </span>
              {!isViewMode && (
                <button
                  onClick={handleSubmitReview}
                  className="bg-orange-600 text-white px-8 py-2.5 rounded-xl font-bold"
                >
                  Submit Complete Review
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* EXHAUSTIVE INDIVIDUAL DOSSIER (NESTED MODAL) */}
      {/* ============================================================== */}
      {entityModal.isOpen && entityModal.data && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in zoom-in-95 duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col h-[90vh] overflow-hidden border border-slate-200">
            <div className="flex justify-between items-center px-6 py-4 bg-slate-800 text-white border-b border-slate-700 shrink-0">
              <div className="flex items-center gap-3">
                {entityModal.type === "person" ? (
                  <User className="h-6 w-6 text-orange-400" />
                ) : (
                  <Truck className="h-6 w-6 text-orange-400" />
                )}
                <div>
                  <h3 className="text-lg font-bold leading-tight">
                    {entityModal.type === "person"
                      ? entityModal.data.name
                      : entityModal.data.registrationNo}
                  </h3>
                  <p className="text-xs text-slate-300 font-medium">
                    {isViewMode
                      ? "Entity Details (Read Only)"
                      : "Complete Entity Verification"}
                  </p>
                </div>
              </div>
              <button
                onClick={() =>
                  setEntityModal({ isOpen: false, data: null, type: null })
                }
                className="text-white/70 hover:text-white p-1 bg-slate-700 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-slate-50 space-y-6">
              {/* SECTION 1: Identity & Profile Details */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 bg-slate-100 border-b border-slate-200">
                  <h4 className="text-xs font-black text-[#0a1e4d] uppercase tracking-widest flex items-center gap-2">
                    <Briefcase className="h-4 w-4" /> Identity & Profile
                  </h4>
                </div>
                <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-y-6 gap-x-4">
                  {entityModal.type === "person" ? (
                    <>
                      <DetailItem
                        label="Pass No."
                        value={entityModal.data.personPassNo || "Not Issued"}
                        highlight
                      />
                      <DetailItem
                        label="Full Name"
                        value={entityModal.data.name}
                        highlight
                      />
                      <DetailItem
                        label="HEP Type"
                        value={entityModal.data.hepTypeId}
                      />
                      <DetailItem
                        label="Designation"
                        value={entityModal.data.designationId}
                      />
                      <DetailItem
                        label="Aadhar No."
                        value={entityModal.data.aadharNo}
                      />
                      <DetailItem
                        label="Mobile No."
                        value={entityModal.data.mobile}
                      />
                      <DetailItem
                        label="Email"
                        value={entityModal.data.email}
                      />
                      <DetailItem
                        label="Nationality"
                        value={entityModal.data.nationality}
                      />
                      <DetailItem
                        label="Country"
                        value={entityModal.data.country}
                      />
                      <DetailItem
                        label="Visa No."
                        value={entityModal.data.visaNo}
                      />
                      <DetailItem
                        label="ID Proof Type"
                        value={entityModal.data.idProofType}
                      />
                      <DetailItem
                        label="ID Proof No."
                        value={entityModal.data.idProofNumber}
                      />
                      {/* <DetailItem
                        label="RFID Card"
                        value={entityModal.data.cardNumber}
                      /> */}
                      {entityModal.data.hepTypeId === "Seafarers" && (
                        <DetailItem
                          label="Seafarer Pass For"
                          value={entityModal.data.seafarerPassFor}
                          highlight
                        />
                      )}
                      <DetailItem
                        label="With Two-Wheeler?"
                        value={entityModal.data.withTwoWheeler ? "YES" : "NO"}
                      />
                      {entityModal.data.withTwoWheeler && (
                        <DetailItem
                          label="Two-Wheeler No."
                          value={entityModal.data.vehicleNo}
                        />
                      )}
                    </>
                  ) : (
                    <>
                      <DetailItem
                        label="Pass No."
                        value={entityModal.data.vehiclePassNo || "Not Issued"}
                        highlight
                      />
                      <DetailItem
                        label="Registration No."
                        value={entityModal.data.registrationNo}
                        highlight
                      />
                      <DetailItem
                        label="Vehicle Type"
                        value={entityModal.data.vehicleTypeId}
                      />
                      {/* <DetailItem
                        label="RFID Card"
                        value={entityModal.data.rfidCardNumber}
                      /> */}
                      <DetailItem
                        label="Insurance Expiry"
                        value={entityModal.data.insuranceExpiry}
                      />
                      <DetailItem
                        label="RC Validity"
                        value={entityModal.data.rcValidity}
                      />
                    </>
                  )}
                </div>
              </div>

              {/* SECTION 2: Pass parameters & Areas */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 bg-slate-100 border-b border-slate-200">
                  <h4 className="text-xs font-black text-[#0a1e4d] uppercase tracking-widest flex items-center gap-2">
                    <MapPin className="h-4 w-4" /> Pass Parameters & Logistics
                  </h4>
                </div>
                <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-y-6 gap-x-4">
                  <DetailItem
                    label="Access Area"
                    value={entityModal.data.accessAreaId}
                    highlight
                  />
                  <DetailItem
                    label="Pass Type"
                    value={entityModal.data.passType}
                    highlight
                  />
                  <DetailItem
                    label="Pass Period"
                    value={`${entityModal.data.passPeriod} Days`}
                  />
                  <DetailItem
                    label="Valid From Date"
                    value={entityModal.data.dateFrom}
                  />
                  <DetailItem
                    label="Valid To Date"
                    value={entityModal.data.dateTo}
                  />
                  {entityModal.data.validUptoTime && (
                    <DetailItem
                      label="Valid Upto Time"
                      value={entityModal.data.validUptoTime}
                    />
                  )}
                  <DetailItem
                    label="Calculated Amount"
                    value={`₹${entityModal.data.amount}`}
                  />
                </div>
              </div>

              {/* SECTION 3: Exact JSON Uploaded Document Keys */}
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Attached Mandatory Documents
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {entityModal.type === "person" ? (
                    <>
                      {entityModal.data.photoFilePath && (
                        <div className="row-span-2 col-span-1 md:col-span-1 bg-white p-4 rounded-xl border border-slate-200 flex flex-col items-center justify-center text-center">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                            Passport Photo
                          </span>

                          {/* WRAPPED IN A CLICKABLE CONTAINER WITH HOVER EFFECT */}
                          <div
                            className="relative group cursor-pointer"
                            onClick={() =>
                              handleViewDoc(
                                selectedRequest.id,
                                "personPhoto",
                                entityModal.data.photoFilePath,
                                extractEntityIndex(entityModal.data.id),
                                selectedRequest.originType === "VENDOR"
                              )
                            }
                            title="Click to Enlarge Photo"
                          >
                            <img
                              src={`${AGENT_API}/pass-request/viewPassRequestsDocument?passRequestId=${selectedRequest.id}&documentType=personPhoto&entityIndex=${extractEntityIndex(entityModal.data.id)}&isVendorPass=${selectedRequest.originType === "VENDOR"}`}
                              alt="Passport Photo"
                              className="w-24 h-28 object-cover rounded-lg border border-slate-200 shadow-sm bg-slate-50 group-hover:opacity-75 transition-opacity"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src =
                                  "https://via.placeholder.com/100x120?text=Image+Error";
                              }}
                            />
                            {/* OVERLAY ICON THAT APPEARS ON HOVER */}
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 rounded-lg">
                              <Maximize className="h-6 w-6 text-white drop-shadow-md" />
                            </div>
                          </div>
                        </div>
                      )}
                      <DocumentCard
                        label="Requisition Letter"
                        filePath={entityModal.data.requisitionLetterPath}
                        documentType="requisitionLetter"
                        passRequestId={selectedRequest.id}
                        onView={handleViewDoc}
                        entityIndex={extractEntityIndex(entityModal.data.id)}
                        isVendorPass={selectedRequest.originType === "VENDOR"}
                      />
                      <DocumentCard
                        label="Aadhar Card Document"
                        filePath={entityModal.data.aadharPDFFilePATH}
                        documentType="personAadhar"
                        passRequestId={selectedRequest.id}
                        onView={handleViewDoc}
                        entityIndex={extractEntityIndex(entityModal.data.id)}
                        isVendorPass={selectedRequest.originType === "VENDOR"}
                      />
                      <DocumentCard
                        label="Additional ID Proof"
                        filePath={entityModal.data.idProofFilePath}
                        documentType="personIdProof"
                        passRequestId={selectedRequest.id}
                        onView={handleViewDoc}
                        entityIndex={extractEntityIndex(entityModal.data.id)}
                        isVendorPass={selectedRequest.originType === "VENDOR"}
                      />
                      <DocumentCard
                        label="Driver License"
                        filePath={entityModal.data.driverLicensePath}
                        documentType="driverLicense"
                        passRequestId={selectedRequest.id}
                        onView={handleViewDoc}
                        entityIndex={extractEntityIndex(entityModal.data.id)}
                        isVendorPass={selectedRequest.originType === "VENDOR"}
                      />
                      <DocumentCard
                        label="Police Verification"
                        filePath={entityModal.data.policeVerificationPath}
                        documentType="policeVerification"
                        passRequestId={selectedRequest.id}
                        onView={handleViewDoc}
                        entityIndex={extractEntityIndex(entityModal.data.id)}
                        isVendorPass={selectedRequest.originType === "VENDOR"}
                      />
                      <DocumentCard
                        label="Proof Of Employment"
                        filePath={entityModal.data.employmentProofPath}
                        documentType="employmentProof"
                        passRequestId={selectedRequest.id}
                        onView={handleViewDoc}
                        entityIndex={extractEntityIndex(entityModal.data.id)}
                        isVendorPass={selectedRequest.originType === "VENDOR"}
                      />
                      <DocumentCard
                        label="CHA License"
                        filePath={entityModal.data.chaLicensePath}
                        documentType="chaLicenseCopy"
                        passRequestId={selectedRequest.id}
                        onView={handleViewDoc}
                        entityIndex={extractEntityIndex(entityModal.data.id)}
                        isVendorPass={selectedRequest.originType === "VENDOR"}
                      />
                      <DocumentCard
                        label="Passport Document"
                        filePath={entityModal.data.passportPath}
                        documentType="passportDoc"
                        passRequestId={selectedRequest.id}
                        onView={handleViewDoc}
                        entityIndex={extractEntityIndex(entityModal.data.id)}
                        isVendorPass={selectedRequest.originType === "VENDOR"}
                      />
                    </>
                  ) : (
                    <>
                      <DocumentCard
                        label="RC Document / Book"
                        filePath={entityModal.data.scannedCopyFilePath}
                        documentType="vehicleRC"
                        passRequestId={selectedRequest.id}
                        onView={handleViewDoc}
                        entityIndex={extractEntityIndex(entityModal.data.id)}
                        isVendorPass={selectedRequest.originType === "VENDOR"}
                      />
                      <DocumentCard
                        label="Insurance Document"
                        filePath={entityModal.data.insuranceFilePath}
                        documentType="vehicleInsurance"
                        passRequestId={selectedRequest.id}
                        onView={handleViewDoc}
                        entityIndex={extractEntityIndex(entityModal.data.id)}
                        isVendorPass={selectedRequest.originType === "VENDOR"}
                      />
                      <DocumentCard
                        label="Permit Document"
                        filePath={entityModal.data.permitFilePath}
                        documentType="vehiclePermit"
                        passRequestId={selectedRequest.id}
                        onView={handleViewDoc}
                        entityIndex={extractEntityIndex(entityModal.data.id)}
                        isVendorPass={selectedRequest.originType === "VENDOR"}
                      />
                      <DocumentCard
                        label="Fitness Certificate"
                        filePath={entityModal.data.fitnessFilePath}
                        documentType="vehicleFitness"
                        passRequestId={selectedRequest.id}
                        onView={handleViewDoc}
                        entityIndex={extractEntityIndex(entityModal.data.id)}
                        isVendorPass={selectedRequest.originType === "VENDOR"}
                      />
                      <DocumentCard
                        label="Request Letter"
                        filePath={entityModal.data.requestLetterPath}
                        documentType="vehicleRequestLetter"
                        passRequestId={selectedRequest.id}
                        onView={handleViewDoc}
                        entityIndex={extractEntityIndex(entityModal.data.id)}
                        isVendorPass={selectedRequest.originType === "VENDOR"}
                      />
                      <DocumentCard
                        label="Tax Document"
                        filePath={entityModal.data.taxFilePath}
                        documentType="vehicleTax"
                        passRequestId={selectedRequest.id}
                        onView={handleViewDoc}
                        entityIndex={extractEntityIndex(entityModal.data.id)}
                        isVendorPass={selectedRequest.originType === "VENDOR"}
                      />
                      <DocumentCard
                        label="Emission Certificate (PUC)"
                        filePath={entityModal.data.emissionFilePath}
                        documentType="vehicleEmission"
                        passRequestId={selectedRequest.id}
                        onView={handleViewDoc}
                        entityIndex={extractEntityIndex(entityModal.data.id)}
                        isVendorPass={selectedRequest.originType === "VENDOR"}
                      />
                    </>
                  )}
                </div>
              </div>

              {/* REJECTION/REVERT REMARKS SECTION */}
              <div className="bg-orange-50 p-5 rounded-xl border border-orange-200 shadow-sm mt-4">
                <label className="block text-xs font-bold text-orange-900 uppercase tracking-wider mb-2">
                  Authority Remarks (Required for Rejection or Revert)
                </label>
                <textarea
                  value={currentRemark}
                  onChange={(e) => setCurrentRemark(e.target.value)}
                  disabled={isViewMode}
                  className="w-full border border-orange-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none bg-white shadow-inner"
                  rows="3"
                  placeholder="Enter specific remarks if rejecting or reverting this entity..."
                />
              </div>
            </div>

            <div className="flex justify-between items-center p-5 border-t border-slate-200 bg-white shrink-0">
              <span className="text-xs text-slate-500 font-medium">
                Record decisions individually per entity.
              </span>
              {!isViewMode && (
                <div className="flex gap-4">
                  <button
                    onClick={() => handleEntityDecision("REJECTED")}
                    className="bg-red-50 text-red-600 border border-red-200 px-6 py-3 rounded-xl font-bold hover:bg-red-100 transition-colors flex items-center gap-2 uppercase text-sm tracking-wider"
                  >
                    <XCircle className="h-5 w-5" /> Reject
                  </button>
                  <button
                    onClick={() => handleEntityDecision("REVERTED")}
                    className="bg-amber-100 text-amber-700 border border-amber-300 px-6 py-3 rounded-xl font-bold hover:bg-amber-200 transition-colors flex items-center gap-2 uppercase text-sm tracking-wider"
                  >
                    <RefreshCw className="h-5 w-5" /> Revert
                  </button>
                  <button
                    onClick={() => handleEntityDecision("APPROVED")}
                    className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold shadow-md hover:bg-emerald-700 transition-colors flex items-center gap-2 uppercase text-sm tracking-wider"
                  >
                    <CheckCircle2 className="h-5 w-5" /> Approve
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* PDF VIEWER OVERLAY */}
      {/* ============================================================== */}
      {viewingDocUrl && (
        <div
          className={`fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm transition-all duration-300 ${isFullscreen ? "p-0" : "p-4 md:p-8"}`}
        >
          <div
            className={`bg-white w-full h-full flex flex-col overflow-hidden shadow-2xl transition-all duration-300 ${isFullscreen ? "max-w-full rounded-none border-none" : "max-w-6xl rounded-xl border border-slate-700"}`}
          >
            <div className="flex justify-between items-center px-4 py-3 bg-slate-800 text-white">
              <h3 className="font-bold flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-400" />
                Document Viewer
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="bg-slate-700 hover:bg-slate-600 p-2 rounded-lg transition-colors"
                  title={isFullscreen ? "Exit Fullscreen" : "Maximize"}
                >
                  {isFullscreen ? (
                    <Minimize className="h-5 w-5" />
                  ) : (
                    <Maximize className="h-5 w-5" />
                  )}
                </button>
                <button
                  onClick={() => {
                    setViewingDocUrl(null);
                    setIsFullscreen(false);
                  }}
                  className="bg-slate-700 hover:bg-red-500 p-2 rounded-lg transition-colors"
                  title="Close Viewer"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Iframe / Image Container */}
            <div className="flex-1 w-full bg-slate-100 relative flex items-center justify-center p-4">
              {iframeLoading && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-50">
                  <Loader2 className="h-10 w-10 text-[#ff6b00] animate-spin mb-4" />
                  <p className="text-slate-500 font-bold animate-pulse">
                    Loading document...
                  </p>
                </div>
              )}

              {isImage ? (
                <img
                  src={viewingDocUrl}
                  alt="Document Viewer"
                  className="max-w-full max-h-full object-contain relative z-0 drop-shadow-lg rounded-md"
                  onLoad={() => setIframeLoading(false)}
                />
              ) : (
                <iframe
                  src={viewingDocUrl}
                  className="w-full h-full border-none relative z-0 bg-white"
                  title="Document Viewer"
                  onLoad={() => setIframeLoading(false)}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
