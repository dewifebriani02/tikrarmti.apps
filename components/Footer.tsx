import Link from 'next/link';
import { HelpCircle } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-6 border-t border-green-900/20">
      <div className="container mx-auto px-3 md:px-4 lg:px-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-center sm:text-left">
            <p className="text-xs sm:text-sm text-gray-400">
              © {new Date().getFullYear()} Markaz Tikrar Indonesia. Hak Cipta Dilindungi Undang-undang.
            </p>
            <div className="hidden sm:block text-gray-600">•</div>
            <Link
              href="/faq"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>FAQ &amp; Bantuan</span>
            </Link>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs sm:text-sm text-gray-400">Powered by</span>
            <span className="text-xs sm:text-sm font-semibold text-green-400">AQLI</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
