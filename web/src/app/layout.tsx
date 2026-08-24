import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

export const metadata: Metadata = {
  title: "Saga Payment System | Zero Double-Charges",
  description:
    "Production-grade distributed order processing with Saga pattern orchestration and idempotency-key deduplication. Built for reliability.",
  keywords: ["saga pattern", "idempotency", "distributed transactions", "payment system"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} font-sans antialiased bg-white text-text-primary`}
      >
        {children}
      </body>
    </html>
  );
}
