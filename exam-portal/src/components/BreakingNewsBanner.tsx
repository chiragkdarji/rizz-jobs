import Link from "next/link";
import { getSupabase } from "@/lib/supabase-server";

export default async function BreakingNewsBanner() {
  try {
    const supabase = getSupabase();
    const { data } = await supabase
      .from("news_articles")
      .select("slug, headline")
      .eq("is_published", true)
      .eq("is_breaking", true)
      .order("published_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!data) return null;

    return (
      <div
        className="border-b"
        style={{ backgroundColor: "#f43f5e", borderColor: "#c43050" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex items-center gap-4 overflow-hidden">
          <span
            className="text-[10px] font-black uppercase tracking-[0.22em] shrink-0 text-white"
            style={{ letterSpacing: "0.18em" }}
          >
            Breaking
          </span>
          <div style={{ width: "1px", height: "14px", backgroundColor: "rgba(255,255,255,0.3)" }} />
          <Link
            href={`/news/${data.slug}`}
            className="text-[12px] font-bold text-white truncate hover:underline"
          >
            {data.headline}
          </Link>
        </div>
      </div>
    );
  } catch {
    // Column may not exist yet — fail silently
    return null;
  }
}
