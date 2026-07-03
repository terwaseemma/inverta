'use client';

import { useRef, useState } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Picks a logo file and posts it to /api/uploads/logo, which validates the
// session and uploads to Supabase Storage server-side (no client credentials,
// no RLS policy requirements). The returned public URL is mirrored into a
// hidden "logoUrl" input so it submits with the onboarding server action.
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];

export function LogoUploader({ initialUrl }: { initialUrl?: string }) {
  const [url, setUrl] = useState(initialUrl ?? '');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED.includes(file.type)) {
      setError('Use a PNG, JPG, WebP, or SVG image.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('File is too large. Max 2 MB.');
      return;
    }

    setUploading(true);
    try {
      const body = new FormData();
      body.append('file', file);
      const res = await fetch('/api/uploads/logo', { method: 'POST', body });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.url) {
        setError(json.error ?? 'Upload failed. Please try again.');
        return;
      }
      setUrl(json.url);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  function clear() {
    setUrl('');
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div className="space-y-2">
      <span className="text-sm font-medium">Business logo</span>
      <div className="flex items-center gap-4">
        <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-lg border border-border bg-secondary/40">
          {url ? (
            // Public URL from Supabase Storage — plain <img> avoids remote
            // pattern config in next.config for now.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="Logo preview" className="h-full w-full object-contain" />
          ) : (
            <Upload className="h-6 w-6 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className={cn(
                'inline-flex h-9 items-center gap-1.5 rounded-md border border-input bg-background px-3 text-sm font-medium transition-colors hover:bg-secondary disabled:opacity-50',
              )}
            >
              {uploading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading…
                </>
              ) : url ? (
                <>
                  <Upload className="h-3.5 w-3.5" /> Replace
                </>
              ) : (
                <>
                  <Upload className="h-3.5 w-3.5" /> Upload logo
                </>
              )}
            </button>
            {url && (
              <button
                type="button"
                onClick={clear}
                disabled={uploading}
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-input bg-background px-3 text-sm text-muted-foreground hover:text-destructive"
              >
                <X className="h-3.5 w-3.5" /> Remove
              </button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">PNG, JPG, WebP, or SVG. Max 2 MB.</p>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      </div>
      {/* Hidden — the URL is what the onboarding server action reads. */}
      <input type="hidden" name="logoUrl" value={url} />
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(',')}
        onChange={handleFile}
        className="sr-only"
      />
    </div>
  );
}
