const TABS = [
  { label: "All",      href: "/news" },
  { label: "Finance",  href: "/news/finance" },
  { label: "Business", href: "/news/business" },
  { label: "Markets",  href: "/news/markets" },
  { label: "Economy",  href: "/news/economy" },
  { label: "Startups", href: "/news/startups" },
];

export default function NewsCategoryTabs({ activeHref }: { activeHref: string }) {
  return (
    <div
      className="flex items-end gap-0 overflow-x-auto mb-8 scrollbar-hide"
      style={{ borderBottom: "1px solid #1e1e24" }}
    >
      {TABS.map((tab) => {
        const isActive = tab.href === activeHref;
        return (
          <a
            key={tab.href}
            href={tab.href}
            className="shrink-0 px-4 sm:px-5 pb-3 pt-1 text-xs font-bold uppercase tracking-[0.14em] transition-colors duration-200 whitespace-nowrap"
            style={{
              color: isActive ? "#f2ede6" : "#52505e",
              borderBottom: isActive ? "2px solid #f0a500" : "2px solid transparent",
              marginBottom: "-1px",
            }}
          >
            {tab.label}
          </a>
        );
      })}
    </div>
  );
}
