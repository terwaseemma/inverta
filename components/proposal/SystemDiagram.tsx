import {
  COLORS,
  dcBoxBolt,
  describeSystem,
  hasDcProtection,
  houseParts,
  panelGrid,
  partLines,
  clip,
  wideLayout,
  type Box,
  type InstalledSystem,
} from '@/lib/system-layout';

// The system, assembled as it will be installed, computed live from its counts
// (lib/system-layout): the panel array on roof rails, red/black DC pairs
// through the DC protection box to the inverter, the battery bank on its own
// DC run, the AC run to the home, or an all-in-one in place of inverter +
// batteries. Panels are drawn (an array is N identical modules on rails), every
// other part uses its product photo. Two layouts: wide, and tall for phones.
// The PDF draws the wide layout from the same geometry.

export function SystemDiagram({ system }: { system: InstalledSystem }) {
  return (
    <figure className="system-diagram">
      <div className="hidden sm:block">
        <Wide s={system} />
      </div>
      <div className="sm:hidden">
        <Tall s={system} />
      </div>
      {system.accessories.length > 0 && (
        <figcaption className="mt-4 flex flex-wrap gap-2 text-[13px] text-muted-foreground">
          <span className="font-medium text-foreground">Also fitted:</span>
          {system.accessories.map((a) => (
            <span key={a.name} className="chip">
              {a.count > 1 ? `${a.count} × ` : ''}
              {a.name}
            </span>
          ))}
        </figcaption>
      )}
      <style>{`
        .system-diagram .flow { stroke-dasharray: 2 14; animation: sd-flow 1.6s linear infinite; }
        @keyframes sd-flow { to { stroke-dashoffset: -32; } }
        @media (prefers-reduced-motion: reduce) { .system-diagram .flow { animation: none; display: none; } }
        .system-diagram .tile { fill: #fff; stroke: hsl(var(--border)); }
        .system-diagram .roof { fill: hsl(var(--secondary)); }
        .system-diagram .muted { fill: hsl(var(--muted-foreground)); }
      `}</style>
    </figure>
  );
}

// ── shared pieces ─────────────────────────────────────────────────────────

/** A DC run: a red and a black conductor side by side, with a flow pulse. */
function DcPair({ d }: { d: string }) {
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} stroke={COLORS.red} strokeWidth={3.5} transform="translate(0 -3.5)" />
      <path d={d} stroke={COLORS.black} strokeWidth={3.5} transform="translate(0 3.5)" />
      <path d={d} className="flow" stroke="#fff" strokeWidth={2.5} opacity={0.9} />
    </g>
  );
}

function AcRun({ d }: { d: string }) {
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} stroke={COLORS.ac} strokeWidth={4} />
      <path d={d} className="flow" stroke="#fff" strokeWidth={2.5} opacity={0.9} />
    </g>
  );
}

/** A product photo on a white tile, or the name on the tile when there's no photo. */
function Photo({ x, y, w, h, href, label }: Box & { href: string | null; label: string }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={14} className="tile" />
      {href ? (
        <image href={href} x={x + 6} y={y + 6} width={w - 12} height={h - 12} preserveAspectRatio="xMidYMid meet">
          <title>{label}</title>
        </image>
      ) : (
        <text x={x + w / 2} y={y + h / 2} textAnchor="middle" dominantBaseline="middle" fontSize={13} className="muted">
          {clip(label, 18)}
        </text>
      )}
    </g>
  );
}

