"use client";

import { Show, UserButton, useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import Avatar from "@/components/Avatar";
import Logo from "@/components/Logo";
import { pick, SHIRTS } from "@/lib/palette";
import { POPULATION } from "@/lib/population";
import { EYE_COLORS, HAIR_COLORS, HAIR_STYLES, SKIN_TONES, type AvatarLook } from "@/lib/types";


const LINES = ["Let's go make friends! 👋", "I'm ready when you are!", "Hi! I'm a little you 😊", "Wanna get a beer? 🍻", "Ooh, I love people!", "Wheee! 🎉"];

const VIBES: { key: string; label: string; interest: string; line: string }[] = [
  { key: "beer", label: "🍺 Beer", interest: "craft beer", line: "Pints Friday? 🍻" },
  { key: "games", label: "🎮 Games", interest: "video games", line: "Co-op night? 🎮" },
  { key: "grill", label: "🔥 Grilling", interest: "grilling", line: "Cookout Sunday! 🔥" },
  { key: "run", label: "🏃 Running", interest: "running", line: "Saturday run? 🏃" },
  { key: "coffee", label: "☕ Coffee", interest: "coffee", line: "Coffee soon? ☕" },
  { key: "wine", label: "🍷 Wine", interest: "wine", line: "Wine night? 🍷" },
  { key: "golf", label: "⛳ Golf", interest: "golf", line: "Range Saturday? ⛳" },
  { key: "baby", label: "👶 Baby on the way", interest: "expecting", line: "Us too!! 👶" },
];

function CTA({ big = false, light = false }: { big?: boolean; light?: boolean }) {
  const { isSignedIn } = useAuth();
  return (
    <Link
      href={isSignedIn ? "/app" : "/sign-up"}
      className={`group inline-flex items-center gap-2 whitespace-nowrap rounded-2xl font-display font-bold transition active:translate-y-[3px] ${big ? "px-8 py-4 text-xl sm:text-2xl" : "px-5 py-2.5 text-base"} ${
        light ? "bg-white text-brand shadow-[0_5px_0_#e8d9d3] active:shadow-[0_2px_0_#e8d9d3]" : "bg-brand text-white shadow-[0_5px_0_#c43c1d] active:shadow-[0_2px_0_#c43c1d]"
      }`}
    >
      {isSignedIn ? (
        "Open my town"
      ) : big ? (
        "Get started for free"
      ) : (
        <>
          <span className="sm:hidden">Start free</span>
          <span className="hidden sm:inline">Get started for free</span>
        </>
      )}
      <span className="inline-block transition group-hover:translate-x-1">→</span>
    </Link>
  );
}

/* --------------------------- hero: the pal you can poke --------------------------- */

function Playground() {
  const [look, setLook] = useState<AvatarLook>({ skin: "fair", hair: "brown", hairStyle: "short", eyes: "blue", glasses: false, shirt: "#2f6fde", pants: "#2b3445" });
  const [line, setLine] = useState("Tap me! 👆");
  const [hop, setHop] = useState(0);
  const set = (patch: Partial<AvatarLook>) => setLook((l) => ({ ...l, ...patch }));

  const shuffle = () => {
    setLook({
      skin: pick(Object.keys(SKIN_TONES) as (keyof typeof SKIN_TONES)[]),
      hair: pick(Object.keys(HAIR_COLORS) as (keyof typeof HAIR_COLORS)[]),
      hairStyle: pick(HAIR_STYLES),
      eyes: pick(Object.keys(EYE_COLORS) as (keyof typeof EYE_COLORS)[]),
      glasses: Math.random() < 0.25,
      shirt: pick(SHIRTS),
      pants: "#2b3445",
    });
    setHop((h) => h + 1);
  };

  return (
    <div className="relative rounded-[2rem] border-4 border-[#1d2433]/10 bg-gradient-to-b from-sky-200 to-sky-100 dark:from-sky-900 dark:to-sky-950 overflow-hidden shadow-xl">
      <div className="relative flex flex-col items-center pt-10 pb-6 h-[380px] justify-end">
        <div className="absolute inset-x-0 bottom-0 h-16 bg-[#8fd16a]" />
        <div className="absolute bottom-10 left-6 text-6xl">🌳</div>
        <div className="absolute bottom-8 right-8 text-4xl">🌷</div>
        <div className="absolute top-6 left-10 text-4xl opacity-90 drift">☁️</div>
        <div className="absolute top-12 right-14 text-3xl opacity-80 drift [animation-delay:-6s]">☁️</div>
        <div key={line + hop} className="pop relative mb-1 rounded-2xl bg-white text-[#1d2433] border-2 border-[#1d2433]/15 px-4 py-2 font-display font-semibold shadow">
          {line}
        </div>
        <button
          key={hop}
          aria-label="Poke your pal"
          className="hop cursor-pointer relative"
          onClick={() => {
            setLine(pick(LINES.filter((l) => l !== line)));
            setHop((h) => h + 1);
          }}
        >
          <Avatar look={look} size={230} waving />
        </button>
      </div>

      <div className="relative bg-card/95 backdrop-blur border-t-2 border-line p-4 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold w-12">Hair</span>
          {(Object.entries(HAIR_COLORS) as [keyof typeof HAIR_COLORS, string][]).slice(0, 7).map(([k, c]) => (
            <button key={k} title={k} onClick={() => set({ hair: k })} className={`w-7 h-7 rounded-full border-2 transition hover:scale-110 ${look.hair === k ? "border-ink scale-110 ring-2 ring-brand/40" : "border-line"}`} style={{ background: c }} />
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold w-12">Eyes</span>
          {(Object.entries(EYE_COLORS) as [keyof typeof EYE_COLORS, string][]).map(([k, c]) => (
            <button key={k} title={k} onClick={() => set({ eyes: k })} className={`w-7 h-7 rounded-full border-2 transition hover:scale-110 ${look.eyes === k ? "border-ink scale-110 ring-2 ring-brand/40" : "border-line"}`} style={{ background: c }} />
          ))}
          <button onClick={shuffle} className="ml-auto chip !py-1 hover:rotate-6 transition">🎲 Shuffle</button>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {HAIR_STYLES.map((h) => (
            <button key={h} onClick={() => set({ hairStyle: h })} className="chip !py-1 !px-2.5 !text-xs capitalize" data-on={look.hairStyle === h}>
              {h}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* --------------------------- "pick your vibes" toy --------------------------- */

function VibeCheck() {
  const [on, setOn] = useState<string[]>(["beer"]);
  const chosen = VIBES.filter((v) => on.includes(v.key));
  const pals = POPULATION.map((p) => {
    const hit = chosen.find((v) => p.interests.includes(v.interest) || p.lifeStageTags.includes(v.interest));
    return hit ? { p, hit } : null;
  })
    .filter((x): x is NonNullable<typeof x> => !!x)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-center gap-2">
        {VIBES.map((v) => (
          <button
            key={v.key}
            className="chip !text-base !px-4 !py-2 hover:-translate-y-0.5 transition"
            data-on={on.includes(v.key)}
            onClick={() => setOn((o) => (o.includes(v.key) ? o.filter((x) => x !== v.key) : [...o, v.key]))}
          >
            {v.label}
          </button>
        ))}
      </div>
      <div className="relative rounded-[2rem] bg-gradient-to-b from-[#bfe6ff] to-[#dff3d0] dark:from-sky-900 dark:to-emerald-950 border-4 border-[#1d2433]/10 h-72 overflow-hidden">
        <div className="absolute inset-x-0 bottom-0 h-16 bg-[#8fd16a]" />
        {pals.length === 0 && <div className="absolute inset-0 grid place-items-center font-display text-xl text-muted">Pick a vibe ☝️</div>}
        <div className="absolute inset-x-0 bottom-6 flex justify-center items-end gap-2 sm:gap-6 px-2">
          {pals.map(({ p, hit }, i) => (
            <div key={p.id} className="walk-in relative flex flex-col items-center" style={{ animationDelay: `${i * 90}ms` }}>
              <div className="pop mb-1 rounded-xl bg-white text-[#1d2433] text-xs sm:text-sm font-semibold px-2.5 py-1 shadow whitespace-nowrap" style={{ animationDelay: `${300 + i * 90}ms` }}>
                {hit.line}
              </div>
              <Avatar look={p.look} size={i % 2 ? 120 : 130} waving={i % 2 === 0} />
              <div className="text-xs font-semibold mt-1 text-[#1d2433]/80">{p.name.split(" ")[0]}, {p.age}</div>
            </div>
          ))}
        </div>
        {pals.length > 0 && (
          <div key={pals.length} className="pop absolute top-4 left-1/2 -translate-x-1/2 rounded-full bg-ink text-bg px-4 py-1.5 text-sm font-bold whitespace-nowrap">
            💛 {pals.length} pal{pals.length > 1 ? "s" : ""} spotted nearby
          </div>
        )}
      </div>
      <p className="text-center text-xs text-muted">Demo town · real matches use your whole personality, life stage & location</p>
    </div>
  );
}

/* ---------------------------------- page ---------------------------------- */

function Reveal({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && (setSeen(true), io.disconnect()), { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={`${className} transition duration-700 ${seen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
      {children}
    </div>
  );
}

/** Plays when scrolled into view, pauses when it leaves (autoplay alone is flaky in some browsers). */
function PromoVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? v.play().catch(() => {}) : v.pause()), { threshold: 0.4 });
    io.observe(v);
    return () => io.disconnect();
  }, []);
  return (
    <video
      ref={ref}
      className="relative w-full rounded-[2rem] border-4 border-white shadow-2xl bg-[#eaf6ff]"
      src="/promo.mp4"
      poster="/promo-poster.jpg"
      muted
      loop
      playsInline
      controls
      preload="metadata"
    />
  );
}

/** Someone arrived through a friend's invite link (/?ref=…): remember it for after sign-up and say who it's from. */
function InvitedBanner() {
  const [inviter, setInviter] = useState<{ name: string; look: AvatarLook } | null>(null);
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (!ref) return;
    try {
      localStorage.setItem("wanderpals:ref", ref);
    } catch {}
    fetch(`/api/invite?code=${encodeURIComponent(ref)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.name && setInviter(d))
      .catch(() => {});
  }, []);
  if (!inviter) return null;
  return (
    <div className="mx-auto max-w-6xl px-4 pt-4">
      <div className="rise flex items-center gap-4 rounded-3xl border-4 border-accent bg-card p-4 shadow-lg">
        <div className="wiggle shrink-0">
          <Avatar look={inviter.look} size={90} waving />
        </div>
        <div className="flex-1">
          <div className="font-display text-2xl sm:text-3xl font-bold leading-tight">
            <span className="text-brand">{inviter.name}</span> invited you! 💛
          </div>
          <p className="text-muted">Make your own little you — {inviter.name}&apos;s pal will be waiting to meet yours in town.</p>
        </div>
        <div className="hidden sm:block">
          <CTA big />
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  const parade = POPULATION.slice(0, 12);
  return (
    <div className="flex-1 overflow-x-hidden">
      <header className="sticky top-0 z-30 backdrop-blur bg-bg/80">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center">
          <Link href="/" className="font-display text-2xl font-bold flex items-center gap-2">
            <Logo /> Wanderpals
          </Link>
          <div className="ml-auto flex items-center gap-3">
            <Show when="signed-out">
              <Link href="/sign-in" className="font-semibold text-sm hover:underline">
                Sign in
              </Link>
            </Show>
            <CTA />
            <Show when="signed-in">
              <UserButton />
            </Show>
          </div>
        </div>
      </header>

      <InvitedBanner />

      {/* HERO */}
      <section className="mx-auto max-w-6xl px-4 pt-8 pb-16 grid md:grid-cols-[1.1fr_1fr] gap-10 items-center">
        <div className="space-y-6 text-center md:text-left">
          <div className="inline-block rounded-full bg-accent/40 px-3 py-1 text-sm font-semibold">✨ Friends, found for you</div>
          <h1 className="font-display text-5xl sm:text-7xl font-bold leading-[0.95] tracking-tight">
            Send a little you out to find <span className="text-brand squiggle">your people.</span>
          </h1>
          <p className="text-xl text-muted max-w-md mx-auto md:mx-0">Same age. Same stage. Same weird love of grilling. Your pal goes out and finds them.</p>
          <div className="flex flex-col sm:flex-row items-center gap-3 justify-center md:justify-start">
            <CTA big />
            <span className="text-sm text-muted">Free · 3 minutes · zero small talk</span>
          </div>
        </div>
        <Playground />
      </section>

      {/* VIDEO */}
      <Reveal className="mx-auto max-w-5xl px-4 pb-20">
        <div className="relative">
          <div className="absolute -inset-3 rounded-[2.5rem] bg-gradient-to-br from-brand via-accent to-[#2bb673] opacity-70 blur-xl" aria-hidden />
          <PromoVideo />
        </div>
      </Reveal>

      {/* HOW (3 tiny steps) */}
      <Reveal className="mx-auto max-w-5xl px-4 pb-20">
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            ["📸", "Make a little you", "From a selfie, in seconds."],
            ["🗣️", "Tell it about you", "Quick quiz, or just talk."],
            ["🏘️", "It finds your people", "Friends, crews & travel buddies."],
          ].map(([icon, title, sub], i) => (
            <div key={title} className="card text-center group hover:-translate-y-1 hover:rotate-[-1deg] transition">
              <div className="text-6xl group-hover:scale-125 group-hover:rotate-12 transition inline-block">{icon}</div>
              <div className="font-display text-xs font-bold text-brand mt-3">STEP {i + 1}</div>
              <div className="font-display text-2xl font-bold">{title}</div>
              <div className="text-muted">{sub}</div>
            </div>
          ))}
        </div>
      </Reveal>

      {/* TOY */}
      <Reveal className="mx-auto max-w-4xl px-4 pb-24 space-y-6">
        <h2 className="font-display text-4xl sm:text-5xl font-bold text-center">What&apos;s your vibe?</h2>
        <VibeCheck />
      </Reveal>

      {/* FINAL CTA */}
      <section className="relative bg-brand text-white overflow-hidden">
        <div className="mx-auto max-w-4xl px-4 pt-16 pb-44 text-center space-y-6">
          <h2 className="font-display text-4xl sm:text-6xl font-bold leading-tight">Your people are out there.</h2>
          <p className="text-xl text-white/85">Let&apos;s go find them. 💛</p>
          <CTA big light />
        </div>
        <div className="absolute bottom-0 inset-x-0 h-36" aria-hidden>
          {parade.map((p, i) => (
            <div key={p.id} className="parade absolute bottom-2" style={{ animationDelay: `${-i * 2.6}s` }}>
              <Avatar look={p.look} size={110} walking />
            </div>
          ))}
        </div>
      </section>

      <footer className="text-center text-sm text-muted py-6">© {new Date().getFullYear()} Wanderpals · Made with 💛 north of Boston</footer>
    </div>
  );
}
