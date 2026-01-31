
import re

file_path = 'src/generatedBlogs.ts'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find all lines starting with Q: or A:
# and print them if they have different indentation
lines = content.split('\n')
for i, line in enumerate(lines):
    if line.strip().startswith('Q:') or line.strip().startswith('A:'):
        # check leading spaces
        leading_spaces = len(line) - len(line.lstrip())
        print(f"Line {i+1} indent {leading_spaces}: {line[:20]}...")
