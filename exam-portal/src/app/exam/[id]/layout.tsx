import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

interface Props {
    params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params;

    // Try slug first, then UUID
    let exam = null;
    const { data: slugData } = await supabase
        .from("notifications")
        .select("title, ai_summary, slug, seo, visuals")
        .eq("slug", id)
        .single();

    if (slugData) {
        exam = slugData;
    } else {
        const { data: idData } = await supabase
            .from("notifications")
            .select("title, ai_summary, slug, seo, visuals")
            .eq("id", id)
            .single();
        exam = idData;
    }

    if (!exam) {
        return {
            title: "Exam Not Found — GovExams",
            description: "The requested exam notification could not be found.",
        };
    }

    const title = exam.seo?.meta_title || exam.title;
    const description = exam.seo?.meta_description || exam.ai_summary;
    const keywords = exam.seo?.meta_keywords || "";
    const imageUrl = exam.visuals?.notification_image || "/og-image.png";
    const pageUrl = `https://government-exams.vercel.app/exam/${exam.slug || id}`;

    return {
        title: `${title} — GovExams`,
        description,
        keywords: keywords.split(",").map((k: string) => k.trim()),
        openGraph: {
            title,
            description,
            url: pageUrl,
            siteName: "GovExams",
            images: [
                {
                    url: imageUrl,
                    width: 1280,
                    height: 720,
                    alt: exam.visuals?.metadata?.alt || `${exam.title} - Official Notification`,
                },
            ],
            locale: "en_IN",
            type: "article",
        },
        twitter: {
            card: "summary_large_image",
            title,
            description,
            images: [imageUrl],
        },
        alternates: {
            canonical: pageUrl,
        },
    };
}

export default function ExamLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
