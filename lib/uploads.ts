import 'server-only';

import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

// Server-side image upload, shared by the logo and product-photo routes. The
// browser posts the file; we verify the session, validate the file, and
// upload with the service-role client. Doing it server-side means no RLS
// policies on storage.objects are needed, and MIME/size limits are enforced
// where the user can't bypass them.
const BUCKET = 'installer-logos';

export const IMAGE_TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
};

export async function handleImageUpload(
  req: Request,
  opts: {
    /** Folder and file prefix under the uploader's own folder, e.g. "logo". */
    prefix: string;
    maxBytes: number;
    accepted: Record<string, string>;
  },
) {
  // 1. Must be signed in — the session cookie identifies the uploader.
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  // 2. Parse and validate the file.
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Expected multipart form data.' }, { status: 400 });
  }

  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Missing file field.' }, { status: 400 });
  }
  const ext = opts.accepted[file.type];
  if (!ext) {
    const names = Object.values(opts.accepted).map((e) => e.toUpperCase()).join(', ');
    return NextResponse.json({ error: `Use a ${names} image.` }, { status: 415 });
  }
  if (file.size > opts.maxBytes) {
    const mb = Math.round(opts.maxBytes / 1024 / 1024);
    return NextResponse.json({ error: `File is too large. Max ${mb} MB.` }, { status: 413 });
  }

  // 3. Upload keyed by userId so each account's files stay in their folder.
  const admin = createSupabaseAdminClient();
  const path = `${user.id}/${opts.prefix}-${Date.now()}.${ext}`;
  const bytes = await file.arrayBuffer();

  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: file.type, cacheControl: '31536000' });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path);
  return NextResponse.json({ url: pub.publicUrl });
}
