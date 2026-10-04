"use client";

import { useEffect, useState } from "react";
import Avatar from "@/components/Avatar";
import type { AvatarLook, Townsperson } from "@/lib/types";

const COLORS = ["#ff5a36", "#ffd23f", "#2bb673", "#3a7bd5", "#e84393", "#8e44ad"];

export type Celebrate = {
  title: string; // "New pal found!"
  name: string; // "Mike Donnelly" / "The Founders Grill Crew"
  line?: string; // headline
  hangout?: string;
  people: Townsperson[];
  targetId?: string; // card to scroll to
};

export default function Celebration({ c, me, onClose }: { c: Celebrate; me: AvatarLook; onClose: () => void }) {
  const [confetti] = useState(() =>
    Array.from({ length: 70 }, (_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 0.8,
      dur: 2.2 + Math.random() * 1.6,
      color: COLORS[i % COLORS.length],
      size: 6 + Math.random() * 8,
      round: Math.random() < 0.35,
      spin: Math.random() * 720 - 360,
    })),
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const goToCard = () => {
    onClose();
    if (c.targetId) setTimeout(() => document.getElementById(`card-${c.targetId}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
  };

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center p-4 bg-[#1d2433]/55 backdrop-blur-sm fade-in" onClick={onClose} role="dialog" aria-modal>
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        {confetti.map((p, i) => (
          <span
            key={i}
            className="confetti"
            style={{
              left: `${p.left}%`,
              width: p.size,
              height: p.round ? p.size : p.size * 0.45,
              background: p.color,
              borderRadius: p.round ? "50%" : 2,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.dur}s`,
              ["--spin" as string]: `${p.spin}deg`,
            }}
          />
        ))}
      </div>

      <div className="celebrate-card relative w-full max-w-md rounded-[2rem] bg-card border-4 border-accent shadow-2xl p-6 pt-4 text-center overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="rays absolute -inset-1/2 opacity-60" aria-hidden />
        <div className="relative">
          <div className="font-display text-sm font-bold uppercase tracking-[0.2em] text-brand">{c.title}</div>
          <div className="relative flex justify-center items-end gap-1 h-40 mt-2">
            {["💛", "💖", "✨", "💛", "🎉"].map((h, i) => (
              <span key={i} className="float-heart absolute text-2xl" style={{ left: `${15 + i * 17}%`, animationDelay: `${0.2 + i * 0.25}s` }}>
                {h}
              </span>
            ))}
            <div className="jump" style={{ animationDelay: "0s" }}>
              <Avatar look={me} size={c.people.length > 1 ? 104 : 130} waving />
            </div>
            {c.people.map((p, i) => (
              <div key={p.id} className="jump" style={{ animationDelay: `${0.12 * (i + 1)}s` }}>
                <Avatar look={p.look} size={c.people.length > 1 ? 104 : 130} waving />
              </div>
            ))}
          </div>
          <h2 className="font-display text-3xl font-bold mt-2 leading-tight">{c.name}</h2>
          {c.line && <p className="mt-1 font-semibold text-brand">{c.line}</p>}
          {c.hangout && (
            <div className="mt-4 rounded-2xl bg-accent/30 px-4 py-3 text-sm text-left">
              <span className="font-semibold">💡 First hang idea: </span>
              {c.hangout}
            </div>
          )}
          <div className="mt-5 flex gap-2 justify-center">
            <button className="btn" onClick={goToCard}>Meet them 👋</button>
            <button className="btn-ghost" onClick={onClose}>Keep exploring</button>
          </div>
        </div>
      </div>
    </div>
  );
}
