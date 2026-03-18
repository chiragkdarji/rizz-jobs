"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  NotebookText,
  Mail,
  Zap,
  Clock,
  ExternalLink,
  ChevronRight,
  ScrollText,
  PlusCircle,
} from "lucide-react";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/notifications/new", label: "Add Notification", icon: PlusCircle, exact: true },
  { href: "/admin/notifications", label: "Notifications", icon: NotebookText },
  { href: "/admin/subscribers", label: "Subscribers", icon: Mail },
  { href: "/admin/scraper", label: "Trigger Scraper", icon: Zap, exact: true },
  { href: "/admin/scraper-logs", label: "Scraper Logs", icon: ScrollText },
  { href: "/admin/digest", label: "Email Digest", icon: Clock },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    // Don't activate a prefix match if an exact-nav item owns this path
    const exactOwner = NAV.some((n) => n.exact && pathname === n.href);
    if (exactOwner) return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-[#030712] text-white font-sans flex">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r border-white/10 flex flex-col sticky top-0 h-screen">
        {/* Logo */}
        <div className="px-4 py-5 border-b border-white/10">
          <p className="text-xs font-black uppercase tracking-widest text-indigo-400 mb-0.5">Rizz Jobs</p>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Admin Panel</p>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(({ href, label, icon: Icon, exact }) => {
            const active = isActive(href, exact);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${
                  active
                    ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${active ? "text-indigo-400" : "text-gray-500 group-hover:text-gray-300"}`} />
                {label}
                {active && <ChevronRight className="w-3 h-3 ml-auto text-indigo-400" />}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-white/10">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            View Site
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0 relative">
        {/* Background Glow */}
        <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full" />
        </div>
        {children}
      </div>
    </div>
  );
}
