import { getSupabase } from "@/lib/supabase-server";

export const revalidate = 3600;

export async function GET() {
  const supabase = getSupabase();
  const { data: articles } = await supabase
    .from("news_articles")
    .select("slug, headline, summary, category, published_at, image_url")
    .eq("is_published", true)
    .order("published_at", { ascending: false })
    .limit(50);

  const items = (articles ?? [])
    .map((a) => {
      const pubDate = new Date(a.published_at).toUTCString();
      const image = a.image_url
        ? `<enclosure url="${escapeXml(a.image_url)}" type="image/jpeg" length="0" />`
        : "";
      return `    <item>
      <title><![CDATA[${a.headline}]]></title>
      <link>https://rizzjobs.in/news/${a.slug}</link>
      <guid isPermaLink="true">https://rizzjobs.in/news/${a.slug}</guid>
      <description><![CDATA[${a.summary}]]></description>
      <category><![CDATA[${a.category}]]></category>
      <pubDate>${pubDate}</pubDate>
      ${image}
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>Rizz Jobs — Finance &amp; Business News</title>
    <link>https://rizzjobs.in/news</link>
    <description>Latest Indian finance, business, markets, economy and startup news.</description>
    <language>en-in</language>
    <managingEditor>news@rizzjobs.in (Rizz Jobs)</managingEditor>
    <webMaster>news@rizzjobs.in (Rizz Jobs)</webMaster>
    <ttl>60</ttl>
    <image>
      <url>https://rizzjobs.in/logo.png</url>
      <title>Rizz Jobs</title>
      <link>https://rizzjobs.in/news</link>
    </image>
    <atom:link href="https://rizzjobs.in/news/feed.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=600",
    },
  });
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
