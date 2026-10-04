"use client";

import Avatar from "@/components/Avatar";
import { LIFE_STAGES } from "@/lib/quiz";
import LocationInput from "@/components/LocationInput";
import { placeCoords } from "@/lib/towns";
import type { AvatarLook, Basics, Gender } from "@/lib/types";

export default function BasicsStep({ look, basics, onChange, onNext }: { look: AvatarLook; basics: Basics; onChange: (b: Basics) => void; onNext: () => void }) {
  const set = (patch: Partial<Basics>) => onChange({ ...basics, ...patch });
  const toggle = (tag: string) =>
    set({ lifeStage: basics.lifeStage.includes(tag) ? basics.lifeStage.filter((t) => t !== tag) : [...basics.lifeStage, tag] });
  const c = basics.contact;
  // Matching needs coordinates: a picked suggestion, GPS, or a town we know.
  const placed = !!placeCoords(basics.location);
  const ok = basics.name.trim() && basics.gender && basics.age >= 18 && placed && (c.email || c.phone || c.instagram);

  return (
    <div className="grid md:grid-cols-[auto_1fr] gap-8 items-start">
      <div className="hidden md:flex flex-col items-center gap-2 sticky top-24">
        <div className="card relative pt-10">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-xl bg-ink text-bg px-3 py-1 text-sm font-display">
            {basics.name ? `Hi, I'm ${basics.name.split(" ")[0]}!` : "Who am I?"}
          </div>
          <Avatar look={look} size={180} />
        </div>
      </div>

      <div className="space-y-6 max-w-xl">
        <div>
          <h2 className="font-display text-3xl font-bold">First, who are you?</h2>
          <p className="text-muted">The basics that matter most for finding people in the same place in life.</p>
        </div>

        <div className="grid sm:grid-cols-[1fr_7rem] gap-3">
          <label className="space-y-1"><span className="text-sm font-semibold">First name</span>
            <input className="input" value={basics.name} onChange={(e) => set({ name: e.target.value })} placeholder="Andrew" />
          </label>
          <label className="space-y-1"><span className="text-sm font-semibold">Age</span>
            <input className="input" type="number" min={18} max={99} value={basics.age} onChange={(e) => set({ age: Number(e.target.value) })} />
          </label>
        </div>
        <div className="space-y-1">
          <span className="text-sm font-semibold">Where do you live?</span>
          <LocationInput value={basics.location} onChange={(location) => set({ location })} />
          {basics.location?.label && !placed && <p className="text-xs text-muted">Pick your town from the suggestions (or use your location) so we can find people nearby.</p>}
        </div>

        <div className="space-y-2">
          <span className="text-sm font-semibold">I&apos;m a…</span>
          <div className="flex flex-wrap gap-2">
            {([["guy", "👦 Guy"], ["girl", "👧 Girl"], ["other", "🙂 Rather not say"]] as [Gender, string][]).map(([g, label]) => (
              <button key={g} className="chip text-base" data-on={basics.gender === g} onClick={() => set({ gender: g })}>{label}</button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <span className="text-sm font-semibold">Looking for friends who are…</span>
          <div className="flex flex-wrap gap-2">
            {([["anyone", "Anyone"], ["guys", "Guys"], ["girls", "Girls"]] as [Basics["friendsWith"], string][]).map(([f, label]) => (
              <button key={f} className="chip text-base" data-on={basics.friendsWith === f} onClick={() => set({ friendsWith: f })}>{label}</button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <span className="text-sm font-semibold">Where are you in life? <span className="text-muted font-normal">(pick all that fit)</span></span>
          <div className="flex flex-wrap gap-2">
            {LIFE_STAGES.map((t) => (
              <button key={t} className="chip capitalize" data-on={basics.lifeStage.includes(t)} onClick={() => toggle(t)}>{t}</button>
            ))}
          </div>
        </div>

        <div className="card space-y-3">
          <div>
            <div className="font-semibold">What you&apos;re OK sharing with a match</div>
            <p className="text-sm text-muted">Only revealed to people you both say yes to. Fill in at least one.</p>
          </div>
          <input className="input" placeholder="Email" value={c.email ?? ""} onChange={(e) => set({ contact: { ...c, email: e.target.value } })} />
          <input className="input" placeholder="Phone" value={c.phone ?? ""} onChange={(e) => set({ contact: { ...c, phone: e.target.value } })} />
          <input className="input" placeholder="Instagram" value={c.instagram ?? ""} onChange={(e) => set({ contact: { ...c, instagram: e.target.value } })} />
        </div>

        <button className="btn" disabled={!ok} onClick={onNext}>Next: build my little me →</button>
      </div>
    </div>
  );
}
