import os, re, sys

# Force UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

firebase_patterns = set()
for fname in os.listdir('assets'):
    if not fname.endswith('.js'):
        continue
    with open(os.path.join('assets', fname), 'r', encoding='utf-8') as f:
        c = f.read()
    # Look for any firebase database usage
    for m in re.finditer(r'firebase\.database\(\)[^;]{0,200}', c):
        firebase_patterns.add((fname, m.group(0)))
    for m in re.finditer(r'\.ref\(["\']([^"\']+)["\']\)[^;]{0,100}', c):
        firebase_patterns.add((fname, m.group(0)))
    for m in re.finditer(r'getDatabase\([^)]*\)[^;]{0,200}', c):
        firebase_patterns.add((fname, m.group(0)))

print(f'Found {len(firebase_patterns)} firebase db patterns:')
for fname, pat in sorted(firebase_patterns)[:50]:
    print(f'  {fname}: {pat[:120]}')
