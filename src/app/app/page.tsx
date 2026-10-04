"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import Avatar from "@/components/Avatar";
import Logo from "@/components/Logo";
import AvatarStep from "@/components/steps/AvatarStep";
import BasicsStep from "@/components/steps/BasicsStep";
import DeepDiveStep from "@/components/steps/DeepDiveStep";
import PersonaStep from "@/components/steps/PersonaStep";
import TownStep from "@/components/steps/TownStep";
import { EMPTY_CONNECTIONS, INITIAL_STATE, type AppState, type Connections, type Trip } from "@/lib/state";
import { searchKey, type Basics } from "@/lib/types";

const ONBOARDING = ["About you", "Your pal", "Get to know you", "Your persona"];
/** Pre-accounts versions kept progress in localStorage; import it once into the account. */
const LEGACY_KEY = "bricktown:v2";

function legacyState(): AppState | null {
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return null;
    const old = JSON.parse(raw);
    const basics = { ...INITIAL_STATE.basics, ...old.basics } as Basics & { town?: string };
    if (!basics.location && basics.town) basics.location = { label: basics.town };
    delete basics.town;
    return { ...INITIAL_STATE, ...old, basics, step: Math.min(Math.max(1, old.step ?? 1), 5) };
  } catch {
    return null;
  }
}

async function json<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, init);
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  return r.json();
}

