import { useId } from 'react';
import { cn } from '@/lib/utils';

// One soft-3D icon set for every appliance in the calculator, drawn in code:
// light materials (white and silver bodies, pale-blue glass and screens, the
// brand's light orange for anything lit), lit from above, with a soft
// contact shadow. All share one palette and one 48px grid, so the grid reads
// as a single family. No image files: nothing to download, sharp at any
// size, and the same on light and dark tiles.

type Paint = (name: MaterialName) => string;
type MaterialName =
  | 'body'
  | 'side'
  | 'metal'
  | 'dark'
  | 'screen'
  | 'glow'
  | 'glass'
  | 'bulb'
  | 'shadow';

// Top colour → bottom colour for each material.
const MATERIALS: Record<Exclude<MaterialName, 'shadow'>, [string, string]> = {
  body: ['#ffffff', '#e2e7ee'],
  side: ['#d9dfe7', '#b8c2ce'],
  metal: ['#f1f3f6', '#a9b4c2'],
  dark: ['#56606f', '#2d343e'],
  screen: ['#d9e9fc', '#8fb6e6'],
  glow: ['#ffd3b6', '#ff8a4c'],
  glass: ['#e6f5ff', '#a4d3f6'],
  bulb: ['#fffbe9', '#ffd98a'],
};
const EDGE = '#c3ccd7';

function Art({
  className,
  children,
}: {
  className?: string;
  children: (paint: Paint) => React.ReactNode;
}) {
  // Gradient ids must be unique per instance: the same icon renders many times.
  const id = useId().replace(/:/g, '');
  const paint: Paint = (name) => `url(#${id}-${name})`;
  return (
    <svg viewBox="0 0 48 48" aria-hidden className={className}>
      <defs>
        {Object.entries(MATERIALS).map(([name, [top, bottom]]) => (
          <linearGradient key={name} id={`${id}-${name}`} x1="0" y1="0" x2="0.35" y2="1">
            <stop offset="0" stopColor={top} />
            <stop offset="1" stopColor={bottom} />
          </linearGradient>
        ))}
        <radialGradient id={`${id}-shadow`}>
          <stop offset="0" stopColor="#1e283c" stopOpacity="0.22" />
          <stop offset="1" stopColor="#1e283c" stopOpacity="0" />
        </radialGradient>
      </defs>
      {children(paint)}
    </svg>
  );
}

// The soft contact shadow every object sits on.
const Shadow = ({ p, cx = 24, cy = 43, rx = 15 }: { p: Paint; cx?: number; cy?: number; rx?: number }) => (
  <ellipse cx={cx} cy={cy} rx={rx} ry={2.6} fill={p('shadow')} />
);
const edge = { stroke: EDGE, strokeWidth: 0.75 };

type IconProps = { className?: string };
const icon = (draw: (p: Paint) => React.ReactNode) =>
  function ApplianceArt({ className }: IconProps) {
    return <Art className={className}>{draw}</Art>;
  };

const Bulb = icon((p) => (
  <>
    <Shadow p={p} rx={9} />
    <circle cx="24" cy="19" r="12" fill={p('bulb')} {...edge} />
    <ellipse cx="19.5" cy="14" rx="3.5" ry="2.2" fill="#fff" opacity="0.8" />
    <rect x="18.5" y="29" width="11" height="9" rx="2.5" fill={p('metal')} {...edge} />
    <path d="M18.5 32.5h11M18.5 35h11" stroke={EDGE} strokeWidth="0.9" />
  </>
));

const Floodlight = icon((p) => (
  <>
    <Shadow p={p} rx={10} />
    <rect x="7" y="12" width="24" height="17" rx="4" fill={p('body')} {...edge} />
    <rect x="29" y="13" width="9" height="15" rx="3" fill={p('glow')} {...edge} />
    <path d="M40.5 15.5l3-2M41 20.5h3.5M40.5 25.5l3 2" stroke="#ff9a62" strokeWidth="1.6" strokeLinecap="round" />
    <rect x="16.5" y="29" width="5" height="8" rx="1.5" fill={p('metal')} {...edge} />
    <rect x="11" y="36.5" width="16" height="4" rx="2" fill={p('side')} {...edge} />
  </>
));

