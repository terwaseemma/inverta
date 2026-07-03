import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

// Renders the Inverta wordmark. Pass `href` to make it a link; omit to render
// just the image (safe to embed inside a parent <Link>). Never wrap this in a
// <Link> while also passing href — that creates nested <a> tags.
export function Wordmark({
  href,
  className,
  size = 'md',
}: {
  href?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const heightPx = size === 'sm' ? 16 : size === 'lg' ? 28 : 22;
  const img = (
    <Image
      src="/wordmark.png"
      alt="Inverta"
      width={heightPx * 5}
      height={heightPx}
      className="wordmark-gray h-auto"
      style={{ height: heightPx }}
      priority
    />
  );

  if (href) {
    return (
      <Link href={href} className={cn('inline-flex items-center', className)}>
        {img}
      </Link>
    );
  }

  return <span className={cn('inline-flex items-center', className)}>{img}</span>;
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
