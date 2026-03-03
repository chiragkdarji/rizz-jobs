# GovExam.ai - 100% Autonomous Exam Update Portal

An AI-driven platform that monitors government exam boards 24/7, extracts notifications using GPT-4o-mini, and publishes them to a stunning, premium Next.js dashboard with full SEO/AEO optimization.

## 🌟 Key Features
- **Zero Supervision**: Scraping and AI parsing run automatically via GitHub Actions.
- **AI Verification**: Uses LLMs to understand unstructured PDF/HTML and extract clean data.
- **Elite SEO/AEO**: Structured data (JSON-LD) and "Direct Answer" snippets to dominate search engines.
- **Premium Design**: Modern, glassmorphic UI with fluid animations.

## 📁 System Structure
- `/scraper`: Python backend engine.
- `/exam-portal`: Next.js 15+ frontend dashboard.
- `/.github/workflows`: Scheduled automation logic.

## ⚡ Quick Start
1. **Configure Keys**: Visit the [Phase 1 Guide](C:\Users\harsh\.gemini\antigravity\brain\cd3ca5f0-0d19-4b04-b590-a17b306bc624\phase_1_guide.md) to setup OpenAI and Supabase.
2. **Setup Automation**:
   - Push this repo to GitHub.
   - Add your keys to **GitHub Settings > Secrets and Variables > Actions**.
3. **Deploy Frontend**:
   - Connect your GitHub repo to **Vercel**.
   - Add the Supabase keys to Vercel Environment Variables.

## 📈 Monitoring
Check the **GitHub Actions** tab in your repository to see the logs of the "Hunter" script as it scans the internet for updates.
