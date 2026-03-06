import { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const CATEGORY_PATHS = [
  "10th-12th-pass",
  "banking",
  "railway",
  "defense-police",
  "upsc-ssc",
  "teaching",
  "engineering",
  "medical",
  "psu",
  "admit-cards",
  "results",
  "state-jobs",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://rizzjobs.in";

  // Fetch all notifications to add to sitemap
  let notificationUrls: MetadataRoute.Sitemap = [];
  try {
    const { data } = await supabase.from("notifications").select("id, slug, created_at");
    if (data) {
      notificationUrls = data.map((n) => ({
        url: `${baseUrl}/exam/${n.slug || n.id}`,
        lastModified: new Date(n.created_at),
        changeFrequency: "daily" as const,
        priority: 0.8,
      }));
    }
  } catch (error) {
    console.error("Error fetching notifications for sitemap:", error);
  }

  // Category pages
  const categoryUrls: MetadataRoute.Sitemap = CATEGORY_PATHS.map((path) => ({
    url: `${baseUrl}/${path}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: 0.7,
  }));

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
