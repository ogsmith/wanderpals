import { AvatarLook, EYE_COLORS, HAIR_COLORS, SKIN_TONES } from "@/lib/types";

function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v + amt)));
  const r = c(n >> 16),
    g = c((n >> 8) & 255),
    b = c(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

const INK = "#2a2633";

// Big round head: ellipse centered (50, 42), spans x 16–84, y 11–73.
// Soft side-swept bangs shared by most styles.
const BANGS = "M14 46 Q11 7 50 7 Q89 7 86 46 Q81 29 67 26 Q59 33 46 28 Q29 23 14 46 Z";

function Cowlick({ color }: { color: string }) {
  return <path d="M49 9 Q52 -1 61 2" stroke={color} strokeWidth={3.2} fill="none" strokeLinecap="round" />;
}

/** Hair that sits behind the head (long styles). */
function HairBack({ look }: { look: AvatarLook }) {
  const fill = shade(HAIR_COLORS[look.hair], -14);
  switch (look.hairStyle) {
    case "long":
    case "bangs":
      return <rect x={11} y={14} width={78} height={66} rx={28} fill={fill} />;
    case "bob":
      return <rect x={11} y={14} width={78} height={50} rx={24} fill={fill} />;
    case "wavy":
      return (
        <g fill={fill}>
          <rect x={11} y={14} width={78} height={60} rx={26} />
          {[[14, 68], [17, 80], [27, 86], [86, 68], [83, 80], [73, 86]].map(([cx, cy]) => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={8} />
          ))}
        </g>
      );
    case "ponytail":
      return (
        <g>
          <path d="M78 24 Q102 32 94 74 Q88 56 76 44 Z" fill={fill} />
          <circle cx={82} cy={28} r={4.5} fill="#ff7d8f" />
        </g>
      );
    default:
      return null;
  }
}

function HairFront({ look }: { look: AvatarLook }) {
  const fill = HAIR_COLORS[look.hair];
  switch (look.hairStyle) {
    case "bald":
      return <ellipse cx={38} cy={20} rx={7} ry={3.5} fill="#fff" opacity={0.35} />;
    case "spiky":
      return <path d="M14 44 L16 18 L26 22 L30 5 L40 15 L50 -2 L60 15 L70 5 L74 22 L84 18 L86 44 Q70 26 50 28 Q30 26 14 44 Z" fill={fill} />;
    case "curly":
      return (
        <g fill={fill}>
          {[20, 30, 40, 50, 60, 70, 80].map((x, i) => (
            <circle key={i} cx={x} cy={i % 2 ? 11 : 16} r={10} />
          ))}
          <circle cx={15} cy={32} r={8} />
          <circle cx={85} cy={32} r={8} />
        </g>
      );
    case "pigtails":
      return (
        <g fill={fill}>
          <circle cx={11} cy={42} r={10} />
          <circle cx={89} cy={42} r={10} />
          <circle cx={17} cy={34} r={3.5} fill="#ff7d8f" />
          <circle cx={83} cy={34} r={3.5} fill="#ff7d8f" />
          <path d={BANGS} />
        </g>
      );
    case "bun":
      return (
        <g fill={fill}>
          <circle cx={50} cy={4} r={12} />
          <path d={BANGS} />
        </g>
      );
    case "bangs":
      // Straight blunt fringe
      return <path d="M16 44 Q13 6 50 6 Q87 6 84 44 L84 31 Q50 27 16 31 Z" fill={fill} />;
    case "wavy":
      // Side part on the other side, for a softer look
      return <path d={BANGS} fill={fill} transform="translate(100 0) scale(-1 1)" />;
    case "braid":
      return (
        <g fill={fill}>
          <path d={BANGS} />
          {[[80, 50], [83, 59], [84, 68], [84, 77], [83, 86]].map(([cx, cy]) => (
            <circle key={cy} cx={cx} cy={cy} r={5.6} stroke={shade(fill, -25)} strokeWidth={1} />
          ))}
          <circle cx={83} cy={92} r={3.2} fill="#ff7d8f" />
          <path d="M81 94 Q83 101 86 96" stroke={fill} strokeWidth={3} fill="none" strokeLinecap="round" />
        </g>
      );
    case "puffs":
      return (
        <g fill={fill}>
          <circle cx={21} cy={9} r={13} />
          <circle cx={79} cy={9} r={13} />
          <path d="M17 36 Q14 8 50 8 Q86 8 83 36 Q66 20 50 22 Q34 20 17 36 Z" />
        </g>
      );
    case "pixie":
      return (
        <g fill={fill}>
          <path d="M15 42 Q10 4 50 4 Q90 4 85 36 Q76 21 60 22 Q46 31 30 24 Q22 29 15 42 Z" />
          <path d="M16 42 Q14 50 18 54 Q19 46 22 42 Z" />
          <path d="M84 40 Q87 48 82 54 Q81 46 78 42 Z" />
        </g>
      );
    default: // short, long, ponytail, bob
      return (
        <g>
          <path d={BANGS} fill={fill} />
          {look.hairStyle === "short" && <Cowlick color={fill} />}
        </g>
      );
  }
}

