"use client";

import React, { useState, useMemo, useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import { toast } from "sonner";
import {
  Boxes,
  Check,
  PackagePlus,
  Pencil,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";

const rowInputCls =
  "w-full min-w-0 rounded-lg border border-slate-300 " +
  "bg-white px-3 py-2 text-xs text-slate-900 " +
  "outline-none transition placeholder:text-slate-400 " +
  "focus:border-orange-500 focus:ring-4 " +
  "focus:ring-orange-500/10 disabled:bg-slate-100 " +
  "disabled:cursor-not-allowed";

const secondaryButtonCls =
  "inline-flex items-center justify-center gap-2 rounded-xl " +
  "border border-slate-300 bg-white px-4 py-2 text-sm " +
  "font-semibold text-slate-700 transition hover:bg-slate-50 " +
  "focus-visible:outline-none focus-visible:ring-4 " +
  "focus-visible:ring-orange-500/15 " +
  "disabled:cursor-not-allowed disabled:opacity-50";

/**
 * Reusable Returnable / Non-Returnable materials table.
 * Matches the design and user experience of vendor-material-pass.
 */
export const MaterialTable = forwardRef(function MaterialTable({
  type,
  title,
  materials = [],
  setMaterials,
  units = [],
  unitsLoading = false,
  getLabelById,
  onDraftChange,
}, ref) {
  const [draft, setDraft] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);
  const [errors, setErrors] = useState({});

  const editorRowRef = useRef(null);
  const scrollContainerRef = useRef(null);

  const totalRowCount = materials.length + (draft && editingIndex === null ? 1 : 0);
  const isScrollable = totalRowCount > 15;

  // Auto-scroll newly added or edited row into view within the table container only
  useEffect(() => {
    if (draft && editorRowRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const row = editorRowRef.current;
      const cTop = container.scrollTop;
      const cHeight = container.clientHeight;
      const rTop = row.offsetTop;
      const rHeight = row.offsetHeight;

      if (rTop + rHeight > cTop + cHeight) {
        container.scrollTo({ top: rTop + rHeight - cHeight + 20, behavior: "smooth" });
      } else if (rTop < cTop) {
        container.scrollTo({ top: Math.max(0, rTop - 10), behavior: "smooth" });
      }
    }
  }, [draft, editingIndex]);

  const computedType =
    type ||
    (title?.toLowerCase().includes("non")
      ? "NON_RETURNABLE"
      : "RETURNABLE");

  const returnable = computedType === "RETURNABLE";

  const displayTitle =
    title ||
    (returnable ? "Returnable materials" : "Non-returnable materials");

  const unitNames = useMemo(
    () =>
      new Map(
        (Array.isArray(units) ? units : []).map((unit) => [
          Number(unit.id),
          unit.unitName || unit.name || unit.label,
        ])
      ),
    [units]
  );

  const editorId = `material-editor-${computedType}`;

  function startAdd() {
    if (draft) {
      return;
    }

    if (materials.length >= 30) {
      toast.error("Add no more than 30 materials in this category.");
      return;
    }

    setEditingIndex(null);
    setDraft({
      name: "",
      isHazardous: false,
      quantity: "",
      unit: null,
      description: "",
    });
    setErrors({});
    onDraftChange?.(computedType, true);
  }

  function startEdit(item, index) {
    if (draft) {
      return;
    }

    setEditingIndex(index);
    setDraft({
      name: item.name || "",
      isHazardous: Boolean(item.isHazardous),
      quantity:
        item.quantity !== null && item.quantity !== undefined
          ? String(item.quantity)
          : item.requestedQty !== null && item.requestedQty !== undefined
            ? String(item.requestedQty)
            : "",
      unit:
        item.unit !== null && item.unit !== undefined
          ? Number(item.unit)
          : item.unitId !== null && item.unitId !== undefined
            ? Number(item.unitId)
            : null,
      description: item.description || "",
    });
    setErrors({});
    onDraftChange?.(computedType, true);
  }

  function closeEditor() {
    setDraft(null);
    setEditingIndex(null);
    setErrors({});
    onDraftChange?.(computedType, false);
  }

  function update(name, value) {
    onDraftChange?.(computedType, true);

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
      return true;
    }

    const nextErrors = {};
    const trimmedName = (draft.name || "").trim();

    if (!trimmedName) {
      nextErrors.name = "Enter the material name.";
    } else if (trimmedName.length > 255) {
      nextErrors.name = "Material name must be 255 characters or fewer.";
    }

    const isDuplicate = materials.some((existing, idx) => {
      if (editingIndex !== null && idx === editingIndex) {
        return false;
      }
      return (
        existing.name?.trim().toLowerCase() === trimmedName.toLowerCase()
      );
    });

    if (isDuplicate) {
      nextErrors.name = "This material is already listed in this category.";
    }

    const qtyStr = String(draft.quantity ?? "").trim();
    const qtyNum = Number(qtyStr);

    if (!qtyStr || isNaN(qtyNum) || qtyNum <= 0) {
      nextErrors.quantity = "Please enter a valid quantity.";
    }

    const unitId =
      draft.unit !== null && draft.unit !== undefined && draft.unit !== ""
        ? Number(draft.unit)
        : null;

    if (!unitId || !unitNames.has(unitId)) {
      nextErrors.unit = "Please select a unit.";
    }

    const desc = (draft.description || "").trim();
    if (desc.length > 250) {
      nextErrors.description = "Use 250 characters or fewer.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return false;
    }

    const savedItem = {
      name: trimmedName,
      isHazardous: Boolean(draft.isHazardous),
      quantity: qtyNum,
      unit: unitId,
      description: desc,
    };

    setMaterials((prev) => {
      const list = Array.isArray(prev) ? prev : [];
      if (editingIndex !== null) {
        return list.map((item, idx) =>
          idx === editingIndex ? { ...item, ...savedItem } : item
        );
      }
      return [...list, savedItem];
    });

    if (editingIndex === null) {
      const nextCount = materials.length + 1;
      if (nextCount < 30) {
        // Automatically produce next row of fields
        setDraft({
          name: "",
          isHazardous: false,
          quantity: "",
          unit: null,
          description: "",
        });
        setEditingIndex(null);
        setErrors({});
        onDraftChange?.(computedType, false);
      } else {
        closeEditor();
        toast.info("Maximum of 30 materials reached for this category.");
      }
    } else {
      closeEditor();
    }
    return true;
  }

  useImperativeHandle(ref, () => ({
    commitDraft: () => {
      if (!draft) return true;
      const trimmedName = (draft.name || "").trim();
      const qtyStr = String(draft.quantity ?? "").trim();
      if (editingIndex === null && !trimmedName && !qtyStr && !draft.unit && !draft.description) {
        closeEditor();
        return true;
      }
      return save();
    },
    isEditing: Boolean(draft),
  }));

  function deleteRow(index) {
    closeEditor();
    setMaterials((prev) => {
      const list = Array.isArray(prev) ? prev : [];
      return list.filter((_, idx) => idx !== index);
    });
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
      <tr ref={editorRowRef} className="bg-orange-50/50 align-top">
        <td className="border-b border-orange-200/70 px-4 py-4 text-xs font-semibold text-orange-700">
          {number}
        </td>

        <td className="border-b border-orange-200/70 px-4 py-4">
          <input
            id={`${editorId}-name`}
            aria-label="Material name"
            ref={(el) => {
              if (el && draft && !draft.name) {
                el.focus({ preventScroll: true });
              }
            }}
            value={draft.name}
            maxLength={255}
            placeholder="Enter item name"
            className={rowInputCls}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={
              errors.name ? `${editorId}-name-error` : undefined
            }
            onChange={(event) => update("name", event.target.value)}
          />

          {renderError("name")}

          <label className="mt-3 inline-flex cursor-pointer items-center gap-2 text-[11px] font-medium text-slate-600">
            <input
              type="checkbox"
              checked={Boolean(draft.isHazardous)}
              onChange={(event) =>
                update("isHazardous", event.target.checked)
              }
              className="h-3.5 w-3.5 shrink-0 accent-orange-600"
            />
            Hazardous material
          </label>
        </td>

        <td className="border-b border-orange-200/70 px-4 py-4">
          <input
            id={`${editorId}-quantity`}
            aria-label="Material quantity"
            type="number"
            min="1"
            value={draft.quantity}
            placeholder="e.g. 10"
            className={rowInputCls}
            aria-invalid={Boolean(errors.quantity)}
            aria-describedby={
              errors.quantity ? `${editorId}-quantity-error` : undefined
            }
            onChange={(event) => update("quantity", event.target.value)}
          />

          {renderError("quantity")}
        </td>

        <td className="border-b border-orange-200/70 px-4 py-4">
          <select
            id={`${editorId}-unit`}
            aria-label="Material unit"
            value={draft.unit ?? ""}
            disabled={unitsLoading || units.length === 0}
            className={rowInputCls}
            aria-invalid={Boolean(errors.unit)}
            aria-describedby={
              errors.unit ? `${editorId}-unit-error` : undefined
            }
            onChange={(event) =>
              update(
                "unit",
                event.target.value ? Number(event.target.value) : null
              )
            }
          >
            <option value="">
              {unitsLoading ? "Loading…" : "Select unit"}
            </option>

            {units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.unitName || unit.name || unit.label}
              </option>
            ))}
          </select>

          {renderError("unit")}
        </td>

        <td className="border-b border-orange-200/70 px-4 py-4">
          <textarea
            id={`${editorId}-description`}
            aria-label="Material description"
            rows={2}
            maxLength={250}
            value={draft.description}
            placeholder="Additional details"
            className={`${rowInputCls} min-h-[72px] resize-y`}
            aria-invalid={Boolean(errors.description)}
            aria-describedby={
              errors.description ? `${editorId}-description-error` : undefined
            }
            onChange={(event) =>
              update("description", event.target.value)
            }
          />

          {renderError("description")}
        </td>

        <td className="border-b border-orange-200/70 px-4 py-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={save}
              aria-label={
                editingIndex !== null
                  ? "Save material changes"
                  : "Save material"
              }
              title={
                editingIndex !== null
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

          <p className="mt-2 text-[10px] text-slate-400">Save / Cancel</p>
        </td>
      </tr>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm mb-8">
      <div className="border-b border-slate-100 bg-gradient-to-r from-orange-50/70 to-white p-5">
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-orange-100 p-2.5 text-orange-700">
            {returnable ? (
              <RefreshCw size={19} aria-hidden="true" />
            ) : (
              <Boxes size={19} aria-hidden="true" />
            )}
          </span>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-bold text-[#0a1e4d]">
                {displayTitle}
              </h2>

              <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-slate-500 ring-1 ring-slate-200">
                {materials.length}/30
              </span>

              {isScrollable && (
                <span className="inline-flex items-center gap-1 rounded-full bg-orange-100/80 px-2 py-0.5 text-[10px] font-medium text-orange-700 ring-1 ring-orange-200/60">
                  Scroll enabled (15+ items)
                </span>
              )}
            </div>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              {returnable
                ? "Materials that will be taken out later. Quantity and unit are required."
                : "Materials that will remain or be consumed. Quantity and unit are required."}
            </p>
          </div>
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        tabIndex={isScrollable ? 0 : undefined}
        aria-label={isScrollable ? `${displayTitle} scrollable list` : undefined}
        className={`max-w-full overflow-x-auto transition-all ${
          isScrollable
            ? "max-h-[600px] overflow-y-auto [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 hover:[&::-webkit-scrollbar-thumb]:bg-slate-400 focus:outline-none focus-visible:ring-1 focus-visible:ring-orange-500/20"
            : ""
        }`}
      >
        <table className="w-full min-w-[920px] table-fixed border-separate border-spacing-0 text-left">
          <caption className="sr-only">{displayTitle}</caption>

          <colgroup>
            <col className="w-[6%]" />
            <col className="w-[25%]" />
            <col className="w-[13%]" />
            <col className="w-[14%]" />
            <col className="w-[28%]" />
            <col className="w-[14%]" />
          </colgroup>

          <thead className="sticky top-0 z-10 text-[11px] font-semibold text-slate-500 shadow-sm">
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
                  className="border-b border-slate-200 bg-slate-50/95 backdrop-blur-sm px-4 py-3 font-semibold text-slate-600"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="text-xs text-slate-700">
            {materials.length === 0 && !draft && (
              <tr>
                <td
                  colSpan={6}
                  className="border-b border-slate-100 px-4 py-8 text-center text-slate-400"
                >
                  No materials added. Use “Add material” below to begin.
                </td>
              </tr>
            )}

            {materials.map((item, index) => {
              if (draft && editingIndex === index) {
                return (
                  <React.Fragment key={index}>
                    {renderEditorRow(index + 1)}
                  </React.Fragment>
                );
              }

              return (
                <tr
                  key={index}
                  className="align-top transition hover:bg-orange-50/25"
                >
                  <td className="border-b border-slate-100 px-4 py-4 text-slate-400">
                    {index + 1}
                  </td>

                  <td className="border-b border-slate-100 px-4 py-4">
                    <p className="break-words font-semibold text-slate-900">
                      {item.name}
                    </p>

                    {item.isHazardous && (
                      <span className="mt-1.5 inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800 ring-1 ring-amber-200">
                        Hazardous
                      </span>
                    )}
                  </td>

                  <td className="border-b border-slate-100 break-words px-4 py-4">
                    {item.quantity ?? item.requestedQty ?? "—"}
                  </td>

                  <td className="border-b border-slate-100 break-words px-4 py-4">
                    {unitNames.get(Number(item.unit || item.unitId)) ||
                      getLabelById?.(units, item.unit) ||
                      "—"}
                  </td>

                  <td className="border-b border-slate-100 px-4 py-4">
                    <p className="whitespace-pre-wrap break-words leading-5 text-slate-500">
                      {item.description || "—"}
                    </p>
                  </td>

                  <td className="border-b border-slate-100 px-4 py-4">
                    <div className="flex gap-1">
                      <button
                        type="button"
                        disabled={Boolean(draft)}
                        onClick={() => startEdit(item, index)}
                        aria-label={`Edit ${item.name}`}
                        title="Edit material"
                        className="rounded-lg p-2 text-slate-500 transition hover:bg-orange-50 hover:text-orange-700 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Pencil size={15} />
                      </button>

                      <button
                        type="button"
                        disabled={Boolean(draft)}
                        onClick={() => deleteRow(index)}
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
              editingIndex === null &&
              renderEditorRow(materials.length + 1)}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/50 px-5 py-4">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <p>
            {draft
              ? "Save or cancel this row before adding another material."
              : materials.length >= 30
                ? "Maximum of 30 materials reached."
                : "Add materials one row at a time."}
          </p>
          {isScrollable && (
            <span className="text-[11px] font-medium text-slate-400">
              • Showing all {materials.length} items (scroll enabled)
            </span>
          )}
        </div>

        <button
          type="button"
          disabled={Boolean(draft) || materials.length >= 30}
          onClick={startAdd}
          className={secondaryButtonCls}
        >
          <PackagePlus size={16} aria-hidden="true" />
          Add material
        </button>
      </div>
    </section>
  );
});

export default MaterialTable;