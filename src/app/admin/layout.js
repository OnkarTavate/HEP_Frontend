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
} from "lucide-react";
import { cn } from "@/lib/utils";

const AUTH_API = process.env.NEXT_PUBLIC_AUTH_API;

export default function AdminLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Dark-mode state (persisted in localStorage). Toggling adds/removes the
  // `dark` class on the layout wrapper; Tailwind v4's `dark:` variant is
  // already configured in globals.css via `@custom-variant dark (&:is(.dark *))`.
  const [darkMode, setDarkMode] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("admin-theme");
    if (saved === "dark") setDarkMode(true);
  }, []);
  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("admin-theme", next ? "dark" : "light");
      } catch {}
      return next;
    });
  };

  // Sidebar collapsed/expanded — defaults to EXPANDED so labels are visible
  // out of the box. Persisted in localStorage so the user's choice sticks.
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("admin-sidebar");
    if (saved === "collapsed") setSidebarExpanded(false);
    else if (saved === "expanded") setSidebarExpanded(true);
  }, []);
  const toggleSidebar = () => {
    setSidebarExpanded((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("admin-sidebar", next ? "expanded" : "collapsed");
      } catch {}
      return next;
    });
  };

  // Clear Redis session when the tab/browser is closed
  useSessionHeartbeat();

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      // Security Check: Only Admins can load this layout
      const role = (parsedUser.role || "").toLowerCase();
      if (role !== "admin" && role !== "administrator") {
        router.push("/");
        return;
      }
      setUser(parsedUser);
    } else {
      router.push("/");
    }
  }, [router]);

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-orange-50/30 to-amber-50/50">
        <div className="text-center">
          <div className="relative inline-block">
            <Ship className="h-14 w-14 text-primary animate-pulse mx-auto" />
            <div className="absolute inset-0 h-14 w-14 mx-auto rounded-full bg-primary/20 animate-ping" />
          </div>
          <p className="text-slate-500 mt-6">Loading Admin...</p>
        </div>
      </div>
    );
  }

  // Strictly Admin Navigation Items
  const navigationItems = [
    { name: "Admin Console", href: "/admin", icon: ShieldCheck },
    { name: "Pass Approvals", href: "/admin/pass-approvals", icon: FileText },
    {
      name: "Company Approvals",
      href: "/admin/companies",
      icon: Building2,
    },
    { name: "All Passes", href: "/admin/all-passes", icon: LayoutDashboard },
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white">
      {/* Logo Section */}
      <div className="p-6 border-b border-orange-100">
        <Link href="/admin" className="flex items-center gap-3 group">
          <div className="relative flex items-center justify-center w-11 h-11 rounded-xl gradient-orange shadow-lg shadow-orange-600/20">
            <Ship className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-slate-800 text-lg leading-tight">
              Port Gate
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
  const IconSidebar = ({ onNavigate, expanded = sidebarExpanded, showCollapseToggle = true }) => (
    <div
      className={cn(
        "h-full flex flex-col justify-between py-8 bg-[#0a0a0a] dark:bg-black border-r border-black/20 dark:border-white/5 transition-all duration-300",
        expanded ? "items-stretch px-4 w-full" : "items-center w-full",
      )}
    >
      <div className={cn("space-y-6 flex flex-col", expanded ? "items-stretch" : "items-center")}>
        {/* Brand row */}
        <div className={cn("flex items-center", expanded ? "justify-between" : "justify-center")}>
          <Link
            href="/admin"
            className="flex items-center gap-3 group"
            onClick={onNavigate}
          >
            <span className="flex items-center justify-center w-12 h-12 rounded-2xl bg-[#1f1f1f] dark:bg-amber-400 text-amber-300 dark:text-[#1f1f1f] shadow-lg shrink-0">
              <Ship className="h-6 w-6" />
            </span>
            {expanded && (
              <span className="flex flex-col leading-tight">
                <span className="font-extrabold text-white text-xl tracking-tight">
                  Port Gate
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
                "hidden lg:flex items-center justify-center w-9 h-9 rounded-xl bg-white/10 shadow-sm text-white hover:bg-amber-400 hover:text-black transition font-bold",
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
          <p className="px-2 text-xs font-bold text-stone-400 uppercase tracking-widest">
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
                  "flex items-center rounded-2xl transition-all",
                  expanded
                    ? "gap-3 px-4 py-3.5 text-base font-bold"
                    : "justify-center w-12 h-12",
                  isActive
                    ? "bg-amber-400 text-black shadow-lg"
                    : "text-stone-300 hover:text-amber-300 hover:bg-white/10",
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
            "flex items-center rounded-2xl bg-white/10 text-white hover:bg-amber-400 hover:text-black transition font-bold",
            expanded ? "gap-3 px-4 py-3 text-base" : "justify-center w-12 h-12",
          )}
        >
          <HelpCircle className={cn("shrink-0", expanded ? "h-6 w-6" : "h-5 w-5")} strokeWidth={2.5} />
          {expanded && <span className="flex-1 text-left">Help / Logs</span>}
        </button>
      </div>
    </div>
  );

  // Reusable user/name card — rendered in the top-right of the header.
  const UserNameCard = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-3 rounded-2xl px-3 py-2 bg-black/90 hover:bg-black text-white dark:bg-white/5 dark:hover:bg-white/10 dark:border dark:border-white/10 shadow-md transition focus:outline-none">
          <Avatar className="h-11 w-11 ring-2 ring-amber-400/60 shrink-0">
            <AvatarFallback className="bg-gradient-to-br from-amber-400 to-orange-500 text-black text-base font-extrabold">
              {user?.username?.charAt(0)?.toUpperCase() || "A"}
            </AvatarFallback>
          </Avatar>
          <span className="hidden sm:flex flex-col text-left leading-tight min-w-0 pr-1">
            <span className="text-sm font-extrabold truncate max-w-[160px]">
              {user?.username ? user.username.split("@")[0] : "Admin"}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-amber-400 font-bold truncate">
              {user?.role}
            </span>
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="bottom" className="w-56">
        <DropdownMenuLabel>
          <div>
            <p className="font-semibold text-slate-800">
              {user?.username || "Admin"}
            </p>
            <p className="text-xs text-slate-500 font-normal mt-0.5">
              {user?.role}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => router.push("/forgot-password")}
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
        "bg-[#d8d0c8] dark:bg-[#0d0f17]",
        darkMode && "dark",
      )}
      style={{ fontFamily: "'Montserrat', 'Inter', Arial, sans-serif" }}
    >
      {/* Full-viewport shell — no outer padding, no max-width cap, no rounded
          corners on edges. Contains the sidebar + main column. */}
      <div className="w-full h-full bg-[#f5f1eb] dark:bg-[#1a1d27] flex overflow-hidden transition-colors duration-300">
        {/* Desktop icon sidebar (collapsible) */}
        <aside
          className={cn(
            "hidden lg:flex flex-shrink-0 relative transition-[width] duration-300 ease-in-out",
            sidebarExpanded ? "w-64" : "w-24",
          )}
        >
          <IconSidebar />
        </aside>

        {/* Mobile sidebar (slide-over) — always shows labels for clarity */}
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetContent
            side="left"
            className="w-72 p-0 bg-[#f8f4ef] dark:bg-[#161821] border-stone-200 dark:border-white/5"
          >
            <IconSidebar
              onNavigate={() => setIsMobileMenuOpen(false)}
              expanded={true}
              showCollapseToggle={false}
            />
          </SheetContent>
        </Sheet>

        {/* Main content area — fills remaining viewport, never overflows */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          {/* Top header */}
          <header className="px-4 sm:px-6 lg:px-8 pt-4 pb-3 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              {/* Mobile menu trigger */}
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild className="lg:hidden">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hover:bg-white dark:hover:bg-white/10 rounded-full"
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
              <div className="hidden md:flex bg-white dark:bg-white/5 px-4 py-2.5 rounded-full shadow-sm items-center gap-2 w-72 border border-transparent dark:border-white/10">
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
                className="relative bg-white dark:bg-white/5 shadow-sm rounded-full hover:bg-stone-50 dark:hover:bg-white/10 dark:border dark:border-white/10"
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
                className="relative bg-white dark:bg-white/5 shadow-sm rounded-full hover:bg-stone-50 dark:hover:bg-white/10 dark:border dark:border-white/10"
              >
                <Bell className="h-5 w-5 text-stone-600 dark:text-stone-300" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-orange-500 rounded-full" />
              </Button>

              {/* User name card (moved here from the sidebar bottom).
                  Clicking opens a menu with Change Password / Sign Out. */}
              <UserNameCard />
            </div>
          </header>

          {/* Page content — fills remaining vertical space, no body scroll;
              individual scrollable surfaces (e.g., the records list) handle
              their own overflow. */}
          <main className="flex-1 px-4 sm:px-6 lg:px-8 pb-4 min-h-0 overflow-hidden">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
