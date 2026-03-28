import { Metadata } from "next";
import Link from "next/link";
import { Sparkles, CheckCircle2 } from "lucide-react";
import { getSupabase } from "@/lib/supabase-server";
import { Pagination } from "@/components/Pagination";
import { NotificationBanner } from "@/components/NotificationBanner";

interface Notification {
  id: string;
  title: string;
  slug?: string;
  link: string;
  exam_date: string;
  deadline: string;
  ai_summary: string;
  created_at: string;
  visuals?: {
    notification_image?: string;
    metadata?: {
      alt?: string;
    };
  };
}

const CATEGORIES = [
  { name: "All", path: "/" },
  { name: "10th / 12th Pass", path: "/10th-12th-pass" },
  { name: "Banking", path: "/banking" },
  { name: "Railway", path: "/railway" },
  { name: "Defense / Police", path: "/defense-police" },
  { name: "UPSC / SSC", path: "/upsc-ssc" },
  { name: "Teaching", path: "/teaching" },
  { name: "Engineering", path: "/engineering" },
  { name: "Medical", path: "/medical" },
  { name: "PSU", path: "/psu" },
];

export const metadata: Metadata = {
  title: "Rizz Jobs - Latest Government Job Updates & Exam Alerts",
  description:
    "Your trusted source for the latest government exam notifications, application deadlines, and recruitment updates. Stay informed about UPSC, SSC, Banking, Railway, and State-level exams across India.",
  keywords: [
    "government exams",
    "UPSC 2026",
    "SSC CGL updates",
    "exam alerts",
    "sarkari result",
    "government job notifications",
    "exam deadlines",
  ],
  openGraph: {
    title: "Rizz Jobs - Latest Government Job Updates & Exam Alerts",
    description:
      "Your trusted source for government exam notifications, deadlines, and recruitment updates across India. UPSC, SSC, Banking & more.",
    url: "https://rizzjobs.in",
    siteName: "Rizz Jobs",
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Rizz Jobs - Government Job Updates & Exam Alerts",
    description:
      "Never miss a government job notification. Get the latest exam dates, deadlines, and recruitment updates.",
  },
  robots: { index: true, follow: true },
};

function formatDate(dateStr: string | null) {
  if (!dateStr || dateStr === "TBA" || dateStr === "To be notified")
    return dateStr || "N/A";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
}

function getStatusBadge(exam: Notification) {
  const combined = `${exam.title} ${exam.ai_summary || ""}`.toLowerCase();

  // Keyword-based overrides (highest priority)
  if (combined.includes("admit card") || combined.includes("admission letter")) {
    return { text: "Admit Card", color: "bg-yellow-500/10 text-yellow-400" };
  }
  if (combined.includes("result") || combined.includes("merit list")) {
    return { text: "Result Out", color: "bg-blue-500/10 text-blue-400" };
  }
  if (combined.includes("answer key")) {
    return { text: "Answer Key", color: "bg-cyan-500/10 text-cyan-400" };
  }
  if (combined.includes("interview") || combined.includes("document verification") || combined.includes("dv round")) {
    return { text: "Next Round", color: "bg-purple-500/10 text-purple-400" };
  }
  if (combined.includes("syllabus") || combined.includes("exam pattern")) {
    return { text: "Syllabus Out", color: "bg-indigo-500/10 text-indigo-400" };
  }

  // Deadline-aware statuses
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  if (exam.deadline && exam.deadline !== "TBA" && exam.deadline !== "To be notified") {
    const deadline = new Date(exam.deadline);
    if (!isNaN(deadline.getTime())) {
      if (deadline < now) {
        return { text: "Closed", color: "bg-red-500/10 text-red-400" };
      }
      const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysLeft <= 7) {
        return { text: `${daysLeft}d left`, color: "bg-orange-500/10 text-orange-400" };
      }
    }
  }

  return { text: "Apply Now", color: "bg-emerald-500/10 text-emerald-400" };
}

