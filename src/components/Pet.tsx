import { PET_COLORS, type Pet as PetT } from "@/lib/types";

function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v + amt)));
  return `#${((c(n >> 16) << 16) | (c((n >> 8) & 255) << 8) | c(n & 255)).toString(16).padStart(6, "0")}`;
}

const INK = "#2a2633";

/** A tiny dog or cat in the same soft style as the pals. Faces right; flip with scaleX(-1). */
export default function Pet({ pet, size = 40, walking = false, className = "" }: { pet: PetT; size?: number; walking?: boolean; className?: string }) {
  const palette = PET_COLORS[pet.kind] as Record<string, string>;
  const fur = palette[pet.color] ?? Object.values(palette)[0];
  const dark = shade(fur, -45);
  const light = pet.color === "white" ? "#ffffff" : shade(fur, 45);
  const W = 64,
    H = 52;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={size * (W / H)} height={size} className={`pet ${walking ? "walking" : ""} ${className}`} aria-label={`${pet.name || "Your pet"} the ${pet.kind}`}>
      <ellipse cx={32} cy={49} rx={20} ry={2.5} fill="#000" opacity={0.12} />
      <g className="pet-body">
        {/* tail */}
        {pet.kind === "dog" ? (
          <path className="pet-tail" d="M12 30 Q2 24 6 14" stroke={fur} strokeWidth={5} fill="none" strokeLinecap="round" />
        ) : (
          <path className="pet-tail" d="M12 32 Q-2 30 4 14 Q6 8 10 12" stroke={fur} strokeWidth={4} fill="none" strokeLinecap="round" />
        )}
        {/* legs */}
        {[16, 24, 36, 44].map((x, i) => (
          <rect key={x} className={`pet-leg ${i % 2 ? "b" : "a"}`} x={x - 2.5} y={36} width={5} height={10} rx={2.5} fill={dark} />
        ))}
        {/* body */}
        <ellipse cx={30} cy={32} rx={19} ry={11} fill={fur} />
        <ellipse cx={30} cy={36} rx={12} ry={5} fill={light} opacity={0.6} />
        {/* head */}
        <g className="pet-head">
          {pet.kind === "dog" ? (
            <>
              <circle cx={48} cy={20} r={12} fill={fur} />
              <ellipse cx={39.5} cy={20} rx={4.5} ry={8} fill={dark} transform="rotate(20 39.5 20)" />
              <ellipse cx={55} cy={19} rx={4} ry={7.5} fill={dark} transform="rotate(-25 55 19)" />
              <ellipse cx={53} cy={25} rx={6} ry={4.5} fill={light} />
              <ellipse cx={57} cy={23.5} rx={2.2} ry={1.7} fill={INK} />
              <path d="M52 27.5 Q54 30 56.5 28" stroke={INK} strokeWidth={1.3} fill="none" strokeLinecap="round" />
            </>
          ) : (
            <>
              <path d="M38 14 L40 2 L47 10 Z" fill={fur} />
              <path d="M51 10 L58 2 L58 15 Z" fill={fur} />
              <path d="M40.5 11 L41 6 L44.5 10 Z" fill="#ff9fb0" />
              <path d="M54 10 L57 6 L57 12 Z" fill="#ff9fb0" />
              <circle cx={48} cy={20} r={11} fill={fur} />
              <path d="M52 24 l1.6 1.5 l1.6 -1.5 Z" fill="#ff7d8f" />
              <path d="M51 26.5 Q53.2 28.5 55.4 26.5" stroke={INK} strokeWidth={1.1} fill="none" strokeLinecap="round" />
              <g stroke={INK} strokeWidth={0.8} opacity={0.6} strokeLinecap="round">
                <path d="M57 24 L63 23" />
                <path d="M57 26 L63 27" />
              </g>
            </>
          )}
          {/* eyes */}
          <ellipse cx={47} cy={18} rx={2.2} ry={2.6} fill={INK} />
          <ellipse cx={53.5} cy={18} rx={2.2} ry={2.6} fill={INK} />
          <circle cx={47.8} cy={17} r={0.8} fill="#fff" />
          <circle cx={54.3} cy={17} r={0.8} fill="#fff" />
          <ellipse cx={44} cy={23} rx={2.4} ry={1.4} fill="#ff7d8f" opacity={0.4} />
        </g>
      </g>
    </svg>
  );
}
