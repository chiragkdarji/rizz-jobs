# Cricket Hub & Commercial Expansion Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the site into a full-featured cricket portal with global live scores, ICC rankings, records, and a commercially redesigned IPL section to maximise Google AdSense revenue.

**Architecture:** Add a new `/cricket` section for global cricket content (live scores, rankings, records, news) alongside the existing IPL section. Redesign the IPL hub with a new dark-gold commercial theme. Cache all Cricbuzz data in Supabase with TTL-based invalidation to reduce API calls and improve load times.

**Tech Stack:** Next.js 15 (App Router, ISR/SSG), Supabase (postgres + storage), Cricbuzz RapidAPI, Tailwind CSS (inline styles per existing pattern), TypeScript.

---

## Available Cricbuzz Endpoints (Reference)

| Endpoint | URL | Best cache TTL |
|---|---|---|
| Live matches | `GET /matches/v1/live` | 30s |
| Upcoming matches | `GET /matches/v1/upcoming` | 300s |
| Recent results | `GET /matches/v1/recent` | 300s |
| Schedule by type | `GET /schedule/v1/{international\|domestic\|league\|women}` | 3600s |
| ICC Rankings batsmen | `GET /stats/v1/rankings/batsmen?formatType={test\|odi\|t20}` | 3600s |
| ICC Rankings bowlers | `GET /stats/v1/rankings/bowlers?formatType={test\|odi\|t20}` | 3600s |
| ICC Rankings allrounders | `GET /stats/v1/rankings/allrounders?formatType={test\|odi\|t20}` | 3600s |
| ICC Standings (WTC) | `GET /stats/v1/iccstanding/team/matchtype/1` | 3600s |
| Records filters | `GET /stats/v1/topstats` | 86400s |
| Records data | `GET /stats/v1/topstats/0?statsType={type}&matchType={1\|2\|3}` | 86400s |
| Global news index | `GET /news/v1/index` | 900s |
| News by category | `GET /news/v1/category/{id}` | 900s |
| Series stats | `GET /stats/v1/series/{id}/stats?statsType={type}&matchType={type}` | 900s |
| Match scorecard | `GET /mcenter/v1/{matchId}/scorecard` | 30s |

---

## File Structure

### New files (create)
```
exam-portal/src/
  app/
    (cricket)/
      layout.tsx                        ← Cricket section layout (header + dark theme)
      cricket/
        page.tsx                        ← Cricket hub: live + upcoming + news
        live/page.tsx                   ← All live matches globally
        upcoming/page.tsx               ← Upcoming matches globally  
        recent/page.tsx                 ← Recent results
        news/page.tsx                   ← Global cricket news (reuses ipl/news pattern)
        rankings/page.tsx               ← ICC Rankings (bat/bowl/all × test/odi/t20)
        records/page.tsx                ← Cricket records (mostRuns, mostWickets, etc.)
        schedule/page.tsx               ← Cricket schedule by type
    api/
      cricket/
        matches/route.ts                ← Aggregates live+upcoming+recent
        live/route.ts                   ← /matches/v1/live with DB cache
        upcoming/route.ts               ← /matches/v1/upcoming with DB cache
        recent/route.ts                 ← /matches/v1/recent with DB cache
        rankings/route.ts               ← ICC Rankings batsmen/bowlers/allrounders
        records/route.ts                ← Cricket records (topstats)
        news/route.ts                   ← Global news index
        schedule/route.ts               ← Schedule by type
  components/
    cricket/
      CricketHeader.tsx                 ← Navigation for cricket section
      LiveMatchCard.tsx                 ← Global match card (not IPL-specific)
      LiveMatchGrid.tsx                 ← Grid of LiveMatchCards (client, polls 30s)
      MatchTypeFilter.tsx               ← Filter chips: All | International | League | Domestic | Women
      RankingTable.tsx                  ← ICC Rankings table component
      RecordsTable.tsx                  ← Cricket records table
      ScheduleTable.tsx                 ← Schedule day-by-day table
```

### Modified files (edit)
```
exam-portal/src/
  app/(ipl)/ipl/page.tsx                ← Complete redesign with new dark-gold commercial theme
  app/(ipl)/layout.tsx                  ← Update colour tokens (new theme)
  lib/cricbuzz.ts                       ← Add CRICKET_BASE_URL, helper for global match endpoints
  app/sitemap.ts                        ← Create: dynamic sitemap for SEO
  app/robots.ts                         ← Create: robots.txt allowing all crawlers
  components/ipl/IplHeader.tsx          ← Add "Cricket" nav link
```

### Supabase tables needed (run in SQL editor)
```sql
-- Generic key-value cache for Cricbuzz responses
CREATE TABLE cricket_cache (
  key text PRIMARY KEY,
  data jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX cricket_cache_updated_at ON cricket_cache(updated_at);
```

---

## Commercial Theme Redesign

**New IPL colour palette (replacing dark blue/teal):**
```
Background deep:   #0A0A0F  (near-black, premium feel)
Background card:   #12121A  (elevated card surface)
Background raised: #1A1A26  (section headers)
Border:            #2A2A3A  (subtle borders)
Accent gold:       #FFB800  (primary brand - IPL gold/trophy)
Accent orange:     #FF6B00  (secondary - cricket ball, energy)
Text primary:      #F0EDE8  (warm white)
Text secondary:    #9A96A0  (muted)
Text dim:          #5A566A  (timestamps, labels)
Positive green:    #22C55E  (wins, positive trends)
Danger red:        #EF4444  (losses, danger)
Live pulse:        #FF3B3B  (live indicator)
```

This replaces the current flat navy (`#061624`, `#0E2235`) and teal (`#8BB0C8`) with a richer, higher-contrast dark-gold look that has better CTR potential for AdSense.

---

## Task 1: Supabase `cricket_cache` table

**Files:** SQL migration only

- [ ] **Step 1: Create the table**

In Supabase SQL editor, run:
```sql
CREATE TABLE IF NOT EXISTS cricket_cache (
  key text PRIMARY KEY,
  data jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cricket_cache_updated_at_idx ON cricket_cache(updated_at);
```

- [ ] **Step 2: Add helper to `lib/cricbuzz.ts`**

