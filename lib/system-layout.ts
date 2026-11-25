// Geometry for the installation picture: where every panel, cable, product
// photo and label sits, computed from the system's actual counts. Pure data,
// no React, so the web picture (components/proposal/SystemDiagram) and the PDF
// (lib/pdf/system-diagram-pdf) draw the same thing from the same numbers.

export type SystemPart = {
  name: string;
  count: number;
  imageUrl: string | null;
};

export type InstalledSystem = {
  panels: (SystemPart & { watts: number | null }) | null;
  inverter: (SystemPart & { kva: number | null }) | null;
  batteries: (SystemPart & { kwhEach: number | null }) | null;
  /** An all-in-one replaces the inverter and batteries. */
  generator: (SystemPart & { kva: number | null; kwh: number | null }) | null;
  /** Mounting, cabling, protection, listed under the picture. */
  accessories: { name: string; count: number }[];
};

export type Box = { x: number; y: number; w: number; h: number };
export type Tile = Box & { imageUrl: string | null; label: string };
export type TextLabel = { x: number; y: number; title: string; sub?: string; size: number };
export type Tag = { x: number; y: number; text: string };

export type WideLayout = {
  width: number;
  height: number;
  sun: { cx: number; cy: number; r: number };
  roof: Box;
  panelCells: Box[];
  rails: Box[];
  morePanels: { x: number; y: number; text: string } | null;
  dcBox: { x: number; y: number };
  /** DC runs (red/black pairs) and AC runs, as SVG path data. */
  dcRuns: string[];
  acRuns: string[];
  tiles: Tile[];
  house: Box;
  tags: Tag[];
  labels: TextLabel[];
  badge: { x: number; y: number; text: string } | null;
};

export const PANEL_ASPECT = 2.1; // module height / width, portrait
export const COLORS = {
  red: '#e5484d',
  black: '#2f343b',
  ac: '#3b82c4',
  orange: '#ff7a33',
  rail: '#9aa4b1',
  frame: '#d6dce5',
  cellLine: '#c9d6ea',
  window: '#cfe3fb',
};

const MAX_PANELS_DRAWN = 18;

export const kwpOf = (s: InstalledSystem) =>
  s.panels?.watts ? Math.round((s.panels.count * s.panels.watts) / 100) / 10 : null;
export const clip = (t: string, n: number) => (t.length > n ? `${t.slice(0, n - 1)}…` : t);
const hasAccessory = (s: InstalledSystem, re: RegExp) => s.accessories.some((a) => re.test(a.name));
export const hasDcProtection = (s: InstalledSystem) =>
  hasAccessory(s, /protect|isolat|breaker|dc box|combiner/i);

/** A one-line description for screen readers and PDF alt text. */
export function describeSystem(s: InstalledSystem) {
  const k = kwpOf(s);
  const parts = [`${s.panels!.count} solar panels${k ? ` (${k} kWp)` : ''}`];
  if (s.generator) parts.push('an all-in-one solar generator');
  if (s.inverter) parts.push(`an inverter${s.inverter.kva ? ` (${s.inverter.kva} kVA)` : ''}`);
  if (s.batteries) parts.push(`${s.batteries.count} ${s.batteries.count === 1 ? 'battery' : 'batteries'}`);
  return `Installation: ${parts.join(', ')}, wired to the home.`;
}

export function partLines(s: InstalledSystem) {
  const k = kwpOf(s);
  return {
    panels: `${s.panels!.count} × ${clip(s.panels!.name, 30)}`,
    panelsSub: k ? `${k} kWp solar array` : 'Solar array',
    inverter: s.inverter ? clip(s.inverter.name, 26) : '',
    inverterSub: s.inverter?.kva ? `Inverter · ${s.inverter.kva} kVA` : 'Inverter',
    battery: s.batteries ? `${s.batteries.count} × ${clip(s.batteries.name, 24)}` : '',
    batterySub: s.batteries?.kwhEach
      ? `Battery bank · ${Math.round(s.batteries.kwhEach * s.batteries.count * 10) / 10} kWh`
      : 'Battery bank',
    generator: s.generator ? clip(s.generator.name, 30) : '',
    generatorSub: s.generator
      ? ['All-in-one', s.generator.kva ? `${s.generator.kva} kVA` : null, s.generator.kwh ? `${Math.round(s.generator.kwh * 10) / 10} kWh` : null]
          .filter(Boolean)
          .join(' · ')
      : '',
  };
}

/** N modules in rows inside a box, each row on two mounting rails. */
export function panelGrid(count: number, area: Box) {
  const shown = Math.min(count, MAX_PANELS_DRAWN);
  const rowsWanted = shown <= 6 ? 1 : shown <= 12 ? 2 : 3;
  const cols = Math.ceil(shown / rowsWanted);
  const rows = Math.ceil(shown / cols);
  const gapX = 5;
  const gapY = 12;
  let cw = (area.w - (cols - 1) * gapX) / cols;
  let ch = cw * PANEL_ASPECT;
  if (rows * ch + (rows - 1) * gapY > area.h) {
    ch = (area.h - (rows - 1) * gapY) / rows;
    cw = ch / PANEL_ASPECT;
  }
  const gridW = cols * cw + (cols - 1) * gapX;
  const gridH = rows * ch + (rows - 1) * gapY;
  const ox = area.x + (area.w - gridW) / 2;
  const oy = area.y + (area.h - gridH) / 2;

  const cells: Box[] = [];
  const rails: Box[] = [];
  for (let r = 0; r < rows; r++) {
    const inRow = Math.min(cols, shown - r * cols);
    const rowW = inRow * cw + (inRow - 1) * gapX;
    const rx = ox + (gridW - rowW) / 2;
    const ry = oy + r * (ch + gapY);
    for (const f of [0.22, 0.78]) rails.push({ x: rx - 8, y: ry + ch * f - 2, w: rowW + 16, h: 4 });
    for (let c = 0; c < inRow; c++) cells.push({ x: rx + c * (cw + gapX), y: ry, w: cw, h: ch });
  }
  const morePanels =
    count > shown ? { x: area.x + area.w - 4, y: area.y + 14, text: `+${count - shown} more` } : null;
  return { cells, rails, morePanels };
}

