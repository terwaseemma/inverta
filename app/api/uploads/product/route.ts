import { handleImageUpload } from '@/lib/uploads';

// Product photo upload: catalog items, platform catalog items and storefront
// listings. Photos only (no SVG), up to 4 MB. See lib/uploads.
export async function POST(req: Request) {
  return handleImageUpload(req, {
    prefix: 'products/product',
    maxBytes: 4 * 1024 * 1024,
    accepted: { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' },
  });
}
