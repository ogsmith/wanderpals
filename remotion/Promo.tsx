import { loadFont } from "@remotion/google-fonts/Fredoka";
import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, Easing, interpolate, random, Sequence, spring, useCurrentFrame, useVideoConfig } from "remotion";
import Avatar, { type Pose } from "@/components/Avatar";
import { Scenery } from "@/components/TownScene";
import { POPULATION } from "@/lib/population";
import type { AvatarLook } from "@/lib/types";

const { fontFamily } = loadFont("normal", { weights: ["400", "600", "700"], subsets: ["latin"] });

const C = { brand: "#ff5a36", ink: "#1d2433", sky: "#eaf6ff", accent: "#ffd23f", muted: "#5d6b82", good: "#2bb673" };
const ME: AvatarLook = { skin: "fair", hair: "brown", hairStyle: "short", eyes: "blue", glasses: false, shirt: "#2f6fde", pants: "#2b3445" };
const person = (first: string) => POPULATION.find((p) => p.name.startsWith(first))!;
const MIKE = person("Mike");
const CREW = [person("Tom"), person("Jordan")];

// Scene timings (30fps)
const S = {
  hook: [0, 120],
  build: [120, 150],
  tell: [270, 150],
  town: [420, 210],
  found: [630, 135],
  group: [765, 120],
  travel: [885, 120],
  outro: [1005, 135],
} as const;
export const PROMO_FRAMES = 1140;

/* --------------------------------- helpers --------------------------------- */

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const useUnit = () => {
  const { width, height } = useVideoConfig();
  return Math.min(width, height) / 1080; // 1 at 1080p; scales the square cut too
};
const useWide = () => {
  const { width, height } = useVideoConfig();
  return width / height > 1.3;
};

function walkPose(f: number, speed = 1): Pose {
  const t = f * 0.42 * speed;
  return {
    body: Math.sin(t) * 6,
    bob: -Math.abs(Math.sin(t)) * 3,
    footL: Math.max(0, Math.sin(t)) * 5,
    footR: Math.max(0, -Math.sin(t)) * 5,
    armL: Math.sin(t) * 16,
    armR: -Math.sin(t) * 16,
  };
}
const idlePose = (f: number): Pose => ({ head: Math.sin(f / 18) * 4, bob: Math.sin(f / 9) * 0.8 });
const wavePose = (f: number): Pose => ({ ...idlePose(f), armR: -128 + Math.sin(f / 3) * 22 });
function jumpPose(f: number, delay = 0): Pose & { y: number } {
  const t = ((f + delay) % 22) / 22;
  return { ...wavePose(f), y: -Math.sin(t * Math.PI) * 40 };
}

/** Fades a scene in and out so cuts feel soft. */
function Scene({ children, dur, bg }: { children: ReactNode; dur: number; bg?: string }) {
  const f = useCurrentFrame();
  const opacity = interpolate(f, [0, 8, dur - 8, dur], [0, 1, 1, 0], clamp);
  return <AbsoluteFill style={{ opacity, background: bg, fontFamily, color: C.ink, isolation: "isolate" }}>{children}</AbsoluteFill>;
}

function Pop({ at, children, style }: { at: number; children: ReactNode; style?: CSSProperties }) {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f - at, fps, config: { damping: 11, stiffness: 160 } });
  return <div style={{ transform: `scale(${s}) translateY(${(1 - s) * 30}px)`, opacity: Math.min(1, s * 1.5), ...style }}>{children}</div>;
}

function Title({ children, size = 96, color = C.ink, style }: { children: ReactNode; size?: number; color?: string; style?: CSSProperties }) {
  const u = useUnit();
  return <div style={{ fontSize: size * u, fontWeight: 700, lineHeight: 1.05, letterSpacing: -1, color, textAlign: "center", ...style }}>{children}</div>;
}