Open `exam-portal/src/lib/cricbuzz.ts` and append:

```typescript
/** Cache TTLs (ms) */
export const CACHE_TTL = {
  live: 30_000,
  matches: 300_000,
  rankings: 3_600_000,
  records: 86_400_000,
  news: 900_000,
  schedule: 3_600_000,
} as const;

/**
 * Fetch from Supabase cricket_cache.
 * Returns null if not found or stale (older than ttlMs).
 */
export async function getCached<T>(key: string, ttlMs: number): Promise<T | null> {
  try {
    const { createServiceRoleClient } = await import("@/lib/supabase-server");
    const supabase = createServiceRoleClient();
    const { data } = await supabase
      .from("cricket_cache")
      .select("data, updated_at")
      .eq("key", key)
      .single();
    if (!data) return null;
    if (Date.now() - new Date(data.updated_at).getTime() > ttlMs) return null;
    return data.data as T;
  } catch {
    return null;
  }
}

/**
 * Write to Supabase cricket_cache (upsert).
 */
export async function setCached(key: string, value: unknown): Promise<void> {
  try {
    const { createServiceRoleClient } = await import("@/lib/supabase-server");
    const supabase = createServiceRoleClient();
    await supabase.from("cricket_cache").upsert(
      { key, data: value, updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );
  } catch {
    // non-blocking
  }
}
```

- [ ] **Step 3: Commit**
```bash
git add exam-portal/src/lib/cricbuzz.ts
git commit -m "feat: add getCached/setCached helpers for cricket_cache table"
```

---

## Task 2: API route — Global Live Matches

**Files:**
- Create: `exam-portal/src/app/api/cricket/live/route.ts`

- [ ] **Step 1: Create the route**

```typescript
// exam-portal/src/app/api/cricket/live/route.ts
import { NextResponse } from "next/server";
import { CB_BASE, cbHeaders, getCached, setCached, CACHE_TTL } from "@/lib/cricbuzz";

export const revalidate = 30;
const CACHE_KEY = "cricket:live";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const matchType = searchParams.get("type") ?? ""; // International|Domestic|League|Women

  const cached = await getCached<unknown>(CACHE_KEY, CACHE_TTL.live);
  let raw = cached;

  if (!raw) {
    try {
      const res = await fetch(`${CB_BASE}/matches/v1/live`, {
        headers: cbHeaders(),
        next: { revalidate: 30 },
      });
      if (!res.ok) return NextResponse.json({ typeMatches: [] }, { status: 200 });
      raw = await res.json();
      setCached(CACHE_KEY, raw).catch(() => {});
    } catch {
      return NextResponse.json({ typeMatches: [] }, { status: 200 });
    }
  }

  // Filter by matchType if provided
  let data = raw as { typeMatches?: unknown[] };
  if (matchType && Array.isArray(data.typeMatches)) {
    data = {
      ...data,
      typeMatches: data.typeMatches.filter(
        (t: unknown) => (t as { matchType?: string }).matchType === matchType
      ),
    };
  }

  return NextResponse.json(data, {
    headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=10" },
  });
}
```

- [ ] **Step 2: Create upcoming route** (same pattern)

```typescript
// exam-portal/src/app/api/cricket/upcoming/route.ts
import { NextResponse } from "next/server";
import { CB_BASE, cbHeaders, getCached, setCached, CACHE_TTL } from "@/lib/cricbuzz";

export const revalidate = 300;
const CACHE_KEY = "cricket:upcoming";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const matchType = searchParams.get("type") ?? "";

  const cached = await getCached<unknown>(CACHE_KEY, CACHE_TTL.matches);
  let raw = cached;

  if (!raw) {
    try {
      const res = await fetch(`${CB_BASE}/matches/v1/upcoming`, {
        headers: cbHeaders(),
        next: { revalidate: 300 },
      });
      if (!res.ok) return NextResponse.json({ typeMatches: [] }, { status: 200 });
      raw = await res.json();
      setCached(CACHE_KEY, raw).catch(() => {});
    } catch {
      return NextResponse.json({ typeMatches: [] }, { status: 200 });
    }
  }

  let data = raw as { typeMatches?: unknown[] };
  if (matchType && Array.isArray(data.typeMatches)) {
    data = {
      ...data,
      typeMatches: data.typeMatches.filter(
        (t: unknown) => (t as { matchType?: string }).matchType === matchType
      ),
    };
  }

  return NextResponse.json(data, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60" },
  });
}
```

- [ ] **Step 3: Create recent route**

```typescript
// exam-portal/src/app/api/cricket/recent/route.ts
import { NextResponse } from "next/server";
import { CB_BASE, cbHeaders, getCached, setCached, CACHE_TTL } from "@/lib/cricbuzz";

export const revalidate = 300;
const CACHE_KEY = "cricket:recent";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const matchType = searchParams.get("type") ?? "";

  const cached = await getCached<unknown>(CACHE_KEY, CACHE_TTL.matches);
  let raw = cached;

  if (!raw) {
    try {
      const res = await fetch(`${CB_BASE}/matches/v1/recent`, {
        headers: cbHeaders(),
        next: { revalidate: 300 },
      });
      if (!res.ok) return NextResponse.json({ typeMatches: [] }, { status: 200 });
      raw = await res.json();
      setCached(CACHE_KEY, raw).catch(() => {});
    } catch {
      return NextResponse.json({ typeMatches: [] }, { status: 200 });
    }
  }

  let data = raw as { typeMatches?: unknown[] };
  if (matchType && Array.isArray(data.typeMatches)) {
    data = {
      ...data,
      typeMatches: data.typeMatches.filter(
        (t: unknown) => (t as { matchType?: string }).matchType === matchType
      ),
    };
  }

  return NextResponse.json(data, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60" },
  });
}
```

- [ ] **Step 4: Commit**
```bash
git add exam-portal/src/app/api/cricket/
git commit -m "feat: add cricket live/upcoming/recent API routes with DB cache"
```

---

## Task 3: API route — ICC Rankings

**Files:**
- Create: `exam-portal/src/app/api/cricket/rankings/route.ts`

- [ ] **Step 1: Create rankings route**

