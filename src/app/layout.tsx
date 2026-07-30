import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Trader Bot",
  description: "Multi-user demo trading simulation",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="bg-gray-950 text-gray-100">
      <body>{children}</body>
    </html>
  );
}
