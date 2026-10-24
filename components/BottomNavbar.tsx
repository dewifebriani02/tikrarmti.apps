'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Compass, BookOpen, FileText, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function BottomNavbar() {
  const pathname = usePathname();

  const navItems = [
    {
      label: 'Dasbor',
      icon: Home,
      href: '/dashboard',
    },
    {
      label: 'Perjalanan',
      icon: Compass,
      href: '/perjalanan-saya',
    },
    {
      label: 'Jurnal',
      icon: BookOpen,
      href: '/jurnal-harian',
      isCenter: true,
    },
    {
      label: 'Tashih',
      icon: FileText,
      href: '/tashih',
    },
    {
      label: 'Murajaah',
      icon: RotateCcw,
      href: '/murojaah',
    },
  ];

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    if (href === '/murojaah') return pathname.startsWith('/murojaah') || pathname.startsWith('/murajaah');
    return pathname.startsWith(href);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[60] pt-2 pointer-events-none xl:hidden">
      <div className="w-full relative pointer-events-auto">
        {/* Background Glass container */}
        <div className="glass-premium rounded-t-[32px] flex items-center justify-around px-2 py-3 shadow-2xl border-t border-white/50 h-[80px]">
          {navItems.map((item, index) => {
            if (item.isCenter) {
              return (
                <div key={item.href} className="flex-1 flex flex-col items-center justify-center -mt-12 relative z-10">
                  <Link
                    href={item.href}
                    className={cn(
                      "w-16 h-16 rounded-2xl flex flex-col items-center justify-center transition-all duration-500 shadow-xl group hover:scale-110 active:scale-95",
                      isActive(item.href)
                        ? "bg-gradient-to-br from-green-900 to-green-700 text-white shadow-green-900/40"
                        : "bg-white text-green-900 hover:bg-green-50 shadow-gray-200/50"
                    )}
                  >
                    <div className={cn(
                      "transition-transform duration-300 group-hover:-translate-y-0.5",
                      isActive(item.href) ? "text-yellow-400" : "text-green-800"
                    )}>
                      <item.icon size={28} strokeWidth={2.5} />
                    </div>
                    <span className={cn(
                      "text-[10px] font-bold mt-0.5",
                      isActive(item.href) ? "text-white/90" : "text-green-900/70"
                    )}>
                      {item.label}
                    </span>

                    {/* Protruding effect circle/glow */}
                    <div className={cn(
                      "absolute -inset-1 rounded-3xl -z-10 opacity-20 blur-md transition-all duration-500",
                      isActive(item.href) ? "bg-green-500" : "bg-transparent group-hover:bg-green-300"
                    )} />
                  </Link>
                </div>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-1 transition-all duration-300 group",
                  isActive(item.href) ? "text-green-900" : "text-gray-400 hover:text-green-700"
                )}
              >
                <div className={cn(
                  "p-1 rounded-xl transition-all duration-300",
                  isActive(item.href) ? "bg-green-50 text-green-900 scale-110" : "group-hover:bg-gray-100 group-hover:scale-105"
                )}>
                  <item.icon size={22} strokeWidth={isActive(item.href) ? 2.5 : 2} />
                </div>
                <span className={cn(
                  "text-[10px] font-semibold transition-all duration-300",
                  isActive(item.href) ? "opacity-100 scale-105" : "opacity-70"
                )}>
                  {item.label}
                </span>

                {/* Active Indicator Dot */}
                <div className={cn(
                  "w-1 h-1 rounded-full bg-green-900 transition-all duration-300 transform",
                  isActive(item.href) ? "opacity-100 scale-100" : "opacity-0 scale-0"
                )} />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