```typescript
// exam-portal/src/app/api/cricket/rankings/route.ts
import { NextResponse } from "next/server";
import { CB_BASE, cbHeaders, getCached, setCached, CACHE_TTL } from "@/lib/cricbuzz";

export const revalidate = 3600;

// category: batsmen | bowlers | allrounders | teams
// format: test | odi | t20
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category") ?? "batsmen";
  const format = searchParams.get("format") ?? "test";

  const key = `cricket:rankings:${category}:${format}`;
  const cached = await getCached<unknown>(key, CACHE_TTL.rankings);
  if (cached) {
    return NextResponse.json(cached, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=600" },
    });
  }

  try {
    // Cricbuzz URL differs between player rankings and team standings
    const url = category === "teams"
      ? `${CB_BASE}/stats/v1/iccstanding/team/matchtype/${format === "test" ? 1 : format === "odi" ? 2 : 3}`
      : `${CB_BASE}/stats/v1/rankings/${category}?formatType=${format}`;

    const res = await fetch(url, {
      headers: cbHeaders(),
      next: { revalidate: 3600 },
    });
    if (!res.ok) return NextResponse.json({ rank: [] }, { status: 200 });
    const data = await res.json();
    setCached(key, data).catch(() => {});
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=600" },
    });
  } catch {
    return NextResponse.json({ rank: [] }, { status: 200 });
  }
}
```

- [ ] **Step 2: Commit**
```bash
git add exam-portal/src/app/api/cricket/rankings/route.ts
git commit -m "feat: add ICC rankings API route with DB cache"
```

---

## Task 4: API route — Cricket Records

**Files:**
- Create: `exam-portal/src/app/api/cricket/records/route.ts`

- [ ] **Step 1: Create records route**

```typescript
// exam-portal/src/app/api/cricket/records/route.ts
import { NextResponse } from "next/server";
import { CB_BASE, cbHeaders, getCached, setCached, CACHE_TTL } from "@/lib/cricbuzz";

export const revalidate = 86400;

// statsType: mostRuns | mostWickets | highestScore | highestAvg | mostHundreds | mostFifties | mostSixes | lowestAvg | bestBowlingInnings | mostFiveWickets
// matchType: 1=Test 2=ODI 3=T20  teamId: optional
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const statsType = searchParams.get("statsType") ?? "mostRuns";
  const matchType = searchParams.get("matchType") ?? "1";

  const key = `cricket:records:${statsType}:${matchType}`;
  const cached = await getCached<unknown>(key, CACHE_TTL.records);
  if (cached) {
    return NextResponse.json(cached, {
      headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600" },
    });
  }

  try {
    const res = await fetch(
      `${CB_BASE}/stats/v1/topstats/${matchType}?statsType=${statsType}`,
      { headers: cbHeaders(), next: { revalidate: 86400 } }
    );
    if (!res.ok) return NextResponse.json({ values: [] }, { status: 200 });
    const data = await res.json();
    setCached(key, data).catch(() => {});
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600" },
    });
  } catch {
    return NextResponse.json({ values: [] }, { status: 200 });
  }
}
```

- [ ] **Step 2: Commit**
```bash
git add exam-portal/src/app/api/cricket/records/route.ts
git commit -m "feat: add cricket records API route"
```

---

## Task 5: API route — Global Cricket News

**Files:**
- Create: `exam-portal/src/app/api/cricket/news/route.ts`

- [ ] **Step 1: Create news route**

```typescript
// exam-portal/src/app/api/cricket/news/route.ts
import { NextResponse } from "next/server";
import { CB_BASE, cbHeaders, getCached, setCached, CACHE_TTL } from "@/lib/cricbuzz";

export const revalidate = 900;

export async function GET() {
  const key = "cricket:news:index";
  const cached = await getCached<unknown>(key, CACHE_TTL.news);
  if (cached) {
    return NextResponse.json(cached, {
      headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=120" },
    });
  }

  try {
    const res = await fetch(`${CB_BASE}/news/v1/index`, {
      headers: cbHeaders(),
      next: { revalidate: 900 },
    });
    if (!res.ok) return NextResponse.json({ storyList: [] }, { status: 200 });
    const data = await res.json();
    setCached(key, data).catch(() => {});
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=120" },
    });
  } catch {
    return NextResponse.json({ storyList: [] }, { status: 200 });
  }
}
```

- [ ] **Step 2: Commit**
```bash
git add exam-portal/src/app/api/cricket/news/route.ts
git commit -m "feat: add global cricket news API route"
```

---

## Task 6: Cricket Section Layout

**Files:**
- Create: `exam-portal/src/app/(cricket)/layout.tsx`
- Create: `exam-portal/src/components/cricket/CricketHeader.tsx`

New colour tokens (defined inline, matching the new commercial theme):
```
BG_DEEP    = #0A0A0F
BG_CARD    = #12121A
BG_RAISED  = #1A1A26
BORDER     = #2A2A3A
GOLD       = #FFB800
ORANGE     = #FF6B00
TEXT_PRI   = #F0EDE8
TEXT_SEC   = #9A96A0
LIVE_RED   = #FF3B3B
```

- [ ] **Step 1: Create CricketHeader**

```tsx
// exam-portal/src/components/cricket/CricketHeader.tsx
import Link from "next/link";

const NAV = [
  { href: "/cricket", label: "Home" },
  { href: "/cricket/live", label: "🔴 Live" },
  { href: "/cricket/upcoming", label: "Schedule" },
  { href: "/cricket/rankings", label: "Rankings" },
  { href: "/cricket/records", label: "Records" },
  { href: "/cricket/news", label: "News" },
  { href: "/ipl", label: "IPL 2026" },
];

export default function CricketHeader() {
  return (
    <header style={{ background: "#0A0A0F", borderBottom: "1px solid #2A2A3A", position: "sticky", top: 0, zIndex: 50 }}>
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-14">
        <Link href="/cricket">
          <span className="font-bold text-lg tracking-tight" style={{ color: "#FFB800", fontFamily: "var(--font-ipl-display, sans-serif)" }}>
            🏏 CricScore
          </span>
        </Link>
        <nav className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="whitespace-nowrap text-xs font-medium px-3 py-1.5 rounded-md transition-colors hover:bg-[#1A1A26]"
              style={{ color: "#9A96A0" }}
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Create layout**

```tsx
// exam-portal/src/app/(cricket)/layout.tsx
import type { Metadata } from "next";
import { Rajdhani, Inter } from "next/font/google";
import CricketHeader from "@/components/cricket/CricketHeader";

