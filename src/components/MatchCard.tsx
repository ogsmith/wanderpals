"use client";

import { useState } from "react";
import Avatar from "@/components/Avatar";
import { homeLabel, type AppState } from "@/lib/state";
import { buddy, type Contact, type Match, type Townsperson } from "@/lib/types";

function ScoreRing({ score }: { score: number }) {
  const r = 22,
    c = 2 * Math.PI * r;
  return (
    <div className="relative w-14 h-14 shrink-0" title={`${score}% match`}>
      <svg viewBox="0 0 56 56" className="w-full h-full -rotate-90">
        <circle cx={28} cy={28} r={r} fill="none" stroke="var(--line)" strokeWidth={6} />
        <circle cx={28} cy={28} r={r} fill="none" stroke="var(--brand)" strokeWidth={6} strokeLinecap="round" strokeDasharray={`${(score / 100) * c} ${c}`} />
      </svg>
      <span className="absolute inset-0 grid place-items-center font-display font-bold">{score}</span>
    </div>
  );
}

/** Contact details someone chose to share — only ever passed in after a mutual yes. */
export function ContactLinks({ contact }: { contact: Contact }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
      {contact.phone && <a className="underline" href={`sms:${contact.phone}`}>📱 {contact.phone}</a>}
      {contact.email && <a className="underline break-all" href={`mailto:${contact.email}`}>✉️ {contact.email}</a>}
      {contact.instagram && <span>📷 {contact.instagram}</span>}
    </div>
  );
}

export function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="btn-ghost !py-1.5 text-sm"
      onClick={() => {
        navigator.clipboard?.writeText(text).catch(() => {});
        setCopied(true);
      }}
    >
      {copied ? "Copied ✓" : label}
    </button>
  );
}

export default function MatchCard({
  m,
  p,
  state,
  mine,
  contact,
  onDecide,
  onPlan,
  isNew,
}: {
  onPlan?: () => void;
  m: Match;
  p: Townsperson;
  state: AppState;
  mine?: "yes" | "no";
  contact?: Contact;
  onDecide: (d: "yes" | "no" | null) => void;
  isNew?: boolean;
}) {
  const [knocking, setKnocking] = useState(false);
  const first = p.name.split(" ")[0];
  const b = buddy(state.basics.gender);
  const intro = `Hey ${first}! Our Wanderpals bumped into each other — I'm ${state.basics.name.split(" ")[0]} from ${homeLabel(state.basics)}. ${m.hangout} Interested?`;

  return (
    <div id={`card-${p.id}`} className={`card rise space-y-4 relative ${mine === "no" ? "opacity-50" : ""}`}>
      {isNew && <span className="pop absolute -top-3 -right-2 rounded-full bg-brand text-white text-xs font-bold px-2.5 py-1 shadow">NEW</span>}
      <div className="flex gap-4 items-start">
        <div className="rounded-2xl bg-gradient-to-b from-sky-100 to-emerald-100 dark:from-sky-900 dark:to-emerald-900 px-2 pt-2">
          <Avatar look={p.look} size={92} waving={!!contact} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <h3 className="font-display text-2xl font-bold leading-tight">{p.name}</h3>
              <div className="text-sm text-muted">
                {p.age} · {p.town}
                {p.visiting && " 🧳"}
              </div>
            </div>
            <ScoreRing score={m.score} />
          </div>
          <div className="mt-2 font-semibold text-brand">{m.headline}</div>
        </div>
      </div>

      <p className="text-sm text-muted">{p.bio}</p>

      <ul className="flex flex-wrap gap-1.5">
        {m.reasons.map((r) => (
          <li key={r} className="chip !text-xs">✓ {r}</li>
        ))}
      </ul>

      <div className="rounded-2xl bg-accent/25 border-2 border-accent/60 p-3 text-sm">
        <span className="font-semibold">💡 First hang idea: </span>
        {m.hangout}
      </div>

      {contact ? (
        <div className="pop rounded-2xl border-2 border-good bg-good/10 p-4 space-y-2">
          <div className="font-display text-lg font-semibold">🎉 You both said yes! Here&apos;s how to reach {first}:</div>
          <ContactLinks contact={contact} />
          <div className="rounded-xl bg-card border-2 border-line p-3 text-sm">{intro}</div>
          <div className="flex flex-wrap gap-2">
            {onPlan && (
              <button className="btn !py-1.5 !px-4 !text-base" onClick={onPlan}>
                📅 Plan this hang
              </button>
            )}
            <CopyButton text={intro} label="Copy an intro text" />
          </div>
        </div>
      ) : mine === "yes" ? (
        <div className="rounded-2xl border-2 border-line bg-bg p-4 space-y-1">
          <div className="font-display font-semibold">💌 Your {b.noun} told {first} you&apos;d like to meet.</div>
          <p className="text-sm text-muted">As soon as {first} says yes too, their contact info shows up right here.</p>
          <button className="text-sm underline text-muted" onClick={() => onDecide(null)}>Undo</button>
        </div>
      ) : mine === "no" ? (
        <button className="text-sm underline text-muted" onClick={() => onDecide(null)}>Undo</button>
      ) : knocking ? (
        <div className="flex items-center gap-3 text-sm">
          <Avatar look={state.look} size={48} walking />
          <span>Your little {b.noun} is heading to {first}&apos;s door…</span>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            className="btn flex-1"
            onClick={() => {
              setKnocking(true);
              setTimeout(() => {
                setKnocking(false);
                onDecide("yes");
              }, 1200);
            }}
          >
            Say hi to {first} 👋
          </button>
          <button className="btn-ghost" onClick={() => onDecide("no")}>Not now</button>
        </div>
      )}
    </div>
  );
}
