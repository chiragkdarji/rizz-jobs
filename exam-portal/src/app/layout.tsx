import type { Metadata } from "next";
import Script from "next/script";
import { Inter } from "next/font/google";
import "./globals.css";
import LayoutShell from "@/components/LayoutShell";
import { Analytics } from "@/components/Analytics";

const inter = Inter({ subsets: ["latin"] });
const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID;

export const metadata: Metadata = {
  title: "Rizz Jobs — Latest Government Job Updates & Exam Alerts",
  description: "Your trusted source for the latest government exam notifications, application deadlines, and recruitment updates. Stay informed about UPSC, SSC, Banking, Railway, and State-level exams across India.",
  keywords: ["government exams", "UPSC 2026", "SSC CGL updates", "exam alerts", "sarkari result", "government job notifications", "exam deadlines"],
  openGraph: {
    title: "Rizz Jobs — Latest Government Job Updates & Exam Alerts",
    description: "Your trusted source for government exam notifications, deadlines, and recruitment updates across India. UPSC, SSC, Banking & more.",
    url: "https://rizzjobs.in",
    siteName: "Rizz Jobs",
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
    title: "Rizz Jobs — Government Job Updates & Exam Alerts",
    description: "Never miss a government job notification. Get the latest exam dates, deadlines, and recruitment updates.",
    creator: "@rizzjobs",
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
      {GTM_ID && (
        <Script
          id="gtm-script"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','${GTM_ID}');`,
          }}
        />
      )}
      <body className={inter.className}>
        {GTM_ID && (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
              height="0"
              width="0"
              style={{ display: "none", visibility: "hidden" }}
            />
          </noscript>
        )}
        <Analytics />
        <LayoutShell>
          {children}
        </LayoutShell>
      </body>
    </html>
  );
}
