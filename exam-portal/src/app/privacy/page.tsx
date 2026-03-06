import React from 'react';
import { ArrowLeft, Shield, Lock, Eye } from 'lucide-react';
import Link from 'next/link';

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-[#030712] text-white font-sans selection:bg-indigo-500/30">
            <div className="max-w-4xl mx-auto px-6 py-20">
                <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-12 transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Home
                </Link>

                <h1 className="text-4xl font-extrabold mb-8 bg-gradient-to-r from-white to-gray-500 bg-clip-text text-transparent">
                    Privacy Policy
                </h1>

                <p className="text-gray-400 mb-12 leading-relaxed">
                    Last updated: March 2026. Your privacy is important to us at Rizz Jobs.
                </p>

                <div className="space-y-12">
                    <section>
                        <div className="flex items-center gap-3 mb-4">
                            <Eye className="w-6 h-6 text-indigo-400" />
                            <h2 className="text-2xl font-bold">Information We Collect</h2>
                        </div>
                        <p className="text-gray-400 leading-relaxed">
                            Rizz Jobs is a public notification portal. We do not require you to create an account or provide personal information to browse the latest exam updates. We may collect anonymous usage data to improve our service.
                        </p>
                    </section>

                    <section>
                        <div className="flex items-center gap-3 mb-4">
                            <Shield className="w-6 h-6 text-indigo-400" />
                            <h2 className="text-2xl font-bold">How We Use Information</h2>
                        </div>
                        <p className="text-gray-400 leading-relaxed">
                            Any data collected is used solely for analyzing traffic trends and ensuring the platform remains stable. We do not sell or share any user data with third parties.
                        </p>
                    </section>

                    <section>
                        <div className="flex items-center gap-3 mb-4">
                            <Lock className="w-6 h-6 text-indigo-400" />
                            <h2 className="text-2xl font-bold">Security</h2>
                        </div>
                        <p className="text-gray-400 leading-relaxed">
                            We implement industry-standard security measures to protect the integrity of our platform and the data we present.
                        </p>
                    </section>
                </div>

                <footer className="mt-20 pt-12 border-t border-white/5 text-center text-sm text-gray-500">
                    © 2026 Rizz Jobs. All rights reserved.
                </footer>
            </div>
        </div>
    );
}
