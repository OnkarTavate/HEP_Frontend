"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import axios from "axios";
import { useSessionHeartbeat } from "@/lib/useSessionHeartbeat";
import NotificationPanel from "@/components/NotificationPanel";

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
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import {
  Ship,
  LayoutDashboard,
  FileText,
  LogOut,
  Menu,
  Bell,
  Search,
  HelpCircle,
  Lock,
  ShieldCheck,
  Building2,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Eye,
  EyeOff,
  RefreshCw,
  Users,
  KeyRound,
  ChevronDown,
  User,
  Briefcase,
  X,
  BadgeCheck,
  CheckCheck,
  Copy,
  Mail,
  Phone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const AUTH_API = process.env.NEXT_PUBLIC_AUTH_API;
const ADMIN_API = process.env.NEXT_PUBLIC_ADMIN_API;

export default function AdminLayout({ children }) {
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

  // Dark-mode state (persisted in localStorage). Toggling adds/removes the
  // `dark` class on the layout wrapper; Tailwind v4's `dark:` variant is
  // already configured in globals.css via `@custom-variant dark (&:is(.dark *))`.
  const [darkMode, setDarkMode] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("admin-theme");
    if (saved === "dark") {
      const timer = setTimeout(() => setDarkMode(true), 0);
      return () => clearTimeout(timer);
    }
  }, []);
  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("admin-theme", next ? "dark" : "light");
      } catch { }
      return next;
    });
  };

  // Sidebar collapsed/expanded — defaults to EXPANDED so labels are visible
  // out of the box. Persisted in localStorage so the user's choice sticks.
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("admin-sidebar");
    if (saved === "collapsed") {
      const timer = setTimeout(() => setSidebarExpanded(false), 0);
      return () => clearTimeout(timer);
    } else if (saved === "expanded") {
      const timer = setTimeout(() => setSidebarExpanded(true), 0);
      return () => clearTimeout(timer);
    }
  }, []);
  const toggleSidebar = () => {
    setSidebarExpanded((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("admin-sidebar", next ? "expanded" : "collapsed");
      } catch { }
      return next;
    });
  };

  // Clear Redis session when the tab/browser is closed
  useSessionHeartbeat();

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      // Access control: Admin OR any Approval department user
      const role = (parsedUser.role || "").toLowerCase();
      const isAdmin = role === "admin" || role === "administrator";
      const isApproval = role === "approval";
      if (!isAdmin && !isApproval) {
        router.push("/");
        return;
      }
      const timer = setTimeout(() => {
        setUser(parsedUser);
        if (parsedUser.isPasswordChanged === false) {
          setShowPasswordChangeModal(true);
        }
      }, 0);
      return () => clearTimeout(timer);
    } else {
      router.push("/");
    }
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
        {
          loginId: user?.username,
          newPassword,
          confirmPassword,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          validateStatus: (s) => s < 500,
        }
      );

      if (res.status >= 200 && res.status < 300 && res.data?.success) {
        toast.success("Password Updated Successfully", {
          description: "Your default password has been successfully updated.",
        });

        // Update user in localStorage
        const updatedUser = { ...user, isPasswordChanged: true };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        setUser(updatedUser);

        // Close modal and reset fields
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
          { headers: { Authorization: `Bearer ${token}` } },
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
        className={cn(
          "h-screen w-screen overflow-hidden flex transition-colors duration-300",
          "bg-slate-100 dark:bg-slate-950",
          darkMode && "dark",
        )}
        style={{ fontFamily: "'Montserrat', 'Inter', Arial, sans-serif" }}
      >
        <div className="w-full h-full bg-slate-50 dark:bg-[#11131e] flex overflow-hidden">
          {/* Sidebar silhouette */}
          <aside className="hidden lg:flex w-64 flex-shrink-0 bg-slate-900 dark:bg-slate-950 border-r border-slate-800 dark:border-white/5 p-4 flex-col gap-4">
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-400 text-[#1f1f1f] shadow-lg shrink-0">
                <ShieldCheck className="h-6 w-6" strokeWidth={2.5} />
              </span>
              <div className="flex flex-col gap-1.5">
                <span className="block h-3.5 w-24 rounded bg-white/15 animate-pulse" />
                <span className="block h-2.5 w-20 rounded bg-amber-400/40 animate-pulse" />
              </div>
            </div>
            <div className="mt-6 h-3 w-16 rounded bg-white/10 animate-pulse" />
            <div className="flex flex-col gap-2.5 mt-2">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-11 rounded-2xl bg-white/5 animate-pulse"
                  style={{ animationDelay: `${i * 120}ms` }}
                />
              ))}
            </div>
          </aside>

          {/* Main column */}
          <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
            {/* Header silhouette */}
            <header className="px-4 sm:px-6 lg:px-8 pt-4 pb-3 flex items-center justify-between gap-3 shrink-0">
              <div className="space-y-2">
                <div className="h-7 sm:h-9 w-44 rounded-lg bg-stone-300/70 dark:bg-white/10 animate-pulse" />
                <div className="h-3 w-56 rounded bg-stone-300/50 dark:bg-white/5 animate-pulse" />
              </div>
              <div className="flex items-center gap-3">
                <div className="hidden md:block h-10 w-72 rounded-full bg-white dark:bg-white/5 dark:border dark:border-white/10 animate-pulse" />
                <div className="h-10 w-10 rounded-full bg-white dark:bg-white/5 dark:border dark:border-white/10 animate-pulse" />
                <div className="h-10 w-10 rounded-full bg-white dark:bg-white/5 dark:border dark:border-white/10 animate-pulse" />
                <div className="h-12 w-32 rounded-2xl bg-black/90 dark:bg-white/5 dark:border dark:border-white/10 animate-pulse" />
              </div>
            </header>

            {/* Content skeleton */}
            <main className="flex-1 px-4 sm:px-6 lg:px-8 pb-4 min-h-0 overflow-hidden">
              <div className="relative h-full w-full">
                <div className="h-14 rounded-3xl bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 animate-pulse mb-4" />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                  <div
                    className="h-56 rounded-3xl bg-white dark:bg-slate-800/60 ring-1 ring-slate-200/50 dark:ring-white/5 animate-pulse lg:col-span-2"
                    style={{ animationDelay: "100ms" }}
                  />
                  <div
                    className="h-56 rounded-3xl bg-slate-900 dark:bg-slate-950 animate-pulse"
                    style={{ animationDelay: "180ms" }}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div
                    className="h-40 rounded-3xl bg-white dark:bg-slate-800/60 ring-1 ring-slate-200/60 dark:ring-white/5 animate-pulse"
                    style={{ animationDelay: "220ms" }}
                  />
                  <div
                    className="h-40 rounded-3xl bg-white dark:bg-slate-800/60 ring-1 ring-slate-200/60 dark:ring-white/5 animate-pulse"
                    style={{ animationDelay: "300ms" }}
                  />
                </div>

                <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center">
                  <div className="flex items-center gap-3 px-5 py-3 rounded-full bg-white/90 dark:bg-slate-800/90 backdrop-blur-md ring-1 ring-slate-200/70 dark:ring-white/10 shadow-lg">
                    <span className="relative flex h-7 w-7 items-center justify-center rounded-xl bg-amber-400 text-[#1f1f1f] shrink-0">
                      <ShieldCheck className="h-4 w-4" strokeWidth={2.5} />
                      <span className="absolute inset-0 rounded-xl ring-2 ring-amber-400/60 animate-ping" />
                    </span>
                    <span className="text-sm font-semibold text-stone-700 dark:text-stone-200 tracking-wide">
                      Loading admin console
                    </span>
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

  const isAdmin = user && (user.role?.toLowerCase() === "admin" || user.role?.toLowerCase() === "administrator");
  const consoleHref = isAdmin ? "/admin" : "/admin/vendor_pass";

  // Strictly Admin Navigation Items
  const navigationItems = [
    { name: isAdmin ? "Admin Console" : "Vendor Pass", href: consoleHref, icon: ShieldCheck },
    ...(isAdmin ? [{ name: "User Accounts", href: "/admin/user-accounts", icon: Users }] : []),
    { name: "Pass Approvals", href: "/admin/pass-approvals", icon: FileText },
    { name: "Company Approvals", href: "/admin/companies", icon: Building2 },
    { name: "All Passes", href: "/admin/all-passes", icon: FileText },
    { name: "Bulk Pass", href: "/admin/bulk_pass", icon: Users },
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white">
      {/* Logo Section */}
      <div className="p-6 border-b border-orange-100">
        <Link href={consoleHref} className="flex items-center gap-3 group">
          <div className="relative flex items-center justify-center w-11 h-11 rounded-xl overflow-hidden bg-[#ff6b00] shadow-lg shadow-orange-600/20">
            <Image src="/logo1.png" alt="Chennai Port Logo" width={44} height={44} className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="font-bold text-slate-800 text-lg leading-tight">
              APACS
            </h1>
            <p className="text-xs text-orange-600 font-medium">Admin System</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        <p className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Global Menu
        </p>
        {navigationItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                isActive
                  ? "gradient-orange text-white shadow-lg shadow-orange-600/20"
                  : "text-slate-600 hover:text-orange-600 hover:bg-orange-50",
              )}
            >
              <item.icon
                className={cn(
                  "h-5 w-5",
                  isActive
                    ? "text-white"
                    : "text-slate-400 group-hover:text-orange-600",
                )}
              />
              <span className="flex-1">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Help Card */}
      <div className="p-4 border-t border-slate-100">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-amber-500/5 to-transparent border border-primary/20 p-4">
          <div className="absolute top-0 right-0 w-20 h-20 bg-primary/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <HelpCircle className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold text-primary">
                Need Help?
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Contact support for assistance
            </p>
            <Button
              size="sm"
              variant="outline"
              className="w-full h-8 text-xs border-primary/30 text-primary hover:bg-primary hover:text-white"
            >
              System Logs
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  // Sidebar — collapses to a 24-wide icon column or expands to a 64-wide
  // labeled column. The mobile slide-over always uses the expanded variant
  // so nav labels are visible in the drawer.
  const renderIconSidebar = ({ onNavigate, expanded = sidebarExpanded, showCollapseToggle = true }) => (
    <div
      className={cn(
        "h-full flex flex-col justify-between py-8 bg-slate-900 dark:bg-slate-950 border-r border-slate-850 dark:border-white/5 transition-all duration-300",
        expanded ? "items-stretch px-4 w-full" : "items-center w-full",
      )}
    >
      <div className={cn("space-y-6 flex flex-col", expanded ? "items-stretch" : "items-center")}>
        {/* Brand row */}
        <div className={cn("flex items-center", expanded ? "justify-between" : "justify-center")}>
          <Link
            href={consoleHref}
            className="flex items-center gap-3 group"
            onClick={onNavigate}
          >
            <span className="flex items-center justify-center w-12 h-12 rounded-2xl bg-slate-800 dark:bg-amber-400 text-amber-400 dark:text-[#1f1f1f] shadow-lg shrink-0 group-hover:scale-105 transition-transform duration-200">
              <Ship className="h-6 w-6" />
            </span>
            {expanded && (
              <span className="flex flex-col leading-tight">
                <span className="font-extrabold text-white text-xl tracking-tight">
                  APACS
                </span>
                <span className="text-xs uppercase tracking-wider text-amber-400 font-bold">
                  Admin System
                </span>
              </span>
            )}
          </Link>

          {/* Collapse / expand toggle (desktop only) */}
          {showCollapseToggle && (
            <button
              onClick={toggleSidebar}
              title={expanded ? "Collapse sidebar" : "Expand sidebar"}
              className={cn(
                "hidden lg:flex items-center justify-center w-9 h-9 rounded-xl bg-white/10 text-white hover:bg-amber-500 hover:text-slate-950 active:scale-95 transition-all duration-200 font-bold",
                !expanded && "absolute -right-3 top-10 z-10",
              )}
            >
              {expanded ? (
                <ChevronLeft className="h-5 w-5" />
              ) : (
                <ChevronRight className="h-5 w-5" />
              )}
            </button>
          )}
        </div>

        {/* Section label (only when expanded) */}
        {expanded && (
          <p className="px-2 text-xs font-bold text-slate-500 uppercase tracking-widest">
            Global Menu
          </p>
        )}

        {/* Nav items */}
        <div className={cn("flex flex-col gap-2", expanded ? "items-stretch" : "items-center")}>
          {navigationItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                title={item.name}
                onClick={onNavigate}
                className={cn(
                  "flex items-center rounded-2xl transition-all duration-200 active:scale-[0.98]",
                  expanded
                    ? "gap-3 px-4 py-3.5 text-base font-bold"
                    : "justify-center w-12 h-12",
                  isActive
                    ? "bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/20"
                    : "text-slate-300 hover:text-amber-400 hover:bg-white/5",
                )}
              >
                <item.icon className={cn("shrink-0", expanded ? "h-6 w-6" : "h-5 w-5")} strokeWidth={2.5} />
                {expanded && <span className="flex-1 truncate">{item.name}</span>}
              </Link>
            );
          })}
        </div>
      </div>

      <div className={cn("flex flex-col gap-4", expanded ? "items-stretch" : "items-center")}>
        <button
          title="Help / Logs"
          className={cn(
            "flex items-center rounded-2xl bg-white/10 text-white hover:bg-amber-500 hover:text-slate-950 active:scale-[0.98] transition-all duration-200 font-bold",
            expanded ? "gap-3 px-4 py-3 text-base" : "justify-center w-12 h-12",
          )}
        >
          <HelpCircle className={cn("shrink-0", expanded ? "h-6 w-6" : "h-5 w-5")} strokeWidth={2.5} />
          {expanded && <span className="flex-1 text-left">Help / Logs</span>}
        </button>
      </div>
    </div>
  );

  // ─── User Profile Panel (replaces old UserNameCard) ────────────────────────
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

    const username = user?.username || "Port Admin";
    const displayName = user?.name || username.split("@")[0] || "Port Admin";
    const role = user?.role || "Officer";
    const department = user?.departmentName || departmentName || "Admin Department";
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
              <DetailRow icon={User} label="Login ID" value={username} copyKey="lid" />
              <DetailRow icon={Briefcase} label="Role" value={role} copyKey="role" />
              <DetailRow icon={Building2} label="Department" value={department} copyKey="dept" />
              <DetailRow icon={Mail} label="Email" value={email} copyKey="email" />
              <DetailRow icon={Phone} label="Mobile" value={mobile} copyKey="mob" />
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

  return (
    <div
      className={cn(
        "h-screen w-screen overflow-hidden flex transition-colors duration-300",
        "bg-slate-100 dark:bg-slate-950",
        darkMode && "dark",
      )}
      style={{ fontFamily: "'Montserrat', 'Inter', Arial, sans-serif" }}
    >
      {/* Full-viewport shell — no outer padding, no max-width cap, no rounded
          corners on edges. Contains the sidebar + main column. */}
      <div className="w-full h-full bg-slate-50 dark:bg-[#11131e] flex overflow-hidden transition-colors duration-300">
        {/* Desktop icon sidebar (collapsible) */}
        <aside
          className={cn(
            "hidden lg:flex flex-shrink-0 relative transition-[width] duration-300 ease-in-out",
            sidebarExpanded ? "w-64" : "w-24",
          )}
        >
          {renderIconSidebar({})}
        </aside>

        {/* Mobile sidebar (slide-over) — always shows labels for clarity */}
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetContent
            side="left"
            className="w-72 p-0 bg-slate-900 dark:bg-slate-950 border-slate-800 dark:border-white/5"
          >
            <SheetTitle className="sr-only">Admin Navigation Sidebar</SheetTitle>
            <SheetDescription className="sr-only">Access different modules of the admin panel</SheetDescription>
            {renderIconSidebar({
              onNavigate: () => setIsMobileMenuOpen(false),
              expanded: true,
              showCollapseToggle: false,
            })}
          </SheetContent>
        </Sheet>

        {/* Main content area — fills remaining viewport, never overflows */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          {/* Top header */}
          <header className="px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-3 shrink-0 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border-b border-slate-200/50 dark:border-white/5 transition-all duration-300 relative z-50">
            <div className="flex items-center gap-3 min-w-0">
              {/* Mobile menu trigger */}
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild className="lg:hidden">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hover:bg-white dark:hover:bg-white/10 rounded-full text-slate-800 dark:text-stone-200"
                  >
                    <Menu className="h-5 w-5 text-[#1f1f1f] dark:text-stone-200" />
                  </Button>
                </SheetTrigger>
              </Sheet>

              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#1f1f1f] dark:text-stone-100 truncate">
                  Hi, {user?.username ? user.username.split("@")[0] : "Admin"}!
                </h1>
                <p className="text-stone-500 dark:text-stone-400 text-sm mt-1 hidden sm:block">
                  {navigationItems.find((item) => item.href === pathname)
                    ?.name || "System Configuration Portal"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Search pill */}
              <div className="hidden md:flex bg-white dark:bg-slate-800/40 px-4 py-2.5 rounded-full shadow-sm items-center gap-2 w-72 border border-slate-200/60 dark:border-white/5 focus-within:ring-4 focus-within:ring-amber-500/10 focus-within:border-amber-400 transition-all duration-200">
                <Search className="h-4 w-4 text-stone-400 dark:text-stone-500" />
                <input
                  type="text"
                  placeholder="Search the admin console"
                  className="outline-none bg-transparent w-full text-sm text-stone-700 dark:text-stone-200 placeholder:text-stone-400 dark:placeholder:text-stone-500"
                />
              </div>

              {/* Theme toggle */}
              <Button
                onClick={toggleDarkMode}
                variant="ghost"
                size="icon"
                title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
                className="relative bg-white dark:bg-white/5 dark:border dark:border-white/10 shadow-sm rounded-full hover:bg-stone-50 dark:hover:bg-white/10 active:scale-95 transition-all duration-200"
              >
                {darkMode ? (
                  <Sun className="h-5 w-5 text-amber-300" />
                ) : (
                  <Moon className="h-5 w-5 text-stone-600" />
                )}
              </Button>

              {/* Notification */}
              <NotificationPanel role="approver" />

              {/* User name card (moved here from the sidebar bottom).
                  Clicking opens a menu with Change Password / Sign Out. */}
              <UserProfilePanel
                user={user}
                departmentName="Admin Console"
                onChangePassword={() => setShowPasswordChangeModal(true)}
                onLogout={handleLogout}
              />
            </div>
          </header>

          {/* Page content — fills remaining vertical space and scrolls
              vertically while the sidebar and header stay fixed. */}
          <main className="flex-1 px-4 sm:px-6 lg:px-8 pb-6 min-h-0 overflow-y-auto scroll-smooth [scrollbar-width:thin] [scrollbar-color:theme(colors.stone.300)_transparent] dark:[scrollbar-color:theme(colors.stone.700)_transparent]">
            {children}
          </main>
        </div>
      </div>

      {/* Change Password Modal Overlay */}
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

            <div className="bg-stone-50 dark:bg-[#1a1d27] border border-stone-200 dark:border-white/5 rounded-2xl px-4 py-3 mb-4 text-sm text-stone-700 dark:text-stone-300 font-medium flex items-center justify-start gap-3">
              <span className="text-stone-500 dark:text-stone-400">User Account:</span>
              <span className="text-stone-900 dark:text-white font-bold">{user?.username}</span>
            </div>

            <form onSubmit={handlePasswordChangeSubmit} className="space-y-4">
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400 dark:text-stone-500 group-focus-within:text-amber-500 transition-colors duration-200" />
                <input
                  type={showNewPassword ? "text" : "password"}
                  placeholder="New Password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-11 pr-10 py-3.5 text-base bg-stone-50 dark:bg-[#1a1d27] border border-stone-200 dark:border-white/5 focus:bg-white dark:focus:bg-[#1a1d27] text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 focus:border-amber-500 dark:focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 rounded-2xl focus:outline-none transition-all duration-200"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 focus:outline-none"
                >
                  {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>

              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400 dark:text-stone-500 group-focus-within:text-amber-500 transition-colors duration-200" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm New Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-11 pr-10 py-3.5 text-base bg-stone-50 dark:bg-[#1a1d27] border border-stone-200 dark:border-white/5 focus:bg-white dark:focus:bg-[#1a1d27] text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 focus:border-amber-500 dark:focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 rounded-2xl focus:outline-none transition-all duration-200"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 focus:outline-none"
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>

              <div className="bg-amber-500/5 rounded-2xl p-4 border border-amber-500/10 space-y-1 text-xs text-amber-700 dark:text-amber-400">
                <p className="font-bold mb-1">Password Requirements:</p>
                <p>• Must be between 8 and 15 characters long.</p>
                <p>• Must contain at least one uppercase & one lowercase letter.</p>
                <p>• Must contain at least one number.</p>
                <p>• Must contain at least one special character.</p>
              </div>

              <div className="flex gap-3 pt-2">
                {user?.isPasswordChanged !== false && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordChangeModal(false);
                      setNewPassword("");
                      setConfirmPassword("");
                    }}
                    className="w-1/2 py-3.5 bg-stone-150 dark:bg-stone-850 hover:bg-stone-200 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 text-base font-bold tracking-wider uppercase rounded-2xl transition-all duration-200 focus:outline-none"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={modalLoading}
                  className={cn(
                    "py-3.5 bg-amber-400 text-[#1f1f1f] text-base font-bold tracking-wider uppercase rounded-2xl hover:bg-amber-500 hover:shadow-amber-400/30 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] shadow-lg shadow-amber-400/20 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-amber-400/20 disabled:opacity-75 disabled:pointer-events-none flex items-center justify-center",
                    user?.isPasswordChanged !== false ? "w-1/2" : "w-full"
                  )}
                >
                  {modalLoading ? (
                    <RefreshCw className="h-5 w-5 animate-spin" />
                  ) : (
                    "Update Password"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