function Panels({ cells, rails, gid }: { cells: Box[]; rails: Box[]; gid: string }) {
  return (
    <g>
      {rails.map((r, i) => (
        <rect key={`r${i}`} x={r.x} y={r.y} width={r.w} height={r.h} rx={2} fill={COLORS.rail} />
      ))}
      {cells.map((c, i) => (
        <g key={`c${i}`}>
          <rect x={c.x} y={c.y} width={c.w} height={c.h} rx={2} fill={COLORS.frame} />
          <rect x={c.x + 1.5} y={c.y + 1.5} width={c.w - 3} height={c.h - 3} rx={1} fill={`url(#${gid}-cell)`} />
          {[1, 2].map((k) => (
            <line key={`v${k}`} x1={c.x + 1.5 + ((c.w - 3) * k) / 3} y1={c.y + 1.5} x2={c.x + 1.5 + ((c.w - 3) * k) / 3} y2={c.y + c.h - 1.5} stroke={COLORS.cellLine} strokeWidth={0.6} opacity={0.55} />
          ))}
          {[1, 2, 3, 4, 5, 6, 7].map((k) => (
            <line key={`h${k}`} x1={c.x + 1.5} y1={c.y + 1.5 + ((c.h - 3) * k) / 8} x2={c.x + c.w - 1.5} y2={c.y + 1.5 + ((c.h - 3) * k) / 8} stroke={COLORS.cellLine} strokeWidth={0.6} opacity={0.55} />
          ))}
        </g>
      ))}
    </g>
  );
}

// Gradient ids carry the layout's prefix: both layouts are in the page (one
// hidden), and a reference to an id inside a display:none SVG paints nothing.
function Defs({ gid }: { gid: string }) {
  return (
    <defs>
      <linearGradient id={`${gid}-cell`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#3a63a6" />
        <stop offset="0.55" stopColor="#1c3765" />
        <stop offset="1" stopColor="#13284d" />
      </linearGradient>
      <radialGradient id={`${gid}-sun`}>
        <stop offset="0" stopColor="#ffd27a" />
        <stop offset="0.6" stopColor="#ffb547" stopOpacity="0.85" />
        <stop offset="1" stopColor="#ffb547" stopOpacity="0" />
      </radialGradient>
    </defs>
  );
}

function House(box: Box) {
  const p = houseParts(box);
  return (
    <g>
      <path d={p.roof} fill={COLORS.orange} opacity={0.9} />
      <rect x={p.body.x} y={p.body.y} width={p.body.w} height={p.body.h} rx={4} className="tile" />
      {p.windows.map((w, i) => (
        <rect key={i} x={w.x} y={w.y} width={w.w} height={w.h} rx={2} fill={COLORS.window} />
      ))}
      <rect x={p.door.x} y={p.door.y} width={p.door.w} height={p.door.h} rx={2} fill={COLORS.rail} />
    </g>
  );
}

function Label({ x, y, title, sub, size }: { x: number; y: number; title: string; sub?: string; size: number }) {
  return (
    <g>
      <text x={x} y={y} textAnchor="middle" fontSize={size} fontWeight={600} fill="currentColor">
        {title}
      </text>
      {sub && (
        <text x={x} y={y + size + 4} textAnchor="middle" fontSize={size - 1} className="muted">
          {sub}
        </text>
      )}
    </g>
  );
}

function CableTag({ x, y, text }: { x: number; y: number; text: string }) {
  return (
    <text x={x} y={y} textAnchor="middle" fontSize={13} fontWeight={600} className="muted" letterSpacing={0.4}>
      {text}
    </text>
  );
}

function DcBox({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x} y={y} width={36} height={46} rx={6} className="tile" />
      <path d={dcBoxBolt(x, y)} fill={COLORS.orange} />
    </g>
  );
}

// ── wide layout (tablet and up), from the shared geometry ─────────────────

function Wide({ s }: { s: InstalledSystem }) {
  const L = wideLayout(s);
  return (
    <svg viewBox={`0 0 ${L.width} ${L.height}`} role="img" aria-label={describeSystem(s)} className="h-auto w-full text-foreground">
      <Defs gid="sdw" />
      <circle cx={L.sun.cx} cy={L.sun.cy} r={L.sun.r} fill="url(#sdw-sun)" />
      <rect x={L.roof.x} y={L.roof.y} width={L.roof.w} height={L.roof.h} rx={18} className="roof" />
      <Panels cells={L.panelCells} rails={L.rails} gid="sdw" />
      {L.morePanels && (
        <text x={L.morePanels.x} y={L.morePanels.y} textAnchor="end" fontSize={13} fontWeight={600} className="muted">
          {L.morePanels.text}
        </text>
      )}
      {L.dcRuns.map((d) => (
        <DcPair key={d} d={d} />
      ))}
      {L.acRuns.map((d) => (
        <AcRun key={d} d={d} />
      ))}
      <DcBox x={L.dcBox.x} y={L.dcBox.y} />
      {L.tiles.map((t, i) => (
        <Photo key={i} {...t} href={t.imageUrl} label={t.label} />
      ))}
      {L.badge && (
        <g>
          <rect x={L.badge.x} y={L.badge.y} width={50} height={24} rx={12} fill={COLORS.orange} />
          <text x={L.badge.x + 25} y={L.badge.y + 16.5} textAnchor="middle" fontSize={13} fontWeight={700} fill="#1a120c">
            {L.badge.text}
          </text>
        </g>
      )}
      <House {...L.house} />
      {L.tags.map((t) => (
        <CableTag key={`${t.text}-${t.x}`} {...t} />
      ))}
      {L.labels.map((l) => (
        <Label key={`${l.title}-${l.x}`} {...l} />
      ))}
    </svg>
  );
}

