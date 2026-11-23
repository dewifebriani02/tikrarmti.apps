# MTI - Markaz Tikrar Indonesia

Aplikasi Tahfidz Quran Digital untuk membantu para penghafal Al-Quran dalam melacak dan mengelola aktivitas hafalan harian mereka.

## 🚀 Fitur Utama

- **Dashboard Utama** - Ringkasan progress harian dan quick access
- **Jurnal Harian** - Kurikulum 7 tahap wajib + 2 tahap tambahan
- **Tashih Bacaan** - Validasi bacaan dengan form dinamis
- **Perjalanan Saya (My Journeys)** - Timeline 8 milestone progress hafalan
- **Responsive Design** - Desktop, tablet, dan mobile friendly

## 🛠 Teknologi Stack

- **Frontend**: Next.js 14/15 dengan TypeScript
- **UI Framework**: shadcn/ui dengan Radix UI primitives
- **Styling**: Tailwind CSS dengan custom MTI theme
- **Authentication**: Supabase Auth
- **Database**: Supabase PostgreSQL
- **Deployment**: Vercel

## 📋 Prasyarat

- Node.js 18+
- NPM atau Yarn
- Akun Supabase
- Akun Vercel

## 🚀 Quick Start

### 1. Clone Repository

```bash
git clone <repository-url>
cd tikrarmti.apps/mti-app
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup Supabase

1. Buat project baru di [Supabase Dashboard](https://supabase.com/dashboard)
2. Copy URL dan Anon Key ke `.env.local`

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

3. Buat tabel-tabel berikut di Supabase SQL Editor:

```sql
-- Users table (extends auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  email TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'thalibah',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS (Row Level Security)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Jurnal harian table
CREATE TABLE jurnal_harian (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  date DATE NOT NULL,
  completed_steps JSONB,
  counters JSONB,
  recording_time INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE jurnal_harian ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own jurnal" ON jurnal_harian FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own jurnal" ON jurnal_harian FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own jurnal" ON jurnal_harian FOR UPDATE USING (auth.uid() = user_id);

-- Tashih records
CREATE TABLE tashih_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  blok TEXT NOT NULL,
  lokasi TEXT NOT NULL,
  lokasi_detail TEXT,
  nama_pemeriksa TEXT,
  masalah_tajwid TEXT[],
  catatan_tambahan TEXT,
  waktu_tashih TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE tashih_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own tashih" ON tashih_records FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tashih" ON tashih_records FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Progress tracking
CREATE TABLE progress_milestones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  milestone_type TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE progress_milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own progress" ON progress_milestones FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own progress" ON progress_milestones FOR ALL USING (auth.uid() = user_id);
```

### 4. Run Development Server

```bash
npm run dev
```

Aplikasi akan berjalan di [http://localhost:3006](http://localhost:3006)

## 📁 Struktur Proyek

```
mti-app/
├── app/                    # Halaman aplikasi (Next.js App Router)
│   ├── dashboard/         # Dashboard utama
│   ├── jurnal-harian/     # Jurnal harian hafalan
│   ├── perjalanan-saya/   # Timeline progress
│   ├── tashih/            # Validasi bacaan
│   ├── globals.css        # Global CSS dengan theming system
│   ├── layout.tsx         # Layout utama
│   └── page.tsx           # Home page
├── components/            # Komponen reusable
│   ├── DashboardSidebar.tsx     # Global sidebar navigasi
│   ├── AuthenticatedLayout.tsx  # Layout dengan autentikasi
│   └── ui/               # shadcn UI components
├── lib/                  # Utilitas dan konfigurasi
│   ├── utils.ts          # Utility functions
│   └── supabase.ts       # Supabase client configuration
├── public/               # Aset statis
├── .env.local           # Environment variables
├── tailwind.config.js   # Tailwind configuration
├── tsconfig.json        # TypeScript configuration
├── next.config.js       # Next.js configuration
└── package.json         # Dependencies dan scripts
```

## 🎨 Tema & Design

### Color Palette
- **Primary**: Green Army (#4a5f3a) - Warna hijau army khas MTI
- **Secondary**: Gold (#fbbf24) - Aksen emas untuk UI elements
- **Background**: White/Light gray dengan gradient modern

### Animations
- `fadeInUp` - Animasi masuk dari bawah
- `slideInLeft` - Animasi masuk dari kiri
- `slideInRight` - Animasi masuk dari kanan
- `float` - Animasi mengambang

### Glass Morphism
- Backdrop blur effects untuk modern UI
- Semi-transparent backgrounds dengan border

## 🚀 Deployment ke Vercel

### 1. Install Vercel CLI

```bash
npm i -g vercel
```

### 2. Login ke Vercel

```bash
vercel login
```

### 3. Deploy Project

```bash
vercel
```

### 4. Setup Environment Variables di Vercel

1. Buka [Vercel Dashboard](https://vercel.com/dashboard)
2. Pilih project MTI
3. Go to Settings → Environment Variables
4. Tambahkan:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 5. Custom Domain (Opsional)

```bash
vercel --prod
vercel domains add mti.yourdomain.com
```

## 📱 Kurikulum Jurnal Harian

### Kurikulum Wajib (7 Tahap)

1. **Rabth** - Mengulang-ulang 10 blok terakhir (1x)
2. **Murajaah** - Dari hafalan tanpa mushaf (minimal 5x)
3. **Simak Murattal** - Mendengarkan qari (minimal 3x)
4. **Tikrar Bi An-Nadzar** - Dengan melihat mushaf
5. **Tasmi' Record** - Recording dan evaluasi (minimal 3x)
6. **Simak Record** - Mendengarkan kembali recording
7. **Tikrar Bi Al-Ghaib** - Tutup mata (minimal 40x)

### Kurikulum Tambahan (Pilihan)

8. **Tafsir** - Mempelajari makna ayat
9. **Menulis** - Latih menulis ayat

## 🔄 Workflow Pengguna

1. **Login** → Dashboard
2. **Tashih** → Validasi bacaan (wajib)
3. **Jurnal Harian** → Isi kurikulum 7 tahap
4. **Track Progress** → Monitor di Perjalanan Saya
5. **Repeat** → Konsistensi harian

## 🛠 Development

### Available Scripts

```bash
# Development
npm run dev          # Start dev server di port 3003

# Build & Production
npm run build        # Build untuk production
npm run start        # Start production server

# Quality & Testing
npm run lint         # ESLint check
npm run type-check   # TypeScript type checking
```

### Environment Variables

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Environment
NODE_ENV=development
```

## 🤝 Kontribusi

1. Fork repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add some amazing feature'`)
4. Push ke branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📞 Support

Untuk bantuan dan pertanyaan:
- Email: support@mti-id.com
- Website: [mti-id.com](https://mti-id.com)

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

---

**Dikembangkan dengan ❤️ untuk para penghafal Al-Quran**