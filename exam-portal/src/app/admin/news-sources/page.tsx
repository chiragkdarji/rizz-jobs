"use client";

import { useEffect, useState } from "react";
import { Trash2, Plus, ToggleLeft, ToggleRight, RefreshCw } from "lucide-react";

interface NewsSource {
  id: string;
  name: string;
  rss_url: string;
  category: string;
  is_active: boolean;
  created_at: string;
}

const CATEGORIES = ["finance", "business", "markets", "economy", "startups"];

export default function AdminNewsSourcesPage() {
  const [sources, setSources] = useState<NewsSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [rssUrl, setRssUrl] = useState("");
  const [category, setCategory] = useState("finance");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  const fetchSources = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/news-sources");
    const data = await res.json();
    setSources(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchSources();
  }, []);

  const addSource = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    setError("");
    const res = await fetch("/api/admin/news-sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, rss_url: rssUrl, category }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to add source");
    } else {
      setName("");
      setRssUrl("");
      setCategory("finance");
      fetchSources();
    }
    setAdding(false);
  };

  const toggleActive = async (id: string, current: boolean) => {
    await fetch("/api/admin/news-sources", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, is_active: !current }),
    });
    fetchSources();
  };

  const deleteSource = async (id: string, sourceName: string) => {
    if (!confirm(`Delete "${sourceName}"?`)) return;
    await fetch("/api/admin/news-sources", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetchSources();
  };

  return (
    <div className="relative z-10 p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-white mb-1">News Sources</h1>
          <p className="text-gray-400 text-sm">Manage RSS feeds for the news scraper</p>
        </div>
        <button
          onClick={fetchSources}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 text-sm hover:text-white transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Sources table */}
      <div className="bg-white/[0.02] border border-white/10 rounded-xl overflow-hidden mb-8">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left px-4 py-3 text-xs text-gray-500 font-bold uppercase tracking-wider">Name</th>
              <th className="text-left px-4 py-3 text-xs text-gray-500 font-bold uppercase tracking-wider">RSS URL</th>
              <th className="text-left px-4 py-3 text-xs text-gray-500 font-bold uppercase tracking-wider w-24">Category</th>
              <th className="text-left px-4 py-3 text-xs text-gray-500 font-bold uppercase tracking-wider w-20">Active</th>
              <th className="text-left px-4 py-3 text-xs text-gray-500 font-bold uppercase tracking-wider w-16">Delete</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center py-10 text-gray-500">Loading...</td>
              </tr>
            ) : sources.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-10 text-gray-500">No sources yet</td>
              </tr>
            ) : (
              sources.map((s) => (
                <tr key={s.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="px-4 py-3 text-white font-medium">{s.name}</td>
                  <td className="px-4 py-3">
                    <a
                      href={s.rss_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-400 hover:underline text-xs font-mono truncate block max-w-xs"
                    >
                      {s.rss_url}
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-bold uppercase text-indigo-400 bg-indigo-900/30 px-2 py-0.5 rounded">
                      {s.category}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(s.id, s.is_active)}
                      title={s.is_active ? "Deactivate" : "Activate"}
                      className="transition-colors"
                    >
                      {s.is_active ? (
                        <ToggleRight className="w-5 h-5 text-green-400" />
                      ) : (
                        <ToggleLeft className="w-5 h-5 text-gray-600" />
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => deleteSource(s.id, s.name)}
                      className="text-gray-500 hover:text-red-400 transition-colors"
                      title="Delete source"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add new source form */}
      <div className="bg-white/[0.02] border border-white/10 rounded-xl p-6">
        <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4 text-indigo-400" />
          Add RSS Source
        </h2>
        {error && (
          <p className="mb-4 text-sm text-red-400 bg-red-900/20 border border-red-500/30 rounded-lg px-4 py-2">
            {error}
          </p>
        )}
        <form onSubmit={addSource} className="flex gap-3 flex-wrap">
          <input
            type="text"
            placeholder="Source name (e.g. Economic Times)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="flex-1 min-w-48 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          />
          <input
            type="url"
            placeholder="RSS feed URL"
            value={rssUrl}
            onChange={(e) => setRssUrl(e.target.value)}
            required
            className="flex-1 min-w-64 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c} className="bg-gray-900">
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={adding}
            className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold disabled:opacity-50 transition-colors"
          >
            {adding ? "Adding..." : "Add Source"}
          </button>
        </form>
      </div>
    </div>
  );
}
