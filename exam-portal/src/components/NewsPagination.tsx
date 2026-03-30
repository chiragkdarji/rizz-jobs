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
    <nav aria-label="Pagination" className="flex items-center justify-center gap-4 mt-12 pb-4">
      {currentPage > 1 ? (
        <Link
          href={prevHref}
          className="px-5 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm font-semibold text-white hover:border-indigo-500/50 transition-colors"
        >
          ← Previous
        </Link>
      ) : (
        <span className="px-5 py-2 opacity-0 pointer-events-none select-none">←</span>
      )}
      <span className="text-sm text-gray-500">
        Page {currentPage} of {totalPages}
      </span>
      {currentPage < totalPages ? (
        <Link
          href={nextHref}
          className="px-5 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm font-semibold text-white hover:border-indigo-500/50 transition-colors"
        >
          Next →
        </Link>
      ) : (
        <span className="px-5 py-2 opacity-0 pointer-events-none select-none">→</span>
      )}
    </nav>
  );
}