const rajdhani = Rajdhani({ subsets: ["latin"], weight: ["400", "600", "700"], variable: "--font-cricket-display" });
const inter = Inter({ subsets: ["latin"], variable: "--font-cricket-body" });

export const metadata: Metadata = {
  title: { default: "Live Cricket Scores & Stats | Rizz Jobs", template: "%s | Rizz Jobs Cricket" },
  description: "Live cricket scores, ICC rankings, records, schedule and news from around the world.",
};

export default function CricketLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${rajdhani.variable} ${inter.variable}`} style={{ background: "#0A0A0F", minHeight: "100vh", color: "#F0EDE8" }}>
      <CricketHeader />
      <main>{children}</main>
      <footer className="mt-16 py-8 text-center text-xs" style={{ color: "#5A566A", borderTop: "1px solid #2A2A3A" }}>
        © 2026 Rizz Jobs · Cricket data by Cricbuzz
      </footer>
    </div>
  );
}
```

- [ ] **Step 3: Commit**
```bash
git add exam-portal/src/app/(cricket)/ exam-portal/src/components/cricket/CricketHeader.tsx
git commit -m "feat: add cricket section layout and header"
```

---

## Task 7: LiveMatchCard & LiveMatchGrid Components

**Files:**
- Create: `exam-portal/src/components/cricket/LiveMatchCard.tsx`
- Create: `exam-portal/src/components/cricket/LiveMatchGrid.tsx`

- [ ] **Step 1: Create LiveMatchCard**

```tsx
// exam-portal/src/components/cricket/LiveMatchCard.tsx
import Link from "next/link";
import Image from "next/image";

interface TeamInfo { teamId?: number; teamName: string; teamSName: string; imageId?: number; }
interface InningsScore { runs?: number; wickets?: number; overs?: number; }
interface MatchScore {
  team1Score?: { inngs1?: InningsScore; inngs2?: InningsScore };
  team2Score?: { inngs1?: InningsScore; inngs2?: InningsScore };
}
export interface MatchItem {
  matchInfo: {
    matchId: number;
    seriesName: string;
    matchDesc: string;
    matchFormat: string;
    startDate: string;
    state: string;
    status: string;
    team1: TeamInfo;
    team2: TeamInfo;
    venueInfo?: { ground?: string; city?: string };
    stateTitle?: string;
  };
  matchScore?: MatchScore;
}

function fmtScore(s?: InningsScore) {
  if (!s || s.runs == null) return null;
  const wkts = s.wickets != null && s.wickets < 10 ? `/${s.wickets}` : "";
  const ovs = s.overs != null ? ` (${s.overs})` : "";
  return `${s.runs}${wkts}${ovs}`;
}

export default function LiveMatchCard({ match }: { match: MatchItem }) {
  const { matchInfo: m, matchScore: s } = match;
  const isLive = m.state === "In Progress";
  const t1s1 = fmtScore(s?.team1Score?.inngs1);
  const t1s2 = fmtScore(s?.team1Score?.inngs2);
  const t2s1 = fmtScore(s?.team2Score?.inngs1);
  const t2s2 = fmtScore(s?.team2Score?.inngs2);
  const startMs = Number(m.startDate);
  const startDate = !isNaN(startMs) ? new Date(startMs).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "";

  return (
    <Link href={`/ipl/match/${m.matchId}`}>
      <div
        className="rounded-xl p-4 cursor-pointer transition-colors hover:border-[#FFB800]"
        style={{ background: "#12121A", border: "1px solid #2A2A3A" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs truncate max-w-[70%]" style={{ color: "#5A566A" }}>
            {m.seriesName} · {m.matchDesc} · {m.matchFormat}
          </span>
          {isLive ? (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full animate-pulse" style={{ background: "#FF3B3B22", color: "#FF3B3B" }}>
              ● LIVE
            </span>
          ) : (
            <span className="text-xs" style={{ color: "#5A566A" }}>{startDate}</span>
          )}
        </div>

        {/* Teams */}
        <div className="space-y-2">
          {[{ team: m.team1, s1: t1s1, s2: t1s2 }, { team: m.team2, s1: t2s1, s2: t2s2 }].map(({ team, s1, s2 }) => (
            <div key={team.teamId ?? team.teamName} className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                {team.imageId && (
                  <div className="relative w-6 h-6 shrink-0">
                    <Image src={`/api/ipl/image?id=${team.imageId}&type=team`} alt={team.teamSName} fill className="object-contain" unoptimized />
                  </div>
                )}
                <span className="font-semibold text-sm truncate" style={{ color: "#F0EDE8" }}>{team.teamName}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {s1 && <span className="font-bold text-sm" style={{ color: "#F0EDE8" }}>{s1}</span>}
                {s2 && <span className="text-xs ml-1" style={{ color: "#9A96A0" }}>{s2}</span>}
              </div>
            </div>
          ))}
        </div>

        {/* Status */}
        <p className="mt-2 text-xs truncate" style={{ color: isLive ? "#FFB800" : "#5A566A" }}>
          {m.status || m.stateTitle}
        </p>
      </div>
    </Link>
  );
}
```

- [ ] **Step 2: Create LiveMatchGrid (client component)**

