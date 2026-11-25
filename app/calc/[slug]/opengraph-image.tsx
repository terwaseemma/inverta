import { OG_CONTENT_TYPE, OG_SIZE, renderShare } from '@/lib/og/share-card';
import { calculatorShare } from '@/lib/og/share-copy';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'Get a free solar quote in 2 minutes';

export default async function Image({ params }: { params: { slug: string } }) {
  const copy = await calculatorShare(params.slug);
  return renderShare(copy.card);
}
