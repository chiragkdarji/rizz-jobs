import type { Metadata } from "next";
import Script from "next/script";
import { Inter, Playfair_Display, IBM_Plex_Sans, Cormorant_Garamond } from "next/font/google";
import "./globals.css";
import LayoutShell from "@/components/LayoutShell";
import { Analytics } from "@/components/Analytics";

const inter = Inter({ subsets: ["latin"] });

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["400", "500", "700"],
});

const ibmPlex = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-ui",
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-logo",
  display: "swap",
});

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID;

export const metadata: Metadata = {
  title: "Rizz Jobs - Latest Government Job Updates & Exam Alerts",
  description: "Your trusted source for the latest government exam notifications, application deadlines, and recruitment updates. Stay informed about UPSC, SSC, Banking, Railway, and State-level exams across India.",
  keywords: ["government exams", "UPSC 2026", "SSC CGL updates", "exam alerts", "sarkari result", "government job notifications", "exam deadlines"],
  openGraph: {
    title: "Rizz Jobs - Latest Government Job Updates & Exam Alerts",
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
    title: "Rizz Jobs - Government Job Updates & Exam Alerts",
    description: "Never miss a government job notification. Get the latest exam dates, deadlines, and recruitment updates.",
    creator: "@rizzjobs",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
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
      <body className={`${inter.className} ${playfair.variable} ${ibmPlex.variable} ${cormorant.variable}`}>
        {/* Global Site + Organization Schema — WebSite SearchAction enables Google Sitelinks Searchbox */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "WebSite",
                  "@id": "https://rizzjobs.in/#website",
                  "url": "https://rizzjobs.in",
                  "name": "Rizz Jobs",
                  "description": "Latest Indian Government Job Notifications, Exam Alerts & Recruitment Updates",
                  "inLanguage": "en-IN",
                  "potentialAction": {
                    "@type": "SearchAction",
                    "target": {
                      "@type": "EntryPoint",
                      "urlTemplate": "https://rizzjobs.in/?q={search_term_string}",
                    },
                    "query-input": "required name=search_term_string",
                  },
                },
                {
                  "@type": "Organization",
                  "@id": "https://rizzjobs.in/#organization",
                  "name": "Rizz Jobs",
                  "url": "https://rizzjobs.in",
                  "logo": {
                    "@type": "ImageObject",
                    "url": "https://rizzjobs.in/og-image.png",
                    "width": 1200,
                    "height": 630,
                  },
                  "sameAs": ["https://rizzjobs.in"],
                },
                {
                  "@type": "NewsMediaOrganization",
                  "@id": "https://rizzjobs.in/#newsmediaorganization",
                  "name": "Rizz Jobs",
                  "url": "https://rizzjobs.in",
                  "logo": {
                    "@type": "ImageObject",
                    "url": "https://rizzjobs.in/og-image.png",
                    "width": 1200,
                    "height": 630,
                  },
                  "publishingPrinciples": "https://rizzjobs.in/about",
                  "masthead": "https://rizzjobs.in/about",
                },
              ],
            }),
          }}
        />
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
