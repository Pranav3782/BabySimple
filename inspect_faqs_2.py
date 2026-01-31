
import re

file_path = 'src/generatedBlogs.ts'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Check for Q and A on same line
lines = content.split('\n')
for i, line in enumerate(lines):
    if 'Q:' in line and 'A:' in line:
        # Check if they are separate parts or just coincidence
        if re.search(r'Q:.*?\sA:', line):
            print(f"Line {i+1} has Q and A on same line: {line.strip()}")

# Check for Use Bold
# The user said "**Use Bold**". Maybe it's a heading?
index = content.lower().find('use bold')
if index != -1:
    print(f"Found 'Use bold' at char {index}")
    # Show context
    print(content[index-20:index+50])

# Check for any remaining **
if '**' in content:
    print("Found '**' in content!")
else:
    print("No '**' found in content.")