```tsx
// exam-portal/src/components/cricket/LiveMatchGrid.tsx
"use client";
import { useState, useEffect, useCallback } from "react";
import LiveMatchCard, { type MatchItem } from "./LiveMatchCard";

interface Props {
  initialData: MatchItem[];
  apiUrl: string;
  pollIntervalMs?: number;
  matchTypeFilter?: string;
}

function extractMatches(data: unknown): MatchItem[] {
  if (!data || typeof data !== "object") return [];
  const d = data as { typeMatches?: unknown[] };
  if (!Array.isArray(d.typeMatches)) return [];
  const out: MatchItem[] = [];
  for (const tm of d.typeMatches) {
    const t = tm as { seriesMatches?: unknown[] };
    if (!Array.isArray(t.seriesMatches)) continue;
    for (const sm of t.seriesMatches) {
      const s = sm as { seriesAdWrapper?: { matches?: MatchItem[] } };
      if (s.seriesAdWrapper?.matches) out.push(...s.seriesAdWrapper.matches);
    }
  }
  return out;
}

export default function LiveMatchGrid({ initialData, apiUrl, pollIntervalMs = 30_000, matchTypeFilter }: Props) {
  const [matches, setMatches] = useState<MatchItem[]>(initialData);

  const refresh = useCallback(async () => {
    try {
      const url = matchTypeFilter ? `${apiUrl}?type=${matchTypeFilter}` : apiUrl;
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) setMatches(extractMatches(await res.json()));
    } catch {/* ignore */}
  }, [apiUrl, matchTypeFilter]);

  useEffect(() => {
    const id = setInterval(refresh, pollIntervalMs);
    return () => clearInterval(id);
  }, [refresh, pollIntervalMs]);

  if (matches.length === 0) {
    return <p className="text-center py-12 text-sm" style={{ color: "#5A566A" }}>No matches right now.</p>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {matches.map((m) => <LiveMatchCard key={m.matchInfo.matchId} match={m} />)}
    </div>
  );
}
```

- [ ] **Step 3: Commit**
```bash
git add exam-portal/src/components/cricket/
git commit -m "feat: add LiveMatchCard and LiveMatchGrid components"
```

---

## Task 8: Cricket Hub Page (`/cricket`)

**Files:**
- Create: `exam-portal/src/app/(cricket)/cricket/page.tsx`

- [ ] **Step 1: Create the hub page**

```tsx
// exam-portal/src/app/(cricket)/cricket/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import LiveMatchGrid from "@/components/cricket/LiveMatchGrid";
import { MatchItem } from "@/components/cricket/LiveMatchCard";

export const revalidate = 30;

export const metadata: Metadata = {
  title: "Live Cricket Scores 2026 | Rizz Jobs",
  description: "Live cricket scores, ball-by-ball updates, upcoming matches and recent results from around the world.",
};

const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.rizzjobs.in";

function extractMatches(data: unknown): MatchItem[] {
  if (!data || typeof data !== "object") return [];
  const d = data as { typeMatches?: unknown[] };
  if (!Array.isArray(d.typeMatches)) return [];
  const out: MatchItem[] = [];
  for (const tm of d.typeMatches) {
    const t = tm as { seriesMatches?: unknown[] };
    if (!Array.isArray(t.seriesMatches)) continue;
    for (const sm of t.seriesMatches) {
      const s = sm as { seriesAdWrapper?: { matches?: MatchItem[] } };
      if (s.seriesAdWrapper?.matches) out.push(...s.seriesAdWrapper.matches);
    }
  }
  return out;
}

export default async function CricketHubPage() {
  const [liveRes, upcomingRes, recentRes] = await Promise.all([
    fetch(`${base}/api/cricket/live`, { next: { revalidate: 30 } }).catch(() => null),
    fetch(`${base}/api/cricket/upcoming`, { next: { revalidate: 300 } }).catch(() => null),
    fetch(`${base}/api/cricket/recent`, { next: { revalidate: 300 } }).catch(() => null),
  ]);

  const [liveData, upcomingData, recentData] = await Promise.all([
    liveRes?.ok ? liveRes.json() : {},
    upcomingRes?.ok ? upcomingRes.json() : {},
    recentRes?.ok ? recentRes.json() : {},
  ]);

  const liveMatches = extractMatches(liveData);
  const upcomingMatches = extractMatches(upcomingData).slice(0, 6);
  const recentMatches = extractMatches(recentData).slice(0, 6);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-10">
      {/* Quick links bar */}
      <div className="flex flex-wrap gap-3">
        {[
          { href: "/cricket/rankings", label: "ICC Rankings" },
          { href: "/cricket/records", label: "Records" },
          { href: "/ipl", label: "IPL 2026" },
          { href: "/cricket/news", label: "News" },
        ].map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="text-xs font-semibold px-4 py-2 rounded-full transition-colors hover:opacity-80"
            style={{ background: "#1A1A26", color: "#FFB800", border: "1px solid #2A2A3A" }}
          >
            {l.label}
          </Link>
        ))}
      </div>

      {/* Live section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold" style={{ color: "#F0EDE8", fontFamily: "var(--font-cricket-display, sans-serif)" }}>
            <span className="animate-pulse" style={{ color: "#FF3B3B" }}>●</span> Live Now
          </h2>
          <Link href="/cricket/live" className="text-xs" style={{ color: "#FFB800" }}>View all →</Link>
        </div>
        <LiveMatchGrid initialData={liveMatches} apiUrl="/api/cricket/live" pollIntervalMs={30_000} />
      </section>

      {/* Upcoming */}
      {upcomingMatches.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold" style={{ color: "#F0EDE8", fontFamily: "var(--font-cricket-display, sans-serif)" }}>Upcoming</h2>
            <Link href="/cricket/upcoming" className="text-xs" style={{ color: "#FFB800" }}>View all →</Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingMatches.map((m) => {
              const { LiveMatchCard } = require("@/components/cricket/LiveMatchCard");
              return <LiveMatchCard key={m.matchInfo.matchId} match={m} />;
            })}
          </div>
        </section>
      )}

      {/* Recent Results */}
      {recentMatches.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold" style={{ color: "#F0EDE8", fontFamily: "var(--font-cricket-display, sans-serif)" }}>Recent Results</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentMatches.map((m) => {
              const { LiveMatchCard } = require("@/components/cricket/LiveMatchCard");
              return <LiveMatchCard key={m.matchInfo.matchId} match={m} />;
            })}
          </div>
        </section>
      )}
    </div>
  );
}
```

> Note: Replace the inline `require()` with a proper import of `LiveMatchCard` at the top.

- [ ] **Step 2: Commit**
```bash
git add exam-portal/src/app/(cricket)/cricket/page.tsx
git commit -m "feat: add cricket hub page with live/upcoming/recent sections"
```

---

## Task 9: ICC Rankings Page (`/cricket/rankings`)

**Files:**
- Create: `exam-portal/src/app/(cricket)/cricket/rankings/page.tsx`

