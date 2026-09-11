"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import PaginationBar from "@/components/ui/PaginationBar";
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
  GripVertical,
  RotateCcw,
  Zap,
  PackageCheck,
  ChevronRight,
  ArrowRight,
  Sparkles,
  BadgeCheck,
  Car,
} from "lucide-react";

import {
  getPassRequestCategory,
  getItemCategoryTag,
} from "@/utils/passCategoryHelper";

const AGENT_API =
  process.env.NEXT_PUBLIC_AGENT_API || "http://localhost:5001/api";

const ADMIN_API =
  process.env.NEXT_PUBLIC_ADMIN_API || "http://localhost:5005/api";

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
const DetailItem = ({
  label,
  value,
  highlight = false,
  showIfEmpty = false,
}) => {
  if (
    !showIfEmpty &&
    (!value ||
      value === "N/A" ||
      value === "null" ||
      value === "undefined" ||
      String(value).trim() === "")
  ) {
    return null;
  }
  return (
    <div className="flex flex-col">
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
        {label}
      </span>
      <span
        className={`text-sm font-semibold ${highlight ? "text-[#0a1e4d] font-black" : "text-slate-700"}`}
      >
        {value}
      </span>
    </div>
  );
};

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
      onClick={() =>
        onView(passRequestId, documentType, filePath, entityIndex, isVendorPass)
      }
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
  const searchParams = useSearchParams();
  const tabQuery = searchParams ? searchParams.get("tab") : null;
  const [activeTab, setActiveTab] = useState(
    tabQuery === "processed"
      ? "processed"
      : tabQuery === "pass_updates"
        ? "pass_updates"
        : "pending",
  );

  useEffect(() => {
    const handleSwitchTab = (e) => {
      if (e.detail) {
        setActiveTab(e.detail);
      }
    };
    window.addEventListener("switch_tab", handleSwitchTab);
    return () => window.removeEventListener("switch_tab", handleSwitchTab);
  }, []);
  const [cardFilter, setCardFilter] = useState("ALL");
  const [isViewMode, setIsViewMode] = useState(false);
  // Search and Sort States
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortBy, setSortBy] = useState("DATE_DESC");
  const [processedByMe, setProcessedByMe] = useState(false);

  // ── Drag & Drop Stat Card Order ──
  const [cardOrder, setCardOrder] = useState(["total", "pending", "processed"]);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem("traffic-card-order");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 3) {
          setCardOrder(parsed);
        }
      } catch (e) {}
    }
  }, []);

  const handleDragStart = (e, idx) => {
    setDraggedIndex(idx);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e, idx) => {
    e.preventDefault();
    if (dragOverIndex !== idx) setDragOverIndex(idx);
  };

  const handleDrop = (e, idx) => {
    e.preventDefault();
    if (draggedIndex === null) return;
    const newOrder = [...cardOrder];
    const [draggedItem] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(idx, 0, draggedItem);
    setCardOrder(newOrder);
    localStorage.setItem("traffic-card-order", JSON.stringify(newOrder));
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const resetCardOrder = () => {
    const defaultOrder = ["total", "pending", "processed"];
    setCardOrder(defaultOrder);
    localStorage.removeItem("traffic-card-order");
    toast.success("Card layout reset to default!");
  };

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pagination state
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [paginationMeta, setPaginationMeta] = useState({
    totalRecords: 0,
    totalPages: 1,
    currentPage: 1,
    pageSize: 20,
  });
  const [globalCounts, setGlobalCounts] = useState({
    total: 0,
    pending: 0,
    processed: 0,
  });

  // Two-Wheeler Update Request States
  const [twoWheelerRequests, setTwoWheelerRequests] = useState([]);
  const [passUpdatesCount, setPassUpdatesCount] = useState(0);
  const [rejectModal, setRejectModal] = useState({
    isOpen: false,
    requestId: null,
    reason: "",
  });

  const fetchTwoWheelerRequests = useCallback(async () => {
    try {
      const token =
        localStorage.getItem("accessToken") ||
        localStorage.getItem("hep_token");
      const res = await axios.get(
        `${AGENT_API}/pass-request/two-wheeler-update-requests`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (res.data && res.data.success) {
        setTwoWheelerRequests(res.data.data || []);
        const pendingCount = (res.data.data || []).filter(
          (r) => r.status === "PENDING",
        ).length;
        setPassUpdatesCount(pendingCount);
      }
    } catch (err) {
      console.error("fetchTwoWheelerRequests error:", err);
    }
  }, []);

  useEffect(() => {
    fetchTwoWheelerRequests();
  }, [fetchTwoWheelerRequests]);

  const handleApproveTwoWheeler = async (id) => {
    try {
      const token =
        localStorage.getItem("accessToken") ||
        localStorage.getItem("hep_token");
      await axios.put(
        `${AGENT_API}/pass-request/two-wheeler-update-requests/${id}/approve`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      toast.success("Two-wheeler vehicle number update approved successfully!");
      fetchTwoWheelerRequests();
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Failed to approve two-wheeler update.",
      );
    }
  };

  const handleRejectTwoWheeler = async () => {
    if (!rejectModal.requestId) return;
    try {
      const token =
        localStorage.getItem("accessToken") ||
        localStorage.getItem("hep_token");
      await axios.put(
        `${AGENT_API}/pass-request/two-wheeler-update-requests/${rejectModal.requestId}/reject`,
        {
          rejectedReason: rejectModal.reason,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      toast.success("Two-wheeler update request rejected.");
      setRejectModal({ isOpen: false, requestId: null, reason: "" });
      fetchTwoWheelerRequests();
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Failed to reject update request.",
      );
    }
  };

  // Main Modal & Profile States
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [companyProfile, setCompanyProfile] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const extractEntityIndex = (entityId) => {
    if (!entityId) return 0;
    const isVendor = selectedRequest?.originType === "VENDOR";
    if (isVendor) {
      const parts = String(entityId).split("-");
      const index = parseInt(parts[parts.length - 1]);
      return isNaN(index) ? 0 : index;
    } else {
      if (selectedRequest?.persons) {
        const idx = selectedRequest.persons.findIndex((p) => p.id === entityId);
        if (idx !== -1) return idx;
      }
      if (selectedRequest?.vehicles) {
        const idx = selectedRequest.vehicles.findIndex(
          (v) => v.id === entityId,
        );
        if (idx !== -1) return idx;
      }
    }
    return 0;
  };

  const isOilDockArea = (val) => {
    if (!val) return false;
    const str = String(val).toUpperCase();
    return (
      str === "1" || str.includes("OIL JETTY") || str.includes("OIL_JETTY")
    );
  };

  const canUserVerifyPerson = (p) => {
    if (userRole === "Senior Deputy Traffic Manager") {
      return isOilDockArea(p.accessAreaId || p.accessArea);
    }
    if (userRole === "Approval") {
      const needsDtm = isOilDockArea(p.accessAreaId || p.accessArea);
      return !needsDtm || p.srDtmApproved;
    }
    return false;
  };

  const canUserVerifyVehicle = (v) => {
    if (userRole === "Safety Officer") {
      return ["MONTHLY", "YEARLY", "ANNUAL"].includes(v.passType);
    }
    if (userRole === "Fire Safety Officer") {
      return isOilDockArea(v.accessAreaId || v.accessArea);
    }
    if (userRole === "Senior Deputy Traffic Manager") {
      return isOilDockArea(v.accessAreaId || v.accessArea);
    }
    if (userRole === "Approval") {
      const isMonthlyYearly = ["MONTHLY", "YEARLY", "ANNUAL"].includes(
        v.passType,
      );
      const isOilDock = isOilDockArea(v.accessAreaId || v.accessArea);
      if (isMonthlyYearly && !v.twistLockCertified) {
        return false;
      }
      if (isOilDock && (!v.sparkArresterCertified || !v.srDtmApproved)) {
        return false;
      }
      return true;
    }
    return false;
  };

  // Active Locks State for Concurrency Control
  const [activeLocks, setActiveLocks] = useState({});
  const [userRole, setUserRole] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const userStr = localStorage.getItem("user");
        if (userStr) {
          return JSON.parse(userStr).role || "";
        }
      } catch (e) {
        console.error(e);
      }
    }
    return "";
  });

  const fetchActiveLocks = useCallback(async () => {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) return;
      const response = await axios.get(`${AGENT_API}/locks/active`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data && response.data.success) {
        const newLocks = response.data.data;
        setActiveLocks((prev) =>
          JSON.stringify(newLocks) === JSON.stringify(prev) ? prev : newLocks,
        );
      }
    } catch (err) {
      console.error("Error fetching active locks:", err);
    }
  }, []);

  const acquireLock = async (passId, type) => {
    try {
      const token = localStorage.getItem("accessToken");
      const res = await axios.post(
        `${AGENT_API}/locks/acquire`,
        {
          applicationId: passId,
          type,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      return { success: true, lock: res.data.lock };
    } catch (error) {
      const message = error.response?.data?.message || "Failed to acquire lock";
      return { success: false, message };
    }
  };

  const releaseLock = async (passId, type) => {
    try {
      const token = localStorage.getItem("accessToken");
      await axios.post(
        `${AGENT_API}/locks/release`,
        {
          applicationId: passId,
          type,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
    } catch (error) {
      console.error("Failed to release lock:", error);
    }
  };

  useEffect(() => {
    fetchActiveLocks();
    const interval = setInterval(fetchActiveLocks, 900); // every 900ms (< 1s)
    return () => clearInterval(interval);
  }, [fetchActiveLocks]);

  useEffect(() => {
    if (!isModalOpen || !selectedRequest || isViewMode) return;

    const lockType =
      selectedRequest.originType === "VENDOR" ? "vendor-pass" : "pass";
    const interval = setInterval(async () => {
      const lockRes = await acquireLock(selectedRequest.id, lockType);
      if (!lockRes.success) {
        toast.error("Lock Lost", {
          description:
            "This application lock has expired or was taken by another user.",
        });
        setIsModalOpen(false);
      }
    }, 10000); // refresh every 10 seconds

    return () => {
      clearInterval(interval);
      releaseLock(selectedRequest.id, lockType).then(() => {
        fetchActiveLocks();
      });
    };
  }, [isModalOpen, selectedRequest, isViewMode]);

  // Entity Verification Modal States
  const [entityModal, setEntityModal] = useState({
    isOpen: false,
    type: null,
    record: null,
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

  // Debounce search — reset to page 1 on new search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchPassRequests = useCallback(
    async (isPoll = false) => {
      try {
        if (!isPoll) setLoading(true);
        const token = localStorage.getItem("accessToken");
        const response = await axios.get(
          `${AGENT_API}/pass-request/get-agent-pass-requests`,
          {
            headers: { Authorization: `Bearer ${token}` },
            params: {
              page: currentPage,
              limit: pageSize,
              search: debouncedSearch || undefined,
              status: activeTab || undefined,
              sortOrder:
                sortBy === "DATE_ASC"
                  ? "ASC"
                  : sortBy === "EXPIRY_SOON"
                    ? "EXPIRY_SOON"
                    : "DESC",
              processedByMe: processedByMe ? "true" : undefined,
            },
          },
        );

        if (response.data && response.data.success) {
          const newRequests = response.data.data || [];
          const newMeta = response.data.pagination || {};
          const newCounts = response.data.counts || {
            total: 0,
            pending: 0,
            processed: 0,
          };

          setRequests((prev) =>
            JSON.stringify(newRequests) === JSON.stringify(prev)
              ? prev
              : newRequests,
          );
          setPaginationMeta((prev) =>
            JSON.stringify(newMeta) === JSON.stringify(prev) ? prev : newMeta,
          );
          setGlobalCounts((prev) =>
            JSON.stringify(newCounts) === JSON.stringify(prev)
              ? prev
              : newCounts,
          );
        } else {
          setRequests((prev) => (prev.length === 0 ? prev : []));
        }
      } catch (error) {
        console.error("Failed to fetch requests", error);
        if (!isPoll) toast.error("Failed to load pass requests.");
      } finally {
        if (!isPoll) setLoading(false);
      }
    },
    [currentPage, pageSize, debouncedSearch, activeTab, sortBy, processedByMe],
  );

  useEffect(() => {
    fetchPassRequests(false);
    const interval = setInterval(() => fetchPassRequests(true), 5000); // Poll every 5 seconds without showing loading spinner
    return () => clearInterval(interval);
  }, [fetchPassRequests]);

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

  const handleViewDoc = (
    passRequestId,
    documentType,
    staticPath,
    entityIndex = 0,
    isVendorPass = false,
  ) => {
    // Check if the file is an image based on its extension
    const isImg = staticPath && /\.(jpe?g|png|gif|webp)$/i.test(staticPath);
    setIsImage(!!isImg);

    setViewingDocUrl(
      `${AGENT_API}/pass-request/viewPassRequestsDocument?passRequestId=${passRequestId}&documentType=${documentType}&entityIndex=${entityIndex}&isVendorPass=${isVendorPass}`,
    );
  };
  const handleEntityDecision = (status) => {
    if (
      (status === "REJECTED" || status === "REVERTED") &&
      !currentRemark.trim()
    ) {
      toast.error(
        `${status === "REVERTED" ? "Revert" : "Rejection"} Reason Required`,
        {
          description:
            status === "REVERTED"
              ? "You must provide a remark explaining what needs to be corrected."
              : "You must provide a remark explaining why this pass is being rejected.",
        },
      );
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

    // 1. VALIDATION: Only pending/reverted entities that the current user is authorized to verify need a decision
    const unverifiedPersons = persons.filter(
      (p) =>
        canUserVerifyPerson(p) &&
        !entityStatuses.persons[p.id] &&
        (p.status === "pending" || p.status === "reverted"),
    );
    const unverifiedVehicles = vehicles.filter(
      (v) =>
        canUserVerifyVehicle(v) &&
        !entityStatuses.vehicles[v.id] &&
        (v.status === "pending" || v.status === "reverted"),
    );

    if (unverifiedPersons.length > 0 || unverifiedVehicles.length > 0) {
      toast.warning("Incomplete Verification", {
        description:
          "You must approve, reject, or revert all pending/reverted entities assigned to your role before submitting.",
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
        const vendorPassId = selectedRequest.id;

        // 2. BUILD PERSON PROMISES for vendor passes
        const personPromises = [];
        persons.forEach((p) => {
          if (!canUserVerifyPerson(p)) return;
          const status = entityStatuses.persons[p.id];
          if (!status) return;
          const personIndex = extractEntityIndex(p.id);
          const remark = entityRemarks.persons[p.id];

          if (status === "APPROVED") {
            personPromises.push(
              axios.put(
                `${AGENT_API}/vendor-pass/${vendorPassId}/approve-person/${personIndex}`,
                {},
                { headers },
              ),
            );
          } else if (status === "REVERTED") {
            personPromises.push(
              axios.put(
                `${AGENT_API}/vendor-pass/${vendorPassId}/revert-person/${personIndex}`,
                { revertReason: remark },
                { headers },
              ),
            );
          } else {
            personPromises.push(
              axios.put(
                `${AGENT_API}/vendor-pass/${vendorPassId}/reject-person/${personIndex}`,
                { rejectedReason: remark },
                { headers },
              ),
            );
          }
        });

        // 3. BUILD VEHICLE PROMISES for vendor passes
        const vehiclePromises = [];
        vehicles.forEach((v) => {
          if (!canUserVerifyVehicle(v)) return;
          const status = entityStatuses.vehicles[v.id];
          if (!status) return;
          const vehicleIndex = extractEntityIndex(v.id);
          const remark = entityRemarks.vehicles[v.id];

          if (status === "APPROVED") {
            vehiclePromises.push(
              axios.put(
                `${AGENT_API}/vendor-pass/${vendorPassId}/approve-vehicle/${vehicleIndex}`,
                {},
                { headers },
              ),
            );
          } else if (status === "REVERTED") {
            vehiclePromises.push(
              axios.put(
                `${AGENT_API}/vendor-pass/${vendorPassId}/revert-vehicle/${vehicleIndex}`,
                { revertReason: remark },
                { headers },
              ),
            );
          } else {
            vehiclePromises.push(
              axios.put(
                `${AGENT_API}/vendor-pass/${vendorPassId}/reject-vehicle/${vehicleIndex}`,
                { rejectedReason: remark },
                { headers },
              ),
            );
          }
        });

        // 4. EXECUTE ALL ENTITY ACTIONS CONCURRENTLY
        await Promise.all([...personPromises, ...vehiclePromises]);

        // 5. FINALLY, SUBMIT THE 'COMPLETE-REVIEW' FLAG
        await axios.put(
          `${AGENT_API}/vendor-pass/${vendorPassId}/complete-review`,
          {},
          { headers },
        );
      } else {
        // --- NORMAL PASS APPROVAL FLOW (Admin Service) ---
        const actionUrl = `${ADMIN_API}/pass-request/agent-pass-request-action`;

        // 2. BUILD PERSON PAYLOADS
        const personPromises = [];
        persons.forEach((p) => {
          if (!canUserVerifyPerson(p)) return;
          const status = entityStatuses.persons[p.id];
          if (!status) return;
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

          personPromises.push(axios.patch(actionUrl, payload, { headers }));
        });

        // 3. BUILD VEHICLE PAYLOADS
        const vehiclePromises = [];
        vehicles.forEach((v) => {
          if (!canUserVerifyVehicle(v)) return;
          const status = entityStatuses.vehicles[v.id];
          if (!status) return;
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

          vehiclePromises.push(axios.patch(actionUrl, payload, { headers }));
        });

        // 4. EXECUTE ALL ENTITY ACTIONS CONCURRENTLY
        await Promise.all([...personPromises, ...vehiclePromises]);

        // 5. FINALLY, SUBMIT THE 'COMPLETE-REVIEW' FLAG
        const finalPayload = {
          passRequestId: selectedRequest.id,
          decision: "complete-review",
        };

        const completeResponse = await axios.patch(actionUrl, finalPayload, {
          headers,
        });
        reviewStatus = completeResponse.data?.data?.reviewStatus;
        responseMessage = completeResponse.data?.data?.message;
      }

      // 6. HANDLE SUCCESS
      if (reviewStatus === "REVERTED") {
        toast.success("Review Saved with Reverted Entities", {
          id: loadingToastId,
          description:
            responseMessage ||
            "Pass request has been reverted to the applicant for corrections.",
        });
      } else {
        toast.success("Review Submitted", {
          id: loadingToastId,
          description:
            responseMessage || "Pass Request review processed successfully.",
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

  const openReviewModal = async (pass, viewOnly = true) => {
    // Traffic Manager is an executive oversight role - strictly view-only inspection, no approval locks needed
    setSelectedRequest(pass);
    setIsViewMode(true);
    setIsModalOpen(true);
  };

  // --- SERVER-SIDE PAGINATION: Data comes pre-filtered from the API ---
  // Use globalCounts for stat cards (always the full DB counts)
  // Use requests directly as filteredData (already paginated + filtered by server)
  const filteredData = requests;

  const visiblePersons = selectedRequest
    ? !isViewMode
      ? (selectedRequest.persons || []).filter(canUserVerifyPerson)
      : selectedRequest.persons || []
    : [];
  const visibleVehicles = selectedRequest
    ? !isViewMode
      ? (selectedRequest.vehicles || []).filter(canUserVerifyVehicle)
      : selectedRequest.vehicles || []
    : [];
  const hasVisibleEntities =
    visiblePersons.length > 0 || visibleVehicles.length > 0;

  const handleCardClick = (tab, filter) => {
    setActiveTab(tab);
    setCardFilter(filter);
    setSearchInput("");
    setCurrentPage(1);
  };

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-6 font-sans relative">
      {/* ── OFFICIAL CHENNAI PORT AUTHORITY HEADER STRIP ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0a1e4d] via-[#12275f] to-[#1b1856] p-6 text-white shadow-[0_12px_32px_-10px_rgba(10,30,77,0.65)] ring-1 ring-inset ring-white/15">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent" />
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="pointer-events-none absolute left-1/3 -bottom-10 h-36 w-36 rounded-full bg-blue-500/15 blur-2xl" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/30 ring-1 ring-white/30 shrink-0">
              <ShieldCheck className="h-6 w-6" strokeWidth={2.4} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-orange-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
                  Pass Oversight
                </span>
                <span className="text-[10px] font-bold text-blue-200/70 hidden sm:inline">
                  Traffic Authority · Chennai Port Authority
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white leading-tight mt-0.5">
                PASS APPROVALS &amp; OVERSIGHT
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={fetchPassRequests}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold ring-1 ring-inset ring-white/15 shadow-sm transition-all hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin text-orange-300" : ""}`}
              />
              Sync Passes
            </button>
          </div>
        </div>
      </div>

      {/* ── 4 PREMIUM STAT CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 shrink-0">

        {/* ── Card 1: Total Applications ── */}
        <div
          onClick={() => handleCardClick("pending", "ALL")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && handleCardClick("pending", "ALL")}
          className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1e3a8a] via-[#3730a3] to-[#4c1d95] p-6 text-white shadow-xl shadow-indigo-900/40 ring-1 ring-inset ring-white/15 cursor-pointer min-h-[160px] flex flex-col justify-between transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-indigo-700/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          {/* top-edge shimmer */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
          {/* large glow orb top-right */}
          <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-blue-400/20 blur-2xl" />
          {/* second orb bottom-left */}
          <div className="pointer-events-none absolute -left-4 -bottom-4 h-20 w-20 rounded-full bg-violet-500/20 blur-xl" />
          {/* giant watermark icon bottom-right */}
          <div className="pointer-events-none absolute right-3 bottom-3 opacity-[0.08] group-hover:opacity-[0.13] transition-opacity duration-300">
            <PackageCheck className="h-20 w-20 text-white" strokeWidth={1.2} />
          </div>

          {/* top row: label + icon badge */}
          <div className="relative flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20 shadow-inner shrink-0">
                <PackageCheck className="h-4 w-4 text-blue-200" strokeWidth={2.2} />
              </span>
              <span className="text-[11px] font-bold uppercase tracking-widest text-blue-200/80 leading-tight">
                Total
              </span>
            </div>
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-white/10 text-blue-200 border border-white/15">
              ALL
            </span>
          </div>

          {/* big number */}
          <div className="relative mt-3">
            <p className="text-4xl font-black text-white tabular-nums tracking-tight leading-none drop-shadow-md">
              {globalCounts.total}
            </p>
            <p className="text-[11px] font-semibold text-blue-200/70 mt-1.5 leading-snug">
              Applications submitted
            </p>
          </div>

          {/* bottom progress bar */}
          <div className="relative mt-4">
            <div className="h-1 w-full rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-300 via-indigo-300 to-violet-300 transition-all duration-700"
                style={{ width: globalCounts.total > 0 ? "100%" : "0%" }}
              />
            </div>
          </div>
        </div>

        {/* ── Card 2: Pending Clearance ── */}
        <div
          onClick={() => handleCardClick("pending", "ALL")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && handleCardClick("pending", "ALL")}
          className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#92400e] via-[#c2410c] to-[#b91c1c] p-6 text-white shadow-xl shadow-orange-900/40 ring-1 ring-inset ring-white/15 cursor-pointer min-h-[160px] flex flex-col justify-between transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-orange-600/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
          <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-amber-400/20 blur-2xl" />
          <div className="pointer-events-none absolute -left-4 -bottom-4 h-20 w-20 rounded-full bg-red-600/25 blur-xl" />
          <div className="pointer-events-none absolute right-3 bottom-3 opacity-[0.08] group-hover:opacity-[0.13] transition-opacity duration-300">
            <Clock className="h-20 w-20 text-white" strokeWidth={1.2} />
          </div>

          <div className="relative flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20 shadow-inner shrink-0">
                <Clock className="h-4 w-4 text-amber-200" strokeWidth={2.2} />
              </span>
              <span className="text-[11px] font-bold uppercase tracking-widest text-amber-200/80 leading-tight">
                Pending
              </span>
            </div>
            {globalCounts.pending > 0 && (
              <span className="flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-white text-orange-600 shadow-md animate-pulse">
                <span className="h-1.5 w-1.5 rounded-full bg-orange-500 inline-block" />
                Urgent
              </span>
            )}
          </div>

          <div className="relative mt-3">
            <p className="text-4xl font-black text-white tabular-nums tracking-tight leading-none drop-shadow-md">
              {globalCounts.pending}
            </p>
            <p className="text-[11px] font-semibold text-orange-200/70 mt-1.5 leading-snug">
              Awaiting manager review
            </p>
          </div>

          <div className="relative mt-4">
            <div className="h-1 w-full rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-300 via-orange-300 to-red-300 transition-all duration-700"
                style={{ width: globalCounts.total > 0 ? `${Math.round((globalCounts.pending / globalCounts.total) * 100)}%` : "0%" }}
              />
            </div>
            <p className="text-[10px] text-orange-200/50 mt-1 tabular-nums">
              {globalCounts.total > 0 ? `${Math.round((globalCounts.pending / globalCounts.total) * 100)}% of total` : "—"}
            </p>
          </div>
        </div>

        {/* ── Card 3: Processed & Authorized ── */}
        <div
          onClick={() => handleCardClick("processed", "ALL")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && handleCardClick("processed", "ALL")}
          className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#064e3b] via-[#0f766e] to-[#0e7490] p-6 text-white shadow-xl shadow-emerald-900/40 ring-1 ring-inset ring-white/15 cursor-pointer min-h-[160px] flex flex-col justify-between transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-emerald-600/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
          <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-emerald-400/20 blur-2xl" />
          <div className="pointer-events-none absolute -left-4 -bottom-4 h-20 w-20 rounded-full bg-cyan-500/20 blur-xl" />
          <div className="pointer-events-none absolute right-3 bottom-3 opacity-[0.08] group-hover:opacity-[0.13] transition-opacity duration-300">
            <CheckCircle2 className="h-20 w-20 text-white" strokeWidth={1.2} />
          </div>

          <div className="relative flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20 shadow-inner shrink-0">
                <CheckCircle2 className="h-4 w-4 text-emerald-200" strokeWidth={2.2} />
              </span>
              <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-200/80 leading-tight">
                Processed
              </span>
            </div>
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-200 border border-emerald-400/30">
              Authorized
            </span>
          </div>

          <div className="relative mt-3">
            <p className="text-4xl font-black text-white tabular-nums tracking-tight leading-none drop-shadow-md">
              {globalCounts.processed}
            </p>
            <p className="text-[11px] font-semibold text-emerald-200/70 mt-1.5 leading-snug">
              Approved &amp; issued passes
            </p>
          </div>

          <div className="relative mt-4">
            <div className="h-1 w-full rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-300 via-teal-300 to-cyan-300 transition-all duration-700"
                style={{ width: globalCounts.total > 0 ? `${Math.round((globalCounts.processed / globalCounts.total) * 100)}%` : "0%" }}
              />
            </div>
            <p className="text-[10px] text-emerald-200/50 mt-1 tabular-nums">
              {globalCounts.total > 0 ? `${Math.round((globalCounts.processed / globalCounts.total) * 100)}% clearance rate` : "—"}
            </p>
          </div>
        </div>

        {/* ── Card 4: Vehicle Updates ── */}
        <div
          onClick={() => handleCardClick("pass_updates", "ALL")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && handleCardClick("pass_updates", "ALL")}
          className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#4a1d96] via-[#6d28d9] to-[#3730a3] p-6 text-white shadow-xl shadow-purple-900/40 ring-1 ring-inset ring-white/15 cursor-pointer min-h-[160px] flex flex-col justify-between transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-violet-600/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
          <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-violet-400/20 blur-2xl" />
          <div className="pointer-events-none absolute -left-4 -bottom-4 h-20 w-20 rounded-full bg-indigo-600/25 blur-xl" />
          <div className="pointer-events-none absolute right-3 bottom-3 opacity-[0.08] group-hover:opacity-[0.13] transition-opacity duration-300">
            <RotateCcw className="h-20 w-20 text-white" strokeWidth={1.2} />
          </div>

          <div className="relative flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20 shadow-inner shrink-0">
                <RotateCcw className="h-4 w-4 text-violet-200" strokeWidth={2.2} />
              </span>
              <span className="text-[11px] font-bold uppercase tracking-widest text-violet-200/80 leading-tight">
                Vehicle Updates
              </span>
            </div>
          </div>

          <div className="relative mt-3">
            <p className="text-4xl font-black text-white tabular-nums tracking-tight leading-none drop-shadow-md">
              {passUpdatesCount}
            </p>
            <p className="text-[11px] font-semibold text-violet-200/70 mt-1.5 leading-snug">
              Two-wheeler change requests
            </p>
          </div>

          <div className="relative mt-4">
            <div className="h-1 w-full rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-300 via-purple-300 to-indigo-300 transition-all duration-700"
                style={{ width: passUpdatesCount > 0 ? "60%" : "0%" }}
              />
            </div>
          </div>
        </div>

      </div>

      {/* ── TABS BAR ── */}
      <div className="flex items-center gap-2 border-b-2 border-slate-200 pb-0 overflow-x-auto">
        {[
          {
            id: "pending",
            label: "Pending Passes",
            count: globalCounts.pending,
            icon: Clock,
          },
          {
            id: "processed",
            label: "Processed Passes",
            count: globalCounts.processed,
            icon: CheckCircle2,
          },
          {
            id: "pass_updates",
            label: "Vehicle Updates",
            count: passUpdatesCount,
            icon: RotateCcw,
          },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setCardFilter("ALL");
                setSearchInput("");
                setProcessedByMe(false);
                setCurrentPage(1);
              }}
              className={`relative flex items-center gap-2 px-5 py-3 text-xs font-black rounded-t-2xl transition-all cursor-pointer select-none whitespace-nowrap ${
                isActive
                  ? "bg-[#0a1e4d] text-white shadow-[0_-2px_12px_rgba(10,30,77,0.15)] scale-[1.02]"
                  : "bg-white/80 text-slate-600 hover:text-slate-900 hover:bg-white border-t border-x border-slate-200"
              }`}
            >
              <Icon
                className={`h-4 w-4 ${isActive ? "text-orange-400" : "text-slate-400"}`}
              />
              {tab.label}
              <span
                className={`ml-1.5 inline-flex items-center justify-center min-w-[22px] h-5 px-2 rounded-full text-[10px] font-black ${
                  isActive
                    ? "bg-orange-500 text-white"
                    : "bg-slate-100 text-slate-600 border border-slate-200"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Table card ── */}
      <div className="relative rounded-2xl ring-1 ring-slate-200/60 bg-white shadow-xl overflow-hidden">
        {/* Table toolbar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-slate-50">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
              {activeTab === "pending" ? (
                <ShieldAlert className="h-4 w-4" />
              ) : activeTab === "processed" ? (
                <History className="h-4 w-4" />
              ) : (
                <RotateCcw className="h-4 w-4" />
              )}
            </span>
            <h3 className="font-black text-slate-800 text-sm tracking-tight">
              {activeTab === "pending"
                ? "Pending Pass Applications — Oversight View"
                : activeTab === "processed"
                  ? "Processed & Authorized Pass Archive"
                  : "Two-Wheeler Vehicle Registration Updates"}
            </h3>
          </div>

          <div className="flex flex-col sm:flex-row w-full md:w-auto gap-3 items-center">
            {activeTab === "processed" && (
              <label className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer hover:bg-slate-50 transition-colors select-none shadow-sm">
                <input
                  type="checkbox"
                  id="processed-by-me-filter"
                  checked={processedByMe}
                  onChange={(e) => {
                    setProcessedByMe(e.target.checked);
                    setCurrentPage(1);
                  }}
                  className="rounded border-slate-300 text-orange-600 focus:ring-orange-500 h-4 w-4 cursor-pointer"
                />
                <span>Processed By Me</span>
              </label>
            )}

            <div className="relative w-full sm:w-auto">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full sm:w-auto pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-orange-500 appearance-none cursor-pointer shadow-sm"
              >
                <option value="DATE_DESC">Newest First</option>
                <option value="DATE_ASC">Oldest First</option>
                <option value="EXPIRY_SOON">Expiring Soon</option>
              </select>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search Ref ID, Company, Pass..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value.toUpperCase())}
                className="w-full pl-9 pr-10 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400/50 shadow-sm"
              />
              {searchInput && (
                <button
                  onClick={() => setSearchInput("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500 transition-colors"
                  title="Clear Search"
                >
                  <XCircle className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200/80">
                {(activeTab === "pass_updates"
                  ? [
                      "Pass No.",
                      "Person Name",
                      "Company",
                      "Old Vehicle No.",
                      "New Vehicle No.",
                      "Requested On",
                      "Status",
                    ]
                  : activeTab === "processed"
                    ? [
                        "Ref No",
                        "Company Details",
                        "Entities Included",
                        "Applied On",
                        "Approved By",
                        "Status",
                        "View",
                      ]
                    : [
                        "Ref No",
                        "Company Details",
                        "Entities Included",
                        "Applied On",
                        "Status",
                        "View",
                      ]
                ).map((h) => (
                  <th
                    key={h}
                    className={`px-6 py-3.5 text-[11px] font-black text-slate-500 uppercase tracking-wider ${
                      h === "Status" || h === "View"
                        ? "text-center"
                        : ""
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeTab === "pass_updates" ? (
                twoWheelerRequests.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-16 text-center text-slate-400"
                    >
                      <Search className="h-10 w-10 mx-auto text-slate-200 mb-3" />
                      <p className="text-xs font-bold text-slate-500">
                        No two-wheeler update requests found.
                      </p>
                    </td>
                  </tr>
                ) : (
                  twoWheelerRequests.map((req) => (
                    <tr
                      key={req.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="px-6 py-4 text-xs font-mono font-black text-[#0a1e4d]">
                        {req.personPassNo ||
                          `REQ-${req.passRequestId || req.id}`}
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-800">
                        {req.personName || "—"}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-600">
                        {req.companyName || "—"}
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-slate-500">
                        {req.oldVehicleNo || "N/A"}
                      </td>
                      <td className="px-6 py-4 text-xs font-mono font-black text-emerald-600">
                        {req.newVehicleNo}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {new Date(req.createdAt).toLocaleDateString("en-GB")}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${req.status === "APPROVED" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : req.status === "REJECTED" ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}
                        >
                          {req.status}
                        </span>
                      </td>
                      </tr>
                  ))
                )
              ) : loading ? (
                <tr>
                  <td
                    colSpan={activeTab === "processed" ? 7 : 6}
                    className="py-16 text-center text-slate-400"
                  >
                    <Loader2 className="h-10 w-10 mx-auto text-orange-400 mb-3 animate-spin" />
                    <p className="text-xs font-bold text-slate-600">
                      Loading pass applications...
                    </p>
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td
                    colSpan={activeTab === "processed" ? 7 : 6}
                    className="py-16 text-center text-slate-400"
                  >
                    <Search className="h-10 w-10 mx-auto text-slate-200 mb-3" />
                    <p className="text-xs font-bold text-slate-500">
                      No records found for the current filter/search.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredData.map((pass) => {
                  const statusColors = {
                    approved:
                      "bg-emerald-50 text-emerald-700 border-emerald-200",
                    processed:
                      "bg-emerald-50 text-emerald-700 border-emerald-200",
                    reverted: "bg-amber-50 text-amber-700 border-amber-200",
                    rejected: "bg-rose-50 text-rose-700 border-rose-200",
                  };
                  const statusKey = (pass.status || "").toLowerCase();
                  const statusClass =
                    statusColors[statusKey] ||
                    "bg-blue-50 text-blue-700 border-blue-200";

                  const lockType =
                    pass.originType === "VENDOR" ? "vendor-pass" : "pass";
                  const lock = activeLocks[lockType]?.find(
                    (l) => String(l.applicationId) === String(pass.id),
                  );
                  const isLocked = !!lock;

                  const catInfo = getPassRequestCategory(pass);

                  const rowClass = isLocked
                    ? `bg-amber-50/70 hover:bg-amber-100/70 transition-colors cursor-pointer group ${catInfo.borderAccent}`
                    : `hover:bg-slate-50 transition-colors cursor-pointer group ${catInfo.borderAccent}`;

                  return (
                    <tr
                      key={
                        pass.originType === "VENDOR"
                          ? `vpr-${pass.id}`
                          : pass.id
                      }
                      onClick={() =>
                        openReviewModal(pass, true)
                      }
                      className={rowClass}
                    >
                      <td className="px-6 py-4">
                        <span className="font-mono font-black text-xs text-[#0a1e4d] bg-slate-100 hover:bg-blue-50 border border-slate-200 px-2.5 py-1 rounded-lg transition-colors">
                          {pass.referenceNo || `REQ-${pass.id}`}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#0a1e4d] to-[#1b3a8a] text-white flex items-center justify-center font-black text-xs shadow-sm shrink-0">
                            {(pass.entityName || "?").charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-black text-slate-800 truncate">
                              {pass.entityName || "—"}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate">
                              {pass.email || "—"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span className="bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border border-slate-200">
                            {pass.persons?.length || 0} Persons |{" "}
                            {pass.vehicles?.length || 0} Vehicles
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold border ${catInfo.badgeClass}`}
                          >
                            {catInfo.label}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-slate-500">
                        {new Date(pass.createdAt).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      {activeTab === "processed" && (
                        <td className="px-6 py-4 text-xs font-bold text-slate-700">
                          {pass.approvedBy || "—"}
                        </td>
                      )}
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wide ${statusClass}`}
                          >
                            {(pass.status || "PENDING").toUpperCase()}
                          </span>
                          {isLocked && (
                            <span className="text-[9px] text-amber-700 font-extrabold bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200 animate-pulse">
                              LOCKED: {lock.userName.toUpperCase()}
                            </span>
                          )}
                        </div>
                      </td>
                      <td
                        className="px-6 py-4 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => openReviewModal(pass, true)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer bg-slate-100 hover:bg-[#0a1e4d] text-slate-700 hover:text-white border border-slate-200 hover:border-transparent"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>View</span>
                          <ChevronRight className="h-3 w-3 opacity-70" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination Bar ── */}
        <div className="px-5 pb-4">
          <PaginationBar
            currentPage={paginationMeta.currentPage || currentPage}
            totalPages={paginationMeta.totalPages || 1}
            totalRecords={paginationMeta.totalRecords || 0}
            pageSize={paginationMeta.pageSize || pageSize}
            onPageChange={(page) => setCurrentPage(page)}
            onPageSizeChange={(limit) => {
              setPageSize(limit);
              setCurrentPage(1);
            }}
            loading={loading}
          />
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
                  <div className="flex items-center gap-2 flex-wrap">
                    {selectedRequest.requisitionLetterFilePath && (
                      <button
                        onClick={() =>
                          handleViewDoc(
                            selectedRequest.id,
                            "passRequisitionLetter",
                            selectedRequest.requisitionLetterFilePath,
                          )
                        }
                        className="bg-blue-50 text-blue-700 border border-blue-200 px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-blue-100 transition-colors shadow-sm"
                      >
                        <FileText className="h-4 w-4 text-blue-600" /> View
                        Requisition Letter
                      </button>
                    )}
                    {selectedRequest.authLetterFilePath && (
                      <button
                        onClick={() =>
                          handleViewDoc(
                            selectedRequest.id,
                            "authLetter",
                            selectedRequest.authLetterFilePath,
                          )
                        }
                        className="bg-orange-50 text-orange-700 border border-orange-200 px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-orange-100 transition-colors shadow-sm"
                      >
                        <FileCheck2 className="h-4 w-4 text-orange-600" /> View
                        Licence / Work Order / Contract
                      </button>
                    )}
                  </div>
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
              {visiblePersons.length > 0 && (
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
                          Name
                        </th>
                        <th className="p-3 font-semibold text-slate-600 uppercase text-xs">
                          Pass Type
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
                      {visiblePersons.map((p) => (
                        <tr
                          key={p.id}
                          onClick={() => {
                            if (!isViewMode && canUserVerifyPerson(p)) {
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
                          className={`transition-all hover:shadow-sm ${!isViewMode && canUserVerifyPerson(p) ? "hover:bg-slate-50 cursor-pointer" : "bg-slate-50/50 cursor-default"}`}
                        >
                          <td className="p-3 text-slate-800 font-mono font-bold text-xs">
                            {p.personPassNo || "-"}
                          </td>
                          <td className="p-3 font-bold text-[#0a1e4d]">
                            <span>{p.name}</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {isOilDockArea(
                                p.accessAreaId || p.accessArea,
                              ) && (
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                    p.srDtmApproved ||
                                    (userRole ===
                                      "Senior Deputy Traffic Manager" &&
                                      entityStatuses.persons[p.id] ===
                                        "APPROVED")
                                      ? "bg-emerald-100 text-emerald-700"
                                      : "bg-amber-100 text-amber-700"
                                  }`}
                                >
                                  {p.srDtmApproved ||
                                  (userRole ===
                                    "Senior Deputy Traffic Manager" &&
                                    entityStatuses.persons[p.id] === "APPROVED")
                                    ? "✓ Sr. DTM"
                                    : "⏳ Pending Sr. DTM"}
                                </span>
                              )}
                              <span
                                className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                  [
                                    "APPROVED",
                                    "REJECTED",
                                    "REVERTED",
                                    "approved",
                                    "rejected",
                                    "reverted",
                                  ].includes(
                                    selectedRequest?.status ||
                                      selectedRequest?.decision,
                                  ) ||
                                  [
                                    "approved",
                                    "rejected",
                                    "reverted",
                                    "APPROVED",
                                    "REJECTED",
                                    "REVERTED",
                                  ].includes(p.status || p.decision) ||
                                  (userRole === "Approval" &&
                                    entityStatuses.persons[p.id] === "APPROVED")
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-amber-100 text-amber-700"
                                }`}
                              >
                                {[
                                  "APPROVED",
                                  "REJECTED",
                                  "REVERTED",
                                  "approved",
                                  "rejected",
                                  "reverted",
                                ].includes(
                                  selectedRequest?.status ||
                                    selectedRequest?.decision,
                                ) ||
                                [
                                  "approved",
                                  "rejected",
                                  "reverted",
                                  "APPROVED",
                                  "REJECTED",
                                  "REVERTED",
                                ].includes(p.status || p.decision) ||
                                (userRole === "Approval" &&
                                  entityStatuses.persons[p.id] === "APPROVED")
                                  ? "✓ Pass Section"
                                  : "⏳ Pending Pass Section"}
                              </span>
                            </div>
                          </td>
                          <td className="p-3">
                            {(() => {
                              const pCat = getItemCategoryTag(p, true);
                              return pCat ? (
                                <span
                                  className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-extrabold border ${pCat.tagClass}`}
                                >
                                  {pCat.label}
                                </span>
                              ) : (
                                "-"
                              );
                            })()}
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
                                        className={`px-2 py-1 rounded text-[10px] font-bold ${
                                          personStatus === "APPROVED"
                                            ? "bg-emerald-100 text-emerald-700"
                                            : personStatus === "REVERTED"
                                              ? "bg-amber-100 text-amber-700"
                                              : "bg-red-100 text-red-700"
                                        }`}
                                      >
                                        {personStatus}
                                      </span>
                                    )}

                                    {(personStatus === "REJECTED" ||
                                      personStatus === "REVERTED") &&
                                      personRemark && (
                                        <div
                                          className={`mt-1 text-[10px] p-1 rounded border inline-block ${
                                            personStatus === "REVERTED"
                                              ? "text-amber-600 bg-amber-50 border-amber-100"
                                              : "text-red-600 bg-red-50 border-red-100"
                                          }`}
                                        >
                                          {personStatus === "REVERTED"
                                            ? "Revert: "
                                            : "Reason: "}
                                          {personRemark}
                                        </div>
                                      )}
                                  </>
                                );
                              })()}
                              {!isViewMode && canUserVerifyPerson(p) && (
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
                                  className={`${getItemCategoryTag(p, true)?.btnClass || "bg-blue-600 hover:bg-blue-700 text-white shadow-sm"} px-4 py-1.5 rounded-lg text-xs font-bold transition-colors`}
                                >
                                  {entityStatuses.persons[p.id] ||
                                  p.status === "approved" ||
                                  p.status === "rejected"
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
              {visibleVehicles.length > 0 && (
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
                          Pass Type
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
                      {visibleVehicles.map((v) => (
                        <tr
                          key={v.id}
                          onClick={() => {
                            if (!isViewMode && canUserVerifyVehicle(v)) {
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
                          className={`transition-all hover:shadow-sm ${!isViewMode && canUserVerifyVehicle(v) ? "hover:bg-slate-50 cursor-pointer" : "bg-slate-50/50 cursor-default"}`}
                        >
                          <td className="p-3 text-slate-800 font-mono font-bold text-xs">
                            {v.vehiclePassNo || "-"}
                          </td>
                          <td className="p-3 font-bold text-[#0a1e4d] uppercase">
                            {v.registrationNo}
                          </td>
                          <td className="p-3">
                            {(() => {
                              const vCat = getItemCategoryTag(v, false);
                              return vCat ? (
                                <span
                                  className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-extrabold border ${vCat.tagClass}`}
                                >
                                  {vCat.label}
                                </span>
                              ) : (
                                "-"
                              );
                            })()}
                          </td>
                          <td className="p-3 text-slate-600 text-xs font-medium">
                            <div>
                              {v.vehicleTypeName} • {v.passType}
                            </div>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {["MONTHLY", "YEARLY", "ANNUAL"].includes(
                                v.passType,
                              ) && (
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                    v.twistLockCertified ||
                                    (userRole === "Safety Officer" &&
                                      entityStatuses.vehicles[v.id] ===
                                        "APPROVED")
                                      ? "bg-emerald-100 text-emerald-700"
                                      : "bg-amber-100 text-amber-700"
                                  }`}
                                >
                                  {v.twistLockCertified ||
                                  (userRole === "Safety Officer" &&
                                    entityStatuses.vehicles[v.id] ===
                                      "APPROVED")
                                    ? "✓ Safety"
                                    : "⏳ Pending Safety"}
                                </span>
                              )}
                              {isOilDockArea(
                                v.accessAreaId || v.accessArea,
                              ) && (
                                <>
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                      v.sparkArresterCertified ||
                                      (userRole === "Fire Safety Officer" &&
                                        entityStatuses.vehicles[v.id] ===
                                          "APPROVED")
                                        ? "bg-emerald-100 text-emerald-700"
                                        : "bg-amber-100 text-amber-700"
                                    }`}
                                  >
                                    {v.sparkArresterCertified ||
                                    (userRole === "Fire Safety Officer" &&
                                      entityStatuses.vehicles[v.id] ===
                                        "APPROVED")
                                      ? "✓ Fire Safety"
                                      : "⏳ Pending Fire Safety"}
                                  </span>
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                      v.srDtmApproved ||
                                      (userRole ===
                                        "Senior Deputy Traffic Manager" &&
                                        entityStatuses.vehicles[v.id] ===
                                          "APPROVED")
                                        ? "bg-emerald-100 text-emerald-700"
                                        : "bg-amber-100 text-amber-700"
                                    }`}
                                  >
                                    {v.srDtmApproved ||
                                    (userRole ===
                                      "Senior Deputy Traffic Manager" &&
                                      entityStatuses.vehicles[v.id] ===
                                        "APPROVED")
                                      ? "✓ Sr. DTM"
                                      : "⏳ Pending Sr. DTM"}
                                  </span>
                                </>
                              )}
                              <span
                                className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                  [
                                    "APPROVED",
                                    "REJECTED",
                                    "REVERTED",
                                    "approved",
                                    "rejected",
                                    "reverted",
                                  ].includes(
                                    selectedRequest?.status ||
                                      selectedRequest?.decision,
                                  ) ||
                                  [
                                    "approved",
                                    "rejected",
                                    "reverted",
                                    "APPROVED",
                                    "REJECTED",
                                    "REVERTED",
                                  ].includes(v.status || v.decision) ||
                                  (userRole === "Approval" &&
                                    entityStatuses.vehicles[v.id] ===
                                      "APPROVED")
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-amber-100 text-amber-700"
                                }`}
                              >
                                {[
                                  "APPROVED",
                                  "REJECTED",
                                  "REVERTED",
                                  "approved",
                                  "rejected",
                                  "reverted",
                                ].includes(
                                  selectedRequest?.status ||
                                    selectedRequest?.decision,
                                ) ||
                                [
                                  "approved",
                                  "rejected",
                                  "reverted",
                                  "APPROVED",
                                  "REJECTED",
                                  "REVERTED",
                                ].includes(v.status || v.decision) ||
                                (userRole === "Approval" &&
                                  entityStatuses.vehicles[v.id] === "APPROVED")
                                  ? "✓ Pass Section"
                                  : "⏳ Pending Pass Section"}
                              </span>
                            </div>
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
                                        className={`px-2 py-1 rounded text-[10px] font-bold ${
                                          vehicleStatus === "APPROVED"
                                            ? "bg-emerald-100 text-emerald-700"
                                            : vehicleStatus === "REVERTED"
                                              ? "bg-amber-100 text-amber-700"
                                              : "bg-red-100 text-red-700"
                                        }`}
                                      >
                                        {vehicleStatus}
                                      </span>
                                    )}

                                    {(vehicleStatus === "REJECTED" ||
                                      vehicleStatus === "REVERTED") &&
                                      vehicleRemark && (
                                        <div
                                          className={`mt-1 text-[10px] p-1 rounded border inline-block ${
                                            vehicleStatus === "REVERTED"
                                              ? "text-amber-600 bg-amber-50 border-amber-100"
                                              : "text-red-600 bg-red-50 border-red-100"
                                          }`}
                                        >
                                          {vehicleStatus === "REVERTED"
                                            ? "Revert: "
                                            : "Reason: "}
                                          {vehicleRemark}
                                        </div>
                                      )}
                                  </>
                                );
                              })()}
                              {!isViewMode && canUserVerifyVehicle(v) && (
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
                                  className={`${getItemCategoryTag(v, false)?.btnClass || "bg-blue-600 hover:bg-blue-700 text-white shadow-sm"} px-4 py-1.5 rounded-lg text-xs font-bold transition-colors`}
                                >
                                  {entityStatuses.vehicles[v.id] ||
                                  v.status === "approved" ||
                                  v.status === "rejected"
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

              {!isViewMode && selectedRequest && !hasVisibleEntities && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  This pass request contains no personnel or vehicles that
                  require your approval at this stage.
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
                        value={entityModal.data.hepType}
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
                        value={
                          entityModal.data.vehicleTypeName ||
                          entityModal.data.vehicle_type_name ||
                          entityModal.data.vehicleType ||
                          entityModal.data.vehicleTypeId ||
                          entityModal.data.type ||
                          "-"
                        }
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

                  {/* Oil Dock Workflow Status */}
                  {isOilDockArea(
                    entityModal.data.accessAreaId ||
                      entityModal.data.accessArea,
                  ) && (
                    <div className="col-span-2 md:col-span-4 border-t border-slate-100 pt-4 mt-2">
                      <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
                        Essential Entry Permit Certifications
                      </h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {entityModal.type === "person" ? (
                          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                            <span className="text-[10px] font-bold text-slate-500 uppercase">
                              Sr. DTM Approval
                            </span>
                            <div className="flex items-center gap-2 mt-1">
                              {entityModal.data.srDtmApproved ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                  AUTHORIZED
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                  PENDING AUTHORIZATION
                                </span>
                              )}
                            </div>
                            {entityModal.data.srDtmRemarks && (
                              <p className="text-xs text-slate-600 mt-2 font-mono bg-white p-2 rounded border">
                                Remarks: {entityModal.data.srDtmRemarks}
                              </p>
                            )}
                          </div>
                        ) : (
                          <>
                            {/* Safety Officer badge — shown only for MONTHLY, YEARLY, ANNUAL oil dock vehicles */}
                            {["MONTHLY", "YEARLY", "ANNUAL"].includes(
                              entityModal.data.passType,
                            ) && (
                              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                                <span className="text-[10px] font-bold text-slate-500 uppercase">
                                  Safety Officer (Twist Lock & Fitness)
                                </span>
                                <div className="flex items-center gap-2 mt-1">
                                  {entityModal.data.twistLockCertified ? (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                      APPROVED
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                      PENDING APPROVAL
                                    </span>
                                  )}
                                </div>
                                {entityModal.data.twistLockRemarks && (
                                  <p className="text-xs text-slate-600 mt-2 font-mono bg-white p-2 rounded border">
                                    Remarks: {entityModal.data.twistLockRemarks}
                                  </p>
                                )}
                              </div>
                            )}

                            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                              <span className="text-[10px] font-bold text-slate-500 uppercase">
                                Fire Safety Officer (Spark Arrester)
                              </span>
                              <div className="flex items-center gap-2 mt-1">
                                {entityModal.data.sparkArresterCertified ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                    CERTIFIED
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                    PENDING CERTIFICATION
                                  </span>
                                )}
                              </div>
                              {entityModal.data.sparkArresterRemarks && (
                                <p className="text-xs text-slate-600 mt-2 font-mono bg-white p-2 rounded border">
                                  Remarks:{" "}
                                  {entityModal.data.sparkArresterRemarks}
                                </p>
                              )}
                            </div>

                            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                              <span className="text-[10px] font-bold text-slate-500 uppercase">
                                Sr. DTM Approval
                              </span>
                              <div className="flex items-center gap-2 mt-1">
                                {entityModal.data.srDtmApproved ||
                                (userRole === "Senior Deputy Traffic Manager" &&
                                  entityStatuses.vehicles[
                                    entityModal.data.id
                                  ] === "APPROVED") ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                    AUTHORIZED
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                    PENDING AUTHORIZATION
                                  </span>
                                )}
                              </div>
                              {entityModal.data.srDtmRemarks && (
                                <p className="text-xs text-slate-600 mt-2 font-mono bg-white p-2 rounded border">
                                  Remarks: {entityModal.data.srDtmRemarks}
                                </p>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
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
                                selectedRequest.originType === "VENDOR",
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
                      <DocumentCard
                        label="Visa"
                        filePath={entityModal.data.visaDocPath}
                        documentType="visaDoc"
                        passRequestId={selectedRequest.id}
                        onView={handleViewDoc}
                        entityIndex={extractEntityIndex(entityModal.data.id)}
                        isVendorPass={selectedRequest.originType === "VENDOR"}
                      />
                      <DocumentCard
                        label="Immigration Clearance"
                        filePath={entityModal.data.immigrationDocPath}
                        documentType="immigrationDoc"
                        passRequestId={selectedRequest.id}
                        onView={handleViewDoc}
                        entityIndex={extractEntityIndex(entityModal.data.id)}
                        isVendorPass={selectedRequest.originType === "VENDOR"}
                      />
                      <DocumentCard
                        label="Entry Authorization Document"
                        filePath={entityModal.data.entryAuthorizationFilePath}
                        documentType="entryAuthorization"
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
                      {(entityModal.data.twistLockFilePath ||
                        (selectedRequest?.isOilDock &&
                          ["MONTHLY", "YEARLY", "ANNUAL"].includes(
                            entityModal.data.passType,
                          ))) && (
                        <DocumentCard
                          label="Twist Lock Certificate"
                          filePath={entityModal.data.twistLockFilePath}
                          documentType="twistLock"
                          passRequestId={selectedRequest.id}
                          onView={handleViewDoc}
                          entityIndex={extractEntityIndex(entityModal.data.id)}
                          isVendorPass={selectedRequest.originType === "VENDOR"}
                        />
                      )}
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
                      <DocumentCard
                        label="Spark Arrester Certificate"
                        filePath={entityModal.data.sparkArresterFilePath}
                        documentType="sparkArrester"
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
                    <CheckCircle2 className="h-5 w-5" />{" "}
                    {userRole === "Safety Officer"
                      ? entityModal.type === "vehicle" &&
                        ["MONTHLY", "YEARLY", "ANNUAL"].includes(
                          entityModal.data?.passType,
                        )
                        ? "Certify Twist Lock"
                        : "Approve"
                      : userRole === "Fire Safety Officer"
                        ? "Certify Spark Arrester"
                        : userRole === "Senior Deputy Traffic Manager"
                          ? "Authorize Entry"
                          : "Approve"}
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

      {/* REJECT UPDATE MODAL */}
      {rejectModal.isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in zoom-in-95 duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-700">
            <div className="flex justify-between items-center px-6 py-4 bg-red-600 text-white">
              <h3 className="text-base font-bold flex items-center gap-2">
                <XCircle className="h-5 w-5" />
                Reject Two-Wheeler Update
              </h3>
              <button
                onClick={() =>
                  setRejectModal({ isOpen: false, requestId: null, reason: "" })
                }
                className="text-white/70 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-3 bg-slate-50 dark:bg-slate-900">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                Reason for Rejection <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                value={rejectModal.reason}
                onChange={(e) =>
                  setRejectModal({ ...rejectModal, reason: e.target.value })
                }
                placeholder="Enter rejection reason..."
                className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-3 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-slate-800"
              />
            </div>
            <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex justify-end gap-3">
              <button
                onClick={() =>
                  setRejectModal({ isOpen: false, requestId: null, reason: "" })
                }
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectTwoWheeler}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold shadow transition-all"
              >
                Reject Update
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
