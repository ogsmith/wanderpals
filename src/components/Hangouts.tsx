"use client";

import { useEffect, useState } from "react";
import Avatar from "@/components/Avatar";
import { commonGround } from "@/lib/common";
import type { Hangout, Proposal, RSVP } from "@/lib/state";
import type { AvatarLook, Townsperson } from "@/lib/types";

export type Draft = { title: string; invite: string[] };

/** A neutral title for a hang idea ("You both like beer — …" → "🍻 Drinks") that stays true when more people join. */
export function titleFor(idea: string) {
  const t = idea.toLowerCase();
  const map: [RegExp, string][] = [
    [/beer|pint|brewer|bar\b/, "🍻 Drinks"],
    [/grill|cookout|bbq|smoker/, "🔥 Cookout"],
    [/game night|co-op|gamer|board game/, "🎮 Game night"],
    [/coffee|café|cafe/, "☕ Coffee"],
    [/\brun\b|running/, "🏃 Run"],
    [/golf|range|foursome/, "⛳ Golf"],
    [/hike|trail/, "🥾 Hike"],
    [/wine/, "🍷 Wine night"],
    [/pizza|potluck|cook-off|dinner/, "🍕 Dinner"],
    [/game\b|celtics|patriots|red sox|bruins/, "🏟️ Watch the game"],
    [/fishing/, "🎣 Fishing"],
    [/pickleball/, "🏓 Pickleball"],
  ];
  return map.find(([re]) => re.test(t))?.[1] ?? "🍻 Hang out";
}

const IDEAS = ["🍻 Drinks", "🔥 Cookout", "🎮 Game night", "☕ Coffee", "🏃 Run", "⛳ Golf", "🍕 Pizza night", "🥾 Hike"];

