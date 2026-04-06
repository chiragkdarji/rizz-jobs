"use client";

import { usePathname } from "next/navigation";
import Header from "./Header";
import Footer from "./Footer";

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");
  const isNews  = pathname?.startsWith("/news");
  const isIpl   = pathname?.startsWith("/ipl");

  return (
    <>
      {!isAdmin && !isNews && !isIpl && <Header />}
      {children}
      {!isAdmin && !isNews && !isIpl && <Footer />}
    </>
  );
}
