/** What a set of people actually have in common — recomputed from the real people every time, so it never goes stale. */

type Someone = { lifeStageTags: string[]; interests: string[] };

const norm = (s: string) => s.toLowerCase().replace(/[^a-z ]/g, "").trim();

/** [said of everyone: "Everyone's …" / "You're both …", said of some: "2 of 4 of you are …"] */
const STAGE_PHRASES: Record<string, [string, string]> = {
  married: ["married", "married"],
  expecting: ["expecting", "expecting"],
  "new parent": ["a new parent", "new parents"],
  "young kids": ["raising little ones", "raising little ones"],
  founder: ["building a company", "founders"],
  "small business owner": ["running a business", "business owners"],
  engaged: ["engaged", "engaged"],
  single: ["single", "single"],
  "new to area": ["new in town", "new in town"],
  "remote worker": ["working remotely", "remote workers"],
};

function counts(lists: string[][]) {
  const c = new Map<string, number>();
  for (const list of lists) for (const x of new Set(list.map(norm))) if (x) c.set(x, (c.get(x) ?? 0) + 1);
  return [...c.entries()].sort((a, b) => b[1] - a[1]);
}

/**
 * Up to `max` short lines like "Everyone's expecting", "All 3 of you are into craft beer", "2 of 4 love golf".
 * "Everyone"/"All" only when it's literally everyone; otherwise an honest count (and only if it's at least 2 people).
 */
export function commonGround(people: Someone[], max = 3): string[] {
  const n = people.length;
  if (n < 2) return [];
  const out: string[] = [];

  for (const [stage, k] of counts(people.map((p) => p.lifeStageTags))) {
    const phrase = STAGE_PHRASES[stage];
    if (!phrase || k < 2) continue;
    const [allOf, someOf] = phrase;
    out.push(k === n ? (n === 2 ? `You're both ${someOf}` : `Everyone's ${allOf}`) : `${k} of ${n} of you are ${someOf}`);
    if (out.length >= 2) break;
  }

  const interests = counts(people.map((p) => p.interests)).filter(([, k]) => k >= 2);
  const shared = interests.filter(([, k]) => k === n).map(([x]) => x);
  if (shared.length) out.push(`${n === 2 ? "You're both" : `All ${n} of you are`} into ${shared.slice(0, 3).join(", ")}`);
  else if (interests[0]) out.push(`${interests[0][1]} of ${n} of you love ${interests[0][0]}`);

  return out.slice(0, max);
}