const CeilingFan = icon((p) => (
  <>
    <rect x="17" y="3" width="14" height="3.5" rx="1.75" fill={p('side')} {...edge} />
    <rect x="22.5" y="6" width="3" height="8" fill={p('metal')} {...edge} />
    <ellipse cx="11.5" cy="19" rx="11" ry="3.2" fill={p('body')} {...edge} />
    <ellipse cx="36.5" cy="19" rx="11" ry="3.2" fill={p('body')} {...edge} />
    <circle cx="24" cy="18.5" r="5.5" fill={p('side')} {...edge} />
    <path d="M19 23.5h10a5 5 0 0 1-10 0z" fill={p('bulb')} {...edge} />
    <Shadow p={p} cy={42} rx={12} />
  </>
));

const StandingFan = icon((p) => (
  <>
    <Shadow p={p} rx={11} />
    <rect x="22.5" y="28" width="3" height="11" fill={p('metal')} {...edge} />
    <ellipse cx="24" cy="40" rx="9" ry="2.6" fill={p('side')} {...edge} />
    <circle cx="24" cy="17" r="14" fill={p('body')} {...edge} />
    <circle cx="24" cy="17" r="10.5" fill={p('glass')} opacity="0.55" />
    {[0, 120, 240].map((r) => (
      <ellipse key={r} cx="24" cy="11.5" rx="3.2" ry="6" fill="#fff" stroke={EDGE} strokeWidth="0.6" transform={`rotate(${r} 24 17)`} />
    ))}
    <circle cx="24" cy="17" r="2.6" fill={p('metal')} {...edge} />
  </>
));

const AirConditioner = icon((p) => (
  <>
    <rect x="4" y="9" width="40" height="18" rx="5" fill={p('body')} {...edge} />
    <rect x="8" y="22" width="32" height="2.6" rx="1.3" fill={p('side')} />
    <circle cx="37.5" cy="14" r="1.4" fill={p('glow')} />
    {[15, 24, 33].map((x) => (
      <path key={x} d={`M${x} 30c-2 2.5 2 4.5 0 7s2 4.5 0 7`} fill="none" stroke="#9fd0f5" strokeWidth="1.8" strokeLinecap="round" />
    ))}
  </>
));

const Fridge = icon((p) => (
  <>
    <Shadow p={p} rx={13} />
    <rect x="12" y="4" width="24" height="38" rx="4.5" fill={p('body')} {...edge} />
    <path d="M12 17h24" stroke={EDGE} strokeWidth="1.1" />
    <rect x="15.5" y="8" width="2.4" height="6" rx="1.2" fill={p('metal')} {...edge} />
    <rect x="15.5" y="20" width="2.4" height="9" rx="1.2" fill={p('metal')} {...edge} />
    <rect x="31" y="5" width="4" height="36" rx="2" fill="#000" opacity="0.04" />
  </>
));

const Freezer = icon((p) => (
  <>
    <Shadow p={p} rx={18} />
    <rect x="6" y="18" width="36" height="23" rx="4" fill={p('body')} {...edge} />
    <rect x="4.5" y="13.5" width="39" height="7" rx="3" fill={p('side')} {...edge} />
    <rect x="19" y="24" width="10" height="2.4" rx="1.2" fill={p('metal')} {...edge} />
    <circle cx="37" cy="28" r="1.3" fill={p('glass')} />
  </>
));

const Television = icon((p) => (
  <>
    <Shadow p={p} rx={17} cy={42} />
    <rect x="3.5" y="8" width="41" height="27" rx="3" fill={p('dark')} />
    <rect x="5.5" y="10" width="37" height="23" rx="1.8" fill={p('screen')} />
    <path d="M5.5 26 26 10h9L5.5 33z" fill="#fff" opacity="0.28" />
    <path d="M12 35l-2 5M36 35l2 5" stroke="#8994a3" strokeWidth="2" strokeLinecap="round" />
  </>
));

