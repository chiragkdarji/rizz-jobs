"use client";

import { Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

export function SearchInput() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentQuery = searchParams.get("q") || "";

  const handleSearch = (value: string) => {
    if (value) {
      router.push(`/?q=${encodeURIComponent(value)}`);
    } else {
      router.push("/");
    }
  };

  return (
    <div className="flex-1 max-w-md mx-8 hidden sm:block relative">
      <input
        type="text"
        placeholder="Search exams..."
        defaultValue={currentQuery}
        onChange={(e) => handleSearch(e.target.value)}
        className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 transition-all"
      />
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
    </div>
  );
}
