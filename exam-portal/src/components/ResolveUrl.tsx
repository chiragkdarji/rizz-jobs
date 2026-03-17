import { ExternalLink } from "lucide-react";

interface ResolveUrlProps {
  title: string;
  link: string;
  source?: string;
}

// Aggregator/job-board domains — not official government portals.
// If the stored link points to any of these, fall back to Google search.
const AGGREGATOR_DOMAINS = [
  "sarkariresult", "sarkari", "freejobalert", "jagranjosh",
  "testbook", "rojgarresult", "naukri.com", "monsterindia",
  "indgovtjobs", "sarkarijobfind", "jobriya", "govtjobpedia",
  "employment-news", "employmentnews", "currentaffairs",
];

function isAggregatorUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return AGGREGATOR_DOMAINS.some((d) => lower.includes(d));
}

export function ResolveUrl({ title, link }: ResolveUrlProps) {
  const isValidOfficialLink =
    link?.startsWith("http") && !isAggregatorUrl(link);

  const href = isValidOfficialLink
    ? link
    : `https://www.google.com/search?q=${encodeURIComponent(title + " official notification apply online 2026")}`;

  return (
    <div className="space-y-3">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 w-full py-4 bg-white text-indigo-900 rounded-2xl font-black uppercase tracking-widest hover:scale-[1.03] active:scale-95 transition-all shadow-xl"
      >
        {isValidOfficialLink ? "Official Website" : "Search on Google"}
        <ExternalLink className="w-4 h-4" />
      </a>
      {isValidOfficialLink && (
        <a
          href={`https://www.google.com/search?q=${encodeURIComponent(title + " official notification apply online 2026")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-2 text-xs text-indigo-200/60 hover:text-white transition-colors"
        >
          Can&apos;t open the link? Search on Google
        </a>
      )}
    </div>
  );
}
