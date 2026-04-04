import { Playfair_Display, IBM_Plex_Sans } from "next/font/google";
import NewsHeader from "@/components/NewsHeader";
import NewsFooter from "@/components/NewsFooter";
import MarketTicker from "@/components/MarketTicker";
import BreakingNewsBanner from "@/components/BreakingNewsBanner";
import FiiDiiBar from "@/components/FiiDiiBar";
import CryptoTicker from "@/components/CryptoTicker";
import HeadlineTicker from "@/components/HeadlineTicker";
import BackToTop from "@/components/BackToTop";

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

const orgSchema = {
  "@context": "https://schema.org",
  "@type": "NewsMediaOrganization",
  "@id": "https://rizzjobs.in/#newsmediaorganization",
  name: "Rizz Jobs",
  url: "https://rizzjobs.in",
  logo: {
    "@type": "ImageObject",
    url: "https://rizzjobs.in/logo.png",
    width: 512,
    height: 512,
  },
  foundingDate: "2024",
  publishingPrinciples: "https://rizzjobs.in/news/about",
  masthead: "https://rizzjobs.in/news/about",
  actionableFeedbackPolicy: "https://rizzjobs.in/news/contact",
  correctionsPolicy: "https://rizzjobs.in/news/disclaimer",
  sameAs: ["https://rizzjobs.in"],
};

export default function NewsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${playfair.variable} ${ibmPlex.variable}`}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
      />
      <BreakingNewsBanner />
      <MarketTicker />
      <FiiDiiBar />
      <CryptoTicker />
      <NewsHeader />
      <HeadlineTicker />
      {children}
      <NewsFooter />
      <BackToTop />
    </div>
  );
}
