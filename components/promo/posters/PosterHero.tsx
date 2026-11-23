'use client';

import Image from 'next/image';
import { Globe, MessageCircle, Link as LinkIcon, BookOpen, Check, Star } from 'lucide-react';

export function PosterHero() {
  return (
    <div className="relative w-[1080px] h-[1080px] overflow-hidden bg-gradient-to-b from-[#0E5238] via-[#064E3B] to-[#022C20]">
      {/* Islamic geometric pattern */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.06]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="hero-pattern" x="0" y="0" width="120" height="120" patternUnits="userSpaceOnUse">
            <path d="M60 8 L112 60 L60 112 L8 60 Z" fill="none" stroke="#FFD66B" strokeWidth="1.5" />
            <circle cx="60" cy="60" r="22" fill="none" stroke="#FFD66B" strokeWidth="1" />
            <path d="M60 38 L75 60 L60 82 L45 60 Z" fill="none" stroke="#FFD66B" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hero-pattern)" />
      </svg>

      {/* Mihrab arch outline */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.08]" viewBox="0 0 1080 1080" preserveAspectRatio="none">
        <path
          d="M540 50 Q280 50 280 280 L280 1080 L800 1080 L800 280 Q800 50 540 50 Z"
          fill="none"
          stroke="#FFD66B"
          strokeWidth="2"
        />
      </svg>

      {/* Background glow */}
      <div className="absolute left-1/2 top-[640px] -translate-x-1/2 -translate-y-1/2 w-[640px] h-[560px] rounded-full bg-emerald-400/20 blur-3xl" />
      <div className="absolute left-1/2 top-[260px] -translate-x-1/2 w-[800px] h-[200px] rounded-full bg-amber-300/10 blur-3xl" />

      {/* LOGO */}
      <div className="absolute top-[50px] left-1/2 -translate-x-1/2 w-[180px] h-[180px] flex items-center justify-center">
        <Image
          src="/mti-logo.jpg"
          alt="Markaz Tikrar Indonesia"
          width={180}
          height={180}
          className="object-contain mix-blend-screen"
          priority
        />
      </div>

      {/* HEADLINE */}
      <div className="absolute top-[260px] left-0 right-0 text-center px-12">
        <h1 className="text-[78px] font-extrabold leading-[1.05] tracking-tight">
          <span className="bg-gradient-to-b from-[#FFE9A8] via-[#E5B947] to-[#7A5418] bg-clip-text text-transparent drop-shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
            Hafal Al-Qur&apos;an
          </span>{' '}
          <span className="text-white">Lebih</span>
          <br />
          <span className="text-white">Terukur &amp; Istiqomah!</span>
        </h1>
        <p className="mt-5 text-[24px] font-medium text-emerald-100/90">
          Nikmati Petualangan 14 Pekan Menuju Syahadah Hafalan
        </p>
      </div>

      {/* CENTER VISUAL — phone mockup with floating elements */}
      <div className="absolute left-1/2 top-[700px] -translate-x-1/2 -translate-y-1/2 w-[640px] h-[460px]">
        {/* Glow behind */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[440px] h-[420px] rounded-full bg-emerald-400/30 blur-[80px]" />

        {/* Phone frame */}
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[230px] h-[420px] rounded-[36px] p-[6px] shadow-2xl"
          style={{
            background: 'linear-gradient(135deg, #FFF7D0, #E5B947 40%, #8B6914)',
            boxShadow: '0 30px 80px rgba(0,0,0,0.5), 0 0 60px rgba(34,197,94,0.3)',
          }}
        >
          <div className="w-full h-full rounded-[30px] bg-[#0a1f17] overflow-hidden relative">
            {/* Notch */}
            <div className="absolute top-[10px] left-1/2 -translate-x-1/2 w-[60px] h-[10px] rounded-full bg-black" />
            {/* App content */}
            <div className="absolute inset-0 pt-[40px] px-4">
              <div className="text-center text-emerald-400 text-[16px] font-bold tracking-wide">Tikrar</div>

              {/* Tabs */}
              <div className="mt-3 flex items-center gap-2 text-[10px]">
                <span className="px-3 py-1 rounded-md bg-emerald-500 text-white font-bold">Dashboard</span>
                <span className="text-slate-400 font-semibold">Tashih</span>
                <span className="text-slate-400 font-semibold">Jurnal</span>
              </div>

              {/* Circular progress */}
              <div className="mt-6 flex flex-col items-center">
                <div className="relative w-[140px] h-[140px]">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="#1f3a2c" strokeWidth="10" />
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      fill="none"
                      stroke="#22C55E"
                      strokeWidth="10"
                      strokeLinecap="round"
                      strokeDasharray={`${0.85 * 264} 264`}
                      style={{ filter: 'drop-shadow(0 0 8px rgba(34,197,94,0.6))' }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-white text-[34px] font-extrabold leading-none">85%</span>
                    <span className="text-emerald-300 text-[8px] font-bold tracking-widest mt-1">PROGRES</span>
                  </div>
                </div>
              </div>

              {/* Cards */}
              <div className="mt-4 space-y-2">
                <div className="bg-[#16321F] rounded-lg px-3 py-2 flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <div className="flex-1">
                    <div className="text-emerald-200 text-[9px] font-bold">Ratib Tikrar</div>
                    <div className="text-white text-[10px] font-extrabold">85% selesai</div>
                  </div>
                </div>
                <div className="bg-[#16321F] rounded-lg px-3 py-2 flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <div className="flex-1">
                    <div className="text-amber-200 text-[9px] font-bold">Murajaah Streak</div>
                    <div className="text-white text-[10px] font-extrabold">12 hari</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Quran book */}
        <div className="absolute left-[10px] top-[160px] -rotate-12">
          <div className="relative w-[120px] h-[80px]">
            <div className="absolute inset-0 bg-amber-900/40 blur-2xl" />
            <div
              className="absolute inset-0 rounded-md flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #FFE9A8, #E5B947 50%, #8B6914)',
                boxShadow: '0 12px 30px rgba(0,0,0,0.4)',
              }}
            >
              <BookOpen className="w-10 h-10 text-amber-900" strokeWidth={2.5} />
            </div>
          </div>
        </div>

        {/* Floating gold checkmark badge */}
        <div className="absolute left-[60px] bottom-[20px]">
          <div
            className="w-[88px] h-[88px] rounded-full flex items-center justify-center"
            style={{
              background: 'radial-gradient(circle at 30% 30%, #1a4f3a, #0E5238)',
              border: '3px solid transparent',
              backgroundImage: 'linear-gradient(#0E5238, #0E5238), linear-gradient(135deg, #FFE9A8, #E5B947, #8B6914)',
              backgroundOrigin: 'border-box',
              backgroundClip: 'padding-box, border-box',
              boxShadow: '0 10px 30px rgba(0,0,0,0.5), 0 0 30px rgba(229,185,71,0.3)',
            }}
          >
            <Check className="w-12 h-12 text-amber-300" strokeWidth={3.5} />
          </div>
        </div>

        {/* Big floating gold check (right) */}
        <div className="absolute right-[40px] top-[80px] rotate-12">
          <svg width="120" height="120" viewBox="0 0 120 120" style={{ filter: 'drop-shadow(0 12px 30px rgba(0,0,0,0.5))' }}>
            <defs>
              <linearGradient id="bigcheck" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#FFF7D0" />
                <stop offset="50%" stopColor="#E5B947" />
                <stop offset="100%" stopColor="#8B6914" />
              </linearGradient>
            </defs>
            <path
              d="M20 60 L48 88 L100 32"
              fill="none"
              stroke="url(#bigcheck)"
              strokeWidth="22"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Star badge */}
        <div className="absolute right-[20px] bottom-[20px]">
          <div
            className="w-[88px] h-[88px] rounded-full flex items-center justify-center"
            style={{
              background: 'linear-gradient(#0E5238, #0E5238) padding-box, linear-gradient(135deg, #FFE9A8, #E5B947, #8B6914) border-box',
              border: '3px solid transparent',
              boxShadow: '0 10px 30px rgba(0,0,0,0.5), 0 0 30px rgba(229,185,71,0.3)',
            }}
          >
            <Star className="w-12 h-12" fill="url(#bigcheck)" stroke="url(#bigcheck)" strokeWidth={1.5} style={{ color: '#E5B947' }} />
          </div>
        </div>

        {/* Sparkles */}
        <div className="absolute left-[80px] top-[30px] w-2 h-2 rounded-full bg-amber-300 shadow-[0_0_12px_4px_rgba(252,211,77,0.7)]" />
        <div className="absolute right-[140px] top-[10px] w-1.5 h-1.5 rounded-full bg-amber-300 shadow-[0_0_8px_3px_rgba(252,211,77,0.6)]" />
        <div className="absolute left-[200px] bottom-[10px] w-2 h-2 rounded-full bg-amber-300 shadow-[0_0_12px_4px_rgba(252,211,77,0.7)]" />
      </div>

      {/* CTA Button */}
      <div className="absolute left-1/2 top-[920px] -translate-x-1/2">
        <div
          className="relative px-16 py-5 rounded-full"
          style={{
            background: 'linear-gradient(180deg, #0E5238 0%, #064E3B 100%)',
            border: '3px solid transparent',
            backgroundImage:
              'linear-gradient(180deg, #0E5238, #064E3B), linear-gradient(135deg, #FFF7D0, #E5B947 50%, #8B6914)',
            backgroundOrigin: 'border-box',
            backgroundClip: 'padding-box, border-box',
            boxShadow: '0 0 60px rgba(229,185,71,0.45), 0 10px 30px rgba(0,0,0,0.4)',
          }}
        >
          <span className="text-[36px] font-extrabold text-white tracking-wide">Daftar Sekarang!</span>
        </div>
      </div>

      {/* FOOTER */}
      <div className="absolute bottom-[40px] left-0 right-0 px-12">
        <div className="flex items-center justify-between gap-6">
          <FooterItem icon={<Globe className="w-5 h-5" strokeWidth={2.2} />} label="Website" value="markaztikrar.id" />
          <FooterItem icon={<MessageCircle className="w-5 h-5" strokeWidth={2.2} />} label="WhatsApp" value="08138884240" />
          <FooterItem icon={<LinkIcon className="w-5 h-5" strokeWidth={2.2} />} label="Link" value="lynk.id/markaztikrar.id" />
        </div>
      </div>
    </div>
  );
}

function FooterItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center text-amber-300"
        style={{
          background: 'linear-gradient(#0E5238, #0E5238) padding-box, linear-gradient(135deg, #FFE9A8, #E5B947, #8B6914) border-box',
          border: '2px solid transparent',
        }}
      >
        {icon}
      </div>
      <div>
        <div className="text-amber-300 text-[11px] font-extrabold tracking-[0.18em]">{label.toUpperCase()}</div>
        <div className="text-white text-[16px] font-semibold">{value}</div>
      </div>
    </div>
  );
}
