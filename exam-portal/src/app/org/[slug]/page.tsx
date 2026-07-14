import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Building2, ExternalLink, Calendar, ArrowRight } from "lucide-react";
import { getSupabase } from "@/lib/supabase-server";
import { ORGANIZATIONS, getOrg } from "@/lib/organizations";

export const revalidate = 3600;

interface NotificationRow {
  id: string;
  title: string;
  slug?: string;
  deadline: string | null;
  exam_date: string | null;
  ai_summary: string;
  created_at: string;
}

async function fetchOrgNotifications(aliases: string[]): Promise<NotificationRow[]> {
  try {
    const supabase = getSupabase();
    const orFilter = aliases.map((a) => `title.ilike.%${a}%`).join(",");
    const { data } = await supabase
      .from("notifications")
      .select("id, title, slug, deadline, exam_date, ai_summary, created_at")
      .eq("is_active", true)
      .or(orFilter)
      .order("created_at", { ascending: false })
      .limit(60);
    return data || [];
  } catch {
    return [];
  }
}

export function generateStaticParams() {
  return ORGANIZATIONS.map((o) => ({ slug: o.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const org = getOrg(slug);
  if (!org) return { title: "Organization Not Found" };
  const canonical = `https://rizzjobs.in/org/${org.slug}`;
  const title = `${org.name} Recruitment 2026: Latest Notifications, Exams & Results`;
  const description = `All active ${org.fullName} (${org.name}) job notifications in one place: vacancies, application deadlines, exam dates and direct official links. Updated daily.`;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: "Rizz Jobs",
      type: "website",
      images: [{ url: `https://rizzjobs.in/api/og?type=exam&title=${encodeURIComponent(`${org.name} Recruitment 2026`)}&category=${encodeURIComponent(org.name)}`, width: 1200, height: 630 }],
    },
  };
}

function formatDate(d: string | null): string | null {
  if (!d) return null;
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return null;
  return dt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default async function OrgHubPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const org = getOrg(slug);
  if (!org) notFound();

  const notifications = await fetchOrgNotifications(org.aliases);
  const canonical = `https://rizzjobs.in/org/${org.slug}`;
  const open = notifications.filter(
    (n) => n.deadline && new Date(n.deadline).getTime() > Date.now()
  );

  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${org.name} Recruitment 2026`,
    description: `Latest ${org.fullName} job notifications, exam dates and results.`,
    url: canonical,
    isPartOf: { "@type": "WebSite", name: "Rizz Jobs", url: "https://rizzjobs.in" },
    about: {
      "@type": "GovernmentOrganization",
      name: org.fullName,
      alternateName: org.name,
      sameAs: org.officialSite,
    },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: notifications.length,
      itemListElement: notifications.slice(0, 20).map((n, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: n.title,
        url: `https://rizzjobs.in/exam/${n.slug || n.id}`,
      })),
    },
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://rizzjobs.in" },
      { "@type": "ListItem", position: 2, name: "Organizations", item: "https://rizzjobs.in/org" },
      { "@type": "ListItem", position: 3, name: org.name },
    ],
  };

  return (
    <div className="min-h-screen bg-[#030712] text-white font-sans">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      <main className="max-w-5xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-indigo-400">{org.fullName}</p>
            </div>
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-tight mb-4">
            {org.name} Recruitment 2026: Notifications, Exams & Results
          </h1>
          <p className="text-gray-400 text-lg font-light leading-relaxed max-w-3xl mb-4">{org.blurb}</p>
          <div className="flex flex-wrap items-center gap-4">
            <a
              href={org.officialSite}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm font-bold text-gray-300 hover:bg-white/10 transition-all"
            >
              Official Website <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <span className="text-sm text-gray-500">
              {notifications.length} tracked notification{notifications.length === 1 ? "" : "s"}
              {open.length > 0 && (
                <span className="text-emerald-400 font-bold"> · {open.length} open now</span>
              )}
            </span>
          </div>
        </div>

        {/* Notifications list */}
        {notifications.length === 0 ? (
          <div className="py-16 text-center bg-white/[0.02] border border-white/5 rounded-3xl">
            <p className="text-gray-400">
              No active {org.name} notifications tracked right now. Check back soon or visit the{" "}
              <a href={org.officialSite} target="_blank" rel="noopener noreferrer" className="text-indigo-400 underline">
                official website
              </a>.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((n) => {
              const deadline = formatDate(n.deadline);
              const isOpen = n.deadline && new Date(n.deadline).getTime() > Date.now();
              return (
                <Link
                  key={n.id}
                  href={`/exam/${n.slug || n.id}`}
                  className="group flex items-start justify-between gap-4 p-5 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.05] hover:border-indigo-500/30 transition-all"
                >
                  <div className="min-w-0">
                    <h2 className="font-bold text-white group-hover:text-indigo-300 transition-colors leading-snug mb-1">
                      {n.title}
                    </h2>
                    {deadline && (
                      <p className={`flex items-center gap-1.5 text-xs font-bold ${isOpen ? "text-emerald-400" : "text-gray-500"}`}>
                        <Calendar className="w-3.5 h-3.5" />
                        {isOpen ? `Apply by ${deadline}` : `Closed ${deadline}`}
                      </p>
                    )}
                  </div>
                  <ArrowRight className="w-4 h-4 shrink-0 mt-1 text-gray-600 group-hover:text-indigo-400 transition-colors" />
                </Link>
              );
            })}
          </div>
        )}

        {/* Other organizations */}
        <div className="mt-14 pt-8 border-t border-white/5">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">Browse other organizations</p>
          <div className="flex flex-wrap gap-2">
            {ORGANIZATIONS.filter((o) => o.slug !== org.slug).slice(0, 20).map((o) => (
              <Link
                key={o.slug}
                href={`/org/${o.slug}`}
                className="px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/5 text-xs font-bold text-gray-400 hover:text-white hover:border-indigo-500/30 transition-all"
              >
                {o.name}
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
