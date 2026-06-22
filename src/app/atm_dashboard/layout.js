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
  LogOut,
  Menu,
  HelpCircle,
  ShieldBan,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const AUTH_API = process.env.NEXT_PUBLIC_AUTH_API;

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
      try { localStorage.setItem("atm-sidebar", next ? "expanded" : "collapsed"); } catch {}
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-red-950 flex items-center justify-center" style={{ fontFamily: "'Montserrat', 'Inter', Arial, sans-serif" }}>
        <div className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-white/10 backdrop-blur-xl ring-1 ring-white/10 shadow-xl">
          <span className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-red-500 text-white shrink-0">
            <ShieldBan className="h-5 w-5" strokeWidth={2.5} />
            <span className="absolute inset-0 rounded-xl ring-2 ring-red-400/60 animate-ping" />
          </span>
          <span className="text-sm font-semibold text-stone-200 tracking-wide">Loading ATM Dashboard</span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-bounce [animation-delay:-0.3s]" />
            <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-bounce [animation-delay:-0.15s]" />
            <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-bounce" />
          </span>
        </div>
      </div>
    );
  }

  const navigationItems = [
    { name: "Blacklist Management", href: "/atm_dashboard", icon: ShieldBan },
  ];

  const SidebarContent = ({ onNavigate, expanded = sidebarExpanded, showCollapseToggle = true }) => (
    <div className="h-full flex flex-col justify-between py-6 bg-slate-950 text-white overflow-hidden">
      <div className="flex flex-col gap-6">
        {/* Brand row — expanded: logo+text left, toggle right. collapsed: logo centered, toggle below */}
        <div className="flex flex-col gap-2 px-4">
          <div className={cn("flex items-center", expanded ? "justify-between" : "justify-center")}>
            <Link
              href="/atm_dashboard"
              className="flex items-center gap-3 group min-w-0"
              onClick={onNavigate}
            >
              <span className="flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-red-500 to-red-700 shadow-lg shadow-red-900/40 shrink-0 group-hover:scale-105 transition-transform duration-200">
                <ShieldBan className="h-6 w-6 text-white" />
              </span>
              <span
                className={cn(
                  "flex flex-col leading-tight overflow-hidden transition-[opacity,max-width] duration-300 ease-in-out",
                  expanded ? "opacity-100 max-w-[160px]" : "opacity-0 max-w-0"
                )}
              >
                <span className="font-extrabold text-white text-lg tracking-tight whitespace-nowrap">ATM Portal</span>
                <span className="text-xs uppercase tracking-wider text-red-400 font-bold whitespace-nowrap">Blacklist System</span>
              </span>
            </Link>

            {/* Toggle only shows inline when expanded */}
            {showCollapseToggle && expanded && (
              <button
                onClick={toggleSidebar}
                title="Collapse sidebar"
                className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg bg-white/10 text-white hover:bg-red-500 hover:text-white active:scale-95 transition-all duration-150 font-bold shadow-md shrink-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Toggle shows below logo when collapsed */}
          {showCollapseToggle && !expanded && (
            <div className="flex justify-center">
              <button
                onClick={toggleSidebar}
                title="Expand sidebar"
                className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg bg-white/10 text-white hover:bg-red-500 hover:text-white active:scale-95 transition-all duration-150 font-bold shadow-md"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* Section label */}
        <div className={cn("px-4 overflow-hidden transition-[opacity,max-height] duration-300 ease-in-out", expanded ? "opacity-100 max-h-8" : "opacity-0 max-h-0")}>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Menu</p>
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
                    ? "bg-gradient-to-r from-red-500 to-red-700 text-white font-bold shadow-lg shadow-red-900/30"
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

      {/* Bottom */}
      <div className={cn("flex flex-col gap-2 px-3", expanded ? "items-stretch" : "items-center")}>
        <button
          title={!expanded ? "Help / Support" : undefined}
          className={cn(
            "flex items-center rounded-xl bg-white/5 text-slate-400 hover:bg-red-500/20 hover:text-red-300 transition-colors duration-150 font-medium",
            expanded ? "gap-3 px-3 py-2.5" : "justify-center w-11 h-11 mx-auto"
          )}
        >
          <HelpCircle className="shrink-0 h-5 w-5" strokeWidth={2} />
          <span className={cn(
            "text-sm truncate transition-[opacity,max-width] duration-300 ease-in-out",
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
      className="h-screen w-screen overflow-hidden flex bg-slate-100"
      style={{ fontFamily: "'Montserrat', 'Inter', Arial, sans-serif" }}
    >
      <div className="w-full h-full bg-slate-50 flex overflow-hidden">
        {/* Desktop sidebar — width transition only, GPU-composited */}
        <aside
          className={cn(
            "hidden lg:flex flex-shrink-0 relative border-r border-slate-800/50 bg-slate-950 shadow-2xl shadow-black/40",
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
          <SheetContent side="left" className="w-72 p-0 bg-slate-950 border-slate-800/50 text-white">
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
          <header className="px-4 lg:px-8 flex items-center justify-between h-16 shrink-0 bg-white/80 backdrop-blur-xl border-b border-slate-200/80 shadow-sm">
            <div className="flex items-center gap-3 min-w-0">
              <Button
                onClick={() => setIsMobileMenuOpen(true)}
                variant="ghost"
                size="icon"
                className="hover:bg-slate-100 rounded-full text-slate-800 lg:hidden"
              >
                <Menu className="h-5 w-5 text-slate-800" />
              </Button>

              <div className="hidden lg:flex items-center gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-800">ATM — Blacklist Management</h2>
                  <p className="text-xs text-slate-500">Manage blacklisted vehicles, persons, drivers &amp; companies</p>
                </div>
              </div>

              <div className="lg:hidden">
                <h2 className="text-base font-bold text-slate-800 truncate">ATM Portal</h2>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 px-2 hover:bg-red-50">
                    <Avatar className="h-9 w-9 border-2 border-red-200">
                      <AvatarFallback className="bg-gradient-to-br from-red-500 to-red-700 text-white text-sm font-bold">
                        {user?.username?.charAt(0)?.toUpperCase() || "A"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden md:block text-left">
                      <p className="text-sm font-medium text-slate-800 leading-tight">{user?.username ? user.username.split("@")[0] : "ATM User"}</p>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-red-600">{user?.role || "ATM"}</p>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div>
                      <p className="font-semibold text-slate-800">{user?.username || "ATM User"}</p>
                      <p className="text-xs text-slate-500 font-normal mt-0.5">{user?.role}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600 cursor-pointer focus:text-red-600">
                    <LogOut className="h-4 w-4 mr-2" /> Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          <main className="flex-1 p-4 lg:p-8 min-h-0 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:theme(colors.slate.300)_transparent]">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
