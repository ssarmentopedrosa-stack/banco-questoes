"""Gabarito oficial Inep, 1º dia caderno 1 azul (2017–2023): questões 1–5 de Inglês e Espanhol."""
import pymupdf as fitz, json, sys, re
out = {}
for y in range(2017, 2024):
    L = [l.strip() for l in fitz.open(f'{y}_d1gab.pdf')[0].get_text().split('\n') if l.strip()]
    i = L.index('ESPANHOL'); assert L[i - 1] == 'INGLÊS'
    seq = L[i + 1:i + 16]; ing, esp = {}, {}
    for k in range(5):
        n, a, b = seq[3 * k:3 * k + 3]; assert n == str(k + 1) and a in 'ABCDE' and b in 'ABCDE', (y, seq)
        ing[n], esp[n] = a, b
    out[str(y)] = {'ingles': ing, 'espanhol': esp}
json.dump(out, open('gab_le_2017_2023.json', 'w'), indent=1); print(out)