function Bubble({ text, kind, style }: { text: string; kind?: "match"; style?: CSSProperties }) {
  const u = useUnit();
  return (
    <div
      style={{
        position: "absolute",
        padding: `${12 * u}px ${20 * u}px`,
        borderRadius: 22 * u,
        fontSize: 30 * u,
        fontWeight: 600,
        whiteSpace: "nowrap",
        background: kind === "match" ? C.accent : "#fff",
        border: `${3 * u}px solid ${kind === "match" ? C.ink : "rgba(29,36,51,.15)"}`,
        boxShadow: "0 8px 24px rgba(0,0,0,.12)",
        ...style,
      }}
    >
      {text}
    </div>
  );
}

function Chip({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  const u = useUnit();
  return (
    <div style={{ display: "inline-block", padding: `${14 * u}px ${26 * u}px`, borderRadius: 999, background: "#fff", border: `${3 * u}px solid #d6e3f0`, fontSize: 34 * u, fontWeight: 600, boxShadow: "0 6px 18px rgba(0,0,0,.06)", ...style }}>
      {children}
    </div>
  );
}

function Confetti({ count = 90 }: { count?: number }) {
  const f = useCurrentFrame();
  const { height } = useVideoConfig();
  const colors = [C.brand, C.accent, C.good, "#3a7bd5", "#e84393", "#8e44ad"];
  return (
    <AbsoluteFill style={{ pointerEvents: "none", overflow: "hidden" }}>
      {Array.from({ length: count }, (_, i) => {
        const x = random(`x${i}`) * 100;
        const delay = random(`d${i}`) * 25;
        const speed = 9 + random(`s${i}`) * 10;
        const size = 10 + random(`z${i}`) * 16;
        const y = (f - delay) * speed - 40;
        if (y < -40) return null;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${x + Math.sin((f + i * 7) / 8) * 1.5}%`,
              top: y % (height + 80),
              width: size,
              height: random(`r${i}`) < 0.35 ? size : size * 0.45,
              borderRadius: random(`r${i}`) < 0.35 ? "50%" : 3,
              background: colors[i % colors.length],
              transform: `rotate(${(f - delay) * (random(`w${i}`) * 20 - 10)}deg)`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
}

function Rays({ size }: { size: number }) {
  const f = useCurrentFrame();
  return (
    <div
      style={{
        position: "absolute",
        width: size,
        height: size,
        left: "50%",
        top: "50%",
        transform: `translate(-50%, -50%) rotate(${f * 0.6}deg)`,
        background: `repeating-conic-gradient(from 0deg, rgba(255,210,63,.55) 0 10deg, transparent 10deg 20deg)`,
        WebkitMaskImage: "radial-gradient(circle, black 18%, transparent 62%)",
        maskImage: "radial-gradient(circle, black 18%, transparent 62%)",
      }}
    />
  );
}

/* ---------------------------------- scenes ---------------------------------- */

function Hook() {
  const f = useCurrentFrame();
  const u = useUnit();
  const look = f < 55 ? 1 : f < 80 ? -1 : 1; // glances around
  return (
    <Scene dur={S.hook[1]} bg={`linear-gradient(${C.sky}, #dff1ff)`}>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", gap: 18 * u, paddingBottom: 260 * u }}>
        <Pop at={4}>
          <Title>Making friends as an adult</Title>
        </Pop>
        <Pop at={30}>
          <Title size={130} color={C.brand} style={{ transform: `rotate(${Math.sin(f / 6) * 2}deg)` }}>
            is hard.
          </Title>
        </Pop>
        <Pop at={60}>
          <div style={{ fontSize: 36 * u, color: C.muted, fontWeight: 400 }}>Especially ones in the same season of life.</div>
        </Pop>
      </AbsoluteFill>
      <div style={{ position: "absolute", left: "50%", bottom: 60 * u, transform: `translateX(-50%) scaleX(${look})` }}>
        <Avatar look={ME} size={300 * u} pose={idlePose(f)} />
      </div>
      {f > 70 && <Bubble text="…anyone?" style={{ left: "50%", bottom: 380 * u, transform: "translateX(-30%)", opacity: interpolate(f, [70, 78], [0, 1], clamp) }} />}
    </Scene>
  );
}

function Build() {
  const f = useCurrentFrame();
  const u = useUnit();
  const wide = useWide();
  const { fps } = useVideoConfig();
  const hairs: AvatarLook["hair"][] = ["black", "blonde", "red", "gray", "brown"];
  const styles: AvatarLook["hairStyle"][] = ["spiky", "curly", "long", "bun", "short"];
  const i = Math.min(hairs.length - 1, Math.max(0, Math.floor((f - 55) / 9)));
  const look: AvatarLook = f < 55 ? { ...ME, hair: "black", hairStyle: "spiky", eyes: "brown" } : { ...ME, hair: hairs[i], hairStyle: styles[i], eyes: i === hairs.length - 1 ? "blue" : "brown" };
  const appear = spring({ frame: f - 40, fps, config: { damping: 9 } });
  return (
    <Scene dur={S.build[1]} bg={`linear-gradient(135deg, #fff4e8, ${C.sky})`}>
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 70 * u }}>
        <Pop at={2}>
          <Title>What if a little you</Title>
        </Pop>
        <Pop at={14}>
          <Title color={C.brand}>could go find them?</Title>
        </Pop>
      </AbsoluteFill>
      <AbsoluteFill style={{ flexDirection: wide ? "row" : "column", justifyContent: "center", alignItems: "center", gap: 70 * u, paddingTop: 260 * u }}>
        <Pop at={22}>
          <div style={{ width: 260 * u, height: 300 * u, background: "#fff", borderRadius: 18 * u, padding: 16 * u, boxShadow: "0 18px 40px rgba(0,0,0,.15)", transform: "rotate(-6deg)" }}>
            <div style={{ height: 220 * u, borderRadius: 10 * u, background: "linear-gradient(#cfe7ff,#ffe0cc)", display: "grid", placeItems: "center", fontSize: 120 * u }}>🤳</div>
            <div style={{ textAlign: "center", fontSize: 28 * u, marginTop: 10 * u, fontWeight: 600 }}>your selfie</div>
          </div>
        </Pop>
        <Pop at={34}>
          <div style={{ fontSize: 90 * u, color: C.brand }}>{wide ? "→" : "↓"}</div>
        </Pop>
        <div style={{ transform: `scale(${appear})`, position: "relative" }}>
          <Avatar look={look} size={400 * u} pose={f > 110 ? wavePose(f) : idlePose(f)} />
          {f > 105 && (
            <Pop at={105} style={{ position: "absolute", top: -10 * u, right: -150 * u }}>
              <Chip style={{ background: C.accent, borderColor: C.ink }}>✨ Brown hair, blue eyes</Chip>
            </Pop>
          )}
        </div>
      </AbsoluteFill>
    </Scene>
  );
}

function Tell() {
  const f = useCurrentFrame();
  const u = useUnit();
  const wide = useWide();
  const chips = ["🎮 video games", "🔥 grilling", "🍺 craft beer", "👶 baby on the way", "🚀 founder", "📍 North of Boston", "🏈 Patriots"];
  return (
    <Scene dur={S.tell[1]} bg={`linear-gradient(${C.sky}, #fff)`}>
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 70 * u }}>
        <Pop at={2}>
          <Title>Tell it who you are.</Title>
        </Pop>
        <Pop at={12}>
          <div style={{ fontSize: 38 * u, color: C.muted, marginTop: 10 * u }}>Take a quick quiz — or just talk for a few minutes.</div>
        </Pop>
      </AbsoluteFill>
      <AbsoluteFill style={{ flexDirection: wide ? "row" : "column", justifyContent: "center", alignItems: "center", gap: (wide ? 60 : 20) * u, paddingTop: (wide ? 200 : 170) * u }}>
        <div style={{ position: "relative" }}>
          <Avatar look={ME} size={(wide ? 360 : 230) * u} pose={idlePose(f)} />
          <div style={{ position: "absolute", bottom: 20 * u, right: -40 * u, fontSize: 80 * u, transform: `scale(${1 + Math.sin(f / 4) * 0.08})` }}>🎙️</div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16 * u, maxWidth: (wide ? 820 : 900) * u, justifyContent: "center" }}>
          {chips.map((c, i) => (
            <Pop key={c} at={20 + i * 7}>
              <Chip>{c}</Chip>
            </Pop>
          ))}
          <Pop at={78} style={{ width: "100%", display: "flex", justifyContent: "center", marginTop: 20 * u }}>
            <div style={{ background: "#fff", border: `${4 * u}px solid ${C.brand}`, borderRadius: 30 * u, padding: `${22 * u}px ${40 * u}px`, textAlign: "center", boxShadow: "0 18px 40px rgba(255,90,54,.2)" }}>
              <div style={{ fontSize: 24 * u, letterSpacing: 4, color: C.muted, fontWeight: 600 }}>AI SAYS YOU&apos;RE…</div>
              <div style={{ fontSize: 54 * u, fontWeight: 700, color: C.brand, whiteSpace: "nowrap" }}>The Ambitious Parent‑to‑Be</div>
            </div>
          </Pop>
        </div>
      </AbsoluteFill>
    </Scene>
  );
}

