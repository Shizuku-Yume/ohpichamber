import os
import re
import json

def get_keys(file_path):
    keys = set()
    with open(file_path, 'r') as f:
        # This is a simple heuristic to extract keys in a dictionary.
        # It won't be perfect but should be enough.
        content = f.read()
        # Look for 'key': 'value' or "key": "value"
        # We need to handle the dict object carefully.
        # Actually, let's just use a regex for 'key':
        # This might be tricky because the file structure is complex.
        
        # Alternative: use a more robust regex to find all key:value pairs.
        # The files import objects and then create a 'dict' object.
        # This is not a simple JSON file.
        
        # Let's try to extract all strings that look like keys.
        # Keys are usually inside the dict object.
        # Maybe I can just read the file and extract lines that look like:
        # 'key': 'value',
        # "key": "value",
        
        # Let's try to match:
        # ['"]([^'"]+)['"]\s*:\s*
        matches = re.findall(r"['\"]([^'\"{}]+)['\"]\s*:", content)
        
        # Filter out some noise
        # This will still pick up imports if they have colons, but imports usually don't.
        # Wait, the imports are "import { ... } from '...'". No colons.
        
        # Let's check for keys only.
        return set(matches)

# Files to check
files = [
    "ar.ts", "de.ts", "en.ts", "es.ts", "fr.ts", "he.ts", "ja.ts", "ko.ts", "nl.ts", "pl.ts", "pt-BR.ts", "tr.ts", "uk.ts", "zh-CN.ts", "zh-TW.ts"
]
base_path = "packages/ui/src/lib/i18n/messages/"

# 1. Get en.ts keys
en_keys = get_keys(os.path.join(base_path, "en.ts"))
print(f"Number of keys in en.ts: {len(en_keys)}")

# 2. Check each file
for f in files:
    if f == "en.ts":
        continue
    
    file_path = os.path.join(base_path, f)
    keys = get_keys(file_path)
    
    # Check for fabricated keys
    fabricated = keys - en_keys
    if fabricated:
        print(f"File {f} has fabricated keys: {fabricated}")
        
    # Check for 'OpenChamber' brand
    with open(file_path, 'r') as file:
        content = file.read()
        if 'OpenChamber' in content:
            # Need to check if it's only in "About MIT"
            # This is hard to check programmatically.
            # Let's list the matches.
            print(f"File {f} contains 'OpenChamber'")
            
    # Check zh-CN for English and Token capitalization
    if f == "zh-CN.ts":
        # Check for English
        # A simple check: any ASCII characters except some punctuation and formatting.
        # This is also hard. Let's list content with Latin characters.
        pass