// ── tall layout (phones) ──────────────────────────────────────────────────

function Tall({ s }: { s: InstalledSystem }) {
  const L = partLines(s);
  const grid = panelGrid(s.panels!.count, { x: 30, y: 64, w: 340, h: 208 });
  const b = s.batteries;
  const shownBatteries = b ? Math.min(b.count, 2) : 0;
  return (
    <svg viewBox="0 0 400 900" role="img" aria-label={describeSystem(s)} className="h-auto w-full text-foreground">
      <Defs gid="sdt" />
      <circle cx={36} cy={30} r={28} fill="url(#sdt-sun)" />
      <rect x={16} y={50} width={368} height={236} rx={18} className="roof" />
      <Panels cells={grid.cells} rails={grid.rails} gid="sdt" />
      {grid.morePanels && (
        <text x={370} y={78} textAnchor="end" fontSize={14} fontWeight={600} className="muted">
          {grid.morePanels.text}
        </text>
      )}
      <Label x={200} y={312} title={L.panels} sub={L.panelsSub} size={16} />

      <DcPair d="M200 350 V368 M200 410 V430" />
      <DcBox x={182} y={366} />
      <CableTag x={282} y={392} text={hasDcProtection(s) ? 'DC PROTECTION' : 'SOLAR DC'} />

      {s.generator ? (
        <>
          <Photo x={100} y={430} w={200} h={250} href={s.generator.imageUrl} label={s.generator.name} />
          <Label x={200} y={706} title={L.generator} sub={L.generatorSub} size={16} />
          <AcRun d="M200 748 V772" />
          <House x={140} y={772} w={120} h={100} />
        </>
      ) : (
        <>
          <Photo x={120} y={430} w={160} h={220} href={s.inverter?.imageUrl ?? null} label={s.inverter?.name ?? 'Inverter'} />
          <Label x={200} y={676} title={L.inverter} sub={L.inverterSub} size={16} />
          {b && (
            <>
              <DcPair d="M120 620 H96 V738" />
              {Array.from({ length: shownBatteries }).map((_, i) => {
                const w = (170 - (shownBatteries - 1) * 8) / shownBatteries;
                return <Photo key={i} x={16 + i * (w + 8)} y={738} w={w} h={110} href={b.imageUrl} label={b.name} />;
              })}
              {b.count > shownBatteries && (
                <g>
                  <rect x={140} y={726} width={50} height={24} rx={12} fill={COLORS.orange} />
                  <text x={165} y={742.5} textAnchor="middle" fontSize={13} fontWeight={700} fill="#1a120c">
                    ×{b.count}
                  </text>
                </g>
              )}
              <text x={101} y={872} textAnchor="middle" fontSize={14} fontWeight={600} fill="currentColor">
                {clip(L.battery, 22)}
              </text>
              <text x={101} y={890} textAnchor="middle" fontSize={13} className="muted">
                {L.batterySub}
              </text>
            </>
          )}
          <AcRun d="M280 620 H304 V748" />
          <House x={234} y={748} w={140} h={100} />
          <text x={304} y={872} textAnchor="middle" fontSize={14} fontWeight={600} fill="currentColor">
            Your home
          </text>
          <text x={304} y={890} textAnchor="middle" fontSize={13} className="muted">
            230 V AC
          </text>
        </>
      )}
    </svg>
  );
}
