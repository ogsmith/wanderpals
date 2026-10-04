import { nearestTown, TOWN_NAMES, TOWNS } from "@/lib/towns";
import { currentUserId, tooMany, unauthorized, withinLimit } from "@/lib/server/session";
import type { Place } from "@/lib/types";

// City search + "use my location". Uses Google Maps when GOOGLE_MAPS_API_KEY is set,
// otherwise falls back to our built-in list of towns. The key never leaves the server.
const KEY = process.env.GOOGLE_MAPS_API_KEY;

type Suggestion = { id: string; label: string; secondary?: string };

export async function GET(req: Request) {
  const userId = await currentUserId();
  if (!userId) return unauthorized();
  const url = new URL(req.url);
  const op = url.searchParams.get("op");
  if (KEY && op !== "details" && !(await withinLimit(userId, "places"))) return tooMany();
  try {
    if (op === "autocomplete") return Response.json(await autocomplete(url.searchParams.get("q") ?? ""));
    if (op === "details") return Response.json(await details(url.searchParams.get("id") ?? ""));
    if (op === "reverse") {
      const lat = parseFloat(url.searchParams.get("lat") ?? ""),
        lng = parseFloat(url.searchParams.get("lng") ?? "");
      if (!(Math.abs(lat) <= 90 && Math.abs(lng) <= 180)) return Response.json({ error: "lat/lng required" }, { status: 400 });
      return Response.json(await reverse(lat, lng));
    }
    return Response.json({ error: "unknown op" }, { status: 400 });
  } catch (e) {
    console.error("places failed", e);
    return Response.json({ error: "Location lookup failed" }, { status: 502 });
  }
}

async function autocomplete(q: string): Promise<{ suggestions: Suggestion[]; google: boolean }> {
  q = q.slice(0, 100);
  if (!q.trim()) return { suggestions: [], google: !!KEY };
  if (!KEY) {
    const t = q.toLowerCase();
    const hits = TOWN_NAMES.filter((n) => n.toLowerCase().startsWith(t)).concat(TOWN_NAMES.filter((n) => !n.toLowerCase().startsWith(t) && n.toLowerCase().includes(t)));
    return { suggestions: hits.slice(0, 6).map((n) => ({ id: `local:${n}`, label: n })), google: false };
  }
  const res = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
    method: "POST",
    headers: { "content-type": "application/json", "X-Goog-Api-Key": KEY },
    body: JSON.stringify({ input: q, includedPrimaryTypes: ["(cities)"] }),
  });
  if (!res.ok) throw new Error(`autocomplete ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as {
    suggestions?: { placePrediction?: { placeId: string; structuredFormat?: { mainText?: { text: string }; secondaryText?: { text: string } }; text?: { text: string } } }[];
  };
  const suggestions = (data.suggestions ?? [])
    .map((s) => s.placePrediction)
    .filter((p): p is NonNullable<typeof p> => !!p)
    .map((p) => ({
      id: p.placeId,
      label: p.structuredFormat?.mainText?.text ?? p.text?.text ?? "",
      secondary: p.structuredFormat?.secondaryText?.text,
    }));
  return { suggestions, google: true };
}

async function details(id: string): Promise<Place> {
  if (id.startsWith("local:")) {
    const name = id.slice(6);
    const c = TOWNS[name];
    return { label: name, lat: c?.[0], lng: c?.[1] };
  }
  if (!KEY) throw new Error("no key");
  const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(id)}`, {
    headers: { "X-Goog-Api-Key": KEY, "X-Goog-FieldMask": "displayName,location,shortFormattedAddress" },
  });
  if (!res.ok) throw new Error(`details ${res.status}: ${await res.text()}`);
  const p = (await res.json()) as { displayName?: { text: string }; location?: { latitude: number; longitude: number } };
  return { label: p.displayName?.text ?? "", lat: p.location?.latitude, lng: p.location?.longitude };
}

async function reverse(lat: number, lng: number): Promise<Place> {
  if (KEY) {
    const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&result_type=locality&key=${KEY}`);
    const data = (await res.json()) as { status: string; results?: { address_components: { long_name: string; types: string[] }[] }[] };
    const town = data.results?.[0]?.address_components.find((c) => c.types.includes("locality"))?.long_name;
    if (town) return { label: town, lat, lng };
    if (data.status !== "ZERO_RESULTS") console.error("reverse geocode:", data.status);
  }
  // Fallback: snap to the closest town we know about.
  const near = nearestTown(lat, lng);
  return { label: near.miles < 15 ? near.name : `Near ${near.name}`, lat, lng };
}
