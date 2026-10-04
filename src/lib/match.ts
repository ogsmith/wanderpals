import { commonGround } from "./common";
import { milesBetweenCoords } from "./towns";
import { buddy, type Group, type Match, type Me, type Search, type Townsperson } from "./types";

const norm = (s: string) => s.toLowerCase().replace(/[^a-z ]/g, "").trim();
const sameThing = (a: string, b: string) => {
  const x = norm(a),
    y = norm(b);
  return x === y || (x.length > 3 && y.includes(x)) || (y.length > 3 && x.includes(y));
};
const overlap = (a: string[], b: string[]) => a.filter((x) => b.some((y) => sameThing(x, y)));

const PARENT_STAGES = ["expecting", "new parent", "young kids"];

/** The bits of a person that matter for "would these two click?" — works for you or a townsperson. */
type Profile = {
  name: string;
  age: number;
  lifeStage: string[];
  interests: string[];
  values: string[];
  traits: Townsperson["traits"];
  coords: [number, number] | null;
  town: string;
  visiting: boolean;
};

const fromPerson = (p: Townsperson): Profile => ({
  name: p.name.split(" ")[0],
  age: p.age,
  lifeStage: p.lifeStageTags,
  interests: p.interests,
  values: p.values,
  traits: p.traits,
  coords: p.lat !== undefined && p.lng !== undefined ? [p.lat, p.lng] : null,
  town: p.town,
  visiting: !!p.visiting,
});

function pairScore(a: Profile, b: Profile, city: string) {
  const reasons: string[] = [];
  let score = 0;

  // life stage — the big one
  const stage = overlap(a.lifeStage, b.lifeStage);
  const parentish = stage.filter((s) => PARENT_STAGES.includes(s));
  score += Math.min(28, stage.length * 9 + parentish.length * 6);
  if (!parentish.length && a.lifeStage.includes("expecting") && b.lifeStage.includes("new parent")) {
    score += 8;
    reasons.push("A few months ahead of you on the baby journey");
  }
  if (stage.length) reasons.push(`Same season of life: ${stage.join(", ")}`);

  // interests + values
  const shared = overlap(a.interests, b.interests);
  score += Math.min(22, shared.length * 6);
  if (shared.length) reasons.push(`Both into ${shared.slice(0, 3).join(", ")}`);
  score += Math.min(6, overlap(a.values, b.values).length * 3);

  // age: within ~3 years is ideal
  const dAge = Math.abs(a.age - b.age);
  score += Math.max(0, 22 - Math.max(0, dAge - 2) * 3);
  if (dAge <= 3) reasons.push(dAge === 0 ? "Same age" : `${dAge} year${dAge > 1 ? "s" : ""} apart`);

  // where: visitors are all "here now"; locals are scored by distance
  if (a.visiting && b.visiting) {
    score += 16;
    reasons.push(`Both visiting ${city} right now`);
  } else if (a.visiting || b.visiting) {
    score += 14;
    reasons.push(b.visiting ? `Visiting ${city} — wants someone to explore with` : `A local who knows ${city}`);
  } else if (a.coords && b.coords) {
    const miles = milesBetweenCoords(a.coords, b.coords);
    score += miles < 5 ? 18 : miles < 12 ? 14 : miles < 25 ? 8 : 2;
    if (miles < 12) reasons.push(miles < 1.5 ? `Also in ${b.town}` : `~${Math.round(miles)} mi away in ${b.town}`);
  } else score += 8;

  // personality similarity (gentle)
  const keys = Object.keys(a.traits) as (keyof Profile["traits"])[];
  const diff = keys.reduce((s, k) => s + Math.abs(a.traits[k] - b.traits[k]), 0) / keys.length;
  score += Math.max(0, 8 - diff / 6);
  if (Math.abs(a.traits.ambition - b.traits.ambition) < 12 && a.traits.ambition > 70) reasons.push("Equally driven");

  return { score: Math.min(99, score), reasons, shared, stage };
}

