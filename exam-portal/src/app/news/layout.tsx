import NewsHeader from "@/components/NewsHeader";
import NewsFooter from "@/components/NewsFooter";

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
  publishingPrinciples: "https://rizzjobs.in/about",
  masthead: "https://rizzjobs.in/about",
  actionableFeedbackPolicy: "https://rizzjobs.in/contact",
  correctionsPolicy: "https://rizzjobs.in/about#corrections",
  sameAs: ["https://rizzjobs.in"],
};

export default function NewsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
      />
      <NewsHeader />
      {children}
      <NewsFooter />
    </>
  );
}
