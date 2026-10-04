"use client";

import { useState } from "react";
import Avatar from "@/components/Avatar";
import { ContactLinks, CopyButton } from "@/components/MatchCard";
import { commonGround } from "@/lib/common";
import { homeLabel, meAsSomeone, type AppState, type Connections } from "@/lib/state";
import { buddy, type Group, type Townsperson } from "@/lib/types";

/** A crew of 3–4. Saying hi asks each member separately; each one's contact unlocks when they say yes. */
export default function GroupCard({
  g,
  members,
  state,
  connections,
  onDecide,
  isNew,
}: {
  g: Group;
  members: Townsperson[];
  state: AppState;
  connections: Connections;
  onDecide: (ids: string[], d: "yes" | "no" | null) => void;
  isNew?: boolean;
}) {
  const [knocking, setKnocking] = useState(false);
  const b = buddy(state.basics.gender);
  const firsts = members.map((m) => m.name.split(" ")[0]);
  const names = firsts.length > 1 ? `${firsts.slice(0, -1).join(", ")} & ${firsts.at(-1)}` : firsts[0];
  const ids = members.map((m) => m.id);
  const asked = ids.some((id) => connections.mine[id] === "yes");
  const passed = ids.every((id) => connections.mine[id] === "no");
  // Worked out from the actual people every render, so it's never stale or overstated.
  const why = [...commonGround([meAsSomeone(state), ...members]), `${firsts.join(", ")} get along with each other too`];
  const intro = `Hey ${names}! Our Wanderpals all bumped into each other and figured we'd make a good crew — I'm ${state.basics.name.split(" ")[0]} from ${homeLabel(state.basics)}. ${g.hangout} Who's in?`;

  return (
    <div id={`card-${g.id}`} className={`card rise space-y-4 relative md:col-span-2 !border-accent ${passed ? "opacity-50" : ""}`}>
      {isNew && <span className="pop absolute -top-3 -right-2 rounded-full bg-brand text-white text-xs font-bold px-2.5 py-1 shadow">NEW</span>}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-end -space-x-3 rounded-2xl bg-gradient-to-b from-amber-100 to-pink-100 dark:from-amber-900 dark:to-pink-900 px-3 pt-2">
          <Avatar look={state.look} size={84} />
          {members.map((m) => (
            <Avatar key={m.id} look={m.look} size={84} waving={!!connections.contacts[m.id]} />
          ))}
        </div>
        <div className="flex-1 min-w-[200px]">
          <div className="text-xs font-bold uppercase tracking-widest text-brand">👯 Friend group · {members.length + 1} people</div>
          <h3 className="font-display text-2xl font-bold leading-tight">{g.name}</h3>
          <div className="text-sm text-muted">You, {members.map((m) => `${m.name.split(" ")[0]} (${m.age}, ${m.town})`).join(", ")}</div>
        </div>
      </div>

      <ul className="flex flex-wrap gap-1.5">
        {why.map((r) => (
          <li key={r} className="chip !text-xs">✓ {r}</li>
        ))}
      </ul>

      <div className="rounded-2xl bg-accent/25 border-2 border-accent/60 p-3 text-sm">
        <span className="font-semibold">💡 Crew hang idea: </span>
        {g.hangout}
      </div>

      {asked ? (
        <div className="rounded-2xl border-2 border-line bg-bg p-4 space-y-3">
          <div className="grid sm:grid-cols-3 gap-3 text-sm">
            {members.map((m) => {
              const c = connections.contacts[m.id];
              return (
                <div key={m.id} className={`rounded-xl border-2 p-3 space-y-1 ${c ? "border-good bg-good/10" : "border-line bg-card"}`}>
                  <div className="font-semibold">{m.name}</div>
                  {c ? <ContactLinks contact={c} /> : <div className="text-muted">💌 Waiting for {m.name.split(" ")[0]} to say yes…</div>}
                </div>
              );
            })}
          </div>
          {ids.some((id) => connections.contacts[id]) && (
            <>
              <div className="rounded-xl bg-card border-2 border-line p-3 text-sm">{intro}</div>
              <CopyButton text={intro} label="Copy a group intro text" />
            </>
          )}
          <button className="text-sm underline text-muted block" onClick={() => onDecide(ids, null)}>Undo</button>
        </div>
      ) : passed ? (
        <button className="text-sm underline text-muted" onClick={() => onDecide(ids, null)}>Undo</button>
      ) : knocking ? (
        <div className="flex items-center gap-3 text-sm">
          <Avatar look={state.look} size={48} walking />
          <span>Your little {b.noun} is rounding up the crew…</span>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            className="btn flex-1"
            onClick={() => {
              setKnocking(true);
              setTimeout(() => {
                setKnocking(false);
                onDecide(ids, "yes");
              }, 1400);
            }}
          >
            Say hi to {names} 👋
          </button>
          <button className="btn-ghost" onClick={() => onDecide(ids, "no")}>Not now</button>
        </div>
      )}
    </div>
  );
}
