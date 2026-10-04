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
  people: { person: Townsperson; status: RSVP; invitedBy?: string }[]; // invitedBy = first name of whoever brought them
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

export const homeLabel = (b: Basics) => b.location?.label?.split(",")[0] || "your town";
