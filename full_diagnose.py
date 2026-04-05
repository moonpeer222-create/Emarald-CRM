import os, re, json

results = {
    "hardcoded_names": {},
    "brand_references": {},
    "phone_numbers": set(),
    "whatsapp_numbers": set(),
    "emails_in_assets": set(),
    "localStorage_keys": set(),
    "hardcoded_credentials_found": False,
    "firebase_config_consistency": {},
    "database_rules_issues": [],
    "login_pages_status": {},
    "index_html_issues": [],
    "missing_configs": []
}

# 1. Scan all assets for names, brands, phones, emails
names = ['Imran Khan', 'Faizan', 'Safeer', 'Aynee', 'Atif', 'Wasi', 'Husnain', 'Sir Atif']
brands = ['Emerald Visa', 'emeraldvisa', 'emerald-crm', 'visaverse']

for fname in os.listdir('assets'):
    if not fname.endswith('.js'):
        continue
    path = os.path.join('assets', fname)
    try:
        with open(path, 'r', encoding='utf-8') as f:
            c = f.read()
    except:
        continue
    
    # Names
    for n in names:
        if n in c:
            results["hardcoded_names"].setdefault(n, []).append(fname)
    
    # Brands
    for b in brands:
        if b in c:
            results["brand_references"].setdefault(b, []).append(fname)
    
    # Phone numbers
    phones = re.findall(r'\+92\s*\d{3}\s*\d{7}', c)
    results["phone_numbers"].update(phones)
    
    # WhatsApp numbers
    wa = re.findall(r'wa\.me/\+?(\d+)', c)
    results["whatsapp_numbers"].update(wa)
    
    # Emails
    emails = re.findall(r'[\w.-]+@[\w.-]+\.[a-zA-Z]{2,}', c)
    for e in emails:
        if 'example.com' not in e and 'google.com' not in e and 'gmail.com' not in e and 'facebook.com' not in e and 'firebase' not in e and 'npmjs' not in e and 'company.com' not in e and 'emerald' not in e.lower():
            results["emails_in_assets"].add(e)
        elif 'emerald' in e.lower():
            results["emails_in_assets"].add(e)
    
    # localStorage keys
    ls_keys = re.findall(r'localStorage\.(?:getItem|setItem|removeItem)\(["\']([^"\']+)["\']', c)
    results["localStorage_keys"].update(ls_keys)

# 2. Check for hardcoded credentials in main bundle
with open('assets/index-DHxZuIUT.js', 'r', encoding='utf-8') as f:
    main_bundle = f.read()

if 'atif@company.com' in main_bundle or 'wasi@company.com' in main_bundle:
    results["hardcoded_credentials_found"] = True
    # Extract the credential block
    idx = main_bundle.find('atif:{email:')
    if idx > 0:
        results["hardcoded_credentials_snippet"] = main_bundle[max(0,idx-20):idx+400]

# 3. Check Firebase config consistency
configs = {}
for fname in ['index.html', 'CHANGELOG.md', 'SECURITY_CONFIG.md']:
    if os.path.exists(fname):
        with open(fname, 'r', encoding='utf-8') as f:
            c = f.read()
        if 'AIzaSyD2YGTqzuZUAhijS-N-XBmx8H3dGPIfRb8' in c:
            configs[fname] = 'real'
        elif 'AIzaSyDXt-rZfhh82YJVm4sH_4PcUs8hJ5vWC9c' in c:
            configs[fname] = 'placeholder'
        elif 'apiKey' in c:
            configs[fname] = 'has_key'
        else:
            configs[fname] = 'none'

results["firebase_config_consistency"] = configs

# 4. Check database rules
with open('database.rules.json', 'r', encoding='utf-8') as f:
    rules = f.read()

if "'customer'" not in rules:
    results["database_rules_issues"].append("Missing 'customer' role validation")
if "'agent'" not in rules:
    results["database_rules_issues"].append("Missing 'agent' role validation")
if "'admin'" not in rules:
    results["database_rules_issues"].append("Missing 'admin' role validation")
if "'master_admin'" not in rules:
    results["database_rules_issues"].append("Missing 'master_admin' role validation")

# 5. Check login pages for cleaned names
for fname in ['AdminLogin-BmZR_UD-.js', 'AgentLogin-DEja8zMG.js', 'CustomerLogin-X9yeTpYa.js', 'MasterLogin-BeTQDwrf.js', 'OperatorLogin-CzbHaKNQ.js']:
    path = os.path.join('assets', fname)
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as f:
            c = f.read()
        issues = []
        for n in ['Sir Atif', 'Wasi', 'Husnain', 'Atif']:
            if n in c:
                issues.append(n)
        results["login_pages_status"][fname] = issues if issues else 'clean'
    else:
        results["login_pages_status"][fname] = 'missing'

# 6. Check index.html integrity
with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

if html.count('<script>') != html.count('</script>'):
    results["index_html_issues"].append("Script tag mismatch")
if 'syncToReactAuth' not in html:
    results["index_html_issues"].append("Missing auth bridge (syncToReactAuth)")
if 'purgeLegacySessions' not in html:
    results["index_html_issues"].append("Missing legacy session purge")
if 'crm_current_user' not in html:
    results["index_html_issues"].append("Missing crm_current_user logic")
if 'AIzaSyD2YGTqzuZUAhijS-N-XBmx8H3dGPIfRb8' not in html:
    results["index_html_issues"].append("Using wrong/placeholder API key")

# 7. Check missing configs
if not os.path.exists('.htaccess'):
    results["missing_configs"].append(".htaccess missing (needed for Hostinger)")

# Convert sets to lists for JSON
results["phone_numbers"] = sorted(list(results["phone_numbers"]))
results["whatsapp_numbers"] = sorted(list(results["whatsapp_numbers"]))
results["emails_in_assets"] = sorted(list(results["emails_in_assets"]))
results["localStorage_keys"] = sorted(list(results["localStorage_keys"]))
for k in results["hardcoded_names"]:
    results["hardcoded_names"][k] = sorted(list(set(results["hardcoded_names"][k])))
for k in results["brand_references"]:
    results["brand_references"][k] = sorted(list(set(results["brand_references"][k])))

with open('full_diagnose_report.json', 'w', encoding='utf-8') as f:
    json.dump(results, f, indent=2)

print("Full diagnosis complete. Report saved to full_diagnose_report.json")
