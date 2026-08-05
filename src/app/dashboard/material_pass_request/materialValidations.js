import { z } from "zod";

export const materialSchema = z.object({
    name: z
        .string()
        .trim()
        .min(1, "Please enter an item."),

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
            .number()
            .nullable()
            .refine((value) => value !== null && value > 0, {
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
            }),

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

        if (
            data.location === othersLocationId &&
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