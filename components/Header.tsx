'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from "@/components/ui/button";

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
        </nav>

        <div className="flex items-center space-x-2 sm:space-x-3 md:space-x-4">
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

          {/* Mobile/Tablet Masuk Button - with text and larger */}
          <Button
            asChild
            className="md:hidden bg-gradient-to-r from-green-900 to-green-800 hover:from-green-800 hover:to-green-700 text-white px-4 sm:px-6 py-2 sm:py-2.5 text-sm sm:text-base font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 group"
          >
            <Link href="/login" className="flex items-center gap-2">
                <span>Masuk</span>
              <svg className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
