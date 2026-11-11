export interface HalaqahForReminder {
  id?: string;
  name: string;
  day_of_week?: number;
  start_time?: string;
  end_time?: string;
  preferred_juz?: string;
  class_type?: string;
  zoom_link?: string;
  zoom_name?: string;
  zoom_meeting_id?: string;
  zoom_passcode?: string;
  zoom_claim_host?: string;
  muallimah?: {
    full_name?: string;
    nama_kunyah?: string;
    whatsapp?: string;
  };
  mentors?: Array<{
    role?: string;
    user?: {
      full_name?: string;
      whatsapp?: string;
    };
  }>;
  program?: {
    class_type?: string;
    batch?: {
      name?: string;
    };
  };
  students?: Array<{
    full_name: string;
    preferred_juz?: string;
    phone?: string;
  }>;
  max_students?: number;
  activeCount?: number;
}

export function getHijriDate(date: Date): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-US-u-ca-islamic', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
      timeZone: 'Asia/Jakarta'
    });
    
    // Returns something like "2/27/1448 AH" or "2/27/1448"
    const parts = formatter.formatToParts(date);
    const day = parts.find(p => p.type === 'day')?.value || '1';
    const month = parts.find(p => p.type === 'month')?.value || '1';
    const year = parts.find(p => p.type === 'year')?.value || '1448';
    
    const hijriMonths = [
      '',
      'Muharram', 'Safar', "Rabi'ul Awal", "Rabi'ul Akhir",
      'Jumadil Awal', 'Jumadil Akhir', 'Rajab', "Sya'ban",
      'Ramadhan', 'Syawal', "Dzulqa'dah", 'Dzulhijjah'
    ];
    
    const monthName = hijriMonths[parseInt(month, 10)] || `Bulan ${month}`;
    return `${day} ${monthName} ${year} H`;
  } catch (err) {
    // Fallback if ca-islamic is totally unsupported
    return '';
  }
}

export function getMasehiDate(date: Date): string {
  const formatter = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta'
  });
  return formatter.format(date);
}

export function getDayName(dayNum?: number): string {
  const days = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Ahad'];
  if (dayNum === undefined) return '';
  if (dayNum >= 1 && dayNum <= 7) return days[dayNum];
  return '';
}

export function formatTimeShort(time?: string): string {
  if (!time) return '';
  return time.substring(0, 5).replace(':', '.');
}

export function toTitleCase(str: string): string {
  if (!str) return '';
  return str.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
}

export function getClassTypeLabel(classType?: string): string {
  if (classType === 'tikrar_tahfidz') return 'TIKRAR';
  if (classType === 'pra_tahfidz') return 'PRA TIKRAR UMUM';
  if (classType === 'tikrar_berbayar') return 'TIKRAR BERBAYAR';
  return (classType || '').toUpperCase().replace(/_/g, ' ');
}

export function getZoomEmoji(zoomName?: string): string {
  if (!zoomName) return '';
  const match = zoomName.match(/Room\s*(\d+)/i);
  if (match && match[1]) {
    const emojis = ['0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'];
    return match[1].split('').map(digit => emojis[parseInt(digit, 10)]).join('');
  }
  return '';
}

