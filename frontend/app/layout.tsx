import type { Metadata } from "next";
import Script from "next/script";
import { absoluteUrl, shouldNoIndexEnvironment, siteConfig } from "@/lib/seo/site";
import "./globals.css";

const inter = {
  variable: "--font-inter",
};

const sora = {
  variable: "--font-sora",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.defaultTitle,
    template: siteConfig.titleTemplate,
  },
  description: siteConfig.description,
  applicationName: siteConfig.applicationName,
  authors: [{ name: siteConfig.name, url: siteConfig.url }],
  creator: siteConfig.creator,
  publisher: siteConfig.publisher,
  category: siteConfig.category,
  keywords: siteConfig.keywords,
  manifest: "/manifest.webmanifest",
  alternates: {
    canonical: "/",
  },
  appleWebApp: {
    capable: true,
    title: siteConfig.applicationName,
    statusBarStyle: "default",
  },
  other: {
    "application-name": siteConfig.applicationName,
    "msapplication-TileColor": "#0A0A0F",
  },
  robots: shouldNoIndexEnvironment()
    ? {
        index: false,
        follow: false,
        noarchive: true,
        nosnippet: true,
      }
    : {
        index: true,
        follow: true,
      },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon.png", type: "image/png" }
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },

  openGraph: {
    type: "website",
    locale: siteConfig.locale,
    siteName: siteConfig.name,
    url: siteConfig.url,
    title: siteConfig.defaultTitle,
    description: siteConfig.description,
    images: [
      {
        url: absoluteUrl(siteConfig.ogImage),
        width: 1200,
        height: 630,
        alt: "8liv online doctor-led weight management and wellness care",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: siteConfig.socialHandle,
    creator: siteConfig.socialHandle,
    title: siteConfig.defaultTitle,
    description: siteConfig.description,
    images: [absoluteUrl(siteConfig.ogImage)],
  },
  formatDetection: {
    telephone: false,
    address: false,
    email: false,
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
    other: {
      "msvalidate.01": process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION || "",
    },
  },
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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Sora:wght@400;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`min-h-full flex flex-col font-sans bg-white text-[#0F172A]`}>
        {children}
      </body>
    </html>
  );
}
