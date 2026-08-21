"use client";

import React from "react";
import {
  FileText, Building2, Mail, Phone, Calendar, Users, Car, FileCheck,
} from "lucide-react";
const STATUS_CONFIG = {
  PENDING_ADMIN_APPROVAL: {
    label: "Pending Review",
    badge: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    dot: "bg-amber-500",
  },
  ACTIVE: {
    label: "Approved",
    badge: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    dot: "bg-emerald-500",
  },
  REJECTED_BY_ADMIN: {
    label: "Rejected",
    badge: "bg-red-50 text-red-600 ring-1 ring-red-200",
    dot: "bg-red-500",
  },
  EXPIRED: {
    label: "Expired",
    badge: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
    dot: "bg-slate-400",
  },
};

const fmtDateShort = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
};

const visitorTypeLabel = (v) =>
  v ? v.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "—";

function ReadField({ label, value, mono, icon: Icon }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        {Icon && <Icon className="h-3 w-3 text-slate-400" />}
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
          {label}
        </p>
      </div>
      <p className={`text-sm font-semibold text-slate-800 ${mono ? "font-mono" : ""}`}>
        {value || "—"}
      </p>
    </div>
  );
}

function Card({ title, icon: Icon, children, className = "" }) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm p-5 ${className}`}>
      <div className="flex items-center gap-2.5 mb-5">
        <span className="flex items-center justify-center h-8 w-8 rounded-xl bg-amber-100 text-amber-600">
          <Icon className="h-4 w-4" />
        </span>
        <h3 className="text-base font-bold text-slate-800">{title}</h3>
      </div>
      {children}
    </div>
  );
}

/**
 * RequestSummaryCard: tracking number, status badge, requested date
 */
export function RequestSummaryCard({ trackingNumber, status, submittedDate }) {
  const statusConfig = STATUS_CONFIG[status] || {
    label: status || "Unknown",
    badge: "bg-stone-100 text-stone-500 ring-1 ring-stone-200",
    dot: "bg-stone-400",
  };

  return (
    <Card title="Request Summary" icon={FileText}>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-5">
        <ReadField
          label="Tracking Number"
          value={trackingNumber}
          mono
        />
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileText className="h-3 w-3 text-slate-400" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Status
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${statusConfig.badge}`}
            >
              <span className={`h-2 w-2 rounded-full ${statusConfig.dot}`} />
              {statusConfig.label}
            </span>
          </div>
        </div>
        <ReadField
          label="Requested Date"
          value={submittedDate}
          icon={Calendar}
        />
      </div>
    </Card>
  );
}

/**
 * CompanyInformationCard: company name, applicant email, applicant mobile
 */
export function CompanyInformationCard({ companyName, applicantEmail, applicantMobile }) {
  return (
    <Card title="Company Information" icon={Building2}>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-5">
        <ReadField
          label="Company Name"
          value={companyName}
          icon={Building2}
        />
        <ReadField
          label="Applicant Email"
          value={applicantEmail}
          icon={Mail}
        />
        <ReadField
          label="Applicant Mobile"
          value={applicantMobile ? `+91 ${applicantMobile}` : "—"}
          icon={Phone}
        />
      </div>
    </Card>
  );
}

/**
 * PassRequirementsCard: persons count, vehicles count, visitor type, payment mode
 */
export function PassRequirementsCard({ noOfPersons, noOfVehicles, visitorType, paymentMode }) {
  return (
    <Card title="Pass Requirements" icon={Users}>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-5">
        <ReadField
          label="Persons Count"
          value={noOfPersons ?? "—"}
          icon={Users}
        />
        <ReadField
          label="Vehicles Count"
          value={noOfVehicles ?? "—"}
          icon={Car}
        />
        <ReadField
          label="Visitor Type"
          value={visitorTypeLabel(visitorType)}
          icon={Building2}
        />
        <ReadField
          label="Payment Mode"
          value={paymentMode || "—"}
          icon={FileCheck}
        />
      </div>
    </Card>
  );
}

/**
 * ValidityCard: requested validity upto date
 */
export function ValidityCard({ validityFrom, validityUpto, approvedTimeFrom, approvedTimeUpto, status }) {
  const isApproved = status === "ACTIVE";
  
  return (
    <Card title="Validity Period" icon={Calendar}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="h-3 w-3 text-slate-400" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Validity From
            </p>
          </div>
          <p className="text-sm font-semibold text-slate-800">
            {validityFrom ? fmtDateShort(validityFrom) : "—"}
          </p>
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="h-3 w-3 text-slate-400" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Validity Upto
            </p>
          </div>
          <p className="text-sm font-semibold text-slate-800">
            {validityUpto ? fmtDateShort(validityUpto) : "—"}
          </p>
        </div>
        {isApproved && approvedTimeFrom && (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="h-3 w-3 text-emerald-400" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">
                Approved From
              </p>
            </div>
            <p className="text-sm font-semibold text-emerald-700">
              {fmtDateShort(approvedTimeFrom)}
            </p>
          </div>
        )}
        {isApproved && approvedTimeUpto && (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="h-3 w-3 text-emerald-400" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">
                Approved Upto
              </p>
            </div>
            <p className="text-sm font-semibold text-emerald-700">
              {fmtDateShort(approvedTimeUpto)}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}

/**
 * PurposeCard: purpose text, remarks, work order info (required?, ref doc no)
 */
export function PurposeCard({ purpose, remarks, workOrderRequired, refDocNo }) {
  return (
    <Card title="Purpose & Details" icon={FileText}>
      <div className="space-y-5">
        <ReadField
          label="Purpose of Visit"
          value={purpose || "—"}
        />
        {refDocNo && (
          <ReadField
            label="Reference Document No."
            value={refDocNo}
          />
        )}
        <div className="pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2 mb-3">
            <FileCheck className="h-4 w-4 text-slate-400" />
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Work Order Information
            </p>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            <ReadField
              label="Work Order Required"
              value={workOrderRequired === true || workOrderRequired === "yes" ? "Yes" : "No"}
            />
            {remarks && (
              <div className="sm:col-span-2">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="h-3 w-3 text-slate-400" />
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Remarks
                  </p>
                </div>
                <p className="text-sm font-semibold text-slate-800">
                  {remarks}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
