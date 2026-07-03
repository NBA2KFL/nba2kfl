import type { Metadata } from "next";
import type { ReactNode } from "react";
import { StackProvider, StackTheme } from "@stackframe/stack";
import { stackServerApp } from "../stack/server";
import "./globals.css";

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
    <html lang="fr">
      <body>
        <StackProvider app={stackServerApp}>
          <StackTheme>{children}</StackTheme>
        </StackProvider>
      </body>
    </html>
  );
}
