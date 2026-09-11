"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import axios from "axios";
import { useSessionHeartbeat } from "@/lib/useSessionHeartbeat";
import { enforceRouteGuard } from "@/lib/roleRouting";
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
  { name: "Dashboard", short: "Dashboard", href: "/pass_section", icon: LayoutDashboard, description: "Live overview of all pass activities" },
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
    <div className="flex items-start gap-3 py-2.5 border-b border-stone-100 last:border-0">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-100 text-stone-500 shrink-0 mt-0.5">
        <Icon className="h-4 w-4" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">{label}</p>
        <p className="text-sm font-semibold text-stone-800 truncate">{value || "—"}</p>
      </div>
      {value && value !== "—" && (
        <button onClick={() => copyField(value, copyKey)} className="shrink-0 p-1 rounded text-stone-400 hover:text-amber-600 transition-colors">
          {copiedField === copyKey ? <CheckCheck className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      )}
    </div>
  );

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-2.5 rounded-2xl px-3 py-2 bg-black/90 hover:bg-black text-white shadow-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-amber-400/40 active:scale-95"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-[#1f1f1f] text-base font-extrabold shrink-0 shadow-md ring-2 ring-amber-300/30">
          {initials}
        </span>
        <span className="hidden sm:flex flex-col text-left leading-tight min-w-0 pr-1">
          <span className="text-sm font-extrabold truncate max-w-[140px]">{username}</span>
          <span className="text-[10px] uppercase tracking-wider text-amber-400 font-bold truncate">Pass Section</span>
        </span>
        <ChevronDown className={cn("h-4 w-4 text-stone-400 transition-transform duration-200 hidden sm:block", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+10px)] z-[9999] w-80 rounded-3xl bg-white shadow-[0_8px_40px_rgba(0,0,0,0.18)] ring-1 ring-stone-200/70 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <div className="bg-gradient-to-r from-[#1f1f1f] via-[#2a2520] to-[#3a2f1f] px-5 py-4 relative overflow-hidden">
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
                  <BadgeCheck className="h-3 w-3" /> Active
                </span>
              </div>
              <button onClick={() => setOpen(false)} className="text-white/50 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors shrink-0">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="px-4 pt-2 pb-1 max-h-[260px] overflow-y-auto [scrollbar-width:thin]">
            <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-2 mt-2">Account Profile</p>
            <DetailRow icon={User} label="Login ID" value={username} copyKey="lid" />
            <DetailRow icon={Briefcase} label="Role" value={role} copyKey="role" />
            <DetailRow icon={Building2} label="Department" value={department} copyKey="dept" />
          </div>

          <div className="p-3 border-t border-stone-100 space-y-1.5">
            <button onClick={() => { setOpen(false); onChangePassword(); }} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors">
              <KeyRound className="h-4 w-4 shrink-0 text-amber-600" /> Change Password
            </button>
            <button onClick={() => { setOpen(false); onLogout(); }} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors">
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
    enforceRouteGuard("pass_section", router, setUser, setShowPasswordChangeModal);
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
      <div className="h-screen w-screen flex items-center justify-center bg-[#f5f1eb]" style={{ fontFamily: "'Plus Jakarta Sans', 'Montserrat', 'Inter', Arial, sans-serif" }}>
        <div className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-[#0a0a0a] shadow-lg">
          <span className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-amber-400 text-black shrink-0">
            <LayoutDashboard className="h-4 w-4" />
            <span className="absolute inset-0 rounded-xl ring-2 ring-amber-400/60 animate-ping" />
          </span>
          <span className="text-sm font-semibold text-white">Loading Pass Section Dashboard</span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-bounce [animation-delay:-0.3s]" />
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-bounce [animation-delay:-0.15s]" />
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-bounce" />
          </span>
        </div>
      </div>
    );
  }

  const activeItem =
    navigationItems.find((item) => item.href === pathname || (item.href !== "/pass_section" && pathname?.startsWith(item.href))) ||
    navigationItems[0] || { name: "Dashboard" };

  const SidebarContent = ({ onNavigate, expanded = sidebarExpanded, showCollapseToggle = true }) => (
    <div className="h-full flex flex-col justify-between py-8 bg-[#0a0a0a] text-white overflow-hidden">
      <div className="flex flex-col gap-6">
        {/* Brand */}
        <div className="flex flex-col gap-2 px-4">
          <div className={cn("flex items-center", expanded ? "justify-between" : "justify-center")}>
            <Link href="/pass_section" className="flex items-center gap-3 group min-w-0" onClick={onNavigate}>
              <span className="flex items-center justify-center w-12 h-12 rounded-2xl overflow-hidden bg-[#ff6b00] shadow-lg shadow-orange-600/20 shrink-0 group-hover:scale-105 transition-transform duration-200">
                <Image src="/logo1.png" alt="APACS" width={48} height={48} className="w-full h-full object-contain" />
              </span>
              <span className={cn("flex flex-col leading-tight overflow-hidden transition-[opacity,max-width] duration-300 ease-in-out", expanded ? "opacity-100 max-w-[160px]" : "opacity-0 max-w-0")}>
                <span className="font-extrabold text-white text-2xl tracking-tight whitespace-nowrap">APACS</span>
                <span className="text-[10px] uppercase tracking-wider text-amber-400 font-bold whitespace-nowrap">Pass Section</span>
              </span>
            </Link>

            {showCollapseToggle && expanded && (
              <button onClick={toggleSidebar} className="hidden lg:flex items-center justify-center w-9 h-9 rounded-xl bg-white/10 shadow-sm text-white hover:bg-amber-400 hover:text-black active:scale-95 transition-all duration-150 font-bold shrink-0">
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
          </div>

          {showCollapseToggle && !expanded && (
            <div className="flex justify-center">
              <button onClick={toggleSidebar} className="hidden lg:flex items-center justify-center w-9 h-9 rounded-xl bg-white/10 shadow-sm text-white hover:bg-amber-400 hover:text-black active:scale-95 transition-all duration-150 font-bold">
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>

        <div className={cn("px-4 overflow-hidden transition-[opacity,max-height] duration-300 ease-in-out", expanded ? "opacity-100 max-h-8" : "opacity-0 max-h-0")}>
          <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">Menu</p>
        </div>

        <div className={cn("flex flex-col gap-1 px-3", expanded ? "items-stretch" : "items-center")}>
          {navigationItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/pass_section" && pathname.startsWith(item.href));
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
                <span className={cn("truncate transition-[opacity,max-width] duration-300 ease-in-out", expanded ? "opacity-100 max-w-[180px]" : "opacity-0 max-w-0 overflow-hidden")}>
                  {item.name || "Dashboard"}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Bottom help */}
      <div className={cn("flex flex-col gap-2 px-3", expanded ? "items-stretch" : "items-center")}>
        <button className={cn("flex items-center rounded-2xl bg-white/10 text-white hover:bg-amber-400 hover:text-black transition-colors duration-150 font-bold", expanded ? "gap-3 px-4 py-3 text-base" : "justify-center w-12 h-12 mx-auto")}>
          <HelpCircle className={cn("shrink-0", expanded ? "h-6 w-6" : "h-5 w-5")} strokeWidth={2.5} />
          <span className={cn("truncate transition-[opacity,max-width] duration-300 ease-in-out", expanded ? "opacity-100 max-w-[180px]" : "opacity-0 max-w-0 overflow-hidden")}>Help / Support</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="h-screen w-screen overflow-hidden flex transition-colors duration-300 bg-[#d8d0c8]" style={{ fontFamily: "'Plus Jakarta Sans', 'Montserrat', 'Inter', Arial, sans-serif" }}>
      <div className="w-full h-full bg-[#f5f1eb] flex overflow-hidden">
        {/* Desktop sidebar */}
        <aside className={cn("hidden lg:flex flex-shrink-0 relative", "transition-[width] duration-300 ease-in-out will-change-[width] overflow-hidden")} style={{ width: sidebarExpanded ? "16rem" : "6rem" }}>
          <div className="absolute inset-0"><SidebarContent /></div>
        </aside>

        {/* Mobile sidebar */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-[100] flex lg:hidden">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
            <div className="relative w-72 h-full bg-[#0a0a0a] shadow-2xl">
              <SidebarContent onNavigate={() => setIsMobileMenuOpen(false)} expanded={true} showCollapseToggle={false} />
            </div>
          </div>
        )}

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          {/* Header */}
          <header className="px-4 sm:px-6 lg:px-8 pt-4 pb-3 flex items-center justify-between gap-3 shrink-0 relative z-40">
            <div className="flex items-center gap-3 min-w-0">
              <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden p-2 rounded-xl hover:bg-white text-[#1f1f1f] active:scale-95 transition-all shrink-0">
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <p className="text-xs font-bold text-stone-400 uppercase tracking-widest hidden sm:block">APACS — Pass Section</p>
                <p className="text-base sm:text-lg font-extrabold text-[#1f1f1f] truncate leading-tight">{activeItem.name || "Dashboard"}</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="hidden md:flex items-center gap-2 text-xs text-stone-500 bg-white shadow-sm px-3 py-2 rounded-full">
                <span className="font-medium">{new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
                <span className="w-px h-3 bg-stone-300" />
                <LiveClock />
              </div>
              <button className="relative text-stone-500 hover:text-stone-700 p-2 rounded-full bg-white shadow-sm hover:bg-stone-50 transition-colors">
                <Bell className="h-5 w-5" />
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-amber-500" />
              </button>
              <UserProfilePanel user={user} onChangePassword={() => setShowPasswordChangeModal(true)} onLogout={handleLogout} />
            </div>
          </header>

          <main className="flex-1 min-h-0 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:theme(colors.stone.300)_transparent]">
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
