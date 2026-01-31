
import re

file_path = 'src/generatedBlogs.ts'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove ** (bold)
# This removes all occurrences of **.
new_content = content.replace('**', '')

# 2. Remove *word* (italics)
# We want to avoid matching bullet points * at the start of a line.
# We will match * followed by non-* characters followed by *, where the first * is not a bullet point.
# A simple way for the user's case is to just targeting *word* specifically or *text*.
# Regex: `\*([^*\n]+)\*`
# But valid bullet point is `* text`.
# Italics is `*text*`.
# Difference is the trailing *.
# So we look for pairs of *.
# We can regex replace `\*([^*\n]+)\*` with `\1` but we must exclude lines starting with `* `.
# Actually, we can just be specific to the user's complaint if we want to be safe, but a general fix is better.
# Let's use a regex that looks for *text* where text does not start with space.
# Markdown italics usually doesn't have space inside the delimiters: *text*, not * text *.
new_content = re.sub(r'\*([a-zA-Z0-9_.,;?!"]+)\*', r'\1', new_content)

# 3. Also fix the specific "proofreading" one just in case regex misses it due to my assumption
new_content = new_content.replace('*proofreading*', 'proofreading')
new_content = new_content.replace('*editing*', 'editing')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Updates complete.")
