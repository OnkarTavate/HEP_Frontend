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
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

import axios from "axios";
import { useSessionHeartbeat } from "@/lib/useSessionHeartbeat";
const AUTH_API = process.env.NEXT_PUBLIC_AUTH_API;
// Navigation items based on user role

// Navigation items based on user role
const getNavigationItems = (role) => {
  const baseItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  ];

  const applicantItems = [
    ...baseItems,
    { name: "Apply Pass", href: "/dashboard/pass_request", icon: FileText },
    { name: "Master Record", href: "/dashboard/master_record", icon: Database }, // <-- UPDATED PATH HERE
    // { name: "Wallet", href: "/dashboard/wallet", icon: Wallet },
  ];

  const roleItems = {
    user: applicantItems,
    Applicant: applicantItems,

    "Pass Officer": [
      ...baseItems,
      {
        name: "Pass Approval",
        href: "/dashboard/pass-approval",
        icon: CheckSquare,
      },
      { name: "All Passes", href: "/dashboard/all-passes", icon: FileText },
    ],
    "Traffic Officer": [
      ...baseItems,
      {
        name: "Traffic Approval",
        href: "/dashboard/approval_admin",
        icon: Truck,
      },
      { name: "Gate Log", href: "/dashboard/gate-log", icon: FileText },
    ],
    Admin: [
      ...baseItems,
      { name: "All Passes", href: "/dashboard/all-passes", icon: FileText },
    ],
    "Super Admin": [
      ...baseItems,
      { name: "All Passes", href: "/dashboard/all-passes", icon: FileText },
    ],
  };

  return roleItems[role] || roleItems[role?.toLowerCase()] || baseItems;
};

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Dark-mode state (persisted in localStorage). Tailwind v4's `dark:` variant
  // is configured in globals.css via `@custom-variant dark (&:is(.dark *))`,
  // so toggling a `dark` class on the wrapper switches every variant at once.
  const [darkMode, setDarkMode] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("dashboard-theme");
    if (saved === "dark") setDarkMode(true);
  }, []);
  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("dashboard-theme", next ? "dark" : "light");
      } catch { }
      return next;
    });
  };

  // Sidebar collapsed/expanded — defaults to EXPANDED so labels are visible
  // out of the box. Persisted in localStorage.
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("dashboard-sidebar");
    if (saved === "collapsed") setSidebarExpanded(false);
    else if (saved === "expanded") setSidebarExpanded(true);
  }, []);
  const toggleSidebar = () => {
    setSidebarExpanded((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(
          "dashboard-sidebar",
          next ? "expanded" : "collapsed",
        );
      } catch { }
      return next;
    });
  };

  // Clear Redis session when the tab/browser is closed
  useSessionHeartbeat();

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
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

  if (!user) {
    return (
      <div
        className={cn(
          "h-screen w-screen overflow-hidden flex transition-colors duration-300",
          "bg-[#d8d0c8] dark:bg-[#0d0f17]",
          darkMode && "dark",
        )}
        style={{ fontFamily: "'Montserrat', 'Inter', Arial, sans-serif" }}
      >
        <div className="w-full h-full bg-[#f5f1eb] dark:bg-[#1a1d27] flex overflow-hidden">
          {/* Sidebar silhouette */}
          <aside className="hidden lg:flex w-64 flex-shrink-0 bg-[#0a0a0a] dark:bg-black border-r border-black/20 dark:border-white/5 p-4 flex-col gap-4">
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
                {/* Top status strip placeholder */}
                <div className="h-14 rounded-3xl bg-gradient-to-r from-[#1a1d27] via-[#252836] to-[#1a1d27] dark:from-black dark:via-[#1a1d27] dark:to-black animate-pulse mb-4" />

                {/* Stat cards row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-32 rounded-3xl bg-white dark:bg-[#1f232d] ring-1 ring-stone-200/60 dark:ring-white/5 animate-pulse"
                      style={{ animationDelay: `${i * 100}ms` }}
                    />
                  ))}
                </div>

                {/* Two large panels */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div
                    className="h-72 rounded-3xl bg-white dark:bg-[#1f232d] ring-1 ring-stone-200/60 dark:ring-white/5 animate-pulse lg:col-span-2"
                    style={{ animationDelay: "150ms" }}
                  />
                  <div
                    className="h-72 rounded-3xl bg-white dark:bg-[#1f232d] ring-1 ring-stone-200/60 dark:ring-white/5 animate-pulse"
                    style={{ animationDelay: "260ms" }}
                  />
                </div>

                {/* Subtle centered brand badge — non-blocking, never covers the layout */}
                <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center">
                  <div className="flex items-center gap-3 px-5 py-3 rounded-full bg-white/85 dark:bg-[#1f232d]/90 backdrop-blur-md ring-1 ring-stone-200/70 dark:ring-white/10 shadow-lg">
                    <span className="relative flex h-7 w-7 items-center justify-center rounded-xl bg-amber-400 text-[#1f1f1f] shrink-0">
                      <Ship className="h-4 w-4" strokeWidth={2.5} />
                      <span className="absolute inset-0 rounded-xl ring-2 ring-amber-400/60 animate-ping" />
                    </span>
                    <span className="text-sm font-semibold text-stone-700 dark:text-stone-200 tracking-wide">
                      Preparing your dashboard
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

  const navigationItems = getNavigationItems(user.role);

  // Sidebar — collapses to a 24-wide icon column or expands to a 64-wide
  // labeled column. The mobile slide-over always uses the expanded variant
  // so nav labels are visible in the drawer.
  const IconSidebar = ({
    onNavigate,
    expanded = sidebarExpanded,
    showCollapseToggle = true,
  }) => (
    <div
      className={cn(
        "h-full flex flex-col justify-between py-8 bg-[#0a0a0a] dark:bg-black border-r border-black/20 dark:border-white/5 transition-all duration-300",
        expanded ? "items-stretch px-4 w-full" : "items-center w-full",
      )}
    >
      <div
        className={cn(
          "space-y-6 flex flex-col",
          expanded ? "items-stretch" : "items-center",
        )}
      >
        {/* Brand row */}
        <div
          className={cn(
            "flex items-center",
            expanded ? "justify-between" : "justify-center",
          )}
        >
          <Link
            href="/dashboard"
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
                  Automation System
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
            Menu
          </p>
        )}

        {/* Nav items */}
        <div
          className={cn(
            "flex flex-col gap-2",
            expanded ? "items-stretch" : "items-center",
          )}
        >
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
                <item.icon
                  className={cn("shrink-0", expanded ? "h-6 w-6" : "h-5 w-5")}
                  strokeWidth={2.5}
                />
                {expanded && (
                  <span className="flex-1 truncate">{item.name}</span>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      <div
        className={cn(
          "flex flex-col gap-4",
          expanded ? "items-stretch" : "items-center",
        )}
      >
        <button
          title="Help / Support"
          className={cn(
            "flex items-center rounded-2xl bg-white/10 text-white hover:bg-amber-400 hover:text-black transition font-bold",
            expanded
              ? "gap-3 px-4 py-3 text-base"
              : "justify-center w-12 h-12",
          )}
        >
          <HelpCircle
            className={cn("shrink-0", expanded ? "h-6 w-6" : "h-5 w-5")}
            strokeWidth={2.5}
          />
          {expanded && <span className="flex-1 text-left">Help / Support</span>}
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
              {user?.username ? user.username.split("@")[0] : "User"}
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
              {user?.username || "User"}
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
          Forgot Password
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
            className="w-72 p-0 bg-[#0a0a0a] dark:bg-black border-black/20 dark:border-white/5"
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
              <Sheet
                open={isMobileMenuOpen}
                onOpenChange={setIsMobileMenuOpen}
              >
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
                  Hi,{" "}
                  {user?.username
                    ? user.username.split("@")[0]
                    : "User"}
                  !
                </h1>
                <p className="text-stone-500 dark:text-stone-400 text-sm mt-1 hidden sm:block">
                  {navigationItems.find((item) => item.href === pathname)
                    ?.name || "Port Gate Automation System"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Search pill */}
              <div className="hidden md:flex bg-white dark:bg-white/5 px-4 py-2.5 rounded-full shadow-sm items-center gap-2 w-72 border border-transparent dark:border-white/10">
                <Search className="h-4 w-4 text-stone-400 dark:text-stone-500" />
                <input
                  type="text"
                  placeholder="Search..."
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

              {/* User name card */}
              <UserNameCard />
            </div>
          </header>

          {/* Page content — fills remaining vertical space; child pages
              decide whether to scroll internally. Body never scrolls. */}
          <main className="flex-1 px-4 sm:px-6 lg:px-8 pb-4 min-h-0 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
