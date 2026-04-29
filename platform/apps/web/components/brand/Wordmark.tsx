import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export function Wordmark({
  href = '/',
  className,
  size = 'md',
}: {
  href?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const heightPx = size === 'sm' ? 16 : size === 'lg' ? 28 : 22;
  return (
    <Link href={href} className={cn('inline-flex items-center', className)}>
      <Image
        src="/wordmark.png"
        alt="Inverta"
        width={heightPx * 5}
        height={heightPx}
        className="wordmark-gray h-auto"
        style={{ height: heightPx }}
        priority
      />
    </Link>
  );
}

export function BrandIcon({
  className,
  size = 32,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <Image
      src="/icon.png"
      alt="Inverta"
      width={size}
      height={size}
      className={cn('h-auto', className)}
      priority
    />
  );
}