function Town() {
  const f = useCurrentFrame();
  const u = useUnit();
  const folks = POPULATION.slice(0, 14);
  const meX = interpolate(f, [0, 85], [-6, 42], { ...clamp, easing: Easing.out(Easing.quad) });
  const walking = f < 85 || (f > 140 && f < 175);
  const meX2 = f > 140 ? interpolate(f, [140, 175], [42, 58], clamp) : meX;
  const diary = [
    [40, "Said hi to Grace"],
    [110, "Said hi to Sophie"],
    [185, "Found a friend: Mike! 💛"],
  ] as const;
  return (
    <Scene dur={S.town[1] + S.found[1]}>
      <Scenery />
      {folks.map((p, i) => {
        const bx = 8 + (i % 7) * 13.5 + random(`fx${i}`) * 5;
        const by = 60 + Math.floor(i / 7) * 20 + random(`fy${i}`) * 8;
        const wander = Math.sin((f + i * 40) / 40) * 3;
        const isMike = p.id === MIKE.id;
        const x = isMike ? 64 : bx + wander;
        const y = isMike ? 72 : by;
        const moving = !isMike && Math.abs(Math.cos((f + i * 40) / 40)) > 0.5;
        return (
          <div key={p.id} style={{ position: "absolute", left: `${x}%`, top: `${y}%`, transform: `translate(-50%,-100%) scaleX(${isMike ? -1 : Math.cos((f + i * 40) / 40) > 0 ? 1 : -1})`, zIndex: Math.round(y) }}>
            <Avatar look={p.look} size={130 * u} pose={isMike && f > 175 ? wavePose(f) : moving ? walkPose(f + i * 5, 0.8) : idlePose(f + i * 9)} />
          </div>
        );
      })}
      <div style={{ position: "absolute", left: `${meX2}%`, top: "72%", transform: "translate(-50%,-100%)", zIndex: 200 }}>
        <Avatar look={ME} size={170 * u} pose={walking ? walkPose(f) : idlePose(f)} />
        <div style={{ position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)", background: C.brand, color: "#fff", borderRadius: 999, padding: `${2 * u}px ${12 * u}px`, fontSize: 22 * u, fontWeight: 700 }}>YOU</div>
      </div>
      {f > 92 && f < 135 && <Bubble text="Hi there! 👋" style={{ left: "38%", top: "43%", zIndex: 300 }} />}
      {f > 180 && <Bubble text="Wait — you're expecting too?! 🙌" kind="match" style={{ left: "52%", top: "40%", zIndex: 300 }} />}
      {/* diary */}
      <div style={{ position: "absolute", right: 30 * u, top: 30 * u, width: 400 * u, background: "rgba(255,255,255,.95)", borderRadius: 26 * u, padding: 22 * u, boxShadow: "0 12px 30px rgba(0,0,0,.12)", zIndex: 400 }}>
        <div style={{ fontWeight: 700, fontSize: 30 * u, marginBottom: 10 * u }}>Town diary</div>
        {diary.filter(([at]) => f > at).reverse().map(([at, text]) => (
          <Pop key={text} at={at}>
            <div style={{ fontSize: 24 * u, padding: `${8 * u}px ${12 * u}px`, borderRadius: 12 * u, marginBottom: 6 * u, background: text.includes("💛") ? "rgba(255,210,63,.45)" : "transparent", fontWeight: text.includes("💛") ? 700 : 400, color: text.includes("💛") ? C.ink : C.muted }}>
              {text}
            </div>
          </Pop>
        ))}
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 40 * u, display: "flex", justifyContent: "center", zIndex: 500 }}>
        <Pop at={10}>
          <div style={{ background: C.ink, color: "#fff", borderRadius: 24 * u, padding: `${16 * u}px ${34 * u}px`, fontSize: 44 * u, fontWeight: 600, textAlign: "center", margin: `0 ${30 * u}px` }}>Your little you strolls around town — meeting people for you.</div>
        </Pop>
      </div>
    </Scene>
  );
}

