import type { Metadata } from "next";
import { Inter, Fraunces } from "next/font/google";
import "./globals.css";
import ClientAuthInitializer from "@/components/ClientAuthInitializer";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-fraunces",
  display: "swap",
});

// Loaded as a plain stylesheet rather than next/font because the design
// canvas needs the real family names (see lib/designFonts.ts).
const DESIGN_FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=Anton&family=Bebas+Neue&family=Bungee' +
  '&family=Caveat:wght@600&family=Lobster&family=Montserrat:wght@700&family=Oswald:wght@600' +
  '&family=Pacifico&family=Playfair+Display:wght@700&family=Righteous&display=swap';

export const metadata: Metadata = {
  title: "Threadloom — Design Your Own Clothing",
  description: "A made-to-order clothing studio where you design the garment yourself — type, style, color, print and placement — rendered with plain code, never a generative AI model.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable}`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={DESIGN_FONTS_HREF} />
      </head>
      <body className="bg-bg text-ink antialiased min-h-screen font-sans">
        <ClientAuthInitializer />
        {children}
      </body>
    </html>
  );
}
