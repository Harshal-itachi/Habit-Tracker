import { z } from "zod";
import { isValidTimezone } from "@/lib/timezone";

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name cannot exceed 100 characters"),

  email: z
    .string()
    .trim()
    .email("Please provide a valid email address")
    .transform((value) => value.toLowerCase()),

  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password cannot exceed 100 characters"),

  timezone: z
    .string()
    .trim()
    .refine(
      (timezone) => isValidTimezone(timezone),
      "Please provide a valid IANA timezone"
    ),
});