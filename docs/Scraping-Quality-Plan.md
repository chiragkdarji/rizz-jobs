# Scraping Quality and Content Integrity Plan

Goal: make rizzjobs.in the hub people trust for government exam information. That requires
every notification page to have (1) an accurate title, (2) a working official link,
(3) real dates, and (4) exactly one page per recruitment. This plan fixes the pipeline
that produces those four things, cleans up the existing data, and restructures the site
for SEO/AEO/GEO.

Audit date: 2026-07-14. Database: 1,461 active notifications.

---

## Part 1: What the audit found (evidence, not guesses)

### Finding 1: DB-level dedup has NEVER worked
- `db.py` calls the Postgres function `find_similar_notification()` (pg_trgm) before
  every insert. **That function was never deployed.** The referenced migration file
  `supabase/migrations/20260520_pg_trgm_dedup.sql` does not exist in the repo.
- The failure is swallowed by a `try/except` that returns None, so every run since
  May 20 has logged a warning nobody saw and inserted without checking.
- The only dedup that works is exact slug match. "SSC CGL Online Form 2025",
  "SSC CGL Notification 2026" and "SSC CGL Notification" produce three different slugs,
  so all three live in the DB right now.
- Measured: 85 near-duplicate title clusters (~104+ redundant rows) using conservative
  normalization. The true number is higher because lifecycle events (form, admit card,
  result for the same exam) also fragment into separate rows.

### Finding 2: Link quality is poor
Of 1,461 active notifications:
| Link type | Count | Problem |
|---|---|---|
| Google search URLs | 298 (20%) | Old Tier-5 fallback, removed from code but still in DB. Misleads users, signals low quality to Google. |
| Bare homepages (e.g. `https://upsc.gov.in/`) | 270 (18%) | Not the actual notification page. |
| No link at all | 56 (4%) | |
| Real gov/nic/ac/edu domain links | 615 (42%) | The only good ones. |

### Finding 3: Dates are missing at scale
- 334 rows (23%) have no deadline; 304 rows (21%) have neither deadline nor exam date.
- The exam page emits JobPosting schema. Google requires `validThrough` and requires
  expired postings to be removed. Pages without dates risk structured-data penalties,
  and expired postings that stay "open" risk manual action.

### Finding 4: 65% of titles do not name the organization
- 946 of 1,461 titles lack any recognizable org (examples in DB right now:
  "Warder - 288 Posts", "Administrative Professional", "Section Officer, HPF&AS").
- Root cause: `parse_notifications()` (gpt-4o-mini) is told "Precise full name of the
  exam/recruitment" with no template, so it copies whatever anchor text the aggregator
  used. Nobody searches "Warder 288 Posts"; they search "UP Jail Warder Recruitment 2026".
  This kills SEO, AEO citation, and user trust simultaneously.

### Finding 5: Accuracy depends on best-effort grounding
- Enrichment (GPT-4o) is grounded with official page text only when a URL resolves
  first. When it does not (58% of rows per Finding 2), the model answers from its
  training memory: hallucinated dates, fees, and vacancy counts are exactly what
  you noticed as "new jobs with inaccurate data".

### Finding 6: The lifecycle model is wrong for a hub
One recruitment produces 4-6 separate notifications over months (notification, form open,
correction window, admit card, answer key, result). The scraper treats each as a new row.
Real hubs (the sites users actually bookmark) maintain ONE page per recruitment that
updates through its lifecycle. This is both the biggest dedup fix and the biggest SEO win.

---

## Part 2: The plan

### Phase 0: Stop the bleeding (do first, ~1 day)

**0.1 Deploy the missing pg_trgm migration.** Create
`supabase/migrations/20260714_pg_trgm_dedup.sql`:

```sql
create extension if not exists pg_trgm;

create index if not exists idx_notifications_title_trgm
  on notifications using gin (title gin_trgm_ops);

create or replace function find_similar_notification(
  search_title text,
  threshold float default 0.45
)
returns table (id uuid, slug text, title text, sim_score float)
language sql stable as $$
  select n.id, n.slug, n.title,
         similarity(lower(n.title), lower(search_title)) as sim_score
  from notifications n
  where n.is_active = true
    and similarity(lower(n.title), lower(search_title)) >= threshold
  order by sim_score desc
  limit 1;
$$;
```

Apply via Supabase SQL editor, then verify with the RPC test that failed today.

