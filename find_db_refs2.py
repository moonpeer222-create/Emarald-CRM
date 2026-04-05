import os, re

patterns = set()
for fname in os.listdir('assets'):
    if not fname.endswith('.js'):
        continue
    with open(os.path.join('assets', fname), 'r', encoding='utf-8') as f:
        c = f.read()
    # Find all occurrences of .ref( followed by content
    for m in re.finditer(r'\.ref\(([^)]+)\)', c):
        patterns.add(m.group(1))
    # Find database() calls
    for m in re.finditer(r'database\(\)\.ref\(([^)]+)\)', c):
        patterns.add(m.group(1))
    # Find child calls
    for m in re.finditer(r'\.child\(([^)]+)\)', c):
        patterns.add(m.group(1))
    # Find set/push/update with path-like strings
    for m in re.finditer(r'["\']((users|customers|cases|documents|settings|audit_logs|notifications|messages|chats|agents|staff|attendance|leaves|passports|transactions|payments|invoices|reports|analytics|tickets|feedback|logs|backup|restores|templates|emails|sms|whatsapp|calls|tasks|events|calendar|reminders|followups|notes|tags|categories|services|countries|embassies|visa_types|airlines|hotels|packages|bookings|appointments|schedules|shifts|rosters|payrolls|salaries|commissions|bonuses|expenses|revenues|profits|losses|assets|liabilities|equity|capital|investments|loans|debts|credits|debits|receipts|vouchers|bills|quotations|proposals|contracts|agreements|uploads|downloads|attachments|media|images|videos|audios|pdfs|docs|sheets|slides|forms|surveys|polls|quizzes|tests|exams|certificates|diplomas|degrees|badges|achievements|rewards|points|tokens|coins|wallets|balances|transfers|withdrawals|deposits|refunds|returns|exchanges|orders|shipments|deliveries|tracking|status|updates|alerts|warnings|errors|history|activities|actions|events|incidents|issues|bugs|fixes|patches|updates|upgrades|downgrades|migrations|backups|restores|syncs|imports|exports|generations|creations|deletions|modifications|edits|changes)[/"\']?[^"\']*)["\']', c):
        patterns.add(m.group(1))

print('All patterns:')
for p in sorted(patterns):
    print(' ', repr(p))
