import 'server-only';

import { ImageResponse } from 'next/og';

// The link preview WhatsApp, X, LinkedIn and iMessage show when someone pastes
// an Inverta link: 1200×630, the business up top, one promise in large type,
// one action, and a sunlit solar array on the right so it reads as solar at
// thumbnail size. Everything is drawn here (no image files to bundle), so it
// renders the same on every host.

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = 'image/png';

const INK = '#17130f';
const MUTED = '#6b6259';
const CANVAS = '#fbf8f4';
const ORANGE = '#ff7a33';
const LINE = '#e9e2da';

export type ShareCardProps = {
  business?: { name: string; logo: string | null; line?: string };
  /** Small pill above the headline, e.g. "Shared by Amaka". */
  eyebrow?: string;
  /** A "\n" forces a line break where the sentence should turn. */
  headline: string;
  sub: string;
  cta: string;
  /** Short claim on the white tag over the solar scene. */
  tag: { title: string; note: string };
};

export async function renderShareCard(props: ShareCardProps) {
  const fonts = await loadFonts();
  return new ImageResponse(<ShareCard {...props} />, {
    ...OG_SIZE,
    fonts: fonts.length ? fonts : undefined,
  });
}

function ShareCard({ business, eyebrow, headline, sub, cta, tag }: ShareCardProps) {
  const initial = business?.name.trim()[0]?.toUpperCase() ?? 'S';
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        background: CANVAS,
        fontFamily: 'Instrument Sans',
        color: INK,
      }}
    >
      {/* Left: who, the promise, the action. */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          width: 690,
          padding: '56px 0 52px 64px',
        }}
      >
        {business ? (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {business.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={business.logo}
                alt=""
                width={76}
                height={76}
                style={{
                  borderRadius: 20,
                  border: `2px solid ${LINE}`,
                  background: '#fff',
                  objectFit: 'contain',
                  padding: 8,
                }}
              />
            ) : (
              <div
                style={{
                  width: 76,
                  height: 76,
                  borderRadius: 20,
                  background: ORANGE,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 38,
                  fontWeight: 600,
                }}
              >
                {initial}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 22 }}>
              <div style={{ fontSize: 32, fontWeight: 600, letterSpacing: -0.5 }}>
                {clip(business.name, 28)}
              </div>
              {business.line && (
                <div style={{ fontSize: 22, color: MUTED, marginTop: 2 }}>{business.line}</div>
              )}
            </div>
          </div>
        ) : (
          <InvertaMark size={44} withWord />
        )}

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {eyebrow && (
            <div style={{ display: 'flex', marginBottom: 22 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: '#ffe8da',
                  color: '#a8440f',
                  fontSize: 22,
                  fontWeight: 600,
                  padding: '8px 18px',
                  borderRadius: 999,
                }}
              >
                {eyebrow}
              </div>
            </div>
          )}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              fontSize: headline.length > 34 ? 58 : 66,
              fontWeight: 600,
              lineHeight: 1.04,
              letterSpacing: -2,
              maxWidth: 600,
            }}
          >
            {headline.split('\n').map((line) => (
              <div key={line}>{line}</div>
            ))}
          </div>
          <div style={{ fontSize: 25, lineHeight: 1.4, color: MUTED, marginTop: 22, maxWidth: 580 }}>
            {sub}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: ORANGE,
              color: INK,
              fontSize: 25,
              fontWeight: 600,
              padding: '16px 30px',
              borderRadius: 999,
            }}
          >
            {cta} →
          </div>
          {business && (
            <div style={{ display: 'flex', alignItems: 'center', marginLeft: 26, color: MUTED, fontSize: 19 }}>
              <span style={{ marginRight: 10 }}>Powered by</span>
              <InvertaMark size={22} withWord />
            </div>
          )}
        </div>
      </div>

      {/* Right: morning sun over a rooftop array. */}
      <SolarScene tag={tag} />
    </div>
  );
}