async function getNotifications(
  searchQuery: string,
  page: number
): Promise<{ notifications: Notification[]; total: number }> {
  try {
    const supabase = getSupabase();
    const limit = 12;
    const offset = (page - 1) * limit;

    let query = supabase
      .from("notifications")
      .select(
        "id, title, slug, link, ai_summary, exam_date, deadline, visuals, created_at",
        { count: "exact" }
      )
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (searchQuery) {
      query = query.or(
        `title.ilike.%${searchQuery}%,ai_summary.ilike.%${searchQuery}%`
      );
    }

    const { data, count, error } = await query.range(offset, offset + limit - 1);

    if (error) throw error;

    return {
      notifications: data || [],
      total: count || 0,
    };
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return { notifications: [], total: 0 };
  }
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const params = await searchParams;
  const query = params.q || "";
  const currentPage = Math.max(1, parseInt(params.page || "1", 10));

  const { notifications, total } = await getNotifications(query, currentPage);

  const totalPages = Math.max(1, Math.ceil(total / 12));

  return (
    <div className="min-h-screen bg-[#030712] text-white font-sans selection:bg-indigo-500/30">
      {/* Background Glow */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full" />
      </div>

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-10">
        {/* Hero Section */}
        <section className="mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-black uppercase tracking-widest mb-5">
            <Sparkles className="w-3.5 h-3.5 fill-cyan-400" />
            <span>100% Rizz. 0% Noise.</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-4 leading-tight italic">
            The{" "}
            <span className="text-cyan-400">Ultimate</span>{" "}
            <span className="text-purple-500">Flex</span>{" "}
            For Your Career.
          </h1>
          <p className="text-base md:text-lg text-gray-400 max-w-2xl">
            Real-time government alerts with high-energy intelligence. No
            fluff, just the updates you need to dominate.
          </p>
        </section>

        {/* Content Tabs — horizontally scrollable on mobile */}
        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-1 scrollbar-hide -mx-6 px-6 md:mx-0 md:px-0 md:flex-wrap">
          {CATEGORIES.map((tab) => (
            <Link
              key={tab.name}
              href={tab.path}
              className={`shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                tab.path === "/"
                  ? "bg-indigo-600 border border-indigo-500 text-white font-bold"
                  : "bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:border-indigo-500/30"
              }`}
            >
              {tab.name}
            </Link>
          ))}
        </div>

        {/* Grid of Notification Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
            {notifications.length === 0 ? (
              <div className="col-span-full py-20 text-center">
                <p className="text-gray-400 text-lg">
                  No exams found. Try a different search.
                </p>
              </div>
            ) : (
              notifications.map((item) => {
                const badge = getStatusBadge(item);
                return (
                  <Link
                    key={item.id}
                    href={`/exam/${item.slug || item.id}`}
                    className="group relative rounded-2xl bg-gradient-to-br from-white/[0.04] to-white/[0.02] border border-white/10 p-6 hover:border-indigo-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/10 cursor-pointer overflow-hidden block"
                  >
                  <article>
                    {/* Background gradient on hover */}
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/0 to-purple-600/0 group-hover:from-indigo-600/5 group-hover:to-purple-600/5 transition-all duration-300 pointer-events-none" />

                    {/* Notification Image — HTML placeholder shown when image is missing or broken */}
                    <NotificationBanner
                      imageUrl={item.visuals?.notification_image}
                      title={item.title}
                      alt={item.visuals?.metadata?.alt || item.title}
                    />

                    <div className="relative z-10">
                      {/* Status Badge */}
                      <div className="flex items-center gap-2 mb-3">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold ${badge.color}`}
                        >
                          {badge.text}
                        </span>
                        <CheckCircle2
                          className={`w-4 h-4 ${badge.color.split(" ")[1]}`}
                        />
                      </div>

                      {/* Title */}
                      <h3 className="text-lg font-bold mb-2 line-clamp-2 group-hover:text-indigo-400 transition-colors">
                        {item.title}
                      </h3>

                      {/* AI Summary */}
                      <p className="text-sm text-gray-400 mb-4 line-clamp-2">
                        {item.ai_summary?.replace(/<[^>]*>/g, "")}
                      </p>


                      {/* Dates */}
                      {(item.exam_date || item.deadline) && (
                        <div className="flex gap-2 mb-4">
                          {item.exam_date && (
                            <div className="flex-1 text-xs bg-white/5 border border-white/5 px-3 py-2 rounded-lg">
                              <p className="text-gray-500 font-bold mb-0.5">Exam Date</p>
                              <p className="text-white font-bold">
                                {formatDate(item.exam_date)}
                              </p>
                            </div>
                          )}
                          {item.deadline && (
                            <div className="flex-1 text-xs bg-amber-500/5 border border-amber-500/10 px-3 py-2 rounded-lg">
                              <p className="text-amber-500/70 font-bold mb-0.5">Apply By</p>
                              <p className="text-amber-400 font-bold">
                                {formatDate(item.deadline)}
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* CTA — styled div since the whole card is already a link */}
                      <div className="w-full py-2 px-3 rounded-lg bg-indigo-600 group-hover:bg-indigo-700 text-white text-sm font-bold transition-all text-center">
                        View Details
                      </div>
                    </div>
                  </article>
                  </Link>
                );
              })
            )}
          
        </div>

        {/* Pagination Controls */}
        {notifications.length > 0 && totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            baseUrl="/"
          />
        )}
      </main>
    </div>
  );
}
