import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dana — Personal Finance OS",
  description: "Track your finances, debts, and goals",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-black text-zinc-100 antialiased">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
