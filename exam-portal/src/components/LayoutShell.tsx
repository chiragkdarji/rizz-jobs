"use client";

import { usePathname } from "next/navigation";
import Header from "./Header";
import Footer from "./Footer";

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");
  const isNews  = pathname?.startsWith("/news");

  return (
    <>
      {!isAdmin && !isNews && <Header />}
      {children}
      {!isAdmin && !isNews && <Footer />}
    </>
  );
}