/** The wide picture (tablet, desktop and the PDF): 960 × 470 units. */
export function wideLayout(s: InstalledSystem): WideLayout {
  const L = partLines(s);
  const roof = { x: 24, y: 70, w: 400, h: 262 };
  const grid = panelGrid(s.panels!.count, { x: 44, y: 88, w: 360, h: 226 });
  const labels: TextLabel[] = [{ x: 224, y: 362, title: L.panels, sub: L.panelsSub, size: 17 }];
  const tags: Tag[] = [];
  const tiles: Tile[] = [];
  const dcRuns: string[] = [];
  const acRuns: string[] = [];
  let badge: WideLayout['badge'] = null;
  let dcBox: WideLayout['dcBox'];
  let house: Box;

  if (s.generator) {
    dcBox = { x: 470, y: 177 };
    dcRuns.push('M424 200 H470 M506 200 H560');
    tags.push({ x: 492, y: 168, text: 'SOLAR DC' });
    tiles.push({ x: 560, y: 96, w: 180, h: 250, imageUrl: s.generator.imageUrl, label: s.generator.name });
    labels.push({ x: 650, y: 374, title: L.generator, sub: L.generatorSub, size: 17 });
    acRuns.push('M740 170 H790');
    tags.push({ x: 765, y: 160, text: 'AC' });
    house = { x: 790, y: 92, w: 150, h: 150 };
    labels.push({ x: 865, y: 270, title: 'Your home', sub: '230 V AC', size: 17 });
  } else {
    dcBox = { x: 452, y: 177 };
    dcRuns.push('M424 200 H452 M488 200 H520');
    tags.push({ x: 470, y: 168, text: 'SOLAR DC' });
    tiles.push({ x: 520, y: 84, w: 150, h: 230, imageUrl: s.inverter?.imageUrl ?? null, label: s.inverter?.name ?? 'Inverter' });
    labels.push({ x: 595, y: 342, title: L.inverter, sub: L.inverterSub, size: 17 });
    acRuns.push('M670 130 H776');
    tags.push({ x: 722, y: 120, text: 'AC 230 V' });
    house = { x: 776, y: 52, w: 150, h: 140 };
    labels.push({ x: 851, y: 216, title: 'Your home', sub: 'Lights, sockets, appliances', size: 17 });

    if (s.batteries) {
      dcRuns.push('M670 268 H700 V372 H716');
      tags.push({ x: 690, y: 262, text: 'BATTERY DC' });
      const bank = { x: 716, y: 276, w: 224, h: 124 };
      const shown = Math.min(s.batteries.count, 3);
      const gap = 8;
      const tw = (bank.w - (shown - 1) * gap) / shown;
      for (let i = 0; i < shown; i++) {
        tiles.push({ x: bank.x + i * (tw + gap), y: bank.y, w: tw, h: bank.h, imageUrl: s.batteries.imageUrl, label: s.batteries.name });
      }
      if (s.batteries.count > shown) badge = { x: bank.x + bank.w - 46, y: bank.y - 12, text: `×${s.batteries.count}` };
      labels.push({ x: 828, y: 426, title: L.battery, sub: L.batterySub, size: 17 });
    }
  }
  if (hasDcProtection(s)) tags.push({ x: dcBox.x + 18, y: dcBox.y + 62, text: 'DC protection' });

  return {
    width: 960,
    height: 470,
    sun: { cx: 52, cy: 44, r: 34 },
    roof,
    panelCells: grid.cells,
    rails: grid.rails,
    morePanels: grid.morePanels,
    dcBox,
    dcRuns,
    acRuns,
    tiles,
    house,
    tags,
    labels,
    badge,
  };
}

/** The house's parts: roof triangle, body, two windows and a door. */
export function houseParts(h: Box) {
  const roofH = h.h * 0.38;
  return {
    roof: `M${h.x} ${h.y + roofH} L${h.x + h.w / 2} ${h.y} L${h.x + h.w} ${h.y + roofH} Z`,
    body: { x: h.x + h.w * 0.1, y: h.y + roofH, w: h.w * 0.8, h: h.h - roofH },
    windows: [
      { x: h.x + h.w * 0.2, y: h.y + roofH + 14, w: h.w * 0.2, h: h.w * 0.16 },
      { x: h.x + h.w * 0.6, y: h.y + roofH + 14, w: h.w * 0.2, h: h.w * 0.16 },
    ],
    door: { x: h.x + h.w * 0.42, y: h.y + h.h - h.w * 0.3, w: h.w * 0.16, h: h.w * 0.3 },
  };
}

/** The lightning mark on the DC protection box. */
export const dcBoxBolt = (x: number, y: number) => `M${x + 20} ${y + 10} l-7 14 h6 l-3 12 l9 -16 h-6 z`;
