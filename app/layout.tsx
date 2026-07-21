import type { Metadata } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";
import { AppHeaderSlot } from "./_components/AppHeaderSlot";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const inter = Inter({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-inter"
});

export const metadata: Metadata = {
  title: "Simulateur de Draft NBA",
  description:
    "Simulez un ordre de draft NBA avec une lottery simplifiée et équitable."
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html className={inter.variable} lang="fr" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <main className="mx-auto w-[min(1240px,calc(100%-40px))] py-5 pb-10 max-[620px]:w-[min(100%-16px,1240px)] max-[620px]:pt-2.5">
            <AppHeaderSlot />
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
