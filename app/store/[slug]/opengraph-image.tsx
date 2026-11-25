import { OG_CONTENT_TYPE, OG_SIZE, renderShare } from '@/lib/og/share-card';
import { storeShare } from '@/lib/og/share-copy';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'Solar store: generators, inverters, batteries and panels';

export default async function Image({ params }: { params: { slug: string } }) {
  const copy = await storeShare(params.slug);
  return renderShare(copy.card);
}
