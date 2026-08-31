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
  CheckCheck,
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
  const [readIds, setReadIds] = useState([]);
  const dropdownRef = useRef(null);

  // Load read notification IDs from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("read_notification_ids");
        if (saved) setReadIds(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load read notification IDs:", e);
      }
    }
  }, []);

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

      const currentPath = typeof window !== "undefined" ? window.location.pathname : "";
      const approverPassUpdateLink = currentPath.startsWith("/admin")
        ? "/admin/pass-approvals"
        : "/traffic_approval";
      const approverProfileUpdateLink = currentPath.startsWith("/admin")
        ? "/admin/companies"
        : "/traffic_approval/companies";

      let savedRead = readIds;
      if (typeof window !== "undefined") {
        try {
          const saved = localStorage.getItem("read_notification_ids");
          if (saved) savedRead = JSON.parse(saved);
        } catch (e) {}
      }

      if (role === "approver") {
        // Approver ONLY receives PENDING requests requiring approval action
        let profileItems = [];
        try {
          const res = await axios.get(`${ADMIN_API}/user/profile-update-requests`, {
            headers,
            params: { status: "pending", page: 1, limit: 10 },
          });
          if (res.data?.data) {
            profileItems = res.data.data
              .filter((item) => String(item.status).toLowerCase() === "pending")
              .map((item) => {
                const compName =
                  item.entityName ||
                  item.currentEntityName ||
                  item.authorizedPersonName ||
                  (item.currentFirstName ? `${item.currentFirstName} ${item.currentLastName || ""}`.trim() : "") ||
                  "Company";

                return {
                  id: `profile-${item.id}`,
                  type: "PROFILE_UPDATE_SUBMITTED",
                  title: "New Profile Update Request",
                  message: `${compName} has submitted a profile update request.`,
                  companyName: compName,
                  time: item.createdAt || item.requestedAt,
                  status: item.status || "pending",
                  link: approverProfileUpdateLink,
                  targetTab: "profile_updates",
                  badgeText: "Profile Update",
                };
              });
          }
        } catch (e) {
          console.error("Profile update notifications fetch error:", e);
        }

        // Fetch PENDING two-wheeler vehicle update requests for Approver
        let twoWheelerItems = [];
        try {
          const twRes = await axios.get(`${AGENT_API}/pass-request/two-wheeler-update-requests`, {
            headers,
            params: { status: "PENDING" },
          });
          if (twRes.data?.data) {
            twoWheelerItems = (twRes.data.data || [])
              .filter((item) => item.status === "PENDING")
              .map((item) => ({
                id: `tw-${item.id}`,
                type: "TWO_WHEELER_UPDATE_SUBMITTED",
                title: "Two-Wheeler Vehicle Update",
                message: `${item.companyName || item.personName || "Company"} requested two-wheeler change to ${item.newVehicleNo}.`,
                companyName: item.companyName,
                time: item.createdAt,
                status: item.status,
                link: approverPassUpdateLink,
                targetTab: "pass_updates",
                badgeText: "Vehicle Update",
              }));
          }
        } catch (e) {
          console.error("Two-wheeler notifications fetch error:", e);
        }

        const combined = [...twoWheelerItems, ...profileItems].sort(
          (a, b) => new Date(b.time || 0) - new Date(a.time || 0)
        );
        setNotifications(combined);
        const unread = combined.filter((i) => !savedRead.includes(i.id));
        setUnreadCount(unread.length);
      } else {
        // Company / Agent receives status updates (Pending, Approved, Rejected) for their requests
        let profileItems = [];
        try {
          const res = await axios.get(`${AGENT_API}/agents/profile-update-requests/my-requests`, {
            headers,
          });

          if (res.data?.data && res.data.data.length > 0) {
            profileItems = res.data.data.slice(0, 5).map((item) => {
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
                id: `profile-my-${item.id}-${item.status}`,
                type: "PROFILE_UPDATE_STATUS",
                title: `Profile Update: ${statusText}`,
                message: desc,
                status: item.status,
                time: item.createdAt || item.updatedAt,
                link: "/dashboard/pass_request",
                badgeText: "Profile Update",
              };
            });
          }
        } catch (e) {
          console.error("Profile notifications error:", e);
        }

        // Fetch two-wheeler vehicle update status for Company / Agent
        let twoWheelerItems = [];
        try {
          const twRes = await axios.get(`${AGENT_API}/pass-request/two-wheeler-update-requests`, {
            headers,
          });
          if (twRes.data?.data && twRes.data.data.length > 0) {
            twoWheelerItems = twRes.data.data.slice(0, 5).map((item) => {
              let statusText = "Pending Review";
              let desc = `Your two-wheeler change request (${item.newVehicleNo}) is pending approval.`;
              if (item.status === "APPROVED") {
                statusText = "Approved";
                desc = `Your two-wheeler vehicle number change to ${item.newVehicleNo} has been approved!`;
              } else if (item.status === "REJECTED") {
                statusText = "Rejected";
                desc = `Your two-wheeler change request was rejected. Reason: ${item.rejectedReason || "N/A"}`;
              }
              return {
                id: `tw-my-${item.id}-${item.status}`,
                type: "TWO_WHEELER_UPDATE_STATUS",
                title: `Vehicle Update: ${statusText}`,
                message: desc,
                status: item.status,
                time: item.createdAt || item.updatedAt,
                link: "/dashboard/pass_request",
                badgeText: "Vehicle Update",
              };
            });
          }
        } catch (e) {
          console.error("Two-wheeler notifications error:", e);
        }

        const combined = [...twoWheelerItems, ...profileItems].sort(
          (a, b) => new Date(b.time || 0) - new Date(a.time || 0)
        );
        setNotifications(combined);
        const unread = combined.filter((i) => !savedRead.includes(i.id));
        setUnreadCount(unread.length);
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    }
  };

  useEffect(() => {
    fetchNotifications();

    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      fetchNotifications();
    }, 60000); // Poll every 60s when active

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchNotifications();
      }
    };

    if (typeof window !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibilityChange);
    }

    return () => {
      clearInterval(interval);
      if (typeof window !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      }
    };
  }, [role]);

  const markAsRead = (id) => {
    setReadIds((prev) => {
      if (prev.includes(id)) return prev;
      const updated = [...prev, id];
      if (typeof window !== "undefined") {
        localStorage.setItem("read_notification_ids", JSON.stringify(updated));
      }
      return updated;
    });
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    const allIds = notifications.map((n) => n.id);
    const merged = Array.from(new Set([...readIds, ...allIds]));
    setReadIds(merged);
    if (typeof window !== "undefined") {
      localStorage.setItem("read_notification_ids", JSON.stringify(merged));
    }
    setUnreadCount(0);
  };

  const handleNotificationClick = (notif) => {
    markAsRead(notif.id);
    setIsOpen(false);
    if (notif.link) {
      const targetPath = notif.link.split("?")[0];
      const targetTab = notif.targetTab;

      if (targetTab && typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("switch_tab", { detail: targetTab }));
      }
      router.push(targetPath);
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
              {unreadCount > 0 ? (
                <span className="px-2 py-0.5 text-[10px] font-extrabold bg-red-500/10 text-red-600 dark:text-red-400 rounded-full border border-red-500/20">
                  {unreadCount} unread
                </span>
              ) : (
                <span className="px-2 py-0.5 text-[10px] font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full border border-emerald-500/20">
                  All read
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
                  title="Mark all as read"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-stone-400 hover:text-stone-600 dark:hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-stone-100 dark:divide-stone-800/60">
            {notifications.length > 0 ? (
              notifications.map((item) => {
                const isRead = readIds.includes(item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => handleNotificationClick(item)}
                    className={`p-3.5 hover:bg-stone-50 dark:hover:bg-white/5 cursor-pointer transition-all flex items-start gap-3 group ${
                      !isRead
                        ? "bg-amber-500/5 dark:bg-amber-500/10 border-l-4 border-l-amber-500"
                        : "opacity-80"
                    }`}
                  >
                    <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0 group-hover:scale-105 transition-transform relative">
                      <UserCheck className="h-4 w-4" />
                      {!isRead && (
                        <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white dark:ring-stone-900 animate-pulse" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-xs truncate ${!isRead ? "font-black text-stone-900 dark:text-white" : "font-semibold text-stone-600 dark:text-stone-300"}`}>
                          {item.title}
                        </p>
                        <span className="text-[10px] font-medium text-stone-400 shrink-0 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTimeAgo(item.time)}
                        </span>
                      </div>
                      <p className={`text-xs mt-1 leading-relaxed line-clamp-2 ${!isRead ? "text-stone-800 dark:text-stone-200 font-medium" : "text-stone-500 dark:text-stone-400"}`}>
                        {item.message}
                      </p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-100/60 dark:bg-amber-950/60 px-2 py-0.5 rounded-md">
                          {item.badgeText || "Review Request"}
                        </span>
                        <ChevronRight className="h-3.5 w-3.5 text-stone-400 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center">
                <Bell className="h-8 w-8 text-stone-300 dark:text-stone-600 mx-auto mb-2" />
                <p className="text-xs font-bold text-stone-600 dark:text-stone-400">
                  No new notifications
                </p>
                <p className="text-[11px] text-stone-400 mt-1">
                  You're all caught up! Change requests and status updates will appear here.
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
                  const currentPath = typeof window !== "undefined" ? window.location.pathname : "";
                  const target = currentPath.startsWith("/admin")
                    ? "/admin/pass-approvals"
                    : "/traffic_approval";
                  if (typeof window !== "undefined") {
                    window.dispatchEvent(new CustomEvent("switch_tab", { detail: "pass_updates" }));
                  }
                  router.push(target);
                }}
                className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline inline-flex items-center gap-1"
              >
                View All Vehicle Updates <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
