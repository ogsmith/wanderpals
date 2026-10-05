"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import Avatar from "@/components/Avatar";
import { isFree, shortWhen, timesThatWork, type BusyMap } from "@/lib/availability";
import type { Townsperson } from "@/lib/types";

export const GOOGLE_FREEBUSY_SCOPE = "https://www.googleapis.com/auth/calendar.freebusy";
type Status = { kind: "google" | "ics"; share: boolean; syncedAt: string | null; error: string | null } | null;

/** Your calendar connection: status, connect (Google or iCal link), share toggle, disconnect. */
export function CalendarCard({ onChange }: { onChange?: () => void }) {
  const { user } = useUser();
  const [status, setStatus] = useState<Status | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [link, setLink] = useState("");
  const [busyMsg, setBusyMsg] = useState("");
  const [error, setError] = useState("");

  const call = async (method: string, body?: unknown) => {
    setError("");
    const r = await fetch("/api/calendar", { method, headers: body ? { "content-type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error ?? "Something went wrong");
    setStatus(d.calendar);
    onChange?.();
    return d.calendar as Status;
  };

  useEffect(() => {
    const load = () =>
      fetch("/api/calendar")
        .then((r) => r.json())
        .then((d) => {
          setStatus(d.calendar ?? null);
          onChange?.();
        })
        .catch(() => setStatus(null));
    load();
    // The app finishes the Google hand-off in the background and pings us when it's done.
    window.addEventListener("wanderpals:calendar", load);
    return () => window.removeEventListener("wanderpals:calendar", load);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once; onChange is a notifier
  }, []);

  /** Ask Google (through your sign-in) for free/busy access only; comes back to /app?calendar=google. */
  const connectGoogle = async () => {
    if (!user) return;
    setBusyMsg("Opening Google…");
    try {
      const redirectUrl = `${window.location.origin}/app?calendar=google`;
      const existing = user.externalAccounts.find((a) => a.provider === "google");
      const acct = existing
        ? await existing.reauthorize({ additionalScopes: [GOOGLE_FREEBUSY_SCOPE], redirectUrl })
        : await user.createExternalAccount({ strategy: "oauth_google", additionalScopes: [GOOGLE_FREEBUSY_SCOPE], redirectUrl });
      const next = acct.verification?.externalVerificationRedirectURL;
      if (next) window.location.href = next.toString();
      else {
        await call("POST", { kind: "google" }); // already had the permission
        setBusyMsg("");
      }
    } catch (e) {
      setBusyMsg("");
      setError((e as { errors?: { longMessage?: string }[] }).errors?.[0]?.longMessage ?? (e as Error).message ?? "Couldn't connect Google");
    }
  };

  if (status === undefined) return null;
  const synced = status?.syncedAt ? new Date(status.syncedAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : null;

  return (
    <div className="rounded-2xl border-2 border-line p-3 space-y-2 text-sm">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-semibold">📆 Calendar</span>
        {status ? (
          <span className={status.error ? "text-red-600" : "text-good"}>
            {status.error ? `⚠️ ${status.error}` : `● ${status.kind === "google" ? "Google Calendar" : "Calendar link"} connected${synced ? ` · synced ${synced}` : ""}`}
          </span>
        ) : (
          <span className="text-muted">See when everyone&apos;s free before you pick a time.</span>
        )}
        <button className="ml-auto underline text-muted" onClick={() => setOpen((o) => !o)}>
          {status ? (open ? "Done" : "Settings") : open ? "Cancel" : "Connect"}
        </button>
      </div>

      {open && !status && (
        <div className="space-y-3 pt-1">
          <button className="btn w-full !text-base" onClick={connectGoogle} disabled={!!busyMsg}>
            {busyMsg || "Connect Google Calendar"}
          </button>
          <p className="text-xs text-muted -mt-1">Only asks for free/busy — Wanderpals never sees your event names, places or guests.</p>
          <div className="space-y-1.5">
            <div className="font-semibold">…or paste a private calendar link</div>
            <input className="input !py-2 !text-sm" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://… or webcal://… (.ics)" />
            <details className="text-xs text-muted">
              <summary className="cursor-pointer">Where do I find it?</summary>
              <ul className="list-disc pl-4 mt-1 space-y-0.5">
                <li><b>Google:</b> calendar.google.com → ⚙️ Settings → your calendar → &ldquo;Secret address in iCal format&rdquo;</li>
                <li><b>Apple / iCloud:</b> Calendar app → right-click the calendar → Share → Public Calendar → copy link</li>
                <li><b>Outlook:</b> Settings → Calendar → Shared calendars → Publish → copy the ICS link</li>
              </ul>
              <p className="mt-1">We store the link encrypted and only keep busy times — never event details.</p>
            </details>
            <button
              className="btn-ghost w-full"
              disabled={!link.trim() || !!busyMsg}
              onClick={async () => {
                setBusyMsg("Reading your calendar…");
                try {
                  const s = await call("POST", { kind: "ics", url: link });
                  if (!s?.error) setOpen(false);
                } catch (e) {
                  setError((e as Error).message);
                }
                setBusyMsg("");
              }}
            >
              {busyMsg === "Reading your calendar…" ? busyMsg : "Use this link"}
            </button>
          </div>
        </div>
      )}

      {open && status && (
        <div className="space-y-2 pt-1">
          <label className="flex items-center gap-2">
            <input type="checkbox" className="w-4 h-4 accent-[var(--brand)]" checked={status.share} onChange={(e) => call("PATCH", { share: e.target.checked }).catch((er) => setError(er.message))} />
            Let my pals see when I&apos;m free or busy (never what I&apos;m doing)
          </label>
          <button className="text-xs underline text-muted" onClick={() => confirm("Disconnect your calendar?") && call("DELETE").catch((er) => setError(er.message))}>
            Disconnect calendar
          </button>
        </div>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

/** Free/busy for you + these pals over the next ~3 weeks. Refetches when the people change. */
export function useAvailability(ids: string[], refreshKey = 0) {
  const [state, setState] = useState<{ busy: BusyMap; unknown: string[]; meConnected: boolean } | null>(null);
  const key = [...ids].sort().join(",");
  useEffect(() => {
    let alive = true;
    const from = new Date(Date.now() - 3600_000);
    const to = new Date(Date.now() + 21 * 864e5);
    fetch("/api/calendar/availability", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ids: key ? key.split(",") : [], from: from.toISOString(), to: to.toISOString() }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => alive && d && setState(d))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [key, refreshKey]);
  return state;
}

/** "Who's free then?" row + "✨ Times that work for everyone" chips, for a chosen time and invitees. */
export function WhoIsFree({ time, people, meLabel = "You", onPick }: { time: string; people: Townsperson[]; meLabel?: string; onPick: (localValue: string) => void }) {
  const avail = useAvailability(people.map((p) => p.id));
  if (!avail) return null;
  const start = time ? new Date(time) : null;
  const rows = [
    { id: "me", name: meLabel, look: undefined as Townsperson["look"] | undefined },
    ...people.map((p) => ({ id: p.id, name: p.name, look: p.look })),
  ];
  const mark = (id: string) => {
    const f = start ? isFree(avail.busy[id], start) : null;
    return f === null ? { icon: "❔", cls: "text-muted", title: id === "me" ? "Connect your calendar to check" : "Hasn't shared a calendar" } : f ? { icon: "✅", cls: "text-good", title: "Free" } : { icon: "⛔", cls: "text-red-600", title: "Busy then" };
  };
  const suggestions = timesThatWork(avail.busy);
  const pad = (n: number) => String(n).padStart(2, "0");
  const toLocal = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const known = Object.keys(avail.busy).length;

  return (
    <div className="rounded-xl bg-bg px-3 py-2 space-y-2 text-sm">
      {start && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 items-center">
          <span className="text-xs font-semibold text-muted">Who&apos;s free then:</span>
          {rows.map((r) => {
            const m = mark(r.id);
            return (
              <span key={r.id} className={`inline-flex items-center gap-1 ${m.cls}`} title={m.title}>
                {r.look && <Avatar look={r.look} size={22} />}
                {r.name} {m.icon}
              </span>
            );
          })}
        </div>
      )}
      {suggestions.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-xs font-semibold text-muted">✨ Times that work{known > 1 ? " for everyone" : " for you"}:</span>
          {suggestions.map((d) => (
            <button type="button" key={d.toISOString()} className="chip !text-xs !py-1 !border-good/60" onClick={() => onPick(toLocal(d))}>
              {shortWhen(d)}
            </button>
          ))}
        </div>
      ) : (
        !avail.meConnected && <p className="text-xs text-muted">📆 Connect your calendar (in Hangouts) to see times that work for everyone.</p>
      )}
    </div>
  );
}
