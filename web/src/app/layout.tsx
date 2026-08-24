import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

export const metadata: Metadata = {
  title: "Saga Payment System",
  description:
    "Distributed order-processing with Saga pattern orchestration and idempotency-key deduplication",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} font-sans antialiased bg-surface text-text-primary`}
      >
        <div className="noise" />
        {children}
      </body>
    </html>
  );
}