export default function AppPage() {
  const { user, isLoaded } = useUser();
  const [s, setS] = useState<AppState | null>(null);
  const [trips, setTrips] = useState<Record<string, Trip>>({});
  const [connections, setConnections] = useState<Connections>(EMPTY_CONNECTIONS);
  const [ai, setAi] = useState<boolean | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [saveError, setSaveError] = useState(false);

  // Load the account's profile (or start a new one, prefilled from sign-up).
  useEffect(() => {
    if (!isLoaded) return;
    json<{ state: AppState | null; trips: Record<string, Trip> }>("/api/me")
      .then(({ state, trips }) => {
        let next = state;
        if (!next) {
          next = legacyState() ?? { ...INITIAL_STATE };
          next.basics = {
            ...next.basics,
            name: next.basics.name || user?.firstName || "",
            contact: { ...next.basics.contact, email: next.basics.contact.email || user?.primaryEmailAddress?.emailAddress },
          };
        }
        try {
          localStorage.removeItem(LEGACY_KEY);
        } catch {}
        setS({ ...INITIAL_STATE, ...next, step: Math.max(1, next.step) });
        setTrips(trips);
      })
      .catch(() => setLoadError(true));
    json<{ ai: boolean }>("/api/status").then((d) => setAi(d.ai)).catch(() => setAi(false));
  }, [isLoaded, user]);

  // Save profile edits (debounced), and flush if the tab is closing.
  const pending = useRef<string | null>(null);
  const flush = useCallback((keepalive = false) => {
    const body = pending.current;
    if (!body) return;
    pending.current = null;
    fetch("/api/me", { method: "PUT", headers: { "content-type": "application/json" }, body, keepalive })
      .then((r) => setSaveError(!r.ok))
      .catch(() => setSaveError(true));
  }, []);
  useEffect(() => {
    if (!s) return;
    pending.current = JSON.stringify({ state: s });
    const t = setTimeout(() => flush(), 700);
    return () => clearTimeout(t);
  }, [s, flush]);
  useEffect(() => {
    const onHide = () => document.visibilityState === "hidden" && flush(true);
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [flush]);

  // Who said yes to whom. Polled while you're in town so mutual yeses show up without a reload.
  const refreshConnections = useCallback(() => json<Connections>("/api/connections").then(setConnections).catch(() => {}), []);
  const inTown = s?.step === 5;
  useEffect(() => {
    if (!inTown) return;
    refreshConnections();
    const t = setInterval(refreshConnections, 30_000);
    return () => clearInterval(t);
  }, [inTown, refreshConnections]);

  const decide = async (ids: string[], decision: "yes" | "no" | null) => {
    setConnections((c) => {
      const mine = { ...c.mine };
      ids.forEach((id) => (decision ? (mine[id] = decision) : delete mine[id]));
      return { ...c, mine };
    });
    for (const to of ids) {
      await json<Connections>("/api/connections", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ to, decision }) })
        .then(setConnections)
        .catch(() => {});
    }
  };

  if (loadError) {
    return (
      <div className="flex-1 grid place-items-center p-8 text-center">
        <div className="space-y-3">
          <div className="font-display text-2xl font-semibold">Couldn&apos;t load your pal.</div>
          <button className="btn" onClick={() => location.reload()}>Try again</button>
        </div>
      </div>
    );
  }
  if (!s) {
    return (
      <div className="flex-1 grid place-items-center">
        <Avatar look={INITIAL_STATE.look} size={120} walking />
      </div>
    );
  }

  const update = (patch: Partial<AppState>) => setS((prev) => (prev ? { ...prev, ...patch } : prev));
  const go = (step: number) => {
    update({ step });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const next = () => go(s.step + 1);
  /** Goal or personality changed: old matches are stale, so start fresh walks. */
  const resetTrips = () => {
    setTrips({});
    return fetch("/api/trips", { method: "DELETE" }).catch(() => {});
  };
  const tripKey = searchKey(s.search, s.basics.location);
  const onboarded = !!s.persona;
  const waiting = connections.incoming.filter((p) => !connections.mine[p.id]).length;

  return (
    <div className="flex-1 flex flex-col">
      <header className="sticky top-0 z-30 backdrop-blur bg-bg/80 border-b-2 border-line">
        <div className="mx-auto max-w-5xl px-4 py-2.5 flex items-center gap-4">
          <Link href="/" className="font-display text-2xl font-bold tracking-tight flex items-center gap-2 shrink-0">
            <Logo /> <span className="hidden sm:inline">Wanderpals</span>
          </Link>

          {s.step < 5 && (
            <div className="flex-1 flex items-center gap-1.5 max-w-md" aria-label={`Step ${s.step} of ${ONBOARDING.length}: ${ONBOARDING[s.step - 1]}`}>
              {ONBOARDING.map((label, i) => (
                <div key={label} className="flex-1" title={label}>
                  <div className={`h-2 rounded-full ${i + 1 <= s.step ? "bg-brand" : "bg-line"}`} />
                </div>
              ))}
            </div>
          )}

          <nav className="ml-auto flex items-center gap-1 sm:gap-2 text-sm font-semibold">
            {saveError && <span className="text-xs text-red-600 font-normal">Not saved — check your connection</span>}
            {onboarded && s.step !== 5 && (
              <button className="rounded-xl px-3 py-1.5 hover:bg-line/60" onClick={() => go(5)}>
                🏘️ Town
              </button>
            )}
            {onboarded && s.step === 5 && (
              <button className="rounded-xl px-3 py-1.5 hover:bg-line/60" onClick={() => go(1)}>
                ✏️ Edit my pal
              </button>
            )}
            {waiting > 0 && s.step === 5 && (
              <span className="rounded-full bg-brand text-white text-xs px-2 py-0.5" title="People who want to meet you">
                👋 {waiting}
              </span>
            )}
            <UserButton>
              <UserButton.MenuItems>
                <UserButton.Action
                  label="Remove my pal from Wanderpals"
                  labelIcon={<span>🗑️</span>}
                  onClick={async () => {
                    if (!confirm("Remove your pal, matches and connections from Wanderpals? Your sign-in stays, and you can start fresh anytime.")) return;
                    await fetch("/api/me", { method: "DELETE" });
                    pending.current = null;
                    setTrips({});
                    setConnections(EMPTY_CONNECTIONS);
                    setS({ ...INITIAL_STATE, basics: { ...INITIAL_STATE.basics, name: user?.firstName ?? "" } });
                  }}
                />
              </UserButton.MenuItems>
            </UserButton>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 py-8 flex-1">
        {s.step === 1 && (
          <BasicsStep
            look={s.look}
            basics={s.basics}
            onChange={(basics) => {
              // Follow guy/girl with a default hairdo, unless they've already picked their own style.
              const defaults = { guy: "short", girl: "long", other: "short" } as const;
              const prev = s.basics.gender ? defaults[s.basics.gender] : "short";
              const look =
                basics.gender && basics.gender !== s.basics.gender && s.look.hairStyle === prev ? { ...s.look, hairStyle: defaults[basics.gender] } : s.look;
              update({ basics, look });
            }}
            onNext={next}
          />
        )}
        {s.step === 2 && <AvatarStep look={s.look} onChange={(look) => update({ look })} onNext={() => go(s.persona ? 4 : 3)} ai={ai} />}
        {s.step === 3 && (
          <DeepDiveStep
            answers={s.answers}
            transcript={s.transcript}
            onAnswers={(answers) => update({ answers })}
            onTranscript={(transcript) => update({ transcript })}
            onDone={() => {
              update({ persona: null });
              resetTrips();
              next();
            }}
          />
        )}
        {s.step === 4 && (
          <PersonaStep
            state={s}
            onPersona={(persona) => update({ persona })}
            onGoal={(goal) => update({ goal })}
            onRetake={() => go(3)}
            onNext={() => resetTrips().then(next)}
          />
        )}
        {s.step === 5 && s.persona && (
          <TownStep
            key={tripKey}
            state={s}
            trip={trips[tripKey]}
            connections={connections}
            onTrip={(trip) => {
              setTrips((t) => ({ ...t, [tripKey]: trip }));
              fetch("/api/trips", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ key: tripKey, trip }) }).catch(() => {});
            }}
            onSearch={(search) => update({ search })}
            onDecide={decide}
            onChangeGoal={() => go(4)}
          />
        )}
      </main>
    </div>
  );
}
