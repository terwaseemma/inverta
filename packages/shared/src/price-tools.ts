// Bulk price tools for a catalog: adjust many prices at once, and read or
// write a price list as CSV so an installer can update prices in Excel when
// supplier prices move. Pure functions, shared by the browser preview and the
// server action, so what the preview shows is exactly what gets saved.

export type PriceAdjustment = {
  direction: 'up' | 'down';
  /** percent: value is a percentage. amount: value is naira per product. */
  mode: 'percent' | 'amount';
  value: number;
  /** Round the result to the nearest this many naira; 0 or 1 = no rounding. */
  roundToNaira: number;
};

/** The new price in kobo after an adjustment. Never below zero. */
export function adjustPriceKobo(priceKobo: number, a: PriceAdjustment): number {
  const sign = a.direction === 'up' ? 1 : -1;
  const next =
    a.mode === 'percent'
      ? priceKobo * (1 + (sign * a.value) / 100)
      : priceKobo + sign * a.value * 100;
  const step = Math.max(1, Math.round(a.roundToNaira)) * 100;
  const rounded = Math.round(next / step) * step;
  return Math.max(0, rounded);
}

export type PricedItem = { id: string; type?: string; brand: string; model: string; priceKobo: number };
export type PriceChange = { id: string; brand: string; model: string; oldKobo: number; newKobo: number };

/** Which items an adjustment would change, and to what (unchanged ones left out). */
export function previewAdjustment(items: PricedItem[], a: PriceAdjustment): PriceChange[] {
  return items
    .map((i) => ({ id: i.id, brand: i.brand, model: i.model, oldKobo: i.priceKobo, newKobo: adjustPriceKobo(i.priceKobo, a) }))
    .filter((c) => c.newKobo !== c.oldKobo);
}

// ── CSV price lists ───────────────────────────────────────────────────────

/** Split CSV text into rows of cells: quoted fields, commas and quotes inside quotes, CRLF. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  const src = text.replace(/^﻿/, ''); // Excel's byte-order mark
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ',' || ch === ';') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

/** "₦250,000", "250000", "250,000.50" -> 250000.5; anything else -> null. */
export function parseNaira(raw: string): number | null {
  const cleaned = raw.replace(/[₦N\s]/gi, '').replace(/,/g, '');
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return null;
  return Number(cleaned);
}

export type PriceListRow = { line: number; brand: string; model: string; priceNaira: number };
export type PriceListProblem = { line: number; message: string };

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

/**
 * Read a price list. Columns are found by header (brand, model, price; a
 * single "product" or "name" column holding "Brand Model" also works); with
 * no recognisable header the order is brand, model, price.
 */
export function readPriceList(text: string): { rows: PriceListRow[]; problems: PriceListProblem[] } {
  const table = parseCsv(text);
  const rows: PriceListRow[] = [];
  const problems: PriceListProblem[] = [];
  if (table.length === 0) return { rows, problems: [{ line: 1, message: 'The file is empty.' }] };

  const header = table[0].map(norm);
  const find = (...names: string[]) => header.findIndex((h) => names.some((n) => h === n || h.startsWith(`${n} `) || h.startsWith(`${n}(`)));
  let brandCol = find('brand', 'make', 'manufacturer');
  let modelCol = find('model', 'item', 'description');
  const nameCol = find('product', 'name', 'product name');
  let priceCol = find('price', 'unit price', 'selling price', 'amount', 'cost');
  let start = 1;
  if (priceCol === -1 && brandCol === -1 && modelCol === -1 && nameCol === -1) {
    // No header: brand, model, price.
    brandCol = 0;
    modelCol = 1;
    priceCol = 2;
    start = 0;
  }
  if (priceCol === -1) return { rows, problems: [{ line: 1, message: 'No price column found. Name it "price".' }] };
  if (brandCol === -1 && modelCol === -1 && nameCol === -1) {
    return { rows, problems: [{ line: 1, message: 'No product column found. Use "brand" and "model".' }] };
  }

  for (let r = start; r < table.length; r++) {
    const cells = table[r];
    const line = r + 1;
    const priceNaira = parseNaira(cells[priceCol] ?? '');
    let brand = brandCol >= 0 ? (cells[brandCol] ?? '').trim() : '';
    let model = modelCol >= 0 ? (cells[modelCol] ?? '').trim() : '';
    if (!brand && !model && nameCol >= 0) {
      model = (cells[nameCol] ?? '').trim();
    }
    if (!brand && !model) continue; // a blank or section row
    if (priceNaira == null) {
      problems.push({ line, message: `No valid price for "${[brand, model].filter(Boolean).join(' ')}".` });
      continue;
    }
    if (!brand && model) {
      // "Brand Model" in one cell: matched against the full name below.
      brand = '';
    }
    rows.push({ line, brand, model, priceNaira });
  }
  return { rows, problems };
}

/** Match price-list rows to catalog items by brand + model, ignoring case and spacing. */
export function matchPriceList(rows: PriceListRow[], items: PricedItem[]) {
  const byName = new Map<string, PricedItem>();
  for (const i of items) byName.set(norm(`${i.brand} ${i.model}`), i);
  const changes: PriceChange[] = [];
  const unmatched: PriceListRow[] = [];
  const seen = new Set<string>();
  let unchanged = 0;
  for (const row of rows) {
    const item = byName.get(norm(`${row.brand} ${row.model}`));
    if (!item) {
      unmatched.push(row);
      continue;
    }
    if (seen.has(item.id)) continue; // first row for a product wins
    seen.add(item.id);
    const newKobo = Math.round(row.priceNaira * 100);
    if (newKobo === item.priceKobo) unchanged++;
    else changes.push({ id: item.id, brand: item.brand, model: item.model, oldKobo: item.priceKobo, newKobo });
  }
  return { changes, unmatched, unchanged };
}

/** The catalog as a CSV price list, ready to edit in Excel and upload again. */
export function toPriceListCsv(items: PricedItem[]): string {
  const esc = (v: string) => (/[",;\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const lines = ['type,brand,model,price'];
  for (const i of items) {
    lines.push([i.type ?? '', i.brand, i.model, String(i.priceKobo / 100)].map(esc).join(','));
  }
  return `${lines.join('\r\n')}\r\n`;
}
