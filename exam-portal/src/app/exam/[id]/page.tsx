import { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  CreditCard,
  Users,
  GraduationCap,
  ClipboardCheck,
  Clock,
  MapPin,
  Sparkles,
  HelpCircle,
  ChevronDown,
} from "lucide-react";
import { getSupabase } from "@/lib/supabase-server";
import { isAdmin } from "@/lib/auth-helpers";
import { ResolveUrl } from "@/components/ResolveUrl";
import { BookmarkButton } from "@/components/BookmarkButton";
import { HeroNotificationBanner } from "@/components/NotificationBanner";

interface Notification {
  id: string;
  title: string;
  slug?: string;
  source: string;
  link: string;
  exam_date: string;
  deadline: string;
  ai_summary: string;
  details?: {
    what_is_the_update?: string;
    important_dates?: Record<string, string>;
    application_fee?: string;
    age_limit?: string;
    vacancies?: string;
    eligibility?: string;
    selection_process?: string;
    how_to_apply?: string;
    direct_answer?: string[] | string;
    categories?: string[];
    faqs?: Array<{ q: string; a: string }>;
  };
  seo?: {
    meta_title?: string;
    meta_description?: string;
    meta_keywords?: string;
    json_ld?: Record<string, unknown>;
  };
  visuals?: {
    body_logo?: string;
    notification_image?: string;
    metadata?: {
      alt?: string;
      title?: string;
      caption?: string;
      description?: string;
    };
  };
  screenshot_b64?: string;
  created_at: string;
}


interface RelatedNotification {
  id: string;
  title: string;
  slug?: string;
  ai_summary: string;
  deadline: string;
}

async function fetchRelated(currentId: string): Promise<RelatedNotification[]> {
  try {
    const supabase = getSupabase();
    const { data } = await supabase
      .from("notifications")
      .select("id, title, slug, ai_summary, deadline")
      .eq("is_active", true)
      .neq("id", currentId)
      .order("created_at", { ascending: false })
      .limit(4);
    return data || [];
  } catch {
    return [];
  }
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
}

async function fetchExam(identifier: string): Promise<Notification | null> {
  try {
    const supabase = getSupabase();

    // Step 1: Try slug lookup
    const { data: slugData } = await supabase
      .from("notifications")
      .select("*")
      .eq("slug", identifier)
      .maybeSingle();

    if (slugData) return slugData;

    // Step 2: Fallback to UUID
    const { data: idData } = await supabase
      .from("notifications")
      .select("*")
      .eq("id", identifier)
      .maybeSingle();

    return idData || null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const exam = await fetchExam(id);

  if (!exam) {
    return {
      title: "Exam Not Found",
      description: "The exam you are looking for was not found.",
    };
  }

  const baseUrl = "https://rizzjobs.in";
  const canonicalUrl = `${baseUrl}/exam/${exam.slug || exam.id}`;
  const metaTitle = exam.seo?.meta_title || exam.title;
  const metaDesc =
    exam.seo?.meta_description ||
    exam.ai_summary ||
    "Get the latest government exam updates and notifications.";

  return {
    title: metaTitle,
    description: metaDesc,
    keywords: exam.seo?.meta_keywords || "",
    openGraph: {
      title: metaTitle,
      description: metaDesc,
      url: canonicalUrl,
      type: "article",
      images: exam.visuals?.notification_image
        ? [{ url: exam.visuals.notification_image }]
        : [],
    },
    twitter: {
      card: "summary_large_image",
      title: metaTitle,
      description: metaDesc,
      images: exam.visuals?.notification_image
        ? [exam.visuals.notification_image]
        : [],
    },
    alternates: {
      canonical: canonicalUrl,
    },
  };
}

export const revalidate = 3600; // ISR: revalidate every hour

type DetailValue = string | string[] | Record<string, string>;

/** Parse Python-style list repr: ['item1', 'item2'] → string[] */
function parsePythonListRepr(s: string): string[] | null {
  const trimmed = s.trim();
  if (!trimmed.startsWith("[") || !trimmed.endsWith("]")) return null;
  const items: string[] = [];
  const regex = /'((?:[^'\\]|\\.)*)'/g;
  let match;
  while ((match = regex.exec(trimmed)) !== null) {
    items.push(match[1].replace(/\\'/g, "'"));
  }
  return items.length > 0 ? items : null;
}

function renderValue(val: DetailValue | undefined) {
  if (!val) return null;
  // Try to parse JSON strings stored as text (e.g. scraper saved object as string)
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        val = JSON.parse(trimmed) as DetailValue;
      } catch {
        // Fallback: try Python list repr ['item1', 'item2']
        const pyList = parsePythonListRepr(trimmed);
        if (pyList) val = pyList;
      }
    }
  }
  if (typeof val === "string") return val;
  if (Array.isArray(val)) {
    return (
      <div className="space-y-2">
        {val.map((item, idx) => (
          <div key={idx} className="flex gap-2">
            <span className="text-indigo-500/50">•</span>
            <span>{String(item)}</span>
          </div>
        ))}
      </div>
    );
  }
  if (typeof val === "object") {
    return (
      <div className="space-y-2">
        {Object.entries(val).map(([k, v]) => (
          <div key={k} className="flex gap-2">
            <span className="font-bold text-indigo-400 capitalize">
              {k.replace(/_/g, " ")}:
            </span>
            <span>{String(v)}</span>
          </div>
        ))}
      </div>
    );
  }
  return String(val);
}

