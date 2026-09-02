import Link from "next/link";
import { notFound } from "next/navigation";
import { getReport } from "@/lib/reports";
import LiveReportSearchInput from "@/components/reports/LiveReportSearchInput";
import ReportViewerToolbar from "@/components/reports/ReportViewerToolbar";

const AGENT_API =
  process.env.NEXT_PUBLIC_AGENT_API || "http://127.0.0.1:5001/api";

const registeredUsersReportContentId = "registered-users-report-content";

const fieldClass =
  "w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-400";

function getParam(searchParams, key) {
  const value = searchParams?.[key];
  return typeof value === "string" ? value : "";
}

function hasAnySearch(searchParams, keys) {
  return keys.some((key) => getParam(searchParams, key).trim());
}

function buildQuery(searchParams, keys) {
  const params = new URLSearchParams();

  keys.forEach((key) => {
    const value = getParam(searchParams, key).trim();
    if (value) params.set(key, value);
  });

  return params.toString();
}

function buildPageHref(searchParams, page) {
  const params = new URLSearchParams();

  Object.entries(searchParams || {}).forEach(([key, value]) => {
    if (typeof value === "string" && value.trim()) params.set(key, value);
  });

  params.set("page", String(page));
  return `?${params.toString()}`;
}

async function getJson(path) {
  try {
    const response = await fetch(`${AGENT_API}${path}`, { cache: "no-store" });
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

async function getCompanyTypesFromReportOptions() {
  const data = await getJson("/reports/registered-users/options");
  const rows = Array.isArray(data?.data?.companyTypes)
    ? data.data.companyTypes
    : [];
  const companyTypes = rows
    .map((row) => row.name)
    .filter((value) => typeof value === "string" && value.trim())
    .map((value) => value.trim());

  return Array.from(new Set(companyTypes)).sort((a, b) =>
    a.localeCompare(b),
  );
}

async function getAllPassIssuanceOptions() {
  const data = await getJson("/reports/all-pass-issuance/options");
  const options = data?.data;

  return {
    companyTypes: Array.isArray(options?.companyTypes) ? options.companyTypes : [],
    passTypes: Array.isArray(options?.passTypes) ? options.passTypes : [],
    approvalStatuses: Array.isArray(options?.approvalStatuses) ? options.approvalStatuses : [],
    passHolderTypes: Array.isArray(options?.passHolderTypes) ? options.passHolderTypes : [],
    nationalities: Array.isArray(options?.nationalities) ? options.nationalities : [],
    departments: Array.isArray(options?.departments) ? options.departments : [],
    paymentTypes: Array.isArray(options?.paymentTypes) ? options.paymentTypes : [],
    cardTypes: Array.isArray(options?.cardTypes) ? options.cardTypes : [],
    personVehicleCardTypes: Array.isArray(options?.cardTypes)
      ? options.cardTypes.filter((value) => value !== "Driver")
      : [],
    issuedCardTypes: Array.isArray(options?.issuedCardTypes) ? options.issuedCardTypes : [],
    passRequestTypes: Array.isArray(options?.passRequestTypes) ? options.passRequestTypes : [],
    transactionTypes: Array.isArray(options?.transactionTypes)
      ? options.transactionTypes.map((option) => option.value)
      : [],
    paymentStatuses: Array.isArray(options?.paymentStatuses) ? options.paymentStatuses : [],
  };
}

function formatDateTimeLocal(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatReportDateTime(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

function EmptyReportState({ children }) {
  return (
    <div className="py-16 text-center text-stone-400 dark:text-stone-500">
      {children}
    </div>
  );
}

async function SimpleFilterReport({ report, children, endpoint, filterKeys, searchParams }) {
  const searched = hasAnySearch(searchParams, filterKeys || []);
  const query = buildQuery(searchParams, [...(filterKeys || []), "page"]);
  const reportData = searched && endpoint
    ? await getJson(`${endpoint}?${query}`)
    : null;
  const rows = Array.isArray(reportData?.data) ? reportData.data : [];
  const pagination = reportData?.pagination || {};
  const currentPage = pagination.page || 1;
  const pageLimit = pagination.limit || 100;
  const totalPages = Math.max(
    1,
    Math.ceil((pagination.totalRecords || rows.length || 0) / pageLimit),
  );
  const columnKeys = rows.length
    ? Object.keys(rows[0]).filter((key) => !["companySearch", "row_number"].includes(key))
    : [];
  const columns = columnKeys.map((key) => ({
    key,
    label: key.replace(/([A-Z])/g, " $1").replaceAll("_", " ").trim(),
  }));
  const targetId = `${report.slug}-report-content`;

  return (
    <ReportShell report={report}>
      <section className="flex h-full min-h-0 min-w-0 max-w-full flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <form className="shrink-0 px-4 sm:px-6 py-5 border-b border-slate-100 dark:border-slate-800">{children}</form>
        {searched ? (
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            {rows.length ? (
              <div id={targetId} className="min-h-0 min-w-0 max-w-full flex-1 overflow-auto overscroll-contain origin-top-left [scrollbar-gutter:stable]">
                <table className="min-w-max w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-slate-50 text-left text-xs uppercase tracking-wide text-stone-500 shadow-sm dark:bg-slate-800">
                    <tr>{columns.map((column) => <th key={column.key} className="whitespace-nowrap px-4 py-3">{column.label}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {rows.map((row, index) => (
                      <tr key={`${row.id || row.passId || row.cardNumber || "row"}-${index}`}>
                        {columns.map((column) => (
                          <td key={column.key} className="whitespace-nowrap px-4 py-3 text-slate-700 dark:text-slate-200">
                            {row[column.key] == null || row[column.key] === "" ? "—" : typeof row[column.key] === "boolean" ? (row[column.key] ? "Yes" : "No") : String(row[column.key])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <div className="min-h-0 flex-1 overflow-auto"><EmptyReportState>{reportData?.limitation || "No records matched these filters."}</EmptyReportState></div>}
            <div className="shrink-0 border-t border-slate-100 dark:border-slate-800">
              <ReportViewerToolbar
                title={report.title}
                columns={columns}
                rows={rows}
                targetId={targetId}
                currentPage={currentPage}
                totalPages={totalPages}
                firstHref={buildPageHref(searchParams, 1)}
                previousHref={buildPageHref(searchParams, Math.max(1, currentPage - 1))}
                nextHref={buildPageHref(searchParams, Math.min(totalPages, currentPage + 1))}
                lastHref={buildPageHref(searchParams, totalPages)}
              />
            </div>
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-auto"><EmptyReportState>Enter filters and click Search to view results.</EmptyReportState></div>
        )}
      </section>
    </ReportShell>
  );
}

function ReportLabel({ children }) {
  return (
    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
      {children}
    </span>
  );
}

function SearchButtonRow() {
  return (
    <div className="flex items-end">
      <button
        type="submit"
        className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-amber-400 text-white dark:text-slate-900 text-sm font-bold shadow hover:opacity-90"
      >
        Search
      </button>
    </div>
  );
}

async function GateInOutReport({ report, searchParams }) {
  const toDate = new Date();
  const fromDate = new Date(toDate.getTime() - 2 * 60 * 60 * 1000);
  const options = await getAllPassIssuanceOptions();

  return (
    <SimpleFilterReport report={report} endpoint="/reports/gate-in-out" searchParams={searchParams} filterKeys={["fromDate", "toDate", "cardType", "companyNameOrCode", "vehicleNo"]}>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <label className="space-y-1.5">
          <ReportLabel>From Date</ReportLabel>
          <input
            name="fromDate"
            type="datetime-local"
            defaultValue={getParam(searchParams, "fromDate") || formatDateTimeLocal(fromDate)}
            className={fieldClass}
          />
        </label>

        <label className="space-y-1.5">
          <ReportLabel>To Date</ReportLabel>
          <input
            name="toDate"
            type="datetime-local"
            defaultValue={getParam(searchParams, "toDate") || formatDateTimeLocal(toDate)}
            className={fieldClass}
          />
        </label>

        <label className="space-y-1.5">
          <ReportLabel>QR Pass Type</ReportLabel>
          <select name="cardType" defaultValue={getParam(searchParams, "cardType")} className={fieldClass}>
            <option value="">-- Select --</option>
            {options.cardTypes.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1.5">
          <ReportLabel>Company Name/Code</ReportLabel>
          <input
            name="companyNameOrCode"
            type="text"
            defaultValue={getParam(searchParams, "companyNameOrCode")}
            className={fieldClass}
          />
        </label>

        <label className="space-y-1.5">
          <ReportLabel>Vehicle No</ReportLabel>
          <input
            name="vehicleNo"
            type="text"
            defaultValue={getParam(searchParams, "vehicleNo")}
            className={fieldClass}
          />
        </label>

        <SearchButtonRow />
      </div>
    </SimpleFilterReport>
  );
}

async function MoreThan2CardReport({ report, searchParams }) {
  const options = await getAllPassIssuanceOptions();
  return (
    <SimpleFilterReport report={report} endpoint="/reports/more-than-2-card" searchParams={searchParams} filterKeys={["personNameOrVehicleNo", "cardNo", "companyCode", "cardType"]}>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <label className="space-y-1.5">
          <ReportLabel>Person name/vehicleno</ReportLabel>
          <input
            name="personNameOrVehicleNo"
            type="text"
            defaultValue={getParam(searchParams, "personNameOrVehicleNo")}
            className={fieldClass}
          />
        </label>

        <label className="space-y-1.5">
          <ReportLabel>QR Pass Reference</ReportLabel>
          <input
            name="cardNo"
            type="text"
            defaultValue={getParam(searchParams, "cardNo")}
            className={fieldClass}
          />
        </label>

        <label className="space-y-1.5">
          <ReportLabel>Company Code</ReportLabel>
          <input
            name="companyCode"
            type="text"
            defaultValue={getParam(searchParams, "companyCode")}
            className={fieldClass}
          />
        </label>

        <label className="space-y-1.5">
          <ReportLabel>QR Pass Type</ReportLabel>
          <select name="cardType" defaultValue={getParam(searchParams, "cardType")} className={fieldClass}>
            <option value="">-- Select --</option>
            {options.personVehicleCardTypes.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>

        <SearchButtonRow />
      </div>
    </SimpleFilterReport>
  );
}

async function ExpiredCardReport({ report, searchParams }) {
  const today = new Date();
  const defaultDate = today.toISOString().slice(0, 10);
  const options = await getAllPassIssuanceOptions();

  return (
    <SimpleFilterReport report={report} endpoint="/reports/card-expired-report" searchParams={searchParams} filterKeys={["fromDate", "toDate", "cardType", "companyNameOrCode"]}>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <label className="space-y-1.5">
          <ReportLabel>From Date</ReportLabel>
          <input
            name="fromDate"
            type="date"
            defaultValue={getParam(searchParams, "fromDate") || defaultDate}
            className={fieldClass}
          />
        </label>

        <label className="space-y-1.5">
          <ReportLabel>To Date</ReportLabel>
          <input
            name="toDate"
            type="date"
            defaultValue={getParam(searchParams, "toDate") || defaultDate}
            className={fieldClass}
          />
        </label>

        <label className="space-y-1.5">
          <ReportLabel>QR Pass Type</ReportLabel>
          <select name="cardType" defaultValue={getParam(searchParams, "cardType")} className={fieldClass}>
            <option value="">-- Select --</option>
            {options.personVehicleCardTypes.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1.5">
          <ReportLabel>Company Name/Code</ReportLabel>
          <input
            name="companyNameOrCode"
            type="text"
            defaultValue={getParam(searchParams, "companyNameOrCode")}
            className={fieldClass}
          />
        </label>

        <SearchButtonRow />
      </div>
    </SimpleFilterReport>
  );
}

async function CardIssuedReport({ report, searchParams }) {
  const toDate = new Date();
  const fromDate = new Date(toDate.getTime() - 2 * 60 * 60 * 1000);
  const options = await getAllPassIssuanceOptions();

  return (
    <SimpleFilterReport report={report} endpoint="/reports/card-issued" searchParams={searchParams} filterKeys={["passId", "companyNameOrCode", "passType", "cardType", "fromDate", "toDate"]}>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <label className="space-y-1.5">
          <ReportLabel>Pass Id</ReportLabel>
          <input
            name="passId"
            type="text"
            defaultValue={getParam(searchParams, "passId")}
            className={fieldClass}
          />
        </label>

        <label className="space-y-1.5">
          <ReportLabel>Company Name/Code</ReportLabel>
          <input
            name="companyNameOrCode"
            type="text"
            defaultValue={getParam(searchParams, "companyNameOrCode")}
            className={fieldClass}
          />
        </label>

        <label className="space-y-1.5">
          <ReportLabel>Pass Period</ReportLabel>
          <select name="passType" defaultValue={getParam(searchParams, "passType")} className={fieldClass}>
            <option value="">-- Select --</option>
            {options.passTypes.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </label>

        <label className="space-y-1.5">
          <ReportLabel>QR Pass Type</ReportLabel>
          <select name="cardType" defaultValue={getParam(searchParams, "cardType")} className={fieldClass}>
            <option value="">-- Select --</option>
            {options.issuedCardTypes.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1.5">
          <ReportLabel>From Date</ReportLabel>
          <input
            name="fromDate"
            type="datetime-local"
            defaultValue={getParam(searchParams, "fromDate") || formatDateTimeLocal(fromDate)}
            className={fieldClass}
          />
        </label>

        <label className="space-y-1.5">
          <ReportLabel>To Date</ReportLabel>
          <input
            name="toDate"
            type="datetime-local"
            defaultValue={getParam(searchParams, "toDate") || formatDateTimeLocal(toDate)}
            className={fieldClass}
          />
        </label>

        <SearchButtonRow />
        <div className="flex items-end">
          <Link
            href="/admin/reports/card-issued"
            className="inline-flex h-[42px] w-full items-center justify-center rounded-xl bg-slate-100 px-5 text-sm font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 sm:w-auto"
          >
            Reset
          </Link>
        </div>
      </div>
    </SimpleFilterReport>
  );
}

async function CardLastIssuedReport({ report, searchParams }) {
  const today = new Date().toISOString().slice(0, 10);
  const options = await getAllPassIssuanceOptions();

  return (
    <SimpleFilterReport report={report} endpoint="/reports/card-last-issued" searchParams={searchParams} filterKeys={["cardNo", "companyCode", "fromDate", "toDate"]}>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <label className="space-y-1.5">
          <ReportLabel>Company Name/Code</ReportLabel>
          <input
            name="companyNameOrCode"
            type="text"
            defaultValue={getParam(searchParams, "companyNameOrCode")}
            className={fieldClass}
          />
        </label>

        <label className="space-y-1.5">
          <ReportLabel>QR Pass Type</ReportLabel>
          <select name="cardType" defaultValue={getParam(searchParams, "cardType")} className={fieldClass}>
            <option value="">-- Select --</option>
            {options.issuedCardTypes.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1.5">
          <ReportLabel>From Date</ReportLabel>
          <input
            name="fromDate"
            type="date"
            defaultValue={getParam(searchParams, "fromDate") || today}
            className={fieldClass}
          />
        </label>

        <label className="space-y-1.5">
          <ReportLabel>To Date</ReportLabel>
          <input
            name="toDate"
            type="date"
            defaultValue={getParam(searchParams, "toDate") || today}
            className={fieldClass}
          />
        </label>

        <SearchButtonRow />
      </div>
    </SimpleFilterReport>
  );
}

async function RevenueReport({ report, searchParams }) {
  const today = new Date().toISOString().slice(0, 10);
  const options = await getAllPassIssuanceOptions();

  return (
    <SimpleFilterReport report={report} endpoint="/reports/revenue-report" searchParams={searchParams} filterKeys={["companyCodeOrName", "paymentType", "fromDate", "toDate", "approvalStatus", "passHolderType", "passType"]}>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <label className="space-y-1.5">
          <ReportLabel>Company Code / Name</ReportLabel>
          <input
            name="companyCodeOrName"
            type="text"
            defaultValue={getParam(searchParams, "companyCodeOrName")}
            className={fieldClass}
          />
        </label>

        <label className="space-y-1.5">
          <ReportLabel>Payment Type</ReportLabel>
          <select name="paymentType" defaultValue={getParam(searchParams, "paymentType")} className={fieldClass}>
            <option value="">-- Select --</option>
            {options.paymentTypes.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1.5">
          <ReportLabel>Approval Status</ReportLabel>
          <select
            name="approvalStatus"
            defaultValue={getParam(searchParams, "approvalStatus")}
            className={fieldClass}
          >
            <option value="">-- Select --</option>
            {options.approvalStatuses.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1.5">
          <ReportLabel>Issued From Date</ReportLabel>
          <input
            name="fromDate"
            type="date"
            defaultValue={getParam(searchParams, "fromDate") || today}
            className={fieldClass}
          />
        </label>

        <label className="space-y-1.5">
          <ReportLabel>Issued To Date</ReportLabel>
          <input
            name="toDate"
            type="date"
            defaultValue={getParam(searchParams, "toDate") || today}
            className={fieldClass}
          />
        </label>

        <label className="space-y-1.5">
          <ReportLabel>Pass Holder Type</ReportLabel>
          <select
            name="passHolderType"
            defaultValue={getParam(searchParams, "passHolderType")}
            className={fieldClass}
          >
            <option value="">-- Select --</option>
            {options.passHolderTypes.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </label>

        <label className="space-y-1.5">
          <ReportLabel>Pass Type</ReportLabel>
          <select name="passType" defaultValue={getParam(searchParams, "passType")} className={fieldClass}>
            <option value="">-- Select --</option>
            {options.passTypes.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </label>

        <SearchButtonRow />
      </div>
    </SimpleFilterReport>
  );
}

async function WharfageReport({ report, searchParams }) {
  const today = new Date().toISOString().slice(0, 10);

  return (
    <SimpleFilterReport report={report} endpoint="/reports/wharfage-report" searchParams={searchParams} filterKeys={["companyId", "vehicleId", "passId", "fromDate", "toDate"]}>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <label className="space-y-1.5">
          <ReportLabel>CompanyId</ReportLabel>
          <input
            name="companyId"
            type="text"
            defaultValue={getParam(searchParams, "companyId")}
            className={fieldClass}
          />
        </label>

        <label className="space-y-1.5">
          <ReportLabel>Vehicle Id</ReportLabel>
          <input
            name="vehicleId"
            type="text"
            defaultValue={getParam(searchParams, "vehicleId")}
            className={fieldClass}
          />
        </label>

        <label className="space-y-1.5">
          <ReportLabel>Pass Id</ReportLabel>
          <input
            name="passId"
            type="text"
            defaultValue={getParam(searchParams, "passId")}
            className={fieldClass}
          />
        </label>

        <label className="space-y-1.5">
          <ReportLabel>From Date</ReportLabel>
          <input
            name="fromDate"
            type="date"
            defaultValue={getParam(searchParams, "fromDate") || today}
            className={fieldClass}
          />
        </label>

        <label className="space-y-1.5">
          <ReportLabel>To Date</ReportLabel>
          <input
            name="toDate"
            type="date"
            defaultValue={getParam(searchParams, "toDate") || today}
            className={fieldClass}
          />
        </label>

        <SearchButtonRow />
      </div>
    </SimpleFilterReport>
  );
}

async function CardPenaltyReport({ report, searchParams }) {
  const today = new Date().toISOString().slice(0, 10);

  return (
    <SimpleFilterReport report={report} endpoint="/reports/card-penalty-report" searchParams={searchParams} filterKeys={["cardNo", "companyCode", "fromDate", "toDate"]}>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <label className="space-y-1.5">
          <ReportLabel>QR Pass Reference</ReportLabel>
          <input
            name="cardNo"
            type="text"
            defaultValue={getParam(searchParams, "cardNo")}
            className={fieldClass}
          />
        </label>

        <label className="space-y-1.5">
          <ReportLabel>Companycode</ReportLabel>
          <input
            name="companyCode"
            type="text"
            defaultValue={getParam(searchParams, "companyCode")}
            className={fieldClass}
          />
        </label>

        <label className="space-y-1.5">
          <ReportLabel>From Date</ReportLabel>
          <input
            name="fromDate"
            type="date"
            defaultValue={getParam(searchParams, "fromDate") || today}
            className={fieldClass}
          />
        </label>

        <label className="space-y-1.5">
          <ReportLabel>To Date</ReportLabel>
          <input
            name="toDate"
            type="date"
            defaultValue={getParam(searchParams, "toDate") || today}
            className={fieldClass}
          />
        </label>

        <SearchButtonRow />
      </div>
    </SimpleFilterReport>
  );
}

async function CardLostReport({ report, searchParams }) {
  const options = await getAllPassIssuanceOptions();
  return (
    <SimpleFilterReport report={report} endpoint="/reports/card-lost-report" searchParams={searchParams} filterKeys={["cardNo", "companyCode", "cardType"]}>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="space-y-1.5">
          <ReportLabel>QR Pass Reference</ReportLabel>
          <input
            name="cardNo"
            type="text"
            defaultValue={getParam(searchParams, "cardNo")}
            className={fieldClass}
          />
        </label>

        <label className="space-y-1.5">
          <ReportLabel>Company Code</ReportLabel>
          <input
            name="companyCode"
            type="text"
            defaultValue={getParam(searchParams, "companyCode")}
            className={fieldClass}
          />
        </label>

        <label className="space-y-1.5">
          <ReportLabel>QR Pass Type</ReportLabel>
          <select name="cardType" defaultValue={getParam(searchParams, "cardType")} className={fieldClass}>
            <option value="">-- Select --</option>
            {options.personVehicleCardTypes.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>

        <SearchButtonRow />
      </div>
    </SimpleFilterReport>
  );
}

async function IndividualCardQueryReport({ report, searchParams }) {
  const options = await getAllPassIssuanceOptions();
  return (
    <SimpleFilterReport report={report} endpoint="/reports/individual-card-query-report" searchParams={searchParams} filterKeys={["cardNo", "companyCode", "cardType"]}>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="space-y-1.5">
          <ReportLabel>QR Pass Reference</ReportLabel>
          <input
            name="cardNo"
            type="text"
            defaultValue={getParam(searchParams, "cardNo")}
            className={fieldClass}
          />
        </label>

        <label className="space-y-1.5">
          <ReportLabel>Company Code</ReportLabel>
          <input
            name="companyCode"
            type="text"
            defaultValue={getParam(searchParams, "companyCode")}
            className={fieldClass}
          />
        </label>

        <label className="space-y-1.5">
          <ReportLabel>QR Pass Type</ReportLabel>
          <select name="cardType" defaultValue={getParam(searchParams, "cardType")} className={fieldClass}>
            <option value="">-- Select --</option>
            {options.personVehicleCardTypes.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>

        <SearchButtonRow />
      </div>
    </SimpleFilterReport>
  );
}

function SelectField({ label, name, defaultValue, options }) {
  return (
    <label className="space-y-1.5">
      <ReportLabel>{label}</ReportLabel>
      <select name={name} defaultValue={defaultValue} className={fieldClass}>
        <option value="">-- All --</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextField({ label, name, defaultValue, placeholder, type = "text" }) {
  return (
    <label className="space-y-1.5">
      <ReportLabel>{label}</ReportLabel>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className={fieldClass}
      />
    </label>
  );
}

function ReferenceReportNotice({ searchParams }) {
  const searched = Object.values(searchParams || {}).some(
    (value) => typeof value === "string" && value.trim(),
  );

  if (!searched) return null;

  return (
    <div className="border-t border-slate-100 px-6 py-10 text-center dark:border-slate-800">
      <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
        Filters applied. Report results will appear here when the data endpoint is connected.
      </p>
    </div>
  );
}

async function AllPassIssuanceReport({ report, searchParams }) {
  const now = new Date();
  const periodStart = new Date(now);
  periodStart.setHours(6, 0, 0, 0);
  const periodEnd = new Date(periodStart);
  periodEnd.setDate(periodEnd.getDate() + 1);
  periodEnd.setHours(5, 59, 0, 0);
  const options = await getAllPassIssuanceOptions();
  const filterKeys = [
    "fromDate", "toDate", "passId", "cardHolder", "idProof",
    "companyCodeOrName", "companyType", "passType", "approvalStatus",
    "passHolderType", "nationality", "department", "paymentType", "aadhaar",
  ];
  const effectiveSearchParams = {
    ...searchParams,
    fromDate: getParam(searchParams, "fromDate") || formatDateTimeLocal(periodStart),
    toDate: getParam(searchParams, "toDate") || formatDateTimeLocal(periodEnd),
  };
  const searched = hasAnySearch(searchParams, filterKeys);
  const query = buildQuery(effectiveSearchParams, [...filterKeys, "page"]);
  const reportData = searched
    ? await getJson(`/reports/all-pass-issuance?${query}`)
    : null;
  const rows = Array.isArray(reportData?.data) ? reportData.data : [];
  const pagination = reportData?.pagination || {};
  const totalPages = Math.max(
    1,
    Math.ceil((pagination.totalRecords || rows.length || 0) / (pagination.limit || 100)),
  );
  const targetId = "all-pass-issuance-report-content";
  const columns = [
    { key: "source", label: "SOURCE" },
    { key: "passId", label: "PASS ID" },
    { key: "cardHolder", label: "HOLDER" },
    { key: "passHolderType", label: "HOLDER TYPE" },
    { key: "companyName", label: "COMPANY" },
    { key: "passType", label: "PASS TYPE" },
    { key: "approvalStatus", label: "STATUS" },
    { key: "paymentType", label: "PAYMENT" },
    { key: "dateFrom", label: "VALID FROM" },
    { key: "dateTo", label: "VALID TO" },
    { key: "amount", label: "AMOUNT" },
  ];
  const advancedFilterKeys = [
    "cardHolder", "idProof", "companyType", "passType", "approvalStatus",
    "passHolderType", "nationality", "department", "paymentType", "aadhaar",
  ];
  const hasAdvancedFilters = hasAnySearch(searchParams, advancedFilterKeys);

  return (
    <ReportShell
      report={{
        ...report,
        title: "All Pass Issuance - Transaction",
        description: "Search every issued pass using holder, company, approval, and payment details.",
      }}
    >
      <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="shrink-0 border-b border-slate-100 dark:border-slate-800">
        <form className="px-4 py-4 sm:px-6">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1fr_auto_auto] xl:items-end">
            <TextField label="From Date" name="fromDate" type="datetime-local" defaultValue={getParam(searchParams, "fromDate") || formatDateTimeLocal(periodStart)} />
            <TextField label="To Date" name="toDate" type="datetime-local" defaultValue={getParam(searchParams, "toDate") || formatDateTimeLocal(periodEnd)} />
            <TextField label="Pass ID" name="passId" defaultValue={getParam(searchParams, "passId")} />
            <TextField label="Company Code / Name" name="companyCodeOrName" defaultValue={getParam(searchParams, "companyCodeOrName")} />
            <div className="flex items-end">
              <SearchButtonRow />
            </div>
            <Link
              href="/admin/reports/all-pass-issuance-report"
              className="inline-flex h-[42px] items-center justify-center rounded-xl bg-slate-100 px-5 text-sm font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Reset
            </Link>
          </div>

          <details open={hasAdvancedFilters} className="group mt-3">
            <summary className="w-fit cursor-pointer select-none text-sm font-semibold text-amber-600 hover:text-amber-500 dark:text-amber-400">
              More filters
            </summary>
            <div className="mt-3 grid gap-3 border-t border-slate-100 pt-3 md:grid-cols-2 xl:grid-cols-5 dark:border-slate-800">
              <TextField label="Pass Holder" name="cardHolder" placeholder="Person Name / Vehicle No" defaultValue={getParam(searchParams, "cardHolder")} />
              <TextField label="ID Proof" name="idProof" placeholder="PAN / Government ID" defaultValue={getParam(searchParams, "idProof")} />
              <SelectField label="Company Type" name="companyType" defaultValue={getParam(searchParams, "companyType")} options={options.companyTypes} />
              <SelectField label="Pass Type" name="passType" defaultValue={getParam(searchParams, "passType")} options={options.passTypes} />
              <SelectField label="Approval Status" name="approvalStatus" defaultValue={getParam(searchParams, "approvalStatus")} options={options.approvalStatuses} />
              <SelectField label="Pass Holder Type" name="passHolderType" defaultValue={getParam(searchParams, "passHolderType")} options={options.passHolderTypes} />
              <SelectField label="Nationality" name="nationality" defaultValue={getParam(searchParams, "nationality")} options={options.nationalities} />
              <SelectField label="Department" name="department" defaultValue={getParam(searchParams, "department")} options={options.departments} />
              <SelectField label="Payment Type" name="paymentType" defaultValue={getParam(searchParams, "paymentType")} options={options.paymentTypes} />
              <TextField label="Aadhaar" name="aadhaar" placeholder="Aadhaar No" defaultValue={getParam(searchParams, "aadhaar")} />
            </div>
          </details>
        </form>
        </div>
        {searched ? (
          <div className="flex min-h-0 flex-1 flex-col">
            {rows.length ? (
              <div id={targetId} className="min-h-0 flex-1 overflow-auto origin-top-left transition-transform">
                <table className="min-w-max w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-slate-50 text-left text-xs uppercase tracking-[0.1em] text-stone-500 shadow-sm dark:bg-slate-800 dark:text-stone-300">
                    <tr>
                      {[
                        "Source", "Pass ID", "Holder", "Holder Type", "Company",
                        "Pass Type", "Status", "Payment", "Valid From", "Valid To", "Amount",
                      ].map((label) => <th key={label} className="whitespace-nowrap px-4 py-3">{label}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 dark:divide-slate-800 dark:text-slate-200">
                    {rows.map((row, index) => (
                      <tr key={`${row.source}-${row.passId}-${index}`}>
                        <td className="px-4 py-3">{row.source}</td>
                        <td className="whitespace-nowrap px-4 py-3 font-semibold">{row.passId || "—"}</td>
                        <td className="px-4 py-3">{row.cardHolder || "—"}</td>
                        <td className="px-4 py-3">{row.passHolderType || "—"}</td>
                        <td className="px-4 py-3">{row.companyName || row.companyCode || "—"}</td>
                        <td className="px-4 py-3">{row.passType || "—"}</td>
                        <td className="px-4 py-3">{row.approvalStatus || "—"}</td>
                        <td className="px-4 py-3">{row.paymentType || "—"}</td>
                        <td className="whitespace-nowrap px-4 py-3">{formatReportDateTime(row.dateFrom)}</td>
                        <td className="whitespace-nowrap px-4 py-3">{formatReportDateTime(row.dateTo)}</td>
                        <td className="px-4 py-3">{row.amount ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyReportState>No pass records matched these filters.</EmptyReportState>
            )}
            <div className="shrink-0 border-t border-slate-100 dark:border-slate-800">
              <ReportViewerToolbar
                title={report.title}
                columns={columns}
                rows={rows}
                targetId={targetId}
                currentPage={pagination.page || 1}
                totalPages={totalPages}
                firstHref={buildPageHref(effectiveSearchParams, 1)}
                previousHref={buildPageHref(effectiveSearchParams, Math.max(1, (pagination.page || 1) - 1))}
                nextHref={buildPageHref(effectiveSearchParams, Math.min(totalPages, (pagination.page || 1) + 1))}
                lastHref={buildPageHref(effectiveSearchParams, totalPages)}
              />
              </div>
          </div>
        ) : (
          <EmptyReportState>
            <p className="text-base font-semibold">Enter filters and click Search</p>
            <p className="mt-1 text-sm">All pass issuance results will appear here.</p>
          </EmptyReportState>
        )}
      </section>
    </ReportShell>
  );
}

async function CardInventoryReport({ report, searchParams }) {
  const options = await getAllPassIssuanceOptions();
  return (
    <SimpleFilterReport report={report} endpoint="/reports/card-inventory-report" searchParams={searchParams} filterKeys={["cardNo", "transporterCode", "cardType", "issuanceFromDate", "issuanceToDate", "reissuanceFromDate", "reissuanceToDate"]}>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <TextField label="QR Pass Reference" name="cardNo" defaultValue={getParam(searchParams, "cardNo")} />
            <TextField label="Transporter Code" name="transporterCode" defaultValue={getParam(searchParams, "transporterCode")} />
            <SelectField label="QR Pass Type" name="cardType" defaultValue={getParam(searchParams, "cardType")} options={options.personVehicleCardTypes} />
            <TextField label="Issuance From Date" name="issuanceFromDate" type="date" defaultValue={getParam(searchParams, "issuanceFromDate")} />
            <TextField label="Issuance To Date" name="issuanceToDate" type="date" defaultValue={getParam(searchParams, "issuanceToDate")} />
            <TextField label="Reissuance From Date" name="reissuanceFromDate" type="date" defaultValue={getParam(searchParams, "reissuanceFromDate")} />
            <TextField label="Reissuance To Date" name="reissuanceToDate" type="date" defaultValue={getParam(searchParams, "reissuanceToDate")} />
            <div className="flex items-end">
              <SearchButtonRow />
            </div>
      </div>
    </SimpleFilterReport>
  );
}

async function CardInventorySummaryReport({ report, searchParams }) {
  return (
    <SimpleFilterReport
      endpoint="/reports/card-inventory-summary"
      searchParams={searchParams}
      filterKeys={["companyCode"]}
      report={report}
    >
      <div className="grid max-w-3xl gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
            <TextField label="Company Code" name="companyCode" defaultValue={getParam(searchParams, "companyCode")} />
            <div className="flex items-end">
              <SearchButtonRow />
            </div>
      </div>
    </SimpleFilterReport>
  );
}

function GateWiseInOutSummaryReport({ report, searchParams }) {
  const today = new Date().toISOString().slice(0, 10);
  return (
    <SimpleFilterReport
      report={report}
      endpoint="/reports/gate-wise-in-out-summary"
      searchParams={searchParams}
      filterKeys={["fromDate"]}
    >
      <div className="grid max-w-2xl gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
        <TextField label="From Date" name="fromDate" type="date" defaultValue={getParam(searchParams, "fromDate") || today} />
        <div className="flex items-end"><SearchButtonRow /></div>
      </div>
    </SimpleFilterReport>
  );
}

function RevenueReportSummary({ report, searchParams }) {
  const today = new Date().toISOString().slice(0, 10);
  return (
    <SimpleFilterReport
      report={report}
      endpoint="/reports/revenue-report-summary"
      searchParams={searchParams}
      filterKeys={["companyNameOrCode", "fromDate", "toDate"]}
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <TextField label="Company Code/Name" name="companyNameOrCode" defaultValue={getParam(searchParams, "companyNameOrCode")} />
        <TextField label="From Date" name="fromDate" type="date" defaultValue={getParam(searchParams, "fromDate") || today} />
        <TextField label="To Date" name="toDate" type="date" defaultValue={getParam(searchParams, "toDate") || today} />
        <div className="flex items-end"><SearchButtonRow /></div>
      </div>
    </SimpleFilterReport>
  );
}

function TotalPassIdReport({ report, searchParams }) {
  const now = new Date();
  const fromDate = new Date(now.getTime() - 6 * 60 * 60 * 1000);
  return (
    <SimpleFilterReport
      report={report}
      endpoint="/reports/total-passid-report"
      searchParams={searchParams}
      filterKeys={["companyNameOrCode", "passId", "fromDate", "toDate"]}
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <TextField label="Company Code/Name" name="companyNameOrCode" defaultValue={getParam(searchParams, "companyNameOrCode")} />
        <TextField label="Pass ID" name="passId" defaultValue={getParam(searchParams, "passId")} />
        <TextField label="From Date" name="fromDate" type="datetime-local" defaultValue={getParam(searchParams, "fromDate") || formatDateTimeLocal(fromDate)} />
        <TextField label="To Date" name="toDate" type="datetime-local" defaultValue={getParam(searchParams, "toDate") || formatDateTimeLocal(now)} />
        <div className="flex items-end"><SearchButtonRow /></div>
      </div>
    </SimpleFilterReport>
  );
}

async function TransactionRegisterReport({ report, searchParams }) {
  const now = new Date();
  const optionsData = await getJson("/reports/transaction-register/options");
  const weighbridges = Array.isArray(optionsData?.data?.weighbridges)
    ? optionsData.data.weighbridges
    : [];
  return (
    <SimpleFilterReport
      report={report}
      endpoint="/reports/transaction-register"
      searchParams={searchParams}
      filterKeys={["fromDate", "toDate", "serviceOrder", "vehicleNo", "transactionId", "agentId", "weighBridge"]}
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <TextField label="From Date" name="fromDate" type="datetime-local" defaultValue={getParam(searchParams, "fromDate") || formatDateTimeLocal(new Date(now.getTime() - 6 * 60 * 60 * 1000))} />
        <TextField label="To Date" name="toDate" type="datetime-local" defaultValue={getParam(searchParams, "toDate") || formatDateTimeLocal(now)} />
        <TextField label="Service Order" name="serviceOrder" defaultValue={getParam(searchParams, "serviceOrder")} />
        <TextField label="Vehicle No" name="vehicleNo" defaultValue={getParam(searchParams, "vehicleNo")} />
        <TextField label="Transaction ID" name="transactionId" defaultValue={getParam(searchParams, "transactionId")} />
        <TextField label="Agent ID" name="agentId" defaultValue={getParam(searchParams, "agentId")} />
        <SelectField label="Weigh Bridge" name="weighBridge" defaultValue={getParam(searchParams, "weighBridge")} options={weighbridges} />
        <div className="flex items-end"><SearchButtonRow /></div>
      </div>
    </SimpleFilterReport>
  );
}

async function RemainingReportPage({ report, searchParams, reportType }) {
  const now = new Date();
  const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);
  const today = now.toISOString().slice(0, 10);
  const options = ["transaction-report-in-out", "pass-approval-report"].includes(reportType)
    ? await getAllPassIssuanceOptions()
    : null;
  const commonDate = (withTime = true) => [
    <TextField key="from" label="From Date" name="fromDate" type={withTime ? "datetime-local" : "date"} defaultValue={getParam(searchParams, "fromDate") || (withTime ? formatDateTimeLocal(sixHoursAgo) : today)} />,
    <TextField key="to" label="To Date" name="toDate" type={withTime ? "datetime-local" : "date"} defaultValue={getParam(searchParams, "toDate") || (withTime ? formatDateTimeLocal(now) : today)} />,
  ];
  const configurations = {
    "manual-pass-report": {
      keys: ["fromDate", "toDate", "cardNo", "companyNameOrCode", "passId"],
      fields: [...commonDate(),
        <TextField key="card" label="QR Pass Reference" name="cardNo" defaultValue={getParam(searchParams, "cardNo")} />,
        <TextField key="company" label="Company Code/Name" name="companyNameOrCode" defaultValue={getParam(searchParams, "companyNameOrCode")} />,
        <TextField key="pass" label="Pass ID" name="passId" defaultValue={getParam(searchParams, "passId")} />],
    },
    "cargo-report": {
      keys: ["fromDate", "toDate", "serviceOrder", "cargo", "vesselName", "agents"],
      fields: [...commonDate(),
        <TextField key="service" label="Service Order" name="serviceOrder" defaultValue={getParam(searchParams, "serviceOrder")} />,
        <TextField key="cargo" label="Cargo" name="cargo" defaultValue={getParam(searchParams, "cargo")} />,
        <TextField key="vessel" label="Vessel Name" name="vesselName" defaultValue={getParam(searchParams, "vesselName")} />,
        <TextField key="agents" label="Agents" name="agents" defaultValue={getParam(searchParams, "agents")} />],
    },
    "pass-approval-report": {
      keys: ["fromDate", "toDate", "requestNumber", "vehicleOrPersonName", "transporterNameOrCode", "approvalStatus"],
      fields: [...commonDate(),
        <TextField key="request" label="Request Number" name="requestNumber" defaultValue={getParam(searchParams, "requestNumber")} />,
        <TextField key="holder" label="Vehicle/Person Name" name="vehicleOrPersonName" defaultValue={getParam(searchParams, "vehicleOrPersonName")} />,
        <TextField key="transporter" label="Transporter Name/Code" name="transporterNameOrCode" defaultValue={getParam(searchParams, "transporterNameOrCode")} />,
        <SelectField key="status" label="Approval Status" name="approvalStatus" defaultValue={getParam(searchParams, "approvalStatus")} options={options?.approvalStatuses || []} />],
    },
    "cargo-summary-report": {
      keys: ["companyNameOrCode", "fromDate", "toDate"],
      fields: [
        <TextField key="company" label="Company Code/Name" name="companyNameOrCode" defaultValue={getParam(searchParams, "companyNameOrCode")} />,
        ...commonDate(false),
      ],
    },
    "pre-own-card-status-report": {
      keys: ["fromDate", "toDate", "cardNo", "companyNameOrCode", "cardStatus"],
      fields: [...commonDate(),
        <TextField key="card" label="QR Pass Reference" name="cardNo" defaultValue={getParam(searchParams, "cardNo")} />,
        <TextField key="company" label="Company Code/Name" name="companyNameOrCode" defaultValue={getParam(searchParams, "companyNameOrCode")} />,
        <SelectField key="status" label="QR Pass Status" name="cardStatus" defaultValue={getParam(searchParams, "cardStatus")} options={["Active QR Pass", "Penalty QR Pass", "Expired QR Pass"]} />],
    },
    "intercarting-vehicle-report": {
      keys: ["fromDate", "toDate", "cardNo", "companyNameOrCode", "passId"],
      fields: [...commonDate(),
        <TextField key="card" label="QR Pass Reference" name="cardNo" defaultValue={getParam(searchParams, "cardNo")} />,
        <TextField key="company" label="Company Code/Name" name="companyNameOrCode" defaultValue={getParam(searchParams, "companyNameOrCode")} />,
        <TextField key="pass" label="Pass ID" name="passId" defaultValue={getParam(searchParams, "passId")} />],
    },
    "intercarting-machinary-report": {
      keys: ["fromDate", "toDate", "cardNo", "companyNameOrCode", "passId"],
      fields: [...commonDate(),
        <TextField key="card" label="QR Pass Reference" name="cardNo" defaultValue={getParam(searchParams, "cardNo")} />,
        <TextField key="company" label="Company Code/Name" name="companyNameOrCode" defaultValue={getParam(searchParams, "companyNameOrCode")} />,
        <TextField key="pass" label="Pass ID" name="passId" defaultValue={getParam(searchParams, "passId")} />],
    },
    "cargo-out-report": {
      keys: ["fromDate", "toDate", "serviceOrder", "vehicleNo", "transactionId", "agentId", "weighBridge"],
      fields: [...commonDate(),
        <TextField key="service" label="Service Order" name="serviceOrder" defaultValue={getParam(searchParams, "serviceOrder")} />,
        <TextField key="vehicle" label="Vehicle No" name="vehicleNo" defaultValue={getParam(searchParams, "vehicleNo")} />,
        <TextField key="transaction" label="Transaction ID" name="transactionId" defaultValue={getParam(searchParams, "transactionId")} />,
        <TextField key="agent" label="Agent ID" name="agentId" defaultValue={getParam(searchParams, "agentId")} />,
        <SelectField key="bridge" label="Weigh Bridge" name="weighBridge" defaultValue={getParam(searchParams, "weighBridge")} options={[]} />],
    },
    "gate-lane-wise-in-out-summary": {
      keys: ["fromDate"],
      fields: [<TextField key="from" label="From Date" name="fromDate" type="date" defaultValue={getParam(searchParams, "fromDate") || today} />],
    },
    "transaction-report-in-out": {
      keys: ["fromDate", "toDate", "companyNameOrCode", "cardType"],
      fields: [...commonDate(),
        <TextField key="company" label="Company Name/Code" name="companyNameOrCode" defaultValue={getParam(searchParams, "companyNameOrCode")} />,
        <SelectField key="cardType" label="QR Pass Type" name="cardType" defaultValue={getParam(searchParams, "cardType")} options={options?.cardTypes || []} />],
    },
  };
  const config = configurations[reportType];
  return (
    <SimpleFilterReport report={report} endpoint={`/reports/${reportType}`} searchParams={searchParams} filterKeys={config.keys}>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {config.fields}
        <div className="flex items-end"><SearchButtonRow /></div>
      </div>
    </SimpleFilterReport>
  );
}

function ComingSoonReport({ report }) {
  return (
    <ReportShell report={report}>
      <section className="min-h-[420px] rounded-2xl border border-slate-100 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900" />
    </ReportShell>
  );
}

function ResultCount({ count }) {
  return (
    <p className="px-4 sm:px-6 py-3 border-b border-slate-100 dark:border-slate-800 text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
      {count} result{count === 1 ? "" : "s"}
    </p>
  );
}

const registeredUserColumns = [
  { key: "serialNo", label: "S.NO", className: "w-[6%]" },
  { key: "userId", label: "USER ID", className: "w-[11%]" },
  { key: "companyName", label: "COMPANY NAME", className: "w-[15%]" },
  { key: "companyType", label: "USER TYPE", className: "w-[10%]" },
  { key: "contactNo", label: "CONTACT NO", className: "w-[13%]" },
  { key: "email", label: "EMAIL-ID", className: "w-[21%]" },
  { key: "address", label: "ADDRESS", className: "w-[24%]" },
];

function getRegisteredUserDisplayRows(rows, startSerial = 1) {
  return rows.map((row, index) => ({
    serialNo: startSerial + index,
    userId: row.companyCode || row.referenceNumber || "—",
    companyName: row.companyName || "—",
    companyType: row.companyType || "—",
    contactNo: row.mobileNo || "—",
    email: row.email || "—",
    address: row.address || [row.city, row.state].filter(Boolean).join(", ") || "—",
  }));
}

function RegisteredUsersTable({ rows, startSerial = 1 }) {
  if (!rows.length) {
    return (
      <EmptyReportState>
        <p className="text-base font-semibold">No registered users found</p>
        <p className="text-sm mt-1">Try changing the filters and searching again.</p>
      </EmptyReportState>
    );
  }

  const displayRows = getRegisteredUserDisplayRows(rows, startSerial);

  return (
    <div
      id={registeredUsersReportContentId}
      className="h-full overflow-auto origin-top-left transition-transform"
    >
      <table className="min-w-full table-fixed text-sm">
        <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800 text-left text-[11px] uppercase tracking-[0.07em] text-stone-400 shadow-sm">
          <tr>
            {registeredUserColumns.map((column) => (
              <th
                key={column.key}
                className={`whitespace-nowrap px-4 py-3 font-extrabold ${column.className}`}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {displayRows.map((row, index) => (
            <tr
              key={`${row.userId}-${index}`}
              data-report-row
              className="text-slate-700 dark:text-slate-200 scroll-mt-32"
            >
              <td className="px-4 py-3 font-semibold">{row.serialNo}</td>
              <td className="px-4 py-3 font-semibold">{row.userId}</td>
              <td className="px-4 py-3">{row.companyName}</td>
              <td className="px-4 py-3">{row.companyType}</td>
              <td className="whitespace-nowrap px-4 py-3">{row.contactNo}</td>
              <td className="truncate px-4 py-3">{row.email}</td>
              <td className="px-4 py-3">{row.address}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PassTypeTable({ rows, targetId }) {
  if (!rows.length) {
    return (
      <EmptyReportState>
        <p className="text-base font-semibold">No pass records found</p>
        <p className="text-sm mt-1">Try changing the filters and searching again.</p>
      </EmptyReportState>
    );
  }

  return (
    <div id={targetId} className="h-full overflow-auto origin-top-left transition-transform">
      <table className="min-w-max w-full text-sm">
        <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800 text-left text-xs uppercase tracking-[0.14em] text-stone-400 shadow-sm">
          <tr>
            <th className="px-4 py-3">Request No</th>
            <th className="px-4 py-3">Pass Request Type</th>
            <th className="px-4 py-3">Vehicle/Person</th>
            <th className="px-4 py-3">Pass Type</th>
            <th className="px-4 py-3">Transporter</th>
            <th className="px-4 py-3">From</th>
            <th className="px-4 py-3">To</th>
            <th className="px-4 py-3">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {rows.map((row, index) => (
            <tr key={`${row.passRequestId}-${row.passRequestType}-${index}`} className="text-slate-700 dark:text-slate-200">
              <td className="px-4 py-3 font-semibold">{row.requestNumber || "—"}</td>
              <td className="px-4 py-3">{row.passRequestType || "—"}</td>
              <td className="px-4 py-3">{row.vehicleOrPersonName || "—"}</td>
              <td className="px-4 py-3">{row.passType || "—"}</td>
              <td className="px-4 py-3">{row.transporterName || row.transporterCode || "—"}</td>
              <td className="px-4 py-3 whitespace-nowrap">{formatReportDateTime(row.dateFrom)}</td>
              <td className="px-4 py-3 whitespace-nowrap">{formatReportDateTime(row.dateTo)}</td>
              <td className="px-4 py-3">{row.amount || "0.00"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

async function TypeOfPassIssuedReport({ report, searchParams }) {
  const toDate = new Date();
  const fromDate = new Date(toDate.getTime() - 6 * 60 * 60 * 1000);
  const options = await getAllPassIssuanceOptions();
  const searched = hasAnySearch(searchParams, [
    "fromDate",
    "toDate",
    "requestNumber",
    "vehicleOrPersonName",
    "transporterNameOrCode",
    "passType",
    "passRequestType",
  ]);
  const query = buildQuery(searchParams, [
    "fromDate",
    "toDate",
    "requestNumber",
    "vehicleOrPersonName",
    "transporterNameOrCode",
    "passType",
    "passRequestType",
  ]);
  const reportData = searched
    ? await getJson(`/reports/type-of-pass-issued?${query}`)
    : null;
  const rows = Array.isArray(reportData?.data) ? reportData.data : [];
  const pagination = reportData?.pagination || {};
  const currentPage = pagination.page || 1;
  const totalPages = Math.max(1, Math.ceil((pagination.totalRecords || rows.length || 0) / (pagination.limit || 100)));
  const targetId = "type-of-pass-issued-report-content";
  const columns = [
    { key: "requestNumber", label: "REQUEST NO" },
    { key: "passRequestType", label: "PASS REQUEST TYPE" },
    { key: "vehicleOrPersonName", label: "VEHICLE/PERSON" },
    { key: "passType", label: "PASS TYPE" },
    { key: "transporterName", label: "TRANSPORTER" },
    { key: "dateFrom", label: "FROM" },
    { key: "dateTo", label: "TO" },
    { key: "amount", label: "AMOUNT" },
  ];

  return (
    <ReportShell report={report}>
      <section className="h-full min-h-0 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900 flex flex-col">
        <div className="shrink-0 border-b border-slate-100 dark:border-slate-800">
        <form className="max-h-[46vh] overflow-y-auto px-4 py-4 sm:px-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="space-y-1.5">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                From Date
              </span>
              <input
                name="fromDate"
                type="datetime-local"
                defaultValue={getParam(searchParams, "fromDate") || formatDateTimeLocal(fromDate)}
                className={fieldClass}
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                To Date
              </span>
              <input
                name="toDate"
                type="datetime-local"
                defaultValue={getParam(searchParams, "toDate") || formatDateTimeLocal(toDate)}
                className={fieldClass}
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Request Number
              </span>
              <input
                name="requestNumber"
                type="text"
                defaultValue={getParam(searchParams, "requestNumber")}
                className={fieldClass}
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Vehicle/Person Name
              </span>
              <input
                name="vehicleOrPersonName"
                type="text"
                defaultValue={getParam(searchParams, "vehicleOrPersonName")}
                className={fieldClass}
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Transporter Name/Code
              </span>
              <input
                name="transporterNameOrCode"
                type="text"
                defaultValue={getParam(searchParams, "transporterNameOrCode")}
                className={fieldClass}
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Pass Type
              </span>
              <select name="passType" defaultValue={getParam(searchParams, "passType")} className={fieldClass}>
                <option value="">-- Select --</option>
                {options.cardTypes.map((passType) => (
                  <option key={passType} value={passType}>
                    {passType}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1.5">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Pass Request Type
              </span>
              <select name="passRequestType" defaultValue={getParam(searchParams, "passRequestType")} className={fieldClass}>
                <option value="">-- Select --</option>
                {options.passRequestTypes.map((requestType) => (
                  <option key={requestType} value={requestType}>
                    {requestType}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex items-end">
              <button
                type="submit"
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-amber-400 text-white dark:text-slate-900 text-sm font-bold shadow hover:opacity-90"
              >
                Search
              </button>
            </div>
          </div>
        </form>
        </div>

        {searched ? (
          <div className="min-h-0 flex-1 flex flex-col">
            <div className="min-h-0 flex-1">
              <PassTypeTable rows={rows} targetId={targetId} />
            </div>
            <div className="shrink-0 border-t border-slate-100 dark:border-slate-800">
              <ReportViewerToolbar
                title={report.title}
                columns={columns}
                rows={rows}
                targetId={targetId}
                currentPage={currentPage}
                totalPages={totalPages}
                firstHref={buildPageHref(searchParams, 1)}
                previousHref={buildPageHref(searchParams, Math.max(1, currentPage - 1))}
                nextHref={buildPageHref(searchParams, Math.min(totalPages, currentPage + 1))}
                lastHref={buildPageHref(searchParams, totalPages)}
              />
            </div>
          </div>
        ) : (
          <EmptyReportState>
            <p className="text-base font-semibold">Enter filters and click Search</p>
            <p className="text-sm mt-1">Pass type report results will appear here.</p>
          </EmptyReportState>
        )}
      </section>
    </ReportShell>
  );
}

function ReportShell({ report, children }) {
  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-x-hidden overflow-y-auto p-3 sm:p-4 lg:p-6">
      <div className="mb-5 shrink-0 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1f1f1f] dark:text-stone-100 tracking-tight">
            {report.title.trim().toLowerCase().endsWith("report")
              ? report.title
              : `${report.title} Report`}
          </h2>
          <p className="mt-1 text-sm sm:text-base text-stone-500 dark:text-stone-400">
            {report.description}
          </p>
        </div>

        <Link
          href="/admin/reports"
          className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          ← Back
        </Link>
      </div>
      <div className="min-h-[640px] min-w-0 max-w-full flex-1">{children}</div>
    </div>
  );
}

export default async function ReportPage({ params, searchParams }) {
  const { reportType } = await params;
  const resolvedSearchParams = await searchParams;
  const report = getReport(reportType);

  if (!report) {
    notFound();
  }

  if (!report.implemented) {
    return <ComingSoonReport report={report} />;
  }

  if (reportType === "gate-wise-in-out-summary") {
    return <GateWiseInOutSummaryReport report={report} searchParams={resolvedSearchParams} />;
  }

  if (reportType === "revenue-report-summary") {
    return <RevenueReportSummary report={report} searchParams={resolvedSearchParams} />;
  }

  if (reportType === "total-passid-report") {
    return <TotalPassIdReport report={report} searchParams={resolvedSearchParams} />;
  }

  if (reportType === "transaction-register") {
    return <TransactionRegisterReport report={report} searchParams={resolvedSearchParams} />;
  }

  if ([
    "manual-pass-report",
    "cargo-report",
    "pass-approval-report",
    "cargo-summary-report",
    "pre-own-card-status-report",
    "intercarting-vehicle-report",
    "intercarting-machinary-report",
    "cargo-out-report",
    "gate-lane-wise-in-out-summary",
    "transaction-report-in-out",
  ].includes(reportType)) {
    return <RemainingReportPage report={report} searchParams={resolvedSearchParams} reportType={reportType} />;
  }

  if (reportType === "all-pass-issuance-report") {
    return <AllPassIssuanceReport report={report} searchParams={resolvedSearchParams} />;
  }

  if (reportType === "card-inventory-report") {
    return <CardInventoryReport report={report} searchParams={resolvedSearchParams} />;
  }

  if (reportType === "card-inventory-summary") {
    return <CardInventorySummaryReport report={report} searchParams={resolvedSearchParams} />;
  }

  if (reportType === "type-of-pass-issued") {
    return <TypeOfPassIssuedReport report={report} searchParams={resolvedSearchParams} />;
  }

  if (reportType === "gate-in-out") {
    return <GateInOutReport report={report} searchParams={resolvedSearchParams} />;
  }

  if (reportType === "more-than-2-card") {
    return <MoreThan2CardReport report={report} searchParams={resolvedSearchParams} />;
  }

  if (reportType === "card-expired-report") {
    return <ExpiredCardReport report={report} searchParams={resolvedSearchParams} />;
  }

  if (reportType === "card-issued") {
    return <CardIssuedReport report={report} searchParams={resolvedSearchParams} />;
  }

  if (reportType === "card-last-issued") {
    return <CardLastIssuedReport report={report} searchParams={resolvedSearchParams} />;
  }

  if (reportType === "revenue-report") {
    return <RevenueReport report={report} searchParams={resolvedSearchParams} />;
  }

  if (reportType === "wharfage-report") {
    return <WharfageReport report={report} searchParams={resolvedSearchParams} />;
  }

  if (reportType === "card-penalty-report") {
    return <CardPenaltyReport report={report} searchParams={resolvedSearchParams} />;
  }

  if (reportType === "card-lost-report") {
    return <CardLostReport report={report} searchParams={resolvedSearchParams} />;
  }

  if (reportType === "individual-card-query-report") {
    return <IndividualCardQueryReport report={report} searchParams={resolvedSearchParams} />;
  }

  const companyTypes = await getCompanyTypesFromReportOptions();
  const query = buildQuery(resolvedSearchParams, ["companyCode", "companyType", "find", "page"]);
  const searched = hasAnySearch(resolvedSearchParams, ["companyCode", "companyType", "find"]);
  const reportData = searched
    ? await getJson(`/reports/registered-users?${query}`)
    : null;
  const rows = Array.isArray(reportData?.data) ? reportData.data : [];
  const pagination = reportData?.pagination || {};
  const currentPage = pagination.page || 1;
  const pageLimit = pagination.limit || 100;
  const startSerial = (currentPage - 1) * pageLimit + 1;
  const exportRows = getRegisteredUserDisplayRows(rows, startSerial);
  const totalPages = Math.max(
    1,
    Math.ceil((pagination.totalRecords || rows.length || 0) / pageLimit),
  );

  return (
    <ReportShell report={report}>
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden h-full min-h-0 flex flex-col">
        <div className="shrink-0 border-b border-slate-100 dark:border-slate-800">
          <form className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row gap-3">
            <input
              name="companyCode"
              type="text"
              placeholder="Company Code"
              defaultValue={getParam(resolvedSearchParams, "companyCode")}
              className="w-full sm:max-w-xs px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-400"
            />

            <select
              name="companyType"
              defaultValue={getParam(resolvedSearchParams, "companyType")}
              className={fieldClass}
            >
              <option value="">-- Select Company Type --</option>
              {companyTypes.map((companyType) => (
                <option key={companyType} value={companyType}>
                  {companyType}
                </option>
              ))}
            </select>

            <LiveReportSearchInput
              name="find"
              placeholder="Search users"
              defaultValue={getParam(resolvedSearchParams, "find")}
              className="w-full sm:max-w-xs px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-400"
            />

            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-amber-400 text-white dark:text-slate-900 text-sm font-bold shadow hover:opacity-90"
            >
              Search
            </button>

            <Link
              href="/admin/reports/registered-users"
              className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-semibold hover:bg-slate-200 dark:hover:bg-slate-700"
            >
              Reset
            </Link>
          </form>
        </div>

        {searched ? (
          <div className="min-h-0 flex-1 flex flex-col">
            <div className="min-h-0 flex-1">
              <RegisteredUsersTable rows={rows} startSerial={startSerial} />
            </div>
            <div className="shrink-0 border-t border-slate-100 dark:border-slate-800">
              <ReportViewerToolbar
                title="Registered User Report"
                columns={registeredUserColumns}
                rows={exportRows}
                targetId={registeredUsersReportContentId}
                currentPage={currentPage}
                totalPages={totalPages}
                firstHref={buildPageHref(resolvedSearchParams, 1)}
                previousHref={buildPageHref(
                  resolvedSearchParams,
                  Math.max(1, currentPage - 1),
                )}
                nextHref={buildPageHref(
                  resolvedSearchParams,
                  Math.min(totalPages, currentPage + 1),
                )}
                lastHref={buildPageHref(resolvedSearchParams, totalPages)}
              />
            </div>
          </div>
        ) : (
          <EmptyReportState>
            <p className="text-base font-semibold">Enter filters and click Search</p>
            <p className="text-sm mt-1">Registered users report results will appear here.</p>
          </EmptyReportState>
        )}
      </section>
    </ReportShell>
  );
}
