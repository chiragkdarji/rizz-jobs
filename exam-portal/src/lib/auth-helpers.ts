import { createServerSupabaseClient } from "./supabase-server";

/**
 * Get the current session user from a request context.
 * Returns the user object if authenticated, or null if not.
 * Use this in API routes to protect endpoints.
 */
export async function getSessionUser() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  } catch {
    return null;
  }
}

/**
 * Check if the current user is an admin.
 * An admin is anyone whose email matches the ADMIN_EMAIL env var.
 */
export async function isAdmin(): Promise<boolean> {
  const user = await getSessionUser();
  if (!user) return false;

  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    console.warn("ADMIN_EMAIL not set. No one can access admin routes.");
    return false;
  }

  return user.email === adminEmail;
}

/**
 * Middleware helper: require admin status.
 * Throws a 403 error if not admin.
 */
export async function requireAdmin() {
  const adminStatus = await isAdmin();
  if (!adminStatus) {
    throw new Error("Unauthorized: admin access required");
  }
}

/**
 * API route helper: require authentication.
 * Returns the user if authenticated, throws 401 if not.
 */
export async function requireAuth() {
  const user = await getSessionUser();
  if (!user) {
    throw new Error("Unauthorized: authentication required");
  }
  return user;
}
