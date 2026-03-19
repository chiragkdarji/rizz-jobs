"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Trash2, Edit2, Check, X, Zap, Tag, ArrowLeft } from "lucide-react";

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  tagline: string;
  keywords: string[];
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

const emptyForm = {
  name: "",
  slug: "",
  description: "",
  tagline: "",
  keywords: "",
  sort_order: "0",
};

export default function CategoriesAdmin() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add form
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState(emptyForm);
  const [adding, setAdding] = useState(false);

  // Edit inline
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<typeof emptyForm & { is_active: boolean }>>({});
  const [saving, setSaving] = useState(false);

  // Backfill
  const [backfillingId, setBackfillingId] = useState<string | null>(null);
  const [backfillResult, setBackfillResult] = useState<Record<string, { updated: number; skipped: number }>>({});

  // Deleting
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchCategories = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/admin/categories");
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      const data = await res.json();
      setCategories(data.categories);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchCategories(); }, []);

  // Auto-generate slug from name
  const handleNameChange = (name: string, target: "add" | "edit") => {
    const slug = name.toLowerCase().replace(/\s*\/\s*/g, "-").replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    if (target === "add") {
      setAddForm((f) => ({ ...f, name, slug }));
    } else {
      setEditForm((f) => ({ ...f, name, slug }));
    }
  };

  const handleAdd = async () => {
    if (!addForm.name.trim() || !addForm.slug.trim()) return;
    setAdding(true);
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...addForm, keywords: addForm.keywords }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      setAddForm(emptyForm);
      setShowAddForm(false);
      await fetchCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add");
    } finally {
      setAdding(false);
    }
  };

  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditForm({
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      tagline: cat.tagline,
      keywords: cat.keywords.join(", "),
      sort_order: String(cat.sort_order),
      is_active: cat.is_active,
    });
  };

  const handleSave = async (id: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      setEditingId(null);
      await fetchCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this category? This will NOT remove it from existing notifications.")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      await fetchCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeletingId(null);
    }
  };

  const handleBackfill = async (id: string) => {
    setBackfillingId(id);
    try {
      const res = await fetch(`/api/admin/categories/${id}/backfill`, { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      const data = await res.json();
      setBackfillResult((prev) => ({ ...prev, [id]: { updated: data.updated, skipped: data.skipped } }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Backfill failed");
    } finally {
      setBackfillingId(null);
    }
  };

  const inputClass = "bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 w-full";

  return (
    <div className="min-h-screen bg-[#030712] text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-gray-400 hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-black flex items-center gap-2">
                <Tag className="w-6 h-6 text-indigo-400" />
                Categories
              </h1>
              <p className="text-gray-400 text-sm mt-1">Manage exam categories, keywords, and auto-tagging</p>
            </div>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm font-bold transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Category
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
            {error}
            <button onClick={() => setError(null)} className="ml-2 underline">dismiss</button>
          </div>
        )}

        {/* Add Form */}
        {showAddForm && (
          <div className="mb-6 p-6 bg-white/[0.03] border border-indigo-500/30 rounded-2xl">
            <h2 className="text-lg font-bold mb-4 text-indigo-400">Add New Category</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Name *</label>
                <input
                  className={inputClass}
                  placeholder="e.g. State Jobs"
                  value={addForm.name}
                  onChange={(e) => handleNameChange(e.target.value, "add")}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Slug *</label>
                <input
                  className={inputClass}
                  placeholder="e.g. state-jobs"
                  value={addForm.slug}
                  onChange={(e) => setAddForm((f) => ({ ...f, slug: e.target.value }))}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs text-gray-400 mb-1">Description</label>
                <input
                  className={inputClass}
                  placeholder="Short heading shown on category page"
                  value={addForm.description}
                  onChange={(e) => setAddForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs text-gray-400 mb-1">Tagline</label>
                <input
                  className={inputClass}
                  placeholder="One-line marketing copy for category page"
                  value={addForm.tagline}
                  onChange={(e) => setAddForm((f) => ({ ...f, tagline: e.target.value }))}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs text-gray-400 mb-1">
                  Keywords <span className="text-gray-500">(comma-separated — used for auto-tagging)</span>
                </label>
                <input
                  className={inputClass}
                  placeholder="bank, ibps, sbi, rbi, po, clerk"
                  value={addForm.keywords}
                  onChange={(e) => setAddForm((f) => ({ ...f, keywords: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Sort Order</label>
                <input
                  type="number"
                  className={inputClass}
                  value={addForm.sort_order}
                  onChange={(e) => setAddForm((f) => ({ ...f, sort_order: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleAdd}
                disabled={adding}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg text-sm font-bold"
              >
                {adding ? "Adding…" : "Add Category"}
              </button>
              <button
                onClick={() => { setShowAddForm(false); setAddForm(emptyForm); }}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm font-bold"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        {isLoading ? (
          <div className="text-center py-20 text-gray-400">Loading…</div>
        ) : (
          <div className="rounded-2xl overflow-hidden border border-white/10">
            <table className="w-full text-sm">
              <thead className="bg-white/[0.03] border-b border-white/10">
                <tr>
                  <th className="px-4 py-3 text-left font-bold text-gray-400 w-8">#</th>
                  <th className="px-4 py-3 text-left font-bold">Name / Slug</th>
                  <th className="px-4 py-3 text-left font-bold hidden lg:table-cell">Keywords</th>
                  <th className="px-4 py-3 text-left font-bold hidden md:table-cell">Status</th>
                  <th className="px-4 py-3 text-right font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {categories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-white/[0.02]">
                    {editingId === cat.id ? (
                      // --- Edit row ---
                      <td colSpan={5} className="px-4 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Name</label>
                            <input
                              className={inputClass}
                              value={editForm.name || ""}
                              onChange={(e) => handleNameChange(e.target.value, "edit")}
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Slug</label>
                            <input
                              className={inputClass}
                              value={editForm.slug || ""}
                              onChange={(e) => setEditForm((f) => ({ ...f, slug: e.target.value }))}
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Description</label>
                            <input
                              className={inputClass}
                              value={editForm.description || ""}
                              onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Tagline</label>
                            <input
                              className={inputClass}
                              value={editForm.tagline || ""}
                              onChange={(e) => setEditForm((f) => ({ ...f, tagline: e.target.value }))}
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-xs text-gray-400 mb-1">Keywords (comma-separated)</label>
                            <input
                              className={inputClass}
                              value={editForm.keywords || ""}
                              onChange={(e) => setEditForm((f) => ({ ...f, keywords: e.target.value }))}
                            />
                          </div>
                          <div className="flex items-center gap-4">
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Sort Order</label>
                              <input
                                type="number"
                                className={inputClass + " w-24"}
                                value={editForm.sort_order || "0"}
                                onChange={(e) => setEditForm((f) => ({ ...f, sort_order: e.target.value }))}
                              />
                            </div>
                            <div className="mt-4">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={editForm.is_active ?? true}
                                  onChange={(e) => setEditForm((f) => ({ ...f, is_active: e.target.checked }))}
                                  className="w-4 h-4 accent-indigo-500"
                                />
                                <span className="text-sm">Active</span>
                              </label>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => handleSave(cat.id)}
                            disabled={saving}
                            className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg text-xs font-bold"
                          >
                            <Check className="w-3.5 h-3.5" />
                            {saving ? "Saving…" : "Save"}
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-bold"
                          >
                            <X className="w-3.5 h-3.5" />
                            Cancel
                          </button>
                        </div>
                      </td>
                    ) : (
                      // --- View row ---
                      <>
                        <td className="px-4 py-4 text-gray-500 font-mono">{cat.sort_order}</td>
                        <td className="px-4 py-4">
                          <p className="font-bold">{cat.name}</p>
                          <p className="text-gray-500 text-xs font-mono">/{cat.slug}</p>
                          {cat.description && (
                            <p className="text-gray-400 text-xs mt-0.5 line-clamp-1">{cat.description}</p>
                          )}
                        </td>
                        <td className="px-4 py-4 hidden lg:table-cell">
                          <div className="flex flex-wrap gap-1 max-w-sm">
                            {(cat.keywords || []).slice(0, 6).map((kw) => (
                              <span key={kw} className="px-1.5 py-0.5 bg-white/5 rounded text-xs text-gray-400 font-mono">
                                {kw}
                              </span>
                            ))}
                            {cat.keywords.length > 6 && (
                              <span className="text-xs text-gray-500">+{cat.keywords.length - 6}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 hidden md:table-cell">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${cat.is_active ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                            {cat.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-end gap-2">
                            {backfillResult[cat.id] && (
                              <span className="text-xs text-emerald-400 font-mono">
                                +{backfillResult[cat.id].updated} tagged
                              </span>
                            )}
                            <button
                              onClick={() => handleBackfill(cat.id)}
                              disabled={backfillingId === cat.id}
                              title="Keyword-backfill existing notifications"
                              className="flex items-center gap-1 px-2 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded-lg text-amber-400 text-xs font-bold disabled:opacity-50 transition-colors"
                            >
                              <Zap className="w-3 h-3" />
                              {backfillingId === cat.id ? "Running…" : "Backfill"}
                            </button>
                            <button
                              onClick={() => startEdit(cat)}
                              className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(cat.id)}
                              disabled={deletingId === cat.id}
                              className="p-1.5 hover:bg-red-500/10 rounded-lg text-gray-500 hover:text-red-400 disabled:opacity-50 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
                {categories.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
                      No categories yet. Add one above.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-xs text-gray-600 mt-4">
          <strong className="text-gray-500">Backfill</strong> scans all active notifications and auto-tags any that match the category keywords.
          New scraper runs auto-assign categories based on these keywords dynamically.
        </p>
      </div>
    </div>
  );
}
