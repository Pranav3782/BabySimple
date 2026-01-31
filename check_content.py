
import re

file_path = 'src/generatedBlogs.ts'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Search for "Use Bold"
print("--- Searching for 'Use Bold' ---")
lines = content.split('\n')
for i, line in enumerate(lines):
    if 'use bold' in line.lower():
        print(f"Line {i+1}: {line.strip()}")

# Check FAQ structure
print("\n--- Checking FAQ Structure ---")
# Split into blogs roughly (assuming some structure, or just scan)
# Better to find "### FAQ" and inspect following lines
import re
faq_indices = [m.start() for m in re.finditer(r'### FAQ', content)]

for idx in faq_indices:
    # Get the chunk after FAQ
    chunk = content[idx:idx+1000] # look at next 1000 chars
    lines_chunk = chunk.split('\n')
    # Print first few lines of FAQ to see structure
    print(f"\nFAQ at char {idx} (approx line {content[:idx].count(chr(10))+1}):")
    for k in range(1, 6): # Print next 5 lines
        if k < len(lines_chunk):
            print(f"  {lines_chunk[k].strip()}")
