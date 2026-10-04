export const HAIR_COLORS = {
  black: "#1f1a17",
  "dark brown": "#3b2a20",
  brown: "#6b4426",
  "light brown": "#9a6b3f",
  blonde: "#e3c16f",
  red: "#b5482a",
  auburn: "#8a3b24",
  gray: "#9a9a9a",
  white: "#e8e6e1",
} as const;

export const EYE_COLORS = {
  brown: "#5a3618",
  "dark brown": "#2e1d10",
  blue: "#3a7bd5",
  green: "#3f8f4e",
  hazel: "#8a6a2c",
  gray: "#7d8a96",
} as const;

export const SKIN_TONES = {
  porcelain: "#f6dcc4",
  fair: "#efc9a6",
  light: "#e2b48a",
  medium: "#c68e62",
  tan: "#a46a43",
  deep: "#6e432a",
} as const;

export const HAIR_STYLES = ["short", "spiky", "curly", "long", "ponytail", "pigtails", "bun", "bald"] as const;

export type HairColor = keyof typeof HAIR_COLORS;
export type EyeColor = keyof typeof EYE_COLORS;
export type SkinTone = keyof typeof SKIN_TONES;
export type HairStyle = (typeof HAIR_STYLES)[number];

export const PET_COLORS = {
  dog: { golden: "#d9a441", brown: "#8b5a2b", black: "#3a3540", white: "#f2efe9" },
  cat: { orange: "#f28c38", gray: "#9a9aa5", black: "#3a3540", white: "#f4f1ea" },
} as const;
export type PetKind = keyof typeof PET_COLORS;
/** Unlocked by inviting friends; trots around town after you. */
export type Pet = { kind: PetKind; color: string; name: string };

export type AvatarLook = {
  pet?: Pet;
  skin: SkinTone;
  hair: HairColor;
  hairStyle: HairStyle;
  eyes: EyeColor;
  glasses: boolean;
  shirt: string;
  pants: string;
};

export const DEFAULT_LOOK: AvatarLook = {
  skin: "fair",
  hair: "brown",
  hairStyle: "short",
  eyes: "brown",
  glasses: false,
  shirt: "#2f6fde",
  pants: "#2b3445",
};

export type Contact = {
  email?: string;
  phone?: string;
  instagram?: string;
};

/** The hard facts we need for matching, collected up front. */
export type Gender = "guy" | "girl" | "other";

/** A place picked from search or GPS. lat/lng may be missing if we only have a typed name. */
export type Place = { label: string; lat?: number; lng?: number };

export type Basics = {
  name: string;
  location?: Place; // home town
  gender: Gender;
  friendsWith: "anyone" | "guys" | "girls";
  age: number;
  lifeStage: string[]; // tags e.g. "married", "expecting", "founder"
  contact: Contact;
};

/** What the LLM concludes about you from the quiz / talk. */
export type Persona = {
  archetype: string;
  summary: string;
  traits: {
    openness: number;
    conscientiousness: number;
    extraversion: number;
    agreeableness: number;
    ambition: number;
  };
  lifeStageTags: string[];
  interests: string[];
  values: string[];
  socialStyle: string;
  idealFriend: string;
};

export type Me = {
  basics: Basics;
  look: AvatarLook;
  persona: Persona;
  goal: string;
};

export type Townsperson = {
  id: string;
  name: string;
  gender: Gender;
  age: number;
  town: string;
  occupation: string;
  bio: string;
  lifeStageTags: string[];
  interests: string[];
  values: string[];
  traits: Persona["traits"];
  look: AvatarLook;
  contact: Contact;
  lat?: number;
  lng?: number;
  /** Set for people passing through: where they're from and how long they're around. */
  visiting?: { from: string; until: string };
};

/** Where your pal is looking and who for. */
export type Search = {
  mode: "home" | "trip";
  destination?: Place; // when mode === "trip"
  who: "locals" | "visitors" | "both";
};

export const searchKey = (s: Search, home?: Place) =>
  `${s.mode}:${(s.mode === "trip" ? s.destination?.label : home?.label) ?? "?"}:${s.who}`.toLowerCase();

export type Group = {
  id: string; // "grp-…"
  memberIds: string[]; // 2–3 others (plus you = 3–4)
  score: number;
  name: string; // "The Founders Grill Crew"
  why: string[];
  hangout: string;
};

export type Match = {
  id: string;
  score: number; // 0-100
  headline: string; // "Also expecting their first, also a founder"
  reasons: string[];
  hangout: string; // "You both like beer — grab a pint at ... this Friday"
  icebreaker: string; // what your avatar said / learned
};

/** "your guy" / "your girl" / "your little you", plus pronouns for copy. */
export function buddy(g: Gender | undefined) {
  if (g === "guy") return { noun: "guy", he: "he", him: "him", his: "his" };
  if (g === "girl") return { noun: "girl", he: "she", him: "her", his: "her" };
  return { noun: "little you", he: "they", him: "them", his: "their" };
}
