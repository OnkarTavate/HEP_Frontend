"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { ShieldOff, LogOut, Home } from "lucide-react";

const AUTH_API = process.env.NEXT_PUBLIC_AUTH_API || "http://localhost:5006";

export default function NoAccessPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const raw = localStorage.getItem("user");
    if (!raw) { router.replace("/"); return; }
    setUser(JSON.parse(raw));
  }, [router]);

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem("accessToken")?.replace(/^["']|["']$/g, "");
      await axios.post(`${AUTH_API}/auth/logout`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch { /* best-effort */ }
    localStorage.clear();
    router.replace("/");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      {/* Card */}
      <div className="bg-white rounded-3xl shadow-2xl shadow-slate-200 border border-slate-200 p-8 sm:p-12 max-w-md w-full text-center space-y-6">

        {/* Icon */}
        <div className="flex justify-center">
          <span className="flex h-20 w-20 items-center justify-center rounded-3xl bg-red-50 border-2 border-red-100">
            <ShieldOff className="h-10 w-10 text-red-400" strokeWidth={1.8} />
          </span>
        </div>

        {/* Heading */}
        <div className="space-y-2">
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">
            No Portal Assigned
          </h1>
          <p className="text-sm text-slate-500 leading-relaxed">
            Your account is authenticated, but no portal has been assigned to
            your role yet. Please contact your system administrator.
          </p>
        </div>

        {/* User info */}
        {user && (
          <div className="rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3 text-left space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Logged in as</p>
            <p className="text-sm font-bold text-slate-700">{user.name || user.userName || user.username || "—"}</p>
            <p className="text-xs text-slate-500">Role: <span className="font-semibold text-slate-700">{user.role || "—"}</span></p>
            {user.departmentName && (
              <p className="text-xs text-slate-500">Department: <span className="font-semibold text-slate-700">{user.departmentName}</span></p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 shadow-lg shadow-red-500/25 transition-all"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
          <button
            onClick={() => router.replace("/")}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200 transition-all"
          >
            <Home className="h-4 w-4" />
            Back to Login
          </button>
        </div>

        <p className="text-[10px] text-slate-300 font-medium">
          APACS — Chennai Port Authority · HEP System
        </p>
      </div>
    </div>
  );
}