export function generateHalaqahReminder(halaqah: HalaqahForReminder, date: Date = new Date()): string {
  const juz = halaqah.preferred_juz || '';
  const isPraTahfidz = halaqah.class_type === 'pra_tahfidz';
  const title = isPraTahfidz ? `🌟  𝐏𝐑𝐀 𝐓𝐈𝐊𝐑𝐀𝐑  🌟` : `🌟  𝐓𝐈𝐊𝐑𝐀𝐑  *JUZ ${juz}* 🌟`;
  
  const muallimah_name = toTitleCase(halaqah.muallimah?.nama_kunyah || halaqah.muallimah?.full_name || '');
  const day_name = getDayName(halaqah.day_of_week) || new Intl.DateTimeFormat('id-ID', { weekday: 'long', timeZone: 'Asia/Jakarta' }).format(date);
  
  const tanggal_masehi = getMasehiDate(date);
  const tanggal_hijri = getHijriDate(date);
  const time = formatTimeShort(halaqah.start_time);
  
  const zoom_emoji = getZoomEmoji(halaqah.zoom_name);
  const zoom_url = halaqah.zoom_link || '';
  const meeting_id = halaqah.zoom_meeting_id || '';
  const passcode = halaqah.zoom_passcode || '';
  const class_type_label = getClassTypeLabel(halaqah.class_type);

  const students = halaqah.students || [];
  const maxStudents = halaqah.max_students || 20; // Default fallback
  const count = students.length;
  
  let studentList = '';
  let tholibahHeader = '';

  if (isPraTahfidz) {
    tholibahHeader = `👥  Jumlah Thalibah : ${maxStudents} orang`;
    studentList = ''; // Pra Tikrar has no list of names
  } else {
    tholibahHeader = `👥  ${count} Tholibah :`;
    studentList = students.map((s, index) => {
      const studentJuz = s.preferred_juz || juz;
      const juzLabel = studentJuz && !isPraTahfidz ? `(Juz ${studentJuz})` : '';
      
      let phoneLink = '';
      if (s.phone) {
        // Remove non-digit characters and replace leading 0 with 62
        const cleanPhone = s.phone.replace(/[^0-9]/g, '').replace(/^0/, '62');
        phoneLink = ` - wa.me/${cleanPhone}`;
      }

      return `${index + 1}. ${toTitleCase(s.full_name)} ${juzLabel}${phoneLink}`.trim();
    }).join('\n');
  }

  let mentorLine = '';
  if (halaqah.mentors && halaqah.mentors.length > 0) {
    const validMentors = halaqah.mentors.filter(m => m.role === 'raisah' || m.role === 'musyrifah');
    mentorLine = validMentors.map(m => {
      const roleLabel = m.role === 'raisah' ? 'Raisah' : m.role === 'musyrifah' ? 'Musyrifah' : 'Musyrifah/Raisah';
      const mentorName = toTitleCase(m.user?.full_name || '...');
      return `\n🎗️ ${roleLabel}: ${mentorName}`;
    }).join('');
  }

  return `╔❀◎🎓◎❀════════════════╗
 🔸𝗠𝗔𝗥𝗞𝗔𝗭 𝗧𝗜𝗞𝗥𝗔𝗥 𝗜𝗡𝗗𝗢𝗡𝗘𝗦𝗜𝗔🔸
╚════════════════❀◎🎓◎❀╝

${title}

بِسْــــــــــــــــــمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ
السَّلاَمُ عَلَيْكُمْ وَرَحْمَةُ اللهِ وَبَرَكَاتُهُ

In syaa Allaahu Ta'alaa bersama:

👑  *Ustadzah :  ${muallimah_name} حفظها الله تعالى*${mentorLine}
📆  *Hari/Tanggal : ${day_name}, ${tanggal_masehi}*
        *${tanggal_hijri}*
⏰  *Pukul : ${time} WIB - selesai*
🪩  *LINK ZOOM${zoom_emoji ? ' ' + zoom_emoji : ''}* 
${zoom_url}
*ID Rapat: ${meeting_id}*
*Kode sandi : ${passcode}*

📜 *TATA TERTIB KELAS ${class_type_label}*
* Niatkan ikhlas Lillaahi Ta'alaa
* *Memperhatikan ADAB* terhadap Mu'allimah, jika dikoreksi agar diperhatikan dan bertanya dengan bahasa yang santun
* Hadir 30 menit sebelum kelas dimulai
* Mempersiapkan materi yang akan dibaca
* Menulis nama di chatt Zoom sesuai nama pada saat mendaftar
* Menjaga audio dan video
* Menjaga suara Mu'allimaat dan Thalibaat dari Ajnabi
* Membuka mic pada saat dipanggil

Izin tag Ustadzah dan Thalibah 
👑 Ustadzah: ${muallimah_name}

${tholibahHeader}
${studentList}

⛔ *FREE SHARE LINK KELUAR MTI*
━━━━━━━━━━━━━━━━❁❁
𝗠𝗔𝗥𝗞𝗔𝗭 𝗧𝗜𝗞𝗥𝗔𝗥 𝗜𝗡𝗗𝗢𝗡𝗘𝗦𝗜𝗔

📱 *MTI OFFICIAL : 08138884240*
🔗 *Tap Lynk : https://lynk.id/markaztikrar.id*`;
}