function Found() {
  const f = useCurrentFrame();
  const u = useUnit();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f - 4, fps, config: { damping: 9, stiffness: 120 } });
  const a = jumpPose(f),
    b = jumpPose(f, 6);
  return (
    <Scene dur={S.found[1]} bg="rgba(29,36,51,.75)">
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{ position: "relative", width: 900 * u, padding: 40 * u, borderRadius: 50 * u, background: "#fff", border: `${8 * u}px solid ${C.accent}`, overflow: "hidden", transform: `scale(${s}) rotate(${(1 - s) * -8}deg)`, textAlign: "center", boxShadow: "0 40px 80px rgba(0,0,0,.35)" }}>
          <Rays size={1600 * u} />
          <div style={{ position: "relative" }}>
            <div style={{ fontSize: 30 * u, letterSpacing: 8, color: C.brand, fontWeight: 700 }}>NEW PAL FOUND!</div>
            <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-end", gap: 10 * u, height: 330 * u }}>
              <div style={{ transform: `translateY(${a.y * u}px)` }}>
                <Avatar look={ME} size={280 * u} pose={a} />
              </div>
              <div style={{ transform: `translateY(${b.y * u}px) scaleX(-1)` }}>
                <Avatar look={MIKE.look} size={280 * u} pose={b} />
              </div>
            </div>
            <div style={{ fontSize: 76 * u, fontWeight: 700, marginTop: 6 * u }}>Mike, 32</div>
            <div style={{ fontSize: 34 * u, fontWeight: 600, color: C.brand }}>Also expecting · Also a founder · Lives nearby</div>
            <Pop at={35}>
              <div style={{ marginTop: 24 * u, background: "rgba(255,210,63,.35)", borderRadius: 24 * u, padding: `${18 * u}px ${24 * u}px`, fontSize: 32 * u }}>
                🍻 <b>You both like beer</b> — grab a pint this Friday?
              </div>
            </Pop>
          </div>
        </div>
      </AbsoluteFill>
      <Confetti />
    </Scene>
  );
}

