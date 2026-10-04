import { Answers, QUIZ, stripEmoji, TraitKey } from "./quiz";
import type { Basics, Persona } from "./types";

/** No-LLM fallback: turn quiz answers into a persona with simple rules. */
export function heuristicPersona(basics: Basics, answers: Answers, transcript: string): Persona {
  const sums: Record<TraitKey, number[]> = { openness: [], conscientiousness: [], extraversion: [], agreeableness: [], ambition: [] };
  for (const q of QUIZ) {
    if (q.kind === "scale" && typeof answers[q.id] === "number") sums[q.trait].push(answers[q.id] as number);
  }
  const trait = (k: TraitKey) => {
    const v = sums[k];
    return v.length ? Math.round(((v.reduce((a, b) => a + b, 0) / v.length - 1) / 4) * 100) : 50;
  };
  const traits = {
    openness: trait("openness"),
    conscientiousness: trait("conscientiousness"),
    extraversion: trait("extraversion"),
    agreeableness: trait("agreeableness"),
    ambition: trait("ambition"),
  };

  const list = (id: string) => (Array.isArray(answers[id]) ? (answers[id] as string[]) : []);
  let interests = [...list("interests").map(stripEmoji), ...list("teams").filter((t) => !t.startsWith("Not"))];
  if (!interests.length && transcript) {
    // crude keyword sniffing for talk mode without an LLM
    const t = transcript.toLowerCase();
    interests = ["video games", "grilling", "craft beer", "golf", "running", "hiking", "startups", "cooking", "fishing", "board games", "coffee", "wine"]
      .filter((k) => t.includes(k.split(" ").pop()!));
  }
  const values = list("values");

  const adj = traits.ambition > 70 ? "Ambitious" : traits.extraversion > 65 ? "Social" : traits.openness > 65 ? "Curious" : "Steady";
  const noun = basics.lifeStage.includes("expecting")
    ? "Parent-to-Be"
    : basics.lifeStage.some((s) => ["new parent", "young kids"].includes(s))
      ? "Young Parent"
      : basics.lifeStage.includes("founder")
        ? "Builder"
        : interests.includes("grilling")
          ? "Grill Master"
          : "Explorer";

  const now = (answers.now as string) || transcript.slice(0, 200);
  return {
    archetype: `The ${adj} ${noun}`,
    summary: `${basics.name} is ${basics.age}, based in ${basics.location?.label ?? "town"}${basics.lifeStage.length ? ` (${basics.lifeStage.join(", ")})` : ""}. ${now ? `Right now: ${now.trim()}` : ""}`.trim(),
    traits,
    lifeStageTags: basics.lifeStage,
    interests: interests.slice(0, 10),
    values,
    socialStyle: [answers.group, answers.often].filter(Boolean).join(", ") || "Flexible",
    idealFriend: (answers.ideal as string) || list("want").join(", ") || "Someone in a similar season of life.",
  };
}
