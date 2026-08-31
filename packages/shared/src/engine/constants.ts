// Engine tuning constants — pulled out so they can be tweaked in one place
// and referenced in tests.
//
// Values follow Ojobaro, "Backup & Off-Grid Solar Design Made Easy"
// (2nd ed., 2026), Ch.4–6.

/**
 * Aggregate power factor for mixed residential/small-commercial loads.
 * Inverters are rated in kVA (apparent power) but appliances are rated in W
 * (real power). Motors and compressors draw reactive current the inverter
 * must still supply, so required VA = W ÷ power factor. Skipping this step
 * is the classic cause of an inverter that overloads as soon as the fridge
 * and AC run together.
 */
export const AGGREGATE_POWER_FACTOR = 0.8;

/**
 * Headroom for organic load growth — a family that runs one AC today runs
 * two in three years. Standard practice is 20%.
 */
export const FUTURE_LOAD_RESERVE = 1.2;

/**
 * Surge a quality inverter can deliver for a few seconds, as a multiple of
 * its continuous rating. Used to check the chosen unit can actually START
 * the customer's compressors, not merely run them once spinning. Catalogue
 * entries carry no surge column, so this is the conservative industry
 * default (good units quote 2× for ~5 seconds).
 */
export const INVERTER_SURGE_MULTIPLE = 2;

/**
 * How far above the required size a quoted inverter may sit before the
 * customer is told about it. A catalog gap is the usual cause: when the
 * smallest stocked unit covering a 2.75 kVA load is 15 kVA, the system
 * works but costs far more than the load warrants. Saying so is better
 * than quoting it silently — the other inverter warnings only fire when
 * stock is too SMALL, which left the opposite case invisible.
 *
 * Both thresholds must be met. The ratio alone would nag on every small
 * home: a 360W load needs 0.54 kVA and the smallest unit anyone actually
 * manufactures is 1–2 kVA, which is a 3× "oversize" that no installer can
 * do anything about. The absolute floor keeps the warning for gaps that
 * cost the customer real money.
 */
export const INVERTER_OVERSIZE_WARN_MULTIPLE = 2;
export const INVERTER_OVERSIZE_WARN_MIN_GAP_KVA = 2;

/**
 * How much dearer a SAME-BRAND inverter + battery pair may be before the
 * cheaper mixed-brand pair wins instead.
 *
 * Hybrid inverters and LiFePO4 packs normally negotiate over CAN or RS485 so
 * the inverter reads true state of charge from the pack's BMS. Cross-brand
 * pairs often fail to negotiate and the inverter falls back to inferring SOC
 * from terminal voltage — worse charge control, and an argument with two
 * warranty departments. Worth a modest premium to avoid.
 *
 * A preference, not a rule: when no same-brand pair is stocked, or it costs
 * more than this, the cheapest compatible pair is still quoted.
 */
export const SAME_BRAND_PREMIUM = 0.1; // 10%

/**
 * Oversizing on the solar array. Covers panel temperature derating (panels
 * run 50–70°C in Nigeria against a 25°C rating), soiling, and cable losses.
 */
export const PANEL_OVERSIZE_FACTOR = 1.25;

/**
 * PV a hybrid inverter can usefully carry, as a fraction of its kVA rating.
 *
 * Sizing the array on consumption alone answers "what does the household
 * use?" and ignores "can this system refill its own battery?". A 4.2kVA unit
 * with an 8kWh bank was being quoted two panels because the customer reported
 * light usage — an array that covers the day's load and leaves nothing to
 * recover the bank after an outage.
 *
 * Used as a FLOOR, never a cap: heavy consumers still get the larger array
 * their usage demands. Strictly this should read the unit's real MPPT rating,
 * but the catalogue carries no PV-input column, and output kVA is the
 * available proxy — hybrid units in this market accept roughly their own
 * rating in PV.
 */
export const PV_TO_INVERTER_RATIO = 0.85;

/** Battery round-trip efficiency — lithium recovers far more of what it stores. */
export const ROUNDTRIP_EFFICIENCY_LITHIUM = 0.95;
export const ROUNDTRIP_EFFICIENCY_LEAD_ACID = 0.85;

// Depth of Discharge (DOD): how deeply you should discharge each cycle.
// Draining a lead-acid battery to 80% instead of 50% cuts its cycle life by
// 60–80%; lithium is built to be cycled deeply.
export const DOD_LITHIUM = 0.8;
export const DOD_LEAD_ACID = 0.5;

/**
 * Practical ceiling on parallel battery strings. Lead-acid strings share
 * current unevenly — the far string chronically undercharges and sulphates —
 * so three is the accepted industry limit. Lithium modules have a BMS that
 * balances actively, so more are fine.
 */
export const MAX_PARALLEL_STRINGS_LEAD_ACID = 3;
export const MAX_PARALLEL_STRINGS_LITHIUM = 8;

// Default Nigerian solar insolation if the installer's region lookup misses.
// Conservative on purpose — see lookups/sun-hours.ts on worst-month design.
export const DEFAULT_SUN_HOURS = 4.0;

// How much more an all-in-one solar generator may cost than the EQUIVALENT-
// CAPACITY inverter + battery bank and still be recommended. One box means
// simpler wiring, a single warranty, one supplier to chase, and far less that
// can be installed wrong — worth a real premium over loose components.
//
// Measured against components matched to the all-in-one's own kVA and kWh,
// not against the smallest build that clears the load. Comparing a 1.5kVA /
// 4kWh unit against a 1.2kVA / 2.56kWh build charges it for capacity the
// customer is also receiving, and no all-in-one ever wins that comparison.
export const INTEGRATED_SYSTEM_PREMIUM = 0.25; // 25%

/**
 * Ceiling on what an all-in-one may add to the price the customer would
 * otherwise have paid for right-sized components.
 *
 * The equivalent-capacity test above asks "is this unit good value for what
 * it is?" — it does NOT ask "can the customer afford the difference?". On its
 * own it would let a 3.6kVA / 8kWh unit priced against 3.6kVA / 8kWh of
 * components beat a 0.54kVA build the customer actually needed, tripling the
 * quote. All-in-ones come in coarse sizes, so some uplift over a minimal
 * build is unavoidable and expected; this bounds it.
 */
export const INTEGRATED_MAX_UPLIFT = 0.75; // 75% over the right-sized build

// Generator CO2 math (for the "you saved X kg CO2/month" card).
export const GEN_FUEL_CONSUMPTION_L_PER_KVA_HR = 0.3; // L/hr per kVA
export const DIESEL_CO2_KG_PER_L = 2.68;
export const DAYS_PER_MONTH = 30;

// Amortisation window for "is this cheaper than what I'm spending today?".
export const PAYBACK_HORIZON_YEARS = 5;
export const MONTHS_PER_YEAR = 12;