function GroupScene() {
  const f = useCurrentFrame();
  const u = useUnit();
  const crew = [{ look: ME, from: -40 }, { look: MIKE.look, from: 140 }, { look: CREW[0].look, from: -60 }, { look: CREW[1].look, from: 160 }];
  return (
    <Scene dur={S.group[1]} bg={`linear-gradient(160deg, #fff4d6, #ffe3ec)`}>
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 70 * u }}>
        <Pop at={2}>
          <Title>Even whole friend groups.</Title>
        </Pop>
        <Pop at={12}>
          <div style={{ fontSize: 38 * u, color: C.muted, marginTop: 10 * u }}>3–4 people who all get along — not just with you.</div>
        </Pop>
      </AbsoluteFill>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", paddingTop: 120 * u }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 0 }}>
          {crew.map((c, i) => {
            const x = interpolate(f, [8 + i * 5, 50 + i * 5], [c.from, 0], { ...clamp, easing: Easing.out(Easing.cubic) });
            const arrived = f > 50 + i * 5;
            const j = jumpPose(f, i * 5);
            return (
              <div key={i} style={{ transform: `translate(${x * 8 * u}px, ${arrived ? j.y * 0.6 * u : 0}px)` }}>
                <Avatar look={c.look} size={290 * u} pose={arrived ? j : walkPose(f + i * 3)} />
              </div>
            );
          })}
        </div>
        {f > 55 &&
          ["💛", "💖", "✨", "💛"].map((h, i) => (
            <div key={i} style={{ position: "absolute", left: `${30 + i * 13}%`, top: `${62 - ((f - 55 - i * 6) % 50) * 0.6}%`, fontSize: 60 * u, opacity: interpolate((f - 55 - i * 6) % 50, [0, 10, 40, 50], [0, 1, 1, 0]) }}>
              {h}
            </div>
          ))}
        <Pop at={62} style={{ marginTop: 30 * u }}>
          <div style={{ background: "#fff", borderRadius: 30 * u, padding: `${18 * u}px ${36 * u}px`, textAlign: "center", border: `${4 * u}px solid ${C.accent}` }}>
            <div style={{ fontSize: 54 * u, fontWeight: 700 }}>The Parents-to-Be Grill Crew</div>
            <div style={{ fontSize: 30 * u, color: C.muted }}>🔥 Backyard cookout this Sunday?</div>
          </div>
        </Pop>
      </AbsoluteFill>
    </Scene>
  );
}