const HANGOUTS: [string, string, string][] = [
  // [interest, 1:1 idea, group idea]
  ["grilling", "You're both grill people — host a backyard cookout this Sunday. One brings the meat, one brings the opinions on wood chips.", "Backyard cookout this Sunday — everyone brings one thing for the grill."],
  ["craft beer", "You both like beer — why not grab a couple of pints at a local brewery this Friday after work?", "Grab a big table at a brewery Friday night and do a flight."],
  ["video games", "Both gamers — do an online co-op night this week after bedtime, then graduate to an in-person game night.", "Couch co-op game night — someone hosts, everyone brings snacks."],
  ["board games", "Host a board game night this weekend. Loser buys the pizza.", "Board game night: one long strategy game, loser buys the pizza."],
  ["golf", "Hit a bucket of balls at the driving range Saturday morning.", "Book a foursome for a Saturday morning round."],
  ["running", "Do an easy Saturday morning run together, then coffee.", "Saturday group run, then a big brunch."],
  ["hiking", "Go for a Sunday morning hike and talk the whole way.", "Sunday morning group hike with a picnic at the top."],
  ["fishing", "Get up early Saturday and go fishing — coffee in a thermos, no phones.", "Charter a boat for a morning of fishing."],
  ["startups", "Swap founder war stories over lunch this week.", "Monthly founders' dinner — start with this Thursday."],
  ["wine", "Split a bottle at a wine bar Thursday night.", "Wine night — everyone brings a bottle under $20, blind tasting."],
  ["cooking", "Cook-off night: each of you makes one dish, everyone judges.", "Potluck dinner — everyone cooks their signature dish."],
  ["coffee", "Grab coffee one weekday morning before work.", "Weekend coffee crawl — three cafés, one morning."],
  ["Patriots", "Watch the next Patriots game together at a sports bar.", "Watch the next Patriots game together — rotate whose house."],
  ["Celtics", "Catch the next Celtics game together over wings.", "Celtics game night with wings."],
  ["Red Sox", "Grab bleacher seats for a Red Sox game.", "Grab a block of bleacher seats for a Red Sox game."],
  ["pickleball", "Play a couple games of pickleball Saturday morning.", "Pickleball doubles Saturday morning — perfect for 4."],
  ["travel", "Swap travel stories over drinks — and maybe plan a trip.", "Plan a group day trip somewhere none of you have been."],
];

function hangoutFor(shared: string[], stage: string[], group = false) {
  const hit = HANGOUTS.find(([k]) => shared.some((s) => sameThing(s, k)));
  const base = hit ? hit[group ? 2 : 1] : group ? "Grab a big table somewhere fun Friday night and see who clicks." : "Grab a coffee this weekend and see if you click.";
  if (stage.includes("expecting")) return `${base} Bonus: compare baby-prep notes.`;
  return base;
}

function meProfile(me: Me, center: [number, number] | null, search: Search): Profile {
  return {
    name: me.basics.name,
    age: me.basics.age,
    lifeStage: [...new Set([...me.persona.lifeStageTags, ...me.basics.lifeStage])],
    interests: me.persona.interests,
    values: me.persona.values,
    traits: me.persona.traits,
    coords: center,
    town: me.basics.location?.label ?? "",
    visiting: search.mode === "trip",
  };
}

export type Ranked = Match & { person: Townsperson };

export function heuristicMatches(me: Me, people: Townsperson[], search: Search, center: [number, number] | null, city: string): Ranked[] {
  const { basics, goal } = me;
  const mine = meProfile(me, center, search);
  const goalWords = norm(goal).split(" ").filter((w) => w.length > 3);
  const want = basics.friendsWith === "guys" ? "guy" : basics.friendsWith === "girls" ? "girl" : null;

  return people
    .filter((p) => !want || p.gender === want)
    .map((p) => {
      const { score, reasons, shared, stage } = pairScore(mine, fromPerson(p), city);
      const blob = norm([p.occupation, p.bio, ...p.interests, ...p.lifeStageTags].join(" "));
      const bonus = Math.min(12, goalWords.filter((w) => blob.includes(w)).length * 4);
      return {
        id: p.id,
        person: p,
        score: Math.round(Math.min(99, score + bonus)),
        headline: reasons[0] ?? "Could be a fun hang",
        reasons: reasons.slice(0, 4),
        hangout: hangoutFor(shared, stage),
        icebreaker: `Hi ${p.name.split(" ")[0]}! I'm ${basics.name}'s little ${buddy(basics.gender).noun}. ${shared[0] ? `I hear you're into ${shared[0]} too?` : "What do you do for fun?"}`,
      };
    })
    .sort((a, b) => b.score - a.score);
}

