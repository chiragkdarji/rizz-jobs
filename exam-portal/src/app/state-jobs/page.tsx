import { Metadata } from "next";
import Link from "next/link";
import { Sparkles, CheckCircle2 } from "lucide-react";
import { getSupabase } from "@/lib/supabase-server";
import { Pagination } from "@/components/Pagination";

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

const CATEGORY_NAME = "State Jobs";
const CATEGORY_DESCRIPTION = "State Government Job Notifications";
const CATEGORY_TAGLINE =
  "Opportunities across India. Get all state-level government job notifications.";

export const metadata: Metadata = {
  title: `${CATEGORY_NAME} Jobs - State Government Jobs | Rizz Jobs`,
  description: `Latest state government job notifications. Get all state-level recruitment alerts and government job opportunities.`,
  keywords: ["state jobs", "government jobs", "state recruitment"],
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
  const title = exam.title.toLowerCase();
  const summary = (exam.ai_summary || "").toLowerCase();
  const combined = `${title} ${summary}`;

  if (
    combined.includes("admit card") ||
    combined.includes("admission letter")
  ) {
    return { text: "Admit Card", color: "bg-yellow-500/10 text-yellow-400" };
  }
  if (combined.includes("result") || combined.includes("merit list")) {
    return { text: "Result Out", color: "bg-blue-500/10 text-blue-400" };
  }
  return { text: "Apply Now", color: "bg-emerald-500/10 text-emerald-400" };
}

async function getCategoryNotifications(
  category: string,
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
      .contains("details->categories", [category])
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
    console.error(`Error fetching ${category} notifications:`, error);
    return { notifications: [], total: 0 };
  }
}

export default async function CategoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const params = await searchParams;
  const query = params.q || "";
  const currentPage = Math.max(1, parseInt(params.page || "1", 10));

  const { notifications, total } = await getCategoryNotifications(
    CATEGORY_NAME,
    query,
    currentPage
  );

  const totalPages = Math.max(1, Math.ceil(total / 12));

  return (
    <div className="min-h-screen bg-[#030712] text-white font-sans selection:bg-indigo-500/30">
      {/* Background Glow */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full" />
      </div>

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        {/* Hero Section */}
        <section className="mb-20">
          <div
            className="flex flex-col gap-8 w-full"
          >
            <div className="w-full lg:w-[100%]">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-black uppercase tracking-widest mb-6">
                <Sparkles className="w-3.5 h-3.5 fill-cyan-400" />
                <span>{CATEGORY_NAME}</span>
              </div>
              <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6 leading-[0.9] italic">
                {CATEGORY_DESCRIPTION}
              </h1>
              <p className="text-xl text-gray-400 max-w-2xl">
                {CATEGORY_TAGLINE}
              </p>
            </div>
          </div>
        </section>

        {/* Grid of Notification Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
            {notifications.length === 0 ? (
              <div className="col-span-full py-20 text-center">
                <p className="text-gray-400 text-lg">
                  No exams found in this category. Try a different search.
                </p>
              </div>
            ) : (
              notifications.map((item) => {
                const badge = getStatusBadge(item);
                return (
                  <article
                    key={item.id}
                    className="group relative rounded-2xl bg-gradient-to-br from-white/[0.04] to-white/[0.02] border border-white/10 p-6 hover:border-indigo-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/10 cursor-pointer overflow-hidden"
                  >
                    {/* Background gradient on hover */}
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/0 to-purple-600/0 group-hover:from-indigo-600/5 group-hover:to-purple-600/5 transition-all duration-300 pointer-events-none" />

                    {/* Notification Image */}
                    {item.visuals?.notification_image && (
                      <div className="mb-4 rounded-xl overflow-hidden h-40 bg-white/5 border border-white/5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.visuals.notification_image}
                          alt={item.visuals.metadata?.alt || item.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    )}

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
                        {item.ai_summary}
                      </p>


                      {/* Dates */}
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        {item.exam_date && (
                          <div className="text-xs bg-white/5 p-2 rounded">
                            <p className="text-gray-500 font-bold">Exam</p>
                            <p className="text-white font-bold">
                              {formatDate(item.exam_date)}
                            </p>
                          </div>
                        )}
                        {item.deadline && (
                          <div className="text-xs bg-white/5 p-2 rounded">
                            <p className="text-gray-500 font-bold">Apply By</p>
                            <p className="text-white font-bold">
                              {formatDate(item.deadline)}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* CTA Buttons */}
                      <div className="flex gap-2">
                        <Link
                          href={`/exam/${item.slug || item.id}`}
                          className="flex-1 py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold transition-all text-center"
                        >
                          View Intel
                        </Link>
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-bold transition-all text-center"
                        >
                          Official
                        </a>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          
        </div>

        {/* Pagination Controls */}
        {notifications.length > 0 && totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            baseUrl="/state-jobs"
          />
        )}
      </main>
    </div>
  );
}
