import os, re, sys
sys.stdout.reconfigure(encoding='utf-8')

for fname in os.listdir('assets'):
    if not fname.endswith('.js'):
        continue
    with open(os.path.join('assets', fname), 'r', encoding='utf-8') as f:
        c = f.read()
    
    # Look for sync-related patterns
    patterns = []
    for m in re.finditer(r'(cloud|sync|firebase|database|server)\w*', c, re.IGNORECASE):
        # Get the surrounding word/phrase
        start = max(0, m.start() - 30)
        end = min(len(c), m.end() + 30)
        context = c[start:end]
        if len(context) < 100:
            patterns.append(context)
    
    if patterns:
        print(f'\n=== {fname} ===')
        for p in sorted(set(patterns))[:10]:
            print(f'  {p}')
