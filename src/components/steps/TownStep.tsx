"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Avatar from "@/components/Avatar";
import Celebration, { type Celebrate } from "@/components/Celebration";
import GroupCard from "@/components/GroupCard";
import Hangouts, { titleFor, type Draft } from "@/components/Hangouts";
import { ChatPanel, recentLines, SpotScene, useChat } from "@/components/Live";
import { placeCoords } from "@/lib/towns";
import { commonGround } from "@/lib/common";
import LocationInput from "@/components/LocationInput";
import MatchCard, { ContactLinks, CopyButton } from "@/components/MatchCard";
import Pet from "@/components/Pet";
import { Scenery, SpeechBubble, type Bubble } from "@/components/TownScene";
import { pick, seeded } from "@/lib/palette";
import { homeLabel, meAsSomeone, NEAR, nearDistance, SPOTS, type AppState, type LivePlace, type LiveState, type SpotKind, type Connections, type Found, type Trip } from "@/lib/state";
import { buddy, type Group, type Match, type Search, type Townsperson } from "@/lib/types";

type Pos = { x: number; y: number; moving: boolean; flip: boolean; dur: number };
type DiaryItem = { key: number; id?: string; text: string; match?: boolean };
type Reveal = { kind: "person"; m: Match } | { kind: "group"; g: Group };
/** Things you ask your pal to do by poking the town. */
type Command = { kind: "goto"; x: number; y: number } | { kind: "hello"; id: string } | { kind: "landed" };

/** Friends found on the first walk, then one more every REVEAL_EVERY_MS. */
const FIRST_FINDS = 2;
const REVEAL_EVERY_MS = 30 * 1000;
/** Re-check the town for newcomers when a trip is older than this. */
const REFRESH_AFTER_MS = 10 * 60 * 1000;

const WALK = { x0: 6, x1: 94, y0: 56, y1: 95 };
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const firstName = (p: Townsperson) => p.name.split(" ")[0];

const STROLL_THOUGHTS = ["☕ Mmm, smells like coffee…", "🌳 Nice day for a walk", "🐿️ A squirrel!", "🎵 La la la…", "🔥 Someone's grilling…", "🦆 Hi ducks!", "🌸 Ooh, flowers", "👀 Anyone around?"];
const GREETINGS = ["Hi there! 👋", "Hey! Nice day, huh?", "Oh hi! I'm new around here.", "Hello neighbor! 👋"];

/** Order things get discovered: two people, a group, two people, a group… */
function revealOrder(trip: Trip): Reveal[] {
  const out: Reveal[] = [];
  const gs = [...trip.groups];
  trip.matches.forEach((m, i) => {
    out.push({ kind: "person", m });
    if (i % 2 === 1 && gs.length) out.push({ kind: "group", g: gs.shift()! });
  });
  gs.forEach((g) => out.push({ kind: "group", g }));
  return out;
}
const revealId = (r: Reveal) => (r.kind === "person" ? r.m.id : r.g.id);
const unlockedCount = (total: number, sentAt: number, now: number) => Math.min(total, FIRST_FINDS + Math.floor((now - sentAt) / REVEAL_EVERY_MS));

/** Merge a fresh fetch into an existing trip: keep what was already found, append newcomers. */
function mergeTrip(old: Trip, fresh: Pick<Trip, "matches" | "groups" | "people">): Trip {
  const has = (xs: { id: string }[], id: string) => xs.some((x) => x.id === id);
  return {
    ...old,
    matches: [...old.matches, ...fresh.matches.filter((m) => !has(old.matches, m.id))],
    groups: [...old.groups, ...fresh.groups.filter((g) => !has(old.groups, g.id))],
    people: [...fresh.people, ...old.people.filter((p) => !has(fresh.people, p.id))],
    refreshedAt: Date.now(),
  };
}

/* --------------------------- where + who controls --------------------------- */

