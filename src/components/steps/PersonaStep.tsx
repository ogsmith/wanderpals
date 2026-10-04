"use client";

import { useEffect, useState } from "react";
import Avatar from "@/components/Avatar";
import Pet from "@/components/Pet";
import { homeLabel, type AppState } from "@/lib/state";
import { buddy, type Persona } from "@/lib/types";

const GOALS = [
  "Find other parents-to-be nearby",
  "Find founders I can grab a beer with",
  "Find a gaming buddy",
  "Find couples friends",
  "Find a workout partner",
];

const TRAIT_LABELS: [keyof Persona["traits"], string, string][] = [
  ["extraversion", "Homebody", "Life of the party"],
  ["openness", "Creature of habit", "Tries everything"],
  ["conscientiousness", "Go with the flow", "Has a system"],
  ["agreeableness", "Straight shooter", "Peacemaker"],
  ["ambition", "Content", "Driven"],
];

export default function PersonaStep({ state, onPersona, onGoal, onNext, onRetake }: { state: AppState; onPersona: (p: Persona) => void; onGoal: (g: string) => void; onNext: () => void; onRetake: () => void }) {
  const b = buddy(state.basics.gender);
  const [error, setError] = useState("");
  const p = state.persona;

  useEffect(() => {
    if (p) return;
    fetch("/api/persona", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ basics: state.basics, answers: state.answers, transcript: state.transcript }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.statusText)))
      .then((d) => onPersona(d.persona))
      .catch(() => setError("Could not build your persona. Try again?"));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per missing persona
  }, [p]);

  if (!p) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <Avatar look={state.look} size={160} walking />
        <h2 className="font-display text-2xl font-semibold">{error || "Reading everything you told me…"}</h2>
        {!error && <p className="text-muted">Figuring out your personality, stage of life, and the kind of people you&apos;d click with.</p>}
        {error && <button className="btn" onClick={() => location.reload()}>Retry</button>}
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-[1fr_1.2fr] gap-6 items-start">
      <div className="card flex flex-col items-center text-center gap-3 rise">
        <div className="flex items-end gap-1">
          <Avatar look={state.look} size={200} waving />
          {state.look.pet && <Pet pet={state.look.pet} size={60} />}
        </div>
        <div className="text-sm uppercase tracking-widest text-muted">{state.basics.name}, {state.basics.age} · {homeLabel(state.basics)}</div>
        <h2 className="font-display text-3xl font-bold text-brand">{p.archetype}</h2>
        <p>{p.summary}</p>
        <div className="flex flex-wrap justify-center gap-1.5 pt-2">
          {p.lifeStageTags.map((t) => <span key={t} className="chip capitalize" data-on>{t}</span>)}
          {p.interests.map((t) => <span key={t} className="chip capitalize">{t}</span>)}
        </div>
      </div>

      <div className="space-y-6">
        <div className="card space-y-4 rise" style={{ animationDelay: "120ms" }}>
          <h3 className="font-display text-xl font-semibold">How you&apos;re wired</h3>
          {TRAIT_LABELS.map(([k, lo, hi]) => (
            <div key={k}>
              <div className="flex justify-between text-sm text-muted"><span>{lo}</span><span>{hi}</span></div>
              <div className="relative h-3 rounded-full bg-line mt-1">
                <div className="absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-brand border-4 border-card shadow transition-all duration-700" style={{ left: `calc(${p.traits[k]}% - 10px)` }} />
              </div>
            </div>
          ))}
          <div className="grid sm:grid-cols-2 gap-3 pt-2 text-sm">
            <div><div className="font-semibold">You like to hang</div><p className="text-muted">{p.socialStyle}</p></div>
            <div><div className="font-semibold">You&apos;d click with</div><p className="text-muted">{p.idealFriend}</p></div>
          </div>
        </div>

        <div className="card space-y-3 rise" style={{ animationDelay: "240ms" }}>
          <h3 className="font-display text-xl font-semibold">Give your little {b.noun} a goal</h3>
          <p className="text-sm text-muted">Optional. Leave it blank and it&apos;ll just go make friends.</p>
          <div className="flex flex-wrap gap-2">
            {GOALS.map((g) => (
              <button key={g} className="chip" data-on={state.goal === g} onClick={() => onGoal(state.goal === g ? "" : g)}>{g}</button>
            ))}
          </div>
          <input className="input" placeholder="Or write your own…" value={state.goal} onChange={(e) => onGoal(e.target.value)} />
          <button className="btn w-full" onClick={onNext}>🏘️ Send me into town</button>
          <button className="text-sm underline text-muted w-full" onClick={onRetake}>Not quite me? Redo the questions</button>
        </div>
      </div>
    </div>
  );
}
