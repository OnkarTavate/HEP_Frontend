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
      ? options.transactionTypes.map((option) => option.label)
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

function SimpleFilterReport({ report, children }) {
  return (
    <ReportShell report={report}>
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden">
        <form className="px-4 sm:px-6 py-5">{children}</form>
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
    <SimpleFilterReport report={report}>
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
          <ReportLabel>Card Type</ReportLabel>
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
    <SimpleFilterReport report={report}>
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
          <ReportLabel>Card No</ReportLabel>
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
          <ReportLabel>Card Type</ReportLabel>
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
    <SimpleFilterReport report={report}>
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
          <ReportLabel>Card Type</ReportLabel>
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
    <SimpleFilterReport report={report}>
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
          <select name="passPeriod" defaultValue={getParam(searchParams, "passPeriod")} className={fieldClass}>
            <option value="">-- Select --</option>
            {options.passTypes.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </label>

        <label className="space-y-1.5">
          <ReportLabel>Card Type</ReportLabel>
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
      </div>
    </SimpleFilterReport>
  );
}

async function CardLastIssuedReport({ report, searchParams }) {
  const today = new Date().toISOString().slice(0, 10);
  const options = await getAllPassIssuanceOptions();

  return (
    <SimpleFilterReport report={report}>
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
          <ReportLabel>Card Type</ReportLabel>
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
    <SimpleFilterReport report={report}>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
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
          <ReportLabel>Transaction Type</ReportLabel>
          <select
            name="transactionType"
            defaultValue={getParam(searchParams, "transactionType")}
            className={fieldClass}
          >
            <option value="">-- Select --</option>
            {options.transactionTypes.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1.5">
          <ReportLabel>Paid From Date</ReportLabel>
          <input
            name="paidFromDate"
            type="date"
            defaultValue={getParam(searchParams, "paidFromDate") || today}
            className={fieldClass}
          />
        </label>

        <label className="space-y-1.5">
          <ReportLabel>Paid To Date</ReportLabel>
          <input
            name="paidToDate"
            type="date"
            defaultValue={getParam(searchParams, "paidToDate") || today}
            className={fieldClass}
          />
        </label>

        <label className="space-y-1.5">
          <ReportLabel>Payment Status</ReportLabel>
          <select
            name="paymentStatus"
            defaultValue={getParam(searchParams, "paymentStatus")}
            className={fieldClass}
            disabled={!options.paymentStatuses.length}
          >
            <option value="">
              {options.paymentStatuses.length ? "-- Select --" : "No database options configured"}
            </option>
            {options.paymentStatuses.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </label>

        <SearchButtonRow />
      </div>
    </SimpleFilterReport>
  );
}

function WharfageReport({ report, searchParams }) {
  const today = new Date().toISOString().slice(0, 10);

  return (
    <SimpleFilterReport report={report}>
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

function CardPenaltyReport({ report, searchParams }) {
  const today = new Date().toISOString().slice(0, 10);

  return (
    <SimpleFilterReport report={report}>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <label className="space-y-1.5">
          <ReportLabel>Card No</ReportLabel>
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
    <SimpleFilterReport report={report}>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="space-y-1.5">
          <ReportLabel>Card No</ReportLabel>
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
          <ReportLabel>Card Type</ReportLabel>
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
    <SimpleFilterReport report={report}>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="space-y-1.5">
          <ReportLabel>Card No</ReportLabel>
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
          <ReportLabel>Card Type</ReportLabel>
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
  const searched = hasAnySearch(searchParams, filterKeys);
  const query = buildQuery(searchParams, [...filterKeys, "page"]);
  const reportData = searched
    ? await getJson(`/reports/all-pass-issuance?${query}`)
    : null;
  const rows = Array.isArray(reportData?.data) ? reportData.data : [];
  const pagination = reportData?.pagination || {};
  const totalPages = Math.max(
    1,
    Math.ceil((pagination.totalRecords || rows.length || 0) / (pagination.limit || 100)),
  );

  return (
    <ReportShell
      report={{
        ...report,
        title: "All Pass Issuance - Transaction",
        description: "Search every issued pass using holder, company, approval, and payment details.",
      }}
    >
      <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <form className="p-5 sm:p-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <TextField label="From Date" name="fromDate" type="datetime-local" defaultValue={getParam(searchParams, "fromDate") || formatDateTimeLocal(periodStart)} />
            <TextField label="To Date" name="toDate" type="datetime-local" defaultValue={getParam(searchParams, "toDate") || formatDateTimeLocal(periodEnd)} />
            <TextField label="Pass ID" name="passId" defaultValue={getParam(searchParams, "passId")} />
            <TextField label="Card Holder" name="cardHolder" placeholder="Person Name / Vehicle No" defaultValue={getParam(searchParams, "cardHolder")} />
            <TextField label="ID Proof" name="idProof" placeholder="PAN / Government ID / Driving Licence No" defaultValue={getParam(searchParams, "idProof")} />
            <TextField label="Company Code / Name" name="companyCodeOrName" defaultValue={getParam(searchParams, "companyCodeOrName")} />
            <SelectField label="Company Type" name="companyType" defaultValue={getParam(searchParams, "companyType")} options={options.companyTypes} />
            <SelectField label="Pass Type" name="passType" defaultValue={getParam(searchParams, "passType")} options={options.passTypes} />
            <SelectField label="Approval Status" name="approvalStatus" defaultValue={getParam(searchParams, "approvalStatus")} options={options.approvalStatuses} />
            <SelectField label="Pass Holder Type" name="passHolderType" defaultValue={getParam(searchParams, "passHolderType")} options={options.passHolderTypes} />
            <SelectField label="Nationality" name="nationality" defaultValue={getParam(searchParams, "nationality")} options={options.nationalities} />
            <SelectField label="Department" name="department" defaultValue={getParam(searchParams, "department")} options={options.departments} />
            <SelectField label="Payment Type" name="paymentType" defaultValue={getParam(searchParams, "paymentType")} options={options.paymentTypes} />
            <TextField label="Aadhaar" name="aadhaar" placeholder="Aadhaar No" defaultValue={getParam(searchParams, "aadhaar")} />
            <div className="flex items-end xl:col-start-3">
              <SearchButtonRow />
            </div>
          </div>
        </form>
        {searched ? (
          <>
            <ResultCount count={pagination.totalRecords || rows.length} />
            {rows.length ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.1em] text-stone-400 dark:bg-slate-800/70">
                    <tr>
                      {[
                        "Source", "Pass ID", "Holder", "Holder Type", "Company",
                        "Pass Type", "Status", "Payment", "Valid From", "Valid To", "Amount",
                      ].map((label) => <th key={label} className="whitespace-nowrap px-4 py-3">{label}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
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
            {totalPages > 1 ? (
              <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4 text-sm dark:border-slate-800">
                <span>Page {pagination.page || 1} of {totalPages}</span>
                <div className="flex gap-2">
                  {(pagination.page || 1) > 1 ? <Link href={buildPageHref(searchParams, pagination.page - 1)}>Previous</Link> : null}
                  {(pagination.page || 1) < totalPages ? <Link href={buildPageHref(searchParams, pagination.page + 1)}>Next</Link> : null}
                </div>
              </div>
            ) : null}
          </>
        ) : null}
      </section>
    </ReportShell>
  );
}

async function CardInventoryReport({ report, searchParams }) {
  const options = await getAllPassIssuanceOptions();
  return (
    <ReportShell report={report}>
      <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <form className="p-5 sm:p-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <TextField label="Card No" name="cardNo" defaultValue={getParam(searchParams, "cardNo")} />
            <TextField label="Transporter Code" name="transporterCode" defaultValue={getParam(searchParams, "transporterCode")} />
            <SelectField label="Card Type" name="cardType" defaultValue={getParam(searchParams, "cardType")} options={options.personVehicleCardTypes} />
            <TextField label="Issuance From Date" name="issuanceFromDate" type="date" defaultValue={getParam(searchParams, "issuanceFromDate")} />
            <TextField label="Issuance To Date" name="issuanceToDate" type="date" defaultValue={getParam(searchParams, "issuanceToDate")} />
            <TextField label="Reissuance From Date" name="reissuanceFromDate" type="date" defaultValue={getParam(searchParams, "reissuanceFromDate")} />
            <TextField label="Reissuance To Date" name="reissuanceToDate" type="date" defaultValue={getParam(searchParams, "reissuanceToDate")} />
            <div className="flex items-end">
              <SearchButtonRow />
            </div>
          </div>
        </form>
        <ReferenceReportNotice searchParams={searchParams} />
      </section>
    </ReportShell>
  );
}

function CardInventorySummaryReport({ report, searchParams }) {
  return (
    <ReportShell
      report={{
        ...report,
        title: "RFID Card Issuance",
        description: "Summary of RFID card issuance for a selected company.",
      }}
    >
      <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <form className="p-5 sm:p-6">
          <div className="grid max-w-3xl gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
            <TextField label="Company Code" name="companyCode" defaultValue={getParam(searchParams, "companyCode")} />
            <div className="flex items-end">
              <SearchButtonRow />
            </div>
          </div>
        </form>
        <ReferenceReportNotice searchParams={searchParams} />
      </section>
    </ReportShell>
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

  if (!report.implemented) {
    return <ComingSoonReport report={report} />;
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
