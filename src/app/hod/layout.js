"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BadgeCheck,
  Bell,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Copy,
  CheckCheck,
  Briefcase,
  Building2,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  Moon,
  Phone,
  Search,
  Ship,
  Sun,
  User,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

function ProfileDetailRow({ icon: Icon, label, value, copyKey, copiedField, onCopy }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-stone-100 dark:border-white/5 last:border-0">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-100 dark:bg-white/5 text-stone-500 dark:text-stone-400 shrink-0 mt-0.5">
        <Icon className="h-4 w-4" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider">
          {label}
        </p>
        <p className="text-sm font-semibold text-stone-800 dark:text-stone-100 truncate">
          {value || "—"}
        </p>
      </div>
      {value && value !== "—" && (
        <button
          type="button"
          onClick={() => onCopy(value, copyKey)}
          className="shrink-0 p-1 rounded text-stone-400 hover:text-amber-600 transition-colors"
          title="Copy"
        >
          {copiedField === copyKey ? (
            <CheckCheck className="h-3.5 w-3.5 text-emerald-500" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </button>
      )}
    </div>
  );
}

function HodProfilePanel({ user, displayName, department, initials, onLogout }) {
  const [open, setOpen] = useState(false);
  const [copiedField, setCopiedField] = useState(null);
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    const handleOutsideClick = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [open]);

  const copyField = (value, key) => {
    navigator.clipboard.writeText(String(value || "")).then(() => {
      setCopiedField(key);
      setTimeout(() => setCopiedField(null), 2000);
    });
  };

  const username = user?.username || user?.userName || "HOD";
  const email = user?.email || "—";
  const mobile = user?.mobile || user?.mobileNo || user?.phoneNumber || "—";

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex items-center gap-2.5 rounded-2xl px-3 py-2 bg-black/90 hover:bg-black text-white dark:bg-white/5 dark:hover:bg-white/10 dark:border dark:border-white/10 shadow-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-orange-500/40 active:scale-95 cursor-pointer"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-[#1f1f1f] text-base font-extrabold shrink-0 shadow-md ring-2 ring-amber-300/30">
          {initials}
        </span>
        <span className="hidden sm:flex flex-col text-left leading-tight min-w-0 pr-1">
          <span className="text-sm font-extrabold truncate max-w-[140px] text-white">
            {displayName}
          </span>
          <span className="text-[10px] uppercase tracking-wider text-orange-400 font-bold truncate">
            HOD
          </span>
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-stone-400 transition-transform duration-200 hidden sm:block",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+10px)] z-[200] w-80 rounded-3xl bg-white dark:bg-[#1f232d] shadow-[0_8px_40px_rgba(0,0,0,0.18)] ring-1 ring-stone-200/70 dark:ring-white/10 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <div className="bg-gradient-to-r from-[#1f1f1f] via-[#2a2520] to-[#3a2f1f] px-5 py-4 relative overflow-hidden">
            <svg aria-hidden viewBox="0 0 320 80" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 h-10 w-full text-amber-400/10">
              <path fill="currentColor" d="M0,40 C80,80 160,0 240,40 C280,60 300,30 320,40 L320,80 L0,80 Z" />
            </svg>
            <div className="relative flex items-center gap-3">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-[#1f1f1f] text-xl font-extrabold shrink-0 shadow-lg ring-2 ring-amber-300/30">
                {initials}
              </span>
              <div className="min-w-0 flex-1 text-left">
                <p className="text-base font-extrabold text-white leading-tight truncate">
                  {displayName}
                </p>
                <p className="text-xs text-stone-400 font-mono mt-0.5 truncate">
                  {username}
                </p>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold mt-1.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300">
                  Active
                </span>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-white/50 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="px-4 pt-2 pb-1 max-h-[340px] overflow-y-auto [scrollbar-width:thin] text-left">
            <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500 mb-2 mt-2">
              Account Profile
            </p>
            <ProfileDetailRow icon={User} label="Login ID" value={username} copyKey="login" copiedField={copiedField} onCopy={copyField} />
            <ProfileDetailRow icon={Briefcase} label="Role" value="HOD" copyKey="role" copiedField={copiedField} onCopy={copyField} />
            <ProfileDetailRow icon={Building2} label="Department" value={department} copyKey="department" copiedField={copiedField} onCopy={copyField} />
            <ProfileDetailRow icon={Mail} label="Email" value={email} copyKey="email" copiedField={copiedField} onCopy={copyField} />
            <ProfileDetailRow icon={Phone} label="Mobile" value={mobile} copyKey="mobile" copiedField={copiedField} onCopy={copyField} />
          </div>

          <div className="p-3 border-t border-stone-100 dark:border-white/5">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onLogout();
              }}
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

export default function HodLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedUser = localStorage.getItem("user");
    if (!storedUser) {
      router.push("/");
      return;
    }

    const parsedUser = JSON.parse(storedUser);
    const role = String(parsedUser.role || parsedUser.roleName || "")
      .toLowerCase()
      .trim();

    if (role !== "hod") {
      router.push("/");
      return;
    }

    const savedSidebar = localStorage.getItem("hod-sidebar");
    const savedTheme = localStorage.getItem("hod-theme");

    const timer = setTimeout(() => {
      setUser(parsedUser);
      setSidebarExpanded(savedSidebar !== "collapsed");
      setDarkMode(savedTheme === "dark");
    }, 0);

    return () => clearTimeout(timer);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    router.push("/");
  };

  const toggleSidebar = () => {
    setSidebarExpanded((prev) => {
      const next = !prev;
      localStorage.setItem("hod-sidebar", next ? "expanded" : "collapsed");
      return next;
    });
  };

  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      const next = !prev;
      localStorage.setItem("hod-theme", next ? "dark" : "light");
      return next;
    });
  };

  const navigationItems = [
    { name: "HOD Dashboard", href: "/hod", icon: LayoutDashboard },
    { name: "VVIP Pass", href: "/hod/vvip-pass", icon: BadgeCheck },
  ];

  const displayName =
    user?.name ||
    user?.userName ||
    user?.username?.split("@")[0] ||
    "HOD";
  const department = user?.departmentName || user?.department || "Department";
  const initials = String(displayName).slice(0, 2).toUpperCase();

  const renderSidebar = ({ expanded = sidebarExpanded, onNavigate, showCollapseToggle = true }) => (
    <div
      className={cn(
        "h-full flex flex-col justify-between py-8 bg-slate-900 dark:bg-slate-950 border-r border-slate-850 dark:border-white/5 transition-all duration-300",
        expanded ? "items-stretch px-4 w-full" : "items-center w-full",
      )}
    >
      <div className={cn("space-y-6 flex flex-col", expanded ? "items-stretch" : "items-center")}>
        <div className={cn("flex items-center", expanded ? "justify-between" : "justify-center")}>
          <Link href="/hod" onClick={onNavigate} className="flex items-center gap-3 group">
            <span className="flex items-center justify-center w-12 h-12 rounded-2xl bg-slate-800 dark:bg-amber-400 text-amber-400 dark:text-[#1f1f1f] shadow-lg shrink-0 group-hover:scale-105 transition-transform duration-200">
              <Ship className="h-6 w-6" />
            </span>
            {expanded && (
              <span className="flex flex-col leading-tight">
                <span className="font-extrabold text-white text-xl tracking-tight">
                  APACS
                </span>
                <span className="text-xs uppercase tracking-wider text-amber-400 font-bold">
                  HOD Portal
                </span>
              </span>
            )}
          </Link>

          {showCollapseToggle && (
            <button
              type="button"
              onClick={toggleSidebar}
              title={expanded ? "Collapse sidebar" : "Expand sidebar"}
              className={cn(
                "hidden lg:flex items-center justify-center w-9 h-9 rounded-xl bg-white/10 text-white hover:bg-amber-500 hover:text-slate-950 active:scale-95 transition-all duration-200 font-bold",
                !expanded && "absolute -right-3 top-10 z-10",
              )}
            >
              {expanded ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
            </button>
          )}
        </div>

        {expanded && (
          <p className="px-2 text-xs font-bold text-slate-500 uppercase tracking-widest">
            Global Menu
          </p>
        )}

        <nav className={cn("flex flex-col gap-2", expanded ? "items-stretch" : "items-center")}>
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== "/hod" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
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
                <Icon className={cn("shrink-0", expanded ? "h-6 w-6" : "h-5 w-5")} strokeWidth={2.5} />
                {expanded && <span className="flex-1 truncate">{item.name}</span>}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className={cn("flex flex-col gap-4", expanded ? "items-stretch" : "items-center")}>
        <button
          type="button"
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

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm font-semibold text-slate-500">
        Loading HOD dashboard...
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
      <div className="w-full h-full bg-slate-50 dark:bg-[#11131e] flex overflow-hidden transition-colors duration-300">
        <aside
          className={cn(
            "hidden lg:flex flex-shrink-0 relative transition-[width] duration-300 ease-in-out",
            sidebarExpanded ? "w-64" : "w-24",
          )}
        >
          {renderSidebar({})}
        </aside>

        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetContent side="left" className="w-72 p-0 bg-slate-900 dark:bg-slate-950 border-slate-800 dark:border-white/5">
            <SheetTitle className="sr-only">HOD Navigation Sidebar</SheetTitle>
            <SheetDescription className="sr-only">Access HOD modules</SheetDescription>
            {renderSidebar({
              expanded: true,
              showCollapseToggle: false,
              onNavigate: () => setIsMobileMenuOpen(false),
            })}
          </SheetContent>
        </Sheet>

        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          <header className="px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-3 shrink-0 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border-b border-slate-200/50 dark:border-white/5 transition-all duration-300 relative z-50">
            <div className="flex items-center gap-3 min-w-0">
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild className="lg:hidden">
                  <Button variant="ghost" size="icon" className="hover:bg-white dark:hover:bg-white/10 rounded-full text-slate-800 dark:text-stone-200">
                    <Menu className="h-5 w-5 text-[#1f1f1f] dark:text-stone-200" />
                  </Button>
                </SheetTrigger>
              </Sheet>

              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#1f1f1f] dark:text-stone-100 truncate">
                  Hi, {displayName}!
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden md:flex bg-white dark:bg-slate-800/40 px-4 py-2.5 rounded-full shadow-sm items-center gap-2 w-72 border border-slate-200/60 dark:border-white/5 focus-within:ring-4 focus-within:ring-amber-500/10 focus-within:border-amber-400 transition-all duration-200">
                <Search className="h-4 w-4 text-stone-400 dark:text-stone-500" />
                <input
                  type="text"
                  placeholder="Search"
                  className="outline-none bg-transparent w-full text-sm text-stone-700 dark:text-stone-200 placeholder:text-stone-400 dark:placeholder:text-stone-500"
                />
              </div>

              <Button
                onClick={toggleDarkMode}
                variant="ghost"
                size="icon"
                title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
                className="relative bg-white dark:bg-white/5 dark:border dark:border-white/10 shadow-sm rounded-full hover:bg-stone-50 dark:hover:bg-white/10 active:scale-95 transition-all duration-200"
              >
                {darkMode ? <Sun className="h-5 w-5 text-amber-300" /> : <Moon className="h-5 w-5 text-stone-600" />}
              </Button>

              <Button variant="ghost" size="icon" className="relative bg-white dark:bg-white/5 dark:border dark:border-white/10 shadow-sm rounded-full hover:bg-stone-50 dark:hover:bg-white/10 active:scale-95 transition-all duration-200">
                <Bell className="h-5 w-5 text-stone-600 dark:text-stone-300" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-orange-500 rounded-full" />
              </Button>

              <HodProfilePanel
                user={user}
                displayName={displayName}
                department={department}
                initials={initials}
                onLogout={handleLogout}
              />
            </div>
          </header>

          <main className="flex-1 px-4 sm:px-6 lg:px-8 pb-6 min-h-0 overflow-y-auto scroll-smooth [scrollbar-width:thin] [scrollbar-color:theme(colors.stone.300)_transparent] dark:[scrollbar-color:theme(colors.stone.700)_transparent]">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
