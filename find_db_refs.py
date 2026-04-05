import os, re

nodes = set()
for fname in os.listdir('assets'):
    if not fname.endswith('.js'):
        continue
    with open(os.path.join('assets', fname), 'r', encoding='utf-8') as f:
        c = f.read()
    refs = re.findall(r'\.ref\(["\']([^"\']+)["\']\)', c)
    for r in refs:
        nodes.add(r)
    childs = re.findall(r'\.child\(["\']([^"\']+)["\']\)', c)
    for ch in childs:
        nodes.add(ch)
    # Also look for patterns like firebase.database().ref("users")
    refs2 = re.findall(r'\.ref\(([^)]+)\)', c)
    for r in refs2:
        if r.startswith('"') or r.startswith("'"):
            nodes.add(r.strip('"\''))
    # Look for path strings containing slash
    paths = re.findall(r'["\']([^"\']*/[^"\']*)["\']', c)
    for p in paths:
        if p.startswith(('users/', 'customers/', 'cases/', 'documents/', 'audit_logs/', 'settings/')):
            nodes.add(p)

print('Database refs found:')
for n in sorted(nodes):
    print(' ', n)