const Decoder = icon((p) => (
  <>
    <Shadow p={p} rx={17} cy={37} />
    <rect x="5" y="20" width="38" height="14" rx="3.5" fill={p('body')} {...edge} />
    <rect x="9" y="25" width="12" height="4.5" rx="1.2" fill={p('dark')} />
    <path d="M11 27.25h6" stroke="#7fd6a0" strokeWidth="1.4" strokeLinecap="round" />
    <circle cx="36" cy="27.25" r="1.5" fill={p('glow')} />
    <circle cx="31" cy="27.25" r="1.5" fill={p('side')} />
    <path d="M24 20v-4M18 12a9 9 0 0 1 12 0M20.5 14.5a5 5 0 0 1 7 0" fill="none" stroke="#9fb0c4" strokeWidth="1.6" strokeLinecap="round" />
  </>
));

const SoundSystem = icon((p) => (
  <>
    <Shadow p={p} rx={13} />
    <rect x="12" y="4" width="24" height="38" rx="4.5" fill={p('body')} {...edge} />
    <circle cx="24" cy="14" r="4.5" fill={p('dark')} />
    <circle cx="24" cy="14" r="1.6" fill="#8b96a5" />
    <circle cx="24" cy="29" r="8" fill={p('dark')} />
    <circle cx="24" cy="29" r="4.5" fill="#46505d" />
    <circle cx="24" cy="29" r="1.8" fill="#8b96a5" />
  </>
));

const WashingMachine = icon((p) => (
  <>
    <Shadow p={p} rx={15} />
    <rect x="8.5" y="4" width="31" height="38" rx="4.5" fill={p('body')} {...edge} />
    <path d="M8.5 12h31" stroke={EDGE} strokeWidth="1" />
    <circle cx="33.5" cy="8" r="1.8" fill={p('glow')} />
    <rect x="12.5" y="6.8" width="9" height="2.4" rx="1.2" fill={p('side')} />
    <circle cx="24" cy="27" r="10" fill={p('metal')} {...edge} />
    <circle cx="24" cy="27" r="7.2" fill={p('glass')} />
    <path d="M18.5 25a6 6 0 0 1 5-4.5" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" fill="none" />
  </>
));

const WaterPump = icon((p) => (
  <>
    <Shadow p={p} rx={17} />
    <rect x="6" y="36" width="32" height="4.5" rx="2.25" fill={p('side')} {...edge} />
    <rect x="5" y="17" width="22" height="16" rx="5" fill={p('body')} {...edge} />
    <path d="M11 17v16M16 17v16M21 17v16" stroke={EDGE} strokeWidth="0.9" />
    <circle cx="32" cy="25" r="8" fill={p('metal')} {...edge} />
    <circle cx="32" cy="25" r="3" fill={p('side')} />
    <rect x="30" y="7" width="4.5" height="12" rx="2" fill={p('metal')} {...edge} />
    <path d="M40.5 9.5c0 1.6-1.1 2.6-2.4 2.6s-2.4-1-2.4-2.6C35.7 7.7 38.1 5 38.1 5s2.4 2.7 2.4 4.5z" fill={p('glass')} stroke="#8cc3ec" strokeWidth="0.7" />
  </>
));

const WaterHeater = icon((p) => (
  <>
    <Shadow p={p} rx={11} />
    <rect x="13" y="3" width="22" height="32" rx="7" fill={p('body')} {...edge} />
    <circle cx="24" cy="14" r="4.2" fill={p('metal')} {...edge} />
    <path d="M24 14l2-2" stroke="#ff8a4c" strokeWidth="1.3" strokeLinecap="round" />
    <rect x="18" y="35" width="3" height="6" fill="#a4d3f6" />
    <rect x="27" y="35" width="3" height="6" fill="#ffab7a" />
  </>
));

const MicrowaveOven = icon((p) => (
  <>
    <Shadow p={p} rx={18} cy={40} />
    <rect x="4" y="10" width="40" height="27" rx="4" fill={p('body')} {...edge} />
    <rect x="8" y="14" width="24" height="19" rx="2.5" fill={p('dark')} />
    <path d="M10 28 24 16h5L12 31z" fill="#fff" opacity="0.15" />
    <rect x="35" y="14" width="5.5" height="3" rx="1" fill={p('screen')} />
    <circle cx="37.75" cy="22.5" r="1.6" fill={p('side')} />
    <circle cx="37.75" cy="28" r="1.6" fill={p('side')} />
  </>
));