export function generateDailyReminder(batchName: string, halaqahs: HalaqahForReminder[], date: Date = new Date(), coordinatorName: string = ''): string {
  const day_name = new Intl.DateTimeFormat('id-ID', { weekday: 'long', timeZone: 'Asia/Jakarta' }).format(date).toUpperCase();
  const date_masehi = getMasehiDate(date).toUpperCase();
  
  const sortedHalaqahs = [...halaqahs].sort((a, b) => {
    const timeComparison = (a.start_time || '99:99').localeCompare(b.start_time || '99:99');
    if (timeComparison !== 0) return timeComparison;
    return (a.muallimah?.full_name || a.name || '').localeCompare(
      b.muallimah?.full_name || b.name || '',
      'id'
    );
  });

  const scheduleStr = sortedHalaqahs.map(h => {
    const isPraTikrar = h.class_type === 'pra_tahfidz';
    const classLabel = isPraTikrar
      ? '𝗞𝗘𝗟𝗔𝗦 𝗣𝗥𝗔 𝗧𝗜𝗞𝗥𝗔𝗥 𝗨𝗠𝗨𝗠'
      : `𝗞𝗘𝗟𝗔𝗦 𝗧𝗜𝗞𝗥𝗔𝗥${h.preferred_juz ? ` 𝗝𝗨𝗭 ${h.preferred_juz}` : ''}`;
    const coordinatorLabel = isPraTikrar ? 'Musyrifah' : 'Roisah';

    const coordinatorNameFormatted = coordinatorName ? coordinatorName : '........................';
    const activeStudents = h.students?.filter((st: any) => st.status === 'active').length || 0;
    const maxStudents = h.max_students || '-';
    return `🛡️  ${classLabel}
⏰  *${formatTimeShort(h.start_time)} WIB*
👑  Ustadzah ${toTitleCase(h.muallimah?.nama_kunyah || h.muallimah?.full_name || '')}
🎗️  ${coordinatorLabel} : ${coordinatorNameFormatted}
👥  Kuota : ${activeStudents}/${maxStudents} Thalibah
🌐  Link Zoom${getZoomEmoji(h.zoom_name) ? ' ' + getZoomEmoji(h.zoom_name) : ''}
${h.zoom_link || ''}

*ID Rapat: ${h.zoom_meeting_id || ''}*
*Kode Sandi: ${h.zoom_passcode || ''}*

🔸🔸🔸🔸🔸🔸🔸`;
  }).join('\n\n');

  const tanggal_hijri = getHijriDate(date);

  return `╔❀◎🎓◎❀════════════╗
𝗠𝗔𝗥𝗞𝗔𝗭 𝗧𝗜𝗞𝗥𝗔𝗥 𝗜𝗡𝗗𝗢𝗡𝗘𝗦𝗜𝗔
╚════════════❀◎🎓◎❀╝

بِسْــــــــــــــــــمِ اللهِ الرَّحْمَنِ الرَّحِيْمِ

السَّلاَمُ عَلَيْكُمْ وَرَحْمَةُ اللهِ وَبَرَكَاتُهُ

📍  𝗥𝗘𝗠𝗜𝗡𝗗𝗘𝗥 𝗝𝗔𝗗𝗪𝗔𝗟 𝗛𝗔𝗟𝗔𝗤𝗔𝗛 𝗠𝗧𝗜 
*${batchName.toUpperCase()}*

🗓️  *${day_name}, ${date_masehi} | ${tanggal_hijri}*

${scheduleStr}

جزاكن الله خيرا وبارك الله فيكن  🌹🌹🌹

━━━━━━━━━━━━━━━━❁❁

𝗠𝗔𝗥𝗞𝗔𝗭 𝗧𝗜𝗞𝗥𝗔𝗥 𝗜𝗡𝗗𝗢𝗡𝗘𝗦𝗜𝗔

📱 *MTI OFFICIAL : 08138884240*
🪩  *Website MTI : markaztikrar.id*
🔗 *Tap Lynk : https://lynk.id/markaztikrar.id*`;
}



