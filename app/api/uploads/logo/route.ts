import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

// Server-side logo upload. The browser posts the file here; we verify the
// session, validate the file, and upload with the service-role client.
// Doing it server-side means no RLS policies on storage.objects are needed —
// one less manual Supabase setup step, and MIME/size limits are enforced
// where the user can't bypass them.
const BUCKET = 'installer-logos';
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const ACCEPTED: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
};

export async function POST(req: Request) {
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
  const ext = ACCEPTED[file.type];
  if (!ext) {
    return NextResponse.json(
      { error: 'Use a PNG, JPG, WebP, or SVG image.' },
      { status: 415 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File is too large. Max 2 MB.' }, { status: 413 });
  }

  // 3. Upload keyed by userId so each installer's files stay in their folder.
  const admin = createSupabaseAdminClient();
  const path = `${user.id}/logo-${Date.now()}.${ext}`;
  const bytes = await file.arrayBuffer();

  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: file.type, cacheControl: '3600' });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path);
  return NextResponse.json({ url: pub.publicUrl });
}
