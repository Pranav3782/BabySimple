
import re

file_path = 'src/generatedBlogs.ts'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Pattern to find blog IDs and their content
# look for id: 'XX', then find content: `...`
# This is a bit complex with regex on huge file, but we can iterate.

blog_pattern = r"id:\s*'(\d+)'"
matches = list(re.finditer(blog_pattern, content))

for i in range(len(matches)):
    start = matches[i].start()
    end = matches[i+1].start() if i+1 < len(matches) else len(content)
    blog_chunk = content[start:end]
    blog_id_match = re.search(r"id:\s*'(\d+)'", blog_chunk)
    blog_id = blog_id_match.group(1) if blog_id_match else "Unknown"
    
    if "### FAQ" not in blog_chunk:
        print(f"Blog {blog_id} missing '### FAQ'")
