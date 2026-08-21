import { PrismaClient, BatteryChemistry, CapacityUnit, CatalogItemType } from '@prisma/client';
import { APPLIANCE_PRESETS } from '@inverta/shared';

const prisma = new PrismaClient();

// Presets come from @inverta/shared so this table can never drift from the
// list the calculator actually uses. The engine's duty-cycle and surge data
// lives only in the shared array — the DB copy is reference data.

async function seedPresets() {
  for (const p of APPLIANCE_PRESETS) {
    await prisma.appliancePreset.upsert({
      where: { name: p.name },
      update: { defaultWattageW: p.defaultWattageW, category: p.category },
      create: p,
    });
  }
  console.log(`✓ Seeded ${APPLIANCE_PRESETS.length} appliance presets`);
}

async function seedDemoInstaller() {
  const installer = await prisma.installer.upsert({
    where: { email: 'demo@inverta.app' },
    update: {},
    create: {
      businessName: 'Demo Solar Co.',
      slug: 'demo-solar',
      contactName: 'Chidi Okeke',
      email: 'demo@inverta.app',
      phone: '+2348012345678',
      region: 'Lagos',
      bio: 'Sample tenant for demos and local development.',
      markupPercent: 15,
      installationFeeKobo: 150_000_00, // NGN 150,000
      emailVerifiedAt: new Date(),
      onboardedAt: new Date(),
      calculatorLink: {
        create: { slug: 'demo-solar' },
      },
    },
  });

  const existing = await prisma.catalogItem.count({ where: { installerId: installer.id } });
  if (existing > 0) {
    console.log(`✓ Demo installer already has ${existing} catalog items — skipping catalog seed`);
    return;
  }

  await prisma.catalogItem.createMany({
    data: [
      // Inverters (kVA)
      { installerId: installer.id, type: CatalogItemType.INVERTER, brand: 'Luminous',  model: 'Cruze+ 2.5kVA',  capacity: 2.5, unit: CapacityUnit.KVA, priceKobo:  350_000_00 },
      { installerId: installer.id, type: CatalogItemType.INVERTER, brand: 'Luminous',  model: 'Cruze+ 3.5kVA',  capacity: 3.5, unit: CapacityUnit.KVA, priceKobo:  520_000_00 },
      { installerId: installer.id, type: CatalogItemType.INVERTER, brand: 'Must',      model: 'PV18-5kVA',      capacity: 5.0, unit: CapacityUnit.KVA, priceKobo:  780_000_00 },
      { installerId: installer.id, type: CatalogItemType.INVERTER, brand: 'Growatt',   model: 'SPF 7.5kVA',     capacity: 7.5, unit: CapacityUnit.KVA, priceKobo: 1_200_000_00 },
      { installerId: installer.id, type: CatalogItemType.INVERTER, brand: 'Growatt',   model: 'SPF 10kVA',      capacity:10.0, unit: CapacityUnit.KVA, priceKobo: 1_700_000_00 },

      // Batteries (kWh)
      { installerId: installer.id, type: CatalogItemType.BATTERY,  brand: 'Pylontech', model: 'US3000C 3.5kWh', capacity: 3.55, unit: CapacityUnit.KWH, chemistry: BatteryChemistry.LITHIUM, priceKobo: 1_100_000_00 },
      { installerId: installer.id, type: CatalogItemType.BATTERY,  brand: 'Dyness',    model: 'B4850 2.4kWh',   capacity: 2.4,  unit: CapacityUnit.KWH, chemistry: BatteryChemistry.LITHIUM, priceKobo:   750_000_00 },
      { installerId: installer.id, type: CatalogItemType.BATTERY,  brand: 'Trojan',    model: 'T-105 225Ah 6V', capacity: 225,  unit: CapacityUnit.AH,  voltage: 6, chemistry: BatteryChemistry.AGM,    priceKobo:   180_000_00 },
      { installerId: installer.id, type: CatalogItemType.BATTERY,  brand: 'Ritar',     model: 'DC12-200 200Ah', capacity: 200,  unit: CapacityUnit.AH,  voltage: 12, chemistry: BatteryChemistry.AGM,   priceKobo:   260_000_00 },

      // Panels (W per panel)
      { installerId: installer.id, type: CatalogItemType.PANEL,    brand: 'Canadian Solar', model: 'HiKu 450W', capacity: 450, unit: CapacityUnit.W, priceKobo: 115_000_00 },
      { installerId: installer.id, type: CatalogItemType.PANEL,    brand: 'JA Solar',       model: 'JAM72S30 550W', capacity: 550, unit: CapacityUnit.W, priceKobo: 150_000_00 },

      // Accessories
      { installerId: installer.id, type: CatalogItemType.ACCESSORY, brand: 'Generic', model: 'MC4 connectors (pair)', capacity: 1, unit: CapacityUnit.UNIT, priceKobo:   5_000_00 },
      { installerId: installer.id, type: CatalogItemType.ACCESSORY, brand: 'Generic', model: '6mm solar cable (meter)', capacity: 1, unit: CapacityUnit.UNIT, priceKobo:   2_500_00 },
      { installerId: installer.id, type: CatalogItemType.ACCESSORY, brand: 'Generic', model: 'Aluminum rail mount kit (panel)', capacity: 1, unit: CapacityUnit.UNIT, priceKobo:  25_000_00 },
      { installerId: installer.id, type: CatalogItemType.ACCESSORY, brand: 'Generic', model: 'DC breaker + fuse box', capacity: 1, unit: CapacityUnit.UNIT, priceKobo:  45_000_00 },
    ],
  });

  console.log(`✓ Demo installer seeded — slug: demo-solar, email: demo@inverta.app`);
  console.log(`  Try the calculator at /calc/demo-solar`);
}

async function main() {
  await seedPresets();
  await seedDemoInstaller();
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
