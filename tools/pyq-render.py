#!/usr/bin/env python3
"""Render KCET paper + key PDFs to PNG pages for transcription. Usage: pyq-render.py <archive_root> <year>... """
import sys, os, pymupdf
root = sys.argv[1]; years = sys.argv[2:]
out_root = os.path.join(os.path.dirname(__file__), '..', 'data', 'pyq', 'raw')
for y in years:
    for subj in ['physics', 'chemistry', 'mathematics']:
        d = os.path.join(root, y, subj)
        if not os.path.isdir(d): continue
        short = {'physics': 'physics', 'chemistry': 'chemistry', 'mathematics': 'maths'}[subj]
        out = os.path.join(out_root, f'{y}-{short}'); os.makedirs(out, exist_ok=True)
        for kind in ['question-paper', 'answer-key']:
            p = os.path.join(d, kind + '.pdf')
            if not os.path.exists(p): continue
            doc = pymupdf.open(p)
            for i, page in enumerate(doc, 1):
                pix = page.get_pixmap(dpi=110 if kind == 'question-paper' else 130)
                pix.save(os.path.join(out, f'{"q" if kind == "question-paper" else "key"}-{i:02d}.png'))
            print(f'{y} {short} {kind}: {len(doc)} pages')
    # year-level revised key
    for f in os.listdir(os.path.join(root, y)):
        if f.endswith('.pdf'):
            doc = pymupdf.open(os.path.join(root, y, f)); out = os.path.join(out_root, f'{y}-revised-key'); os.makedirs(out, exist_ok=True)
            for i, page in enumerate(doc, 1): page.get_pixmap(dpi=130).save(os.path.join(out, f'{i:02d}.png'))
            print(f'{y} revised key {f}: {len(doc)} pages')
