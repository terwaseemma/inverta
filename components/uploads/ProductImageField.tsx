'use client';

import { useRef, useState } from 'react';
import { ImageIcon, Loader2, Upload, X } from 'lucide-react';

// Picks a product photo and posts it to /api/uploads/product, which checks the
// session and stores it in Supabase Storage server-side. The public URL goes
// into a hidden "imageUrl" input, so it submits with the form's server action.
const MAX_BYTES = 4 * 1024 * 1024; // 4 MB
const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp'];

export function ProductImageField({
  initialUrl,
  label = 'Product photo',
}: {
  initialUrl?: string | null;
  label?: string;
}) {
  const [url, setUrl] = useState(initialUrl ?? '');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) {
      setError('Use a PNG, JPG or WebP photo.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('That photo is too large. Max 4 MB.');
      return;
    }

    setUploading(true);
    try {
      const body = new FormData();
      body.append('file', await toJpeg(file), 'product.jpg');
      const res = await fetch('/api/uploads/product', { method: 'POST', body });
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
      <span className="text-[15px] font-medium">{label}</span>
      <div className="flex items-center gap-4">
        <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl border bg-white">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="Product photo preview" className="h-full w-full object-contain p-1.5" />
          ) : (
            <ImageIcon className="h-6 w-6 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="btn btn-secondary btn-sm"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading…
                </>
              ) : (
                <>
                  <Upload className="h-3.5 w-3.5" /> {url ? 'Replace photo' : 'Upload photo'}
                </>
              )}
            </button>
            {url && (
              <button type="button" onClick={clear} disabled={uploading} className="btn btn-secondary btn-sm">
                <X className="h-3.5 w-3.5" /> Remove
              </button>
            )}
          </div>
          <p className="text-[13px] text-muted-foreground">
            PNG, JPG or WebP, up to 4 MB. A product on a plain white background looks best.
          </p>
          {error && <p className="text-[13px] text-destructive">{error}</p>}
        </div>
      </div>
      <input type="hidden" name="imageUrl" value={url} />
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

/**
 * Re-encode a photo as a JPEG on white, at most 1200px on its long side. The
 * PDF proposal can only embed PNG/JPEG, so every product photo is stored as
 * JPEG; flattening onto white also removes transparency, which JPEG lacks.
 * Falls back to the original file if the browser can't decode it.
 */
async function toJpeg(file: File): Promise<Blob> {
  try {
    const url = URL.createObjectURL(file);
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    URL.revokeObjectURL(url);
    const scale = Math.min(1, 1200 / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    const g = canvas.getContext('2d');
    if (!g) return file;
    g.fillStyle = '#fff';
    g.fillRect(0, 0, canvas.width, canvas.height);
    g.imageSmoothingQuality = 'high';
    g.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
    return blob ?? file;
  } catch {
    return file;
  }
}

/** A product's photo as a small square thumbnail, or a quiet placeholder. */
export function ProductThumb({
  url,
  alt,
  className = 'h-12 w-12',
}: {
  url: string | null | undefined;
  alt: string;
  className?: string;
}) {
  return (
    <span className={`grid shrink-0 place-items-center overflow-hidden rounded-xl border bg-white ${className}`}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={alt} loading="lazy" className="h-full w-full object-contain p-1" />
      ) : (
        <ImageIcon aria-hidden className="h-5 w-5 text-muted-foreground/60" />
      )}
    </span>
  );
}
