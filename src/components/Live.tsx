"use client";

import { useEffect, useRef, useState } from "react";
import Avatar from "@/components/Avatar";
import Pet from "@/components/Pet";
import { SPOTS, type ChatMessage, type SpotKind } from "@/lib/state";
import type { AvatarLook, Townsperson } from "@/lib/types";

/** Who we're talking to: one person (must be standing near them) or everyone in a hang spot. */
export type Conv = { with: string } | { spot: string };
const q = (c: Conv) => ("with" in c ? `with=${encodeURIComponent(c.with)}` : `spot=${encodeURIComponent(c.spot)}`);

/** Polls a conversation every ~2s. Returns messages plus a send(). */
export function useChat(conv: Conv | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState("");
  const key = conv ? q(conv) : "";
  const last = useRef("0");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- new conversation, start fresh
    setMessages([]);
    last.current = "0";
    if (!key) return;
    let alive = true;
    const poll = async () => {
      const r = await fetch(`/api/live/chat?${key}&after=${last.current}`).catch(() => null);
      if (!alive || !r?.ok) return;
      const { messages: fresh } = (await r.json()) as { messages: ChatMessage[] };
      if (fresh.length) {
        last.current = fresh[fresh.length - 1].id;
        setMessages((m) => [...m, ...fresh.filter((x) => !m.some((y) => y.id === x.id))].slice(-80));
      }
    };
    poll();
    const t = setInterval(poll, 2000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [key]);

  const send = async (body: string) => {
    if (!conv) return;
    setError("");
    const r = await fetch("/api/live/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...conv, body }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) return setError(d.error ?? "Couldn't send");
    if (Number(d.message.id) > Number(last.current)) last.current = d.message.id;
    setMessages((m) => [...m, d.message]);
  };
  return { messages, send, error };
}

/** The last thing each person said in the past few seconds — shown as speech bubbles over their pals. */
export function recentLines(messages: ChatMessage[], now: number, ms = 6000) {
  const out: Record<string, string> = {};
  for (const m of messages) if (now - new Date(m.at).getTime() < ms) out[m.from] = m.body;
  return out;
}

function SafetyMenu({ person, messages, onBlocked }: { person: Townsperson; messages: ChatMessage[]; onBlocked: () => void }) {
  const [open, setOpen] = useState(false);
  const act = async (report: boolean) => {
    const reason = report ? prompt(`What happened with ${person.name}? (optional)`) ?? "" : "";
    if (!report && !confirm(`Block ${person.name}? You won't see each other in town anymore.`)) return;
    await fetch("/api/live/safety", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: person.id, report, reason, context: messages.slice(-20).map((m) => `${m.name}: ${m.body}`).join("\n") }),
    });
    setOpen(false);
    onBlocked();
  };
  return (
    <div className="relative">
      <button className="rounded-lg px-2 py-0.5 text-muted hover:bg-line/60" onClick={() => setOpen((o) => !o)} aria-label="Safety options">
        ⋯
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-10 w-44 rounded-xl border-2 border-line bg-card shadow-lg text-sm overflow-hidden">
          <button className="block w-full text-left px-3 py-2 hover:bg-line/50" onClick={() => act(false)}>
            🚫 Block {person.name}
          </button>
          <button className="block w-full text-left px-3 py-2 hover:bg-line/50 text-red-600" onClick={() => act(true)}>
            🚩 Report &amp; block
          </button>
        </div>
      )}
    </div>
  );
}

