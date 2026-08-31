import type { Metadata } from "next";
import { Archivo_Black, Source_Sans_3, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const display = Archivo_Black({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-archivo",
});
const body = Source_Sans_3({ subsets: ["latin"], variable: "--font-source" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jet" });

export const metadata: Metadata = {
  title: "RedactFlow",
  description: "Mask emails, phones, JWTs, and AWS-like keys",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body style={{ fontFamily: "var(--font-source), var(--font-body)" }}>{children}</body>
    </html>
  );
}
