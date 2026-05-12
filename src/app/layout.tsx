import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HexStrike AI — Dual-Model Super Agent",
  description:
    "Dual-model AI Super Agent powered by Gemini 2.5 Flash + Devstral. 6 specialized agents with 32+ tools, function calling, and meta-learning. Strategic analysis meets tactical execution.",
  keywords: [
    "HexStrike AI",
    "AI agent",
    "dual model",
    "Gemini",
    "Devstral",
    "coding assistant",
    "code generation",
    "super agent",
    "multi-agent",
    "tool-augmented LLM",
    "function calling",
  ],
  authors: [{ name: "HexStrike AI Team" }],
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🔴</text></svg>",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-hex-bg text-hex-text`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