- [ ] **Step 1: Create rankings page**

```tsx
// exam-portal/src/app/(cricket)/cricket/rankings/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "ICC Cricket Rankings 2026 — Batsmen, Bowlers & All-rounders",
  description: "Current ICC cricket rankings for batsmen, bowlers and all-rounders across Test, ODI and T20I formats.",
};

const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.rizzjobs.in";
const FORMATS = ["test", "odi", "t20"] as const;
const CATEGORIES = ["batsmen", "bowlers", "allrounders"] as const;

interface RankEntry {
  id: string;
  rank: string;
  name: string;
  country: string;
  rating: string;
  trend?: string;
  faceImageId?: string;
  difference?: number;
}

async function fetchRankings(category: string, format: string): Promise<RankEntry[]> {
  try {
    const res = await fetch(`${base}/api/cricket/rankings?category=${category}&format=${format}`, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.rank ?? []) as RankEntry[];
  } catch {
    return [];
  }
}

export default async function RankingsPage({
  searchParams,
}: {
  searchParams: Promise<{ format?: string; category?: string }>;
}) {
  const sp = await searchParams;
  const format = FORMATS.includes(sp.format as typeof FORMATS[number]) ? (sp.format as typeof FORMATS[number]) : "test";
  const category = CATEGORIES.includes(sp.category as typeof CATEGORIES[number]) ? (sp.category as typeof CATEGORIES[number]) : "batsmen";

  const rankings = await fetchRankings(category, format);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-3xl font-bold" style={{ color: "#F0EDE8", fontFamily: "var(--font-cricket-display, sans-serif)" }}>
        ICC Rankings
      </h1>

      {/* Format tabs */}
      <div className="flex flex-wrap gap-2">
        {FORMATS.map((f) => (
          <Link
            key={f}
            href={`/cricket/rankings?format=${f}&category=${category}`}
            className="text-xs font-semibold px-4 py-2 rounded-full transition-colors"
            style={{
              background: format === f ? "#FFB800" : "#1A1A26",
              color: format === f ? "#0A0A0F" : "#9A96A0",
              border: "1px solid #2A2A3A",
            }}
          >
            {f.toUpperCase()}
          </Link>
        ))}
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <Link
            key={c}
            href={`/cricket/rankings?format=${format}&category=${c}`}
            className="text-xs font-semibold px-4 py-2 rounded-full transition-colors"
            style={{
              background: category === c ? "#FF6B00" : "#1A1A26",
              color: category === c ? "#F0EDE8" : "#9A96A0",
              border: "1px solid #2A2A3A",
            }}
          >
            {c.charAt(0).toUpperCase() + c.slice(1)}
          </Link>
        ))}
      </div>

      {/* Rankings table */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #2A2A3A" }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "#1A1A26", borderBottom: "1px solid #2A2A3A" }}>
              <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wide" style={{ color: "#5A566A" }}>Rank</th>
              <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wide" style={{ color: "#5A566A" }}>Player</th>
              <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wide" style={{ color: "#5A566A" }}>Country</th>
              <th className="px-4 py-3 text-right font-semibold text-xs uppercase tracking-wide" style={{ color: "#5A566A" }}>Rating</th>
              <th className="px-4 py-3 text-center font-semibold text-xs uppercase tracking-wide" style={{ color: "#5A566A" }}>Trend</th>
            </tr>
          </thead>
          <tbody>
            {rankings.slice(0, 50).map((r, i) => (
              <tr
                key={r.id}
                style={{ borderBottom: "1px solid #2A2A3A", background: i % 2 === 0 ? "#12121A" : "#0A0A0F" }}
              >
                <td className="px-4 py-3 font-bold text-sm w-12" style={{ color: Number(r.rank) <= 3 ? "#FFB800" : "#9A96A0" }}>
                  {r.rank}
                </td>
                <td className="px-4 py-3">
                  <Link href={`/ipl/players/${r.id}-${r.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`} className="flex items-center gap-2 hover:opacity-80">
                    {r.faceImageId && (
                      <div className="relative w-8 h-8 shrink-0 rounded-full overflow-hidden" style={{ background: "#1A1A26" }}>
                        <Image src={`/api/ipl/image?id=${r.faceImageId}&type=player`} alt={r.name} fill className="object-cover" unoptimized />
                      </div>
                    )}
                    <span className="font-semibold" style={{ color: "#F0EDE8" }}>{r.name}</span>
                  </Link>
                </td>
                <td className="px-4 py-3 text-sm" style={{ color: "#9A96A0" }}>{r.country}</td>
                <td className="px-4 py-3 text-right font-bold" style={{ color: "#FFB800" }}>{r.rating}</td>
                <td className="px-4 py-3 text-center text-xs" style={{ color: r.trend === "Up" ? "#22C55E" : r.trend === "Down" ? "#EF4444" : "#5A566A" }}>
                  {r.trend === "Up" ? "▲" : r.trend === "Down" ? "▼" : "—"}
                  {r.difference ? ` ${r.difference}` : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rankings.length === 0 && (
        <p className="text-center py-8 text-sm" style={{ color: "#5A566A" }}>Rankings not available.</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**
```bash
git add exam-portal/src/app/(cricket)/cricket/rankings/page.tsx
git commit -m "feat: add ICC rankings page with format and category tabs"
```

---

## Task 10: Cricket Records Page (`/cricket/records`)

**Files:**
- Create: `exam-portal/src/app/(cricket)/cricket/records/page.tsx`

- [ ] **Step 1: Create records page**

```tsx
// exam-portal/src/app/(cricket)/cricket/records/page.tsx
import type { Metadata } from "next";
import Link from "next/link";

export const revalidate = 86400;

const STATS_TYPES = [
  { value: "mostRuns", label: "Most Runs", category: "Batting" },
  { value: "highestScore", label: "Highest Score", category: "Batting" },
  { value: "highestAvg", label: "Best Average", category: "Batting" },
  { value: "mostHundreds", label: "Most Hundreds", category: "Batting" },
  { value: "mostSixes", label: "Most Sixes", category: "Batting" },
  { value: "mostWickets", label: "Most Wickets", category: "Bowling" },
  { value: "bestBowlingInnings", label: "Best Bowling", category: "Bowling" },
  { value: "lowestAvg", label: "Best Average", category: "Bowling" },
  { value: "mostFiveWickets", label: "Most 5-fors", category: "Bowling" },
] as const;

const MATCH_TYPES = [
  { id: "1", label: "Test" },
  { id: "2", label: "ODI" },
  { id: "3", label: "T20I" },
] as const;

const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.rizzjobs.in";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ statsType?: string; matchType?: string }>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const st = STATS_TYPES.find((s) => s.value === sp.statsType) ?? STATS_TYPES[0];
  const mt = MATCH_TYPES.find((m) => m.id === sp.matchType) ?? MATCH_TYPES[0];
  return {
    title: `${st.label} in ${mt.label} Cricket — All-Time Records`,
    description: `All-time cricket records: ${st.label} in ${mt.label} cricket. Complete list of record holders.`,
  };
}

