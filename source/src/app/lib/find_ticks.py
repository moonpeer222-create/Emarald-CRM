with open('mockData.ts', 'r', encoding='utf-8') as f:
    lines = f.read().split('\n')
for i in range(649, 660):
    line = lines[i]
    indices = [j for j, ch in enumerate(line) if ch == '`']
    print(f'Line {i+1} backticks at cols {indices}:')
    print(f'   {repr(line)}')
