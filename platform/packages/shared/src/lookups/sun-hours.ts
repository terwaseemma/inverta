// Average peak-sun hours per day by Nigerian state.
// Used when an installer hasn't overridden the value at onboarding.
// Numbers are reasonable approximations drawn from NIMET insolation data —
// good enough for MVP sizing, not intended as an engineering reference.

export const NIGERIAN_SUN_HOURS: Record<string, number> = {
  Abia: 4.8,
  Adamawa: 6.2,
  'Akwa Ibom': 4.6,
  Anambra: 5.0,
  Bauchi: 6.3,
  Bayelsa: 4.4,
  Benue: 5.6,
  Borno: 6.6,
  'Cross River': 4.6,
  Delta: 4.7,
  Ebonyi: 5.1,
  Edo: 4.9,
  Ekiti: 5.2,
  Enugu: 5.1,
  FCT: 5.8,
  Gombe: 6.2,
  Imo: 4.8,
  Jigawa: 6.5,
  Kaduna: 6.0,
  Kano: 6.4,
  Katsina: 6.5,
  Kebbi: 6.3,
  Kogi: 5.5,
  Kwara: 5.6,
  Lagos: 5.0,
  Nasarawa: 5.7,
  Niger: 5.9,
  Ogun: 5.0,
  Ondo: 5.0,
  Osun: 5.1,
  Oyo: 5.3,
  Plateau: 6.1,
  Rivers: 4.4,
  Sokoto: 6.5,
  Taraba: 5.9,
  Yobe: 6.5,
  Zamfara: 6.2,
};

export const NIGERIAN_STATES = Object.keys(NIGERIAN_SUN_HOURS).sort();

export function sunHoursForRegion(region: string | null | undefined): number | undefined {
  if (!region) return undefined;
  return NIGERIAN_SUN_HOURS[region];
}
