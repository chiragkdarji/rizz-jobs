/**
 * Proxy external news images through weserv.nl for WebP conversion + resizing.
 * Supabase-hosted and already-proxied images are returned unchanged.
 */
export function proxyNewsImage(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.includes('supabase.co') || url.includes('weserv.nl')) return url;
  return `https://images.weserv.nl/?url=${encodeURIComponent(url)}&w=800&output=webp&q=82`;
}
