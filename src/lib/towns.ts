// Rough town centers for Greater Boston. Good enough for "is this person nearby?".
export const TOWNS: Record<string, [number, number]> = {
  Boston: [42.3601, -71.0589],
  Cambridge: [42.3736, -71.1097],
  Somerville: [42.3876, -71.0995],
  Medford: [42.4184, -71.1062],
  Malden: [42.4251, -71.0662],
  Melrose: [42.4584, -71.0662],
  Stoneham: [42.4801, -71.0995],
  Wakefield: [42.5065, -71.0723],
  Reading: [42.5257, -71.0953],
  Woburn: [42.4793, -71.1523],
  Winchester: [42.4523, -71.1370],
  Lynnfield: [42.5387, -71.0484],
  Saugus: [42.4646, -71.0101],
  Lynn: [42.4668, -70.9495],
  Swampscott: [42.4709, -70.9176],
  Marblehead: [42.5001, -70.8578],
  Salem: [42.5195, -70.8967],
  Peabody: [42.5279, -70.9287],
  Danvers: [42.575, -70.9301],
  Beverly: [42.5584, -70.8800],
  "North Reading": [42.5751, -71.0787],
  Andover: [42.6583, -71.1368],
  Burlington: [42.5048, -71.1956],
  Lexington: [42.4430, -71.2290],
  Arlington: [42.4154, -71.1565],
  Newton: [42.3370, -71.2092],
  Brookline: [42.3318, -71.1212],
  Quincy: [42.2529, -71.0023],
  Waltham: [42.3765, -71.2356],
  Newburyport: [42.8126, -70.8773],
  Ipswich: [42.6792, -70.8412],
  Worcester: [42.2626, -71.8023],
  Providence: [41.824, -71.4128],
  // Popular trips (so travel works without a Maps key)
  "New York": [40.7128, -74.006],
  Austin: [30.2672, -97.7431],
  Nashville: [36.1627, -86.7816],
  Chicago: [41.8781, -87.6298],
  Miami: [25.7617, -80.1918],
  Denver: [39.7392, -104.9903],
  Seattle: [47.6062, -122.3321],
  "San Francisco": [37.7749, -122.4194],
  "Los Angeles": [34.0522, -118.2437],
  "San Diego": [32.7157, -117.1611],
  Portland: [45.5152, -122.6784],
  "Washington, DC": [38.9072, -77.0369],
  Philadelphia: [39.9526, -75.1652],
  Charleston: [32.7765, -79.9311],
  "New Orleans": [29.9511, -90.0715],
  Scottsdale: [33.4942, -111.9261],
  "Portland, ME": [43.6591, -70.2568],
  "Burlington, VT": [44.4759, -73.2121],
  London: [51.5072, -0.1276],
  Paris: [48.8566, 2.3522],
  Lisbon: [38.7223, -9.1393],
  Barcelona: [41.3874, 2.1686],
  Toronto: [43.6532, -79.3832],
  "Mexico City": [19.4326, -99.1332],
};

export const TOWN_NAMES = Object.keys(TOWNS);

export function townCoords(town: string): [number, number] | null {
  const t = town.trim().toLowerCase();
  const key =
    Object.keys(TOWNS).find((k) => k.toLowerCase() === t) ??
    Object.keys(TOWNS).find((k) => k.toLowerCase() === t.replace(/,.*$/, ""));
  return key ? TOWNS[key] : null;
}

/** Best-effort coordinates for a place: its own lat/lng, else our town table. */
export function placeCoords(p?: { label: string; lat?: number; lng?: number }): [number, number] | null {
  if (!p) return null;
  if (p.lat !== undefined && p.lng !== undefined) return [p.lat, p.lng];
  return townCoords(p.label);
}

export function nearestTown(lat: number, lng: number): { name: string; miles: number } {
  let best = { name: "", miles: Infinity };
  for (const k of Object.keys(TOWNS)) {
    const m = milesBetweenCoords([lat, lng], TOWNS[k]);
    if (m < best.miles) best = { name: k, miles: m };
  }
  return best;
}

/** Miles between two towns, or null if we don't know one of them. */
export function milesBetween(a: string, b: string): number | null {
  const p = townCoords(a),
    q = townCoords(b);
  if (!p || !q) return null;
  return milesBetweenCoords(p, q);
}

export function milesBetweenCoords(p: [number, number], q: [number, number]): number {
  const R = 3959,
    rad = Math.PI / 180;
  const dLat = (q[0] - p[0]) * rad,
    dLng = (q[1] - p[1]) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(p[0] * rad) * Math.cos(q[0] * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
