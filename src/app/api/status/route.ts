import { aiEnabled } from "@/lib/ai";
import { currentUserId, unauthorized } from "@/lib/server/session";

export async function GET() {
  if (!(await currentUserId())) return unauthorized();
  return Response.json({ ai: aiEnabled(), maps: Boolean(process.env.GOOGLE_MAPS_API_KEY) });
}
