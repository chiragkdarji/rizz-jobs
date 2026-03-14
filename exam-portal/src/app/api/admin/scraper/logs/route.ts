import { createServiceRoleClient } from "@/lib/supabase-server";
import { requireAdmin } from "@/lib/auth-helpers";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await requireAdmin();
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
      .from("scraper_runs")
      .select("*")
      .order("run_at", { ascending: false })
      .limit(30);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data || []);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
