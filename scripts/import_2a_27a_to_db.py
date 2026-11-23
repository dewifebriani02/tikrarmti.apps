import uuid
import json
import os
import sys

sys.path.append('scripts')
from solve_all import solved_2a, questions_2a, questions_27a
from solve_27a_complete import complete_solved_27a

def generate_rows_for_package(solved_list, questions_list, juz_number, package_letter, deduplicate_27a=False):
    rows = []
    seen_keys = set()
    q_num = 1
    
    for q in solved_list:
        raw_q = questions_list[q['number'] - 1]
        title = q['title']
        
        # Deduplication check if enabled
        if deduplicate_27a:
            clean_key = title.strip()
            if clean_key in seen_keys:
                print(f"Skipping duplicate question in 27A: {title[:40]}")
                continue
            seen_keys.add(clean_key)
            
        opts = []
        for o in q['options']:
            opts.append({
                'text': o,
                'isCorrect': (o == q['correct'])
            })
            
        sec_num = 1
        if any('halaman' in o.lower() for o in q['options']):
            sec_num = 2
        sec_title = raw_q['section']
        
        rows.append({
            'id': str(uuid.uuid4()),
            'juz_number': juz_number,
            'question_package': package_letter,
            'section_number': sec_num,
            'section_title': sec_title,
            'question_number': q_num,
            'question_type': 'multiple_choice',
            'question_text': title,
            'options': json.dumps(opts, ensure_ascii=False),
            'correct_answer': q['correct'],
            'points': 2,
            'is_active': True
        })
        q_num += 1
    return rows

print("Import helper module ready!")