const Kettle = icon((p) => (
  <>
    <Shadow p={p} rx={15} />
    <rect x="9" y="37" width="28" height="4" rx="2" fill={p('dark')} />
    <path d="M34 19h3a4 4 0 0 1 4 4v6a4 4 0 0 1-4 4h-2" fill="none" stroke="#b8c2ce" strokeWidth="3.5" strokeLinecap="round" />
    <path d="M14 22 6.5 15.5v4.5l7.5 7z" fill={p('side')} {...edge} />
    <path d="M14 16h20l3 18.5a3 3 0 0 1-3 3.5H14a3 3 0 0 1-3-3.5z" fill={p('body')} {...edge} />
    <path d="M17 16c0-4 3-6.5 7-6.5s7 2.5 7 6.5z" fill={p('side')} {...edge} />
    <circle cx="24" cy="8.5" r="2" fill={p('glow')} />
    <rect x="15" y="20" width="2.2" height="12" rx="1.1" fill="#fff" opacity="0.9" />
  </>
));

const Blender = icon((p) => (
  <>
    <Shadow p={p} rx={13} />
    <rect x="13" y="2.5" width="22" height="4.5" rx="2.25" fill={p('side')} {...edge} />
    <path d="M14 7h20l-3 20H17z" fill={p('glass')} stroke="#9cc9ea" strokeWidth="0.75" />
    <path d="M17 11h3M17.5 15h2.5" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" />
    <path d="M13 27h22l2 12a2.5 2.5 0 0 1-2.5 2.5h-21A2.5 2.5 0 0 1 11 39z" fill={p('body')} {...edge} />
    <circle cx="24" cy="34" r="3" fill={p('glow')} />
  </>
));

const Iron = icon((p) => (
  <>
    <Shadow p={p} rx={19} />
    <path d="M20 24v-6a3.5 3.5 0 0 1 3.5-3.5H36a4 4 0 0 1 4 4v6" fill="none" stroke="#b8c2ce" strokeWidth="4" strokeLinecap="round" />
    <path d="M4 36h37v-6a5.5 5.5 0 0 0-5.5-5.5H18.5C11 24.5 5.5 28.5 4 36z" fill={p('body')} {...edge} />
    <rect x="4" y="35.5" width="37" height="4" rx="2" fill={p('metal')} {...edge} />
    <circle cx="33" cy="30.5" r="1.7" fill={p('glow')} />
  </>
));

const LaptopArt = icon((p) => (
  <>
    <Shadow p={p} rx={19} cy={41} />
    <rect x="8" y="7" width="32" height="23" rx="2.5" fill={p('dark')} />
    <rect x="10" y="9" width="28" height="19" rx="1.5" fill={p('screen')} />
    <path d="M10 22 24 9h7L10 27z" fill="#fff" opacity="0.28" />
    <path d="M3 31h42l-2.2 5.5a2.5 2.5 0 0 1-2.3 1.5h-33a2.5 2.5 0 0 1-2.3-1.5z" fill={p('body')} {...edge} />
    <rect x="20" y="31" width="8" height="1.8" rx="0.9" fill={p('side')} />
  </>
));

const DesktopArt = icon((p) => (
  <>
    <Shadow p={p} rx={13} cy={42} />
    <rect x="5" y="5" width="38" height="26" rx="3" fill={p('dark')} />
    <rect x="7" y="7" width="34" height="22" rx="1.8" fill={p('screen')} />
    <path d="M7 23 24 7h8L7 28z" fill="#fff" opacity="0.28" />
    <path d="M20.5 31h7l1.5 7h-10z" fill={p('metal')} {...edge} />
    <rect x="14" y="37.5" width="20" height="3.5" rx="1.75" fill={p('side')} {...edge} />
  </>
));

const PhoneCharger = icon((p) => (
  <>
    <Shadow p={p} rx={10} />
    <rect x="14" y="3" width="20" height="36" rx="4.5" fill={p('dark')} />
    <rect x="16" y="6.5" width="16" height="28" rx="2.5" fill={p('screen')} />
    <path d="M25.5 12 20 21.5h4l-1.5 7.5 5.5-9.5h-4z" fill={p('glow')} />
    <path d="M24 39v3.5" stroke="#9aa5b3" strokeWidth="2" strokeLinecap="round" />
  </>
));

