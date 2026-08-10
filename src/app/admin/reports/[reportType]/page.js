import Link from "next/link";
import { notFound } from "next/navigation";
import { getReport } from "@/lib/reports";
import LiveReportSearchInput from "@/components/reports/LiveReportSearchInput";
import ReportViewerToolbar from "@/components/reports/ReportViewerToolbar";

const AGENT_API =
  process.env.NEXT_PUBLIC_AGENT_API || "http://127.0.0.1:5001/api";

const fallbackCompanyTypes = [
  "Steamer Agent",
  "Stevedoring and Shore Handling License",
  "Importer/Exporter",
  "Container Freight Station",
  "Console Agents/Main Line Operators/Exporter",
  "Transporting firms",
  "Associations",
  "Govt Departments",
  "Chipping/Painting",
  "Container/Operator",
  "Contractor",
  "Co-Operative Stores",
  "Custom House and Steamer Agent",
  "Custom House Agent",
  "Labour Licence",
  "Launch Operation",
  "Lease and Plot holder",
  "MLO or Consol Agent",
  "Reg. Transport Association",
  "Self Clearing(Customs)",
  "Ship Chandlers",
  "Ship Garbage Disposal",
  "Sailors Society",
  "Storage Tank",
  "Surveyors",
  "Unions",
  "Water Supplier",
  "Society",
  "Terminal Operator",
  "Ship repairer",
  "Others",
];

const passTypes = ["DAILY", "YEARLY"];
const passRequestTypes = ["Person", "Vehicle", "Both"];
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

  return Array.from(new Set([...companyTypes, ...fallbackCompanyTypes])).sort((a, b) =>
    a.localeCompare(b),
  );
}

function formatDateTimeLocal(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function EmptyReportState({ children }) {
  return (
    <div className="py-16 text-center text-stone-400 dark:text-stone-500">
      {children}
    </div>
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

function PassTypeTable({ rows }) {
  if (!rows.length) {
    return (
      <EmptyReportState>
        <p className="text-base font-semibold">No pass records found</p>
        <p className="text-sm mt-1">Try changing the filters and searching again.</p>
      </EmptyReportState>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 dark:bg-slate-800/70 text-left text-xs uppercase tracking-[0.14em] text-stone-400">
          <tr>
            <th className="px-4 py-3">Request No</th>
            <th className="px-4 py-3">Type</th>
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
              <td className="px-4 py-3">{row.dateFrom || "—"}</td>
              <td className="px-4 py-3">{row.dateTo || "—"}</td>
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

  return (
    <ReportShell report={report}>
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden">
        <form className="px-4 sm:px-6 py-5 border-b border-slate-100 dark:border-slate-800">
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
                {passTypes.map((passType) => (
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
                {passRequestTypes.map((requestType) => (
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

        {searched ? (
          <>
            <ResultCount count={reportData?.pagination?.totalRecords || rows.length} />
            <PassTypeTable rows={rows} />
          </>
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
    <div className="w-full h-full min-h-0 overflow-hidden p-3 sm:p-4 lg:p-6 flex flex-col">
      <div className="mb-5 shrink-0 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1f1f1f] dark:text-stone-100 tracking-tight">
            {report.title} Report
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
      <div className="min-h-0 flex-1">{children}</div>
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

  if (reportType === "type-of-pass-issued") {
    return <TypeOfPassIssuedReport report={report} searchParams={resolvedSearchParams} />;
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
