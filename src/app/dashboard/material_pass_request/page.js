"use client";

import React, { useState, useEffect } from "react";

import MaterialPassApplySection from "./MaterialPassApplySection";
import SubmittedPassesSection from "./SubmittedPassesSection";
// import RevertedPassesSection from "./RevertedApplicationSection";
// import ReturnableInventory from "./ReturnableInventory";

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
	
	return (
		<div className="space-y-6 font-sans w-full text-slate-800 dark:text-stone-200">
			<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
				<div>
					<h2 className="text-3xl font-bold text-[#0a1e4d] dark:text-white">Material Pass Request</h2>
					<p className="text-base text-slate-500 dark:text-stone-300 font-medium">
						Apply for Returnable and Non-Returnable Material Passes
					</p>
				</div>
			</div>
		
			<div className="flex border-b border-slate-300 dark:border-white/10">
				<button
					onClick={() => setActiveTab("apply")}
					className={`px-8 py-4 text-base transition-all ${activeTab === "apply" ? "font-bold text-[#0a1e4d] dark:text-white border-b-2 border-[#0a1e4d] dark:border-white" : "font-semibold text-slate-500 dark:text-stone-400 hover:text-[#0a1e4d] dark:hover:text-white"}`}
				>
					Apply Material Pass
				</button>
				{/* <button
					onClick={() => setActiveTab("reverted")}
					className={`px-8 py-4 text-base transition-all ${activeTab === "reverted" ? "font-bold text-amber-600 dark:text-amber-400 border-b-2 border-amber-600 dark:border-amber-400" : "font-semibold text-slate-500 dark:text-stone-400 hover:text-amber-600 dark:hover:text-amber-400"}`}
				>
					⚠️ Reverted Applications
					
				</button> */}
				<button
					onClick={() => setActiveTab("view")}
					className={`px-8 py-4 text-base transition-all ${activeTab === "view" ? "font-bold text-[#0a1e4d] dark:text-white border-b-2 border-[#0a1e4d] dark:border-white" : "font-semibold text-slate-500 dark:text-stone-400 hover:text-[#0a1e4d] dark:hover:text-white"}`}
				>
					View Submitted Passes
				</button>
				{/* <button
					onClick={() => setActiveTab("returnableInventory")}
					className={`px-8 py-4 text-base transition-all ${activeTab === "returnableInventory" ? "font-bold text-[#0a1e4d] dark:text-white border-b-2 border-[#0a1e4d] dark:border-white" : "font-semibold text-slate-500 dark:text-stone-400 hover:text-[#0a1e4d] dark:hover:text-white"}`}
				>
					Returnable Inventory
				</button> */}
			</div>

			<div style={{ display: activeTab === "apply" ? "block" : "none" }}>
				<MaterialPassApplySection getLabelById={getLabelById} />
			</div>

			{/* <div style={{ display: activeTab === "reverted" ? "block" : "none" }}>
				<RevertedPassesSection />
			</div> */}

			<div style={{ display: activeTab === "view" ? "block" : "none" }}>
				<SubmittedPassesSection />
			</div>

			{/* <div style={{ display: activeTab === "returnableInventory" ? "block" : "none" }}>
				<ReturnableInventory />
			</div> */}
		</div>
	);
}