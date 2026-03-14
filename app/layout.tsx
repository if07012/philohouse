import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Philihouse.id — Fresh, Small-Batch Cookies Made for Smiles 🍪",
  description: "Handcrafted cookies made with premium ingredients. Perfect for gifts or daily treats. Order now for fresh delivery!",
  icons: {
    icon: "/cookies/logo.png",
    shortcut: "/cookies/logo.png",
    apple: "/cookies/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Script
          src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"
          strategy="beforeInteractive"
        />
        {children}
      </body>
    </html>
  );
}
