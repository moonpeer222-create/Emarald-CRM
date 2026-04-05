import os, re

REPLACEMENTS = [
    ('Sir Atif', 'Administrator'),
    ('Imran Khan', 'Support Staff'),
    ('Husnain', 'Supervisor'),
    ('Faizan', 'Agent One'),
    ('Safeer', 'Agent Two'),
    ('Aynee', 'Agent Three'),
    ('Atif', 'Manager'),
    ('Wasi', 'Director'),
    ('Emerald Visa CRM', 'Universal CRM'),
    ('Emerald Visa', 'Universal CRM'),
    ('emeraldvisa', 'universalcrm'),
    ('visaverse', 'crmrewards'),
    ('emerald-crm', 'universal-crm'),
    ('info@emeraldvisaconsultancy.com', 'info@example.com'),
    ('admin@emeraldvisa.com', 'admin@example.com'),
    ('name@emeraldvisa.com', 'name@example.com'),
    ('your@email.com', 'user@example.com'),
    ('atif@emeraldvisa.com', 'manager@example.com'),
    ('wasi@emeraldvisa.com', 'director@example.com'),
    ('husnain@emeraldvisa.com', 'supervisor@example.com'),
    ('faizan@emeraldvisa.com', 'agent1@example.com'),
    ('imran@emeraldvisa.com', 'agent2@example.com'),
    ('safeer@emeraldvisa.com', 'agent3@example.com'),
    ('aynee@emeraldvisa.com', 'agent4@example.com'),
    ('operator@emeraldvisa.com', 'operator@example.com'),
    ('+92 318 6986259', '+92 300 0000000'),
    ('+92 300 1234567', '+92 300 0000001'),
    ('+92 301 2345678', '+92 300 0000002'),
    ('+92 302 3456789', '+92 300 0000003'),
    ('+92 303 4567890', '+92 300 0000004'),
    ('+92 304 5678901', '+92 300 0000005'),
    ('+92 305 6789012', '+92 300 0000006'),
    ('+92 306 7890123', '+92 300 0000007'),
    ('+923186986259', '+923000000000'),
    ('+923001234567', '+923000000001'),
    ('wa.me/923186986259', 'wa.me/923000000000'),
    ('wa.me/923001234567', 'wa.me/923000000001'),
    ('923186986259', '923000000000'),
    ('923001234567', '923000000001'),
]

# Files to skip
SKIP = {'node_modules', '.git', 'dist'}

# Extensions to scan
EXTS = {'.ts', '.tsx', '.js', '.jsx', '.json', '.md'}

def sanitize_file(path):
    try:
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
    except:
        return False
    
    original = content
    changed = False
    
    for old, new in REPLACEMENTS:
        if old in content:
            count = content.count(old)
            content = content.replace(old, new)
            if count > 0:
                changed = True
                print(f'  [{count}x] {old!r} -> {new!r} in {path}')
    
    if changed:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
    
    return changed

def main():
    total_changed = 0
    for root, dirs, files in os.walk('.'):
        dirs[:] = [d for d in dirs if d not in SKIP]
        for fname in files:
            if os.path.splitext(fname)[1] not in EXTS:
                continue
            path = os.path.join(root, fname)
            if sanitize_file(path):
                total_changed += 1
    print(f'\nSanitized {total_changed} files.')

if __name__ == '__main__':
    main()
