
import re

file_path = 'src/blogContent.ts'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove **text** (Bold).
content = content.replace('**', '')

# 2. Remove *text* (Italics), preserving * bullets.
# Logic: Match *text* where * is not at start of line (or after whitespace start).
# Or simpler:
# Just like before.
new_content = re.sub(r'\*([^\*\s][^\*\n]*?[^\*\s])\*', r'\1', content)
new_content = re.sub(r'\*([^\*\s])\*', r'\1', new_content)

# 3. Check for "Use Bold" phrase just in case
if "Use Bold" in new_content:
    print("Warning: 'Use Bold' still present.")
if "Use bold" in new_content:
    print("Warning: 'Use bold' still present.")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Cleaned blogContent.ts")