export function generateLaporanKelas(halaqah: HalaqahForReminder, date: Date = new Date(), coordinatorName: string = ''): string {
  const juz = halaqah.preferred_juz || '';
  const muallimah_name = toTitleCase(halaqah.muallimah?.nama_kunyah || halaqah.muallimah?.full_name || '');
  const time = formatTimeShort(halaqah.start_time);
  const day = getDayName(halaqah.day_of_week) || new Intl.DateTimeFormat('id-ID', { weekday: 'long', timeZone: 'Asia/Jakarta' }).format(date);
  const dateStr = getMasehiDate(date);
  const tanggal_hijri = getHijriDate(date);
  
  const students = halaqah.students || [];
  const studentList = students.map((s, index) => {
    const studentJuz = s.preferred_juz || juz;
    const juzLabel = studentJuz ? `(Juz ${studentJuz})` : '';
    return `${index + 1}. ✅ ${toTitleCase(s.full_name)} ${juzLabel}`.trim();
  }).join('\n');

  const isPraTikrar = halaqah.class_type === 'pra_tahfidz';
  const classLabel = isPraTikrar ? 'PRA TIKRAR UMUM MTI' : `TIKRAR MTI Juz ${juz}`;

  let mentorLine = `🏅Raisah : ${coordinatorName ? coordinatorName : '........................'}`;
  if (halaqah.mentors && halaqah.mentors.length > 0) {
    const validMentors = halaqah.mentors.filter(m => m.role === 'raisah' || m.role === 'musyrifah');
    if (validMentors.length > 0) {
      mentorLine = validMentors.map(m => {
        const roleLabel = m.role === 'raisah' ? 'Raisah' : m.role === 'musyrifah' ? 'Musyrifah' : 'Musyrifah/Raisah';
        const mentorName = toTitleCase(m.user?.full_name || '...');
        return `🏅${roleLabel} : ${mentorName}`;
      }).join('\n');
    }
  }

  return `*BERITA ACARA KELAS ${classLabel}.*
${day}, Pukul ${time} WIB

👑Ustadzah ${muallimah_name} حفظها الله تعالى
${mentorLine}
🗓 ${day}, ${dateStr} | ${tanggal_hijri}

Keterangan:
✅Hadir tepat waktu
☑️Hadir Terlambat
ℹ️Izin udzur syar'i
🅰️Tidak hadir/tanpa kabar

Tholibah :
${studentList}

Semoga Allah Subhaanahu wa Ta'aala mengangkat derajat dan membalas dengan sebaik-baik pahala kepada Ustadzah ${muallimah_name} حفظها الله تعالى atas ilmu dan waktunya yang telah diberikan. 

Dan juga kepada seluruh thallibah, _jazaakunallah khayran_ atas kehadirannya, semoga Allah berikan keberkahan ilmu dan waktunya. امين اللّهم امين

جزاكن الله خيرا و بارك الله فيكن جميعاً 🌻
❁ ━━━━━━ 📚 ━━━━━━ ❁`;
}

export function generateMuallimahReminder(halaqah: HalaqahForReminder, date: Date = new Date()): string {
  const isPraTahfidz = halaqah.class_type === 'pra_tahfidz';
  const juz = halaqah.preferred_juz || '';
  const classLabel = isPraTahfidz ? 'Pra Tikrar Umum' : `Tikrar Tahfidz Juz ${juz}`;
  const dayName = getDayName(halaqah.day_of_week) || new Intl.DateTimeFormat('id-ID', { weekday: 'long', timeZone: 'Asia/Jakarta' }).format(date);
  const tanggalMasehi = getMasehiDate(date);
  const time = formatTimeShort(halaqah.start_time);
  const tanggalHijri = getHijriDate(date);
  
  const muallimah_name = halaqah.muallimah?.nama_kunyah ? toTitleCase(halaqah.muallimah.nama_kunyah) : (halaqah.muallimah?.full_name ? toTitleCase(halaqah.muallimah.full_name) : '...');
  const zoom_url = halaqah.zoom_link || '';
  const meeting_id = halaqah.zoom_meeting_id || '';
  const passcode = halaqah.zoom_passcode || '';
  const zoom_emoji = getZoomEmoji(halaqah.zoom_name);

  let mentorLine = '';
  if (halaqah.mentors && halaqah.mentors.length > 0) {
    const validMentors = halaqah.mentors.filter(m => m.role === 'raisah' || m.role === 'musyrifah');
    mentorLine = validMentors.map(m => {
      const roleLabel = m.role === 'raisah' ? 'Raisah' : m.role === 'musyrifah' ? 'Musyrifah' : 'Musyrifah/Raisah';
      const mentorName = toTitleCase(m.user?.full_name || '...');
      return `\n🎗️  *${roleLabel} : ${mentorName}*`;
    }).join('');
  }

  return `*REMINDER KELAS USTADZAH*

بِسْــــــــــــــــــمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ 

السَّلاَمُ عَلَيْكُمْ وَرَحْمَةُ اللهِ وَبَرَكَاتُهُ


🌹🌹🌹
Ahsanallahu ilaikum yaa Ustadzaty Al Ghaaliyah.. 💐

Kaifa haalukum yaa *Ustadzah ${muallimah_name}* ? 
Semoga Ustadzah senantiasa dalam lindungan Allah Ta'ala. Aamiin.... 

Mohon izin mengingatkan bahwa *pagi ini* ada kelas:

📚  *${classLabel}*${mentorLine}

🗓️  *${dayName}, ${tanggalMasehi} | ${tanggalHijri}*
🕰️  *Pukul : ${time} WIB - selesai*

🪩  *LINK ZOOM${zoom_emoji ? ' ' + zoom_emoji : ''}*
${zoom_url}


*ID Meeting: ${meeting_id}*
*Password: ${passcode}*


In syaa Allaahu Ta'alaa kita ada jadwal belajar bersama Ustadzah. Semoga Allah mudahkan untuk kita berkumpul kembali di halaqah.

آمــين اَللّهُمَّ آمــين


*جزاكم الله خيرا*
*و بارك الله فيكم أستاذة...*`;
}
