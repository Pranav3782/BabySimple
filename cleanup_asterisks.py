
import re

file_path = 'src/generatedBlogs.ts'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove **text** (Bold). Already did simple replace '**', but let's be sure about regex if any restored.
# (Simple replace '**' -> '' works best for just stripping the symbols regardless of matching pairs)
content = content.replace('**', '')

# 2. Remove *text* (Italics).
# We want to match *text* or *text text*, but NOT * bullet or * bullet point.
# Pattern: Literal *, followed by non-space/non-* char, followed by optional content (no *), followed by non-space/non-* char, followed by *.
# OR just *word*.
# Regex explanation:
# \*             : Match literal *
# (?!\s)         : Negative lookahead, next char is NOT whitespace (prevents matching bullets like "* item")
# ([^\*\n]+?)    : Match content (lazy), not containing * or newline
# (?<!\s)        : Negative lookbehind, previous char was NOT whitespace (prevents matching "* item * " trailing space italics if that exists, but mainly ensures we don't match "* " as start of italic ending?)
#                  Actually standard markdown italics usually don't have spaces inside delimiters.
#                  e.g. *text* is italic. * text * is not.
# \*             : Match literal *

# However, we must ensure we don't break bullets.
# Bullet lines start with `* `.
# So we can just ignore `* ` at start of lines.
# But inside text `*Why it works:*`.

def replace_italics(match):
    # If the match looks like a bullet (start of line followed by space), don't touch
    # text is match.group(0)
    # But regex won't match start of line specifically unless we say so.
    # checking logic inside regex is better.
    return match.group(1)

# Regex: \*([^\*\s][^\*\n]*?[^\*\s])\*  (Matches *text* or *text text*)
# Tests:
# *Word* -> matches "Word"
# *Word word* -> matches "Word word"
# * Word -> No match (space after first *)
# *Word * -> No match (space before second *)

new_content = re.sub(r'\*([^\*\s][^\*\n]*?[^\*\s])\*', r'\1', content)
# Also handle single word case which might be missed by the [^\*\n]*? part if strictly expecting 2+ chars?
# [^\*\s][^\*\n]*?[^\*\s] requires at least 2 characters (start and end not space).
# So *A* needs to be handled.
# Regex for single char: \*([^\*\s])\*
new_content = re.sub(r'\*([^\*\s])\*', r'\1', new_content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Text cleanup complete.")