function Travel() {
  const f = useCurrentFrame();
  const u = useUnit();
  const cities = ["Austin", "Nashville", "London", "Lisbon"];
  const city = cities[Math.min(cities.length - 1, Math.floor(f / 22))];
  const planeX = interpolate(f, [0, 70], [-15, 115], clamp);
  const planeY = 22 - Math.sin(interpolate(f, [0, 70], [0, Math.PI], clamp)) * 10;
  return (
    <Scene dur={S.travel[1]} bg="linear-gradient(#bfe6ff, #eaf6ff 70%, #8fd16a 70%)">
      <div style={{ position: "absolute", left: `${planeX}%`, top: `${planeY}%`, fontSize: 120 * u, transform: "rotate(8deg)" }}>✈️</div>
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 70 * u }}>
        <Pop at={4}>
          <Title>Traveling?</Title>
        </Pop>
        <Pop at={16}>
          <div style={{ fontSize: 42 * u, color: C.muted, marginTop: 10 * u, textAlign: "center" }}>Meet locals who know the spots — or fellow travelers.</div>
        </Pop>
      </AbsoluteFill>
      <div style={{ position: "absolute", left: "50%", bottom: "26%", transform: "translateX(-50%)", display: "flex", alignItems: "flex-end", gap: 40 * u }}>
        <div style={{ position: "relative" }}>
          <Avatar look={ME} size={300 * u} pose={walkPose(f)} />
          <div style={{ position: "absolute", right: -70 * u, bottom: 0, fontSize: 100 * u, transform: `rotate(${Math.sin(f / 3) * 4}deg)` }}>🧳</div>
        </div>
        <div style={{ position: "relative", width: 300 * u, height: 320 * u }}>
          <div style={{ position: "absolute", left: "50%", bottom: 0, width: 16 * u, height: 300 * u, background: "#8d6e63", transform: "translateX(-50%)", borderRadius: 6 }} />
          <div key={city} style={{ position: "absolute", left: 0, right: 0, top: 20 * u, background: C.brand, color: "#fff", borderRadius: 16 * u, padding: `${14 * u}px 0`, textAlign: "center", fontSize: 50 * u, fontWeight: 700, boxShadow: "0 10px 20px rgba(0,0,0,.15)", transform: `rotate(-3deg) scale(${interpolate(f % 22, [0, 5], [0.7, 1], clamp)})` }}>
            {city} →
          </div>
        </div>
      </div>
    </Scene>
  );
}

