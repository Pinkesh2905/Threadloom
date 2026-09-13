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
      <body className="bg-bg text-ink antialiased min-h-screen font-sans">
        <ClientAuthInitializer />
        {children}
      </body>
    </html>
  );
}
