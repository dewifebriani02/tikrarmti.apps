export interface FormPublicationSettings {
  tikrar_tahfidz: boolean;
  pra_tikrar: boolean;
  muallimah: boolean;
  musyrifah: boolean;
  kelas_berbayar: boolean;
  daftar_ulang: boolean;
}

export type FormKey = keyof FormPublicationSettings;

export const DEFAULT_FORM_PUBLICATION_SETTINGS: FormPublicationSettings = {
  tikrar_tahfidz: true,
  pra_tikrar: false,
  muallimah: true,
  musyrifah: false,
  kelas_berbayar: true,
  daftar_ulang: true,
};

export interface FormItemConfig {
  key: FormKey;
  title: string;
  badge: string;
  category: string;
  description: string;
  path: string;
  color: {
    bg: string;
    border: string;
    text: string;
    activeBg: string;
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
  };
}

export const FORM_ITEMS_CONFIG: FormItemConfig[] = [
  {
    key: 'tikrar_tahfidz',
    title: 'Pendaftaran Tikrar Tahfidz',
    badge: 'Program Utama',
    category: 'Santri (Thalibah)',
    description: 'Hafalan Al-Qur\'an intensif metode 40x pengulangan (Juz 1, 2, 27, 28, 29, 30) dengan sistem pasangan setoran.',
    path: '/pendaftaran/tikrar-tahfidz',
    color: {
      bg: 'from-amber-500/10 to-amber-500/5',
      border: 'border-amber-200/80',
      text: 'text-amber-900',
      activeBg: 'bg-amber-600',
      badgeBg: 'bg-amber-50',
      badgeText: 'text-amber-800',
      badgeBorder: 'border-amber-200',
    },
  },
  {
    key: 'pra_tikrar',
    title: 'Pendaftaran Pra-Tikrar',
    badge: 'Tahsin Dasar',
    category: 'Santri (Thalibah)',
    description: 'Perbaikan bacaan dasar Al-Qur\'an (Tahsin) & pembekalan makhraj huruf (Juz 30) sebelum masuk ke program hafalan.',
    path: '/pendaftaran/pra-tikrar',
    color: {
      bg: 'from-fuchsia-500/10 to-fuchsia-500/5',
      border: 'border-fuchsia-200/80',
      text: 'text-fuchsia-900',
      activeBg: 'bg-fuchsia-600',
      badgeBg: 'bg-fuchsia-50',
      badgeText: 'text-fuchsia-800',
      badgeBorder: 'border-fuchsia-200',
    },
  },
  {
    key: 'muallimah',
    title: "Pendaftaran Mu'allimah",
    badge: 'Khadimat Pengajar',
    category: 'Tim Pengajar & Penguji',
    description: 'Profil & akad komitmen mengajar, menyimak setoran, menguji pekanan, serta mentashih bacaan thalibah.',
    path: '/pendaftaran/muallimah',
    color: {
      bg: 'from-emerald-500/10 to-emerald-500/5',
      border: 'border-emerald-200/80',
      text: 'text-emerald-900',
      activeBg: 'bg-emerald-600',
      badgeBg: 'bg-emerald-50',
      badgeText: 'text-emerald-800',
      badgeBorder: 'border-emerald-200',
    },
  },
  {
    key: 'musyrifah',
    title: 'Pendaftaran Musyrifah / Raisah',
    badge: 'Manajerial Halaqah',
    category: 'Tim Pendamping & Kepemimpinan',
    description: 'Pendamping halaqah, pemantau kedisiplinan setoran pasangan, dan koordinator grup belajar thalibah.',
    path: '/pendaftaran/musyrifah',
    color: {
      bg: 'from-blue-500/10 to-blue-500/5',
      border: 'border-blue-200/80',
      text: 'text-blue-900',
      activeBg: 'bg-blue-600',
      badgeBg: 'bg-blue-50',
      badgeText: 'text-blue-800',
      badgeBorder: 'border-blue-200',
    },
  },
  {
    key: 'kelas_berbayar',
    title: 'Pendaftaran Kelas Berbayar',
    badge: 'Kelas Khusus / Berbayar',
    category: 'Bimbingan Khusus',
    description: 'Program bimbingan intensif berbayar bersama Mu\'allimah dan pengajuan kelas mandiri.',
    path: '/pendaftaran/kelas-berbayar',
    color: {
      bg: 'from-indigo-500/10 to-indigo-500/5',
      border: 'border-indigo-200/80',
      text: 'text-indigo-900',
      activeBg: 'bg-indigo-600',
      badgeBg: 'bg-indigo-50',
      badgeText: 'text-indigo-800',
      badgeBorder: 'border-indigo-200',
    },
  },
  {
    key: 'daftar_ulang',
    title: 'Formulir Daftar Ulang (Reregistration)',
    badge: 'Tahap Akhir Seleksi',
    category: 'Konfirmasi Kelulusan',
    description: 'Formulir konfirmasi komitmen, verifikasi nomor WhatsApp/Telegram, dan administrasi bagi calon santri lulus.',
    path: '/daftar-ulang',
    color: {
      bg: 'from-teal-500/10 to-teal-500/5',
      border: 'border-teal-200/80',
      text: 'text-teal-900',
      activeBg: 'bg-teal-600',
      badgeBg: 'bg-teal-50',
      badgeText: 'text-teal-800',
      badgeBorder: 'border-teal-200',
    },
  },
];
