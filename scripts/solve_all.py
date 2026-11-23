import json, re

with open('/tmp/quran_juz_cache.json', 'r', encoding='utf-8') as f:
    quran = json.load(f)

juz2_verses = quran['2']
juz27_verses = quran['27']

def norm_ar(text):
    if not text: return ''
    t = re.sub(r'[\u064B-\u065F\u0670\u06D6-\u06ED\u0610-\u061A]', '', text)
    t = re.sub(r'[\u0625\u0623\u0622\u0671]', '\u0627', t)
    t = re.sub(r'\u0649', '\u064A', t)
    t = re.sub(r'\u0629', '\u0647', t)
    t = re.sub(r'[^\w\s]', '', t)
    t = re.sub(r'\s+', ' ', t).strip()
    return t

from parse_and_preview_exams import questions_2a, questions_27a, clean_arabic_latin_separation

# ----------------- SOLVE 2A -----------------
# All 50 questions
solved_2a = []
for idx, q in enumerate(questions_2a, 1):
    title = q['title']
    opts = q['options']
    correct = None
    note = ''
    
    if any('halaman' in o.lower() for o in opts):
        # Tebak Halaman
        norm_t = norm_ar(title)
        for v in juz2_verses:
            if norm_ar(v['text_uthmani']) in norm_t or norm_t[:30] in norm_ar(v['text_uthmani']):
                page = v['page_number']
                for o in opts:
                    if f'halaman {page}' in o.lower() or f'h{page-21}' in o.lower():
                        correct = o
                        note = f"Ayat {v['verse_key']} (Hal. {page} / H{page-21})"
                        break
                break
    else:
        # Sambung ayat
        norm_t = norm_ar(title)
        matched_idx = -1
        for vi, v in enumerate(juz2_verses):
            v_norm = norm_ar(v['text_uthmani'])
            if norm_t in v_norm or v_norm in norm_t or norm_t[:30] in v_norm or norm_t[-30:] in v_norm:
                matched_idx = vi
                break
        
        if matched_idx >= 0:
            curr_v = juz2_verses[matched_idx]
            next_v = juz2_verses[matched_idx + 1] if matched_idx + 1 < len(juz2_verses) else None
            # Special manual checks for very nuanced options
            for o in opts:
                o_norm = norm_ar(o)
                # Check exact or partial in curr or next verse
                if o_norm in norm_ar(curr_v['text_uthmani']) or (next_v and o_norm in norm_ar(next_v['text_uthmani'])):
                    correct = o
                    note = f"Ayat {curr_v['verse_key']}"
                    break
            if not correct:
                for o in opts:
                    o_norm = norm_ar(o)
                    if o_norm[:20] in norm_ar(curr_v['text_uthmani']) or (next_v and o_norm[:20] in norm_ar(next_v['text_uthmani'])):
                        correct = o
                        note = f"Ayat {curr_v['verse_key']}"
                        break
        
        # Specific overrides for tricky grammar/diacritic options in 2A
        if not correct:
            if 'لِيُضِيعَ إِيمَٰنَكُمْ' in title:
                correct = 'إِنَّ ٱللَّهَ بِٱلنَّاسِ لَرَءُوفٌ رَّحِيمٌ'
                note = 'Al-Baqarah 143'
            elif 'مِّنۢ بَعْدِ مَا جَآءَكَ مِنَ ٱلْعِلْمِ' in title:
                correct = 'إِنَّكَ إِذًا لَّمِنَ ٱلظَّٰلِمِينَ'
                note = 'Al-Baqarah 145'
            elif 'فَوَلُّوا۟ وُجُوهَكُمْ شَطْرَهُ' in title:
                correct = 'لِئَلَّا يَكُونَ لِلنَّاسِ عَلَيْكُمْ حُجَّةٌ إِلَّا ٱلَّذِينَ ظَلَمُوا۟ مِنْهُمْ'
                note = 'Al-Baqarah 150 (حُجَّةٌ bertanwin dhommah)'
            elif 'رَسُولًا مِّنكُمْ يَتْلُوا۟ عَلَيْكُمْ' in title:
                correct = 'ءَايَٰتِنَا وَيُزَكِّيكُمْ وَيُعَلِّمُكُمُ ٱلْكِتَٰبَ وَٱلْحِكْمَةَ وَيُعَلِّمُكُم مَّا لَمْ تَكُونُوا۟ تَعْلَمُونَ'
                note = 'Al-Baqarah 151 (ءَايَٰتِنَا bukan ءَايَٰتِيْ)'
            elif 'ٱسْتَعِينُوا۟ بِٱلصَّبْرِ وَٱلصَّلَوٰةِ' in title:
                correct = 'وَلَا تَقُولُوا۟ لِمَن يُقْتَلُ فِى سَبِيلِ ٱللَّهِ أَمْوَٰتٌۢ ۚ بَلْ أَحْيَآءٌ وَلَٰكِن لَّا تَشْعُرُونَ'
                note = 'Al-Baqarah 153 -> Lanjut ayat 154'
            elif 'قَالُوٓا۟ إِنَّا لِلَّهِ وَإِنَّآ إِلَيْهِ رَٰجِعُونَ' in title:
                correct = 'أُو۟لَٰٓئِكَ عَلَيْهِمْ صَلَوَٰتٌ مِّن رَّبِّهِمْ وَرَحْمَةٌ ۖ وَأُو۟لَٰٓئِكَ هُمُ ٱلْمُهْتَدُونَ'
                note = 'Al-Baqarah 156 -> Lanjut ayat 157 (ٱلْمُهْتَدُونَ)'
            elif 'يَعْرِفُونَهُۥ كَمَا يَعْرِفُونَ أَبْنَآءَهُمْ' in title:
                correct = 'وَإِنَّ فَرِيقًا مِّنْهُمْ لَيَكْتُمُونَ ٱلْحَقَّ وَهُمْ يَعْلَمُونَ'
                note = 'Al-Baqarah 146'
            elif 'وَإِلَٰهُكُمْ إِلَٰهٌ وَٰحِدٌ' in title:
                correct = opts[0] if 'خَلْقِ ٱلسَّمَٰوَٰتِ' in opts[0] else opts[1]
                note = 'Al-Baqarah 163 -> Lanjut ayat 164'
            elif 'إِنَّ ٱلَّذِينَ كَفَرُوا۟ وَمَاتُوا۟ وَهُمْ كُفَّارٌ' in title:
                correct = 'خَٰلِدِينَ فِيهَا ۖ لَا يُخَفَّفُ عَنْهُمُ ٱلْعَذَابُ وَلَا هُمْ يُنظَرُونَ'
                note = 'Al-Baqarah 161 -> Lanjut ayat 162 (يُنظَرُونَ)'
            elif 'خَلْقِ ٱلسَّمَٰوَٰتِ وَٱلْأَرْضِ' in title:
                correct = 'ٱلْمُسَخَّرِ بَيْنَ ٱلسَّمَآءِ وَٱلْأَرْضِ لَءَايَٰتٍ لِّقَوْمٍ يَعْقِلُونَ'
                note = 'Al-Baqarah 164 (ٱلْمُسَخَّرِ)'
            elif 'يَٰٓأَيُّهَا ٱلنَّاسُ كُلُوا۟' in title:
                correct = 'مِمَّا فِى ٱلْأَرْضِ حَلَٰلًا طَيِّبًا'
                note = 'Al-Baqarah 168 (مِمَّا فِى ٱلْأَرْضِ)'

    solved_2a.append({
        'number': idx,
        'title': title,
        'options': opts,
        'correct': correct,
        'note': note
    })

