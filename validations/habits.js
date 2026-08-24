import { z } from "zod";

export const createHabitSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Habit name is required")
    .max(100, "Habit name cannot exceed 100 characters"),

  description: z
    .string()
    .trim()
    .max(500, "Description cannot exceed 500 characters")
    .optional()
    .default(""),
});

export const updateHabitSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Habit name is required")
      .max(100, "Habit name cannot exceed 100 characters")
      .optional(),

    description: z
      .string()
      .trim()
      .max(500, "Description cannot exceed 500 characters")
      .optional(),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    {
      message: "At least one field is required",
    }
  );