"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
  Bell,
  UserCheck,
  Clock,
  X,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const ADMIN_API =
  process.env.NEXT_PUBLIC_ADMIN_API || "http://localhost:5005/api";
const AGENT_API =
  process.env.NEXT_PUBLIC_AGENT_API || "http://localhost:5001/api";

export default function NotificationPanel({ role = "approver" }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      let token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
      if (!token) return;
      token = token.replace(/^["']|["']$/g, "");
      const headers = { Authorization: `Bearer ${token}` };

      if (role === "approver") {
        // Fetch pending profile update requests for Approver
        const res = await axios.get(`${ADMIN_API}/user/profile-update-requests`, {
          headers,
          params: { status: "pending", page: 1, limit: 10 },
        });

        if (res.data?.data) {
          const items = res.data.data.map((item) => {
            const compName =
              item.entityName ||
              item.currentEntityName ||
              item.authorizedPersonName ||
              (item.currentFirstName ? `${item.currentFirstName} ${item.currentLastName || ""}`.trim() : "") ||
              "Company";

            return {
              id: item.id,
              type: "PROFILE_UPDATE_SUBMITTED",
              title: "New Profile Update Request",
              message: `${compName} has submitted a profile update request.`,
              companyName: compName,
              time: item.createdAt || item.requestedAt,
              status: item.status || "pending",
              link: "/traffic_approval/companies?tab=profile_updates",
            };
          });
          setNotifications(items);
          setUnreadCount(res.data.pagination?.totalRecords || items.length);
        }
      } else {
        // Fetch profile update status for Company / Agent
        const res = await axios.get(`${AGENT_API}/agents/profile-update-requests/my-requests`, {
          headers,
        });

        if (res.data?.data && res.data.data.length > 0) {
          const items = res.data.data.slice(0, 5).map((item) => {
            let statusText = "Pending Review";
            let desc = "Your profile update request is pending approval by Traffic Pass Section.";
            if (item.status === "approved") {
              statusText = "Approved";
              desc = "Your profile update request has been approved!";
            } else if (item.status === "reverted") {
              statusText = "Reverted";
              desc = `Your request was reverted. Remarks: ${item.rejectedReason || "Needs modification"}`;
            } else if (item.status === "rejected") {
              statusText = "Rejected";
              desc = `Your request was rejected. Reason: ${item.rejectedReason || "N/A"}`;
            }
            return {
              id: item.id,
              type: "PROFILE_UPDATE_STATUS",
              title: `Profile Update: ${statusText}`,
              message: desc,
              status: item.status,
              time: item.createdAt || item.updatedAt,
              link: "/dashboard/pass_request?tab=apply",
            };
          });
          setNotifications(items);
          const pendingOrActionReq = items.filter((i) => i.status === "pending" || i.status === "reverted");
          setUnreadCount(pendingOrActionReq.length);
        }
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000); // Poll every 15s
    return () => clearInterval(interval);
  }, [role]);

  const handleNotificationClick = (notif) => {
    setIsOpen(false);
    if (notif.link) {
      router.push(notif.link);
    }
  };

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return "Just now";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "Recently";
    const now = new Date();
    const diffSec = Math.floor((now - d) / 1000);
    if (diffSec < 60) return "Just now";
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return `${Math.floor(diffSec / 86400)}d ago`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <Button
        onClick={() => {
          setIsOpen(!isOpen);
          fetchNotifications();
        }}
        variant="ghost"
        size="icon"
        title="Notifications"
        className="relative bg-white dark:bg-white/5 dark:border dark:border-white/10 shadow-sm rounded-full hover:bg-stone-50 dark:hover:bg-white/10 active:scale-95 transition-all duration-150"
      >
        <Bell className="h-5 w-5 text-stone-600 dark:text-stone-300" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-extrabold text-white ring-2 ring-white dark:ring-stone-900 animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>

      {/* Notification Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white dark:bg-[#1a1d27] rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="px-4 py-3 bg-stone-50 dark:bg-stone-900/60 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-black text-stone-900 dark:text-white uppercase tracking-wider">
                Notifications
              </h4>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-extrabold bg-red-500/10 text-red-600 dark:text-red-400 rounded-full border border-red-500/20">
                  {unreadCount} pending
                </span>
              )}
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-stone-400 hover:text-stone-600 dark:hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-stone-100 dark:divide-stone-800/60">
            {notifications.length > 0 ? (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleNotificationClick(item)}
                  className="p-3.5 hover:bg-stone-50 dark:hover:bg-white/5 cursor-pointer transition-all flex items-start gap-3 group"
                >
                  <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0 group-hover:scale-105 transition-transform">
                    <UserCheck className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-extrabold text-stone-900 dark:text-white truncate">
                        {item.title}
                      </p>
                      <span className="text-[10px] font-medium text-stone-400 shrink-0 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTimeAgo(item.time)}
                      </span>
                    </div>
                    <p className="text-xs text-stone-600 dark:text-stone-300 mt-1 leading-relaxed line-clamp-2 font-medium">
                      {item.message}
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-100/60 dark:bg-amber-950/60 px-2 py-0.5 rounded-md">
                        Review Profile Changes
                      </span>
                      <ChevronRight className="h-3.5 w-3.5 text-stone-400 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center">
                <Bell className="h-8 w-8 text-stone-300 dark:text-stone-600 mx-auto mb-2" />
                <p className="text-xs font-bold text-stone-600 dark:text-stone-400">
                  No new notifications
                </p>
                <p className="text-[11px] text-stone-400 mt-1">
                  You're all caught up! Profile update change requests will appear here.
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && role === "approver" && (
            <div className="p-2.5 bg-stone-50 dark:bg-stone-900/60 border-t border-stone-200 dark:border-stone-800 text-center">
              <button
                onClick={() => {
                  setIsOpen(false);
                  router.push("/traffic_approval/companies?tab=profile_updates");
                }}
                className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline inline-flex items-center gap-1"
              >
                View All Profile Updates <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
