'use client';

import Image from 'next/image';
import { ArrowRight, Award } from 'lucide-react';

export function PosterTimeline() {
  return (
    <div className="relative w-[1080px] h-[1080px] overflow-hidden bg-[#FAFAF7]">
      {/* Dot pattern */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.5]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="tldot" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
            <circle cx="16" cy="16" r="1.2" fill="#064E3B" opacity="0.18" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#tldot)" />
      </svg>

      {/* Top header */}
      <div
        className="absolute top-0 left-0 right-0 h-[230px]"
        style={{ background: 'linear-gradient(180deg, #0E5238 0%, #022C20 100%)' }}
      />
      <svg className="absolute top-[200px] left-0 w-full h-[40px]" viewBox="0 0 1080 40" preserveAspectRatio="none">
        <path d="M0 0 L1080 0 L1080 16 L540 36 L0 16 Z" fill="#022C20" />
      </svg>

      {/* Logo */}
      <div className="absolute top-[36px] left-1/2 -translate-x-1/2 w-[124px] h-[124px] flex items-center justify-center">
        <Image src="/mti-logo.jpg" alt="MTI" width={124} height={124} className="object-contain mix-blend-screen" />
      </div>

      <div className="absolute top-[170px] left-0 right-0 text-center">
        <p className="text-amber-300 text-[20px] font-bold tracking-[0.4em]">METODE PEMBELAJARAN</p>
      </div>

      {/* HEADLINE */}
      <div className="absolute top-[290px] left-0 right-0 px-12 text-center">
        <h1 className="text-[78px] leading-[1.05] font-extrabold tracking-[-0.03em]">
          <span className="text-emerald-950">14 Pekan Menuju</span>
          <br />
          <span className="bg-gradient-to-br from-amber-400 via-amber-500 to-amber-700 bg-clip-text text-transparent">
            Syahadah Hafalan
          </span>
        </h1>
      </div>

      {/* TIMELINE */}
      <div className="absolute top-[540px] left-1/2 -translate-x-1/2 w-[940px]">
        {/* Track */}
        <div className="relative h-[6px] mx-[60px] bg-slate-200 rounded-full">
          <div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{
              width: '100%',
              background: 'linear-gradient(90deg, #22C55E 0%, #0E5238 100%)',
            }}
          />
        </div>

        {/* Phases */}
        <div className="absolute top-[-32px] left-0 right-0 flex justify-between px-0">
          <PhaseNode num="1" label="Seleksi" sub="Pendaftaran" variant="white" />
          <PhaseNode num="2" label="Pembukaan" sub="Kelas Perdana" variant="white" />
          <PhaseNode num="1-11" label="Halaqah Tikrar" sub="Setoran Harian" variant="emerald" big />
          <PhaseNode num="12" label="Murajaah" sub="Review Akhir" variant="white" gold />
          <PhaseNode num="13-14" label="SYAHADAH" sub="Ujian & Kelulusan" variant="gold" big />
        </div>
      </div>

      {/* STATS */}
      <div className="absolute top-[760px] left-1/2 -translate-x-1/2 w-[940px] flex justify-around items-center">
        <StatCircle value="14" label="PEKAN" color="emerald" />
        <StatCircle value="5" label="JUZ" color="gold" />
        <StatCircle value="100%" label="TERPANTAU" color="emerald" />
        <StatCircle value="1" label="SYAHADAH" color="gold" />
      </div>

      {/* CTA */}
      <div className="absolute top-[920px] left-1/2 -translate-x-1/2">
        <button
          className="group relative px-12 py-5 rounded-full text-white text-[26px] font-extrabold flex items-center gap-3"
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
          Mulai Perjalananmu
          <ArrowRight className="w-7 h-7 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      {/* FOOTER */}
      <div className="absolute bottom-[40px] left-0 right-0 text-center">
        <p className="text-[14px] font-bold text-slate-400 tracking-[0.25em] mb-2">INFORMASI &amp; PENDAFTARAN</p>
        <p className="text-[17px] font-extrabold text-emerald-950">
          markaztikrar.id <span className="text-amber-500 mx-2">•</span> WA 08138884240{' '}
          <span className="text-amber-500 mx-2">•</span> lynk.id/markaztikrar.id
        </p>
      </div>
    </div>
  );
}

interface PhaseNodeProps {
  num: string;
  label: string;
  sub: string;
  variant: 'white' | 'emerald' | 'gold';
  big?: boolean;
  gold?: boolean;
}

function PhaseNode({ num, label, sub, variant, big, gold }: PhaseNodeProps) {
  const size = big ? 'w-[88px] h-[88px]' : 'w-[68px] h-[68px]';
  const ring = gold ? 'border-amber-400' : variant === 'gold' ? 'border-emerald-900' : 'border-emerald-900';

  let bg = 'bg-white';
  let textColor = 'text-emerald-900';
  if (variant === 'emerald') {
    bg = 'bg-gradient-to-br from-emerald-700 to-emerald-950';
    textColor = 'text-white';
  } else if (variant === 'gold') {
    bg = 'bg-gradient-to-br from-amber-300 via-amber-500 to-amber-700';
    textColor = 'text-emerald-950';
  }

  const isLong = num.length > 2;

  return (
    <div className="flex flex-col items-center" style={{ minWidth: 88 }}>
      <div
        className={`${size} rounded-full ${bg} ${textColor} border-4 ${ring} flex flex-col items-center justify-center font-extrabold ${
          big ? 'shadow-[0_12px_30px_rgba(6,78,59,0.3)]' : ''
        }`}
      >
        {variant === 'gold' && big && (
          <span className="text-[10px] font-extrabold tracking-wider mt-[-2px]">PEKAN</span>
        )}
        <span className={isLong ? 'text-[18px]' : big ? 'text-[20px]' : 'text-[22px]'}>{num}</span>
      </div>
      <div className="mt-3 text-center w-[120px]">
        <p className={`text-[14px] font-extrabold ${variant === 'gold' && big ? 'bg-gradient-to-br from-amber-500 to-amber-700 bg-clip-text text-transparent' : 'text-emerald-950'}`}>
          {label}
        </p>
        <p className="text-[11px] text-slate-500 mt-0.5">{sub}</p>
      </div>
    </div>
  );
}

function StatCircle({ value, label, color }: { value: string; label: string; color: 'emerald' | 'gold' }) {
  const ring = color === 'gold' ? 'border-amber-400' : 'border-emerald-900';
  const text = color === 'gold' ? 'bg-gradient-to-br from-amber-500 to-amber-700 bg-clip-text text-transparent' : 'text-emerald-950';

  return (
    <div className="flex flex-col items-center">
      <div className={`w-[110px] h-[110px] rounded-full bg-white border-[3px] ${ring} flex items-center justify-center shadow-[0_12px_30px_rgba(6,78,59,0.12)]`}>
        <span className={`text-[36px] font-extrabold ${text}`}>{value}</span>
      </div>
      <p className="mt-2 text-[12px] font-extrabold text-slate-500 tracking-[0.18em]">{label}</p>
    </div>
  );
}
