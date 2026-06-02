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
} from "lucide-react";
import { cn } from "@/lib/utils";

const AUTH_API = process.env.NEXT_PUBLIC_AUTH_API;

export default function MarineLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white">
      <div className="p-6 border-b border-orange-100">
        <Link
          href="/marine_approval"
          className="flex items-center gap-3 group"
        >
          <div className="relative flex items-center justify-center w-11 h-11 rounded-xl bg-[#ff6b00] shadow-lg shadow-orange-600/20">
            <Ship className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-slate-800 text-lg leading-tight">
              Marine Dept
            </h1>
            <p className="text-xs text-orange-600 font-medium">
              Port Approvals
            </p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        <p className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Task Menu
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
                  ? "bg-slate-800 text-white shadow-lg"
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
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50/20 to-amber-50/30" style={{ fontFamily: 'Arial, sans-serif' }}>
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:block lg:w-72 lg:border-r lg:border-slate-200/80 lg:bg-white lg:shadow-xl lg:shadow-slate-200/30">
        <SidebarContent />
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between h-16 px-4 lg:px-8">
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

            <div className="flex items-center gap-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex items-center gap-2 px-2 hover:bg-primary/10"
                  >
                    <Avatar className="h-9 w-9 border-2 border-primary/20">
                      <AvatarFallback className="bg-[#0a1e4d] text-white text-sm font-bold">
                        MA
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden md:block text-left">
                      <p className="text-sm font-medium text-slate-800 leading-tight">
                        Marine Admin
                      </p>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#ff6b00]">
                        Approver
                      </p>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
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
