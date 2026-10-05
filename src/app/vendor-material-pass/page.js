"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "sonner";

import {
  AlertCircle,
  Boxes,
  Check,
  ClipboardCheck,
  FileText,
  Loader2,
  LockKeyhole,
  PackagePlus,
  Pencil,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Truck,
  X,
} from "lucide-react";

import {
  materialItemSchema,
  applicationSchemaForMode,
  formIssues,
} from "./materialValidation";

/* ------------------------------------------------------------------
   Configuration
------------------------------------------------------------------- */

const SESSION_KEY = "apacs_vendor_material_token";
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

/*
 * Set to true later to restore vehicle/person inputs.
 * Hidden movement fields are submitted as empty strings.
 */
const SHOW_MOVEMENT_DETAILS = false;

const API_BASE = (
  process.env.NEXT_PUBLIC_AGENT_API || ""
).replace(/\/+$/, "");

const LINK_URL =
  `${API_BASE}/vendor-material-pass/public/vendor-links`;

const UNITS_URL = `${API_BASE}/material-pass/units`;

const inputCls =
  "w-full min-w-0 rounded-xl border border-slate-300 bg-white " +
  "px-3.5 py-2.5 text-sm text-slate-900 outline-none transition " +
  "placeholder:text-slate-400 focus:border-orange-500 " +
  "focus:ring-4 focus:ring-orange-500/10 " +
  "disabled:cursor-not-allowed disabled:bg-slate-100";

const buttonCls =
  "inline-flex items-center justify-center gap-2 rounded-xl " +
  "px-4 py-2.5 text-sm font-semibold transition " +
  "focus-visible:outline-none focus-visible:ring-4 " +
  "focus-visible:ring-orange-500/20 " +
  "disabled:cursor-not-allowed disabled:opacity-50";

const secondaryButtonCls =
  `${buttonCls} border border-slate-300 bg-white ` +
  "text-slate-700 hover:bg-slate-50";

const primaryButtonCls =
  `${buttonCls} bg-orange-600 text-white ` +
  "shadow-sm hover:bg-orange-700";

/* ------------------------------------------------------------------
   Shared helpers
------------------------------------------------------------------- */

function initialForm() {
  return {
    vehicleNumber: "",
    personName: "",
    aadhaarNumber: "",
    permittedGateIds: [],
    vendorRemarks: "",
    agreed: false,
    items: [],
  };
}

function blankItem(materialType) {
  return {
    clientId: crypto.randomUUID(),
    materialType,
    name: "",
    isHazardous: false,
    requestedQty: "",
    unitId: null,
    description: "",
  };
}

function readToken() {
  try {
    const token = sessionStorage.getItem(SESSION_KEY);

    return TOKEN_PATTERN.test(token || "")
      ? token
      : null;
  } catch {
    return null;
  }
}

function errorMessage(error, fallback) {
  return (
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
}

function indiaDate(value) {
  if (!value) {
    return "";
  }

  if (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return value;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts.map(({ type, value }) => [type, value])
  );

  return `${values.year}-${values.month}-${values.day}`;
}

function displayDate(value) {
  const date = indiaDate(value);

  if (!date) {
    return "—";
  }

  const parsed = new Date(`${date}T00:00:00+05:30`);

  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(parsed);
}

function normalizeOptions(list) {
  if (!Array.isArray(list)) {
    return [];
  }

  const seen = new Set();

  return list.flatMap((option) => {
    const id = Number(option?.id);
    const name = option?.name;

    if (
      !Number.isSafeInteger(id) ||
      id <= 0 ||
      typeof name !== "string" ||
      !name.trim() ||
      seen.has(id)
    ) {
      return [];
    }

    seen.add(id);

    return [{
      id,
      name: name.trim(),
    }];
  });
}

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

function Info({ label, value }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-1.5 break-words text-sm font-semibold text-slate-900">
        {value || "—"}
      </dd>
    </div>
  );
}

/* ------------------------------------------------------------------
   Material table and inline editor
------------------------------------------------------------------- */

