import os
import re

TABS_TEMPLATE = """        {/* Content Tabs */}
        <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-8">
          {[
            { name: "All", icon: "?? ", path: "/" },
            { name: "10th / 12th Pass", icon: "?? ", path: "/10th-12th-pass" },
            { name: "Banking", icon: "?? ", path: "/banking" },
            { name: "Railway", icon: "?? ", path: "/railway" },
            { name: "Defense / Police", icon: "??? ", path: "/defense-police" },
            { name: "UPSC / SSC", icon: "??? ", path: "/upsc-ssc" },
            { name: "Teaching", icon: "????? ", path: "/teaching" },
            { name: "Engineering", icon: "?? ", path: "/engineering" },
            { name: "Medical", icon: "?? ", path: "/medical" },
            { name: "PSU", icon: "?? ", path: "/psu" },
          ].map((tab) => (
            <Link
              key={tab.name}
              href={tab.path}
              className={`px-4 py-2 md:px-5 md:py-2.5 rounded-full text-xs md:text-sm font-medium whitespace-nowrap transition-all ${activeTab === tab.name ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" : "bg-white/5 text-gray-400 border border-white/5 hover:bg-white/10"
                }`}>
              {tab.icon}
              {tab.name}
            </Link>
          ))}
        </div>"""

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content
    if 'import Link' not in content:
        content = content.replace('import React', 'import Link from "next/link";\nimport React')

    tabs_pattern = re.compile(r'\{\/\* Content Tabs \*\/\}.*?(?=\{\/\* Grid \*\/\})', re.DOTALL)
    if tabs_pattern.search(content):
        content = tabs_pattern.sub(TABS_TEMPLATE + '\n\n        ', content)
    
    span_pattern = re.compile(r'(<span className="text-transparent bg-clip-text[^>]+>)(.*?)(</span>)')
    
    def replacer(match):
        start_tag = match.group(1)
        text = match.group(2)
        end_tag = match.group(3)
        
        if 'style={{' not in start_tag:
            start_tag = start_tag.replace('">', '" style={{ WebkitBoxDecorationBreak: "clone" }}>')
        
        if not text.endswith(' '):
             text += ' '
             
        start_tag = start_tag.replace('pr-2', 'pr-3 pl-1')
        
        return f"{start_tag}{text}{end_tag}"

    content = span_pattern.sub(replacer, content)

    if original != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {filepath}")

for root, _, files in os.walk('src/app'):
    for file in files:
        if file == 'page.tsx' and 'exam' not in root:
            process_file(os.path.join(root, file))
