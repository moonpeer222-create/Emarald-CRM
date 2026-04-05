with open('mockData.ts', 'r', encoding='utf-8') as f:
    code = f.read()

in_template = False
template_depth = 0
i = 0
while i < len(code):
    ch = code[i]
    prev = code[i-1] if i > 0 else ''
    next_ch = code[i+1] if i < len(code)-1 else ''
    line = code[:i].count('\n') + 1

    if in_template:
        if ch == '$' and next_ch == '{':
            template_depth += 1
            if 650 <= line <= 657:
                print(f'  line {line} col {i - code[:i].rfind("\\n")}: ${'{'} -> depth={template_depth}')
            i += 2
            continue
        if ch == '}' and template_depth > 0:
            template_depth -= 1
            if 650 <= line <= 657:
                print(f'  line {line} col {i - code[:i].rfind("\\n")}: }} -> depth={template_depth}')
            i += 1
            continue
        if ch == '`' and prev != '\\' and template_depth == 0:
            if 650 <= line <= 657:
                print(f'  line {line} col {i - code[:i].rfind("\\n")}: ` -> CLOSE template')
            in_template = False
            i += 1
            continue
        i += 1
        continue

    if ch == '`':
        in_template = True
        if 650 <= line <= 657:
            print(f'line {line} col {i - code[:i].rfind("\\n")}: ` -> OPEN template')
        i += 1
        continue
    i += 1

if in_template:
    print('Still in template at end of file!')
