import { z } from "zod";

export const materialSchema = z.object({
    name: z
        .string()
        .trim()
        .min(1, "Please enter an item."),

    isHazardous: z.boolean().default(false).optional(),

    quantity: z
        .number()
        .nullable()
        .refine((value) => value !== null && value > 0, {
            message: "Please enter a valid quantity.",
        }),

    unit: z
        .number()
        .nullable()
        .refine((value) => value !== null && value > 0, {
            message: "Please select a Unit.",
        }),

    description: z.string().trim().max(250).optional()
});


export const MAX_ENTRY_DAYS_AHEAD = 60;
export const VALIDITY_MONTHS = 6;

export const calculateValidTillDate = (entryDateStr, months = VALIDITY_MONTHS) => {
  if (!entryDateStr) return "";
  const parts = String(entryDateStr).split("-");
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) {
      d.setMonth(d.getMonth() + months);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    }
  }
  const d = new Date(entryDateStr);
  if (isNaN(d.getTime())) return "";
  d.setMonth(d.getMonth() + months);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

export const formatDisplayDate = (dateStr) => {
  if (!dateStr) return "";
  const parts = String(dateStr).split("-");
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    }
  }
  return dateStr;
};

export const getMaxEntryDateString = (daysAhead = MAX_ENTRY_DAYS_AHEAD) => {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`;
};

export const createMaterialPassSchema = (othersPurposeId, othersLocationId) =>
    z.object({
        purpose: z
            .number()
            .nullable()
            .refine((value) => value !== null && value > 0, {
                message: "Please select a Purpose of visit"
            }),
        purposeOther: z.string().optional(),
        concernedDepartment: z
            .number()
            .nullable()
            .refine((value) => value !== null && value > 0, {
                message: "Please select a Department.",
            }),
        location: z
            .union([
                z.array(z.union([z.number(), z.string()])),
                z.number(),
                z.string(),
            ])
            .nullable()
            .optional()
            .refine((value) => {
                if (Array.isArray(value)) return value.length > 0;
                return value !== null && value !== undefined && value !== "";
            }, {
                message: "Please select a Location.",
            }),
        locationOther: z.string().optional(),
        entryDate: z
            .string()
            .nullable()
            .refine((value) => value, {
                message: "Please select an Entry Date."
            })
            .refine((value) => !isNaN(Date.parse(value)), {
                message: "Please select a valid Entry Date."
            })
            .refine((value) => {
                const selectedDate = new Date(value);
                const today = new Date();

                selectedDate.setHours(0, 0, 0, 0);
                today.setHours(0, 0, 0, 0);

                return selectedDate >= today;
            }, {
                message: "Entry Date cannot be before today."
            })
            .refine((value) => {
                const selectedDate = new Date(value);
                const maxDate = new Date();
                maxDate.setDate(maxDate.getDate() + MAX_ENTRY_DAYS_AHEAD);

                selectedDate.setHours(0, 0, 0, 0);
                maxDate.setHours(23, 59, 59, 999);

                return selectedDate <= maxDate;
            }, {
                message: `Entry Date cannot be more than ${MAX_ENTRY_DAYS_AHEAD} days from today.`
            }),

        entryFromDate: z.string().optional(),
        validTillDate: z.string().optional(),
        validTill: z.string().optional(),

        returnables: z.array(materialSchema),
        nonReturnables: z.array(materialSchema)
    })
    .superRefine((data, ctx) => {
        if (
            data.purpose === othersPurposeId &&
            (!data.purposeOther || data.purposeOther.trim().length < 5)
        ) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["purposeOther"],
                message: "Please specify the purpose (minimum 5 characters)."
            });
        }

        const isOthersSelected = Array.isArray(data.location)
            ? data.location.some((id) => String(id) === String(othersLocationId))
            : String(data.location) === String(othersLocationId);

        if (
            isOthersSelected &&
            (!data.locationOther || data.locationOther.trim().length < 5)
        ) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["locationOther"],
                message: "Please specify the location (minimum 5 characters)."
            });
        }

        if (
            data.returnables.length === 0 &&
            data.nonReturnables.length === 0
        ) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["returnables"],
                message: "Please add at least one Returnable or Non-Returnable material."
            });
        }
    });