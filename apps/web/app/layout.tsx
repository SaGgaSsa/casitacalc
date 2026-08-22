import type { Metadata } from "next";
import { Hanken_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import { AppShell } from "@/components/app-shell";
import { getAdminSession } from "@/lib/admin";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const hankenGrotesk = Hanken_Grotesk({
  variable: "--font-heading",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "CasitaCalc — Calculadora de materiales",
  description:
    "Calculá los materiales necesarios para construir tu vivienda y ajustá los precios según tu zona.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const admin = await getAdminSession();
  return (
    <html
      lang="es"
      className={`${inter.variable} ${hankenGrotesk.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AppShell isAdmin={admin !== null}>{children}</AppShell>
      </body>
    </html>
  );
}
