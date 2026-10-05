"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import PaginationBar from "@/components/ui/PaginationBar";
import { toast } from "sonner";

import {
  Building2,
  Check,
  ClipboardList,
  Copy,
  ExternalLink,
  FileText,
  Link2,
  Loader2,
  Mail,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Upload,
  X,
  XCircle,
} from "lucide-react";

import {
  createMaterialLink,
  getMaterialLinkMasters,
  listMaterialLinks,
  resendMaterialLink,
  revokeMaterialLink,
} from "@/lib/materialMovementLinkApi";

/* ------------------------------------------------------------------
   Shared constants and presentational helpers
------------------------------------------------------------------- */

const PAGE_SIZE = 10;
const MAX_FILE_SIZE = 2 * 1024 * 1024;

const ACCEPTED_EXTENSIONS = /\.pdf$/i;
const ACCEPTED_TYPES = new Set(["application/pdf"]);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MOBILE_REGEX = /^[6-9]\d{9}$/;

const inputCls =
  "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 " +
  "text-sm text-slate-900 outline-none transition " +
  "placeholder:text-slate-400 focus:border-orange-500 " +
  "focus:ring-4 focus:ring-orange-500/10 " +
  "disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500";

const textareaCls = `${inputCls} resize-y`;

const primaryButtonCls =
  "inline-flex items-center justify-center gap-2 rounded-xl " +
  "bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white " +
  "shadow-sm transition hover:bg-orange-700 " +
  "focus-visible:outline-none focus-visible:ring-4 " +
  "focus-visible:ring-orange-500/25 " +
  "disabled:cursor-not-allowed disabled:opacity-60";

const secondaryButtonCls =
  "inline-flex items-center justify-center gap-2 rounded-xl " +
  "border border-slate-300 bg-white px-3 py-2 text-sm " +
  "font-medium text-slate-700 transition hover:bg-slate-50 " +
  "focus-visible:outline-none focus-visible:ring-4 " +
  "focus-visible:ring-orange-500/15 " +
  "disabled:cursor-not-allowed disabled:opacity-50";

const STATUS_STYLES = {
  ACTIVE: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  EXPIRED: "bg-amber-50 text-amber-700 ring-amber-200",
  REVOKED: "bg-rose-50 text-rose-700 ring-rose-200",
  DISABLED: "bg-slate-100 text-slate-600 ring-slate-200",
};

function Field({
  id,
  label,
  required,
  error,
  hint,
  children,
}) {
  return (
    <div className="min-w-0">
      <label
        htmlFor={id}
        className="mb-1.5 block text-xs font-semibold text-slate-700"
      >
        {label}
        {required && (
          <span className="ml-1 text-rose-600">*</span>
        )}
      </label>

      {children}

      {error ? (
        <p
          id={`${id}-error`}
          role="alert"
          className="mt-1.5 text-xs text-rose-600"
        >
          {error}
        </p>
      ) : hint ? (
        <p
          id={`${id}-hint`}
          className="mt-1.5 text-xs leading-5 text-slate-500"
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function StatusBadge({ status }) {
  return (
    <span
      className={
        "inline-flex whitespace-nowrap rounded-full px-2.5 py-1 " +
        "text-[11px] font-semibold ring-1 ring-inset " +
        (STATUS_STYLES[status] || STATUS_STYLES.DISABLED)
      }
    >
      {status || "UNKNOWN"}
    </span>
  );
}

function SectionTitle({ number, title, description }) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-xs font-bold text-orange-700">
        {number}
      </span>

      <div>
        <h3 className="text-sm font-semibold text-slate-900">
          {title}
        </h3>
        <p className="mt-0.5 text-xs leading-5 text-slate-500">
          {description}
        </p>
      </div>
    </div>
  );
}

function errorMessage(error, fallback) {
  return (
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
}

/* ------------------------------------------------------------------
   Date, link and form helpers
------------------------------------------------------------------- */

function todayInIndia() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const values = Object.fromEntries(
    parts.map(({ type, value }) => [type, value])
  );

  return `${values.year}-${values.month}-${values.day}`;
}

function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function addSixMonths(value) {
  if (!isValidDate(value)) {
    return "";
  }

  const [year, month, day] = value.split("-").map(Number);

  const targetMonth = new Date(
    Date.UTC(year, month - 1 + 6, 1)
  );

  const lastDay = new Date(
    Date.UTC(
      targetMonth.getUTCFullYear(),
      targetMonth.getUTCMonth() + 1,
      0
    )
  ).getUTCDate();

  return new Date(
    Date.UTC(
      targetMonth.getUTCFullYear(),
      targetMonth.getUTCMonth(),
      Math.min(day, lastDay)
    )
  )
    .toISOString()
    .slice(0, 10);
}

function fmtDate(value) {
  const dateOnly = String(value || "").slice(0, 10);

  if (!isValidDate(dateOnly)) {
    return "—";
  }

  // DATEONLY is a calendar date, rather than a local timestamp.
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(new Date(`${dateOnly}T00:00:00+05:30`));
}

function fmtDateTime(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  }).format(date);
}

function safeVendorLink(value) {
  if (typeof value !== "string") {
    return null;
  }

  try {
    const url = new URL(value);

    if (
      !["https:", "http:"].includes(url.protocol) ||
      url.username ||
      url.password
    ) {
      return null;
    }

    return url.href;
  } catch {
    return null;
  }
}

async function copyLink(value) {
  const link = safeVendorLink(value);

  if (!link) {
    toast.error("A link is unavailable for this record.");
    return;
  }

  try {
    await navigator.clipboard.writeText(link);
    toast.success("Link copied to clipboard.");
  } catch {
    toast.error("Could not copy the link. Please try again.");
  }
}

function initialForm() {
  return {
    companyName: "",
    vendorEmail: "",
    vendorMobile: "",
    purposeOfVisitId: "",
    purposeOther: "",
    gateSelectionMode: "DEPARTMENT",
    permittedGateIds: [],
    requiresTrafficApproval: false,
    validFrom: todayInIndia(),
    validTo: "",
    referenceDocumentNo: "",
    workOrderFile: null,
    remarks: "",
  };
}

