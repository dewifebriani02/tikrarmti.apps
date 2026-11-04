import json, re

with open('/tmp/quran_juz_cache.json', 'r', encoding='utf-8') as f:
    quran = json.load(f)

juz27_verses = quran['27']

from parse_and_preview_exams import questions_27a

def get_answer_for_27a(idx, q):
    title = q['title']
    opts = q['options']
    
    # 1. Tebak Nama Surat (Q1 - Q8)
    if idx == 1:
        return 'An-Najm', 'An-Najm ayat 9'
    elif idx == 2:
        return 'Adz-Dzariyat', 'Adz-Dzariyat ayat 54'
    elif idx == 3:
        return 'Adz-Dzariyat', 'Adz-Dzariyat ayat 36'
    elif idx == 4:
        return 'Adz-Dzariyat', 'Adz-Dzariyat ayat 46'
    elif idx == 5:
        return 'Adz-Dzariyat', 'Adz-Dzariyat ayat 53'
    elif idx == 6:
        return 'At-Tur', 'Ath-Thur ayat 32'
    elif idx == 7:
        return 'At-Tur', 'Ath-Thur ayat 17'
    elif idx == 8:
        return 'Al-Qamar', 'Al-Qamar ayat 6'
        
    # 2. Tebak Ayat (Q9 - Q21)
    elif idx == 9:
        return 'أَمْ تَأْمُرُهُمْ أَحْلَٰمُهُم بِهَٰذَآ ۚ أَمْ هُمْ قَوْمٌ طَاغُونَ', 'Ath-Thur ayat 32'
    elif idx == 10:
        # Note: both options are from Al-Qalam (Juz 29), but in Q10 form:
        return opts[0], 'Catatan: Opsi bersumber dari QS. Al-Qalam 14-15 (indikasi typo pembuat soal)'
    elif idx == 11:
        return 'إِنَّ ٱلْمُتَّقِينَ فِى جَنَّٰتٍ وَنَعِيمٍ', 'Ath-Thur ayat 17 (Adz-Dzariyat 15 berbunyi فِى جَنَّٰتٍ وَعُيُونٍ)'
    elif idx == 12:
        return 'وَأَنَّهُۥٓ أَهْلَكَ عَادًا ٱلْأُولَىٰ', 'An-Najm ayat 50'
    elif idx == 13:
        return 'وَقَوْمَ نُوحٍ مِّن قَبْلُ ۖ إِنَّهُمْ كَانُوا۟ قَوْمًا فَٰسِقِينَ', 'Adz-Dzariyat ayat 46 (An-Najm 52 berbunyi إِنَّهُمْ كَانُوا۟ هُمْ أَظْلَمَ وَأَطْغَىٰ)'
    elif idx == 14:
        return 'كَذَّبُوا۟ بِـَٔايَٰتِنَا كُلِّهَا فَأَخَذْنَٰهُمْ أَخْذَ عَزِيزٍ مُّقْتَدِرٍ', 'Al-Qamar ayat 42'
    elif idx == 15:
        return 'فَتَوَلَّ عَنْهُمْ فَمَآ أَنتَ بِمَلُومٍ', 'Adz-Dzariyat ayat 54 (Al-Qamar 6 berbunyi يَوْمَ يَدْعُ ٱلدَّاعِ)'
    elif idx == 16:
        return 'وَقَوْمَ نُوحٍ مِّن قَبْلُ ۖ إِنَّهُمْ كَانُوا۟ هُمْ أَظْلَمَ وَأَطْغَىٰ', 'An-Najm ayat 52'
    elif idx == 17:
        return 'إِنَّآ أَرْسَلْنَا عَلَيْهِمْ حَاصِبًا إِلَّآ ءَالَ لُوطٍ ۖ نَّجَّيْنَٰهُم بِسَحَرٍ', 'Al-Qamar ayat 34'
    elif idx == 18:
        return 'إِنَّ ٱلْمُتَّقِينَ فِى جَنَّٰتٍ وَنَعِيمٍ', 'Ath-Thur ayat 17 (Al-Qamar 54 berbunyi فِى جَنَّٰتٍ وَنَهَرٍ)'
    elif idx == 19:
        return 'إِنَّا مُرْسِلُوا۟ ٱلنَّاقَةِ فِتْنَةً لَّهُمْ فَٱرْتَقِبْهُمْ وَٱصْطَبِرْ', 'Al-Qamar ayat 27'
    elif idx == 20:
        return 'أَتَوَاصَوْا۟ بِهِۦ ۚ بَلْ هُمْ قَوْمٌ طَاغُونَ', 'Adz-Dzariyat ayat 53'
    elif idx == 21:
        return 'أَفَمِنْ هَٰذَا ٱلْحَدِيثِ تَعْجَبُونَ', 'An-Najm ayat 59'
        
    # 3. Sambung Surat (Q22 - Q24)
    elif idx == 22:
        return 'ٱقْتَرَبَتِ ٱلسَّاعَةُ وَٱنشَقَّ ٱلْقَمَرُ', 'Akhir An-Najm (53:62) dilanjutkan awal Al-Qamar (54:1)'
    elif idx == 23:
        return 'وَٱلنَّجْمِ إِذَا هَوَىٰ', 'Akhir Ath-Thur (52:49) dilanjutkan awal An-Najm (53:1)'
    elif idx == 24:
        return 'وَٱلطُّورِ', 'Akhir Adz-Dzariyat (51:60) dilanjutkan awal Ath-Thur (52:1)'

    # 4. Tebak Awal Surat dari Ayat Ini (Q25 - Q50)
    elif idx == 25:
        return 'وَٱلطُّورِ', 'Ath-Thur ayat 9'
    elif idx == 26:
        return 'وَٱلطُّورِ', 'Ath-Thur ayat 18'
    elif idx == 27:
        return 'وَٱلطُّورِ', 'Ath-Thur ayat 28'
    elif idx == 28:
        return 'وَٱلطُّورِ', 'Ath-Thur ayat 48'
    elif idx == 29:
        return 'وَٱلذَّٰرِيَٰتِ ذَرْوًا', 'Adz-Dzariyat ayat 33'
    elif idx == 30:
        return 'وَٱلذَّٰرِيَٰتِ ذَرْوًا', 'Adz-Dzariyat ayat 36'
    elif idx == 31:
        return 'وَٱلذَّٰرِيَٰتِ ذَرْوًا', 'Adz-Dzariyat ayat 44'
    elif idx == 32:
        return 'وَٱلذَّٰرِيَٰتِ ذَرْوًا', 'Adz-Dzariyat ayat 59'
    elif idx == 33:
        return 'وَٱلنَّجْمِ إِذَا هَوَىٰ', 'An-Najm ayat 5'
    elif idx == 34:
        return 'وَٱلنَّجْمِ إِذَا هَوَىٰ', 'An-Najm ayat 13'
    elif idx == 35:
        return 'وَٱلنَّجْمِ إِذَا هَوَىٰ', 'An-Najm ayat 21'
    elif idx == 36:
        return 'وَٱلنَّجْمِ إِذَا هَوَىٰ', 'An-Najm ayat 27'
    elif idx == 37:
        return 'وَٱلنَّجْمِ إِذَا هَوَىٰ', 'An-Najm ayat 41'
    elif idx == 38:
        return 'ٱقْتَرَبَتِ ٱلسَّاعَةُ وَٱنشَقَّ ٱلْقَمَرُ', 'Al-Qamar ayat 3'
    elif idx == 39:
        return 'ٱقْتَرَبَتِ ٱلسَّاعَةُ وَٱنشَقَّ ٱلْقَمَرُ', 'Al-Qamar ayat 10'
    elif idx == 40:
        return 'ٱقْتَرَبَتِ ٱلسَّاعَةُ وَٱنشَقَّ ٱلْقَمَرُ', 'Al-Qamar ayat 17'
    elif idx == 41:
        return 'ٱقْتَرَبَتِ ٱلسَّاعَةُ وَٱنشَقَّ ٱلْقَمَرُ', 'Al-Qamar ayat 16'
    elif idx == 42:
        return 'ٱقْتَرَبَتِ ٱلسَّاعَةُ وَٱنشَقَّ ٱلْقَمَرُ', 'Al-Qamar ayat 36'
    elif idx == 43:
        return 'ٱقْتَرَبَتِ ٱلسَّاعَةُ وَٱنشَقَّ ٱلْقَمَرُ', 'Al-Qamar ayat 47'
    elif idx == 44:
        return 'ٱقْتَرَبَتِ ٱلسَّاعَةُ وَٱنشَقَّ ٱلْقَمَرُ', 'Al-Qamar ayat 54'
    elif idx == 45:
        return 'ٱقْتَرَبَتِ ٱلسَّاعَةُ وَٱنشَقَّ ٱلْقَمَرُ', 'Al-Qamar ayat 54 (duplikat)'
    elif idx == 46:
        return 'وَٱلنَّجْمِ إِذَا هَوَىٰ', 'An-Najm ayat 38'
    elif idx == 47:
        return 'وَٱلنَّجْمِ إِذَا هَوَىٰ', 'An-Najm ayat 31'
    elif idx == 48:
        return 'ٱقْتَرَبَتِ ٱلسَّاعَةُ وَٱنشَقَّ ٱلْقَمَرُ', 'Al-Qamar ayat 54 (duplikat)'
    elif idx == 49:
        return 'ٱقْتَرَبَتِ ٱلسَّاعَةُ وَٱنشَقَّ ٱلْقَمَرُ', 'Al-Qamar ayat 47 (duplikat)'
    elif idx == 50:
        return 'وَٱلطُّورِ', 'Ath-Thur ayat 26'

    # 5. Ayat Mutasyabihat (Sambung Ayat) (Q51 - Q58)
    elif idx == 51:
        return 'إِنَّآ أَرْسَلْنَا عَلَيْهِمْ صَيْحَةً وَٰحِدَةً فَكَانُوا۟ كَهَشِيمِ ٱلْمُحْتَظِرِ', 'Al-Qamar 30-31'
    elif idx == 52:
        return 'وَلَقَدْ صَبَّحَهُم بُكْرَةً عَذَابٌ مُّسْتَقِرٌّ', 'Al-Qamar 36-38'
    elif idx == 53:
        return 'وَكُلُّ صَغِيرٍ وَكَبِيرٍ مُّسْتَطَرٌ', 'Al-Qamar 51-53'
    elif idx == 54:
        return '۞ كَذَّبَتْ قَبْلَهُمْ قَوْمُ نُوحٍ فَكَذَّبُوا۟ عَبْدَنَا وَقَالُوا۟ مَجْنُونٌ وَٱزْدُجِرَ', 'Al-Qamar 8-9'
    elif idx == 55:
        return 'فَأَعْرِضْ عَن مَّن تَوَلَّىٰ عَن ذِكْرِنَا وَلَمْ يُرِدْ إِلَّا ٱلْحَيَوٰةَ ٱلدُّنْيَا', 'An-Najm 28-29'
    elif idx == 56:
        return 'وَلَقَدْ يَسَّرْنَا ٱلْقُرْءَانَ لِلذِّكْرِ فَهَلْ مِن مُّدَّكِرٍ', 'Al-Qamar 39-40'
    elif idx == 57:
        return 'مَا تَذَرُ مِن شَىْءٍ أَتَتْ عَلَيْهِ إِلَّا جَعَلَتْهُ كَٱلرَّمِيمِ', 'Adz-Dzariyat 41-42'
    elif idx == 58:
        return 'قَالُوٓا۟ إِنَّآ أُرْسِلْنَآ إِلَىٰ قَوْمٍ مُّجْرِمِينَ', 'Adz-Dzariyat 31-32'

    # 6. Pengenalan Surat (Q59 - Q60)
    elif idx == 59:
        return 'Ath-Thur -- An-Najm -- Al-Qamar', 'Urutan surat: 52 -> 53 -> 54'
    elif idx == 60:
        return 'An-Najm', 'Surat setelah Ath-Thur (52) adalah An-Najm (53)'

    # 7. Tebak Halaman (Q61 - Q68)
    elif idx == 61:
        return 'Halaman 9', 'Al-Qamar ayat 44 (Hal. 530 = H9)'
    elif idx == 62:
        return 'Halaman 6', 'An-Najm ayat 27 (Hal. 527 = H6)'
    elif idx == 63:
        return 'Halaman 1', 'Adz-Dzariyat ayat 55 (Hal. 522 = H1)'
    elif idx == 64:
        return 'Halaman 9', 'Al-Qamar ayat 42 (Hal. 530 = H9)'
    elif idx == 65:
        return 'Halaman 3', 'Ath-Thur ayat 18 (Hal. 524 = H3)'
    elif idx == 66:
        return 'Halaman 10', 'Ar-Rahman ayat 10 (Hal. 531 = H10)'
    elif idx == 67:
        return 'Halaman 3', 'Ath-Thur ayat 19 (Hal. 524 = H3)'
    elif idx == 68:
        return 'Halaman 4', 'Ath-Thur ayat 42 (Hal. 525 = H4)'

    return None, ''

complete_solved_27a = []
for idx, q in enumerate(questions_27a, 1):
    corr, note = get_answer_for_27a(idx, q)
    complete_solved_27a.append({
        'number': idx,
        'title': q['title'],
        'options': q['options'],
        'correct': corr,
        'note': note
    })

print(f"27A Complete: Checked {len(complete_solved_27a)}. Solved: {sum(1 for s in complete_solved_27a if s['correct'])}/{len(complete_solved_27a)}")
