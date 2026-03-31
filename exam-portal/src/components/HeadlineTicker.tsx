import { getSupabase } from "@/lib/supabase-server";
import HeadlineTickerInner from "./HeadlineTickerInner";

export const revalidate = 600;

export default async function HeadlineTicker() {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("news_articles")
    .select("slug, headline, category")
    .eq("is_published", true)
    .order("published_at", { ascending: false })
    .limit(12);

  if (!data?.length) return null;

  return <HeadlineTickerInner headlines={data} />;
}
