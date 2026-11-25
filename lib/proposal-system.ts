import 'server-only';

import { prisma } from '@/lib/prisma';
import { parseResultSnapshot } from '@/lib/lead-utils';

// What a proposal installs, assembled for the installation picture
// (components/proposal/SystemDiagram). Read from the proposal's own line items,
// so the installer's edits (another battery, a different panel count) show up;
// each line is matched to the installer's catalog by its "brand model" name,
// which is how proposal lines are created, for its photo and type. Lines that
// match nothing fall back to their description ("Inverter", "Battery", ...).

export type { InstalledSystem, SystemPart } from '@/lib/system-layout';
import type { InstalledSystem } from '@/lib/system-layout';

type Line = { name: string; description: string | null; quantity: number };

const kindFromText = (text: string) => {
  const t = text.toLowerCase();
  if (t.includes('all-in-one') || t.includes('solar generator')) return 'GENERATOR';
  if (t.includes('inverter')) return 'INVERTER';
  if (t.includes('battery') || t.includes('lifepo4')) return 'BATTERY';
  if (t.includes('panel') || t.includes('module')) return 'PANEL';
  return null;
};

export async function getInstalledSystem(proposal: {
  installerId: string;
  items: Line[];
  lead: { resultSnapshot: unknown } | null;
}): Promise<InstalledSystem | null> {
  const catalog = await prisma.catalogItem.findMany({
    where: { installerId: proposal.installerId },
    select: { type: true, brand: true, model: true, imageUrl: true, capacity: true, storageKwh: true },
  });
  const byName = new Map(catalog.map((c) => [`${c.brand} ${c.model}`.trim().toLowerCase(), c]));
  const snapshot = proposal.lead ? parseResultSnapshot(proposal.lead.resultSnapshot) : null;

  const system: InstalledSystem = { panels: null, inverter: null, batteries: null, generator: null, accessories: [] };

  for (const line of proposal.items) {
    if (line.quantity <= 0 || /^installation$/i.test(line.name.trim())) continue;
    const match = byName.get(line.name.trim().toLowerCase());
    const kind = match?.type ?? kindFromText(`${line.description ?? ''} ${line.name}`);
    const part = { name: line.name, count: line.quantity, imageUrl: match?.imageUrl ?? null };
    const capacity = match ? Number(match.capacity) : null;

    if (kind === 'PANEL' && !system.panels) {
      system.panels = { ...part, watts: capacity ?? snapshot?.panels?.wattsPerPanel ?? null };
    } else if (kind === 'INVERTER' && !system.inverter) {
      system.inverter = { ...part, kva: capacity ?? snapshot?.inverter?.capacityKva ?? null };
    } else if (kind === 'BATTERY' && !system.batteries) {
      const kwhEach = match
        ? match.storageKwh != null
          ? Number(match.storageKwh)
          : capacity
        : null;
      system.batteries = { ...part, kwhEach };
    } else if (kind === 'GENERATOR' && !system.generator) {
      system.generator = {
        ...part,
        kva: capacity ?? snapshot?.generator?.capacityKva ?? null,
        kwh: match?.storageKwh != null ? Number(match.storageKwh) : snapshot?.generator?.storageKwh ?? null,
      };
    } else if (kind === 'ACCESSORY' || kind === null) {
      system.accessories.push({ name: line.name, count: line.quantity });
    }
  }

  // Without panels and a power unit there's no installation to draw.
  const hasPower = system.generator || system.inverter;
  if (!system.panels || !hasPower) return null;
  return system;
}
