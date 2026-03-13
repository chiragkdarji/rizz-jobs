import { createServerClient } from "@supabase/ssr";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const ALLOWED_REDIRECT_PATHS = ["/", "/dashboard", "/dashboard/settings", "/admin"];

function getSafeRedirectPath(raw: string | null): string {
  if (!raw) return "/";
  // Must start with / and not contain protocol (e.g. //evil.com or http://)
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes(":")) return "/";
  // Only allow known prefixes
  const allowed = ALLOWED_REDIRECT_PATHS.some(
    (p) => raw === p || raw.startsWith(p + "/")
  );
  return allowed ? raw : "/";
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const redirectTo = getSafeRedirectPath(searchParams.get("redirect_to"));

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    });

    const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && sessionData.user) {
      const user = sessionData.user;
      const displayName = (user.user_metadata?.display_name as string | undefined)?.trim();

      // Save display_name from signup metadata into profiles table
      if (displayName) {
        try {
          const serviceClient = createServiceRoleClient();
          await serviceClient
            .from("profiles")
            .update({ display_name: displayName })
            .eq("id", user.id);
        } catch {
          // Non-fatal — profile will show email as fallback
        }
      }

      return NextResponse.redirect(new URL(redirectTo, request.url));
    }
  }

  // Return the user to the auth page if there was an error
  return NextResponse.redirect(
    new URL("/auth/login?error=auth-callback-error", request.url)
  );
}
