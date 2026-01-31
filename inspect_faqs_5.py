
import re

file_path = 'src/generatedBlogs.ts'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

lines = content.split('\n')
faq_mode = False
for i, line in enumerate(lines):
    if '### FAQ' in line:
        faq_mode = True
        continue
    if '},' in line and faq_mode:
        faq_mode = False
    
    if faq_mode:
        l = line.strip()
        if not l: continue
        # if line ends with ? and doesn't start with Q: or **Q: or - Q:
        if '?' in l and not (l.startswith('Q:') or l.startswith('**Q:') or l.startswith('- Q:') or l.startswith('* Q:')):
            print(f"Line {i+1} looks like a question but no Q prefix: {l}")
