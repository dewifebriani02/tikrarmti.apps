import uuid
import json
import os
import sys

sys.path.append('scripts')
from solve_all import solved_2a, questions_2a, questions_27a
from solve_27a_repaired import repaired_27a

def generate_sql_for_package(solved_list, questions_list, juz_number, package_letter):
    statements = []
    statements.append(f"-- ==============================================================================")
    statements.append(f"-- IMPOR SOAL JUZ {juz_number}{package_letter} ({len(solved_list)} SOAL)")
    statements.append(f"-- ==============================================================================")
    statements.append(f"DELETE FROM exam_questions WHERE juz_number = {juz_number} AND question_package = '{package_letter}';")
    
    for q in solved_list:
        q_id = str(uuid.uuid4())
        q_num = q['number']
        raw_q = questions_list[q.get('orig_number', q_num) - 1]
        title = q['title']
        
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
        
        # Escape single quotes for SQL
        escaped_title = title.replace("'", "''")
        escaped_options = json.dumps(opts, ensure_ascii=False).replace("'", "''")
        escaped_correct = q['correct'].replace("'", "''")
        escaped_sec_title = sec_title.replace("'", "''")
        
        sql = f"""INSERT INTO exam_questions (id, juz_number, question_package, section_number, section_title, question_number, question_type, question_text, options, correct_answer, points, is_active)
VALUES ('{q_id}', {juz_number}, '{package_letter}', {sec_num}, '{escaped_sec_title}', {q_num}, 'multiple_choice', '{escaped_title}', '{escaped_options}'::jsonb, '{escaped_correct}', 2, true);"""
        statements.append(sql)
        
    return "\n".join(statements)

sql_2a = generate_sql_for_package(solved_2a, questions_2a, 2, 'A')
sql_27a = generate_sql_for_package(repaired_27a, questions_27a, 27, 'A')

with open('scripts/sql/import_juz_2a.sql', 'w', encoding='utf-8') as f:
    f.write(sql_2a)

with open('scripts/sql/import_juz_27a.sql', 'w', encoding='utf-8') as f:
    f.write(sql_27a)

print("Generated scripts/sql/import_juz_2a.sql and scripts/sql/import_juz_27a.sql")
