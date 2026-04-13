import { Rajdhani, Inter } from "next/font/google";
import CricketHeader from "@/components/cricket/CricketHeader";

const rajdhani = Rajdhani({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-cricket-display",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-cricket-stats",
  display: "swap",
});

export default function CricketLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${rajdhani.variable} ${inter.variable} min-h-screen`}
      style={{ background: "#0A0A0F", color: "#F0EDE8" }}
    >
      <CricketHeader />
      <main>{children}</main>
    </div>
  );
}
