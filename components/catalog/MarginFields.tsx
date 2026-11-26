'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

// The margin added on top of trade prices when the starter catalog is loaded,
// as a percentage or naira per product. Field names match importMarginSchema
// (marginMode, marginPercent, marginNaira), the same rule single imports use.
// Prefilled at 20% so nobody lands at cost by accident.

export function MarginFields({
  error,
  className,
}: {
  error?: string;
  className?: string;
}) {
  const [mode, setMode] = useState<'percent' | 'amount'>('percent');
  const [value, setValue] = useState('20');

  return (
    <div className={cn('space-y-1.5 text-left', className)}>
      <label htmlFor="starter-margin" className="text-sm font-medium">
        Your margin on every product
      </label>
      <div className="flex">
        <select
          name="marginMode"
          value={mode}
          onChange={(e) => {
            const next = e.target.value as 'percent' | 'amount';
            setMode(next);
            setValue(next === 'percent' ? '20' : '');
          }}
          className="input w-[110px] rounded-r-none"
          aria-label="Margin as a percentage or naira per product"
        >
          <option value="percent">%</option>
          <option value="amount">₦ each</option>
        </select>
        <input
          id="starter-margin"
          name={mode === 'percent' ? 'marginPercent' : 'marginNaira'}
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/[^\d.]/g, ''))}
          placeholder={mode === 'percent' ? 'e.g. 20' : 'e.g. 25000'}
          className={cn('input -ml-px flex-1 rounded-l-none tabular-nums', error && 'border-destructive')}
        />
      </div>
      <p className={cn('text-[13px]', error ? 'text-destructive' : 'text-muted-foreground')}>
        {error ?? 'Added to the trade price of each product. You can fine-tune any price later.'}
      </p>
    </div>
  );
}
