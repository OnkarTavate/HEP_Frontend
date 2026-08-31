"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";

import ProfileUpdateModal from "@/components/ProfileUpdateModal";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import {
  Ship,
  LayoutDashboard,
  FileText,
  CheckSquare,
  Truck,
  LogOut,
  Menu,
  Bell,
  Search,
  HelpCircle,
  Lock,
  Database,
  ShieldAlert,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  RefreshCw,
  Users,
  Building2,
  Phone,
  Mail,
  CreditCard,
  Hash,
  BadgeCheck,
  X,
  User,
  KeyRound,
  ChevronDown,
  Copy,
  CheckCheck,
  FileCode2,
  Briefcase,
  CheckCircle,
  FileBox
} from "lucide-react";
import { cn } from "@/lib/utils";
import axios from "axios";
import { toast } from "sonner";
import { useSessionHeartbeat } from "@/lib/useSessionHeartbeat";
import NotificationPanel from "@/components/NotificationPanel";

const AUTH_API = process.env.NEXT_PUBLIC_AUTH_API;
const AGENT_API = process.env.NEXT_PUBLIC_AGENT_API;
const ADMIN_API = process.env.NEXT_PUBLIC_ADMIN_API;

// Navigation items based on user role
const BULK_PASS_DEPT_IDS = [6, 9, 10, 11, 12, 13, 14, 15]; // General Admin + Traffic

const getNavigationItems = (role, departmentName, departmentId) => {
  const baseItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  ];
  const applicantItems = [
    ...baseItems,
    { name: "Apply Pass", href: "/dashboard/pass_request", icon: FileText },
    { name: "Master Record", href: "/dashboard/master_record", icon: Database },
    { name: "Blacklist & Penalties", href: "/dashboard/blacklist_penalties", icon: ShieldAlert },
    { name: "Material Pass", href: "/dashboard/material_pass_request", icon: FileBox}
  ];

  const isTrafficDept = departmentName?.toLowerCase() === "traffic";
  const canSeeBulkPass = BULK_PASS_DEPT_IDS.includes(Number(departmentId));

  const roleItems = {
    user: applicantItems,
    Applicant: applicantItems,
    Approval: isTrafficDept
      ? [
        ...baseItems,
        { name: "Traffic Approval", href: "/dashboard/approval_admin", icon: Truck },
        { name: "Gate Log", href: "/dashboard/gate-log", icon: FileText },
        ...(canSeeBulkPass ? [{ name: "Bulk Pass", href: "/dashboard/bulk_pass", icon: Users }] : []),
      ]
      : [
        ...baseItems,
        { name: "Pass Approval", href: "/dashboard/pass-approval", icon: CheckSquare },
        { name: "All Passes", href: "/dashboard/all-passes", icon: FileText },
        ...(canSeeBulkPass ? [{ name: "Bulk Pass", href: "/dashboard/bulk_pass", icon: Users }] : []),
      ],
    "Pass Officer": [
      ...baseItems,
      { name: "Pass Approval", href: "/dashboard/pass-approval", icon: CheckSquare },
      { name: "All Passes", href: "/dashboard/all-passes", icon: FileText },
      ...(canSeeBulkPass ? [{ name: "Bulk Pass", href: "/dashboard/bulk_pass", icon: Users }] : []),
    ],
    "Traffic Officer": [
      ...baseItems,
      { name: "Traffic Approval", href: "/dashboard/approval_admin", icon: Truck },
      { name: "Gate Log", href: "/dashboard/gate-log", icon: FileText },
      ...(canSeeBulkPass ? [{ name: "Bulk Pass", href: "/dashboard/bulk_pass", icon: Users }] : []),
    ],
    Admin: [...baseItems, { name: "All Passes", href: "/dashboard/all-passes", icon: FileText }],
    "Super Admin": [...baseItems, { name: "All Passes", href: "/dashboard/all-passes", icon: FileText }],
  };
  return roleItems[role] || roleItems[role?.toLowerCase()] || baseItems;
};

