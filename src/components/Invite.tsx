"use client";

import { useState } from "react";
import Avatar from "@/components/Avatar";
import Pet from "@/components/Pet";
import { PET_COLORS, type AvatarLook, type Pet as PetT, type PetKind } from "@/lib/types";

export function inviteLink(userId: string) {
  return `${window.location.origin}/?ref=${encodeURIComponent(userId)}`;
}

/** The pitch that goes out with every invite — why it's worth 3 minutes, then the link. */
export function inviteMessage(link: string) {
  return [
    "Hey! I'm on Wanderpals 🐾",
    "You make a little cartoon version of yourself, tell it what you're into, and it wanders around town finding people in the same stage of life — then helps plan hangouts.",
    "It's free and takes about 3 minutes. Join me so our pals can meet 💛",
    link,
  ].join("\n\n");
}

/**
 * The invite sheet. Uses the phone's native share sheet when available, plus one-tap
 * Copy / Text / WhatsApp / Email. `onSent` fires whenever they actually share.
 */
export function InviteModal({ userId, me, sent, onClose, onSent }: { userId: string; me: AvatarLook; sent: number; onClose: () => void; onSent: () => void }) {
  // Browser-only values, read once (safe if this ever renders on the server).
  const [link] = useState(() => (typeof window === "undefined" ? "" : inviteLink(userId)));
  const [canShare] = useState(() => typeof navigator !== "undefined" && !!navigator.share);
  const [text, setText] = useState(() => inviteMessage(link));
  const [copied, setCopied] = useState(false);

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center p-4 bg-[#1d2433]/55 backdrop-blur-sm fade-in" onClick={onClose} role="dialog" aria-modal aria-label="Invite friends">
      <div className="celebrate-card w-full max-w-md max-h-[92vh] overflow-auto rounded-[2rem] bg-card border-4 border-accent shadow-2xl p-6 space-y-4 text-center" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-center">
          <Avatar look={me} size={96} waving />
        </div>
        <h2 className="font-display text-3xl font-bold leading-tight">Bring your friends to town!</h2>
        <p className="text-muted">Everyone you invite shows up as someone who already wants to meet you — one tap and you&apos;re pals.</p>
        <PetProgress sent={sent} />
        <label className="block text-left space-y-1">
          <span className="text-xs font-semibold text-muted">Your message (edit it if you like)</span>
          <textarea className="input !text-sm min-h-40 leading-snug" value={text} onChange={(e) => setText(e.target.value)} />
        </label>
        {link && !text.includes(link) && (
          <button className="text-xs underline text-brand" onClick={() => setText((t) => `${t.trim()}\n\n${link}`)}>
            Your link is missing — add it back
          </button>
        )}

        {canShare && (
          <button
            className="btn w-full"
            onClick={() =>
              navigator
                .share({ title: "Join me on Wanderpals", text }) // link lives inside the text so apps can't drop the blurb
                .then(onSent)
                .catch(() => {})
            }
          >
            💌 Share invite
          </button>
        )}

        <div className="grid grid-cols-2 gap-2">
          <a className="btn-ghost" href={`sms:?&body=${encodeURIComponent(text)}`} onClick={onSent}>
            💬 Text
          </a>
          <a className="btn-ghost" href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer" onClick={onSent}>
            🟢 WhatsApp
          </a>
          <a className="btn-ghost" href={`mailto:?subject=${encodeURIComponent("Come be my Wanderpal 💛")}&body=${encodeURIComponent(text)}`} onClick={onSent}>
            ✉️ Email
          </a>
          <button
            className="btn-ghost"
            onClick={() => {
              navigator.clipboard?.writeText(text).catch(() => {});
              setCopied(true);
              onSent();
            }}
          >
            {copied ? "Copied ✓" : "📋 Copy message"}
          </button>
        </div>
        <button className="text-sm underline text-muted" onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  );
}

/** Friendly reminder card in town until you've invited a few people. */
export function InviteNudge({ me, sent, onInvite, onLater }: { me: AvatarLook; sent: number; onInvite: () => void; onLater: () => void }) {
  return (
    <div className="rise card !border-brand !bg-brand/5 flex flex-wrap items-center gap-4">
      <div className="wiggle">
        <Avatar look={me} size={70} waving />
      </div>
      <div className="flex-1 min-w-[200px]">
        <div className="font-display text-xl font-semibold">
          {sent === 0 ? "Psst — towns are way more fun with your friends in them!" : `Nice, ${sent} invite${sent > 1 ? "s" : ""} sent! One or two more?`}
        </div>
        <p className="text-sm text-muted">Invite 2–3 people you&apos;d actually grab a beer with. They&apos;ll show up as already wanting to meet you.</p>
        <div className="mt-2 max-w-sm">
          <PetProgress sent={sent} />
        </div>
      </div>
      <div className="flex gap-2">
        <button className="btn" onClick={onInvite}>
          💌 Invite friends
        </button>
        <button className="btn-ghost" onClick={onLater}>
          Later
        </button>
      </div>
    </div>
  );
}

