import { z } from 'zod';

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