export default async function RecordsPage({
  searchParams,
}: {
  searchParams: Promise<{ statsType?: string; matchType?: string }>;
}) {
  const sp = await searchParams;
  const statsType = sp.statsType ?? "mostRuns";
  const matchType = sp.matchType ?? "1";

  let data: { headers?: string[]; values?: { values: string[] }[] } = {};
  try {
    const res = await fetch(`${base}/api/cricket/records?statsType=${statsType}&matchType=${matchType}`, { next: { revalidate: 86400 } });
    if (res.ok) data = await res.json();
  } catch {/* ignore */}

  const headers = data.headers ?? [];
  const rows = data.values ?? [];
  // First element in values[] is playerId, second is name, rest are stats
  const statHeaders = headers.slice(1); // drop "Batsmen/Bowlers" header which is playerId

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-3xl font-bold" style={{ color: "#F0EDE8", fontFamily: "var(--font-cricket-display, sans-serif)" }}>
        Cricket Records
      </h1>

      {/* Format tabs */}
      <div className="flex flex-wrap gap-2">
        {MATCH_TYPES.map((m) => (
          <Link
            key={m.id}
            href={`/cricket/records?statsType=${statsType}&matchType=${m.id}`}
            className="text-xs font-semibold px-4 py-2 rounded-full"
            style={{
              background: matchType === m.id ? "#FFB800" : "#1A1A26",
              color: matchType === m.id ? "#0A0A0F" : "#9A96A0",
              border: "1px solid #2A2A3A",
            }}
          >
            {m.label}
          </Link>
        ))}
      </div>

      {/* Stats type tabs */}
      <div className="flex flex-wrap gap-2">
        {STATS_TYPES.map((s) => (
          <Link
            key={s.value}
            href={`/cricket/records?statsType=${s.value}&matchType=${matchType}`}
            className="text-xs font-semibold px-3 py-1.5 rounded-full"
            style={{
              background: statsType === s.value ? "#FF6B00" : "#1A1A26",
              color: statsType === s.value ? "#F0EDE8" : "#9A96A0",
              border: "1px solid #2A2A3A",
            }}
          >
            {s.label}
          </Link>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #2A2A3A" }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "#1A1A26", borderBottom: "1px solid #2A2A3A" }}>
              <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wide" style={{ color: "#5A566A" }}>#</th>
              <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wide" style={{ color: "#5A566A" }}>Player</th>
              {statHeaders.slice(1).map((h) => (
                <th key={h} className="px-4 py-3 text-right font-semibold text-xs uppercase tracking-wide" style={{ color: "#5A566A" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 50).map((row, i) => {
              const [playerId, name, ...stats] = row.values;
              return (
                <tr key={i} style={{ borderBottom: "1px solid #2A2A3A", background: i % 2 === 0 ? "#12121A" : "#0A0A0F" }}>
                  <td className="px-4 py-3 text-xs w-10" style={{ color: "#5A566A" }}>{i + 1}</td>
                  <td className="px-4 py-3">
                    <Link href={`/ipl/players/${playerId}`} className="font-semibold hover:opacity-80" style={{ color: "#F0EDE8" }}>
                      {name}
                    </Link>
                  </td>
                  {stats.map((s, j) => (
                    <td key={j} className="px-4 py-3 text-right font-bold" style={{ color: j === 0 ? "#FFB800" : "#9A96A0" }}>
                      {s}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {rows.length === 0 && <p className="text-center py-8 text-sm" style={{ color: "#5A566A" }}>Records not available.</p>}
    </div>
  );
}
```

- [ ] **Step 2: Commit**
```bash
git add exam-portal/src/app/(cricket)/cricket/records/page.tsx
git commit -m "feat: add cricket records page (Test/ODI/T20 batting & bowling)"
```

---

## Task 11: IPL Hub Commercial Redesign

**Files:**
- Modify: `exam-portal/src/app/(ipl)/ipl/page.tsx`
- Modify: `exam-portal/src/app/(ipl)/layout.tsx` (update colour variables)

**New IPL colour tokens:**
```
--ipl-bg-deep:    #0A0A0F
--ipl-bg-card:    #12121A  
--ipl-bg-raised:  #1A1A26
--ipl-border:     #2A2A3A
--ipl-gold:       #FFB800   ← Trophy gold (replaces #D4AF37)
--ipl-orange:     #FF6B00   ← Cricket ball (replaces #8BB0C8 teal)
--ipl-text-pri:   #F0EDE8   ← Warm white (replaces #E8E4DC)
--ipl-text-sec:   #9A96A0   ← (replaces #8BB0C8 and #6B86A0)
--ipl-text-dim:   #5A566A   ← (replaces #3A5470)
--ipl-live:       #FF3B3B
--ipl-green:      #22C55E
```

**IPL Hub sections (order + ad slots):**
1. Hero live match OR next match countdown
2. **[Ad slot 1 — leaderboard above fold]**
3. Points table (full, with form dots)
4. **[Ad slot 2 — in-feed between sections]**
5. Orange Cap top 5 + Purple Cap top 5 (side by side)
6. **[Ad slot 3 — in-feed]**
7. Latest News (8 articles, 2 columns)
8. Upcoming Matches (6)
9. Recent Results (4 mini scorecards)
10. Teams grid (10 teams)
11. **[Ad slot 4 — footer]**

- [ ] **Step 1: Update layout.tsx colour tokens**

In `exam-portal/src/app/(ipl)/layout.tsx`, update the body style:
```tsx
// Change the main wrapper div style:
style={{ background: "#0A0A0F", minHeight: "100vh", color: "#F0EDE8" }}
```

- [ ] **Step 2: Rewrite IPL hub page**

The complete new IPL hub page (`app/(ipl)/ipl/page.tsx`) uses:
- `background: "#0A0A0F"` (body)
- `background: "#12121A"` (cards)
- `background: "#1A1A26"` (section headers)
- `border: "1px solid #2A2A3A"` (borders)
- Gold `#FFB800` for headings and key stats
- Orange `#FF6B00` for secondary accents
- Live red `#FF3B3B` for live indicators
- Green `#22C55E` for wins, positive NRR

Key structural change: Replace the current 6-section layout with a richer 10-section layout. Fetch the same data from existing APIs but display more of it.

See full code in implementation.

- [ ] **Step 3: Commit**
```bash
git add exam-portal/src/app/(ipl)/
git commit -m "feat: redesign IPL hub with commercial dark-gold theme"
```

---

## Task 12: Sitemap & SEO Infrastructure

**Files:**
- Create: `exam-portal/src/app/sitemap.ts`
- Create: `exam-portal/src/app/robots.ts`

- [ ] **Step 1: Create robots.ts**

```typescript
// exam-portal/src/app/robots.ts
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: "https://www.rizzjobs.in/sitemap.xml",
  };
}
```

- [ ] **Step 2: Create sitemap.ts**

```typescript
// exam-portal/src/app/sitemap.ts
import type { MetadataRoute } from "next";
import { IPL_TEAMS } from "@/lib/cricbuzz";

const base = "https://www.rizzjobs.in";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const urls: MetadataRoute.Sitemap = [
    // Static pages
    { url: base, lastModified: now, changeFrequency: "hourly", priority: 1.0 },
    { url: `${base}/ipl`, lastModified: now, changeFrequency: "hourly", priority: 0.9 },
    { url: `${base}/ipl/points-table`, lastModified: now, changeFrequency: "hourly", priority: 0.8 },
    { url: `${base}/ipl/teams`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
    { url: `${base}/ipl/schedule`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
    { url: `${base}/ipl/orange-cap`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/ipl/purple-cap`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/ipl/news`, lastModified: now, changeFrequency: "hourly", priority: 0.7 },
    { url: `${base}/cricket`, lastModified: now, changeFrequency: "hourly", priority: 0.9 },
    { url: `${base}/cricket/rankings`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/cricket/records`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/cricket/news`, lastModified: now, changeFrequency: "hourly", priority: 0.7 },
    // Team pages
    ...Object.values(IPL_TEAMS).map((t) => ({
      url: `${base}/ipl/teams/${t.slug}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
  ];

  // IPL match pages from series-data
  try {
    const res = await fetch(`${base}/api/ipl/series-data`, { next: { revalidate: 3600 } });
    if (res.ok) {
      const data = await res.json();
      const matches = [
        ...(data.upcomingMatches ?? []),
        ...(data.recentMatches ?? []),
      ] as { matchId?: number }[];
      for (const m of matches) {
        if (m.matchId) {
          urls.push({ url: `${base}/ipl/match/${m.matchId}`, lastModified: now, changeFrequency: "hourly", priority: 0.8 });
        }
      }
    }
  } catch {/* ignore */}

  // Player pages from DB cache
  try {
    const { createServiceRoleClient } = await import("@/lib/supabase-server");
    const supabase = createServiceRoleClient();
    const { data: players } = await supabase.from("ipl_players").select("id, data");
    for (const p of players ?? []) {
      const name = (p.data as { name?: string })?.name ?? "";
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      urls.push({
        url: `${base}/ipl/players/${p.id}-${slug}`,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
  } catch {/* ignore */}

  // News pages
  try {
    const { createServiceRoleClient } = await import("@/lib/supabase-server");
    const supabase = createServiceRoleClient();
    const { data: news } = await supabase.from("ipl_news").select("id, updated_at");
    for (const n of news ?? []) {
      urls.push({
        url: `${base}/ipl/news/${n.id}`,
        lastModified: n.updated_at ? new Date(n.updated_at) : now,
        changeFrequency: "monthly",
        priority: 0.5,
      });
    }
  } catch {/* ignore */}

  return urls;
}
```

- [ ] **Step 3: Commit**
```bash
git add exam-portal/src/app/sitemap.ts exam-portal/src/app/robots.ts
git commit -m "feat: add dynamic sitemap.xml and robots.txt for SEO"
```

---

## Task 13: Update IPL Header Navigation

**Files:**
- Modify: `exam-portal/src/components/ipl/IplHeader.tsx`

- [ ] **Step 1: Add "Cricket" link to IPL header**

In `IplHeader.tsx`, add a "🏏 Cricket" link to the main nav items that links to `/cricket`. This lets IPL visitors discover the global cricket section.

- [ ] **Step 2: Commit**
```bash
git add exam-portal/src/components/ipl/IplHeader.tsx
git commit -m "feat: add cricket section link to IPL header nav"
```

---

## Self-Review

### Spec Coverage
- ✅ Global live scores (Tasks 2, 7, 8)
- ✅ Fewer API requests via DB caching (Task 1 getCached/setCached)
- ✅ ICC Rankings (Tasks 3, 9)
- ✅ Cricket Records (Tasks 4, 10)
- ✅ Global news (Task 5)
- ✅ IPL commercial redesign + new colour theme (Task 11)
- ✅ Sitemap for SEO (Task 12)
- ✅ Navigation connecting sections (Task 13)
- ✅ Database caching for all Cricbuzz responses

### Gaps / Follow-up (future sessions)
- Cricket news page (`/cricket/news`) — same as IPL news but with `/api/cricket/news`
- Cricket schedule page (`/cricket/schedule`) — uses `/schedule/v1/{type}`
- ICC Standings / WTC page
- Series stats page (extended orange/purple cap with more stat types)
- JSON-LD structured data on player/match/news pages
- IPL hub page full rewrite code (Task 11 Step 2 needs the complete page code)