function when(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

/** Defaults the picker to this coming Friday at 7pm (or next week's if it's already late Friday). */
function nextFriday7pm() {
  const d = new Date();
  d.setDate(d.getDate() + ((5 - d.getDay() + 7) % 7 || (d.getHours() >= 19 ? 7 : 0)));
  d.setHours(19, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** A tiny .ics so "Add to calendar" works with any calendar app. */
function downloadIcs(h: Hangout) {
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const start = new Date(h.startsAt);
  const end = new Date(start.getTime() + 2 * 3600 * 1000);
  const esc = (s: string) => s.replace(/[\\,;]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Wanderpals//EN",
    "BEGIN:VEVENT",
    `UID:wanderpals-${h.id}@wanderpals`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${esc(h.title)}`,
    `LOCATION:${esc(h.place)}`,
    `DESCRIPTION:${esc(`${h.note ? h.note + "\n" : ""}With ${h.people.filter((p) => p.status === "going").map((p) => p.person.name).join(", ")} — planned on Wanderpals`)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
  a.download = `${h.title.replace(/[^\w ]+/g, "").trim() || "hangout"}.ics`;
  a.click();
  URL.revokeObjectURL(a.href);
}

const pad = (n: number) => String(n).padStart(2, "0");
/** Date → value for <input type="datetime-local"> (local time). */
const toLocalInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

/** One-tap alternatives: tomorrow night, this weekend, next Friday. */
function quickTimes(): { label: string; value: string }[] {
  const at = (daysAhead: number, h: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    d.setHours(h, 0, 0, 0);
    return d;
  };
  const today = new Date().getDay();
  const untilSat = (6 - today + 7) % 7 || 7;
  const untilFri = ((5 - today + 7) % 7 || 7) + 7;
  return [
    { label: "Tomorrow 7pm", value: toLocalInput(at(1, 19)) },
    { label: "Sat 2pm", value: toLocalInput(at(untilSat, 14)) },
    { label: "Sun 11am", value: toLocalInput(at(untilSat + 1, 11)) },
    { label: "Next Fri 7pm", value: toLocalInput(at(untilFri, 19)) },
  ];
}

async function callProposals(method: string, body: unknown) {
  const r = await fetch("/api/hangouts/proposals", { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error ?? "Something went wrong");
  return d.hangouts as Hangout[];
}

export type ChangeDraft = { startsAt?: string; place?: string; title?: string; note?: string };

/** Suggest (or, for the host, make) a change: a different time, place and/or idea. */
function ChangeForm({ h, mode, onSubmit, onClose }: { h: Hangout; mode: "suggest" | "edit"; onSubmit: (c: ChangeDraft) => void; onClose: () => void }) {
  const [quick] = useState(quickTimes);
  const [time, setTime] = useState(mode === "edit" ? toLocalInput(new Date(h.startsAt)) : "");
  const [place, setPlace] = useState(mode === "edit" ? h.place : "");
  const [title, setTitle] = useState(mode === "edit" ? h.title : "");
  const [note, setNote] = useState("");
  const anything = time || place.trim() || title.trim();
  return (
    <form
      className="rounded-2xl border-2 border-dashed border-brand/50 p-3 space-y-2.5"
      onSubmit={(e) => {
        e.preventDefault();
        if (!anything) return;
        onSubmit({
          startsAt: time ? new Date(time).toISOString() : undefined,
          place: place.trim() || undefined,
          title: title.trim() || undefined,
          note: note.trim() || undefined,
        });
      }}
    >
      <div className="text-sm font-semibold">{mode === "edit" ? "✏️ Change the plan" : "💡 Suggest a change"}</div>
      <div className="space-y-1">
        <span className="text-xs font-semibold text-muted">{mode === "edit" ? "When" : "A different time?"}</span>
        <div className="flex flex-wrap gap-1.5">
          {quick.map((q) => (
            <button type="button" key={q.label} className="chip !text-xs !py-1" data-on={time === q.value} onClick={() => setTime(time === q.value ? "" : q.value)}>
              {q.label}
            </button>
          ))}
        </div>
        <input className="input !py-2 !text-sm" type="datetime-local" value={time} onChange={(e) => setTime(e.target.value)} />
      </div>
      <div className="grid sm:grid-cols-2 gap-2">
        <label className="space-y-1">
          <span className="text-xs font-semibold text-muted">{mode === "edit" ? "Where" : "Somewhere else?"}</span>
          <input className="input !py-2 !text-sm" value={place} maxLength={120} onChange={(e) => setPlace(e.target.value)} placeholder={h.place || "e.g. Idle Hands"} />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-semibold text-muted">{mode === "edit" ? "What" : "A different idea?"}</span>
          <input className="input !py-2 !text-sm" value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} placeholder={h.title} list={`ideas-${h.id}`} />
          <datalist id={`ideas-${h.id}`}>
            {IDEAS.map((i) => (
              <option key={i} value={i} />
            ))}
          </datalist>
        </label>
      </div>
      {mode === "suggest" && (
        <input className="input !py-2 !text-sm" value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional) — e.g. busy Friday, weekend works!" />
      )}
      <div className="flex gap-2 justify-end">
        <button type="button" className="btn-ghost !py-1.5 !text-sm" onClick={onClose}>
          Cancel
        </button>
        <button className="btn !py-1.5 !px-4 !text-base" disabled={!anything}>
          {mode === "edit" ? "Save changes" : "Suggest it"}
        </button>
      </div>
    </form>
  );
}

/** One open suggestion: what changes, who's 👍, and the host's "Use this". */
function ProposalRow({ p, h, onAction }: { p: Proposal; h: Hangout; onAction: (action: "vote" | "unvote" | "withdraw" | "accept" | "dismiss") => void }) {
  const bits = [p.startsAt && `📅 ${when(p.startsAt)}`, p.place && `📍 ${p.place}`, p.title && `✨ ${p.title}`].filter(Boolean);
  return (
    <div className="rounded-2xl bg-bg border-2 border-line p-2.5 space-y-1.5">
      <div className="flex items-start gap-2">
        <Avatar look={p.proposer.look} size={34} />
        <div className="flex-1 min-w-0 text-sm">
          <div>
            <b>{p.mine ? "You" : p.proposer.name}</b> suggested: <span className="font-semibold">{bits.join(" · ")}</span>
          </div>
          {p.note && <div className="text-muted">&ldquo;{p.note}&rdquo;</div>}
          {p.votes > 0 && <div className="text-xs text-muted">👍 {p.voters.join(", ")}</div>}
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 items-center">
        <button className="chip !text-xs !py-1" data-on={p.iVoted} onClick={() => onAction(p.iVoted ? "unvote" : "vote")}>
          👍 Works for me{p.votes ? ` · ${p.votes}` : ""}
        </button>
        {h.isHost && (
          <>
            <button className="btn !py-1 !px-3 !text-sm" onClick={() => onAction("accept")}>
              ✓ Use this
            </button>
            <button className="text-xs underline text-muted" onClick={() => onAction("dismiss")}>
              Dismiss
            </button>
          </>
        )}
        {p.mine && !h.isHost && (
          <button className="text-xs underline text-muted ml-auto" onClick={() => onAction("withdraw")}>
            Withdraw
          </button>
        )}
      </div>
    </div>
  );
}

async function call(method: string, body?: unknown, query = "") {
  const r = await fetch(`/api/hangouts${query}`, { method, headers: body ? { "content-type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error ?? "Something went wrong");
  return d.hangouts as Hangout[];
}

function PlanModal({ pals, draft, onClose, onCreated }: { pals: Townsperson[]; draft: Draft; onClose: () => void; onCreated: (h: Hangout[]) => void }) {
  const [title, setTitle] = useState(draft.title);
  const [place, setPlace] = useState("");
  const [startsAt, setStartsAt] = useState(nextFriday7pm);
  const [note, setNote] = useState("");
  const [invite, setInvite] = useState<string[]>(draft.invite);
  const [open, setOpen] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center p-4 bg-[#1d2433]/55 backdrop-blur-sm fade-in" onClick={onClose} role="dialog" aria-modal aria-label="Plan a hangout">
      <form
        className="celebrate-card w-full max-w-lg rounded-[2rem] bg-card border-4 border-accent shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            onCreated(await call("POST", { title, place, startsAt: new Date(startsAt).toISOString(), note, invite, open }));
            onClose();
          } catch (err) {
            setError((err as Error).message);
          }
          setBusy(false);
        }}
      >
        <h2 className="font-display text-2xl font-bold">📅 Plan a hangout</h2>
        <div className="flex flex-wrap gap-1.5">
          {IDEAS.map((i) => (
            <button type="button" key={i} className="chip !text-sm" data-on={title === i} onClick={() => setTitle(i)}>
              {i}
            </button>
          ))}
        </div>
        <label className="block space-y-1">
          <span className="text-sm font-semibold">What</span>
          <input className="input" value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} placeholder="Pints at the brewery" required />
        </label>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="block space-y-1">
            <span className="text-sm font-semibold">Where</span>
            <input className="input" value={place} maxLength={120} onChange={(e) => setPlace(e.target.value)} placeholder="Idle Hands, Malden" />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-semibold">When</span>
            <input className="input" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} required />
          </label>
        </div>
        <label className="block space-y-1">
          <span className="text-sm font-semibold">Note <span className="text-muted font-normal">(optional)</span></span>
          <input className="input" value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} placeholder="I'll grab a big table 🍻" />
        </label>
        <div className="space-y-2">
          <span className="text-sm font-semibold">Invite pals</span>
          <div className="flex flex-wrap gap-2">
            {pals.map((p) => {
              const on = invite.includes(p.id);
              return (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => setInvite((xs) => (on ? xs.filter((x) => x !== p.id) : [...xs, p.id]))}
                  className={`flex items-center gap-1.5 rounded-2xl border-2 pl-1 pr-3 py-1 transition ${on ? "border-brand bg-brand/10" : "border-line"}`}
                >
                  <Avatar look={p.look} size={34} />
                  <span className="font-semibold text-sm">{p.name}</span>
                  {on && <span>✓</span>}
                </button>
              );
            })}
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={open} onChange={(e) => setOpen(e.target.checked)} className="w-4 h-4 accent-[var(--brand)]" />
          Let any of my pals see it and join in
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2 justify-end">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn" disabled={busy || !title.trim()}>
            {busy ? "Sending invites…" : "Send it 🎉"}
          </button>
        </div>
      </form>
    </div>
  );
}

