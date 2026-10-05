import { z } from "zod";

const text = (max) => z.string().trim().max(max);

const positiveQuantity = z
  .string()
  .trim()
  .refine(
    (value) =>
      /^\d{1,15}(?:\.\d{1,3})?$/.test(value) &&
      BigInt(value.replace(".", "")) > 0n,
    "Enter a positive quantity with up to 3 decimal places."
  );

const positiveId = z
  .number()
  .int()
  .positive()
  .max(Number.MAX_SAFE_INTEGER);

export const materialItemSchema = z
  .object({
    clientId: z.string().min(1),
    materialType: z.enum([
      "RETURNABLE",
      "NON_RETURNABLE",
    ]),
    name: text(255).min(1, "Enter the material name."),
    isHazardous: z.boolean(),
    requestedQty: z.string().trim(),
    unitId: z.union([positiveId, z.null()]),
    description: text(1000),
  })
  .strict()
  .superRefine((item, ctx) => {
    const hasQuantity = item.requestedQty !== "";
    const hasUnit = item.unitId !== null;

    if (
      item.materialType === "RETURNABLE" ||
      hasQuantity
    ) {
      const result = positiveQuantity.safeParse(
        item.requestedQty
      );

      if (!result.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["requestedQty"],
          message: result.error.issues[0].message,
        });
      }
    }

    if (
      (item.materialType === "RETURNABLE" || hasQuantity) &&
      !hasUnit
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["unitId"],
        message: "Select a unit.",
      });
    }

    if (
      item.materialType === "NON_RETURNABLE" &&
      hasUnit &&
      !hasQuantity
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["requestedQty"],
        message:
          "Enter a quantity for the selected unit.",
      });
    }
  });

export const vendorApplicationSchema = z
  .object({
    vehicleNumber: z
      .string()
      .trim()
      .toUpperCase()
      .refine(
        (value) =>
          !value ||
          /^[A-Z0-9 -]{3,20}$/.test(value),
        "Enter a valid vehicle number (3–20 characters)."
      ),

    personName: text(150),

    aadhaarNumber: z
      .string()
      .trim()
      .refine(
        (value) =>
          !value ||
          /^\d{12}$/.test(value),
        "Aadhaar must have exactly 12 digits."
      ),

    permittedGateIds: z
      .array(positiveId)
      .max(11, "Select at most 11 gates.")
      .refine(
        (ids) =>
          new Set(ids).size === ids.length,
        "Duplicate gates are not allowed."
      )
      .default([]),

    vendorRemarks: text(1000),

    agreed: z
      .boolean()
      .refine(
        Boolean,
        "Confirm the information before submitting."
      ),

    items: z
      .array(materialItemSchema)
      .min(
        1,
        "Add at least one returnable or non-returnable material."
      )
      .max(60, "Add no more than 60 materials."),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (
      data.aadhaarNumber &&
      !data.personName
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["personName"],
        message:
          "Enter the person's name when providing Aadhaar.",
      });
    }

    const counts = {
      RETURNABLE: 0,
      NON_RETURNABLE: 0,
    };

    const seen = new Set();

    data.items.forEach((item, index) => {
      counts[item.materialType] += 1;

      const key =
        `${item.materialType}:` +
        item.name.toLowerCase();

      if (seen.has(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["items", index, "name"],
          message:
            "This material is already listed in the same category.",
        });
      }

      seen.add(key);
    });

    for (const [type, count] of Object.entries(counts)) {
      if (count > 30) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["items"],
          message:
            `Add no more than 30 ${
              type === "RETURNABLE"
                ? "returnable"
                : "non-returnable"
            } materials.`,
        });
      }
    }
  });

/*
 * The mode comes from the link response.
 * The backend independently enforces the stored mode.
 */
export function applicationSchemaForMode(mode) {
  return vendorApplicationSchema.superRefine(
    (data, ctx) => {
      if (
        !["DEPARTMENT", "VENDOR"].includes(mode)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["permittedGateIds"],
          message:
            "The link gate configuration is unavailable.",
        });

        return;
      }

      if (
        mode === "VENDOR" &&
        data.permittedGateIds.length === 0
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["permittedGateIds"],
          message: "Select at least one gate.",
        });
      }
    }
  );
}

export function formIssues(error) {
  const result = {};

  for (const issue of error.issues) {
    const key = issue.path.join(".");

    if (!result[key]) {
      result[key] = issue.message;
    }
  }

  return result;
}