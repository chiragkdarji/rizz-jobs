import { Rajdhani, Inter } from "next/font/google";
import IplHeader from "@/components/ipl/IplHeader";
import IplFooter from "@/components/ipl/IplFooter";

const rajdhani = Rajdhani({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-ipl-display",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-ipl-stats",
  display: "swap",
});

export default function IplLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${rajdhani.variable} ${inter.variable} min-h-screen`}
      style={{ background: "#010D1A", color: "#E8E4DC" }}
    >
      <IplHeader />
      <main>{children}</main>
      <IplFooter />
    </div>
  );
}
