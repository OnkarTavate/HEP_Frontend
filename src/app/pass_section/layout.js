"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import axios from "axios";
import { useSessionHeartbeat } from "@/lib/useSessionHeartbeat";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  LayoutDashboard,
  FileText,
  Users,
  ShieldBan,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu,
  HelpCircle,
  Lock,
  Eye,
  EyeOff,
  RefreshCw,
  X,
  BadgeCheck,
  KeyRound,
  User,
  Mail,
  Phone,
  Briefcase,
  Building2,
  Copy,
  CheckCheck,
  ChevronDown,
  Bell,
} from "lucide-react";

const AUTH_API = process.env.NEXT_PUBLIC_AUTH_API;
const ADMIN_API = process.env.NEXT_PUBLIC_ADMIN_API || "http://localhost:5005/api";

const navigationItems = [
  { name: "Management Dashboard", short: "Dashboard", href: "/pass_section", icon: LayoutDashboard, description: "Live overview of all pass activities" },
  { name: "Pass Approvals", short: "Approvals", href: "/pass_section/approvals", icon: FileText, description: "Review and approve pass applications" },
  { name: "Company Registrations", short: "Companies", href: "/pass_section/companies", icon: Building2, description: "Manage company registration requests" },
  { name: "Blacklist Management", short: "Blacklist", href: "/pass_section/blacklist", icon: ShieldBan, description: "Manage blacklisted entities" },
  { name: "Team Performance", short: "Team", href: "/pass_section/team", icon: Users, description: "Monitor team performance metrics" },
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

  const username = user?.username || "PSM001";
  const displayName = user?.name || username;
  const role = user?.role || "Pass Section Manager";
  const department = user?.departmentName || "Pass Section";
  const initials = username.substring(0, 2).toUpperCase();

  const DetailRow = ({ icon: Icon, label, value, copyKey }) => (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-100 last:border-0">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-500 shrink-0 mt-0.5">
        <Icon className="h-4 w-4" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
        <p className="text-sm font-semibold text-gray-800 truncate">{value || "—"}</p>
      </div>
      {value && value !== "—" && (
        <button onClick={() => copyField(value, copyKey)} className="shrink-0 p-1 rounded text-gray-400 hover:text-blue-600 transition-colors">
          {copiedField === copyKey ? <CheckCheck className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      )}
    </div>
  );

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-2.5 rounded-xl px-3 py-2 bg-[#0a1e4d] hover:bg-[#0d2660] text-white shadow-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-400/40 active:scale-95"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-sm font-extrabold shrink-0 shadow-md">
          {initials}
        </span>
        <span className="hidden sm:flex flex-col text-left leading-tight min-w-0 pr-1">
          <span className="text-sm font-extrabold truncate max-w-[120px]">{username}</span>
          <span className="text-[10px] uppercase tracking-wider text-blue-300 font-bold truncate">Pass Section Manager</span>
        </span>
        <ChevronDown className={cn("h-4 w-4 text-blue-300 transition-transform duration-200 hidden sm:block", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+10px)] z-[9999] w-80 rounded-2xl bg-white shadow-[0_8px_40px_rgba(0,0,0,0.15)] ring-1 ring-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-[#0a1e4d] to-[#1a3a8f] px-5 py-4 relative overflow-hidden">
            <div className="relative flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 text-white text-lg font-extrabold shrink-0 shadow-lg ring-2 ring-white/20">
                {initials}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-base font-extrabold text-white leading-tight truncate">{displayName}</p>
                <p className="text-xs text-blue-300 font-mono mt-0.5 truncate">{username}</p>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold mt-1 bg-green-500/20 text-green-300">
                  <BadgeCheck className="h-3 w-3" /> Active
                </span>
              </div>
              <button onClick={() => setOpen(false)} className="text-white/50 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors shrink-0">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="px-4 pt-2 pb-1 max-h-[260px] overflow-y-auto [scrollbar-width:thin]">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 mt-2">Account Profile</p>
            <DetailRow icon={User} label="Login ID" value={username} copyKey="lid" />
            <DetailRow icon={Briefcase} label="Role" value={role} copyKey="role" />
            <DetailRow icon={Building2} label="Department" value={department} copyKey="dept" />
          </div>

          <div className="p-3 border-t border-gray-100 space-y-1">
            <button onClick={() => { setOpen(false); onChangePassword(); }} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors text-left">
              <KeyRound className="h-4 w-4 shrink-0" /> Change Password
            </button>
            <button onClick={() => { setOpen(false); onLogout(); }} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors text-left">
              <LogOut className="h-4 w-4 shrink-0" /> Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PassSectionLayout({ children }) {
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

  const [sidebarExpanded, setSidebarExpanded] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("psm-sidebar") !== "collapsed";
  });

  const toggleSidebar = () => {
    setSidebarExpanded((prev) => {
      const next = !prev;
      try { localStorage.setItem("psm-sidebar", next ? "expanded" : "collapsed"); } catch {}
      return next;
    });
  };

  useSessionHeartbeat();

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      const role = String(parsedUser.role || "").toLowerCase().trim();
      // Allow ATM role (which includes Pass Section Manager), Admin, or Approval roles
      const allowedRoles = ["atm", "admin", "administrator", "approval", "pass admin", "pass officer"];
      const isAllowed = allowedRoles.some(r => role === r) || role.includes("pass");
      if (!isAllowed) {
        setTimeout(() => router.push("/"), 0);
        return;
      }
      setUser(parsedUser);
      if (parsedUser.isPasswordChanged === false) setShowPasswordChangeModal(true);
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
      if (token) await axios.post(`${AUTH_API}/auth/logout`, {}, { headers: { Authorization: `Bearer ${token}` } });
    } catch {}
    finally {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      router.push("/");
    }
  };

  if (!user) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#f0f4ff]" style={{ fontFamily: "'Inter', Arial, sans-serif" }}>
        <div className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-white shadow-lg border border-blue-100">
          <span className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-[#0a1e4d] text-white shrink-0">
            <LayoutDashboard className="h-4 w-4" />
            <span className="absolute inset-0 rounded-xl ring-2 ring-blue-400/60 animate-ping" />
          </span>
          <span className="text-sm font-semibold text-gray-700">Loading Pass Section Dashboard</span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-bounce [animation-delay:-0.3s]" />
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-bounce [animation-delay:-0.15s]" />
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-bounce" />
          </span>
        </div>
      </div>
    );
  }

  const activeItem = navigationItems.find((item) => item.href === pathname) || navigationItems[0];

  const SidebarContent = ({ onNavigate, expanded = sidebarExpanded, showCollapseToggle = true }) => (
    <div className="h-full flex flex-col justify-between py-5 bg-[#0a1e4d] text-white overflow-hidden">
      <div className="flex flex-col gap-5">
        {/* Brand */}
        <div className="flex flex-col gap-3 px-4">
          <div className={cn("flex items-center", expanded ? "justify-between" : "justify-center")}>
            <Link href="/pass_section" className="flex items-center gap-3 group min-w-0" onClick={onNavigate}>
              <span className="flex items-center justify-center w-10 h-10 rounded-xl overflow-hidden bg-[#ff6b00] shadow-lg shrink-0 group-hover:scale-105 transition-transform duration-200">
                <Image src="/logo1.png" alt="APACS" width={40} height={40} className="w-full h-full object-contain" />
              </span>
              <span className={cn("flex flex-col leading-tight overflow-hidden transition-[opacity,max-width] duration-300 ease-in-out", expanded ? "opacity-100 max-w-[160px]" : "opacity-0 max-w-0")}>
                <span className="font-extrabold text-white text-base tracking-tight whitespace-nowrap">APACS</span>
                <span className="text-[10px] uppercase tracking-wider text-blue-300 font-bold whitespace-nowrap">Pass Section</span>
              </span>
            </Link>

            {showCollapseToggle && expanded && (
              <button onClick={toggleSidebar} className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg bg-white/5 text-blue-300 hover:bg-blue-500 hover:text-white active:scale-95 transition-all duration-150 ring-1 ring-white/10 shrink-0">
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
          </div>

          {showCollapseToggle && !expanded && (
            <div className="flex justify-center">
              <button onClick={toggleSidebar} className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg bg-white/5 text-blue-300 hover:bg-blue-500 hover:text-white active:scale-95 transition-all duration-150 ring-1 ring-white/10">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        <div className="px-4"><div className="h-px bg-white/10" /></div>

        <div className={cn("px-5 -mb-2 overflow-hidden transition-[opacity,max-height] duration-300 ease-in-out", expanded ? "opacity-100 max-h-8" : "opacity-0 max-h-0")}>
          <p className="text-[10px] font-bold text-blue-400 uppercase tracking-[0.18em]">Navigation</p>
        </div>

        <nav className={cn("flex flex-col gap-1 px-3", expanded ? "items-stretch" : "items-center")}>
          {navigationItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/pass_section" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                title={!expanded ? item.name : undefined}
                onClick={onNavigate}
                className={cn(
                  "relative flex items-center rounded-xl transition-all duration-150 group",
                  expanded ? "gap-3 px-3 py-2.5" : "justify-center w-11 h-11 mx-auto",
                  isActive
                    ? "bg-gradient-to-r from-blue-500/90 to-blue-700/90 text-white font-semibold shadow-lg shadow-blue-900/40 ring-1 ring-blue-400/30"
                    : "text-blue-300 hover:text-white hover:bg-white/[0.07]"
                )}
              >
                {isActive && expanded && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-white/80" />}
                <item.icon className="shrink-0 h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
                <span className={cn("text-sm font-medium truncate transition-[opacity,max-width] duration-300 ease-in-out", expanded ? "opacity-100 max-w-[180px]" : "opacity-0 max-w-0 overflow-hidden")}>
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom */}
      <div className={cn("flex flex-col gap-3 px-3", expanded ? "items-stretch" : "items-center")}>
        <button className={cn("flex items-center rounded-xl bg-white/[0.04] text-blue-400 hover:bg-blue-500/15 hover:text-blue-300 transition-colors duration-150 font-medium ring-1 ring-white/5", expanded ? "gap-3 px-3 py-2.5" : "justify-center w-11 h-11 mx-auto")}>
          <HelpCircle className="shrink-0 h-5 w-5" strokeWidth={2} />
          <span className={cn("text-sm truncate transition-[opacity,max-width] duration-300 ease-in-out", expanded ? "opacity-100 max-w-[180px]" : "opacity-0 max-w-0 overflow-hidden")}>Help / Support</span>
        </button>

        <div className={cn("flex items-center rounded-xl bg-white/[0.04] ring-1 ring-white/5", expanded ? "gap-3 px-3 py-2.5" : "justify-center w-11 h-11 mx-auto")} title={!expanded ? user?.username : undefined}>
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-400 to-indigo-600 text-white text-xs font-extrabold shrink-0 ring-2 ring-blue-400/30">
            {(user?.username || "PS").substring(0, 2).toUpperCase()}
          </span>
          <div className={cn("flex flex-col leading-tight overflow-hidden transition-[opacity,max-width] duration-300 ease-in-out", expanded ? "opacity-100 max-w-[170px]" : "opacity-0 max-w-0")}>
            <span className="text-sm font-semibold text-white truncate">{user?.username || "PSM001"}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">Pass Section Mgr</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-screen w-screen overflow-hidden flex bg-[#eef2f7]" style={{ fontFamily: "'Inter', Arial, sans-serif" }}>
      <div className="w-full h-full bg-[#f0f4f8] flex overflow-hidden">
        {/* Desktop sidebar */}
        <aside className={cn("hidden lg:flex flex-shrink-0 relative border-r border-[#0a1e4d]/20 bg-[#0a1e4d] shadow-2xl shadow-black/30", "transition-[width] duration-300 ease-in-out will-change-[width] overflow-hidden")} style={{ width: sidebarExpanded ? "16rem" : "5rem" }}>
          <div className="absolute inset-0"><SidebarContent /></div>
        </aside>

        {/* Mobile sidebar */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-[100] flex lg:hidden">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
            <div className="relative w-64 h-full bg-[#0a1e4d] shadow-2xl">
              <SidebarContent onNavigate={() => setIsMobileMenuOpen(false)} expanded={true} showCollapseToggle={false} />
            </div>
          </div>
        )}

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          {/* Header */}
          <header className="px-4 sm:px-6 flex items-center justify-between gap-3 h-14 shrink-0 bg-white border-b border-gray-200 shadow-sm relative z-40">
            <div className="flex items-center gap-3 min-w-0">
              <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden text-gray-600 hover:text-gray-900 p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest hidden sm:block">APACS — Pass Section</p>
                <p className="text-sm sm:text-base font-extrabold text-[#0a1e4d] truncate leading-tight">PASS SECTION MANAGEMENT</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Date/time chip */}
              <div className="hidden md:flex items-center gap-2 text-xs text-gray-500 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg">
                <span className="font-medium">{new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
                <span className="w-px h-3 bg-gray-300" />
                <LiveClock />
              </div>

              {/* Notifications */}
              <button className="relative text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100 transition-colors">
                <Bell className="h-5 w-5" />
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500" />
              </button>

              <UserProfilePanel user={user} onChangePassword={() => setShowPasswordChangeModal(true)} onLogout={handleLogout} />
            </div>
          </header>

          <main className="flex-1 min-h-0 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:theme(colors.gray.300)_transparent]">
            {children}
          </main>
        </div>
      </div>

      {/* Change Password Modal */}
      {showPasswordChangeModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 sm:p-8 shadow-2xl border border-gray-200 animate-in fade-in zoom-in-95 duration-200 relative">
            <div className="text-center mb-6">
              <span className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 mb-4 shadow-inner">
                <Lock className="h-7 w-7" strokeWidth={2.5} />
              </span>
              <h3 className="text-2xl font-extrabold text-gray-900 tracking-tight">
                {user?.isPasswordChanged === false ? "Mandatory Password Update" : "Update Password"}
              </h3>
              <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                {user?.isPasswordChanged === false ? "Welcome! You must update your password to continue." : "Set a new strong password below."}
              </p>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-4 text-sm font-medium flex items-center gap-3">
              <span className="text-gray-500">User Account:</span>
              <span className="text-gray-900 font-bold">{user?.username}</span>
            </div>

            <form onSubmit={handlePasswordChangeSubmit} className="space-y-4">
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                <input type={showNewPassword ? "text" : "password"} placeholder="New Password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-11 pr-10 py-3.5 text-base bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl focus:outline-none transition-all" required />
                <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                <input type={showConfirmPassword ? "text" : "password"} placeholder="Confirm New Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-11 pr-10 py-3.5 text-base bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl focus:outline-none transition-all" required />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 space-y-1 text-xs text-blue-700">
                <p className="font-bold mb-1">Password Requirements:</p>
                <p>• Must be between 8 and 15 characters long.</p>
                <p>• Must contain at least one uppercase &amp; one lowercase letter.</p>
                <p>• Must contain at least one number and one special character.</p>
              </div>
              <div className="flex gap-3 pt-2">
                {user?.isPasswordChanged !== false && (
                  <button type="button" onClick={() => { setShowPasswordChangeModal(false); setNewPassword(""); setConfirmPassword(""); }}
                    className="w-1/2 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-base font-bold rounded-xl transition-all">Cancel</button>
                )}
                <button type="submit" disabled={modalLoading}
                  className={cn("py-3.5 bg-[#0a1e4d] text-white text-base font-bold rounded-xl hover:bg-[#0d2660] shadow-lg transition-all disabled:opacity-75 disabled:pointer-events-none flex items-center justify-center", user?.isPasswordChanged !== false ? "w-1/2" : "w-full")}>
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

// Live clock component
function LiveClock() {
  const [time, setTime] = useState("");
  useEffect(() => {
    const update = () => setTime(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="font-mono font-medium">{time}</span>;
}
