import { OG_CONTENT_TYPE, OG_SIZE, renderShare } from '@/lib/og/share-card';
import { marketerShare } from '@/lib/og/share-copy';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'A free solar quote, shared with you';

export default async function Image({ params }: { params: { slug: string; code: string } }) {
  const copy = await marketerShare(params.slug, params.code);
  return renderShare(copy.card);
}
