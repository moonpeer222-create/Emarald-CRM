import re
with open('mockData.ts', 'r', encoding='utf-8') as f:
    code = f.read()

stack = []
in_string = None
in_template = False
template_depth = 0
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

    # single-line comments
    if ch == '/' and next_ch == '/':
        while i < len(code) and code[i] != '\n':
            i += 1
        continue
    # block comments
    if ch == '/' and next_ch == '*':
        i += 2
        while i < len(code)-1 and not (code[i] == '*' and code[i+1] == '/'):
            i += 1
        i += 2
        continue

    if ch == '`':
        in_template = True
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
            print(f'Unexpected {ch} at {i}')
        else:
            top, pos = stack.pop()
            pairs = {'(': ')', '{': '}', '[': ']'}
            if pairs[top] != ch:
                print(f'Mismatched {ch} at {i}, expected {pairs[top]} from {pos}')

    i += 1

if in_template:
    print('ERROR: Unclosed template literal')
if in_string:
    print(f'ERROR: Unclosed string literal ({in_string})')
if stack:
    for ch, pos in stack:
        line = code[:pos].count('\n')+1
        col = pos - code[:pos].rfind('\n')
        print(f'ERROR: Unclosed {ch} at position {pos} (line {line}, col {col})')
else:
    print('All brackets balanced')
