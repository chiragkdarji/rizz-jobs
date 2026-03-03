import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "GovExam.ai | Autonomous Government Exam Updates & Alerts",
  description: "Get real-time, AI-verified government exam notifications, dates, and deadlines with GovExam.ai. The most authoritative source for UPSC, SSC, and Banking exams.",
  keywords: ["government exams", "UPSC 2026", "SSC CGL updates", "exam alerts", "sarkari result", "automated exam updates"],
  openGraph: {
    title: "GovExam.ai | 100% Automated Exam Updates",
    description: "Real-time AI alerts for all major government exams.",
    url: "https://govexam.ai",
    siteName: "GovExam.ai",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
      },
    ],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "GovExam.ai | AI-Verified Exam Alerts",
    description: "Never miss a government job notification with 100% automation.",
    creator: "@govexam_ai",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
