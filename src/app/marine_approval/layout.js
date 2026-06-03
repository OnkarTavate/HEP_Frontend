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
  HelpCircle,
  Lock,
  FileText,
  Building2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const AUTH_API = process.env.NEXT_PUBLIC_AUTH_API;

export default function MarineLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  if (!user) return <div className="p-12 text-center">Loading...</div>;

  // MARINE SPECIFIC NAVIGATION
  const navigationItems = [
    { name: "Pass Approvals", href: "/marine_approval", icon: FileText },
  ];

  const renderSidebar = ({ onNavigate, expanded = sidebarExpanded, showCollapseToggle = true }) => (
    <div
      className={cn(
        "h-full flex flex-col justify-between py-6 bg-slate-900 border-r border-slate-800 transition-all duration-300 text-white",
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50/20 to-amber-50/30 transition-colors duration-300" style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:block lg:border-r lg:border-slate-800 lg:bg-slate-900 lg:shadow-xl lg:shadow-black/30 transition-[width] duration-300 ease-in-out",
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

      <div className={cn("transition-[padding] duration-300 ease-in-out", sidebarExpanded ? "lg:pl-72" : "lg:pl-20")}>
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between h-16 px-4 lg:px-8">
            <div className="flex items-center gap-3 min-w-0">
              {/* Mobile menu trigger */}
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
                  <h2 className="text-lg font-semibold text-slate-800">
                    Marine Approval Dashboard
                  </h2>
                  <p className="text-xs text-slate-500">
                    Manage Permits and Company Registrations
                  </p>
                </div>
              </div>

              <div className="lg:hidden">
                <h2 className="text-base font-bold text-slate-800 truncate">
                  Marine Dept
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex items-center gap-2 px-2 hover:bg-primary/10"
                  >
                    <Avatar className="h-9 w-9 border-2 border-primary/20">
                      <AvatarFallback className="bg-[#0a1e4d] text-white text-sm font-bold">
                        {user?.username?.charAt(0)?.toUpperCase() || "MA"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden md:block text-left">
                      <p className="text-sm font-medium text-slate-800 leading-tight">
                        {user?.username ? user.username.split("@")[0] : "Marine Admin"}
                      </p>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#ff6b00]">
                        {user?.role || "Approver"}
                      </p>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
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
                    onClick={handleLogout}
                    className="text-red-600 cursor-pointer focus:text-red-600"
                  >
                    <LogOut className="h-4 w-4 mr-2" /> Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <main className="p-4 lg:p-8 min-h-[calc(100vh-4rem)]">{children}</main>
      </div>
    </div>
  );
}
