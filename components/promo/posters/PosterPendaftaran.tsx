'use client';

import Image from 'next/image';
import { Calendar, Check, Users, ArrowRight, Sparkles } from 'lucide-react';

export function PosterPendaftaran() {
  return (
    <div className="relative w-[1080px] h-[1080px] overflow-hidden bg-[#FAFAF7]">
      {/* Subtle dot pattern */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.5]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="dotgrid" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
            <circle cx="16" cy="16" r="1.2" fill="#064E3B" opacity="0.18" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dotgrid)" />
      </svg>

      {/* Top emerald arch */}
      <div
        className="absolute top-0 left-0 right-0 h-[320px]"
        style={{
          background: 'linear-gradient(180deg, #0E5238 0%, #064E3B 100%)',
          clipPath: 'polygon(0 0, 100% 0, 100% 88%, 50% 100%, 0 88%)',
        }}
      />

      {/* Decorative geometric shapes top */}
      <div className="absolute top-[40px] left-[40px] w-[140px] h-[140px] rounded-full border-2 border-amber-300/30" />
      <div className="absolute top-[70px] left-[70px] w-[80px] h-[80px] rounded-full border-2 border-amber-300/20" />

      <div className="absolute top-[60px] right-[60px] w-[100px] h-[100px] border-2 border-amber-300/30 rotate-45" />

      {/* LOGO */}
      <div className="absolute top-[40px] left-1/2 -translate-x-1/2 w-[150px] h-[150px] flex items-center justify-center">
        <Image
          src="/mti-logo.jpg"
          alt="Markaz Tikrar Indonesia"
          width={150}
          height={150}
          className="object-contain mix-blend-screen"
        />
      </div>

      {/* PENDAFTARAN BADGE */}
      <div className="absolute top-[280px] left-1/2 -translate-x-1/2">
        <div className="bg-white px-7 py-3 rounded-full flex items-center gap-3 shadow-[0_12px_36px_rgba(6,78,59,0.18)] border-2 border-amber-400/60">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
          </span>
          <span className="text-emerald-900 text-[20px] font-extrabold tracking-[0.18em]">PENDAFTARAN DIBUKA</span>
        </div>
      </div>

      {/* HEADLINE */}
      <div className="absolute top-[400px] left-0 right-0 px-12 text-center">
        <h1 className="text-[88px] leading-[1.02] font-extrabold tracking-[-0.03em]">
          <span className="text-emerald-950">Saatnya Hafal</span>
          <br />
          <span className="bg-gradient-to-br from-amber-400 via-amber-500 to-amber-700 bg-clip-text text-transparent">
            Al-Qur&apos;an
          </span>
        </h1>
        <p className="mt-6 text-[32px] font-medium text-emerald-950/80">
          dengan{' '}
          <span className="font-extrabold bg-gradient-to-br from-amber-400 to-amber-700 bg-clip-text text-transparent">
            Bimbingan Halaqah
          </span>
        </p>
      </div>

      {/* 3 FEATURE CARDS */}
      <div className="absolute top-[710px] left-1/2 -translate-x-1/2 w-[940px] grid grid-cols-3 gap-6">
        <FeatureCard
          icon={<Calendar className="w-7 h-7" strokeWidth={2.2} />}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          iconBorder="border-emerald-200"
          number="14"
          title="Pekan Program"
          desc="Menuju Syahadah"
        />
        <FeatureCard
          icon={<Check className="w-7 h-7" strokeWidth={2.5} />}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
          iconBorder="border-amber-300"
          number=""
          title="Terukur"
          desc="Real-time Progress"
        />
        <FeatureCard
          icon={<Users className="w-7 h-7" strokeWidth={2.2} />}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          iconBorder="border-blue-200"
          number=""
          title="Halaqah"
          desc="Bimbingan Muallimah"
        />
      </div>

      {/* CTA */}
      <div className="absolute top-[890px] left-1/2 -translate-x-1/2">
        <button
          className="group relative px-12 py-5 rounded-full text-white text-[28px] font-extrabold flex items-center gap-3"
          style={{
            background: 'linear-gradient(180deg, #0E5238 0%, #064E3B 100%)',
            border: '2px solid transparent',
            backgroundImage:
              'linear-gradient(180deg, #0E5238, #064E3B), linear-gradient(135deg, #F4D26B, #C28F2E, #8B6914)',
            backgroundOrigin: 'border-box',
            backgroundClip: 'padding-box, border-box',
            boxShadow: '0 20px 50px rgba(6,78,59,0.4), 0 0 40px rgba(229,185,71,0.2)',
          }}
        >
          Daftar Sekarang
          <ArrowRight className="w-7 h-7 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      {/* FOOTER */}
      <div className="absolute bottom-[40px] left-0 right-0 text-center">
        <p className="text-[14px] font-bold text-slate-400 tracking-[0.25em] mb-2">INFORMASI &amp; PENDAFTARAN</p>
        <p className="text-[18px] font-extrabold text-emerald-950">
          markaztikrar.id <span className="text-amber-500 mx-2">•</span> WA 08138884240{' '}
          <span className="text-amber-500 mx-2">•</span> lynk.id/markaztikrar.id
        </p>
      </div>

      {/* Sparkles accent */}
      <Sparkles className="absolute top-[260px] right-[260px] w-6 h-6 text-amber-400 opacity-70" />
      <Sparkles className="absolute top-[480px] left-[120px] w-5 h-5 text-amber-400 opacity-60" />
    </div>
  );
}

interface FeatureCardProps {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  iconBorder: string;
  number?: string;
  title: string;
  desc: string;
}

function FeatureCard({ icon, iconBg, iconColor, iconBorder, number, title, desc }: FeatureCardProps) {
  return (
    <div className="bg-white rounded-3xl p-7 shadow-[0_20px_50px_rgba(6,78,59,0.08)] border border-slate-100 flex flex-col items-center text-center">
      <div className={`w-16 h-16 rounded-2xl ${iconBg} ${iconColor} border-2 ${iconBorder} flex items-center justify-center mb-4`}>
        {number ? <span className="text-[28px] font-extrabold text-emerald-950">{number}</span> : icon}
      </div>
      <h3 className="text-[22px] font-extrabold text-emerald-950 leading-tight">{title}</h3>
      <p className="text-[15px] text-slate-500 mt-1.5">{desc}</p>
    </div>
  );
}
