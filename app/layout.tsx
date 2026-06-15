import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Amazon刈り取りモニター",
  description: "Keepa連携・価格下落即時通知",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="bg-gray-50 text-gray-900 antialiased">{children}</body>
    </html>
  );
}
