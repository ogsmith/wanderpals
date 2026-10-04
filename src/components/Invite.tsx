"use client";

import { useState } from "react";
import Avatar from "@/components/Avatar";
import type { AvatarLook } from "@/lib/types";

export function inviteLink(userId: string) {
  return `${window.location.origin}/?ref=${encodeURIComponent(userId)}`;
}

export function inviteMessage(link: string) {
  return `I made a little cartoon me that wanders around town finding friends 😄 Make yours on Wanderpals and our pals can meet: ${link}`;
}

/**
 * The invite sheet. Uses the phone's native share sheet when available, plus one-tap
 * Copy / Text / WhatsApp / Email. `onSent` fires whenever they actually share.
 */
export function InviteModal({ userId, me, onClose, onSent }: { userId: string; me: AvatarLook; onClose: () => void; onSent: () => void }) {
  // Browser-only values, read once (safe if this ever renders on the server).
  const [link] = useState(() => (typeof window === "undefined" ? "" : inviteLink(userId)));
  const [canShare] = useState(() => typeof navigator !== "undefined" && !!navigator.share);
  const text = inviteMessage(link);
  const [copied, setCopied] = useState(false);
  const sent = () => onSent();

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center p-4 bg-[#1d2433]/55 backdrop-blur-sm fade-in" onClick={onClose} role="dialog" aria-modal aria-label="Invite friends">
      <div className="celebrate-card w-full max-w-md rounded-[2rem] bg-card border-4 border-accent shadow-2xl p-6 space-y-4 text-center" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-center">
          <Avatar look={me} size={120} waving />
        </div>
        <h2 className="font-display text-3xl font-bold leading-tight">Bring your friends to town!</h2>
        <p className="text-muted">Everyone you invite shows up as someone who already wants to meet you — one tap and you&apos;re pals.</p>

        {canShare && (
          <button
            className="btn w-full"
            onClick={() =>
              navigator
                .share({ title: "Wanderpals", text, url: link })
                .then(sent)
                .catch(() => {})
            }
          >
            💌 Share invite
          </button>
        )}

        <div className="grid grid-cols-2 gap-2">
          <a className="btn-ghost" href={`sms:?&body=${encodeURIComponent(text)}`} onClick={sent}>
            💬 Text
          </a>
          <a className="btn-ghost" href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer" onClick={sent}>
            🟢 WhatsApp
          </a>
          <a className="btn-ghost" href={`mailto:?subject=${encodeURIComponent("Come be my Wanderpal 💛")}&body=${encodeURIComponent(text)}`} onClick={sent}>
            ✉️ Email
          </a>
          <button
            className="btn-ghost"
            onClick={() => {
              navigator.clipboard?.writeText(text).catch(() => {});
              setCopied(true);
              sent();
            }}
          >
            {copied ? "Copied ✓" : "🔗 Copy link"}
          </button>
        </div>
        <div className="rounded-xl bg-bg px-3 py-2 text-xs text-muted break-all text-left">{text}</div>
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
