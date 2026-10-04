export type Bubble = { who: string; text: string; kind?: "match" | "meh" };

export function Scenery() {
  return (
    <svg viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 w-full h-full" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
      <rect width="160" height="100" fill="#8fd16a" />
      <rect width="160" height="34" fill="#bfe6ff" />
      {/* buildings */}
      {[
        { x: 6, w: 26, h: 20, c: "#ff8a65", roof: "#d84315", label: "☕ Café" },
        { x: 36, w: 28, h: 24, c: "#ffd54f", roof: "#c49000", label: "🍺 Tap House" },
        { x: 68, w: 24, h: 18, c: "#4fc3f7", roof: "#0277bd", label: "🏋️ Gym" },
        { x: 96, w: 26, h: 22, c: "#ba68c8", roof: "#6a1b9a", label: "🎮 Arcade" },
        { x: 126, w: 28, h: 19, c: "#81c784", roof: "#2e7d32", label: "🛒 Market" },
      ].map((b) => (
        <g key={b.x}>
          <rect x={b.x} y={36 - b.h} width={b.w} height={b.h} fill={b.c} rx={1} />
          <rect x={b.x - 1} y={36 - b.h - 3} width={b.w + 2} height={4} fill={b.roof} rx={1} />
          <rect x={b.x + b.w / 2 - 3} y={28} width={6} height={8} fill="#5d4037" opacity={0.7} />
          <rect x={b.x + 3} y={36 - b.h + 4} width={5} height={4} fill="#fff" opacity={0.8} />
          <rect x={b.x + b.w - 8} y={36 - b.h + 4} width={5} height={4} fill="#fff" opacity={0.8} />
          <text x={b.x + b.w / 2} y={36 - b.h - 5} fontSize={3.4} textAnchor="middle" fontWeight={700} fill="#1d2433">{b.label}</text>
        </g>
      ))}
      {/* sidewalk + road */}
      <rect y={36} width={160} height={4} fill="#e0e0e0" />
      <rect y={40} width={160} height={8} fill="#9e9e9e" />
      {Array.from({ length: 16 }).map((_, i) => <rect key={i} x={i * 10 + 2} y={43.6} width={5} height={0.8} fill="#fff" />)}
      <rect y={48} width={160} height={2.5} fill="#e0e0e0" />
      {/* park: trees, pond, grill */}
      <ellipse cx={128} cy={88} rx={18} ry={6} fill="#4fc3f7" opacity={0.9} />
      {[[14, 62], [24, 80], [140, 60], [8, 92], [150, 74], [70, 96]].map(([x, y], i) => (
        <g key={i}>
          <rect x={x - 0.8} y={y - 3} width={1.6} height={4} fill="#6d4c41" />
          <circle cx={x} cy={y - 6} r={4.5} fill="#388e3c" />
          <circle cx={x + 2} cy={y - 8} r={3} fill="#43a047" />
        </g>
      ))}
      <g transform="translate(46 70)">
        <rect x={0} y={0} width={14} height={4} fill="#795548" rx={0.6} />
        <rect x={1} y={4} width={1} height={3} fill="#5d4037" />
        <rect x={12} y={4} width={1} height={3} fill="#5d4037" />
        <text x={7} y={-1.5} fontSize={3} textAnchor="middle">🔥 BBQ</text>
      </g>
      <rect x={96} y={62} width={16} height={7} fill="#c8e6c9" stroke="#fff" strokeWidth={0.6} />
      <text x={104} y={60.5} fontSize={2.8} textAnchor="middle">🏓 Courts</text>
    </svg>
  );
}

/** `x` is the speaker's position (0–100%) so bubbles near an edge open inward instead of getting cut off. */
export function SpeechBubble({ b, x = 50 }: { b: Bubble; x?: number }) {
  const align = x < 22 ? "left-0" : x > 78 ? "right-0" : "left-1/2 -translate-x-1/2";
  const tail = x < 22 ? "left-4" : x > 78 ? "right-4" : "left-1/2 -translate-x-1/2";
  return (
    <div
      className={`pop absolute bottom-full ${align} mb-1 w-max max-w-[200px] rounded-2xl px-3 py-2 text-xs leading-snug shadow-lg border-2 ${
        b.kind === "match" ? "bg-accent text-[#1d2433] border-[#1d2433]" : "bg-white text-[#1d2433] border-[#1d2433]/20"
      }`}
    >
      {b.text}
      <span className={`absolute ${tail} -bottom-1.5 w-3 h-3 rotate-45 bg-inherit border-r-2 border-b-2 border-inherit`} />
    </div>
  );
}
