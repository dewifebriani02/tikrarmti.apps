import re
import json
import os

with open('/tmp/quran_juz_cache.json', 'r', encoding='utf-8') as f:
    quran = json.load(f)

juz2_verses = quran['2']
juz27_verses = quran['27']

ch_names = {
    2: 'Al-Baqarah',
    51: 'Adz-Dzariyat',
    52: 'Ath-Thur',
    53: 'An-Najm',
    54: 'Al-Qamar',
    55: 'Ar-Rahman',
    56: 'Al-Waqi\'ah',
    57: 'Al-Hadid'
}

def norm_ar(text):
    if not text: return ''
    t = re.sub(r'[\u064B-\u065F\u0670\u06D6-\u06ED\u0610-\u061A]', '', text)
    t = re.sub(r'[\u0625\u0623\u0622\u0671]', '\u0627', t)
    t = re.sub(r'\u0649', '\u064A', t)
    t = re.sub(r'\u0629', '\u0647', t)
    t = re.sub(r'[^\w\s]', '', t)
    t = re.sub(r'\s+', ' ', t).strip()
    return t

def clean_arabic_latin_separation(text):
    if not text:
        return ''
    # Normalize excessive newlines and whitespace
    t = text.strip()
    # If text contains both Arabic and Latin, ensure they are separated by \n\n
    # Look for boundary between Arabic character and Latin character
    # E.g. (Arabic char)(Latin char) or (Latin char)(Arabic char)
    t = re.sub(r'([\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF])([a-zA-Z])', r'\1\n\n\2', t)
    t = re.sub(r'([a-zA-Z])([\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF])', r'\1\n\n\2', t)
    # Also standardize existing \n between Arabic and Latin to \n\n
    lines = [l.strip() for l in t.split('\n') if l.strip()]
    return '\n\n'.join(lines)

def parse_form(path):
    with open(path, 'r', encoding='utf-8') as f:
        html = f.read()
    m = re.search(r'var FB_PUBLIC_LOAD_DATA_ = (.*?);</script>', html, re.DOTALL)
    if not m:
        raise ValueError(f"No FB_PUBLIC_LOAD_DATA_ in {path}")
    data = json.loads(m.group(1))
    items = data[1][1]
    
    current_sec = 'Default'
    q_list = []
    
    for it in items:
        it_type = it[3]
        title = it[1]
        desc = it[2]
        
        if it_type == 8:
            current_sec = title
        elif it_type in [2, 3, 4] and it[4] and it[4][0][1]:
            if title in ['Nama Lengkap', 'Usia', 'Domisili'] or 'No. Hp' in (title or '') or 'Bismillah...' in (title or ''):
                continue
            opts = [o[0] for o in it[4][0][1] if o[0]]
            cleaned_title = clean_arabic_latin_separation(title)
            q_list.append({
                'raw_title': title,
                'title': cleaned_title,
                'desc': desc,
                'section': current_sec,
                'options': opts
            })
    return q_list

questions_2a = parse_form('/tmp/form_2a.html')
questions_27a = parse_form('/tmp/form_27a.html')
print(f"Loaded 2A: {len(questions_2a)} questions")
print(f"Loaded 27A: {len(questions_27a)} questions")
