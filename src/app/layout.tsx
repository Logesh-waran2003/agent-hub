import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Agents Hub",
  description: "Multi-terminal workspace for AI coding agents",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Geist:wght@400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-[#0a0a0b] text-zinc-200 antialiased" style={{ fontFamily: "'Geist', system-ui, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
