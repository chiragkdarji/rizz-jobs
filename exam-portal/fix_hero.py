import os
import re

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content

    # 1. State update
    state_decl = '  const [search, setSearch] = useState("");'
    state_new = '''  const [search, setSearch] = useState("");
  useEffect(() => {
    const handleSearch = (e: any) => setSearch(e.detail);
    window.addEventListener("globalSearch", handleSearch);
    return () => window.removeEventListener("globalSearch", handleSearch);
  }, []);'''
    
    if state_decl in content and 'globalSearch' not in content:
        content = content.replace(state_decl, state_new, 1)

    # 2. Hero Container flex
    old_flex = 'className="flex flex-col md:flex-row items-end justify-between gap-8"'
    new_flex = 'className="flex flex-col gap-8 w-full"'
    if old_flex in content:
        content = content.replace(old_flex, new_flex)

    # 3. Max-w-2xl
    old_maxw = 'className="max-w-2xl"'
    new_maxw = 'className="w-full lg:w-[100%]"'
    if old_maxw in content:
        content = content.replace(old_maxw, new_maxw)
        
    old_maxw_xl = 'className="text-xl text-gray-400 leading-relaxed font-medium max-w-xl"'
    new_maxw_xl = 'className="text-xl text-gray-400 leading-relaxed font-medium w-full lg:max-w-3xl"'
    if old_maxw_xl in content:
        content = content.replace(old_maxw_xl, new_maxw_xl)

    # 4. Remove search bar
    search_bar_regex = r'<div className="relative w-full md:w-96">.*?<Search className=".*?/>\s*</div>'
    content = re.sub(search_bar_regex, '', content, flags=re.DOTALL)

    if original != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Fixed {filepath}")

for root, _, files in os.walk('src/app'):
    for file in files:
        if file == 'page.tsx' and 'exam\\' not in root:
            process_file(os.path.join(root, file))
