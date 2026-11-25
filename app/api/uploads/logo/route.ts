import { handleImageUpload, IMAGE_TYPES } from '@/lib/uploads';

// Business logo upload (onboarding and settings). See lib/uploads.
export async function POST(req: Request) {
  return handleImageUpload(req, { prefix: 'logo', maxBytes: 2 * 1024 * 1024, accepted: IMAGE_TYPES });
}
