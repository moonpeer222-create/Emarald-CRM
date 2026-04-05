import os, re

for root, dirs, files in os.walk('src'):
    for fname in files:
        if not fname.endswith(('.ts', '.tsx')):
            continue
        path = os.path.join(root, fname)
        with open(path, 'r', encoding='utf-8') as f:
            c = f.read()
        
        orig = c
        c = re.sub(r'(/crmrewards)([\'"\\/])', r'/visaverse\2', c)
        
        if c != orig:
            with open(path, 'w', encoding='utf-8') as f:
                f.write(c)
            print(f'Fixed imports in {path}')
