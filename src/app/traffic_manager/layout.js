"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import axios from "axios";
import { useSessionHeartbeat } from "@/lib/useSessionHeartbeat";
import NotificationPanel from "@/components/NotificationPanel";
import { enforceRouteGuard } from "@/lib/roleRouting";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import {
  LayoutDashboard,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  KeyRound,
  Copy,
  CheckCheck,
  BadgeCheck,
  User,
  Briefcase,
  Mail,
  Phone,
  Eye,
  EyeOff,
  RefreshCw,
  Clock,
  Building2,
  FileText,
  Users,
  ShieldCheck,
  ShieldBan,
  BarChart3,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const AUTH_API = process.env.NEXT_PUBLIC_AUTH_API || "http://localhost:5006/api";
const ADMIN_API = process.env.NEXT_PUBLIC_ADMIN_API || "http://localhost:5005/api";

// Sidebar Navigation: Dedicated Traffic Manager Portals
const navigationItems = [
  { name: "Dashboard", href: "/traffic_manager", icon: LayoutDashboard },
  { name: "Pass Approvals", href: "/traffic_manager/passes", icon: FileText },
  { name: "Company Approvals", href: "/traffic_manager/companies", icon: Building2 },
  { name: "Bulk Pass", href: "/traffic_manager/bulk-pass", icon: Users },
  { name: "Overstay Records", href: "/traffic_manager/overstay", icon: ShieldCheck },
  { name: "Blacklist", href: "/traffic_manager/blacklist", icon: ShieldBan },
  { name: "Revenue Analytics", href: "/traffic_manager/revenue", icon: BarChart3 },
];

function UserProfilePanel({ user, onChangePassword, onLogout }) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);
  const [copiedField, setCopiedField] = useState(null);

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

  const username = user?.username || "Traffic Manager";
  const displayName = user?.name || username.split("@")[0] || "Traffic Manager";
  const role = user?.role || "Traffic Manager";
  const department = user?.departmentName || "Traffic Department";
  const email = user?.email || "—";
  const mobile = user?.mobile || user?.mobileNo || user?.phoneNumber || "—";
  const initials = displayName.substring(0, 2).toUpperCase();

  const DetailRow = ({ icon: Icon, label, value, copyKey }) => (
    <div className="flex items-start gap-3 py-2.5 border-b border-stone-100 last:border-0">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-100 text-stone-500 shrink-0 mt-0.5">
        <Icon className="h-4 w-4" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">{label}</p>
        <p className="text-sm font-semibold text-stone-800 truncate">{value || "—"}</p>
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
      <button
        onClick={() => setOpen((p) => !p)}
        aria-label="User Profile Menu"
        className="flex items-center gap-2.5 rounded-2xl px-3 py-2 bg-black/90 hover:bg-black text-white shadow-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-amber-400/40 active:scale-95"
      >
        {/* Avatar */}
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-[#1f1f1f] text-base font-extrabold shrink-0 shadow-md ring-2 ring-amber-300/30">
          {initials}
        </span>
        {/* Name + role */}
        <span className="hidden sm:flex flex-col text-left leading-tight min-w-0 pr-1">
          <span className="text-sm font-extrabold truncate max-w-[140px]">{displayName}</span>
          <span className="text-[10px] uppercase tracking-wider text-amber-400 font-bold truncate">Traffic Manager</span>
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-stone-400 transition-transform duration-200 hidden sm:block",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+10px)] z-[9999] w-80 rounded-3xl bg-white shadow-[0_8px_40px_rgba(0,0,0,0.18)] ring-1 ring-stone-200/70 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
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
                <p className="text-base font-extrabold text-white leading-tight truncate">{displayName}</p>
                <p className="text-xs text-stone-400 font-mono mt-0.5 truncate">{username}</p>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold mt-1.5 bg-emerald-100 text-emerald-700">
                  <BadgeCheck className="h-3 w-3" />
                  Active Session
                </span>
              </div>
              <button onClick={() => setOpen(false)} className="text-white/50 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors shrink-0">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Detail rows */}
          <div className="px-4 pt-2 pb-1 max-h-[300px] overflow-y-auto [scrollbar-width:thin]">
            <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-2 mt-2">Account Profile</p>
            <DetailRow icon={User} label="Login ID" value={username} copyKey="lid" />
            <DetailRow icon={Briefcase} label="Role" value={role} copyKey="role" />
            <DetailRow icon={Building2} label="Department" value={department} copyKey="dept" />
            <DetailRow icon={Mail} label="Email" value={email} copyKey="email" />
            <DetailRow icon={Phone} label="Mobile" value={mobile} copyKey="mob" />
          </div>

          {/* Actions */}
          <div className="p-3 border-t border-stone-100 space-y-1.5">
            <button
              onClick={() => { setOpen(false); onChangePassword(); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors"
            >
              <KeyRound className="h-4 w-4 shrink-0 text-amber-600" />
              Change Password
            </button>
            <button
              onClick={() => { setOpen(false); onLogout(); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
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

export default function TrafficManagerLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [modalLoading, setModalLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [currentTime, setCurrentTime] = useState("");

  const [sidebarExpanded, setSidebarExpanded] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("tm-sidebar") !== "collapsed";
  });

  const toggleSidebar = () => {
    setSidebarExpanded((prev) => {
      const next = !prev;
      try { localStorage.setItem("tm-sidebar", next ? "expanded" : "collapsed"); } catch {}
      return next;
    });
  };

  useSessionHeartbeat();

  // Route protection: strictly validates Traffic Manager access
  useEffect(() => {
    enforceRouteGuard("traffic_manager", router, setUser, setShowPasswordChangeModal);
  }, [router]);

  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(
        new Date().toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const handlePasswordChangeSubmit = async (e) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      toast.warning("Please fill in all fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.warning("Passwords do not match.");
      return;
    }
    setModalLoading(true);
    try {
      const token = localStorage.getItem("accessToken");
      const res = await axios.post(
        `${ADMIN_API}/user/change-password`,
        { loginId: user?.username, newPassword, confirmPassword },
        { headers: { Authorization: `Bearer ${token}` }, validateStatus: (s) => s < 500 }
      );
      if (res.status >= 200 && res.status < 300 && res.data?.success) {
        toast.success("Password Updated Successfully");
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
    } catch {}
    finally {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      router.push("/");
    }
  };

  const getHeaderInfo = () => {
    if (pathname === "/traffic_manager") {
      return {
        eyebrow: "Operations Command",
        title: "Traffic Manager Dashboard",
      };
    }
    if (pathname?.startsWith("/traffic_manager/passes")) {
      return {
        eyebrow: "Pass Management",
        title: "Pass Approvals & Oversight",
      };
    }
    if (pathname?.startsWith("/traffic_manager/companies")) {
      return {
        eyebrow: "Corporate Verification",
        title: "Company Approvals",
      };
    }
    if (pathname?.startsWith("/traffic_manager/bulk-pass")) {
      return {
        eyebrow: "Batch Operations",
        title: "Bulk Pass Management",
      };
    }
    if (pathname?.startsWith("/traffic_manager/overstay")) {
      return {
        eyebrow: "Compliance & Security",
        title: "Overstay Monitoring",
      };
    }
    if (pathname?.startsWith("/traffic_manager/blacklist")) {
      return {
        eyebrow: "Security Enforcement",
        title: "Blacklist Management",
      };
    }
    if (pathname?.startsWith("/traffic_manager/revenue")) {
      return {
        eyebrow: "Financial Analytics",
        title: "Revenue & Collections",
      };
    }
    return {
      eyebrow: "Port Operations",
      title: "Traffic Manager Portal",
    };
  };

  const headerInfo = getHeaderInfo();

  if (!user) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-slate-900 shadow-2xl border border-slate-800">
          <span className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-orange-500 text-white shrink-0">
            <LayoutDashboard className="h-4 w-4" />
            <span className="absolute inset-0 rounded-xl ring-2 ring-orange-400/60 animate-ping" />
          </span>
          <span className="text-sm font-bold text-slate-200">Loading Traffic Manager Portal</span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-bounce [animation-delay:-0.3s]" />
            <span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-bounce [animation-delay:-0.15s]" />
            <span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-bounce" />
          </span>
        </div>
      </div>
    );
  }

  const SidebarContent = ({ onNavigate, expanded = sidebarExpanded, showCollapseToggle = true }) => (
    <div className="h-full flex flex-col justify-between py-8 bg-[#0a0a0a] dark:bg-black border-r border-black/20 dark:border-white/5 text-white overflow-hidden">
      <div className="flex flex-col gap-6">
        {/* Brand row */}
        <div className="flex flex-col gap-2 px-4">
          <div className={cn("flex items-center", expanded ? "justify-between" : "justify-center")}>
            <Link href="/traffic_manager" className="flex items-center gap-3 group min-w-0" onClick={onNavigate}>
              <span className="flex items-center justify-center w-12 h-12 rounded-2xl overflow-hidden bg-[#ff6b00] shadow-lg shadow-orange-600/20 shrink-0 group-hover:scale-105 transition-transform duration-200">
                <Image src="/logo1.png" alt="APACS Logo" width={48} height={48} className="w-full h-full object-contain" />
              </span>
              <span className={cn(
                "flex flex-col leading-tight overflow-hidden transition-[opacity,max-width] duration-300 ease-in-out",
                expanded ? "opacity-100 max-w-[160px]" : "opacity-0 max-w-0"
              )}>
                <span className="font-extrabold text-white text-2xl tracking-tight whitespace-nowrap">APACS</span>
                <span className="text-[10px] uppercase tracking-wider text-amber-400 font-bold whitespace-nowrap">Traffic Manager</span>
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
            const isActive =
              item.href === "/traffic_manager"
                ? pathname === "/traffic_manager"
                : pathname === item.href || pathname?.startsWith(`${item.href}/`);
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
      className="h-screen w-screen overflow-hidden flex transition-colors duration-300 bg-[#d8d0c8]"
      style={{ fontFamily: "'Plus Jakarta Sans', 'Montserrat', 'Inter', Arial, sans-serif" }}
    >
      <div className="w-full h-full bg-[#f5f1eb] flex overflow-hidden transition-colors duration-300">
        {/* Desktop Stationary Dark Sidebar */}
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
          <SheetContent side="left" className="w-72 p-0 bg-[#0a0a0a] border-black/20" aria-describedby={undefined}>
            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
            <SheetDescription className="sr-only">Main navigation sidebar</SheetDescription>
            <SidebarContent
              onNavigate={() => setIsMobileMenuOpen(false)}
              expanded={true}
              showCollapseToggle={false}
            />
          </SheetContent>
        </Sheet>

        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          {/* ── Header ─────────────────────────────────────────────────────────── */}
          <header className="px-4 sm:px-6 lg:px-8 pt-4 pb-3 flex items-center justify-between gap-3 shrink-0 relative z-40">
            {/* Left: mobile menu trigger + page title */}
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                aria-label="Open Navigation Menu"
                className="lg:hidden p-2 rounded-xl hover:bg-white text-[#1f1f1f] active:scale-95 transition-all shrink-0"
              >
                <Menu className="h-5 w-5" />
              </button>

              {/* Page breadcrumb */}
              <div className="min-w-0">
                <p className="text-xs font-bold text-stone-400 uppercase tracking-widest hidden sm:block">
                  Traffic Manager
                </p>
                <p className="text-base sm:text-lg font-extrabold text-[#1f1f1f] truncate leading-tight">
                  {headerInfo.title}
                </p>
              </div>
            </div>

            {/* Right: clock + notifications + profile */}
            <div className="flex items-center gap-2.5">
              {currentTime && (
                <div className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-full bg-white shadow-sm border border-transparent text-stone-700">
                  <Clock className="h-3.5 w-3.5 text-amber-500" />
                  <span className="text-xs font-mono font-bold">{currentTime}</span>
                </div>
              )}

              <NotificationPanel role="approver" />

              <UserProfilePanel
                user={user}
                onChangePassword={() => setShowPasswordChangeModal(true)}
                onLogout={handleLogout}
              />
            </div>
          </header>

          {/* Main Content Area */}
          <main className="flex-1 px-4 sm:px-6 lg:px-8 pb-4 min-h-0 overflow-auto [scrollbar-width:thin] [scrollbar-color:theme(colors.stone.300)_transparent]">
            {children}
          </main>
        </div>
      </div>

      {/* Mandatory / Account Password Change Modal */}
      {showPasswordChangeModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-stone-200/50 animate-in zoom-in-95 duration-200">
            {user?.isPasswordChanged !== false && (
              <button
                onClick={() => setShowPasswordChangeModal(false)}
                className="absolute right-5 top-5 p-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            )}

            <div className="flex items-center gap-3 mb-5">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 shadow-sm shrink-0">
                <KeyRound className="h-6 w-6" />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-base sm:text-lg font-black text-[#1f1f1f] truncate">
                  {user?.isPasswordChanged === false ? "Mandatory Password Change" : "Change Account Password"}
                </h3>
                <p className="text-xs text-stone-500 truncate sm:whitespace-normal">
                  {user?.isPasswordChanged === false
                    ? "First-time login: update default password to continue."
                    : "Enter your new credentials below."}
                </p>
              </div>
            </div>

            <form onSubmit={handlePasswordChangeSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-semibold text-stone-800 placeholder-stone-400 focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-amber-500/10 transition-all duration-200"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((p) => !p)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-semibold text-stone-800 placeholder-stone-400 focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-amber-500/10 transition-all duration-200"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((p) => !p)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                {user?.isPasswordChanged !== false && (
                  <button
                    type="button"
                    onClick={() => setShowPasswordChangeModal(false)}
                    className="flex-1 py-3 rounded-2xl border border-stone-200 font-bold text-stone-600 hover:bg-stone-50 transition-colors text-sm"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="flex-1 py-3 rounded-2xl bg-amber-400 font-bold text-black shadow-lg shadow-amber-400/30 hover:bg-amber-500 active:scale-95 transition-all text-sm flex items-center justify-center gap-2"
                >
                  {modalLoading && <RefreshCw className="h-4 w-4 animate-spin" />}
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
