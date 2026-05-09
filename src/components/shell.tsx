"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import {
  Wallet, CreditCard, DollarSign, Car, Smartphone, Menu, X,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: Wallet },
  { href: "/debt", label: "Debt", icon: CreditCard },
  { href: "/payments", label: "Payments", icon: DollarSign },
  { href: "/grab", label: "Grab", icon: Car },
  { href: "/subscriptions", label: "Subscriptions", icon: Smartphone },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Hide shell on login/auth pages
  if (pathname === "/login") return <>{children}</>;

  return (
    <div className="min-h-screen bg-black flex">
      {/* Mobile header */}
      <div className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between p-4 bg-black/80 backdrop-blur md:hidden border-b border-zinc-800">
        <button onClick={() => setOpen(true)} className="p-2 -ml-2">
          <Menu size={20} className="text-zinc-400" />
        </button>
        <span className="text-sm font-semibold text-white">Dana</span>
        <div className="w-9" />
      </div>

      {/* Overlay */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/60 md:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-zinc-950 border-r border-zinc-800
        transform transition-transform duration-200 ease-out
        ${open ? "translate-x-0" : "-translate-x-full"}
        md:translate-x-0 md:static md:z-0
      `}>
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <div>
            <h1 className="text-lg font-bold text-white">Dana</h1>
            <p className="text-[10px] text-zinc-600">Personal Finance OS</p>
          </div>
          <button onClick={() => setOpen(false)} className="p-1 md:hidden">
            <X size={18} className="text-zinc-500" />
          </button>
        </div>

        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                  active
                    ? "bg-blue-600/10 text-blue-400 font-medium"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-900"
                }`}
              >
                <item.icon size={18} strokeWidth={active ? 2.5 : 1.5} />
                {item.label}
                {active && <div className="ml-auto w-1 h-4 rounded-full bg-blue-500" />}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-zinc-800">
          <p className="text-[10px] text-zinc-700 text-center">finance.danialsanusi.com</p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 md:ml-0 min-h-screen pb-20 md:pb-8">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-zinc-950 border-t border-zinc-800 md:hidden">
        <div className="flex">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex-1 flex flex-col items-center py-2 text-[10px] transition-colors ${
                  active ? "text-blue-400" : "text-zinc-600"
                }`}
              >
                <item.icon size={18} strokeWidth={active ? 2.5 : 1.5} />
                <span className="mt-0.5">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
