import { ExternalLink } from "lucide-react";

interface ResolveUrlProps {
  title: string;
  link: string;
  source?: string;
}

export function ResolveUrl({ title, link }: ResolveUrlProps) {
  const href = link?.startsWith("http")
    ? link
    : `https://www.google.com/search?q=${encodeURIComponent(title + " official notification")}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-center gap-2 w-full py-4 bg-white text-indigo-900 rounded-2xl font-black uppercase tracking-widest hover:scale-[1.03] active:scale-95 transition-all shadow-xl"
    >
      Official Website
      <ExternalLink className="w-4 h-4" />
    </a>
  );
}
