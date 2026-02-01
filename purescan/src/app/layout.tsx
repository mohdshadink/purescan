import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PureScan AI",
  description: "Instantly decode food quality",
  openGraph: {
    title: "PureScan AI",
    description: "Instantly decode food quality",
    type: "website",
    siteName: "PureScan AI",
  },
  twitter: {
    card: "summary_large_image",
    title: "PureScan AI",
    description: "Instantly decode food quality",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          {children}
        </Providers>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-9E0060BH7S"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', 'G-9E0060BH7S');
          `}
        </Script>
      </body>
    </html>
  );
}
