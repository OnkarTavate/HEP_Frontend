"use client";

/**
 * BulkPassOverviewPanel.jsx
 * -------------------------
 * The management view of Bulk Pass activity, one level above the batch tables.
 *
 * A Bulk Pass is the container an organisation is given: one link, one validity
 * window, many batch submissions. The existing status cards count batches; this
 * panel counts the passes themselves and the traffic flowing through them, so
 * an officer can see at a glance how many organisations still hold an open link
 * and how many people that represents.
 *
 * Fed by `computeBulkPassOverview()` so it stays backed by the same list data
 * the tables already load — no separate stats endpoint.
 */

import React from "react";
import {
  Layers,
  CheckCircle2,
  XCircle,
  Send,
  Users,
  Car,
  CalendarClock,
  Clock,
} from "lucide-react";
import { surface as cardShell } from "./ui";


function Tile({ label, value, hint, icon: Icon, tone, onClick, active }) {
  const tones = {
    stone: "bg-stone-100 text-stone-600 dark:bg-white/5 dark:text-stone-300",
    emerald: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
    red: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
    amber: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
    blue: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
    purple: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
  };

  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } } : undefined}
      className={`${cardShell} px-4 py-4 ${
        onClick ? "cursor-pointer transition hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]" : ""
      } ${active ? "ring-2 ring-amber-400" : ""}`}
    >
      <div className="flex items-start gap-3">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tones[tone] || tones.stone}`}>
          <Icon className="h-4 w-4" strokeWidth={2.2} />
        </span>
        <div className="min-w-0">
          <p className="text-2xl font-extrabold text-stone-900 dark:text-stone-100 leading-none">
            {value ?? 0}
          </p>
          <p className="text-xs font-semibold text-stone-600 dark:text-stone-300 mt-1.5 leading-tight">
            {label}
          </p>
          {hint && <p className="text-[11px] text-stone-400 dark:text-stone-500 mt-1 leading-tight">{hint}</p>}
        </div>
      </div>
    </div>
  );
}

/**
 * @param {object}   overview   result of computeBulkPassOverview()
 * @param {Function} onFilter   optional; called with a filter key when a tile is clicked
 * @param {string}   activeKey  which tile (if any) is currently applied as a filter
 */
export default function BulkPassOverviewPanel({ overview, onFilter, activeKey, className = "" }) {
  const o = overview || {};

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {/* Bulk Passes — the containers */}
      <div>
        <h3 className="text-xs font-bold text-stone-500 dark:text-stone-400 mb-2.5">
          Bulk Passes
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Tile
            label="Total Bulk Passes"
            value={o.totalBulkPasses}
            hint={`${o.departmentBulkPasses ?? 0} department · ${o.publicBulkPasses ?? 0} public`}
            icon={Layers}
            tone="stone"
            onClick={onFilter ? () => onFilter("ALL") : undefined}
            active={activeKey === "ALL"}
          />
          <Tile
            label="Active"
            value={o.activeBulkPasses}
            hint="Accepting submissions"
            icon={CheckCircle2}
            tone="emerald"
            onClick={onFilter ? () => onFilter("VALIDITY_ACTIVE") : undefined}
            active={activeKey === "VALIDITY_ACTIVE"}
          />
          <Tile
            label="Expired"
            value={o.expiredBulkPasses}
            hint="History only"
            icon={XCircle}
            tone="red"
            onClick={onFilter ? () => onFilter("VALIDITY_EXPIRED") : undefined}
            active={activeKey === "VALIDITY_EXPIRED"}
          />
          <Tile
            label="Not Started"
            value={o.notStartedBulkPasses}
            hint="Validity opens later"
            icon={CalendarClock}
            tone="blue"
            onClick={onFilter ? () => onFilter("VALIDITY_NOT_STARTED") : undefined}
            active={activeKey === "VALIDITY_NOT_STARTED"}
          />
        </div>
      </div>

      {/* Activity flowing through those passes */}
      <div>
        <h3 className="text-xs font-bold text-stone-500 dark:text-stone-400 mb-2.5">
          Submission Activity
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Tile label="Total Submissions" value={o.totalSubmissions} hint="Batches received" icon={Send} tone="blue" />
          <Tile label="Total Persons" value={o.totalPersons} hint="Across all batches" icon={Users} tone="blue" />
          <Tile label="Total Vehicles" value={o.totalVehicles} hint="Across all batches" icon={Car} tone="purple" />
          <Tile
            label="Awaiting Action"
            value={(o.pendingReview ?? 0) + (o.pendingPublicApproval ?? 0)}
            hint={`${o.pendingReview ?? 0} to review · ${o.pendingPublicApproval ?? 0} to approve`}
            icon={Clock}
            tone="amber"
          />
        </div>
      </div>
    </div>
  );
}