// ─── Tiny copy-to-clipboard hook ──────────────────────────────────────────────
function useCopy() {
  const [copied, setCopied] = useState(false);
  const copy = (text) => {
    navigator.clipboard.writeText(String(text || "")).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return { copied, copy };
}

// ─── Company Profile Panel (replaces old UserNameCard) ────────────────────────
function CompanyProfilePanel({ user, profileData, onChangePassword, onUpdateProfile, onLogout }) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);
  const { copied: copiedRef, copy: copyRef } = useCopy();
  const [copiedField, setCopiedField] = useState(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const copyField = (val, key) => {
    navigator.clipboard.writeText(String(val || "")).then(() => {
      setCopiedField(key);
      setTimeout(() => setCopiedField(null), 2000);
    });
  };

  // Derive display values
  const companyName = profileData?.entityName || user?.entityName || "Company";
  const loginId = profileData?.loginId || user?.username || "—";
  const refNo = profileData?.referenceNumber || "—";
  const email = profileData?.email || "—";
  const mobile = profileData?.mobileNo || "—";
  const gst = profileData?.gstinNumber || "—";
  const pan = profileData?.panNumber || "—";
  const userType = profileData?.userTypeName || profileData?.userType?.name || "—";
  const status = profileData?.status || "approved";
  const initials = companyName.substring(0, 2).toUpperCase();

  const statusMeta =
    status === "approved"
      ? { label: "Active", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300" }
      : status === "pending"
        ? { label: "Pending", cls: "bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300" }
        : { label: status, cls: "bg-stone-100 text-stone-600 dark:bg-white/5 dark:text-stone-400" };

  const DetailRow = ({ icon: Icon, label, value, copyKey }) => (
    <div className="flex items-start gap-3 py-2.5 border-b border-stone-100 dark:border-white/5 last:border-0">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-100 dark:bg-white/5 text-stone-500 dark:text-stone-400 shrink-0 mt-0.5">
        <Icon className="h-4 w-4" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider">{label}</p>
        <p className="text-sm font-semibold text-stone-800 dark:text-stone-100 truncate">{value || "—"}</p>
      </div>
      {value && value !== "—" && (
        <button
          onClick={() => copyField(value, copyKey)}
          className="shrink-0 p-1 rounded text-stone-400 hover:text-amber-600 transition-colors"
          title="Copy"
        >
          {copiedField === copyKey ? <CheckCheck className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      )}
    </div>
  );

  return (
    <div className="relative" ref={panelRef}>
      {/* Trigger button */}
      <button
        id="company-profile-btn"
        onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-2.5 rounded-2xl px-3 py-2 bg-black/90 hover:bg-black text-white dark:bg-white/5 dark:hover:bg-white/10 dark:border dark:border-white/10 shadow-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-amber-400/40 active:scale-95"
      >
        {/* Avatar */}
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-[#1f1f1f] text-base font-extrabold shrink-0 shadow-md ring-2 ring-amber-300/30">
          {initials}
        </span>
        {/* Name + role */}
        <span className="hidden sm:flex flex-col text-left leading-tight min-w-0 pr-1">
          <span className="text-sm font-extrabold truncate max-w-[140px]">{companyName}</span>
          <span className="text-[10px] uppercase tracking-wider text-amber-400 font-bold truncate">Company</span>
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-stone-400 transition-transform duration-200 hidden sm:block",
            open && "rotate-180"
          )}
        />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-[calc(100%+10px)] z-[9999] w-80 rounded-3xl bg-white dark:bg-[#1f232d] shadow-[0_8px_40px_rgba(0,0,0,0.18)] ring-1 ring-stone-200/70 dark:ring-white/10 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Panel header */}
          <div className="bg-gradient-to-r from-[#1f1f1f] via-[#2a2520] to-[#3a2f1f] px-5 py-4 relative overflow-hidden">
            {/* Wave decoration */}
            <svg aria-hidden viewBox="0 0 320 80" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 h-10 w-full text-amber-400/10">
              <path fill="currentColor" d="M0,40 C80,80 160,0 240,40 C280,60 300,30 320,40 L320,80 L0,80 Z" />
            </svg>
            <div className="relative flex items-center gap-3">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-[#1f1f1f] text-xl font-extrabold shrink-0 shadow-lg ring-2 ring-amber-300/30">
                {initials}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-base font-extrabold text-white leading-tight truncate">{companyName}</p>
                <p className="text-xs text-stone-400 font-mono mt-0.5 truncate">{loginId}</p>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold mt-1.5 ${statusMeta.cls}`}>
                  <BadgeCheck className="h-3 w-3" />
                  {statusMeta.label}
                </span>
              </div>
              <button onClick={() => setOpen(false)} className="text-white/50 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors shrink-0">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Detail rows */}
          <div className="px-4 pt-2 pb-1 max-h-[340px] overflow-y-auto [scrollbar-width:thin]">
            <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500 mb-2 mt-2">Company Details</p>
            <DetailRow icon={Hash} label="Reference No" value={refNo} copyKey="ref" />
            <DetailRow icon={User} label="Login ID" value={loginId} copyKey="lid" />
            <DetailRow icon={Mail} label="Email" value={email} copyKey="email" />
            <DetailRow icon={Phone} label="Mobile" value={mobile} copyKey="mob" />
          </div>

          {/* Actions */}
          <div className="p-3 border-t border-stone-100 dark:border-white/5 space-y-1.5">
            <button
              onClick={() => { setOpen(false); onUpdateProfile(); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold text-amber-700 bg-amber-50 dark:bg-amber-400/10 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-400/20 transition-colors"
            >
              <Building2 className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              Edit Profile
            </button>
            <button
              onClick={() => { setOpen(false); onChangePassword(); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-white/5 transition-colors"
            >
              <KeyRound className="h-4 w-4 shrink-0" />
              Change Password
            </button>
            <button
              onClick={() => { setOpen(false); onLogout(); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-400/10 transition-colors"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false);
  const [showProfileUpdateModal, setShowProfileUpdateModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [modalLoading, setModalLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("dashboard-theme") === "dark";
  });

  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      const next = !prev;
      try { localStorage.setItem("dashboard-theme", next ? "dark" : "light"); } catch { }
      return next;
    });
  };

  const [sidebarExpanded, setSidebarExpanded] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("dashboard-sidebar") !== "collapsed";
  });

  const toggleSidebar = () => {
    setSidebarExpanded((prev) => {
      const next = !prev;
      try { localStorage.setItem("dashboard-sidebar", next ? "expanded" : "collapsed"); } catch { }
      return next;
    });
  };

  useSessionHeartbeat();

  useEffect(() => {
    const handleOpenProfileUpdate = () => setShowProfileUpdateModal(true);
    window.addEventListener("open-profile-update", handleOpenProfileUpdate);
    return () => window.removeEventListener("open-profile-update", handleOpenProfileUpdate);
  }, []);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      const role = String(parsedUser.role || "").toLowerCase().trim();
      const isAdmin = role === "admin" || role === "administrator";
      if (isAdmin) { setTimeout(() => router.push("/admin"), 0); return; }
      setUser(parsedUser);
      if (parsedUser.isPasswordChanged === false) setShowPasswordChangeModal(true);

      // Fetch company profile for the panel
      const token = localStorage.getItem("accessToken");
      if (token && (role === "user" || role === "applicant" || role === "agent")) {
        axios.get(`${AGENT_API}/agents/profile`, { headers: { Authorization: `Bearer ${token}` } })
          .then((res) => { if (res.data?.success) setProfileData(res.data.data); })
          .catch(() => { });
      }
    } else {
      setTimeout(() => router.push("/"), 0);
    }
  }, [router]);

  const handlePasswordChangeSubmit = async (e) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) { toast.warning("Please fill in all fields."); return; }
    if (newPassword !== confirmPassword) { toast.warning("Passwords do not match."); return; }
    setModalLoading(true);
    try {
      const token = localStorage.getItem("accessToken");
      const isAgent = user?.role === "Applicant" || user?.role?.toLowerCase() === "user" || user?.role?.toLowerCase() === "agent";
      const targetUrl = isAgent ? `${AGENT_API}/agents/change-password` : `${ADMIN_API}/user/change-password`;
      const res = await axios.post(
        targetUrl,
        { loginId: user?.username, newPassword, confirmPassword },
        { headers: { Authorization: `Bearer ${token}` }, validateStatus: (s) => s < 500 }
      );
      if (res.status >= 200 && res.status < 300 && res.data?.success) {
        toast.success("Password Updated Successfully", { description: "Your password has been successfully updated." });
        const updatedUser = { ...user, isPasswordChanged: true };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        setUser(updatedUser);
        setShowPasswordChangeModal(false);
        setNewPassword("");
        setConfirmPassword("");
      } else {
        toast.error(res.data?.message || "Failed to update password.");
      }
    } catch (err) {
      console.error("Change password error:", err);
      toast.error(err.response?.data?.message || "Server not reachable");
    } finally {
      setModalLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem("accessToken");
      if (token) {
        await axios.post(`${AUTH_API}/auth/logout`, {}, { headers: { Authorization: `Bearer ${token}` } });
      }
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      router.push("/");
    }
  };

  if (!user) {
    return (
      <div
        className={cn("h-screen w-screen overflow-hidden flex", "bg-[#d8d0c8] dark:bg-[#0d0f17]", darkMode && "dark")}
        style={{ fontFamily: "'Montserrat', 'Inter', Arial, sans-serif" }}
      >
        <div className="w-full h-full bg-[#f5f1eb] dark:bg-[#1a1d27] flex overflow-hidden">
          {/* Sidebar skeleton */}
          <aside className="hidden lg:flex w-64 flex-shrink-0 bg-[#0a0a0a] dark:bg-black border-r border-black/20 p-4 flex-col gap-4">
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-400 text-[#1f1f1f] shadow-lg shrink-0">
                <Ship className="h-6 w-6" strokeWidth={2.5} />
              </span>
              <div className="flex flex-col gap-1.5">
                <span className="block h-3.5 w-24 rounded bg-white/15 animate-pulse" />
                <span className="block h-2.5 w-20 rounded bg-amber-400/40 animate-pulse" />
              </div>
            </div>
            <div className="mt-6 h-3 w-16 rounded bg-white/10 animate-pulse" />
            <div className="flex flex-col gap-2.5 mt-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-11 rounded-2xl bg-white/5 animate-pulse" style={{ animationDelay: `${i * 120}ms` }} />
              ))}
            </div>
          </aside>

          {/* Content skeleton */}
          <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
            <header className="px-4 sm:px-6 lg:px-8 pt-4 pb-3 flex items-center justify-between gap-3 shrink-0">
              <div className="space-y-2">
                <div className="h-5 w-56 rounded-lg bg-stone-300/70 dark:bg-white/10 animate-pulse" />
              </div>
              <div className="flex items-center gap-3">
                <div className="hidden md:block h-10 w-72 rounded-full bg-white dark:bg-white/5 animate-pulse" />
                <div className="h-10 w-10 rounded-full bg-white dark:bg-white/5 animate-pulse" />
                <div className="h-10 w-10 rounded-full bg-white dark:bg-white/5 animate-pulse" />
                <div className="h-12 w-36 rounded-2xl bg-black/90 dark:bg-white/5 animate-pulse" />
              </div>
            </header>
            <main className="flex-1 px-4 sm:px-6 lg:px-8 pb-4 min-h-0 overflow-hidden">
              <div className="relative h-full w-full">
                <div className="h-14 rounded-3xl bg-gradient-to-r from-[#1a1d27] via-[#252836] to-[#1a1d27] animate-pulse mb-4" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="h-32 rounded-3xl bg-white dark:bg-[#1f232d] animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
                  ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="h-72 rounded-3xl bg-white dark:bg-[#1f232d] animate-pulse lg:col-span-2" style={{ animationDelay: "150ms" }} />
                  <div className="h-72 rounded-3xl bg-white dark:bg-[#1f232d] animate-pulse" style={{ animationDelay: "260ms" }} />
                </div>
                <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center">
                  <div className="flex items-center gap-3 px-5 py-3 rounded-full bg-white/85 dark:bg-[#1f232d]/90 backdrop-blur-md ring-1 ring-stone-200/70 shadow-lg">
                    <span className="relative flex h-7 w-7 items-center justify-center rounded-xl bg-amber-400 text-[#1f1f1f] shrink-0">
                      <Ship className="h-4 w-4" strokeWidth={2.5} />
                      <span className="absolute inset-0 rounded-xl ring-2 ring-amber-400/60 animate-ping" />
                    </span>
                    <span className="text-sm font-semibold text-stone-700 dark:text-stone-200 tracking-wide">Preparing your dashboard</span>
                    <span className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-bounce [animation-delay:-0.3s]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-bounce [animation-delay:-0.15s]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-bounce" />
                    </span>
                  </div>
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>
    );
  }

  const navigationItems = getNavigationItems(user.role, user.departmentName, user.departmentId);
  const currentPageName = navigationItems.find((item) => item.href === pathname)?.name || "Port Gate Automation System";

  const SidebarContent = ({ onNavigate, expanded = sidebarExpanded, showCollapseToggle = true }) => (
    <div className="h-full flex flex-col justify-between py-8 bg-[#0a0a0a] dark:bg-black border-r border-black/20 dark:border-white/5 text-white overflow-hidden">
      <div className="flex flex-col gap-6">
        {/* Brand row */}
        <div className="flex flex-col gap-2 px-4">
          <div className={cn("flex items-center", expanded ? "justify-between" : "justify-center")}>
            <Link href="/dashboard" className="flex items-center gap-3 group min-w-0" onClick={onNavigate}>
              <span className="flex items-center justify-center w-12 h-12 rounded-2xl overflow-hidden bg-[#ff6b00] shadow-lg shadow-orange-600/20 shrink-0 group-hover:scale-105 transition-transform duration-200">
                <Image src="/logo1.png" alt="Chennai Port Logo" width={48} height={48} className="w-full h-full object-contain" />
              </span>
              <span className={cn(
                "flex flex-col leading-tight overflow-hidden transition-[opacity,max-width] duration-300 ease-in-out",
                expanded ? "opacity-100 max-w-[160px]" : "opacity-0 max-w-0"
              )}>
                <span className="font-extrabold text-white text-2xl tracking-tight whitespace-nowrap">APACS</span>
              </span>
            </Link>

            {showCollapseToggle && expanded && (
              <button
                onClick={toggleSidebar}
                title="Collapse sidebar"
                className="hidden lg:flex items-center justify-center w-9 h-9 rounded-xl bg-white/10 shadow-sm text-white hover:bg-amber-400 hover:text-black active:scale-95 transition-all duration-150 font-bold shrink-0"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
          </div>

          {showCollapseToggle && !expanded && (
            <div className="flex justify-center">
              <button
                onClick={toggleSidebar}
                title="Expand sidebar"
                className="hidden lg:flex items-center justify-center w-9 h-9 rounded-xl bg-white/10 shadow-sm text-white hover:bg-amber-400 hover:text-black active:scale-95 transition-all duration-150 font-bold"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>

        {/* Section label */}
        <div className={cn("px-4 overflow-hidden transition-[opacity,max-height] duration-300 ease-in-out", expanded ? "opacity-100 max-h-8" : "opacity-0 max-h-0")}>
          <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">Menu</p>
        </div>

        {/* Nav items */}
        <div className={cn("flex flex-col gap-1 px-3", expanded ? "items-stretch" : "items-center")}>
          {navigationItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                title={!expanded ? item.name : undefined}
                onClick={onNavigate}
                className={cn(
                  "flex items-center rounded-2xl transition-colors duration-150",
                  expanded ? "gap-3 px-4 py-3.5 text-base font-bold" : "justify-center w-12 h-12 mx-auto",
                  isActive
                    ? "bg-amber-400 text-black shadow-lg"
                    : "text-stone-300 hover:text-amber-300 hover:bg-white/10"
                )}
              >
                <item.icon className={cn("shrink-0", expanded ? "h-6 w-6" : "h-5 w-5")} strokeWidth={2.5} />
                <span className={cn(
                  "truncate transition-[opacity,max-width] duration-300 ease-in-out",
                  expanded ? "opacity-100 max-w-[180px]" : "opacity-0 max-w-0 overflow-hidden"
                )}>
                  {item.name}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Bottom help */}
      <div className={cn("flex flex-col gap-2 px-3", expanded ? "items-stretch" : "items-center")}>
        <button
          title={!expanded ? "Help / Support" : undefined}
          className={cn(
            "flex items-center rounded-2xl bg-white/10 text-white hover:bg-amber-400 hover:text-black transition-colors duration-150 font-bold",
            expanded ? "gap-3 px-4 py-3 text-base" : "justify-center w-12 h-12 mx-auto"
          )}
        >
          <HelpCircle className={cn("shrink-0", expanded ? "h-6 w-6" : "h-5 w-5")} strokeWidth={2.5} />
          <span className={cn(
            "truncate transition-[opacity,max-width] duration-300 ease-in-out",
            expanded ? "opacity-100 max-w-[180px]" : "opacity-0 max-w-0 overflow-hidden"
          )}>
            Help / Support
          </span>
        </button>
      </div>
    </div>
  );

  return (
    <div
      className={cn("h-screen w-screen overflow-hidden flex transition-colors duration-300 bg-[#d8d0c8] dark:bg-[#0d0f17]", darkMode && "dark")}
      style={{ fontFamily: "'Montserrat', 'Inter', Arial, sans-serif" }}
    >
      <div className="w-full h-full bg-[#f5f1eb] dark:bg-[#1a1d27] flex overflow-hidden transition-colors duration-300">
        {/* Desktop sidebar */}
        <aside
          className={cn(
            "hidden lg:flex flex-shrink-0 relative",
            "transition-[width] duration-300 ease-in-out will-change-[width] overflow-hidden"
          )}
          style={{ width: sidebarExpanded ? "16rem" : "6rem" }}
        >
          <div className="absolute inset-0">
            <SidebarContent />
          </div>
        </aside>

        {/* Mobile sidebar */}
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetContent side="left" className="w-72 p-0 bg-[#0a0a0a] dark:bg-black border-black/20 dark:border-white/5" aria-describedby={undefined}>
            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
            <SheetDescription className="sr-only">Main navigation sidebar</SheetDescription>
            <SidebarContent
              onNavigate={() => setIsMobileMenuOpen(false)}
              expanded={true}
              showCollapseToggle={false}
            />
          </SheetContent>
        </Sheet>

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          {/* ── Header ─────────────────────────────────────────────────────────── */}
          <header className="px-4 sm:px-6 lg:px-8 pt-4 pb-3 flex items-center justify-between gap-3 shrink-0 relative z-40">
            {/* Left: mobile menu trigger + page title only */}
            <div className="flex items-center gap-3 min-w-0">
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild className="lg:hidden">
                  <Button variant="ghost" size="icon" className="hover:bg-white dark:hover:bg-white/10 rounded-full">
                    <Menu className="h-5 w-5 text-[#1f1f1f] dark:text-stone-200" />
                  </Button>
                </SheetTrigger>
              </Sheet>

              {/* Page breadcrumb — NO user number here */}
              <div className="min-w-0">
                <p className="text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest hidden sm:block">
                  Dashboard
                </p>
                <p className="text-base sm:text-lg font-extrabold text-[#1f1f1f] dark:text-stone-100 truncate leading-tight">
                  {currentPageName}
                </p>
              </div>
            </div>

            {/* Right: search + dark mode + notifications + Company Profile */}
            <div className="flex items-center gap-2.5">
              {/* Search */}
              <div className="hidden md:flex bg-white dark:bg-white/5 px-4 py-2.5 rounded-full shadow-sm items-center gap-2 w-64 border border-transparent dark:border-white/10">
                <Search className="h-4 w-4 text-stone-400 dark:text-stone-500 shrink-0" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="outline-none bg-transparent w-full text-sm text-stone-700 dark:text-stone-200 placeholder:text-stone-400 dark:placeholder:text-stone-500"
                />
              </div>

              {/* Dark mode */}
              <Button
                onClick={toggleDarkMode}
                variant="ghost"
                size="icon"
                title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
                className="relative bg-white dark:bg-white/5 shadow-sm rounded-full hover:bg-stone-50 dark:hover:bg-white/10 dark:border dark:border-white/10 active:scale-95 transition-all duration-150"
              >
                {darkMode ? <Sun className="h-5 w-5 text-amber-300" /> : <Moon className="h-5 w-5 text-stone-600" />}
              </Button>

              {/* Notifications */}
              <NotificationPanel role="agent" />

              {/* Company Profile Panel */}
              <CompanyProfilePanel
                user={user}
                profileData={profileData}
                onChangePassword={() => setShowPasswordChangeModal(true)}
                onUpdateProfile={() => setShowProfileUpdateModal(true)}
                onLogout={handleLogout}
              />
            </div>
          </header>

          <main className="flex-1 px-4 sm:px-6 lg:px-8 pb-4 min-h-0 overflow-auto [scrollbar-width:thin] [scrollbar-color:theme(colors.stone.300)_transparent] dark:[scrollbar-color:theme(colors.stone.700)_transparent]">
            {children}
          </main>
        </div>
      </div>

      {/* ── Change Password Modal ───────────────────────────────────────────── */}
      {showPasswordChangeModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md bg-white dark:bg-[#1f232d] rounded-3xl p-6 sm:p-8 shadow-2xl border border-stone-200/50 dark:border-white/5 animate-in fade-in zoom-in-95 duration-200 relative">
            <div className="text-center mb-6">
              <span className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 mb-4 shadow-inner">
                <Lock className="h-7 w-7" strokeWidth={2.5} />
              </span>
              <h3 className="text-2xl font-extrabold text-[#1f1f1f] dark:text-white tracking-tight">
                {user?.isPasswordChanged === false ? "Mandatory Password Update" : "Update Password"}
              </h3>
              <p className="text-sm text-stone-500 dark:text-stone-400 mt-2 leading-relaxed">
                {user?.isPasswordChanged === false
                  ? "Welcome! Since this is your first login or your password has been reset, you must update your password to continue."
                  : "Protect your account by setting a new strong password below."}
              </p>
            </div>

            <div className="bg-stone-50 dark:bg-[#1a1d27] border border-stone-200 dark:border-white/5 rounded-2xl px-4 py-3 mb-4 text-sm font-medium flex items-center gap-3">
              <span className="text-stone-500 dark:text-stone-400">User Account:</span>
              <span className="text-stone-900 dark:text-white font-bold">{user?.username}</span>
            </div>

            <form onSubmit={handlePasswordChangeSubmit} className="space-y-4">
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400 group-focus-within:text-amber-500 transition-colors duration-200" />
                <input
                  type={showNewPassword ? "text" : "password"}
                  placeholder="New Password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-11 pr-10 py-3.5 text-base bg-stone-50 dark:bg-[#1a1d27] border border-stone-200 dark:border-white/5 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 rounded-2xl focus:outline-none transition-all duration-200"
                  required
                />
                <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 focus:outline-none">
                  {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>

              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400 group-focus-within:text-amber-500 transition-colors duration-200" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm New Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-11 pr-10 py-3.5 text-base bg-stone-50 dark:bg-[#1a1d27] border border-stone-200 dark:border-white/5 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 rounded-2xl focus:outline-none transition-all duration-200"
                  required
                />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 focus:outline-none">
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>

{/* Live password requirements checklist */}
{(() => {
  const pwd = newPassword;

  const rules = [
    { label: "8–15 characters", valid: pwd.length >= 8 && pwd.length <= 15 },
    { label: "One uppercase letter", valid: /[A-Z]/.test(pwd) },
    { label: "One lowercase letter", valid: /[a-z]/.test(pwd) },
    { label: "One number", valid: /[0-9]/.test(pwd) },
    { label: "One special character", valid: /[^A-Za-z0-9]/.test(pwd) },
  ];

  const passedCount = rules.filter((r) => r.valid).length;
  const strengthPct = (passedCount / rules.length) * 100;

  const strengthColor =
    strengthPct === 100
      ? "bg-emerald-500"
      : strengthPct >= 60
      ? "bg-amber-500"
      : "bg-stone-300";

  return (
    <div className="rounded-xl border border-stone-200 bg-stone-50/80 px-4 py-3.5 space-y-3">
      {/* Strength bar */}
      <div className="h-1.5 w-full bg-stone-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ease-out ${strengthColor}`}
          style={{ width: `${strengthPct}%` }}
        />
      </div>

      {/* Live checklist */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
        {rules.map((rule, i) => (
          <div
            key={i}
            className="flex items-center gap-1.5 text-xs transition-colors duration-200"
          >
            {rule.valid ? (
              <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
            ) : (
              <span className="h-3.5 w-3.5 rounded-full border-[1.5px] border-stone-300 shrink-0" />
            )}

            <span
              className={
                rule.valid
                  ? "text-stone-700 font-medium"
                  : "text-stone-400"
              }
            >
              {rule.label}
            </span>
          </div>
        ))}
      </div>

      {/* Backend-only rule */}
      <div className="border-t border-stone-200 pt-2">
        <p className="text-xs text-stone-500">
          Your new password must also be different from your current password.
        </p>
      </div>
    </div>
  );
})()}

              <div className="flex gap-3 pt-2">
                {user?.isPasswordChanged !== false && (
                  <button
                    type="button"
                    onClick={() => { setShowPasswordChangeModal(false); setNewPassword(""); setConfirmPassword(""); }}
                    className="w-1/2 py-3.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-base font-bold tracking-wider uppercase rounded-2xl transition-all duration-200 focus:outline-none"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={modalLoading}
                  className={cn(
                    "py-3.5 bg-amber-400 text-[#1f1f1f] text-base font-bold tracking-wider uppercase rounded-2xl hover:bg-amber-500 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] shadow-lg shadow-amber-400/20 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-amber-400/20 disabled:opacity-75 disabled:pointer-events-none flex items-center justify-center",
                    user?.isPasswordChanged !== false ? "w-1/2" : "w-full"
                  )}
                >
                  {modalLoading ? <RefreshCw className="h-5 w-5 animate-spin" /> : "Update Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Profile Update Request Modal ────────────────────────────────────── */}
      <ProfileUpdateModal
        isOpen={showProfileUpdateModal}
        onClose={() => setShowProfileUpdateModal(false)}
        onSuccess={() => {
          // Refresh profile data in header panel
          const token = localStorage.getItem("accessToken");
          if (token) {
            axios.get(`${AGENT_API}/agents/profile`, { headers: { Authorization: `Bearer ${token}` } })
              .then((res) => { if (res.data?.success) setProfileData(res.data.data); })
              .catch(() => { });
          }
        }}
      />
    </div>
  );
}