/** Show the nudge until 3 invites are out; "Later" snoozes it for a day. */
export function shouldNudge(invites: { sent: number; nudgedAt: number } | undefined, now: number) {
  const sent = invites?.sent ?? 0;
  const since = now - (invites?.nudgedAt ?? 0);
  return sent < 3 && since > 24 * 3600 * 1000;
}

/* ------------------------------- pet reward ------------------------------- */

/** Invites needed to unlock a pet. */
export const PET_INVITES = 3;

/** "🎁 2 more invites to unlock your pet!" with a dog and cat peeking. */
export function PetProgress({ sent }: { sent: number }) {
  const left = Math.max(0, PET_INVITES - sent);
  if (!left) return null;
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-accent/30 px-3 py-2 text-left">
      <div className="flex -space-x-2 shrink-0">
        <Pet pet={{ kind: "dog", color: "golden", name: "" }} size={30} />
        <Pet pet={{ kind: "cat", color: "orange", name: "" }} size={30} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold">
          🎁 {left} more invite{left > 1 ? "s" : ""} to unlock your pet!
        </div>
        <div className="mt-1 flex gap-1">
          {Array.from({ length: PET_INVITES }, (_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full ${i < sent ? "bg-brand" : "bg-line"}`} />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Choose a dog or cat, a color and a name. */
export function PetPicker({ me, current, onSave, onClose }: { me: AvatarLook; current?: PetT; onSave: (p: PetT) => void; onClose: () => void }) {
  const [kind, setKind] = useState<PetKind>(current?.kind ?? "dog");
  const [color, setColor] = useState<string>(current?.color ?? "golden");
  const [name, setName] = useState(current?.name ?? "");
  const colors = PET_COLORS[kind] as Record<string, string>;
  const pet: PetT = { kind, color: colors[color] ? color : Object.keys(colors)[0], name: name.trim().slice(0, 20) };
  const [confetti] = useState(() =>
    Array.from({ length: current ? 0 : 50 }, (_, i) => ({ left: Math.random() * 100, delay: Math.random() * 0.6, dur: 2 + Math.random() * 1.4, i })),
  );

  return (
    <div className="fixed inset-0 z-[110] grid place-items-center p-4 bg-[#1d2433]/55 backdrop-blur-sm fade-in" onClick={onClose} role="dialog" aria-modal aria-label="Choose your pet">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        {confetti.map((c) => (
          <span
            key={c.i}
            className="confetti"
            style={{ left: `${c.left}%`, width: 10, height: 5, borderRadius: 2, background: ["#ff5a36", "#ffd23f", "#2bb673", "#3a7bd5", "#e84393"][c.i % 5], animationDelay: `${c.delay}s`, animationDuration: `${c.dur}s`, ["--spin" as string]: "360deg" }}
          />
        ))}
      </div>
      <div className="celebrate-card relative w-full max-w-md rounded-[2rem] bg-card border-4 border-accent shadow-2xl p-6 space-y-4 text-center" onClick={(e) => e.stopPropagation()}>
        {!current && <div className="font-display text-sm font-bold uppercase tracking-[0.2em] text-brand">🎁 You unlocked a pet!</div>}
        <h2 className="font-display text-3xl font-bold">{current ? "Your pet" : "Thanks for inviting friends!"}</h2>
        <div className="flex items-end justify-center gap-2 h-36 rounded-3xl bg-gradient-to-b from-sky-100 to-[#c9ebb0] dark:from-sky-900 dark:to-emerald-900">
          <Avatar look={me} size={120} waving />
          <div className="pet-excited mb-1">
            <Pet pet={pet} size={58} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {(["dog", "cat"] as const).map((k) => (
            <button
              key={k}
              className={`rounded-2xl border-2 p-2 transition ${kind === k ? "border-brand bg-brand/10" : "border-line hover:border-muted"}`}
              onClick={() => {
                setKind(k);
                setColor(Object.keys(PET_COLORS[k])[0]);
              }}
            >
              <div className="flex justify-center">
                <Pet pet={{ kind: k, color: Object.keys(PET_COLORS[k])[0], name: "" }} size={44} />
              </div>
              <div className="font-display font-semibold">{k === "dog" ? "🐶 Dog" : "🐱 Cat"}</div>
            </button>
          ))}
        </div>
        <div className="flex justify-center gap-2">
          {Object.entries(colors).map(([k, hex]) => (
            <button
              key={k}
              title={k}
              onClick={() => setColor(k)}
              className={`w-9 h-9 rounded-full border-2 transition ${pet.color === k ? "ring-4 ring-brand/40 border-ink scale-110" : "border-line"}`}
              style={{ background: hex }}
            />
          ))}
        </div>
        <input className="input text-center" placeholder={kind === "dog" ? "Name your dog (e.g. Biscuit)" : "Name your cat (e.g. Mochi)"} value={name} maxLength={20} onChange={(e) => setName(e.target.value)} />
        <button className="btn w-full" onClick={() => onSave(pet)}>
          {current ? "Save" : `Adopt ${pet.name || `your ${kind}`} 🐾`}
        </button>
        <button className="text-sm underline text-muted" onClick={onClose}>
          {current ? "Cancel" : "Choose later"}
        </button>
      </div>
    </div>
  );
}
