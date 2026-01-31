
import re

file_path = 'src/generatedBlogs.ts'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find all FAQ sections
faq_pattern = r'### FAQ(.*?)(?=\n\s*\{|\n\s*\]|$)'
faqs = re.findall(faq_pattern, content, re.DOTALL)

print(f"Found {len(faqs)} FAQ sections.")

for i, faq in enumerate(faqs):
    # Check for Q: and A: lines
    lines = faq.strip().split('\n')
    q_lines = [l for l in lines if 'Q:' in l or 'A:' in l]
    if not q_lines:
         print(f"FAQ {i} seems empty or malformed: {lines}")
         continue
    
    # Check if any line has **
    if any('**' in l for l in lines):
        print(f"FAQ {i} has **: {lines}")

    # Check for weird Q format
    for l in lines:
        l = l.strip()
        if not l: continue
        if l.lower().startswith('q:') or l.lower().startswith('a:') or l.lower().startswith('**q:'):
            pass # Good
        else:
            # Maybe a continuation line? match known patterns
            print(f"FAQ {i} has unexpected line: '{l}'")

print("Inspection complete.")
