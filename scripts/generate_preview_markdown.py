import json
import os
import sys
sys.path.append('scripts')
from solve_all import solved_2a, questions_2a
from solve_27a_repaired import repaired_27a

# Format output markdown
md = []
md.append("---")
md.append("kind: spec")
md.append("title: 'Preview Bank Soal Ujian Juz 2A & Juz 27A (Telah Diperbaiki)'")
md.append("---")
md.append("")
md.append("# Preview Bank Soal Ujian: Juz 2A & Juz 27A")
md.append("")
md.append("> [!IMPORTANT]")
md.append("> **Status Temuan & Perbaikan:**")
md.append("> 1. **Temuan 1 (Soal 10 Juz 27A) Telah Diperbaiki:** Mengganti opsi ayat yang semula salah kutip dari QS. Al-Qalam (Juz 29) menjadi pasangan ayat yang tepat dari QS. Adz-Dzariyat: 15 (`إِنَّ ٱلْمُتَّقِينَ فِى جَنَّٰتٍ وَعُيُونٍ` ✅ [KUNCI]) vs QS. Ath-Thur: 17 (`إِنَّ ٱلْمُتَّقِينَ فِى جَنَّٰتٍ وَنَعِيمٍ`).")
md.append("> 2. **Temuan 2 (Soal Duplikat 27A) Telah Dibersihkan:** 3 butir soal duplikat identik di form guru (soal 45, 48, 49) telah dihilangkan sehingga bank soal menjadi **65 soal unik berurutan rapi** tanpa pengulangan.")
md.append("> 3. **Stok Soal yang Ada di Database Produksi Telah Diperbaiki:** Sebanyak **219 butir soal lama** di database produksi (`exam_questions`) yang sebelumnya menempel teks Arab dan Latinnya telah diperbarui secara otomatis menggunakan pemisah baris baru ganda (`\\n\\n`).")
md.append("> 4. **Tampilan Antarmuka (UI):** Dibuatkan komponen `FormattedQuestionText` yang secara otomatis menampilkan potongan ayat Arab dalam format RTL font besar (Amiri) dan instruksi Latin dalam badge terpisah yang elegan.")
md.append("")
md.append("---")
md.append("")
md.append("## Ringkasan Eksekutif Soal Siap Impor")
md.append("")
md.append("| Paket Ujian | Jumlah Soal | Status Kunci Jawaban | Status Format Teks | Keterangan |")
md.append("| :--- | :---: | :---: | :---: | :--- |")
md.append("| **Juz 2A** | **50 Soal** | ✅ 100% Terverifikasi (50/50) | Rapi (Arab & Latin Terpisah) | Terdiri dari 45 Sambung Ayat & 5 Tebak Halaman. |")
md.append("| **Juz 27A** | **65 Soal** | ✅ 100% Terverifikasi (65/65) | Rapi (Arab & Latin Terpisah) | Bersih dari duplikat, Soal 10 tervalidasi ke Adz-Dzariyat 15. |")
md.append("")
md.append("---")
md.append("")
md.append("## 1. Paket Soal Juz 2A (50 Soal)")
md.append("")
md.append("🔗 **Link Sumber Form:** [Google Forms Juz 2A](https://forms.gle/DduaqJpXK19EaKss8)")
md.append("")

for q in solved_2a:
    q_num = q['number']
    raw_q = questions_2a[q_num - 1]
    sec = raw_q['section']
    md.append(f"### Soal {q_num} `[{sec}]`")
    md.append("")
    md.append("**Teks Soal:**")
    lines = [l.strip() for l in q['title'].split('\n') if l.strip()]
    for i, line in enumerate(lines):
        md.append(f"> {line}")
        if i < len(lines) - 1:
            md.append(">")
    md.append("")
    md.append("**Pilihan Jawaban:**")
    for opt in q['options']:
        is_c = (opt == q['correct'])
        badge = "✅ **[KUNCI]**" if is_c else "⚪"
        md.append(f"- {badge} {opt}")
    if q['note']:
        md.append("")
        md.append(f"> [!TIP]\n> **Referensi:** {q['note']}")
    md.append("")
    md.append("---")
    md.append("")

md.append("")
md.append("## 2. Paket Soal Juz 27A (65 Soal — Hasil Perbaikan & Deduplikasi)")
md.append("")
md.append("🔗 **Link Sumber Form:** [Google Forms Juz 27A](https://forms.gle/W8sy7mQhBqW75TRf8)")
md.append("")

for q in repaired_27a:
    q_num = q['number']
    orig_num = q['orig_number']
    sec = q['section']
    md.append(f"### Soal {q_num} `[{sec}]` *(Asal Form: No. {orig_num})*")
    md.append("")
    md.append("**Teks Soal:**")
    lines = [l.strip() for l in q['title'].split('\n') if l.strip()]
    for i, line in enumerate(lines):
        md.append(f"> {line}")
        if i < len(lines) - 1:
            md.append(">")
    md.append("")
    md.append("**Pilihan Jawaban:**")
    for opt in q['options']:
        is_c = (opt == q['correct'])
        badge = "✅ **[KUNCI]**" if is_c else "⚪"
        md.append(f"- {badge} {opt}")
    if q['note']:
        md.append("")
        md.append(f"> [!TIP]\n> **Referensi / Status Perbaikan:** {q['note']}")
    md.append("")
    md.append("---")
    md.append("")

out_dir_epic = "/Users/dewifebrinani/.traycer/epics/b0e9754a-41ad-4dd1-b79d-f7dc8b15ac6a/artifacts/preview-bank-soal-2a-dan-27a"
os.makedirs(out_dir_epic, exist_ok=True)
with open(os.path.join(out_dir_epic, "index.md"), "w", encoding="utf-8") as f:
    f.write("\n".join(md))

out_dir_agent = "/Users/dewifebrinani/.traycer/host/harness-accounts/antigravity/5f3e5063-b545-4b15-810b-71eb41c6473e/antigravity-acp/brain/7734656f-f140-4562-bd3f-497317809fb6"
with open(os.path.join(out_dir_agent, "preview_soal_2a_27a.md"), "w", encoding="utf-8") as f:
    f.write("\n".join(md))

print(f"Updated preview markdown with repaired questions! Lines: {len(md)}")
