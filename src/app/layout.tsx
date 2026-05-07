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
  title: "Cerberus AI — Multi-Agent Cybersecurity System",
  description:
    "Sistem multi-agent AI untuk riset keamanan siber edukatif. Dilengkapi 6 agent spesialis: Onyx Overseer, Phantom Executor, Oracle Intelligence, Wraith Stealth, Harbinger Social, dan Swift Responder.",
  keywords: [
    "Cerberus AI",
    "cybersecurity",
    "multi-agent",
    "AI",
    "educational security research",
    "OSINT",
    "exploit",
  ],
  authors: [{ name: "Kak Sal & Agent Salbjork" }],
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🐺</text></svg>",
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-cerberus-bg text-cerberus-text`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
