import type { Metadata } from "next";
import "./globals.css";
import Shell from "@/components/shell";

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
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