// ── Schema builder helpers ──────────────────────────────────────────────────

function buildJobPostingSchema(exam: Notification, canonicalUrl: string) {
  const desc = [exam.details?.what_is_the_update, exam.ai_summary]
    .filter(Boolean)
    .join(" ")
    .slice(0, 5000) || exam.title;

  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    "@id": `${canonicalUrl}#jobposting`,
    "title": exam.title,
    "description": desc,
    "datePosted": exam.created_at?.split("T")[0],
    "hiringOrganization": {
      "@type": "Organization",
      "name": "Government of India",
      "@id": "https://rizzjobs.in/#organization",
      "sameAs": exam.link || "https://india.gov.in",
    },
    "jobLocation": {
      "@type": "Place",
      "address": { "@type": "PostalAddress", "addressCountry": "IN" },
    },
    "employmentType": "FULL_TIME",
    "url": canonicalUrl,
    "directApply": false,
  };

  if (exam.deadline) schema.validThrough = exam.deadline;

  const vacStr = typeof exam.details?.vacancies === "string" ? exam.details.vacancies : "";
  const vacMatch = vacStr.match(/[\d,]{2,}/);
  if (vacMatch) {
    const num = parseInt(vacMatch[0].replace(/,/g, ""));
    if (!isNaN(num)) schema.totalJobOpenings = num;
  }

  return schema;
}

function buildFAQPageSchema(faqs: Array<{ q: string; a: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs
      .filter((f) => f.q && f.a)
      .map((faq) => ({
        "@type": "Question",
        "name": faq.q,
        "acceptedAnswer": { "@type": "Answer", "text": faq.a },
      })),
  };
}

function buildBreadcrumbSchema(
  title: string,
  canonicalUrl: string,
  category?: string
) {
  const items: Array<{ name: string; url: string }> = [
    { name: "Home", url: "https://rizzjobs.in" },
  ];

  if (category) {
    const catPath = category.toLowerCase().replace(/ \/ /g, "-").replace(/\s+/g, "-");
    items.push({ name: category, url: `https://rizzjobs.in/${catPath}` });
  }

  items.push({ name: title, url: canonicalUrl });

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, idx) => ({
      "@type": "ListItem",
      "position": idx + 1,
      "name": item.name,
      "item": item.url,
    })),
  };
}

