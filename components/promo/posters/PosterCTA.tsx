'use client';

import Image from 'next/image';

export function PosterCTA() {
  const remaining = 25;
  const total = 100;
  const percentTaken = ((total - remaining) / total) * 100;

  return (
    <div className="relative w-[1080px] h-[1080px] overflow-hidden bg-gradient-to-b from-[#0E5238] via-[#064E3B] to-[#022C20]">
      {/* Pattern */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.06]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="cta-pattern" x="0" y="0" width="120" height="120" patternUnits="userSpaceOnUse">
            <path d="M60 8 L112 60 L60 112 L8 60 Z" fill="none" stroke="#FFD66B" strokeWidth="1.5" />
            <circle cx="60" cy="60" r="22" fill="none" stroke="#FFD66B" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#cta-pattern)" />
      </svg>

      {/* Red urgency glow */}
      <div className="absolute left-1/2 top-[200px] -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[400px] rounded-full bg-red-500/30 blur-3xl" />
      {/* Gold center glow */}
      <div className="absolute left-1/2 top-[680px] -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-amber-400/20 blur-3xl" />

      {/* Logo */}
      <div className="absolute top-[40px] left-1/2 -translate-x-1/2 w-[140px] h-[140px] flex items-center justify-center">
        <Image src="/mti-logo.jpg" alt="MTI" width={140} height={140} className="object-contain mix-blend-screen" />
      </div>

      {/* URGENCY BADGE */}
      <div className="absolute top-[230px] left-1/2 -translate-x-1/2">
        <div
          className="px-9 py-3.5 rounded-full flex items-center gap-3.5"
          style={{
            background: 'linear-gradient(180deg, #DC2626 0%, #991B1B 100%)',
            boxShadow: '0 0 60px rgba(239,68,68,0.55), 0 14px 30px rgba(0,0,0,0.4)',
          }}
        >
          <span className="relative flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-200 opacity-75" />
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-100" />
          </span>
          <span className="text-white text-[19px] font-extrabold tracking-[0.22em]">
            PENDAFTARAN HAMPIR DITUTUP
          </span>
        </div>
      </div>

      {/* HEADLINE */}
      <div className="absolute top-[330px] left-0 right-0 px-12 text-center">
        <h1 className="text-[90px] leading-[1.02] font-extrabold tracking-[-0.03em]">
          <span className="text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.4)]">Jangan Sampai</span>
          <br />
          <span className="bg-gradient-to-b from-[#FFE9A8] via-[#E5B947] to-[#7A5418] bg-clip-text text-transparent drop-shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
            Ketinggalan!
          </span>
        </h1>
      </div>

      {/* CIRCULAR PROGRESS / KUOTA */}
      <div className="absolute top-[700px] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[440px] h-[440px]">
        <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90">
          <defs>
            <linearGradient id="ctaGold" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#FFF7D0" />
              <stop offset="50%" stopColor="#E5B947" />
              <stop offset="100%" stopColor="#8B6914" />
            </linearGradient>
          </defs>
          <circle cx="100" cy="100" r="86" fill="none" stroke="#1f3a2c" strokeWidth="14" />
          <circle
            cx="100"
            cy="100"
            r="86"
            fill="none"
            stroke="url(#ctaGold)"
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={`${(percentTaken / 100) * (2 * Math.PI * 86)} ${2 * Math.PI * 86}`}
            style={{ filter: 'drop-shadow(0 0 10px rgba(229,185,71,0.6))' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-amber-300 text-[24px] font-bold tracking-[0.3em]">KUOTA TERSISA</p>
          <p
            className="text-white text-[160px] font-extrabold leading-none mt-2"
            style={{ filter: 'drop-shadow(0 6px 16px rgba(0,0,0,0.4))' }}
          >
            {remaining}
          </p>
          <p className="text-emerald-300 text-[20px] font-bold tracking-[0.3em] mt-2">DARI {total} SLOT</p>
        </div>

        {/* Side badges */}
        <div
          className="absolute -left-[80px] top-1/2 -translate-y-1/2 w-[88px] h-[88px] rounded-full flex flex-col items-center justify-center"
          style={{
            background: 'linear-gradient(#0E5238, #0E5238) padding-box, linear-gradient(135deg, #FFE9A8, #E5B947, #8B6914) border-box',
            border: '3px solid transparent',
            boxShadow: '0 12px 30px rgba(0,0,0,0.4)',
          }}
        >
          <span className="text-amber-300 text-[26px] font-extrabold leading-none">14</span>
          <span className="text-white text-[10px] font-extrabold tracking-widest mt-1">PEKAN</span>
        </div>
        <div
          className="absolute -right-[80px] top-1/2 -translate-y-1/2 w-[88px] h-[88px] rounded-full flex flex-col items-center justify-center"
          style={{
            background: 'linear-gradient(#0E5238, #0E5238) padding-box, linear-gradient(135deg, #FFE9A8, #E5B947, #8B6914) border-box',
            border: '3px solid transparent',
            boxShadow: '0 12px 30px rgba(0,0,0,0.4)',
          }}
        >
          <span className="text-amber-300 text-[26px] font-extrabold leading-none">5</span>
          <span className="text-white text-[10px] font-extrabold tracking-widest mt-1">JUZ</span>
        </div>

        {/* Sparkles */}
        <div className="absolute left-[10px] top-[40px] w-2.5 h-2.5 rounded-full bg-amber-300 shadow-[0_0_14px_5px_rgba(252,211,77,0.7)]" />
        <div className="absolute right-[40px] top-[10px] w-2 h-2 rounded-full bg-amber-300 shadow-[0_0_10px_4px_rgba(252,211,77,0.6)]" />
        <div className="absolute left-[40px] bottom-[20px] w-2 h-2 rounded-full bg-amber-300 shadow-[0_0_10px_4px_rgba(252,211,77,0.6)]" />
        <div className="absolute right-[20px] bottom-[40px] w-2.5 h-2.5 rounded-full bg-amber-300 shadow-[0_0_14px_5px_rgba(252,211,77,0.7)]" />
      </div>

      {/* CTA */}
      <div className="absolute top-[915px] left-1/2 -translate-x-1/2">
        <button
          className="relative px-20 py-5 rounded-full text-[40px] font-extrabold"
          style={{
            background: 'linear-gradient(180deg, #FFF7D0 0%, #E5B947 50%, #8B6914 100%)',
            color: '#0E5238',
            boxShadow:
              '0 0 80px rgba(229,185,71,0.6), 0 20px 50px rgba(0,0,0,0.5), inset 0 -2px 8px rgba(122,84,24,0.5), inset 0 2px 4px rgba(255,247,208,0.6)',
            border: '1.5px solid #7A5418',
          }}
        >
          Daftar Sekarang!
        </button>
      </div>

      {/* FOOTER */}
      <div className="absolute bottom-[36px] left-0 right-0 text-center">
        <p className="text-amber-300 text-[15px] font-extrabold tracking-[0.18em]">
          markaztikrar.id <span className="text-amber-500 mx-2">•</span> WA 08138884240{' '}
          <span className="text-amber-500 mx-2">•</span> lynk.id/markaztikrar.id
        </p>
      </div>
    </div>
  );
}
