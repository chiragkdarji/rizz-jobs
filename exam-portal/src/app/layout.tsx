import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "GovExams — Latest Government Job Updates & Exam Alerts",
  description: "Your trusted source for the latest government exam notifications, application deadlines, and recruitment updates. Stay informed about UPSC, SSC, Banking, Railway, and State-level exams across India.",
  keywords: ["government exams", "UPSC 2026", "SSC CGL updates", "exam alerts", "sarkari result", "government job notifications", "exam deadlines"],
  openGraph: {
    title: "GovExams — Latest Government Job Updates & Exam Alerts",
    description: "Your trusted source for government exam notifications, deadlines, and recruitment updates across India. UPSC, SSC, Banking & more.",
    url: "https://government-exams.vercel.app",
    siteName: "GovExams",
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
    title: "GovExams — Government Job Updates & Exam Alerts",
    description: "Never miss a government job notification. Get the latest exam dates, deadlines, and recruitment updates.",
    creator: "@govexams",
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