/** Frame-by-frame pose (used by the promo video, where CSS animations can't be used). Angles in degrees. */
export type Pose = { body?: number; bob?: number; footL?: number; footR?: number; armL?: number; armR?: number; head?: number };

export default function Avatar({
  look,
  size = 120,
  walking = false,
  waving = false,
  className = "",
  pose,
}: {
  look: AvatarLook;
  size?: number;
  walking?: boolean;
  waving?: boolean;
  className?: string;
  pose?: Pose;
}) {
  const posed = (origin: string, transform: string) =>
    pose ? { transformBox: "fill-box" as const, transformOrigin: origin, transform } : undefined;
  const skin = SKIN_TONES[look.skin];
  const eye = EYE_COLORS[look.eyes];
  const shoe = shade(look.pants, -10);
  const W = 100,
    H = 140;

  return (
    <svg
      viewBox={`0 -12 ${W} ${H}`}
      width={size * (W / H)}
      height={size}
      className={pose ? className : `avatar ${walking ? "walking" : ""} ${waving ? "waving" : ""} ${className}`}
      aria-hidden
    >
      <ellipse cx={50} cy={124} rx={22} ry={3.5} fill="#000" opacity={0.12} />
      <g className="body" style={posed("50% 100%", `translateY(${pose?.bob ?? 0}px) rotate(${pose?.body ?? 0}deg)`)}>
        {/* little round feet */}
        <ellipse className="foot foot-l" style={posed("50% 50%", `translateY(${-(pose?.footL ?? 0)}px)`)} cx={40} cy={117} rx={9.5} ry={6} fill={shoe} />
        <ellipse className="foot foot-r" style={posed("50% 50%", `translateY(${-(pose?.footR ?? 0)}px)`)} cx={60} cy={117} rx={9.5} ry={6} fill={shoe} />

        {/* stubby nub arms */}
        <g className="arm arm-l" style={posed("80% 15%", `rotate(${pose?.armL ?? 0}deg)`)}>
          <ellipse cx={28} cy={90} rx={6.5} ry={10} fill={shade(look.shirt, -18)} transform="rotate(25 28 90)" />
        </g>
        <g className="arm arm-r" style={posed("20% 15%", `rotate(${pose?.armR ?? 0}deg)`)}>
          <ellipse cx={72} cy={90} rx={6.5} ry={10} fill={shade(look.shirt, -18)} transform="rotate(-25 72 90)" />
        </g>

        {/* bean body: shirt on top, pants below */}
        <clipPath id={`bean-${look.shirt.slice(1)}-${look.pants.slice(1)}`}>
          <rect x={29} y={68} width={42} height={48} rx={20} />
        </clipPath>
        <g clipPath={`url(#bean-${look.shirt.slice(1)}-${look.pants.slice(1)})`}>
          <rect x={29} y={68} width={42} height={48} fill={look.shirt} />
          <rect x={29} y={102} width={42} height={14} fill={look.pants} />
          <ellipse cx={41} cy={80} rx={5} ry={7} fill="#fff" opacity={0.15} />
        </g>

        {/* head */}
        <g className="head" style={posed("50% 90%", `rotate(${pose?.head ?? 0}deg)`)}>
          <HairBack look={look} />
          <ellipse cx={50} cy={42} rx={34} ry={31} fill={skin} />
          <HairFront look={look} />
          {/* sparkly eyes in your eye color */}
          {[37, 63].map((cx) => (
            <g key={cx} className="eye">
              <ellipse cx={cx} cy={48} rx={5.6} ry={6.8} fill={INK} />
              <ellipse cx={cx} cy={49.2} rx={4.2} ry={5.2} fill={eye} />
              <circle cx={cx + 1.9} cy={45.6} r={2.1} fill="#fff" />
              <circle cx={cx - 1.6} cy={51.6} r={0.95} fill="#fff" />
            </g>
          ))}
          {look.glasses && (
            <g stroke={INK} strokeWidth={1.8} fill="none">
              <circle cx={37} cy={48} r={9.5} />
              <circle cx={63} cy={48} r={9.5} />
              <path d="M46.5 47 Q50 45 53.5 47" />
            </g>
          )}
          <ellipse cx={26} cy={58} rx={5.2} ry={3.2} fill="#ff7d8f" opacity={0.45} />
          <ellipse cx={74} cy={58} rx={5.2} ry={3.2} fill="#ff7d8f" opacity={0.45} />
          <path d="M46 58 Q50 62.5 54 58" stroke={INK} strokeWidth={2.2} fill="none" strokeLinecap="round" />
        </g>
      </g>
    </svg>
  );
}
