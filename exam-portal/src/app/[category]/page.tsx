import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Sparkles, CheckCircle2 } from "lucide-react";
import { getSupabase, createServiceRoleClient } from "@/lib/supabase-server";
import { NotificationBanner } from "@/components/NotificationBanner";
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
    metadata?: { alt?: string };
  };
}

interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  description: string;
  tagline: string;
  keywords: string[];
  filter_mode: string; // 'category' | 'title_keyword'
  is_active: boolean;
}

async function getCategory(slug: string): Promise<CategoryRow | null> {
  try {
    const supabase = createServiceRoleClient();
    const { data } = await supabase
      .from("categories")
      .select("id, name, slug, description, tagline, keywords, filter_mode, is_active")
      .eq("slug", slug)
      .eq("is_active", true)
      .single();
    return data || null;
  } catch {
    return null;
  }
}

async function getNotifications(
  cat: CategoryRow,
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

    if (cat.filter_mode === "title_keyword") {
      // Use first keyword as the title filter (e.g. "admit card", "result")
      const keyword = cat.keywords[0] || cat.name;
      query = query.ilike("title", `%${keyword}%`);
    } else {
      // Default: JSONB category containment filter
      query = query.filter("details->categories", "cs", JSON.stringify([cat.name]));
    }

    if (searchQuery) {
      query = query.or(
        `title.ilike.%${searchQuery}%,ai_summary.ilike.%${searchQuery}%`
      );
    }

    const { data, count, error } = await query.range(offset, offset + limit - 1);
    if (error) throw error;
    return { notifications: data || [], total: count || 0 };
  } catch {
    return { notifications: [], total: 0 };
  }
}

function formatDate(dateStr: string | null) {
  if (!dateStr || dateStr === "TBA" || dateStr === "To be notified") return dateStr || "N/A";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getFullYear()}`;
  } catch { return dateStr; }
}

function getStatusBadge(exam: Notification) {
  const combined = `${exam.title} ${exam.ai_summary || ""}`.toLowerCase();
  if (combined.includes("admit card") || combined.includes("admission letter"))
    return { text: "Admit Card", color: "bg-yellow-500/10 text-yellow-400" };
  if (combined.includes("result") || combined.includes("merit list"))
    return { text: "Result Out", color: "bg-blue-500/10 text-blue-400" };
  return { text: "Apply Now", color: "bg-emerald-500/10 text-emerald-400" };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category: slug } = await params;
  const cat = await getCategory(slug);
  if (!cat) return {};

  return {
    title: `${cat.name} Jobs - Government Exam Notifications | Rizz Jobs`,
    description: `Latest ${cat.name} job notifications and exam updates. ${cat.tagline}`,
  };
}

export default async function DynamicCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { category: slug } = await params;

  const cat = await getCategory(slug);
  if (!cat) notFound();

  const sp = await searchParams;
  const query = sp.q || "";
  const currentPage = Math.max(1, parseInt(sp.page || "1", 10));

  const { notifications, total } = await getNotifications(cat, query, currentPage);
  const totalPages = Math.max(1, Math.ceil(total / 12));

  return (
    <div className="min-h-screen bg-[#030712] text-white font-sans selection:bg-indigo-500/30">
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full" />
      </div>

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        {/* Hero */}
        <section className="mb-20">
          <div className="flex flex-col gap-8 w-full">
            <div className="w-full">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-black uppercase tracking-widest mb-6">
                <Sparkles className="w-3.5 h-3.5 fill-cyan-400" />
                <span>{cat.name}</span>
              </div>
              <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6 leading-[0.9] italic">
                {cat.description || cat.name}
              </h1>
              {cat.tagline && (
                <p className="text-xl text-gray-400 max-w-2xl">{cat.tagline}</p>
              )}
            </div>
          </div>
        </section>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {notifications.length === 0 ? (
            <div className="col-span-full py-20 text-center">
              <p className="text-gray-400 text-lg">
                No exams found in this category yet. Check back soon.
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
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/0 to-purple-600/0 group-hover:from-indigo-600/5 group-hover:to-purple-600/5 transition-all duration-300 pointer-events-none" />

                  <NotificationBanner
                    imageUrl={item.visuals?.notification_image}
                    title={item.title}
                    alt={item.visuals?.metadata?.alt || item.title}
                  />

                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${badge.color}`}>
                        {badge.text}
                      </span>
                      <CheckCircle2 className={`w-4 h-4 ${badge.color.split(" ")[1]}`} />
                    </div>

                    <h3 className="text-lg font-bold mb-2 line-clamp-2 group-hover:text-indigo-400 transition-colors">
                      {item.title}
                    </h3>

                    <p className="text-sm text-gray-400 mb-4 line-clamp-2">{item.ai_summary}</p>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                      {item.exam_date && (
                        <div className="text-xs bg-white/5 p-2 rounded">
                          <p className="text-gray-500 font-bold">Exam</p>
                          <p className="text-white font-bold">{formatDate(item.exam_date)}</p>
                        </div>
                      )}
                      {item.deadline && (
                        <div className="text-xs bg-white/5 p-2 rounded">
                          <p className="text-gray-500 font-bold">Apply By</p>
                          <p className="text-white font-bold">{formatDate(item.deadline)}</p>
                        </div>
                      )}
                    </div>

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

        {notifications.length > 0 && totalPages > 1 && (
          <Pagination currentPage={currentPage} totalPages={totalPages} baseUrl={`/${cat.slug}`} />
        )}
      </main>
    </div>
  );
}
