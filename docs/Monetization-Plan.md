# Rizz Jobs - Monetization Readiness Plan

Written 2026-07-03. Context: ~20 monthly active users, ~19 new users/month (GA), traffic mostly bots. Three verticals: government job notifications (core, scraper-powered), finance/business news, cricket/IPL.

## Reality check

Monetization needs traffic first. At 20 MAU, no channel produces meaningful revenue: AdSense at typical Indian gov-job RPMs (Rs 40-150 per 1,000 pageviews) needs 10K+ monthly sessions to matter. The plan below is therefore 70% growth, 30% revenue plumbing - build both in parallel so revenue switches on as traffic arrives.

## 1. Focus the product on the jobs vertical

Three unrelated verticals dilute topical authority, and Google ranks focused sites better. The jobs vertical is the one with a real moat (autonomous scraper, AI summaries, dedup pipeline) and the highest commercial intent. Keep cricket and news as secondary sections, but stop investing in them until jobs traffic grows. Peer comparison in GA (Government & Public Sector Jobs median ~600 users vs our 20) shows the gap and the opportunity.

## 2. Growth engine: SEO for gov job seekers (the big lever)

- **JobPosting schema on every notification page.** This qualifies pages for Google for Jobs listings - the single largest free traffic channel for this niche in India.
- **Programmatic hub pages** from data already in Supabase:
  - By qualification: "10th pass govt jobs", "12th pass govt jobs", "graduate govt jobs"
  - By state: "govt jobs in Gujarat", "UP govt jobs 2026", etc.
  - By category: banking, railway, defence, teaching (categories table exists)
  - By stage: admit card, result, answer key pages per exam (huge recurring search volume)
- **Freshness signals**: job seekers search daily; the scraper already updates daily - surface "updated today" and lastmod in sitemaps.
- **Retention channels**: Telegram channel + WhatsApp channel for new notifications (near-zero cost, standard in this niche, drives repeat visits), plus the existing Resend email subscribe flow with deadline reminders.

## 3. Fix measurement before spending effort

GA shows **0 key events** - no conversions are defined. Add events for: email subscribe, alert signup, outbound "Apply" clicks, Telegram joins. Without this, none of the following can be evaluated.

## 4. Monetization ladder (switch on in this order)

1. **Display ads - Google AdSense** (works from day one of approval).
   Requirements largely met: privacy/terms pages exist, original AI-written summaries, clean design. Apply once there is a steady 50-100 visits/day. Migrate to a premium network (Ezoic, Mediavine-class) at ~10K sessions/month for 2-4x RPM.
2. **Test-prep affiliates** (highest revenue-per-visitor fit for this audience).
   Testbook, Adda247, Oliveboard, PracticeMock and Unacademy all run affiliate programs paying per signup or sale. Natural placement: every exam page gets a "Prepare for this exam" block with mock tests and courses. This typically out-earns display ads 3-5x in the gov-job niche.
3. **Sponsored placements** in the email digest / Telegram channel once the list passes a few thousand subscribers (coaching institutes pay for slots).
4. **Premium tier (Rs 49-99/month)** - only after a real user base: instant/early alerts, custom alert filters (state + qualification + category), ad-free browsing, deadline calendar sync.
5. **Cricket section**: seasonal display RPM spikes during IPL; fantasy-sports affiliates (Dream11 etc.) pay well but verify state-level legality in India before joining.

## 5. Product improvements that unlock the above

- JobPosting + BreadcrumbList + FAQ schema on exam pages
- Make subscribe/alerts a primary CTA on every notification page (deadline reminder is the killer feature: "Remind me before the last date")
- About + Contact pages if missing (AdSense approval)
- Keep infra cost near zero (Vercel usage fixes done 2026-07-03)
- `metadataBase` warning in build: set it so OG images resolve correctly for social shares

## 30-day sequence

- **Week 1**: GA key events, JobPosting schema, metadataBase fix, apply for AdSense, create Telegram channel and link it site-wide
- **Weeks 2-3**: Ship programmatic hub pages (state / qualification / category / stage), submit expanded sitemap
- **Week 4**: Join 2-3 test-prep affiliate programs, add "Prepare for this exam" blocks, add email deadline reminders

Revisit revenue mix when traffic crosses ~500 visits/day.
