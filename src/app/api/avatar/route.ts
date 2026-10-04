import { generateText, Output } from "ai";
import { z } from "zod";
import { aiEnabled, MODEL } from "@/lib/ai";
import { currentUserId, tooMany, unauthorized, withinLimit } from "@/lib/server/session";
import { EYE_COLORS, HAIR_COLORS, HAIR_STYLES, SKIN_TONES } from "@/lib/types";

const keys = <T extends object>(o: T) => Object.keys(o) as [keyof T & string, ...(keyof T & string)[]];

const schema = z.object({
  skin: z.enum(keys(SKIN_TONES)),
  hair: z.enum(keys(HAIR_COLORS)),
  hairStyle: z.enum(HAIR_STYLES),
  eyes: z.enum(keys(EYE_COLORS)),
  glasses: z.boolean(),
});

export async function POST(req: Request) {
  const userId = await currentUserId();
  if (!userId) return unauthorized();
  if (!aiEnabled()) return Response.json({ error: "AI not configured" }, { status: 503 });
  const { image } = (await req.json().catch(() => ({}))) as { image?: unknown };
  const [, mediaType = "image/jpeg", data] = (typeof image === "string" && image.length < 4_000_000 && image.match(/^data:(image\/[\w.+-]+);base64,(.*)$/)) || [];
  if (!data) return Response.json({ error: "Expected an image data URL" }, { status: 400 });
  if (!(await withinLimit(userId, "ai"))) return tooMany();

  const { output } = await generateText({
    model: MODEL,
    output: Output.object({ schema }),
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "We're turning this selfie into a very simple toy-figure avatar. Pick the closest option for each feature: skin tone, hair color, hair style (\"bald\" if none visible), eye color (best guess if unclear), and whether they wear glasses.",
          },
          { type: "file", mediaType, data },
        ],
      },
    ],
  });
  return Response.json(output);
}
