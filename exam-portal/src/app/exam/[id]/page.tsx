"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import {
    ArrowLeft,
    Calendar,
    CreditCard,
    Users,
    GraduationCap,
    ClipboardCheck,
    ExternalLink,
    Zap,
    Clock,
    MapPin,
    Sparkles
} from "lucide-react";
import { motion } from "framer-motion";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

interface Notification {
    id: string;
    title: string;
    source: string;
    link: string;
    exam_date: string;
    deadline: string;
    ai_summary: string;
    details?: {
        what_is_the_update?: string;
        important_dates?: Record<string, string>;
        application_fee?: string;
        age_limit?: string;
        vacancies?: string;
        eligibility?: string;
        selection_process?: string;
        how_to_apply?: string;
    };
    screenshot_b64?: string;
    created_at: string;
}

export default function ExamDetail() {
    const { id } = useParams();
    const router = useRouter();
    const [exam, setExam] = useState<Notification | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchExam() {
            const { data, error } = await supabase
                .from("notifications")
                .select("*")
                .eq("id", id)
                .single();

            if (!error && data) {
                setExam(data);
            }
            setLoading(false);
        }
        fetchExam();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#030712] flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
            </div>
        );
    }

    if (!exam) {
        return (
            <div className="min-h-screen bg-[#030712] flex flex-col items-center justify-center text-white p-6">
                <h1 className="text-2xl font-bold mb-4">Exam not found</h1>
                <button onClick={() => router.push("/")} className="text-indigo-400 flex items-center gap-2 hover:underline">
                    <ArrowLeft className="w-4 h-4" /> Go Back
                </button>
            </div>
        );
    }

    const details = exam.details || {};

    return (
        <div className="min-h-screen bg-[#030712] text-white font-sans selection:bg-indigo-500/30">
            {/* Header */}
            <header className="sticky top-0 z-50 backdrop-blur-md border-b border-white/5 bg-gray-950/20">
                <div className="max-w-5xl mx-auto px-6 h-20 flex items-center justify-between">
                    <button onClick={() => router.push("/")} className="flex items-center gap-3 group">
                        <div className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center group-hover:bg-white/10 transition-all">
                            <ArrowLeft className="w-5 h-5 text-gray-400 group-hover:text-white" />
                        </div>
                        <span className="text-gray-400 font-medium group-hover:text-white hidden sm:inline">Back to Updates</span>
                    </button>

                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                            <Zap className="w-5 h-5 text-white" />
                        </div>
                        <p className="text-lg font-bold tracking-tight">GovExams</p>
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-6 py-12">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    {/* Hero Information */}
                    <div className="mb-12">
                        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-6 leading-tight">
                            {exam.title}
                        </h1>
                        <p className="text-xl text-gray-400 font-light leading-relaxed max-w-3xl">
                            {exam.ai_summary}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                        {/* Left Column: Details */}
                        <div className="lg:col-span-2 space-y-12 text-gray-300">

                            {/* What's the Update? (The ChatGPT style summary) */}
                            {details.what_is_the_update && (
                                <section>
                                    <div className="flex items-center gap-3 mb-6">
                                        <Sparkles className="w-6 h-6 text-indigo-400" />
                                        <h2 className="text-xl font-bold italic tracking-wide">Synthesized Update</h2>
                                    </div>
                                    <div className="p-8 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 border border-indigo-500/10 rounded-[2.5rem] text-lg font-light leading-relaxed text-gray-200">
                                        {details.what_is_the_update}
                                    </div>
                                </section>
                            )}

                            {/* Important Dates Table */}
                            {details.important_dates && (
                                <section>
                                    <div className="flex items-center gap-3 mb-6">
                                        <Calendar className="w-6 h-6 text-indigo-400" />
                                        <h2 className="text-xl font-bold">Important Dates</h2>
                                    </div>
                                    <div className="bg-white/[0.02] border border-white/5 rounded-3xl overflow-hidden">
                                        <table className="w-full text-left text-sm">
                                            <tbody>
                                                {Object.entries(details.important_dates).map(([key, val]) => (
                                                    <tr key={key} className="border-b border-white/5 last:border-0">
                                                        <td className="p-4 font-bold text-gray-400 w-1/3">{key}</td>
                                                        <td className="p-4 text-white">{val}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </section>
                            )}

                            {/* Application Fee */}
                            {details.application_fee && (
                                <section>
                                    <div className="flex items-center gap-3 mb-6">
                                        <CreditCard className="w-6 h-6 text-indigo-400" />
                                        <h2 className="text-xl font-bold">Application Fee</h2>
                                    </div>
                                    <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl whitespace-pre-wrap leading-relaxed">
                                        {details.application_fee}
                                    </div>
                                </section>
                            )}

                            {/* Vacancy Details */}
                            {details.vacancies && (
                                <section>
                                    <div className="flex items-center gap-3 mb-6">
                                        <Users className="w-6 h-6 text-indigo-400" />
                                        <h2 className="text-xl font-bold">Vacancy Details</h2>
                                    </div>
                                    <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl whitespace-pre-wrap leading-relaxed">
                                        {details.vacancies}
                                    </div>
                                </section>
                            )}

                            {/* Eligibility */}
                            {details.eligibility && (
                                <section>
                                    <div className="flex items-center gap-3 mb-6">
                                        <GraduationCap className="w-6 h-6 text-indigo-400" />
                                        <h2 className="text-xl font-bold">Eligibility & Criteria</h2>
                                    </div>
                                    <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl whitespace-pre-wrap leading-relaxed">
                                        {details.eligibility}
                                    </div>
                                </section>
                            )}

                            {/* Selection Process */}
                            {details.selection_process && (
                                <section>
                                    <div className="flex items-center gap-3 mb-6">
                                        <ClipboardCheck className="w-6 h-6 text-indigo-400" />
                                        <h2 className="text-xl font-bold">Selection Process</h2>
                                    </div>
                                    <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl whitespace-pre-wrap leading-relaxed">
                                        {details.selection_process}
                                    </div>
                                </section>
                            )}

                            {/* How to Apply */}
                            {details.how_to_apply && (
                                <section>
                                    <div className="flex items-center gap-3 mb-6">
                                        <Zap className="w-6 h-6 text-indigo-400" />
                                        <h2 className="text-xl font-bold">How to Apply</h2>
                                    </div>
                                    <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl whitespace-pre-wrap leading-relaxed">
                                        {details.how_to_apply}
                                    </div>
                                </section>
                            )}

                            {/* Official Screenshot */}
                            {exam.screenshot_b64 && (
                                <section>
                                    <div className="flex items-center gap-3 mb-6">
                                        <MapPin className="w-6 h-6 text-indigo-400" />
                                        <h2 className="text-xl font-bold">Official Site Preview</h2>
                                    </div>
                                    <div className="border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                                        <img
                                            src={`data:image/png;base64,${exam.screenshot_b64}`}
                                            alt="Official Notice Screenshot"
                                            className="w-full h-auto"
                                        />
                                    </div>
                                </section>
                            )}

                            {/* Fallback if no details found */}
                            {!details.important_dates && !details.application_fee && !details.vacancies && !details.eligibility && (
                                <section className="py-20 text-center bg-white/[0.02] border border-white/5 rounded-[3rem]">
                                    <div className="w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <Clock className="w-8 h-8 text-indigo-400" />
                                    </div>
                                    <h2 className="text-2xl font-bold mb-4">Detailed Information Pending</h2>
                                    <p className="text-gray-400 max-w-sm mx-auto mb-8 font-light">
                                        We are currently synthesizing the full details for this exam. You can check the official source or search for immediate updates.
                                    </p>
                                    <div className="flex flex-col sm:flex-row gap-4 justify-center px-6">
                                        <a
                                            href={exam.link}
                                            target="_blank"
                                            className="px-8 py-4 bg-white text-gray-950 rounded-2xl font-bold hover:bg-gray-200 transition-all"
                                        >
                                            Check Official Source
                                        </a>
                                        <a
                                            href={`https://www.google.com/search?q=${encodeURIComponent(exam.title + " notification 2026")}`}
                                            target="_blank"
                                            className="px-8 py-4 bg-white/5 border border-white/10 rounded-2xl font-bold hover:bg-white/10 transition-all"
                                        >
                                            Search Google
                                        </a>
                                    </div>
                                </section>
                            )}
                        </div>

                        {/* Right Column: Sidebar Actions */}
                        <div className="lg:col-span-1">
                            <div className="sticky top-32 space-y-6">
                                <div className="p-8 bg-indigo-600 rounded-[2.5rem] shadow-xl shadow-indigo-600/20">
                                    <h3 className="text-xl font-bold mb-4">Start Application</h3>
                                    <p className="text-indigo-100 text-sm mb-8 font-light">
                                        Apply before the deadline to ensure your registration is considered. Verified official link below.
                                    </p>
                                    <a
                                        href={exam.link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center gap-2 w-full py-4 bg-white text-indigo-600 rounded-2xl font-bold hover:bg-gray-100 transition-all shadow-lg"
                                    >
                                        Apply on Official Site
                                        <ExternalLink className="w-4 h-4" />
                                    </a>
                                </div>

                                <div className="p-6 bg-white/[0.03] border border-white/5 rounded-3xl">
                                    <div className="flex items-center gap-2 text-gray-400 mb-4">
                                        <Clock className="w-4 h-4" />
                                        <span className="text-xs font-bold uppercase tracking-widest">Update History</span>
                                    </div>
                                    <p className="text-sm text-gray-500">
                                        This notification was last updated on {new Date(exam.created_at).toLocaleDateString()}.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </main>

            <footer className="mt-20 border-t border-white/5 py-12 px-6">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <p className="text-sm text-gray-500">
                        © 2026 GovExams
                    </p>
                    <a href="/privacy" className="text-sm text-gray-500 hover:text-white transition-colors">Privacy Policy</a>
                </div>
            </footer>
        </div>
    );
}
