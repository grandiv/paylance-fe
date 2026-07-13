import type { Metadata } from "next";
import { Jost, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/Toast";

const jost = Jost({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-jost",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Paylance — Ghost-proof payments for freelancers",
  description:
    "Deliver the work. Prove it. Get paid — automatically. Escrow protects the client, the clock protects you. Neutral, on-chain escrow for cross-border freelancers.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${jost.variable} ${inter.variable} ${jetbrainsMono.variable}`}
      >
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
