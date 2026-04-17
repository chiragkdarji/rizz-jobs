export function proxyNewsImage(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.includes('weserv.nl')) return url;
  return `https://images.weserv.nl/?url=${encodeURIComponent(url)}&w=800&output=webp&q=82`;
}
