import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Promo Poster - Tikrar MTI',
  description: 'Galeri poster promosi Markaz Tikrar Indonesia',
};

export default function PromoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-sans antialiased">
      {children}
    </div>
  );
}
