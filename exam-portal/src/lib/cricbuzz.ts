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

// Fill these after Phase 2 (Discovery) — visit /api/ipl/discover, copy IDs, then delete that route
export const IPL_SERIES_ID = 9237; // IPL 2025 — update if needed

export const IPL_TEAM_IDS: Record<string, number> = {
  MI: 5,
  CSK: 2,
  RCB: 4,
  KKR: 3,
  SRH: 255,
  DC: 6,
  PBKS: 7,
  RR: 8,
  LSG: 6904,
  GT: 6903,
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
