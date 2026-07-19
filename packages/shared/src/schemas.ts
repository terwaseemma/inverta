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

// Catalog item — used by the dashboard catalog editor. Prices come in as
// naira from the form and get converted to kobo at the server boundary.
export const catalogItemSchema = z
  .object({
    type: z.enum(['INVERTER', 'BATTERY', 'PANEL', 'GENERATOR', 'ACCESSORY']),
    brand: z.string().min(1, 'Brand is required').max(60),
    model: z.string().min(1, 'Model is required').max(80),
    capacity: z.number().positive('Capacity must be positive').max(1_000_000),
    unit: z.enum(['KVA', 'KWH', 'AH', 'W', 'UNIT']),
    voltage: z.number().int().positive().max(1000).optional(),
    systemVoltage: z
      .number()
      .int()
      .refine((v) => [12, 24, 48].includes(v), 'System voltage must be 12, 24, or 48')
      .optional(),
    storageKwh: z.number().positive().max(10_000).optional(),
    chemistry: z.enum(['LITHIUM', 'AGM', 'GEL']).optional(),
    priceNaira: z.number().min(0, 'Price is required').max(1_000_000_000),
    notes: z.string().max(200).optional(),
  })
  .superRefine((val, ctx) => {
    const unitByType: Record<string, string[]> = {
      INVERTER: ['KVA'],
      PANEL: ['W'],
      ACCESSORY: ['UNIT'],
      BATTERY: ['KWH', 'AH'],
      GENERATOR: ['KVA'],
    };
    if (!unitByType[val.type]!.includes(val.unit)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['unit'],
        message: `Unit ${val.unit} is not valid for ${val.type.toLowerCase()}s.`,
      });
    }
    if (val.type === 'BATTERY') {
      if (!val.chemistry) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['chemistry'],
          message: 'Chemistry is required for batteries.',
        });
      }
      if (val.unit === 'AH' && !val.voltage) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['voltage'],
          message: 'Voltage is required for Ah-rated batteries.',
        });
      }
    }
    if (val.type === 'GENERATOR' && !val.storageKwh) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['storageKwh'],
        message: 'Built-in battery capacity (kWh) is required for solar generators.',
      });
    }
  });
export type CatalogItemInput = z.infer<typeof catalogItemSchema>;

// Settings — business profile (name/contact/etc. editable post-onboarding)
export const settingsProfileSchema = z.object({
  businessName: z.string().min(2).max(80),
  contactName: z.string().min(2).max(80),
  phone: phoneSchema,
  region: z.string().min(2).max(40),
  logoUrl: z.string().url().optional().or(z.literal('').transform(() => undefined)),
  websiteUrl: z.string().url().optional().or(z.literal('').transform(() => undefined)),
  address: z.string().max(200).optional().or(z.literal('').transform(() => undefined)),
  bio: z.string().max(500).optional().or(z.literal('').transform(() => undefined)),
});
export type SettingsProfileInput = z.infer<typeof settingsProfileSchema>;

// Settings — pricing controls that feed every quote
export const settingsPricingSchema = z
  .object({
    markupPercent: z.number().min(0, 'Cannot be negative').max(100),
    feeMode: z.enum(['flat', 'percent']),
    installationFeeNaira: z.number().min(0).max(1_000_000_000).optional(),
    installationFeePercent: z.number().min(0).max(100).optional(),
  })
  .superRefine((val, ctx) => {
    if (val.feeMode === 'flat' && val.installationFeeNaira == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['installationFeeNaira'],
        message: 'Enter the flat installation fee.',
      });
    }
    if (val.feeMode === 'percent' && val.installationFeePercent == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['installationFeePercent'],
        message: 'Enter the installation fee percentage.',
      });
    }
  });
export type SettingsPricingInput = z.infer<typeof settingsPricingSchema>;

// Settings — payment details printed on proposals
export const settingsPaymentSchema = z.object({
  bankName: z.string().max(60).optional().or(z.literal('').transform(() => undefined)),
  bankAccountNumber: z
    .string()
    .regex(/^\d{6,20}$/, 'Digits only (6–20)')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  bankAccountName: z.string().max(80).optional().or(z.literal('').transform(() => undefined)),
});
export type SettingsPaymentInput = z.infer<typeof settingsPaymentSchema>;

// Settings — public calculator link
export const calculatorLinkSchema = z.object({
  slug: z
    .string()
    .min(3, 'At least 3 characters')
    .max(60)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Lowercase letters, numbers, and hyphens only'),
  isActive: z.boolean(),
});
export type CalculatorLinkInput = z.infer<typeof calculatorLinkSchema>;

// Store products
export const productSchema = z.object({
  type: z.enum(['GENERATOR', 'KIT', 'PART']),
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional().or(z.literal('').transform(() => undefined)),
  priceNaira: z.number().min(0).max(1_000_000_000),
  imageUrl: z.string().url().optional().or(z.literal('').transform(() => undefined)),
  isAvailable: z.boolean(),
});
export type ProductInput = z.infer<typeof productSchema>;

// Proposal editor line items
export const proposalLineItemSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(200).optional(),
  quantity: z.number().int().min(1).max(10_000),
  unitPriceNaira: z.number().min(0).max(1_000_000_000),
});

export const proposalUpdateSchema = z.object({
  customMessage: z
    .string()
    .max(1000)
    .optional()
    .or(z.literal('').transform(() => undefined)),
  items: z.array(proposalLineItemSchema).min(1, 'At least one line item'),
});
export type ProposalUpdateInput = z.infer<typeof proposalUpdateSchema>;

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