const PrinterArt = icon((p) => (
  <>
    <Shadow p={p} rx={18} />
    <rect x="13" y="4" width="22" height="15" rx="1.5" fill="#fff" {...edge} />
    <path d="M17 9h14M17 13h10" stroke="#c9d1db" strokeWidth="1.2" strokeLinecap="round" />
    <rect x="5" y="17" width="38" height="16" rx="4.5" fill={p('body')} {...edge} />
    <circle cx="37" cy="22" r="1.5" fill={p('glow')} />
    <rect x="13" y="29" width="22" height="12" rx="1.5" fill="#fff" {...edge} />
    <rect x="11" y="28" width="26" height="2.5" rx="1.25" fill={p('side')} />
  </>
));

const RouterArt = icon((p) => (
  <>
    <Shadow p={p} rx={18} cy={39} />
    <rect x="10.5" y="7" width="3.2" height="18" rx="1.6" fill={p('metal')} {...edge} />
    <rect x="34.3" y="7" width="3.2" height="18" rx="1.6" fill={p('metal')} {...edge} />
    <rect x="5" y="23" width="38" height="13" rx="4.5" fill={p('body')} {...edge} />
    {[14, 19, 24].map((x) => (
      <circle key={x} cx={x} cy="29.5" r="1.4" fill={x === 14 ? p('glow') : '#7fd6a0'} />
    ))}
    <path d="M18.5 13a8 8 0 0 1 11 0M21 16a4.2 4.2 0 0 1 6 0" fill="none" stroke="#a4d3f6" strokeWidth="1.7" strokeLinecap="round" />
  </>
));

const CctvCamera = icon((p) => (
  <>
    <rect x="35" y="27" width="9" height="13" rx="2" fill={p('side')} {...edge} />
    <path d="M30 23l7 7" stroke="#b8c2ce" strokeWidth="4" strokeLinecap="round" />
    <rect x="5" y="11" width="29" height="14" rx="5" fill={p('body')} {...edge} transform="rotate(12 19.5 18)" />
    <circle cx="9.3" cy="16.5" r="4" fill={p('dark')} />
    <circle cx="9.3" cy="16.5" r="1.5" fill="#8fb6e6" />
    <circle cx="27" cy="18" r="1.3" fill={p('glow')} />
    <Shadow p={p} cx={30} cy={43} rx={13} />
  </>
));

const Plug = icon((p) => (
  <>
    <Shadow p={p} rx={11} />
    <circle cx="24" cy="21" r="15" fill={p('body')} {...edge} />
    <path d="M26 10 17 23h6l-2 11 9-14h-6z" fill={p('glow')} />
  </>
));

// Keyed by the exact preset name in @inverta/shared APPLIANCE_PRESETS.
const ICONS: Record<string, (props: IconProps) => JSX.Element> = {
  'LED bulb': Bulb,
  'Security floodlight': Floodlight,
  'Ceiling fan': CeilingFan,
  'Standing fan': StandingFan,
  'AC 1HP': AirConditioner,
  'AC 1.5HP': AirConditioner,
  'AC 2HP': AirConditioner,
  'Inverter AC 1.5HP': AirConditioner,
  Refrigerator: Fridge,
  Freezer: Freezer,
  'TV 32"': Television,
  'TV 43"': Television,
  'TV 55"': Television,
  'DSTV decoder': Decoder,
  'Sound system': SoundSystem,
  'Washing machine': WashingMachine,
  'Water pump': WaterPump,
  'Water heater': WaterHeater,
  Microwave: MicrowaveOven,
  'Electric kettle': Kettle,
  Blender: Blender,
  'Electric iron': Iron,
  Laptop: LaptopArt,
  'Desktop computer': DesktopArt,
  'Phone charger': PhoneCharger,
  Printer: PrinterArt,
  'WiFi router': RouterArt,
  'CCTV system': CctvCamera,
};

/** The appliance's icon; custom appliances get a plug. */
export function ApplianceIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? Plug;
  return <Icon className={cn('shrink-0', className)} />;
}