function SolarScene({ tag }: { tag: ShareCardProps['tag'] }) {
  const rows = 4;
  const cols = 7;
  return (
    <div
      style={{
        position: 'absolute',
        top: 36,
        right: 36,
        bottom: 36,
        width: 440,
        display: 'flex',
        borderRadius: 36,
        overflow: 'hidden',
        background: 'linear-gradient(165deg, #ff7a33 0%, #ff9b5c 42%, #ffd2ad 78%, #ffe9d7 100%)',
      }}
    >
      {/* Sun and its glow. */}
      <div
        style={{
          position: 'absolute',
          top: -70,
          right: -60,
          width: 340,
          height: 340,
          borderRadius: 999,
          background: 'radial-gradient(circle, rgba(255,246,236,0.95) 0%, rgba(255,226,198,0.55) 40%, rgba(255,226,198,0) 70%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 38,
          right: 44,
          width: 118,
          height: 118,
          borderRadius: 999,
          background: '#fff4e8',
        }}
      />

      {/* The array, tilted toward the sun. */}
      <div
        style={{
          position: 'absolute',
          left: 26,
          bottom: 58,
          display: 'flex',
          flexDirection: 'column',
          padding: 6,
          background: '#d9e0ea',
          borderRadius: 10,
          transform: 'skewX(-24deg) rotate(-6deg)',
          boxShadow: '0 30px 40px rgba(120, 50, 10, 0.25)',
        }}
      >
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} style={{ display: 'flex', marginTop: r ? 5 : 0 }}>
            {Array.from({ length: cols }).map((__, c) => (
              <div
                key={c}
                style={{
                  width: 44,
                  height: 36,
                  marginLeft: c ? 5 : 0,
                  borderRadius: 3,
                  background:
                    (r + c) % 3 === 0
                      ? 'linear-gradient(135deg, #3a64a8 0%, #1b3566 60%, #142a52 100%)'
                      : 'linear-gradient(135deg, #2c5394 0%, #18305e 65%, #11244a 100%)',
                }}
              />
            ))}
          </div>
        ))}
      </div>

      {/* The claim, pinned on the scene. */}
      <div
        style={{
          position: 'absolute',
          left: 34,
          top: 150,
          display: 'flex',
          alignItems: 'center',
          background: '#ffffff',
          borderRadius: 22,
          padding: '16px 22px 16px 16px',
          boxShadow: '0 18px 40px rgba(110, 45, 10, 0.18)',
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 16,
            background: '#ffe8da',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Bolt />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 14 }}>
          <div style={{ fontSize: 24, fontWeight: 600, color: INK }}>{tag.title}</div>
          <div style={{ fontSize: 18, color: MUTED, marginTop: 2 }}>{tag.note}</div>
        </div>
      </div>
    </div>
  );
}

// The Inverta mark, drawn: the dot and the stroke from the logo.
function InvertaMark({ size, withWord }: { size: number; withWord?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <div style={{ display: 'flex', position: 'relative', width: size * 0.9, height: size }}>
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: size * 0.4,
            height: size * 0.4,
            borderRadius: 999,
            background: ORANGE,
          }}
        />
        <div
          style={{
            position: 'absolute',
            right: size * 0.12,
            top: 0,
            width: size * 0.26,
            height: size,
            background: ORANGE,
            transform: 'skewX(-28deg)',
          }}
        />
      </div>
      {withWord && (
        <div
          style={{
            fontSize: size * 0.95,
            fontWeight: 600,
            letterSpacing: -0.5,
            color: INK,
            marginLeft: size * 0.25,
          }}
        >
          inverta
        </div>
      )}
    </div>
  );
}

function Bolt() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <path
        d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"
        fill={ORANGE}
        stroke="#c2510f"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function clip(s: string, n: number) {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

// ── Assets ───────────────────────────────────────────────────────────────

type Font = { name: string; data: ArrayBuffer; weight: 400 | 600; style: 'normal' };
let fontsPromise: Promise<Font[]> | null = null;

// Instrument Sans, the app's face, fetched once per server instance. Google
// serves TTF to clients that don't ask for woff2, which is what the image
// renderer reads. If the fetch fails the card still renders in the built-in
// font, so a preview never breaks over typography.
function loadFonts(): Promise<Font[]> {
  if (!fontsPromise) {
    fontsPromise = Promise.all(
      ([400, 600] as const).map(async (weight) => {
        const css = await fetchWithTimeout(
          `https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@${weight}`,
        ).then((r) => r.text());
        const url = css.match(/src:\s*url\(([^)]+)\)\s*format\('(?:truetype|opentype)'\)/)?.[1];
        if (!url) throw new Error('No TTF in font CSS');
        const data = await fetchWithTimeout(url).then((r) => r.arrayBuffer());
        return { name: 'Instrument Sans', data, weight, style: 'normal' as const };
      }),
    ).catch(() => {
      fontsPromise = null; // try again on the next request
      return [];
    });
  }
  return fontsPromise;
}

/**
 * The installer's logo as a data URI the renderer can draw, or null. The
 * renderer reads PNG, JPEG and SVG; anything else (WebP) falls back to the
 * initial tile rather than failing the whole image.
 */
export async function loadLogo(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetchWithTimeout(url);
    if (!res.ok) return null;
    const type = (res.headers.get('content-type') ?? '').split(';')[0].trim();
    if (!['image/png', 'image/jpeg', 'image/svg+xml'].includes(type)) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength > 2_000_000) return null;
    return `data:${type};base64,${buf.toString('base64')}`;
  } catch {
    return null;
  }
}

async function fetchWithTimeout(url: string, ms = 4000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { signal: ctrl.signal, cache: 'force-cache' });
  } finally {
    clearTimeout(t);
  }
}

/** Render a share's card, resolving the installer's logo first. */
export async function renderShare(card: {
  business?: { name: string; logoUrl: string | null; line?: string };
} & Omit<ShareCardProps, 'business'>) {
  const { business, ...rest } = card;
  return renderShareCard({
    ...rest,
    business: business
      ? { name: business.name, line: business.line, logo: await loadLogo(business.logoUrl) }
      : undefined,
  });
}