function MaterialTable({
  type,
  items,
  units,
  unitsLoading,
  onSave,
  onDelete,
  onDraftChange,
}) {
  const [draft, setDraft] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [errors, setErrors] = useState({});

  const returnable = type === "RETURNABLE";

  const title = returnable
    ? "Returnable materials"
    : "Non-returnable materials";

  const unitNames = useMemo(
    () =>
      new Map(
        units.map((unit) => [
          unit.id,
          unit.name,
        ])
      ),
    [units]
  );

  const editorId = `material-editor-${type}`;

  const rowInputCls =
    "w-full min-w-0 rounded-lg border border-slate-300 " +
    "bg-white px-3 py-2 text-xs text-slate-900 " +
    "outline-none transition placeholder:text-slate-400 " +
    "focus:border-orange-500 focus:ring-4 " +
    "focus:ring-orange-500/10 disabled:bg-slate-100 " +
    "disabled:cursor-not-allowed";

  function startAdd() {
    if (draft) {
      return;
    }

    if (items.length >= 30) {
      toast.error(
        "Add no more than 30 materials in this category."
      );
      return;
    }

    setEditingId(null);
    setDraft(blankItem(type));
    setErrors({});
    onDraftChange(type, true);
  }

  function startEdit(item) {
    if (draft) {
      return;
    }

    setEditingId(item.clientId);
    setDraft({ ...item });
    setErrors({});
    onDraftChange(type, true);
  }

  function closeEditor() {
    setDraft(null);
    setEditingId(null);
    setErrors({});
    onDraftChange(type, false);
  }

  function update(name, value) {
    setDraft((current) => ({
      ...current,
      [name]: value,
    }));

    setErrors((current) => ({
      ...current,
      [name]: undefined,
    }));
  }

  function save() {
    if (!draft) {
      return;
    }

    const result =
      materialItemSchema.safeParse(draft);

    if (!result.success) {
      setErrors(formIssues(result.error));
      return;
    }

    const item = result.data;

    const duplicate = items.some(
      (existing) =>
        existing.clientId !== editingId &&
        existing.name.trim().toLowerCase() ===
          item.name.toLowerCase()
    );

    if (duplicate) {
      setErrors({
        name:
          "This material is already listed in this category.",
      });
      return;
    }

    if (
      item.unitId !== null &&
      !unitNames.has(item.unitId)
    ) {
      setErrors({
        unitId: "Select a valid unit.",
      });
      return;
    }

    onSave(item);
    closeEditor();
  }

  function renderError(name) {
    if (!errors[name]) {
      return null;
    }

    return (
      <p
        id={`${editorId}-${name}-error`}
        role="alert"
        className="mt-1.5 text-[11px] leading-4 text-rose-600"
      >
        {errors[name]}
      </p>
    );
  }

  function renderEditorRow(number) {
    return (
      <tr className="bg-orange-50/40 align-top">
        <td className="px-4 py-4 text-xs text-orange-700">
          {number}
        </td>

        <td className="px-4 py-4">
          <input
            id={`${editorId}-name`}
            aria-label="Material name"
            autoFocus
            value={draft.name}
            maxLength={255}
            placeholder="Enter item name"
            className={rowInputCls}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={
              errors.name
                ? `${editorId}-name-error`
                : undefined
            }
            onChange={(event) =>
              update("name", event.target.value)
            }
          />

          {renderError("name")}

          <label className="mt-3 inline-flex cursor-pointer items-center gap-2 text-[11px] font-medium text-slate-600">
            <input
              type="checkbox"
              checked={draft.isHazardous}
              onChange={(event) =>
                update(
                  "isHazardous",
                  event.target.checked
                )
              }
              className="h-3.5 w-3.5 shrink-0 accent-orange-600"
            />
            Hazardous material
          </label>
        </td>

        <td className="px-4 py-4">
          <input
            id={`${editorId}-requestedQty`}
            aria-label="Material quantity"
            type="text"
            inputMode="decimal"
            value={draft.requestedQty}
            maxLength={19}
            placeholder={
              returnable ? "e.g. 10" : "Optional"
            }
            className={rowInputCls}
            aria-invalid={Boolean(
              errors.requestedQty
            )}
            aria-describedby={
              errors.requestedQty
                ? `${editorId}-requestedQty-error`
                : undefined
            }
            onChange={(event) =>
              update(
                "requestedQty",
                event.target.value
              )
            }
          />

          {renderError("requestedQty")}
        </td>

        <td className="px-4 py-4">
          <select
            id={`${editorId}-unitId`}
            aria-label="Material unit"
            value={draft.unitId ?? ""}
            disabled={
              unitsLoading ||
              units.length === 0
            }
            className={rowInputCls}
            aria-invalid={Boolean(errors.unitId)}
            aria-describedby={
              errors.unitId
                ? `${editorId}-unitId-error`
                : undefined
            }
            onChange={(event) =>
              update(
                "unitId",
                event.target.value
                  ? Number(event.target.value)
                  : null
              )
            }
          >
            <option value="">
              {unitsLoading
                ? "Loading…"
                : "Select unit"}
            </option>

            {units.map((unit) => (
              <option
                key={unit.id}
                value={unit.id}
              >
                {unit.name}
              </option>
            ))}
          </select>

          {renderError("unitId")}
        </td>

        <td className="px-4 py-4">
          <textarea
            id={`${editorId}-description`}
            aria-label="Material description"
            rows={2}
            maxLength={1000}
            value={draft.description}
            placeholder="Additional details"
            className={`${rowInputCls} min-h-[72px] resize-y`}
            aria-invalid={Boolean(
              errors.description
            )}
            aria-describedby={
              errors.description
                ? `${editorId}-description-error`
                : undefined
            }
            onChange={(event) =>
              update(
                "description",
                event.target.value
              )
            }
          />

          {renderError("description")}
        </td>

        <td className="px-4 py-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={save}
              aria-label={
                editingId
                  ? "Save material changes"
                  : "Save material"
              }
              title={
                editingId
                  ? "Save changes"
                  : "Save material"
              }
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-600 text-white shadow-sm transition hover:bg-orange-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-500/20"
            >
              <Check size={17} />
            </button>

            <button
              type="button"
              onClick={closeEditor}
              aria-label="Cancel material editing"
              title="Cancel"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-500 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-500/15"
            >
              <X size={17} />
            </button>
          </div>

          <p className="mt-2 text-[10px] text-slate-400">
            Save / Cancel
          </p>
        </td>
      </tr>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-gradient-to-r from-orange-50/70 to-white p-5">
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-orange-100 p-2.5 text-orange-700">
            {returnable ? (
              <RefreshCw
                size={19}
                aria-hidden="true"
              />
            ) : (
              <Boxes
                size={19}
                aria-hidden="true"
              />
            )}
          </span>

          <div>
            <h2 className="text-sm font-bold text-[#0a1e4d]">
              {title}

              <span className="ml-2 rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-slate-500 ring-1 ring-slate-200">
                {items.length}/30
              </span>
            </h2>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              {returnable
                ? "Materials that will be taken out later. Quantity and unit are required."
                : "Materials that will remain or be consumed. Quantity and unit may both be left empty."}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-full overflow-x-auto">
        <table className="w-full min-w-[920px] table-fixed text-left">
          <caption className="sr-only">
            {title}
          </caption>

          <colgroup>
            <col className="w-[6%]" />
            <col className="w-[25%]" />
            <col className="w-[13%]" />
            <col className="w-[14%]" />
            <col className="w-[28%]" />
            <col className="w-[14%]" />
          </colgroup>

          <thead className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-medium text-slate-500">
            <tr>
              {[
                "S.No.",
                "Item name",
                "Qty",
                "Unit",
                "Description",
                "Actions",
              ].map((heading) => (
                <th
                  key={heading}
                  scope="col"
                  className="px-4 py-3"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
            {items.length === 0 && !draft && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-slate-400"
                >
                  No materials added. Use “Add material”
                  below to begin.
                </td>
              </tr>
            )}

            {items.map((item, index) => {
              if (
                draft &&
                editingId === item.clientId
              ) {
                return (
                  <Fragment key={item.clientId}>
                    {renderEditorRow(index + 1)}
                  </Fragment>
                );
              }

              return (
                <tr
                  key={item.clientId}
                  className="align-top transition hover:bg-orange-50/25"
                >
                  <td className="px-4 py-4 text-slate-400">
                    {index + 1}
                  </td>

                  <td className="px-4 py-4">
                    <p className="break-words font-semibold text-slate-900">
                      {item.name}
                    </p>

                    {item.isHazardous && (
                      <span className="mt-1.5 inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800 ring-1 ring-amber-200">
                        Hazardous
                      </span>
                    )}
                  </td>

                  <td className="break-words px-4 py-4">
                    {item.requestedQty || "Unspecified"}
                  </td>

                  <td className="break-words px-4 py-4">
                    {unitNames.get(item.unitId) || "—"}
                  </td>

                  <td className="px-4 py-4">
                    <p className="whitespace-pre-wrap break-words leading-5 text-slate-500">
                      {item.description || "—"}
                    </p>
                  </td>

                  <td className="px-4 py-4">
                    <div className="flex gap-1">
                      <button
                        type="button"
                        disabled={Boolean(draft)}
                        onClick={() => startEdit(item)}
                        aria-label={`Edit ${item.name}`}
                        title="Edit material"
                        className="rounded-lg p-2 text-slate-500 transition hover:bg-orange-50 hover:text-orange-700 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Pencil size={15} />
                      </button>

                      <button
                        type="button"
                        disabled={Boolean(draft)}
                        onClick={() =>
                          onDelete(item.clientId)
                        }
                        aria-label={`Delete ${item.name}`}
                        title="Delete material"
                        className="rounded-lg p-2 text-slate-500 transition hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {draft &&
              !editingId &&
              renderEditorRow(items.length + 1)}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/50 px-5 py-4">
        <p className="text-xs text-slate-500">
          {draft
            ? "Save or cancel this row before adding another material."
            : items.length >= 30
              ? "Maximum of 30 materials reached."
              : "Add materials one row at a time."}
        </p>

        <button
          type="button"
          disabled={
            Boolean(draft) ||
            items.length >= 30
          }
          onClick={startAdd}
          className={secondaryButtonCls}
        >
          <PackagePlus
            size={16}
            aria-hidden="true"
          />
          Add material
        </button>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------
   Public vendor application page
------------------------------------------------------------------- */

export default function VendorMaterialApplyPage() {
  const router = useRouter();

  const [link, setLink] = useState(null);
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");

  const [units, setUnits] = useState([]);
  const [unitsLoading, setUnitsLoading] = useState(true);
  const [unitsError, setUnitsError] = useState("");

  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [drafts, setDrafts] = useState({
    RETURNABLE: false,
    NON_RETURNABLE: false,
  });

  const [submitting, setSubmitting] = useState(false);
  const [submittedRequest, setSubmittedRequest] = useState(null);

  const submitLock = useRef(false);
  const formRef = useRef(null);
  const linkController = useRef(null);
  const unitsController = useRef(null);

  const loadLink = useCallback(async () => {
    linkController.current?.abort();

    const controller = new AbortController();
    linkController.current = controller;

    const token = readToken();

    if (!token) {
      window.location.replace("/");
      return;
    }

    if (!API_BASE) {
      setStatus("error");
      setMessage("The application service is not configured.");
      return;
    }

    setStatus("loading");
    setMessage("");

    try {
      const response = await axios.get(
        `${LINK_URL}/${encodeURIComponent(token)}`,
        {
          signal: controller.signal,
          withCredentials: false,
          timeout: 20000,
        }
      );

      if (controller.signal.aborted) {
        return;
      }

      if (
        !response.data?.success ||
        !response.data?.data
      ) {
        throw new Error("The server returned an invalid response.");
      }

      const details = response.data.data;

      if (
        !["DEPARTMENT", "VENDOR"].includes(
          details.gateSelectionMode
        ) ||
        typeof details.requiresTrafficApproval !== "boolean" ||
        typeof details.canSubmit !== "boolean"
      ) {
        throw new Error(
          "The application settings could not be loaded."
        );
      }

      const from = indiaDate(details.validFrom);
      const to = indiaDate(details.validTo);

      if (!from || !to) {
        throw new Error(
          "The application link has invalid validity dates."
        );
      }

      const normalized = {
        ...details,
        permittedGates: normalizeOptions(
          details.permittedGates
        ),
        availableGates: normalizeOptions(
          details.availableGates
        ),
      };

      setLink(normalized);

      /*
       * Remove selections that are no longer available.
       * Department-controlled gates never use editable form state.
       */
      setForm((current) => ({
        ...current,
        permittedGateIds:
          normalized.gateSelectionMode === "VENDOR"
            ? current.permittedGateIds.filter(
                (id) =>
                  normalized.availableGates.some(
                    (gate) => gate.id === id
                  )
              )
            : [],
      }));

      const today = indiaDate(new Date());

      if (from > today) {
        setStatus("unavailable");
        setMessage(
          `This link opens for applications on ${
            displayDate(details.validFrom)
          }.`
        );
      } else if (to < today) {
        setStatus("unavailable");
        setMessage("This application link has expired.");
      } else {
        setStatus("ready");
      }
    } catch (error) {
      if (
        controller.signal.aborted ||
        axios.isCancel(error)
      ) {
        return;
      }

      const code = error.response?.status;

      if (code === 404 || code === 410) {
        setLink(null);
        setStatus("unavailable");
        setMessage(
          "This application link is invalid, expired or no longer active."
        );
      } else {
        setStatus("error");
        setMessage(
          errorMessage(
            error,
            "Could not load the application. Please try again."
          )
        );
      }
    }
  }, []);

  const loadUnits = useCallback(async () => {
    unitsController.current?.abort();

    const controller = new AbortController();
    unitsController.current = controller;

    setUnitsLoading(true);
    setUnitsError("");

    try {
      if (!API_BASE) {
        throw new Error(
          "The application service is not configured."
        );
      }

      const response = await axios.get(UNITS_URL, {
        signal: controller.signal,
        withCredentials: false,
        timeout: 20000,
      });

      if (controller.signal.aborted) {
        return;
      }

      const data = response.data;

      const list = Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data)
          ? data
          : null;

      if (!list) {
        throw new Error(
          "The units response has an unexpected format."
        );
      }

      const availableUnits = normalizeOptions(
        list.map((unit) => ({
          id: unit?.id,
          name: unit?.name ?? unit?.unitName,
        }))
      );

      if (availableUnits.length === 0) {
        throw new Error("No units are available.");
      }

      setUnits(availableUnits);
    } catch (error) {
      if (
        controller.signal.aborted ||
        axios.isCancel(error)
      ) {
        return;
      }

      setUnits([]);

      setUnitsError(
        [401, 403].includes(error.response?.status)
          ? "Units are currently unavailable on this application page."
          : errorMessage(error, "Could not load units.")
      );
    } finally {
      if (!controller.signal.aborted) {
        setUnitsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!readToken()) {
      window.location.replace("/");
      return;
    }

    loadLink();
    loadUnits();

    return () => {
      linkController.current?.abort();
      unitsController.current?.abort();
    };
  }, [loadLink, loadUnits]);

  const applicationSchema = useMemo(
    () => applicationSchemaForMode(
      link?.gateSelectionMode
    ),
    [link?.gateSelectionMode]
  );

  const returnableItems = useMemo(
    () => form.items.filter(
      (item) => item.materialType === "RETURNABLE"
    ),
    [form.items]
  );

  const nonReturnableItems = useMemo(
    () => form.items.filter(
      (item) => item.materialType === "NON_RETURNABLE"
    ),
    [form.items]
  );

  const vendorSelectsGates =
    link?.gateSelectionMode === "VENDOR";

  const hasHazardousItems = form.items.some(
    (item) => item.isHazardous
  );

  const hasUnsavedDraft = Object.values(drafts).some(Boolean);

  const hasSubmittedRequests =
    Number(link?.totalVendorSubmissions) > 0 ||
    Boolean(submittedRequest);

  const canApply =
    status === "ready" &&
    link?.canSubmit === true &&
    !submittedRequest;

  const onDraftChange = useCallback((type, open) => {
    setDrafts((current) => ({
      ...current,
      [type]: open,
    }));
  }, []);

  function updateField(name, value) {
    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setErrors((current) => ({
      ...current,
      [name]: undefined,
    }));
  }

  function toggleGate(id) {
    if (!vendorSelectsGates) {
      return;
    }

    setForm((current) => ({
      ...current,
      permittedGateIds:
        current.permittedGateIds.includes(id)
          ? current.permittedGateIds.filter(
              (gateId) => gateId !== id
            )
          : [...current.permittedGateIds, id],
    }));

    setErrors((current) => ({
      ...current,
      permittedGateIds: undefined,
    }));
  }

  function saveItem(item) {
    setForm((current) => {
      const exists = current.items.some(
        (existing) => existing.clientId === item.clientId
      );

      return {
        ...current,
        items: exists
          ? current.items.map(
              (existing) =>
                existing.clientId === item.clientId
                  ? item
                  : existing
            )
          : [...current.items, item],
      };
    });

    setErrors((current) => ({
      ...current,
      items: undefined,
    }));
  }

  function removeItem(clientId) {
    setForm((current) => ({
      ...current,
      items: current.items.filter(
        (item) => item.clientId !== clientId
      ),
    }));

    setErrors((current) => ({
      ...current,
      items: undefined,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (
      submitLock.current ||
      !canApply
    ) {
      return;
    }

    if (hasUnsavedDraft) {
      toast.error(
        "Save or cancel the open material editor before submitting."
      );
      return;
    }

    /*
     * Hidden fields cannot accidentally send stale values.
     */
    const candidate = {
      ...form,
      ...(!SHOW_MOVEMENT_DETAILS
        ? {
            vehicleNumber: "",
            personName: "",
            aadhaarNumber: "",
          }
        : {}),
      permittedGateIds:
        vendorSelectsGates
          ? form.permittedGateIds
          : [],
    };

    const result = applicationSchema.safeParse(candidate);

    if (!result.success) {
      setErrors(formIssues(result.error));

      toast.error("Please correct the highlighted fields.");

      window.requestAnimationFrame(() => {
        formRef.current
          ?.querySelector('[aria-invalid="true"]')
          ?.focus();
      });

      return;
    }

    const availableGateIds = new Set(
      link.availableGates.map((gate) => gate.id)
    );

    if (
      vendorSelectsGates &&
      result.data.permittedGateIds.some(
        (id) => !availableGateIds.has(id)
      )
    ) {
      setErrors({
        permittedGateIds:
          "Select gates from the available list.",
      });
      return;
    }

    if (
      !vendorSelectsGates &&
      link.permittedGates.length === 0
    ) {
      toast.error(
        "The department gates are not configured. Please contact the department."
      );
      return;
    }

    const validUnitIds = new Set(
      units.map((unit) => unit.id)
    );

    if (
      result.data.items.some(
        (item) =>
          item.unitId !== null &&
          !validUnitIds.has(item.unitId)
      )
    ) {
      toast.error(
        "Select a valid unit for every material with a quantity."
      );
      return;
    }

    const token = readToken();

    if (!token) {
      window.location.replace("/");
      return;
    }

    const data = result.data;

    /*
     * Build the payload explicitly.
     * No client IDs, gate mode or Traffic flag are sent.
     */
    const payload = {
      vehicleNumber: data.vehicleNumber,
      personName: data.personName,
      aadhaarNumber: data.aadhaarNumber,
      vendorRemarks: data.vendorRemarks,
      agreed: data.agreed,

      ...(vendorSelectsGates
        ? {
            permittedGateIds: data.permittedGateIds,
          }
        : {}),

      items: data.items.map((item) => ({
        materialType: item.materialType,
        name: item.name,
        isHazardous: item.isHazardous,
        requestedQty: item.requestedQty || null,
        unitId: item.unitId,
        description: item.description,
      })),
    };

    submitLock.current = true;
    setSubmitting(true);
    setErrors({});

    try {
      const response = await axios.post(
        `${LINK_URL}/${encodeURIComponent(token)}/requests`,
        payload,
        { withCredentials: false }
      );

      const saved = response.data?.data;

      if (
        response.status !== 201 ||
        !response.data?.success ||
        !saved?.referenceNumber
      ) {
        throw new Error(
          "The server did not confirm the submission."
        );
      }

      setSubmittedRequest(saved);
      toast.success(
        "Material pass request submitted successfully."
      );
    } catch (error) {
      const code = error.response?.status;

      toast.error(
        errorMessage(
          error,
          "Could not confirm the submission. Check Submitted requests before trying again."
        )
      );

      if ([409, 410].includes(code)) {
        /*
         * Reload current availability without clearing
         * the vendor's entered material details.
         */
        await loadLink();
      }
    } finally {
      submitLock.current = false;
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen min-w-0 bg-slate-50 px-4 py-7 text-slate-800 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="relative overflow-hidden rounded-2xl bg-[#0a1e4d] text-white shadow-sm">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-orange-500/10 blur-3xl"
          />

          <div className="relative p-6 sm:p-8">
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
              <div className="flex min-w-0 items-center gap-3">
                <span className="shrink-0 rounded-xl bg-white/10 p-3 ring-1 ring-white/10">
                  <ShieldCheck
                    size={25}
                    className="text-orange-300"
                    aria-hidden="true"
                  />
                </span>

                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-orange-300">
                    APACS · Material Movement
                  </p>
                  <h1 className="mt-1 text-xl font-bold sm:text-2xl">
                    Vendor material pass application
                  </h1>
                </div>
              </div>

              {link?.validTo && (
                <div className="w-fit shrink-0 rounded-xl border border-emerald-300/40 bg-emerald-400/10 px-4 py-3">
                  <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-emerald-200">
                    <span
                      aria-hidden="true"
                      className="h-1.5 w-1.5 rounded-full bg-emerald-400"
                    />
                    Valid till
                  </p>
                  <p className="mt-1 text-base font-bold">
                    {displayDate(link.validTo)}
                  </p>
                </div>
              )}
            </div>

            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-200">
              Check the department details, confirm the gates and add
              the materials you need to move through the port.
            </p>
          </div>

          {hasSubmittedRequests && (
            <nav
              aria-label="Vendor material navigation"
              className="relative border-t border-white/15 bg-white/5 px-6 py-4 sm:px-8"
            >
              <div className="flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  onClick={() =>
                    router.push("/vendor-material-pass/submitted")
                  }
                  className={`${buttonCls} border border-emerald-300 bg-emerald-400 text-[#062c26] shadow-sm hover:bg-emerald-300`}
                >
                  <FileText size={17} aria-hidden="true" />
                  Submitted requests
                </button>

                <button
                  type="button"
                  onClick={() =>
                    toast.info("Inventory will be available here soon.")
                  }
                  className={`${buttonCls} border border-white bg-white text-[#0a1e4d] shadow-sm hover:bg-orange-50`}
                >
                  <Boxes size={17} aria-hidden="true" />
                  Inventory
                </button>
              </div>
            </nav>
          )}
        </header>

        {status !== "ready" && (
          <section
            role={status === "loading" ? "status" : "alert"}
            className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            {status === "loading" ? (
              <Loader2
                size={20}
                className="mt-0.5 shrink-0 animate-spin text-orange-600"
              />
            ) : (
              <AlertCircle
                size={20}
                className="mt-0.5 shrink-0 text-orange-600"
              />
            )}

            <div>
              <h2 className="text-sm font-semibold text-[#0a1e4d]">
                {status === "loading"
                  ? "Checking application link…"
                  : "Application unavailable"}
              </h2>

              {message && (
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {message}
                </p>
              )}

              {status === "error" && (
                <button
                  type="button"
                  onClick={loadLink}
                  className={`${secondaryButtonCls} mt-3`}
                >
                  <RefreshCw size={15} aria-hidden="true" />
                  Try again
                </button>
              )}
            </div>
          </section>
        )}

        {link && (
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-orange-100 bg-gradient-to-r from-orange-50 to-white px-5 py-4 sm:px-6">
              <h2 className="flex items-center gap-2 text-sm font-bold text-[#0a1e4d]">
                <FileText
                  size={18}
                  className="text-orange-600"
                  aria-hidden="true"
                />
                Details provided by the department
              </h2>
            </div>

            <dl className="grid gap-x-8 gap-y-5 p-5 sm:grid-cols-2 sm:p-6 lg:grid-cols-3">
              <Info label="Reference" value={link.referenceNo} />
              <Info label="Department" value={link.departmentName} />
              <Info label="Company" value={link.companyName} />
              <Info label="Vendor email" value={link.vendorEmail} />
              <Info label="Vendor mobile" value={link.vendorMobile} />
              <Info label="Purpose" value={link.purpose} />

              <Info
                label="Gate selection"
                value={
                  vendorSelectsGates
                    ? "Vendor selects gates"
                    : "Selected by the department"
                }
              />

              <Info
                label="Traffic approval"
                value={
                  link.requiresTrafficApproval
                    ? "Included in the approval flow"
                    : "Not included"
                }
              />

              <Info
                label="Document reference"
                value={link.referenceDocumentNo}
              />
            </dl>
          </section>
        )}

        {status === "ready" &&
          link &&
          !link.canSubmit &&
          !submittedRequest && (
            <section
              role="status"
              className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-900"
            >
              <h2 className="flex items-center gap-2 text-sm font-bold">
                <Check size={19} aria-hidden="true" />
                Submission limit reached
              </h2>

              <p className="mt-2 text-sm leading-6">
                The allowed submissions for this link have been used.
                View Submitted requests above, or contact the department
                if another submission is needed.
              </p>
            </section>
          )}

        {canApply && (
          <form
            ref={formRef}
            onSubmit={handleSubmit}
            noValidate
            className="space-y-5"
          >
            <fieldset
              disabled={submitting}
              className="min-w-0 space-y-5"
            >
              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
                  <div>
                    <h2 className="text-sm font-bold text-[#0a1e4d]">
                      Permitted gates
                      {vendorSelectsGates && (
                        <span className="ml-1 text-rose-600">*</span>
                      )}
                    </h2>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {vendorSelectsGates
                        ? "Select at least one gate for this material request."
                        : "These gates were selected by the department and cannot be changed."}
                    </p>
                  </div>

                  {!vendorSelectsGates && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600">
                      <LockKeyhole size={12} aria-hidden="true" />
                      Read-only
                    </span>
                  )}
                </div>

                <div className="p-5 sm:p-6">
                  {vendorSelectsGates ? (
                    <>
                      <fieldset
                        aria-describedby={
                          errors.permittedGateIds
                            ? "vendor-gates-error"
                            : undefined
                        }
                      >
                        <legend className="sr-only">
                          Select permitted gates
                        </legend>

                        {link.availableGates.length === 0 ? (
                          <p
                            role="alert"
                            className="text-sm text-rose-700"
                          >
                            No active gates are available. Please contact
                            the department.
                          </p>
                        ) : (
                          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                            {link.availableGates.map((gate) => {
                              const selected =
                                form.permittedGateIds.includes(gate.id);

                              return (
                                <label
                                  key={gate.id}
                                  className={
                                    "flex cursor-pointer items-center gap-2 rounded-xl " +
                                    "border px-3 py-3 text-xs font-semibold transition " +
                                    "focus-within:ring-4 focus-within:ring-orange-500/15 " +
                                    (selected
                                      ? "border-orange-300 bg-orange-50 text-orange-800"
                                      : "border-slate-200 bg-white text-slate-700 hover:border-orange-200")
                                  }
                                >
                                  <input
                                    type="checkbox"
                                    checked={selected}
                                    onChange={() => toggleGate(gate.id)}
                                    aria-invalid={Boolean(errors.permittedGateIds)}
                                    className="h-4 w-4 shrink-0 accent-orange-600"
                                  />
                                  {gate.name}
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </fieldset>

                      <div className="mt-3 flex items-center justify-between gap-3">
                        <span className="text-xs text-slate-500">
                          Choose the gates you need to use.
                        </span>
                        <span className="text-xs font-semibold text-orange-700">
                          {form.permittedGateIds.length} selected
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {link.permittedGates.length > 0 ? (
                        link.permittedGates.map((gate) => (
                          <span
                            key={gate.id}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700"
                          >
                            <Check
                              size={13}
                              className="text-orange-600"
                              aria-hidden="true"
                            />
                            {gate.name}
                          </span>
                        ))
                      ) : (
                        <p role="alert" className="text-sm text-rose-700">
                          Department gates are not configured. Please
                          contact the department.
                        </p>
                      )}
                    </div>
                  )}

                  {errors.permittedGateIds && (
                    <p
                      id="vendor-gates-error"
                      role="alert"
                      className="mt-2 text-xs text-rose-600"
                    >
                      {errors.permittedGateIds}
                    </p>
                  )}
                </div>
              </section>

              {SHOW_MOVEMENT_DETAILS && (
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <h2 className="mb-5 flex items-center gap-2 text-sm font-bold text-[#0a1e4d]">
                    <Truck
                      size={18}
                      className="text-orange-600"
                      aria-hidden="true"
                    />
                    Movement details
                  </h2>

                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    <Field
                      id="vehicle-number"
                      label="Vehicle number"
                      error={errors.vehicleNumber}
                    >
                      <input
                        id="vehicle-number"
                        value={form.vehicleNumber}
                        maxLength={20}
                        className={inputCls}
                        aria-invalid={Boolean(errors.vehicleNumber)}
                        onChange={(event) =>
                          updateField(
                            "vehicleNumber",
                            event.target.value.toUpperCase()
                          )
                        }
                      />
                    </Field>

                    <Field
                      id="person-name"
                      label="Person name"
                      error={errors.personName}
                    >
                      <input
                        id="person-name"
                        value={form.personName}
                        maxLength={150}
                        className={inputCls}
                        aria-invalid={Boolean(errors.personName)}
                        onChange={(event) =>
                          updateField("personName", event.target.value)
                        }
                      />
                    </Field>

                    <Field
                      id="aadhaar-number"
                      label="Aadhaar number"
                      error={errors.aadhaarNumber}
                    >
                      <input
                        id="aadhaar-number"
                        type="text"
                        inputMode="numeric"
                        value={form.aadhaarNumber}
                        maxLength={12}
                        className={inputCls}
                        aria-invalid={Boolean(errors.aadhaarNumber)}
                        onChange={(event) =>
                          updateField("aadhaarNumber", event.target.value)
                        }
                      />
                    </Field>
                  </div>
                </section>
              )}

              {unitsError && (
                <div
                  role="alert"
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800"
                >
                  <span>{unitsError}</span>
                  <button
                    type="button"
                    disabled={unitsLoading}
                    onClick={loadUnits}
                    className="inline-flex items-center gap-1.5 font-semibold underline"
                  >
                    <RefreshCw size={14} aria-hidden="true" />
                    Retry loading units
                  </button>
                </div>
              )}

              <MaterialTable
                type="RETURNABLE"
                items={returnableItems}
                units={units}
                unitsLoading={unitsLoading}
                onSave={saveItem}
                onDelete={removeItem}
                onDraftChange={onDraftChange}
              />

              <MaterialTable
                type="NON_RETURNABLE"
                items={nonReturnableItems}
                units={units}
                unitsLoading={unitsLoading}
                onSave={saveItem}
                onDelete={removeItem}
                onDraftChange={onDraftChange}
              />

              {Object.entries(errors)
                .filter(
                  ([key, value]) =>
                    Boolean(value) &&
                    (key === "items" || key.startsWith("items."))
                )
                .map(([key, value]) => (
                  <p
                    key={key}
                    role="alert"
                    className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700"
                  >
                    {value}
                  </p>
                ))}

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <Field
                  id="vendor-remarks"
                  label="Remarks"
                  error={errors.vendorRemarks}
                  hint="Optional notes for the approving department."
                >
                  <textarea
                    id="vendor-remarks"
                    rows={3}
                    maxLength={1000}
                    value={form.vendorRemarks}
                    className={`${inputCls} resize-y`}
                    aria-invalid={Boolean(errors.vendorRemarks)}
                    onChange={(event) =>
                      updateField("vendorRemarks", event.target.value)
                    }
                    placeholder="Add any relevant notes"
                  />
                </Field>

                <p className="mt-1 text-right text-xs text-slate-400">
                  {form.vendorRemarks.length}/1000
                </p>
              </section>

              <section className="overflow-hidden rounded-2xl border border-orange-200 bg-white shadow-sm">
                <div className="border-b border-orange-100 bg-orange-50/60 p-5 sm:px-6">
                  <h2 className="flex items-center gap-2 text-sm font-bold text-[#0a1e4d]">
                    <ClipboardCheck
                      size={18}
                      className="text-orange-600"
                      aria-hidden="true"
                    />
                    Confirm and submit
                  </h2>

                  <p className="mt-2 text-xs leading-5 text-slate-600">
                    {returnableItems.length} returnable
                    {" · "}
                    {nonReturnableItems.length} non-returnable
                    {" · "}
                    {vendorSelectsGates
                      ? form.permittedGateIds.length
                      : link.permittedGates.length} gates
                  </p>

                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    Approval flow: Department
                    {hasHazardousItems ? " → Fire Safety" : ""}
                    {link.requiresTrafficApproval ? " → Traffic" : ""}
                    {" → CISF"}
                  </p>
                </div>

                <div className="p-5 sm:p-6">
                  <label className="flex cursor-pointer items-start gap-3 text-sm leading-6 text-slate-700">
                    <input
                      type="checkbox"
                      checked={form.agreed}
                      onChange={(event) =>
                        updateField("agreed", event.target.checked)
                      }
                      aria-invalid={Boolean(errors.agreed)}
                      aria-describedby={
                        errors.agreed ? "agreement-error" : undefined
                      }
                      className="mt-1 h-4 w-4 shrink-0 accent-orange-600"
                    />
                    I confirm that the material details provided are
                    correct and complete.
                  </label>

                  {errors.agreed && (
                    <p
                      id="agreement-error"
                      role="alert"
                      className="mt-2 text-xs text-rose-600"
                    >
                      {errors.agreed}
                    </p>
                  )}

                  {hasUnsavedDraft && (
                    <p
                      role="status"
                      className="mt-3 text-xs text-amber-700"
                    >
                      Save or cancel the open material editor before
                      submitting.
                    </p>
                  )}

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-5">
                    <p className="max-w-md text-xs leading-5 text-slate-500">
                      Your request will be sent to the department for
                      review.
                    </p>

                    <button
                      type="submit"
                      disabled={
                        submitting ||
                        hasUnsavedDraft ||
                        (
                          vendorSelectsGates
                            ? link.availableGates.length === 0
                            : link.permittedGates.length === 0
                        )
                      }
                      className={primaryButtonCls}
                    >
                      {submitting ? (
                        <Loader2
                          size={17}
                          className="animate-spin"
                        />
                      ) : (
                        <ClipboardCheck
                          size={17}
                          aria-hidden="true"
                        />
                      )}
                      {submitting ? "Submitting…" : "Submit request"}
                    </button>
                  </div>
                </div>
              </section>
            </fieldset>
          </form>
        )}

        {submittedRequest && (
          <section
            role="status"
            className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-900"
          >
            <div className="flex items-start gap-3">
              <span className="rounded-xl bg-emerald-100 p-2.5">
                <Check size={21} aria-hidden="true" />
              </span>

              <div>
                <h2 className="text-base font-bold">
                  Request submitted successfully
                </h2>

                <p className="mt-2 text-sm leading-6">
                  Reference:{" "}
                  <strong className="break-all">
                    {submittedRequest.referenceNumber}
                  </strong>
                </p>

                <p className="mt-1 text-sm leading-6">
                  Your request has been sent to the department for
                  review. Use Submitted requests above to view it.
                </p>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}