function SearchBar({ search, home, onSearch }: { search: Search; home: string; onSearch: (s: Search) => void }) {
  const dest = search.destination?.label?.split(",")[0];
  const whoLabels: [Search["who"], string][] =
    search.mode === "home"
      ? [["locals", "🏡 Long-term friends"], ["visitors", `🧳 People visiting ${home}`], ["both", "Both"]]
      : [["locals", `📍 Locals in ${dest || "town"}`], ["visitors", "🧳 Fellow travelers"], ["both", "Both"]];
  return (
    <div className="card !p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-2xl border-2 border-line p-1 bg-bg">
          {(["home", "trip"] as const).map((m) => (
            <button
              key={m}
              onClick={() => onSearch({ ...search, mode: m })}
              className={`rounded-xl px-4 py-1.5 font-display font-semibold transition ${search.mode === m ? "bg-ink text-bg" : "text-muted"}`}
            >
              {m === "home" ? "🏠 At home" : "✈️ Traveling"}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {whoLabels.map(([w, label]) => (
            <button key={w} className="chip" data-on={search.who === w} onClick={() => onSearch({ ...search, who: w })}>
              {label}
            </button>
          ))}
        </div>
      </div>
      {search.mode === "trip" && (
        <div className="max-w-md">
          <LocationInput
            key="dest"
            value={search.destination}
            gps={false}
            placeholder="Where are you headed? e.g. Austin"
            onChange={(destination) => destination.lat !== undefined && onSearch({ ...search, destination })}
          />
        </div>
      )}
    </div>
  );
}

/** Ticks on its own so the rest of the town doesn't re-render every second. */
function Countdown({ sentAt, foundCount, total, noun, he, city }: { sentAt: number; foundCount: number; total: number; noun: string; he: string; city: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const unlocked = unlockedCount(total, sentAt, now);
  const waitingForWalk = unlocked > foundCount;
  const nextAt = sentAt + Math.max(1, unlocked - FIRST_FINDS + 1) * REVEAL_EVERY_MS;
  const secs = Math.max(0, Math.ceil((nextAt - now) / 1000));
  return (
    <>
      <div className="font-display text-xl font-semibold" aria-live="polite">
        {waitingForWalk ? (
          `Your ${noun} spotted someone — heading over…`
        ) : (
          <>
            Finding new friend in <span className="inline-block min-w-[2ch] tabular-nums text-brand">{secs}</span>…
          </>
        )}
      </div>
      <p className="text-muted text-sm">
        Your {noun} is still wandering around {city}. {he[0].toUpperCase() + he.slice(1)}&apos;ll keep looking — come back later!
      </p>
      <div className="mt-2 h-2 rounded-full bg-line overflow-hidden max-w-sm">
        <div className="h-full bg-brand transition-all duration-1000 ease-linear" style={{ width: `${waitingForWalk ? 100 : 100 - (secs / (REVEAL_EVERY_MS / 1000)) * 100}%` }} />
      </div>
    </>
  );
}

/* ---------------------------------- town ---------------------------------- */

export default function TownStep({
  state,
  trip,
  connections,
  onTrip,
  onSearch,
  onDecide,
  onChangeGoal,
  nudgeInvites = false,
  onInvite,
}: {
  onInvite?: () => void;
  nudgeInvites?: boolean;
  state: AppState;
  trip?: Trip;
  connections: Connections;
  onTrip: (t: Trip) => void;
  onSearch: (s: Search) => void;
  onDecide: (ids: string[], d: "yes" | "no" | null) => void;
  onChangeGoal: () => void;
}) {
  const b = buddy(state.basics.gender);
  const first = state.basics.name.split(" ")[0] || "you";
  const search = state.search;
  const home = homeLabel(state.basics);
  const cityLabel = (search.mode === "trip" ? search.destination?.label?.split(",")[0] : home) || "town";
  const needsDestination = search.mode === "trip" && !search.destination?.label;

  const [data, setData] = useState<Trip | null>(trip ?? null);
  const [error, setError] = useState("");
  const [me, setMe] = useState<Pos>({ x: -6, y: 74, moving: false, flip: false, dur: 0 });
  const [folkPos, setFolkPos] = useState<Record<string, Pos>>({});
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [diary, setDiary] = useState<DiaryItem[]>([]);
  const [visiting, setVisiting] = useState<string[]>([]);
  const [celebrate, setCelebrate] = useState<Celebrate | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [notify, setNotify] = useState<NotificationPermission | "unsupported">("default");
  const [lastSeen] = useState(() => (trip?.found ?? []).reduce((t, f) => Math.max(t, f.at), 0));
  const frozen = useRef(new Set<string>());
  const tripRef = useRef<Trip | null>(trip ?? null);
  const diaryKey = useRef(0);

  const people = data?.people;
  const personById = useMemo(() => new Map((people ?? []).map((p) => [p.id, p])), [people]);
  const order = useMemo(() => (data ? revealOrder(data) : []), [data]);

  const saveTrip = (t: Trip) => {
    tripRef.current = t;
    setData(t);
    onTrip(t);
  };
  const addDiary = (item: Omit<DiaryItem, "key">) => setDiary((d) => [{ ...item, key: diaryKey.current++ }, ...d].slice(0, 14));
  const addFound = (ids: string[]) => {
    const t = tripRef.current!;
    const at = Date.now();
    const fresh = ids.filter((id) => !t.found.some((f) => f.id === id)).map((id) => ({ id, at }));
    saveTrip({ ...t, found: [...t.found, ...fresh] });
  };
  const closeCelebration = useCallback(() => setCelebrate(null), []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read browser permission on mount
    setNotify(typeof Notification === "undefined" ? "unsupported" : Notification.permission);
  }, []);

  // Everyone on screen. Keyed on the people list (not the whole trip) so finding someone doesn't reshuffle town.
  const folks: Townsperson[] = useMemo(() => [...(people ?? [])].sort((a, c) => a.id.localeCompare(c.id)).slice(0, 24), [people]);

  // 1. Ask who's around (once per search), or refresh an old trip to pick up newcomers.
  useEffect(() => {
    if (needsDestination) return;
    // Reuse a recent walk — unless the town was empty, in which case look again right away for newcomers.
    if (data && data.people.length && Date.now() - (data.refreshedAt ?? 0) < REFRESH_AFTER_MS) return;
    fetch("/api/matches", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ me: { basics: state.basics, look: state.look, persona: state.persona, goal: state.goal }, search }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.statusText)))
      .then((d: Pick<Trip, "matches" | "groups" | "people">) => {
        const fresh = { matches: d.matches ?? [], groups: d.groups ?? [], people: d.people ?? [] };
        saveTrip(tripRef.current ? mergeTrip(tripRef.current, fresh) : { ...fresh, sentAt: Date.now(), refreshedAt: Date.now(), found: [] });
      })
      .catch(() => !tripRef.current && setError(`Your little ${b.noun} tripped on the curb. Try again?`));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per mount (component is keyed by search)
  }, []);

  // 2. Coming back later? Catch up on who they met while you were gone.
  const caughtUp = useRef(false);
  useEffect(() => {
    if (!data || caughtUp.current) return;
    caughtUp.current = true;
    if (!data.found.length) return; // first trip: watch it happen live
    const n = unlockedCount(order.length, data.sentAt, Date.now());
    const missed = order.slice(0, n).filter((r) => !data.found.some((f) => f.id === revealId(r)));
    if (!missed.length) return;
    addFound(missed.map(revealId));
    const shownPeople = missed.flatMap((r) => (r.kind === "person" ? [r.m.id] : r.g.memberIds)).slice(0, 3).map((id) => personById.get(id)!).filter(Boolean);
    const groups = missed.filter((r) => r.kind === "group").length;
    const pals = missed.length - groups;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time "while you were away" popup
    setCelebrate({
      title: "While you were away…",
      name: [pals && `${pals} new pal${pals > 1 ? "s" : ""}`, groups && `${groups} friend group${groups > 1 ? "s" : ""}`].filter(Boolean).join(" + ") + "!",
      line: `Your ${b.noun} has been busy in ${cityLabel}.`,
      people: shownPeople,
      targetId: revealId(missed[missed.length - 1]),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, when data arrives
  }, [data]);

  // 3. Scatter townsfolk, then let them amble about
  useEffect(() => {
    if (!folks.length) return;
    const init: Record<string, Pos> = {};
    folks.forEach((f, i) => {
      init[f.id] = {
        x: clamp(10 + (i % 6) * 16 + (seeded(i + 1) - 0.5) * 8, WALK.x0, WALK.x1),
        y: clamp(60 + Math.floor(i / 6) * 10 + (seeded(i + 50) - 0.5) * 8, WALK.y0, WALK.y1),
        moving: false,
        flip: seeded(i) > 0.5,
        dur: 0,
      };
    });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- layout derived from fetched people
    setFolkPos((prev) => ({ ...init, ...prev }));
    const t = setInterval(() => {
      setFolkPos((prev) => {
        const next = { ...prev };
        for (const f of folks) {
          const p = prev[f.id];
          if (!p || frozen.current.has(f.id)) continue;
          if (Math.random() < 0.4) {
            const nx = clamp(p.x + (Math.random() - 0.5) * 16, WALK.x0, WALK.x1);
            const ny = clamp(p.y + (Math.random() - 0.5) * 10, WALK.y0, WALK.y1);
            next[f.id] = { x: nx, y: ny, moving: true, flip: nx < p.x, dur: 2600 };
          } else if (p.moving) next[f.id] = { ...p, moving: false };
        }
        return next;
      });
    }, 2800);
    return () => clearInterval(t);
  }, [folks]);

  const folkPosRef = useRef(folkPos);
  useEffect(() => {
    folkPosRef.current = folkPos;
  }, [folkPos]);

  // 4. The stroll: wander, bump into people, find friends and crews. Runs as long as you watch.
  //    You can grab your pal (drag & drop) or tap the town to send them somewhere; both interrupt whatever they're doing.
  const posRef = useRef({ x: -6, y: 74 }); // where your pal logically stands
  const heldRef = useRef(false);
  const interruptRef = useRef(false);
  const commandRef = useRef<Command | null>(null);
  const chattingRef = useRef(false); // true while chatting with someone nearby or inside a hang spot
  const hasData = !!data;
  const nudgeRef = useRef(nudgeInvites);
  useEffect(() => {
    nudgeRef.current = nudgeInvites;
  }, [nudgeInvites]);
  useEffect(() => {
    if (!hasData) return;
    const alive = { current: true }; // per-run, so StrictMode/HMR re-runs cancel the old loop
    const stop = () => !alive.current || interruptRef.current;
    /** Sleep that wakes early when you grab or redirect your pal. */
    const nap = (ms: number) =>
      new Promise<void>((resolve) => {
        const end = Date.now() + ms;
        const tick = () => (stop() || Date.now() >= end ? resolve() : setTimeout(tick, 60));
        tick();
      });
    let sinceFind = 0;
    let lastChat = "";

    /** Walk somewhere; returns false if interrupted (position is then wherever you dropped / where they'd got to). */
    const walkTo = async (x: number, y: number) => {
      const from = { ...posRef.current };
      const dur = Math.max(1200, Math.hypot(x - from.x, (y - from.y) * 1.6) * 75);
      const started = Date.now();
      setMe({ x, y, moving: true, flip: x < from.x, dur });
      await nap(dur);
      if (stop()) {
        // Stopped mid-stride: work out where they actually are (unless you picked them up, which sets the position).
        if (!heldRef.current) {
          const t = Math.min(1, (Date.now() - started) / dur);
          posRef.current = { x: from.x + (x - from.x) * t, y: from.y + (y - from.y) * t };
          setMe((m) => ({ ...m, ...posRef.current, moving: false, dur: 0 }));
        }
        return false;
      }
      posRef.current = { x, y };
      setMe((m) => ({ ...m, moving: false }));
      return true;
    };
    const say = async (who: string, text: string, ms: number, kind?: Bubble["kind"]) => {
      if (stop()) return;
      setBubbles([{ who, text, kind }]);
      await nap(ms);
    };
    const freeze = (ids: string[]) => {
      ids.forEach((id) => frozen.current.add(id));
      setFolkPos((prev) => Object.fromEntries(Object.entries(prev).map(([id, p]) => [id, ids.includes(id) ? { ...p, moving: false } : p])));
    };
    const release = (ids: string[]) => {
      if (!heldRef.current) setBubbles([]);
      setVisiting([]);
      ids.forEach((id) => frozen.current.delete(id));
    };
    const notifyFound = (text: string) => {
      if (document.hidden && typeof Notification !== "undefined" && Notification.permission === "granted") new Notification("Wanderpals", { body: text });
    };

    /** Walk up to someone and chat. Returns true only if the whole conversation happened. */
    const meetOne = async (id: string, convo: () => Promise<void>) => {
      freeze([id]);
      await nap(60);
      const t = folkPosRef.current[id];
      let done = false;
      if (t && !stop()) {
        const side = t.x > posRef.current.x ? -7 : 7;
        if (await walkTo(clamp(t.x + side, WALK.x0, WALK.x1), t.y + 0.5)) {
          setMe((m) => ({ ...m, flip: side < 0 }));
          setFolkPos((prev) => ({ ...prev, [id]: { ...prev[id], flip: side > 0 } }));
          setVisiting([id]);
          await convo();
          done = !stop();
        }
      }
      release([id]);
      return done;
    };

    const meetGroup = async (g: Group) => {
      // The crew drifts together somewhere, then your pal walks over to join them.
      const spot = { x: 30 + Math.random() * 40, y: 70 + Math.random() * 14 };
      freeze(g.memberIds);
      const offsets = [[-8, -3], [8, -3], [0, 5]];
      setFolkPos((prev) => {
        const next = { ...prev };
        g.memberIds.forEach((id, i) => {
          if (!prev[id]) return;
          const x = spot.x + offsets[i % 3][0],
            y = spot.y + offsets[i % 3][1];
          next[id] = { x, y, moving: true, flip: x > spot.x, dur: 2800 };
        });
        return next;
      });
      await nap(2900);
      setFolkPos((prev) => {
        const next = { ...prev };
        g.memberIds.forEach((id) => prev[id] && (next[id] = { ...prev[id], moving: false }));
        return next;
      });
      if (stop() || !(await walkTo(spot.x, spot.y + 1))) {
        release(g.memberIds);
        return false;
      }
      setVisiting(g.memberIds);
      await say("me", "Ooh, can I join you all? 👋", 1800);
      for (const id of g.memberIds) {
        const p = tripRef.current?.people.find((x) => x.id === id);
        if (p) await say(id, pick([`Of course! I'm ${firstName(p)} 😊`, `Pull up a chair! ${firstName(p)} here.`, "Yes! The more the merrier."]), 1500);
      }
      await say("me", `We'd make a great crew. I'm telling ${first}! 🎉`, 2000, "match");
      const done = !stop();
      release(g.memberIds);
      return done;
    };

    (async () => {
      await nap(700);
      await walkTo(14, 74); // strolls in from the edge of town
      while (alive.current) {
        // Being held? Wait to be put down.
        while (alive.current && heldRef.current) await new Promise((r) => setTimeout(r, 80));
        // Chatting with someone (or inside a hang spot)? Stay put until you're done — unless you send your pal somewhere.
        while (alive.current && chattingRef.current && !commandRef.current && !heldRef.current) await new Promise((r) => setTimeout(r, 300));
        if (!alive.current) return;
        interruptRef.current = false;
        const t = tripRef.current!;
        const byId = (id: string) => t.people.find((p) => p.id === id);

        // Something you asked for (tap to go, or dropped next to someone) comes first.
        const cmd = commandRef.current;
        commandRef.current = null;
        if (cmd?.kind === "goto") {
          if (await walkTo(cmd.x, cmd.y)) await say("me", pick(["Here? 😊", "Ooh, nice spot!", "On my way! 🏃", "What's over here?"]), 1300, "meh");
          if (!stop()) setBubbles([]);
          continue;
        }
        if (cmd?.kind === "hello") {
          const p = byId(cmd.id);
          if (p) {
            const done = await meetOne(p.id, async () => {
              await say("me", pick([`Oh! Hi ${firstName(p)} 👋`, "You put me right next to someone! Hello!", "Fancy meeting you here!"]), 1800);
              await say(p.id, pick([`Ha, hi! I'm ${firstName(p)}.`, "Well hello there! 😄", "Nice landing!"]), 1800);
            });
            if (done) addDiary({ id: p.id, text: `Said hi to ${firstName(p)}` });
          }
          continue;
        }
        if (cmd?.kind === "landed") {
          await say("me", pick(["Oof! 😄", "Wheee — again!", "Nice spot!", "I can see my house from here!"]), 1400, "meh");
          if (!stop()) setBubbles([]);
          continue;
        }

        const reveals = revealOrder(t);
        const featured = new Set(reveals.flatMap((r) => (r.kind === "person" ? [r.m.id] : r.g.memberIds)));
        const foundIds = new Set(t.found.map((f) => f.id));
        const due = reveals.slice(0, unlockedCount(reveals.length, t.sentAt, Date.now())).find((r) => !foundIds.has(revealId(r)));
        const strangers = t.people.filter((f) => !featured.has(f.id) && f.id !== lastChat && folkPosRef.current[f.id]);

        if (due && sinceFind >= 1) {
          if (due.kind === "person") {
            const p = byId(due.m.id);
            if (p) {
              const done = await meetOne(p.id, async () => {
                await say("me", due.m.icebreaker, 2600);
                await say(p.id, `${due.m.headline}! 🙌`, 2200, "match");
                await say("me", `We should totally hang out. I'm telling ${first}! 💛`, 2000, "match");
              });
              if (!alive.current) return;
              if (!done) continue; // interrupted — they'll go find them again next time
              addDiary({ id: p.id, text: `Found a friend: ${firstName(p)}!`, match: true });
              setCelebrate({ title: "New pal found!", name: p.name, line: due.m.headline, hangout: due.m.hangout, people: [p], targetId: p.id });
              notifyFound(`Your ${b.noun} made a friend: ${p.name}`);
            }
          } else {
            const done = await meetGroup(due.g);
            if (!alive.current) return;
            if (!done) continue;
            const members = due.g.memberIds.map(byId).filter((p): p is Townsperson => !!p);
            addDiary({ id: due.g.memberIds[0], text: `Found a crew: ${due.g.name}!`, match: true });
            setCelebrate({ title: "You found a friend group!", name: due.g.name, line: commonGround([meAsSomeone(state), ...members])[0] ?? due.g.why[0], hangout: due.g.hangout, people: members, targetId: due.g.id });
            notifyFound(`Your ${b.noun} found a friend group: ${due.g.name}`);
          }
          addFound([revealId(due)]);
          sinceFind = 0;
        } else if (strangers.length && Math.random() < 0.6) {
          const p = pick(strangers);
          lastChat = p.id;
          const done = await meetOne(p.id, async () => {
            await say("me", pick(GREETINGS), 1800);
            await say(
              p.id,
              p.visiting
                ? pick([`Hi! Just visiting from ${p.visiting.from} 🧳`, "Hey! I'm new in town too. Any tips?"])
                : pick([`Hey! I'm ${firstName(p)}. Off to do some ${p.interests[0] ?? "exploring"}.`, "Hi! Lovely day. 😊", "Oh hello! Welcome to town!", "Hey there! Can't stop, busy day!"]),
              2000,
            );
          });
          if (!alive.current) return;
          if (done) addDiary({ id: p.id, text: `Said hi to ${firstName(p)}` });
          sinceFind++;
        } else {
          if (await walkTo(WALK.x0 + Math.random() * (WALK.x1 - WALK.x0), WALK.y0 + Math.random() * (WALK.y1 - WALK.y0))) {
            const thought = nudgeRef.current && Math.random() < 0.3 ? pick(["💌 Psst… invite a friend!", "🥺 I'd love to meet your friends!", "💌 More friends = more fun in town!"]) : pick(STROLL_THOUGHTS);
            if (Math.random() < 0.6) await say("me", thought, 1800, "meh");
            if (!stop()) setBubbles([]);
          }
          sinceFind++;
        }
        await nap(600 + Math.random() * 1400);
      }
    })();
    return () => {
      alive.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- start the stroll once the trip has loaded
  }, [hasData]);

  /* ------------------------- grab, drag, drop & tap-to-go ------------------------- */

  const sceneRef = useRef<HTMLDivElement>(null);
  const [held, setHeld] = useState(false);
  const [squish, setSquish] = useState(0);
  const [marker, setMarker] = useState<{ x: number; y: number; key: number } | null>(null);
  // Your pet trots a step behind you — and stays on the ground (bouncing) while you're carried.
  const [petAt, setPetAt] = useState({ x: -10, y: 74, dur: 0 });
  useEffect(() => {
    if (held) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the pet follows the pal's position
    setPetAt({ x: me.x + (me.flip ? 4.5 : -4.5), y: me.y, dur: me.dur });
  }, [me, held]);

  /* ------------------------- live: who's online, chat, hang spots ------------------------- */

  const [place, setPlace] = useState<LivePlace>("town");
  const [live, setLive] = useState<{ state: LiveState; prev: Record<string, { x: number; y: number }>; at: number }>({
    state: { people: [], invites: [], spot: null },
    prev: {},
    at: 0,
  });
  const center = useMemo(() => placeCoords(search.mode === "trip" ? search.destination : state.basics.location), [search, state.basics.location]);
  useEffect(() => {
    if (!hasData) return;
    let alive = true;
    // Heartbeat: tell the server where your pal is; hear who's around. (~2s; fine for a small town — swap for websockets at scale.)
    const beat = async () => {
      const r = await fetch("/api/live", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ place, x: posRef.current.x, y: posRef.current.y, lat: center?.[0] ?? null, lng: center?.[1] ?? null }),
      }).catch(() => null);
      if (!alive || !r?.ok) return;
      const next = (await r.json()) as LiveState;
      setLive((l) => ({ state: next, prev: Object.fromEntries(l.state.people.map((p) => [p.id, { x: p.x, y: p.y }])), at: Date.now() }));
      if (place !== "town" && !next.spot) setPlace("town");
    };
    beat();
    const t = setInterval(beat, 2000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [hasData, place, center]);

  const liveTown = place === "town" ? live.state.people : [];
  const liveIds = new Set(liveTown.map((p) => p.id));
  // The online person your pal is standing next to (if any) — that's who you can chat with.
  // Only once your pal has stopped: while walking, `me` already holds the destination, not where they are.
  const nearby = (me.moving || held ? [] : liveTown)
    .map((p) => ({ p, d: nearDistance(me, p) }))
    .filter((o) => o.d <= NEAR)
    .sort((a, c) => a.d - c.d)[0]?.p;
  const nearbyId = nearby?.id;
  useEffect(() => {
    chattingRef.current = !!nearbyId || place !== "town";
    if (nearbyId) interruptRef.current = true; // stop and say hi
  }, [nearbyId, place]);
  const dm = useChat(nearby && place === "town" ? { with: nearby.id } : null);
  const spotChat = useChat(place !== "town" && live.state.spot ? { spot: live.state.spot.id } : null);
  const lines = recentLines(place === "town" ? dm.messages : spotChat.messages, live.at);

  const spotCall = async (body: Record<string, unknown>) => {
    const r = await fetch("/api/live/spot", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) {
      alert(d.error ?? "Something went wrong");
      return null;
    }
    return d as { place?: LivePlace };
  };
  const goSpot = async (kind: SpotKind, invite: string[]) => {
    const d = await spotCall({ action: "create", kind, invite });
    if (d?.place) setPlace(d.place);
  };
  const toScene = (clientX: number, clientY: number) => {
    const rect = sceneRef.current!.getBoundingClientRect();
    return { x: ((clientX - rect.left) / rect.width) * 100, y: ((clientY - rect.top) / rect.height) * 100 };
  };

  const grab = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!data) return;
    e.preventDefault();
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture(e.pointerId); // keep receiving moves even if the finger outruns the avatar
    } catch {}
    heldRef.current = true;
    interruptRef.current = true;
    setHeld(true);
    setBubbles([{ who: "me", text: pick(["Wheee! 🙌", "Whoa! Where are we going?", "Up we go! 🎈", "Hehe, that tickles!"]) }]);
  };
  const drag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!heldRef.current) return;
    const p = toScene(e.clientX, e.clientY);
    // You hold them by the head, so their feet dangle a bit below your finger.
    const x = clamp(p.x, 3, 97),
      y = clamp(p.y + 9, 12, 99);
    posRef.current = { x, y };
    setMe((m) => ({ x, y, moving: true, flip: x < m.x ? true : x > m.x ? false : m.flip, dur: 0 }));
  };
  const drop = () => {
    if (!heldRef.current) return;
    heldRef.current = false;
    setHeld(false);
    // Dropped over the road or buildings? They fall down onto the grass.
    const x = clamp(posRef.current.x, WALK.x0, WALK.x1),
      y = clamp(posRef.current.y, WALK.y0, WALK.y1);
    const fell = Math.abs(y - posRef.current.y) > 1;
    posRef.current = { x, y };
    setMe((m) => ({ ...m, x, y, moving: false, dur: fell ? 450 : 0 }));
    setSquish((k) => k + 1);
    setBubbles([]);
    const nearest = folks
      .map((f) => ({ id: f.id, p: folkPosRef.current[f.id] }))
      .filter((o) => o.p)
      .map((o) => ({ id: o.id, d: Math.hypot(o.p.x - x, (o.p.y - y) * 1.6) }))
      .sort((a, c) => a.d - c.d)[0];
    commandRef.current = nearest && nearest.d < 10 ? { kind: "hello", id: nearest.id } : { kind: "landed" };
    interruptRef.current = true;
  };
  const tapScene = (e: React.MouseEvent) => {
    if (!data || heldRef.current) return;
    const p = toScene(e.clientX, e.clientY);
    const x = clamp(p.x, WALK.x0, WALK.x1),
      y = clamp(p.y, WALK.y0, WALK.y1);
    commandRef.current = { kind: "goto", x, y };
    interruptRef.current = true;
    const key = Date.now();
    setMarker({ x, y, key });
    setTimeout(() => setMarker((m) => (m?.key === key ? null : m)), 1400);
  };

  /* --------------------------------- render --------------------------------- */

  const header = (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-3xl font-bold">
          {first}&apos;s little {b.noun} is out in {cityLabel}
        </h2>
        <p className="text-muted">
          {state.goal ? `Goal: ${state.goal}` : "Goal: make some friends"} · <button className="underline" onClick={onChangeGoal}>change</button>
        </p>
      </div>
      <SearchBar search={search} home={home} onSearch={onSearch} />
    </div>
  );

  const incoming = connections.incoming.filter((p) => !connections.mine[p.id]);
  const incomingCards = incoming.length > 0 && (
    <div className="rise card !border-brand space-y-3">
      <h3 className="font-display text-xl font-bold">👋 {incoming.length === 1 ? "Someone wants" : `${incoming.length} people want`} to meet you!</h3>
      <div className="grid sm:grid-cols-2 gap-3">
        {incoming.map((p) => (
          <div key={p.id} className="flex items-center gap-3 rounded-2xl border-2 border-line p-3">
            <Avatar look={p.look} size={64} waving />
            <div className="flex-1 min-w-0">
              <div className="font-semibold">
                {p.name}, {p.age}
              </div>
              <div className="text-xs text-muted truncate">{p.bio}</div>
              <div className="flex gap-2 mt-2">
                <button
                  className="btn !px-3 !py-1.5 !text-sm"
                  onClick={() => {
                    onDecide([p.id], "yes");
                    setCelebrate({ title: "You're pals now!", name: p.name, line: "You both said yes — their contact info is in “Your pals” below.", people: [p], targetId: `pal-${p.id}` });
                  }}
                >
                  Say yes 💛
                </button>
                <button className="btn-ghost !px-3 !py-1 !text-sm" onClick={() => onDecide([p.id], "no")}>
                  Not now
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const pals = connections.friends.length > 0 && (
    <div className="rise card !border-good space-y-3">
      <h3 className="font-display text-xl font-bold">
        💛 Your pals <span className="text-good">({connections.friends.length})</span>
      </h3>
      <p className="text-sm text-muted">You both said yes — reach out and make a plan.</p>
      <div className="grid sm:grid-cols-2 gap-3">
        {connections.friends.map((p) => {
          const intro = `Hey ${firstName(p)}! Our Wanderpals matched us up — I'm ${first} from ${home}. Want to grab a coffee or a beer this week?`;
          return (
            <div key={p.id} id={`card-pal-${p.id}`} className="flex gap-3 rounded-2xl border-2 border-line p-3">
              <Avatar look={p.look} size={72} waving />
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="font-semibold">
                  {p.name}, {p.age} <span className="text-muted font-normal">· {p.town}</span>
                </div>
                <ContactLinks contact={connections.contacts[p.id] ?? {}} />
                {!Object.values(connections.contacts[p.id] ?? {}).some(Boolean) && <p className="text-xs text-muted">{firstName(p)} hasn&apos;t shared contact info yet.</p>}
                <div className="flex flex-wrap gap-2">
                  <button className="btn !py-1 !px-3 !text-sm" onClick={() => setDraft({ title: "🍻 Drinks", invite: [p.id] })}>
                    📅 Plan a hang
                  </button>
                  <CopyButton text={intro} label="Copy an intro text" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  if (needsDestination) {
    return (
      <div className="space-y-6">
        {incomingCards}
        {pals}
        <Hangouts pals={connections.friends} me={state.look} draft={draft} onDraft={setDraft} />
        {header}
        <div className="card text-center py-12 space-y-3">
          <div className="text-5xl">🧳</div>
          <div className="font-display text-2xl font-semibold">Where are you headed?</div>
          <p className="text-muted">Pick a destination above and your {b.noun} will pack a tiny suitcase and go meet people there.</p>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="space-y-6">
        {header}
        <div className="text-center py-16 space-y-4">
          <h2 className="font-display text-2xl font-semibold">{error}</h2>
          <button className="btn" onClick={() => location.reload()}>Retry</button>
        </div>
      </div>
    );
  }

  const foundIds = new Set((data?.found ?? []).map((f) => f.id));
  const found = (data?.found ?? [])
    .map((f) => {
      const r = order.find((x) => revealId(x) === f.id);
      return r ? { f, r } : null;
    })
    .filter((x): x is { f: Found; r: Reveal } => !!x)
    .reverse();
  // Townsfolk who are already your friends (directly or through a crew), for the little 💛.
  const befriended = new Set(order.filter((r) => foundIds.has(revealId(r))).flatMap((r) => (r.kind === "person" ? [r.m.id] : r.g.memberIds)));
  const allFound = !!data && found.length >= order.length;
  const emptyTown = !!data && order.length === 0;
  const bubbleFor = (who: string) => bubbles.find((x) => x.who === who);

  return (
    <div className="space-y-6">
      {place === "town" &&
        live.state.invites.map((inv) => (
          <div key={inv.id} className="rise card !border-brand !bg-brand/5 flex flex-wrap items-center gap-3">
            <Avatar look={inv.from.look} size={60} waving />
            <div className="flex-1 font-display text-lg font-semibold">
              {inv.from.name} wants to go to the {SPOTS[inv.kind].label} {SPOTS[inv.kind].emoji} with you!
            </div>
            <button
              className="btn"
              onClick={async () => {
                const d = await spotCall({ action: "join", id: inv.id });
                if (d?.place) setPlace(d.place);
              }}
            >
              Let&apos;s go!
            </button>
            <button className="btn-ghost" onClick={() => spotCall({ action: "decline", id: inv.id })}>
              Not now
            </button>
          </div>
        ))}
      {incomingCards}
      {pals}
      <Hangouts pals={connections.friends} me={state.look} draft={draft} onDraft={setDraft} />
      {header}

      <div className="grid lg:grid-cols-[1fr_280px] gap-4">
        {place !== "town" ? (
          live.state.spot ? (
            <SpotScene kind={live.state.spot.kind} me={{ look: state.look, name: first }} members={live.state.spot.members} lines={lines} />
          ) : (
            <div className="grid place-items-center aspect-[16/10] rounded-3xl border-4 border-line text-muted">Walking over…</div>
          )
        ) : (
        <div
          ref={sceneRef}
          onClick={tapScene}
          className={`relative isolate w-full aspect-[16/11] sm:aspect-[16/10] rounded-3xl overflow-hidden border-4 border-[#1d2433]/10 select-none ${data ? "cursor-pointer" : ""}`}
        >
          <Scenery />
          <div className="absolute top-2 left-2 z-[150] rounded-full bg-white/90 text-[#1d2433] text-xs font-bold px-3 py-1 shadow">
            {search.mode === "trip" ? "✈️" : "📍"} {cityLabel}
          </div>
          {liveTown.map((p) => {
            const was = live.prev[p.id];
            const moving = !!was && Math.hypot(was.x - p.x, was.y - p.y) > 0.5;
            const flip = !!was && p.x < was.x;
            const line = lines[p.id];
            return (
              <div
                key={`live-${p.id}`}
                className="absolute"
                style={{ left: `${p.x}%`, top: `${p.y}%`, transform: "translate(-50%, -100%)", zIndex: Math.round(p.y), transition: "left 2000ms linear, top 2000ms linear" }}
              >
                {line && <SpeechBubble b={{ who: p.id, text: line }} x={p.x} />}
                <div style={{ transform: flip ? "scaleX(-1)" : undefined }}>
                  <Avatar look={p.look} size={58} walking={moving} waving={nearby?.id === p.id} className="w-[clamp(24px,4.6vw,38px)] h-auto" />
                </div>
                {p.look.pet && (
                  <div className="absolute bottom-0" style={{ [flip ? "left" : "right"]: "85%", transform: flip ? "scaleX(-1)" : undefined }}>
                    <Pet pet={p.look.pet} size={18} walking={moving} className="w-[clamp(14px,2.6vw,22px)] h-auto" />
                  </div>
                )}
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-0.5 rounded-full bg-white/90 text-[#1d2433] text-[9px] px-1 font-bold whitespace-nowrap">
                  <span className="text-good">●</span> {p.name}
                </div>
              </div>
            );
          })}
          {folks.filter((f) => !liveIds.has(f.id)).map((f) => {
            const p = folkPos[f.id];
            if (!p) return null;
            const bb = bubbleFor(f.id);
            return (
              <div
                key={f.id}
                className="absolute"
                style={{ left: `${p.x}%`, top: `${p.y}%`, transform: "translate(-50%, -100%)", zIndex: Math.round(p.y), transition: `left ${p.dur}ms linear, top ${p.dur}ms linear` }}
              >
                {bb && <SpeechBubble b={bb} x={p.x} />}
                <div style={{ transform: p.flip ? "scaleX(-1)" : undefined }}>
                  <Avatar look={f.look} size={58} walking={p.moving} waving={visiting.includes(f.id)} className="w-[clamp(24px,4.6vw,38px)] h-auto" />
                </div>
                {f.look.pet && (
                  <div className="absolute bottom-0" style={{ [p.flip ? "left" : "right"]: "85%", transform: p.flip ? "scaleX(-1)" : undefined }}>
                    <Pet pet={f.look.pet} size={18} walking={p.moving} className="w-[clamp(14px,2.6vw,22px)] h-auto" />
                  </div>
                )}
                {f.visiting && <div className="absolute -bottom-1 -left-1 text-[10px]">🧳</div>}
                {befriended.has(f.id) && <div className="pop absolute -top-1 -right-2 text-xs">💛</div>}
              </div>
            );
          })}
          {marker && (
            <div key={marker.key} className="pin-drop absolute pointer-events-none text-xl" style={{ left: `${marker.x}%`, top: `${marker.y}%`, transform: "translate(-50%, -100%)", zIndex: 140 }}>
              📍
            </div>
          )}
          {data && state.look.pet && (
            <div
              className="absolute pointer-events-none"
              style={{
                left: `${petAt.x}%`,
                top: `${petAt.y}%`,
                transform: "translate(-50%, -100%)",
                zIndex: Math.round(petAt.y),
                transition: `left ${petAt.dur}ms linear 250ms, top ${petAt.dur}ms linear 250ms`,
              }}
            >
              <div className={held ? "pet-excited" : ""} style={{ transform: me.flip ? "scaleX(-1)" : undefined }}>
                <Pet pet={state.look.pet} size={24} walking={me.moving || held} className="w-[clamp(18px,3.4vw,28px)] h-auto" />
              </div>
            </div>
          )}
          {data && (
            <div
              className={`absolute touch-none ${held ? "cursor-grabbing" : "cursor-grab"}`}
              style={{
                left: `${me.x}%`,
                top: `${me.y}%`,
                transform: "translate(-50%, -100%)",
                zIndex: held ? 300 : Math.round(me.y) + 1,
                transition: `left ${me.dur}ms ${me.dur && me.dur < 600 ? "ease-in" : "linear"}, top ${me.dur}ms ${me.dur && me.dur < 600 ? "ease-in" : "linear"}`,
              }}
              onPointerDown={grab}
              onPointerMove={drag}
              onPointerUp={drop}
              onPointerCancel={drop}
              onClick={(e) => e.stopPropagation()}
              aria-label={`Your pal. Drag to move ${b.him}.`}
            >
              {(bubbleFor("me") ?? (lines.me ? { who: "me", text: lines.me } : null)) && (
                <SpeechBubble b={bubbleFor("me") ?? { who: "me", text: lines.me }} x={me.x} />
              )}
              <div className={`absolute left-1/2 -translate-x-1/2 rounded-full bg-brand/60 blur-[2px] transition-all ${held ? "-bottom-4 w-6 h-1.5 opacity-40" : "-bottom-1 w-10 h-2"}`} />
              <div key={squish} className={held ? "held" : squish ? "land" : ""}>
                <div style={{ transform: me.flip ? "scaleX(-1)" : undefined }}>
                  <Avatar look={state.look} size={74} walking={me.moving} className="w-[clamp(32px,6.2vw,48px)] h-auto pointer-events-none" />
                </div>
              </div>
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-0.5 rounded-full bg-brand text-white text-[10px] px-1.5 font-bold whitespace-nowrap">YOU</div>
            </div>
          )}
          {!data && (
            <div className="absolute inset-0 grid place-items-center">
              <div className="card !py-3 text-sm font-medium">{search.mode === "trip" ? `Packing ${b.his} tiny suitcase…` : `Lacing up ${b.his} tiny shoes…`}</div>
            </div>
          )}
        </div>
        )}

        {place !== "town" && live.state.spot ? (
          <aside className="card !p-4">
            <ChatPanel
              title={
                <div className="font-display font-semibold">
                  {SPOTS[live.state.spot.kind].emoji} {SPOTS[live.state.spot.kind].label}
                  <span className="text-muted font-normal text-sm"> · {live.state.spot.members.length ? `with ${live.state.spot.members.map((m) => m.name).join(", ")}` : "waiting for your friend…"}</span>
                </div>
              }
              messages={spotChat.messages}
              error={spotChat.error}
              onSend={spotChat.send}
              footer={
                <div className="flex flex-wrap gap-2 pt-2">
                  {connections.friends
                    .filter((f) => !live.state.spot!.members.some((m) => m.id === f.id))
                    .slice(0, 4)
                    .map((f) => (
                      <button key={f.id} className="chip !text-xs" onClick={() => spotCall({ action: "invite", id: live.state.spot!.id, invite: [f.id] })}>
                        ＋ Bring {f.name}
                      </button>
                    ))}
                  <button
                    className="btn-ghost !py-1 !text-sm ml-auto"
                    onClick={async () => {
                      await spotCall({ action: "leave", id: live.state.spot!.id });
                      setPlace("town");
                    }}
                  >
                    🚪 Head back to town
                  </button>
                </div>
              }
            />
          </aside>
        ) : nearby ? (
          <aside className="card !p-4 !border-good">
            <ChatPanel
              title={
                <div className="flex items-center gap-2">
                  <Avatar look={nearby.look} size={40} />
                  <div className="min-w-0">
                    <div className="font-display font-semibold leading-tight">{nearby.name}</div>
                    <div className="text-xs text-good">● right next to your {b.noun}</div>
                  </div>
                </div>
              }
              person={nearby}
              messages={dm.messages}
              error={dm.error}
              onSend={dm.send}
              onGo={(kind) => goSpot(kind, [nearby.id])}
              onBlocked={() => setLive((l) => ({ ...l, state: { ...l.state, people: l.state.people.filter((p) => p.id !== nearby.id) } }))}
            />
          </aside>
        ) : (
        <aside className="card !p-4 space-y-3 max-h-[480px] overflow-auto">
          {data && <p className="text-xs text-muted rounded-xl bg-bg px-2 py-1.5">🖐️ Drag your pal anywhere · 👆 tap the town to send {b.him} somewhere</p>}
          {liveTown.length > 0 && (
            <div className="space-y-1.5">
              <h3 className="font-display text-lg font-semibold">🟢 Online now</h3>
              {liveTown.map((p) => (
                <button
                  key={p.id}
                  className="w-full flex items-center gap-2 rounded-xl border-2 border-line hover:border-good px-2 py-1.5 text-sm text-left"
                  onClick={() => {
                    commandRef.current = { kind: "goto", x: clamp(p.x + (p.x > 50 ? -6 : 6), WALK.x0, WALK.x1), y: clamp(p.y, WALK.y0, WALK.y1) };
                    interruptRef.current = true;
                  }}
                >
                  <Avatar look={p.look} size={28} />
                  <span className="flex-1 font-semibold">{p.name}</span>
                  <span className="text-xs text-muted">walk over to chat →</span>
                </button>
              ))}
            </div>
          )}
          <h3 className="font-display text-lg font-semibold">Town diary</h3>
          {!diary.length && <p className="text-sm text-muted">Just got to town. Looking around…</p>}
          <ul className="space-y-1.5">
            {diary.map((d) => {
              const p = d.id ? personById.get(d.id) : null;
              return (
                <li key={d.key} className={`rise flex gap-2 items-center rounded-xl px-2 py-1.5 text-sm ${d.match ? "bg-accent/40 font-semibold" : "text-muted"}`}>
                  {p && <Avatar look={p.look} size={28} />}
                  <span>{d.text}</span>
                </li>
              );
            })}
          </ul>
        </aside>
        )}
      </div>

      {data && (emptyTown || found.length > 0) && (
        <div className="rise card !bg-accent/20 !border-accent/60 flex flex-wrap items-center gap-4">
          <Avatar look={state.look} size={64} walking={!allFound} waving={allFound} />
          <div className="flex-1 min-w-[220px]">
            {emptyTown ? (
              <>
                <div className="font-display text-xl font-semibold">It&apos;s quiet in {cityLabel} so far.</div>
                <p className="text-muted text-sm">
                  Wanderpals is brand new here. Your {b.noun} will keep checking as people join — and the fastest way to fill the town is to invite a friend or two.
                </p>
              </>
            ) : allFound ? (
              <>
                <div className="font-display text-xl font-semibold">Your {b.noun} has met everyone worth meeting in {cityLabel} — for now.</div>
                <p className="text-muted text-sm">New people join every day. Check back soon!</p>
              </>
            ) : (
              <Countdown sentAt={data.sentAt} foundCount={found.length} total={order.length} noun={b.noun} he={b.he} city={cityLabel} />
            )}
          </div>
          {(emptyTown || allFound) && onInvite && (
            <button className="btn-ghost" onClick={onInvite}>
              💌 Invite friends
            </button>
          )}
          {!allFound && !emptyTown && notify === "default" && (
            <button className="btn-ghost" onClick={() => Notification.requestPermission().then(setNotify)}>
              🔔 Notify me
            </button>
          )}
          {notify === "granted" && !allFound && !emptyTown && <span className="text-sm text-muted">🔔 Notifications on</span>}
        </div>
      )}

      {found.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-display text-2xl font-bold">
            People you should meet <span className="text-brand">({found.length})</span>
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            {found.map(({ f, r }) => {
              if (r.kind === "person") {
                const p = personById.get(r.m.id);
                return (
                  p && (
                    <MatchCard
                      key={f.id}
                      m={r.m}
                      p={p}
                      state={state}
                      isNew={f.at > lastSeen}
                      mine={connections.mine[p.id]}
                      contact={connections.contacts[p.id]}
                      onDecide={(d) => onDecide([p.id], d)}
                      onPlan={() => setDraft({ title: titleFor(r.m.hangout), invite: [p.id] })}
                    />
                  )
                );
              }
              const members = r.g.memberIds.map((id) => personById.get(id)).filter((p): p is Townsperson => !!p);
              return <GroupCard key={f.id} g={r.g} members={members} state={state} isNew={f.at > lastSeen} connections={connections} onDecide={onDecide} />;
            })}
          </div>
        </div>
      )}

      {celebrate && <Celebration c={celebrate} me={state.look} onClose={closeCelebration} />}
    </div>
  );
}