function validateForm(form, masters) {
  const errors = {};

  const selectedPurpose = masters.purposes.find(
    (purpose) =>
      String(purpose.id) === String(form.purposeOfVisitId)
  );

  const isOther =
    selectedPurpose?.name?.trim().toLowerCase() === "others";

  const companyName = form.companyName.trim();
  const vendorEmail = form.vendorEmail.trim();

  if (
    companyName.length < 2 ||
    companyName.length > 100
  ) {
    errors.companyName =
      "Enter a company name of 2–100 characters.";
  }

  if (
    vendorEmail.length > 254 ||
    !EMAIL_REGEX.test(vendorEmail)
  ) {
    errors.vendorEmail = "Enter a valid vendor email.";
  }

  if (!MOBILE_REGEX.test(form.vendorMobile.trim())) {
    errors.vendorMobile =
      "Enter a valid 10-digit Indian mobile number.";
  }

  if (!selectedPurpose) {
    errors.purposeOfVisitId = "Select a purpose.";
  }

  if (isOther && !form.purposeOther.trim()) {
    errors.purposeOther = "Specify the purpose.";
  } else if (form.purposeOther.trim().length > 250) {
    errors.purposeOther = "Use 250 characters or fewer.";
  }

  if (
    !["DEPARTMENT", "VENDOR"].includes(form.gateSelectionMode)
  ) {
    errors.permittedGateIds = "Choose who will select gates.";
  } else if (form.gateSelectionMode === "DEPARTMENT") {
    const activeIds = new Set(
      masters.gates.map((gate) => Number(gate.id))
    );

    if (form.permittedGateIds.length === 0) {
      errors.permittedGateIds = "Select at least one gate.";
    } else if (
      form.permittedGateIds.length > 11 ||
      new Set(form.permittedGateIds).size !==
        form.permittedGateIds.length ||
      form.permittedGateIds.some(
        (id) =>
          !Number.isSafeInteger(id) ||
          id <= 0 ||
          !activeIds.has(id)
      )
    ) {
      errors.permittedGateIds =
        "Select valid gates from the available list.";
    }
  } else if (form.permittedGateIds.length > 0) {
    errors.permittedGateIds =
      "Clear department gates when the vendor selects gates.";
  }

  const validStart = isValidDate(form.validFrom);
  const validEnd = isValidDate(form.validTo);

  if (
    !validStart ||
    form.validFrom < todayInIndia()
  ) {
    errors.validFrom = "Select today or a future date.";
  }

  if (!validEnd) {
    errors.validTo = "Select a valid end date.";
  } else if (
    validStart &&
    form.validTo < form.validFrom
  ) {
    errors.validTo =
      "End date must be on or after the start date.";
  } else if (
    validStart &&
    form.validTo > addSixMonths(form.validFrom)
  ) {
    errors.validTo = "Validity cannot exceed six months.";
  }

  if (form.referenceDocumentNo.trim().length > 60) {
    errors.referenceDocumentNo =
      "Use 60 characters or fewer.";
  }

  if (form.remarks.trim().length > 500) {
    errors.remarks = "Use 500 characters or fewer.";
  }

  if (
    form.workOrderFile &&
    (
      form.workOrderFile.size === 0 ||
      form.workOrderFile.size > MAX_FILE_SIZE ||
      !ACCEPTED_EXTENSIONS.test(form.workOrderFile.name) ||
      !ACCEPTED_TYPES.has(form.workOrderFile.type)
    )
  ) {
    errors.workOrderFile =
      "Choose a non-empty PDF file up to 2 MB.";
  }

  return errors;
}

/* ------------------------------------------------------------------
   Create link form
------------------------------------------------------------------- */

