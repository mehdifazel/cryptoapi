import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Crypto API – Live Prices",
  description: "Live prices from Nobitex, Wallex, Ramzinex",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr">
      <body>{children}</body>
    </html>
  );
}
