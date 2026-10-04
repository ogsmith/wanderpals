import { generateText, Output } from "ai";
import { z } from "zod";
import { aiEnabled, MODEL } from "@/lib/ai";
import { heuristicGroups, heuristicMatches } from "@/lib/match";
import { peopleFor } from "@/lib/server/people";
import { currentUserId, unauthorized, withinLimit } from "@/lib/server/session";
import { placeCoords } from "@/lib/towns";
import type { Group, Me, Search } from "@/lib/types";

const schema = z.object({
  matches: z.array(
    z.object({
      id: z.string(),
      score: z.number().min(0).max(100),
      headline: z.string().describe("Max ~8 words, why this is a match"),
      reasons: z.array(z.string()).describe("2-4 short concrete reasons"),
      hangout: z.string().describe("One casual, specific suggestion for a first hang based on what they share, e.g. 'You both like beer — grab a few pints at a brewery this Friday.'"),
      icebreaker: z.string().describe("What the user's little avatar said when it bumped into them, first person, playful, 1-2 sentences"),
    }),
  ),
  groups: z.array(
    z.object({
      id: z.string(),
      name: z.string().describe('Fun crew name, e.g. "The North Shore Grill Dads"'),
      why: z.array(z.string()).describe("2-3 short reasons this group works as a whole"),
      hangout: z.string().describe("One group hang idea for 3-4 people"),
    }),
  ),
});

export async function POST(req: Request) {
  const userId = await currentUserId();
  if (!userId) return unauthorized();
  const { me, search } = (await req.json()) as { me: Me; search: Search };
  if (!me?.persona || !me.basics || !search) return Response.json({ error: "Finish your profile first" }, { status: 400 });

  const place = search.mode === "trip" ? search.destination : me.basics.location;
  const center = placeCoords(place);
  const city = place?.label?.split(",")[0] || "town";
  const people = await peopleFor(userId, search, center);

  const ranked = heuristicMatches(me, people, search, center, city);
  const groups = heuristicGroups(me, ranked, search, center, city);
  const fallback = ranked.slice(0, 6).map(({ person, ...m }) => ({ ...m, id: person.id }));
  // Everyone on screen: matches, group members, plus a crowd of whoever else is around.
  const shown = new Set([...fallback.map((m) => m.id), ...groups.flatMap((g) => g.memberIds), ...people.slice(0, 24).map((p) => p.id)]);
  const crowd = people.filter((p) => shown.has(p.id));
  if (!ranked.length || !aiEnabled() || !(await withinLimit(userId, "ai"))) return Response.json({ matches: fallback, groups, people: crowd, ai: false });

  // Pre-filter with the cheap scorer, let the LLM do the nuanced final ranking + group copy.
  const candidates = ranked.slice(0, 12).map(({ person: p, score }) => ({
    id: p.id, name: p.name, age: p.age, town: p.town, occupation: p.occupation, bio: p.bio, visiting: p.visiting,
    lifeStage: p.lifeStageTags, interests: p.interests, values: p.values, roughScore: score,
  }));
  const where =
    search.mode === "trip"
      ? `I'm TRAVELING to ${city}. I want to meet ${search.who === "locals" ? "locals" : search.who === "visitors" ? "other people visiting" : "locals and other visitors"}.`
      : `I'm at home in ${city}. I want ${search.who === "locals" ? "long-term local friends" : search.who === "visitors" ? "people visiting my area" : "locals and visitors"}.`;

  try {
    const { output } = await generateText({
      model: MODEL,
      output: Output.object({ schema }),
      system:
        "You are a friend-matchmaker. Pick the 6 people this person would most likely become real friends with. Weigh, in order: same life stage (e.g. both expecting a first child, both founders), similar age, being nearby / in town at the same time, shared interests, compatible personality. Honor their stated goal. Write reasons that are concrete and reference real details. Also write a name, reasons and a hang idea for each proposed friend group (keep the same group ids).",
      prompt: `ME:\n${JSON.stringify({ ...me.basics, contact: undefined, location: place?.label, persona: me.persona })}\n\nWHERE: ${where}\nMY GOAL: ${me.goal || "Just find me good friends."}\n\nCANDIDATES:\n${JSON.stringify(candidates)}\n\nPROPOSED GROUPS (me + these people):\n${JSON.stringify(groups.map((g) => ({ id: g.id, members: g.memberIds.map((id) => ranked.find((r) => r.id === id)?.person.name) })))}`,
    });
    // Only people we actually offered, each at most once (the model can repeat itself).
    const seen = new Set<string>();
    const valid = output.matches.filter((m) => candidates.some((c) => c.id === m.id) && !seen.has(m.id) && seen.add(m.id));
    const polished: Group[] = groups.map((g) => ({ ...g, ...output.groups.find((x) => x.id === g.id), id: g.id }));
    const final = valid.length ? valid : fallback;
    const extra = people.filter((p) => final.some((m) => m.id === p.id) && !shown.has(p.id));
    return Response.json({ matches: final, groups: polished, people: [...crowd, ...extra], ai: true });
  } catch (e) {
    console.error("match LLM failed, using heuristic", e);
    return Response.json({ matches: fallback, groups, people: crowd, ai: false });
  }
}
