
import re

files = ['src/blogContent.ts', 'src/generatedBlogs.ts']

for file_path in files:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # match excerpt: '...' or excerpt: `...`
    excerpts = re.findall(r"excerpt:\s*['`\"](.*?)['`\"]", content, re.DOTALL)
    for i, exc in enumerate(excerpts):
        if "Use Bold" in exc or "Use bold" in exc:
            print(f"Found in {file_path} excerpt {i}: {exc}")
        if "**" in exc:
            print(f"Found ** in {file_path} excerpt {i}: {exc}")

print("Excerpt check complete.")
