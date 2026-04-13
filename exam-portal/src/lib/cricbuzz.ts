export const CB_BASE = "https://cricbuzz-cricket.p.rapidapi.com";

export const cbHeaders = () => ({
  "X-RapidAPI-Key": process.env.CRICBUZZ_KEY!,
  "X-RapidAPI-Host": "cricbuzz-cricket.p.rapidapi.com",
});

/** Server-side fetch with ISR caching */
export function cbFetch(endpoint: string, revalidate: number) {
  return fetch(`${CB_BASE}/${endpoint}`, {
    headers: cbHeaders(),
    next: { revalidate },
  });
}

/**
 * Fetch from Cricbuzz with exponential backoff on 429 (rate limit).
 * Retries up to 3 times: immediately, after 1s, after 3s.
 * Pass `opts` for any fetch options (cache, next, etc).
 */
export async function cbFetchWithRetry(
  url: string,
  opts: RequestInit = {}
): Promise<Response> {
  const delays = [0, 1000, 3000];
  let lastRes: Response | null = null;
  for (const delay of delays) {
    if (delay) await new Promise((r) => setTimeout(r, delay));
    lastRes = await fetch(url, { headers: cbHeaders(), ...opts });
    if (lastRes.status !== 429) return lastRes;
  }
  // Return the last 429 response so callers can handle it
  return lastRes!;
}

export const IPL_SERIES_ID = 9241; // Indian Premier League 2026

/** Cache TTLs in milliseconds */
export const CACHE_TTL = {
  live: 30_000,
  matches: 300_000,
  rankings: 3_600_000,
  records: 86_400_000,
  news: 900_000,
  schedule: 3_600_000,
} as const;

/**
 * Read from Supabase cricket_cache.
 * Returns null if missing or older than ttlMs.
 */
export async function getCached<T>(key: string, ttlMs: number): Promise<T | null> {
  try {
    const { createServiceRoleClient } = await import("@/lib/supabase-server");
    const supabase = createServiceRoleClient();
    const { data } = await supabase
      .from("cricket_cache")
      .select("data, updated_at")
      .eq("key", key)
      .single();
    if (!data) return null;
    if (Date.now() - new Date(data.updated_at as string).getTime() > ttlMs) return null;
    return data.data as T;
  } catch {
    return null;
  }
}

/**
 * Write to Supabase cricket_cache (upsert).
 * Fire-and-forget — never throws.
 */
export async function setCached(key: string, value: unknown): Promise<void> {
  try {
    const { createServiceRoleClient } = await import("@/lib/supabase-server");
    const supabase = createServiceRoleClient();
    await supabase.from("cricket_cache").upsert(
      { key, data: value, updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );
  } catch {
    // non-blocking, ignore failures
  }
}

/** Maps teamId → squadId for IPL 2026 (from /series/v1/9241/squads) */
export const IPL_TEAM_TO_SQUAD_ID: Record<number, number> = {
  58: 99705,  // CSK
  61: 99716,  // DC
  971: 99727, // GT
  59: 99738,  // RCB
  65: 99749,  // PBKS
  63: 99760,  // KKR
  255: 99771, // SRH
  64: 99782,  // RR
  966: 99793, // LSG
  62: 99804,  // MI
};

export const IPL_TEAM_IDS: Record<string, number> = {
  MI: 62,
  CSK: 58,
  RCB: 59,
  KKR: 63,
  SRH: 255,
  DC: 61,
  PBKS: 65,
  RR: 64,
  LSG: 966,
  GT: 971,
};

export const IPL_TEAMS: Record<
  string,
  { bg: string; color: string; fullName: string; slug: string; id: number }
> = {
  MI: {
    bg: "#004BA0",
    color: "#FFFFFF",
    fullName: "Mumbai Indians",
    slug: "mumbai-indians",
    id: IPL_TEAM_IDS.MI,
  },
  CSK: {
    bg: "#FFFF00",
    color: "#0A1F3D",
    fullName: "Chennai Super Kings",
    slug: "chennai-super-kings",
    id: IPL_TEAM_IDS.CSK,
  },
  RCB: {
    bg: "#CC0000",
    color: "#FFFFFF",
    fullName: "Royal Challengers Bengaluru",
    slug: "royal-challengers-bengaluru",
    id: IPL_TEAM_IDS.RCB,
  },
  KKR: {
    bg: "#3A225D",
    color: "#B5922E",
    fullName: "Kolkata Knight Riders",
    slug: "kolkata-knight-riders",
    id: IPL_TEAM_IDS.KKR,
  },
  SRH: {
    bg: "#F26522",
    color: "#FFFFFF",
    fullName: "Sunrisers Hyderabad",
    slug: "sunrisers-hyderabad",
    id: IPL_TEAM_IDS.SRH,
  },
  DC: {
    bg: "#0078BC",
    color: "#EF1C25",
    fullName: "Delhi Capitals",
    slug: "delhi-capitals",
    id: IPL_TEAM_IDS.DC,
  },
  PBKS: {
    bg: "#ED1B24",
    color: "#FFFFFF",
    fullName: "Punjab Kings",
    slug: "punjab-kings",
    id: IPL_TEAM_IDS.PBKS,
  },
  RR: {
    bg: "#EA1A85",
    color: "#FFFFFF",
    fullName: "Rajasthan Royals",
    slug: "rajasthan-royals",
    id: IPL_TEAM_IDS.RR,
  },
  LSG: {
    bg: "#A4C8E1",
    color: "#003087",
    fullName: "Lucknow Super Giants",
    slug: "lucknow-super-giants",
    id: IPL_TEAM_IDS.LSG,
  },
  GT: {
    bg: "#1C3A6B",
    color: "#D4AF37",
    fullName: "Gujarat Titans",
    slug: "gujarat-titans",
    id: IPL_TEAM_IDS.GT,
  },
};

/** Lookup team metadata by Cricbuzz teamId */
export function getTeamByIdNum(id: number) {
  return Object.values(IPL_TEAMS).find((t) => t.id === id) ?? null;
}

/**
 * Returns the official IPL team logo URL from the IPL T20 scoring CDN.
 * Direct access works in browsers (no proxy needed).
 * Use with next/image unoptimized={true} or a plain <img> tag.
 */
export function getTeamLogoUrl(abbr: string): string {
  return `https://scores.iplt20.com/ipl/teamlogos/${abbr}.png`;
}
