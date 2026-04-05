import os, re

ASSETS_DIR = 'assets'

# Replacement mappings - longest first to avoid partial overlaps
REPLACEMENTS = [
    # Names (most specific first)
    ('Sir Atif', 'Administrator'),
    ('Imran Khan', 'Support Staff'),
    ('Husnain', 'Supervisor'),
    ('Faizan', 'Agent One'),
    ('Safeer', 'Agent Two'),
    ('Aynee', 'Agent Three'),
    ('Atif', 'Manager'),
    ('Wasi', 'Director'),
    
    # Brands
    ('Emerald Visa', 'Universal CRM'),
    ('emeraldvisa', 'universalcrm'),
    ('visaverse', 'crmrewards'),
    ('emerald-crm', 'universal-crm'),
    
    # Emails
    ('info@emeraldvisaconsultancy.com', 'info@example.com'),
    ('admin@emeraldvisa.com', 'admin@example.com'),
    ('name@emeraldvisa.com', 'name@example.com'),
    ('your@email.com', 'user@example.com'),
    
    # Phones (specific ones first)
    ('+92 318 6986259', '+92 300 0000000'),
    ('+92 306 7890123', '+92 300 0000001'),
    ('+92 305 6789012', '+92 300 0000002'),
    ('+92 304 5678901', '+92 300 0000003'),
    ('+92 303 4567890', '+92 300 0000004'),
    ('+92 302 3456789', '+92 300 0000005'),
    ('+92 301 2345678', '+92 300 0000006'),
    ('+92 300 1234567', '+92 300 0000007'),
    ('+923186986259', '+923000000000'),
    ('+923001234567', '+923000000001'),
    
    # WhatsApp
    ('wa.me/923186986259', 'wa.me/923000000000'),
    ('wa.me/923001234567', 'wa.me/923000000001'),
    ('923186986259', '923000000000'),
    ('923001234567', '923000000001'),
]

def sanitize_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    changed = False
    
    # Special handling for index-DHxZuIUT.js credential block
    if path.endswith('index-DHxZuIUT.js'):
        cred_start = content.find('const Gt=')
        if cred_start > 0:
            # Find end of W0 function
            w0_start = content.find('async function W0()', cred_start)
            body_start = content.find('{', w0_start)
            depth = 0
            i = body_start
            end_idx = -1
            while i < len(content):
                if content[i] == '{':
                    depth += 1
                elif content[i] == '}':
                    depth -= 1
                    if depth == 0:
                        end_idx = i
                        break
                i += 1
            if end_idx > 0:
                content = content[:cred_start] + 'async function W0(){return[]}' + content[end_idx+1:]
                changed = True
                print(f'  [CREDS] Removed hardcoded credential block from {os.path.basename(path)}')
    
    # Apply general replacements
    for old, new in REPLACEMENTS:
        if old in content:
            count = content.count(old)
            content = content.replace(old, new)
            if count > 0:
                changed = True
                print(f'  [{count}x] {old!r} -> {new!r} in {os.path.basename(path)}')
    
    if changed:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
    
    return changed

def main():
    files = [f for f in os.listdir(ASSETS_DIR) if f.endswith('.js')]
    total_changed = 0
    for fname in files:
        path = os.path.join(ASSETS_DIR, fname)
        if sanitize_file(path):
            total_changed += 1
    print(f'\nSanitized {total_changed} files.')

if __name__ == '__main__':
    main()
