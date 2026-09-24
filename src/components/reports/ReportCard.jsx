import {
  ArrowUpRight,
  BadgeIndianRupee,
  CalendarCheck,
  CarFront,
  ChartNoAxesCombined,
  ClipboardCheck,
  ClipboardList,
  ClockArrowUp,
  FileWarning,
  GripVertical,
  IdCard,
  QrCode,
  Users,
} from "lucide-react";
import Link from "next/link";

const reportIcons = {
  "card-penalty-report": FileWarning,
  "registered-users": Users,
  "type-of-pass-issued": IdCard,
  "revenue-report": BadgeIndianRupee,
  "pass-approval-report": ClipboardCheck,
  "gate-wise-in-out-summary": ChartNoAxesCombined,
  "gate-lane-wise-in-out-summary": ClockArrowUp,
  "card-inventory-summary": QrCode,
  "all-pass-issuance-report": CalendarCheck,
  "shift-wise-approval-rejection": ClockArrowUp,
  "vehicle-master": CarFront,
  "bulk-pass-report": ClipboardList,
  "blacklisting-report": FileWarning,
  "material-movement-report": ClipboardCheck,
};

export default function ReportCard({ report }) {
  const Icon = reportIcons[report.slug] || IdCard;

  return (
    <Link
      href={`/admin/reports/${report.slug}`}
      className="group block h-full focus:outline-none focus-visible:ring-4 focus-visible:ring-orange-400/30"
    >
      <article
        className="relative flex h-[88px] cursor-pointer items-center gap-3 overflow-hidden rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-orange-400 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-orange-500/60"
        title={report.description}
      >
        <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-orange-500 to-amber-300" />
        <span className="ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-600 ring-1 ring-orange-100 transition group-hover:bg-orange-500 group-hover:text-white dark:bg-orange-500/10 dark:text-orange-300 dark:ring-orange-500/20">
          <Icon className="h-4.5 w-4.5" />
        </span>
        <h3 className="line-clamp-3 min-w-0 flex-1 text-[13px] font-extrabold leading-[1.15rem] text-slate-900 dark:text-white">
          {report.title}
        </h3>
        <div className="flex h-full shrink-0 flex-col items-center justify-between py-0.5">
          <GripVertical className="h-4 w-4 cursor-grab text-slate-300 dark:text-slate-600" aria-label="Drag to reorder" />
          <ArrowUpRight className="h-4 w-4 text-slate-400 transition group-hover:text-orange-500" />
        </div>
      </article>
    </Link>
  );
}
