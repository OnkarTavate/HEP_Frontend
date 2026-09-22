"use client";

import React, { useState, useEffect, useCallback } from "react";
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
  Sparkles,
  Flame,
  PackageCheck,
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
  const [isSubmitting, setIsSubmitting] = useState(false);

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
  const isVendorOilJettyWorkflow =
    selectedRequest?.originType === "VENDOR" &&
    Boolean(selectedRequest?.isOilDock) &&
    String(selectedRequest?.workflowState || "")
      .trim()
      .toUpperCase()
      .startsWith("PENDING_VENDOR_");

  const [companyProfile, setCompanyProfile] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMarineFireSafety, setIsMarineFireSafety] = useState(false);
  const [userDepartmentId, setUserDepartmentId] = useState(null);

  const [essentialWorkflowStage, setEssentialWorkflowStage] = useState(null);
  const [userContextReady, setUserContextReady] = useState(false);
  const [isEssentialOilDockApprover, setIsEssentialOilDockApprover] =
    useState(false);
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

  const isVendorPersonOilJettyWorkflow =
    selectedRequest?.originType === "VENDOR" &&
    Boolean(selectedRequest?.isOilDock) &&
    (selectedRequest?.persons || []).some((p) => {
      const area = String(p?.accessAreaId || p?.accessArea || "")
        .trim()
        .toUpperCase();

      const isOilJetty =
        area === "1" ||
        area.includes("OIL JETTY") ||
        area.includes("OIL_JETTY");

      const workflowState = String(p?.workflowState || "")
        .trim()
        .toUpperCase();

      return isOilJetty && workflowState.startsWith("PENDING_VENDOR_PERSON_");
    });

  const isVendorOilJettyPortalUser =
    (Number(userDepartmentId) === 7 &&
      ["Fire Safety Officer", "Dy. Conservator"].includes(
        String(userRole || "").trim(),
      )) ||
    (String(userRole || "").trim() === "Approval" &&
      [3, 4, 9].includes(Number(userDepartmentId)));

  useEffect(() => {
    const userStr = localStorage.getItem("user");

    if (!userStr) {
      setUserContextReady(true);
      return;
    }

    try {
      const user = JSON.parse(userStr);

      const role = String(user?.role || "").trim();
      const departmentId = Number(user?.departmentId);

      setUserRole(role);
      setUserDepartmentId(departmentId);

      setIsMarineFireSafety(
        role === "Fire Safety Officer" && departmentId === 7,
      );

      let essentialStage = null;

      if (
        departmentId === 7 &&
        ["Dy. Conservator", "Fire Safety Officer"].includes(role)
      ) {
        essentialStage = "PENDING_MARINE_ESSENTIAL";
      } else if (role === "Approval" && departmentId === 3) {
        essentialStage = "PENDING_CIVIL_ESSENTIAL";
      } else if (role === "Approval" && departmentId === 4) {
        essentialStage = "PENDING_MECHANICAL_ESSENTIAL";
      } else if (
        ["CISF", "CISF Asst Commandant", "CISF Assistant Commandant"].includes(
          role,
        )
      ) {
        essentialStage = "PENDING_CISF_ESSENTIAL";
      } else if (role === "Approval" && departmentId === 9) {
        essentialStage = "PENDING_PASS_SECTION_ESSENTIAL";
      }

      setEssentialWorkflowStage(essentialStage);
      setIsEssentialOilDockApprover(Boolean(essentialStage));
      setUserContextReady(true);
    } catch (error) {
      console.error("Failed to parse user:", error);
      setUserContextReady(true);
    }
  }, []);

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

  // const canUserVerifyPerson = (p) => {
  //   const personWorkflowState = String(p?.essentialWorkflowState || "")
  //     .trim()
  //     .toUpperCase();

  //   const isEssentialOilDockPerson =
  //     personWorkflowState.endsWith("_PERSON_ESSENTIAL") ||
  //     (p?.essentialDepartmentId !== null &&
  //       p?.essentialDepartmentId !== undefined);

  //   /*
  //    * ============================================================
  //    * NEW PERSON ESSENTIAL OIL DOCK FLOW
  //    * Civil/Mechanical -> Traffic
  //    *
  //    * Do NOT apply the old Sr. DTM rule to this new person flow.
  //    * ============================================================
  //    */
  //   if (isEssentialOilDockPerson) {
  //     return (
  //       personWorkflowState ===
  //       String(essentialWorkflowStage || "")
  //         .trim()
  //         .toUpperCase()
  //     );
  //   }

  //   /*
  //    * ============================================================
  //    * EXISTING FLOW — DO NOT CHANGE
  //    * ============================================================
  //    */
  //   if (userRole === "Senior Deputy Traffic Manager") {
  //     return isOilDockArea(p.accessAreaId || p.accessArea);
  //   }

  //   if (userRole === "Approval") {
  //     const needsDtm = isOilDockArea(p.accessAreaId || p.accessArea);
  //     return !needsDtm || p.srDtmApproved;
  //   }

  //   return false;
  // };

  const canUserVerifyPerson = (p) => {
    // ============================================================
    // ESSENTIAL OIL DOCK PERSON WORKFLOW
    // Civil / Mechanical -> Traffic
    // Traffic stage = PENDING_TRAFFIC_PERSON_ESSENTIAL
    // ============================================================
    if (!p) return false;

    const role = String(userRole || "").trim();
    const departmentId = Number(userDepartmentId);

    const workflowState = String(p?.workflowState || "")
      .trim()
      .toUpperCase();

    if (workflowState === "COMPLETED" || workflowState === "REJECTED") {
      return false;
    }

    /*
     * ==========================================================
     * VENDOR PERSON OIL-JETTY
     * ==========================================================
     */

    if (workflowState === "PENDING_VENDOR_PERSON_CONCERN_DEPARTMENT") {
      return (
        role === "Approval" &&
        [3, 4].includes(departmentId) &&
        Number(p.concernDepartmentId) === departmentId
      );
    }

    if (workflowState === "PENDING_VENDOR_PERSON_TRAFFIC") {
      return role === "Approval" && departmentId === 9;
    }

    const essentialPersonStage = String(p?.essentialWorkflowState || "")
      .trim()
      .toUpperCase();

    // CONVERSION WORKFLOW — must be checked BEFORE base status
    // because conversion passes have base status "approved"
    const convPersonStage = String(p?.conversionWorkflowState || "").trim().toUpperCase();
    if (convPersonStage) {
      // Already completed conversions
      if (convPersonStage === "APPROVED" || convPersonStage === "COMPLETED" || convPersonStage === "REJECTED_CONVERSION" || convPersonStage === "REJECTED_PERSON_CONVERSION") {
        return false;
      }
      if (convPersonStage === "PENDING_CIVIL_PERSON_CONVERSION" && essentialWorkflowStage === "PENDING_CIVIL_ESSENTIAL") return true;
      if (convPersonStage === "PENDING_MECHANICAL_PERSON_CONVERSION" && essentialWorkflowStage === "PENDING_MECHANICAL_ESSENTIAL") return true;
      if (
        (convPersonStage === "PENDING_TRAFFIC_PERSON_CONVERSION" || convPersonStage === "PENDING_PASS_SECTION_PERSON_CONVERSION") &&
        (essentialWorkflowStage === "PENDING_PASS_SECTION_ESSENTIAL" || userRole === "Approval")
      ) {
        return true;
      }
      return false;
    }

    // Base status check — only after conversion is ruled out
    if (
      pStatus === "approved" ||
      essentialPersonStage === "COMPLETED_PERSON_ESSENTIAL" ||
      essentialPersonStage === "COMPLETED_ESSENTIAL" ||
      essentialPersonStage === "COMPLETED" ||
      essentialPersonStage === "APPROVED"
    ) {
      return false;
    }

    if (
      essentialPersonStage === "PENDING_CIVIL_PERSON_ESSENTIAL" &&
      essentialWorkflowStage === "PENDING_CIVIL_ESSENTIAL"
    ) {
      return true;
    }

    if (
      essentialPersonStage === "PENDING_MECHANICAL_PERSON_ESSENTIAL" &&
      essentialWorkflowStage === "PENDING_MECHANICAL_ESSENTIAL"
    ) {
      return true;
    }

    if (
      (essentialPersonStage === "PENDING_TRAFFIC_PERSON_ESSENTIAL" || essentialPersonStage === "PENDING_PASS_SECTION_ESSENTIAL") &&
      (essentialWorkflowStage === "PENDING_PASS_SECTION_ESSENTIAL" || userRole === "Approval")
    ) {
      return true;
    }

    if (essentialPersonStage === "PENDING_CIVIL_PERSON_ESSENTIAL" || essentialPersonStage === "PENDING_MECHANICAL_PERSON_ESSENTIAL") {
      return false;
    }

    // ============================================================
    // EXISTING PERSON FLOW — DO NOT CHANGE
    // ============================================================
    if (userRole === "Senior Deputy Traffic Manager") {
      return isOilDockArea(p.accessAreaId || p.accessArea);
    }

    if (userRole === "Approval") {
      return pStatus === "pending" || pStatus === "reverted";
    }

    return false;
  };

  const canUserVerifyVehicle = (v) => {
    const vendorVehicleWorkflowState = String(v?.workflowState || "")
      .trim()
      .toUpperCase();
    if (
      vendorVehicleWorkflowState === "COMPLETED" ||
      vendorVehicleWorkflowState === "REJECTED"
    ) {
      return false;
    }

    if (vendorVehicleWorkflowState === "PENDING_VENDOR_MARINE") {
      return (
        ["Fire Safety Officer", "Dy. Conservator"].includes(
          String(userRole || "").trim(),
        ) && Number(userDepartmentId) === 7
      );
    }

    if (vendorVehicleWorkflowState === "PENDING_VENDOR_CONCERN_DEPARTMENT") {
      return (
        String(userRole || "").trim() === "Approval" &&
        [3, 4].includes(Number(userDepartmentId)) &&
        Number(v.concernDepartmentId) === Number(userDepartmentId)
      );
    }

    if (vendorVehicleWorkflowState === "PENDING_VENDOR_CISF") {
      return (
        ["CISF", "CISF Asst Commandant", "CISF Assistant Commandant"].includes(
          String(userRole || "").trim(),
        ) && Number(userDepartmentId) === 1
      );
    }

    if (vendorVehicleWorkflowState === "PENDING_VENDOR_TRAFFIC") {
      return (
        String(userRole || "").trim() === "Approval" &&
        Number(userDepartmentId) === 9
      );
    }
    const isEssentialOilDockVehicle =
      Boolean(v?.essentialWorkflowState) ||
      Boolean(v?.conversionWorkflowState) ||
      (v?.essentialDepartmentId !== null && v?.essentialDepartmentId !== undefined);

    if (v.conversionWorkflowState) {
      const convState = String(v.conversionWorkflowState || "").toUpperCase();
      // Already completed conversions
      if (convState === "APPROVED" || convState === "COMPLETED" || convState === "REJECTED_CONVERSION") {
        return false;
      }
      if (essentialWorkflowStage && isEssentialOilDockVehicle) {
        const conversionStageMap = {
          "PENDING_MARINE_ESSENTIAL": "PENDING_MARINE_CONVERSION",
          "PENDING_CIVIL_ESSENTIAL": "PENDING_CIVIL_CONVERSION",
          "PENDING_MECHANICAL_ESSENTIAL": "PENDING_MECHANICAL_CONVERSION",
          "PENDING_CISF_ESSENTIAL": "PENDING_CISF_CONVERSION",
          "PENDING_PASS_SECTION_ESSENTIAL": "PENDING_PASS_SECTION_CONVERSION",
        };
        const conversionStage = conversionStageMap[essentialWorkflowStage];
        return conversionStage && v.conversionWorkflowState === conversionStage;
      }
      return false;
    }

    // Base status check — only after conversion is ruled out
    if (
      vStatus === "approved" ||
      vState === "COMPLETED_ESSENTIAL" ||
      vState === "COMPLETED" ||
      vState === "APPROVED"
    ) {
      return false;
    }

    if (vState) {
      if (essentialWorkflowStage && isEssentialOilDockVehicle) {
        return v.essentialWorkflowState === essentialWorkflowStage;
      }

      if (userRole === "Approval") {
        return vState === "PENDING_PASS_SECTION_ESSENTIAL";
      }

      return false;
    }

    if (userRole === "Safety Officer") {
      const passType = String(v.passType || "")
        .trim()
        .toUpperCase();

      const vehicleType = String(v.vehicleTypeName || "")
        .trim()
        .toUpperCase();

      const vehicleStatus = String(v.status || "")
        .trim()
        .toLowerCase();

      return (
        Number(userDepartmentId) === 9 &&
        vendorVehicleWorkflowState === "PENDING_SAFETY" &&
        v.isOilDock !== true &&
        ["YEARLY", "ANNUAL"].includes(passType) &&
        ["TRAILORS", "TRAILER LORRY"].includes(vehicleType) &&
        ["approved", "pending", "reverted"].includes(vehicleStatus)
      );
    }

    if (userRole === "Fire Safety Officer" && isMarineFireSafety) {
      const passType = String(v.passType || "")
        .trim()
        .toUpperCase();

      const vehicleType = String(v.vehicleTypeName || "")
        .trim()
        .toUpperCase();

      const isAnnualTrailer =
        ["YEARLY", "ANNUAL"].includes(passType) &&
        ["TRAILORS", "TRAILER LORRY"].includes(vehicleType);

      const vehicleStatus = String(v.status || "")
        .trim()
        .toLowerCase();

      return (
        isAnnualTrailer &&
        (vehicleStatus === "approved" || vehicleStatus === "pending") &&
        v.marineSafetyApproved !== true
      );
    }

    if (userRole === "Senior Deputy Traffic Manager") {
      return isOilDockArea(v.accessAreaId || v.accessArea);
    }

    if (userRole === "Approval") {
      const passType = String(v.passType || "")
        .trim()
        .toUpperCase();
      const vehicleType = String(v.vehicleTypeName || "")
        .trim()
        .toUpperCase();

      const isMonthlyYearly = ["MONTHLY", "YEARLY", "ANNUAL"].includes(
        passType,
      );

      const isAnnualTrailer =
        ["YEARLY", "ANNUAL"].includes(passType) &&
        ["TRAILORS", "TRAILER LORRY"].includes(vehicleType);

      const isOilDock = isOilDockArea(v.accessAreaId || v.accessArea);

      if (isAnnualTrailer) {
        return (
          Number(userDepartmentId) === 9 &&
          (v.status === "pending" || v.status === "reverted")
        );
      }

      if (isOilDock && !v.sparkArresterCertified) {
        return false;
      }

      return true;
    }

    return false;
  };

  // Active Locks State for Concurrency Control
  const [activeLocks, setActiveLocks] = useState({});

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
  }, [fetchActiveLocks]);

  useEffect(() => {
    if (!isModalOpen || !selectedRequest || isViewMode) return;

    const lockType =
      selectedRequest.originType === "VENDOR" ? "vendor-pass" : "pass";

    return () => {
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
  // const [vendorWorkflowRemark, setVendorWorkflowRemark] = useState("");

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
      if (!userContextReady) {
        return;
      }

      try {
        if (!isPoll) setLoading(true);
        const token = localStorage.getItem("accessToken");
        // Pass Updates has its own API handled by fetchTwoWheelerRequests().
        // Do not call the normal/M​​arine pass API for this tab.
        if (activeTab === "pass_updates") {
          setLoading(false);
          return;
        }
        const requestParams = {
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

          processedByMe:
            !isMarineFireSafety && processedByMe ? "true" : undefined,
        };

        // ------------------------------------------------------------
        // NEW VENDOR OIL-JETTY WORKFLOW
        //
        // This is separate from the existing Essential Oil Dock flow.
        //
        // Marine:
        //   Fire Safety Officer OR Dy. Conservator
        //
        // Concern:
        //   Civil / Mechanical Approval
        //
        // CISF:
        //   Assistant Commandant
        //
        // Traffic:
        //   Approval
        //
        // Backend decides which Vendor Oil-Jetty records the
        // authenticated user is allowed to see.
        // ------------------------------------------------------------
        const isCisfVendorApprover =
          Number(userDepartmentId) === 1 &&
          [
            "CISF",
            "CISF Asst Commandant",
            "CISF Assistant Commandant",
            "Cisf.Assistant Commandant",
          ].includes(String(userRole || "").trim());

        const isVendorOilJettyPortalUser =
          (Number(userDepartmentId) === 7 &&
            ["Fire Safety Officer", "Dy. Conservator"].includes(
              String(userRole || "").trim(),
            )) ||
          (String(userRole || "").trim() === "Approval" &&
            [3, 4, 9].includes(Number(userDepartmentId))) ||
          isCisfVendorApprover ||
          (Number(userDepartmentId) === 9 &&
            ["Safety Officer", "Fire Safety Officer"].includes(
              String(userRole || "").trim(),
            ));

        const isTrafficApprovalUser =
          String(userRole || "").trim() === "Approval" &&
          Number(userDepartmentId) === 9;

        if (isVendorOilJettyPortalUser && !isTrafficApprovalUser) {
          const vendorRequestParams = {
            ...requestParams,
            vendorOnly: "true",
          };

          const vendorResponse = await axios.get(
            `${AGENT_API}/pass-request/get-agent-pass-requests`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
              params: vendorRequestParams,
            },
          );

          if (vendorResponse.data?.success) {
            const vendorData = vendorResponse.data.data || [];
            const vendorMeta = vendorResponse.data.pagination || {};
            const vendorCounts = vendorResponse.data.counts || {
              total: 0,
              pending: 0,
              processed: 0,
            };

            setRequests((prev) =>
              JSON.stringify(vendorData) === JSON.stringify(prev)
                ? prev
                : vendorData,
            );

            setPaginationMeta((prev) =>
              JSON.stringify(vendorMeta) === JSON.stringify(prev)
                ? prev
                : vendorMeta,
            );

            setGlobalCounts((prev) =>
              JSON.stringify(vendorCounts) === JSON.stringify(prev)
                ? prev
                : vendorCounts,
            );
          } else {
            setRequests([]);
            setGlobalCounts({
              total: 0,
              pending: 0,
              processed: 0,
            });
          }

          setLoading(false);
          return;
        }

        // ------------------------------------------------------------
        // FIRE SAFETY:
        // Fetch BOTH workflows.
        //
        // 1. Normal vehicle Marine/Safety workflow
        // 2. Essential Oil Dock workflow
        //
        // They must both appear in the same pending/processed screen.
        // ------------------------------------------------------------
        if (isMarineFireSafety) {
          const [marineResponse, essentialResponse] = await Promise.all([
            axios.get(`${AGENT_API}/pass-request/marine-safety-passes`, {
              headers: {
                Authorization: `Bearer ${token}`,
              },
              params: requestParams,
            }),

            axios.get(`${AGENT_API}/pass-request/essential-oil-dock-passes`, {
              headers: {
                Authorization: `Bearer ${token}`,
              },
              params: requestParams,
            }),
          ]);

          const marineData = marineResponse.data?.success
            ? marineResponse.data.data || []
            : [];

          const essentialData = essentialResponse.data?.success
            ? essentialResponse.data.data || []
            : [];

          const normalizeRequest = (request) => ({
            ...request,

            entityName: request.entityName || request.companyName || null,

            mobileNo: request.mobileNo || request.companyMobile || null,

            email: request.email || request.companyEmail || null,

            gstinNumber: request.gstinNumber || request.companyGst || null,

            panNumber: request.panNumber || request.companyPan || null,
          });

          const mergedRequests = [
            ...marineData.map(normalizeRequest),
            ...essentialData.map(normalizeRequest),
          ];

          // Safety against duplicate pass requests.
          const uniqueRequests = Array.from(
            new Map(
              mergedRequests.map((request) => [
                request.id || request.referenceNo,
                request,
              ]),
            ).values(),
          );

          const marineCounts = marineResponse.data?.counts || {
            total: 0,
            pending: 0,
            processed: 0,
          };

          const essentialCounts = essentialResponse.data?.counts || {
            total: 0,
            pending: 0,
            processed: 0,
          };

          const mergedCounts = {
            total: marineCounts.total + essentialCounts.total,
            pending: marineCounts.pending + essentialCounts.pending,
            processed: marineCounts.processed + essentialCounts.processed,
          };

          const totalRecords = mergedCounts[activeTab] ?? uniqueRequests.length;

          const mergedMeta = {
            page: currentPage,
            limit: pageSize,
            totalRecords,
            totalPages: Math.max(1, Math.ceil(totalRecords / pageSize)),
            currentPage,
          };

          setRequests((prev) =>
            JSON.stringify(uniqueRequests) === JSON.stringify(prev)
              ? prev
              : uniqueRequests,
          );

          setPaginationMeta((prev) =>
            JSON.stringify(mergedMeta) === JSON.stringify(prev)
              ? prev
              : mergedMeta,
          );

          setGlobalCounts((prev) =>
            JSON.stringify(mergedCounts) === JSON.stringify(prev)
              ? prev
              : mergedCounts,
          );

          return;
        }

        // ------------------------------------------------------------
        // ESSENTIAL-ONLY USERS
        // Civil / Mechanical / CISF / Essential Pass Section
        // ------------------------------------------------------------
        // if (essentialWorkflowStage) {
        //   const response = await axios.get(
        //     `${AGENT_API}/pass-request/essential-oil-dock-passes`,
        //     {
        //       headers: {
        //         Authorization: `Bearer ${token}`,
        //       },
        //       params: requestParams,
        //     },
        //   );

        //   if (response.data?.success) {
        //     const newRequests = (response.data.data || []).map((request) => ({
        //       ...request,

        //       entityName: request.entityName || request.companyName || null,

        //       mobileNo: request.mobileNo || request.companyMobile || null,

        //       email: request.email || request.companyEmail || null,

        //       gstinNumber: request.gstinNumber || request.companyGst || null,

        //       panNumber: request.panNumber || request.companyPan || null,
        //     }));

        //     const newMeta = response.data.pagination || {};

        //     const newCounts = response.data.counts || {
        //       total: 0,
        //       pending: 0,
        //       processed: 0,
        //     };

        //     setRequests((prev) =>
        //       JSON.stringify(newRequests) === JSON.stringify(prev)
        //         ? prev
        //         : newRequests,
        //     );

        //     setPaginationMeta((prev) =>
        //       JSON.stringify(newMeta) === JSON.stringify(prev) ? prev : newMeta,
        //     );

        //     setGlobalCounts((prev) =>
        //       JSON.stringify(newCounts) === JSON.stringify(prev)
        //         ? prev
        //         : newCounts,
        //     );
        //   }

        //   return;
        // }
        // ------------------------------------------------------------
        // PASS SECTION
        // ------------------------------------------------------------
        // Pass Section must see BOTH:
        // 1. Existing normal processed passes
        // 2. Essential Oil Dock Pass Section workflow passes
        //
        // Civil / Mechanical / CISF remain Essential-only.
        // ------------------------------------------------------------

        if (essentialWorkflowStage === "PENDING_PASS_SECTION_ESSENTIAL") {
          const [
            normalResult,
            essentialResult,
            essentialPersonResult,
            vendorResult,
          ] = await Promise.allSettled([
            // EXISTING NORMAL FLOW
            axios.get(`${AGENT_API}/pass-request/get-agent-pass-requests`, {
              headers: {
                Authorization: `Bearer ${token}`,
              },
              params: requestParams,
            }),

            // EXISTING ESSENTIAL VEHICLE FLOW
            axios.get(`${AGENT_API}/pass-request/essential-oil-dock-passes`, {
              headers: {
                Authorization: `Bearer ${token}`,
              },
              params: requestParams,
            }),

            // NEW ESSENTIAL PERSON FLOW
            axios.get(
              `${AGENT_API}/pass-request/essential-oil-dock-person-passes`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
                params: requestParams,
              },
            ),

            // NEW VENDOR FLOW
            // Pass Section must also receive normal Vendor Pass records
            axios.get(`${AGENT_API}/pass-request/get-agent-pass-requests`, {
              headers: {
                Authorization: `Bearer ${token}`,
              },
              params: {
                ...requestParams,
                vendorOnly: "true",
              },
            }),
          ]);

          const normalResponse =
            normalResult.status === "fulfilled" ? normalResult.value : null;

          const essentialResponse =
            essentialResult.status === "fulfilled"
              ? essentialResult.value
              : null;

          const essentialPersonResponse =
            essentialPersonResult.status === "fulfilled"
              ? essentialPersonResult.value
              : null;

          const vendorResponse =
            vendorResult.status === "fulfilled" ? vendorResult.value : null;

          if (vendorResult.status === "rejected") {
            console.error(
              "Pass Section Vendor API failed:",
              vendorResult.reason,
            );
          }

          const vendorData = vendorResponse?.data?.success
            ? (vendorResponse.data.data || []).map((request) => ({
                ...request,
                originType: "VENDOR",
                entityName: request.entityName || request.companyName || null,
                mobileNo: request.mobileNo || request.companyMobile || null,
                email: request.email || request.companyEmail || null,
                gstinNumber: request.gstinNumber || request.companyGst || null,
                panNumber: request.panNumber || request.companyPan || null,
                persons: Array.isArray(request.persons) ? request.persons : [],
                vehicles: Array.isArray(request.vehicles)
                  ? request.vehicles
                  : [],
              }))
            : [];

          // Do not stop the whole Pass Section screen
          // because one independent API failed.
          if (normalResult.status === "rejected") {
            console.error(
              "Pass Section normal API failed:",
              normalResult.reason,
            );
          }

          if (essentialResult.status === "rejected") {
            console.error(
              "Pass Section essential vehicle API failed:",
              essentialResult.reason,
            );
          }

          if (essentialPersonResult.status === "rejected") {
            console.error(
              "Pass Section essential person API failed:",
              essentialPersonResult.reason,
            );
          }

          const normalData = normalResponse?.data?.success
            ? normalResponse.data.data || []
            : [];

          const essentialData = essentialResponse?.data?.success
            ? essentialResponse.data.data || []
            : [];

          const essentialPersonRows = essentialPersonResponse?.data?.success
            ? essentialPersonResponse.data.data || []
            : [];

          const essentialPersonRequests = essentialPersonRows.map((person) => ({
            id: person.passRequestId,
            referenceNo: person.referenceNo,

            entityName: person.companyName || null,
            mobileNo: person.companyMobile || null,
            email: person.companyEmail || null,
            gstinNumber: person.companyGst || null,
            panNumber: person.companyPan || null,

            createdAt: person.createdAt || null,
            amount: person.amount ?? null,
            status: person.status,

            persons: [
              {
                id: person.personId || person.id,
                passRequestId: person.passRequestId,
                personPassNo: person.personPassNo,
                name: person.name,
                aadharNo: person.aadharNo,
                mobile: person.mobile,
                email: person.email,
                nationality: person.nationality,
                visaNo: person.visaNo,
                dob: person.dob,
                hepTypeId: person.hepTypeId,
                hepType: person.hepType,
                designationId: person.designationId,
                designationOther: person.designationOther,
                designationName: person.designationName,
                cardNumber: person.cardNumber,
                accessAreaId: person.accessAreaId,
                withTwoWheeler: person.withTwoWheeler,
                vehicleNo: person.vehicleNo,
                idProofType: person.idProofType,
                idProofNumber: person.idProofNumber,
                passType: person.passType,
                passPeriod: person.passPeriod,
                dateFrom: person.dateFrom,
                dateTo: person.dateTo,
                amount: person.amount,
                status: person.status,
                cdcNumber: person.cdcNumber,
                countryId: person.countryId,
                countryName: person.countryName,
                essentialDepartmentId: person.essentialDepartmentId,
                essentialDepartmentName: person.essentialDepartmentName,
                essentialWorkflowState: person.essentialWorkflowState,
                essentialRevertStage: person.essentialRevertStage,
                essentialAssignedUserId: person.essentialAssignedUserId,
                conversionId: person.conversionId,
                conversionWorkflowState: person.conversionWorkflowState,
                conversionStartDate: person.conversionStartDate,
                conversionEndDate: person.conversionEndDate,
                conversionStatus: person.conversionStatus,
                conversionPurpose: person.conversionPurpose,
                conversionRequisitionFilePath: person.conversionRequisitionFilePath,
                rejectedReason: person.rejectedReason,
                revertReason: person.revertReason,
                // Document paths
                photoFilePath: person.photoFilePath,
                photoFileName: person.photoFileName,
                aadharPDFFilePATH: person.aadharPDFFilePATH,
                aadharPDFFileName: person.aadharPDFFileName,
                idProofFilePath: person.idProofFilePath,
                idProofFileName: person.idProofFileName,
                driverLicensePath: person.driverLicensePath,
                driverLicenseName: person.driverLicenseName,
                policeVerificationPath: person.policeVerificationPath,
                policeVerificationName: person.policeVerificationName,
                employmentProofPath: person.employmentProofPath,
                employmentProofName: person.employmentProofName,
                chaLicensePath: person.chaLicensePath,
                chaLicenseName: person.chaLicenseName,
                passportPath: person.passportPath,
                passportName: person.passportName,
                visaDocPath: person.visaDocPath,
                visaDocName: person.visaDocName,
                immigrationDocPath: person.immigrationDocPath,
                immigrationDocName: person.immigrationDocName,
                cdcDocumentPath: person.cdcDocumentPath,
                cdcDocumentName: person.cdcDocumentName,
                entryAuthorizationFilePath: person.entryAuthorizationFilePath,
                entryAuthorizationFileName: person.entryAuthorizationFileName,
              },
            ],

            vehicles: [],
          }));

          const normalizeRequest = (request) => ({
            ...request,

            entityName: request.entityName || request.companyName || null,

            mobileNo: request.mobileNo || request.companyMobile || null,

            email: request.email || request.companyEmail || null,

            gstinNumber: request.gstinNumber || request.companyGst || null,

            panNumber: request.panNumber || request.companyPan || null,
          });

          const mergedRequests = [
            ...normalData.map((request) => ({
              ...normalizeRequest(request),
              originType: request.originType || "NORMAL",
            })),

            ...essentialData.map((request) => ({
              ...normalizeRequest(request),
              originType: request.originType || "NORMAL",
            })),

            ...essentialPersonRequests.map((request) => ({
              ...normalizeRequest(request),
              originType: "NORMAL",
            })),

            ...vendorData,
          ];

          const requestMap = new Map();

          for (const request of mergedRequests) {
            const origin = String(request.originType || "NORMAL")
              .trim()
              .toUpperCase();

            const key = `${origin}:${String(
              request.id || request.referenceNo || "",
            )}`;

            if (!key.endsWith(":")) {
              const existing = requestMap.get(key);

              if (!existing) {
                requestMap.set(key, {
                  ...request,
                  persons: Array.isArray(request.persons)
                    ? [...request.persons]
                    : [],
                  vehicles: Array.isArray(request.vehicles)
                    ? [...request.vehicles]
                    : [],
                });
              } else {
                existing.persons = [
                  ...(existing.persons || []),
                  ...(request.persons || []).filter(
                    (p) =>
                      !(existing.persons || []).some(
                        (ep) => String(ep.id) === String(p.id),
                      ),
                  ),
                ];

                existing.vehicles = [
                  ...(existing.vehicles || []),
                  ...(request.vehicles || []).filter(
                    (v) =>
                      !(existing.vehicles || []).some(
                        (ev) => String(ev.id) === String(v.id),
                      ),
                  ),
                ];
              }
            }
          }

          const uniqueRequests = Array.from(requestMap.values());

          // const requestMap = new Map();

          // for (const request of mergedRequests) {
          //   const key = request.id || request.referenceNo;

          //   if (!key) continue;

          //   const existing = requestMap.get(key);

          //   if (!existing) {
          //     requestMap.set(key, {
          //       ...request,

          //       persons: Array.isArray(request.persons)
          //         ? [...request.persons]
          //         : [],

          //       vehicles: Array.isArray(request.vehicles)
          //         ? [...request.vehicles]
          //         : [],
          //     });

          //     continue;
          //   }

          //   // Preserve company/request-level information
          //   existing.entityName =
          //     existing.entityName || request.entityName || null;

          //   existing.mobileNo = existing.mobileNo || request.mobileNo || null;

          //   existing.email = existing.email || request.email || null;

          //   existing.gstinNumber =
          //     existing.gstinNumber || request.gstinNumber || null;

          //   existing.panNumber =
          //     existing.panNumber || request.panNumber || null;

          //   existing.createdAt =
          //     existing.createdAt ||
          //     request.createdAt ||
          //     request.submittedAt ||
          //     null;

          //   existing.amount = existing.amount ?? request.amount ?? null;

          //   const existingPersonIds = new Set(
          //     (existing.persons || []).map((p) => String(p.id)),
          //   );

          //   for (const person of request.persons || []) {
          //     if (!existingPersonIds.has(String(person.id))) {
          //       existing.persons.push(person);
          //     }
          //   }

          //   const existingVehicleIds = new Set(
          //     (existing.vehicles || []).map((v) => String(v.id)),
          //   );

          //   for (const vehicle of request.vehicles || []) {
          //     if (!existingVehicleIds.has(String(vehicle.id))) {
          //       existing.vehicles.push(vehicle);
          //     }
          //   }
          // }

          // const uniqueRequests = Array.from(requestMap.values());

          uniqueRequests.sort((a, b) => {
            const da = new Date(a.createdAt || a.submittedAt || 0).getTime();

            const db = new Date(b.createdAt || b.submittedAt || 0).getTime();

            return sortBy === "DATE_ASC" ? da - db : db - da;
          });

          const normalCounts = normalResponse?.data?.counts || {
            total: 0,
            pending: 0,
            processed: 0,
          };

          const essentialCounts = essentialResponse?.data?.counts || {
            total: 0,
            pending: 0,
            processed: 0,
          };

          const essentialPersonCounts = essentialPersonResponse?.data
            ?.counts || {
            total: 0,
            pending: 0,
            processed: 0,
          };

          const vendorCounts = vendorResponse?.data?.counts || {
            total: 0,
            pending: 0,
            processed: 0,
          };

          const mergedCounts = {
            total:
              Number(normalCounts.total || 0) +
              Number(essentialCounts.total || 0) +
              Number(essentialPersonCounts.total || 0) +
              Number(vendorCounts.total || 0),

            pending:
              Number(normalCounts.pending || 0) +
              Number(essentialCounts.pending || 0) +
              Number(essentialPersonCounts.pending || 0) +
              Number(vendorCounts.pending || 0),

            processed:
              Number(normalCounts.processed || 0) +
              Number(essentialCounts.processed || 0) +
              Number(essentialPersonCounts.processed || 0) +
              Number(vendorCounts.processed || 0),
          };

          const totalRecords = mergedCounts[activeTab] ?? uniqueRequests.length;

          const mergedMeta = {
            page: currentPage,
            limit: pageSize,
            totalRecords,
            totalPages: Math.max(1, Math.ceil(totalRecords / pageSize)),
            currentPage,
          };

          setRequests((prev) =>
            JSON.stringify(uniqueRequests) === JSON.stringify(prev)
              ? prev
              : uniqueRequests,
          );

          setPaginationMeta((prev) =>
            JSON.stringify(mergedMeta) === JSON.stringify(prev)
              ? prev
              : mergedMeta,
          );

          setGlobalCounts((prev) =>
            JSON.stringify(mergedCounts) === JSON.stringify(prev)
              ? prev
              : mergedCounts,
          );

          return;
        }

        // ------------------------------------------------------------
        // OTHER ESSENTIAL-ONLY USERS
        // Civil / Mechanical / CISF
        // ------------------------------------------------------------
        if (essentialWorkflowStage) {
          const response = await axios.get(
            `${AGENT_API}/pass-request/essential-oil-dock-passes`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
              params: requestParams,
            },
          );

          if (response.data?.success) {
            const newRequests = (response.data.data || []).map((request) => ({
              ...request,

              entityName: request.entityName || request.companyName || null,

              mobileNo: request.mobileNo || request.companyMobile || null,

              email: request.email || request.companyEmail || null,

              gstinNumber: request.gstinNumber || request.companyGst || null,

              panNumber: request.panNumber || request.companyPan || null,
            }));

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
          }

          return;
        }

        // ------------------------------------------------------------
        // EXISTING NORMAL USERS
        // DO NOT CHANGE NORMAL FLOW
        // ------------------------------------------------------------
        const response = await axios.get(
          `${AGENT_API}/pass-request/get-agent-pass-requests`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            params: requestParams,
          },
        );

        if (response.data && response.data.success) {
          const newRequests = (response.data.data || []).map((request) => ({
            ...request,

            entityName: request.entityName || request.companyName || null,

            mobileNo: request.mobileNo || request.companyMobile || null,

            email: request.email || request.companyEmail || null,

            gstinNumber: request.gstinNumber || request.companyGst || null,

            panNumber: request.panNumber || request.companyPan || null,
          }));

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
        }

        if (response.data && response.data.success) {
          const newRequests = (response.data.data || []).map((request) => ({
            ...request,

            // Essential Oil Dock API returns company* fields.
            // Keep the existing frontend field names so the
            // existing table/modal continue to work.
            entityName: request.entityName || request.companyName || null,

            mobileNo: request.mobileNo || request.companyMobile || null,

            email: request.email || request.companyEmail || null,

            gstinNumber: request.gstinNumber || request.companyGst || null,

            panNumber: request.panNumber || request.companyPan || null,
          }));
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
    [
      currentPage,
      pageSize,
      debouncedSearch,
      activeTab,
      sortBy,
      processedByMe,
      isMarineFireSafety,
      isEssentialOilDockApprover,
      essentialWorkflowStage,
      userContextReady,
    ],
  );

  useEffect(() => {
    fetchPassRequests(false);

    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      fetchPassRequests(true);
    }, 15000); // Poll every 15s without showing loading spinner

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchPassRequests(true);
      }
    };

    if (typeof window !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibilityChange);
    }

    return () => {
      clearInterval(interval);
      if (typeof window !== "undefined") {
        document.removeEventListener(
          "visibilitychange",
          handleVisibilityChange,
        );
      }
    };
  }, [fetchPassRequests]);

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
    if (isSubmitting) return;

    setIsSubmitting(true);
    const persons = selectedRequest.persons || [];
    const vehicles = selectedRequest.vehicles || [];
    const isVendorPass = selectedRequest?.originType === "VENDOR";
    const vendorPassId = selectedRequest?.id;

    // const isNewVendorOilJettyWorkflow =
    //   isVendorPass && isVendorOilJettyWorkflow;

    let reviewStatus = null;
    let responseMessage = null;

    const requestWorkflowState = String(selectedRequest?.workflowState || "")
      .trim()
      .toUpperCase();

    const currentEssentialWorkflowStage = String(essentialWorkflowStage || "")
      .trim()
      .toUpperCase();

    const hasEssentialVehicle = vehicles.some((v) => {
      const vehicleWorkflowState = String(v?.essentialWorkflowState || "")
        .trim()
        .toUpperCase();

      const accessArea = String(v?.accessAreaId || v?.accessArea || "")
        .trim()
        .toUpperCase();

      return (
        vehicleWorkflowState.endsWith("_ESSENTIAL") ||
        Boolean(v?.conversionWorkflowState) ||
        (v?.essentialDepartmentId !== null &&
          v?.essentialDepartmentId !== undefined)
      );
    });

    const isEssentialWorkflowRequest =
      requestWorkflowState.endsWith("_ESSENTIAL") || hasEssentialVehicle;

    // 1. VALIDATION: Only pending/reverted entities that the current user is authorized to verify need a decision
    // 1. VALIDATION
    // Only entities assigned to the current user require a decision.

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
          isVendorPass && isVendorOilJettyWorkflow
            ? "You must approve, reject, or revert all entities assigned to your current Vendor workflow stage."
            : "You must approve, reject, or revert all pending/reverted entities assigned to your role.",
      });

      return;
    }

    const loadingToastId = toast.loading("Submitting review to backend...");

    try {
      const token = localStorage.getItem("accessToken");
      const headers = { Authorization: `Bearer ${token}` };

      // Check if this is a vendor pass

      // const shouldUseEssentialWorkflow =
      //   !isVendorOilJettyWorkflow &&
      //   (hasEssentialVehicle ||
      //     requestWorkflowState.endsWith("_ESSENTIAL") ||
      //     currentEssentialWorkflowStage.endsWith("_ESSENTIAL"));
      const shouldUseEssentialWorkflow =
        !isVendorOilJettyWorkflow && isEssentialWorkflowRequest;

      if (shouldUseEssentialWorkflow) {
        const essentialPersons = persons.filter((p) => {
          const workflowState = String(p?.essentialWorkflowState || "")
            .trim()
            .toUpperCase();

          return (
            workflowState === "PENDING_CIVIL_PERSON_ESSENTIAL" ||
            workflowState === "PENDING_MECHANICAL_PERSON_ESSENTIAL" ||
            workflowState === "PENDING_TRAFFIC_PERSON_ESSENTIAL"
          );
        });

        /*
         * ============================================================
         * ESSENTIAL OIL DOCK PERSON FLOW
         * Only handle person-only Essential requests here.
         * Existing Essential Vehicle flow remains unchanged below.
         * ============================================================
         */
        if (essentialPersons.length > 0 && vehicles.length === 0) {
          const personPromises = [];

          essentialPersons.forEach((p) => {
            const status = entityStatuses.persons[p.id];

            if (!status) {
              throw new Error(
                `No decision recorded for person ${p.name || p.id}.`,
              );
            }

            personPromises.push(
              axios.put(
                `${AGENT_API}/pass-request/essential-oil-dock/person-action`,
                {
                  personId: p.id,
                  decision: String(status).trim().toUpperCase(),
                  remarks: entityRemarks.persons[p.id] || null,
                },
                { headers },
              ),
            );
          });

          if (personPromises.length === 0) {
            throw new Error(
              "No Essential Oil Dock person action was prepared.",
            );
          }

          await Promise.all(personPromises);

          reviewStatus = "PROCESSED";
          responseMessage =
            "Essential Oil Dock person review processed successfully.";
        } else {
          /*
           * ============================================================
           * EXISTING ESSENTIAL OIL DOCK VEHICLE FLOW
           * DO NOT CHANGE THE VEHICLE LOGIC
           * ============================================================
           */
          const vehiclePromises = [];

          const essentialVehicles = vehicles.filter((v) => {
            const vehicleWorkflowState = String(v?.essentialWorkflowState || "")
              .trim()
              .toUpperCase();

            const accessArea = String(v?.accessAreaId || v?.accessArea || "")
              .trim()
              .toUpperCase();

            const hasEssentialDepartment =
              v?.essentialDepartmentId !== null &&
              v?.essentialDepartmentId !== undefined;

            return (
              vehicleWorkflowState.endsWith("_ESSENTIAL") ||
              hasEssentialDepartment
            );
          });

          if (essentialVehicles.length === 0) {
            throw new Error(
              "No Essential Oil Dock vehicle found in this request.",
            );
          }

          essentialVehicles.forEach((v) => {
            const status = entityStatuses.vehicles[v.id];

            if (!status) {
              throw new Error(
                `No decision recorded for vehicle ${v.registrationNo || v.id}.`,
              );
            }

            const payload = {
              vehicleId: v.id,
              decision: String(status).trim().toUpperCase(),
              remarks: entityRemarks.vehicles[v.id] || null,
            };

            vehiclePromises.push(
              axios.put(
                `${AGENT_API}/pass-request/essential-oil-dock/vehicle-action`,
                payload,
                { headers },
              ),
            );
          });

          if (vehiclePromises.length === 0) {
            throw new Error(
              "No Essential Oil Dock vehicle action was prepared.",
            );
          }

          await Promise.all(vehiclePromises);

          reviewStatus = "PROCESSED";
          responseMessage =
            "Essential Oil Dock vehicle review processed successfully.";
        }
      } else if (isVendorPass && isVendorOilJettyWorkflow) {
        // const vendorPassId = selectedRequest.id;

        const oilJettyPersons = persons.filter((p) => {
          const area = String(p?.accessAreaId || p?.accessArea || "")
            .trim()
            .toUpperCase();

          return (
            area === "1" ||
            area.includes("OIL JETTY") ||
            area.includes("OIL_JETTY")
          );
        });

        const oilJettyVehicles = vehicles.filter((v) => {
          const area = String(v?.accessAreaId || v?.accessArea || "")
            .trim()
            .toUpperCase();

          return (
            area === "1" ||
            area.includes("OIL JETTY") ||
            area.includes("OIL_JETTY")
          );
        });

        const assignedPersonActions = oilJettyPersons
          .filter((p) => {
            const workflowState = String(p?.workflowState || "")
              .trim()
              .toUpperCase();

            const status = String(p?.status || "")
              .trim()
              .toLowerCase();

            // ONLY currently active Vendor person workflow states
            return (
              [
                "PENDING_VENDOR_PERSON_CONCERN_DEPARTMENT",
                "PENDING_VENDOR_PERSON_TRAFFIC",
              ].includes(workflowState) &&
              ["pending", "reverted"].includes(status) &&
              canUserVerifyPerson(p)
            );
          })
          .map((p) => {
            const decision = entityStatuses.persons[p.id];

            if (!decision) {
              return null;
            }

            const personEntityId = Number(p.entityId ?? p.personId);

            if (!Number.isInteger(personEntityId) || personEntityId <= 0) {
              throw new Error(
                `Invalid Vendor person database ID for ${p.name || p.id}.`,
              );
            }

            return {
              entityType: "PERSON",
              entityId: personEntityId,
              decision: String(decision).trim().toUpperCase(),
              remarks: entityRemarks.persons[p.id] || null,
            };
          })
          .filter(Boolean);

        const assignedVehicleActions = oilJettyVehicles
          .filter((v) => {
            const workflowState = String(v?.workflowState || "")
              .trim()
              .toUpperCase();

            const status = String(v?.status || "")
              .trim()
              .toLowerCase();

            // ONLY currently active Vendor vehicle workflow states
            return (
              [
                "PENDING_VENDOR_MARINE",
                "PENDING_VENDOR_CONCERN_DEPARTMENT",
                "PENDING_VENDOR_CISF",
                "PENDING_VENDOR_TRAFFIC",
              ].includes(workflowState) &&
              ["pending", "reverted"].includes(status) &&
              canUserVerifyVehicle(v)
            );
          })
          .map((v) => {
            const decision = entityStatuses.vehicles[v.id];

            if (!decision) {
              return null;
            }

            const vehicleEntityId = Number(v.entityId ?? v.vehicleId);

            if (!Number.isInteger(vehicleEntityId) || vehicleEntityId <= 0) {
              throw new Error(
                `Invalid Vendor vehicle database ID for ${
                  v.registrationNo || v.id
                }.`,
              );
            }

            return {
              entityType: "VEHICLE",
              entityId: vehicleEntityId,
              decision: String(decision).trim().toUpperCase(),
              remarks: entityRemarks.vehicles[v.id] || null,
            };
          })
          .filter(Boolean);

        const actions = [...assignedPersonActions, ...assignedVehicleActions];

        if (actions.length === 0) {
          throw new Error(
            "No Vendor Oil-Jetty entity action was prepared for your current stage.",
          );
        }

        /*
         * Execute entity actions one at a time.
         *
         * This is intentional:
         * the backend locks the parent request while processing
         * the selected entity.
         */
        for (const action of actions) {
          await axios.put(
            `${AGENT_API}/vendor-pass/${vendorPassId}/workflow-action`,
            action,
            { headers },
          );
        }

        reviewStatus = "PROCESSED";

        responseMessage =
          "Vendor Oil-Jetty entity workflow processed successfully.";
      } else if (isVendorPass) {
        // --- VENDOR PASS APPROVAL FLOW ---
        if (!vendorPassId) {
          throw new Error(
            "Vendor pass ID is missing from the selected request.",
          );
        }
        const isSafetyAnnualTrailerVendorPass =
          userRole === "Safety Officer" &&
          Number(userDepartmentId) === 9 &&
          vehicles.some((v) => {
            const passType = String(v?.passType || "")
              .trim()
              .toUpperCase();

            const vehicleType = String(v?.vehicleTypeName || "")
              .trim()
              .toUpperCase();

            return (
              ["YEARLY", "ANNUAL"].includes(passType) &&
              ["TRAILORS", "TRAILER LORRY"].includes(vehicleType)
            );
          });
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
                `${AGENT_API}/vendor-pass/${selectedRequest.id}/approve-person/${personIndex}`,
                {},
                { headers },
              ),
            );
          } else if (status === "REVERTED") {
            personPromises.push(
              axios.put(
                `${AGENT_API}/vendor-pass/${selectedRequest.id}/revert-person/${personIndex}`,
                { revertReason: remark },
                { headers },
              ),
            );
          } else {
            personPromises.push(
              axios.put(
                `${AGENT_API}/vendor-pass/${selectedRequest.id}/reject-person/${personIndex}`,
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
                `${AGENT_API}/vendor-pass/${selectedRequest.id}/approve-vehicle/${vehicleIndex}`,
                {},
                { headers },
              ),
            );
          } else if (status === "REVERTED") {
            vehiclePromises.push(
              axios.put(
                `${AGENT_API}/vendor-pass/${selectedRequest.id}/revert-vehicle/${vehicleIndex}`,
                { revertReason: remark },
                { headers },
              ),
            );
          } else {
            vehiclePromises.push(
              axios.put(
                `${AGENT_API}/vendor-pass/${selectedRequest.id}/reject-vehicle/${vehicleIndex}`,
                { rejectedReason: remark },
                { headers },
              ),
            );
          }
        });

        // 4. EXECUTE ALL ENTITY ACTIONS CONCURRENTLY
        await Promise.all([...personPromises, ...vehiclePromises]);

        // Safety Officer annual Trailer/Lorry approval is the FINAL stage.
        // The approve-vehicle endpoint already completes both the vehicle
        // and the parent vendor request. Do not call complete-review again.
        if (!isSafetyAnnualTrailerVendorPass) {
          await axios.put(
            `${AGENT_API}/vendor-pass/${vendorPassId}/complete-review`,
            {},
            { headers },
          );
        }
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
          if (status === "REJECTED") payload.rejectedReason = remark;
          else if (status === "REVERTED") payload.revertReason = remark;
          vehiclePromises.push(
            axios.patch(
              `${ADMIN_API}/pass-request/agent-pass-request-action`,
              payload,
              { headers },
            ),
          );
        });

        const allNormalPromises = [...personPromises, ...vehiclePromises];
        if (allNormalPromises.length === 0) {
          toast.dismiss(loadingToastId);
          toast.warning("No Actions Prepared", {
            description:
              "Please record a decision for at least one entity assigned to your role.",
          });
          return;
        }

        await Promise.all(allNormalPromises);

        const hasOrdinaryEntities =
          persons.some(
            (p) => canUserVerifyPerson(p) && !p.essentialWorkflowState,
          ) ||
          vehicles.some(
            (v) => canUserVerifyVehicle(v) && !v.essentialWorkflowState,
          );
        if (hasOrdinaryEntities) {
          await axios
            .patch(
              `${ADMIN_API}/pass-request/agent-pass-request-action`,
              {
                passRequestId: selectedRequest.id,
                decision: "complete-review",
              },
              { headers },
            )
            .catch(() => {});
        }
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
    } finally {
      setIsSubmitting(false);
    }
  };

  const openReviewModal = async (pass, viewOnly = false) => {
    if (!viewOnly) {
      const lockType = pass.originType === "VENDOR" ? "vendor-pass" : "pass";
      const lockRes = await acquireLock(pass.id, lockType);
      if (!lockRes.success) {
        toast.error("Application In-Use", {
          description: lockRes.message,
        });
        return;
      }
    }

    setSelectedRequest(pass);

    if (!viewOnly) {
      // Pre-populate entity statuses from DB for already-decided entities
      // Only pending/reverted entities should need fresh review
      const initialPersonStatuses = {};
      const initialPersonRemarks = {};
      const initialVehicleStatuses = {};
      const initialVehicleRemarks = {};

      (pass.persons || []).forEach((p) => {
        if (p.conversionWorkflowState) {
          if (p.conversionStatus === "APPROVED") {
            initialPersonStatuses[p.id] = "APPROVED";
          } else if (p.conversionStatus === "REJECTED") {
            initialPersonStatuses[p.id] = "REJECTED";
            initialPersonRemarks[p.id] = p.rejectedReason || "";
          }
          // Pending conversion request — leave initialPersonStatuses[p.id] empty for review!
        } else if (p.status === "approved") {
          // Pre-fill as APPROVED (read-only, approver cannot change)
          initialPersonStatuses[p.id] = "APPROVED";
        } else if (p.status === "rejected") {
          initialPersonStatuses[p.id] = "REJECTED";
          initialPersonRemarks[p.id] = p.rejectedReason || "";
        }
        // 'pending' and 'reverted' entities need fresh review — leave empty
      });

      (pass.vehicles || []).forEach((v) => {
        if (userRole === "Safety Officer") {
          if (
            v.twistLockCertified === true ||
            v.marineSafetyApproved === true
          ) {
            initialVehicleStatuses[v.id] = "APPROVED";
          }
        } else if (userRole === "Fire Safety Officer") {
          if (
            v.sparkArresterCertified === true ||
            v.marineSafetyApproved === true
          ) {
            initialVehicleStatuses[v.id] = "APPROVED";
          }
        } else if (userRole === "Senior Deputy Traffic Manager") {
          if (v.srDtmApproved === true) {
            initialVehicleStatuses[v.id] = "APPROVED";
          }
        } else {
          if (v.status === "approved") {
            initialVehicleStatuses[v.id] = "APPROVED";
          } else if (v.status === "rejected") {
            initialVehicleStatuses[v.id] = "REJECTED";
            initialVehicleRemarks[v.id] = v.rejectedReason || "";
          }
        }
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

  // --- SERVER-SIDE PAGINATION: Data comes pre-filtered from the API ---
  // Use globalCounts for stat cards (always the full DB counts)
  // Use requests directly as filteredData (already paginated + filtered by server)
  const filteredData = requests;

  const isVendorScopedRequest =
    selectedRequest?.originType === "VENDOR" &&
    Boolean(selectedRequest?.isOilDock);

  const visiblePersons = selectedRequest
    ? isViewMode
      ? selectedRequest.persons || []
      : (selectedRequest.persons || []).filter((p) => {
          if (isVendorScopedRequest) {
            const state = String(p?.workflowState || "")
              .trim()
              .toUpperCase();

            const status = String(p?.status || "")
              .trim()
              .toLowerCase();

            return state === "PENDING_VENDOR_PERSON_CONCERN_DEPARTMENT" &&
              ["pending", "reverted"].includes(status)
              ? Number(userDepartmentId) === Number(p?.concernDepartmentId)
              : state === "PENDING_VENDOR_PERSON_TRAFFIC" &&
                  Number(userDepartmentId) === 9 &&
                  ["pending", "reverted"].includes(status);
          }

          return canUserVerifyPerson(p);
        })
    : [];

  const visibleVehicles = selectedRequest
    ? isViewMode
      ? selectedRequest.vehicles || []
      : (selectedRequest.vehicles || []).filter((v) => {
          if (isVendorScopedRequest) {
            const state = String(v?.workflowState || "")
              .trim()
              .toUpperCase();

            const status = String(v?.status || "")
              .trim()
              .toLowerCase();

            if (!["pending", "reverted"].includes(status)) {
              return false;
            }

            if (
              state === "PENDING_VENDOR_MARINE" &&
              Number(userDepartmentId) === 7 &&
              ["Fire Safety Officer", "Dy. Conservator"].includes(
                String(userRole || "").trim(),
              )
            ) {
              return true;
            }

            if (
              state === "PENDING_VENDOR_CONCERN_DEPARTMENT" &&
              Number(userDepartmentId) === Number(v?.concernDepartmentId) &&
              [3, 4].includes(Number(userDepartmentId)) &&
              String(userRole || "").trim() === "Approval"
            ) {
              return true;
            }

            if (
              state === "PENDING_VENDOR_CISF" &&
              Number(userDepartmentId) === 1 &&
              [
                "CISF",
                "CISF Asst Commandant",
                "CISF Assistant Commandant",
                "Cisf.Assistant Commandant",
              ].includes(String(userRole || "").trim())
            ) {
              return true;
            }

            if (
              state === "PENDING_VENDOR_TRAFFIC" &&
              Number(userDepartmentId) === 9 &&
              String(userRole || "").trim() === "Approval"
            ) {
              return true;
            }

            return false;
          }

          return canUserVerifyVehicle(v);
        })
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
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-5 font-sans">
      {/* ── OFFICIAL CHENNAI PORT AUTHORITY HEADER STRIP ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0a1e4d] via-[#12275f] to-[#1b1856] p-6 text-white shadow-[0_12px_32px_-10px_rgba(10,30,77,0.65)] ring-1 ring-inset ring-white/15">
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
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Pass Processing
                </span>
                <span className="text-[10px] font-bold text-blue-200/70 hidden sm:inline">
                  Traffic Authority · Chennai Port Authority
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white leading-tight mt-0.5">
                PASS CLEARANCE &amp; APPROVALS
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
        {/* ── Card 1: Total Applications ── */}
        <div
          onClick={() => handleCardClick("pending", "ALL")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) =>
            (e.key === "Enter" || e.key === " ") &&
            handleCardClick("pending", "ALL")
          }
          className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1e3a8a] via-[#3730a3] to-[#4c1d95] p-5 text-white shadow-xl shadow-indigo-900/40 ring-1 ring-inset ring-white/15 cursor-pointer min-h-[148px] flex flex-col justify-between transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-indigo-700/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
          <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-blue-400/20 blur-2xl" />
          <div className="pointer-events-none absolute -left-4 -bottom-4 h-20 w-20 rounded-full bg-violet-500/20 blur-xl" />
          <div className="pointer-events-none absolute right-3 bottom-3 opacity-[0.08] group-hover:opacity-[0.13] transition-opacity duration-300">
            <PackageCheck className="h-20 w-20 text-white" strokeWidth={1.2} />
          </div>
          <div className="relative flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20 shadow-inner shrink-0">
                <PackageCheck
                  className="h-4 w-4 text-blue-200"
                  strokeWidth={2.2}
                />
              </span>
              <span className="text-[11px] font-bold uppercase tracking-widest text-blue-200/80 leading-tight">
                Total
              </span>
            </div>
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-white/10 text-blue-200 border border-white/15">
              ALL
            </span>
          </div>
          <div className="relative mt-3">
            <p className="text-4xl font-black text-white tabular-nums tracking-tight leading-none drop-shadow-md">
              {globalCounts.total}
            </p>
            <p className="text-[11px] font-semibold text-blue-200/70 mt-1.5 leading-snug">
              {globalCounts.pending} pending · {globalCounts.processed}{" "}
              authorized
            </p>
          </div>
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
          onKeyDown={(e) =>
            (e.key === "Enter" || e.key === " ") &&
            handleCardClick("pending", "ALL")
          }
          className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#92400e] via-[#c2410c] to-[#b91c1c] p-5 text-white shadow-xl shadow-orange-900/40 ring-1 ring-inset ring-white/15 cursor-pointer min-h-[148px] flex flex-col justify-between transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-orange-600/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
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
              {globalCounts.pending} awaiting review of {globalCounts.total}{" "}
              total
            </p>
          </div>
          <div className="relative mt-4">
            <div className="h-1 w-full rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-300 via-orange-300 to-red-300 transition-all duration-700"
                style={{
                  width:
                    globalCounts.total > 0
                      ? `${Math.round((globalCounts.pending / globalCounts.total) * 100)}%`
                      : "0%",
                }}
              />
            </div>
            <p className="text-[10px] text-orange-200/50 mt-1 tabular-nums">
              {globalCounts.total > 0
                ? `${Math.round((globalCounts.pending / globalCounts.total) * 100)}% of total`
                : "—"}
            </p>
          </div>
        </div>

        {/* ── Card 3: Processed & Authorized ── */}
        <div
          onClick={() => handleCardClick("processed", "ALL")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) =>
            (e.key === "Enter" || e.key === " ") &&
            handleCardClick("processed", "ALL")
          }
          className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#064e3b] via-[#0f766e] to-[#0e7490] p-5 text-white shadow-xl shadow-emerald-900/40 ring-1 ring-inset ring-white/15 cursor-pointer min-h-[148px] flex flex-col justify-between transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-emerald-600/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
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
                <CheckCircle2
                  className="h-4 w-4 text-emerald-200"
                  strokeWidth={2.2}
                />
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
              {globalCounts.processed} authorized · {globalCounts.pending}{" "}
              awaiting review
            </p>
          </div>
          <div className="relative mt-4">
            <div className="h-1 w-full rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-300 via-teal-300 to-cyan-300 transition-all duration-700"
                style={{
                  width:
                    globalCounts.total > 0
                      ? `${Math.round((globalCounts.processed / globalCounts.total) * 100)}%`
                      : "0%",
                }}
              />
            </div>
            <p className="text-[10px] text-emerald-200/50 mt-1 tabular-nums">
              {globalCounts.total > 0
                ? `${Math.round((globalCounts.processed / globalCounts.total) * 100)}% clearance rate`
                : "—"}
            </p>
          </div>
        </div>

        {/* ── Card 4: Rejected ── */}
        <div
          onClick={() => handleCardClick("processed", "ALL")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) =>
            (e.key === "Enter" || e.key === " ") &&
            handleCardClick("processed", "ALL")
          }
          className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#7f1d1d] via-[#b91c1c] to-[#9f1239] p-5 text-white shadow-xl shadow-red-900/40 ring-1 ring-inset ring-white/15 cursor-pointer min-h-[148px] flex flex-col justify-between transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-red-600/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
          <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-red-400/20 blur-2xl" />
          <div className="pointer-events-none absolute -left-4 -bottom-4 h-20 w-20 rounded-full bg-rose-600/25 blur-xl" />
          <div className="pointer-events-none absolute right-3 bottom-3 opacity-[0.08] group-hover:opacity-[0.13] transition-opacity duration-300">
            <XCircle className="h-20 w-20 text-white" strokeWidth={1.2} />
          </div>
          <div className="relative flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20 shadow-inner shrink-0">
                <XCircle className="h-4 w-4 text-red-200" strokeWidth={2.2} />
              </span>
              <span className="text-[11px] font-bold uppercase tracking-widest text-red-200/80 leading-tight">
                Rejected
              </span>
            </div>
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-red-400/20 text-red-200 border border-red-400/30">
              Denied
            </span>
          </div>
          <div className="relative mt-3">
            <p className="text-4xl font-black text-white tabular-nums tracking-tight leading-none drop-shadow-md">
              {Math.max(
                0,
                globalCounts.total -
                  globalCounts.pending -
                  globalCounts.processed,
              )}
            </p>
            <p className="text-[11px] font-semibold text-red-200/70 mt-1.5 leading-snug">
              {Math.max(
                0,
                globalCounts.total -
                  globalCounts.pending -
                  globalCounts.processed,
              )}{" "}
              rejected · {globalCounts.pending} still pending
            </p>
          </div>
          <div className="relative mt-4">
            <div className="h-1 w-full rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-red-300 via-rose-300 to-pink-300 transition-all duration-700"
                style={{
                  width:
                    globalCounts.total > 0
                      ? `${Math.round(
                          (Math.max(
                            0,
                            globalCounts.total -
                              globalCounts.pending -
                              globalCounts.processed,
                          ) /
                            globalCounts.total) *
                            100,
                        )}%`
                      : "0%",
                }}
              />
            </div>
            <p className="text-[10px] text-red-200/50 mt-1 tabular-nums">
              {globalCounts.total > 0
                ? `${Math.round(
                    (Math.max(
                      0,
                      globalCounts.total -
                        globalCounts.pending -
                        globalCounts.processed,
                    ) /
                      globalCounts.total) *
                      100,
                  )}% rejection rate`
                : "—"}
            </p>
          </div>
        </div>
      </div>

      {/* ── TABS BAR ── */}
      <div className="flex items-center gap-2 border-b-2 border-slate-200 pb-0 overflow-x-auto">
        {[
          {
            id: "pending",
            label: "Pending Clearance",
            count: globalCounts.pending,
            icon: Clock,
          },
          {
            id: "processed",
            label: "Processed Passes",
            count: globalCounts.processed,
            icon: CheckCircle2,
          },
          ...(userRole === "Approval" && userDepartmentId === 9
            ? [
                {
                  id: "pass_updates",
                  label: "Pass Updates",
                  count: passUpdatesCount,
                },
              ]
            : []),
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setCardFilter("ALL");
              setSearchInput("");
              setProcessedByMe(false);
              setCurrentPage(1);
            }}
            className={`relative px-5 py-2.5 text-sm font-bold rounded-t-xl transition-all ${
              activeTab === tab.id
                ? "bg-[#0a1e4d] text-white shadow"
                : "text-slate-500 hover:text-[#0a1e4d] hover:bg-slate-100"
            }`}
          >
            {tab.label}
            <span
              className={`ml-2 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold ${
                activeTab === tab.id
                  ? "bg-white/20 text-white"
                  : "bg-slate-200 text-slate-600"
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* ── Table card ── */}
      <div className="bg-white dark:bg-[#1e293b] rounded-2xl ring-1 ring-slate-200/60 dark:ring-white/5 shadow-xl overflow-hidden">
        {/* Table toolbar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/60 dark:bg-slate-800/30">
          <h3 className="font-bold text-slate-800 dark:text-stone-100 uppercase text-xs tracking-widest flex items-center gap-2">
            {activeTab === "pending" ? (
              <>
                <ShieldAlert className="h-4 w-4 text-[#ff6b00]" /> Awaiting
                Review
              </>
            ) : (
              <>
                <History className="h-4 w-4 text-emerald-500" /> Processed
                Passes
              </>
            )}
          </h3>

          <div className="flex flex-col sm:flex-row w-full md:w-auto gap-3 items-center">
            {activeTab === "processed" && !isMarineFireSafety && (
              <label className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors select-none">
                <input
                  type="checkbox"
                  id="processed-by-me-filter"
                  checked={processedByMe}
                  onChange={(e) => {
                    setProcessedByMe(e.target.checked);
                    setCurrentPage(1);
                  }}
                  className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 h-4 w-4 cursor-pointer"
                />
                <span>Processed By Me</span>
              </label>
            )}

            <div className="relative w-full md:w-auto">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full md:w-auto pl-9 pr-8 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 focus:outline-none focus:border-[#ff6b00] appearance-none cursor-pointer"
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
                className="w-full pl-9 pr-10 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[#ff6b00]"
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

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/20 border-b border-slate-100 dark:border-slate-700/40">
                {(activeTab === "pass_updates"
                  ? [
                      "Pass No.",
                      "Person Name",
                      "Company",
                      "Old Vehicle No.",
                      "New Vehicle No.",
                      "Requested On",
                      "Status",
                      "Actions",
                    ]
                  : activeTab === "processed"
                    ? [
                        "Ref No",
                        "Company Details",
                        "Entities Included",
                        "Applied On",
                        "Approved By",
                        "Status",
                      ]
                    : [
                        "Ref No",
                        "Company Details",
                        "Entities Included",
                        "Applied On",
                        "Status",
                      ]
                ).map((h) => (
                  <th
                    key={h}
                    className={`px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ${
                      h === "Status" ? "text-center" : ""
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/30">
              {activeTab === "pass_updates" ? (
                twoWheelerRequests.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="py-16 text-center text-slate-500"
                    >
                      <Search className="h-10 w-10 mx-auto text-slate-200 mb-3" />
                      <p className="text-sm font-medium">
                        No two-wheeler update requests found.
                      </p>
                    </td>
                  </tr>
                ) : (
                  twoWheelerRequests.map((req) => (
                    <tr
                      key={req.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    >
                      <td className="px-6 py-4 text-sm font-bold font-mono text-[#0a1e4d]">
                        {req.personPassNo ||
                          `REQ-${req.passRequestId || req.id}`}
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-800 dark:text-slate-200">
                        {req.personName || "—"}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                        {req.companyName || "—"}
                      </td>
                      <td className="px-6 py-4 text-sm font-mono text-slate-500">
                        {req.oldVehicleNo || "N/A"}
                      </td>
                      <td className="px-6 py-4 text-sm font-mono font-bold text-emerald-600">
                        {req.newVehicleNo}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {new Date(req.createdAt).toLocaleDateString("en-GB")}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-bold ${req.status === "APPROVED" ? "bg-emerald-100 text-emerald-700" : req.status === "REJECTED" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}
                        >
                          {req.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {req.status === "PENDING" ? (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleApproveTwoWheeler(req.id)}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() =>
                                setRejectModal({
                                  isOpen: true,
                                  requestId: req.id,
                                  reason: "",
                                })
                              }
                              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )
              ) : loading ? (
                <tr>
                  <td
                    colSpan={activeTab === "processed" ? 6 : 5}
                    className="py-16 text-center text-slate-500"
                  >
                    <Loader2 className="h-10 w-10 mx-auto text-slate-300 mb-3 animate-spin" />
                    <p className="text-sm font-medium">Loading requests...</p>
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td
                    colSpan={activeTab === "processed" ? 6 : 5}
                    className="py-16 text-center text-slate-500"
                  >
                    <Search className="h-10 w-10 mx-auto text-slate-200 mb-3" />
                    <p className="text-sm font-medium">
                      No records found for the current filter/search.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredData.map((pass) => {
                  const statusColors = {
                    approved:
                      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20",
                    processed:
                      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20",
                    reverted:
                      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20",
                    rejected:
                      "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/20",
                  };
                  const statusKey = (pass.status || "").toLowerCase();
                  const statusClass =
                    statusColors[statusKey] ||
                    "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20";

                  const lockType =
                    pass.originType === "VENDOR" ? "vendor-pass" : "pass";
                  const lock = activeLocks[lockType]?.find(
                    (l) => String(l.applicationId) === String(pass.id),
                  );
                  const isLocked = !!lock;

                  const catInfo = getPassRequestCategory(pass);

                  const rowClass = isLocked
                    ? `bg-amber-50/70 hover:bg-amber-100/70 dark:bg-amber-950/20 dark:hover:bg-amber-950/30 transition-colors cursor-pointer group ${catInfo.borderAccent}`
                    : `hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group ${catInfo.borderAccent}`;

                  return (
                    <tr
                      key={
                        pass.originType === "VENDOR"
                          ? `vpr-${pass.id}`
                          : pass.id
                      }
                      onClick={() =>
                        openReviewModal(pass, activeTab === "processed")
                      }
                      className={rowClass}
                    >
                      <td className="px-6 py-4 text-sm font-bold text-[#0a1e4d] dark:text-stone-200 font-mono">
                        {pass.referenceNo || `REQ-${pass.id}`}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-300 to-orange-400 dark:from-amber-400 dark:to-orange-500 flex items-center justify-center font-bold text-sm text-white shadow-sm shrink-0">
                            {(pass.entityName || "?").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-slate-800 dark:text-stone-100">
                              {pass.entityName || "—"}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              {pass.email || "—"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-0.5 rounded-full text-[11px] font-bold border border-slate-200 dark:border-slate-700">
                            {pass.persons?.length || 0} Persons |{" "}
                            {pass.vehicles?.length || 0} Vehicles
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${catInfo.badgeClass}`}
                          >
                            {catInfo.label}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                        {new Date(
                          pass.submittedAt || pass.createdAt,
                        ).toLocaleDateString()}
                      </td>
                      {activeTab === "processed" && (
                        <td className="px-6 py-4 text-sm font-semibold text-slate-600 dark:text-slate-300">
                          {pass.approvedBy || "—"}
                        </td>
                      )}
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          {(() => {
                            let displayStatus = (
                              pass.status || "PENDING"
                            ).toUpperCase();

                            let displayClass = statusClass;

                            if (
                              isMarineFireSafety &&
                              activeTab === "processed"
                            ) {
                              const marineStatuses = [
                                ...new Set(
                                  (pass.vehicles || [])
                                    .map((v) => {
                                      const status = String(v.status || "")
                                        .trim()
                                        .toLowerCase();

                                      if (v.marineSafetyApproved === true) {
                                        return "APPROVED";
                                      }

                                      if (status === "rejected") {
                                        return "REJECTED";
                                      }

                                      if (status === "reverted") {
                                        return "REVERTED";
                                      }

                                      return null;
                                    })
                                    .filter(Boolean),
                                ),
                              ];

                              if (marineStatuses.length === 1) {
                                displayStatus = marineStatuses[0];
                              } else if (marineStatuses.length > 1) {
                                displayStatus = "MIXED";
                              } else {
                                displayStatus = "PROCESSED";
                              }

                              displayClass =
                                displayStatus === "APPROVED" || displayStatus === "PROCESSED" || displayStatus === "COMPLETED"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : displayStatus === "REJECTED"
                                    ? "bg-red-50 text-red-700 border-red-200"
                                    : displayStatus === "REVERTED"
                                      ? "bg-amber-50 text-amber-700 border-amber-200"
                                      : "bg-blue-50 text-blue-700 border-blue-200";
                            }

                            return (
                              <span
                                className={`px-3 py-1 rounded-full text-[11px] font-bold border ${displayClass}`}
                              >
                                {displayStatus}
                              </span>
                            );
                          })()}

                          {isLocked && (
                            <span className="text-[9px] text-amber-600 dark:text-amber-400 font-bold bg-amber-100 dark:bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-900 animate-pulse">
                              IN-USE BY {lock.userName.toUpperCase()}
                            </span>
                          )}
                        </div>
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
                    {(selectedRequest.requisitionLetterFilePath || selectedRequest.requisitionLetterFileName) && (
                      <button
                        onClick={() =>
                          handleViewDoc(
                            selectedRequest.id,
                            "passRequisitionLetter",
                            selectedRequest.requisitionLetterFilePath || selectedRequest.requisitionLetterFileName,
                          )
                        }
                        className="bg-blue-50 text-blue-700 border border-blue-200 px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-blue-100 transition-colors shadow-sm"
                      >
                        <FileText className="h-4 w-4 text-blue-600" /> View Requisition Letter
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
                      {visiblePersons.map((p, idx) => (
                        <tr
                          key={`person-${p.id || idx}-${idx}`}
                          onClick={() => {
                            if (isViewMode || canUserVerifyPerson(p)) {
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
                          className={`transition-all hover:shadow-sm ${
                            isViewMode || canUserVerifyPerson(p)
                              ? "hover:bg-slate-50 cursor-pointer"
                              : "bg-slate-50/50 cursor-default"
                          }`}
                        >
                          <td className="p-3 text-slate-800 font-mono font-bold text-xs">
                            {p.personPassNo || "-"}
                          </td>
                          <td className="p-3 font-bold text-[#0a1e4d]">
                            <div>{p.name}</div>
                            {p.conversionWorkflowState && (
                              <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded text-[9px] font-extrabold border bg-amber-50 text-amber-800 border-amber-300">
                                ⚡ Essential Pass
                              </span>
                            )}
                            <div className="flex flex-wrap gap-1 mt-1">
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
                                let personStatus = entityStatuses.persons[p.id];
                                if (!personStatus) {
                                  if (p.conversionWorkflowState) {
                                    personStatus = p.conversionStatus || "PENDING";
                                  } else {
                                    personStatus = (p.status || p.decision || "").toUpperCase();
                                  }
                                }

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
                                            : personStatus === "REVERTED" || personStatus === "PENDING"
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
                              {!isViewMode &&
                                !isVendorOilJettyWorkflow &&
                                canUserVerifyPerson(p) && (
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
                      {visibleVehicles.map((v, idx) => (
                        <tr
                          key={`vehicle-${v.id || idx}-${idx}`}
                          onClick={() => {
                            if (isViewMode || canUserVerifyVehicle(v)) {
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
                          className={`transition-all hover:shadow-sm ${
                            isViewMode || canUserVerifyVehicle(v)
                              ? "hover:bg-slate-50 cursor-pointer"
                              : "bg-slate-50/50 cursor-default"
                          }`}
                        >
                          <td className="p-3 text-slate-800 font-mono font-bold text-xs">
                            {v.vehiclePassNo || "-"}
                          </td>
                          <td className="p-3 font-bold text-[#0a1e4d] uppercase">
                            <div>{v.registrationNo}</div>
                            {v.conversionWorkflowState && (
                              <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded text-[9px] font-extrabold border bg-amber-50 text-amber-800 border-amber-300">
                                ⚡ Essential Pass
                              </span>
                            )}
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
                              {!v.conversionWorkflowState &&
                                !v.essentialWorkflowState &&
                                !isOilDockArea(v.accessAreaId || v.accessArea) &&
                                ["YEARLY", "ANNUAL"].includes(
                                  String(v.passType || "").toUpperCase(),
                                ) &&
                              ["TRAILORS", "TRAILER LORRY"].includes(
                                String(v.vehicleTypeName || "")
                                  .trim()
                                  .toUpperCase(),
                              ) ? (
                                <>
                                  {/* Traffic / Pass Section */}
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                      String(v.status || "").toLowerCase() ===
                                      "approved"
                                        ? "bg-emerald-100 text-emerald-700"
                                        : String(
                                              v.status || "",
                                            ).toLowerCase() === "rejected"
                                          ? "bg-red-100 text-red-700"
                                          : String(
                                                v.status || "",
                                              ).toLowerCase() === "reverted"
                                            ? "bg-amber-100 text-amber-700"
                                            : "bg-amber-100 text-amber-700"
                                    }`}
                                  >
                                    {String(v.status || "").toLowerCase() ===
                                    "approved"
                                      ? "✓ Pass Section"
                                      : String(v.status || "").toLowerCase() ===
                                          "rejected"
                                        ? "✕ Pass Section Rejected"
                                        : String(
                                              v.status || "",
                                            ).toLowerCase() === "reverted"
                                          ? "↩ Pass Section Reverted"
                                          : "⏳ Pending Pass Section"}
                                  </span>

                                  {/* Safety Check */}
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                      v.marineSafetyApproved === true ||
                                      v.twistLockCertified === true
                                        ? "bg-emerald-100 text-emerald-700"
                                        : String(
                                              v.status || "",
                                            ).toLowerCase() === "rejected"
                                          ? "bg-red-100 text-red-700"
                                          : String(
                                                v.status || "",
                                              ).toLowerCase() === "reverted"
                                            ? "bg-amber-100 text-amber-700"
                                            : "bg-amber-100 text-amber-700"
                                    }`}
                                  >
                                    {v.marineSafetyApproved === true ||
                                    v.twistLockCertified === true
                                      ? "✓ Safety Check"
                                      : String(v.status || "").toLowerCase() ===
                                          "rejected"
                                        ? "✕ Safety Check Rejected"
                                        : String(
                                              v.status || "",
                                            ).toLowerCase() === "reverted"
                                          ? "↩ Safety Check Reverted"
                                          : "⏳ Pending Safety Check"}
                                  </span>
                                </>
                              ) : (
                                <>
                                  {/* ESSENTIAL WORKFLOW VS NORMAL WORKFLOW STATUS BADGES */}
                                  {(() => {
                                    if (v.conversionWorkflowState) {
                                      const convState = String(v.conversionWorkflowState || "").toUpperCase();
                                      const fireDone = ["PENDING_CIVIL_CONVERSION", "PENDING_MECHANICAL_CONVERSION", "PENDING_CISF_CONVERSION", "PENDING_PASS_SECTION_CONVERSION", "APPROVED", "COMPLETED"].includes(convState);
                                      const deptId = Number(v.conversionDepartmentId || v.essentialDepartmentId || v.departmentId || selectedRequest?.essentialDepartmentId || selectedRequest?.departmentId);
                                      const isCivil = convState.includes("CIVIL") || deptId === 3;
                                      const isMech = convState.includes("MECHANICAL") || deptId === 4;
                                      const civilDone = isCivil && ["PENDING_CISF_CONVERSION", "PENDING_PASS_SECTION_CONVERSION", "APPROVED", "COMPLETED"].includes(convState);
                                      const mechDone = isMech && ["PENDING_CISF_CONVERSION", "PENDING_PASS_SECTION_CONVERSION", "APPROVED", "COMPLETED"].includes(convState);
                                      const cisfDone = ["PENDING_PASS_SECTION_CONVERSION", "APPROVED", "COMPLETED"].includes(convState);
                                      const passSectionDone = convState === "APPROVED" || convState === "COMPLETED";

                                      return (
                                        <>
                                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${fireDone ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                                            {fireDone ? "✓ Fire Safety / Dy. Conservator" : "⏳ Pending Fire Safety / Dy. Conservator"}
                                          </span>
                                          {isCivil && (
                                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${civilDone ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                                              {civilDone ? "✓ Civil Dept" : "⏳ Pending Civil Dept"}
                                            </span>
                                          )}
                                          {isMech && (
                                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${mechDone ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                                              {mechDone ? "✓ Mech Dept" : "⏳ Pending Mech Dept"}
                                            </span>
                                          )}
                                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${cisfDone ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                                            {cisfDone ? "✓ CISF Assistant Commandant" : "⏳ Pending CISF"}
                                          </span>
                                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${passSectionDone ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                                            {passSectionDone ? "✓ Pass Section" : "⏳ Pending Pass Section"}
                                          </span>
                                        </>
                                      );
                                    }

                                    const isEssential =
                                      Boolean(v.essentialWorkflowState) ||
                                      (v.essentialDepartmentId !== null &&
                                        v.essentialDepartmentId !==
                                          undefined) ||
                                      isOilDockArea(
                                        v.accessAreaId || v.accessArea,
                                      );

                                    if (isEssential) {
                                      const workflowState = String(
                                        v.essentialWorkflowState || "",
                                      ).toUpperCase();
                                      const deptId = Number(
                                        v.essentialDepartmentId ||
                                          v.departmentId ||
                                          selectedRequest?.essentialDepartmentId ||
                                          selectedRequest?.departmentId,
                                      );
                                      const sparkApproved =
                                        v.sparkArresterCertified === true ||
                                        v.marineSafetyApproved === true ||
                                        (userRole === "Fire Safety Officer" &&
                                          entityStatuses.vehicles[v.id] ===
                                            "APPROVED");

                                      const fireSafetyDone =
                                        sparkApproved ||
                                        (workflowState !== "" &&
                                          !workflowState.includes(
                                            "FIRE_SAFETY",
                                          ));

                                      const isCivilDept =
                                        deptId === 3 ||
                                        workflowState.includes("CIVIL");
                                      const isMechDept =
                                        deptId === 4 ||
                                        workflowState.includes("MECHANICAL");

                                      const civilDone =
                                        isCivilDept &&
                                        (!workflowState.includes("CIVIL") ||
                                          [
                                            "PENDING_CISF_ESSENTIAL",
                                            "PENDING_PASS_SECTION_ESSENTIAL",
                                            "COMPLETED_ESSENTIAL",
                                            "COMPLETED",
                                          ].includes(workflowState));

                                      const mechDone =
                                        isMechDept &&
                                        (!workflowState.includes(
                                          "MECHANICAL",
                                        ) ||
                                          [
                                            "PENDING_CISF_ESSENTIAL",
                                            "PENDING_PASS_SECTION_ESSENTIAL",
                                            "COMPLETED_ESSENTIAL",
                                            "COMPLETED",
                                          ].includes(workflowState));

                                      const cisfDone =
                                        [
                                          "PENDING_PASS_SECTION_ESSENTIAL",
                                          "COMPLETED_ESSENTIAL",
                                          "COMPLETED",
                                        ].includes(workflowState) ||
                                        String(v.status || "").toLowerCase() ===
                                          "approved";

                                      const passSectionDone =
                                        [
                                          "COMPLETED_ESSENTIAL",
                                          "COMPLETED",
                                        ].includes(workflowState) ||
                                        String(v.status || "").toLowerCase() ===
                                          "approved";

                                      return (
                                        <>
                                          {/* 1. Dy. Conservator / Fire Safety */}
                                          <span
                                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                              fireSafetyDone
                                                ? "bg-emerald-100 text-emerald-700"
                                                : "bg-amber-100 text-amber-700"
                                            }`}
                                          >
                                            {fireSafetyDone
                                              ? "✓ Fire Safety / Dy. Conservator"
                                              : "⏳ Pending Fire Safety / Dy. Conservator"}
                                          </span>

                                          {/* 2. Department Approval (if Civil or Mech selected) */}
                                          {isCivilDept && (
                                            <span
                                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                                civilDone
                                                  ? "bg-emerald-100 text-emerald-700"
                                                  : "bg-amber-100 text-amber-700"
                                              }`}
                                            >
                                              {civilDone
                                                ? "✓ Civil Dept"
                                                : "⏳ Pending Civil Dept"}
                                            </span>
                                          )}

                                          {isMechDept && (
                                            <span
                                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                                mechDone
                                                  ? "bg-emerald-100 text-emerald-700"
                                                  : "bg-amber-100 text-amber-700"
                                              }`}
                                            >
                                              {mechDone
                                                ? "✓ Mech Dept"
                                                : "⏳ Pending Mech Dept"}
                                            </span>
                                          )}

                                          {/* 3. CISF Approval */}
                                          <span
                                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                              cisfDone
                                                ? "bg-emerald-100 text-emerald-700"
                                                : "bg-amber-100 text-amber-700"
                                            }`}
                                          >
                                            {cisfDone
                                              ? "✓ CISF Assistant Commandant"
                                              : "⏳ Pending CISF"}
                                          </span>

                                          {/* 4. Pass Section Final Approval */}
                                          <span
                                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                              passSectionDone
                                                ? "bg-emerald-100 text-emerald-700"
                                                : "bg-amber-100 text-amber-700"
                                            }`}
                                          >
                                            {passSectionDone
                                              ? "✓ Pass Section"
                                              : "⏳ Pending Pass Section"}
                                          </span>
                                        </>
                                      );
                                    }

                                    // Normal flow
                                    return (
                                      <>
                                        <span
                                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                            String(
                                              v.status || "",
                                            ).toLowerCase() === "approved"
                                              ? "bg-emerald-100 text-emerald-700"
                                              : String(
                                                    v.status || "",
                                                  ).toLowerCase() === "rejected"
                                                ? "bg-red-100 text-red-700"
                                                : String(
                                                      v.status || "",
                                                    ).toLowerCase() ===
                                                    "reverted"
                                                  ? "bg-amber-100 text-amber-700"
                                                  : "bg-amber-100 text-amber-700"
                                          }`}
                                        >
                                          {String(
                                            v.status || "",
                                          ).toLowerCase() === "approved"
                                            ? "✓ Pass Section"
                                            : String(
                                                  v.status || "",
                                                ).toLowerCase() === "rejected"
                                              ? "✕ Pass Section Rejected"
                                              : String(
                                                    v.status || "",
                                                  ).toLowerCase() === "reverted"
                                                ? "↩ Pass Section Reverted"
                                                : "⏳ Pending Pass Section"}
                                        </span>

                                        {v.twistLockCertified && (
                                          <span
                                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                              v.twistLockCertified ||
                                              (userRole === "Safety Officer" &&
                                                entityStatuses.vehicles[
                                                  v.id
                                                ] === "APPROVED")
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
                                      </>
                                    );
                                  })()}
                                </>
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex justify-end items-center gap-3">
                              {(() => {
                                let vehicleStatus =
                                  entityStatuses.vehicles[v.id];

                                if (!vehicleStatus) {
                                  if (v.conversionWorkflowState) {
                                    vehicleStatus = v.conversionStatus || "PENDING";
                                  } else if (userRole === "Safety Officer") {
                                    vehicleStatus =
                                      v.marineSafetyApproved === true ||
                                      v.twistLockCertified === true
                                        ? "APPROVED"
                                        : "PENDING";
                                  } else if (
                                    userRole === "Fire Safety Officer"
                                  ) {
                                    vehicleStatus =
                                      v.marineSafetyApproved === true ||
                                      v.sparkArresterCertified === true
                                        ? "APPROVED"
                                        : "PENDING";
                                  } else if (
                                    userRole === "Senior Deputy Traffic Manager"
                                  ) {
                                    vehicleStatus =
                                      v.srDtmApproved === true
                                        ? "APPROVED"
                                        : "PENDING";
                                  } else {
                                    vehicleStatus = (
                                      v.status ||
                                      v.decision ||
                                      ""
                                    ).toUpperCase();
                                  }
                                }

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
                                            : vehicleStatus === "REVERTED" ||
                                                vehicleStatus === "PENDING"
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

                              {!isViewMode &&
                                !isVendorOilJettyWorkflow &&
                                canUserVerifyVehicle(v) && (
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
                                    {(() => {
                                      if (entityStatuses.vehicles[v.id])
                                        return "Re-verify";
                                      if (
                                        userRole === "Safety Officer" ||
                                        userRole === "Fire Safety Officer"
                                      ) {
                                        if (
                                          v.marineSafetyApproved === true ||
                                          v.twistLockCertified === true ||
                                          v.sparkArresterCertified === true
                                        )
                                          return "Re-verify";
                                        return "Verify";
                                      }
                                      if (
                                        userRole ===
                                        "Senior Deputy Traffic Manager"
                                      ) {
                                        if (v.srDtmApproved === true)
                                          return "Re-verify";
                                        return "Verify";
                                      }
                                      return v.status === "approved" ||
                                        v.status === "rejected"
                                        ? "Re-verify"
                                        : "Verify";
                                    })()}
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
              {/* {!isViewMode && (
                <button
                  onClick={handleSubmitReview}
                  className="bg-orange-600 text-white px-8 py-2.5 rounded-xl font-bold"
                >
                  Submit Complete Review
                </button>
              )} */}
              {/* {!isViewMode && isVendorOilJettyWorkflow && (
                <div className="p-5 border-t border-slate-200 bg-amber-50">
                  <label className="block text-xs font-bold text-amber-900 uppercase tracking-wider mb-2">
                    Remarks
                  </label>

                  <textarea
                    value={vendorWorkflowRemark}
                    onChange={(e) => setVendorWorkflowRemark(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-amber-200 bg-white p-3 text-sm outline-none"
                    placeholder="Required for Reject or Revert."
                  />
                </div>
              )} */}
              {/* {!isViewMode &&
                (isVendorOilJettyWorkflow ? (
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        handleVendorOilJettyWorkflowAction(
                          "REJECTED",
                          vendorWorkflowRemark,
                        )
                      }
                      className="bg-red-600 text-white px-6 py-2.5 rounded-xl font-bold"
                    >
                      Reject Request
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleVendorOilJettyWorkflowAction(
                          "REVERTED",
                          vendorWorkflowRemark,
                        )
                      }
                      className="bg-amber-600 text-white px-6 py-2.5 rounded-xl font-bold"
                    >
                      Revert Request
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleVendorOilJettyWorkflowAction(
                          "APPROVED",
                          vendorWorkflowRemark,
                        )
                      }
                      className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold"
                    >
                      Approve Request
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleSubmitReview}
                    className="bg-orange-600 text-white px-8 py-2.5 rounded-xl font-bold"
                  >
                    Submit Complete Review
                  </button>
                ))} */}
              {!isViewMode && (
                <button
                  onClick={handleSubmitReview}
                  disabled={isSubmitting}
                  className={`bg-orange-600 text-white px-8 py-2.5 rounded-xl font-bold ${
                    isSubmitting
                      ? "opacity-60 cursor-not-allowed"
                      : "hover:bg-orange-700"
                  }`}
                >
                  {isSubmitting ? "Submitting..." : "Submit Complete Review"}
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
              {(() => {
                const data = entityModal.data || {};
                const isConversion =
                  Boolean(data.conversionWorkflowState) ||
                  Boolean(data.conversionStatus) ||
                  Boolean(data.conversionStartDate) ||
                  Boolean(data.conversion_start_date) ||
                  Boolean(data.conversionPurpose) ||
                  Boolean(data.conversion_purpose) ||
                  Boolean(data.isConversionRequest);

                const isFreshEssential =
                  !isConversion &&
                  (Boolean(data.essentialWorkflowState) ||
                    Boolean(data.isEssentialPass) ||
                    data.passType === "ESSENTIAL" ||
                    data.pass_type === "ESSENTIAL" ||
                    Boolean(selectedRequest?.isEssentialPass));

                if (!isConversion && !isFreshEssential) return null;

                const reqLetterPath =
                  data.conversionRequisitionFilePath ||
                  data.requisitionLetterPath ||
                  data.conversionDocumentPath ||
                  data.conversion_document_path ||
                  data.document_path ||
                  selectedRequest?.requisitionLetterFilePath ||
                  selectedRequest?.conversionRequisitionFilePath ||
                  (selectedRequest?.vehicles || []).find((v) => v.conversionRequisitionFilePath || v.requisitionLetterPath)?.conversionRequisitionFilePath ||
                  (selectedRequest?.vehicles || []).find((v) => v.conversionRequisitionFilePath || v.requisitionLetterPath)?.requisitionLetterPath ||
                  (selectedRequest?.persons || []).find((p) => p.conversionRequisitionFilePath || p.requisitionLetterPath)?.conversionRequisitionFilePath ||
                  (selectedRequest?.persons || []).find((p) => p.conversionRequisitionFilePath || p.requisitionLetterPath)?.requisitionLetterPath;

                if (isConversion) {
                  return (
                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200 p-5 shadow-sm space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-5 w-5 text-amber-600 animate-pulse" />
                          <h4 className="text-sm font-black text-amber-900 uppercase tracking-wider">
                            ⚡ Essential Access Conversion Request Details
                          </h4>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-200 text-amber-800">
                          {data.conversionWorkflowState || data.conversionStatus || "PENDING_CONVERSION"}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <span className="text-[10px] font-bold uppercase text-slate-500 block">
                            Conversion Start Date
                          </span>
                          <span className="text-xs font-bold text-slate-800">
                            {data.conversionStartDate || data.conversion_start_date
                              ? String(data.conversionStartDate || data.conversion_start_date).split("T")[0]
                              : "-"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase text-slate-500 block">
                            Conversion End Date
                          </span>
                          <span className="text-xs font-bold text-slate-800">
                            {data.conversionEndDate || data.conversion_end_date
                              ? String(data.conversionEndDate || data.conversion_end_date).split("T")[0]
                              : "-"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase text-slate-500 block">
                            Purpose
                          </span>
                          <span className="text-xs font-bold text-slate-800">
                            {data.conversionPurpose || data.conversion_purpose || "-"}
                          </span>
                        </div>
                      </div>

                      {reqLetterPath && (
                        <div className="pt-3 border-t border-amber-200 flex items-center justify-between">
                          <span className="text-xs font-bold text-amber-900">
                            Applicant Requisition Letter PDF:
                          </span>
                          <div className="w-64">
                            <DocumentCard
                              label="View Requisition Letter (PDF)"
                              filePath={reqLetterPath}
                              documentType="conversionRequisition"
                              passRequestId={data.passRequestId || selectedRequest?.id}
                              onView={handleViewDoc}
                              entityIndex={extractEntityIndex(data.id)}
                              isVendorPass={selectedRequest?.originType === "VENDOR"}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }

                return null;
              })()}

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
                        value={entityModal.data.name || "-"}
                        highlight
                      />
                      <DetailItem
                        label="HEP Type"
                        value={entityModal.data.hepType}
                      />
                      <DetailItem
                        label="Designation"
                        value={
                          entityModal.data.designationName ||
                          entityModal.data.designationId ||
                          entityModal.data.designationOther
                        }
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
                        value={
                          entityModal.data.countryName ||
                          entityModal.data.country
                        }
                      />
                      <DetailItem
                        label="Visa No."
                        value={entityModal.data.visaNo}
                      />
                      <DetailItem
                        label="Date of Birth"
                        value={entityModal.data.dob}
                      />
                      <DetailItem
                        label="CDC Number"
                        value={entityModal.data.cdcNumber}
                      />
                      <DetailItem
                        label="ID Proof Type"
                        value={
                          {
                            1: "Driving License",
                            2: "PAN Card",
                            3: "Passport",
                            4: "Voter ID",
                            5: "Company ID Card",
                          }[String(entityModal.data.idProofType)] ||
                          entityModal.data.idProofType
                        }
                      />
                      <DetailItem
                        label="ID Proof No."
                        value={entityModal.data.idProofNumber}
                      />
                      <DetailItem
                        label="Card / QR Reference"
                        value={entityModal.data.cardNumber}
                      />
                      {entityModal.data.hepTypeId === "Seafarers" && (
                        <DetailItem
                          label="Seafarer Pass For"
                          value={entityModal.data.seafarerPassFor || "-"}
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
                          value={entityModal.data.vehicleNo || "-"}
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
                        value={entityModal.data.registrationNo || "-"}
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
                      {entityModal.data.essentialDepartmentName && (
                        <DetailItem
                          label="Selected Department"
                          value={entityModal.data.essentialDepartmentName}
                          highlight
                        />
                      )}
                      {/* <DetailItem
                        label="RFID Card No."
                        value={entityModal.data.rfidCardNumber || "-"}
                      /> */}
                      <DetailItem
                        label="Insurance Expiry"
                        value={entityModal.data.insuranceExpiry || "-"}
                      />
                      <DetailItem
                        label="RC Validity"
                        value={entityModal.data.rcValidity || "-"}
                      />
                      <DetailItem
                        label="ULIP Verification"
                        value={
                          entityModal.data.ulip_verified
                            ? "VERIFIED"
                            : "NOT VERIFIED"
                        }
                      />
                    </>
                  )}
                  {Array.isArray(entityModal.data.workflowHistory) &&
                    entityModal.data.workflowHistory.length > 0 && (
                      <div className="col-span-2 md:col-span-4 border-t border-slate-200 pt-4 mt-3">
                        <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
                          Approval History
                        </h5>

                        <div className="space-y-2">
                          {entityModal.data.workflowHistory.map(
                            (history, index) => (
                              <div
                                key={`${history.actionedAt}-${index}`}
                                className="bg-slate-50 border border-slate-200 rounded-lg p-3"
                              >
                                <div className="flex justify-between gap-3">
                                  <div>
                                    <p className="text-xs font-black text-slate-800">
                                      {history.stage}
                                    </p>

                                    <p className="text-[11px] text-slate-600">
                                      {history.action} by{" "}
                                      <span className="font-bold">
                                        {history.actorName || "-"}
                                      </span>
                                    </p>

                                    <p className="text-[10px] text-slate-500">
                                      {history.roleName || "-"} •{" "}
                                      {history.departmentName || "-"}
                                    </p>
                                  </div>

                                  <span className="text-[10px] font-semibold text-slate-500">
                                    {history.actionedAt
                                      ? new Date(
                                          history.actionedAt,
                                        ).toLocaleString("en-IN")
                                      : "-"}
                                  </span>
                                </div>

                                {history.remarks && (
                                  <p className="text-[10px] text-slate-600 mt-2 border-t pt-2">
                                    Remarks: {history.remarks}
                                  </p>
                                )}
                              </div>
                            ),
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
                    value={`₹${
                      entityModal.data.amount ??
                      selectedRequest?.amount ??
                      "0.00"
                    }`}
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
                    {isVendorOilJettyWorkflow
                      ? "Approve"
                      : userRole === "Safety Officer"
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
