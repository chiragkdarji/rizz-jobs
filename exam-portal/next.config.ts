import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "images.weserv.nl" },
      { protocol: "https", hostname: "cricbuzz-cricket.p.rapidapi.com" },
      { protocol: "https", hostname: "static.cricbuzz.com" },
      { protocol: "https", hostname: "cricbuzz-cricket.imgix.net" },
    ],
  },
  async redirects() {
    return [
      { source: "/news/ipl", destination: "/ipl", permanent: true },
      { source: "/news/ipl/:path*", destination: "/ipl/:path*", permanent: true },
    ];
  },
};

export default nextConfig;