function HangoutCard({
  h,
  now,
  pals,
  onRsvp,
  onCancel,
  onInvite,
  onRemove,
  onPropose,
  onProposal,
  onEdit,
}: {
  onPropose: (c: ChangeDraft) => void;
  onProposal: (id: string, action: "vote" | "unvote" | "withdraw" | "accept" | "dismiss") => void;
  onEdit: (c: ChangeDraft) => void;
  h: Hangout;
  now: number;
  pals: Townsperson[];
  onRsvp: (s: RSVP) => void;
  onCancel: () => void;
  onInvite: (ids: string[]) => void;
  onRemove: (id: string) => void;
}) {
  const [picking, setPicking] = useState(false);
  const [changing, setChanging] = useState<null | "suggest" | "edit">(null);
  const going = h.people.filter((p) => p.status === "going");
  const maybe = h.people.filter((p) => p.status === "maybe");
  const invited = h.people.filter((p) => p.status === "invited");
  const past = new Date(h.startsAt).getTime() < now;
  const joined = h.isHost || h.myStatus === "going";
  // Host, or anyone who's in (or maybe), can bring their own pals along.
  const canInvite = !past && (h.isHost || h.myStatus === "going" || h.myStatus === "maybe");
  const onList = new Set([h.host.id, ...h.people.map((p) => p.person.id)]);
  // What this exact group has in common — updates as people are added or drop out.
  const crew = [h.host, ...h.people.filter((p) => p.status !== "declined" && p.person.id !== h.host.id).map((p) => p.person)];
  const common = commonGround(crew, 2);
  const invitable = pals.filter((p) => !onList.has(p.id));
  return (
    <div className={`rounded-3xl border-2 p-4 space-y-3 bg-card ${joined ? "border-brand" : "border-line"} ${past ? "opacity-60" : ""}`}>
      <div className="flex items-start gap-3">
        <div className="text-center rounded-2xl bg-brand text-white px-3 py-1.5 leading-tight shrink-0">
          <div className="text-[10px] font-bold uppercase">{new Date(h.startsAt).toLocaleString(undefined, { month: "short" })}</div>
          <div className="font-display text-2xl font-bold">{new Date(h.startsAt).getDate()}</div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-display text-xl font-bold leading-tight">{h.title}</div>
          <div className="text-sm text-muted">
            {when(h.startsAt)}
            {h.place && <> · 📍 {h.place}</>}
          </div>
          <div className="text-xs text-muted mt-0.5">
            {h.isHost ? "You're hosting" : `Hosted by ${h.host.name}`}
            {h.open && " · open to pals"}
          </div>
          {h.myStatus === "invited" && h.invitedMeBy && <div className="mt-1 inline-block rounded-full bg-accent/40 px-2 py-0.5 text-xs font-semibold">💌 {h.invitedMeBy} invited you</div>}
          {h.changed?.note && now - new Date(h.changed.at).getTime() < 4 * 864e5 && (
            <div className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${h.myStatus === "invited" && h.changed.note.includes("time") ? "bg-brand text-white" : "bg-good/20"}`}>
              🔄 {h.myStatus === "invited" && h.changed.note.includes("time") ? "New time — can you still make it?" : `Updated: new ${h.changed.note.split(",").join(" & ")}`}
            </div>
          )}
        </div>
      </div>
      {h.note && <p className="text-sm">&ldquo;{h.note}&rdquo;</p>}
      {common.length > 0 && <p className="text-sm text-muted">🤝 {common.join(" · ")}</p>}
      <div className="flex items-end gap-1 flex-wrap">
        {going.map(({ person }) => (
          <div key={person.id} className="flex flex-col items-center" title={`${person.name} is going`}>
            <Avatar look={person.look} size={52} waving />
            <span className="text-[10px] font-semibold">{person.name}</span>
          </div>
        ))}
        {maybe.map(({ person }) => (
          <div key={person.id} className="flex flex-col items-center opacity-50" title={`${person.name} might come`}>
            <Avatar look={person.look} size={44} />
            <span className="text-[10px]">{person.name}?</span>
          </div>
        ))}
        <span className="text-sm text-muted ml-2 mb-3">
          {going.length} going{maybe.length ? ` · ${maybe.length} maybe` : ""}
        </span>
      </div>
      {invited.length > 0 && (
        <div className="flex flex-wrap gap-1.5 text-xs">
          <span className="text-muted self-center">Invited:</span>
          {invited.map(({ person, invitedBy }) => (
            <span key={person.id} className="chip !py-0.5 !px-2 !text-xs inline-flex items-center gap-1">
              {person.name}
              {invitedBy && invitedBy !== h.host.name && <span className="text-muted">(by {invitedBy})</span>}
              {h.isHost && (
                <button className="ml-0.5 text-muted hover:text-ink" title={`Take ${person.name} off`} onClick={() => onRemove(person.id)}>
                  ✕
                </button>
              )}
            </span>
          ))}
        </div>
      )}
      {h.proposals.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-xs font-semibold text-muted uppercase tracking-wide">Suggested changes</div>
          {h.proposals.map((p) => (
            <ProposalRow key={p.id} p={p} h={h} onAction={(a) => onProposal(p.id, a)} />
          ))}
        </div>
      )}
      {!past && h.myStatus === "declined" && !h.proposals.some((p) => p.mine) && !changing && (
        <button className="w-full rounded-2xl border-2 border-dashed border-brand/50 px-3 py-2 text-sm font-semibold text-brand hover:bg-brand/5" onClick={() => setChanging("suggest")}>
          Busy? 💡 Suggest another time
        </button>
      )}
      {changing && (
        <ChangeForm
          h={h}
          mode={changing}
          onClose={() => setChanging(null)}
          onSubmit={(c) => {
            (changing === "edit" ? onEdit : onPropose)(c);
            setChanging(null);
          }}
        />
      )}
      {picking && (
        <div className="rounded-2xl border-2 border-dashed border-brand/50 p-3 space-y-2">
          <div className="text-sm font-semibold">Bring a pal along</div>
          {invitable.length ? (
            <div className="flex flex-wrap gap-2">
              {invitable.map((p) => (
                <button
                  key={p.id}
                  className="flex items-center gap-1.5 rounded-2xl border-2 border-line hover:border-brand pl-1 pr-3 py-1 transition"
                  onClick={() => {
                    onInvite([p.id]);
                    setPicking(false);
                  }}
                >
                  <Avatar look={p.look} size={30} />
                  <span className="font-semibold text-sm">{p.name}</span>
                  <span className="text-brand">＋</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">All your pals are already on this one 🎉</p>
          )}
        </div>
      )}
      {!past && (
        <div className="flex flex-wrap gap-2 items-center">
          {!h.isHost && (
            <>
              <button className={h.myStatus === "going" ? "btn !py-1.5 !px-4 !text-base" : "btn-ghost !py-1.5"} onClick={() => onRsvp("going")}>
                {h.myStatus === "going" ? "You're in 🙌" : h.myStatus === "invited" ? "I'm in 🙌" : "Join in 🙌"}
              </button>
              <button className="chip" data-on={h.myStatus === "maybe"} onClick={() => onRsvp("maybe")}>
                Maybe
              </button>
              <button className="chip" data-on={h.myStatus === "declined"} onClick={() => onRsvp("declined")}>
                Can&apos;t make it
              </button>
            </>
          )}
          {canInvite && pals.length > 0 && (
            <button className="chip !border-brand/60" onClick={() => setPicking((x) => !x)}>
              ＋ Invite a pal
            </button>
          )}
          {!h.isHost && (
            <button className="chip" onClick={() => setChanging(changing === "suggest" ? null : "suggest")}>
              💡 Suggest a change
            </button>
          )}
          {h.isHost && (
            <button className="chip" onClick={() => setChanging(changing === "edit" ? null : "edit")}>
              ✏️ Edit
            </button>
          )}
          {joined && (
            <button className="text-sm underline text-muted" onClick={() => downloadIcs(h)}>
              📆 Add to calendar
            </button>
          )}
          {h.isHost && (
            <button className="text-sm underline text-muted ml-auto" onClick={onCancel}>
              Cancel hangout
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** "📅 Hangouts": plans with your pals that anyone invited (or any pal, if open) can join. */
export default function Hangouts({ pals, me, draft, onDraft }: { pals: Townsperson[]; me: AvatarLook; draft: Draft | null; onDraft: (d: Draft | null) => void }) {
  const [hangouts, setHangouts] = useState<Hangout[] | null>(null);
  const [error, setError] = useState("");
  const [now, setNow] = useState(0);

  useEffect(() => {
    const load = () =>
      call("GET")
        .then((h) => {
          setHangouts(h);
          setNow(Date.now());
        })
        .catch(() => {});
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, []);

  const act = (p: Promise<Hangout[]>) =>
    p.then((h) => {
      setHangouts(h);
      setError("");
    }).catch((e) => setError((e as Error).message));

  if (!pals.length && !hangouts?.length) return null;
  const upcoming = hangouts ?? [];

  return (
    <div className="rise card space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <h3 className="font-display text-xl font-bold">📅 Hangouts</h3>
        {pals.length > 0 && (
          <button className="btn !py-1.5 !px-4 !text-base ml-auto" onClick={() => onDraft({ title: "🍻 Drinks", invite: pals.map((p) => p.id) })}>
            + Plan a hangout
          </button>
        )}
      </div>
      {hangouts && !upcoming.length && (
        <div className="flex items-center gap-3 text-sm text-muted">
          <Avatar look={me} size={48} />
          Nothing planned yet. Pick a night and invite your pals — they can all join in.
        </div>
      )}
      <div className="grid md:grid-cols-2 gap-3">
        {upcoming.map((h) => (
          <HangoutCard
            key={h.id}
            h={h}
            now={now}
            pals={pals}
            onInvite={(invite) => act(call("PATCH", { id: h.id, invite }))}
            onRemove={(remove) => act(call("PATCH", { id: h.id, remove }))}
            onRsvp={(status) => act(call("PATCH", { id: h.id, status }))}
            onPropose={(c) => act(callProposals("POST", { hangoutId: h.id, ...c }))}
            onProposal={(id, action) => {
              if (action === "accept" && !confirm("Change the hangout to this? If the time moves, people who haven't 👍'd it get asked again.")) return;
              act(callProposals("PATCH", { id, action }));
            }}
            onEdit={(edit) => act(call("PATCH", { id: h.id, edit }))}
            onCancel={() => confirm(`Cancel "${h.title}"? Everyone invited will stop seeing it.`) && act(call("DELETE", undefined, `?id=${h.id}`))}
          />
        ))}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {draft && <PlanModal pals={pals} draft={draft} onClose={() => onDraft(null)} onCreated={setHangouts} />}
    </div>
  );
}