**0.2 Make dedup failure loud.** In `db.py`, if the RPC errors, abort the run with a
non-zero exit (GitHub Actions turns red) instead of silently inserting. A scraper that
cannot check duplicates must not write.

**0.3 Title contract in Pydantic.** Reject or repair any scraped title that does not
match `{Organization} {Post/Exam} {Year}`:
- Must contain a recognizable org token (maintain an `organizations` reference list:
  name, abbreviations, official domain, category). Seed it with the ~100 bodies already
  in `getLogoText()` on the exam page.
- If the org is missing but the resolved link domain maps to a known org, prepend it
  automatically ("Warder - 288 Posts" + upprpb.gov.in link becomes
  "UP Police Jail Warder Recruitment 2026 - 288 Posts").
- If no org can be determined, set `needs_review=true` and do NOT publish (is_active=false
  until reviewed). Unpublishable is better than unfindable.

**0.4 Date discipline.** A date may only come from grounded official page text or the
source listing. If neither provides one, leave it null. Never let the model fill dates
from memory: pass `official_text_present: true/false` into the prompt and instruct
"if false, output null for all dates".

### Phase 1: One-time data cleanup (~2-3 days, scripts like backfill_banners.py)

Order matters; each step is a standalone script with `--dry-run`.

**1.1 `cleanup_search_links.py`** - For the 298 Google-search links plus 270 bare
homepages: null the link, set `needs_url_review=true`, then re-run the existing
Tier 1-4 URL resolution (discovered links are gone, so it is mostly Serper + validation).
Expect to recover real URLs for 60-70%. The remainder stay flagged and render the page
without an "Apply Now" button (the UI already handles closed/unknown states).

**1.2 `merge_duplicates.py`** - For each pg_trgm cluster (threshold sweep 0.45-0.6 with
manual review file for the gray zone):
- Keep the row with the best data (real gov link > has deadline > oldest created_at,
  which is likeliest to be indexed).
- `smart_merge()` (already written in db.py) folds the losers' details into the keeper.
- Losers get `is_active=false` and a new `redirect_to` column pointing at the keeper's slug.
- Add a 301 in `/exam/[id]`: if the fetched row has `redirect_to`, `permanentRedirect()`
  to it. 301s consolidate whatever ranking the duplicates earned instead of 404ing it.

**1.3 `backfill_titles.py`** - For the 946 org-less titles: resolve org from link domain
or details, rewrite the title to the template via GPT-4o-mini with a strict output
format, keep the slug unchanged (slugs are URLs; changing them costs indexed pages),
update `seo.meta_title` to match. Re-run banner backfill with `--all` afterward so
banners show the corrected titles.

**1.4 `expire_stale.py`** - Any row whose deadline passed more than N days ago flips to
a `status='closed'` presentation (page stays live for SEO, JobPosting schema is dropped
in favor of Article schema, CTA becomes "check result / next cycle"). This is required
by Google's job-posting policy and it is what makes the site feel maintained.

### Phase 2: Pipeline hardening (~1 week, the "never again" layer)

**2.1 Exam entity model.** New table `exams` (the registry of recruitments):
`id, org_id, exam_name, year, advt_no, canonical_slug, status, dates jsonb, links jsonb`.
Every scraped item resolves to an exam entity by (org + exam name + year). Lifecycle
events update the entity and append to an `exam_updates` timeline table instead of
creating new notifications. The notifications table becomes a view of "latest update
per exam" during migration, then retires.
- Status machine: `announced -> applications_open -> applications_closed -> admit_card
  -> exam_done -> answer_key -> result`.
- This is the single change that eliminates the duplication class permanently.

**2.2 Deterministic parsers for official sources.** UPSC whats-new, SSC, IBPS, and
Employment News have stable list markup. Parse them with BeautifulSoup selectors, not
an LLM: exact titles, exact PDF links, zero hallucination, zero token cost. Keep the
LLM parser only for aggregator pages, and treat aggregator data as *hints* that must be
confirmed by an official source before dates are published. Add per-source parser tests
with saved HTML fixtures so a source redesign breaks CI, not production data.

**2.3 URL validation upgrade.** `validate_url()` currently checks HTTP status only.
Add: (a) the page/PDF must mention at least 2 title tokens (org, post, or year), else
reject; (b) prefer deep links over homepages by scoring path depth and keywords;
(c) resolve PDF links to the notification PDF where available - the PDF *is* the
primary source users want.