function Outro() {
  const f = useCurrentFrame();
  const u = useUnit();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f - 4, fps, config: { damping: 8 } });
  const parade = [ME, ...POPULATION.slice(1, 8).map((p) => p.look)];
  return (
    <Scene dur={S.outro[1]} bg={`linear-gradient(${C.sky}, #fff)`}>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", paddingBottom: 220 * u }}>
        <div style={{ display: "flex", alignItems: "center", gap: 28 * u, transform: `scale(${s})` }}>
          <svg viewBox="0 0 64 64" width={150 * u} height={150 * u}>
            <ellipse cx={32} cy={36} rx={27} ry={25} fill={C.brand} />
            <path d="M31 12 Q34 3 43 6" stroke={C.brand} strokeWidth={4} fill="none" strokeLinecap="round" />
            <ellipse cx={22} cy={38} rx={4} ry={f % 60 < 4 ? 0.6 : 5} fill="#fff" />
            <ellipse cx={42} cy={38} rx={4} ry={f % 60 < 4 ? 0.6 : 5} fill="#fff" />
            <path d="M28 47 Q32 51 36 47" stroke="#fff" strokeWidth={2.6} fill="none" strokeLinecap="round" />
          </svg>
          <div style={{ fontSize: 170 * u, fontWeight: 700, letterSpacing: -3 }}>Wanderpals</div>
        </div>
        <Pop at={22}>
          <Title size={56} style={{ marginTop: 20 * u }}>
            Send a little you out to find <span style={{ color: C.brand }}>your people.</span>
          </Title>
        </Pop>
        <Pop at={40}>
          <div style={{ marginTop: 40 * u, background: C.brand, color: "#fff", borderRadius: 26 * u, padding: `${20 * u}px ${48 * u}px`, fontSize: 44 * u, fontWeight: 700, boxShadow: `0 ${8 * u}px 0 #c43c1d` }}>
            Build your little you →
          </div>
        </Pop>
      </AbsoluteFill>
      <div style={{ position: "absolute", bottom: 30 * u, left: 0, right: 0, height: 200 * u }}>
        {parade.map((look, i) => {
          const x = ((f * 0.35 + i * 13) % 116) - 8;
          return (
            <div key={i} style={{ position: "absolute", left: `${x}%`, bottom: 0 }}>
              <Avatar look={look} size={180 * u} pose={walkPose(f + i * 4)} />
            </div>
          );
        })}
      </div>
    </Scene>
  );
}

export function Promo() {
  return (
    <AbsoluteFill style={{ background: C.sky }}>
      <Sequence from={S.hook[0]} durationInFrames={S.hook[1]}>
        <Hook />
      </Sequence>
      <Sequence from={S.build[0]} durationInFrames={S.build[1]}>
        <Build />
      </Sequence>
      <Sequence from={S.tell[0]} durationInFrames={S.tell[1]}>
        <Tell />
      </Sequence>
      {/* The town keeps running underneath the "new pal" popup instead of restarting. */}
      <Sequence from={S.town[0]} durationInFrames={S.town[1] + S.found[1]}>
        <Town />
      </Sequence>
      <Sequence from={S.found[0]} durationInFrames={S.found[1]}>
        <Found />
      </Sequence>
      <Sequence from={S.group[0]} durationInFrames={S.group[1]}>
        <GroupScene />
      </Sequence>
      <Sequence from={S.travel[0]} durationInFrames={S.travel[1]}>
        <Travel />
      </Sequence>
      <Sequence from={S.outro[0]} durationInFrames={S.outro[1]}>
        <Outro />
      </Sequence>
    </AbsoluteFill>
  );
}