// ───────────────────────────────────────────────────────────────────────────

function getLogoText(title: string) {
  const knownBodies: Record<string, string> = {
    upsc: "UPSC",
    ssc: "SSC",
    ibps: "IBPS",
    rrb: "RRB",
    uppsc: "UPPSC",
    bpsc: "BPSC",
    mpsc: "MPSC",
    rpsc: "RPSC",
    dsssb: "DSSSB",
    ukpsc: "UKPSC",
    cgpsc: "CGPSC",
    aiims: "AIIMS",
    nta: "NTA",
    csir: "CSIR",
    drdo: "DRDO",
    isro: "ISRO",
    barc: "BARC",
    gsssb: "GSSSB",
    gpsc: "GPSC",
    hpsc: "HPSC",
    kpsc: "KPSC",
    tnpsc: "TNPSC",
    appsc: "APPSC",
    wbpsc: "WBPSC",
    osssc: "OSSSC",
    jssc: "JSSC",
    upsssc: "UPSSSC",
    mmrda: "MMRDA",
    nabard: "NBRD",
    esic: "ESIC",
    epfo: "EPFO",
    nhm: "NHM",
    army: "ARMY",
    navy: "NAVY",
    "air force": "IAF",
    police: "POL",
    crpf: "CRPF",
    bsf: "BSF",
    cisf: "CISF",
    railway: "RLY",
    bank: "BANK",
    sbi: "SBI",
    rbi: "RBI",
  };
  const titleLower = title.toLowerCase();
  for (const [key, abbr] of Object.entries(knownBodies)) {
    if (titleLower.includes(key)) return abbr;
  }
  return title
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export default async function ExamDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [exam, adminAccess] = await Promise.all([fetchExam(id), isAdmin()]);
  const related = exam ? await fetchRelated(exam.id) : [];

  if (!exam) {
    return (
      <div className="min-h-screen bg-[#030712] flex flex-col items-center justify-center text-white p-6">
        <h1 className="text-2xl font-bold mb-4">Exam not found</h1>
        <Link
          href="/"
          className="text-indigo-400 flex items-center gap-2 hover:underline"
        >
          <ArrowLeft className="w-4 h-4" /> Go Back
        </Link>
      </div>
    );
  }

  const details = exam.details || {};
  const canonicalUrl = `https://rizzjobs.in/exam/${exam.slug || exam.id}`;
  const getProxiedUrl = (url: string | undefined) => {
    if (!url || url === "null" || url === "undefined") return undefined;
    if (url.startsWith("data:")) return url;
    return `https://images.weserv.nl/?url=${encodeURIComponent(url)}&w=400&fit=contain`;
  };

  const getSafeOfficialUrl = () => exam.link || "#";

  return (
    <div className="min-h-screen bg-[#030712] text-white font-sans selection:bg-indigo-500/30">
      {/* ── Structured Data / JSON-LD ───────────────────────────────────── */}

      {/* 1. Stored schema from scraper (may be GovernmentService or legacy JobPosting) */}
      {exam.seo?.json_ld && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(exam.seo.json_ld) }}
        />
      )}

      {/* 2. Dynamic JobPosting — always present, uses latest DB data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildJobPostingSchema(exam, canonicalUrl)),
        }}
      />

      {/* 3. FAQPage — AEO: enables "People Also Ask" & AI answer boxes */}
      {details?.faqs && Array.isArray(details.faqs) && details.faqs.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(buildFAQPageSchema(details.faqs)),
          }}
        />
      )}

      {/* 4. BreadcrumbList — site structure for Google */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            buildBreadcrumbSchema(exam.title, canonicalUrl, details?.categories?.[0])
          ),
        }}
      />

      <main className="max-w-5xl mx-auto px-6 py-12">
        <Link
          href="/"
          className="flex items-center gap-3 group mb-8 hover:no-underline"
        >
          <div className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center group-hover:bg-white/10 transition-all">
            <ArrowLeft className="w-5 h-5 text-gray-400 group-hover:text-white" />
          </div>
          <span className="text-gray-400 font-medium group-hover:text-white">
            Back to Updates
          </span>
        </Link>
        <div>
          {/* Hero Information */}
          <div className="mb-12">
            <div>
              <div className="flex items-start gap-4 mb-1">
                <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-tight flex-1">
                  {exam.title}
                </h1>
                {adminAccess && (
                  <Link
                    href={`/admin/notifications/${exam.id}/edit`}
                    className="shrink-0 mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-600/40 hover:text-white text-xs font-bold transition-all"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    Edit
                  </Link>
                )}
              </div>
              <div className="text-xl text-gray-400 font-light leading-relaxed max-w-3xl prose prose-invert prose-a:text-indigo-400 prose-a:underline max-w-none" dangerouslySetInnerHTML={{ __html: exam.ai_summary }} />
              {/* Key Highlights chips */}
              {(() => {
                const raw = details?.direct_answer;
                if (!raw) return null;
                let items: string[] = [];
                if (Array.isArray(raw)) items = raw as string[];
                else if (typeof raw === "string") {
                  try { items = JSON.parse(raw); } catch { items = [raw]; }
                }
                if (!items.length) return null;
                return (
                  <div className="flex flex-wrap gap-2 mt-5">
                    {items.map((chip, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-bold"
                      >
                        {chip}
                      </span>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Left Column: Details */}
            <div className="lg:col-span-2 space-y-12 text-gray-300">
              {/* Notification Image (Primary Hero Visual) */}
              <HeroNotificationBanner
                imageUrl={
                  exam.visuals?.notification_image
                    ? exam.visuals.notification_image.includes("supabase")
                      ? exam.visuals.notification_image
                      : getProxiedUrl(exam.visuals.notification_image) ||
                        exam.visuals.notification_image
                    : null
                }
                title={exam.title}
                alt={exam.visuals?.metadata?.alt || `${exam.title} - Official Notification`}
                caption={exam.visuals?.metadata?.caption}
                description={exam.visuals?.metadata?.description}
              />

              {/* What's the Update? (Job Summary) */}
              {details &&
                typeof details === "object" &&
                details.what_is_the_update && (
                  <section>
                    <div className="flex items-center gap-3 mb-6">
                      <Sparkles className="w-6 h-6 text-indigo-400" />
                      <h2 className="text-xl font-bold italic tracking-wide">
                        Job Summary
                      </h2>
                    </div>
                    <div className="p-8 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 border border-indigo-500/10 rounded-[2.5rem] text-lg font-light leading-relaxed text-gray-200 [&_a]:text-indigo-400 [&_a]:underline [&_a]:underline-offset-2 [&_a]:font-medium [&_a]:hover:text-indigo-300 [&_a]:transition-colors max-w-none" dangerouslySetInnerHTML={{ __html: String(details.what_is_the_update) }} />
                  </section>
                )}

              {/* Important Dates Table */}
              {details &&
                typeof details === "object" &&
                details.important_dates &&
                typeof details.important_dates === "object" &&
                Object.keys(details.important_dates).length > 0 && (
                  <section>
                    <div className="flex items-center gap-3 mb-6">
                      <Calendar className="w-6 h-6 text-indigo-400" />
                      <h2 className="text-xl font-bold">Important Dates</h2>
                    </div>
                    <div className="bg-white/[0.02] border border-white/5 rounded-3xl overflow-hidden">
                      <table className="w-full text-left text-sm">
                        <tbody>
                          {Object.entries(details.important_dates).map(
                            ([key, val]) => (
                              <tr
                                key={key}
                                className="border-b border-white/5 last:border-0"
                              >
                                <td className="p-4 font-bold text-gray-400 w-1/3 capitalize">
                                  {key.replace(/_/g, " ")}
                                </td>
                                <td className="p-4 text-white">
                                  {renderValue(val)}
                                </td>
                              </tr>
                            )
                          )}
                        </tbody>
                      </table>
                    </div>
                  </section>
                )}

              {/* Application Fee */}
              {details &&
                typeof details === "object" &&
                details.application_fee && (
                  <section>
                    <div className="flex items-center gap-3 mb-6">
                      <CreditCard className="w-6 h-6 text-indigo-400" />
                      <h2 className="text-xl font-bold">Application Fee</h2>
                    </div>
                    <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl whitespace-pre-wrap leading-relaxed text-gray-300">
                      {renderValue(details.application_fee)}
                    </div>
                  </section>
                )}

              {/* Vacancy Details */}
              {details &&
                typeof details === "object" &&
                details.vacancies && (
                  <section>
                    <div className="flex items-center gap-3 mb-6">
                      <Users className="w-6 h-6 text-indigo-400" />
                      <h2 className="text-xl font-bold">Vacancy Details</h2>
                    </div>
                    <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl whitespace-pre-wrap leading-relaxed text-gray-300">
                      {renderValue(details.vacancies)}
                    </div>
                  </section>
                )}

              {/* Eligibility */}
              {details &&
                typeof details === "object" &&
                details.eligibility && (
                  <section>
                    <div className="flex items-center gap-3 mb-6">
                      <GraduationCap className="w-6 h-6 text-indigo-400" />
                      <h2 className="text-xl font-bold">
                        Eligibility & Criteria
                      </h2>
                    </div>
                    <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl whitespace-pre-wrap leading-relaxed text-gray-300">
                      {renderValue(details.eligibility)}
                    </div>
                  </section>
                )}

              {/* Selection Process */}
              {details &&
                typeof details === "object" &&
                details.selection_process && (
                  <section>
                    <div className="flex items-center gap-3 mb-6">
                      <ClipboardCheck className="w-6 h-6 text-indigo-400" />
                      <h2 className="text-xl font-bold">Selection Process</h2>
                    </div>
                    <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl whitespace-pre-wrap leading-relaxed text-gray-300">
                      {renderValue(details.selection_process)}
                    </div>
                  </section>
                )}

              {/* How to Apply */}
              {details &&
                typeof details === "object" &&
                details.how_to_apply && (
                  <section>
                    <div className="flex items-center gap-3 mb-6">
                      <Sparkles className="w-6 h-6 text-indigo-400" />
                      <h2 className="text-xl font-bold">How to Apply</h2>
                    </div>
                    <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl whitespace-pre-wrap leading-relaxed text-gray-300">
                      {renderValue(details.how_to_apply)}
                    </div>
                  </section>
                )}

              {/* FAQ Section */}
              {details?.faqs && Array.isArray(details.faqs) && details.faqs.length > 0 && (
                <section>
                  <div className="flex items-center gap-3 mb-6">
                    <HelpCircle className="w-6 h-6 text-indigo-400" />
                    <h2 className="text-xl font-bold">Frequently Asked Questions</h2>
                  </div>
                  <div className="space-y-3">
                    {details.faqs.map((faq, idx) => (
                      <details
                        key={idx}
                        className="group bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden"
                      >
                        <summary className="flex items-center justify-between p-5 cursor-pointer hover:bg-white/5 transition-colors list-none">
                          <span className="font-bold text-white pr-4">{faq.q}</span>
                          <ChevronDown className="w-4 h-4 text-gray-400 shrink-0 group-open:rotate-180 transition-transform duration-200" />
                        </summary>
                        <div className="px-5 pb-5 text-gray-300 text-sm leading-relaxed border-t border-white/5 pt-4">
                          {faq.a}
                        </div>
                      </details>
                    ))}
                  </div>
                </section>
              )}

              {/* Official Screenshot */}
              {exam.screenshot_b64 && (
                <section>
                  <div className="flex items-center gap-3 mb-6">
                    <MapPin className="w-6 h-6 text-indigo-400" />
                    <h2 className="text-xl font-bold">Official Site Preview</h2>
                  </div>
                  <div className="border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`data:image/png;base64,${exam.screenshot_b64}`}
                      alt="Official Notice Screenshot"
                      className="w-full h-auto"
                    />
                  </div>
                </section>
              )}

              {/* Fallback Section (Only if really nothing is found) */}
              {(!details ||
                typeof details !== "object" ||
                (!details.important_dates &&
                  !details.application_fee &&
                  !details.vacancies &&
                  !details.eligibility &&
                  !details.what_is_the_update)) && (
                <section className="py-20 text-center bg-white/[0.02] border border-white/5 rounded-[3rem]">
                  <div className="w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Clock className="w-8 h-8 text-indigo-400" />
                  </div>
                  <h2 className="text-2xl font-bold mb-4">
                    Detailed Information Pending
                  </h2>
                  <p className="text-gray-400 max-w-sm mx-auto mb-8 font-light">
                    We are currently synthesizing the full details for this
                    exam. You can check the official source or search for
                    immediate updates.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center px-6">
                    <a
                      href={getSafeOfficialUrl()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-8 py-4 bg-white text-gray-950 rounded-2xl font-bold hover:bg-gray-200 transition-all text-center"
                    >
                      Official Website
                    </a>
                    <a
                      href={`https://www.google.com/search?q=${encodeURIComponent(exam.title + " notification 2026")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-8 py-4 bg-white/5 border border-white/10 rounded-2xl font-bold hover:bg-white/10 transition-all text-center"
                    >
                      Search Google
                    </a>
                  </div>
                </section>
              )}
            </div>

            {/* Right Column: Sidebar Actions */}
            <div className="lg:col-span-1">
              <div className="sticky top-32 space-y-6">
                <div className="p-8 bg-gradient-to-br from-cyan-600 via-indigo-600 to-purple-700 rounded-[2.5rem] shadow-2xl shadow-indigo-600/40 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                  <h3 className="text-2xl font-black italic mb-4 tracking-tighter">
                    Apply Now
                  </h3>
                  <p className="text-indigo-100 text-sm mb-8 font-medium">
                    Visit the official government portal to submit your
                    application before the deadline.
                  </p>
                  <ResolveUrl
                    title={exam.title}
                    link={exam.link}
                    source={exam.source}
                  />
                </div>

                <div className="p-6 bg-white/[0.03] border border-white/5 rounded-3xl">
                  <BookmarkButton notificationId={exam.id} />
                </div>

                <div className="p-6 bg-white/[0.03] border border-white/5 rounded-3xl">
                  <div className="flex items-center gap-2 text-gray-400 mb-4">
                    <Clock className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-widest">
                      Update History
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">
                    This notification was last updated on{" "}
                    {new Date(exam.created_at).toLocaleString("en-IN", {
                      timeZone: "Asia/Kolkata",
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}{" "}
                    IST.
                  </p>
                </div>

                {/* Related Jobs */}
                {related.length > 0 && (
                  <div className="p-6 bg-white/[0.03] border border-white/5 rounded-3xl">
                    <div className="flex items-center gap-2 text-gray-400 mb-4">
                      <Sparkles className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase tracking-widest">
                        Related Jobs
                      </span>
                    </div>
                    <div className="space-y-4">
                      {(related as RelatedNotification[]).map((r) => (
                        <Link
                          key={r.id}
                          href={`/exam/${r.slug || r.id}`}
                          className="block group"
                        >
                          <p className="text-sm font-medium text-white group-hover:text-indigo-400 transition-colors line-clamp-2 leading-snug">
                            {r.title}
                          </p>
                          {r.deadline && (
                            <p className="text-xs text-gray-500 mt-1">
                              Apply by: {formatDate(r.deadline)}
                            </p>
                          )}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
