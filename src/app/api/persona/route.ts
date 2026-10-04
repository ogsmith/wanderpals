import { generateText, Output } from "ai";
import { z } from "zod";
import { aiEnabled, MODEL } from "@/lib/ai";
import { currentUserId, unauthorized, withinLimit } from "@/lib/server/session";
import { heuristicPersona } from "@/lib/persona";
import { QUIZ, type Answers } from "@/lib/quiz";
import type { Basics } from "@/lib/types";

const pct = z.number().min(0).max(100);
const schema = z.object({
  archetype: z
    .string()
    .describe(
      'A fun, warm 3-6 word title, e.g. "The Grill-Master Founder Dad-to-Be"',
    ),
  summary: z
    .string()
    .describe(
      '2-3 sentences in second person ("You\'re…") that make them feel seen',
    ),
  traits: z.object({
    openness: pct,
    conscientiousness: pct,
    extraversion: pct,
    agreeableness: pct,
    ambition: pct,
  }),
  lifeStageTags: z
    .array(z.string())
    .describe(
      "Short lowercase tags: e.g. married, expecting, new parent, young kids, founder, corporate",
    ),
  interests: z
    .array(z.string())
    .describe(
      "Up to 10 short lowercase hobbies/interests; include sports teams by name",
    ),
  values: z.array(z.string()).describe("Up to 4 single-word values"),
  socialStyle: z.string().describe("One sentence on how they like to hang out"),
  idealFriend: z
    .string()
    .describe("One sentence describing the friend they'd click with"),
});

export async function POST(req: Request) {
  const userId = await currentUserId();
  if (!userId) return unauthorized();
  const {
    basics,
    answers = {},
    transcript = "",
  } = (await req.json()) as {
    basics: Basics;
    answers?: Answers;
    transcript?: string;
  };
  if (!basics?.name) return Response.json({ error: "Missing basics" }, { status: 400 });
  if (!aiEnabled() || !(await withinLimit(userId, "ai")))
    return Response.json({
      persona: heuristicPersona(basics, answers, transcript),
      ai: false,
    });

  const qa = QUIZ.filter(
    (q) => answers[q.id] !== undefined && answers[q.id] !== "",
  )
    .map((q) => {
      const a = answers[q.id];
      const shown =
        q.kind === "scale"
          ? `${a}/5 (1 = "${q.low}", 5 = "${q.high}")`
          : Array.isArray(a)
            ? a.join(", ")
            : a;
      return `Q: ${q.prompt}\nA: ${shown}`;
    })
    .join("\n\n");

  try {
    const { output } = await generateText({
      model: MODEL,
      output: Output.object({ schema }),
      system:
        "You build friendship-matching profiles. Read everything the person shared and infer their personality, life stage, interests and values as precisely as you can. Be warm and specific, never generic. Base everything on evidence in their answers.",
      prompt: `Basics: ${basics.name}, age ${basics.age}, lives in ${basics.location?.label ?? "an unspecified town"}. Self-described life stage: ${basics.lifeStage.join(", ") || "not given"}.

${qa ? `Quiz answers:\n${qa}` : ""}
${transcript ? `\nWhat they said out loud (speech transcript):\n"""${transcript}"""` : ""}`,
    });
    return Response.json({ persona: output, ai: true });
  } catch (e) {
    console.error("persona LLM failed, using heuristic", e);
    return Response.json({
      persona: heuristicPersona(basics, answers, transcript),
      ai: false,
    });
  }
}
