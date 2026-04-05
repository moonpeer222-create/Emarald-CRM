with open('mockData.ts', 'r', encoding='utf-8') as f:
    code = f.read()

stack = []
in_string = None
in_template = False
template_depth = 0
last_template_start = None
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

    if in_string:
        if ch == in_string and prev != '\\':
            in_string = None
        i += 1
        continue

    if ch == '/' and next_ch == '/':
        while i < len(code) and code[i] != '\n':
            i += 1
        continue
    if ch == '/' and next_ch == '*':
        i += 2
        while i < len(code)-1 and not (code[i] == '*' and code[i+1] == '/'):
            i += 1
        i += 2
        continue

    if ch == '`':
        in_template = True
        last_template_start = i
        i += 1
        continue
    if ch in ('"', "'"):
        in_string = ch
        i += 1
        continue

    if ch in '({[':
        stack.append((ch, i))
    elif ch in ')}]':
        if not stack:
            pass
        else:
            top, pos = stack.pop()

    i += 1

if in_template and last_template_start is not None:
    line = code[:last_template_start].count('\n') + 1
    col = last_template_start - code[:last_template_start].rfind('\n')
    print(f'Unclosed template literal starts at line {line}, col {col}')
    snippet = code[last_template_start:last_template_start+300].replace('\r','').replace('\n','\\n')
    print(snippet)
