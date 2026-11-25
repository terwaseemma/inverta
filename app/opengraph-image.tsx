import { OG_CONTENT_TYPE, OG_SIZE, renderShare } from '@/lib/og/share-card';
import { fallbackShare } from '@/lib/og/share-copy';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'Inverta — solar sales made easy';

export default async function Image() {
  return renderShare(fallbackShare().card);
}