**2.4 Confidence and review queue.** Every row gets `data_confidence` (high: grounded
from official text; medium: official link but sparse text; low: aggregator-only).
Low confidence never auto-publishes. The admin already has a notifications editor;
add a "review queue" filter (needs_url_review OR low confidence OR org-less title).
5 minutes a day of human review beats any prompt tweak.

**2.5 Run report and alerting.** Extend `scraper_logs` with per-run metrics:
new / merged-into-existing / updated / flagged / rejected, plus link and date coverage
percentages. Fail the GitHub Action if anomalies appear (0 new items = source broke;
>30% flagged = parser broke). The current failure mode is silence.

### Phase 3: Hub structure + SEO/AEO/GEO (~1-2 weeks, after data is clean)

**3.1 One canonical page per recruitment** (built on the exam entity):
- URL: `/exam/{org}-{exam-name}-{year}` (existing slugs 301 in).
- Page = living document: status banner, full dates table, eligibility, fee, lifecycle
  timeline ("12 Jul: exam city slip released"), official links and PDFs, FAQs.
- Google rewards this shape: one URL accumulating links and freshness signals for
  months instead of six thin pages competing with each other.

**3.2 Organization hub pages** `/org/{slug}` (programmatic SEO):
- "UPSC Exams 2026: calendar, active recruitments, results" - one per org in the
  organizations table (~100 pages), listing that org's exam entities.
- These become the internal-linking spine: every exam page links to its org hub,
  org hubs link to category hubs. Target queries like "upcoming SSC exams 2026" that
  the site currently cannot rank for.

**3.3 Structured data corrections:**
- JobPosting ONLY while `status=applications_open` AND deadline present (policy
  compliance); `Event` for scheduled exams; `Article` + `FAQPage` otherwise.
- `dateModified` from real update timestamps (the timeline makes this honest).
- Add `Organization` sameAs linking each org page to its official gov domain.

**3.4 AEO/GEO (getting cited by AI assistants):**
- Keep facts in stable, extractable blocks: the dates table, a one-line direct answer
  ("SSC CGL 2026 last date is 21 August 2026"), consistent H2 question headings.
  These already partially exist (direct_answer, FAQs); make them uniform on every page.
- Add `llms.txt` describing the site and its data freshness.
- Add "Last verified: {date} against {official source}" on every page. AI engines and
  users both weight this heavily; it is also the honest signal of the new pipeline.
- Anchor links (`#important-dates`, `#eligibility`, `#how-to-apply`) so assistants can
  deep-link.

**3.5 E-E-A-T basics:** a real About page describing the verification process, an
editorial policy page, and a visible "report an error" link on every exam page.

### Phase 4: Ongoing quality gate (permanent)

- Weekly cron (GitHub Actions): re-validate all active links (HTTP + content check),
  auto-expire passed deadlines, emit a quality scorecard (link coverage, date coverage,
  dupes caught, review-queue depth) into `scraper_logs`.
- Definition of done for any scraper change: quality scorecard must not regress.

---

## Part 3: Order of execution and effort

| # | Work | Effort | Impact |
|---|---|---|---|
| P0 | Deploy pg_trgm + loud failure + title contract + date discipline | 1 day | Stops new duplicates and new junk immediately |
| P1 | Cleanup scripts: links, dupes+301s, titles, stale | 2-3 days | Fixes the 1,461 existing rows |
| P2 | Entity model + deterministic parsers + validation + review queue | ~1 week | Makes recurrence structurally impossible |
| P3 | Canonical exam pages + org hubs + schema/AEO | 1-2 weeks | Turns clean data into hub-level SEO |
| P4 | Weekly quality gate | 0.5 day | Keeps it bulletproof |

Sequencing rule: P0 before P1 (or cleanup gets re-polluted by the next nightly run);
P1 before P3 (never build SEO structure on dirty data).

## Success metrics (re-run the audit script monthly)

| Metric | Today | Target |
|---|---|---|
| Rows with real official link | 42% | >90% |
| Google-search links | 298 | 0 |
| Rows with deadline or exam date | 79% | >95% (rest explicitly "TBA" by design) |
| Titles with organization | 35% | 100% (enforced) |
| Duplicate clusters | 85+ | 0 new; existing merged with 301s |
| Pages failing JobPosting policy | unknown | 0 (schema gated by status) |
