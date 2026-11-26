import {
  adjustPriceKobo,
  matchPriceList,
  parseCsv,
  parseNaira,
  previewAdjustment,
  readPriceList,
  toPriceListCsv,
} from './price-tools';

const N = (naira: number) => naira * 100;

describe('adjustPriceKobo', () => {
  it('raises by a percentage', () => {
    expect(adjustPriceKobo(N(150_000), { direction: 'up', mode: 'percent', value: 10, roundToNaira: 0 })).toBe(N(165_000));
  });
  it('lowers by an amount', () => {
    expect(adjustPriceKobo(N(150_000), { direction: 'down', mode: 'amount', value: 5_000, roundToNaira: 0 })).toBe(N(145_000));
  });
  it('rounds to the nearest step', () => {
    // 150,000 × 1.07 = 160,500 -> nearest 1,000 = 161,000 (half rounds up)
    expect(adjustPriceKobo(N(150_000), { direction: 'up', mode: 'percent', value: 7, roundToNaira: 1_000 })).toBe(N(161_000));
    expect(adjustPriceKobo(N(152_300), { direction: 'up', mode: 'percent', value: 0, roundToNaira: 5_000 })).toBe(N(150_000));
  });
  it('never goes below zero', () => {
    expect(adjustPriceKobo(N(1_000), { direction: 'down', mode: 'amount', value: 5_000, roundToNaira: 0 })).toBe(0);
  });
});

describe('previewAdjustment', () => {
  it('lists only prices that change', () => {
    const items = [
      { id: 'a', brand: 'Jinko', model: '550W', priceKobo: N(150_000) },
      { id: 'b', brand: 'Free', model: 'Item', priceKobo: 0 },
    ];
    const changes = previewAdjustment(items, { direction: 'up', mode: 'percent', value: 10, roundToNaira: 0 });
    expect(changes).toEqual([{ id: 'a', brand: 'Jinko', model: '550W', oldKobo: N(150_000), newKobo: N(165_000) }]);
  });
});

describe('parseCsv / parseNaira', () => {
  it('handles quotes, commas inside quotes, CRLF and the Excel BOM', () => {
    expect(parseCsv('﻿brand,model,price\r\nWHC,"Hybrid 6.2kVA, 48V","₦460,000"\r\n')).toEqual([
      ['brand', 'model', 'price'],
      ['WHC', 'Hybrid 6.2kVA, 48V', '₦460,000'],
    ]);
  });
  it('reads naira amounts in common spellings', () => {
    expect(parseNaira('₦460,000')).toBe(460_000);
    expect(parseNaira('N 1,250,000.50')).toBe(1_250_000.5);
    expect(parseNaira('call us')).toBeNull();
  });
});

describe('readPriceList + matchPriceList', () => {
  const items = [
    { id: 'inv', type: 'INVERTER', brand: 'WHC', model: 'Hybrid 6.2kVA 48V', priceKobo: N(460_000) },
    { id: 'pan', type: 'PANEL', brand: 'Jinko', model: 'Mono 550W', priceKobo: N(150_000) },
  ];

  it('matches by brand and model regardless of case and spacing', () => {
    const { rows, problems } = readPriceList('Brand,Model,Price (₦)\nwhc , hybrid 6.2kva  48v,"480,000"\nJinko,Mono 550W,150000\nAcme,Unknown,1000\n');
    expect(problems).toEqual([]);
    const m = matchPriceList(rows, items);
    expect(m.changes).toEqual([{ id: 'inv', brand: 'WHC', model: 'Hybrid 6.2kVA 48V', oldKobo: N(460_000), newKobo: N(480_000) }]);
    expect(m.unchanged).toBe(1);
    expect(m.unmatched.map((u) => u.model)).toEqual(['Unknown']);
  });

  it('accepts a single product-name column', () => {
    const { rows } = readPriceList('product,price\nJinko Mono 550W,155000\n');
    expect(matchPriceList(rows, items).changes[0]).toMatchObject({ id: 'pan', newKobo: N(155_000) });
  });

  it('reports rows without a usable price', () => {
    const { problems } = readPriceList('brand,model,price\nJinko,Mono 550W,TBC\n');
    expect(problems[0]).toMatchObject({ line: 2 });
  });

  it('round-trips its own export', () => {
    const csv = toPriceListCsv(items);
    expect(csv.split('\r\n')[0]).toBe('type,brand,model,price');
    const m = matchPriceList(readPriceList(csv).rows, items);
    expect(m.changes).toEqual([]);
    expect(m.unchanged).toBe(2);
  });
});
