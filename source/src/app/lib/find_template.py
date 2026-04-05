with open('mockData.ts', 'r', encoding='utf-8') as f:
    code = f.read()

in_template = False
template_depth = 0
start_pos = 0
i = 0
while i < len(code):
    ch = code[i]
    prev = code[i-1] if i > 0 else ''
    next_ch = code[i+1] if i < len(code)-1 else ''

    if in_template:
        if ch == '$' and next_ch == '{':
            template_depth += 1
            i += 2
            continue
        if ch == '}' and template_depth > 0:
            template_depth -= 1
            i += 1
            continue
        if ch == '`' and prev != '\\' and template_depth == 0:
            in_template = False
            i += 1
            continue
        i += 1
        continue

    if ch == '`':
        in_template = True
        start_pos = i
        i += 1
        continue
    i += 1

if in_template:
    line = code[:start_pos].count('\n')+1
    col = start_pos - code[:start_pos].rfind('\n')
    print(f'Unclosed template literal starts at line {line}, col {col}')
    snippet = code[start_pos:start_pos+200].replace('\r','').replace('\n','\\n')
    print('Snippet:', repr(snippet))
else:
    print('No unclosed template literal')
