/** Wanderpals mark: a tiny pal's head (same style as the avatars). */
export default function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden>
      <ellipse cx={32} cy={36} rx={27} ry={25} fill="var(--brand)" />
      <path d="M31 12 Q34 3 43 6" stroke="var(--brand)" strokeWidth={4} fill="none" strokeLinecap="round" />
      <ellipse cx={22} cy={38} rx={4} ry={5} fill="#fff" />
      <ellipse cx={42} cy={38} rx={4} ry={5} fill="#fff" />
      <circle cx={23.4} cy={36} r={1.5} fill="var(--brand)" />
      <circle cx={43.4} cy={36} r={1.5} fill="var(--brand)" />
      <ellipse cx={14} cy={46} rx={4} ry={2.5} fill="#fff" opacity={0.35} />
      <ellipse cx={50} cy={46} rx={4} ry={2.5} fill="#fff" opacity={0.35} />
      <path d="M28 47 Q32 51 36 47" stroke="#fff" strokeWidth={2.6} fill="none" strokeLinecap="round" />
    </svg>
  );
}
