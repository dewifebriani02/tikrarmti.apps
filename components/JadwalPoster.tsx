'use client';

import { forwardRef } from 'react';
import { formatTimeShort, HalaqahForReminder } from '@/lib/reminder-generator';

interface JadwalPosterProps {
  halaqahs: HalaqahForReminder[];
  dayName: string;
  dayNum: number;
  variant?: 'tikrar' | 'pra_tikrar';
}

const POSTER_STYLES = {
  tikrar: {
    background: '/posters/jadwal-tikrar-bg.png',
    title: '#087f4f',
    header: '#dff2d6',
    row: 'rgba(255,255,255,.78)',
    rowAlt: 'rgba(218,241,205,.88)',
    accent: '#0aa865',
    label: 'TIKRAR'
  },
  pra_tikrar: {
    background: '/posters/jadwal-pra-tikrar-bg.png',
    title: '#9b4769',
    header: '#f7dcd8',
    row: 'rgba(255,255,255,.80)',
    rowAlt: 'rgba(249,224,218,.90)',
    accent: '#c66b78',
    label: 'PRA-TIKRAR'
  }
};

function classLabel(halaqah: HalaqahForReminder, variant: 'tikrar' | 'pra_tikrar') {
  if (variant === 'pra_tikrar') return 'Pra Tikrar Umum';
  return halaqah.preferred_juz ? `Tikrar Juz ${halaqah.preferred_juz}` : 'Tikrar Tahfidz';
}

const FooterIcon = ({ type }: { type: 'link' | 'web' | 'phone' }) => (
  <span style={{ width: 39, height: 39, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 999, background: '#08b970', color: '#fff', fontSize: 22, fontWeight: 900 }}>
    {type === 'link' ? '↗' : type === 'web' ? '◎' : '●'}
  </span>
);

export const JadwalPoster = forwardRef<HTMLDivElement, JadwalPosterProps>(
  ({ halaqahs, dayName, variant = 'tikrar' }, ref) => {
    const theme = POSTER_STYLES[variant];
    const rowHeight = halaqahs.length > 7 ? 64 : halaqahs.length > 5 ? 72 : 82;
    const bodyFont = halaqahs.length > 7 ? 21 : 25;

    return (
      <div
        ref={ref}
        style={{
          width: 1080,
          height: 1080,
          position: 'relative',
          overflow: 'hidden',
          color: '#151515',
          backgroundImage: `url(${theme.background})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          fontFamily: "'Trebuchet MS', 'Segoe UI', Arial, sans-serif"
        }}
      >
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(255,255,255,.02) 0%, rgba(255,255,255,.07) 76%, rgba(255,255,255,.16) 100%)' }} />

        <div style={{ position: 'absolute', top: 39, right: 44, width: 105, height: 105, padding: 8, borderRadius: 18, background: 'rgba(255,255,255,.74)', boxShadow: '0 7px 24px rgba(51,38,17,.12)' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.jpg" alt="Markaz Tikrar Indonesia" crossOrigin="anonymous" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 12 }} />
        </div>

        <main style={{ position: 'relative', zIndex: 2, padding: '110px 68px 112px' }}>
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ margin: '0 0 12px', color: theme.title, fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 61, lineHeight: 1, fontWeight: 700, letterSpacing: -.8, textShadow: '0 2px 0 rgba(255,255,255,.8)' }}>
              {theme.label}
            </h1>
            <h1 style={{ margin: '0 0 120px', color: theme.title, fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 61, lineHeight: 1, fontWeight: 700, letterSpacing: -.8, textShadow: '0 2px 0 rgba(255,255,255,.8)' }}>
              Jadwal Halaqah {dayName}
            </h1>
          </div>

          <section style={{ overflow: 'hidden', borderRadius: 8, boxShadow: '0 12px 38px rgba(54,50,33,.14)', border: '1px solid rgba(255,255,255,.8)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '75px 165px 1.15fr 1.35fr', minHeight: 64, alignItems: 'center', background: theme.header, fontSize: 20, fontWeight: 900, textTransform: 'uppercase' }}>
              <div style={{ textAlign: 'center' }}>No</div>
              <div style={{ padding: '0 16px', textAlign: 'center', borderLeft: `2px dotted ${theme.accent}` }}>Waktu (WIB)</div>
              <div style={{ padding: '0 20px', borderLeft: `2px dotted ${theme.accent}` }}>Halaqah</div>
              <div style={{ padding: '0 20px', borderLeft: `2px dotted ${theme.accent}` }}>Nama Ustadzah</div>
            </div>

            {[...halaqahs].sort((a, b) => (a.start_time || '').localeCompare(b.start_time || '')).map((halaqah, index) => (
              <div key={halaqah.id || index} style={{ display: 'grid', gridTemplateColumns: '75px 165px 1.15fr 1.35fr', minHeight: rowHeight, alignItems: 'center', background: index % 2 === 0 ? theme.row : theme.rowAlt, fontSize: bodyFont }}>
                <div style={{ textAlign: 'center', fontWeight: 900 }}>{index + 1}</div>
                <div style={{ padding: '0 16px', textAlign: 'center', borderLeft: `2px dotted ${theme.accent}`, fontWeight: 800 }}>{formatTimeShort(halaqah.start_time)}</div>
                <div style={{ padding: '0 20px', borderLeft: `2px dotted ${theme.accent}`, fontWeight: 650 }}>{classLabel(halaqah, variant)}</div>
                <div style={{ padding: '0 20px', borderLeft: `2px dotted ${theme.accent}`, fontWeight: 650 }}>{halaqah.muallimah?.nama_kunyah || halaqah.muallimah?.full_name || '-'}</div>
              </div>
            ))}

            {halaqahs.length === 0 && (
              <div style={{ padding: 54, textAlign: 'center', background: theme.row, fontSize: 24, color: '#6b6b6b' }}>Belum ada jadwal</div>
            )}
          </section>
        </main>

        <footer style={{ position: 'absolute', zIndex: 3, left: 0, right: 0, bottom: 0, height: 78, display: 'grid', gridTemplateColumns: '1.28fr 1fr 1fr', alignItems: 'center', padding: '0 27px', color: '#fff', background: 'linear-gradient(90deg, #57bd75 0%, #128956 58%, #006c47 100%)', boxShadow: '0 -5px 20px rgba(18,88,52,.12)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, fontSize: 21, fontFamily: 'Georgia, serif', fontWeight: 700 }}><FooterIcon type="link" />lynk.id/markaztikrar.id</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 11, fontSize: 20, fontFamily: 'Georgia, serif', fontWeight: 700 }}><FooterIcon type="web" />markaztikrar.id</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 11, fontSize: 21, fontFamily: 'Georgia, serif', fontWeight: 700 }}><FooterIcon type="phone" />0813-8884-240</div>
        </footer>
      </div>
    );
  }
);

JadwalPoster.displayName = 'JadwalPoster';
