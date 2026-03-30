// Google News XML Sitemap — required for Google News Publisher Center inclusion.
// Uses <news:news> namespace tags with publication_date from the original RSS pubDate
// (stored as published_at). Only articles < 48 hours old qualify for Google News.
// Revalidates every 10 minutes via ISR.

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const revalidate = 600; // 10-minute ISR

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Google News ignores articles older than 48 hours in news sitemaps
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  const { data } = await supabase
    .from("news_articles")
    .select("slug, headline, published_at, tags")
    .eq("is_published", true)
    .gte("published_at", cutoff)
    .order("published_at", { ascending: false })
    .limit(1000);

  const articles = data ?? [];

  const urlEntries = articles
    .map((a) => {
      const keywords = (a.tags ?? []).join(", ");
      return `
  <url>
    <loc>https://rizzjobs.in/news/${a.slug}</loc>
    <lastmod>${new Date(a.published_at).toISOString()}</lastmod>
    <news:news>
      <news:publication>
        <news:name>Rizz Jobs</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${new Date(a.published_at).toISOString()}</news:publication_date>
      <news:title><![CDATA[${a.headline}]]></news:title>${
        keywords
          ? `\n      <news:keywords><![CDATA[${keywords}]]></news:keywords>`
          : ""
      }
    </news:news>
  </url>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${urlEntries}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=600, stale-while-revalidate=300",
    },
  });
}
