import Link from "next/link";
import React from "react";
import { Sparkles } from "lucide-react";

const FOOTER_CATEGORIES = [
  { name: "UPSC / SSC", path: "/upsc-ssc" },
  { name: "Banking", path: "/banking" },
  { name: "Railway", path: "/railway" },
  { name: "Defense / Police", path: "/defense-police" },
  { name: "Teaching", path: "/teaching" },
  { name: "Engineering", path: "/engineering" },
  { name: "Medical", path: "/medical" },
  { name: "PSU", path: "/psu" },
  { name: "10th / 12th Pass", path: "/10th-12th-pass" },
  { name: "State Jobs", path: "/state-jobs" },
];

export default function Footer() {
    return (
        <div className="bg-[#030712] text-white font-sans">
            <footer className="mt-16 border-t border-white/5 pt-12 pb-8 px-6">
                <div className="max-w-7xl mx-auto">
                    {/* Top Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">
                        {/* Brand */}
                        <div>
                            <Link href="/" className="inline-flex items-center gap-2.5 mb-4 group">
                                <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 via-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                                    <Sparkles className="w-4 h-4 text-white" />
                                </div>
                                <span className="text-lg font-black tracking-tighter text-white italic">Rizz Jobs</span>
                            </Link>
                            <p className="text-sm text-gray-500 leading-relaxed max-w-xs">
                                India&apos;s most reliable source for government job notifications, exam alerts, and recruitment updates.
                            </p>
                        </div>

                        {/* Categories */}
                        <div className="md:col-span-2">
                            <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest mb-4">Job Categories</p>
                            <div className="flex flex-wrap gap-2">
                                {FOOTER_CATEGORIES.map((cat) => (
                                    <Link
                                        key={cat.path}
                                        href={cat.path}
                                        className="px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/5 text-xs text-gray-400 hover:text-white hover:border-indigo-500/20 transition-colors"
                                    >
                                        {cat.name}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Bottom Row */}
                    <div className="border-t border-white/5 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <p className="text-xs text-gray-600">
                            © 2026 Rizz Jobs. All rights reserved.
                        </p>
                        <div className="flex items-center gap-5 text-xs text-gray-600">
                            <Link href="/privacy" className="hover:text-gray-400 transition-colors">Privacy Policy</Link>
                            <Link href="/subscribe" className="hover:text-gray-400 transition-colors">Email Alerts</Link>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
