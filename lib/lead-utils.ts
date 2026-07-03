// Helpers for reading lead snapshots. Snapshots are frozen JSON from the day
// the lead was submitted — older leads may predate the current result shape,
// so every access here is defensive.

export interface SnapshotAppliance {
  name: string;
  wattage: number;
  hoursPerDay: number;
  quantity: number;
}

export interface LeadInputSnapshot {
  appliances?: SnapshotAppliance[];
  backupHours?: number;
  batteryPreference?: string;
  monthlyElectricityBillNaira?: number;
  monthlyFuelCostNaira?: number;
  generatorCapacityKva?: number;
  generatorHoursPerDay?: number;
  referralSource?: string;
}

export interface LeadResultSnapshot {
  totalLoadW?: number;
  dailyEnergyWh?: number;
  requirements?: {
    inverterKva?: number;
    batteryBankKwh?: number;
    panelArrayKwp?: number;
  };
  inverter?: { capacityKva?: number; brand?: string; model?: string; priceKobo?: number } | null;
  batteries?: {
    totalCapacityKwh?: number;
    count?: number;
    brand?: string;
    model?: string;
    unitPriceKobo?: number;
    totalPriceKobo?: number;
  } | null;
  panels?: {
    totalKwp?: number;
    count?: number;
    wattsPerPanel?: number;
    brand?: string;
    model?: string;
    unitPriceKobo?: number;
    totalPriceKobo?: number;
  } | null;
  generator?: {
    capacityKva?: number;
    storageKwh?: number;
    brand?: string;
    model?: string;
    priceKobo?: number;
  } | null;
  accessories?: { name?: string; quantity?: number; unitPriceKobo?: number; totalPriceKobo?: number }[];
  pricing?: {
    installationFeeKobo?: number;
    subtotalKobo?: number;
    markupKobo?: number;
    totalKobo?: number;
  } | null;
  catalogComplete?: boolean;
}

export function parseInputSnapshot(json: unknown): LeadInputSnapshot {
  return (json ?? {}) as LeadInputSnapshot;
}

export function parseResultSnapshot(json: unknown): LeadResultSnapshot {
  return (json ?? {}) as LeadResultSnapshot;
}

/** Compact one-line system summary, e.g. "3.5kVA · 7kWh · 2.7kWp" */
export function systemSummary(result: LeadResultSnapshot): string {
  if (result.generator?.capacityKva) {
    const pan = result.panels?.totalKwp
      ? `${result.panels.totalKwp}kWp`
      : result.requirements?.panelArrayKwp
        ? `~${result.requirements.panelArrayKwp}kWp`
        : '?kWp';
    return `${result.generator.capacityKva}kVA/${result.generator.storageKwh ?? '?'}kWh gen · ${pan}`;
  }
  const inv = result.inverter?.capacityKva
    ? `${result.inverter.capacityKva}kVA`
    : result.requirements?.inverterKva
      ? `~${result.requirements.inverterKva}kVA`
      : '?kVA';
  const bat = result.batteries?.totalCapacityKwh
    ? `${result.batteries.totalCapacityKwh}kWh`
    : result.requirements?.batteryBankKwh
      ? `~${result.requirements.batteryBankKwh}kWh`
      : '?kWh';
  const pan = result.panels?.totalKwp
    ? `${result.panels.totalKwp}kWp`
    : result.requirements?.panelArrayKwp
      ? `~${result.requirements.panelArrayKwp}kWp`
      : '?kWp';
  return `${inv} · ${bat} · ${pan}`;
}

export const LEAD_STATUS_LABELS: Record<string, string> = {
  NEW: 'New',
  VIEWED: 'Viewed',
  PROPOSAL_SENT: 'Proposal sent',
  CONVERTED: 'Converted',
  LOST: 'Lost',
};
