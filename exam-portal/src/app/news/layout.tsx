import NewsHeader from "@/components/NewsHeader";
import NewsFooter from "@/components/NewsFooter";
import MarketTicker from "@/components/MarketTicker";
import BreakingNewsBanner from "@/components/BreakingNewsBanner";
import HeadlineTicker from "@/components/HeadlineTicker";
import BackToTop from "@/components/BackToTop";

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
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
      />
      <BreakingNewsBanner />
      <MarketTicker />
      <NewsHeader />
      <HeadlineTicker />
      {children}
      <NewsFooter />
      <BackToTop />
    </>
  );
}
