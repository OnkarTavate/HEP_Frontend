"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { useSessionHeartbeat } from "@/lib/useSessionHeartbeat";
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
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  Ship,
  LogOut,
  Menu,
  Bell,
  Lock,
  FileText,
  Building2,
  ChevronLeft,
  ChevronRight,
  ShieldBan,
  ShieldCheck,
  Sun,
  Moon,
  Eye,
  EyeOff,
  RefreshCw,
  KeyRound,
  ChevronDown,
  Copy,
  CheckCheck,
  BadgeCheck,
  Users,
  X,
  User,
  Briefcase,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const AUTH_API = process.env.NEXT_PUBLIC_AUTH_API;
const ADMIN_API = process.env.NEXT_PUBLIC_ADMIN_API;

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

  const username = user?.username || "Traffic Admin";
  const displayName = username.split("@")[0] || "Traffic Admin";
  const role = user?.role || "Officer";
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
        <div className="absolute right-0 top-[calc(100%+10px)] z-[200] w-80 rounded-3xl bg-white dark:bg-[#1f232d] shadow-[0_8px_40px_rgba(0,0,0,0.18)] ring-1 ring-stone-200/70 dark:ring-white/10 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
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
            <DetailRow icon={User}      label="Login ID"     value={username}       copyKey="lid" />
            <DetailRow icon={Briefcase} label="Role"         value={role}           copyKey="role" />
            <DetailRow icon={Building2} label="Department"   value={departmentName} copyKey="dept" />
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

