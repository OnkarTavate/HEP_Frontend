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
  CreditCard,
  Users,
  LogOut,
  Menu,
  Bell,
  Wallet,
  ChevronRight,
  Search,
  Sparkles,
  HelpCircle,
  Lock, // Added Lock icon for Forgot Password
  Database,
} from "lucide-react";
import { cn } from "@/lib/utils";

import axios from "axios";
import { useBeaconLogout } from "@/lib/useBeaconLogout";
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
    { name: "Wallet", href: "/dashboard/wallet", icon: Wallet },
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

  // Clear Redis session when the tab/browser is closed
  useBeaconLogout();

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-orange-50/30 to-amber-50/50">
        <div className="text-center">
          <div className="relative inline-block">
            <Ship className="h-14 w-14 text-primary animate-pulse mx-auto" />
            <div className="absolute inset-0 h-14 w-14 mx-auto rounded-full bg-primary/20 animate-ping" />
          </div>
          <p className="text-slate-500 mt-6">Loading...</p>
        </div>
      </div>
    );
  }

  const navigationItems = getNavigationItems(user.role);

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white">
      {/* Logo Section */}
      <div className="p-6 border-b border-orange-100">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="relative flex items-center justify-center w-11 h-11 rounded-xl gradient-orange shadow-lg shadow-orange-600/20">
            <Ship className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-slate-800 text-lg leading-tight">
              Port Gate
            </h1>
            <p className="text-xs text-orange-600 font-medium">
              Automation System
            </p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        <p className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Menu
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
              Get Support
            </Button>
          </div>
        </div>
      </div>

      {/* Lower Left User Info Component has been REMOVED */}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50/20 to-amber-50/30">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:block lg:w-72 lg:border-r lg:border-slate-200/80 lg:bg-white lg:shadow-xl lg:shadow-slate-200/30">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <SheetContent
          side="left"
          className="w-72 p-0 bg-white border-slate-200"
        >
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Main Content Area */}
      <div className="lg:pl-72">
        {/* Top Header */}
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between h-16 px-4 lg:px-8">
            {/* Mobile Menu Button */}
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild className="lg:hidden">
                <Button
                  variant="ghost"
                  size="icon"
                  className="hover:bg-primary/10"
                >
                  <Menu className="h-5 w-5 text-slate-600" />
                </Button>
              </SheetTrigger>
            </Sheet>

            {/* Page Title - Desktop */}
            <div className="hidden lg:flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary/10 to-amber-500/10">
                {(() => {
                  const currentItem = navigationItems.find(
                    (item) => item.href === pathname,
                  );
                  const Icon = currentItem?.icon || LayoutDashboard;
                  return <Icon className="h-5 w-5 text-primary" />;
                })()}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-800">
                  {navigationItems.find((item) => item.href === pathname)
                    ?.name || "Dashboard"}
                </h2>
                <p className="text-xs text-slate-500">
                  Port Gate Automation System
                </p>
              </div>
            </div>

            {/* Mobile Logo */}
            <div className="lg:hidden flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-amber-500">
                <Ship className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold text-slate-800">Port Gate</span>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-2">
              {/* Search - Desktop */}
              <div className="hidden md:flex relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-64 h-10 pl-10 pr-4 rounded-xl bg-slate-50 border border-slate-200 text-sm placeholder:text-slate-400 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
                />
              </div>

              {/* Notifications */}
              <Button
                variant="ghost"
                size="icon"
                className="relative hover:bg-primary/10"
              >
                <Bell className="h-5 w-5 text-slate-600" />
                <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-primary rounded-full border-2 border-white" />
              </Button>

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex items-center gap-2 px-2 hover:bg-primary/10"
                  >
                    <Avatar className="h-9 w-9 border-2 border-primary/20">
                      <AvatarFallback className="bg-gradient-to-br from-primary/20 to-amber-500/20 text-primary text-sm font-bold">
                        {user?.username?.charAt(0)?.toUpperCase() || "A"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden md:block text-left">
                      <p className="text-sm font-medium text-slate-800 leading-tight">
                        {user?.username ? user.username.split("@")[0] : "User"}
                      </p>
                      <p className="text-xs text-slate-500">{user.role}</p>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div>
                      <p className="font-semibold text-slate-800">
                        {user?.username || "User"}
                      </p>
                      <p className="text-xs text-slate-500 font-normal">
                        {user.role}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />

                  {/* Forgot Password Added Here */}
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={() => router.push("/forgot-password")}
                  >
                    <Lock className="h-4 w-4 mr-2 text-slate-500" />
                    Forgot Password
                  </DropdownMenuItem>

                  {/* Settings Removed from Here */}

                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="text-red-600 cursor-pointer"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-8 min-h-[calc(100vh-4rem)]">{children}</main>
      </div>
    </div>
  );
}
