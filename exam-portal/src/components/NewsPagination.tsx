'use client';
import Link from 'next/link';

export default function NewsPagination({
  currentPage,
  totalPages,
  basePath,
}: {
  currentPage: number;
  totalPages: number;
  basePath: string;
}) {
  if (totalPages <= 1) return null;

  const prevHref =
    currentPage === 2 ? basePath : `${basePath}?page=${currentPage - 1}`;
  const nextHref = `${basePath}?page=${currentPage + 1}`;

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-center gap-6 mt-14 pb-4"
    >
      {currentPage > 1 ? (
        <Link
          href={prevHref}
          className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.14em] transition-colors duration-200 px-4 py-3 min-h-[44px]"
          style={{ color: "#7c7888" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#f2ede6")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#7c7888")}
        >
          ← Prev
        </Link>
      ) : (
        <span className="opacity-0 pointer-events-none text-[13px] px-4 py-3">← Prev</span>
      )}

      <div className="flex items-center gap-1">
        <span className="text-[#f2ede6] text-[15px] font-bold">{currentPage}</span>
        <span className="text-[#7c7888] text-[13px] mx-1">/</span>
        <span className="text-[#7c7888] text-[15px]">{totalPages}</span>
      </div>

      {currentPage < totalPages ? (
        <Link
          href={nextHref}
          className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.14em] transition-colors duration-200 px-4 py-3 min-h-[44px]"
          style={{ color: "#7c7888" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#f2ede6")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#7c7888")}
        >
          Next →
        </Link>
      ) : (
        <span className="opacity-0 pointer-events-none text-[13px] px-4 py-3">Next →</span>
      )}
    </nav>
  );
}
