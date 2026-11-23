import json, re

with open('/tmp/quran_juz_cache.json', 'r', encoding='utf-8') as f:
    quran = json.load(f)

juz27_verses = quran['27']

from parse_and_preview_exams import questions_27a
from solve_27a_complete import get_answer_for_27a

# 1. Deduplicate identical questions:
# Exclude Q45 and Q48 (duplicates of Q44), and Q49 (duplicate of Q43)
skip_q_numbers = {45, 48, 49}

repaired_27a = []
new_num = 1
for orig_idx, q in enumerate(questions_27a, 1):
    if orig_idx in skip_q_numbers:
        continue
    
    title = q['title']
    opts = list(q['options'])
    
    # 2. Fix Soal 10 (Typo ayat Al-Qalam -> Ganti dengan pasangan Adz-Dzariyat 15)
    if orig_idx == 10:
        opts = [
            'إِنَّ ٱلْمُتَّقِينَ فِى جَنَّٰتٍ وَعُيُونٍ',
            'إِنَّ ٱلْمُتَّقِينَ فِى جَنَّٰتٍ وَنَعِيمٍ'
        ]
        correct = 'إِنَّ ٱلْمُتَّقِينَ فِى جَنَّٰتٍ وَعُيُونٍ'
        note = 'DIPERBAIKI: Menggunakan QS. Adz-Dzariyat 15 (Opsi asli form guru salah kutip QS. Al-Qalam)'
    else:
        correct, note = get_answer_for_27a(orig_idx, q)
        
    repaired_27a.append({
        'number': new_num,
        'orig_number': orig_idx,
        'title': title,
        'options': opts,
        'correct': correct,
        'note': note,
        'section': q['section']
    })
    new_num += 1

print(f"Repaired 27A: Total {len(repaired_27a)} questions (deduplicated from 68, Q10 fixed). Solved: {sum(1 for s in repaired_27a if s['correct'])}/{len(repaired_27a)}")
