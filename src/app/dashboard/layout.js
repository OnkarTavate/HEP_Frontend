"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
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
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import axios from "axios";
import { toast } from "sonner";
import { useSessionHeartbeat } from "@/lib/useSessionHeartbeat";

const AUTH_API = process.env.NEXT_PUBLIC_AUTH_API;
const AGENT_API = process.env.NEXT_PUBLIC_AGENT_API;
const ADMIN_API = process.env.NEXT_PUBLIC_ADMIN_API;

const getNavigationItems = (role) => {
  const baseItems = [{ name: "Dashboard", href: "/dashboard", icon: LayoutDashboard }];
  const applicantItems = [
    ...baseItems,
    { name: "Apply Pass", href: "/dashboard/pass_request", icon: FileText },
    { name: "Master Record", href: "/dashboard/master_record", icon: Database },
    { name: "Blacklist & Penalties", href: "/dashboard/blacklist_penalties", icon: ShieldAlert },
  ];
  const roleItems = {
    user: applicantItems,
    Applicant: applicantItems,
    "Pass Officer": [
      ...baseItems,
      { name: "Pass Approval", href: "/dashboard/pass-approval", icon: CheckSquare },
      { name: "All Passes", href: "/dashboard/all-passes", icon: FileText },
    ],
    "Traffic Officer": [
      ...baseItems,
      { name: "Traffic Approval", href: "/dashboard/approval_admin", icon: Truck },
      { name: "Gate Log", href: "/dashboard/gate-log", icon: FileText },
    ],
    Admin: [...baseItems, { name: "All Passes", href: "/dashboard/all-passes", icon: FileText }],
    "Super Admin": [...baseItems, { name: "All Passes", href: "/dashboard/all-passes", icon: FileText }],
  };
  return roleItems[role] || roleItems[role?.toLowerCase()] || baseItems;
};