export default function TrafficLayout({ children }) {
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

  // Read synchronously on first render — eliminates the setTimeout flicker
  const [sidebarExpanded, setSidebarExpanded] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("traffic-sidebar") !== "collapsed";
  });

  const toggleSidebar = () => {
    setSidebarExpanded((prev) => {
      const next = !prev;
      try { localStorage.setItem("traffic-sidebar", next ? "expanded" : "collapsed"); } catch { }
      return next;
    });
  };

  // Dark-mode state
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("theme") === "dark";
  });

  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      const next = !prev;
      localStorage.setItem("theme", next ? "dark" : "light");
      return next;
    });
  };

  useSessionHeartbeat();

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      const role = String(parsedUser.role || "").toLowerCase().trim();
      const dept = String(parsedUser.departmentName || "").toLowerCase().trim();
      const isAdmin = role === "admin" || role === "administrator";
      if (isAdmin) { router.push("/admin"); return; }
      const isTrafficApprover = (role === "approval" && dept.includes("traffic")) || role.includes("traffic");
      if (!isTrafficApprover) { alert("Unauthorized Access: Traffic Department Only."); router.push("/"); return; }
      setUser(parsedUser);
      if (parsedUser.isPasswordChanged === false) setShowPasswordChangeModal(true);
    } else {
      router.push("/");
    }
  }, [router]);

  const handlePasswordChangeSubmit = async (e) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) { toast.warning("Please fill in all fields."); return; }
    if (newPassword !== confirmPassword) { toast.warning("Passwords do not match."); return; }
    setModalLoading(true);
    try {
      const token = localStorage.getItem("accessToken");
      const res = await axios.post(
        `${ADMIN_API}/user/change-password`,
        { loginId: user?.username, newPassword, confirmPassword },
        { headers: { Authorization: `Bearer ${token}` }, validateStatus: (s) => s < 500 }
      );
      if (res.status >= 200 && res.status < 300 && res.data?.success) {
        toast.success("Password Updated Successfully", { description: "Your default password has been successfully updated." });
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

  if (!user) return <div className="p-12 text-center">Loading...</div>;

  const navigationItems = [
    { name: "Pass Approvals", href: "/traffic_approval", icon: FileText },
    { name: "Company Approvals", href: "/traffic_approval/companies", icon: Building2 },
    { name: "Blacklist Management", href: "/traffic_approval/blacklist", icon: ShieldBan },
    // { name: "Unblacklist Approvals", href: "/traffic_approval/unblacklist", icon: ShieldCheck },
    { name: "Bulk Pass", href: "/traffic_approval/bulk-pass", icon: Users },
  ];

  const SidebarContent = ({ onNavigate, expanded = sidebarExpanded, showCollapseToggle = true }) => (
    <div className="h-full flex flex-col justify-between py-6 bg-slate-900 text-white overflow-hidden">
      <div className="flex flex-col gap-6">
        {/* Brand row — expanded: row with space-between. collapsed: logo centered, toggle below */}
        <div className="flex flex-col gap-2 px-4">
          <div className={cn("flex items-center", expanded ? "justify-between" : "justify-center")}>
            <Link href="/traffic_approval" className="flex items-center gap-3 group min-w-0" onClick={onNavigate}>
              <span className="flex items-center justify-center w-11 h-11 rounded-xl bg-[#ff6b00] shadow-lg shadow-orange-600/20 shrink-0 group-hover:scale-105 transition-transform duration-200">
                <Ship className="h-6 w-6 text-white" />
              </span>
              <span className={cn(
                "flex flex-col leading-tight overflow-hidden transition-[opacity,max-width] duration-300 ease-in-out",
                expanded ? "opacity-100 max-w-[160px]" : "opacity-0 max-w-0"
              )}>
                <span className="font-extrabold text-white text-lg tracking-tight whitespace-nowrap">Traffic Dept</span>
                <span className="text-xs uppercase tracking-wider text-orange-400 font-bold whitespace-nowrap">Port Approvals</span>
              </span>
            </Link>

            {showCollapseToggle && expanded && (
              <button
                onClick={toggleSidebar}
                title="Collapse sidebar"
                className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg bg-white/10 text-white hover:bg-[#ff6b00] hover:text-white active:scale-95 transition-all duration-150 font-bold shadow-md shrink-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
          </div>

          {showCollapseToggle && !expanded && (
            <div className="flex justify-center">
              <button
                onClick={toggleSidebar}
                title="Expand sidebar"
                className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg bg-white/10 text-white hover:bg-[#ff6b00] hover:text-white active:scale-95 transition-all duration-150 font-bold shadow-md"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* Section label */}
        <div className={cn("px-4 overflow-hidden transition-[opacity,max-height] duration-300 ease-in-out", expanded ? "opacity-100 max-h-8" : "opacity-0 max-h-0")}>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Task Menu</p>
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
                  "flex items-center rounded-xl transition-colors duration-150 group",
                  expanded ? "gap-3 px-3 py-2.5" : "justify-center w-11 h-11 mx-auto",
                  isActive
                    ? "bg-[#ff6b00] text-white font-bold shadow-lg shadow-orange-600/20"
                    : "text-slate-400 hover:text-white hover:bg-white/8"
                )}
              >
                <item.icon className="shrink-0 h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
                <span className={cn(
                  "text-sm font-medium truncate transition-[opacity,max-width] duration-300 ease-in-out",
                  expanded ? "opacity-100 max-w-[180px]" : "opacity-0 max-w-0 overflow-hidden"
                )}>
                  {item.name}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <div
      className={cn("h-screen w-screen overflow-hidden flex transition-colors duration-300 bg-slate-100 dark:bg-slate-950", darkMode && "dark")}
      style={{ fontFamily: "'Montserrat', 'Inter', Arial, sans-serif" }}
    >
      <div className="w-full h-full bg-slate-50 dark:bg-[#11131e] flex overflow-hidden transition-colors duration-300">
        {/* Desktop sidebar — smooth width transition via CSS, GPU-composited */}
        <aside
          className={cn(
            "hidden lg:flex flex-shrink-0 relative border-r border-slate-800 bg-slate-900 shadow-xl shadow-black/30",
            "transition-[width] duration-300 ease-in-out will-change-[width] overflow-hidden"
          )}
          style={{ width: sidebarExpanded ? "18rem" : "5rem" }}
        >
          <div className="absolute inset-0">
            <SidebarContent />
          </div>
        </aside>

        {/* Mobile sidebar */}
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetContent side="left" className="w-72 p-0 bg-slate-900 border-slate-800 text-white">
            <SidebarContent
              onNavigate={() => setIsMobileMenuOpen(false)}
              expanded={true}
              showCollapseToggle={false}
            />
          </SheetContent>
        </Sheet>

        {/* Main layout wrapper */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          {/* Header */}
          <header className="px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-3 shrink-0 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border-b border-slate-200/50 dark:border-white/5 transition-colors duration-300 relative z-50">
            <div className="flex items-center gap-3 min-w-0">
              <Button
                onClick={() => setIsMobileMenuOpen(true)}
                variant="ghost"
                size="icon"
                className="hover:bg-white dark:hover:bg-white/10 rounded-full text-slate-800 dark:text-stone-200 lg:hidden"
              >
                <Menu className="h-5 w-5 text-slate-800 dark:text-stone-200" />
              </Button>

              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#1f1f1f] dark:text-stone-100 truncate">
                  Traffic Department Approval Dashboard
                </h1>
                <p className="text-stone-500 dark:text-stone-400 text-xs mt-1 hidden sm:block">Manage Permits and Company Registrations</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                onClick={toggleDarkMode}
                variant="ghost"
                size="icon"
                title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
                className="relative bg-white dark:bg-white/5 dark:border dark:border-white/10 shadow-sm rounded-full hover:bg-stone-50 dark:hover:bg-white/10 active:scale-95 transition-all duration-150"
              >
                {darkMode ? <Sun className="h-5 w-5 text-amber-300" /> : <Moon className="h-5 w-5 text-stone-600" />}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="relative bg-white dark:bg-white/5 dark:border dark:border-white/10 shadow-sm rounded-full hover:bg-stone-50 dark:hover:bg-white/10 active:scale-95 transition-all duration-150"
              >
                <Bell className="h-5 w-5 text-stone-600 dark:text-stone-300" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-orange-500 rounded-full" />
              </Button>

              <UserProfilePanel
                user={user}
                departmentName="Traffic Department"
                onChangePassword={() => setShowPasswordChangeModal(true)}
                onLogout={handleLogout}
              />
            </div>
          </header>

          <main className="flex-1 p-4 lg:p-8 pb-6 min-h-0 overflow-y-auto scroll-smooth [scrollbar-width:thin] [scrollbar-color:theme(colors.stone.300)_transparent] dark:[scrollbar-color:theme(colors.stone.700)_transparent]">
            {children}
          </main>
        </div>
      </div>

      {/* Change Password Modal */}
      {showPasswordChangeModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md bg-white dark:bg-[#1f232d] rounded-3xl p-6 sm:p-8 shadow-2xl border border-stone-200/50 dark:border-white/5 animate-in fade-in zoom-in-95 duration-200 relative">
            <div className="text-center mb-6">
              <span className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-orange-100 dark:bg-orange-500/10 text-[#ff6b00] mb-4 shadow-inner">
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

            <div className="bg-stone-50 dark:bg-[#1a1d27] border border-stone-200 dark:border-white/5 rounded-2xl px-4 py-3 mb-4 text-sm text-stone-700 dark:text-stone-300 font-medium flex items-center gap-3">
              <span className="text-stone-500 dark:text-stone-400">User Account:</span>
              <span className="text-stone-900 dark:text-white font-bold">{user?.username}</span>
            </div>

            <form onSubmit={handlePasswordChangeSubmit} className="space-y-4">
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400 dark:text-stone-500 group-focus-within:text-[#ff6b00] transition-colors duration-200" />
                <input
                  type={showNewPassword ? "text" : "password"}
                  placeholder="New Password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-11 pr-10 py-3.5 text-base bg-stone-50 dark:bg-[#1a1d27] border border-stone-200 dark:border-white/5 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 focus:border-[#ff6b00] focus:ring-4 focus:ring-[#ff6b00]/10 rounded-2xl focus:outline-none transition-all duration-200"
                  required
                />
                <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 focus:outline-none">
                  {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>

              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400 dark:text-stone-500 group-focus-within:text-[#ff6b00] transition-colors duration-200" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm New Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-11 pr-10 py-3.5 text-base bg-stone-50 dark:bg-[#1a1d27] border border-stone-200 dark:border-white/5 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 focus:border-[#ff6b00] focus:ring-4 focus:ring-[#ff6b00]/10 rounded-2xl focus:outline-none transition-all duration-200"
                  required
                />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 focus:outline-none">
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>

              <div className="bg-orange-500/5 rounded-2xl p-4 border border-orange-500/10 space-y-1 text-xs text-orange-700 dark:text-orange-400">
                <p className="font-bold mb-1">Password Requirements:</p>
                <p>• Must be between 8 and 15 characters long.</p>
                <p>• Must contain at least one uppercase &amp; one lowercase letter.</p>
                <p>• Must contain at least one number.</p>
                <p>• Must contain at least one special character.</p>
              </div>

              <div className="flex gap-3 pt-2">
                {user?.isPasswordChanged !== false && (
                  <button
                    type="button"
                    onClick={() => { setShowPasswordChangeModal(false); setNewPassword(""); setConfirmPassword(""); }}
                    className="w-1/2 py-3.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-base font-bold tracking-wider uppercase rounded-2xl transition-all duration-200 focus:outline-none cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={modalLoading}
                  className={cn(
                    "py-3.5 bg-[#ff6b00] text-white text-base font-bold tracking-wider uppercase rounded-2xl hover:bg-orange-600 hover:shadow-orange-500/30 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] shadow-lg shadow-orange-500/20 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-orange-500/20 disabled:opacity-75 disabled:pointer-events-none flex items-center justify-center cursor-pointer",
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
