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
          className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] transition-colors duration-200"
          style={{ color: "#52505e" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#f2ede6")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#52505e")}
        >
          ← Prev
        </Link>
      ) : (
        <span className="opacity-0 pointer-events-none text-xs">← Prev</span>
      )}

      <div className="flex items-center gap-1">
        <span className="text-[#f2ede6] text-sm font-bold">{currentPage}</span>
        <span className="text-[#3a3848] text-xs mx-1">/</span>
        <span className="text-[#52505e] text-sm">{totalPages}</span>
      </div>

      {currentPage < totalPages ? (
        <Link
          href={nextHref}
          className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] transition-colors duration-200"
          style={{ color: "#52505e" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#f2ede6")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#52505e")}
        >
          Next →
        </Link>
      ) : (
        <span className="opacity-0 pointer-events-none text-xs">Next →</span>
      )}
    </nav>
  );
}