/** Chat panel: messages, input, and (for 1:1) "go somewhere together". */
export function ChatPanel({
  title,
  person,
  messages,
  error,
  onSend,
  onGo,
  onBlocked,
  footer,
}: {
  title: React.ReactNode;
  person?: Townsperson;
  messages: ChatMessage[];
  error: string;
  onSend: (body: string) => void;
  onGo?: (kind: SpotKind) => void;
  onBlocked?: () => void;
  footer?: React.ReactNode;
}) {
  const [text, setText] = useState("");
  const [picking, setPicking] = useState(false);
  const list = useRef<HTMLDivElement>(null);
  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  return (
    <div className="flex flex-col h-full min-h-[320px]">
      <div className="flex items-center gap-2 pb-2 border-b-2 border-line">
        <div className="flex-1 min-w-0">{title}</div>
        {person && onBlocked && <SafetyMenu person={person} messages={messages} onBlocked={onBlocked} />}
      </div>
      <div ref={list} className="flex-1 overflow-auto py-2 space-y-1.5 max-h-72">
        {!messages.length && <p className="text-sm text-muted text-center py-4">Say hi 👋</p>}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.from === "me" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl px-3 py-1.5 text-sm ${m.from === "me" ? "bg-brand text-white rounded-br-md" : "bg-bg border-2 border-line rounded-bl-md"}`}>
              {m.from !== "me" && !person && <div className="text-[10px] font-bold opacity-70">{m.name}</div>}
              {m.body}
            </div>
          </div>
        ))}
      </div>
      {error && <p className="text-xs text-red-600 pb-1">{error}</p>}
      {onGo && picking && (
        <div className="grid grid-cols-2 gap-1.5 pb-2">
          {(Object.keys(SPOTS) as SpotKind[]).map((k) => (
            <button
              key={k}
              className="rounded-xl border-2 border-line hover:border-brand px-2 py-1.5 text-sm font-semibold text-left"
              onClick={() => {
                setPicking(false);
                onGo(k);
              }}
            >
              {SPOTS[k].emoji} {SPOTS[k].label}
            </button>
          ))}
        </div>
      )}
      <form
        className="flex gap-1.5 pt-1"
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          onSend(text.trim());
          setText("");
        }}
      >
        <input className="input !py-2 !text-sm" value={text} maxLength={500} onChange={(e) => setText(e.target.value)} placeholder="Type a message…" />
        <button className="btn !px-3 !py-2 !text-sm" disabled={!text.trim()}>
          Send
        </button>
      </form>
      {onGo && (
        <button className="mt-2 chip !border-brand/60 self-start" onClick={() => setPicking((p) => !p)}>
          🚶 Go somewhere together
        </button>
      )}
      {footer}
    </div>
  );
}

/* --------------------------------- hang spots --------------------------------- */

function SpotBackdrop({ kind }: { kind: SpotKind }) {
  if (kind === "park")
    return (
      <svg viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 w-full h-full">
        <rect width="160" height="100" fill="#bfe6ff" />
        <circle cx="135" cy="16" r="8" fill="#ffd23f" />
        <rect y="40" width="160" height="60" fill="#8fd16a" />
        {[[12, 44], [30, 38], [128, 40], [148, 46]].map(([x, y], i) => (
          <g key={i}>
            <rect x={x - 1} y={y} width="2" height="8" fill="#6d4c41" />
            <circle cx={x} cy={y - 3} r="8" fill="#388e3c" />
          </g>
        ))}
        <ellipse cx="80" cy="78" rx="46" ry="14" fill="#ff8a80" />
        <path d="M34 78 h92 M44 70 l72 16 M44 86 l72 -16" stroke="#fff" strokeWidth="1.4" opacity="0.6" />
        <text x="80" y="62" fontSize="7" textAnchor="middle">🧺 🍉 🥪</text>
      </svg>
    );
  const theme = {
    cafe: { wall: "#f6d7b0", floor: "#b98a5e", accent: "#8d5b3a", deco: "☕ 🥐 🧁", sign: "☕ Café" },
    taphouse: { wall: "#c9a26b", floor: "#6d4c41", accent: "#3e2723", deco: "🍺 🍺 🍺", sign: "🍺 Tap House" },
    arcade: { wall: "#3a2a6b", floor: "#2a2140", accent: "#ff4fd8", deco: "👾 🕹️ 🎯", sign: "🎮 Arcade" },
  }[kind];
  return (
    <svg viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 w-full h-full">
      <rect width="160" height="100" fill={theme.wall} />
      <rect y="58" width="160" height="42" fill={theme.floor} />
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={14 + i * 36} y="10" width="20" height="18" rx="2" fill="#fff" opacity={kind === "arcade" ? 0.15 : 0.55} />
      ))}
      <rect x="10" y="40" width="140" height="18" rx="3" fill={theme.accent} />
      <text x="80" y="52" fontSize="8" textAnchor="middle">{theme.deco}</text>
      <rect x="58" y="2" width="44" height="9" rx="3" fill={theme.accent} />
      <text x="80" y="8.8" fontSize="5.5" textAnchor="middle" fill="#fff" fontWeight="700">{theme.sign}</text>
      {kind === "arcade" &&
        [20, 140].map((x) => (
          <g key={x}>
            <rect x={x - 8} y="56" width="16" height="26" rx="2" fill="#5b3fd1" />
            <rect x={x - 6} y="59" width="12" height="9" fill="#7cf" />
          </g>
        ))}
      <ellipse cx="80" cy="80" rx="30" ry="9" fill={theme.accent} opacity="0.85" />
    </svg>
  );
}

/** Inside a hang spot: everyone seated around the table, speech bubbles for the latest lines. */
export function SpotScene({ kind, me, members, lines }: { kind: SpotKind; me: { look: AvatarLook; name: string }; members: Townsperson[]; lines: Record<string, string> }) {
  const everyone = [{ id: "me", name: me.name, look: me.look }, ...members.map((m) => ({ id: m.id, name: m.name, look: m.look }))];
  const n = everyone.length;
  return (
    <div className="relative isolate w-full aspect-[16/11] sm:aspect-[16/10] rounded-3xl overflow-hidden border-4 border-[#1d2433]/10">
      <SpotBackdrop kind={kind} />
      {everyone.map((p, i) => {
        // Spread around the table in an arc.
        const t = n === 1 ? 0.5 : i / (n - 1);
        const x = 22 + t * 56;
        const y = 84 - Math.sin(t * Math.PI) * 14;
        const line = lines[p.id];
        return (
          <div key={p.id} className="absolute" style={{ left: `${x}%`, top: `${y}%`, transform: "translate(-50%, -100%)", zIndex: Math.round(y) }}>
            {line && (
              <div className="pop absolute bottom-full left-1/2 -translate-x-1/2 mb-1 w-max max-w-[180px] rounded-2xl bg-white text-[#1d2433] border-2 border-[#1d2433]/15 px-3 py-1.5 text-xs shadow">
                {line}
              </div>
            )}
            <div style={{ transform: x > 50 ? "scaleX(-1)" : undefined }}>
              <Avatar look={p.look} size={80} waving={!!line} className="w-[clamp(36px,7vw,56px)] h-auto" />
            </div>
            {p.look.pet && (
              <div className="absolute bottom-0" style={{ [x > 50 ? "left" : "right"]: "85%" }}>
                <Pet pet={p.look.pet} size={20} className="w-[clamp(16px,3vw,26px)] h-auto" />
              </div>
            )}
            <div className={`absolute top-full left-1/2 -translate-x-1/2 mt-0.5 rounded-full px-1.5 text-[10px] font-bold whitespace-nowrap ${p.id === "me" ? "bg-brand text-white" : "bg-white/90 text-[#1d2433]"}`}>
              {p.id === "me" ? "YOU" : p.name}
            </div>
          </div>
        );
      })}
    </div>
  );
}
