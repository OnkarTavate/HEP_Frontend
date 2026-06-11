"use client";

import { useState, useEffect } from "react";
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
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Ship,
  LogOut,
  Menu,
  Bell,
  Search,
  Lock,
  FileText,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Eye,
  EyeOff,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const AUTH_API = process.env.NEXT_PUBLIC_AUTH_API;
const ADMIN_API = process.env.NEXT_PUBLIC_ADMIN_API;

export default function MarineLayout({ children }) {
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

  // Sidebar collapsed/expanded state (persisted in localStorage)
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("marine-sidebar");
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
        localStorage.setItem("marine-sidebar", next ? "expanded" : "collapsed");
      } catch { }
      return next;
    });
  };

  // Dark-mode state
  const [darkMode, setDarkMode] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const isDark = localStorage.getItem("theme") === "dark";
    setDarkMode(isDark);
  }, []);

  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      const next = !prev;
      localStorage.setItem("theme", next ? "dark" : "light");
      return next;
    });
  };

  // Clear Redis session when the tab/browser is closed
  useSessionHeartbeat();

  useEffect(() => {
    const storedUser = localStorage.getItem("user");

    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      const role = String(parsedUser.role || "")
        .toLowerCase()
        .trim();
      const dept = String(parsedUser.departmentName || "")
        .toLowerCase()
        .trim();

      // ❌ Admins have their own portal — block them
      const isAdmin = role === "admin" || role === "administrator";
      if (isAdmin) {
        router.push("/admin");
        return;
      }

      // Allow "approval" role with marine dept OR any role containing "marine"
      const isMarineApprover = (role === "approval" && dept.includes("marine")) || role.includes("marine");

      if (!isMarineApprover) {
        alert("Unauthorized Access: Marine Department Only.");
        router.push("/");
        return;
      }

      setUser(parsedUser);
      if (parsedUser.isPasswordChanged === false) {
        setShowPasswordChangeModal(true);
      }
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
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );
      }
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      // ✅ Always clear frontend state
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");

      router.push("/");
    }
  };

  if (!user) return <div className="p-12 text-center">Loading...</div>;

  // MARINE SPECIFIC NAVIGATION
  const navigationItems = [
    { name: "Pass Approvals", href: "/marine_approval", icon: FileText },
  ];

  const renderSidebar = ({ onNavigate, expanded = sidebarExpanded, showCollapseToggle = true }) => (
    <div
      className={cn(
        "h-full flex flex-col justify-between py-6 bg-slate-900 border-r border-slate-850 transition-all duration-300 text-white",
        expanded ? "items-stretch px-4 w-full" : "items-center w-full",
      )}
    >
      <div className={cn("space-y-6 flex flex-col", expanded ? "items-stretch" : "items-center")}>
        {/* Brand row */}
        <div className={cn("flex items-center relative", expanded ? "justify-between" : "justify-center w-full")}>
          <Link
            href="/marine_approval"
            className="flex items-center gap-3 group"
            onClick={onNavigate}
          >
            <span className="flex items-center justify-center w-11 h-11 rounded-xl bg-[#ff6b00] shadow-lg shadow-orange-600/20 shrink-0 group-hover:scale-105 transition-transform duration-200">
              <Ship className="h-6 w-6 text-white" />
            </span>
            {expanded && (
              <span className="flex flex-col leading-tight">
                <span className="font-extrabold text-white text-lg tracking-tight">
                  Marine Dept
                </span>
                <span className="text-xs uppercase tracking-wider text-orange-400 font-bold">
                  Port Approvals
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
                "hidden lg:flex items-center justify-center w-8 h-8 rounded-lg bg-white/10 text-white hover:bg-[#ff6b00] hover:text-white active:scale-95 transition-all duration-200 font-bold",
                !expanded && "absolute -right-1 top-1.5 z-10",
              )}
            >
              {expanded ? (
                <ChevronLeft className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          )}
        </div>

        {/* Section label (only when expanded) */}
        {expanded && (
          <p className="px-2 text-xs font-bold text-slate-500 uppercase tracking-widest">
            Task Menu
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
                  "flex items-center rounded-xl transition-all duration-200 active:scale-[0.98]",
                  expanded
                    ? "gap-3 px-4 py-3 text-sm font-medium"
                    : "justify-center w-11 h-11",
                  isActive
                    ? "bg-[#ff6b00] text-white font-bold shadow-lg shadow-orange-600/20"
                    : "text-slate-300 hover:text-white hover:bg-white/5",
                )}
              >
                <item.icon className={cn("shrink-0", expanded ? "h-5 w-5" : "h-5 w-5")} strokeWidth={isActive ? 2.5 : 2} />
                {expanded && <span className="flex-1 truncate">{item.name}</span>}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderUserNameCard = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-3 rounded-2xl px-3 py-2 bg-black/90 hover:bg-black text-white dark:bg-white/5 dark:hover:bg-white/10 dark:border dark:border-white/10 shadow-md transition focus:outline-none cursor-pointer">
          <Avatar className="h-11 w-11 ring-2 ring-orange-500/60 shrink-0">
            <AvatarFallback className="bg-gradient-to-br from-[#ff6b00] to-orange-500 text-white text-base font-extrabold">
              {user?.username?.charAt(0)?.toUpperCase() || "M"}
            </AvatarFallback>
          </Avatar>
          <span className="hidden sm:flex flex-col text-left leading-tight min-w-0 pr-1">
            <span className="text-sm font-extrabold truncate max-w-[160px]">
              {user?.username ? user.username.split("@")[0] : "Marine Admin"}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-orange-400 font-bold truncate">
              {user?.role}
            </span>
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="bottom" className="w-56">
        <DropdownMenuLabel>
          <div>
            <p className="font-semibold text-slate-800">
              {user?.username || "Marine Admin"}
            </p>
            <p className="text-xs text-slate-500 font-normal mt-0.5">
              {user?.role}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => setShowPasswordChangeModal(true)}
        >
          <Lock className="h-4 w-4 mr-2 text-slate-500" />
          Change Password
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleLogout}
          className="text-red-600 cursor-pointer focus:text-red-600"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div
      className={cn(
        "h-screen w-screen overflow-hidden flex transition-colors duration-300",
        "bg-slate-100 dark:bg-slate-950",
        darkMode && "dark",
      )}
      style={{ fontFamily: "'Montserrat', 'Inter', Arial, sans-serif" }}
    >
      <div className="w-full h-full bg-slate-50 dark:bg-[#11131e] flex overflow-hidden transition-colors duration-300">
        {/* Desktop sidebar */}
        <aside
          className={cn(
            "hidden lg:flex flex-shrink-0 relative transition-[width] duration-300 ease-in-out lg:z-50 lg:border-r lg:border-slate-800 lg:bg-slate-900 lg:shadow-xl lg:shadow-black/30",
            sidebarExpanded ? "w-72" : "w-20",
          )}
        >
          {renderSidebar({})}
        </aside>

        {/* Mobile sidebar (slide-over) */}
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetContent
            side="left"
            className="w-72 p-0 bg-slate-900 border-slate-800 text-white"
          >
            {renderSidebar({
              onNavigate: () => setIsMobileMenuOpen(false),
              expanded: true,
              showCollapseToggle: false,
            })}
          </SheetContent>
        </Sheet>

        {/* Main layout wrapper */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          {/* Header */}
          <header className="px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-3 shrink-0 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border-b border-slate-200/50 dark:border-white/5 transition-all duration-300">
            <div className="flex items-center gap-3 min-w-0">
              {/* Mobile menu trigger */}
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
                  Marine Approval Dashboard
                </h1>
                <p className="text-stone-500 dark:text-stone-400 text-xs mt-1 hidden sm:block">
                  Manage Permits and Company Registrations
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
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
              <Button
                variant="ghost"
                size="icon"
                className="relative bg-white dark:bg-white/5 dark:border dark:border-white/10 shadow-sm rounded-full hover:bg-stone-50 dark:hover:bg-white/10 active:scale-95 transition-all duration-200"
              >
                <Bell className="h-5 w-5 text-stone-600 dark:text-stone-300" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-orange-500 rounded-full" />
              </Button>

              {renderUserNameCard()}
            </div>
          </header>

          <main className="flex-1 p-4 lg:p-8 pb-6 min-h-0 overflow-y-auto scroll-smooth [scrollbar-width:thin] [scrollbar-color:theme(colors.stone.300)_transparent] dark:[scrollbar-color:theme(colors.stone.700)_transparent]">
            {children}
          </main>
        </div>
      </div>

      {/* Change Password Modal Overlay */}
      {showPasswordChangeModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md bg-white dark:bg-[#1f232d] rounded-3xl p-6 sm:p-8 shadow-2xl border border-stone-200/50 dark:border-white/5 animate-in fade-in zoom-in-95 duration-200 relative">
            <div className="text-center mb-6">
              <span className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-orange-100 dark:bg-orange-500/10 text-[#ff6b00] dark:text-[#ff6b00] mb-4 shadow-inner">
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
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400 dark:text-stone-500 group-focus-within:text-[#ff6b00] transition-colors duration-200" />
                <input
                  type={showNewPassword ? "text" : "password"}
                  placeholder="New Password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-11 pr-10 py-3.5 text-base bg-stone-50 dark:bg-[#1a1d27] border border-stone-200 dark:border-white/5 focus:bg-white dark:focus:bg-[#1a1d27] text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 focus:border-[#ff6b00] dark:focus:border-[#ff6b00] focus:ring-4 focus:ring-[#ff6b00]/10 rounded-2xl focus:outline-none transition-all duration-200"
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
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400 dark:text-stone-500 group-focus-within:text-[#ff6b00] transition-colors duration-200" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm New Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-11 pr-10 py-3.5 text-base bg-stone-50 dark:bg-[#1a1d27] border border-stone-200 dark:border-white/5 focus:bg-white dark:focus:bg-[#1a1d27] text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 focus:border-[#ff6b00] dark:focus:border-[#ff6b00] focus:ring-4 focus:ring-[#ff6b00]/10 rounded-2xl focus:outline-none transition-all duration-200"
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

              <div className="bg-orange-500/5 rounded-2xl p-4 border border-orange-500/10 space-y-1 text-xs text-orange-700 dark:text-orange-400">
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
                    className="w-1/2 py-3.5 bg-stone-150 dark:bg-stone-850 hover:bg-stone-200 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 text-base font-bold tracking-wider uppercase rounded-2xl transition-all duration-200 focus:outline-none cursor-pointer"
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
