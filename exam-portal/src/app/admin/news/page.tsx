"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ExternalLink, Trash2, Eye, EyeOff, RefreshCw } from "lucide-react";

interface NewsArticle {
  id: string;
  slug: string;
  headline: string;
  category: string;
  source_name: string;
  published_at: string;
  is_published: boolean;
  view_count: number;
}

const CATEGORIES = ["", "finance", "business", "markets", "economy", "startups"];

export default function AdminNewsPage() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      pageSize: "20",
      sortBy: "published_at",
      sortOrder: "desc",
    });
    if (search) params.set("search", search);
    if (category) params.set("category", category);

    const res = await fetch(`/api/admin/news?${params}`);
    const data = await res.json();
    setArticles(data.articles ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, [page, search, category]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  const togglePublished = async (id: string, current: boolean) => {
    await fetch(`/api/admin/news/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_published: !current }),
    });
    fetchArticles();
  };

  const deleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} article(s)?`)) return;
    await fetch("/api/admin/news", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: Array.from(selectedIds) }),
    });
    setSelectedIds(new Set());
    fetchArticles();
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="relative z-10 p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-white mb-1">News Articles</h1>
          <p className="text-gray-400 text-sm">{total} total articles</p>
        </div>
        <div className="flex items-center gap-3">
          {selectedIds.size > 0 && (
            <button
              onClick={deleteSelected}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600/20 border border-red-500/30 text-red-400 text-sm hover:bg-red-600/30 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete ({selectedIds.size})
            </button>
          )}
          <button
            onClick={fetchArticles}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 text-sm hover:text-white transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <input
          type="text"
          placeholder="Search headlines..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="flex-1 min-w-48 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
        />
        <select
          value={category}
          onChange={(e) => { setCategory(e.target.value); setPage(1); }}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c} className="bg-gray-900">
              {c === "" ? "All categories" : c.charAt(0).toUpperCase() + c.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white/[0.02] border border-white/10 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left px-4 py-3 text-xs text-gray-500 font-bold uppercase tracking-wider w-8">
                <input
                  type="checkbox"
                  onChange={(e) => {
                    setSelectedIds(e.target.checked ? new Set(articles.map((a) => a.id)) : new Set());
                  }}
                  checked={selectedIds.size === articles.length && articles.length > 0}
                  className="accent-indigo-500"
                />
              </th>
              <th className="text-left px-4 py-3 text-xs text-gray-500 font-bold uppercase tracking-wider">Headline</th>
              <th className="text-left px-4 py-3 text-xs text-gray-500 font-bold uppercase tracking-wider w-24">Category</th>
              <th className="text-left px-4 py-3 text-xs text-gray-500 font-bold uppercase tracking-wider w-32">Source</th>
              <th className="text-left px-4 py-3 text-xs text-gray-500 font-bold uppercase tracking-wider w-28">Published</th>
              <th className="text-left px-4 py-3 text-xs text-gray-500 font-bold uppercase tracking-wider w-16">Views</th>
              <th className="text-left px-4 py-3 text-xs text-gray-500 font-bold uppercase tracking-wider w-24">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-gray-500">Loading...</td>
              </tr>
            ) : articles.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-gray-500">No articles found</td>
              </tr>
            ) : (
              articles.map((a) => (
                <tr key={a.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(a.id)}
                      onChange={() => toggleSelect(a.id)}
                      className="accent-indigo-500"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-white font-medium line-clamp-2 leading-snug">{a.headline}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-bold uppercase text-indigo-400 bg-indigo-900/30 px-2 py-0.5 rounded">
                      {a.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs truncate">{a.source_name}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(a.published_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{a.view_count}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => togglePublished(a.id, a.is_published)}
                        title={a.is_published ? "Unpublish" : "Publish"}
                        className="text-gray-500 hover:text-indigo-400 transition-colors"
                      >
                        {a.is_published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                      <Link
                        href={`/news/${a.slug}`}
                        target="_blank"
                        className="text-gray-500 hover:text-indigo-400 transition-colors"
                        title="View article"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={async () => {
                          if (!confirm("Delete this article?")) return;
                          await fetch(`/api/admin/news/${a.id}`, { method: "DELETE" });
                          fetchArticles();
                        }}
                        className="text-gray-500 hover:text-red-400 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > 20 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-gray-500">
            Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page * 20 >= total}
              className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
