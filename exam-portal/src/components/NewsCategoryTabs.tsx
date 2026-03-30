const TABS = [
  { label: "All", href: "/news" },
  { label: "Finance", href: "/news/finance" },
  { label: "Business", href: "/news/business" },
  { label: "Markets", href: "/news/markets" },
  { label: "Economy", href: "/news/economy" },
  { label: "Startups", href: "/news/startups" },
];

export default function NewsCategoryTabs({ activeHref }: { activeHref: string }) {
  return (
    <div className="flex gap-2 flex-wrap mb-8">
      {TABS.map((tab) => (
        <a
          key={tab.href}
          href={tab.href}
          className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
            tab.href === activeHref
              ? "bg-indigo-600 border-indigo-500 text-white"
              : "bg-gray-900 border-gray-700 text-gray-400 hover:border-indigo-500/50 hover:text-white"
          }`}
        >
          {tab.label}
        </a>
      ))}
    </div>
  );
}
