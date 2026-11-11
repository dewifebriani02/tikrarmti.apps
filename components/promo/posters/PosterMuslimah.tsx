'use client';

import Image from 'next/image';
import { ArrowRight } from 'lucide-react';

export function PosterMuslimah() {
  return (
    <div className="relative w-[1080px] h-[1080px] overflow-hidden bg-[#FFFBF5]">
      {/* Floral / mandala corner motifs */}
      {[
        'top-0 left-0',
        'top-0 right-0 -scale-x-100',
        'bottom-0 left-0 -scale-y-100',
        'bottom-0 right-0 -scale-100',
      ].map((pos, i) => (
        <svg
          key={i}
          className={`absolute ${pos} w-[260px] h-[260px] opacity-25`}
          viewBox="0 0 200 200"
        >
          <defs>
            <linearGradient id={`mgold-${i}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#F4D26B" />
              <stop offset="100%" stopColor="#8B6914" />
            </linearGradient>
          </defs>
          <g stroke={`url(#mgold-${i})`} strokeWidth="1.5" fill="none">
            <circle cx="40" cy="40" r="25" />
            <circle cx="40" cy="40" r="40" />
            <circle cx="40" cy="40" r="55" />
            <path d="M40 0 Q60 20 40 40 Q20 60 40 80 M0 40 Q20 60 40 40 Q60 20 80 40" />
            <circle cx="100" cy="40" r="12" />
            <circle cx="40" cy="100" r="12" />
            <path d="M70 70 Q90 70 90 90 M70 90 Q70 70 90 70" />
          </g>
          <circle cx="40" cy="40" r="6" fill={`url(#mgold-${i})`} />
        </svg>
      ))}

      {/* Decorative inner arch */}
      <svg className="absolute inset-0 w-full h-full opacity-50" viewBox="0 0 1080 1080" preserveAspectRatio="none">
        <defs>
          <linearGradient id="archgold" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F4D26B" />
            <stop offset="100%" stopColor="#8B6914" />
          </linearGradient>
        </defs>
        <path
          d="M540 110 Q230 110 230 420 L230 770 Q540 850 850 770 L850 420 Q850 110 540 110 Z"
          fill="none"
          stroke="url(#archgold)"
          strokeWidth="3"
          opacity="0.5"
        />
        <path
          d="M540 130 Q260 130 260 420 L260 740 Q540 814 820 740 L820 420 Q820 130 540 130 Z"
          fill="none"
          stroke="#0E5238"
          strokeWidth="1.5"
          opacity="0.3"
        />
      </svg>

      {/* Warm radial glow center */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[560px] rounded-full bg-amber-200/40 blur-3xl" />

      {/* Logo */}
      <div className="absolute top-[140px] left-1/2 -translate-x-1/2 w-[140px] h-[140px] flex items-center justify-center">
        <Image src="/mti-logo.jpg" alt="MTI" width={140} height={140} className="object-contain" />
      </div>

      {/* Eyebrow */}
      <div className="absolute top-[310px] left-1/2 -translate-x-1/2">
        <div
          className="px-8 py-3 rounded-full"
          style={{
            background: 'linear-gradient(180deg, #0E5238 0%, #022C20 100%)',
            boxShadow: '0 12px 30px rgba(6,78,59,0.3)',
          }}
        >
          <span className="text-amber-300 text-[18px] font-bold tracking-[0.45em]">PROGRAM MUSLIMAH</span>
        </div>
      </div>

      {/* HEADLINE */}
      <div className="absolute top-[420px] left-0 right-0 px-10 text-center">
        <h1 className="text-[88px] leading-[1.0] font-extrabold tracking-[-0.03em]">
          <span className="text-emerald-950">Ukhti Sholihah,</span>
          <br />
          <span className="bg-gradient-to-br from-amber-400 via-amber-600 to-amber-800 bg-clip-text text-transparent">
            Hafidzhah Insya Allah
          </span>
        </h1>
      </div>

      {/* Subtitle */}
      <div className="absolute top-[640px] left-0 right-0 px-16 text-center">
        <p className="text-[24px] text-emerald-950/85 leading-relaxed">
          Bersama <span className="font-extrabold">Halaqah Muallimah</span> berpengalaman,
          <br />
          dalam suasana yang <span className="font-extrabold text-emerald-950">khusyu&apos;, terjaga, dan penuh keberkahan</span>.
        </p>
      </div>

      {/* Hadits quote box */}
      <div className="absolute top-[770px] left-1/2 -translate-x-1/2 w-[820px]">
        <div
          className="bg-white rounded-3xl px-10 py-7 shadow-[0_20px_50px_rgba(6,78,59,0.12)] border-2"
          style={{ borderImage: 'linear-gradient(135deg, #F4D26B, #8B6914) 1' }}
        >
          <div className="flex items-start gap-4">
            <span className="text-[80px] leading-none font-serif font-extrabold bg-gradient-to-br from-amber-400 to-amber-700 bg-clip-text text-transparent -mt-3">
              &ldquo;
            </span>
            <div className="flex-1">
              <p className="text-[20px] font-bold text-emerald-950 leading-snug">
                Sebaik-baik kalian adalah yang mempelajari Al-Qur&apos;an dan mengajarkannya.
              </p>
              <p className="text-[14px] italic text-slate-400 mt-2">— HR. Bukhari</p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="absolute top-[940px] left-1/2 -translate-x-1/2">
        <button
          className="group relative px-12 py-4 rounded-full text-white text-[24px] font-extrabold flex items-center gap-3"
          style={{
            background: 'linear-gradient(180deg, #0E5238 0%, #022C20 100%)',
            border: '2px solid transparent',
            backgroundImage:
              'linear-gradient(180deg, #0E5238, #022C20), linear-gradient(135deg, #F4D26B, #C28F2E, #8B6914)',
            backgroundOrigin: 'border-box',
            backgroundClip: 'padding-box, border-box',
            boxShadow: '0 20px 50px rgba(6,78,59,0.4)',
          }}
        >
          Daftar Halaqah Tikrar
          <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      {/* Footer */}
      <div className="absolute bottom-[24px] left-0 right-0 text-center">
        <p className="text-[12px] font-bold text-slate-400 tracking-[0.25em] mb-1">INFORMASI &amp; PENDAFTARAN</p>
        <p className="text-[15px] font-extrabold text-emerald-950">
          markaztikrar.id <span className="text-amber-500 mx-1.5">•</span> WA 08138884240{' '}
          <span className="text-amber-500 mx-1.5">•</span> lynk.id/markaztikrar.id
        </p>
      </div>
    </div>
  );
}
