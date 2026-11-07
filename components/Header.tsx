'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import { HelpCircle } from "lucide-react";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl shadow-md border-b border-green-900/20 w-full">
      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-3 md:py-4 flex justify-between items-center">
        <Link href="/" className="flex items-center space-x-2 sm:space-x-2 md:space-x-3 group flex-shrink-0">
          <Image
            src="/mti-logo.jpg"
            alt="Markaz Tikrar Indonesia Logo"
            width={128}
            height={32}
            className="w-28 sm:w-28 md:w-32 h-7 sm:h-7 md:h-8 object-contain transition-transform duration-300 group-hover:scale-105"
            priority
          />
          <span className="text-sm sm:text-sm md:text-xl font-bold text-black transition-colors duration-300 group-hover:text-green-900 hidden sm:block whitespace-nowrap">
            Markaz Tikrar Indonesia
          </span>
        </Link>

        <nav className="hidden lg:flex items-center space-x-6 xl:space-x-8">
          <Link href="/#program" className="text-black hover:text-green-900 transition-colors font-medium text-sm xl:text-base">
            Program
          </Link>
          <Link href="/#alur" className="text-black hover:text-green-900 transition-colors font-medium text-sm xl:text-base">
            Alur
          </Link>
          <Link href="/#testimoni" className="text-black hover:text-green-900 transition-colors font-medium text-sm xl:text-base">
            Testimoni
          </Link>
          <Link
            href="/faq"
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300/80 rounded-full transition-colors shadow-2xs"
          >
            <HelpCircle className="w-4 h-4 text-emerald-700" />
            <span>FAQ &amp; Bantuan</span>
          </Link>
        </nav>

        <div className="flex items-center space-x-2 sm:space-x-3 md:space-x-4">
          {/* Mobile FAQ Quick Button */}
          <Button
            variant="outline"
            asChild
            className="flex lg:hidden border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-bold rounded-xl"
          >
            <Link href="/faq" className="flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5 text-emerald-700" />
              <span>FAQ</span>
            </Link>
          </Button>

          <Button
            variant="outline"
            asChild
            className="hidden md:flex bg-green-900 hover:bg-green-800 text-white text-sm md:text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 group border-green-900 hover:border-green-900"
          >
            <Link href="/login" className="flex items-center gap-2">
              <span className="hidden lg:inline">Masuk</span>
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </Button>

          {/* Mobile/Tablet Masuk Button */}
          <Button
            asChild
            className="md:hidden bg-gradient-to-r from-green-900 to-green-800 hover:from-green-800 hover:to-green-700 text-white px-3.5 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-base font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 group"
          >
            <Link href="/login" className="flex items-center gap-1.5">
              <span>Masuk</span>
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
