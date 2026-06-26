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
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  LogOut,
  Menu,
  HelpCircle,
  ShieldBan,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  ChevronRight as ChevronCrumb,
} from "lucide-react";
import { cn } from "@/lib/utils";

const AUTH_API = process.env.NEXT_PUBLIC_AUTH_API;

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
];

export default function ATMDashboardLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      const role = String(parsedUser.role || "").toLowerCase().trim();
      const isATM = role === "atm";
      if (!isATM) {
        if (role === "approval") {
          const deptId = Number(parsedUser.departmentId);
          if ([9, 10, 11, 12, 13, 14, 15].includes(deptId)) {
            router.push("/traffic_approval");
            return;
          } else if (deptId === 7) {
            router.push("/marine_approval");
            return;
          }
        }
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
    <div className="h-full flex flex-col justify-between py-5 bg-slate-950 text-white overflow-hidden">
      <div className="flex flex-col gap-6">
        {/* Brand row */}
        <div className="flex flex-col gap-3 px-4">
          <div
            className={cn(
              "flex items-center",
              expanded ? "justify-between" : "justify-center"
            )}
          >
            <Link
              href="/atm_dashboard"
              className="flex items-center gap-3 group min-w-0"
              onClick={onNavigate}
            >
              <span className="flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-red-500 to-red-700 shadow-lg shadow-red-900/40 shrink-0 ring-1 ring-white/10 group-hover:scale-105 transition-transform duration-200">
                <ShieldBan className="h-6 w-6 text-white" />
              </span>
              <span
                className={cn(
                  "flex flex-col leading-tight overflow-hidden transition-[opacity,max-width] duration-300 ease-in-out",
                  expanded ? "opacity-100 max-w-[160px]" : "opacity-0 max-w-0"
                )}
              >
                <span className="font-extrabold text-white text-lg tracking-tight whitespace-nowrap">
                  ATM Portal
                </span>
                <span className="text-[11px] uppercase tracking-wider text-red-400 font-bold whitespace-nowrap">
                  Blacklist System
                </span>
              </span>
            </Link>

            {showCollapseToggle && expanded && (
              <button
                onClick={toggleSidebar}
                title="Collapse sidebar"
                aria-label="Collapse sidebar"
                className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg bg-white/5 text-slate-300 hover:bg-red-500 hover:text-white active:scale-95 transition-all duration-150 ring-1 ring-white/10 shrink-0"
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
                aria-label="Expand sidebar"
                className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg bg-white/5 text-slate-300 hover:bg-red-500 hover:text-white active:scale-95 transition-all duration-150 ring-1 ring-white/10"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="px-4">
          <div className="h-px bg-gradient-to-r from-transparent via-slate-700/60 to-transparent" />
        </div>

        {/* Section label */}
        <div
          className={cn(
            "px-5 -mb-2 overflow-hidden transition-[opacity,max-height] duration-300 ease-in-out",
            expanded ? "opacity-100 max-h-8" : "opacity-0 max-h-0"
          )}
        >
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.18em]">
            Navigation
          </p>
        </div>

        {/* Nav items */}
        <nav
          className={cn(
            "flex flex-col gap-1.5 px-3",
            expanded ? "items-stretch" : "items-center"
          )}
        >
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
                  "relative flex items-center rounded-xl transition-all duration-150 group",
                  expanded ? "gap-3 px-3 py-2.5" : "justify-center w-11 h-11 mx-auto",
                  isActive
                    ? "bg-gradient-to-r from-red-500/90 to-red-700/90 text-white font-semibold shadow-lg shadow-red-900/30 ring-1 ring-red-400/30"
                    : "text-slate-400 hover:text-white hover:bg-white/[0.06]"
                )}
              >
                {/* Active accent bar (expanded only) */}
                {isActive && expanded && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-white/80" />
                )}
                <item.icon
                  className="shrink-0 h-5 w-5"
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span
                  className={cn(
                    "text-sm font-medium truncate transition-[opacity,max-width] duration-300 ease-in-out",
                    expanded
                      ? "opacity-100 max-w-[180px]"
                      : "opacity-0 max-w-0 overflow-hidden"
                  )}
                >
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom */}
      <div
        className={cn(
          "flex flex-col gap-3 px-3",
          expanded ? "items-stretch" : "items-center"
        )}
      >
        <button
          title={!expanded ? "Help / Support" : undefined}
          className={cn(
            "flex items-center rounded-xl bg-white/[0.04] text-slate-400 hover:bg-red-500/15 hover:text-red-300 transition-colors duration-150 font-medium ring-1 ring-white/5",
            expanded ? "gap-3 px-3 py-2.5" : "justify-center w-11 h-11 mx-auto"
          )}
        >
          <HelpCircle className="shrink-0 h-5 w-5" strokeWidth={2} />
          <span
            className={cn(
              "text-sm truncate transition-[opacity,max-width] duration-300 ease-in-out",
              expanded
                ? "opacity-100 max-w-[180px]"
                : "opacity-0 max-w-0 overflow-hidden"
            )}
          >
            Help / Support
          </span>
        </button>

        {/* User card */}
        <div
          className={cn(
            "flex items-center rounded-xl bg-white/[0.04] ring-1 ring-white/5",
            expanded ? "gap-3 px-3 py-2.5" : "justify-center w-11 h-11 mx-auto"
          )}
          title={!expanded ? displayName : undefined}
        >
          <Avatar className="h-8 w-8 shrink-0 ring-2 ring-red-500/30">
            <AvatarFallback className="bg-gradient-to-br from-red-500 to-red-700 text-white text-xs font-bold">
              {initial}
            </AvatarFallback>
          </Avatar>
          <div
            className={cn(
              "flex flex-col leading-tight overflow-hidden transition-[opacity,max-width] duration-300 ease-in-out",
              expanded ? "opacity-100 max-w-[170px]" : "opacity-0 max-w-0"
            )}
          >
            <span className="text-sm font-semibold text-white truncate">
              {displayName}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-red-400">
              {user?.role || "ATM"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div
      className="h-screen w-screen overflow-hidden flex bg-slate-100"
      style={{ fontFamily: "'Montserrat', 'Inter', Arial, sans-serif" }}
    >
      <div className="w-full h-full bg-slate-50 flex overflow-hidden">
        {/* Desktop sidebar */}
        <aside
          className={cn(
            "hidden lg:flex flex-shrink-0 relative border-r border-slate-800/50 bg-slate-950 shadow-2xl shadow-black/40",
            "transition-[width] duration-300 ease-in-out will-change-[width] overflow-hidden"
          )}
          style={{ width: sidebarExpanded ? "17rem" : "5rem" }}
        >
          <div className="absolute inset-0">
            <SidebarContent />
          </div>
        </aside>

        {/* Mobile sidebar */}
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetContent
            side="left"
            className="w-72 p-0 bg-slate-950 border-slate-800/50 text-white"
          >
            <SheetTitle className="sr-only">ATM Portal Navigation</SheetTitle>
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
          <header className="px-3 sm:px-4 lg:px-8 flex items-center justify-between gap-3 h-16 shrink-0 bg-white/90 backdrop-blur-xl border-b border-slate-200/80 shadow-sm">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <Button
                onClick={() => setIsMobileMenuOpen(true)}
                variant="ghost"
                size="icon"
                aria-label="Open menu"
                className="hover:bg-slate-100 rounded-full text-slate-800 lg:hidden shrink-0"
              >
                <Menu className="h-5 w-5 text-slate-800" />
              </Button>

              {/* Desktop: breadcrumb-style title */}
              <div className="hidden lg:flex items-center gap-2.5 min-w-0">
                <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-red-50 text-red-600 shrink-0">
                  <activeItem.icon className="h-5 w-5" strokeWidth={2.2} />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                    <span>ATM</span>
                    <ChevronCrumb className="h-3 w-3" />
                    <span className="text-red-600 normal-case tracking-normal">
                      {activeItem.short}
                    </span>
                  </div>
                  <h2 className="text-[15px] font-bold text-slate-800 leading-tight truncate">
                    {activeItem.name}
                  </h2>
                </div>
              </div>

              {/* Mobile: compact title */}
              <div className="lg:hidden flex items-center gap-2 min-w-0">
                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-600 shrink-0">
                  <activeItem.icon className="h-4 w-4" strokeWidth={2.2} />
                </span>
                <h2 className="text-sm font-bold text-slate-800 truncate">
                  {activeItem.short}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex items-center gap-2 px-1.5 sm:px-2 h-11 hover:bg-red-50 rounded-full"
                  >
                    <Avatar className="h-9 w-9 border-2 border-red-200">
                      <AvatarFallback className="bg-gradient-to-br from-red-500 to-red-700 text-white text-sm font-bold">
                        {initial}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden md:block text-left">
                      <p className="text-sm font-semibold text-slate-800 leading-tight max-w-[140px] truncate">
                        {displayName}
                      </p>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-red-600">
                        {user?.role || "ATM"}
                      </p>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60">
                  <DropdownMenuLabel>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 border-2 border-red-200">
                        <AvatarFallback className="bg-gradient-to-br from-red-500 to-red-700 text-white text-sm font-bold">
                          {initial}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 truncate">
                          {displayName}
                        </p>
                        <p className="text-xs text-slate-500 font-normal mt-0.5 truncate">
                          {user?.username || "ATM User"}
                        </p>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="text-red-600 cursor-pointer focus:text-red-600 focus:bg-red-50"
                  >
                    <LogOut className="h-4 w-4 mr-2" /> Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          <main className="flex-1 p-3 sm:p-4 lg:p-8 min-h-0 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:theme(colors.slate.300)_transparent]">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
