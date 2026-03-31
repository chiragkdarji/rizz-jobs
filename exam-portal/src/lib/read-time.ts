/** Estimate read time in minutes from full article content (200 wpm). */
export function estimateReadTime(content: string): number {
  return Math.max(1, Math.ceil(content.split(/\s+/).length / 200));
}

/** Estimate read time from a short summary (~2 min minimum since full article is longer). */
export function estimateReadTimeFromSummary(summary: string): number {
  const fromSummary = Math.ceil(summary.split(/\s+/).length / 200);
  return Math.max(2, fromSummary + 1); // add 1 min buffer for full article
}
