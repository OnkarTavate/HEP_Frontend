"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BadgeCheck, LogOut, Ship } from "lucide-react";
import { cn } from "@/lib/utils";

export default function HodLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");

    if (!storedUser) {
      router.push("/");
      return;
    }

    const parsedUser = JSON.parse(storedUser);
    const role = String(parsedUser.role || "").toLowerCase().trim();

    if (role !== "hod") {
      router.push("/");
      return;
    }

    const timer = setTimeout(() => setUser(parsedUser), 0);
    return () => clearTimeout(timer);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    router.push("/");
  };

  if (!user) {
    return <div className="p-12 text-center">Loading...</div>;
  }

  const navigationItems = [
    { name: "VVIP Pass", href: "/hod/vvip-pass", icon: BadgeCheck },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-900">
      <aside className="w-72 shrink-0 bg-slate-950 text-white">
        <div className="flex h-full flex-col">
          <div className="border-b border-white/10 p-6">
            <Link href="/hod" className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500">
                <Ship className="h-6 w-6" />
              </span>
              <div>
                <p className="text-lg font-bold leading-tight">HOD Portal</p>
                <p className="text-xs font-semibold uppercase tracking-wider text-orange-300">
                  Port Gate
                </p>
              </div>
            </Link>
          </div>

          <nav className="flex-1 space-y-1 p-4">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition",
                    active
                      ? "bg-orange-500 text-white"
                      : "text-slate-300 hover:bg-white/10 hover:text-white",
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-white/10 p-4">
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              <LogOut className="h-5 w-5" />
              Logout
            </button>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
