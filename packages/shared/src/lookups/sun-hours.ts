// Peak Sun Hours (PSH) by Nigerian state — WORST-MONTH DESIGN VALUES.
//
// These are deliberately NOT annual averages. Sizing an array on the annual
// average produces a system that under-delivers through the rainy season:
// a Lagos array designed at 4.0 PSH receives closer to 3.0 in July, and the
// customer experiences that as "the solar stopped working" — the single most
// common sizing mistake in Nigerian solar design.
//
// Design for the worst month and the system has surplus the rest of the year,
// which charges the battery faster and buys margin on cloudy days.
//
// Source: Ojobaro, "Backup & Off-Grid Solar Design Made Easy" (2nd ed., 2026),
// Ch.6 §6.3, worst-month design column. States without a listed city are
// interpolated from the nearest listed city with similar latitude and rainfall.

export const NIGERIAN_SUN_HOURS: Record<string, number> = {
  // --- South-south / Niger Delta: wettest, lowest design PSH ---
  Bayelsa: 3.0,
  Rivers: 3.0, // Port Harcourt
  'Akwa Ibom': 3.0,
  'Cross River': 3.0, // Calabar
  Delta: 3.5,

  // --- South-east ---
  Imo: 3.5, // Owerri
  Abia: 3.7,
  Anambra: 3.9,
  Enugu: 4.0,
  Ebonyi: 4.0,

  // --- South-west ---
  Lagos: 3.5,
  Ogun: 3.8,
  Ondo: 3.8,
  Oyo: 4.0, // Ibadan
  Osun: 4.0,
  Ekiti: 4.0,
  Edo: 4.0, // Benin City

  // --- Middle belt ---
  Kogi: 4.5,
  Benue: 4.5,
  Kwara: 4.5, // Ilorin
  Nasarawa: 4.8,
  Taraba: 4.8,
  FCT: 5.0, // Abuja
  Plateau: 5.0, // Jos
  Niger: 5.0,
  Adamawa: 5.0, // Yola

  // --- North ---
  Kaduna: 5.0,
  Bauchi: 5.2,
  Gombe: 5.2,
  Borno: 5.3, // Maiduguri
  Yobe: 5.3,
  Zamfara: 5.4,
  Kano: 5.5,
  Jigawa: 5.5,
  Katsina: 5.5,
  Kebbi: 5.5,
  Sokoto: 5.5,
};

export const NIGERIAN_STATES = Object.keys(NIGERIAN_SUN_HOURS).sort();

export function sunHoursForRegion(region: string | null | undefined): number | undefined {
  if (!region) return undefined;
  return NIGERIAN_SUN_HOURS[region];
}
