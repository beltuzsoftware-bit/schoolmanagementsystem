import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import ToasterProvider from "@/components/toaster-provider";
import SessionInit from "@/components/session-init";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "KuMMi - School Management System",
  description: "Next Generation School Management SaaS Platform",
  icons: {
    icon: '/kummi-icon.svg',
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
        className={`${inter.variable} ${geistMono.variable} antialiased`}
      >
        <SessionInit />
        <ToasterProvider />
        {children}
      </body>
    </html>
  );
}
