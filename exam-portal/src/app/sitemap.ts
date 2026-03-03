import { MetadataRoute } from 'next'
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = 'https://govexam.ai'

    // Fetch all notifications to add to sitemap
    let notificationUrls = [];
    try {
        const { data } = await supabase.from("notifications").select("id, created_at");
        if (data) {
            notificationUrls = data.map(n => ({
                url: `${baseUrl}/exam/${n.id}`,
                lastModified: new Date(n.created_at),
                changeFrequency: 'daily' as const,
                priority: 0.8,
            }));
        }
    } catch { }

    return [
        {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: 'hourly',
            priority: 1,
        },
        ...notificationUrls
    ]
}
