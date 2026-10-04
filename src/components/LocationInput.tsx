"use client";

import { useEffect, useRef, useState } from "react";
import type { Place } from "@/lib/types";

type Suggestion = { id: string; label: string; secondary?: string };

/** City search with autocomplete (Google when configured) and a "use my location" button. */
export default function LocationInput({
  value,
  onChange,
  placeholder = "Start typing a town…",
  gps = true,
}: {
  value?: Place;
  onChange: (p: Place) => void;
  placeholder?: string;
  gps?: boolean;
}) {
  const [text, setText] = useState(value?.label ?? "");
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Suggestion[]>([]);
  const [active, setActive] = useState(0);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  const typed = useRef(false);

  useEffect(() => {
    if (!typed.current) return;
    const q = text.trim();
    if (!q) return;
    const t = setTimeout(() => {
      fetch(`/api/places?op=autocomplete&q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((d) => {
          setItems(d.suggestions ?? []);
          setActive(0);
          setOpen(true);
        })
        .catch(() => setItems([]));
    }, 200);
    return () => clearTimeout(t);
  }, [text]);

  async function choose(s: Suggestion) {
    typed.current = false;
    setText(s.label);
    setOpen(false);
    try {
      const place = (await fetch(`/api/places?op=details&id=${encodeURIComponent(s.id)}`).then((r) => r.json())) as Place;
      onChange({ ...place, label: place.label || s.label });
    } catch {
      onChange({ label: s.label });
    }
  }

  function locate() {
    if (!navigator.geolocation) return setError("Location isn't available in this browser.");
    setLocating(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const place = (await fetch(`/api/places?op=reverse&lat=${coords.latitude}&lng=${coords.longitude}`).then((r) => r.json())) as Place;
          typed.current = false;
          setText(place.label);
          onChange(place);
        } catch {
          setError("Couldn't figure out your town — type it instead.");
        }
        setLocating(false);
      },
      () => {
        setLocating(false);
        setError("Location permission was denied — type your town instead.");
      },
      { enableHighAccuracy: false, timeout: 10000 },
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            className="input"
            value={text}
            placeholder={placeholder}
            onChange={(e) => {
              typed.current = true;
              setText(e.target.value);
              if (!e.target.value.trim()) setOpen(false);
              onChange({ label: e.target.value }); // typed but not picked: label only
            }}
            onFocus={() => items.length && setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onKeyDown={(e) => {
              if (!open || !items.length) return;
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(items.length - 1, a + 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(0, a - 1));
              } else if (e.key === "Enter") {
                e.preventDefault();
                choose(items[active]);
              }
            }}
          />
          {open && items.length > 0 && (
            <ul className="absolute z-40 mt-1 w-full rounded-xl border-2 border-line bg-card shadow-lg overflow-hidden">
              {items.map((s, i) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => choose(s)}
                    className={`w-full text-left px-4 py-2.5 ${i === active ? "bg-brand/10" : ""}`}
                  >
                    <span className="font-medium">{s.label}</span>
                    {s.secondary && <span className="text-muted text-sm"> · {s.secondary}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {gps && (
          <button type="button" className="btn-ghost shrink-0" onClick={locate} disabled={locating} title="Use my current location">
            {locating ? "Locating…" : "📍 Use my location"}
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {value?.lat !== undefined && !error && <p className="text-xs text-good">✓ Got it: {value.label}</p>}
    </div>
  );
}
