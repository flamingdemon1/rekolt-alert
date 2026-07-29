import type { Metadata } from "next";
import { Manrope, Sora } from "next/font/google";
import { LanguageProvider } from "./context/LanguageContext";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Rekolt Alert",
    template: "%s | Rekolt Alert",
  },
  description:
    "Alert agrikol ek meteo an direk pou protez bann rekolt dan Moris.",
  openGraph: {
    title: "Rekolt Alert — Gard nou rekolt an sekirite",
    description:
      "Alert lokal, meteo an direk ek vizibilite lor tou distrik Moris.",
    locale: "mfe_MU",
    type: "website",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="mfe">
      <body className={`${manrope.variable} ${sora.variable}`}>
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
