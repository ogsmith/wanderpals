"use client";

import { useRef, useState } from "react";
import Avatar from "@/components/Avatar";
import { PANTS, SHIRTS } from "@/lib/palette";
import { EYE_COLORS, HAIR_COLORS, HAIR_STYLES, SKIN_TONES, type AvatarLook } from "@/lib/types";



/** Downscale the photo so we don't ship a 12MP selfie to the server. */
async function toSmallDataUrl(file: File, max = 768): Promise<string> {
  const img = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.85);
}

function Swatches<T extends string>({ value, options, onPick, round = true }: { value: T; options: Record<T, string> | T[]; onPick: (v: T) => void; round?: boolean }) {
  const entries: [T, string][] = Array.isArray(options) ? options.map((c) => [c, c]) : (Object.entries(options) as [T, string][]);
  return (
    <div className="flex flex-wrap gap-2">
      {entries.map(([k, color]) => (
        <button
          key={k}
          title={k}
          onClick={() => onPick(k)}
          className={`w-9 h-9 ${round ? "rounded-full" : "rounded-lg"} border-2 transition ${value === k ? "ring-4 ring-brand/40 border-ink scale-110" : "border-line"}`}
          style={{ background: color }}
        />
      ))}
    </div>
  );
}

function Chips<T extends string>({ value, options, onPick }: { value: T; options: readonly T[]; onPick: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button key={o} className="chip capitalize" data-on={value === o} onClick={() => onPick(o)}>
          {o}
        </button>
      ))}
    </div>
  );
}

export default function AvatarStep({ look, onChange, onNext, ai }: { look: AvatarLook; onChange: (l: AvatarLook) => void; onNext: () => void; ai: boolean | null }) {
  const [photo, setPhoto] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "reading" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const set = (patch: Partial<AvatarLook>) => onChange({ ...look, ...patch });

  async function handleFile(file: File) {
    const url = await toSmallDataUrl(file);
    setPhoto(url);
    if (!ai) {
      setStatus("error");
      setMsg("Photo reading needs the AI key — pick your colors below for now.");
      return;
    }
    setStatus("reading");
    try {
      const res = await fetch("/api/avatar", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ image: url }) });
      if (!res.ok) throw new Error(await res.text());
      const traits = await res.json();
      onChange({ ...look, ...traits });
      setStatus("done");
      setMsg(`Got it: ${traits.hair} hair, ${traits.eyes} eyes${traits.glasses ? ", glasses" : ""}. Tweak anything below.`);
    } catch (e) {
      console.error(e);
      setStatus("error");
      setMsg("Couldn't read that photo — pick your look below.");
    }
  }

  return (
    <div className="grid md:grid-cols-[1fr_1.3fr] gap-8 items-start">
      <div className="card md:sticky md:top-24 flex flex-col items-center gap-4">
        <div className="relative w-full flex justify-center items-end h-64 rounded-2xl bg-gradient-to-b from-sky-200 to-emerald-200 dark:from-sky-900 dark:to-emerald-900 overflow-hidden">
          <div className="absolute bottom-0 inset-x-0 h-10 bg-emerald-400/60 dark:bg-emerald-700/60" />
          <div className={`relative mb-3 ${status === "done" ? "pop" : ""}`} key={JSON.stringify(look)}>
            <Avatar look={look} size={220} waving={status === "done"} />
          </div>
        {/* eslint-disable-next-line @next/next/no-img-element -- local data URL preview */}
          {photo && <img src={photo} alt="Your photo" className="absolute top-3 left-3 w-16 h-16 object-cover rounded-xl border-4 border-white shadow" />}
        </div>
        <input ref={fileRef} type="file" accept="image/*" capture="user" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
        <button className="btn w-full" onClick={() => fileRef.current?.click()} disabled={status === "reading"}>
          {status === "reading" ? "Looking at you…" : photo ? "📸 Try another photo" : "📸 Upload a selfie"}
        </button>
        {msg && <p className={`text-sm text-center ${status === "error" ? "text-muted" : ""}`}>{msg}</p>}
        <p className="text-xs text-muted text-center">Your photo is only used to pick colors — it is not saved.</p>
      </div>

      <div className="space-y-6">
        <div>
          <h2 className="font-display text-3xl font-bold">Build your little you</h2>
          <p className="text-muted">Upload a selfie and we&apos;ll match your colors, or just pick them. Keep it simple — it&apos;s a toy, not a portrait.</p>
        </div>
        <section className="space-y-2"><h3 className="font-semibold">Skin</h3><Swatches value={look.skin} options={SKIN_TONES} onPick={(skin) => set({ skin })} /></section>
        <section className="space-y-2"><h3 className="font-semibold">Hair color</h3><Swatches value={look.hair} options={HAIR_COLORS} onPick={(hair) => set({ hair })} /></section>
        <section className="space-y-2"><h3 className="font-semibold">Hair style</h3><Chips value={look.hairStyle} options={HAIR_STYLES} onPick={(hairStyle) => set({ hairStyle })} /></section>
        <section className="space-y-2"><h3 className="font-semibold">Eyes</h3><Swatches value={look.eyes} options={EYE_COLORS} onPick={(eyes) => set({ eyes })} /></section>
        <section className="space-y-2">
          <h3 className="font-semibold">Glasses</h3>
          <Chips value={look.glasses ? "yes" : "no"} options={["no", "yes"] as const} onPick={(v) => set({ glasses: v === "yes" })} />
        </section>
        <section className="space-y-2"><h3 className="font-semibold">Shirt</h3><Swatches value={look.shirt} options={SHIRTS} onPick={(shirt) => set({ shirt })} round={false} /></section>
        <section className="space-y-2"><h3 className="font-semibold">Pants</h3><Swatches value={look.pants} options={PANTS} onPick={(pants) => set({ pants })} round={false} /></section>
        <button className="btn" onClick={onNext}>That&apos;s me →</button>
      </div>
    </div>
  );
}
