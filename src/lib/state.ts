import type { Answers } from "./quiz";
import { DEFAULT_LOOK, type AvatarLook, type Basics, type Contact, type Group, type Match, type Persona, type Search, type Townsperson } from "./types";

/** Everything a user builds during onboarding. Stored server-side per account. */
export type AppState = {
  step: number;
  look: AvatarLook;
  basics: Basics;
  answers: Answers;
  transcript: string;
  persona: Persona | null;
  goal: string;
  search: Search; // home vs. traveling, locals vs. visitors
  invites?: { sent: number; nudgedAt: number }; // how many invites you've shared, and when we last reminded you
};

export type Found = { id: string; at: number };

/** One walk through one town (per search). `people` is a snapshot of who was there. */
export type Trip = {
  matches: Match[];
  groups: Group[];
  people: Townsperson[];
  sentAt: number;
  refreshedAt: number;
  found: Found[];
};

/** Your yes/no decisions, who said yes to you, and the pals you've connected with (both said yes). */
export type Connections = {
  mine: Record<string, "yes" | "no">;
  incoming: Townsperson[];
  contacts: Record<string, Contact>;
  friends: Townsperson[];
};

export type RSVP = "invited" | "going" | "maybe" | "declined";

/** "How about Saturday instead?" — a suggested new time / place / idea for a hangout. */
export type Proposal = {
  id: string;
  proposer: Townsperson;
  mine: boolean;
  startsAt?: string;
  place?: string;
  title?: string;
  note: string;
  votes: number;
  iVoted: boolean;
  voters: string[]; // first names
};

/** A plan with pals. Visible to the host, anyone invited, and (if open) all of the host's pals. */
export type Hangout = {
  id: string;
  title: string;
  place: string;
  startsAt: string; // ISO
  note: string;
  open: boolean;
  host: Townsperson;
  isHost: boolean;
  myStatus: RSVP | null;
  invitedMeBy?: string; // first name of whoever invited you
  people: { person: Townsperson; status: RSVP; invitedBy?: string; isYou?: boolean }[]; // invitedBy = first name of whoever brought them
  proposals: Proposal[]; // open suggestions, most-voted first
  changed?: { at: string; note: string }; // last time the host changed the plan (and what changed)
};

export const EMPTY_CONNECTIONS: Connections = { mine: {}, incoming: [], contacts: {}, friends: [] };

export const INITIAL_STATE: AppState = {
  step: 1,
  look: DEFAULT_LOOK,
  basics: { name: "", gender: "" as Basics["gender"], friendsWith: "anyone", age: 30, lifeStage: [], contact: {} },
  answers: {},
  transcript: "",
  persona: null,
  goal: "",
  search: { mode: "home", who: "locals" },
};

/** You, in the same shape as other people, for "what do we have in common". */
export const meAsSomeone = (s: AppState) => ({
  lifeStageTags: [...new Set([...(s.persona?.lifeStageTags ?? []), ...s.basics.lifeStage])],
  interests: s.persona?.interests ?? [],
});

export const homeLabel = (b: Basics) => b.location?.label?.split(",")[0] || "your town";

/* ------------------------------ live town ------------------------------ */

export const SPOTS = {
  cafe: { label: "Café", emoji: "☕", blurb: "grab a virtual coffee" },
  taphouse: { label: "Tap House", emoji: "🍺", blurb: "split a pitcher" },
  arcade: { label: "Arcade", emoji: "🎮", blurb: "play a few rounds" },
  park: { label: "Park", emoji: "🌳", blurb: "hang out on a picnic blanket" },
} as const;
export type SpotKind = keyof typeof SPOTS;

/** Where your pal is: out in town, or inside a hang spot. */
export type LivePlace = "town" | `spot:${string}`;

/** Someone online right now, and where their pal is standing. */
export type LivePerson = Townsperson & { x: number; y: number };

export type ChatMessage = { id: string; from: string; name: string; body: string; at: string };

export type SpotInvite = { id: string; kind: SpotKind; from: Townsperson };
export type SpotInfo = { id: string; kind: SpotKind; members: Townsperson[] };

/** What a presence heartbeat returns. */
export type LiveState = { people: LivePerson[]; invites: SpotInvite[]; spot: SpotInfo | null };

/** How close (in town %-units, y counts extra since the scene is wide) two pals must be to chat. */
export const NEAR = 14;
export const nearDistance = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, (a.y - b.y) * 1.6);
export const dmConv = (a: string, b: string) => `dm:${[a, b].sort().join("|")}`;
