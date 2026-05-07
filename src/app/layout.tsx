import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NOVA AI — Super Agent",
  description:
    "Super AI Agent untuk coding, analisis, riset, dan konten. 6 agent spesialis dengan 32+ tools terintegrasi, function calling, dan meta-learning. Powered by Mistral AI.",
  keywords: [
    "NOVA AI",
    "AI agent",
    "coding assistant",
    "code generation",
    "super agent",
    "multi-agent",
    "tool-augmented LLM",
    "Mistral AI",
  ],
  authors: [{ name: "NOVA AI Team" }],
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🌟</text></svg>",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-nova-bg text-nova-text`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
