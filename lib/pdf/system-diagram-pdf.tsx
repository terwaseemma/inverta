import {
  Circle,
  Defs,
  G,
  Image,
  Line,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
  Svg,
  Text,
  View,
} from '@react-pdf/renderer';
import {
  COLORS,
  dcBoxBolt,
  houseParts,
  wideLayout,
  type InstalledSystem,
} from '@/lib/system-layout';

// The installation picture for the PDF proposal: the same wide layout the web
// page draws (lib/system-layout), so both are computed from the system's real
// counts. Shapes go in an <Svg>; product photos and text are laid over it,
// because the PDF engine places raster images and text more reliably outside
// SVG. Photos must be PNG or JPEG (the PDF engine can't read WebP); a part
// without a usable photo shows its name on the tile instead.

export type PdfImage = { data: Buffer; format: 'png' | 'jpg' };

const MUTED = '#5b6573';
const TILE_STROKE = '#dde1e6';
const ROOF = '#eef0f3';

export function SystemDiagramPdf({
  system,
  images,
  width,
}: {
  system: InstalledSystem;
  /** Fetched photos by URL; missing or unsupported ones fall back to text. */
  images: Record<string, PdfImage | null>;
  /** Rendered width in points (the body width). */
  width: number;
}) {
  const L = wideLayout(system);
  const k = width / L.width;
  const height = L.height * k;
  const at = (x: number) => x * k;

  return (
    <View wrap={false}>
      <View style={{ width, height, position: 'relative' }}>
        <Svg width={width} height={height} viewBox={`0 0 ${L.width} ${L.height}`} style={{ position: 'absolute', top: 0, left: 0 }}>
          <Defs>
            <LinearGradient id="cell" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#3a63a6" />
              <Stop offset="0.55" stopColor="#1c3765" />
              <Stop offset="1" stopColor="#13284d" />
            </LinearGradient>
            <RadialGradient id="sun">
              <Stop offset="0" stopColor="#ffd27a" />
              <Stop offset="0.6" stopColor="#ffb547" stopOpacity={0.85} />
              <Stop offset="1" stopColor="#ffb547" stopOpacity={0} />
            </RadialGradient>
          </Defs>

          <Circle cx={L.sun.cx} cy={L.sun.cy} r={L.sun.r} fill="url(#sun)" />
          <Rect x={L.roof.x} y={L.roof.y} width={L.roof.w} height={L.roof.h} rx={18} fill={ROOF} />
          {L.rails.map((r, i) => (
            <Rect key={`r${i}`} x={r.x} y={r.y} width={r.w} height={r.h} rx={2} fill={COLORS.rail} />
          ))}
          {L.panelCells.map((c, i) => (
            <G key={`c${i}`}>
              <Rect x={c.x} y={c.y} width={c.w} height={c.h} rx={2} fill={COLORS.frame} />
              <Rect x={c.x + 1.5} y={c.y + 1.5} width={c.w - 3} height={c.h - 3} rx={1} fill="url(#cell)" />
              {[1, 2].map((n) => (
                <Line key={`v${n}`} x1={c.x + 1.5 + ((c.w - 3) * n) / 3} y1={c.y + 1.5} x2={c.x + 1.5 + ((c.w - 3) * n) / 3} y2={c.y + c.h - 1.5} stroke={COLORS.cellLine} strokeWidth={0.6} strokeOpacity={0.55} />
              ))}
              {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                <Line key={`h${n}`} x1={c.x + 1.5} y1={c.y + 1.5 + ((c.h - 3) * n) / 8} x2={c.x + c.w - 1.5} y2={c.y + 1.5 + ((c.h - 3) * n) / 8} stroke={COLORS.cellLine} strokeWidth={0.6} strokeOpacity={0.55} />
              ))}
            </G>
          ))}

          {L.dcRuns.map((d) => (
            <G key={d}>
              <G transform="translate(0 -3.5)">
                <Path d={d} stroke={COLORS.red} strokeWidth={3.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </G>
              <G transform="translate(0 3.5)">
                <Path d={d} stroke={COLORS.black} strokeWidth={3.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </G>
            </G>
          ))}
          {L.acRuns.map((d) => (
            <Path key={d} d={d} stroke={COLORS.ac} strokeWidth={4} fill="none" strokeLinecap="round" />
          ))}

          <Rect x={L.dcBox.x} y={L.dcBox.y} width={36} height={46} rx={6} fill="#ffffff" stroke={TILE_STROKE} />
          <Path d={dcBoxBolt(L.dcBox.x, L.dcBox.y)} fill={COLORS.orange} />

          {L.tiles.map((t, i) => (
            <Rect key={`t${i}`} x={t.x} y={t.y} width={t.w} height={t.h} rx={14} fill="#ffffff" stroke={TILE_STROKE} />
          ))}
          {L.badge && <Rect x={L.badge.x} y={L.badge.y} width={50} height={24} rx={12} fill={COLORS.orange} />}

          {(() => {
            const h = houseParts(L.house);
            return (
              <G>
                <Path d={h.roof} fill={COLORS.orange} fillOpacity={0.9} />
                <Rect x={h.body.x} y={h.body.y} width={h.body.w} height={h.body.h} rx={4} fill="#ffffff" stroke={TILE_STROKE} />
                {h.windows.map((w, i) => (
                  <Rect key={i} x={w.x} y={w.y} width={w.w} height={w.h} rx={2} fill={COLORS.window} />
                ))}
                <Rect x={h.door.x} y={h.door.y} width={h.door.w} height={h.door.h} rx={2} fill={COLORS.rail} />
              </G>
            );
          })()}
        </Svg>

        {/* Product photos, over their tiles. */}
        {L.tiles.map((t, i) => {
          const img = t.imageUrl ? images[t.imageUrl] : null;
          return img ? (
            // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt
            <Image
              key={`i${i}`}
              src={{ data: img.data, format: img.format }}
              style={{ position: 'absolute', left: at(t.x + 6), top: at(t.y + 6), width: at(t.w - 12), height: at(t.h - 12), objectFit: 'contain' }}
            />
          ) : (
            <Text
              key={`i${i}`}
              style={{ position: 'absolute', left: at(t.x + 4), top: at(t.y + t.h / 2 - 8), width: at(t.w - 8), fontSize: 7, color: MUTED, textAlign: 'center' }}
            >
              {t.label}
            </Text>
          );
        })}

        {L.badge && (
          <Text style={{ position: 'absolute', left: at(L.badge.x), top: at(L.badge.y + 5), width: at(50), fontSize: 13 * k, fontFamily: 'Helvetica-Bold', color: '#1a120c', textAlign: 'center' }}>
            {L.badge.text}
          </Text>
        )}
        {L.morePanels && (
          <Text style={{ position: 'absolute', left: at(L.morePanels.x - 120), top: at(L.morePanels.y - 12), width: at(120), fontSize: 13 * k, fontFamily: 'Helvetica-Bold', color: MUTED, textAlign: 'right' }}>
            {L.morePanels.text}
          </Text>
        )}
        {L.tags.map((t) => (
          <Text key={`${t.text}-${t.x}`} style={{ position: 'absolute', left: at(t.x - 70), top: at(t.y - 12), width: at(140), fontSize: 12.5 * k, fontFamily: 'Helvetica-Bold', color: MUTED, textAlign: 'center' }}>
            {t.text}
          </Text>
        ))}
        {L.labels.map((l) => (
          <View key={`${l.title}-${l.x}`} style={{ position: 'absolute', left: at(l.x - 120), top: at(l.y - l.size), width: at(240) }}>
            <Text style={{ fontSize: l.size * k, fontFamily: 'Helvetica-Bold', textAlign: 'center' }}>{l.title}</Text>
            {l.sub && <Text style={{ fontSize: (l.size - 1) * k, color: MUTED, textAlign: 'center', marginTop: 2 }}>{l.sub}</Text>}
          </View>
        ))}
      </View>

      {system.accessories.length > 0 && (
        <Text style={{ marginTop: 8, fontSize: 8.5, color: MUTED }}>
          <Text style={{ fontFamily: 'Helvetica-Bold', color: '#1f2a37' }}>Also fitted: </Text>
          {system.accessories.map((a) => `${a.count > 1 ? `${a.count} × ` : ''}${a.name}`).join(' · ')}
        </Text>
      )}
    </View>
  );
}
