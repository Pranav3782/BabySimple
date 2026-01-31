
import re

file_path = 'src/generatedBlogs.ts'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Check for * in content
# We want to find * that are NOT bullet points.
# Bullet points: Start of line (after potential whitespace) followed by space.
# Regex: (?m)^\s*\*\s

lines = content.split('\n')
for i, line in enumerate(lines):
    if '*' in line:
        stripped = line.strip()
        # Allow * at start if followed by space (bullet)
        if stripped.startswith('* '):
             # Check if there are other * in the line
             remaining = stripped[2:]
             if '*' in remaining:
                 print(f"Line {i+1} has extra *: {line.strip()}")
        else:
            # * not as bullet
            # Allow image markdown ![alt](url) - no * there
            # Allow links [text](url) - no * there
            print(f"Line {i+1} has suspicious *: {line.strip()}")

# Check specifically for "Use Bold"
if "Use Bold" in content:
    print("\nFound 'Use Bold' (case sensitive):")
    for i, line in enumerate(lines):
        if "Use Bold" in line:
            print(f"Line {i+1}: {line.strip()}")

if "Use bold" in content:
    print("\nFound 'Use bold' (case sensitive):")
    for i, line in enumerate(lines):
         if "Use bold" in line:
             print(f"Line {i+1}: {line.strip()}")
