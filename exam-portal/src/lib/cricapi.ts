/**
 * CricAPI v1 shared utilities
 * Docs: https://cricapi.com/how-to-use/
 *
 * Free tier: 100 requests/day
 * We use Next.js Data Cache (next: { revalidate }) to minimise upstream calls.
 * All requests go through server-side API routes — the API key is NEVER exposed to clients.
 */

export const CRICAPI_BASE = "https://api.cricapi.com/v1";

/**
 * Known IPL team name fragments (lowercase) for match filtering.
 * `currentMatches` returns full team names in `teams[]` but no `teamInfo`.
 */
export const IPL_TEAM_KEYWORDS = [
  "mumbai indians",
  "chennai super kings",
  "royal challengers",
  "kolkata knight riders",
  "sunrisers hyderabad",
  "delhi capitals",
  "punjab kings",
  "rajasthan royals",
  "lucknow super giants",
  "gujarat titans",
];

/** IPL team metadata for UI colouring */
export const IPL_TEAMS: Record<string, { color: string; bg: string }> = {
  MI:   { color: "#ffffff", bg: "#003E7E" },
  CSK:  { color: "#000000", bg: "#F9CD05" },
  RCB:  { color: "#ffffff", bg: "#CC0000" },
  RCBW: { color: "#ffffff", bg: "#CC0000" }, // CricAPI uses RCBW for Royal Challengers Bengaluru
  KKR:  { color: "#F9CD05", bg: "#3A225D" },
  SRH:  { color: "#ffffff", bg: "#F26522" },
  DC:   { color: "#ffffff", bg: "#0078BC" },
  PBKS: { color: "#ffffff", bg: "#AA0000" },
  RR:   { color: "#ffffff", bg: "#E4045B" },
  LSG:  { color: "#ffffff", bg: "#A72056" },
  GT:   { color: "#ffffff", bg: "#1B2133" },
};

/** Find the current-year IPL series ID from CricAPI.
 *  Uses Next.js data cache (12h) — costs 1–3 API calls total per deploy. */
export async function findIplSeriesId(apiKey: string): Promise<string | null> {
  const year = new Date().getFullYear().toString();

  for (let offset = 0; offset <= 75; offset += 25) {
    const res = await fetch(
      `${CRICAPI_BASE}/series?apikey=${apiKey}&offset=${offset}`,
      { next: { revalidate: 43200 } } // 12 hours
    );
    if (!res.ok) break;
    const json = await res.json();
    if (json.status !== "success") break;

    const series: Array<{ id: string; name: string; startDate: string }> =
      json.data ?? [];

    const ipl = series.find((s) => {
      const name = s.name.toLowerCase();
      // CricAPI uses startDate (camelCase) in series list but startdate (lowercase) in series_info
      const startDate: string = (s as Record<string, string>).startDate ?? (s as Record<string, string>).startdate ?? "";
      return (
        (name.includes("indian premier league") || (name.includes("ipl") && name.length < 20)) &&
        startDate.startsWith(year)
      );
    });

    if (ipl) return ipl.id;
    if (series.length < 25) break; // last page
  }
  return null;
}