const STAGE_WORDS: [string, string][] = [
  ["expecting", "Parents-to-Be"], ["new parent", "New Parents"], ["young kids", "Young Families"], ["founder", "Founders"],
  ["small business owner", "Business Owners"], ["engaged", "Newly Engaged"], ["new to area", "New in Town"], ["single", "Singles"],
];
const INTEREST_WORDS: [string, string][] = [
  ["grilling", "Grill"], ["craft beer", "Brewery"], ["video games", "Game Night"], ["board games", "Board Game"], ["golf", "Golf"],
  ["running", "Run Club"], ["hiking", "Trail"], ["startups", "Builders"], ["wine", "Wine"], ["cooking", "Supper Club"], ["coffee", "Coffee"],
  ["pickleball", "Pickleball"], ["fishing", "Fishing"], ["travel", "Wanderers"],
];

/**
 * Friend groups of 3–4 (you + 2–3 others) where *everyone* gets along, not just with you.
 * Scored by the average of every pair in the group, with the weakest pair weighing extra.
 */
export function heuristicGroups(me: Me, ranked: Ranked[], search: Search, center: [number, number] | null, city: string): Group[] {
  const mine = meProfile(me, center, search);
  const pool = ranked.slice(0, 10).map((r) => ({ id: r.id, prof: fromPerson(r.person) }));
  const pair = new Map<string, number>();
  const key = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  for (let i = 0; i < pool.length; i++) {
    pair.set(key("me", pool[i].id), ranked[i].score);
    for (let j = i + 1; j < pool.length; j++) pair.set(key(pool[i].id, pool[j].id), pairScore(pool[i].prof, pool[j].prof, city).score);
  }

  const combos: { ids: string[]; score: number }[] = [];
  const evalGroup = (ids: string[]) => {
    const all = ["me", ...ids];
    const scores: number[] = [];
    for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) scores.push(pair.get(key(all[i], all[j]))!);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    combos.push({ ids, score: avg * 0.7 + Math.min(...scores) * 0.3 + (ids.length === 3 ? 3 : 0) });
  };
  for (let i = 0; i < pool.length; i++)
    for (let j = i + 1; j < pool.length; j++) {
      evalGroup([pool[i].id, pool[j].id]);
      for (let k = j + 1; k < pool.length; k++) evalGroup([pool[i].id, pool[j].id, pool[k].id]);
    }
  combos.sort((a, b) => b.score - a.score);

  const groups: Group[] = [];
  const used = new Set<string>();
  for (const c of combos) {
    if (groups.length >= 3) break;
    if (c.ids.some((id) => used.has(id))) continue;
    c.ids.forEach((id) => used.add(id));
    const members = c.ids.map((id) => pool.find((p) => p.id === id)!.prof);
    const everyone = [mine, ...members];
    const atLeast = (xs: string[][], min: number) => {
      const counts = new Map<string, number>();
      xs.flat().forEach((x) => counts.set(norm(x), (counts.get(norm(x)) ?? 0) + 1));
      return [...counts.entries()].filter(([, n]) => n >= min).sort((a, b) => b[1] - a[1]).map(([x]) => x);
    };
    // The crew's name only claims a life stage if literally everyone shares it.
    const sharedStage = atLeast(everyone.map((p) => p.lifeStage.map(norm)), everyone.length);
    const sharedInterests = atLeast(everyone.map((p) => p.interests.map(norm)), everyone.length - 1);
    const stageWord = STAGE_WORDS.find(([k]) => sharedStage.includes(k))?.[1];
    const interestWord = INTEREST_WORDS.find(([k]) => sharedInterests.some((s) => sameThing(s, k)))?.[1];
    const name = `The ${[stageWord, interestWord].filter(Boolean).join(" ") || (search.mode === "trip" ? `${city} Explorers` : "Neighborhood")} Crew`;
    const why = [
      ...commonGround(everyone.map((p) => ({ lifeStageTags: p.lifeStage, interests: p.interests }))),
      `${members.map((m) => m.name).join(", ")} get along with each other too`,
    ];
    groups.push({ id: `grp-${c.ids.join("-")}`, memberIds: c.ids, score: Math.round(Math.min(99, c.score)), name, why, hangout: hangoutFor(sharedInterests, sharedStage, true) });
  }
  return groups;
}
