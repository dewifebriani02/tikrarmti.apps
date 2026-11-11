'use client';

import Image from 'next/image';
import { Activity, BookOpen, BarChart3, Smartphone } from 'lucide-react';

export function PosterFeatures() {
  return (
    <div className="relative w-[1080px] h-[1080px] overflow-hidden bg-[#FAFAF7]">
      {/* Pattern */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.5]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="ftdot" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
            <circle cx="16" cy="16" r="1.2" fill="#064E3B" opacity="0.18" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#ftdot)" />
      </svg>

      {/* Top arch */}
      <div
        className="absolute top-0 left-0 right-0 h-[150px]"
        style={{
          background: 'linear-gradient(180deg, #0E5238 0%, #064E3B 100%)',
          clipPath: 'polygon(0 0, 100% 0, 100% 75%, 50% 100%, 0 75%)',
        }}
      />
      <div className="absolute -top-[140px] left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full border-2 border-amber-300/30" />

      {/* Logo */}
      <div className="absolute top-[20px] left-1/2 -translate-x-1/2 w-[110px] h-[110px] flex items-center justify-center">
        <Image src="/mti-logo.jpg" alt="MTI" width={110} height={110} className="object-contain mix-blend-screen" />
      </div>

      {/* Eyebrow + Headline */}
      <div className="absolute top-[200px] left-0 right-0 px-12 text-center">
        <p className="text-amber-700 text-[20px] font-bold tracking-[0.5em]">FITUR UNGGULAN</p>
        <h1 className="mt-6 text-[72px] leading-[1.05] font-extrabold tracking-[-0.03em] text-emerald-950">
          Tikrar MTI Apps
        </h1>
        <p className="mt-4 text-[24px] font-medium text-slate-500">Pendamping setia perjalanan hafalanmu</p>
      </div>

      {/* 2x2 GRID OF FEATURES */}
      <div className="absolute top-[480px] left-1/2 -translate-x-1/2 w-[940px] grid grid-cols-2 gap-6">
        <FeatureCard
          number="01"
          tag="REAL-TIME"
          tagColor="text-emerald-600"
          icon={<Activity className="w-7 h-7" strokeWidth={2.2} />}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          title="Monitor Progres"
          subtitle="Hafalan"
          desc="Pantau hafalanmu kapan saja, di mana saja."
          progress={85}
        />
        <FeatureCard
          number="02"
          tag="DAILY"
          tagColor="text-amber-600"
          icon={<BookOpen className="w-7 h-7" strokeWidth={2.2} />}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
          title="Jurnal Harian"
          subtitle="Terintegrasi"
          desc="Catat ratib tikrar & murajaah otomatis."
        />
        <FeatureCard
          number="03"
          tag="MEASURED"
          tagColor="text-blue-600"
          icon={<BarChart3 className="w-7 h-7" strokeWidth={2.2} />}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          title="Evaluasi Berkala"
          subtitle="& Terukur"
          desc="Tashih rutin oleh muallimah berpengalaman."
        />
        <FeatureCard
          number="04"
          tag="MODERN"
          tagColor="text-purple-600"
          icon={<Smartphone className="w-7 h-7" strokeWidth={2.2} />}
          iconBg="bg-purple-50"
          iconColor="text-purple-600"
          title="Interface yang"
          subtitle="User-Friendly"
          desc="Desain modern dengan PWA & offline ready."
        />
      </div>

      {/* CTA */}
      <div className="absolute top-[930px] left-1/2 -translate-x-1/2">
        <button
          className="relative px-10 py-4 rounded-full text-white text-[24px] font-extrabold"
          style={{
            background: 'linear-gradient(180deg, #0E5238 0%, #064E3B 100%)',
            border: '2px solid transparent',
            backgroundImage:
              'linear-gradient(180deg, #0E5238, #064E3B), linear-gradient(135deg, #F4D26B, #C28F2E, #8B6914)',
            backgroundOrigin: 'border-box',
            backgroundClip: 'padding-box, border-box',
            boxShadow: '0 20px 50px rgba(6,78,59,0.4)',
          }}
        >
          Coba Gratis di markaztikrar.id
        </button>
      </div>

      {/* FOOTER */}
      <div className="absolute bottom-[30px] left-0 right-0 text-center">
        <p className="text-[16px] font-extrabold text-emerald-950">
          WA 08138884240 <span className="text-amber-500 mx-2">•</span> lynk.id/markaztikrar.id
        </p>
      </div>
    </div>
  );
}

interface FeatureCardProps {
  number: string;
  tag: string;
  tagColor: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string;
  desc: string;
  progress?: number;
}

function FeatureCard({
  number,
  tag,
  tagColor,
  icon,
  iconBg,
  iconColor,
  title,
  subtitle,
  desc,
  progress,
}: FeatureCardProps) {
  return (
    <div className="bg-white rounded-3xl p-7 shadow-[0_18px_45px_rgba(6,78,59,0.08)] border border-slate-100 relative overflow-hidden">
      {/* Subtle gradient accent */}
      <div className={`absolute -right-12 -top-12 w-40 h-40 rounded-full ${iconBg} opacity-50 blur-2xl`} />

      <div className="relative flex items-start justify-between">
        <div className={`w-14 h-14 rounded-2xl ${iconBg} ${iconColor} flex items-center justify-center`}>
          {progress !== undefined ? (
            <div className="relative w-12 h-12">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="42" fill="none" stroke="#D1FAE5" strokeWidth="14" />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="#22C55E"
                  strokeWidth="14"
                  strokeLinecap="round"
                  strokeDasharray={`${(progress / 100) * 264} 264`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-emerald-700 text-[10px] font-extrabold">
                {progress}%
              </div>
            </div>
          ) : (
            icon
          )}
        </div>

        <div className="text-right">
          <span className="text-[28px] font-extrabold text-emerald-950">{number}</span>
          <p className={`text-[12px] font-extrabold tracking-[0.2em] ${tagColor} mt-1`}>{tag}</p>
        </div>
      </div>

      <div className="relative mt-5">
        <h3 className="text-[26px] font-extrabold text-emerald-950 leading-tight">{title}</h3>
        <h3 className="text-[26px] font-extrabold text-emerald-950 leading-tight">{subtitle}</h3>
        <p className="text-[15px] text-slate-500 mt-3 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}