print(f"2A: Checked {len(solved_2a)} questions. Solved: {sum(1 for s in solved_2a if s['correct'])}/{len(solved_2a)}")

# ----------------- SOLVE 27A -----------------
ch_names_27 = {
    51: 'Adz-Dzariyat',
    52: 'At-Tur', # forms use At-Tur or Ath-Thur
    53: 'An-Najm',
    54: 'Al-Qamar',
    55: 'Ar-Rahman',
    56: 'Al-Waqi\'ah',
    57: 'Al-Hadid'
}

solved_27a = []
for idx, q in enumerate(questions_27a, 1):
    title = q['title']
    opts = q['options']
    correct = None
    note = ''
    
    # Category 1: Tebak Halaman
    if any('halaman' in o.lower() for o in opts):
        norm_t = norm_ar(title)
        for v in juz27_verses:
            if norm_ar(v['text_uthmani']) in norm_t or norm_t[:30] in norm_ar(v['text_uthmani']):
                rel_page = v['page_number'] - 522 + 1
                for o in opts:
                    if f'halaman {rel_page}' in o.lower() or f'h{rel_page}' in o.lower():
                        correct = o
                        note = f"Ayat {v['verse_key']} (Hal. Mushaf {v['page_number']} = H{rel_page})"
                        break
                break

    # Category 2: Tebak Nama Surat (Ayat ini terletak pada surat ...)
    elif 'terletak pada surat' in title.lower() or any(o in ['Adz-Dzariyat', 'At-Tur', 'Ath-Thur', 'An-Najm', 'Al-Qamar'] for o in opts):
        norm_t = norm_ar(title)
        for v in juz27_verses:
            if norm_ar(v['text_uthmani']) in norm_t or norm_t[:30] in norm_ar(v['text_uthmani']):
                ch_id = v['chapter_id']
                ch_name = ch_names_27[ch_id]
                for o in opts:
                    if (ch_name in ['At-Tur', 'Ath-Thur'] and o in ['At-Tur', 'Ath-Thur']) or o == ch_name:
                        correct = o
                        note = f"Ayat {v['verse_key']} berada di surat {ch_name}"
                        break
                break

    # Category 3: Tebak Ayat (Ayat yang terdapat pada surat ...)
    elif 'ayat yang terdapat pada surat' in title.lower():
        target_surah = None
        for s_name in ['Ath-Thur', 'At-Tur', 'Adz-Dzariyat', 'An-Najm', 'Al-Qamar']:
            if s_name.lower() in title.lower():
                target_surah = s_name
                break
        for o in opts:
            norm_o = norm_ar(o)
            for v in juz27_verses:
                if norm_o in norm_ar(v['text_uthmani']) or norm_ar(v['text_uthmani']) in norm_o or norm_o[:30] in norm_ar(v['text_uthmani']):
                    ch_id = v['chapter_id']
                    ch_name = ch_names_27[ch_id]
                    if (target_surah in ['Ath-Thur', 'At-Tur'] and ch_name in ['Ath-Thur', 'At-Tur']) or (target_surah == ch_name):
                        correct = o
                        note = f"Ayat {v['verse_key']} berada di surat {ch_name}"
                        break
            if correct: break

    # Category 4: Sambung Surat (lanjutan ayat ini adalah Bismillah...)
    elif 'lanjutan ayat ini adalah' in title.lower() and 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ' in title:
        norm_t = norm_ar(title)
        for v in juz27_verses:
            if norm_ar(v['text_uthmani']) in norm_t or norm_t[:30] in norm_ar(v['text_uthmani']):
                next_ch = v['chapter_id'] + 1
                first_v = [fv for fv in juz27_verses if fv['chapter_id'] == next_ch and fv['verse_number'] == 1]
                if first_v:
                    for o in opts:
                        if norm_ar(o) in norm_ar(first_v[0]['text_uthmani']) or norm_ar(first_v[0]['text_uthmani']) in norm_ar(o):
                            correct = o
                            note = f"Surat {ch_names_27[next_ch]} ayat 1: {first_v[0]['text_uthmani']}"
                            break
                break

    # Category 5: Tebak Awal Ayat / Awal surat dari ayat ini adalah
    elif 'awal surat dari ayat ini adalah' in title.lower():
        norm_t = norm_ar(title)
        for v in juz27_verses:
            if norm_ar(v['text_uthmani']) in norm_t or norm_t[:30] in norm_ar(v['text_uthmani']):
                ch_id = v['chapter_id']
                first_v = [fv for fv in juz27_verses if fv['chapter_id'] == ch_id and fv['verse_number'] == 1]
                if first_v:
                    for o in opts:
                        if norm_ar(o) in norm_ar(first_v[0]['text_uthmani']) or norm_ar(first_v[0]['text_uthmani']) in norm_ar(o) or norm_ar(o)[:20] in norm_ar(first_v[0]['text_uthmani']):
                            correct = o
                            note = f"Surat {ch_names_27[ch_id]} diawali {first_v[0]['verse_key']}"
                            break
                break

    # Category 6: Ayat Mutasyabihat (Sambung ayat)
    elif any('\u0600' <= c <= '\u06FF' for c in (opts[0] if opts else '')):
        norm_t = norm_ar(title)
        for vi, v in enumerate(juz27_verses):
            if norm_ar(v['text_uthmani']) in norm_t or norm_t[:25] in norm_ar(v['text_uthmani']):
                next_v = juz27_verses[vi + 1] if vi + 1 < len(juz27_verses) else None
                curr_v = v
                for o in opts:
                    norm_o = norm_ar(o)
                    if (next_v and (norm_o in norm_ar(next_v['text_uthmani']) or norm_o[:20] in norm_ar(next_v['text_uthmani']))) or (norm_o in norm_ar(curr_v['text_uthmani']) or norm_o[:20] in norm_ar(curr_v['text_uthmani'])):
                        correct = o
                        note = f"Lanjutan ayat {v['verse_key']}"
                        break
                break

    # Category 7: Pengenalan Surat
    elif 'urutan yang benar' in title.lower():
        for o in opts:
            if 'Ath-Thur -- An-Najm -- Al-Qamar' in o:
                correct = o
                note = 'Urutan mushaf: 52 (Ath-Thur) -> 53 (An-Najm) -> 54 (Al-Qamar)'
                break
    elif 'setelah surat ath-thur' in title.lower():
        for o in opts:
            if 'An-Najm' in o:
                correct = o
                note = 'Surat setelah Ath-Thur (52) adalah An-Najm (53)'
                break

    # Manual fallback / check
    if not correct:
        if 'أَفَمِنْ هَٰذَا ٱلْحَدِيثِ تَعْجَبُونَ' in opts:
            correct = 'أَفَمِنْ هَٰذَا ٱلْحَدِيثِ تَعْجَبُونَ'
            note = 'An-Najm 59'
        elif 'كَذَّبَتْ عَادٌ فَكَيْفَ كَانَ عَذَابِى وَنُذُرِ' in opts and 'فَكَيْفَ كَانَ عَذَابِى وَنُذُرِ' in title:
            correct = 'إِنَّآ أَرْسَلْنَا عَلَيْهِمْ رِيحًا صَرْصَرًا فِى يَوْمِ نَحْسٍ مُّسْتَمِرٍّ' if 'صَرْصَرًا' in opts else opts[0]
            note = 'Al-Qamar 18-19'
        elif 'فَذُوقُوا۟ عَذَابِى وَنُذُرِ' in title:
            correct = 'وَلَقَدْ يَسَّرْنَا ٱلْقُرْءَانَ لِلذِّكْرِ فَهَلْ مِن مُّدَّكِرٍ'
            note = 'Al-Qamar 39-40'

    solved_27a.append({
        'number': idx,
        'title': title,
        'options': opts,
        'correct': correct,
        'note': note
    })

print(f"27A: Checked {len(solved_27a)} questions. Solved: {sum(1 for s in solved_27a if s['correct'])}/{len(solved_27a)}")
unsolved_27a = [s for s in solved_27a if not s['correct']]
for u in unsolved_27a:
    print(f"Unsolved 27A Q{u['number']}: {repr(u['title'][:50])} | Opts: {u['options']}")
