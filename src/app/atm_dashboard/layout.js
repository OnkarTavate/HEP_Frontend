"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import axios from "axios";
import { useSessionHeartbeat } from "@/lib/useSessionHeartbeat";
import { enforceRouteGuard } from "@/lib/roleRouting";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import {
  LogOut,
  Menu,
  HelpCircle,
  ShieldBan,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  ChevronRight as ChevronCrumb,
  KeyRound,
  ChevronDown,
  User,
  Briefcase,
  Building2,
  X,
  BadgeCheck,
  CheckCheck,
  Copy,
  Lock,
  Eye,
  EyeOff,
  RefreshCw,
  Mail,
  Phone,
  BarChart2,
  Settings,
  CheckCircle,
  IndianRupee,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const AUTH_API = process.env.NEXT_PUBLIC_AUTH_API;
const ADMIN_API = process.env.NEXT_PUBLIC_ADMIN_API || "http://localhost:5005/api";

const navigationItems = [
  {
    name: "Blacklist Management",
    short: "Blacklist",
    href: "/atm_dashboard",
    icon: ShieldBan,
    description: "Manage blacklisted vehicles, persons, drivers & companies",
  },
  {
    name: "Unblacklist Approvals",
    short: "Approvals",
    href: "/atm_dashboard/unblacklist",
    icon: ShieldCheck,
    description: "Review and approve unblacklist requests",
  },
  {
    name: "Overstay Charges",
    short: "Overstay",
    href: "/atm_dashboard/overstay",
    icon: ShieldBan,
    description: "Detect expired pass holders & levy overstay fines",
  },
  {
    name: "Blacklist Reports",
    short: "Reports",
    href: "/atm_dashboard/reports",
    icon: BarChart2,
    description: "View and export historical blacklist records",
  },
  {
    name: "Penalty Config",
    short: "Config",
    href: "/atm_dashboard/penalty_config",
    icon: Settings,
    description: "Configure default penalty amounts per reason code",
  },
  {
    name: "HEP Rate Config",
    short: "HEP Rates",
    href: "/atm_dashboard/hep_rates",
    icon: IndianRupee,
    description: "Revise yearly Harbour Entry Permit charges (Individual / Vehicle / Cargo)",
  },
];

function UserProfilePanel({ user, departmentName, onChangePassword, onLogout }) {
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

  const username = user?.username || "ATM Admin";
  const displayName = user?.name || username.split("@")[0] || "ATM Admin";
  const role = user?.role || "Officer";
  const department = user?.departmentName || departmentName || "ATM Department";
  const email = user?.email || "—";
  const mobile = user?.mobile || user?.mobileNo || "—";
  const initials = displayName.substring(0, 2).toUpperCase();

  const statusMeta = { label: "Active", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300" };

  const DetailRow = ({ icon: Icon, label, value, copyKey }) => (
    <div className="flex items-start gap-3 py-2.5 border-b border-stone-100 dark:border-white/5 last:border-0">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-100 dark:bg-white/5 text-stone-500 dark:text-stone-400 shrink-0 mt-0.5">
        <Icon className="h-4 w-4" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider">{label}</p>
        <p className="text-sm font-semibold text-stone-800 dark:text-stone-100 truncate">{value || "\u2014"}</p>
      </div>
      {value && value !== "\u2014" && (
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
        onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-2.5 rounded-2xl px-3 py-2 bg-black/90 hover:bg-black text-white dark:bg-white/5 dark:hover:bg-white/10 dark:border dark:border-white/10 shadow-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-orange-500/40 active:scale-95 cursor-pointer"
      >
        {/* Avatar */}
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-[#1f1f1f] text-base font-extrabold shrink-0 shadow-md ring-2 ring-amber-300/30">
          {initials}
        </span>
        {/* Name + role */}
        <span className="hidden sm:flex flex-col text-left leading-tight min-w-0 pr-1">
          <span className="text-sm font-extrabold truncate max-w-[140px] text-white">{displayName}</span>
          <span className="text-[10px] uppercase tracking-wider text-orange-400 font-bold truncate">{role}</span>
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
              <div className="min-w-0 flex-1 text-left">
                <p className="text-base font-extrabold text-white leading-tight truncate">{displayName}</p>
                <p className="text-xs text-stone-400 font-mono mt-0.5 truncate">{username}</p>
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
          <div className="px-4 pt-2 pb-1 max-h-[340px] overflow-y-auto [scrollbar-width:thin] text-left">
            <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500 mb-2 mt-2">Account Profile</p>
            <DetailRow icon={User}      label="Login ID"   value={username}   copyKey="lid" />
            <DetailRow icon={Briefcase} label="Role"       value={role}       copyKey="role" />
            <DetailRow icon={Building2} label="Department" value={department} copyKey="dept" />
            <DetailRow icon={Mail}      label="Email"      value={email}      copyKey="email" />
            <DetailRow icon={Phone}     label="Mobile"     value={mobile}     copyKey="mob" />
          </div>

          {/* Actions */}
          <div className="p-3 border-t border-stone-100 dark:border-white/5 space-y-1.5">
            <button
              onClick={() => { setOpen(false); onChangePassword(); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-stone-700 dark:text-stone-200 hover:bg-orange-50 dark:hover:bg-orange-400/10 hover:text-orange-700 dark:hover:text-orange-300 transition-colors cursor-pointer text-left"
            >
              <KeyRound className="h-4 w-4 shrink-0" />
              Change Password
            </button>
            <button
              onClick={() => { setOpen(false); onLogout(); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-400/10 transition-colors cursor-pointer text-left"
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

export default function ATMDashboardLayout({ children }) {
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

  // Read from localStorage synchronously on first render to avoid flicker
  const [sidebarExpanded, setSidebarExpanded] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("atm-sidebar") !== "collapsed";
  });

  const toggleSidebar = () => {
    setSidebarExpanded((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("atm-sidebar", next ? "expanded" : "collapsed");
      } catch {}
      return next;
    });
  };

  useSessionHeartbeat();

  useEffect(() => {
    enforceRouteGuard("atm_dashboard", router, setUser, setShowPasswordChangeModal);
  }, [router]);

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
        toast.success("Password Updated Successfully", {
          description: "Your default password has been successfully updated.",
        });
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
        await axios.post(
          `${AUTH_API}/auth/logout`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
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
        className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-red-950 flex items-center justify-center"
        style={{ fontFamily: "'Montserrat', 'Inter', Arial, sans-serif" }}
      >
        <div className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-white/10 backdrop-blur-xl ring-1 ring-white/10 shadow-xl">
          <span className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-red-500 text-white shrink-0">
            <ShieldBan className="h-5 w-5" strokeWidth={2.5} />
            <span className="absolute inset-0 rounded-xl ring-2 ring-red-400/60 animate-ping" />
          </span>
          <span className="text-sm font-semibold text-stone-200 tracking-wide">
            Loading ATM Dashboard
          </span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-bounce [animation-delay:-0.3s]" />
            <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-bounce [animation-delay:-0.15s]" />
            <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-bounce" />
          </span>
        </div>
      </div>
    );
  }

  const activeItem =
    navigationItems.find((item) => item.href === pathname) || navigationItems[0];
  const displayName = user?.username ? user.username.split("@")[0] : "ATM User";
  const initial = user?.username?.charAt(0)?.toUpperCase() || "A";

  const SidebarContent = ({
    onNavigate,
    expanded = sidebarExpanded,
    showCollapseToggle = true,
  }) => (
    <div className="h-full flex flex-col justify-between py-8 bg-[#0a0a0a] text-white overflow-hidden">
      <div className="flex flex-col gap-6">
        {/* Brand row */}
        <div className="flex flex-col gap-2 px-4">
          <div className={cn("flex items-center", expanded ? "justify-between" : "justify-center")}>
            <Link href="/atm_dashboard" className="flex items-center gap-3 group min-w-0" onClick={onNavigate}>
              <span className="flex items-center justify-center w-12 h-12 rounded-2xl overflow-hidden bg-[#ff6b00] shadow-lg shadow-orange-600/20 shrink-0 group-hover:scale-105 transition-transform duration-200">
                <Image src="/logo1.png" alt="Chennai Port Logo" width={48} height={48} className="w-full h-full object-contain" />
              </span>
              <span className={cn(
                "flex flex-col leading-tight overflow-hidden transition-[opacity,max-width] duration-300 ease-in-out",
                expanded ? "opacity-100 max-w-[160px]" : "opacity-0 max-w-0"
              )}>
                <span className="font-extrabold text-white text-2xl tracking-tight whitespace-nowrap">APACS</span>
                <span className="text-[10px] uppercase tracking-wider text-amber-400 font-bold whitespace-nowrap">ATM Portal</span>
              </span>
            </Link>

            {showCollapseToggle && expanded && (
              <button
                onClick={toggleSidebar}
                title="Collapse sidebar"
                aria-label="Collapse sidebar"
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
                aria-label="Expand sidebar"
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
                aria-current={isActive ? "page" : undefined}
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
          <SheetContent
            side="left"
            className="w-72 p-0 bg-[#0a0a0a] border-black/20 text-white"
            aria-describedby={undefined}
          >
            <SheetTitle className="sr-only">ATM Portal Navigation</SheetTitle>
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
          {/* Header */}
          <header className="px-4 sm:px-6 lg:px-8 pt-4 pb-3 flex items-center justify-between gap-3 shrink-0 relative z-40">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                aria-label="Open menu"
                className="lg:hidden p-2 rounded-xl hover:bg-white text-[#1f1f1f] active:scale-95 transition-all shrink-0"
              >
                <Menu className="h-5 w-5" />
              </button>

              <div className="min-w-0">
                <p className="text-xs font-bold text-stone-400 uppercase tracking-widest hidden sm:block">ATM Portal</p>
                <p className="text-base sm:text-lg font-extrabold text-[#1f1f1f] truncate leading-tight">
                  {activeItem.name}
                </p>
              </div>
            </div>

            <UserProfilePanel
              user={user}
              departmentName="ATM Pass Section"
              onChangePassword={() => setShowPasswordChangeModal(true)}
              onLogout={handleLogout}
            />
          </header>

          <main className="flex-1 px-4 sm:px-6 lg:px-8 pb-4 min-h-0 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:theme(colors.stone.300)_transparent]">
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
                <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-650 focus:outline-none">
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
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-650 focus:outline-none">
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
    </div>
  );
}
