import { z } from 'zod';

// Single source of truth for form/API I/O across the platform.
// Server actions re-run these server-side so we never trust the client.

const phoneSchema = z
  .string()
  .min(7, 'Phone number is too short')
  .max(32, 'Phone number is too long');

export const signupSchema = z.object({
  businessName: z.string().min(2, 'Business name is required').max(80),
  businessType: z.enum(['INSTALLER', 'VENDOR', 'BOTH']),
  contactName: z.string().min(2, 'Contact name is required').max(80),
  email: z.string().email(),
  phone: phoneSchema,
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password is too long'),
  region: z.string().min(2, 'Region is required').max(40),
});
export type SignupInput = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const onboardingStep1Schema = z.object({
  // Logo is optional for now — file upload to R2 lands in a later slice.
  logoUrl: z.string().url().optional().or(z.literal('').transform(() => undefined)),
  websiteUrl: z
    .string()
    .url()
    .optional()
    .or(z.literal('').transform(() => undefined)),
  address: z.string().max(200).optional().or(z.literal('').transform(() => undefined)),
  bio: z.string().max(500).optional().or(z.literal('').transform(() => undefined)),
});
export type OnboardingStep1Input = z.infer<typeof onboardingStep1Schema>;

// These schemas are the single source of truth for calculator form I/O.
// The Next.js form reuses them in react-hook-form; the API route re-runs them
// server-side so we never trust the client.

export const applianceSchema = z.object({
  name: z.string().min(1).max(80),
  wattage: z.number().positive().max(20_000),
  hoursPerDay: z.number().min(0.1).max(24),
  quantity: z.number().int().min(1).max(100),
});

export const calculatorSubmissionSchema = z.object({
  appliances: z.array(applianceSchema).min(1, 'Select at least one appliance'),
  backupHours: z.number().min(1).max(48),
  batteryPreference: z.enum(['lithium', 'agm', 'none']),

  // Customer contact (step 4)
  customerName: z.string().min(2).max(80),
  customerEmail: z.string().email(),
  customerPhone: z.string().min(7).max(32),
  referralSource: z.string().max(80).optional(),
  consent: z.literal(true, {
    errorMap: () => ({ message: 'Consent is required to contact the customer.' }),
  }),

  // Step 1 — optional spending / generator context
  monthlyElectricityBillNaira: z.number().min(0).optional(),
  monthlyFuelCostNaira: z.number().min(0).optional(),
  generatorCapacityKva: z.number().min(0).optional(),
  generatorHoursPerDay: z.number().min(0).max(24).optional(),
});

export type CalculatorSubmission = z.infer<typeof calculatorSubmissionSchema>;
export type ApplianceInput = z.infer<typeof applianceSchema>;
