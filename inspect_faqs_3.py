
import re

file_path = 'src/generatedBlogs.ts'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

lines = content.split('\n')
for i, line in enumerate(lines):
    l = line.strip()
    if not l: continue
    
    # Check for lowercase q: or a: at start
    if re.match(r'^q:', l):
        print(f"Line {i+1} starts with lowercase q: {l}")
    if re.match(r'^a:', l):
        print(f"Line {i+1} starts with lowercase a: {l}")
        
    # Check for missing space
    if re.match(r'^Q:[^ ]', l) or re.match(r'^A:[^ ]', l):
        print(f"Line {i+1} missing space after colon: {l}")

