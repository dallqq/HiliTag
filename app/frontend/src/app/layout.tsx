import type { Metadata } from "next";
import { Lora, DM_Sans } from "next/font/google";
import "./globals.css";

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "IlonggoNER — Hiligaynon Named Entity Recognition",
  description:
    "Fine-tuned XLM-RoBERTa model for Named Entity Recognition in Hiligaynon. Identifies 18 OntoNotes 5.0 entity categories.",
  keywords: ["Hiligaynon", "NER", "Named Entity Recognition", "XLM-RoBERTa", "NLP", "Ilonggo"],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="hil" className={`${lora.variable} ${dmSans.variable}`}>
      <body className="bg-paper font-sans antialiased">{children}</body>
    </html>
  );
}
