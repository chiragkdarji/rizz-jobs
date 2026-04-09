# RizzJobs.in

An autonomous platform that monitors Indian government exam boards 24/7, extracts job notifications using AI, and publishes them to a modern, SEO-optimized dashboard — with zero manual intervention.

**Live site:** [rizzjobs.in](https://www.rizzjobs.in/)

---

## What it does

RizzJobs.in continuously scrapes official government portals and top aggregators for exam and recruitment notifications. Each notification is verified, enriched with AI-parsed details (vacancies, exam dates, deadlines), and stored in a Supabase database. The Next.js frontend serves this data with structured JSON-LD markup for strong search engine visibility.

**Sources monitored:**
- UPSC, SSC, IBPS, Employment News (official government portals)
- FreeJobAlert, SarkariResult, SarkariExam, JagranJosh, GovtJobsIndia (aggregators)

---

## Architecture

```
.github/workflows/     # Scheduled GitHub Actions — trigger scraper on a cron
scraper/               # Python backend
  main.py              # Orchestrator: fetches sources, deduplicates, deep-researches
  engine.py            # Playwright page fetcher + URL validator + DuckDuckGo fallback
  parser.py            # HTML cleaner + GPT-4o-mini notification parser
  db.py                # Supabase upsert logic
  image_gen.py         # AI-generated WebP banner images
exam-portal/           # Next.js 15+ frontend
  src/app/             # App Router pages: home, exam detail, category, news, admin
  src/lib/             # Supabase client, data fetching utilities
```

**How a notification flows through the system:**

1. GitHub Actions runs the scraper on a schedule
2. `engine.py` fetches each source page via Playwright (handles JS-rendered sites)
3. `parser.py` sends raw HTML to GPT-4o-mini to extract structured fields
4. Every AI-generated URL is HTTP-validated; broken links fall back to DuckDuckGo search or the org homepage
5. Clean records are upserted into Supabase; a WebP banner is generated and stored
6. The Next.js dashboard reads from Supabase and renders pages with full SEO markup

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15+, TypeScript, Tailwind CSS |
| Backend | Python 3, Playwright, BeautifulSoup, OpenAI API |
| Database | Supabase (PostgreSQL + Storage) |
| Automation | GitHub Actions |
| Deployment | Vercel |

---

## Setup

### Prerequisites
- OpenAI API key (GPT-4o-mini access)
- Supabase project (URL + anon key + service role key)
- Node.js 20+ and Python 3.11+

### 1. Scraper

```bash
cd scraper
pip install -r requirements.txt
playwright install chromium
```

Create `scraper/.env`:
```
OPENAI_API_KEY=sk-...
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key
```

Run manually:
```bash
python main.py          # full run
python main.py --limit 5  # test with 5 notifications
python main.py --refill   # re-research existing records missing key fields
```

### 2. Automation (GitHub Actions)

Add these secrets to **GitHub Settings → Secrets and Variables → Actions**:
- `OPENAI_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_KEY`
- `SUPABASE_SERVICE_KEY`

The workflow in `.github/workflows/` will run the scraper automatically on schedule.

### 3. Frontend

```bash
cd exam-portal
npm install
```

Create `exam-portal/.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

```bash
npm run dev     # local development
npm run build   # production build
```

Deploy to Vercel by connecting the repo and setting the same environment variables in the Vercel dashboard.

---

## Monitoring

Check the **Actions** tab in this repository to see scraper run logs. Each run shows which sources were fetched, how many notifications were found, and which were upserted or skipped.

---

## License

MIT