function CreateLinkForm({ onCreated }) {
  const [form, setForm] = useState(initialForm);
  const [masters, setMasters] = useState({
    gates: [],
    purposes: [],
  });
  const [loadingMasters, setLoadingMasters] = useState(true);
  const [mastersError, setMastersError] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState(null);

  const fileRef = useRef(null);
  const formRef = useRef(null);
  const submitLock = useRef(false);
  const masterRequestId = useRef(0);

  const loadMasters = useCallback(async () => {
    const requestId = ++masterRequestId.current;

    setLoadingMasters(true);
    setMastersError("");

    try {
      const result = await getMaterialLinkMasters();

      if (requestId !== masterRequestId.current) {
        return;
      }

      setMasters({
        gates: Array.isArray(result?.gates)
          ? result.gates
          : [],
        purposes: Array.isArray(result?.purposes)
          ? result.purposes
          : [],
      });
    } catch (error) {
      if (requestId === masterRequestId.current) {
        setMastersError(
          errorMessage(error, "Unable to load form options.")
        );
      }
    } finally {
      if (requestId === masterRequestId.current) {
        setLoadingMasters(false);
      }
    }
  }, []);

  useEffect(() => {
    loadMasters();

    return () => {
      masterRequestId.current += 1;
    };
  }, [loadMasters]);

  const selectedPurpose = useMemo(
    () =>
      masters.purposes.find(
        (purpose) =>
          String(purpose.id) === String(form.purposeOfVisitId)
      ),
    [masters.purposes, form.purposeOfVisitId]
  );

  const isOther =
    selectedPurpose?.name?.trim().toLowerCase() === "others";

  const vendorSelectsGates =
    form.gateSelectionMode === "VENDOR";

  const maxValidTo = addSixMonths(form.validFrom);

  const disabled =
    submitting || loadingMasters || Boolean(mastersError);

  const createdLink = safeVendorLink(created?.vendorLink);

  function update(name, value) {
    setForm((current) => ({
      ...current,
      [name]: value,
      ...(name === "purposeOfVisitId"
        ? { purposeOther: "" }
        : {}),
    }));

    setErrors((current) => ({
      ...current,
      [name]: undefined,
      ...(name === "purposeOfVisitId"
        ? { purposeOther: undefined }
        : {}),
    }));
  }

  function changeGateMode(mode) {
    setForm((current) => ({
      ...current,
      gateSelectionMode: mode,
      permittedGateIds: [],
    }));

    setErrors((current) => ({
      ...current,
      permittedGateIds: undefined,
    }));
  }

  function toggleGate(value) {
    const gateId = Number(value);

    if (
      vendorSelectsGates ||
      !Number.isSafeInteger(gateId) ||
      gateId <= 0
    ) {
      return;
    }

    setForm((current) => ({
      ...current,
      permittedGateIds:
        current.permittedGateIds.includes(gateId)
          ? current.permittedGateIds.filter(
              (id) => id !== gateId
            )
          : [...current.permittedGateIds, gateId],
    }));

    setErrors((current) => ({
      ...current,
      permittedGateIds: undefined,
    }));
  }

  function selectFile(event) {
    const file = event.target.files?.[0] || null;

    if (
      file &&
      (
        file.size === 0 ||
        file.size > MAX_FILE_SIZE ||
        !ACCEPTED_EXTENSIONS.test(file.name) ||
        !ACCEPTED_TYPES.has(file.type)
      )
    ) {
      event.target.value = "";
      update("workOrderFile", null);

      setErrors((current) => ({
        ...current,
        workOrderFile:
          "Choose a non-empty PDF file up to 2 MB.",
      }));

      return;
    }

    update("workOrderFile", file);
  }

  function resetForm() {
    setForm(initialForm());
    setErrors({});

    if (fileRef.current) {
      fileRef.current.value = "";
    }
  }

  async function submit(event) {
    event.preventDefault();

    if (submitLock.current || disabled) {
      return;
    }

    const nextErrors = validateForm(form, masters);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      toast.error("Please correct the highlighted fields.");

      const firstInvalid = Object.keys(nextErrors)[0];

      formRef.current
        ?.querySelector(`[name="${firstInvalid}"]`)
        ?.focus();

      return;
    }

    submitLock.current = true;
    setSubmitting(true);

    try {
      const payload = new FormData();

      payload.append("companyName", form.companyName.trim());
      payload.append(
        "vendorEmail",
        form.vendorEmail.trim().toLowerCase()
      );
      payload.append("vendorMobile", form.vendorMobile.trim());
      payload.append("purposeOfVisitId", form.purposeOfVisitId);
      payload.append("gateSelectionMode", form.gateSelectionMode);

      payload.append(
        "permittedGateIds",
        JSON.stringify(
          vendorSelectsGates ? [] : form.permittedGateIds
        )
      );

      payload.append(
        "requiresTrafficApproval",
        String(form.requiresTrafficApproval)
      );

      payload.append("validFrom", form.validFrom);
      payload.append("validTo", form.validTo);

      payload.append(
        "hasWorkOrder",
        String(Boolean(form.workOrderFile))
      );

      if (isOther) {
        payload.append("purposeOther", form.purposeOther.trim());
      }

      if (form.referenceDocumentNo.trim()) {
        payload.append(
          "referenceDocumentNo",
          form.referenceDocumentNo.trim()
        );
      }

      if (form.remarks.trim()) {
        payload.append("remarks", form.remarks.trim());
      }

      if (form.workOrderFile) {
        payload.append(
          "vendorMaterialLinkWorkOrder",
          form.workOrderFile
        );
      }

      const response = await createMaterialLink(payload);

      setCreated(response?.data || null);
      resetForm();

      const message =
        response?.message || "Application link generated.";

      if (response?.data?.emailSent) {
        toast.success(message);
      } else {
        toast.warning(message);
      }

      onCreated();
    } catch (error) {
      toast.error(
        errorMessage(error, "Unable to generate the link.")
      );
    } finally {
      submitLock.current = false;
      setSubmitting(false);
    }
  }

  function textInput(name, options = {}) {
    const { hint, ...props } = options;

    return (
      <input
        {...props}
        id={`material-${name}`}
        name={name}
        className={inputCls}
        value={form[name]}
        aria-invalid={Boolean(errors[name])}
        aria-describedby={
          errors[name]
            ? `material-${name}-error`
            : hint
              ? `material-${name}-hint`
              : undefined
        }
        onChange={(event) => update(name, event.target.value)}
      />
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-orange-100 bg-gradient-to-r from-orange-50 via-white to-white px-5 py-5 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="rounded-xl bg-orange-100 p-2.5 text-orange-700">
            <Link2 size={21} aria-hidden="true" />
          </span>

          <div>
            <h2 className="text-base font-bold text-slate-900">
              Generate vendor application link
            </h2>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              Set vendor details, gate selection and the approval flow.
            </p>
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-6">
        {mastersError && (
          <div
            role="alert"
            className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
          >
            <span>{mastersError}</span>

            <button
              type="button"
              onClick={loadMasters}
              disabled={loadingMasters}
              className={secondaryButtonCls}
            >
              <RefreshCw size={15} aria-hidden="true" />
              Retry
            </button>
          </div>
        )}

        {created && (
          <div
            role="status"
            className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 gap-2.5">
                <Check
                  size={19}
                  className="mt-0.5 shrink-0 text-emerald-700"
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-emerald-900">
                    Application link generated
                  </p>
                  <p className="mt-1 break-words text-xs text-emerald-800">
                    {created.referenceNo}
                    {created.emailSent
                      ? " · Email sent to the vendor"
                      : " · Email not sent; use Resend in Generated links"}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={secondaryButtonCls}
                  disabled={!createdLink}
                  onClick={() => copyLink(createdLink)}
                >
                  <Copy size={15} aria-hidden="true" />
                  Copy link
                </button>

                {createdLink && (
                  <a
                    href={createdLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    referrerPolicy="no-referrer"
                    className={secondaryButtonCls}
                  >
                    <ExternalLink size={15} aria-hidden="true" />
                    Open
                  </a>
                )}

                <button
                  type="button"
                  aria-label="Dismiss generated link notice"
                  onClick={() => setCreated(null)}
                  className="rounded-lg p-2 text-emerald-700 hover:bg-emerald-100"
                >
                  <X size={17} />
                </button>
              </div>
            </div>
          </div>
        )}

        {loadingMasters && (
          <p
            role="status"
            className="mb-5 flex items-center gap-2 text-sm text-slate-500"
          >
            <Loader2 size={16} className="animate-spin" />
            Loading form options…
          </p>
        )}

        <form ref={formRef} onSubmit={submit} noValidate>
          <fieldset disabled={disabled} className="min-w-0 space-y-7">
            <section>
              <SectionTitle
                number="1"
                title="Vendor details"
                description="The application link will be emailed to this vendor."
              />

              <div className="grid gap-5 md:grid-cols-2">
                <Field
                  id="material-companyName"
                  label="Company name"
                  required
                  error={errors.companyName}
                >
                  {textInput("companyName", {
                    maxLength: 100,
                    autoComplete: "organization",
                    placeholder: "Enter company name",
                  })}
                </Field>

                <Field
                  id="material-vendorEmail"
                  label="Vendor email"
                  required
                  error={errors.vendorEmail}
                >
                  {textInput("vendorEmail", {
                    type: "email",
                    maxLength: 254,
                    autoComplete: "email",
                    placeholder: "vendor@company.com",
                  })}
                </Field>

                <Field
                  id="material-vendorMobile"
                  label="Vendor mobile"
                  required
                  error={errors.vendorMobile}
                >
                  {textInput("vendorMobile", {
                    type: "tel",
                    inputMode: "numeric",
                    maxLength: 10,
                    autoComplete: "tel-national",
                    placeholder: "10-digit mobile number",
                  })}
                </Field>

                <Field
                  id="material-purposeOfVisitId"
                  label="Purpose of material movement"
                  required
                  error={errors.purposeOfVisitId}
                >
                  <select
                    id="material-purposeOfVisitId"
                    name="purposeOfVisitId"
                    className={inputCls}
                    value={form.purposeOfVisitId}
                    aria-invalid={Boolean(errors.purposeOfVisitId)}
                    aria-describedby={
                      errors.purposeOfVisitId
                        ? "material-purposeOfVisitId-error"
                        : undefined
                    }
                    onChange={(event) =>
                      update("purposeOfVisitId", event.target.value)
                    }
                  >
                    <option value="">Select purpose</option>
                    {masters.purposes.map((purpose) => (
                      <option key={purpose.id} value={purpose.id}>
                        {purpose.name}
                      </option>
                    ))}
                  </select>
                </Field>

                {isOther && (
                  <div className="md:col-span-2">
                    <Field
                      id="material-purposeOther"
                      label="Specify purpose"
                      required
                      error={errors.purposeOther}
                    >
                      {textInput("purposeOther", {
                        maxLength: 250,
                        placeholder: "Describe the purpose",
                      })}
                    </Field>
                  </div>
                )}
              </div>
            </section>

            <section className="border-t border-slate-100 pt-6">
              <SectionTitle
                number="2"
                title="Gate selection"
                description="Choose whether the department or vendor selects the entry gates."
              />

              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  {
                    value: "DEPARTMENT",
                    title: "Department selects gates",
                    description:
                      "Select gates now. The vendor will see them as read-only.",
                  },
                  {
                    value: "VENDOR",
                    title: "Vendor selects gates",
                    description:
                      "The vendor must select gates before submitting the request.",
                  },
                ].map((option) => {
                  const selected =
                    form.gateSelectionMode === option.value;

                  return (
                    <label
                      key={option.value}
                      className={
                        "flex cursor-pointer items-start gap-3 rounded-xl " +
                        "border p-4 transition focus-within:ring-4 " +
                        "focus-within:ring-orange-500/15 " +
                        (selected
                          ? "border-orange-400 bg-orange-50"
                          : "border-slate-200 bg-white hover:border-orange-200")
                      }
                    >
                      <input
                        type="radio"
                        name="gateSelectionMode"
                        value={option.value}
                        checked={selected}
                        onChange={() => changeGateMode(option.value)}
                        className="mt-0.5 h-4 w-4 shrink-0 accent-orange-600"
                      />

                      <span>
                        <span className="block text-sm font-semibold text-slate-900">
                          {option.title}
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-slate-600">
                          {option.description}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>

              {!vendorSelectsGates ? (
                <fieldset
                  className="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4"
                  aria-describedby={
                    errors.permittedGateIds
                      ? "material-permittedGateIds-error"
                      : undefined
                  }
                >
                  <legend className="px-1 text-xs font-semibold text-slate-700">
                    Permitted gates
                    <span className="ml-1 text-rose-600">*</span>
                  </legend>

                  <div className="mb-3 flex items-center justify-between gap-3 text-xs">
                    <span className="text-slate-500">
                      Select at least one gate
                    </span>
                    <span className="font-semibold text-orange-700">
                      {form.permittedGateIds.length} selected
                    </span>
                  </div>

                  {masters.gates.length === 0 ? (
                    <p className="text-xs text-slate-500">
                      No active gates are available.
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                      {masters.gates.map((gate) => {
                        const selected =
                          form.permittedGateIds.includes(Number(gate.id));

                        return (
                          <label
                            key={gate.id}
                            className={
                              "flex cursor-pointer items-center gap-2 " +
                              "rounded-lg border px-3 py-2.5 text-xs " +
                              "font-medium transition focus-within:ring-2 " +
                              "focus-within:ring-orange-300 " +
                              (selected
                                ? "border-orange-300 bg-orange-50 text-orange-800"
                                : "border-slate-200 bg-white text-slate-700 hover:border-orange-200")
                            }
                          >
                            <input
                              type="checkbox"
                              name="permittedGateIds"
                              checked={selected}
                              onChange={() => toggleGate(gate.id)}
                              className="h-4 w-4 shrink-0 accent-orange-600"
                            />
                            {gate.name}
                          </label>
                        );
                      })}
                    </div>
                  )}
                </fieldset>
              ) : (
                <div className="mt-4 flex gap-2.5 rounded-xl border border-orange-100 bg-orange-50/60 p-4">
                  <ShieldCheck
                    size={18}
                    className="mt-0.5 shrink-0 text-orange-600"
                    aria-hidden="true"
                  />
                  <p className="text-xs leading-5 text-slate-600">
                    The vendor will choose from the active gates on the
                    application page. At least one gate will be required.
                  </p>
                </div>
              )}

              {errors.permittedGateIds && (
                <p
                  id="material-permittedGateIds-error"
                  role="alert"
                  className="mt-2 text-xs text-rose-600"
                >
                  {errors.permittedGateIds}
                </p>
              )}
            </section>

            <section className="border-t border-slate-100 pt-6">
              <SectionTitle
                number="3"
                title="Validity and reference"
                description="The vendor can submit within this validity period, up to six months."
              />

              <div className="grid gap-5 md:grid-cols-2">
                <Field
                  id="material-validFrom"
                  label="Valid from"
                  required
                  error={errors.validFrom}
                >
                  {textInput("validFrom", {
                    type: "date",
                    min: todayInIndia(),
                  })}
                </Field>

                <Field
                  id="material-validTo"
                  label="Valid till"
                  required
                  error={errors.validTo}
                  hint="Dates are based on Indian Standard Time."
                >
                  {textInput("validTo", {
                    type: "date",
                    min: form.validFrom || todayInIndia(),
                    max: maxValidTo || undefined,
                    hint: true,
                  })}
                </Field>

                <Field
                  id="material-referenceDocumentNo"
                  label="Work order / reference number"
                  error={errors.referenceDocumentNo}
                  hint="Optional."
                >
                  {textInput("referenceDocumentNo", {
                    maxLength: 60,
                    placeholder: "Enter reference number",
                    hint: true,
                  })}
                </Field>

                <Field
                  id="material-workOrderFile"
                  label="Work order / reference document"
                  error={errors.workOrderFile}
                  hint="PDF only. Maximum 2 MB."
                >
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3">
                    <div className="mb-2 flex items-center gap-2 text-xs text-slate-600">
                      <Upload size={15} aria-hidden="true" />
                      Attach a supporting document
                    </div>

                    <input
                      ref={fileRef}
                      id="material-workOrderFile"
                      name="workOrderFile"
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={selectFile}
                      aria-invalid={Boolean(errors.workOrderFile)}
                      aria-describedby={
                        errors.workOrderFile
                          ? "material-workOrderFile-error"
                          : "material-workOrderFile-hint"
                      }
                      className="block w-full text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-orange-100 file:px-3 file:py-2 file:font-semibold file:text-orange-800 hover:file:bg-orange-200"
                    />

                    {form.workOrderFile && (
                      <div className="mt-3 flex items-center gap-2">
                        <FileText
                          size={15}
                          className="shrink-0 text-orange-600"
                          aria-hidden="true"
                        />
                        <span className="min-w-0 flex-1 break-all text-xs text-slate-700">
                          {form.workOrderFile.name}
                        </span>
                        <button
                          type="button"
                          aria-label="Remove document"
                          onClick={() => {
                            update("workOrderFile", null);

                            if (fileRef.current) {
                              fileRef.current.value = "";
                            }
                          }}
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200"
                        >
                          <X size={15} />
                        </button>
                      </div>
                    )}
                  </div>
                </Field>

                <div className="md:col-span-2">
                  <Field
                    id="material-remarks"
                    label="Remarks"
                    error={errors.remarks}
                  >
                    <textarea
                      id="material-remarks"
                      name="remarks"
                      rows={3}
                      maxLength={500}
                      value={form.remarks}
                      onChange={(event) =>
                        update("remarks", event.target.value)
                      }
                      className={textareaCls}
                      placeholder="Additional instructions or remarks"
                      aria-invalid={Boolean(errors.remarks)}
                      aria-describedby={
                        errors.remarks
                          ? "material-remarks-error"
                          : undefined
                      }
                    />
                    <p className="mt-1 text-right text-xs text-slate-400">
                      {form.remarks.length}/500
                    </p>
                  </Field>
                </div>
              </div>
            </section>

            <section className="border-t border-slate-100 pt-6">
              <SectionTitle
                number="4"
                title="Approval flow"
                description="Choose whether Traffic approval is required for requests submitted through this link."
              />

              <div
                className={
                  "rounded-xl border p-4 transition " +
                  (form.requiresTrafficApproval
                    ? "border-orange-300 bg-orange-50"
                    : "border-slate-200 bg-slate-50")
                }
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p
                      id="material-traffic-label"
                      className="text-sm font-semibold text-slate-900"
                    >
                      Include Traffic in the flow
                    </p>
                    <p
                      id="material-traffic-hint"
                      className="mt-1 text-xs leading-5 text-slate-600"
                    >
                      {form.requiresTrafficApproval
                        ? "Traffic approval is included before CISF approval."
                        : "Requests proceed to CISF after the other required approvals."}
                    </p>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={form.requiresTrafficApproval}
                    aria-labelledby="material-traffic-label"
                    aria-describedby="material-traffic-hint"
                    onClick={() =>
                      update(
                        "requiresTrafficApproval",
                        !form.requiresTrafficApproval
                      )
                    }
                    className={
                      "relative inline-flex h-7 w-12 shrink-0 items-center " +
                      "rounded-full transition focus-visible:outline-none " +
                      "focus-visible:ring-4 focus-visible:ring-orange-500/25 " +
                      "disabled:cursor-not-allowed " +
                      (form.requiresTrafficApproval
                        ? "bg-orange-600"
                        : "bg-slate-300")
                    }
                  >
                    <span
                      aria-hidden="true"
                      className={
                        "h-5 w-5 rounded-full bg-white shadow-sm transition-transform " +
                        (form.requiresTrafficApproval
                          ? "translate-x-6"
                          : "translate-x-1")
                      }
                    />
                  </button>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-200/70 pt-3 text-[11px] font-medium">
                  <span className="rounded-md bg-white px-2 py-1 text-slate-700 ring-1 ring-slate-200">
                    Department
                  </span>
                  <span className="text-slate-400" aria-hidden="true">→</span>
                  <span className="rounded-md bg-white px-2 py-1 text-slate-500 ring-1 ring-slate-200">
                    Fire Safety, if hazardous
                  </span>
                  <span className="text-slate-400" aria-hidden="true">→</span>

                  {form.requiresTrafficApproval && (
                    <>
                      <span className="rounded-md bg-orange-100 px-2 py-1 text-orange-800 ring-1 ring-orange-200">
                        Traffic
                      </span>
                      <span className="text-slate-400" aria-hidden="true">→</span>
                    </>
                  )}

                  <span className="rounded-md bg-white px-2 py-1 text-slate-700 ring-1 ring-slate-200">
                    CISF
                  </span>
                </div>
              </div>
            </section>
          </fieldset>

          <div className="mt-7 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-5">
            <p className="max-w-md text-xs leading-5 text-slate-500">
              The vendor will receive an application link using the settings
              selected above.
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={resetForm}
                disabled={submitting}
                className={secondaryButtonCls}
              >
                Reset
              </button>

              <button
                type="submit"
                disabled={disabled}
                className={primaryButtonCls}
              >
                {submitting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Mail size={16} aria-hidden="true" />
                )}
                {submitting ? "Generating…" : "Generate link"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------
   Generated links list
------------------------------------------------------------------- */

function GeneratedLinks({ refreshKey }) {
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalRecords: 0,
    pageSize: PAGE_SIZE,
  });

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [scope, setScope] = useState("department");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [busyId, setBusyId] = useState(null);
  const [revokeTarget, setRevokeTarget] = useState(null);
  const [revokeReason, setRevokeReason] = useState("");

  const actionLock = useRef(false);
  const requestId = useRef(0);
  const dialogRef = useRef(null);
  const reasonRef = useRef(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 400);

    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    const currentRequest = ++requestId.current;

    async function load() {
      setLoading(true);
      setLoadError("");

      try {
        const response = await listMaterialLinks({
          page,
          limit: PAGE_SIZE,
          search: search || undefined,
          status: status === "ALL" ? undefined : status,
          scope: scope === "mine" ? "mine" : undefined,
        });

        if (currentRequest !== requestId.current) {
          return;
        }

        const meta = response?.pagination || {
          currentPage: page,
          totalPages: 1,
          totalRecords: 0,
          pageSize: PAGE_SIZE,
        };

        const lastPage = Math.max(
          1,
          Number(meta.totalPages) || 1
        );

        if (page > lastPage) {
          setPage(lastPage);
          return;
        }

        setRows(
          Array.isArray(response?.data)
            ? response.data
            : []
        );
        setPagination(meta);
      } catch (error) {
        if (currentRequest === requestId.current) {
          setRows([]);
          setLoadError(
            errorMessage(error, "Unable to load application links.")
          );
        }
      } finally {
        if (currentRequest === requestId.current) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      requestId.current += 1;
    };
  }, [page, search, status, scope, refreshKey, reloadKey]);

  useEffect(() => {
    if (!revokeTarget) {
      return;
    }

    const dialog = dialogRef.current;

    if (dialog && !dialog.open) {
      dialog.showModal();
      reasonRef.current?.focus();
    }

    return () => {
      if (dialog?.open) {
        dialog.close();
      }
    };
  }, [revokeTarget]);

  function refresh() {
    setReloadKey((current) => current + 1);
  }

  async function resend(row) {
    if (actionLock.current) {
      return;
    }

    actionLock.current = true;
    setBusyId(row.id);

    try {
      const response = await resendMaterialLink(row.id);

      toast.success(response?.message || "Link email sent.");
      refresh();
    } catch (error) {
      toast.error(
        errorMessage(error, "Unable to resend the link.")
      );
    } finally {
      actionLock.current = false;
      setBusyId(null);
    }
  }

  function closeRevoke() {
    if (actionLock.current) {
      return;
    }

    setRevokeTarget(null);
    setRevokeReason("");
  }

  async function revoke(event) {
    event.preventDefault();

    if (!revokeTarget || actionLock.current) {
      return;
    }

    const reason = revokeReason.trim();

    if (reason.length < 5 || reason.length > 500) {
      toast.error("Enter a reason of 5–500 characters.");
      reasonRef.current?.focus();
      return;
    }

    actionLock.current = true;
    setBusyId(revokeTarget.id);

    try {
      const response = await revokeMaterialLink(
        revokeTarget.id,
        reason
      );

      toast.success(response?.message || "Link revoked.");

      setRevokeTarget(null);
      setRevokeReason("");
      refresh();
    } catch (error) {
      toast.error(
        errorMessage(error, "Unable to revoke the link.")
      );
    } finally {
      actionLock.current = false;
      setBusyId(null);
    }
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
              <ClipboardList
                size={19}
                className="text-orange-600"
                aria-hidden="true"
              />
              Generated links
            </h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              View link settings, resend emails or revoke access.
            </p>
          </div>

          <button
            type="button"
            className={secondaryButtonCls}
            onClick={refresh}
            disabled={loading || busyId !== null}
          >
            <RefreshCw
              size={15}
              className={loading ? "animate-spin" : ""}
              aria-hidden="true"
            />
            Refresh
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_180px_190px]">
          <div className="relative">
            <label htmlFor="material-link-search" className="sr-only">
              Search generated links
            </label>

            <Search
              size={16}
              className="pointer-events-none absolute left-3.5 top-3 text-slate-400"
              aria-hidden="true"
            />

            <input
              id="material-link-search"
              type="search"
              value={searchInput}
              maxLength={100}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search reference, company, email or mobile"
              className={`${inputCls} pl-10`}
            />
          </div>

          <div>
            <label htmlFor="material-link-status" className="sr-only">
              Link status
            </label>
            <select
              id="material-link-status"
              value={status}
              className={inputCls}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
            >
              <option value="ALL">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="EXPIRED">Expired</option>
              <option value="REVOKED">Revoked</option>
              <option value="DISABLED">Disabled</option>
            </select>
          </div>

          <div>
            <label htmlFor="material-link-scope" className="sr-only">
              Created by
            </label>
            <select
              id="material-link-scope"
              value={scope}
              className={inputCls}
              onChange={(event) => {
                setScope(event.target.value);
                setPage(1);
              }}
            >
              <option value="department">Department links</option>
              <option value="mine">Created by me</option>
            </select>
          </div>
        </div>
      </div>

      {loadError && (
        <div
          role="alert"
          className="mx-5 mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 sm:mx-6"
        >
          {loadError}
        </div>
      )}

      <div
        className="max-w-full overflow-x-auto"
        aria-busy={loading}
      >
        <table className="w-full min-w-[1100px] text-left">
          <caption className="sr-only">
            Vendor material application links generated by the department
          </caption>

          <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              {[
                "Reference",
                "Vendor",
                "Purpose / gates",
                "Validity",
                "Traffic",
                "Status",
                "Created",
                "Actions",
              ].map((heading) => (
                <th
                  key={heading}
                  scope="col"
                  className="whitespace-nowrap px-4 py-3.5"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center">
                  <span
                    role="status"
                    className="inline-flex items-center gap-2 text-slate-500"
                  >
                    <Loader2 size={17} className="animate-spin" />
                    Loading application links…
                  </span>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center">
                  <Link2
                    size={25}
                    className="mx-auto mb-3 text-slate-300"
                    aria-hidden="true"
                  />
                  <p className="font-semibold text-slate-700">
                    {loadError
                      ? "Application links could not be loaded."
                      : "No application links found."}
                  </p>
                  <p className="mt-1 text-slate-500">
                    {loadError
                      ? "Use Refresh to try again."
                      : "Generate a link or adjust the filters."}
                  </p>
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const link = safeVendorLink(row.vendorLink);
                const busy = busyId !== null;

                const vendorSelects =
                  row.gateSelectionMode === "VENDOR";

                const gates = Array.isArray(row.permittedGates)
                  ? row.permittedGates
                  : [];

                return (
                  <tr
                    key={row.id}
                    className="align-top transition hover:bg-orange-50/30"
                  >
                    <td className="px-4 py-4">
                      <p className="whitespace-nowrap font-semibold text-slate-900">
                        {row.referenceNo}
                      </p>
                      <p className="mt-1 max-w-40 text-[11px] text-slate-500">
                        {row.departmentName || "—"}
                      </p>
                    </td>

                    <td className="px-4 py-4">
                      <p className="max-w-48 break-words font-semibold text-slate-800">
                        {row.companyName}
                      </p>
                      <p className="mt-1 max-w-48 break-all text-slate-500">
                        {row.vendorEmail}
                      </p>
                      <p className="mt-1 text-slate-500">
                        {row.vendorMobile}
                      </p>
                    </td>

                    <td className="px-4 py-4">
                      <p className="max-w-48 text-slate-800">
                        {row.purpose || "—"}
                      </p>

                      <p className="mt-2 text-[11px] font-medium text-orange-700">
                        {vendorSelects
                          ? "Vendor selects gates"
                          : "Department selects gates"}
                      </p>

                      {!vendorSelects && (
                        <p className="mt-1 max-w-48 leading-5 text-slate-500">
                          {gates.length
                            ? gates.map((gate) => gate.name).join(", ")
                            : "No gates configured"}
                        </p>
                      )}
                    </td>

                    <td className="whitespace-nowrap px-4 py-4">
                      <p>{fmtDate(row.validFrom)}</p>
                      <p className="mt-1 text-slate-400">to</p>
                      <p className="mt-1">{fmtDate(row.validTo)}</p>
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={
                          "inline-flex whitespace-nowrap rounded-full " +
                          "px-2 py-1 text-[11px] font-medium " +
                          (row.requiresTrafficApproval
                            ? "bg-orange-100 text-orange-800"
                            : "bg-slate-100 text-slate-500")
                        }
                      >
                        {row.requiresTrafficApproval
                          ? "Included"
                          : "Not included"}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      <StatusBadge status={row.status} />
                    </td>

                    <td className="px-4 py-4">
                      <p className="max-w-40">
                        {row.createdByUserName || "—"}
                      </p>
                      <p className="mt-1 whitespace-nowrap text-[11px] text-slate-500">
                        {fmtDateTime(row.createdAt)}
                      </p>
                      <p className="mt-2 text-[11px] text-slate-400">
                        Last email: {fmtDateTime(row.lastEmailSentAt)}
                      </p>
                    </td>

                    <td className="px-4 py-4">
                      {row.status === "ACTIVE" ? (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className={secondaryButtonCls}
                            disabled={!link || busy}
                            onClick={() => copyLink(link)}
                            aria-label={`Copy link ${row.referenceNo}`}
                          >
                            <Copy size={14} aria-hidden="true" />
                            Copy
                          </button>

                          <button
                            type="button"
                            className={secondaryButtonCls}
                            disabled={busy}
                            onClick={() => resend(row)}
                          >
                            {busyId === row.id ? (
                              <Loader2
                                size={14}
                                className="animate-spin"
                              />
                            ) : (
                              <Mail size={14} aria-hidden="true" />
                            )}
                            Resend
                          </button>

                          <button
                            type="button"
                            className={`${secondaryButtonCls} text-rose-700 hover:bg-rose-50`}
                            disabled={busy}
                            onClick={() => {
                              setRevokeReason("");
                              setRevokeTarget(row);
                            }}
                          >
                            <XCircle size={14} aria-hidden="true" />
                            Revoke
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400">
                          No actions available
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="border-t border-slate-100 bg-slate-50 px-6 py-4">
        <PaginationBar
          currentPage={pagination.currentPage || page}
          totalPages={pagination.totalPages || 1}
          totalRecords={pagination.totalRecords || 0}
          pageSize={pagination.pageSize || PAGE_SIZE}
          onPageChange={setPage}
          loading={loading}
        />
      </div>

      {revokeTarget && (
        <dialog
          ref={dialogRef}
          aria-labelledby="material-revoke-title"
          aria-describedby="material-revoke-description"
          onCancel={(event) => {
            event.preventDefault();
            closeRevoke();
          }}
          className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border-0 bg-white p-0 text-slate-800 shadow-2xl backdrop:bg-slate-950/55"
        >
          <div className="p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3
                  id="material-revoke-title"
                  className="text-base font-bold text-slate-900"
                >
                  Revoke application link
                </h3>
                <p className="mt-1 text-xs font-medium text-orange-700">
                  {revokeTarget.referenceNo}
                </p>
              </div>

              <button
                type="button"
                aria-label="Close revocation dialog"
                disabled={busyId !== null}
                onClick={closeRevoke}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            <p
              id="material-revoke-description"
              className="mt-4 text-xs leading-5 text-slate-600"
            >
              The vendor will no longer be able to access this link.
              Requests already submitted remain recorded.
            </p>

            <form onSubmit={revoke} className="mt-5">
              <Field
                id="material-revoke-reason"
                label="Reason for revocation"
                required
              >
                <textarea
                  ref={reasonRef}
                  id="material-revoke-reason"
                  value={revokeReason}
                  maxLength={500}
                  rows={4}
                  disabled={busyId !== null}
                  onChange={(event) =>
                    setRevokeReason(event.target.value)
                  }
                  className={textareaCls}
                  placeholder="Enter a reason of at least 5 characters"
                />
              </Field>

              <p className="mt-1 text-right text-xs text-slate-400">
                {revokeReason.length}/500
              </p>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  className={secondaryButtonCls}
                  disabled={busyId !== null}
                  onClick={closeRevoke}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={busyId !== null}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-500/25 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busyId !== null && (
                    <Loader2 size={15} className="animate-spin" />
                  )}
                  Revoke link
                </button>
              </div>
            </form>
          </div>
        </dialog>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------
   Department material links page
------------------------------------------------------------------- */

export default function MaterialMovementLinkPage() {
  const [activeTab, setActiveTab] = useState("create");
  const [refreshKey, setRefreshKey] = useState(0);

  // Preserve the existing route-specific scroll behavior.
  // useEffect(() => {
  //   const root = document.documentElement;
  //   const main = document.querySelector("main");

  //   if (!main) {
  //     return;
  //   }

  //   const previousRootOverflowX = root.style.overflowX;
  //   const previousRootOverflowY = root.style.overflowY;
  //   const previousMainOverscrollY = main.style.overscrollBehaviorY;

  //   root.style.overflowX = "clip";
  //   root.style.overflowY = "hidden";
  //   main.style.overscrollBehaviorY = "contain";

  //   return () => {
  //     root.style.overflowX = previousRootOverflowX;
  //     root.style.overflowY = previousRootOverflowY;
  //     main.style.overscrollBehaviorY = previousMainOverscrollY;
  //   };
  // }, []);

  return (
    <div className="w-full min-w-0 space-y-5 font-sans text-slate-800">
      <header className="relative overflow-hidden rounded-2xl bg-slate-900 p-5 text-white shadow-sm sm:p-7">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-12 -top-16 h-52 w-52 rounded-full bg-orange-500/10 blur-3xl"
        />

        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="shrink-0 rounded-xl bg-white/10 p-3 ring-1 ring-white/10">
              <ShieldCheck
                size={24}
                className="text-orange-300"
                aria-hidden="true"
              />
            </span>

            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-orange-300">
                APACS · Material Movement
              </p>
              <h1 className="mt-1 text-xl font-bold sm:text-2xl">
                Vendor application links
              </h1>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-medium text-slate-200 ring-1 ring-white/10">
            <Building2 size={13} aria-hidden="true" />
            Department workspace
          </span>
        </div>

        <p className="relative mt-4 max-w-2xl text-sm leading-6 text-slate-300">
          Generate material application links, choose who selects the gates
          and configure Traffic approval for your vendor requests.
        </p>
      </header>

      <div
        className="inline-flex max-w-full flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm"
        aria-label="Material link views"
      >
        {[
          {
            value: "create",
            label: "Generate link",
            Icon: Plus,
          },
          {
            value: "list",
            label: "Generated links",
            Icon: ClipboardList,
          },
        ].map(({ value, label, Icon }) => (
          <button
            key={value}
            type="button"
            aria-pressed={activeTab === value}
            aria-controls={`material-${value}-panel`}
            onClick={() => setActiveTab(value)}
            className={
              "inline-flex items-center gap-2 rounded-lg px-4 py-2.5 " +
              "text-sm font-semibold transition focus-visible:outline-none " +
              "focus-visible:ring-4 focus-visible:ring-orange-500/15 " +
              (activeTab === value
                ? "bg-orange-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-orange-50 hover:text-orange-700")
            }
          >
            <Icon size={16} aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      {/*
       * Keep the create form mounted so switching to the
       * list does not discard an unfinished form.
       */}
      <div
        id="material-create-panel"
        hidden={activeTab !== "create"}
      >
        <CreateLinkForm
          onCreated={() =>
            setRefreshKey((current) => current + 1)
          }
        />
      </div>

      {activeTab === "list" && (
        <div id="material-list-panel">
          <GeneratedLinks refreshKey={refreshKey} />
        </div>
      )}
    </div>
  );
}