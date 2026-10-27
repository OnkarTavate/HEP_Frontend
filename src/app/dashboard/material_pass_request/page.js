"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { CornerUpLeft } from "lucide-react";

import MaterialPassApplySection from "./MaterialPassApplySection";
import SubmittedPassesSection from "./SubmittedPassesSection";

const AGENT_API = process.env.NEXT_PUBLIC_AGENT_API;

const getLabelById = (arr, val, key = "label") => {
  if (!val) return "";
  if (!Array.isArray(arr)) return val;
  const item = arr.find(
    (x) => String(x.id) === String(val) || String(x.value) === String(val),
  );
  return item ? item[key] || item.name : val;
};

export default function MaterialPassRequestPage() {
  const [activeTab, setActiveTab] = useState("apply");
  const [revertedCount, setRevertedCount] = useState(0);

  // Fetch initial counts so the badge appears on load
  useEffect(() => {
    const fetchInitialCounts = async () => {
      try {
        const token = localStorage.getItem("accessToken");
        if (!token) return;
        const res = await axios.get(
          `${AGENT_API}/material-pass/materialPassRequests?page=1&limit=1`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.data?.success && res.data?.counts) {
          setRevertedCount(res.data.counts.reverted || 0);
        }
      } catch (err) {
        console.error("Error fetching pass counts:", err);
      }
    };
    fetchInitialCounts();
  }, []);

  const handleCountsUpdate = (counts) => {
    if (counts && typeof counts.reverted === "number") {
      setRevertedCount(counts.reverted);
    }
  };

  return (
    <div className="space-y-6 font-sans w-full text-slate-800 dark:text-stone-200">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-[#0a1e4d] dark:text-white">
            Material Pass Request
          </h2>
          <p className="text-base text-slate-500 dark:text-stone-300 font-medium">
            Apply for Returnable and Non-Returnable Material Passes
          </p>
        </div>
      </div>

      <div className="flex border-b border-slate-300 dark:border-white/10">
        <button
          onClick={() => setActiveTab("apply")}
          className={`px-8 py-4 text-base transition-all ${
            activeTab === "apply"
              ? "font-bold text-[#0a1e4d] dark:text-white border-b-2 border-[#0a1e4d] dark:border-white"
              : "font-semibold text-slate-500 dark:text-stone-400 hover:text-[#0a1e4d] dark:hover:text-white"
          }`}
        >
          Apply Material Pass
        </button>

        <button
          onClick={() => setActiveTab("view")}
          className={`px-8 py-4 text-base transition-all ${
            activeTab === "view"
              ? "font-bold text-[#0a1e4d] dark:text-white border-b-2 border-[#0a1e4d] dark:border-white"
              : "font-semibold text-slate-500 dark:text-stone-400 hover:text-[#0a1e4d] dark:hover:text-white"
          }`}
        >
          View Submitted Passes
        </button>

        <button
          onClick={() => setActiveTab("reverted")}
          className={`px-8 py-4 text-base transition-all flex items-center gap-2.5 ${
            activeTab === "reverted"
              ? "font-bold text-amber-600 dark:text-amber-400 border-b-2 border-amber-600 dark:border-amber-400"
              : "font-semibold text-slate-500 dark:text-stone-400 hover:text-amber-600 dark:hover:text-amber-400"
          }`}
        >
          <CornerUpLeft className="h-4 w-4" />
          <span>Reverted Passes</span>
          {revertedCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-amber-500 text-white shadow-sm animate-pulse">
              {revertedCount}
            </span>
          )}
        </button>
      </div>

      <div style={{ display: activeTab === "apply" ? "block" : "none" }}>
        <MaterialPassApplySection
          getLabelById={getLabelById}
          onSubmitSuccess={() => setActiveTab("view")}
        />
      </div>

      <div style={{ display: activeTab === "view" ? "block" : "none" }}>
        <SubmittedPassesSection
          isActive={activeTab === "view"}
          mode="all"
          onCountsUpdate={handleCountsUpdate}
        />
      </div>

      <div style={{ display: activeTab === "reverted" ? "block" : "none" }}>
        <SubmittedPassesSection
          isActive={activeTab === "reverted"}
          mode="reverted"
          onCountsUpdate={handleCountsUpdate}
        />
      </div>
    </div>
  );
}
