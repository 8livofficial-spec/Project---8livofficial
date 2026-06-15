import type { Metadata } from "next";
import { Inter, Sora } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "8Liv - Wellness Wherever You Are",
  description: "Premium concierge telehealth platform connecting patients with board-certified clinicians.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${sora.variable} h-full antialiased`}
    >
      <body className={`min-h-full flex flex-col font-sans bg-[#0A0A0F] text-[#F8FAFC]`}>{children}</body>
    </html>
  );
}
