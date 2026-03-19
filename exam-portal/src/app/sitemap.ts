import { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export const revalidate = 3600; // Regenerate every hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://rizzjobs.in";

  // Fetch all notifications
  let notificationUrls: MetadataRoute.Sitemap = [];
  try {
    const { data } = await supabase.from("notifications").select("id, slug, created_at, updated_at");
    if (data) {
      notificationUrls = data.map((n) => ({
        url: `${baseUrl}/exam/${n.slug || n.id}`,
        lastModified: new Date(n.updated_at || n.created_at),
        changeFrequency: "daily" as const,
        priority: 0.8,
      }));
    }
  } catch (error) {
    console.error("Error fetching notifications for sitemap:", error);
  }

  // Fetch active category slugs from DB
  let categoryUrls: MetadataRoute.Sitemap = [];
  try {
    const { data } = await supabase
      .from("categories")
      .select("slug")
      .eq("is_active", true)
      .order("sort_order");
    if (data) {
      categoryUrls = data.map((c) => ({
        url: `${baseUrl}/${c.slug}`,
        lastModified: new Date(),
        changeFrequency: "daily" as const,
        priority: 0.7,
      }));
    }
  } catch (error) {
    console.error("Error fetching categories for sitemap:", error);
  }

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 1,
    },
    ...categoryUrls,
    ...notificationUrls,
  ];
}
