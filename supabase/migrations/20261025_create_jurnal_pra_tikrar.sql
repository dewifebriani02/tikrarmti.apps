-- Migration: Create jurnal_pra_tikrar table
-- Sesuai struktur MTI:
-- - Mu'allimah: Pengampu materi edukasi, bimbingan bacaan, tashih tajwid, dan kelancaran
-- - Musyrifah: Pengelola operasional kelas, reminder Zoom, presensi tatap muka, dan koordinasi izin

CREATE TABLE IF NOT EXISTS public.jurnal_pra_tikrar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  batch_id UUID REFERENCES public.batches(id) ON DELETE SET NULL,
  halaqah_id UUID REFERENCES public.halaqah(id) ON DELETE SET NULL,
  tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
  pekan_ke INTEGER DEFAULT 1,
  
  -- Simak Murottal Mandiri (SOP 3x Sehari)
  simak_1 BOOLEAN DEFAULT false,
  simak_2 BOOLEAN DEFAULT false,
  simak_3 BOOLEAN DEFAULT false,
  metode_simak TEXT DEFAULT 'murni', -- 'murni', 'gerak_bibir', 'selaras_ketukan'
  
  -- Setoran / Latihan Bacaan Santri
  surat_nama TEXT, -- e.g. "An-Naba'"
  ayat_range TEXT, -- e.g. "1-10"
  durasi_menit INTEGER DEFAULT 0,
  catatan_santri TEXT,
  
  -- Bimbingan & Tashih Edukasi (oleh Mu'allimah)
  muallimah_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  catatan_muallimah TEXT,
  evaluasi_tajwid JSONB DEFAULT '[]'::jsonb, -- array of { kategori, deskripsi }
  status_bacaan TEXT DEFAULT 'belum_tashih', -- 'belum_tashih', 'perlu_bimbingan', 'cukup', 'lancar_mutqin'
  tashih_at TIMESTAMPTZ,
  
  -- Presensi & Pengelolaan Kelas (oleh Musyrifah)
  musyrifah_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  kehadiran_zoom TEXT DEFAULT 'belum_absen', -- 'belum_absen', 'hadir', 'izin_syari', 'sakit', 'alpa'
  catatan_musyrifah TEXT,
  absen_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT unique_user_tanggal_pra_tikrar UNIQUE (user_id, tanggal)
);

CREATE INDEX IF NOT EXISTS idx_jurnal_pra_tikrar_user ON public.jurnal_pra_tikrar(user_id);
CREATE INDEX IF NOT EXISTS idx_jurnal_pra_tikrar_halaqah ON public.jurnal_pra_tikrar(halaqah_id);
CREATE INDEX IF NOT EXISTS idx_jurnal_pra_tikrar_tanggal ON public.jurnal_pra_tikrar(tanggal);

-- Grant permissions for PostgREST & mti_user
GRANT ALL ON TABLE public.jurnal_pra_tikrar TO mti_user;
GRANT ALL ON TABLE public.jurnal_pra_tikrar TO authenticated;
GRANT SELECT ON TABLE public.jurnal_pra_tikrar TO anon;