export default function DashboardLayout({ children }) {
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

  // Read synchronously to eliminate flicker on hydration
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("dashboard-theme") === "dark";
  });

  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      const next = !prev;
      try { localStorage.setItem("dashboard-theme", next ? "dark" : "light"); } catch {}
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
      try { localStorage.setItem("dashboard-sidebar", next ? "expanded" : "collapsed"); } catch {}
      return next;
    });
  };

  useSessionHeartbeat();

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      const role = String(parsedUser.role || "").toLowerCase().trim();
      const isAdmin = role === "admin" || role === "administrator";
      if (isAdmin) { router.push("/admin"); return; }
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
      const isAgent = user?.role === "Applicant" || user?.role?.toLowerCase() === "user" || user?.role?.toLowerCase() === "agent";
      const targetUrl = isAgent ? `${AGENT_API}/agents/change-password` : `${ADMIN_API}/user/change-password`;
      const res = await axios.post(
        targetUrl,
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
                <div className="h-7 sm:h-9 w-44 rounded-lg bg-stone-300/70 dark:bg-white/10 animate-pulse" />
                <div className="h-3 w-56 rounded bg-stone-300/50 dark:bg-white/5 animate-pulse" />
              </div>
              <div className="flex items-center gap-3">
                <div className="hidden md:block h-10 w-72 rounded-full bg-white dark:bg-white/5 animate-pulse" />
                <div className="h-10 w-10 rounded-full bg-white dark:bg-white/5 animate-pulse" />
                <div className="h-10 w-10 rounded-full bg-white dark:bg-white/5 animate-pulse" />
                <div className="h-12 w-32 rounded-2xl bg-black/90 dark:bg-white/5 animate-pulse" />
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

  const navigationItems = getNavigationItems(user.role);

  const SidebarContent = ({ onNavigate, expanded = sidebarExpanded, showCollapseToggle = true }) => (
    <div className="h-full flex flex-col justify-between py-8 bg-[#0a0a0a] dark:bg-black border-r border-black/20 dark:border-white/5 text-white overflow-hidden">
      <div className="flex flex-col gap-6">
        {/* Brand row — expanded: logo+text left, toggle right. collapsed: logo centered, toggle below */}
        <div className="flex flex-col gap-2 px-4">
          <div className={cn("flex items-center", expanded ? "justify-between" : "justify-center")}>
            <Link href="/dashboard" className="flex items-center gap-3 group min-w-0" onClick={onNavigate}>
              <span className="flex items-center justify-center w-12 h-12 rounded-2xl bg-[#1f1f1f] dark:bg-amber-400 text-amber-300 dark:text-[#1f1f1f] shadow-lg shrink-0 group-hover:scale-105 transition-transform duration-200">
                <Ship className="h-6 w-6" />
              </span>
              <span className={cn(
                "flex flex-col leading-tight overflow-hidden transition-[opacity,max-width] duration-300 ease-in-out",
                expanded ? "opacity-100 max-w-[160px]" : "opacity-0 max-w-0"
              )}>
                <span className="font-extrabold text-white text-xl tracking-tight whitespace-nowrap">Port Gate</span>
                <span className="text-xs uppercase tracking-wider text-amber-400 font-bold whitespace-nowrap">Automation System</span>
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

  const UserNameCard = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-3 rounded-2xl px-3 py-2 bg-black/90 hover:bg-black text-white dark:bg-white/5 dark:hover:bg-white/10 dark:border dark:border-white/10 shadow-md transition-colors duration-150 focus:outline-none">
          <Avatar className="h-11 w-11 ring-2 ring-amber-400/60 shrink-0">
            <AvatarFallback className="bg-gradient-to-br from-amber-400 to-orange-500 text-black text-base font-extrabold">
              {user?.username?.charAt(0)?.toUpperCase() || "A"}
            </AvatarFallback>
          </Avatar>
          <span className="hidden sm:flex flex-col text-left leading-tight min-w-0 pr-1">
            <span className="text-sm font-extrabold truncate max-w-[160px]">{user?.username ? user.username.split("@")[0] : "User"}</span>
            <span className="text-[10px] uppercase tracking-wider text-amber-400 font-bold truncate">{user?.role}</span>
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="bottom" className="w-56">
        <DropdownMenuLabel>
          <div>
            <p className="font-semibold text-slate-800">{user?.username || "User"}</p>
            <p className="text-xs text-slate-500 font-normal mt-0.5">{user?.role}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer" onClick={() => setShowPasswordChangeModal(true)}>
          <Lock className="h-4 w-4 mr-2 text-slate-500" /> Change Password
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="text-red-600 cursor-pointer focus:text-red-600">
          <LogOut className="h-4 w-4 mr-2" /> Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div
      className={cn("h-screen w-screen overflow-hidden flex transition-colors duration-300 bg-[#d8d0c8] dark:bg-[#0d0f17]", darkMode && "dark")}
      style={{ fontFamily: "'Montserrat', 'Inter', Arial, sans-serif" }}
    >
      <div className="w-full h-full bg-[#f5f1eb] dark:bg-[#1a1d27] flex overflow-hidden transition-colors duration-300">
        {/* Desktop sidebar — GPU-composited width transition */}
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
          <SheetContent side="left" className="w-72 p-0 bg-[#0a0a0a] dark:bg-black border-black/20 dark:border-white/5">
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
          <header className="px-4 sm:px-6 lg:px-8 pt-4 pb-3 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild className="lg:hidden">
                  <Button variant="ghost" size="icon" className="hover:bg-white dark:hover:bg-white/10 rounded-full">
                    <Menu className="h-5 w-5 text-[#1f1f1f] dark:text-stone-200" />
                  </Button>
                </SheetTrigger>
              </Sheet>

              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#1f1f1f] dark:text-stone-100 truncate">
                  Hi, {user?.username ? user.username.split("@")[0] : "User"}!
                </h1>
                <p className="text-stone-500 dark:text-stone-400 text-sm mt-1 hidden sm:block">
                  {navigationItems.find((item) => item.href === pathname)?.name || "Port Gate Automation System"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="hidden md:flex bg-white dark:bg-white/5 px-4 py-2.5 rounded-full shadow-sm items-center gap-2 w-72 border border-transparent dark:border-white/10">
                <Search className="h-4 w-4 text-stone-400 dark:text-stone-500" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="outline-none bg-transparent w-full text-sm text-stone-700 dark:text-stone-200 placeholder:text-stone-400 dark:placeholder:text-stone-500"
                />
              </div>

              {/* Dark mode toggle */}
              <Button
                onClick={toggleDarkMode}
                variant="ghost"
                size="icon"
                title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
                className="relative bg-white dark:bg-white/5 shadow-sm rounded-full hover:bg-stone-50 dark:hover:bg-white/10 dark:border dark:border-white/10 active:scale-95 transition-all duration-150"
              >
                {darkMode ? <Sun className="h-5 w-5 text-amber-300" /> : <Moon className="h-5 w-5 text-stone-600" />}
              </Button>

              {/* Notification */}
              <Button
                variant="ghost"
                size="icon"
                className="relative bg-white dark:bg-white/5 shadow-sm rounded-full hover:bg-stone-50 dark:hover:bg-white/10 dark:border dark:border-white/10 active:scale-95 transition-all duration-150"
              >
                <Bell className="h-5 w-5 text-stone-600 dark:text-stone-300" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-orange-500 rounded-full" />
              </Button>

              <UserNameCard />
            </div>
          </header>

          <main className="flex-1 px-4 sm:px-6 lg:px-8 pb-4 min-h-0 overflow-auto [scrollbar-width:thin] [scrollbar-color:theme(colors.stone.300)_transparent] dark:[scrollbar-color:theme(colors.stone.700)_transparent]">
            {children}
          </main>
        </div>
      </div>

      {/* Change Password Modal */}
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

              <div className="bg-amber-500/5 rounded-2xl p-4 border border-amber-500/10 space-y-1 text-xs text-amber-700 dark:text-amber-400">
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
